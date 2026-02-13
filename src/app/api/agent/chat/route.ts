/**
 * Chat API Endpoint - Powered by Gemini 2.5 Pro
 * POST /api/agent/chat - Process message through agent with full tool execution
 * Supports native multimodal inputs: text, PDFs, images (no parsing needed!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, Part, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { buildSystemPrompt } from '@/services/agent/prompts/system';
import { getPhase1Tools, getPhase2Tools, createPhase1ToolRegistry, createPhase2ToolRegistry } from '@/services/agent/tools';
import type { Tool } from '@/services/agent/tools/types';
import { getStudentProfile, formatProfileForContext, updateMemoryFromConversation, getRecentDailyNotes } from '@/services/memory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Convert our tool format to Gemini function declarations
function convertToolsToGemini(tools: Tool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: convertSchemaToGemini(tool.input_schema),
  }));
}

// Convert JSON Schema to Gemini Schema format
function convertSchemaToGemini(schema: any): any {
  if (!schema) return undefined;

  const geminiSchema: any = {};

  if (schema.type === 'object') {
    geminiSchema.type = SchemaType.OBJECT;
    if (schema.properties) {
      geminiSchema.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        geminiSchema.properties[key] = convertSchemaToGemini(value);
      }
    }
    if (schema.required) {
      geminiSchema.required = schema.required;
    }
  } else if (schema.type === 'string') {
    geminiSchema.type = SchemaType.STRING;
    if (schema.description) geminiSchema.description = schema.description;
    if (schema.enum) geminiSchema.enum = schema.enum;
  } else if (schema.type === 'number' || schema.type === 'integer') {
    geminiSchema.type = SchemaType.NUMBER;
    if (schema.description) geminiSchema.description = schema.description;
  } else if (schema.type === 'boolean') {
    geminiSchema.type = SchemaType.BOOLEAN;
    if (schema.description) geminiSchema.description = schema.description;
  } else if (schema.type === 'array') {
    geminiSchema.type = SchemaType.ARRAY;
    if (schema.items) {
      geminiSchema.items = convertSchemaToGemini(schema.items);
    }
  }

  return geminiSchema;
}

// Check if message is a conversation-ending statement that doesn't need a response
function isConversationEnding(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  // If it contains a question mark, it's NOT an ending - they're asking something
  if (normalized.includes('?')) {
    return false;
  }

  // Short acknowledgment patterns (must be short messages)
  const shortPatterns = [
    /^(sure|ok|okay|got it|will do|sounds good|perfect|great|thanks|thank you|bye|see you|talk later)[\s,!.]*$/i,
    /^(sure|ok|okay|got it|will do|sounds good|perfect|great|thanks|thank you)[\s,!.]*dr\.?\s*raj[\s,!.]*$/i,
    /^thanks[\s,!.]*$/i,
    /^thank you[\s,!.]*$/i,
  ];

  // Excitement/anticipation patterns (can be longer messages)
  const excitementPatterns = [
    /^(sounds good|sure|ok|okay|perfect|great).*?(i('m| am) (really )?(excited|looking forward)|excited to|looking forward)/i,
    /^(i('m| am) (really )?(excited|looking forward)|excited to|looking forward)/i,
    /(excited|looking forward).*?(get started|begin|start|learn|dive in)/i,
    /can't wait to (get started|begin|start|learn)/i,
  ];

  const wordCount = normalized.split(/\s+/).length;

  // Check short patterns only for short messages (8 words or less)
  if (wordCount <= 8) {
    for (const pattern of shortPatterns) {
      if (pattern.test(normalized)) {
        return true;
      }
    }
  }

  // Check excitement patterns for messages up to 15 words
  if (wordCount <= 15) {
    for (const pattern of excitementPatterns) {
      if (pattern.test(normalized)) {
        return true;
      }
    }
  }

  return false;
}

// Attachment type for multimodal support
interface Attachment {
  storagePath: string;
  mimeType: string;
  filename: string;
  publicUrl?: string;
}

// Download file from Supabase and convert to Gemini Part
async function attachmentToGeminiPart(attachment: Attachment): Promise<Part | null> {
  try {
    console.log(`[Gemini] Downloading attachment: ${attachment.filename} from ${attachment.storagePath}`);

    const { data, error } = await supabase.storage
      .from('documents')
      .download(attachment.storagePath);

    if (error || !data) {
      console.error(`[Gemini] Failed to download ${attachment.filename}:`, error);
      return null;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const base64 = buffer.toString('base64');

    console.log(`[Gemini] Downloaded ${attachment.filename}: ${buffer.length} bytes, mime: ${attachment.mimeType}`);

    // Gemini supports inline data for images, PDFs, etc.
    return {
      inlineData: {
        mimeType: attachment.mimeType,
        data: base64,
      },
    };
  } catch (error) {
    console.error(`[Gemini] Error processing attachment ${attachment.filename}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, message, attachments } = body as {
      studentId: string;
      message: string;
      attachments?: Attachment[];
    };

    // Validate required fields
    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: studentId' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Check if this is a conversation-ending message - don't generate AI response
    if (isConversationEnding(message)) {
      console.log('[Chat API] Conversation-ending message detected, not generating response');

      // Still save the student message but don't create a draft
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .single();

      if (conversation) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'student',
          content: message,
          status: 'sent',
        });
      }

      return NextResponse.json({
        success: true,
        noResponseNeeded: true,
        message: 'Conversation ending acknowledged, no response generated',
      });
    }

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        users!students_user_id_fkey (name, email)
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const phase = student.current_phase as 'phase1' | 'phase2';
    const studentName = student.users?.name || 'Student';

    console.log(`[Chat API] Student: ${studentName}, Phase: ${phase}, Topic: ${student.current_topic_index}, Research: ${student.research_topic}`);

    // Process attachments for Gemini multimodal - NO parsing needed!
    const multimodalParts: Part[] = [];
    const attachmentDescriptions: string[] = [];

    if (attachments && attachments.length > 0) {
      console.log(`[Chat API] Processing ${attachments.length} attachment(s) for Gemini multimodal`);

      for (const attachment of attachments) {
        const part = await attachmentToGeminiPart(attachment);
        if (part) {
          multimodalParts.push(part);
          attachmentDescriptions.push(`- ${attachment.filename} (${attachment.mimeType})`);
          console.log(`[Chat API] Added ${attachment.filename} to Gemini context`);
        }
      }
    }

    // Load student's long-term memory profile
    let memoryContext = '';
    try {
      const studentProfile = await getStudentProfile(studentId);
      if (studentProfile) {
        memoryContext = formatProfileForContext(studentProfile);
      }

      const recentNotes = await getRecentDailyNotes(studentId, 7);
      if (recentNotes.length > 0) {
        memoryContext += '\n\nRecent conversation notes:\n';
        for (const note of recentNotes.slice(-5)) {
          memoryContext += `- ${note.date}: ${note.note}\n`;
        }
      }
    } catch (memoryLoadError) {
      console.warn('[Chat API] Failed to load memory context:', memoryLoadError);
    }

    // Get last message timestamp for inactivity tracking
    let lastMessageAt: string | null = null;
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', studentId)
      .limit(1);

    if (conversations && conversations.length > 0) {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('conversation_id', conversations[0].id)
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      lastMessageAt = lastMsg?.created_at || null;
    }

    // Fetch roadmap for Phase II students
    let roadmapContent: string | null = null;
    let roadmapAccepted = false;
    if (phase === 'phase2') {
      const { data: roadmap } = await supabase
        .from('roadmaps')
        .select('content, accepted')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roadmap?.content) {
        roadmapContent = JSON.stringify(roadmap.content);
        const contentObj = roadmap.content as any;
        roadmapAccepted = roadmap.accepted || contentObj?._accepted || false;
      }
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(studentName, phase, {
      researchTopic: student.research_topic,
      enrollmentDate: student.enrollment_date,
      phase1Start: student.phase1_start,
      phase2Start: student.phase2_start,
      lastMessageAt,
      memoryContext,
      roadmapContent: roadmapAccepted ? roadmapContent : null,
      documentContext: multimodalParts.length > 0
        ? `The student has attached ${multimodalParts.length} file(s) that you can see and read:\n${attachmentDescriptions.join('\n')}\n\nThese files are included as inline multimodal content in this message. Read and analyze them.`
        : '',
    });

    // Get tools and registry based on phase
    const tools = phase === 'phase1' ? getPhase1Tools() : getPhase2Tools();
    const toolRegistry = phase === 'phase1' ? createPhase1ToolRegistry() : createPhase2ToolRegistry();

    console.log(`[Chat API] Tools available: ${tools.map(t => t.name).join(', ')}`);

    // Initialize Gemini model with function calling
    // Using Gemini 2.5 Pro - most capable model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: systemPrompt,
      tools: tools.length > 0 ? [{
        functionDeclarations: convertToolsToGemini(tools),
      }] : undefined,
    });

    // Build user message parts (text + any attachments)
    const userParts: Part[] = [
      { text: message },
      ...multimodalParts,
    ];

    console.log(`[Chat API] Sending to Gemini with ${userParts.length} part(s)`);

    // Start chat and send message
    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    });

    let finalContent = '';
    let allToolCalls: any[] = [];
    let iterations = 0;
    const maxIterations = 5;

    // Send initial message
    let result = await chat.sendMessage(userParts);
    let response = result.response;

    // Tool execution loop
    while (iterations < maxIterations) {
      iterations++;

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) break;

      const content = candidates[0].content;
      const parts = content.parts;

      // Check for function calls
      const functionCalls = parts.filter(p => 'functionCall' in p);

      if (functionCalls.length === 0) {
        // No function calls - extract text response
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
          console.log(`[Chat API] Executing tool: ${name}`, args);

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
            toolResult = {
              error: error instanceof Error ? error.message : 'Tool execution failed'
            };
          }

          allToolCalls.push({
            name,
            input: args,
            result: toolResult,
          });

          functionResponses.push({
            functionResponse: {
              name,
              response: toolResult,
            },
          });
        }
      }

      // Send function responses back to Gemini
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    // If still no content after tool calls, get final response text
    if (!finalContent) {
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
          if ('text' in part && part.text) {
            finalContent += part.text;
          }
        }
      }
    }

    // Clean up the response
    finalContent = finalContent
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1');

    console.log(`[Chat API] Gemini response: ${finalContent.length} chars, ${allToolCalls.length} tool calls`);

    // Create draft in database
    const draftId = crypto.randomUUID();

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ student_id: studentId })
        .select('id')
        .single();
      conversation = newConv;
    }

    if (conversation) {
      // Save user message
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'student',
        content: message,
        status: 'sent',
      });

      // Save agent response as draft
      await supabase.from('messages').insert({
        id: draftId,
        conversation_id: conversation.id,
        role: 'agent',
        content: finalContent,
        tool_calls: allToolCalls.length > 0 ? allToolCalls : null,
        status: 'draft',
      });
    }

    // Update long-term memory
    try {
      await updateMemoryFromConversation(studentId, message, finalContent);
      console.log(`[Chat API] Memory updated for student ${studentId}`);
    } catch (memoryError) {
      console.error('[Chat API] Failed to update memory:', memoryError);
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draftId,
        content: finalContent,
        toolCalls: allToolCalls,
        createdAt: new Date().toISOString(),
      },
      model: 'gemini-2.5-pro',
    });
  } catch (error) {
    console.error('Chat API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
