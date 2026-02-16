/**
 * Background AI Processing Endpoint
 * POST /api/agent/process - Process message through Gemini and create draft
 * This is called in the background after student message is saved
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, Part, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { buildSystemPrompt } from '@/services/agent/prompts/system';
import { getPhase1Tools, getPhase2Tools, createPhase1ToolRegistry, createPhase2ToolRegistry } from '@/services/agent/tools';
import type { Tool } from '@/services/agent/tools/types';
import { getStudentProfile, formatProfileForContext, updateMemoryFromConversation, getRecentDailyNotes } from '@/services/memory';

// Extend timeout for long-running Gemini requests
export const maxDuration = 120;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// MIME types that Gemini supports for inline data
const GEMINI_SUPPORTED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
  'application/pdf',
  'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
  'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
  'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown',
]);

interface Attachment {
  filename: string;
  publicUrl?: string;
  url?: string;
  mimeType: string;
  storagePath: string;
}

// Convert our tool format to Gemini function declarations
function convertToolsToGemini(tools: Tool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: convertSchemaToGemini(tool.input_schema),
  }));
}

function convertSchemaToGemini(schema: any): any {
  if (!schema) return { type: SchemaType.OBJECT, properties: {} };

  const converted: any = {};

  if (schema.type === 'object') {
    converted.type = SchemaType.OBJECT;
    converted.properties = {};

    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        converted.properties[key] = convertSchemaToGemini(value);
      }
    }

    if (schema.required) {
      converted.required = schema.required;
    }
  } else if (schema.type === 'array') {
    converted.type = SchemaType.ARRAY;
    if (schema.items) {
      converted.items = convertSchemaToGemini(schema.items);
    }
  } else if (schema.type === 'string') {
    converted.type = SchemaType.STRING;
    if (schema.description) converted.description = schema.description;
    if (schema.enum) converted.enum = schema.enum;
  } else if (schema.type === 'number' || schema.type === 'integer') {
    converted.type = SchemaType.NUMBER;
    if (schema.description) converted.description = schema.description;
  } else if (schema.type === 'boolean') {
    converted.type = SchemaType.BOOLEAN;
    if (schema.description) converted.description = schema.description;
  }

  return converted;
}

async function attachmentToGeminiPart(attachment: Attachment): Promise<{ part: Part | null; skipped: boolean; reason?: string }> {
  try {
    const url = attachment.publicUrl || attachment.url;
    if (!url) {
      console.log(`[Gemini] No URL for attachment: ${attachment.filename}`);
      return { part: null, skipped: false };
    }

    // Check if MIME type is supported by Gemini
    if (!GEMINI_SUPPORTED_MIME_TYPES.has(attachment.mimeType)) {
      const reason = `Unsupported file type: ${attachment.mimeType}. Gemini supports: images, PDFs, audio, video, and text files.`;
      console.log(`[Gemini] Skipping ${attachment.filename}: ${reason}`);
      return { part: null, skipped: true, reason };
    }

    console.log(`[Gemini] Fetching file: ${attachment.filename} from ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Gemini] Failed to fetch ${attachment.filename}: ${response.status}`);
      return { part: null, skipped: false };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    console.log(`[Gemini] Converted ${attachment.filename} to base64 (${Math.round(base64Data.length / 1024)}KB)`);

    return {
      part: {
        inlineData: {
          mimeType: attachment.mimeType,
          data: base64Data,
        },
      },
      skipped: false,
    };
  } catch (error) {
    console.error(`[Gemini] Error processing attachment ${attachment.filename}:`, error);
    return { part: null, skipped: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, message, attachments, conversationId } = body as {
      studentId: string;
      message: string;
      attachments?: Attachment[];
      conversationId: string;
    };

    console.log(`[Process API] Starting AI processing for student ${studentId}`);

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        users!students_user_id_fkey (name, email, preferred_name)
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      console.error('[Process API] Student not found:', studentError);
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const phase = student.current_phase as 'phase1' | 'phase2';
    // Use preferred_name if available, otherwise fall back to first name
    const studentName = student.users?.preferred_name || student.users?.name?.split(' ')[0] || 'Student';

    console.log(`[Process API] Student: ${studentName}, Phase: ${phase}`);

    // Process attachments for Gemini multimodal
    const multimodalParts: Part[] = [];
    const attachmentDescriptions: string[] = [];
    const skippedFiles: string[] = [];

    if (attachments && attachments.length > 0) {
      console.log(`[Process API] Processing ${attachments.length} attachment(s)`);

      for (const attachment of attachments) {
        const result = await attachmentToGeminiPart(attachment);
        if (result.part) {
          multimodalParts.push(result.part);
          attachmentDescriptions.push(`- ${attachment.filename} (${attachment.mimeType})`);
        } else if (result.skipped) {
          skippedFiles.push(`${attachment.filename}: ${result.reason}`);
        }
      }
    }

    // Clean message text (remove attachment markdown that confuses Gemini)
    let cleanMessage = message.replace(/\n\n📎 Attachments:\n[\s\S]*$/, '').trim();

    // Build document context
    let documentContext = '';
    if (attachmentDescriptions.length > 0) {
      documentContext = `The student has attached the following file(s):\n${attachmentDescriptions.join('\n')}\n\nYou can see and analyze these files directly.`;
    }

    if (skippedFiles.length > 0) {
      documentContext += `\n\nNote: Some files could not be processed:\n${skippedFiles.map(f => `- ${f}`).join('\n')}`;
    }

    // Get student profile and memory
    const profile = await getStudentProfile(studentId);
    const profileContext = profile ? formatProfileForContext(profile) : '';
    const dailyNotes = await getRecentDailyNotes(studentId, 5);
    const dailyNotesContext = dailyNotes.length > 0
      ? `Recent notes about this student:\n${dailyNotes.map(n => `- ${n.date}: ${n.note}`).join('\n')}`
      : '';

    // Build system prompt
    const systemPrompt = buildSystemPrompt(studentName, phase, {
      researchTopic: student.research_topic,
      enrollmentDate: student.enrollment_date,
      memoryContext: profileContext + (dailyNotesContext ? `\n\n${dailyNotesContext}` : ''),
      documentContext,
    });

    // Get tools for current phase
    const tools = phase === 'phase1' ? getPhase1Tools() : getPhase2Tools();
    const toolRegistry = phase === 'phase1' ? createPhase1ToolRegistry() : createPhase2ToolRegistry();
    const geminiFunctions = convertToolsToGemini(tools);

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: systemPrompt,
      tools: geminiFunctions.length > 0 ? [{ functionDeclarations: geminiFunctions }] : undefined,
    });

    // Build message parts
    const messageParts: Part[] = [];
    if (multimodalParts.length > 0) {
      messageParts.push(...multimodalParts);
    }
    messageParts.push({ text: cleanMessage });

    // Start chat and send message
    const chat = model.startChat({
      history: [],
    });

    let finalContent = '';
    const allToolCalls: any[] = [];
    let iterations = 0;
    const maxIterations = 5;

    // Agentic loop
    let result = await chat.sendMessage(messageParts);
    let response = result.response;

    while (iterations < maxIterations) {
      iterations++;

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) break;

      const content = candidates[0].content;
      if (!content || !content.parts) {
        console.log('[Process API] No content or parts in response');
        break;
      }
      const parts = content.parts;

      const functionCalls = parts.filter(p => 'functionCall' in p);

      if (functionCalls.length === 0) {
        for (const part of parts) {
          if ('text' in part && part.text) {
            finalContent += part.text;
          }
        }
        break;
      }

      // Execute function calls
      const functionResponses: Part[] = [];

      for (const part of functionCalls) {
        if ('functionCall' in part && part.functionCall) {
          const functionCall = part.functionCall;
          const name = functionCall.name;
          const args = functionCall.args;

          let toolResult: any;
          try {
            if (toolRegistry.hasTool(name)) {
              toolResult = await toolRegistry.execute(name, args || {}, {
                studentId,
                currentPhase: phase,
              });
            } else {
              toolResult = { error: `Unknown tool: ${name}` };
            }
          } catch (error) {
            toolResult = { error: error instanceof Error ? error.message : 'Tool execution failed' };
          }

          allToolCalls.push({ name, input: args, output: toolResult });

          functionResponses.push({
            functionResponse: {
              name,
              response: { result: toolResult },
            },
          });
        }
      }

      if (functionResponses.length > 0) {
        result = await chat.sendMessage(functionResponses);
        response = result.response;
      } else {
        break;
      }
    }

    if (!finalContent.trim()) {
      finalContent = "I received your message. Let me think about this and get back to you.";
    }

    // Delete old drafts and save new one
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('role', 'agent')
      .eq('status', 'draft');

    // Extract subject from student message for proper threading
    let subject = 'General Question';
    if (message.startsWith('Subject:')) {
      const firstLine = message.split('\n')[0];
      subject = firstLine.replace('Subject:', '').trim();
    }

    // Prepend subject to agent response for proper threading
    const contentWithSubject = `Subject: ${subject}\n\n${finalContent}`;

    const draftId = crypto.randomUUID();
    await supabase.from('messages').insert({
      id: draftId,
      conversation_id: conversationId,
      role: 'agent',
      content: contentWithSubject,
      tool_calls: allToolCalls.length > 0 ? allToolCalls : null,
      status: 'draft',
    });

    // Update memory
    try {
      await updateMemoryFromConversation(studentId, message, finalContent);
    } catch (memoryError) {
      console.error('[Process API] Failed to update memory:', memoryError);
    }

    console.log(`[Process API] Draft created: ${draftId}`);

    return NextResponse.json({
      success: true,
      draftId,
    });
  } catch (error) {
    console.error('[Process API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
