/**
 * Context Debug API Endpoint
 * GET /api/agent/context?studentId=xxx - Get full agent context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeachingAssistant } from '@/services/agent';
import { getAgentContext, formatContextForAgent } from '@/services/memory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: studentId' },
        { status: 400 }
      );
    }

    // Get full agent context
    const context = await getAgentContext(studentId);
    if (!context) {
      return NextResponse.json(
        { success: false, error: `Student ${studentId} not found` },
        { status: 404 }
      );
    }

    // Get debug info from agent
    const agent = getTeachingAssistant();
    const debugInfo = await agent.getDebugInfo(studentId);

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        phase: context.currentPhase,
        profile: context.studentProfile,
        conversationStats: context.conversationStats,
        recentMessagesCount: context.recentMessages.length,
        formattedContext: formatContextForAgent(context),
        debugInfo,
      },
    });
  } catch (error) {
    console.error('Context API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
