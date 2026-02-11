/**
 * Tool registry for the teaching assistant agent
 * Manages tool registration and execution
 */

import type { Tool, ToolHandler, ToolContext, ToolResult } from './types';

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /**
   * Register a tool with its handler
   */
  register(tool: Tool, handler: ToolHandler): void;

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean;

  /**
   * Get all registered tools
   */
  getTools(): Tool[];

  /**
   * Get a specific tool by name
   */
  getTool(name: string): Tool | undefined;

  /**
   * Get all tool names
   */
  getToolNames(): string[];

  /**
   * Execute a tool by name
   */
  execute(name: string, input: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

/**
 * Create a new tool registry
 */
export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>();
  const handlers = new Map<string, ToolHandler>();

  return {
    register(tool: Tool, handler: ToolHandler): void {
      if (tools.has(tool.name)) {
        throw new Error(`Tool ${tool.name} already registered`);
      }
      tools.set(tool.name, tool);
      handlers.set(tool.name, handler);
    },

    hasTool(name: string): boolean {
      return tools.has(name);
    },

    getTools(): Tool[] {
      return Array.from(tools.values());
    },

    getTool(name: string): Tool | undefined {
      return tools.get(name);
    },

    getToolNames(): string[] {
      return Array.from(tools.keys());
    },

    async execute(
      name: string,
      input: Record<string, any>,
      context: ToolContext
    ): Promise<ToolResult> {
      const handler = handlers.get(name);

      if (!handler) {
        return {
          success: false,
          error: `Tool ${name} not found`,
        };
      }

      try {
        return await handler(input, context);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}

// Default registry instance
let defaultRegistry: ToolRegistry | null = null;

/**
 * Get the default tool registry (singleton)
 */
export function getToolRegistry(): ToolRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createToolRegistry();
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (for testing)
 */
export function resetToolRegistry(): void {
  defaultRegistry = null;
}
