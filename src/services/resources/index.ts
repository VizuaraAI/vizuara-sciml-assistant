/**
 * Resource loader and index
 * Unified interface for all bootcamp resources
 */

import {
  parseVideoCatalog,
  searchVideoCatalog,
  getVideoTopic,
  getLesson,
  getLessonsByTopic,
  getVideoCatalogSummary,
  getTopicByName,
} from './video-catalog';

import {
  parseResearchTopics,
  searchResearchTopics,
  getCategory,
  getResearchTopic,
  getTopicsByCategory,
  suggestTopics,
  getResearchTopicsSummary,
  getAllCategories,
} from './research-topics';

import {
  getRoadmapTemplate,
  getStandardMilestones,
  getRoadmapPrinciples,
  getFolderStructure,
  getExcelColumns,
  generateRoadmapStructure,
  formatRoadmapAsMarkdown,
  getRoadmapPromptContext,
} from './roadmap-template';

import type { SearchResult, ResourceType } from './types';

// Re-export types
export * from './types';

// Re-export individual modules
export {
  // Video catalog
  parseVideoCatalog,
  searchVideoCatalog,
  getVideoTopic,
  getLesson,
  getLessonsByTopic,
  getVideoCatalogSummary,
  getTopicByName,
  // Research topics
  parseResearchTopics,
  searchResearchTopics,
  getCategory,
  getResearchTopic,
  getTopicsByCategory,
  suggestTopics,
  getResearchTopicsSummary,
  getAllCategories,
  // Roadmap
  getRoadmapTemplate,
  getStandardMilestones,
  getRoadmapPrinciples,
  getFolderStructure,
  getExcelColumns,
  generateRoadmapStructure,
  formatRoadmapAsMarkdown,
  getRoadmapPromptContext,
};

/**
 * Initialize all resources (pre-parse for caching)
 */
export function initializeResources(): void {
  console.log('Initializing resources...');
  parseVideoCatalog();
  parseResearchTopics();
  getRoadmapTemplate();
  console.log('Resources initialized.');
}

/**
 * Search across all resources
 */
export function searchResources(
  query: string,
  types?: ResourceType[]
): SearchResult[] {
  const results: SearchResult[] = [];

  // Search video catalog
  if (!types || types.includes('video_catalog')) {
    results.push(...searchVideoCatalog(query));
  }

  // Search research topics
  if (!types || types.includes('research_topics')) {
    results.push(...searchResearchTopics(query));
  }

  // Sort all results by score
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get a compact summary of all resources for agent context
 */
export function getResourceSummary(): string {
  const lines: string[] = [];

  // Video catalog summary (compact)
  lines.push('=== PHASE I VIDEO CURRICULUM ===');
  const catalog = parseVideoCatalog();
  for (const topic of catalog) {
    lines.push(`Topic ${topic.id}: ${topic.title} (${topic.lessonCount} lessons)`);
  }

  lines.push('');
  lines.push('=== PHASE II RESEARCH TOPICS ===');
  const categories = getAllCategories();
  for (const cat of categories) {
    lines.push(`${cat.id}. ${cat.title} (${cat.topicCount} topics)`);
  }

  lines.push('');
  lines.push('=== AVAILABLE TOOLS ===');
  lines.push('- PDF-to-Colab: https://paper-to-notebook-production.up.railway.app/');
  lines.push('- Overleaf template available for manuscript phase');
  lines.push('- Sample papers available for reference');

  return lines.join('\n');
}

/**
 * Get detailed context for a specific phase
 */
export function getPhaseContext(phase: 'phase1' | 'phase2'): string {
  if (phase === 'phase1') {
    return getVideoCatalogSummary();
  } else {
    return getResearchTopicsSummary() + '\n\n' + getRoadmapPromptContext();
  }
}
