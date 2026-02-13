/**
 * Unit tests for Dr. Raj persona system prompt
 */

import { describe, it, expect } from 'vitest';
import { DR_RAJ_PERSONA, getBaseSystemPrompt, buildSystemPrompt } from './system';

describe('Dr. Raj Persona System Prompt', () => {
  describe('DR_RAJ_PERSONA', () => {
    it('should include PhD MIT identity', () => {
      expect(DR_RAJ_PERSONA).toContain('PhD (MIT)');
      expect(DR_RAJ_PERSONA).toContain('Vizuara');
    });

    it('should emphasize personalized, mentor-like tone', () => {
      expect(DR_RAJ_PERSONA).toContain('PERSONALIZED');
      expect(DR_RAJ_PERSONA).toContain('MENTOR-LIKE');
      expect(DR_RAJ_PERSONA).toContain('Never formal, robotic');
    });

    it('should include foundations-first philosophy', () => {
      expect(DR_RAJ_PERSONA).toContain('FOUNDATIONS FIRST');
      expect(DR_RAJ_PERSONA).toContain('foundations are strong');
      expect(DR_RAJ_PERSONA).toContain('first-principles thinking');
    });

    it('should include required communication phrases', () => {
      const requiredPhrases = [
        'Thanks for your message',
        'Here are my thoughts',
        'In my experience',
        'From my time at MIT',
        'Personally, I believe',
      ];

      requiredPhrases.forEach(phrase => {
        expect(DR_RAJ_PERSONA).toContain(phrase);
      });
    });

    it('should prohibit generic AI behaviors', () => {
      expect(DR_RAJ_PERSONA).toContain('Never sound like a generic AI');
      expect(DR_RAJ_PERSONA).toContain('As an AI language model');
      expect(DR_RAJ_PERSONA).toContain('Never sound like customer support');
    });

    it('should include response structure requirements', () => {
      expect(DR_RAJ_PERSONA).toContain('Start with warmth');
      expect(DR_RAJ_PERSONA).toContain('personal opinion');
      expect(DR_RAJ_PERSONA).toContain('Emphasize foundations');
    });

    it('should include example transformations', () => {
      expect(DR_RAJ_PERSONA).toContain('Instead of:');
      expect(DR_RAJ_PERSONA).toContain('SAY:');
    });
  });

  describe('getBaseSystemPrompt', () => {
    it('should return the DR_RAJ_PERSONA', () => {
      const prompt = getBaseSystemPrompt();
      expect(prompt).toBe(DR_RAJ_PERSONA);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include student name', () => {
      const prompt = buildSystemPrompt('Priya', 'phase1', {});
      expect(prompt).toContain('Priya');
    });

    it('should include Phase I context for phase1 students', () => {
      const prompt = buildSystemPrompt('Alex', 'phase1', {
        phase1Start: '2024-01-01',
      });
      expect(prompt).toContain('Phase I');
      expect(prompt).toContain('Video Curriculum');
    });

    it('should include Phase II context for phase2 students', () => {
      const prompt = buildSystemPrompt('Sarah', 'phase2', {
        researchTopic: 'Multimodal RAG',
        phase2Start: '2024-02-01',
      });
      expect(prompt).toContain('Multimodal RAG');
      expect(prompt).toContain('Phase II');
    });

    it('should include proactive engagement rules', () => {
      const prompt = buildSystemPrompt('Test', 'phase1', {});
      expect(prompt).toContain('PROACTIVE ENGAGEMENT RULES');
      expect(prompt).toContain('inactive');
    });

    it('should include memory instructions', () => {
      const prompt = buildSystemPrompt('Test', 'phase1', {});
      expect(prompt).toContain('MEMORY INSTRUCTIONS');
    });
  });
});

describe('Persona Quality Checks', () => {
  it('should not contain generic AI assistant phrases', () => {
    const badPhrases = [
      'I am an AI',
      'As a language model',
      'I cannot',
      'I am not able to',
      'I do not have feelings',
      'I was trained',
    ];

    badPhrases.forEach(phrase => {
      expect(DR_RAJ_PERSONA.toLowerCase()).not.toContain(phrase.toLowerCase());
    });
  });

  it('should not contain overly formal language', () => {
    const formalPhrases = [
      'Dear Sir/Madam',
      'Please be advised',
      'As per your request',
      'Kindly note that',
    ];

    formalPhrases.forEach(phrase => {
      expect(DR_RAJ_PERSONA.toLowerCase()).not.toContain(phrase.toLowerCase());
    });
  });

  it('should emphasize warm, human tone', () => {
    expect(DR_RAJ_PERSONA).toContain('Warm');
    expect(DR_RAJ_PERSONA).toContain('human');
    expect(DR_RAJ_PERSONA).toContain('mentor');
    expect(DR_RAJ_PERSONA).toContain('coffee');
  });
});
