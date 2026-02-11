/**
 * Video catalog tools tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRegistry, ToolRegistry } from './registry';
import { registerVideoCatalogTools, videoToolDefinitions } from './video-catalog';
import type { ToolContext } from './types';

// Mock the video-catalog service
vi.mock('@/services/resources/video-catalog', () => ({
  searchVideoCatalog: vi.fn((query: string) => {
    if (query === 'RAG') {
      return [
        {
          type: 'video',
          id: '5',
          title: 'Topic 5: RAG',
          description: '4 lessons',
          score: 1.0,
          metadata: { topicId: 5, lessonCount: 4 },
        },
        {
          type: 'lesson',
          id: '5.1',
          title: 'RAG Evaluation',
          description: 'Topic 5: RAG',
          score: 0.8,
          metadata: { topicId: 5, lessonId: '5.1', topicTitle: 'RAG' },
        },
      ];
    }
    return [];
  }),
  getLesson: vi.fn((lessonId: string) => {
    if (lessonId === '3.2') {
      return {
        id: '3.2',
        index: 2,
        title: 'Quantization',
        topicId: 3,
      };
    }
    return null;
  }),
  getVideoTopic: vi.fn((topicId: number) => {
    if (topicId === 3) {
      return {
        id: 3,
        title: 'Agents and LangChain',
        lessonCount: 5,
        lessons: [
          { id: '3.1', index: 1, title: 'LangChain Intro', topicId: 3 },
          { id: '3.2', index: 2, title: 'Quantization', topicId: 3 },
        ],
      };
    }
    return null;
  }),
}));

describe('Video Catalog Tools', () => {
  let registry: ToolRegistry;
  const context: ToolContext = {
    studentId: 'student-123',
    currentPhase: 'phase1',
  };

  beforeEach(() => {
    registry = createToolRegistry();
    registerVideoCatalogTools(registry);
  });

  describe('tool definitions', () => {
    it('should have search_video_catalog tool defined', () => {
      const tool = videoToolDefinitions.search_video_catalog;
      expect(tool.name).toBe('search_video_catalog');
      expect(tool.input_schema.properties.query).toBeDefined();
      expect(tool.input_schema.required).toContain('query');
    });

    it('should have get_lesson_details tool defined', () => {
      const tool = videoToolDefinitions.get_lesson_details;
      expect(tool.name).toBe('get_lesson_details');
      expect(tool.input_schema.properties.lesson_id).toBeDefined();
      expect(tool.input_schema.required).toContain('lesson_id');
    });
  });

  describe('search_video_catalog', () => {
    it('should return search results for valid query', async () => {
      const result = await registry.execute(
        'search_video_catalog',
        { query: 'RAG' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.results)).toBe(true);
      expect(result.data.results.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await registry.execute(
        'search_video_catalog',
        { query: 'nonexistent' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveLength(0);
    });

    it('should fail without query parameter', async () => {
      const result = await registry.execute('search_video_catalog', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('query');
    });
  });

  describe('get_lesson_details', () => {
    it('should return lesson details for valid ID', async () => {
      const result = await registry.execute(
        'get_lesson_details',
        { lesson_id: '3.2' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.lesson.id).toBe('3.2');
      expect(result.data.lesson.title).toBe('Quantization');
    });

    it('should return error for invalid lesson ID', async () => {
      const result = await registry.execute(
        'get_lesson_details',
        { lesson_id: '99.99' },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail without lesson_id parameter', async () => {
      const result = await registry.execute('get_lesson_details', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('lesson_id');
    });
  });

  describe('tool registration', () => {
    it('should register all video catalog tools', () => {
      expect(registry.hasTool('search_video_catalog')).toBe(true);
      expect(registry.hasTool('get_lesson_details')).toBe(true);
    });
  });
});
