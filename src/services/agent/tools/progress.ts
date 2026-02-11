/**
 * Progress tools for the teaching assistant
 * Tools for reading and updating student progress
 */

import type { Tool, ToolHandler, ToolResult, ToolContext } from './types';
import type { ToolRegistry } from './registry';
import { getStudentById, updateStudent } from '@/db/queries/students';
import { getProgressByStudentId, updateProgress, createProgress } from '@/db/queries/progress';

// ============== TOOL DEFINITIONS ==============

export const progressToolDefinitions = {
  get_student_progress: {
    name: 'get_student_progress',
    description:
      'Get the current progress of the student including phase, topic/milestone, and status.',
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
    const student = await getStudentById(context.studentId);

    if (!student) {
      return {
        success: false,
        error: `Student ${context.studentId} not found`,
      };
    }

    const progressRecords = await getProgressByStudentId(context.studentId);

    // Calculate summary
    const completedTopics = progressRecords.filter(
      (p) => p.phase === 'phase1' && p.status === 'completed'
    ).length;

    const completedMilestones = progressRecords.filter(
      (p) => p.phase === 'phase2' && p.status === 'completed'
    ).length;

    return {
      success: true,
      data: {
        studentId: context.studentId,
        currentPhase: student.currentPhase,
        currentTopicIndex: student.currentTopicIndex,
        currentMilestone: student.currentMilestone,
        researchTopic: student.researchTopic,
        completedTopics,
        completedMilestones,
        totalTopics: 8,
        totalMilestones: 4,
        progressRecords,
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
    const student = await getStudentById(context.studentId);
    if (!student) {
      return {
        success: false,
        error: `Student ${context.studentId} not found`,
      };
    }

    // Update student record if topic or milestone changed
    const updates: Record<string, any> = {};
    if (topic_index !== undefined) {
      updates.currentTopicIndex = topic_index;
    }
    if (milestone !== undefined) {
      updates.currentMilestone = milestone;
    }

    if (Object.keys(updates).length > 0) {
      await updateStudent(context.studentId, updates);
    }

    // Update or create progress record
    if (student.currentPhase === 'phase1' && topic_index !== undefined) {
      await createProgress({
        studentId: context.studentId,
        phase: 'phase1',
        topicIndex: topic_index,
        status: status || 'in_progress',
        notes: notes || null,
      });
    } else if (student.currentPhase === 'phase2' && milestone !== undefined) {
      await createProgress({
        studentId: context.studentId,
        phase: 'phase2',
        milestone,
        status: status || 'in_progress',
        notes: notes || null,
      });
    }

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
    const student = await getStudentById(context.studentId);
    if (!student) {
      return {
        success: false,
        error: `Student ${context.studentId} not found`,
      };
    }

    // Update student to Phase II
    await updateStudent(context.studentId, {
      currentPhase: 'phase2',
      phase2Start: new Date(),
      researchTopic: research_topic,
      currentMilestone: 1,
    });

    // Create initial Phase II progress
    await createProgress({
      studentId: context.studentId,
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
