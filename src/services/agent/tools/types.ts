/**
 * Tool type definitions for Claude API
 */

// Claude API tool format
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required: string[];
  };
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: PropertySchema;
}

// Tool execution context
export interface ToolContext {
  studentId: string;
  conversationId?: string;
  currentPhase: 'phase1' | 'phase2';
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Tool handler function type
export type ToolHandler = (
  input: Record<string, any>,
  context: ToolContext
) => Promise<ToolResult>;

// Tool call from Claude API
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

// Tool result for Claude API
export interface ToolResultMessage {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}
