/**
 * Resource types for the teaching assistant
 */

// ============== VIDEO CATALOG ==============

export interface VideoTopic {
  id: number;
  title: string;
  lessonCount: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string; // e.g., "1.3" for Topic 1, Lesson 3
  index: number; // 1-based lesson index within topic
  title: string;
  topicId: number;
}

// ============== RESEARCH TOPICS ==============

export interface ResearchCategory {
  id: number;
  title: string;
  topics: ResearchTopic[];
}

export interface ResearchTopic {
  id: string; // e.g., "1.2" for Category 1, Topic 2
  index: number; // 1-based topic index within category
  title: string;
  description: string;
  categoryId: number;
  categoryTitle: string;
}

// ============== ROADMAP ==============

export interface RoadmapTemplate {
  sections: RoadmapSection[];
  milestoneStructure: MilestoneTemplate[];
}

export interface RoadmapSection {
  name: string;
  description: string;
  required: boolean;
}

export interface MilestoneTemplate {
  number: number;
  weeks: string;
  title: string;
  components: string[];
}

export interface Roadmap {
  title: string;
  subtitle: string;
  preparedFor: string;
  date: string;
  abstract: string;
  scope: {
    goal: string;
    researchQuestions: string[];
  };
  dataset: {
    primary: string;
    validation?: string[];
  };
  milestones: RoadmapMilestone[];
  appendices?: RoadmapAppendix[];
}

export interface RoadmapMilestone {
  number: number;
  weeks: string;
  title: string;
  objectives: string[];
  concreteSteps?: string[];
  deliverables: string[];
  acceptanceChecks?: string[];
  risks?: string[];
}

export interface RoadmapAppendix {
  name: string;
  content: string;
}

// ============== SEARCH ==============

export interface SearchResult {
  type: 'video' | 'lesson' | 'research_category' | 'research_topic';
  id: string;
  title: string;
  description?: string;
  score: number; // Relevance score
  metadata?: Record<string, any>;
}

// ============== RESOURCE TYPE ENUM ==============

export type ResourceType = 'video_catalog' | 'research_topics' | 'roadmap_template';
