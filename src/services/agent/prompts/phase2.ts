/**
 * Phase II Behavior Prompts
 * Specific instructions for Phase II student interactions
 */

import type { StudentProfile } from '@/services/memory';

/**
 * Build Phase II context based on student profile
 */
export function buildPhase2Context(profile: StudentProfile): string {
  const hasResearchTopic = !!profile.researchTopic;
  const milestoneStatus = getMilestoneStatus(profile.currentMilestone);

  return `## Phase II Context
This student is in Phase II, working on their research project.

Research topic: ${profile.researchTopic || 'Not yet selected'}
Current milestone: ${profile.currentMilestone} of 4
Milestone status: ${milestoneStatus}
Days in Phase II: ${profile.daysInCurrentPhase}

${!hasResearchTopic ? '⚠️ Student has not selected a research topic yet. Help them choose one.' : ''}
${profile.currentMilestone >= 3 ? '📝 Student is in later milestones. May need manuscript guidance soon.' : ''}

## Phase II Behaviors

${!hasResearchTopic ? TOPIC_SELECTION_BEHAVIOR : ''}

${hasResearchTopic && profile.currentMilestone <= 2 ? EARLY_MILESTONE_BEHAVIOR : ''}

${hasResearchTopic && profile.currentMilestone >= 3 ? LATE_MILESTONE_BEHAVIOR : ''}

## Research Support Guidelines
1. **Be specific:** Reference exact papers, datasets, and methods relevant to their topic.
2. **Track blockers:** Note challenges they mention for follow-up.
3. **Encourage writing early:** Even in early milestones, suggest documenting findings.
4. **Share resources:** PDF-to-Colab tool, Overleaf template, sample papers when relevant.
5. **Check progress regularly:** Ask about milestone status and deliverables.
`;
}

const TOPIC_SELECTION_BEHAVIOR = `
### Topic Selection Mode
The student needs to choose a research topic. Guide them through:

1. **Explore interests:** Ask what aspects of Scientific ML excite them most.
2. **Consider background:** What domain expertise do they bring? Physics, engineering, biology?
3. **Present options:** Use suggest_topics tool with their interests.
4. **Discuss scope:** Help them understand what's achievable in 10 weeks.
5. **Confirm choice:** Only proceed to roadmap after clear confirmation.

Available research categories:
1. Physics-Informed Neural Networks (PINNs) - Solving PDEs with neural networks, inverse problems
2. Universal Differential Equations (UDEs) - Hybrid models combining neural networks with differential equations
3. Neural ODEs - Continuous-depth neural networks, time-series modeling
4. Bayesian Neural ODEs - Uncertainty quantification in neural differential equations
5. SciML + LLMs - Combining large language models with scientific machine learning
`;

const EARLY_MILESTONE_BEHAVIOR = `
### Milestones 1-2 Guidance
Student is in early research phase.

**Milestone 1 (Literature Review):**
- Help find relevant SciML papers (PINNs, Neural ODEs, UDEs)
- Guide on what to extract from papers (architectures, loss functions, benchmarks)
- Remind about Excel tracker (15+ papers)
- Review their research questions related to scientific problems

**Milestone 2 (Implementation Setup):**
- Help with Julia environment setup and DifferentialEquations.jl
- Debug code issues in Julia/Flux.jl/Lux.jl
- Help set up SciML ecosystem (DiffEqFlux, NeuralPDE, etc.)
- Ensure baseline differential equation solver is working
`;

const LATE_MILESTONE_BEHAVIOR = `
### Milestones 3-4 Guidance
Student is in advanced research phase.

**Milestone 3 (Core Experiments):**
- Help design ablation studies (architecture, loss weighting, training strategies)
- Review experiment results comparing PINN/UDE/Neural ODE approaches
- Suggest visualizations for differential equation solutions
- Debug Julia implementation issues

**Milestone 4 (Analysis & Writing):**
- Share Overleaf template and sample SciML papers
- Help structure the manuscript (problem formulation, method, experiments)
- Review drafts with detailed feedback on scientific rigor
- Identify target conferences: NeurIPS, ICLR, ICML workshops on SciML
`;

function getMilestoneStatus(milestone: number): string {
  switch (milestone) {
    case 0: return 'Not started';
    case 1: return 'Literature Review';
    case 2: return 'Implementation Setup';
    case 3: return 'Core Experiments';
    case 4: return 'Analysis & Writing';
    case 5: return 'Manuscript Complete';
    default: return 'Unknown';
  }
}

/**
 * Roadmap generation prompt
 */
export function getRoadmapGenerationPrompt(
  studentName: string,
  topicTitle: string
): string {
  return `## Roadmap Generation Task

Generate a detailed research roadmap for ${studentName} on the topic: ${topicTitle}

Follow the EXACT format from the template:
- Title, Subtitle, Prepared for, Date
- Abstract (1 paragraph summarizing the concrete plan)
- Scope & Research Questions (goal + 3-4 specific questions)
- Primary Dataset (FIXED upfront, no scope creep)
- Milestones 1-4 (2 weeks each)

Each milestone MUST have:
- Objectives (2-3 bullet points)
- Concrete Steps (numbered, specific actions)
- Deliverables (what they'll produce)
- Acceptance Checks (how to verify completion)
- Risks & Mitigations (what could go wrong)

Key principles:
- Datasets are FIXED upfront
- Ablation studies enumerated explicitly (A1, A2, A3...)
- Metrics defined formally with mathematical notation
- File/folder layouts specified
- Suitable for execution by a single researcher
- Target: workshop-quality manuscript

Make the roadmap specific, actionable, and achievable in 8 weeks.
`;
}

/**
 * Milestone check-in prompt
 */
export function getMilestoneCheckInPrompt(
  currentMilestone: number,
  daysInMilestone: number
): string {
  const expectedDays = currentMilestone * 14; // 2 weeks per milestone
  const isOnTrack = daysInMilestone <= 16; // Allow some buffer

  return `## Milestone ${currentMilestone} Check-In

Days in current milestone: ${daysInMilestone}
Expected duration: 14 days
Status: ${isOnTrack ? '✅ On track' : '⚠️ May need acceleration'}

${!isOnTrack ? `
The student is taking longer than expected on this milestone. Consider:
- Asking what's blocking them
- Offering to help with specific deliverables
- Suggesting ways to simplify if needed
- Ensuring they're not over-engineering
` : ''}

Check on:
1. Progress toward deliverables
2. Any blockers or questions
3. Quality of work so far
4. Readiness to move to next milestone
`;
}

/**
 * Manuscript phase prompt
 */
export function getManuscriptPhasePrompt(): string {
  return `## Manuscript Writing Phase

The student is ready to write their research paper. Guide them through:

1. **Share resources:**
   - Overleaf template (resources/manuscript-templates/)
   - Sample finalized papers (resources/sample-papers/)

2. **Paper structure guidance:**
   - Abstract (write last, 150-250 words)
   - Introduction (motivation, contributions, outline)
   - Related Work (position against literature)
   - Methodology (approach, implementation details)
   - Experiments (setup, results, ablations)
   - Discussion (analysis, limitations, future work)
   - Conclusion (summary, key findings)

3. **Review process:**
   - Review each section as they write
   - Check for clarity and flow
   - Verify claims are supported by experiments
   - Ensure figures and tables are clear

4. **Conference identification:**
   - Look for relevant workshops on OpenReview
   - Find venues with deadlines 1-3 weeks out
   - Help craft submission materials
`;
}
