/**
 * Messages API Endpoint
 * GET /api/messages?studentId=xxx - Get messages for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Disable caching for this route - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    // Get student's conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (!conversation) {
      return NextResponse.json({
        success: true,
        data: { messages: [] },
      });
    }

    // Get all sent/approved messages (not drafts - those are for mentor only)
    // Sort by newest first (descending) for Gmail-style inbox
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role, content, tool_calls, status, created_at')
      .eq('conversation_id', conversation.id)
      .in('status', ['sent', 'approved'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      toolCalls: msg.tool_calls,
      status: msg.status,
      timestamp: msg.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: { messages: formattedMessages },
    });
  } catch (error) {
    console.error('Messages API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
