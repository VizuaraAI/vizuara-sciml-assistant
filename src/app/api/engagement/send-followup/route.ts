/**
 * Send Follow-up Message API
 * Sends a follow-up message to an inactive student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentWithUser } from '@/db/queries/students';
import { getOrCreateConversation } from '@/db/queries/conversations';
import { createMessage } from '@/db/queries/messages';

export async function POST(request: NextRequest) {
  try {
    const { studentId, message } = await request.json();

    if (!studentId || !message) {
      return NextResponse.json(
        { success: false, error: 'Student ID and message are required' },
        { status: 400 }
      );
    }

    // Get student info
    const studentData = await getStudentWithUser(studentId);
    if (!studentData) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const { user } = studentData;

    // Create conversation if doesn't exist
    const conversation = await getOrCreateConversation(studentId);

    // Create the message
    await createMessage({
      conversationId: conversation.id,
      role: 'agent',
      content: message,
      status: 'sent',
    });

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        studentName: user.name,
        message: `Follow-up message sent to ${user.name}`,
      },
    });
  } catch (error) {
    console.error('Failed to send follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send follow-up message' },
      { status: 500 }
    );
  }
}
