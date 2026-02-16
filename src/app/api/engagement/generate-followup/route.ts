/**
 * Generate Follow-up Message API
 * Uses AI to generate a personalized follow-up message for an inactive student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentWithUser } from '@/db/queries/students';
import { getConversationByStudentId } from '@/db/queries/conversations';
import { getRecentMessages, createMessage } from '@/db/queries/messages';
import { getClaudeClient } from '@/services/agent/claude';

const FOLLOWUP_PROMPT = `You are Dr. Raj Dandekar, PhD (MIT), the lead instructor for the Vizuara Scientific ML Bootcamp.

A student has been inactive for a while and you need to send them a warm, encouraging follow-up message.

IMPORTANT GUIDELINES:
1. Be warm and personal - use their first name
2. Don't make them feel guilty about the inactivity
3. Express genuine belief in their potential
4. Emphasize the CAREER VALUE of completing the bootcamp and publishing research
5. Keep it concise (2-3 short paragraphs max)
6. Sound like a mentor, not a chatbot
7. End with an open question to encourage a response

KEY MOTIVATIONAL POINTS TO INCLUDE:
- For Phase I: Emphasize that completing the foundations leads to publishing a high-impact research paper
- For Phase II: Emphasize that their research can lead to an impactful publication that adds significant value to their career
- Express belief in them: "I strongly believe you are a proactive student and this can lead to an impactful publication"
- Mention the career benefits of having a published paper in Scientific ML

CRITICAL - NEVER DO THESE:
- NEVER mention scheduling a call or video call - this is an asynchronous mentorship
- NEVER suggest "hopping on a call" or "let's schedule a meeting"
- NEVER use excessive enthusiasm ("Amazing!", "Fantastic!")
- NEVER sound like a corporate email
- NEVER be preachy or lecture them
- NEVER use emojis

TONE: Warm, supportive, direct, mentor-like, career-focused`;

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
  ? `In Phase I, students watch video lectures on Julia, ODEs, PDEs, Neural Networks, PINNs, Neural ODEs, and UDEs.
MOTIVATION ANGLE: Completing Phase I sets them up for Phase II where they will publish a research paper - a huge career boost in the Scientific ML field.`
  : `In Phase II, students work on a research project.${student.researchTopic ? ` Their topic is: ${student.researchTopic}` : ' They have not selected a topic yet.'}
MOTIVATION ANGLE: Their research can become a published paper that significantly enhances their career and credibility in the Scientific ML space.`
}
${conversationContext}

Remember:
- Express belief in their potential ("I strongly believe you can produce impactful work")
- Emphasize career value of publication
- NEVER mention calls or meetings - this is async only
- Keep it warm and encouraging

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
