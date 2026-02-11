/**
 * Progress tools tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRegistry, ToolRegistry } from './registry';
import { registerProgressTools, progressToolDefinitions } from './progress';
import type { ToolContext } from './types';

// Mock database queries
vi.mock('@/db/queries/students', () => ({
  getStudentById: vi.fn((id: string) => {
    if (id === 'student-123') {
      return Promise.resolve({
        id: 'student-123',
        userId: 'user-123',
        mentorId: 'mentor-123',
        currentPhase: 'phase1',
        currentTopicIndex: 3,
        currentMilestone: 0,
        researchTopic: null,
        enrollmentDate: new Date('2024-01-01'),
        phase1Start: new Date('2024-01-01'),
        phase2Start: null,
      });
    }
    return Promise.resolve(null);
  }),
  updateStudent: vi.fn(() => Promise.resolve({ id: 'student-123' })),
}));

vi.mock('@/db/queries/progress', () => ({
  getProgressByStudentId: vi.fn((studentId: string) => {
    if (studentId === 'student-123') {
      return Promise.resolve([
        { id: '1', studentId, phase: 'phase1', topicIndex: 1, status: 'completed' },
        { id: '2', studentId, phase: 'phase1', topicIndex: 2, status: 'completed' },
        { id: '3', studentId, phase: 'phase1', topicIndex: 3, status: 'in_progress' },
      ]);
    }
    return Promise.resolve([]);
  }),
  updateProgress: vi.fn(() => Promise.resolve({ id: '3' })),
  createProgress: vi.fn(() => Promise.resolve({ id: '4' })),
}));

describe('Progress Tools', () => {
  let registry: ToolRegistry;
  const context: ToolContext = {
    studentId: 'student-123',
    currentPhase: 'phase1',
  };

  beforeEach(() => {
    registry = createToolRegistry();
    registerProgressTools(registry);
    vi.clearAllMocks();
  });

  describe('tool definitions', () => {
    it('should have get_student_progress tool defined', () => {
      const tool = progressToolDefinitions.get_student_progress;
      expect(tool.name).toBe('get_student_progress');
    });

    it('should have update_student_progress tool defined', () => {
      const tool = progressToolDefinitions.update_student_progress;
      expect(tool.name).toBe('update_student_progress');
    });

    it('should have transition_to_phase2 tool defined', () => {
      const tool = progressToolDefinitions.transition_to_phase2;
      expect(tool.name).toBe('transition_to_phase2');
      expect(tool.input_schema.required).toContain('research_topic');
    });
  });

  describe('get_student_progress', () => {
    it('should return student progress', async () => {
      const result = await registry.execute('get_student_progress', {}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.currentPhase).toBe('phase1');
      expect(result.data.currentTopicIndex).toBe(3);
    });

    it('should return error for non-existent student', async () => {
      const result = await registry.execute(
        'get_student_progress',
        {},
        { studentId: 'nonexistent', currentPhase: 'phase1' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('update_student_progress', () => {
    it('should update student progress', async () => {
      const result = await registry.execute(
        'update_student_progress',
        { topic_index: 4, status: 'in_progress' },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe('transition_to_phase2', () => {
    it('should transition student to phase 2', async () => {
      const result = await registry.execute(
        'transition_to_phase2',
        { research_topic: 'AI in Healthcare' },
        context
      );

      expect(result.success).toBe(true);
    });

    it('should fail without research_topic', async () => {
      const result = await registry.execute('transition_to_phase2', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('research_topic');
    });
  });

  describe('tool registration', () => {
    it('should register all progress tools', () => {
      expect(registry.hasTool('get_student_progress')).toBe(true);
      expect(registry.hasTool('update_student_progress')).toBe(true);
      expect(registry.hasTool('transition_to_phase2')).toBe(true);
    });
  });
});
