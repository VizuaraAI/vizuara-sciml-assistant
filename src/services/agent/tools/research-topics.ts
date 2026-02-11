/**
 * Research topics tools for the teaching assistant
 * Tools for exploring and selecting research topics
 */

import type { Tool, ToolHandler, ToolResult } from './types';
import type { ToolRegistry } from './registry';
import {
  searchResearchTopics,
  getResearchTopic,
  suggestTopics,
} from '@/services/resources/research-topics';

// ============== TOOL DEFINITIONS ==============

export const researchToolDefinitions = {
  search_research_topics: {
    name: 'search_research_topics',
    description:
      'Search available research topics by keyword or category. Use when helping a student choose their research project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Search query or interest area',
        },
        category: {
          type: 'string' as const,
          description: "Optional category filter (e.g., 'Healthcare', 'Finance')",
        },
      },
      required: ['query'],
    },
  } satisfies Tool,

  get_topic_details: {
    name: 'get_topic_details',
    description:
      'Get full details of a specific research topic including description and requirements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic_id: {
          type: 'string' as const,
          description: "Topic ID (e.g., '1.2' for Category 1, Topic 2)",
        },
      },
      required: ['topic_id'],
    },
  } satisfies Tool,

  suggest_topics: {
    name: 'suggest_topics',
    description:
      'Get topic suggestions based on student interests and background.',
    input_schema: {
      type: 'object' as const,
      properties: {
        interests: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: "List of student interests (e.g., ['healthcare', 'NLP', 'agents'])",
        },
      },
      required: ['interests'],
    },
  } satisfies Tool,
};

// ============== TOOL HANDLERS ==============

const searchResearchTopicsHandler: ToolHandler = async (input): Promise<ToolResult> => {
  const { query, category } = input;

  if (!query || typeof query !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: query',
    };
  }

  try {
    const results = searchResearchTopics(query, category);

    return {
      success: true,
      data: {
        query,
        category: category || null,
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

const getTopicDetailsHandler: ToolHandler = async (input): Promise<ToolResult> => {
  const { topic_id } = input;

  if (!topic_id || typeof topic_id !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: topic_id',
    };
  }

  try {
    const topic = getResearchTopic(topic_id);

    if (!topic) {
      return {
        success: false,
        error: `Research topic ${topic_id} not found`,
      };
    }

    return {
      success: true,
      data: {
        topic,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get topic details',
    };
  }
};

const suggestTopicsHandler: ToolHandler = async (input): Promise<ToolResult> => {
  const { interests } = input;

  if (!interests || !Array.isArray(interests)) {
    return {
      success: false,
      error: 'Missing required parameter: interests (must be an array)',
    };
  }

  try {
    const suggestions = suggestTopics(interests);

    return {
      success: true,
      data: {
        interests,
        suggestions,
        count: suggestions.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    };
  }
};

// ============== REGISTRATION ==============

/**
 * Register all research topics tools with a registry
 */
export function registerResearchTopicsTools(registry: ToolRegistry): void {
  registry.register(researchToolDefinitions.search_research_topics, searchResearchTopicsHandler);
  registry.register(researchToolDefinitions.get_topic_details, getTopicDetailsHandler);
  registry.register(researchToolDefinitions.suggest_topics, suggestTopicsHandler);
}

/**
 * Get all research topics tools (for selective registration)
 */
export function getResearchTopicsTools(): Tool[] {
  return Object.values(researchToolDefinitions);
}
