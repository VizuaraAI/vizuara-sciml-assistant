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
1. Introduction to Scientific Machine Learning (SciML) - Course overview, traditional ML vs SciML, problems solved by SciML
2. Julia Programming Language - Installation, basics, why Julia for scientific computing
3. Ordinary Differential Equations (ODEs) in Julia - What are ODEs, building ODEs hands-on
4. Partial Differential Equations (PDEs) in Julia - What are PDEs, building PDEs hands-on
5. Neural Networks, Gradient Descent & Backpropagation - Weights, biases, activation functions, optimization
6. Physics-Informed Neural Networks (PINNs) - Theory and practical implementation in Julia
7. Neural ODEs - Theory, the 3 pillars of SciML, practical implementation
8. Universal Differential Equations (UDEs) - Theory and practical implementation in Julia

When answering questions, reference the specific topic when possible (e.g., "This is covered in Topic 6 on Physics-Informed Neural Networks").
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
    1: 'Student is learning SciML fundamentals — focus on building intuition about Scientific ML, traditional ML vs SciML, and the problems SciML can solve.',
    2: 'Student is on Julia Programming — help with installation, basics of Julia, and why Julia is powerful for scientific computing.',
    3: 'Student is learning ODEs in Julia — focus on understanding differential equations and hands-on ODE implementation.',
    4: 'Student is on PDEs in Julia — help with partial differential equations and practical PDE implementation.',
    5: 'Student is learning Neural Networks basics — emphasize weights, biases, activation functions, gradient descent, and backpropagation.',
    6: 'Student is on Physics-Informed Neural Networks (PINNs) — focus on PINN theory and practical implementation in Julia.',
    7: 'Student is learning Neural ODEs — help with the 3 pillars of SciML and Neural ODE implementation.',
    8: 'Student is on Universal Differential Equations (UDEs) — focus on UDE theory, implementation, and applications. Prepare for Phase II transition.',
  };

  return topicContexts[currentTopicIndex] || '';
}
