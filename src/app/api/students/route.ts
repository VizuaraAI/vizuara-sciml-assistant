/**
 * Students API Endpoint
 * GET /api/students - Get all students
 */

import { NextResponse } from 'next/server';
import { getAllStudentsWithUsers } from '@/db/queries/students';

export async function GET() {
  try {
    const studentsWithUsers = await getAllStudentsWithUsers();

    const students = studentsWithUsers.map(({ student, user }) => ({
      id: student.id,
      userId: student.userId,
      name: user.name,
      email: user.email,
      currentPhase: student.currentPhase,
      currentTopicIndex: student.currentTopicIndex,
      currentMilestone: student.currentMilestone,
      researchTopic: student.researchTopic,
      enrollmentDate: student.enrollmentDate.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        count: students.length,
        students,
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
