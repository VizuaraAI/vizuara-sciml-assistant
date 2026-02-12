/**
 * Streaming Roadmap Generation API using Gemini 2.5 Pro
 * Uses Server-Sent Events to stream thinking tokens and progress
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { getResearchTopic } from '@/services/resources';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCxs_tn_dxb_sQRHNAa0rPXKdcm-RxYTe4';
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;

// Token limits
const MAX_TOKENS_ROADMAP = 32768;

// Roadmap generation prompt (same as in roadmap.ts)
const ROADMAP_SYSTEM_PROMPT = `You are an expert research mentor who creates detailed, actionable research roadmaps. You have deep expertise in machine learning, NLP, and AI research methodology.`;

const ROADMAP_GENERATION_PROMPT = `You are generating a DETAILED research roadmap for a student. The output must be DENSE and SPECIFIC - every section should read as if written by a domain expert mentor.

## CRITICAL: The #1 problem to avoid is generating thin, generic content.

Return ONLY valid JSON (no markdown, no code blocks) matching this structure:

{
  "title": "Ten-Week Research Roadmap",
  "subtitle": "<Research Topic>",
  "researcher": "<Student Name>",
  "mentor": "Dr. Raj Dandekar",
  "date": "<Current Date>",
  "abstract": "<4-6 SENTENCES mentioning: (1) specific methodology, (2) primary dataset with version, (3) key metrics to measure, (4) expected deliverables, (5) target output (e.g., workshop paper)>",

  "scope": {
    "goal": "<2-3 SENTENCES (not one vague sentence). Must mention specific methodology, type of model/system, and evaluation approach>",
    "questions": [
      "RQ1: <2-3 SENTENCES with specifics. BAD: 'How can X be improved?' GOOD: 'When presented with [specific condition], how does [specific system] perform on [specific metric]? We measure this by...'>",
      "RQ2: <2-3 SENTENCES with testable hypothesis>",
      "RQ3: <2-3 SENTENCES with measurable outcome>"
    ]
  },

  "dataset": {
    "name": "<REAL dataset name with version and year, e.g., 'BBQ v1.0 (2022)' or 'MS MARCO v2.1 (2021)'>",
    "description": "<3-4 SENTENCES: what it contains, format, why suitable, known limitations>",
    "optional": [
      "<Dataset1 (Year): one-line description of what it stress-tests>",
      "<Dataset2 (Year): one-line description>",
      "<Dataset3 (Year): one-line description>"
    ]
  },

  "milestones": [
    {
      "number": 1,
      "weeks": "1–2",
      "title": "Literature Review & Foundations",
      "objectives": [
        "Read 12-15 core papers in-depth with detailed notes",
        "Maintain Excel tracking sheet with 5-7 sentence summaries of 15+ additional papers",
        "Identify 3-4 baseline approaches to compare against"
      ],
      "reading_list": [
        "Author1 et al. (Year). Full Paper Title. Conference/Journal.",
        "<Include 10-15 REAL, WELL-KNOWN papers. These MUST be actual papers that exist.>",
        "<Mix foundational papers with recent state-of-the-art>",
        "<Include the seminal papers in this field>"
      ],
      "tasks": [
        "1. Set up Zotero/Mendeley library with tags for each RQ",
        "2. Read 3 foundational papers (pre-2020) for theoretical grounding",
        "3. Read 5 recent papers (2022-2024) for state-of-the-art methods",
        "4. Create comparison table of methods vs datasets vs metrics",
        "5. Write 2-3 page literature review memo synthesizing key findings",
        "6. Identify gaps in existing literature for RQs"
      ],
      "deliverables": [
        "literature_review/review_memo.pdf (2-3 pages)",
        "literature_review/papers.xlsx with 15+ detailed summaries",
        "literature_review/comparison_table.xlsx"
      ],
      "risks": [
        {"risk": "Spending too much time on tangential papers", "mitigation": "Set strict 2-hour limit per paper; use abstract/conclusion first to filter"},
        {"risk": "Missing key recent papers", "mitigation": "Check citations of 2023-2024 survey papers; use Semantic Scholar alerts"}
      ]
    },
    {
      "number": 2,
      "weeks": "3–4",
      "title": "Data/Environment Setup & Baselines",
      "objectives": ["Set up reproducible development environment", "Download and preprocess primary dataset", "Implement 2 baseline methods"],
      "tasks": ["1. Create conda environment", "2. Download dataset", "3. Write data_loader.py", "4. Implement baselines"],
      "deliverables": ["environment.yml", "data/README.md", "src/baselines/"],
      "acceptance_check": "Both baselines run end-to-end with logged metrics",
      "risks": [{"risk": "Dataset too large", "mitigation": "Use subset for dev"}]
    },
    {
      "number": 3,
      "weeks": "5–6",
      "title": "Core Experiments & Ablations",
      "objectives": ["Implement proposed method", "Run systematic ablation studies"],
      "ablations": [
        {"id": "A1", "factor": "Model size", "levels": "7B, 13B, 30B"},
        {"id": "A2", "factor": "Prompting strategy", "levels": "zero-shot, 1-shot, 3-shot, 5-shot"},
        {"id": "A3", "factor": "Decoding method", "levels": "greedy, temperature sampling"},
        {"id": "A4", "factor": "Context length", "levels": "512, 1024, 2048 tokens"}
      ],
      "implementation_notes": ["Use random seeds {42, 123, 456}", "Cache embeddings", "Log to wandb"],
      "tasks": ["1. Implement core method", "2. Run ablation grid", "3. Log all results"],
      "deliverables": ["src/models/main_model.py", "results/ablations/"],
      "risks": [{"risk": "GPU OOM", "mitigation": "Use gradient checkpointing"}]
    },
    {
      "number": 4,
      "weeks": "7–8",
      "title": "Evaluation & Analysis",
      "objectives": ["Run final experiments", "Compute metrics with confidence intervals", "Generate figures"],
      "metrics": [
        {"name": "Accuracy", "definition": "Accuracy = (TP + TN) / (TP + TN + FP + FN)"},
        {"name": "Macro-F1", "definition": "F1_macro = (1/C) * sum F1_c"},
        {"name": "BLEU-4", "definition": "BLEU = BP * exp(sum w_n * log(p_n))"}
      ],
      "visualizations": ["Figure 1: Bar chart with CI", "Figure 2: Ablation heatmap", "Figure 3: Learning curves"],
      "tasks": ["1. Run final experiments", "2. Compute bootstrap CIs", "3. Generate figures"],
      "deliverables": ["results/final_results.csv", "figures/*.pdf", "tables/*.tex"],
      "risks": [{"risk": "Results not significant", "mitigation": "Report effect sizes"}]
    },
    {
      "number": 5,
      "weeks": "9–10",
      "title": "Manuscript Writing",
      "objectives": ["Write complete manuscript", "Prepare code release"],
      "sections": ["Abstract (150-250 words)", "Introduction", "Related Work", "Methods", "Experiments", "Conclusion"],
      "tasks": ["1. Create Overleaf project", "2. Draft each section", "3. Integrate figures", "4. Prepare GitHub repo"],
      "deliverables": ["manuscript/main.pdf", "GitHub repository", "README.md"],
      "risks": [{"risk": "Manuscript too long", "mitigation": "Move details to appendix"}]
    }
  ],

  "timeline_table": [
    {"milestone": "M1: Literature Review", "weeks": "1–2", "deliverables": "review_memo.pdf, papers.xlsx"},
    {"milestone": "M2: Setup & Baselines", "weeks": "3–4", "deliverables": "environment.yml, baseline_results.csv"},
    {"milestone": "M3: Experiments", "weeks": "5–6", "deliverables": "main_model.py, ablation_results.csv"},
    {"milestone": "M4: Evaluation", "weeks": "7–8", "deliverables": "final_results.csv, figures/*.pdf"},
    {"milestone": "M5: Manuscript", "weeks": "9–10", "deliverables": "main.pdf, GitHub repo"}
  ],

  "appendices": [
    {
      "label": "A",
      "title": "Literature Tracking Spreadsheet Columns",
      "content": ["Paper Title", "Authors", "Year", "Venue", "Problem/Task", "Dataset(s)", "Method Summary", "Key Results", "Limitations", "Relevance (1-5)"]
    },
    {
      "label": "B",
      "title": "Metric Definitions",
      "content": [
        {"name": "Accuracy", "definition": "Acc = (1/N) * sum 1{y_i = y_hat_i}"},
        {"name": "Precision", "definition": "P = TP / (TP + FP)"},
        {"name": "Recall", "definition": "R = TP / (TP + FN)"},
        {"name": "F1-Score", "definition": "F1 = 2 * P * R / (P + R)"}
      ]
    },
    {
      "label": "C",
      "title": "Project Folder Layout",
      "content": "project-root/\\n├── data/\\n├── src/\\n├── configs/\\n├── notebooks/\\n├── results/\\n├── figures/\\n├── tables/\\n├── manuscript/\\n├── literature_review/\\n├── environment.yml\\n└── README.md"
    }
  ]
}

Make the roadmap DENSE with real papers, real datasets, and actionable guidance for the specific topic provided.`;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { studentId, studentName, topic, durationWeeks = 10, customRequirements } = body;

        if (!studentId || !topic) {
          send('error', { message: 'Missing required fields: studentId, topic' });
          controller.close();
          return;
        }

        send('status', { step: 0, message: 'Starting roadmap generation...', phase: 'init' });

        // Get topic details
        let topicTitle = topic;
        let topicDescription = '';
        const predefinedTopic = getResearchTopic(topic);
        if (predefinedTopic) {
          topicTitle = predefinedTopic.title;
          topicDescription = predefinedTopic.description || '';
        } else {
          topicDescription = customRequirements || `Research project on ${topic}`;
        }

        // Step 1: Generate roadmap JSON with Gemini
        send('status', { step: 1, message: 'Analyzing topic and generating roadmap...', phase: 'generate' });
        send('thinking', { text: `Understanding the research topic: "${topicTitle}"...` });

        const durationText = durationWeeks === 8 ? 'Eight' : durationWeeks === 12 ? 'Twelve' : 'Ten';
        const currentDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const userPrompt = `Generate a ${durationText}-Week research roadmap for:

Student Name: ${studentName || 'Student'}
Research Topic: ${topicTitle}
Topic Description: ${topicDescription}
Date: ${currentDate}

${customRequirements ? `Custom Requirements: ${customRequirements}` : ''}

Follow the JSON structure EXACTLY. Include real papers, real datasets, and actionable guidance.`;

        const roadmapResult = await callGeminiStreaming(
          ROADMAP_SYSTEM_PROMPT,
          `${ROADMAP_GENERATION_PROMPT}\n\n${userPrompt}`,
          MAX_TOKENS_ROADMAP,
          (thought) => send('thinking', { text: thought })
        );

        send('status', { step: 1, message: 'Roadmap structure generated', phase: 'generate-done' });

        // Step 2: Parse the JSON
        send('status', { step: 2, message: 'Parsing roadmap structure...', phase: 'parse' });
        send('thinking', { text: 'Validating JSON structure...' });

        const roadmapJson = parseJSON(roadmapResult.text);
        const milestoneCount = roadmapJson.milestones?.length || 5;
        send('status', { step: 2, message: `Found ${milestoneCount} milestones`, phase: 'parse-done' });

        // Step 3: Generate PDF
        send('status', { step: 3, message: 'Generating PDF document...', phase: 'pdf' });
        send('thinking', { text: 'Creating professional PDF with ReportLab...' });

        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'roadmaps');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate PDF
        const timestamp = Date.now();
        const safeTopicName = topicTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `roadmap_${safeTopicName}_${timestamp}.pdf`;
        const pdfPath = path.join(uploadsDir, filename);

        await generatePDFWithPython(roadmapJson, pdfPath);

        if (!fs.existsSync(pdfPath)) {
          throw new Error('PDF generation failed - file not created');
        }

        send('status', { step: 3, message: 'PDF generated successfully', phase: 'pdf-done' });

        // Step 4: Save to database
        send('status', { step: 4, message: 'Saving to database...', phase: 'save' });
        send('thinking', { text: 'Updating student record and saving roadmap...' });

        const pdfUrl = `/uploads/roadmaps/${filename}`;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const fullPdfUrl = `${baseUrl}${pdfUrl}`;

        // Save roadmap to database
        const roadmapContent = {
          ...roadmapJson,
          pdf_url: pdfUrl,
          generated_at: new Date().toISOString(),
        };

        const { data: savedRoadmap, error: saveError } = await supabase
          .from('roadmaps')
          .insert({
            student_id: studentId,
            topic: topicTitle,
            content: roadmapContent,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Failed to save roadmap to database:', saveError);
        }

        // Update student's research topic
        const { error: updateError } = await supabase
          .from('students')
          .update({
            research_topic: topicTitle,
            roadmap_content: JSON.stringify(roadmapJson),
            roadmap_pdf_url: fullPdfUrl,
            current_milestone: 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', studentId);

        if (updateError) {
          console.error('Failed to update student:', updateError);
        }

        send('status', { step: 4, message: 'Saved successfully', phase: 'save-done' });

        // Complete
        send('complete', {
          success: true,
          title: topicTitle,
          filename,
          downloadUrl: fullPdfUrl,
          downloadLink: `[📄 Download: ${topicTitle} Roadmap](${fullPdfUrl})`,
          message: `I've created a research roadmap for you.`,
          milestoneCount,
          roadmapId: savedRoadmap?.id,
        });

      } catch (error) {
        console.error('Roadmap generation error:', error);
        send('error', {
          message: error instanceof Error ? error.message : 'Failed to generate roadmap'
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Streaming Gemini call
async function callGeminiStreaming(
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  onThinking: (text: string) => void
): Promise<{ text: string; thinking: string[] }> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}&alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const thinkingTokens: string[] = [];
  let fullText = '';

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.candidates?.[0]?.content?.parts) {
              for (const part of data.candidates[0].content.parts) {
                if (part.thought) {
                  thinkingTokens.push(part.text || '');
                  onThinking(part.text || '');
                } else if (part.text) {
                  fullText += part.text;
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  return { text: fullText, thinking: thinkingTokens };
}

function parseJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return JSON.parse(cleaned.trim());
}

async function generatePDFWithPython(roadmapJson: any, outputPath: string): Promise<void> {
  const projectRoot = process.cwd();
  const jsonPath = path.join(projectRoot, 'temp_roadmap_stream.json');
  const pythonScript = path.join(process.env.HOME || '', '.claude/skills/roadmap-gen/generate_roadmap.py');
  const venvPython = path.join(projectRoot, '.venv/bin/python');

  // Write JSON to temp file
  fs.writeFileSync(jsonPath, JSON.stringify(roadmapJson, null, 2));

  try {
    const pythonCmd = fs.existsSync(venvPython) ? `"${venvPython}"` : 'python3';
    await execAsync(`${pythonCmd} "${pythonScript}" "${jsonPath}" "${outputPath}"`);
  } finally {
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }
  }
}
