/**
 * Memory tools tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRegistry, ToolRegistry } from './registry';
import { registerMemoryTools, memoryToolDefinitions } from './memory';
import type { ToolContext } from './types';

// Mock memory service
vi.mock('@/services/memory', () => ({
  getStudentMemory: vi.fn((studentId: string, key: string) => {
    if (studentId === 'student-123' && key === 'interests') {
      return Promise.resolve(['healthcare', 'NLP']);
    }
    return Promise.resolve(null);
  }),
  setStudentMemory: vi.fn(() => Promise.resolve()),
  appendStudentMemory: vi.fn(() => Promise.resolve()),
  getStudentProfile: vi.fn((studentId: string) => {
    if (studentId === 'student-123') {
      return Promise.resolve({
        name: 'Priya Sharma',
        email: 'priya@example.com',
        currentPhase: 'phase1',
        interests: ['healthcare', 'NLP'],
        strengths: ['Python'],
        challenges: [],
        topicsDiscussed: ['RAG', 'embeddings'],
      });
    }
    return Promise.resolve(null);
  }),
}));

describe('Memory Tools', () => {
  let registry: ToolRegistry;
  const context: ToolContext = {
    studentId: 'student-123',
    currentPhase: 'phase1',
  };

  beforeEach(() => {
    registry = createToolRegistry();
    registerMemoryTools(registry);
    vi.clearAllMocks();
  });

  describe('tool definitions', () => {
    it('should have get_student_memory tool defined', () => {
      const tool = memoryToolDefinitions.get_student_memory;
      expect(tool.name).toBe('get_student_memory');
    });

    it('should have save_student_memory tool defined', () => {
      const tool = memoryToolDefinitions.save_student_memory;
      expect(tool.name).toBe('save_student_memory');
      expect(tool.input_schema.required).toContain('key');
      expect(tool.input_schema.required).toContain('value');
    });
  });

  describe('get_student_memory', () => {
    it('should return memory value for existing key', async () => {
      const result = await registry.execute(
        'get_student_memory',
        { key: 'interests' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.value).toEqual(['healthcare', 'NLP']);
    });

    it('should return full profile when no key specified', async () => {
      const result = await registry.execute('get_student_memory', {}, context);

      expect(result.success).toBe(true);
      expect(result.data.profile).toBeDefined();
      expect(result.data.profile.name).toBe('Priya Sharma');
    });

    it('should return null for non-existent key', async () => {
      const result = await registry.execute(
        'get_student_memory',
        { key: 'nonexistent' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.value).toBeNull();
    });
  });

  describe('save_student_memory', () => {
    it('should save memory value', async () => {
      const result = await registry.execute(
        'save_student_memory',
        { key: 'new_interest', value: 'legal AI' },
        context
      );

      expect(result.success).toBe(true);
    });

    it('should append to array when append=true', async () => {
      const result = await registry.execute(
        'save_student_memory',
        { key: 'interests', value: 'legal AI', append: true },
        context
      );

      expect(result.success).toBe(true);
    });

    it('should fail without key', async () => {
      const result = await registry.execute(
        'save_student_memory',
        { value: 'test' },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('key');
    });

    it('should fail without value', async () => {
      const result = await registry.execute(
        'save_student_memory',
        { key: 'test' },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('value');
    });
  });

  describe('tool registration', () => {
    it('should register all memory tools', () => {
      expect(registry.hasTool('get_student_memory')).toBe(true);
      expect(registry.hasTool('save_student_memory')).toBe(true);
    });
  });
});
