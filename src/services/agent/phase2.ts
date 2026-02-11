/**
 * Phase II Agent Handler
 * Specific handling for Phase II student interactions
 */

import type { AgentContext } from '@/services/memory';
import type { Tool } from './tools/types';
import { buildPhase2Context, getRoadmapGenerationPrompt, getMilestoneCheckInPrompt, getManuscriptPhasePrompt } from './prompts/phase2';
import { researchToolDefinitions, progressToolDefinitions, memoryToolDefinitions, roadmapToolDefinitions } from './tools';

// Topic selection state
export type TopicSelectionState = 'no_topic' | 'exploring' | 'selected' | 'roadmap_generated';

/**
 * Build Phase II system prompt with student context
 */
export function buildPhase2Prompt(context: AgentContext): string {
  const { studentProfile } = context;

  // Build main Phase II context
  let phaseContext = buildPhase2Context(studentProfile);

  // Add milestone-specific context
  if (studentProfile.researchTopic && studentProfile.currentMilestone > 0) {
    const milestoneContext = getMilestoneCheckInPrompt(
      studentProfile.currentMilestone,
      studentProfile.daysInCurrentPhase // Approximation - ideally track days per milestone
    );
    phaseContext += '\n' + milestoneContext;
  }

  // Add manuscript phase context if in later milestones
  if (studentProfile.currentMilestone >= 4) {
    phaseContext += '\n' + getManuscriptPhasePrompt();
  }

  return phaseContext;
}

/**
 * Get Phase II specific tools
 */
export function getPhase2Tools(): Tool[] {
  return [
    researchToolDefinitions.search_research_topics,
    researchToolDefinitions.get_topic_details,
    researchToolDefinitions.suggest_topics,
    roadmapToolDefinitions.generate_roadmap,
    roadmapToolDefinitions.get_milestone_details,
    progressToolDefinitions.get_student_progress,
    progressToolDefinitions.update_student_progress,
    memoryToolDefinitions.get_student_memory,
    memoryToolDefinitions.save_student_memory,
  ];
}

/**
 * Handle topic selection flow
 */
export function handleTopicSelection(context: AgentContext): TopicSelectionState {
  const { studentProfile } = context;

  // Check if topic is selected
  if (studentProfile.researchTopic) {
    // Check if roadmap exists (simplified - would need roadmap query)
    if (studentProfile.currentMilestone > 0) {
      return 'roadmap_generated';
    }
    return 'selected';
  }

  // Check conversation for topic exploration
  // This is simplified - in production, track state in memory
  return 'no_topic';
}

/**
 * Get roadmap generation context
 */
export function getRoadmapContext(
  studentName: string,
  topicTitle: string
): string {
  return getRoadmapGenerationPrompt(studentName, topicTitle);
}

/**
 * Handle milestone check-ins
 */
export function getMilestoneCheckIn(context: AgentContext): string {
  const { studentProfile } = context;

  if (!studentProfile.researchTopic || studentProfile.currentMilestone === 0) {
    return '';
  }

  // Generate check-in prompt
  const checkIn = getMilestoneCheckInPrompt(
    studentProfile.currentMilestone,
    studentProfile.daysInCurrentPhase
  );

  return checkIn;
}

/**
 * Handle Phase II specific behaviors after agent response
 */
export async function handlePhase2Behaviors(
  context: AgentContext,
  userMessage: string,
  agentResponse: string
): Promise<void> {
  const { studentProfile } = context;

  // Detect topic selection
  const topicKeywords = ['choose', 'select', 'picked', 'decided', "I'll do", 'want to work on'];
  const messageLower = userMessage.toLowerCase();
  const mentionsTopic = topicKeywords.some((kw) => messageLower.includes(kw));

  if (mentionsTopic && !studentProfile.researchTopic) {
    console.log('[Phase2] Student may be selecting topic:', userMessage.substring(0, 50));
  }

  // Detect progress updates
  const progressKeywords = ['finished', 'completed', 'done with', 'submitted'];
  const mentionsProgress = progressKeywords.some((kw) => messageLower.includes(kw));

  if (mentionsProgress && studentProfile.currentMilestone > 0) {
    console.log('[Phase2] Student may have milestone progress:', userMessage.substring(0, 50));
  }

  // Detect blockers
  const blockerKeywords = ['stuck', 'blocked', "can't figure out", 'help', 'issue', 'problem'];
  const mentionsBlocker = blockerKeywords.some((kw) => messageLower.includes(kw));

  if (mentionsBlocker) {
    console.log('[Phase2] Student may have a blocker:', userMessage.substring(0, 50));
  }
}

/**
 * Get paper resources for manuscript phase
 */
export function getManuscriptResources(): {
  overleafTemplate: string;
  samplePapers: string;
  pdfToColabTool: string;
} {
  return {
    overleafTemplate: 'resources/manuscript-templates/overleaf-template/Links-to-template.md',
    samplePapers: 'resources/sample-papers/',
    pdfToColabTool: 'https://paper-to-notebook-production.up.railway.app/',
  };
}

/**
 * Check if student is ready for manuscript phase
 */
export function isReadyForManuscript(context: AgentContext): boolean {
  const { studentProfile } = context;

  // Must have topic and be on milestone 4 or completed milestone 3
  return (
    !!studentProfile.researchTopic &&
    studentProfile.currentMilestone >= 4
  );
}

/**
 * Get conference identification guidance
 */
export function getConferenceGuidance(): string {
  return `## Conference Identification

Help the student find appropriate venues for their paper:

1. **Search OpenReview** for relevant workshops and conferences
2. **Look for deadlines** 1-3 weeks out (allows time for revision)
3. **Consider venue fit:**
   - Workshop papers (4-6 pages) are good for first publications
   - Main conferences are more competitive
   - Look for "New Researchers" tracks

4. **Common venues for GenAI work:**
   - ACL, EMNLP, NAACL workshops
   - NeurIPS, ICML workshops
   - AAAI, IJCAI workshops
   - Domain-specific conferences (healthcare, legal, etc.)

5. **Help with submission:**
   - Review formatting requirements
   - Check anonymization rules
   - Verify supplementary material policies
`;
}
