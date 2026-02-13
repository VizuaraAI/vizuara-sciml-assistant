/**
 * Send Voice Note API
 * Sends a pre-recorded voice note from Dr. Raj to a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentWithUser } from '@/db/queries/students';
import { getOrCreateConversation } from '@/db/queries/conversations';
import { createMessage } from '@/db/queries/messages';
import path from 'path';
import fs from 'fs';

// Voice note configurations
const VOICE_NOTES = {
  phase1: {
    motivation: {
      filename: 'phase1-motivation.mp3',
      description: 'Motivational message for Phase I students',
      messageText: `Hey! I just wanted to send you a quick voice note to check in.

I know the bootcamp can feel overwhelming sometimes, but you're making great progress. Take it one video at a time - that's all you need to do.

I've attached a voice note for you. Give it a listen when you get a chance.

Looking forward to hearing from you!

- Dr. Raj`,
    },
  },
  phase2: {
    motivation: {
      filename: 'phase2-motivation.mp3',
      description: 'Motivational message for Phase II students',
      messageText: `Hey! I wanted to send you a quick voice note to check in on your research progress.

Research can be challenging, but remember - every paper goes through a messy middle phase. That's completely normal.

I've attached a voice note with some thoughts. Give it a listen when you get a chance.

Let me know how things are going!

- Dr. Raj`,
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const { studentId, noteType = 'motivation' } = await request.json();

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
    const phase = student.currentPhase as 'phase1' | 'phase2';

    // Get the voice note config
    const phaseNotes = VOICE_NOTES[phase];
    const noteConfig = phaseNotes[noteType as keyof typeof phaseNotes];

    if (!noteConfig) {
      return NextResponse.json(
        { success: false, error: `No voice note available for ${phase}/${noteType}` },
        { status: 404 }
      );
    }

    // Check if source file exists
    const voiceNotePath = path.join(
      process.cwd(),
      'resources',
      `${phase}-voice-notes`,
      noteConfig.filename
    );

    if (!fs.existsSync(voiceNotePath)) {
      return NextResponse.json(
        { success: false, error: `Voice note file not found: ${noteConfig.filename}` },
        { status: 404 }
      );
    }

    // Copy to public folder for serving
    const publicDir = path.join(process.cwd(), 'public', 'voice-notes');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const publicFilename = `${phase}_${noteType}_${Date.now()}.mp3`;
    const publicPath = path.join(publicDir, publicFilename);
    fs.copyFileSync(voiceNotePath, publicPath);

    const voiceNoteUrl = `/voice-notes/${publicFilename}`;

    // Create conversation if doesn't exist
    const conversation = await getOrCreateConversation(studentId);

    // Create the message with voice note attachment
    const messageContent = noteConfig.messageText.replace('{name}', user.name.split(' ')[0]);

    await createMessage({
      conversationId: conversation.id,
      role: 'agent',
      content: `${messageContent}\n\n🎧 [Voice Note from Dr. Raj](${voiceNoteUrl})`,
      status: 'sent',
    });

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        studentName: user.name,
        phase,
        noteType,
        voiceNoteUrl,
        message: `Voice note sent to ${user.name}`,
      },
    });
  } catch (error) {
    console.error('Failed to send voice note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send voice note' },
      { status: 500 }
    );
  }
}
