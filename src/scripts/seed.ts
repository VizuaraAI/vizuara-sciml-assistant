/**
 * Database seed script
 * Creates test data for development
 * Run with: npm run db:seed
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function clearDatabase() {
  console.log('Clearing existing data...');
  // Delete in reverse order of dependencies
  await db.delete(schema.roadmaps);
  await db.delete(schema.progress);
  await db.delete(schema.memory);
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.students);
  await db.delete(schema.users);
  console.log('Database cleared.');
}

async function seed() {
  console.log('Starting seed...\n');

  await clearDatabase();

  const passwordHash = await hashPassword('password123');

  // ============== CREATE MENTOR ==============
  console.log('Creating mentor...');
  const [mentor] = await db
    .insert(schema.users)
    .values({
      name: 'Dr. Raj Dandekar',
      email: 'raj@vizuara.com',
      passwordHash,
      role: 'mentor',
    })
    .returning();
  console.log(`  Created mentor: ${mentor.name} (${mentor.email})`);

  // ============== CREATE STUDENTS ==============
  console.log('\nCreating students...');

  // Student 1: Priya - Phase I, Topic 3
  const [priyaUser] = await db
    .insert(schema.users)
    .values({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      passwordHash,
      role: 'student',
    })
    .returning();

  const [priya] = await db
    .insert(schema.students)
    .values({
      userId: priyaUser.id,
      mentorId: mentor.id,
      currentPhase: 'phase1',
      currentTopicIndex: 3,
      enrollmentDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
      phase1Start: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    })
    .returning();
  console.log(`  Created student: ${priyaUser.name} (Phase I, Topic 3)`);

  // Student 2: Alex - Phase I, Topic 5
  const [alexUser] = await db
    .insert(schema.users)
    .values({
      name: 'Alex Chen',
      email: 'alex@example.com',
      passwordHash,
      role: 'student',
    })
    .returning();

  const [alex] = await db
    .insert(schema.students)
    .values({
      userId: alexUser.id,
      mentorId: mentor.id,
      currentPhase: 'phase1',
      currentTopicIndex: 5,
      enrollmentDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 5 weeks ago
      phase1Start: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    })
    .returning();
  console.log(`  Created student: ${alexUser.name} (Phase I, Topic 5)`);

  // Student 3: Sarah - Phase II, Milestone 2
  const [sarahUser] = await db
    .insert(schema.users)
    .values({
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      passwordHash,
      role: 'student',
    })
    .returning();

  const [sarah] = await db
    .insert(schema.students)
    .values({
      userId: sarahUser.id,
      mentorId: mentor.id,
      currentPhase: 'phase2',
      currentTopicIndex: 8, // Completed Phase I
      currentMilestone: 2,
      researchTopic: 'AI-Powered Clinical Documentation & EHR Summarization',
      enrollmentDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000), // 10 weeks ago
      phase1Start: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      phase2Start: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 4 weeks ago
    })
    .returning();
  console.log(`  Created student: ${sarahUser.name} (Phase II, Milestone 2)`);

  // ============== CREATE CONVERSATIONS ==============
  console.log('\nCreating conversations...');

  const [priyaConv] = await db
    .insert(schema.conversations)
    .values({ studentId: priya.id })
    .returning();

  const [alexConv] = await db
    .insert(schema.conversations)
    .values({ studentId: alex.id })
    .returning();

  const [sarahConv] = await db
    .insert(schema.conversations)
    .values({ studentId: sarah.id })
    .returning();

  console.log('  Created conversations for all students');

  // ============== CREATE MESSAGES ==============
  console.log('\nCreating sample messages...');

  // Priya's conversation (5 messages)
  await db.insert(schema.messages).values([
    {
      conversationId: priyaConv.id,
      role: 'student',
      content: "Hi Dr. Raj! I just started the Agents and LangChain section. The concept of chains is a bit confusing to me. Can you explain it simply?",
      status: 'sent',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: priyaConv.id,
      role: 'agent',
      content: "Hey Priya! Great question. Think of chains like a recipe - each step transforms the output of the previous step. In LangChain, you're chaining together LLM calls, prompts, and tools.\n\nFor example: User question → Prompt template → LLM → Output parser → Final answer.\n\nThe video in Lesson 3.3 has a great visual diagram. Have you gotten to that part yet? I'd recommend watching it with the code example open side-by-side.",
      status: 'sent',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    },
    {
      conversationId: priyaConv.id,
      role: 'student',
      content: "That makes sense! The recipe analogy helps. I'll check out Lesson 3.3. Also, I'm interested in healthcare applications - do you think agents would work well for clinical documentation?",
      status: 'sent',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: priyaConv.id,
      role: 'agent',
      content: "Absolutely, Priya! Healthcare is one of the most exciting areas for agents. Clinical documentation is a perfect use case - you could have an agent that:\n\n1. Listens to doctor-patient conversations\n2. Extracts key medical information\n3. Structures it into proper EHR format\n4. Flags any missing required fields\n\nWhen you get to Phase II, this could make an excellent research project. In fact, it's one of our predefined topics under Healthcare & Biomedical AI.\n\nFor now, focus on understanding the fundamentals. We'll dive deeper when you're ready for Phase II. How's your progress on the current videos?",
      status: 'sent',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    },
    {
      conversationId: priyaConv.id,
      role: 'student',
      content: "That sounds amazing! I'm about halfway through Topic 3 now. Should finish in a couple days.",
      status: 'sent',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ]);
  console.log("  Created 5 messages for Priya's conversation");

  // Alex's conversation (8 messages)
  await db.insert(schema.messages).values([
    {
      conversationId: alexConv.id,
      role: 'student',
      content: "Dr. Raj, I'm working through the RAG section and I'm confused about chunking strategies. When should I use fixed-size chunks vs semantic chunking?",
      status: 'sent',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'agent',
      content: "Great question, Alex! This is one of the trickier decisions in RAG systems.\n\n**Fixed-size chunking** is simpler and works well when:\n- Your documents have consistent structure\n- You need predictable chunk sizes for your embedding model\n- You're just starting out and need a baseline\n\n**Semantic chunking** is better when:\n- Documents have natural section breaks (headers, paragraphs)\n- Context coherence matters a lot\n- You're dealing with diverse document types\n\nFor legal documents (which I know you're interested in), I'd lean toward semantic chunking since legal clauses and sections are meaningful units.\n\nThe key insight: there's no universally \"best\" approach. I'd recommend starting with fixed-size (say, 500 tokens with 50 token overlap), then experimenting with semantic chunking and comparing retrieval quality.\n\nLesson 4.3 covers this in detail with code examples. Have you run those notebooks yet?",
      status: 'sent',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'student',
      content: "Thanks! Yes I ran the notebooks. Quick follow-up - how do I evaluate which chunking strategy is actually better for my use case?",
      status: 'sent',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'agent',
      content: "Excellent follow-up, Alex. This is exactly the right question to ask.\n\nFor RAG evaluation, you'll want to measure:\n\n1. **Retrieval metrics:**\n   - Recall@k: Did the relevant chunks make it into top-k results?\n   - MRR (Mean Reciprocal Rank): How high did the best chunk rank?\n\n2. **End-to-end metrics:**\n   - Answer accuracy (if you have ground truth)\n   - Faithfulness: Does the answer actually come from retrieved context?\n\nLesson 4.5 covers the RAGAS framework which is perfect for this. You create a small test set of questions with known answers, then measure how well different chunking strategies perform.\n\nFor your legal use case, I'd create 20-30 test questions across different contract types and see which chunking gives better retrieval.\n\nWant me to elaborate on any of these metrics?",
      status: 'sent',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'student',
      content: "This is super helpful! RAGAS looks perfect. One more thing - my Python background is pretty strong but I'm less familiar with the ML evaluation side. Any papers you'd recommend?",
      status: 'sent',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'agent',
      content: "Happy to help, Alex! Here are a few papers that'll level you up on RAG evaluation:\n\n1. **\"RAGAS: Automated Evaluation of Retrieval Augmented Generation\"** (2023) - The foundational paper for the framework we discussed\n\n2. **\"Benchmarking Large Language Models in Retrieval-Augmented Generation\"** (2023) - Great overview of different evaluation approaches\n\n3. **\"Lost in the Middle\"** (2023) - Critical paper on how LLMs use retrieved context - super relevant for legal docs where order matters\n\nAll of these are on arXiv. For your legal AI project in Phase II, you'll want to be familiar with these concepts.\n\nHow's your progress on the remaining RAG videos? You're getting close to finishing Phase I!",
      status: 'sent',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'student',
      content: "Just finished Lesson 5.2 today. Should wrap up RAG by end of week, then just Multimodal left!",
      status: 'sent',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: alexConv.id,
      role: 'agent',
      content: "Excellent progress, Alex! You're flying through the material. At this pace, you'll be ready for Phase II in about 2 weeks.\n\nStart thinking about your research topic. Given your interest in legal AI and strong Python skills, a few options come to mind:\n\n1. **Intelligent Contract Analysis** - Building a RAG system for legal contract review\n2. **Automated Compliance Auditor** - Using LLMs to check documents against regulations\n\nWe can discuss more when you finish the videos. Keep up the great work!",
      status: 'sent',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
    },
  ]);
  console.log("  Created 8 messages for Alex's conversation");

  // Sarah's conversation (10 messages) - Phase II focused
  await db.insert(schema.messages).values([
    {
      conversationId: sarahConv.id,
      role: 'student',
      content: "Hi Dr. Raj! I'm starting Milestone 2 of my research project on clinical documentation. I have my literature review done and dataset identified. What should I focus on for implementation?",
      status: 'sent',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'agent',
      content: "Great to hear from you, Sarah! Congrats on completing Milestone 1.\n\nFor Milestone 2 (Implementation Setup), based on your roadmap, here's what to focus on:\n\n1. **Dataset Processing Pipeline:**\n   - Load your MIMIC-III clinical notes subset\n   - Implement preprocessing (PHI removal, text cleaning)\n   - Create train/val/test splits\n\n2. **Baseline System:**\n   - Set up your RAG pipeline with basic chunking\n   - Implement the summarization prompt template\n   - Get end-to-end inference working\n\n3. **Evaluation Framework:**\n   - Implement ROUGE metrics for summary quality\n   - Set up your clinical accuracy scorer (from Milestone 1 lit review)\n\nBy end of Milestone 2, you should have a working baseline that produces summaries, even if they're not perfect yet. Milestone 3 is where you'll iterate and improve.\n\nWhat's your current status on each of these?",
      status: 'sent',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'student',
      content: "I have the MIMIC data loaded and preprocessing is mostly done. Struggling with the chunking strategy for clinical notes - they're very different from regular text.",
      status: 'sent',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'agent',
      content: "Ah yes, clinical notes are tricky! They have a unique structure that standard chunking misses.\n\nBased on my experience with medical NLP, I'd recommend:\n\n**Section-aware chunking:**\nClinical notes typically have sections like:\n- Chief Complaint\n- History of Present Illness\n- Physical Exam\n- Assessment & Plan\n\nUse regex or a simple classifier to detect section headers, then chunk within sections. This preserves clinical context better than arbitrary splits.\n\n**Implementation approach:**\n```python\nSECTION_HEADERS = [\n    r'CHIEF COMPLAINT:?',\n    r'HISTORY OF PRESENT ILLNESS:?',\n    r'HPI:?',\n    r'PHYSICAL EXAM:?',\n    # ... etc\n]\n```\n\nThere's also a paper \"ClinicalBERT\" that discusses clinical note structure - worth a quick skim.\n\nWant me to help debug your chunking code? Feel free to share it.",
      status: 'sent',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'student',
      content: "That section-aware approach makes so much sense! Let me implement that. Also, for the LLM - should I use Claude or try a medical-specific model?",
      status: 'sent',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'agent',
      content: "Good question, Sarah. Here's my recommendation:\n\n**For your baseline (Milestone 2):** Use Claude. It's:\n- Easier to set up and iterate quickly\n- Strong at following complex instructions\n- Good at structured output (which you need for EHR formatting)\n\n**For experiments (Milestone 3):** Consider comparing:\n- Claude (your baseline)\n- GPT-4 (for comparison)\n- Med-PaLM or BioMedLM (if you have access)\n\nThe comparison between general vs. medical-specific models could actually be an interesting ablation for your paper! Most clinical NLP papers assume medical models are better, but for summarization tasks with good prompting, general models sometimes win.\n\nFor now, get Claude working end-to-end. You can always add model comparisons in Milestone 3.\n\nHow's your medical background helping with the project? I remember you mentioned experience with EHR systems.",
      status: 'sent',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'student',
      content: "Yes! I worked as a medical scribe for 2 years before grad school, so I know exactly what a good clinical summary should look like. That's actually why I chose this project.",
      status: 'sent',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'agent',
      content: "That's a huge advantage, Sarah! Your scribe experience is invaluable for:\n\n1. **Evaluation:** You can assess summary quality in ways automated metrics miss\n2. **Error analysis:** You'll recognize clinically significant mistakes\n3. **Writing:** Your paper's related work and methodology will be more credible\n\nI'd suggest creating a small \"expert evaluation set\" - maybe 50 notes where YOU write the ideal summary. This becomes gold standard for evaluation and makes your paper stronger.\n\nThis domain expertise is exactly what makes for impactful research. Keep leveraging it!\n\nLet me know when you have the baseline working - we'll review together before you move to Milestone 3.",
      status: 'sent',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'student',
      content: "Love the expert evaluation set idea! I'll do that. Quick question - the PDF-to-Colab tool you mentioned, would that help me reproduce some of the baseline papers' experiments?",
      status: 'sent',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      conversationId: sarahConv.id,
      role: 'agent',
      content: "Yes! The PDF-to-Colab tool (https://paper-to-notebook-production.up.railway.app/) is perfect for that.\n\nUpload any ML paper PDF and it generates a Colab notebook with:\n- Paper summary and key contributions\n- Pseudocode from the methodology section\n- Starter implementation code\n- Dataset loading snippets\n\nSuper useful for quickly understanding and reproducing baselines. Try it with the \"Clinical Text Summarization\" papers from your lit review.\n\nOne tip: The generated code is a starting point, not production-ready. You'll need to adapt it for your specific MIMIC setup.\n\nHow's the section-aware chunking coming along?",
      status: 'sent',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    },
  ]);
  console.log("  Created 10 messages for Sarah's conversation");

  // ============== CREATE MEMORY ==============
  console.log('\nCreating memory entries...');

  // Priya's memory
  await db.insert(schema.memory).values([
    {
      studentId: priya.id,
      memoryType: 'long_term',
      key: 'profile.learning_style',
      value: 'code-examples',
    },
    {
      studentId: priya.id,
      memoryType: 'long_term',
      key: 'profile.interests',
      value: ['healthcare AI', 'clinical documentation', 'NLP'],
    },
    {
      studentId: priya.id,
      memoryType: 'long_term',
      key: 'history.topics_discussed',
      value: ['chains', 'LangChain', 'agents', 'healthcare applications'],
    },
  ]);
  console.log("  Created memory for Priya");

  // Alex's memory
  await db.insert(schema.memory).values([
    {
      studentId: alex.id,
      memoryType: 'long_term',
      key: 'profile.learning_style',
      value: 'conceptual-first',
    },
    {
      studentId: alex.id,
      memoryType: 'long_term',
      key: 'profile.interests',
      value: ['legal AI', 'contract analysis', 'RAG systems'],
    },
    {
      studentId: alex.id,
      memoryType: 'long_term',
      key: 'profile.strengths',
      value: ['Python', 'strong programming background'],
    },
    {
      studentId: alex.id,
      memoryType: 'long_term',
      key: 'history.topics_discussed',
      value: ['chunking strategies', 'RAG evaluation', 'RAGAS', 'legal applications'],
    },
    {
      studentId: alex.id,
      memoryType: 'long_term',
      key: 'history.papers_recommended',
      value: ['RAGAS paper', 'Lost in the Middle', 'RAG Benchmarking'],
    },
  ]);
  console.log("  Created memory for Alex");

  // Sarah's memory
  await db.insert(schema.memory).values([
    {
      studentId: sarah.id,
      memoryType: 'long_term',
      key: 'profile.background',
      value: 'Medical scribe for 2 years, grad school',
    },
    {
      studentId: sarah.id,
      memoryType: 'long_term',
      key: 'profile.interests',
      value: ['clinical NLP', 'EHR systems', 'medical AI'],
    },
    {
      studentId: sarah.id,
      memoryType: 'long_term',
      key: 'profile.strengths',
      value: ['domain expertise in clinical documentation', 'EHR experience'],
    },
    {
      studentId: sarah.id,
      memoryType: 'long_term',
      key: 'research.dataset',
      value: 'MIMIC-III clinical notes subset',
    },
    {
      studentId: sarah.id,
      memoryType: 'long_term',
      key: 'research.current_blockers',
      value: ['chunking strategy for clinical notes'],
    },
    {
      studentId: sarah.id,
      memoryType: 'long_term',
      key: 'history.topics_discussed',
      value: ['clinical chunking', 'section-aware chunking', 'model selection', 'expert evaluation'],
    },
  ]);
  console.log("  Created memory for Sarah");

  // ============== CREATE PROGRESS ==============
  console.log('\nCreating progress entries...');

  // Priya's progress (Phase I, completed topics 1-2, in progress on 3)
  await db.insert(schema.progress).values([
    { studentId: priya.id, phase: 'phase1', topicIndex: 1, status: 'completed' },
    { studentId: priya.id, phase: 'phase1', topicIndex: 2, status: 'completed' },
    { studentId: priya.id, phase: 'phase1', topicIndex: 3, status: 'in_progress' },
  ]);

  // Alex's progress (Phase I, completed topics 1-4, in progress on 5)
  await db.insert(schema.progress).values([
    { studentId: alex.id, phase: 'phase1', topicIndex: 1, status: 'completed' },
    { studentId: alex.id, phase: 'phase1', topicIndex: 2, status: 'completed' },
    { studentId: alex.id, phase: 'phase1', topicIndex: 3, status: 'completed' },
    { studentId: alex.id, phase: 'phase1', topicIndex: 4, status: 'completed' },
    { studentId: alex.id, phase: 'phase1', topicIndex: 5, status: 'in_progress' },
  ]);

  // Sarah's progress (Phase I complete, Phase II milestone 1 complete, milestone 2 in progress)
  await db.insert(schema.progress).values([
    { studentId: sarah.id, phase: 'phase1', topicIndex: 1, status: 'completed' },
    { studentId: sarah.id, phase: 'phase1', topicIndex: 2, status: 'completed' },
    { studentId: sarah.id, phase: 'phase1', topicIndex: 3, status: 'completed' },
    { studentId: sarah.id, phase: 'phase1', topicIndex: 4, status: 'completed' },
    { studentId: sarah.id, phase: 'phase1', topicIndex: 5, status: 'completed' },
    { studentId: sarah.id, phase: 'phase1', topicIndex: 6, status: 'completed' },
    { studentId: sarah.id, phase: 'phase2', milestone: 1, status: 'completed', notes: 'Literature review complete. 18 papers catalogued. Research questions defined.' },
    { studentId: sarah.id, phase: 'phase2', milestone: 2, status: 'in_progress', notes: 'Working on implementation setup. Chunking strategy being refined.' },
  ]);
  console.log("  Created progress for all students");

  // ============== CREATE ROADMAP FOR SARAH ==============
  console.log('\nCreating roadmap for Sarah...');

  await db.insert(schema.roadmaps).values({
    studentId: sarah.id,
    topic: 'AI-Powered Clinical Documentation & EHR Summarization',
    content: {
      title: '8-Week Research Roadmap',
      subtitle: 'AI-Powered Clinical Documentation & EHR Summarization',
      preparedFor: 'Sarah Johnson',
      date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      abstract: 'This roadmap outlines an 8-week research project to develop an LLM-based system for automatically generating clinical summaries from electronic health records. Using the MIMIC-III dataset, we will build a RAG pipeline with domain-specific chunking strategies, implement automated and expert evaluation metrics, and produce a workshop-quality manuscript.',
      milestones: [
        {
          number: 1,
          weeks: '1-2',
          title: 'Literature Review & Foundations',
          status: 'completed',
          objectives: [
            'Survey clinical NLP and text summarization literature',
            'Identify key evaluation metrics for clinical summaries',
            'Define research questions and scope',
          ],
          deliverables: [
            'Literature review memo (3-5 pages)',
            'Excel tracker with 15+ papers',
            'Research questions document',
          ],
        },
        {
          number: 2,
          weeks: '3-4',
          title: 'Dataset & Implementation Setup',
          status: 'in_progress',
          objectives: [
            'Set up MIMIC-III data access and preprocessing',
            'Implement section-aware chunking for clinical notes',
            'Build baseline RAG summarization pipeline',
          ],
          deliverables: [
            'Preprocessed dataset with train/val/test splits',
            'Working baseline system producing summaries',
            'Evaluation framework with ROUGE metrics',
          ],
        },
        {
          number: 3,
          weeks: '5-6',
          title: 'Core Experiments',
          status: 'not_started',
          objectives: [
            'Run ablation studies on chunking strategies',
            'Compare general vs. medical LLMs',
            'Conduct expert evaluation on subset',
          ],
          deliverables: [
            'Results CSV with all experiment runs',
            'Analysis notebooks with visualizations',
            'Expert evaluation annotations',
          ],
        },
        {
          number: 4,
          weeks: '7-8',
          title: 'Analysis & Writing',
          status: 'not_started',
          objectives: [
            'Complete quantitative and qualitative analysis',
            'Write manuscript draft',
            'Identify target venues',
          ],
          deliverables: [
            'Complete manuscript draft',
            'Figures and tables for paper',
            'List of target conferences/workshops',
          ],
        },
      ],
    },
  });
  console.log("  Created roadmap for Sarah");

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Mentor: raj@vizuara.com / password123');
  console.log('  Student: priya@example.com / password123');
  console.log('  Student: alex@example.com / password123');
  console.log('  Student: sarah@example.com / password123');

  // Close connection
  await client.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
