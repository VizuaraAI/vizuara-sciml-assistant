/**
 * Generate Follow-up Message API
 * Uses AI to generate a personalized follow-up message for an inactive student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentWithUser } from '@/db/queries/students';
import { getConversationByStudentId } from '@/db/queries/conversations';
import { getRecentMessages, createMessage } from '@/db/queries/messages';
import { getClaudeClient } from '@/services/agent/claude';

const FOLLOWUP_PROMPT = `You are Dr. Raj Dandekar, PhD (MIT), the lead instructor for the Vizuara Generative AI Professional Bootcamp.

A student has been inactive for a while and you need to send them a warm, encouraging follow-up message.

IMPORTANT GUIDELINES:
1. Be warm and personal - use their first name
2. Don't make them feel guilty about the inactivity
3. Express genuine interest in their progress
4. Offer specific help based on their phase
5. Keep it concise (2-3 short paragraphs max)
6. Sound like a mentor, not a chatbot
7. End with an open question to encourage a response

DO NOT:
- Use excessive enthusiasm ("Amazing!", "Fantastic!")
- Sound like a corporate email
- Be preachy or lecture them
- Use emojis

TONE: Warm, supportive, direct, mentor-like`;

export async function POST(request: NextRequest) {
  try {
    const { studentId, daysSinceLastMessage } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
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

    const { student, user } = studentData;
    const studentName = user.name.split(' ')[0]; // First name
    const phase = student.currentPhase;

    // Get recent conversation context (last 5 messages)
    let conversationContext = '';
    const conversation = await getConversationByStudentId(studentId);
    if (conversation) {
      const recentMessages = await getRecentMessages(conversation.id, 5);
      if (recentMessages.length > 0) {
        conversationContext = `\n\nRecent conversation history:\n${recentMessages
          .map(m => `${m.role === 'student' ? studentName : 'Dr. Raj'}: ${m.content.slice(0, 200)}...`)
          .join('\n')}`;
      }
    }

    // Build the user prompt
    const userPrompt = `Write a follow-up message to ${studentName} who is in ${phase === 'phase1' ? 'Phase I (watching video lectures)' : 'Phase II (research project)'}.

They have been inactive for ${daysSinceLastMessage} days.

${phase === 'phase1'
  ? 'In Phase I, students watch video lectures on LLM fundamentals, prompt engineering, RAG, and agents.'
  : `In Phase II, students work on a research project.${student.researchTopic ? ` Their topic is: ${student.researchTopic}` : ' They have not selected a topic yet.'}`
}
${conversationContext}

Write the follow-up message now:`;

    // Generate the follow-up message using AI
    const client = getClaudeClient();
    const response = await client.chat({
      system: FOLLOWUP_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 500,
      temperature: 0.7,
    });

    const generatedMessage = response.content;

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        studentName: user.name,
        studentEmail: user.email,
        phase,
        daysSinceLastMessage,
        generatedMessage,
      },
    });
  } catch (error) {
    console.error('Failed to generate follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate follow-up message' },
      { status: 500 }
    );
  }
}
