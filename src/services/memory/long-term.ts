/**
 * Long-term memory service
 * Manages persistent student profile and learning history
 */

import {
  getMemory,
  getMemoryValue,
  setMemory,
  appendToMemory,
  getAllMemoryForStudent,
  deleteMemory,
} from '@/db/queries/memory';
import { getStudentWithUser } from '@/db/queries/students';
import { getProgressByStudentId } from '@/db/queries/progress';
import type { MemoryType, Phase } from '@/db/schema';

// ============== TYPES ==============

export interface StudentProfile {
  // Basic info
  name: string;
  email: string;
  enrollmentDate: Date;

  // Phase info
  currentPhase: Phase;
  daysInCurrentPhase: number;

  // Phase I specific
  currentTopicIndex: number;
  topicsCompleted: number;

  // Phase II specific
  researchTopic: string | null;
  currentMilestone: number;

  // Learning profile (from memory)
  learningStyle?: string;
  interests: string[];
  strengths: string[];
  challenges: string[];

  // History
  topicsDiscussed: string[];
  questionsAsked: number;
  lastInteraction?: Date;
}

// ============== MEMORY KEYS ==============

export const MEMORY_KEYS = {
  // Profile
  LEARNING_STYLE: 'profile.learning_style',
  INTERESTS: 'profile.interests',
  STRENGTHS: 'profile.strengths',
  CHALLENGES: 'profile.challenges',
  BACKGROUND: 'profile.background',

  // History
  TOPICS_DISCUSSED: 'history.topics_discussed',
  QUESTIONS_ASKED: 'history.questions_asked',
  LAST_INTERACTION: 'history.last_interaction',
  PAPERS_RECOMMENDED: 'history.papers_recommended',
  DAILY_NOTES: 'history.daily_notes', // Daily conversation summaries

  // Research (Phase II)
  RESEARCH_TOPIC: 'research.topic',
  RESEARCH_MILESTONE: 'research.milestone',
  RESEARCH_BLOCKERS: 'research.current_blockers',
  PAPERS_READ: 'research.papers_read',
} as const;

// ============== FUNCTIONS ==============

/**
 * Get complete student profile including memory
 */
export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  // Get student and user data
  const data = await getStudentWithUser(studentId);
  if (!data) return null;

  const { student, user } = data;

  // Get all memory
  const memories = await getAllMemoryForStudent(studentId);
  const memoryMap = new Map(memories.map((m) => [m.key, m.value]));

  // Get progress
  const progressRecords = await getProgressByStudentId(studentId);
  const completedTopics = progressRecords.filter(
    (p) => p.phase === 'phase1' && p.status === 'completed'
  ).length;

  // Calculate days in current phase
  const phaseStart =
    student.currentPhase === 'phase1' ? student.phase1Start : student.phase2Start;
  const daysInPhase = phaseStart
    ? Math.floor((Date.now() - phaseStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    name: user.name,
    email: user.email,
    enrollmentDate: student.enrollmentDate,
    currentPhase: student.currentPhase,
    daysInCurrentPhase: daysInPhase,
    currentTopicIndex: student.currentTopicIndex || 1,
    topicsCompleted: completedTopics,
    researchTopic: student.researchTopic,
    currentMilestone: student.currentMilestone || 0,
    learningStyle: memoryMap.get(MEMORY_KEYS.LEARNING_STYLE) as string | undefined,
    interests: (memoryMap.get(MEMORY_KEYS.INTERESTS) as string[]) || [],
    strengths: (memoryMap.get(MEMORY_KEYS.STRENGTHS) as string[]) || [],
    challenges: (memoryMap.get(MEMORY_KEYS.CHALLENGES) as string[]) || [],
    topicsDiscussed: (memoryMap.get(MEMORY_KEYS.TOPICS_DISCUSSED) as string[]) || [],
    questionsAsked: (memoryMap.get(MEMORY_KEYS.QUESTIONS_ASKED) as number) || 0,
    lastInteraction: memoryMap.get(MEMORY_KEYS.LAST_INTERACTION) as Date | undefined,
  };
}

/**
 * Get a specific memory value
 */
export async function getStudentMemory(
  studentId: string,
  key: string
): Promise<any | null> {
  return getMemoryValue(studentId, 'long_term', key);
}

/**
 * Set a memory value
 */
export async function setStudentMemory(
  studentId: string,
  key: string,
  value: any
): Promise<void> {
  await setMemory(studentId, 'long_term', key, value);
}

/**
 * Append to an array-type memory
 */
export async function appendStudentMemory(
  studentId: string,
  key: string,
  value: any
): Promise<void> {
  await appendToMemory(studentId, 'long_term', key, value);
}

/**
 * Record a topic that was discussed
 */
export async function recordTopicDiscussed(
  studentId: string,
  topic: string
): Promise<void> {
  const existing = await getStudentMemory(studentId, MEMORY_KEYS.TOPICS_DISCUSSED);
  const topics = Array.isArray(existing) ? existing : [];

  // Avoid duplicates
  if (!topics.includes(topic)) {
    topics.push(topic);
    await setStudentMemory(studentId, MEMORY_KEYS.TOPICS_DISCUSSED, topics);
  }
}

/**
 * Record an interest
 */
export async function recordInterest(
  studentId: string,
  interest: string
): Promise<void> {
  const existing = await getStudentMemory(studentId, MEMORY_KEYS.INTERESTS);
  const interests = Array.isArray(existing) ? existing : [];

  if (!interests.includes(interest)) {
    interests.push(interest);
    await setStudentMemory(studentId, MEMORY_KEYS.INTERESTS, interests);
  }
}

/**
 * Update last interaction timestamp
 */
export async function updateLastInteraction(studentId: string): Promise<void> {
  await setStudentMemory(studentId, MEMORY_KEYS.LAST_INTERACTION, new Date().toISOString());
}

/**
 * Increment questions asked counter
 */
export async function incrementQuestionsAsked(studentId: string): Promise<void> {
  const current = (await getStudentMemory(studentId, MEMORY_KEYS.QUESTIONS_ASKED)) || 0;
  await setStudentMemory(studentId, MEMORY_KEYS.QUESTIONS_ASKED, current + 1);
}

/**
 * Save a daily note about the student
 */
export async function saveDailyNote(
  studentId: string,
  note: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const existing = await getStudentMemory(studentId, MEMORY_KEYS.DAILY_NOTES);
  const notes = Array.isArray(existing) ? existing : [];

  // Add new note with timestamp
  notes.push({
    date: today,
    note,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 30 days of notes
  const recentNotes = notes.slice(-30);

  await setStudentMemory(studentId, MEMORY_KEYS.DAILY_NOTES, recentNotes);
}

/**
 * Get recent daily notes
 */
export async function getRecentDailyNotes(
  studentId: string,
  days: number = 7
): Promise<Array<{ date: string; note: string; timestamp: string }>> {
  const notes = await getStudentMemory(studentId, MEMORY_KEYS.DAILY_NOTES);
  if (!Array.isArray(notes)) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return notes.filter((n: any) => new Date(n.date) >= cutoffDate);
}

/**
 * Format student profile for agent context
 */
export function formatProfileForContext(profile: StudentProfile): string {
  const lines: string[] = [];

  lines.push(`Student: ${profile.name}`);
  lines.push(`Phase: ${profile.currentPhase === 'phase1' ? 'Phase I (Learning)' : 'Phase II (Research)'}`);
  lines.push(`Days in phase: ${profile.daysInCurrentPhase}`);

  if (profile.currentPhase === 'phase1') {
    lines.push(`Current topic: ${profile.currentTopicIndex} of 8`);
    lines.push(`Topics completed: ${profile.topicsCompleted}`);
  } else {
    lines.push(`Research topic: ${profile.researchTopic || 'Not yet selected'}`);
    lines.push(`Current milestone: ${profile.currentMilestone} of 5`);
  }

  if (profile.learningStyle) {
    lines.push(`Learning style: ${profile.learningStyle}`);
  }

  if (profile.interests.length > 0) {
    lines.push(`Interests: ${profile.interests.join(', ')}`);
  }

  if (profile.strengths.length > 0) {
    lines.push(`Strengths: ${profile.strengths.join(', ')}`);
  }

  if (profile.challenges.length > 0) {
    lines.push(`Areas for improvement: ${profile.challenges.join(', ')}`);
  }

  if (profile.topicsDiscussed.length > 0) {
    lines.push(`Previously discussed: ${profile.topicsDiscussed.slice(-5).join(', ')}`);
  }

  return lines.join('\n');
}
