/**
 * Memory manager
 * Unified interface for short-term and long-term memory
 */

import {
  getConversationContext,
  formatMessagesForClaude,
  getFormattedContext,
  summarizeConversation,
  getConversationStats,
  type ClaudeMessage,
} from './short-term';

import {
  getStudentProfile,
  getStudentMemory,
  setStudentMemory,
  appendStudentMemory,
  recordTopicDiscussed,
  recordInterest,
  updateLastInteraction,
  incrementQuestionsAsked,
  formatProfileForContext,
  MEMORY_KEYS,
  type StudentProfile,
} from './long-term';

import { getStudentById } from '@/db/queries/students';
import { getProgressByStudentId } from '@/db/queries/progress';
import type { Phase, Progress } from '@/db/schema';

// Re-export types and functions
export {
  ClaudeMessage,
  StudentProfile,
  MEMORY_KEYS,
  getConversationContext,
  formatMessagesForClaude,
  getFormattedContext,
  summarizeConversation,
  getConversationStats,
  getStudentProfile,
  getStudentMemory,
  setStudentMemory,
  appendStudentMemory,
  recordTopicDiscussed,
  recordInterest,
  updateLastInteraction,
  incrementQuestionsAsked,
  formatProfileForContext,
};

// ============== AGENT CONTEXT ==============

export interface AgentContext {
  studentId: string;
  studentProfile: StudentProfile;
  recentMessages: ClaudeMessage[];
  currentPhase: Phase;
  currentProgress: Progress[];
  conversationStats: {
    totalMessages: number;
    studentMessages: number;
    agentMessages: number;
    lastMessageAt: Date | null;
  };
}

/**
 * Get full context for the agent
 * Combines short-term and long-term memory
 */
export async function getAgentContext(studentId: string): Promise<AgentContext | null> {
  // Get student profile (includes long-term memory)
  const studentProfile = await getStudentProfile(studentId);
  if (!studentProfile) return null;

  // Get student record for phase
  const student = await getStudentById(studentId);
  if (!student) return null;

  // Get recent messages (short-term memory)
  const recentMessages = await getFormattedContext(studentId, 20);

  // Get conversation stats
  const conversationStats = await getConversationStats(studentId);

  // Get progress records
  const currentProgress = await getProgressByStudentId(studentId);

  return {
    studentId,
    studentProfile,
    recentMessages,
    currentPhase: student.currentPhase,
    currentProgress,
    conversationStats,
  };
}

/**
 * Format full context for agent system prompt
 */
export function formatContextForAgent(context: AgentContext): string {
  const lines: string[] = [];

  // Student profile
  lines.push('=== STUDENT PROFILE ===');
  lines.push(formatProfileForContext(context.studentProfile));
  lines.push('');

  // Conversation stats
  lines.push('=== CONVERSATION HISTORY ===');
  lines.push(`Total messages: ${context.conversationStats.totalMessages}`);
  lines.push(`Student messages: ${context.conversationStats.studentMessages}`);
  lines.push(`Agent messages: ${context.conversationStats.agentMessages}`);
  if (context.conversationStats.lastMessageAt) {
    const timeSince = Date.now() - context.conversationStats.lastMessageAt.getTime();
    const daysSince = Math.floor(timeSince / (1000 * 60 * 60 * 24));
    if (daysSince > 0) {
      lines.push(`Days since last message: ${daysSince}`);
    }
  }

  return lines.join('\n');
}

/**
 * Update memory after agent response
 * Extracts and stores relevant information from the conversation
 */
export async function updateMemoryFromConversation(
  studentId: string,
  userMessage: string,
  agentResponse: string
): Promise<void> {
  // Update last interaction
  await updateLastInteraction(studentId);

  // If user message contains a question, increment counter
  if (userMessage.includes('?')) {
    await incrementQuestionsAsked(studentId);
  }

  // Extract potential topics from conversation
  const topics = extractTopics(userMessage + ' ' + agentResponse);
  for (const topic of topics) {
    await recordTopicDiscussed(studentId, topic);
  }

  // Extract potential interests
  const interests = extractInterests(userMessage);
  for (const interest of interests) {
    await recordInterest(studentId, interest);
  }
}

/**
 * Extract topics from text
 * Simple keyword extraction - could be enhanced with NLP
 */
function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const textLower = text.toLowerCase();

  const topicKeywords = [
    'RAG', 'embeddings', 'chunking', 'semantic search', 'vector', 'retrieval',
    'LLM', 'prompt engineering', 'chain-of-thought', 'agents', 'LangChain',
    'fine-tuning', 'CLIP', 'BLIP', 'multimodal', 'transformers',
    'evaluation', 'RAGAS', 'metrics', 'benchmark',
  ];

  for (const keyword of topicKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      topics.push(keyword);
    }
  }

  return topics;
}

/**
 * Extract interests from text
 * Looks for domain-specific keywords
 */
function extractInterests(text: string): string[] {
  const interests: string[] = [];
  const textLower = text.toLowerCase();

  const interestKeywords = [
    { keyword: 'healthcare', value: 'healthcare AI' },
    { keyword: 'medical', value: 'healthcare AI' },
    { keyword: 'clinical', value: 'healthcare AI' },
    { keyword: 'legal', value: 'legal AI' },
    { keyword: 'contract', value: 'legal AI' },
    { keyword: 'finance', value: 'finance AI' },
    { keyword: 'education', value: 'education AI' },
    { keyword: 'code', value: 'coding assistance' },
    { keyword: 'creative', value: 'creative AI' },
    { keyword: 'game', value: 'gaming AI' },
  ];

  for (const { keyword, value } of interestKeywords) {
    if (textLower.includes(keyword)) {
      interests.push(value);
    }
  }

  return Array.from(new Set(interests)); // Remove duplicates
}
