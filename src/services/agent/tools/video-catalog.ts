/**
 * Video catalog tools for the teaching assistant
 * Tools for searching and accessing video content
 */

import type { Tool, ToolHandler, ToolResult } from './types';
import type { ToolRegistry } from './registry';
import {
  searchVideoCatalog,
  getLesson,
  getVideoTopic,
} from '@/services/resources/video-catalog';

// ============== TOOL DEFINITIONS ==============

export const videoToolDefinitions = {
  search_video_catalog: {
    name: 'search_video_catalog',
    description:
      'Search the video curriculum for lessons matching a query. Use this when a student asks about a specific topic to find relevant lessons.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Search query (topic, keyword, or concept)',
        },
      },
      required: ['query'],
    },
  } satisfies Tool,

  get_lesson_details: {
    name: 'get_lesson_details',
    description:
      "Get full details of a specific lesson by ID. Use this to provide accurate information about lesson content.",
    input_schema: {
      type: 'object' as const,
      properties: {
        lesson_id: {
          type: 'string' as const,
          description: "Lesson ID (e.g., '3.2' for Topic 3, Lesson 2)",
        },
      },
      required: ['lesson_id'],
    },
  } satisfies Tool,
};

// ============== TOOL HANDLERS ==============

const searchVideoCatalogHandler: ToolHandler = async (input): Promise<ToolResult> => {
  const { query } = input;

  if (!query || typeof query !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: query',
    };
  }

  try {
    const results = searchVideoCatalog(query);

    return {
      success: true,
      data: {
        query,
        results,
        count: results.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
};

const getLessonDetailsHandler: ToolHandler = async (input): Promise<ToolResult> => {
  const { lesson_id } = input;

  if (!lesson_id || typeof lesson_id !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: lesson_id',
    };
  }

  try {
    const lesson = getLesson(lesson_id);

    if (!lesson) {
      return {
        success: false,
        error: `Lesson ${lesson_id} not found`,
      };
    }

    // Get topic info for context
    const topic = getVideoTopic(lesson.topicId);

    return {
      success: true,
      data: {
        lesson,
        topic: topic
          ? {
              id: topic.id,
              title: topic.title,
              lessonCount: topic.lessonCount,
            }
          : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get lesson details',
    };
  }
};

// ============== REGISTRATION ==============

/**
 * Register all video catalog tools with a registry
 */
export function registerVideoCatalogTools(registry: ToolRegistry): void {
  registry.register(videoToolDefinitions.search_video_catalog, searchVideoCatalogHandler);
  registry.register(videoToolDefinitions.get_lesson_details, getLessonDetailsHandler);
}

/**
 * Get all video catalog tools (for selective registration)
 */
export function getVideoCatalogTools(): Tool[] {
  return Object.values(videoToolDefinitions);
}
