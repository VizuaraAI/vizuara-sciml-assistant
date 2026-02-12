/**
 * OpenAI API Client Wrapper
 * Handles communication with the OpenAI API (GPT-5.2)
 * Note: File kept as claude.ts to minimize code changes elsewhere
 */

import OpenAI from 'openai';
import { env } from '@/lib/env';
import type { Tool, ToolCall, ToolResultMessage } from './tools/types';

// Types for API (keeping names for compatibility)
export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: string;
}

export interface ClaudeResponse {
  content: string;
  toolCalls: ToolCall[];
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ChatOptions {
  system: string;
  messages: ClaudeMessage[];
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Convert our tool format to OpenAI function format
 */
function convertToolsToOpenAI(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * OpenAI API Client (aliased as ClaudeClient for compatibility)
 */
class ClaudeClient {
  private client: OpenAI;
  private model: string = 'gpt-4o'; // Using GPT-4o as latest available

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Send a chat message and get a response
   */
  async chat(options: ChatOptions): Promise<ClaudeResponse> {
    const { system, messages, tools, maxTokens = 4096, temperature = 0.7 } = options;

    try {
      // Build OpenAI messages array
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: system },
      ];

      // Convert our messages to OpenAI format
      for (const msg of messages) {
        if (msg.role === 'user') {
          openaiMessages.push({
            role: 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          });
        } else if (msg.role === 'assistant') {
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            openaiMessages.push({
              role: 'assistant',
              content: msg.content || null,
              tool_calls: msg.tool_calls,
            });
          } else {
            openaiMessages.push({
              role: 'assistant',
              content: typeof msg.content === 'string' ? msg.content : '',
            });
          }
        } else if (msg.role === 'tool' && msg.tool_call_id) {
          openaiMessages.push({
            role: 'tool',
            tool_call_id: msg.tool_call_id,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          });
        }
      }

      // Build request options
      const requestOptions: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        messages: openaiMessages,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestOptions.tools = convertToolsToOpenAI(tools);
        requestOptions.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(requestOptions);

      return this.parseResponse(response);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Send a chat with automatic tool execution loop
   * Continues until the model stops calling tools
   */
  async chatWithToolLoop(
    options: ChatOptions,
    executeToolCall: (call: ToolCall) => Promise<string>
  ): Promise<ClaudeResponse> {
    let { messages } = options;
    let response = await this.chat({ ...options, messages });
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    // Continue while there are tool calls and we haven't hit the limit
    while (response.toolCalls.length > 0 && iterations < maxIterations) {
      iterations++;

      // Build the assistant message with tool calls
      const assistantMessage: ClaudeMessage = {
        role: 'assistant',
        content: response.content || null,
        tool_calls: response.toolCalls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: {
            name: call.name,
            arguments: JSON.stringify(call.input),
          },
        })),
      };

      messages = [...messages, assistantMessage];

      // Execute tool calls and add results
      for (const call of response.toolCalls) {
        const result = await executeToolCall(call);
        const toolMessage: ClaudeMessage = {
          role: 'tool',
          content: result,
          tool_call_id: call.id,
        };
        messages = [...messages, toolMessage];
      }

      // Get next response
      response = await this.chat({ ...options, messages });
    }

    return response;
  }

  /**
   * Parse the API response into our format
   */
  private parseResponse(response: OpenAI.Chat.ChatCompletion): ClaudeResponse {
    const choice = response.choices[0];
    const message = choice.message;

    let textContent = message.content || '';
    const toolCalls: ToolCall[] = [];

    // Parse tool calls if present
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments || '{}'),
          });
        }
      }
    }

    return {
      content: textContent,
      toolCalls,
      stopReason: choice.finish_reason || 'stop',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    };
  }

  /**
   * Format tool result for the API
   */
  formatToolResult(toolUseId: string, result: any): ToolResultMessage {
    return {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    };
  }
}

// Singleton instance
let clientInstance: ClaudeClient | null = null;

/**
 * Get the client instance
 */
export function getClaudeClient(): ClaudeClient {
  if (!clientInstance) {
    clientInstance = new ClaudeClient();
  }
  return clientInstance;
}

/**
 * Reset the client (for testing)
 */
export function resetClaudeClient(): void {
  clientInstance = null;
}

export { ClaudeClient };
