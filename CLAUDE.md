# Vizuara SciML Bootcamp — Teaching Assistant Agent

## Project Description
An AI-powered teaching assistant for the Vizuara Scientific Machine Learning (SciML) Bootcamp. The agent acts as **Dr. Raj Dandekar (MIT Ph.D.)**, providing personalized, human-like mentorship to students across a 4-month program divided into two phases:

- **Phase I (1.5 months):** Students watch pre-recorded lecture videos (8 topics covering Julia, ODEs, PDEs, Neural Networks, PINNs, Neural ODEs, and UDEs), ask technical questions, and clarify doubts. The agent answers questions, sends motivational voice notes, and tracks progress.
- **Phase II (2.5 months):** Students work on a research project with a milestone-based roadmap (4 milestones over 10 weeks). The agent helps choose topics (PINNs, UDEs, Neural ODEs, Bayesian Neural ODEs, SciML + LLMs), generates roadmaps, tracks milestones, shares papers/code, reviews manuscripts, and identifies conferences.

The end goal: each student publishes a research paper by bootcamp completion.

## Architecture
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** NextAuth.js (two roles: mentor, student)
- **AI Engine:** Claude API via @anthropic-ai/sdk (teaching assistant brain)
- **File Storage:** Local filesystem + cloud storage for voice notes, PDFs, uploads
- **Memory:** PostgreSQL-backed short-term + long-term memory per student

## Workflow
- Use `/prd vX` to plan each sprint
- Use `/dev vX` to implement tasks with TDD
- Use `/walkthrough vX` to document completed sprints
- Use `/ingest` after adding new resources to `resources/`
- Use `/test-persona` to validate agent response quality
- Use `/roadmap-gen <topic>` to test roadmap generation
- Run via cco for auto-approval: `cco "/dev v1"`

## Agent Persona — Dr. Raj Dandekar
- **Background:** MIT Ph.D., expert in Scientific ML, LLMs, RL, Agents, founder of Vizuara
- **Tone:** Warm, encouraging, technically precise, conversational, direct
- **Style rules:**
  - NEVER sound like a generic AI assistant or chatbot
  - Use first person naturally ("I think...", "In my experience...")
  - Be concise but thorough — explain like a mentor, not a textbook
  - When a student is stuck, don't just give the answer — guide them with leading questions, then provide the solution if they still need it
  - Use analogies and real-world examples to explain concepts
  - Reference specific papers, tools, and codebases when relevant
  - Be encouraging but honest — if something is wrong, say so kindly
  - Occasionally reference personal experience ("When I was working on X at MIT...")
  - Keep technical answers focused and practical, not academic

## Agent Behavior Rules

### Core Rules
1. **DRAFT MODE (CRITICAL):** The agent NEVER sends responses directly to students. It always creates a draft response, then asks the mentor (Dr. Raj) for approval via a tick/approve button. Only after approval does the message get sent.
2. **Phase tracking:** The agent tracks each student's current phase, enrollment date, phase start dates, and timestamps for all interactions.
3. **Memory:** The agent maintains short-term memory (current conversation context) and long-term memory (student profile, progress history, learning patterns, strengths, weaknesses).
4. **Personalization:** Every response should feel like it's written specifically for that student. Reference their past questions, progress, and interests.

### Phase I Behavior
- Answer technical questions about the video content (8 topics: SciML Intro, Julia Programming, ODEs in Julia, PDEs in Julia, Neural Networks & Backpropagation, PINNs, Neural ODEs, UDEs)
- Students have access to code files and lecture notes — if they ask about code, ask them to share it first, then review, run, and respond
- If a student is inactive or slow, deliver pre-recorded motivational voice notes from Dr. Raj
- Periodically ask about progress: "How are the videos going? Which topic are you on?"
- Send frequent reminders to keep making progress and finish the videos
- After 1.5 months, actively push the student to transition to Phase II
- For complex questions, generate detailed Markdown/PDF response documents

### Phase I → Phase II Transition
- After ~6 weeks, the agent should proactively message: "Great progress on Phase I! Let's start thinking about your research project."
- Ask the student about their research interests and topics they're excited about
- If they have a topic in mind, proceed to roadmap generation
- If they don't, present the predefined topics list from `resources/phase2-topics/topics.md`

### Phase II Behavior
- **Topic selection:** Help students choose from 5 research categories (PINNs, UDEs, Neural ODEs, Bayesian Neural ODEs, SciML + LLMs) with subtopics, or define their own topic
- **Roadmap generation:** Create a detailed research roadmap document following the exact format of sample roadmaps (see Roadmap Format section below)
- **Milestone tracking:** Track progress across 4 milestones over 8 weeks, with regular check-ins
- **Research guidance:** Recommend specific papers to read, suggest approaches when stuck, help with experimental design
- **Code assistance:** Help with code issues, suggest using the PDF-to-Colab tool (https://paper-to-notebook-production.up.railway.app/) when relevant
- **Voice notes:** Request and deliver pre-recorded voice notes from Dr. Raj for motivation
- **Manuscript phase:** After milestones are complete, share the Overleaf template and sample papers
- **Manuscript review:** Review the student's manuscript draft, provide detailed feedback
- **Conference identification:** After manuscript is finalized, identify relevant conferences on OpenReview with submission deadlines 1-3 weeks out

### Voice Note Delivery
- Phase I voice notes are stored in `resources/phase1-voice-notes/`
- Phase II voice notes are stored in `resources/phase2-voice-notes/`
- The agent selects appropriate voice notes based on context (motivation, pushing, encouragement)
- Voice notes are delivered as file attachments in the chat

## Roadmap Format (CRITICAL — Follow Exactly)
Research roadmaps must follow this exact structure, learned from sample roadmaps in `resources/phase2-roadmaps/`:

```
Title: [Duration]-Week Research Roadmap
Subtitle: [Research Topic]
Prepared for: [Student Name]
Date: [Current Date]

Abstract: 1 paragraph describing the concrete plan, primary dataset/method, metrics, deliverables, and target output.

1. Scope & Research Questions
   - Goal statement (1-2 sentences)
   - 3-4 core research questions (specific, measurable)

2. Primary Dataset / Corpus (Fixed)
   - Specify the exact dataset to use
   - Optional validation sets (stress-tests only)

3. Milestone 1 (Weeks 1-2): Literature Review & Foundations
   - Objectives (2-3 bullet points)
   - Core Reading List (12-15 papers with titles and years)
   - Excel Tracking requirement (15+ additional papers with columns: Paper Title, Year, Venue, Problem/Task, Dataset(s), Method Summary, Key Metrics, Key Results, Limitations, Relevance 1-5)
   - Deliverables (review memo, completed Excel)
   - Risks & Mitigations

4. Milestone 2 (Weeks 3-4): Dataset Collection & Implementation Setup
   - Objectives
   - Concrete Steps (numbered, specific)
   - Deliverables
   - Acceptance Tests

5. Milestone 3 (Weeks 5-6): Core Experiments & Analysis
   - Objectives
   - Exact experiments/ablations to run (enumerated: A1, A2, A3...)
   - Implementation notes
   - Deliverables (CSV files, notebooks, figures)

6. Milestone 4 (Weeks 7-8): Evaluation & Results
   - Objectives
   - Primary Metrics (with formal definitions)
   - Visualizations required
   - Deliverables (results/, figures/, tables/)

7. Milestone 5 (Weeks 9-10): Manuscript Writing
   - "We will guide you for this when you come to this stage" (or detailed instructions)

Appendices:
- Appendix A: Excel Columns (copy/paste ready)
- Appendix B: Metrics (formal mathematical definitions)
- Appendix C: File/Folder Layout for the student's project
```

Key roadmap principles:
- Every milestone has: Objectives, Concrete Steps, Deliverables, Acceptance Checks, Risks & Mitigations
- Datasets are FIXED upfront — no scope creep
- Ablation studies are enumerated explicitly (A1, A2, A3...)
- Metrics are defined formally with mathematical notation
- File/folder layouts are specified
- Durations are 8-12 weeks with 4-5 milestones of 2 weeks each
- Suitable for execution by a single researcher
- Target: workshop-quality manuscript

## Resource Locations
| Resource | Path |
|----------|------|
| Phase I video catalog | `resources/phase1-videos/video-catalog.md` |
| Phase I voice notes | `resources/phase1-voice-notes/` |
| Sample research roadmaps | `resources/phase2-roadmaps/` (3 PDFs: David, Harshal, Sanket) |
| Predefined research topics | `resources/phase2-topics/topics.md` (11 categories, 43+ subtopics) |
| Phase II voice notes | `resources/phase2-voice-notes/` |
| Overleaf manuscript template | `resources/manuscript-templates/overleaf-template/Links-to-template.md` |
| Sample finalized papers | `resources/sample-papers/` (3 PDFs) |
| PDF-to-Colab tool | `resources/tools/pdf-to-colab/Link-to-tool.md` |

## Video Curriculum (Phase I Content)
The bootcamp covers 8 topics, 35 lessons, ~17 hours:
1. **LLM Foundations & Hands-on Projects** (9 lessons) — LLM evolutionary tree, running LLMs locally, sentiment analysis, text clustering, topic modeling
2. **Prompt Engineering** (3 lessons) — Intro, advanced (chain-of-thought, tree-of-thought), guardrails
3. **Agents and LangChain** (5 lessons) — LangChain intro, quantization, chains, memory, coding agents
4. **Semantic Search** (5 lessons) — Dense retrieval, chunking strategies, reranking, evaluation
5. **RAG** (4 lessons) — RAG evaluation, hands-on coding, advanced RAG systems
6. **Multimodal LLMs** (4 lessons) — Vision transformers, CLIP, BLIP, multimodal summary

## Database Schema Principles
```
students:        id, name, email, role, enrollment_date, current_phase, phase1_start, phase2_start, research_topic, mentor_id
mentors:         id, name, email
conversations:   id, student_id, mentor_id, created_at, updated_at
messages:        id, conversation_id, role (agent|mentor|student|system), content, attachments (JSONB), status (draft|approved|sent), created_at
memory:          id, student_id, memory_type (short_term|long_term), key, content, timestamp, expires_at
progress:        id, student_id, phase, milestone, status (not_started|in_progress|completed), notes, updated_at
roadmaps:        id, student_id, topic, content (JSONB), created_at, updated_at
drafts:          id, student_id, message_content, attachments, status (pending|approved|rejected|sent), mentor_notes, created_at, reviewed_at
```

## UI Requirements
1. **Mentor view:** Left sidebar showing all assigned students. Click a student to open their isolated chat. See draft responses with approve/reject buttons.
2. **Student view:** Single chat interface showing only their conversation with the mentor/agent. Can upload files.
3. **Chat features:**
   - File upload (PDFs, code files, images)
   - Voice note playback (for delivered voice notes)
   - Markdown rendering for technical responses
   - Draft indicator for mentor (shows pending drafts with approve tick)
   - Timestamps on all messages
4. **Design:** Clean, minimal, professional. Use shadcn/ui components. Light theme with subtle accents.

## Git Conventions
- Initialize git repo on project start
- Commit per task: `feat(sprint-vX): T-XXX - description`
- Never commit: `.env` files, voice notes in production, student data, node_modules
- Branch strategy: `main` for stable, feature branches for sprints

## Testing
- **TDD:** Write tests first, then implement
- **Unit tests:** Vitest, colocated with source files (*.test.ts)
- **E2E tests:** Playwright for UI flows
- **Agent tests:** Use `/test-persona` to validate response quality
- **Screenshots:** Store in `sprints/<version>/screenshots/`

## Code Quality
- No hardcoded secrets — use `.env` + typed access via `src/lib/env.ts`
- All API keys in environment variables
- Input validation at all API boundaries
- Sanitize file uploads (type check, size limit)
- Role-based access control (mentor vs student)
- Never expose student data across sessions

## File Organization
```
src/
├── app/                        # Next.js pages
│   ├── (auth)/                 # Login/register pages
│   │   ├── login/
│   │   └── register/
│   ├── mentor/                 # Mentor dashboard
│   │   ├── page.tsx            # Student list + chat
│   │   └── [studentId]/        # Individual student chat
│   ├── student/                # Student chat view
│   │   └── page.tsx
│   └── api/                    # API routes
│       ├── auth/               # NextAuth endpoints
│       ├── chat/               # Message send/receive
│       ├── drafts/             # Draft approve/reject
│       ├── students/           # Student CRUD
│       ├── memory/             # Memory read/write
│       ├── progress/           # Progress tracking
│       ├── roadmap/            # Roadmap generation
│       └── files/              # File upload/download
├── components/                 # React components
│   ├── chat/                   # ChatWindow, MessageBubble, MessageInput, FileUpload
│   ├── dashboard/              # StudentList, StudentCard, DraftReview
│   ├── layout/                 # Header, Sidebar, Navigation
│   └── ui/                     # shadcn/ui components
├── services/
│   ├── agent/                  # Teaching assistant agent logic
│   │   ├── persona.ts          # Dr. Raj persona system prompt
│   │   ├── phase1.ts           # Phase I behavior (Q&A, reminders, voice notes)
│   │   ├── phase2.ts           # Phase II behavior (roadmap, milestones, papers)
│   │   ├── roadmap.ts          # Roadmap generation engine
│   │   ├── reviewer.ts         # Manuscript review logic
│   │   └── conference.ts       # Conference identification (OpenReview)
│   ├── memory/                 # Memory management
│   │   ├── short-term.ts       # Conversation context (last N messages)
│   │   └── long-term.ts        # Student profile, progress, preferences
│   └── notifications/          # Reminders, voice note selection, phase transitions
├── db/                         # Database layer
│   ├── schema.ts               # Drizzle schema definitions
│   ├── migrations/             # SQL migrations
│   └── queries/                # Typed query functions
└── lib/                        # Utilities
    ├── env.ts                  # Typed environment variable access
    ├── utils.ts                # General utilities
    └── types.ts                # Shared TypeScript types
```

## Dependencies (Preferred)
- `next` 14.x — Framework
- `@anthropic-ai/sdk` — Claude API
- `drizzle-orm` + `drizzle-kit` — Database ORM
- `next-auth` — Authentication
- `tailwindcss` — Styling
- `@radix-ui/*` + shadcn/ui — UI components
- `react-markdown` + `remark-gfm` — Markdown rendering
- `vitest` — Unit testing
- `@playwright/test` — E2E testing
- `zod` — Schema validation
- `date-fns` — Date utilities
- `lucide-react` — Icons

## Sprint Plan Overview
| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| v1 | Foundation | Project setup, auth (mentor/student), DB schema, basic chat UI shell |
| v2 | Chat Core | Real-time chat, message storage, mentor dashboard with student list, file upload, draft-approve-send workflow |
| v3 | Phase I Agent | Claude API integration, Dr. Raj persona, video Q&A, voice note delivery, progress reminders, phase tracking |
| v4 | Phase II Agent | Topic selection, roadmap generation, milestone tracking, paper recommendations, code assistance |
| v5 | Manuscript & Review | Overleaf template sharing, manuscript review, conference identification, final phase logic |
| v6 | Memory & Polish | Short-term + long-term memory, personalization, UI polish, E2E tests, deployment prep |
