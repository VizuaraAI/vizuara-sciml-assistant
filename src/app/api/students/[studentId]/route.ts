/**
 * Individual Student API
 * GET /api/students/[studentId] - Get detailed student information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing studentId' },
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
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get roadmap for Phase II students
    let roadmapData = null;
    if (student.current_phase === 'phase2') {
      const { data: roadmap } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roadmap) {
        const contentObj = roadmap.content as any;
        const isAccepted = roadmap.accepted || contentObj?._accepted || false;
        const pdfUrl = contentObj?.pdf_url || null;

        roadmapData = {
          id: roadmap.id,
          topic: roadmap.topic,
          accepted: isAccepted,
          createdAt: roadmap.created_at,
          pdfUrl: pdfUrl,
          milestoneCount: contentObj?.milestones?.length || 5,
        };
      }
    }

    // Calculate timeline
    const now = new Date();
    let daysInPhase = 0;
    let daysRemaining = 0;
    let isOverdue = false;

    if (student.current_phase === 'phase1' && student.phase1_start) {
      const phase1Start = new Date(student.phase1_start);
      daysInPhase = Math.floor((now.getTime() - phase1Start.getTime()) / (1000 * 60 * 60 * 24));
      const phase1Target = 45; // 1.5 months
      daysRemaining = phase1Target - daysInPhase;
      isOverdue = daysRemaining < 0;
    } else if (student.current_phase === 'phase2' && student.phase2_start) {
      const phase2Start = new Date(student.phase2_start);
      daysInPhase = Math.floor((now.getTime() - phase2Start.getTime()) / (1000 * 60 * 60 * 24));
      const phase2Target = 75; // 2.5 months
      daysRemaining = phase2Target - daysInPhase;
      isOverdue = daysRemaining < 0;
    }

    // Calculate total mentorship remaining
    let totalDaysRemaining = 0;
    if (student.enrollment_date) {
      const enrollDate = new Date(student.enrollment_date);
      const totalMentorshipDays = 120; // 4 months
      const daysSinceEnrollment = Math.floor((now.getTime() - enrollDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDaysRemaining = totalMentorshipDays - daysSinceEnrollment;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: student.id,
        name: student.users?.name || 'Unknown',
        email: student.users?.email || '',
        currentPhase: student.current_phase,
        currentMilestone: student.current_milestone || 0,
        currentTopicIndex: student.current_topic_index || 1,
        researchTopic: student.research_topic,
        enrollmentDate: student.enrollment_date,
        phase1Start: student.phase1_start,
        phase2Start: student.phase2_start,
        daysInPhase,
        daysRemaining: Math.abs(daysRemaining),
        isOverdue,
        totalDaysRemaining: Math.max(0, totalDaysRemaining),
        roadmap: roadmapData,
      },
    });
  } catch (error) {
    console.error('Get student API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
