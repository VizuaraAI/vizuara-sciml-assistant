/**
 * Mentor Roadmap Generation API
 * POST /api/mentor/generate-roadmap - Generate a research roadmap for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { roadmapToolHandlers } from '@/services/agent/tools/roadmap';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, studentName, topic } = body;

    if (!studentId || !topic) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: studentId, topic' },
        { status: 400 }
      );
    }

    console.log(`[Mentor API] Generating roadmap for ${studentName}: ${topic}`);

    // Generate the roadmap using the existing tool
    const result = await roadmapToolHandlers.generate_roadmap(
      {
        topic,
        duration_weeks: 10,
        researcher_name: studentName,
      },
      {
        studentId,
        currentPhase: 'phase2',
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate roadmap' },
        { status: 500 }
      );
    }

    // Update student record with research topic and roadmap content
    const { error: updateError } = await supabase
      .from('students')
      .update({
        research_topic: topic,
        roadmap_content: result.data?.roadmapJson ? JSON.stringify(result.data.roadmapJson) : null,
        roadmap_pdf_url: result.data?.pdfUrl || null,
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('[Mentor API] Failed to update student with roadmap:', updateError);
      // Continue anyway - the roadmap was generated successfully
    }

    return NextResponse.json({
      success: true,
      message: result.data?.message || `Research roadmap for "${topic}" has been generated!`,
      downloadLink: result.data?.downloadLink || '',
      pdfUrl: result.data?.pdfUrl || '',
    });
  } catch (error) {
    console.error('Generate roadmap API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
