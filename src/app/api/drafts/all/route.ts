/**
 * All Drafts API Endpoint
 * GET /api/drafts/all - Get all pending drafts across all students (for mentor view)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Disable caching for this route - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get all draft messages
    const { data: drafts, error: draftsError } = await supabase
      .from('messages')
      .select('id, content, tool_calls, created_at, conversation_id')
      .eq('role', 'agent')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (draftsError) {
      console.error('Failed to fetch drafts:', draftsError);
      throw new Error(draftsError.message);
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({
        success: true,
        data: { count: 0, drafts: [] },
      });
    }

    // Get conversation IDs
    const conversationIds = Array.from(new Set(drafts.map(d => d.conversation_id)));

    // Fetch all conversations with their student_id
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, student_id')
      .in('id', conversationIds);

    if (convError) {
      console.error('Failed to fetch conversations:', convError);
      throw new Error(convError.message);
    }

    // Get student IDs
    const studentIds = Array.from(new Set((conversations || []).map(c => c.student_id)));

    // Fetch students with user info
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, user_id')
      .in('id', studentIds);

    if (studentsError) {
      console.error('Failed to fetch students:', studentsError);
      throw new Error(studentsError.message);
    }

    // Get user IDs
    const userIds = Array.from(new Set((studentsData || []).map(s => s.user_id)));

    // Fetch user names
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      throw new Error(usersError.message);
    }

    // Create lookup maps
    const conversationMap = new Map((conversations || []).map(c => [c.id, c.student_id]));
    const studentMap = new Map((studentsData || []).map(s => [s.id, s.user_id]));
    const userMap = new Map((usersData || []).map(u => [u.id, { name: u.name, email: u.email }]));

    // Format drafts with correct student info
    const formattedDrafts = await Promise.all(drafts.map(async (draft) => {
      const studentId = conversationMap.get(draft.conversation_id);
      const userId = studentId ? studentMap.get(studentId) : null;
      const user = userId ? userMap.get(userId) : null;

      // Get the student message that triggered this draft
      const { data: studentMessages } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', draft.conversation_id)
        .eq('role', 'student')
        .lt('created_at', draft.created_at)
        .order('created_at', { ascending: false })
        .limit(1);

      const studentMessage = studentMessages?.[0];

      return {
        id: draft.id,
        studentId: studentId || '',
        studentName: user?.name || 'Unknown Student',
        studentEmail: user?.email || '',
        originalMessage: studentMessage?.content || 'No message',
        originalMessageAt: studentMessage?.created_at || draft.created_at,
        aiResponse: draft.content,
        toolCalls: draft.tool_calls,
        createdAt: draft.created_at,
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        count: formattedDrafts.length,
        drafts: formattedDrafts,
      },
    });
  } catch (error) {
    console.error('All Drafts API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
