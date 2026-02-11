/**
 * Phase I Behavior Prompts
 * Specific instructions for Phase I student interactions
 */

import type { StudentProfile } from '@/services/memory';

/**
 * Build Phase I context based on student profile
 */
export function buildPhase1Context(profile: StudentProfile): string {
  const progressPercent = Math.round((profile.topicsCompleted / 8) * 100);

  return `## Phase I Context
This student is in Phase I, learning from the video curriculum.

Current progress:
- Current topic: ${profile.currentTopicIndex} of 8
- Topics completed: ${profile.topicsCompleted}
- Overall progress: ${progressPercent}%
- Days in Phase I: ${profile.daysInCurrentPhase}

${profile.daysInCurrentPhase > 42 ? '⚠️ Student has been in Phase I for over 6 weeks. Consider discussing Phase II transition.' : ''}

## Phase I Behaviors
1. **Answer video content questions:** Reference specific lessons when answering questions about course topics.
2. **Encourage regular progress:** Ask how videos are going, celebrate completions.
3. **Track what they're learning:** Note topics discussed for future context.
4. **Help when stuck:** If they mention being stuck, offer targeted help.
5. **Phase II preparation:** After ~6 weeks or 70%+ progress, start discussing Phase II and research interests.

## Video Curriculum Topics
1. LLM Foundations and Hands-on Projects (9 lessons)
2. Prompt Engineering (3 lessons)
3. Agents and LangChain (5 lessons)
4. Semantic Search (5 lessons)
5. RAG (4 lessons)
6. Multimodal LLMs (4 lessons)

When answering questions, reference the specific topic and lesson when possible (e.g., "This is covered in Topic 3, Lesson 2 on LangChain chains").
`;
}

/**
 * Phase I transition prompt (when student should move to Phase II)
 */
export function getPhase1TransitionPrompt(profile: StudentProfile): string {
  return `## Phase I → Phase II Transition

${profile.name} has completed most of Phase I content (${profile.topicsCompleted}/8 topics). It's time to start discussing Phase II.

Guide them through:
1. **Celebrate their progress** — They've learned a lot! Acknowledge this.
2. **Explain Phase II** — Research project, 8-week roadmap, goal of publishing a paper.
3. **Ask about interests** — What topics excited them most? Any domain they want to apply AI to?
4. **Present topic options** — Use the suggest_topics tool with their interests.
5. **Don't rush** — Let them explore and decide. This is a big commitment.

Remember: The goal is to get them excited about research while being realistic about the work involved.
`;
}

/**
 * Phase I reminder behaviors (for inactive students)
 */
export function getPhase1ReminderContext(daysSinceLastInteraction: number): string {
  if (daysSinceLastInteraction < 3) {
    return ''; // No reminder needed
  }

  if (daysSinceLastInteraction < 7) {
    return `
## Engagement Note
It's been ${daysSinceLastInteraction} days since this student's last message. Consider:
- Asking how their video progress is going
- Checking if they're stuck on anything
- Sending an encouraging message
`;
  }

  return `
## Re-engagement Note
It's been ${daysSinceLastInteraction} days since this student's last message. They may need extra encouragement:
- Reach out warmly — don't make them feel guilty
- Ask if everything is okay
- Offer specific help with where they left off
- Consider mentioning a voice note from Dr. Raj for motivation
`;
}

/**
 * Phase I topic-specific context
 */
export function getTopicContext(currentTopicIndex: number): string {
  const topicContexts: Record<number, string> = {
    1: 'Student is learning LLM fundamentals — focus on building intuition about how LLMs work, tokenization, and basic hands-on projects.',
    2: 'Student is on Prompt Engineering — emphasize practical prompting techniques, chain-of-thought, and guardrails.',
    3: 'Student is learning Agents and LangChain — help with understanding chains, memory, and building agents.',
    4: 'Student is on Semantic Search — focus on embeddings, dense retrieval, and chunking strategies.',
    5: 'Student is learning RAG — emphasize evaluation, retrieval quality, and advanced RAG patterns.',
    6: 'Student is on Multimodal LLMs — help with vision models, CLIP, BLIP, and multimodal applications.',
    7: 'Student is nearing completion — review concepts and prepare for Phase II transition.',
    8: 'Student has completed the curriculum — focus on Phase II transition and research topic selection.',
  };

  return topicContexts[currentTopicIndex] || '';
}
