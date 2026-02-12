/**
 * Agent tools index
 * Exports all tools and registration functions
 */

// Types
export * from './types';

// Registry
export { createToolRegistry, getToolRegistry, resetToolRegistry, type ToolRegistry } from './registry';

// Tool definitions and registrations
export {
  videoToolDefinitions,
  registerVideoCatalogTools,
  getVideoCatalogTools,
} from './video-catalog';

export {
  researchToolDefinitions,
  registerResearchTopicsTools,
  getResearchTopicsTools,
} from './research-topics';

export {
  progressToolDefinitions,
  registerProgressTools,
  getProgressTools,
} from './progress';

export {
  memoryToolDefinitions,
  registerMemoryTools,
  getMemoryTools,
} from './memory';

export {
  roadmapToolDefinitions,
  registerRoadmapTools,
  getRoadmapTools,
} from './roadmap';

export {
  voiceNoteToolDefinitions,
  registerVoiceNoteTools,
  getVoiceNoteTools,
} from './voice-notes';

export {
  colabToolDefinitions,
  registerColabTools,
  getColabTools,
} from './colab-notebook';

import { ToolRegistry, createToolRegistry } from './registry';
import { registerVideoCatalogTools } from './video-catalog';
import { registerResearchTopicsTools } from './research-topics';
import { registerProgressTools } from './progress';
import { registerMemoryTools } from './memory';
import { registerRoadmapTools } from './roadmap';
import { registerVoiceNoteTools } from './voice-notes';
import { registerColabTools } from './colab-notebook';

/**
 * Create a fully configured tool registry with all tools
 */
export function createFullToolRegistry(): ToolRegistry {
  const registry = createToolRegistry();

  // Register all tools
  registerVideoCatalogTools(registry);
  registerResearchTopicsTools(registry);
  registerProgressTools(registry);
  registerMemoryTools(registry);
  registerRoadmapTools(registry);
  registerColabTools(registry);

  return registry;
}

/**
 * Create a Phase I tool registry (subset for Phase I students)
 */
export function createPhase1ToolRegistry(): ToolRegistry {
  const registry = createToolRegistry();

  registerVideoCatalogTools(registry);
  registerProgressTools(registry);
  registerMemoryTools(registry);
  registerVoiceNoteTools(registry);
  registerColabTools(registry);

  return registry;
}

/**
 * Create a Phase II tool registry (subset for Phase II students)
 */
export function createPhase2ToolRegistry(): ToolRegistry {
  const registry = createToolRegistry();

  registerResearchTopicsTools(registry);
  registerProgressTools(registry);
  registerMemoryTools(registry);
  registerRoadmapTools(registry);
  registerVoiceNoteTools(registry);
  registerColabTools(registry);

  return registry;
}

import { videoToolDefinitions } from './video-catalog';
import { researchToolDefinitions } from './research-topics';
import { progressToolDefinitions } from './progress';
import { memoryToolDefinitions } from './memory';
import { roadmapToolDefinitions } from './roadmap';
import { voiceNoteToolDefinitions } from './voice-notes';
import { colabToolDefinitions } from './colab-notebook';
import type { Tool } from './types';

/**
 * Get Phase I tools as array (for API use)
 */
export function getPhase1Tools(): Tool[] {
  return [
    ...Object.values(videoToolDefinitions),
    ...Object.values(progressToolDefinitions),
    ...Object.values(memoryToolDefinitions),
    ...Object.values(voiceNoteToolDefinitions),
    ...Object.values(colabToolDefinitions),
  ];
}

/**
 * Get Phase II tools as array (for API use)
 */
export function getPhase2Tools(): Tool[] {
  return [
    ...Object.values(researchToolDefinitions),
    ...Object.values(progressToolDefinitions),
    ...Object.values(memoryToolDefinitions),
    ...Object.values(roadmapToolDefinitions),
    ...Object.values(voiceNoteToolDefinitions),
    ...Object.values(colabToolDefinitions),
  ];
}
