/**
 * Roadmap tools for the teaching assistant
 * Tools for generating and managing research roadmaps
 */

import type { Tool, ToolHandler, ToolResult, ToolContext } from './types';
import type { ToolRegistry } from './registry';
import {
  getResearchTopic,
  generateRoadmapStructure,
  formatRoadmapAsMarkdown,
  getRoadmapPromptContext,
} from '@/services/resources';
import { getStudentById } from '@/db/queries/students';
import { getRoadmapByStudentId, createRoadmap } from '@/db/queries/roadmaps';
import { getStudentProfile } from '@/services/memory';

// ============== TOOL DEFINITIONS ==============

export const roadmapToolDefinitions = {
  generate_roadmap: {
    name: 'generate_roadmap',
    description:
      'Generate a detailed research roadmap for the student\'s chosen topic. Only use after topic is confirmed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic_id: {
          type: 'string' as const,
          description: 'Research topic ID',
        },
        duration_weeks: {
          type: 'number' as const,
          description: 'Duration in weeks (8-12)',
        },
        custom_requirements: {
          type: 'string' as const,
          description: 'Any custom requirements from student',
        },
      },
      required: ['topic_id'],
    },
  } satisfies Tool,

  get_milestone_details: {
    name: 'get_milestone_details',
    description:
      "Get details of a specific milestone in the student's roadmap.",
    input_schema: {
      type: 'object' as const,
      properties: {
        milestone_number: {
          type: 'number' as const,
          description: 'Milestone number (1-5)',
        },
      },
      required: ['milestone_number'],
    },
  } satisfies Tool,
};

// ============== TOOL HANDLERS ==============

const generateRoadmapHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { topic_id, duration_weeks = 8, custom_requirements } = input;

  if (!topic_id || typeof topic_id !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: topic_id',
    };
  }

  try {
    // Get topic details
    const topic = getResearchTopic(topic_id);
    if (!topic) {
      return {
        success: false,
        error: `Research topic ${topic_id} not found`,
      };
    }

    // Get student profile for name
    const profile = await getStudentProfile(context.studentId);
    const studentName = profile?.name || 'Student';

    // Generate roadmap structure
    const roadmap = generateRoadmapStructure(studentName, topic, duration_weeks);

    // Add custom requirements note if provided
    if (custom_requirements) {
      roadmap.abstract = `Custom requirements: ${custom_requirements}\n\n`;
    }

    // Save roadmap to database
    await createRoadmap({
      studentId: context.studentId,
      topic: topic.title,
      content: roadmap as any,
    });

    // Format as markdown for display
    const markdown = formatRoadmapAsMarkdown(roadmap as any);

    // Get generation guidelines for context
    const guidelines = getRoadmapPromptContext();

    return {
      success: true,
      data: {
        roadmap,
        markdown,
        guidelines,
        message: `Roadmap generated for "${topic.title}"`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate roadmap',
    };
  }
};

const getMilestoneDetailsHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { milestone_number } = input;

  if (milestone_number === undefined || typeof milestone_number !== 'number') {
    return {
      success: false,
      error: 'Missing required parameter: milestone_number',
    };
  }

  try {
    // Get student's roadmap
    const roadmap = await getRoadmapByStudentId(context.studentId);
    if (!roadmap) {
      return {
        success: false,
        error: 'No roadmap found for this student. Generate a roadmap first.',
      };
    }

    const content = roadmap.content as any;
    const milestones = content.milestones || [];

    // Find the milestone
    const milestone = milestones.find((m: any) => m.number === milestone_number);
    if (!milestone) {
      return {
        success: false,
        error: `Milestone ${milestone_number} not found. Available milestones: 1-${milestones.length}`,
      };
    }

    // Get student's current milestone
    const student = await getStudentById(context.studentId);
    const currentMilestone = student?.currentMilestone || 0;

    return {
      success: true,
      data: {
        milestone,
        isCurrentMilestone: milestone_number === currentMilestone,
        totalMilestones: milestones.length,
        roadmapTopic: roadmap.topic,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get milestone details',
    };
  }
};

// ============== REGISTRATION ==============

/**
 * Register all roadmap tools with a registry
 */
export function registerRoadmapTools(registry: ToolRegistry): void {
  registry.register(roadmapToolDefinitions.generate_roadmap, generateRoadmapHandler);
  registry.register(roadmapToolDefinitions.get_milestone_details, getMilestoneDetailsHandler);
}

/**
 * Get all roadmap tools (for selective registration)
 */
export function getRoadmapTools(): Tool[] {
  return Object.values(roadmapToolDefinitions);
}
