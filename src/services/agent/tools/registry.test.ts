/**
 * Tool registry tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, createToolRegistry } from './registry';
import type { Tool, ToolHandler, ToolContext, ToolResult } from './types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = createToolRegistry();
  });

  describe('register', () => {
    it('should register a tool with its handler', () => {
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Test query' },
          },
          required: ['query'],
        },
      };

      const handler: ToolHandler = async () => ({ success: true, data: 'test' });

      registry.register(tool, handler);

      expect(registry.hasTool('test_tool')).toBe(true);
    });

    it('should throw error when registering duplicate tool', () => {
      const tool: Tool = {
        name: 'duplicate_tool',
        description: 'A test tool',
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      const handler: ToolHandler = async () => ({ success: true });

      registry.register(tool, handler);

      expect(() => registry.register(tool, handler)).toThrow('Tool duplicate_tool already registered');
    });
  });

  describe('getTools', () => {
    it('should return all registered tools', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        input_schema: { type: 'object', properties: {}, required: [] },
      };
      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        input_schema: { type: 'object', properties: {}, required: [] },
      };

      registry.register(tool1, async () => ({ success: true }));
      registry.register(tool2, async () => ({ success: true }));

      const tools = registry.getTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain('tool1');
      expect(tools.map((t) => t.name)).toContain('tool2');
    });

    it('should return empty array when no tools registered', () => {
      expect(registry.getTools()).toHaveLength(0);
    });
  });

  describe('getTool', () => {
    it('should return specific tool by name', () => {
      const tool: Tool = {
        name: 'specific_tool',
        description: 'A specific tool',
        input_schema: { type: 'object', properties: {}, required: [] },
      };

      registry.register(tool, async () => ({ success: true }));

      const retrieved = registry.getTool('specific_tool');
      expect(retrieved).toEqual(tool);
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.getTool('nonexistent')).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should execute tool handler and return result', async () => {
      const tool: Tool = {
        name: 'exec_tool',
        description: 'Executable tool',
        input_schema: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
          required: ['value'],
        },
      };

      const handler: ToolHandler = async (input) => ({
        success: true,
        data: `Received: ${input.value}`,
      });

      registry.register(tool, handler);

      const context: ToolContext = {
        studentId: 'student-123',
        currentPhase: 'phase1',
      };

      const result = await registry.execute('exec_tool', { value: 'test' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Received: test');
    });

    it('should return error result for non-existent tool', async () => {
      const context: ToolContext = {
        studentId: 'student-123',
        currentPhase: 'phase1',
      };

      const result = await registry.execute('nonexistent', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool nonexistent not found');
    });

    it('should catch and return handler errors', async () => {
      const tool: Tool = {
        name: 'error_tool',
        description: 'Tool that errors',
        input_schema: { type: 'object', properties: {}, required: [] },
      };

      const handler: ToolHandler = async () => {
        throw new Error('Handler failed');
      };

      registry.register(tool, handler);

      const context: ToolContext = {
        studentId: 'student-123',
        currentPhase: 'phase1',
      };

      const result = await registry.execute('error_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler failed');
    });
  });

  describe('getToolNames', () => {
    it('should return array of tool names', () => {
      const tool1: Tool = {
        name: 'alpha_tool',
        description: 'Alpha',
        input_schema: { type: 'object', properties: {}, required: [] },
      };
      const tool2: Tool = {
        name: 'beta_tool',
        description: 'Beta',
        input_schema: { type: 'object', properties: {}, required: [] },
      };

      registry.register(tool1, async () => ({ success: true }));
      registry.register(tool2, async () => ({ success: true }));

      const names = registry.getToolNames();
      expect(names).toContain('alpha_tool');
      expect(names).toContain('beta_tool');
    });
  });
});
