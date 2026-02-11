/**
 * Research topics tools tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRegistry, ToolRegistry } from './registry';
import { registerResearchTopicsTools, researchToolDefinitions } from './research-topics';
import type { ToolContext } from './types';

// Mock the research-topics service
vi.mock('@/services/resources/research-topics', () => ({
  searchResearchTopics: vi.fn((query: string, categoryFilter?: string) => {
    if (query === 'healthcare') {
      return [
        {
          type: 'research_category',
          id: '1',
          title: 'Healthcare & Biomedical AI',
          description: '4 research topics',
          score: 0.9,
          metadata: { categoryId: 1, topicCount: 4 },
        },
        {
          type: 'research_topic',
          id: '1.1',
          title: 'AI-Powered Clinical Documentation',
          description: 'Using LLMs to automate clinical note generation...',
          score: 1.0,
          metadata: {
            topicId: '1.1',
            categoryId: 1,
            categoryTitle: 'Healthcare & Biomedical AI',
          },
        },
      ];
    }
    return [];
  }),
  getResearchTopic: vi.fn((topicId: string) => {
    if (topicId === '1.1') {
      return {
        id: '1.1',
        index: 1,
        title: 'AI-Powered Clinical Documentation',
        description: 'Using LLMs to automate clinical note generation and EHR summarization.',
        categoryId: 1,
        categoryTitle: 'Healthcare & Biomedical AI',
      };
    }
    return null;
  }),
  suggestTopics: vi.fn((interests: string[]) => {
    if (interests.includes('healthcare')) {
      return [
        {
          id: '1.1',
          index: 1,
          title: 'AI-Powered Clinical Documentation',
          description: 'Using LLMs to automate clinical note generation...',
          categoryId: 1,
          categoryTitle: 'Healthcare & Biomedical AI',
        },
        {
          id: '1.2',
          index: 2,
          title: 'Medical Image Analysis',
          description: 'Using multimodal LLMs for medical imaging...',
          categoryId: 1,
          categoryTitle: 'Healthcare & Biomedical AI',
        },
      ];
    }
    return [];
  }),
}));

describe('Research Topics Tools', () => {
  let registry: ToolRegistry;
  const context: ToolContext = {
    studentId: 'student-123',
    currentPhase: 'phase2',
  };

  beforeEach(() => {
    registry = createToolRegistry();
    registerResearchTopicsTools(registry);
  });

  describe('tool definitions', () => {
    it('should have search_research_topics tool defined', () => {
      const tool = researchToolDefinitions.search_research_topics;
      expect(tool.name).toBe('search_research_topics');
      expect(tool.input_schema.properties.query).toBeDefined();
      expect(tool.input_schema.required).toContain('query');
    });

    it('should have get_topic_details tool defined', () => {
      const tool = researchToolDefinitions.get_topic_details;
      expect(tool.name).toBe('get_topic_details');
      expect(tool.input_schema.properties.topic_id).toBeDefined();
      expect(tool.input_schema.required).toContain('topic_id');
    });

    it('should have suggest_topics tool defined', () => {
      const tool = researchToolDefinitions.suggest_topics;
      expect(tool.name).toBe('suggest_topics');
      expect(tool.input_schema.properties.interests).toBeDefined();
      expect(tool.input_schema.required).toContain('interests');
    });
  });

  describe('search_research_topics', () => {
    it('should return search results for valid query', async () => {
      const result = await registry.execute(
        'search_research_topics',
        { query: 'healthcare' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.results)).toBe(true);
      expect(result.data.results.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await registry.execute(
        'search_research_topics',
        { query: 'nonexistent' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveLength(0);
    });

    it('should fail without query parameter', async () => {
      const result = await registry.execute('search_research_topics', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('query');
    });
  });

  describe('get_topic_details', () => {
    it('should return topic details for valid ID', async () => {
      const result = await registry.execute(
        'get_topic_details',
        { topic_id: '1.1' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.topic.id).toBe('1.1');
      expect(result.data.topic.title).toBe('AI-Powered Clinical Documentation');
    });

    it('should return error for invalid topic ID', async () => {
      const result = await registry.execute(
        'get_topic_details',
        { topic_id: '99.99' },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail without topic_id parameter', async () => {
      const result = await registry.execute('get_topic_details', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('topic_id');
    });
  });

  describe('suggest_topics', () => {
    it('should return topic suggestions for interests', async () => {
      const result = await registry.execute(
        'suggest_topics',
        { interests: ['healthcare', 'NLP'] },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.suggestions)).toBe(true);
      expect(result.data.suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty for non-matching interests', async () => {
      const result = await registry.execute(
        'suggest_topics',
        { interests: ['quantum'] },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.suggestions).toHaveLength(0);
    });

    it('should fail without interests parameter', async () => {
      const result = await registry.execute('suggest_topics', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('interests');
    });
  });

  describe('tool registration', () => {
    it('should register all research topics tools', () => {
      expect(registry.hasTool('search_research_topics')).toBe(true);
      expect(registry.hasTool('get_topic_details')).toBe(true);
      expect(registry.hasTool('suggest_topics')).toBe(true);
    });
  });
});
