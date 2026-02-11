/**
 * Chat API Endpoint
 * POST /api/agent/chat - Process message through agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeachingAssistant } from '@/services/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, message } = body;

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

    // Process message through the agent
    const agent = getTeachingAssistant();
    const response = await agent.processMessage(studentId, message);

    return NextResponse.json({
      success: true,
      draft: {
        id: response.draft.id,
        content: response.draft.content,
        toolCalls: response.draft.toolCalls,
        createdAt: response.draft.createdAt.toISOString(),
      },
      tokensUsed: response.tokensUsed,
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
