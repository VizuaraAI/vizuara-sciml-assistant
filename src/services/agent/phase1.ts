/**
 * Phase I Agent Handler
 * Specific handling for Phase I student interactions
 */

import type { AgentContext } from '@/services/memory';
import type { Tool } from './tools/types';
import { buildPhase1Context, getPhase1TransitionPrompt, getPhase1ReminderContext, getTopicContext } from './prompts/phase1';
import { videoToolDefinitions, progressToolDefinitions, memoryToolDefinitions } from './tools';

/**
 * Build Phase I system prompt with student context
 */
export function buildPhase1Prompt(context: AgentContext): string {
  const { studentProfile, conversationStats } = context;

  // Build main Phase I context
  let phaseContext = buildPhase1Context(studentProfile);

  // Add topic-specific context
  const topicContext = getTopicContext(studentProfile.currentTopicIndex);
  if (topicContext) {
    phaseContext += `\n\n## Current Topic Focus\n${topicContext}`;
  }

  // Check if student should transition to Phase II
  if (shouldTransitionToPhase2(context)) {
    phaseContext += '\n\n' + getPhase1TransitionPrompt(studentProfile);
  }

  // Add reminder context if student has been inactive
  if (conversationStats.lastMessageAt) {
    const daysSince = Math.floor(
      (Date.now() - conversationStats.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const reminderContext = getPhase1ReminderContext(daysSince);
    if (reminderContext) {
      phaseContext += '\n' + reminderContext;
    }
  }

  return phaseContext;
}

/**
 * Check if student should transition to Phase II
 */
export function shouldTransitionToPhase2(context: AgentContext): boolean {
  const { studentProfile } = context;

  // Already in Phase II
  if (studentProfile.currentPhase === 'phase2') {
    return false;
  }

  // Conditions for suggesting transition:
  // 1. Completed 70%+ of topics (6 of 8)
  // 2. OR been in Phase I for 6+ weeks
  const topicsComplete = studentProfile.topicsCompleted >= 6;
  const longEnoughInPhase1 = studentProfile.daysInCurrentPhase >= 42;

  return topicsComplete || longEnoughInPhase1;
}

/**
 * Get Phase I specific tools
 */
export function getPhase1Tools(): Tool[] {
  return [
    videoToolDefinitions.search_video_catalog,
    videoToolDefinitions.get_lesson_details,
    progressToolDefinitions.get_student_progress,
    progressToolDefinitions.update_student_progress,
    progressToolDefinitions.transition_to_phase2,
    memoryToolDefinitions.get_student_memory,
    memoryToolDefinitions.save_student_memory,
  ];
}

/**
 * Handle Phase I specific behaviors after agent response
 * (e.g., updating progress, sending reminders)
 */
export async function handlePhase1Behaviors(
  context: AgentContext,
  userMessage: string,
  agentResponse: string
): Promise<void> {
  // Extract any progress indicators from the conversation
  // This could be more sophisticated with NLP
  const progressKeywords = [
    'finished', 'completed', 'done with', 'watched', 'just finished',
    'moved on to', 'started', 'beginning'
  ];

  const messageLower = userMessage.toLowerCase();
  const mentionsProgress = progressKeywords.some((kw) => messageLower.includes(kw));

  if (mentionsProgress) {
    // The agent should use tools to update progress
    // This is handled by the tool calls, not here
    console.log('[Phase1] Student mentioned progress:', userMessage.substring(0, 50));
  }

  // Check for questions that might indicate confusion
  const confusionKeywords = ['confused', "don't understand", 'stuck', 'help me'];
  const needsHelp = confusionKeywords.some((kw) => messageLower.includes(kw));

  if (needsHelp) {
    // Log for analytics/mentor attention
    console.log('[Phase1] Student may need extra help:', userMessage.substring(0, 50));
  }
}

/**
 * Get suggested topics for Phase II based on Phase I discussions
 */
export function getPhase2TopicSuggestions(context: AgentContext): string[] {
  const { studentProfile } = context;
  const suggestions: string[] = [];

  // Map Phase I interests to Phase II topic categories
  const interestMap: Record<string, string[]> = {
    'healthcare': ['Healthcare & Biomedical AI'],
    'medical': ['Healthcare & Biomedical AI'],
    'clinical': ['Healthcare & Biomedical AI'],
    'legal': ['Finance & Legal AI'],
    'contract': ['Finance & Legal AI'],
    'finance': ['Finance & Legal AI'],
    'education': ['Education & Learning'],
    'code': ['Software Engineering'],
    'agents': ['Autonomous Agents & Assistants'],
    'rag': ['Data Analysis & Business Intelligence'],
    'creative': ['Creative & Generative AI'],
  };

  for (const interest of studentProfile.interests) {
    const interestLower = interest.toLowerCase();
    for (const [keyword, categories] of Object.entries(interestMap)) {
      if (interestLower.includes(keyword)) {
        suggestions.push(...categories);
      }
    }
  }

  // Also add categories based on topics they discussed
  for (const topic of studentProfile.topicsDiscussed) {
    const topicLower = topic.toLowerCase();
    for (const [keyword, categories] of Object.entries(interestMap)) {
      if (topicLower.includes(keyword)) {
        suggestions.push(...categories);
      }
    }
  }

  // Deduplicate
  return Array.from(new Set(suggestions));
}
