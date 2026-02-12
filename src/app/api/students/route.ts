/**
 * Students API Endpoint
 * GET /api/students - Get all students
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
    // Get students with their user info
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        current_phase,
        current_topic_index,
        current_milestone,
        research_topic,
        enrollment_date,
        users!students_user_id_fkey (
          name,
          email
        )
      `);

    if (error) {
      throw new Error(error.message);
    }

    const formattedStudents = (students || []).map((student: any) => ({
      id: student.id,
      userId: student.user_id,
      name: student.users?.name || 'Unknown',
      email: student.users?.email || '',
      currentPhase: student.current_phase,
      currentTopicIndex: student.current_topic_index,
      currentMilestone: student.current_milestone,
      researchTopic: student.research_topic,
      enrollmentDate: student.enrollment_date,
    }));

    return NextResponse.json({
      success: true,
      data: {
        count: formattedStudents.length,
        students: formattedStudents,
      },
    });
  } catch (error) {
    console.error('Students API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
