# Sprint v1 — Tasks (Agent-First Approach)

## Task Overview

| ID | Task | Priority | Est. | Status |
|----|------|----------|------|--------|
| **Setup** |
| T-001 | Initialize Next.js 14 project (minimal) | P0 | 5 min | ✅ Done |
| T-002 | Set up environment variables and typed access | P0 | 5 min | ✅ Done |
| T-003 | Configure Drizzle ORM with Supabase | P0 | 8 min | ✅ Done |
| T-004 | Define database schema | P0 | 10 min | ✅ Done |
| T-005 | Create database query helpers | P0 | 10 min | ✅ Done |
| T-006 | Create seed script with test data | P0 | 10 min | ✅ Done |
| **Resources** |
| T-007 | Create resource types and interfaces | P0 | 5 min | ✅ Done |
| T-008 | Build video catalog parser and search | P0 | 10 min | ✅ Done |
| T-009 | Build research topics parser and search | P0 | 10 min | ✅ Done |
| T-010 | Build roadmap template extractor | P0 | 10 min | ✅ Done |
| T-011 | Create resource index and loader | P0 | 8 min | ✅ Done |
| **Memory** |
| T-012 | Build short-term memory service | P0 | 10 min | ✅ Done |
| T-013 | Build long-term memory service | P0 | 10 min | ✅ Done |
| T-014 | Create memory manager (unified interface) | P0 | 8 min | ✅ Done |
| **Agent Tools** |
| T-015 | Create tool type definitions and registry | P0 | 8 min | ✅ Done |
| T-016 | Implement video catalog tools | P0 | 8 min | ✅ Done |
| T-017 | Implement research topics tools | P0 | 8 min | ✅ Done |
| T-018 | Implement progress tools | P0 | 8 min | ✅ Done |
| T-019 | Implement memory tools | P0 | 8 min | ✅ Done |
| T-020 | Implement roadmap generation tool | P0 | 12 min | ✅ Done |
| **Agent Core** |
| T-021 | Create Dr. Raj persona system prompt | P0 | 10 min | ✅ Done |
| T-022 | Create Phase I behavior prompts | P0 | 8 min | ✅ Done |
| T-023 | Create Phase II behavior prompts | P0 | 8 min | ✅ Done |
| T-024 | Build Claude API client wrapper | P0 | 10 min | ✅ Done |
| T-025 | Build agent orchestrator (main loop) | P0 | 15 min | ✅ Done |
| T-026 | Implement Phase I agent handler | P0 | 10 min | ✅ Done |
| T-027 | Implement Phase II agent handler | P0 | 10 min | ✅ Done |
| T-028 | Implement draft mode logic | P0 | 8 min | ✅ Done |
| **API & Test UI** |
| T-029 | Create chat API endpoint | P0 | 10 min | ✅ Done |
| T-030 | Create debug API endpoints (memory, tools) | P1 | 5 min | ✅ Done |
| T-031 | Build minimal test chat UI | P0 | 15 min | ✅ Done |
| T-032 | Add debug panel to test UI | P1 | 10 min | ✅ Done |
| **Integration & Testing** |
| T-033 | End-to-end integration test | P0 | 15 min | ⏳ Pending |
| T-034 | Persona quality validation | P0 | 10 min | ⏳ Pending |

**Total estimated time: ~5 hours**

---

## Detailed Tasks

---

## Setup Tasks

### T-001: Initialize Next.js 14 project (minimal)
**Priority:** P0 | **Dependencies:** None

**Description:**
Create a minimal Next.js 14 project. No Tailwind or shadcn needed yet — just TypeScript and basic structure.

**Files to create:**
- `package.json`
- `tsconfig.json`
- `next.config.js`
- `src/app/layout.tsx`
- `src/app/page.tsx`

**Commands:**
```bash
npx create-next-app@14 . --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind
```

**Acceptance Criteria:**
- [ ] `npm run dev` starts on port 3000
- [ ] TypeScript compiles without errors
- [ ] Basic page renders

---

### T-002: Set up environment variables and typed access
**Priority:** P0 | **Dependencies:** T-001

**Description:**
Create typed environment variable access with validation.

**Files to create:**
- `.env.example`
- `.env.local` (gitignored)
- `src/lib/env.ts`

**Environment variables:**
```
DATABASE_URL=
DIRECT_URL=
ANTHROPIC_API_KEY=
```

**Acceptance Criteria:**
- [ ] `env.ts` exports typed variables
- [ ] Missing required variables throw clear errors
- [ ] `.env.local` is gitignored

---

### T-003: Configure Drizzle ORM with Supabase
**Priority:** P0 | **Dependencies:** T-002

**Description:**
Set up Drizzle ORM to connect to Supabase PostgreSQL.

**Files to create:**
- `drizzle.config.ts`
- `src/db/index.ts`

**Dependencies:**
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

**Package.json scripts:**
```json
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:generate": "drizzle-kit generate"
```

**Acceptance Criteria:**
- [ ] Database connection works
- [ ] `npm run db:push` pushes schema
- [ ] `npm run db:studio` opens Drizzle Studio

---

### T-004: Define database schema
**Priority:** P0 | **Dependencies:** T-003

**Description:**
Create the complete database schema for the teaching assistant.

**Files to create:**
- `src/db/schema.ts`

**Tables:**
```typescript
// Enums
export const userRole = pgEnum('user_role', ['mentor', 'student']);
export const phase = pgEnum('phase', ['phase1', 'phase2']);
export const messageRole = pgEnum('message_role', ['student', 'agent', 'mentor', 'system']);
export const messageStatus = pgEnum('message_status', ['draft', 'approved', 'sent']);
export const memoryType = pgEnum('memory_type', ['short_term', 'long_term']);
export const progressStatus = pgEnum('progress_status', ['not_started', 'in_progress', 'completed']);

// Tables
users: id mod, name, email, role, password_hash, created_at, updated_at
students: id, user_id (FK), mentor_id (FK), enrollment_date, current_phase,
          phase1_start, phase2_start, current_topic_index, current_milestone,
          research_topic, created_at, updated_at
conversations: id, student_id (FK), created_at, updated_at
messages: id, conversation_id (FK), role, content, tool_calls (jsonb),
          tool_results (jsonb), status, created_at
memory: id, student_id (FK), memory_type, key, value (jsonb),
        created_at, updated_at, expires_at
progress: id, student_id (FK), phase, topic_index, milestone,
          status, notes, created_at, updated_at
roadmaps: id, student_id (FK), topic, content (jsonb),
          created_at, updated_at
```

**Acceptance Criteria:**
- [ ] All tables defined with proper types
- [ ] Foreign keys and indexes in place
- [ ] Schema pushes to Supabase without errors

---

### T-005: Create database query helpers
**Priority:** P0 | **Dependencies:** T-004

**Description:**
Create typed query functions for common operations.

**Files to create:**
- `src/db/queries/users.ts`
- `src/db/queries/students.ts`
- `src/db/queries/conversations.ts`
- `src/db/queries/messages.ts`
- `src/db/queries/memory.ts`
- `src/db/queries/progress.ts`
- `src/db/queries/index.ts`

**Key functions:**
```typescript
// users.ts
getUserById(id: string): Promise<User | null>
getUserByEmail(email: string): Promise<User | null>
createUser(data: NewUser): Promise<User>

// students.ts
getStudentById(id: string): Promise<Student | null>
getStudentByUserId(userId: string): Promise<Student | null>
getStudentsByMentorId(mentorId: string): Promise<Student[]>
updateStudentProgress(id: string, data: Partial<Student>): Promise<Student>

// conversations.ts
getConversationByStudentId(studentId: string): Promise<Conversation | null>
createConversation(studentId: string): Promise<Conversation>

// messages.ts
getMessagesByConversationId(conversationId: string, options?: { limit?: number, excludeDrafts?: boolean }): Promise<Message[]>
createMessage(data: NewMessage): Promise<Message>
updateMessageStatus(id: string, status: MessageStatus): Promise<Message>

// memory.ts
getMemory(studentId: string, type: MemoryType, key?: string): Promise<Memory[]>
setMemory(studentId: string, type: MemoryType, key: string, value: any): Promise<Memory>
deleteMemory(studentId: string, type: MemoryType, key?: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] All functions typed with Drizzle inference
- [ ] Queries use proper joins
- [ ] Exported from index.ts

---

### T-006: Create seed script with test data
**Priority:** P0 | **Dependencies:** T-005

**Description:**
Create seed script that populates database with test data.

**Files to create:**
- `src/scripts/seed.ts`

**Package.json script:**
```json
"db:seed": "npx tsx src/scripts/seed.ts"
```

**Seed data:**

1. **Mentor:** Dr. Raj Dandekar
   - Email: raj@vizuara.com
   - Password: password123 (hashed)

2. **Student 1:** Priya Sharma
   - Email: priya@example.com
   - Phase: phase1
   - Current topic: 3 (Agents and LangChain)
   - Memory: ["Learns best with code examples", "Interested in healthcare AI"]
   - Conversation: 5 messages

3. **Student 2:** Alex Chen
   - Email: alex@example.com
   - Phase: phase1
   - Current topic: 5 (RAG)
   - Memory: ["Strong Python background", "Wants to build a legal AI tool"]
   - Conversation: 8 messages

4. **Student 3:** Sarah Johnson
   - Email: sarah@example.com
   - Phase: phase2
   - Research topic: "AI-Powered Clinical Documentation"
   - Current milestone: 2
   - Memory: ["Medical background", "Working with EHR data"]
   - Conversation: 10 messages
   - Has roadmap

**Acceptance Criteria:**
- [ ] `npm run db:seed` runs successfully
- [ ] Script is idempotent (safe to run multiple times)
- [ ] All relationships established
- [ ] Console shows what was created

---

## Resource Tasks

### T-007: Create resource types and interfaces
**Priority:** P0 | **Dependencies:** T-001

**Description:**
Define TypeScript types for all bootcamp resources.

**Files to create:**
- `src/services/resources/types.ts`

**Types:**
```typescript
interface VideoTopic {
  id: number;
  title: string;
  lessonCount: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string; // e.g., "1.3"
  title: string;
  topicId: number;
}

interface ResearchCategory {
  id: number;
  title: string;
  topics: ResearchTopic[];
}

interface ResearchTopic {
  id: string; // e.g., "1.1"
  title: string;
  description: string;
  categoryId: number;
}

interface RoadmapTemplate {
  sections: RoadmapSection[];
  milestoneStructure: MilestoneTemplate[];
}

interface RoadmapSection {
  name: string;
  description: string;
  required: boolean;
}

interface MilestoneTemplate {
  number: number;
  weeks: string;
  title: string;
  components: string[];
}
```

**Acceptance Criteria:**
- [ ] All resource types defined
- [ ] Types are exported
- [ ] Types match actual resource structure

---

### T-008: Build video catalog parser and search
**Priority:** P0 | **Dependencies:** T-007

**Description:**
Parse `resources/phase1-videos/video-catalog.md` and provide search functionality.

**Files to create:**
- `src/services/resources/video-catalog.ts`

**Functions:**
```typescript
// Parse the markdown file into structured data
parseVideoCatalog(): VideoTopic[]

// Search by keyword across topics and lessons
searchVideoCatalog(query: string): SearchResult[]

// Get a specific topic by ID
getVideoTopic(topicId: number): VideoTopic | null

// Get a specific lesson by ID
getLesson(lessonId: string): Lesson | null

// Get all lessons for a topic
getLessonsByTopic(topicId: number): Lesson[]
```

**Acceptance Criteria:**
- [ ] Correctly parses all 8 topics and 35 lessons
- [ ] Search returns relevant results
- [ ] Handles edge cases (no results, partial matches)

---

### T-009: Build research topics parser and search
**Priority:** P0 | **Dependencies:** T-007

**Description:**
Parse `resources/phase2-topics/topics.md` and provide search functionality.

**Files to create:**
- `src/services/resources/research-topics.ts`

**Functions:**
```typescript
// Parse the markdown file into structured data
parseResearchTopics(): ResearchCategory[]

// Search by keyword across categories and topics
searchResearchTopics(query: string): SearchResult[]

// Get a specific category by ID
getCategory(categoryId: number): ResearchCategory | null

// Get a specific topic by ID
getResearchTopic(topicId: string): ResearchTopic | null

// Get all topics in a category
getTopicsByCategory(categoryId: number): ResearchTopic[]

// Get topic suggestions based on interests
suggestTopics(interests: string[]): ResearchTopic[]
```

**Acceptance Criteria:**
- [ ] Correctly parses all 11 categories and 43+ topics
- [ ] Search returns relevant results with descriptions
- [ ] Topic suggestions work based on keywords

---

### T-010: Build roadmap template extractor
**Priority:** P0 | **Dependencies:** T-007

**Description:**
Extract the roadmap format/structure from sample PDFs. Since PDFs are complex, we'll create a structured template based on manual analysis of the samples.

**Files to create:**
- `src/services/resources/roadmap-template.ts`
- `resources/phase2-roadmaps/template.json` (extracted structure)

**Approach:**
1. Manually analyze the 3 sample PDFs (David, Harshal, Sanket)
2. Extract the common structure into a JSON template
3. Create functions to generate roadmaps following this template

**Functions:**
```typescript
// Get the roadmap template structure
getRoadmapTemplate(): RoadmapTemplate

// Generate a roadmap for a student and topic
generateRoadmap(studentName: string, topic: ResearchTopic, startDate: Date): Roadmap

// Validate a roadmap against the template
validateRoadmap(roadmap: Roadmap): ValidationResult
```

**Acceptance Criteria:**
- [ ] Template captures all required sections from CLAUDE.md
- [ ] Generated roadmaps follow the exact format
- [ ] Milestones have proper structure (objectives, deliverables, risks)

---

### T-011: Create resource index and loader
**Priority:** P0 | **Dependencies:** T-008, T-009, T-010

**Description:**
Create a unified resource loader that indexes all resources.

**Files to create:**
- `src/services/resources/index.ts`

**Functions:**
```typescript
// Initialize and cache all resources
initializeResources(): Promise<void>

// Get resource by type and ID
getResource(type: ResourceType, id: string): Resource | null

// Search across all resources
searchResources(query: string, types?: ResourceType[]): SearchResult[]

// Get resource summary for agent context
getResourceSummary(): string
```

**Acceptance Criteria:**
- [ ] All resources loaded and indexed
- [ ] Search works across resource types
- [ ] Summary fits in context window

---

## Memory Tasks

### T-012: Build short-term memory service
**Priority:** P0 | **Dependencies:** T-005

**Description:**
Manage conversation context (recent messages) for the agent.

**Files to create:**
- `src/services/memory/short-term.ts`

**Functions:**
```typescript
// Get recent messages for context
getConversationContext(studentId: string, limit?: number): Promise<Message[]>

// Format messages for Claude API
formatMessagesForClaude(messages: Message[]): ClaudeMessage[]

// Summarize long conversations to fit context window
summarizeConversation(messages: Message[]): Promise<string>

// Clear short-term memory (if needed)
clearShortTermMemory(studentId: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] Returns recent messages in correct order
- [ ] Formats correctly for Claude API
- [ ] Handles empty conversations
- [ ] Summarization works for long conversations

---

### T-013: Build long-term memory service
**Priority:** P0 | **Dependencies:** T-005

**Description:**
Manage persistent student profile and learning history.

**Files to create:**
- `src/services/memory/long-term.ts`

**Memory keys (examples):**
```typescript
// Student profile
"profile.learning_style" // "visual", "code-examples", etc.
"profile.interests" // ["healthcare AI", "NLP"]
"profile.strengths" // ["Python", "ML fundamentals"]
"profile.challenges" // ["Chunking strategies", "Evaluation metrics"]

// Learning history
"history.topics_discussed" // ["RAG", "embeddings", "semantic search"]
"history.questions_asked" // Count or list
"history.last_interaction" // Timestamp

// Research (Phase II)
"research.topic" // Full topic details
"research.milestone" // Current milestone
"research.blockers" // Current challenges
"research.papers_read" // List of papers discussed
```

**Functions:**
```typescript
// Get all long-term memory for a student
getStudentProfile(studentId: string): Promise<StudentProfile>

// Get specific memory value
getMemoryValue(studentId: string, key: string): Promise<any>

// Set memory value
setMemoryValue(studentId: string, key: string, value: any): Promise<void>

// Add to array-type memory
appendToMemory(studentId: string, key: string, value: any): Promise<void>

// Format profile for agent context
formatProfileForContext(profile: StudentProfile): string
```

**Acceptance Criteria:**
- [ ] Memory persists across sessions
- [ ] Profile formatting is concise but informative
- [ ] Array operations work correctly

---

### T-014: Create memory manager (unified interface)
**Priority:** P0 | **Dependencies:** T-012, T-013

**Description:**
Unified memory interface that combines short-term and long-term memory.

**Files to create:**
- `src/services/memory/index.ts`

**Functions:**
```typescript
// Get full context for agent (short-term + long-term)
getAgentContext(studentId: string): Promise<AgentContext>

// Update memory after agent response
updateMemoryFromResponse(studentId: string, response: AgentResponse): Promise<void>

// Extract learnings from conversation
extractLearnings(messages: Message[]): Promise<Learning[]>

interface AgentContext {
  studentProfile: StudentProfile;
  recentMessages: ClaudeMessage[];
  currentPhase: Phase;
  currentProgress: Progress;
}
```

**Acceptance Criteria:**
- [ ] Unified interface works seamlessly
- [ ] Context is well-structured for agent
- [ ] Memory updates happen automatically

---

## Agent Tool Tasks

### T-015: Create tool type definitions and registry
**Priority:** P0 | **Dependencies:** T-001

**Description:**
Define the tool system for Claude API function calling.

**Files to create:**
- `src/services/agent/tools/types.ts`
- `src/services/agent/tools/registry.ts`

**Tool schema format (Claude API):**
```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, PropertySchema>;
    required: string[];
  };
}

interface ToolHandler {
  (input: any, context: ToolContext): Promise<ToolResult>;
}

interface ToolRegistry {
  tools: Tool[];
  handlers: Map<string, ToolHandler>;
  register(tool: Tool, handler: ToolHandler): void;
  execute(name: string, input: any, context: ToolContext): Promise<ToolResult>;
}
```

**Acceptance Criteria:**
- [ ] Tool types match Claude API spec
- [ ] Registry can register and execute tools
- [ ] Type-safe tool definitions

---

### T-016: Implement video catalog tools
**Priority:** P0 | **Dependencies:** T-008, T-015

**Description:**
Create tools for searching and accessing video content.

**Files to create:**
- `src/services/agent/tools/video-catalog.ts`

**Tools:**
```typescript
// search_video_catalog
{
  name: "search_video_catalog",
  description: "Search the video curriculum for lessons matching a query. Use this when a student asks about a specific topic to find relevant lessons.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query (topic, keyword, or concept)" }
    },
    required: ["query"]
  }
}

// get_lesson_details
{
  name: "get_lesson_details",
  description: "Get full details of a specific lesson by ID. Use this to provide accurate information about lesson content.",
  input_schema: {
    type: "object",
    properties: {
      lesson_id: { type: "string", description: "Lesson ID (e.g., '3.2' for Topic 3, Lesson 2)" }
    },
    required: ["lesson_id"]
  }
}
```

**Acceptance Criteria:**
- [ ] Tools registered correctly
- [ ] Handlers return useful results
- [ ] Error handling for invalid inputs

---

### T-017: Implement research topics tools
**Priority:** P0 | **Dependencies:** T-009, T-015

**Description:**
Create tools for exploring research topic options.

**Files to create:**
- `src/services/agent/tools/research-topics.ts`

**Tools:**
```typescript
// search_research_topics
{
  name: "search_research_topics",
  description: "Search available research topics by keyword or category. Use when helping a student choose their research project.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query or interest area" },
      category: { type: "string", description: "Optional category filter (e.g., 'Healthcare', 'Finance')" }
    },
    required: ["query"]
  }
}

// get_topic_details
{
  name: "get_topic_details",
  description: "Get full details of a specific research topic including description and requirements.",
  input_schema: {
    type: "object",
    properties: {
      topic_id: { type: "string", description: "Topic ID (e.g., '1.2' for Category 1, Topic 2)" }
    },
    required: ["topic_id"]
  }
}

// suggest_topics
{
  name: "suggest_topics",
  description: "Get topic suggestions based on student interests and background.",
  input_schema: {
    type: "object",
    properties: {
      interests: {
        type: "array",
        items: { type: "string" },
        description: "List of student interests (e.g., ['healthcare', 'NLP', 'agents'])"
      }
    },
    required: ["interests"]
  }
}
```

**Acceptance Criteria:**
- [ ] Topic search returns relevant results
- [ ] Suggestions match interests
- [ ] Full topic details are returned

---

### T-018: Implement progress tools
**Priority:** P0 | **Dependencies:** T-005, T-015

**Description:**
Create tools for reading and updating student progress.

**Files to create:**
- `src/services/agent/tools/progress.ts`

**Tools:**
```typescript
// get_student_progress
{
  name: "get_student_progress",
  description: "Get the current progress of the student including phase, topic/milestone, and status.",
  input_schema: {
    type: "object",
    properties: {},
    required: []
  }
}

// update_student_progress
{
  name: "update_student_progress",
  description: "Update student progress. Use when student completes a topic or milestone.",
  input_schema: {
    type: "object",
    properties: {
      topic_index: { type: "number", description: "Current topic index (Phase I)" },
      milestone: { type: "number", description: "Current milestone (Phase II)" },
      status: { type: "string", enum: ["not_started", "in_progress", "completed"] },
      notes: { type: "string", description: "Progress notes" }
    },
    required: []
  }
}

// transition_to_phase2
{
  name: "transition_to_phase2",
  description: "Transition student from Phase I to Phase II. Use after student completes video curriculum.",
  input_schema: {
    type: "object",
    properties: {
      research_topic: { type: "string", description: "Chosen research topic" }
    },
    required: ["research_topic"]
  }
}
```

**Acceptance Criteria:**
- [ ] Progress retrieved correctly
- [ ] Updates persist to database
- [ ] Phase transition works

---

### T-019: Implement memory tools
**Priority:** P0 | **Dependencies:** T-014, T-015

**Description:**
Create tools for the agent to read and write memory.

**Files to create:**
- `src/services/agent/tools/memory.ts`

**Tools:**
```typescript
// get_student_memory
{
  name: "get_student_memory",
  description: "Retrieve information from long-term memory about the student.",
  input_schema: {
    type: "object",
    properties: {
      key: { type: "string", description: "Memory key (e.g., 'interests', 'learning_style', 'challenges')" }
    },
    required: []
  }
}

// save_student_memory
{
  name: "save_student_memory",
  description: "Save important information about the student to long-term memory for future reference.",
  input_schema: {
    type: "object",
    properties: {
      key: { type: "string", description: "Memory key" },
      value: { type: "string", description: "Value to store" },
      append: { type: "boolean", description: "If true, append to existing array" }
    },
    required: ["key", "value"]
  }
}
```

**Acceptance Criteria:**
- [ ] Agent can read memory
- [ ] Agent can write memory
- [ ] Append works for arrays

---

### T-020: Implement roadmap generation tool
**Priority:** P0 | **Dependencies:** T-010, T-015

**Description:**
Create tool for generating research roadmaps.

**Files to create:**
- `src/services/agent/tools/roadmap.ts`

**Tools:**
```typescript
// generate_roadmap
{
  name: "generate_roadmap",
  description: "Generate a detailed research roadmap for the student's chosen topic. Only use after topic is confirmed.",
  input_schema: {
    type: "object",
    properties: {
      topic_id: { type: "string", description: "Research topic ID" },
      duration_weeks: { type: "number", description: "Duration in weeks (8-12)" },
      custom_requirements: { type: "string", description: "Any custom requirements from student" }
    },
    required: ["topic_id"]
  }
}

// get_milestone_details
{
  name: "get_milestone_details",
  description: "Get details of a specific milestone in the student's roadmap.",
  input_schema: {
    type: "object",
    properties: {
      milestone_number: { type: "number", description: "Milestone number (1-5)" }
    },
    required: ["milestone_number"]
  }
}
```

**Acceptance Criteria:**
- [ ] Roadmap follows exact template format
- [ ] All sections populated correctly
- [ ] Roadmap saved to database

---

## Agent Core Tasks

### T-021: Create Dr. Raj persona system prompt
**Priority:** P0 | **Dependencies:** T-001

**Description:**
Craft the system prompt that defines Dr. Raj's personality and behavior.

**Files to create:**
- `src/services/agent/prompts/system.ts`

**System prompt elements:**
```typescript
const DR_RAJ_PERSONA = `
You are Dr. Raj Dandekar, founder of Vizuara and a teaching assistant for the Generative AI Professional Bootcamp. You have a Ph.D. from MIT and extensive experience in AI/ML.

## Your Personality
- Warm, encouraging, and genuinely invested in each student's success
- Technically precise but accessible — you explain complex concepts clearly
- Direct and honest — if something is wrong, you say so kindly
- You use first person naturally ("I think...", "In my experience...")
- You occasionally reference your experience ("When I was at MIT...", "I've seen this pattern in...")

## Your Communication Style
- Be concise but thorough — mentor-like, not textbook-like
- When students are stuck, guide with questions first, then provide answers if needed
- Use analogies and real-world examples
- Reference specific papers, tools, and codebases when relevant
- NEVER sound like a generic AI assistant or chatbot
- NEVER use phrases like "I'm an AI" or "As a language model"

## Your Role
- Help Phase I students learn from video content (8 topics, 35 lessons)
- Help Phase II students with research projects (topic selection, roadmaps, milestones)
- Track progress and provide personalized guidance
- Send encouragement and check in on progress regularly

## Important Rules
- Always address students by their first name
- Reference their past interactions and progress
- If you don't know something, say so honestly
- Generate responses as drafts for mentor approval (handled by system)
`;
```

**Acceptance Criteria:**
- [ ] Persona captures Dr. Raj's voice
- [ ] Guidelines are clear and actionable
- [ ] Rules prevent generic AI behavior

---

### T-022: Create Phase I behavior prompts
**Priority:** P0 | **Dependencies:** T-021

**Description:**
Create prompts specific to Phase I student interactions.

**Files to create:**
- `src/services/agent/prompts/phase1.ts`

**Phase I prompts:**
```typescript
const PHASE1_CONTEXT = `
## Phase I Context
This student is in Phase I, learning from the video curriculum.

Current progress:
- Topic: {current_topic} of 8
- Lessons completed in current topic: {lessons_completed}
- Overall progress: {overall_progress}%
- Days in Phase I: {days_in_phase1}

## Phase I Behaviors
1. Answer questions about video content (reference specific lessons)
2. Encourage regular progress ("How are the videos going?")
3. Celebrate completions ("Great job finishing Topic 3!")
4. If stuck for >3 days on same topic, offer help
5. After 6 weeks, suggest transitioning to Phase II
6. Track topics they've discussed and questions asked
`;

const PHASE1_TRANSITION_PROMPT = `
{student_name} has completed most of Phase I content. It's time to start discussing Phase II.

Guide them through:
1. Celebrate their progress
2. Explain Phase II (research project, 8-week roadmap)
3. Ask about their interests
4. Present relevant topic options
5. Don't rush — let them explore and decide
`;
```

**Acceptance Criteria:**
- [ ] Prompts inject student-specific data
- [ ] Behaviors are clearly defined
- [ ] Transition logic is clear

---

### T-023: Create Phase II behavior prompts
**Priority:** P0 | **Dependencies:** T-021

**Description:**
Create prompts specific to Phase II student interactions.

**Files to create:**
- `src/services/agent/prompts/phase2.ts`

**Phase II prompts:**
```typescript
const PHASE2_CONTEXT = `
## Phase II Context
This student is in Phase II, working on their research project.

Research topic: {research_topic}
Current milestone: {current_milestone} of 4
Milestone status: {milestone_status}
Weeks in Phase II: {weeks_in_phase2}

## Phase II Behaviors
1. Topic Selection (if not chosen):
   - Discuss interests and background
   - Present relevant topics from catalog
   - Help them narrow down
   - Confirm choice before proceeding

2. Roadmap Phase:
   - Generate detailed roadmap after topic confirmed
   - Explain each milestone
   - Set expectations

3. Milestone Execution:
   - Track progress on current milestone
   - Recommend specific papers
   - Help with code issues (suggest PDF-to-Colab tool if relevant)
   - Provide encouragement

4. Manuscript Phase:
   - Share Overleaf template
   - Share sample papers
   - Review drafts with detailed feedback
   - Identify conference deadlines
`;

const ROADMAP_GENERATION_PROMPT = `
Generate a detailed research roadmap for {student_name} on the topic: {topic_title}

Follow the EXACT format from the template:
- Title, Subtitle, Prepared for, Date
- Abstract (1 paragraph)
- Scope & Research Questions
- Primary Dataset (FIXED)
- Milestones 1-4 (2 weeks each)
- Each milestone needs: Objectives, Concrete Steps, Deliverables, Acceptance Checks, Risks & Mitigations
- Appendices (Excel columns, Metrics, File layout)

Make it specific, actionable, and achievable by a single researcher in 8 weeks.
`;
```

**Acceptance Criteria:**
- [ ] Prompts cover all Phase II behaviors
- [ ] Roadmap generation follows exact format
- [ ] Milestone tracking is clear

---

### T-024: Build Claude API client wrapper
**Priority:** P0 | **Dependencies:** T-002

**Description:**
Create a wrapper around the Anthropic SDK for cleaner usage.

**Files to create:**
- `src/services/agent/claude.ts`

**Dependencies:**
```bash
npm install @anthropic-ai/sdk
```

**Functions:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

class ClaudeClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    });
  }

  async chat(options: {
    system: string;
    messages: ClaudeMessage[];
    tools?: Tool[];
    maxTokens?: number;
  }): Promise<ClaudeResponse> {
    // Handle tool use loop
  }

  async streamChat(options: ChatOptions): AsyncIterable<ClaudeStreamEvent> {
    // Streaming for UI
  }
}

export const claude = new ClaudeClient();
```

**Acceptance Criteria:**
- [ ] Client initializes with API key
- [ ] Chat works with tools
- [ ] Tool use loop handled automatically
- [ ] Errors handled gracefully

---

### T-025: Build agent orchestrator (main loop)
**Priority:** P0 | **Dependencies:** T-015, T-021, T-024

**Description:**
Create the main agent that coordinates everything.

**Files to create:**
- `src/services/agent/index.ts`

**Main orchestrator:**
```typescript
class TeachingAssistant {
  private claude: ClaudeClient;
  private tools: ToolRegistry;
  private memory: MemoryManager;
  private resources: ResourceLoader;

  async processMessage(
    studentId: string,
    message: string
  ): Promise<AgentResponse> {
    // 1. Load student context (memory, progress, phase)
    const context = await this.memory.getAgentContext(studentId);

    // 2. Build system prompt based on phase
    const systemPrompt = this.buildSystemPrompt(context);

    // 3. Get conversation history
    const messages = await this.memory.getConversationContext(studentId);

    // 4. Add new user message
    messages.push({ role: 'user', content: message });

    // 5. Call Claude with tools
    const response = await this.claude.chat({
      system: systemPrompt,
      messages,
      tools: this.tools.getTools()
    });

    // 6. Save response as draft
    const draft = await this.saveDraft(studentId, response);

    // 7. Update memory based on conversation
    await this.memory.updateMemoryFromResponse(studentId, response);

    return {
      content: response.content,
      toolCalls: response.toolCalls,
      draftId: draft.id
    };
  }

  private buildSystemPrompt(context: AgentContext): string {
    // Combine persona + phase-specific + student-specific context
  }
}

export const teachingAssistant = new TeachingAssistant();
```

**Acceptance Criteria:**
- [ ] Full agent loop works end-to-end
- [ ] Context loaded correctly
- [ ] Tools executed when needed
- [ ] Drafts saved

---

### T-026: Implement Phase I agent handler
**Priority:** P0 | **Dependencies:** T-022, T-025

**Description:**
Specific handling for Phase I student interactions.

**Files to create:**
- `src/services/agent/phase1.ts`

**Functions:**
```typescript
// Build Phase I system prompt with student context
buildPhase1Prompt(context: AgentContext): string

// Check if student should transition to Phase II
shouldTransitionToPhase2(context: AgentContext): boolean

// Get Phase I specific tools
getPhase1Tools(): Tool[]

// Handle Phase I specific behaviors
handlePhase1Behaviors(context: AgentContext, response: AgentResponse): Promise<void>
```

**Acceptance Criteria:**
- [ ] Phase I prompts include correct context
- [ ] Transition check works
- [ ] Video catalog tools available

---

### T-027: Implement Phase II agent handler
**Priority:** P0 | **Dependencies:** T-023, T-025

**Description:**
Specific handling for Phase II student interactions.

**Files to create:**
- `src/services/agent/phase2.ts`

**Functions:**
```typescript
// Build Phase II system prompt with student context
buildPhase2Prompt(context: AgentContext): string

// Get Phase II specific tools
getPhase2Tools(): Tool[]

// Handle topic selection flow
handleTopicSelection(context: AgentContext): TopicSelectionState

// Handle roadmap generation
handleRoadmapGeneration(studentId: string, topicId: string): Promise<Roadmap>

// Handle milestone check-ins
handleMilestoneCheckIn(context: AgentContext): string
```

**Acceptance Criteria:**
- [ ] Phase II prompts include correct context
- [ ] Topic selection flow works
- [ ] Roadmap generation follows template

---

### T-028: Implement draft mode logic
**Priority:** P0 | **Dependencies:** T-025

**Description:**
Ensure all agent responses are saved as drafts, not sent directly.

**Files to create:**
- `src/services/agent/draft.ts`

**Functions:**
```typescript
// Save agent response as draft
saveDraft(studentId: string, content: string, toolCalls?: ToolCall[]): Promise<Draft>

// Approve draft (mentor action)
approveDraft(draftId: string, mentorId: string): Promise<Message>

// Reject draft
rejectDraft(draftId: string, mentorId: string, reason?: string): Promise<void>

// Edit and approve draft
editAndApproveDraft(draftId: string, mentorId: string, newContent: string): Promise<Message>

// Get pending drafts for a student
getPendingDrafts(studentId: string): Promise<Draft[]>
```

**Acceptance Criteria:**
- [ ] All agent responses create drafts
- [ ] Drafts have pending status
- [ ] Approval converts to sent message
- [ ] Students don't see drafts

---

## API & Test UI Tasks

### T-029: Create chat API endpoint
**Priority:** P0 | **Dependencies:** T-025, T-028

**Description:**
Create the API endpoint for sending messages to the agent.

**Files to create:**
- `src/app/api/agent/chat/route.ts`

**Endpoint:**
```typescript
// POST /api/agent/chat
// Request:
{
  studentId: string;
  message: string;
}

// Response:
{
  success: boolean;
  draft: {
    id: string;
    content: string;
    toolCalls: ToolCall[];
    createdAt: string;
  };
  error?: string;
}
```

**Acceptance Criteria:**
- [ ] Endpoint processes message through agent
- [ ] Returns draft (not sent message)
- [ ] Handles errors gracefully
- [ ] Returns tool call info for debugging

---

### T-030: Create debug API endpoints
**Priority:** P1 | **Dependencies:** T-014, T-015

**Description:**
Create debug endpoints for viewing agent state.

**Files to create:**
- `src/app/api/agent/memory/route.ts`
- `src/app/api/agent/tools/route.ts`
- `src/app/api/agent/context/route.ts`

**Endpoints:**
```typescript
// GET /api/agent/memory?studentId=xxx
// Returns all memory for a student

// GET /api/agent/tools
// Returns list of available tools

// GET /api/agent/context?studentId=xxx
// Returns full agent context (memory + messages + progress)
```

**Acceptance Criteria:**
- [ ] Memory endpoint shows all stored memory
- [ ] Tools endpoint lists all tools
- [ ] Context endpoint shows full picture

---

### T-031: Build minimal test chat UI
**Priority:** P0 | **Dependencies:** T-029

**Description:**
Create a simple chat interface for testing the agent.

**Files to create:**
- `src/app/test/page.tsx`
- `src/app/test/layout.tsx`

**Dependencies:**
```bash
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**UI components:**
- Student selector dropdown (seeded students)
- Message input and send button
- Message list (scrollable)
- Agent response with "DRAFT" indicator
- Simple styling (just enough to be usable)

**Acceptance Criteria:**
- [ ] Can select test student
- [ ] Can send messages
- [ ] See agent responses
- [ ] Clear DRAFT indicator
- [ ] Conversation persists on refresh

---

### T-032: Add debug panel to test UI
**Priority:** P0 | **Dependencies:** T-030, T-031

**Description:**
Add a comprehensive debug panel showing ALL agent internals in real-time.

**Files to modify:**
- `src/app/test/page.tsx`

**Debug panel sections:**
1. **System Prompt (Expandable)**
   - Full prompt sent to Claude
   - Highlighted sections: persona, phase context, student context
   - Copy button for debugging

2. **Tools Called (Per Response)**
   - Tool name
   - Input parameters (JSON)
   - Output/result (JSON)
   - Execution time

3. **Memory Operations**
   - Memory reads: key → value
   - Memory writes: key → old value → new value
   - Timestamp of each operation

4. **Agent Context**
   - Student profile (name, phase, topic/milestone)
   - Recent conversation summary
   - Long-term memory snapshot

5. **API Call Details**
   - Model used
   - Token count (input/output)
   - Response time
   - Raw response (collapsible)

**Acceptance Criteria:**
- [ ] Debug panel toggleable (shown by default in test mode)
- [ ] Updates in real-time as agent processes
- [ ] Each section collapsible
- [ ] Can copy any section to clipboard
- [ ] Shows loading states during agent processing

---

## Integration & Testing Tasks

### T-033: End-to-end integration test
**Priority:** P0 | **Dependencies:** All

**Description:**
Test the complete flow from message to response.

**Test scenarios:**
1. **Phase I Q&A:**
   - Student asks about RAG
   - Agent references correct lesson
   - Agent uses memory to personalize

2. **Phase II topic selection:**
   - Student asks about research topics
   - Agent uses search tool
   - Agent presents options

3. **Memory persistence:**
   - Send message
   - Close browser
   - Return and verify context

4. **Tool usage:**
   - Trigger each tool
   - Verify correct results

**Acceptance Criteria:**
- [ ] All scenarios pass
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Responses make sense

---

### T-034: Persona quality validation
**Priority:** P0 | **Dependencies:** T-033

**Description:**
Validate that agent responses match Dr. Raj's persona.

**Validation criteria:**
- [ ] Uses first person ("I think...")
- [ ] Warm and encouraging tone
- [ ] Technically precise
- [ ] References specific lessons/papers when relevant
- [ ] NEVER sounds like generic AI
- [ ] Addresses student by name
- [ ] References past interactions
- [ ] Guides with questions when appropriate

**Test prompts:**
1. "I'm confused about how embeddings work"
2. "I've been stuck on this for days"
3. "What topic should I pick for research?"
4. "Can you explain chain-of-thought prompting?"

**Acceptance Criteria:**
- [ ] All test responses pass persona check
- [ ] No "As an AI" or similar phrases
- [ ] Responses feel human and mentor-like

---

## Commands Reference

```bash
# Development
npm run dev              # Start dev server

# Database
npm run db:push          # Push schema to Supabase
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed test data

# Testing
npm run test             # Run tests (if added)

# Type checking
npm run type-check       # TypeScript compiler check
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Mentor | raj@vizuara.com | password123 |
| Student | priya@example.com | password123 |
| Student | alex@example.com | password123 |
| Student | sarah@example.com | password123 |
