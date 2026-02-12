/**
 * Accept Roadmap API
 * POST /api/mentor/accept-roadmap - Mark a student's roadmap as accepted
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

    // Get the latest roadmap for this student
    const { data: roadmap, error: fetchError } = await supabase
      .from('roadmaps')
      .select('id, topic, content')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !roadmap) {
      return NextResponse.json(
        { success: false, error: 'No roadmap found for this student. Generate a roadmap first.' },
        { status: 404 }
      );
    }

    // Try to update the roadmap with accepted=true
    // If the column doesn't exist, we'll add it via content update
    const { error: updateError } = await supabase
      .from('roadmaps')
      .update({
        accepted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roadmap.id);

    if (updateError) {
      console.error('Failed to update roadmap accepted column:', updateError);

      // Fallback: Store accepted status in the content JSON
      const updatedContent = {
        ...(roadmap.content as object),
        _accepted: true,
        _acceptedAt: new Date().toISOString(),
      };

      const { error: contentUpdateError } = await supabase
        .from('roadmaps')
        .update({
          content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roadmap.id);

      if (contentUpdateError) {
        console.error('Failed to update roadmap content:', contentUpdateError);
        return NextResponse.json(
          { success: false, error: 'Failed to mark roadmap as accepted. Please run the database migration.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Roadmap for "${roadmap.topic}" has been marked as accepted. It will now be included in the AI context.`,
      roadmapId: roadmap.id,
      topic: roadmap.topic,
    });
  } catch (error) {
    console.error('Accept roadmap API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
