/**
 * Teaching Assistant Agent Orchestrator
 * Main entry point for the agent
 */

import { getClaudeClient, type ClaudeMessage } from './claude';
import {
  getAgentContext,
  formatContextForAgent,
  updateMemoryFromConversation,
  type AgentContext,
} from '@/services/memory';
import { getResourceSummary } from '@/services/resources';
import { getBaseSystemPrompt, buildSystemPrompt } from './prompts/system';
import { buildPhase1Prompt, getPhase1Tools, handlePhase1Behaviors } from './phase1';
import { buildPhase2Prompt, getPhase2Tools, handlePhase2Behaviors } from './phase2';
import { saveDraft, type Draft } from './draft';
import { createFullToolRegistry, type ToolRegistry, type Tool, type ToolCall, type ToolContext } from './tools';
import { getConversationByStudentId, createConversation } from '@/db/queries/conversations';
import { createMessage, getRecentMessages } from '@/db/queries/messages';

// Response from the agent
export interface AgentResponse {
  content: string;
  toolCalls: ToolCall[];
  draft: Draft;
  tokensUsed: {
    input: number;
    output: number;
  };
}

// Debug info for development
export interface DebugInfo {
  systemPrompt: string;
  messagesCount: number;
  toolsAvailable: string[];
  phase: 'phase1' | 'phase2';
  studentContext: string;
}

/**
 * Teaching Assistant Agent
 */
class TeachingAssistant {
  private claude = getClaudeClient();
  private toolRegistry: ToolRegistry;

  constructor() {
    this.toolRegistry = createFullToolRegistry();
  }

  /**
   * Process a message from a student
   */
  async processMessage(
    studentId: string,
    message: string
  ): Promise<AgentResponse> {
    // 1. Load student context (memory, progress, phase)
    const context = await getAgentContext(studentId);
    if (!context) {
      throw new Error(`Student ${studentId} not found`);
    }

    // 2. Build system prompt based on phase
    const systemPrompt = this.buildFullSystemPrompt(context);

    // 3. Get conversation history
    const conversationMessages = await this.getConversationHistory(studentId);

    // 4. Add new user message
    const messages: ClaudeMessage[] = [
      ...conversationMessages,
      { role: 'user', content: message },
    ];

    // 5. Get tools for this phase
    const tools = this.getToolsForPhase(context.currentPhase);

    // 6. Create tool context
    const toolContext: ToolContext = {
      studentId,
      currentPhase: context.currentPhase,
    };

    // 7. Call Claude with tool loop
    const response = await this.claude.chatWithToolLoop(
      {
        system: systemPrompt,
        messages,
        tools,
      },
      async (call) => {
        const result = await this.toolRegistry.execute(call.name, call.input, toolContext);
        return JSON.stringify(result);
      }
    );

    // 8. Save user message to conversation
    await this.saveUserMessage(studentId, message);

    // 9. Save agent response as draft
    const draft = await saveDraft(
      studentId,
      response.content,
      response.toolCalls.length > 0 ? response.toolCalls : undefined
    );

    // 10. Update memory based on conversation
    await updateMemoryFromConversation(studentId, message, response.content);

    // 11. Handle phase-specific behaviors
    if (context.currentPhase === 'phase1') {
      await handlePhase1Behaviors(context, message, response.content);
    } else {
      await handlePhase2Behaviors(context, message, response.content);
    }

    return {
      content: response.content,
      toolCalls: response.toolCalls,
      draft,
      tokensUsed: {
        input: response.inputTokens,
        output: response.outputTokens,
      },
    };
  }

  /**
   * Build the system prompt based on context
   */
  private buildFullSystemPrompt(context: AgentContext): string {
    // Get base persona
    const basePrompt = getBaseSystemPrompt();

    // Get phase-specific context
    const phasePrompt =
      context.currentPhase === 'phase1'
        ? buildPhase1Prompt(context)
        : buildPhase2Prompt(context);

    // Get student context
    const studentContext = formatContextForAgent(context);

    // Get resource summary
    const resourceSummary = getResourceSummary();

    // Combine everything using the prompts/system buildSystemPrompt
    const systemPrompt = buildSystemPrompt(
      context.studentProfile?.name || 'Student',
      context.currentPhase as 'phase1' | 'phase2',
      {
        researchTopic: context.studentProfile?.researchTopic,
        enrollmentDate: context.studentProfile?.enrollmentDate?.toISOString(),
      }
    );

    // Add additional context
    return `${systemPrompt}

ADDITIONAL CONTEXT:
${studentContext}

RESOURCE SUMMARY:
${resourceSummary}`;
  }

  /**
   * Get conversation history formatted for Claude
   */
  private async getConversationHistory(studentId: string): Promise<ClaudeMessage[]> {
    let conversation = await getConversationByStudentId(studentId);
    if (!conversation) {
      conversation = await createConversation(studentId);
      return [];
    }

    const messages = await getRecentMessages(conversation.id, 20);

    // Convert to Claude format
    const claudeMessages: ClaudeMessage[] = [];
    for (const msg of messages) {
      // Skip drafts and system messages
      if (msg.status === 'draft' || msg.role === 'system') continue;

      const role = msg.role === 'student' ? 'user' : 'assistant';
      claudeMessages.push({
        role,
        content: msg.content,
      });
    }

    return claudeMessages;
  }

  /**
   * Save user message to conversation
   */
  private async saveUserMessage(studentId: string, content: string): Promise<void> {
    let conversation = await getConversationByStudentId(studentId);
    if (!conversation) {
      conversation = await createConversation(studentId);
    }

    await createMessage({
      conversationId: conversation.id,
      role: 'student',
      content,
      status: 'sent',
    });
  }

  /**
   * Get tools for the current phase
   */
  private getToolsForPhase(phase: 'phase1' | 'phase2'): Tool[] {
    if (phase === 'phase1') {
      return getPhase1Tools();
    }
    return getPhase2Tools();
  }

  /**
   * Get debug info for the agent state
   */
  async getDebugInfo(studentId: string): Promise<DebugInfo | null> {
    const context = await getAgentContext(studentId);
    if (!context) return null;

    const systemPrompt = this.buildFullSystemPrompt(context);
    const messages = await this.getConversationHistory(studentId);
    const tools = this.getToolsForPhase(context.currentPhase);

    return {
      systemPrompt,
      messagesCount: messages.length,
      toolsAvailable: tools.map((t) => t.name),
      phase: context.currentPhase as 'phase1' | 'phase2',
      studentContext: formatContextForAgent(context),
    };
  }
}

// Singleton instance
let agentInstance: TeachingAssistant | null = null;

/**
 * Get the teaching assistant instance
 */
export function getTeachingAssistant(): TeachingAssistant {
  if (!agentInstance) {
    agentInstance = new TeachingAssistant();
  }
  return agentInstance;
}

/**
 * Reset the agent (for testing)
 */
export function resetTeachingAssistant(): void {
  agentInstance = null;
}

// Re-export useful items
export { TeachingAssistant };
export { saveDraft, approveDraft, rejectDraft, editAndApproveDraft, getPendingDrafts } from './draft';
export { getClaudeClient } from './claude';
export * from './tools';
