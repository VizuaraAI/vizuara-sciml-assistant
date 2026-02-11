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

import { ToolRegistry, createToolRegistry } from './registry';
import { registerVideoCatalogTools } from './video-catalog';
import { registerResearchTopicsTools } from './research-topics';
import { registerProgressTools } from './progress';
import { registerMemoryTools } from './memory';
import { registerRoadmapTools } from './roadmap';

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

  return registry;
}
