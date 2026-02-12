/**
 * Student Phase Transition API
 * PATCH /api/students/[studentId]/phase - Transition student to Phase 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const body = await request.json();
    const { phase } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing studentId' },
        { status: 400 }
      );
    }

    if (!phase || !['phase1', 'phase2'].includes(phase)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phase. Must be "phase1" or "phase2"' },
        { status: 400 }
      );
    }

    // Get current student data
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('current_phase')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {
      current_phase: phase,
      updated_at: new Date().toISOString(),
    };

    // If transitioning to Phase 2, set the start date and mark topic progress as complete
    if (phase === 'phase2' && student.current_phase === 'phase1') {
      updateData.phase2_start = new Date().toISOString();
      updateData.current_topic_index = 8; // Mark all Phase 1 topics as complete
      updateData.current_milestone = 0; // Start at milestone 0 (topic selection)
    }

    // If transitioning back to Phase 1 (rare, but possible)
    if (phase === 'phase1' && student.current_phase === 'phase2') {
      updateData.phase2_start = null;
      updateData.current_milestone = 0;
      updateData.research_topic = null;
    }

    // Update the student
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .select(`
        *,
        users!students_user_id_fkey (name, email)
      `)
      .single();

    if (updateError) {
      console.error('Failed to update student phase:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update student phase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        studentId: updatedStudent.id,
        name: updatedStudent.users?.name,
        previousPhase: student.current_phase,
        newPhase: updatedStudent.current_phase,
        phase2Start: updatedStudent.phase2_start,
      },
    });
  } catch (error) {
    console.error('Phase transition error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
