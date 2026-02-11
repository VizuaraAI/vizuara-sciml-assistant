/**
 * Short-term memory service
 * Manages conversation context (recent messages)
 */

import { getMessagesByConversationId, getRecentMessages } from '@/db/queries/messages';
import { getConversationByStudentId } from '@/db/queries/conversations';
import type { Message } from '@/db/schema';

// Type for Claude API messages
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Get conversation context for a student
 */
export async function getConversationContext(
  studentId: string,
  limit: number = 20
): Promise<Message[]> {
  const conversation = await getConversationByStudentId(studentId);
  if (!conversation) return [];

  return getRecentMessages(conversation.id, limit);
}

/**
 * Format messages for Claude API
 * Converts our message format to Claude's expected format
 */
export function formatMessagesForClaude(messages: Message[]): ClaudeMessage[] {
  const claudeMessages: ClaudeMessage[] = [];

  for (const msg of messages) {
    // Skip draft messages and system messages
    if (msg.status === 'draft') continue;

    // Map our roles to Claude roles
    let role: 'user' | 'assistant';
    if (msg.role === 'student') {
      role = 'user';
    } else if (msg.role === 'agent' || msg.role === 'mentor') {
      role = 'assistant';
    } else {
      // Skip system messages
      continue;
    }

    claudeMessages.push({
      role,
      content: msg.content,
    });
  }

  return claudeMessages;
}

/**
 * Get the last N messages formatted for context
 */
export async function getFormattedContext(
  studentId: string,
  limit: number = 20
): Promise<ClaudeMessage[]> {
  const messages = await getConversationContext(studentId, limit);
  return formatMessagesForClaude(messages);
}

/**
 * Summarize conversation for long-term storage
 * Used when conversation is too long for context
 */
export async function summarizeConversation(messages: Message[]): Promise<string> {
  // For now, create a simple summary
  // In a full implementation, this would call Claude to generate a summary
  const topics = new Set<string>();
  const questions = new Set<string>();

  for (const msg of messages) {
    if (msg.role === 'student' && msg.content.includes('?')) {
      // Extract first sentence as a question topic
      const firstSentence = msg.content.split(/[.!?]/)[0];
      if (firstSentence.length < 100) {
        questions.add(firstSentence);
      }
    }
  }

  const summary = `Previous conversation covered: ${Array.from(questions).slice(0, 5).join('; ')}`;
  return summary;
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(studentId: string): Promise<{
  totalMessages: number;
  studentMessages: number;
  agentMessages: number;
  lastMessageAt: Date | null;
}> {
  const messages = await getConversationContext(studentId, 1000);

  const studentMessages = messages.filter((m) => m.role === 'student').length;
  const agentMessages = messages.filter((m) => m.role === 'agent' || m.role === 'mentor').length;
  const lastMessage = messages[messages.length - 1];

  return {
    totalMessages: messages.length,
    studentMessages,
    agentMessages,
    lastMessageAt: lastMessage?.createdAt || null,
  };
}
