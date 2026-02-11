/**
 * Memory Debug API Endpoint
 * GET /api/agent/memory?studentId=xxx - Get all memory for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentProfile, getAgentContext } from '@/services/memory';

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

    const profile = await getStudentProfile(studentId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: `Student ${studentId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile,
      },
    });
  } catch (error) {
    console.error('Memory API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
