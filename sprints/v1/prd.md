# Sprint v1 — Agent Core (Agent-First Approach)

## Sprint Goal
Build the complete AI teaching assistant agent with Claude API integration, Dr. Raj persona, resource access, memory system, and tool usage. Include a minimal test UI to interact with the agent directly. Auth and full UI come in v2.

---

## What We're Building

The **brain** of the teaching assistant:

```
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT CORE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Persona    │    │   Memory     │    │  Resources   │       │
│  │  (Dr. Raj)   │    │  System      │    │   Access     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  Claude API     │                          │
│                    │  Orchestrator   │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              │              │              │                    │
│        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐             │
│        │  Phase I  │  │  Phase II │  │   Tools   │             │
│        │  Handler  │  │  Handler  │  │  (search, │             │
│        │           │  │           │  │  lookup)  │             │
│        └───────────┘  └───────────┘  └───────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Minimal Test UI │
                    │  (simple chat)   │
                    └──────────────────┘
```

---

## User Stories

### US-1: Project & Database Setup
**As a** developer
**I want** a minimal Next.js project with Supabase database
**So that** I can build and test the agent logic

**Acceptance Criteria:**
- [ ] Next.js 14 initialized with TypeScript
- [ ] Supabase connection configured
- [ ] Drizzle ORM set up with essential schema
- [ ] Environment variables typed and validated

---

### US-2: Dr. Raj Persona System
**As a** student interacting with the agent
**I want** responses that sound like Dr. Raj Dandekar
**So that** the experience feels like talking to a real mentor, not a chatbot

**Acceptance Criteria:**
- [ ] System prompt captures Dr. Raj's voice (warm, encouraging, technically precise)
- [ ] Agent uses first person naturally ("I think...", "In my experience at MIT...")
- [ ] Responses are concise but thorough — mentor-like, not textbook-like
- [ ] Agent guides with questions before giving answers when appropriate
- [ ] Agent references specific papers, tools, and real-world examples
- [ ] Agent NEVER sounds like a generic AI assistant

---

### US-3: Resource Access System
**As the** agent
**I want** access to all bootcamp resources
**So that** I can answer questions accurately and provide relevant materials

**Resources to access:**
- [ ] `resources/phase1-videos/video-catalog.md` — Video curriculum (8 topics, 35 lessons)
- [ ] `resources/phase2-topics/topics.md` — Research topic options (11 categories, 43+ subtopics)
- [ ] `resources/phase2-roadmaps/*.pdf` — Sample roadmap documents (extract structure/format)
- [ ] `resources/manuscript-templates/` — Overleaf template links
- [ ] `resources/sample-papers/` — Finalized paper examples
- [ ] `resources/tools/pdf-to-colab/` — Tool links

**Acceptance Criteria:**
- [ ] Resources indexed and loadable by the agent
- [ ] Agent can search video catalog by topic/lesson
- [ ] Agent can present research topics from topics.md
- [ ] Agent understands roadmap format from samples
- [ ] Resource content is chunked appropriately for context window

---

### US-4: Memory System
**As the** agent
**I want** to remember student context across conversations
**So that** I can provide personalized, continuous mentorship

**Memory Types:**
1. **Short-term memory:** Current conversation context (last N messages)
2. **Long-term memory:** Persistent student profile
   - Learning patterns and preferences
   - Strengths and areas for improvement
   - Questions asked and topics discussed
   - Current progress (phase, topic, milestone)
   - Research interests and chosen topic

**Acceptance Criteria:**
- [ ] Short-term memory loads recent conversation history
- [ ] Long-term memory persists across sessions
- [ ] Agent references past interactions naturally ("Last time you asked about RAG...")
- [ ] Memory is stored in database (not just in-context)
- [ ] Memory can be queried and updated by the agent

---

### US-5: Phase I Agent Behavior
**As a** Phase I student
**I want** the agent to help me learn from the video content
**So that** I can complete the curriculum and prepare for research

**Behaviors:**
- [ ] Answer technical questions about video topics (LLM Foundations, Prompt Engineering, etc.)
- [ ] Ask clarifying questions before answering complex queries
- [ ] Reference specific lessons when relevant ("This is covered in Lesson 3.2...")
- [ ] Track which topics the student has completed
- [ ] Send encouragement when student is stuck or slow
- [ ] Prompt for progress updates ("How are the videos going?")
- [ ] After ~6 weeks, suggest transitioning to Phase II

**Acceptance Criteria:**
- [ ] Agent correctly identifies Phase I students
- [ ] Answers are grounded in video curriculum content
- [ ] Agent proactively checks on progress
- [ ] Transition prompt triggers at appropriate time

---

### US-6: Phase II Agent Behavior
**As a** Phase II student
**I want** the agent to guide my research project
**So that** I can produce a publishable paper

**Behaviors:**
- [ ] Help select research topic (present options, discuss interests)
- [ ] Generate detailed research roadmap (following exact format from samples)
- [ ] Track milestone progress (4 milestones over 8 weeks)
- [ ] Recommend specific papers to read
- [ ] Help debug code issues
- [ ] Share PDF-to-Colab tool when relevant
- [ ] Share Overleaf template when ready for manuscript
- [ ] Review manuscript drafts with detailed feedback

**Acceptance Criteria:**
- [ ] Agent correctly identifies Phase II students
- [ ] Topic selection conversation feels natural
- [ ] Generated roadmaps follow the exact format from samples
- [ ] Milestone tracking is persistent
- [ ] Paper recommendations are specific and relevant

---

### US-7: Agent Tools
**As the** agent
**I want** tools to perform specific actions
**So that** I can provide accurate, actionable responses

**Tools to implement:**
1. **search_video_catalog** — Find lessons by topic/keyword
2. **get_lesson_details** — Get full details of a specific lesson
3. **search_research_topics** — Find research topics by category/keyword
4. **get_topic_details** — Get full description of a research topic
5. **get_student_progress** — Retrieve current phase, milestone, topic
6. **update_student_progress** — Update phase, milestone, or topic
7. **get_memory** — Retrieve long-term memory for personalization
8. **save_memory** — Store new information in long-term memory
9. **generate_roadmap** — Create a research roadmap document
10. **get_roadmap_template** — Load roadmap format from samples

**Acceptance Criteria:**
- [ ] Each tool has clear input/output schema
- [ ] Tools are registered with Claude API
- [ ] Agent decides when to use tools based on context
- [ ] Tool results are incorporated into responses

---

### US-8: Draft Mode (Critical)
**As a** mentor
**I want** to approve agent responses before they're sent
**So that** I maintain quality control over student communications

**Acceptance Criteria:**
- [ ] Agent generates responses as "drafts"
- [ ] Drafts are stored in database with pending status
- [ ] Drafts are NOT visible to students until approved
- [ ] System tracks draft → approved → sent status
- [ ] (Full UI for approval comes in v2, but logic is in place)

---

### US-9: Minimal Test Interface
**As a** developer
**I want** a simple chat UI to test the agent
**So that** I can verify the agent works before building the full UI

**Acceptance Criteria:**
- [ ] Simple chat page at `/test`
- [ ] Dropdown to select test student (from seed data)
- [ ] Message input and send button
- [ ] Display conversation history
- [ ] Show agent's tool usage (for debugging)
- [ ] Show memory state (for debugging)
- [ ] No authentication required (dev only)

---

## Technical Architecture

### Agent Service Structure
```
src/services/agent/
├── index.ts              # Main agent orchestrator
├── persona.ts            # Dr. Raj system prompt and personality
├── phase1.ts             # Phase I specific behaviors
├── phase2.ts             # Phase II specific behaviors
├── tools/
│   ├── index.ts          # Tool registry
│   ├── video-catalog.ts  # search_video_catalog, get_lesson_details
│   ├── research-topics.ts # search_research_topics, get_topic_details
│   ├── progress.ts       # get/update student progress
│   ├── memory.ts         # get/save memory
│   └── roadmap.ts        # generate_roadmap, get_roadmap_template
└── prompts/
    ├── system.ts         # Base system prompt
    ├── phase1.ts         # Phase I specific prompts
    └── phase2.ts         # Phase II specific prompts
```

### Memory Service Structure
```
src/services/memory/
├── index.ts              # Memory manager
├── short-term.ts         # Conversation context (last N messages)
└── long-term.ts          # Persistent student profile
```

### Resource Service Structure
```
src/services/resources/
├── index.ts              # Resource loader
├── video-catalog.ts      # Parse and search video-catalog.md
├── research-topics.ts    # Parse and search topics.md
├── roadmap-samples.ts    # Extract format from sample PDFs
└── types.ts              # Resource type definitions
```

### Database Schema (Essential for v1)
```
users:          id, name, email, role, created_at
students:       id, user_id, mentor_id, enrollment_date, current_phase,
                phase1_start, phase2_start, current_topic, current_milestone
conversations:  id, student_id, created_at, updated_at
messages:       id, conversation_id, role (student|agent|mentor|system),
                content, tool_calls (JSONB), status (draft|approved|sent), created_at
memory:         id, student_id, memory_type (short_term|long_term),
                key, value (JSONB), created_at, updated_at
progress:       id, student_id, phase, topic_index, milestone,
                status, notes, updated_at
roadmaps:       id, student_id, topic, content (JSONB),
                created_at, updated_at
```

### API Routes (Minimal for Testing)
```
POST /api/agent/chat      # Send message, get agent response
GET  /api/agent/memory    # View memory state (debug)
GET  /api/agent/tools     # View available tools (debug)
POST /api/seed            # Seed test data
```

---

## Environment Variables
```
# Supabase
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# NextAuth (minimal for v1)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

---

## Seed Data for Testing

**Mentor:**
- Dr. Raj Dandekar (raj@vizuara.com)

**Students:**
1. **Priya Sharma** (priya@example.com)
   - Phase I, currently on Topic 3 (Agents and LangChain)
   - Asked 5 questions so far
   - Memory: "Learns best with code examples", "Interested in healthcare AI"

2. **Alex Chen** (alex@example.com)
   - Phase I, currently on Topic 5 (RAG)
   - Asked 8 questions so far
   - Memory: "Strong Python background", "Wants to build a legal AI tool"

3. **Sarah Johnson** (sarah@example.com)
   - Phase II, Milestone 2 of "AI-Powered Clinical Documentation"
   - Has generated roadmap
   - Memory: "Medical background", "Working with EHR data", "Needs help with chunking strategies"

---

## Out of Scope (v1)

- Full authentication system (just seed data for testing)
- Mentor dashboard UI
- Student dashboard UI
- Draft approval UI (logic exists, but no UI)
- File upload
- Voice note delivery
- Real-time messaging
- Production deployment

---

## Success Metrics

1. **Persona Test:** Ask the agent a question — response sounds like Dr. Raj, not ChatGPT
2. **Resource Test:** Ask about a specific video topic — agent references correct lesson
3. **Memory Test:** Have a conversation, close browser, return — agent remembers context
4. **Phase I Test:** Agent correctly handles video curriculum questions
5. **Phase II Test:** Agent can discuss research topics and generate a roadmap
6. **Tool Test:** Agent uses tools appropriately (visible in debug UI)
7. **Draft Test:** Messages are stored as drafts, not sent directly

---

## Sprint v2 Preview

After v1 is complete, v2 will add:
- Full authentication (email/password)
- Mentor dashboard with student list
- Student chat interface
- Draft approval workflow (approve/reject/edit)
- File upload
- Voice note playback
- Polished UI with shadcn/ui
