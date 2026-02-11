/**
 * Research topics parser and search
 * Parses resources/phase2-topics/topics.md
 */

import fs from 'fs';
import path from 'path';
import type { ResearchCategory, ResearchTopic, SearchResult } from './types';

// Cache parsed data
let researchCategories: ResearchCategory[] | null = null;

/**
 * Parse the research topics markdown file
 */
export function parseResearchTopics(): ResearchCategory[] {
  if (researchCategories) return researchCategories;

  const filePath = path.join(process.cwd(), 'resources/phase2-topics/topics.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  const categories: ResearchCategory[] = [];
  let currentCategory: ResearchCategory | null = null;
  let currentTopic: ResearchTopic | null = null;
  let topicIndex = 0;
  let collectingDescription = false;
  let descriptionLines: string[] = [];

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match category headers like "## 1. Healthcare & Biomedical AI"
    const categoryMatch = line.match(/^## (\d+)\. (.+)$/);
    if (categoryMatch) {
      // Save previous topic if exists
      if (currentTopic && currentCategory) {
        currentTopic.description = descriptionLines.join(' ').trim();
        currentCategory.topics.push(currentTopic);
        currentTopic = null;
        descriptionLines = [];
        collectingDescription = false;
      }
      // Save previous category if exists
      if (currentCategory) {
        categories.push(currentCategory);
      }
      currentCategory = {
        id: parseInt(categoryMatch[1]),
        title: categoryMatch[2].trim(),
        topics: [],
      };
      topicIndex = 0;
      continue;
    }

    // Match topic headers like "### 1.1 AI-Powered Clinical Documentation..."
    const topicMatch = line.match(/^### (\d+)\.(\d+) (.+)$/);
    if (topicMatch && currentCategory) {
      // Save previous topic if exists
      if (currentTopic) {
        currentTopic.description = descriptionLines.join(' ').trim();
        currentCategory.topics.push(currentTopic);
        descriptionLines = [];
      }
      topicIndex++;
      currentTopic = {
        id: `${topicMatch[1]}.${topicMatch[2]}`,
        index: topicIndex,
        title: topicMatch[3].trim(),
        description: '',
        categoryId: currentCategory.id,
        categoryTitle: currentCategory.title,
      };
      collectingDescription = true;
      continue;
    }

    // Collect description lines for current topic
    if (collectingDescription && currentTopic && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      descriptionLines.push(line.trim());
    }

    // Stop collecting on empty line or divider
    if (collectingDescription && (line.trim() === '' || line.startsWith('---'))) {
      if (currentTopic && descriptionLines.length > 0) {
        currentTopic.description = descriptionLines.join(' ').trim();
      }
      // Don't reset collectingDescription - continue for multi-paragraph
    }
  }

  // Don't forget the last topic and category
  if (currentTopic && currentCategory) {
    if (descriptionLines.length > 0) {
      currentTopic.description = descriptionLines.join(' ').trim();
    }
    currentCategory.topics.push(currentTopic);
  }
  if (currentCategory) {
    categories.push(currentCategory);
  }

  researchCategories = categories;
  return categories;
}

/**
 * Search research topics by keyword
 */
export function searchResearchTopics(query: string, categoryFilter?: string): SearchResult[] {
  const categories = parseResearchTopics();
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const category of categories) {
    // Apply category filter if provided
    if (categoryFilter && !category.title.toLowerCase().includes(categoryFilter.toLowerCase())) {
      continue;
    }

    // Check if query matches category
    if (category.title.toLowerCase().includes(queryLower)) {
      results.push({
        type: 'research_category',
        id: category.id.toString(),
        title: category.title,
        description: `${category.topics.length} research topics`,
        score: 0.9,
        metadata: { categoryId: category.id, topicCount: category.topics.length },
      });
    }

    // Check topics
    for (const topic of category.topics) {
      const titleMatch = topic.title.toLowerCase().includes(queryLower);
      const descMatch = topic.description.toLowerCase().includes(queryLower);

      if (titleMatch || descMatch) {
        results.push({
          type: 'research_topic',
          id: topic.id,
          title: topic.title,
          description: topic.description.substring(0, 200) + (topic.description.length > 200 ? '...' : ''),
          score: titleMatch ? 1.0 : 0.7,
          metadata: {
            topicId: topic.id,
            categoryId: category.id,
            categoryTitle: category.title,
            fullDescription: topic.description,
          },
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get a specific category by ID
 */
export function getCategory(categoryId: number): ResearchCategory | null {
  const categories = parseResearchTopics();
  return categories.find((c) => c.id === categoryId) || null;
}

/**
 * Get a specific research topic by ID
 */
export function getResearchTopic(topicId: string): ResearchTopic | null {
  const categories = parseResearchTopics();
  for (const category of categories) {
    const topic = category.topics.find((t) => t.id === topicId);
    if (topic) return topic;
  }
  return null;
}

/**
 * Get all topics in a category
 */
export function getTopicsByCategory(categoryId: number): ResearchTopic[] {
  const category = getCategory(categoryId);
  return category?.topics || [];
}

/**
 * Suggest topics based on interests
 */
export function suggestTopics(interests: string[]): ResearchTopic[] {
  const categories = parseResearchTopics();
  const suggestions: { topic: ResearchTopic; score: number }[] = [];

  for (const category of categories) {
    for (const topic of category.topics) {
      let score = 0;
      const searchText = `${topic.title} ${topic.description} ${topic.categoryTitle}`.toLowerCase();

      for (const interest of interests) {
        if (searchText.includes(interest.toLowerCase())) {
          score += 1;
        }
      }

      if (score > 0) {
        suggestions.push({ topic, score });
      }
    }
  }

  // Sort by score and return top results
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => s.topic);
}

/**
 * Get formatted summary of all research topics for agent context
 */
export function getResearchTopicsSummary(): string {
  const categories = parseResearchTopics();
  const lines = ['Research Topics (Phase II):'];

  for (const category of categories) {
    lines.push(`\n${category.id}. ${category.title}`);
    for (const topic of category.topics) {
      lines.push(`   ${topic.id} ${topic.title}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get all categories with topic counts
 */
export function getAllCategories(): { id: number; title: string; topicCount: number }[] {
  const categories = parseResearchTopics();
  return categories.map((c) => ({
    id: c.id,
    title: c.title,
    topicCount: c.topics.length,
  }));
}
