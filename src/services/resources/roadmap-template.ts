/**
 * Roadmap template and generation
 * Based on sample roadmaps from resources/phase2-roadmaps/
 */

import fs from 'fs';
import path from 'path';
import type { RoadmapTemplate, Roadmap, RoadmapMilestone, ResearchTopic } from './types';

// Cache template
let template: any = null;

/**
 * Load the roadmap template
 */
export function getRoadmapTemplate(): any {
  if (template) return template;

  const filePath = path.join(process.cwd(), 'resources/phase2-roadmaps/template.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  template = JSON.parse(content);
  return template;
}

/**
 * Get the standard milestone structure
 */
export function getStandardMilestones(): any[] {
  const template = getRoadmapTemplate();
  return template.standardMilestones;
}

/**
 * Get roadmap principles for the agent
 */
export function getRoadmapPrinciples(): string[] {
  const template = getRoadmapTemplate();
  return template.principles;
}

/**
 * Get the folder structure template
 */
export function getFolderStructure(): string[] {
  const template = getRoadmapTemplate();
  return template.appendixTemplates.folderStructure;
}

/**
 * Get Excel columns template
 */
export function getExcelColumns(): string[] {
  const template = getRoadmapTemplate();
  return template.appendixTemplates.excelColumns;
}

/**
 * Generate a basic roadmap structure for a topic
 * The agent will fill in the details based on the topic
 */
export function generateRoadmapStructure(
  studentName: string,
  topic: ResearchTopic,
  durationWeeks: number = 8
): Partial<Roadmap> {
  const template = getRoadmapTemplate();
  const numMilestones = Math.ceil(durationWeeks / 2);

  const milestones: RoadmapMilestone[] = [];

  // Use standard milestones as base, adjust for duration
  const standardMilestones = template.standardMilestones.slice(0, numMilestones);

  for (const sm of standardMilestones) {
    milestones.push({
      number: sm.number,
      weeks: sm.weeks,
      title: sm.title,
      objectives: [],
      concreteSteps: [],
      deliverables: [],
      acceptanceChecks: [],
      risks: [],
    });
  }

  return {
    title: `${durationWeeks}-Week Research Roadmap`,
    subtitle: topic.title,
    preparedFor: studentName,
    date: new Date().toISOString().split('T')[0],
    abstract: '',
    scope: {
      goal: '',
      researchQuestions: [],
    },
    dataset: {
      primary: '',
      validation: [],
    },
    milestones,
  };
}

/**
 * Format roadmap as markdown for display/export
 */
export function formatRoadmapAsMarkdown(roadmap: Roadmap): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${roadmap.title}`);
  lines.push(`## ${roadmap.subtitle}`);
  lines.push('');
  lines.push(`**Prepared for:** ${roadmap.preparedFor}`);
  lines.push(`**Date:** ${roadmap.date}`);
  lines.push('');

  // Abstract
  lines.push('## Abstract');
  lines.push('');
  lines.push(roadmap.abstract);
  lines.push('');

  // Scope & Research Questions
  lines.push('## 1. Scope & Research Questions');
  lines.push('');
  lines.push(`**Goal:** ${roadmap.scope.goal}`);
  lines.push('');
  lines.push('**Research Questions:**');
  roadmap.scope.researchQuestions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q}`);
  });
  lines.push('');

  // Dataset
  lines.push('## 2. Primary Dataset / Corpus');
  lines.push('');
  lines.push(`**Primary:** ${roadmap.dataset.primary}`);
  if (roadmap.dataset.validation && roadmap.dataset.validation.length > 0) {
    lines.push('');
    lines.push('**Validation Sets:**');
    roadmap.dataset.validation.forEach((v) => {
      lines.push(`- ${v}`);
    });
  }
  lines.push('');

  // Milestones
  for (const milestone of roadmap.milestones) {
    lines.push(`## ${milestone.number + 2}. Milestone ${milestone.number} (Weeks ${milestone.weeks}): ${milestone.title}`);
    lines.push('');

    if (milestone.objectives.length > 0) {
      lines.push('### Objectives');
      milestone.objectives.forEach((o) => {
        lines.push(`- ${o}`);
      });
      lines.push('');
    }

    if (milestone.concreteSteps && milestone.concreteSteps.length > 0) {
      lines.push('### Concrete Steps');
      milestone.concreteSteps.forEach((s, i) => {
        lines.push(`${i + 1}. ${s}`);
      });
      lines.push('');
    }

    if (milestone.deliverables.length > 0) {
      lines.push('### Deliverables');
      milestone.deliverables.forEach((d) => {
        lines.push(`- ${d}`);
      });
      lines.push('');
    }

    if (milestone.acceptanceChecks && milestone.acceptanceChecks.length > 0) {
      lines.push('### Acceptance Checks');
      milestone.acceptanceChecks.forEach((a) => {
        lines.push(`- [ ] ${a}`);
      });
      lines.push('');
    }

    if (milestone.risks && milestone.risks.length > 0) {
      lines.push('### Risks & Mitigations');
      milestone.risks.forEach((r) => {
        lines.push(`- ${r}`);
      });
      lines.push('');
    }
  }

  // Appendices
  if (roadmap.appendices && roadmap.appendices.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Appendices');
    lines.push('');
    for (const appendix of roadmap.appendices) {
      lines.push(`### ${appendix.name}`);
      lines.push('');
      lines.push(appendix.content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Get prompt context for roadmap generation
 */
export function getRoadmapPromptContext(): string {
  const template = getRoadmapTemplate();

  return `
## Roadmap Generation Guidelines

Follow this EXACT structure when generating research roadmaps:

### Required Sections:
${template.structure.sections.map((s: any) => `- **${s.name}**: ${s.description}`).join('\n')}

### Milestone Structure:
Each milestone MUST have:
${template.milestoneTemplate.components.map((c: string) => `- ${c}`).join('\n')}

### Standard Milestones (adapt as needed):
${template.standardMilestones.map((m: any) => `${m.number}. **${m.title}** (Weeks ${m.weeks})`).join('\n')}

### Key Principles:
${template.principles.map((p: string) => `- ${p}`).join('\n')}

### Excel Columns for Literature Review:
${template.appendixTemplates.excelColumns.join(', ')}

### Recommended Folder Structure:
\`\`\`
${template.appendixTemplates.folderStructure.join('\n')}
\`\`\`
`.trim();
}
