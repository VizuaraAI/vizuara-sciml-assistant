/**
 * Roadmap tools tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRegistry, ToolRegistry } from './registry';
import { registerRoadmapTools, roadmapToolDefinitions } from './roadmap';
import type { ToolContext } from './types';

// Mock resources service
vi.mock('@/services/resources', () => ({
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
  generateRoadmapStructure: vi.fn((studentName: string, topic: any, duration: number) => ({
    title: `${duration}-Week Research Roadmap`,
    subtitle: topic.title,
    preparedFor: studentName,
    date: '2024-01-15',
    abstract: '',
    milestones: [
      { number: 1, weeks: '1-2', title: 'Literature Review', objectives: [], deliverables: [] },
      { number: 2, weeks: '3-4', title: 'Implementation Setup', objectives: [], deliverables: [] },
    ],
  })),
  formatRoadmapAsMarkdown: vi.fn((roadmap: any) => `# ${roadmap.title}\n## ${roadmap.subtitle}`),
  getRoadmapPromptContext: vi.fn(() => 'Roadmap generation guidelines...'),
}));

// Mock db queries
vi.mock('@/db/queries/students', () => ({
  getStudentById: vi.fn((id: string) => {
    if (id === 'student-123') {
      return Promise.resolve({
        id: 'student-123',
        currentMilestone: 2,
      });
    }
    return Promise.resolve(null);
  }),
}));

vi.mock('@/db/queries/roadmaps', () => ({
  getRoadmapByStudentId: vi.fn((studentId: string) => {
    if (studentId === 'student-123') {
      return Promise.resolve({
        id: 'roadmap-1',
        studentId,
        topic: 'AI-Powered Clinical Documentation',
        content: {
          title: '8-Week Research Roadmap',
          subtitle: 'AI-Powered Clinical Documentation',
          milestones: [
            { number: 1, weeks: '1-2', title: 'Literature Review', status: 'completed' },
            { number: 2, weeks: '3-4', title: 'Implementation Setup', status: 'in_progress' },
            { number: 3, weeks: '5-6', title: 'Core Experiments', status: 'not_started' },
            { number: 4, weeks: '7-8', title: 'Analysis & Writing', status: 'not_started' },
          ],
        },
      });
    }
    return Promise.resolve(null);
  }),
  createRoadmap: vi.fn(() => Promise.resolve({ id: 'new-roadmap' })),
}));

vi.mock('@/services/memory', () => ({
  getStudentProfile: vi.fn((studentId: string) => {
    if (studentId === 'student-123') {
      return Promise.resolve({
        name: 'Sarah Johnson',
      });
    }
    return Promise.resolve(null);
  }),
}));

describe('Roadmap Tools', () => {
  let registry: ToolRegistry;
  const context: ToolContext = {
    studentId: 'student-123',
    currentPhase: 'phase2',
  };

  beforeEach(() => {
    registry = createToolRegistry();
    registerRoadmapTools(registry);
    vi.clearAllMocks();
  });

  describe('tool definitions', () => {
    it('should have generate_roadmap tool defined', () => {
      const tool = roadmapToolDefinitions.generate_roadmap;
      expect(tool.name).toBe('generate_roadmap');
      expect(tool.input_schema.required).toContain('topic_id');
    });

    it('should have get_milestone_details tool defined', () => {
      const tool = roadmapToolDefinitions.get_milestone_details;
      expect(tool.name).toBe('get_milestone_details');
      expect(tool.input_schema.required).toContain('milestone_number');
    });
  });

  describe('generate_roadmap', () => {
    it('should generate roadmap for valid topic', async () => {
      const result = await registry.execute(
        'generate_roadmap',
        { topic_id: '1.1', duration_weeks: 8 },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.roadmap).toBeDefined();
    });

    it('should return error for invalid topic ID', async () => {
      const result = await registry.execute(
        'generate_roadmap',
        { topic_id: '99.99' },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail without topic_id', async () => {
      const result = await registry.execute('generate_roadmap', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('topic_id');
    });
  });

  describe('get_milestone_details', () => {
    it('should return milestone details for valid number', async () => {
      const result = await registry.execute(
        'get_milestone_details',
        { milestone_number: 2 },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.milestone.number).toBe(2);
    });

    it('should return error for invalid milestone number', async () => {
      const result = await registry.execute(
        'get_milestone_details',
        { milestone_number: 99 },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail without milestone_number', async () => {
      const result = await registry.execute('get_milestone_details', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('milestone_number');
    });
  });

  describe('tool registration', () => {
    it('should register all roadmap tools', () => {
      expect(registry.hasTool('generate_roadmap')).toBe(true);
      expect(registry.hasTool('get_milestone_details')).toBe(true);
    });
  });
});
