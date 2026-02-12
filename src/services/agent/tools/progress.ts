/**
 * Progress tools for the teaching assistant
 * Tools for reading and updating student progress
 */

import { createClient } from '@supabase/supabase-js';
import type { Tool, ToolHandler, ToolResult, ToolContext } from './types';
import type { ToolRegistry } from './registry';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============== TOOL DEFINITIONS ==============

export const progressToolDefinitions = {
  get_student_progress: {
    name: 'get_student_progress',
    description:
      'Get the current progress of the student including phase, topic/milestone, and detailed status.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  } satisfies Tool,

  update_student_progress: {
    name: 'update_student_progress',
    description:
      'Update student progress. Use when student completes a topic or milestone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic_index: {
          type: 'number' as const,
          description: 'Current topic index (Phase I)',
        },
        milestone: {
          type: 'number' as const,
          description: 'Current milestone (Phase II)',
        },
        status: {
          type: 'string' as const,
          enum: ['not_started', 'in_progress', 'completed'],
          description: 'Progress status',
        },
        notes: {
          type: 'string' as const,
          description: 'Progress notes',
        },
      },
      required: [],
    },
  } satisfies Tool,

  transition_to_phase2: {
    name: 'transition_to_phase2',
    description:
      'Transition student from Phase I to Phase II. Use after student completes video curriculum.',
    input_schema: {
      type: 'object' as const,
      properties: {
        research_topic: {
          type: 'string' as const,
          description: 'Chosen research topic',
        },
      },
      required: ['research_topic'],
    },
  } satisfies Tool,
};

// ============== TOOL HANDLERS ==============

const getStudentProgressHandler: ToolHandler = async (
  _input,
  context: ToolContext
): Promise<ToolResult> => {
  try {
    // Get student with user info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        users!students_user_id_fkey (name, email)
      `)
      .eq('id', context.studentId)
      .single();

    if (studentError || !student) {
      return {
        success: false,
        error: `Student ${context.studentId} not found`,
      };
    }

    // Get progress records
    const { data: progressRecords, error: progressError } = await supabase
      .from('progress')
      .select('*')
      .eq('student_id', context.studentId)
      .order('created_at', { ascending: false });

    if (progressError) {
      return {
        success: false,
        error: `Failed to get progress: ${progressError.message}`,
      };
    }

    // Calculate summary
    const completedTopics = (progressRecords || []).filter(
      (p: any) => p.phase === 'phase1' && p.status === 'completed'
    ).length;

    const completedMilestones = (progressRecords || []).filter(
      (p: any) => p.phase === 'phase2' && p.status === 'completed'
    ).length;

    return {
      success: true,
      data: {
        studentId: context.studentId,
        studentName: student.users?.name || 'Unknown',
        currentPhase: student.current_phase,
        currentTopicIndex: student.current_topic_index,
        currentMilestone: student.current_milestone,
        researchTopic: student.research_topic,
        enrollmentDate: student.enrollment_date,
        phase1Start: student.phase1_start,
        phase2Start: student.phase2_start,
        completedTopics,
        completedMilestones,
        totalTopics: 8,
        totalMilestones: 4,
        progressRecords: progressRecords || [],
        summary: student.current_phase === 'phase1'
          ? `Currently on Topic ${student.current_topic_index} of 8 in Phase I (Video Learning). ${completedTopics} topics completed.`
          : `Currently on Milestone ${student.current_milestone} of 4 in Phase II (Research Project). Research topic: ${student.research_topic || 'Not selected'}. ${completedMilestones} milestones completed.`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get progress',
    };
  }
};

const updateStudentProgressHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { topic_index, milestone, status, notes } = input;

  try {
    // Get current student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', context.studentId)
      .single();

    if (studentError || !student) {
      return {
        success: false,
        error: `Student ${context.studentId} not found`,
      };
    }

    // Update student record if topic or milestone changed
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (topic_index !== undefined) {
      updates.current_topic_index = topic_index;
    }
    if (milestone !== undefined) {
      updates.current_milestone = milestone;
    }

    const { error: updateError } = await supabase
      .from('students')
      .update(updates)
      .eq('id', context.studentId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update student: ${updateError.message}`,
      };
    }

    // Create progress record
    const progressRecord: any = {
      student_id: context.studentId,
      phase: student.current_phase,
      status: status || 'in_progress',
      notes: notes || null,
    };

    if (student.current_phase === 'phase1' && topic_index !== undefined) {
      progressRecord.topic_index = topic_index;
    } else if (student.current_phase === 'phase2' && milestone !== undefined) {
      progressRecord.milestone = milestone;
    }

    await supabase.from('progress').insert(progressRecord);

    return {
      success: true,
      data: {
        message: 'Progress updated successfully',
        updates: { topic_index, milestone, status, notes },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update progress',
    };
  }
};

const transitionToPhase2Handler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { research_topic } = input;

  if (!research_topic || typeof research_topic !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: research_topic',
    };
  }

  try {
    // Update student to Phase II
    const { error: updateError } = await supabase
      .from('students')
      .update({
        current_phase: 'phase2',
        phase2_start: new Date().toISOString(),
        research_topic: research_topic,
        current_milestone: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.studentId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to transition: ${updateError.message}`,
      };
    }

    // Create initial Phase II progress
    await supabase.from('progress').insert({
      student_id: context.studentId,
      phase: 'phase2',
      milestone: 1,
      status: 'not_started',
      notes: `Starting research on: ${research_topic}`,
    });

    return {
      success: true,
      data: {
        message: 'Successfully transitioned to Phase II',
        researchTopic: research_topic,
        currentMilestone: 1,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transition to Phase II',
    };
  }
};

// ============== REGISTRATION ==============

/**
 * Register all progress tools with a registry
 */
export function registerProgressTools(registry: ToolRegistry): void {
  registry.register(progressToolDefinitions.get_student_progress, getStudentProgressHandler);
  registry.register(progressToolDefinitions.update_student_progress, updateStudentProgressHandler);
  registry.register(progressToolDefinitions.transition_to_phase2, transitionToPhase2Handler);
}

/**
 * Get all progress tools (for selective registration)
 */
export function getProgressTools(): Tool[] {
  return Object.values(progressToolDefinitions);
}
