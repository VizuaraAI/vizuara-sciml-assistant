/**
 * Voice Note tools for the teaching assistant
 * Delivers pre-recorded motivational voice notes from Dr. Raj
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import type { Tool, ToolHandler, ToolResult, ToolContext } from './types';
import type { ToolRegistry } from './registry';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============== TOOL DEFINITIONS ==============

export const voiceNoteToolDefinitions = {
  send_voice_note: {
    name: 'send_voice_note',
    description:
      'Send a pre-recorded motivational voice note from Dr. Raj to the student. Use this when the student has been inactive for 7+ days, seems discouraged, or needs extra encouragement. Available types: "motivation" (general encouragement), "progress" (celebrate progress), "reminder" (gentle nudge to continue).',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_type: {
          type: 'string' as const,
          enum: ['motivation', 'progress', 'reminder'],
          description: 'The type of voice note to send',
        },
        reason: {
          type: 'string' as const,
          description: 'Brief reason for sending the voice note (for logging)',
        },
      },
      required: ['note_type'],
    },
  } satisfies Tool,

  get_available_voice_notes: {
    name: 'get_available_voice_notes',
    description: 'List all available voice notes that can be sent to the student.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  } satisfies Tool,
};

// ============== VOICE NOTE MAPPING ==============

interface VoiceNoteConfig {
  filename: string;
  description: string;
  displayName: string;
}

const VOICE_NOTES: Record<string, Record<string, VoiceNoteConfig>> = {
  phase1: {
    motivation: {
      filename: 'phase1-motivation.mp3',
      description: 'General motivational message for Phase I students',
      displayName: 'Phase I Motivation',
    },
  },
  phase2: {
    motivation: {
      filename: 'phase2-motivation.mp3',
      description: 'General motivational message for Phase II students',
      displayName: 'Phase II Motivation',
    },
  },
};

// ============== TOOL HANDLERS ==============

const sendVoiceNoteHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { note_type, reason } = input;

  if (!note_type || typeof note_type !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: note_type',
    };
  }

  try {
    // Get student info to determine phase
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('current_phase')
      .eq('id', context.studentId)
      .single();

    if (studentError || !student) {
      return {
        success: false,
        error: 'Student not found',
      };
    }

    const phase = student.current_phase as 'phase1' | 'phase2';
    const phaseNotes = VOICE_NOTES[phase];

    // For now, map all note types to the motivation note (since that's what we have)
    const noteConfig = phaseNotes['motivation'];

    if (!noteConfig) {
      return {
        success: false,
        error: `No voice note available for ${phase}`,
      };
    }

    // Check if file exists
    const voiceNotePath = path.join(
      process.cwd(),
      'resources',
      `${phase}-voice-notes`,
      noteConfig.filename
    );

    if (!fs.existsSync(voiceNotePath)) {
      return {
        success: false,
        error: `Voice note file not found: ${noteConfig.filename}`,
      };
    }

    // Copy to public folder for serving
    const publicDir = path.join(process.cwd(), 'public', 'voice-notes');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const publicFilename = `${phase}_${note_type}_${Date.now()}.mp3`;
    const publicPath = path.join(publicDir, publicFilename);
    fs.copyFileSync(voiceNotePath, publicPath);

    const voiceNoteUrl = `/voice-notes/${publicFilename}`;

    // Log the voice note delivery
    console.log(`[Voice Note] Sent ${note_type} to student ${context.studentId}. Reason: ${reason || 'Not specified'}`);

    // Save to memory that we sent a voice note
    await supabase.from('memory').insert({
      student_id: context.studentId,
      memory_type: 'long_term',
      key: `voice_note_${Date.now()}`,
      value: {
        type: note_type,
        reason: reason || 'Proactive engagement',
        sentAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      data: {
        voiceNoteUrl,
        noteType: note_type,
        displayName: noteConfig.displayName,
        description: noteConfig.description,
        message: `Voice note "${noteConfig.displayName}" has been sent. The student can listen to it using the audio player.`,
      },
    };
  } catch (error) {
    console.error('Voice note error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send voice note',
    };
  }
};

const getAvailableVoiceNotesHandler: ToolHandler = async (
  _input,
  context: ToolContext
): Promise<ToolResult> => {
  try {
    // Get student's phase
    const { data: student } = await supabase
      .from('students')
      .select('current_phase')
      .eq('id', context.studentId)
      .single();

    const phase = (student?.current_phase || 'phase1') as 'phase1' | 'phase2';
    const phaseNotes = VOICE_NOTES[phase];

    const availableNotes = Object.entries(phaseNotes).map(([type, config]) => ({
      type,
      displayName: config.displayName,
      description: config.description,
    }));

    return {
      success: true,
      data: {
        phase,
        availableNotes,
        message: `${availableNotes.length} voice note(s) available for ${phase} students.`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get voice notes',
    };
  }
};

// ============== REGISTRATION ==============

export function registerVoiceNoteTools(registry: ToolRegistry): void {
  registry.register(voiceNoteToolDefinitions.send_voice_note, sendVoiceNoteHandler);
  registry.register(voiceNoteToolDefinitions.get_available_voice_notes, getAvailableVoiceNotesHandler);
}

export function getVoiceNoteTools(): Tool[] {
  return Object.values(voiceNoteToolDefinitions);
}
