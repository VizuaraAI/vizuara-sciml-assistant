/**
 * Student Phase Transition API
 * POST /api/students/transition - Transition student from Phase I to Phase II
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: studentId' },
        { status: 400 }
      );
    }

    // Get current student
    const { data: student, error: getError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (getError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    if (student.current_phase === 'phase2') {
      return NextResponse.json(
        { success: false, error: 'Student is already in Phase II' },
        { status: 400 }
      );
    }

    // Transition to Phase II
    const { error: updateError } = await supabase
      .from('students')
      .update({
        current_phase: 'phase2',
        phase2_start: new Date().toISOString(),
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('Failed to transition student:', updateError);
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Successfully transitioned to Phase II' },
    });
  } catch (error) {
    console.error('Transition API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
