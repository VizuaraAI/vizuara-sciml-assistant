/**
 * Inactive Students API
 * Returns list of students who haven't messaged in a while
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInactiveStudents, getStudentsWithLastActivity } from '@/db/queries/students';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minDays = parseInt(searchParams.get('minDays') || '3', 10);
    const showAll = searchParams.get('showAll') === 'true';

    // Get students based on filter
    const students = showAll
      ? await getStudentsWithLastActivity()
      : await getInactiveStudents(minDays);

    // Categorize by urgency
    const categorized = students.map(student => {
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let suggestedAction = '';

      if (student.daysSinceLastMessage >= 14) {
        urgency = 'critical';
        suggestedAction = 'Urgent re-engagement needed. Consider voice note + personalized message.';
      } else if (student.daysSinceLastMessage >= 7) {
        urgency = 'high';
        suggestedAction = 'Send encouraging follow-up with voice note.';
      } else if (student.daysSinceLastMessage >= 3) {
        urgency = 'medium';
        suggestedAction = 'Gentle check-in on progress.';
      } else {
        suggestedAction = 'Student is active. No action needed.';
      }

      return {
        ...student,
        urgency,
        suggestedAction,
        lastMessageAtFormatted: student.lastStudentMessageAt
          ? new Date(student.lastStudentMessageAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Never',
      };
    });

    // Count by urgency
    const summary = {
      total: categorized.length,
      critical: categorized.filter(s => s.urgency === 'critical').length,
      high: categorized.filter(s => s.urgency === 'high').length,
      medium: categorized.filter(s => s.urgency === 'medium').length,
      low: categorized.filter(s => s.urgency === 'low').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        students: categorized,
        summary,
      },
    });
  } catch (error) {
    console.error('Failed to get inactive students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get inactive students' },
      { status: 500 }
    );
  }
}
