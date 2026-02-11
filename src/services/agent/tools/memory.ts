/**
 * Memory tools for the teaching assistant
 * Tools for reading and writing student memory
 */

import type { Tool, ToolHandler, ToolResult, ToolContext } from './types';
import type { ToolRegistry } from './registry';
import {
  getStudentMemory,
  setStudentMemory,
  appendStudentMemory,
  getStudentProfile,
} from '@/services/memory';

// ============== TOOL DEFINITIONS ==============

export const memoryToolDefinitions = {
  get_student_memory: {
    name: 'get_student_memory',
    description:
      'Retrieve information from long-term memory about the student.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: {
          type: 'string' as const,
          description: "Memory key (e.g., 'interests', 'learning_style', 'challenges'). If not specified, returns full student profile.",
        },
      },
      required: [],
    },
  } satisfies Tool,

  save_student_memory: {
    name: 'save_student_memory',
    description:
      'Save important information about the student to long-term memory for future reference.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: {
          type: 'string' as const,
          description: 'Memory key',
        },
        value: {
          type: 'string' as const,
          description: 'Value to store',
        },
        append: {
          type: 'boolean' as const,
          description: 'If true, append to existing array',
        },
      },
      required: ['key', 'value'],
    },
  } satisfies Tool,
};

// ============== TOOL HANDLERS ==============

const getStudentMemoryHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { key } = input;

  try {
    // If no key specified, return full profile
    if (!key) {
      const profile = await getStudentProfile(context.studentId);
      if (!profile) {
        return {
          success: false,
          error: `Student ${context.studentId} not found`,
        };
      }
      return {
        success: true,
        data: {
          profile,
        },
      };
    }

    // Get specific memory value
    const value = await getStudentMemory(context.studentId, key);

    return {
      success: true,
      data: {
        key,
        value,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memory',
    };
  }
};

const saveStudentMemoryHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { key, value, append } = input;

  if (!key || typeof key !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: key',
    };
  }

  if (value === undefined || value === null) {
    return {
      success: false,
      error: 'Missing required parameter: value',
    };
  }

  try {
    if (append) {
      await appendStudentMemory(context.studentId, key, value);
    } else {
      await setStudentMemory(context.studentId, key, value);
    }

    return {
      success: true,
      data: {
        message: `Memory ${append ? 'appended to' : 'saved for'} key: ${key}`,
        key,
        value,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save memory',
    };
  }
};

// ============== REGISTRATION ==============

/**
 * Register all memory tools with a registry
 */
export function registerMemoryTools(registry: ToolRegistry): void {
  registry.register(memoryToolDefinitions.get_student_memory, getStudentMemoryHandler);
  registry.register(memoryToolDefinitions.save_student_memory, saveStudentMemoryHandler);
}

/**
 * Get all memory tools (for selective registration)
 */
export function getMemoryTools(): Tool[] {
  return Object.values(memoryToolDefinitions);
}
