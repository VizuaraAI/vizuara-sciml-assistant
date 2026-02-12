/**
 * Context Debug API Endpoint
 * GET /api/agent/context?studentId=xxx - Get full agent context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from '@/services/agent/prompts/system';
import { getPhase1Tools, getPhase2Tools } from '@/services/agent/tools';
import { getStudentProfile, formatProfileForContext, getRecentDailyNotes } from '@/services/memory';

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

    // Get student with user info
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
        { success: false, error: `Student ${studentId} not found` },
        { status: 404 }
      );
    }

    // Get progress
    const { data: progress } = await supabase
      .from('progress')
      .select('*')
      .eq('student_id', studentId);

    // Get roadmap for Phase II students
    let roadmapData: any = null;
    if (student.current_phase === 'phase2') {
      const { data: roadmap } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roadmap) {
        // Check both the column and the fallback in content JSON
        const contentObj = roadmap.content as any;
        const isAccepted = roadmap.accepted || contentObj?._accepted || false;

        roadmapData = {
          id: roadmap.id,
          topic: roadmap.topic,
          accepted: isAccepted,
          createdAt: roadmap.created_at,
          content: roadmap.content,
          milestones: contentObj?.milestones?.map((m: any) => ({
            number: m.number,
            title: m.title,
            weeks: m.weeks || m.duration,
            objectives: m.objectives?.slice(0, 3),
          })) || [],
        };
      }
    }

    // Get memory context
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
    } catch (e) {
      // Continue without memory
    }

    // Get message count
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', studentId);

    const conversationId = conversations?.[0]?.id;
    let messageCount = 0;
    if (conversationId) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      messageCount = count || 0;
    }

    const phase = student.current_phase as 'phase1' | 'phase2';
    const tools = phase === 'phase1' ? getPhase1Tools() : getPhase2Tools();

    // Calculate timeline info
    const now = new Date();
    let daysInPhase = 0;
    let daysRemaining = 0;
    let isOverdue = false;

    if (phase === 'phase1' && student.phase1_start) {
      const phase1Start = new Date(student.phase1_start);
      daysInPhase = Math.floor((now.getTime() - phase1Start.getTime()) / (1000 * 60 * 60 * 24));
      const phase1Target = 45; // 1.5 months
      daysRemaining = phase1Target - daysInPhase;
      isOverdue = daysRemaining < 0;
    } else if (phase === 'phase2' && student.phase2_start) {
      const phase2Start = new Date(student.phase2_start);
      daysInPhase = Math.floor((now.getTime() - phase2Start.getTime()) / (1000 * 60 * 60 * 24));
      const phase2Target = 75; // 2.5 months
      daysRemaining = phase2Target - daysInPhase;
      isOverdue = daysRemaining < 0;
    }

    // Build profile
    const profile = {
      name: student.users?.name || 'Unknown',
      email: student.users?.email || '',
      currentPhase: phase,
      currentTopicIndex: student.current_topic_index,
      currentMilestone: student.current_milestone,
      researchTopic: student.research_topic,
      enrollmentDate: student.enrollment_date,
      phase1Start: student.phase1_start,
      phase2Start: student.phase2_start,
      daysInPhase,
      daysRemaining: Math.abs(daysRemaining),
      isOverdue,
    };

    // Build system prompt with roadmap if accepted
    const roadmapContent = roadmapData?.accepted ? JSON.stringify(roadmapData.content) : null;
    const systemPrompt = buildSystemPrompt(profile.name, phase, {
      researchTopic: student.research_topic,
      enrollmentDate: student.enrollment_date,
      phase1Start: student.phase1_start,
      phase2Start: student.phase2_start,
      memoryContext,
      roadmapContent,
    });

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        phase,
        profile,
        roadmap: roadmapData,
        memory: {
          hasProfile: !!memoryContext,
          preview: memoryContext ? memoryContext.slice(0, 500) + (memoryContext.length > 500 ? '...' : '') : null,
        },
        conversationStats: {
          totalMessages: messageCount,
          studentMessages: Math.floor(messageCount / 2),
          agentMessages: Math.ceil(messageCount / 2),
          lastMessageAt: null,
        },
        contextSummary: {
          hasRoadmap: !!roadmapData,
          roadmapAccepted: roadmapData?.accepted || false,
          roadmapTopic: roadmapData?.topic || null,
          roadmapMilestones: roadmapData?.milestones?.length || 0,
          hasMemory: !!memoryContext,
          toolsAvailable: tools.map(t => t.name),
        },
        debugInfo: {
          systemPromptLength: systemPrompt.length,
          systemPromptPreview: systemPrompt.slice(0, 1000) + '...',
          fullSystemPrompt: systemPrompt,
        },
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
