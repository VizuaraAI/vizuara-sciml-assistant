/**
 * Claude API Client Wrapper
 * Handles communication with the Anthropic API
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import type { Tool, ToolCall, ToolResultMessage } from './tools/types';

// Types for Claude API
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
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
 * Claude API Client
 */
class ClaudeClient {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Send a chat message and get a response
   */
  async chat(options: ChatOptions): Promise<ClaudeResponse> {
    const { system, messages, tools, maxTokens = 4096, temperature = 0.7 } = options;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: messages as any,
        tools: tools as any,
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error('Claude API error:', error);
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
      const assistantContent: ContentBlock[] = [];

      // Add text if present
      if (response.content) {
        assistantContent.push({ type: 'text', text: response.content });
      }

      // Add tool use blocks
      for (const call of response.toolCalls) {
        assistantContent.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: call.input,
        });
      }

      // Add assistant message
      messages = [
        ...messages,
        { role: 'assistant', content: assistantContent },
      ];

      // Execute tool calls and collect results
      const toolResults: ContentBlock[] = [];
      for (const call of response.toolCalls) {
        const result = await executeToolCall(call);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: result,
        });
      }

      // Add tool results as user message
      messages = [
        ...messages,
        { role: 'user', content: toolResults },
      ];

      // Get next response
      response = await this.chat({ ...options, messages });
    }

    return response;
  }

  /**
   * Parse the API response into our format
   */
  private parseResponse(response: Anthropic.Message): ClaudeResponse {
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, any>,
        });
      }
    }

    return {
      content: textContent,
      toolCalls,
      stopReason: response.stop_reason || 'end_turn',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
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
 * Get the Claude client instance
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
