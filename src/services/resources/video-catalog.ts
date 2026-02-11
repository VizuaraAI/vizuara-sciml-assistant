/**
 * Video catalog parser and search
 * Parses resources/phase1-videos/video-catalog.md
 */

import fs from 'fs';
import path from 'path';
import type { VideoTopic, Lesson, SearchResult } from './types';

// Cache parsed data
let videoCatalog: VideoTopic[] | null = null;

/**
 * Parse the video catalog markdown file
 */
export function parseVideoCatalog(): VideoTopic[] {
  if (videoCatalog) return videoCatalog;

  const filePath = path.join(process.cwd(), 'resources/phase1-videos/video-catalog.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  const topics: VideoTopic[] = [];
  let currentTopic: VideoTopic | null = null;
  let lessonIndex = 0;

  const lines = content.split('\n');

  for (const line of lines) {
    // Match topic headers like "## 1. LLM Foundations and Hands on Projects"
    const topicMatch = line.match(/^## (\d+)\. (.+)$/);
    if (topicMatch) {
      if (currentTopic) {
        topics.push(currentTopic);
      }
      currentTopic = {
        id: parseInt(topicMatch[1]),
        title: topicMatch[2].trim(),
        lessonCount: 0,
        lessons: [],
      };
      lessonIndex = 0;
      continue;
    }

    // Match lesson count like "*9 lessons*"
    const lessonCountMatch = line.match(/^\*(\d+) lessons?\*$/);
    if (lessonCountMatch && currentTopic) {
      currentTopic.lessonCount = parseInt(lessonCountMatch[1]);
      continue;
    }

    // Match lesson items like "- Course Introduction"
    const lessonMatch = line.match(/^- (.+)$/);
    if (lessonMatch && currentTopic) {
      lessonIndex++;
      const lesson: Lesson = {
        id: `${currentTopic.id}.${lessonIndex}`,
        index: lessonIndex,
        title: lessonMatch[1].trim(),
        topicId: currentTopic.id,
      };
      currentTopic.lessons.push(lesson);
    }
  }

  // Don't forget the last topic
  if (currentTopic) {
    topics.push(currentTopic);
  }

  videoCatalog = topics;
  return topics;
}

/**
 * Search video catalog by keyword
 */
export function searchVideoCatalog(query: string): SearchResult[] {
  const catalog = parseVideoCatalog();
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const topic of catalog) {
    // Check if query matches topic title
    if (topic.title.toLowerCase().includes(queryLower)) {
      results.push({
        type: 'video',
        id: topic.id.toString(),
        title: `Topic ${topic.id}: ${topic.title}`,
        description: `${topic.lessonCount} lessons`,
        score: 1.0,
        metadata: { topicId: topic.id, lessonCount: topic.lessonCount },
      });
    }

    // Check if query matches any lesson
    for (const lesson of topic.lessons) {
      if (lesson.title.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          description: `Topic ${topic.id}: ${topic.title}`,
          score: 0.8,
          metadata: { topicId: topic.id, lessonId: lesson.id, topicTitle: topic.title },
        });
      }
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get a specific topic by ID
 */
export function getVideoTopic(topicId: number): VideoTopic | null {
  const catalog = parseVideoCatalog();
  return catalog.find((t) => t.id === topicId) || null;
}

/**
 * Get a specific lesson by ID (e.g., "3.2")
 */
export function getLesson(lessonId: string): Lesson | null {
  const catalog = parseVideoCatalog();
  for (const topic of catalog) {
    const lesson = topic.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
}

/**
 * Get all lessons for a topic
 */
export function getLessonsByTopic(topicId: number): Lesson[] {
  const topic = getVideoTopic(topicId);
  return topic?.lessons || [];
}

/**
 * Get formatted summary of video catalog for agent context
 */
export function getVideoCatalogSummary(): string {
  const catalog = parseVideoCatalog();
  const lines = ['Video Curriculum (Phase I):'];

  for (const topic of catalog) {
    lines.push(`\nTopic ${topic.id}: ${topic.title} (${topic.lessonCount} lessons)`);
    for (const lesson of topic.lessons) {
      lines.push(`  ${lesson.id}. ${lesson.title}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get topic by name (fuzzy match)
 */
export function getTopicByName(name: string): VideoTopic | null {
  const catalog = parseVideoCatalog();
  const nameLower = name.toLowerCase();

  // Try exact match first
  let topic = catalog.find((t) => t.title.toLowerCase() === nameLower);
  if (topic) return topic;

  // Try partial match
  topic = catalog.find((t) => t.title.toLowerCase().includes(nameLower));
  if (topic) return topic;

  // Try keyword match
  const keywords = nameLower.split(/\s+/);
  topic = catalog.find((t) =>
    keywords.some((kw) => t.title.toLowerCase().includes(kw))
  );

  return topic || null;
}
