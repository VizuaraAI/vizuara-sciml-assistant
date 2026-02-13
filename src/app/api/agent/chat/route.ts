/**
 * Chat API Endpoint
 * POST /api/agent/chat - Process message through agent with full tool execution
 * Supports multimodal inputs: text, PDFs, DOCX, Excel, images
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { buildSystemPrompt } from '@/services/agent/prompts/system';
import { getPhase1Tools, getPhase2Tools, createPhase1ToolRegistry, createPhase2ToolRegistry } from '@/services/agent/tools';
import type { Tool } from '@/services/agent/tools/types';
import { getStudentProfile, formatProfileForContext, updateMemoryFromConversation, getRecentDailyNotes } from '@/services/memory';
import { parseMultipleDocuments, formatDocumentContext } from '@/services/files/document-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function convertToolsToOpenAI(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
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
      // Get conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .single();

      if (conversation) {
        // Save user message only
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

    // Parse attached documents for multimodal context
    let documentContext = '';
    let imageContents: Array<{ type: 'image_url'; image_url: { url: string; detail: 'auto' } }> = [];

    if (attachments && attachments.length > 0) {
      console.log(`[Chat API] Processing ${attachments.length} attachment(s)`);

      try {
        const parsedDocs = await parseMultipleDocuments(attachments);

        // Add text content from documents to context
        if (parsedDocs.textContent) {
          documentContext = formatDocumentContext(parsedDocs.textContent, parsedDocs.images.length);
          console.log(`[Chat API] Parsed ${parsedDocs.textContent.length} characters of text from documents`);
        }

        // Prepare images for GPT-4o vision
        for (const img of parsedDocs.images) {
          imageContents.push({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`,
              detail: 'auto',
            },
          });
        }

        if (imageContents.length > 0) {
          console.log(`[Chat API] Added ${imageContents.length} image(s) for vision processing`);
        }

        // Log any parsing errors
        if (parsedDocs.errors.length > 0) {
          console.warn('[Chat API] Document parsing errors:', parsedDocs.errors);
        }
      } catch (parseError) {
        console.error('[Chat API] Failed to parse attachments:', parseError);
        // Continue without attachments rather than failing the request
      }
    }

    // Load student's long-term memory profile (gracefully handle errors)
    let memoryContext = '';
    try {
      const studentProfile = await getStudentProfile(studentId);
      if (studentProfile) {
        memoryContext = formatProfileForContext(studentProfile);
      }

      // Load recent daily notes
      const recentNotes = await getRecentDailyNotes(studentId, 7);
      if (recentNotes.length > 0) {
        memoryContext += '\n\nRecent conversation notes:\n';
        for (const note of recentNotes.slice(-5)) { // Last 5 notes
          memoryContext += `- ${note.date}: ${note.note}\n`;
        }
      }
    } catch (memoryLoadError) {
      console.warn('[Chat API] Failed to load memory context:', memoryLoadError);
      // Continue without memory context
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

    // Fetch roadmap from roadmaps table for Phase II students
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
        // Check both the column and the fallback in content JSON
        const contentObj = roadmap.content as any;
        roadmapAccepted = roadmap.accepted || contentObj?._accepted || false;
      }
    }

    // Build system prompt with timeline context, memory, roadmap, and document context
    const systemPrompt = buildSystemPrompt(studentName, phase, {
      researchTopic: student.research_topic,
      enrollmentDate: student.enrollment_date,
      phase1Start: student.phase1_start,
      phase2Start: student.phase2_start,
      lastMessageAt,
      memoryContext,
      roadmapContent: roadmapAccepted ? roadmapContent : null,  // Only include if student accepted
      documentContext, // Include parsed document content
    });

    // Get tools and registry based on phase
    const tools = phase === 'phase1' ? getPhase1Tools() : getPhase2Tools();
    const toolRegistry = phase === 'phase1' ? createPhase1ToolRegistry() : createPhase2ToolRegistry();

    console.log(`[Chat API] Tools available: ${tools.map(t => t.name).join(', ')}`);

    // Build messages array with multimodal support
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // If we have images, use multimodal content format for the user message
    if (imageContents.length > 0) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...imageContents,
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalContent = '';
    let allToolCalls: any[] = [];
    let iterations = 0;
    const maxIterations = 5;

    // Tool execution loop
    while (iterations < maxIterations) {
      iterations++;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        messages,
        tools: tools.length > 0 ? convertToolsToOpenAI(tools) : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      totalInputTokens += response.usage?.prompt_tokens || 0;
      totalOutputTokens += response.usage?.completion_tokens || 0;

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // If there's content, accumulate it
      if (assistantMessage.content) {
        finalContent += assistantMessage.content;
      }

      // If no tool calls, we're done
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        break;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool and add results
      for (const toolCall of assistantMessage.tool_calls) {
        // Handle both function and custom tool calls
        const toolName = 'function' in toolCall ? toolCall.function.name : (toolCall as any).name;
        const toolArgs = 'function' in toolCall ? toolCall.function.arguments : (toolCall as any).arguments;
        const toolInput = JSON.parse(toolArgs || '{}');

        // Execute the tool with full context
        let toolResult: string;
        let toolResultParsed: any = null;
        try {
          if (toolRegistry.hasTool(toolName)) {
            const result = await toolRegistry.execute(toolName, toolInput, {
              studentId,
              currentPhase: phase,
            });
            toolResultParsed = result;
            toolResult = JSON.stringify(result, null, 2);
          } else {
            toolResult = JSON.stringify({ error: `Unknown tool: ${toolName}` });
          }
        } catch (error) {
          toolResult = JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed'
          });
        }

        // Store tool call with its result for the client
        allToolCalls.push({
          id: toolCall.id,
          name: toolName,
          input: toolInput,
          result: toolResultParsed,
        });

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    // If we still have no content after tool calls, make one more call
    if (!finalContent && allToolCalls.length > 0) {
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        messages,
      });

      totalInputTokens += finalResponse.usage?.prompt_tokens || 0;
      totalOutputTokens += finalResponse.usage?.completion_tokens || 0;

      finalContent = finalResponse.choices[0].message.content || '';
    }

    // Clean up the response - remove double asterisks for a more natural look
    finalContent = finalContent
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold** markers
      .replace(/\*([^*]+)\*/g, '$1');    // Remove *italic* markers

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

    // Update long-term memory with conversation insights
    try {
      await updateMemoryFromConversation(studentId, message, finalContent);
      console.log(`[Chat API] Memory updated for student ${studentId}`);
    } catch (memoryError) {
      console.error('[Chat API] Failed to update memory:', memoryError);
      // Don't fail the request if memory update fails
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draftId,
        content: finalContent,
        toolCalls: allToolCalls,
        createdAt: new Date().toISOString(),
      },
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens,
      },
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
