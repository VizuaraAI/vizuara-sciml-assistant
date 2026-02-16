/**
 * Streaming Roadmap Generation API using Gemini 2.5 Pro
 * Uses Server-Sent Events to stream thinking tokens and progress
 * PDFs are generated using pdf-lib (serverless-compatible) and stored in Supabase Storage
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getResearchTopic } from '@/services/resources';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCxs_tn_dxb_sQRHNAa0rPXKdcm-RxYTe4';
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;

// Token limits - increased for comprehensive roadmap
const MAX_TOKENS_ROADMAP = 65536;

// Roadmap generation prompt
const ROADMAP_SYSTEM_PROMPT = `You are an expert research mentor who creates detailed, actionable research roadmaps. You have deep expertise in machine learning, NLP, and AI research methodology.`;

const ROADMAP_GENERATION_PROMPT = `You are generating a DETAILED research roadmap for a student. The output must be DENSE and SPECIFIC - every section should read as if written by a domain expert mentor.

## CRITICAL: The #1 problem to avoid is generating thin, generic content. This roadmap should be 15-17 pages when rendered as a PDF.

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
        "<Include 12-15 REAL, WELL-KNOWN papers. These MUST be actual papers that exist.>",
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
      "acceptance_check": "Literature review memo submitted with comparison table",
      "risks": [
        {"risk": "Spending too much time on tangential papers", "mitigation": "Set strict 2-hour limit per paper; use abstract/conclusion first to filter"},
        {"risk": "Missing key recent papers", "mitigation": "Check citations of 2023-2024 survey papers; use Semantic Scholar alerts"}
      ]
    },
    {
      "number": 2,
      "weeks": "3–4",
      "title": "Data/Environment Setup & Baselines",
      "objectives": [
        "Set up reproducible development environment with all dependencies",
        "Download and preprocess primary dataset with proper train/val/test splits",
        "Implement 2-3 baseline methods from literature"
      ],
      "tasks": [
        "1. Create conda/venv environment with requirements.txt",
        "2. Download primary dataset and validate checksums",
        "3. Write data_loader.py with proper preprocessing",
        "4. Implement Baseline 1: [Simple heuristic or classical method]",
        "5. Implement Baseline 2: [Standard neural approach]",
        "6. Log all baseline results to CSV"
      ],
      "deliverables": [
        "environment.yml or requirements.txt",
        "data/README.md with dataset documentation",
        "src/baselines/ with baseline implementations",
        "results/baselines.csv with initial metrics"
      ],
      "acceptance_check": "Both baselines run end-to-end with logged metrics matching paper benchmarks within 5%",
      "risks": [
        {"risk": "Dataset too large for local development", "mitigation": "Use 10% subset for dev; full data only for final runs"},
        {"risk": "Dependency conflicts", "mitigation": "Use Docker or strict version pinning"}
      ]
    },
    {
      "number": 3,
      "weeks": "5–6",
      "title": "Core Experiments & Ablations",
      "objectives": [
        "Implement proposed method with clean, documented code",
        "Run systematic ablation studies across key hyperparameters",
        "Document all experimental findings"
      ],
      "ablations": [
        {"id": "A1", "factor": "Model size", "levels": "7B, 13B, 30B (if applicable)"},
        {"id": "A2", "factor": "Prompting strategy", "levels": "zero-shot, 1-shot, 3-shot, 5-shot"},
        {"id": "A3", "factor": "Decoding method", "levels": "greedy, temperature=0.7, nucleus p=0.9"},
        {"id": "A4", "factor": "Context length", "levels": "512, 1024, 2048 tokens"},
        {"id": "A5", "factor": "Key component ablation", "levels": "with/without [specific component]"}
      ],
      "implementation_notes": [
        "Use random seeds {42, 123, 456} for all experiments",
        "Cache embeddings/intermediate results to speed up reruns",
        "Log all runs to wandb/tensorboard for visualization",
        "Save model checkpoints every N steps"
      ],
      "tasks": [
        "1. Implement core method in src/models/",
        "2. Write experiment runner with config files",
        "3. Run ablation grid (A1-A5)",
        "4. Analyze results and identify best configuration",
        "5. Document findings in experiments.md"
      ],
      "deliverables": [
        "src/models/main_model.py",
        "configs/ with experiment configurations",
        "results/ablations/ with all ablation results",
        "experiments.md with analysis"
      ],
      "acceptance_check": "All ablations complete with results logged; best config identified",
      "risks": [
        {"risk": "GPU OOM errors", "mitigation": "Use gradient checkpointing, reduce batch size, or use smaller model"},
        {"risk": "Experiments taking too long", "mitigation": "Run on subset first; parallelize across GPUs"}
      ]
    },
    {
      "number": 4,
      "weeks": "7–8",
      "title": "Evaluation & Analysis",
      "objectives": [
        "Run final experiments with best configuration",
        "Compute all metrics with confidence intervals",
        "Generate publication-quality figures and tables"
      ],
      "metrics": [
        {"name": "Accuracy", "definition": "Accuracy = (TP + TN) / (TP + TN + FP + FN)"},
        {"name": "Macro-F1", "definition": "F1_macro = (1/C) * Σ F1_c for each class c"},
        {"name": "Precision@K", "definition": "P@K = |relevant ∩ retrieved@K| / K"},
        {"name": "BLEU-4", "definition": "BLEU = BP × exp(Σ wn log pn) with brevity penalty"},
        {"name": "ROUGE-L", "definition": "ROUGE-L = F-measure based on LCS"}
      ],
      "visualizations": [
        "Figure 1: Main results bar chart with 95% CI error bars",
        "Figure 2: Ablation study heatmap",
        "Figure 3: Learning curves (loss/metric vs steps)",
        "Figure 4: Qualitative examples (success and failure cases)",
        "Figure 5: Confusion matrix or error analysis"
      ],
      "tasks": [
        "1. Run final experiments with 3 random seeds",
        "2. Compute bootstrap confidence intervals",
        "3. Generate all figures using matplotlib/seaborn",
        "4. Create LaTeX tables for results",
        "5. Conduct error analysis on failure cases"
      ],
      "deliverables": [
        "results/final_results.csv",
        "figures/*.pdf (publication-quality)",
        "tables/*.tex (LaTeX-ready)",
        "analysis/error_analysis.md"
      ],
      "acceptance_check": "All figures/tables ready for manuscript; statistical significance verified",
      "risks": [
        {"risk": "Results not statistically significant", "mitigation": "Report effect sizes; consider additional experiments"},
        {"risk": "Unexpected negative results", "mitigation": "Pivot to analysis paper; investigate why method fails"}
      ]
    },
    {
      "number": 5,
      "weeks": "9–10",
      "title": "Manuscript Writing & Submission",
      "objectives": [
        "Write complete manuscript following venue guidelines",
        "Prepare code release and documentation",
        "Submit to target venue"
      ],
      "sections": [
        "Abstract (150-250 words): Problem, method, key results, impact",
        "Introduction (1-1.5 pages): Motivation, problem statement, contributions",
        "Related Work (1 page): Position paper in literature landscape",
        "Methods (2-3 pages): Detailed approach with equations/algorithms",
        "Experiments (2-3 pages): Setup, results, ablations, analysis",
        "Conclusion (0.5 pages): Summary, limitations, future work"
      ],
      "tasks": [
        "1. Create Overleaf project with venue template",
        "2. Draft each section following guidelines",
        "3. Integrate figures and tables",
        "4. Write clear, reproducible experimental setup",
        "5. Prepare GitHub repo with clean code and README",
        "6. Internal review and revision",
        "7. Submit to target venue"
      ],
      "deliverables": [
        "manuscript/main.pdf (camera-ready)",
        "manuscript/supplementary.pdf (if needed)",
        "GitHub repository with MIT license",
        "README.md with reproduction instructions"
      ],
      "acceptance_check": "Manuscript submitted; code repo public with documentation",
      "risks": [
        {"risk": "Manuscript too long for page limit", "mitigation": "Move details to supplementary material"},
        {"risk": "Missing deadline", "mitigation": "Set internal deadline 3 days before actual deadline"}
      ]
    }
  ],

  "timeline_table": [
    {"milestone": "M1: Literature Review", "weeks": "1–2", "deliverables": "review_memo.pdf, papers.xlsx, comparison_table.xlsx"},
    {"milestone": "M2: Setup & Baselines", "weeks": "3–4", "deliverables": "environment.yml, baselines.csv, data_loader.py"},
    {"milestone": "M3: Experiments", "weeks": "5–6", "deliverables": "main_model.py, ablation_results.csv, experiments.md"},
    {"milestone": "M4: Evaluation", "weeks": "7–8", "deliverables": "final_results.csv, figures/*.pdf, tables/*.tex"},
    {"milestone": "M5: Manuscript", "weeks": "9–10", "deliverables": "main.pdf, GitHub repo, README.md"}
  ],

  "appendices": [
    {
      "label": "A",
      "title": "Literature Tracking Spreadsheet Columns",
      "content": ["Paper Title", "Authors", "Year", "Venue", "Problem/Task", "Dataset(s)", "Method Summary (5-7 sentences)", "Key Metrics", "Key Results", "Limitations", "Code Available?", "Relevance (1-5)", "Notes"]
    },
    {
      "label": "B",
      "title": "Metric Definitions",
      "content": [
        {"name": "Accuracy", "definition": "Acc = (1/N) × Σ 1{ŷᵢ = yᵢ}"},
        {"name": "Precision", "definition": "P = TP / (TP + FP)"},
        {"name": "Recall", "definition": "R = TP / (TP + FN)"},
        {"name": "F1-Score", "definition": "F1 = 2 × P × R / (P + R)"},
        {"name": "Macro-F1", "definition": "F1_macro = (1/C) × Σ F1_c"},
        {"name": "BLEU", "definition": "BLEU = BP × exp(Σ wₙ log pₙ)"},
        {"name": "ROUGE-L", "definition": "ROUGE-L = (1+β²) × P_lcs × R_lcs / (R_lcs + β² × P_lcs)"}
      ]
    },
    {
      "label": "C",
      "title": "Project Folder Layout",
      "content": "project-root/\\n├── data/\\n│   ├── raw/\\n│   ├── processed/\\n│   └── README.md\\n├── src/\\n│   ├── models/\\n│   ├── baselines/\\n│   ├── utils/\\n│   └── train.py\\n├── configs/\\n├── notebooks/\\n├── results/\\n│   ├── ablations/\\n│   └── final/\\n├── figures/\\n├── tables/\\n├── manuscript/\\n├── literature_review/\\n├── environment.yml\\n├── requirements.txt\\n└── README.md"
    }
  ]
}

Make the roadmap EXTREMELY DENSE with real papers, real datasets, and actionable guidance for the specific topic provided. Each milestone should have comprehensive details.`;

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

        const userPrompt = `Generate a comprehensive ${durationText}-Week research roadmap for:

Student Name: ${studentName || 'Student'}
Research Topic: ${topicTitle}
Topic Description: ${topicDescription}
Date: ${currentDate}

${customRequirements ? `Custom Requirements: ${customRequirements}` : ''}

IMPORTANT: This roadmap should be VERY DETAILED - when rendered as a PDF it should be 15-17 pages. Include:
- 12-15 REAL papers in the reading list with full citations
- Specific, actionable tasks for each milestone
- Detailed ablation studies with specific hyperparameters
- Comprehensive deliverables for each milestone
- Specific risk mitigations

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
        send('thinking', { text: 'Creating comprehensive PDF (15-17 pages)...' });

        const timestamp = Date.now();
        const safeTopicName = topicTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `roadmap_${safeTopicName}_${timestamp}.pdf`;

        const pdfBytes = await generatePDF(roadmapJson);

        send('status', { step: 3, message: 'PDF generated, uploading...', phase: 'pdf-upload' });

        // Try to upload to Supabase Storage
        let fullPdfUrl = '';
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('roadmaps')
            .upload(filename, pdfBytes, {
              contentType: 'application/pdf',
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('roadmaps')
              .getPublicUrl(filename);
            fullPdfUrl = publicUrlData.publicUrl;
          }
        } catch (storageError) {
          console.warn('Storage upload failed, using data URL fallback:', storageError);
        }

        // If storage failed, create a data URL for PDF
        if (!fullPdfUrl) {
          const base64Pdf = Buffer.from(pdfBytes).toString('base64');
          fullPdfUrl = `data:application/pdf;base64,${base64Pdf}`;
        }

        send('status', { step: 3, message: 'PDF generated successfully', phase: 'pdf-done' });

        // Step 4: Save to database
        send('status', { step: 4, message: 'Saving to database...', phase: 'save' });
        send('thinking', { text: 'Updating student record and saving roadmap...' });

        // Save roadmap to database
        const roadmapContent = {
          ...roadmapJson,
          pdf_url: fullPdfUrl,
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
          message: `I've created a comprehensive research roadmap for you.`,
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

// Sanitize text to replace Unicode characters with ASCII equivalents
// Standard PDF fonts (Helvetica, etc.) use WinAnsi encoding which doesn't support Unicode
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    // Checkmarks and ticks
    .replace(/✓/g, '[x]')
    .replace(/✔/g, '[x]')
    .replace(/☑/g, '[x]')
    .replace(/☐/g, '[ ]')
    // Bullets and dots
    .replace(/•/g, '-')
    .replace(/●/g, '-')
    .replace(/○/g, 'o')
    .replace(/◦/g, '-')
    .replace(/▪/g, '-')
    .replace(/▫/g, '-')
    .replace(/■/g, '#')
    .replace(/□/g, '[ ]')
    // Arrows
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/⇒/g, '=>')
    .replace(/⇐/g, '<=')
    .replace(/↑/g, '^')
    .replace(/↓/g, 'v')
    // Math symbols
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/±/g, '+/-')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/∞/g, 'inf')
    .replace(/Σ/g, 'SUM')
    .replace(/∑/g, 'SUM')
    .replace(/β/g, 'beta')
    .replace(/α/g, 'alpha')
    .replace(/γ/g, 'gamma')
    .replace(/δ/g, 'delta')
    .replace(/ε/g, 'epsilon')
    .replace(/λ/g, 'lambda')
    .replace(/μ/g, 'mu')
    .replace(/σ/g, 'sigma')
    .replace(/π/g, 'pi')
    .replace(/θ/g, 'theta')
    // Subscripts (common in formulas)
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/ᵢ/g, 'i')
    .replace(/ₙ/g, 'n')
    .replace(/ₘ/g, 'm')
    // Superscripts
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    // Quotation marks
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/«/g, '<<')
    .replace(/»/g, '>>')
    // Dashes
    .replace(/–/g, '-')
    .replace(/—/g, '--')
    .replace(/−/g, '-')
    // Other common symbols
    .replace(/…/g, '...')
    .replace(/™/g, '(TM)')
    .replace(/©/g, '(c)')
    .replace(/®/g, '(R)')
    .replace(/°/g, ' deg')
    .replace(/·/g, '.')
    .replace(/ŷ/g, 'y-hat')
    // Remove any remaining non-ASCII characters
    .replace(/[^\x00-\x7F]/g, '');
}

// PDF Generation using pdf-lib (serverless compatible)
async function generatePDF(roadmapJson: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const black = rgb(0, 0, 0);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const lightGray = rgb(0.5, 0.5, 0.5);
  const accentColor = rgb(0.4, 0.2, 0.6); // Purple accent

  // Helper function to add text with word wrapping (sanitizes text automatically)
  function drawText(text: string, x: number, fontSize: number, font: any, color: any, maxWidth: number): number {
    const sanitized = sanitizeText(text);
    const words = sanitized.split(' ');
    let line = '';
    let linesDrawn = 0;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && line) {
        if (y < margin + 50) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        currentPage.drawText(line, { x, y, size: fontSize, font, color });
        y -= fontSize + 4;
        line = word;
        linesDrawn++;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (y < margin + 50) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      currentPage.drawText(line, { x, y, size: fontSize, font, color });
      y -= fontSize + 4;
      linesDrawn++;
    }

    return linesDrawn;
  }

  function checkPageBreak(neededSpace: number) {
    if (y < margin + neededSpace) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  // Title Page
  y = pageHeight - 150;
  currentPage.drawText(sanitizeText(roadmapJson.title || 'Research Roadmap'), {
    x: margin,
    y,
    size: 28,
    font: helveticaBold,
    color: accentColor,
  });
  y -= 40;

  currentPage.drawText(sanitizeText(roadmapJson.subtitle || ''), {
    x: margin,
    y,
    size: 18,
    font: helvetica,
    color: darkGray,
  });
  y -= 60;

  currentPage.drawText(sanitizeText(`Prepared for: ${roadmapJson.researcher || 'Student'}`), {
    x: margin,
    y,
    size: 12,
    font: helvetica,
    color: darkGray,
  });
  y -= 20;

  currentPage.drawText(sanitizeText(`Mentor: ${roadmapJson.mentor || 'Dr. Raj Dandekar'}`), {
    x: margin,
    y,
    size: 12,
    font: helvetica,
    color: darkGray,
  });
  y -= 20;

  currentPage.drawText(sanitizeText(`Date: ${roadmapJson.date || new Date().toLocaleDateString()}`), {
    x: margin,
    y,
    size: 12,
    font: helvetica,
    color: darkGray,
  });
  y -= 60;

  // Abstract
  if (roadmapJson.abstract) {
    currentPage.drawText('Abstract', {
      x: margin,
      y,
      size: 14,
      font: helveticaBold,
      color: black,
    });
    y -= 20;
    drawText(roadmapJson.abstract, margin, 11, helvetica, darkGray, contentWidth);
    y -= 20;
  }

  // New page for Scope
  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  // Scope & Research Questions
  if (roadmapJson.scope) {
    currentPage.drawText('1. Scope & Research Questions', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: accentColor,
    });
    y -= 30;

    if (roadmapJson.scope.goal) {
      currentPage.drawText('Goal:', {
        x: margin,
        y,
        size: 12,
        font: helveticaBold,
        color: black,
      });
      y -= 18;
      drawText(roadmapJson.scope.goal, margin + 10, 11, helvetica, darkGray, contentWidth - 10);
      y -= 15;
    }

    if (roadmapJson.scope.questions?.length) {
      currentPage.drawText('Research Questions:', {
        x: margin,
        y,
        size: 12,
        font: helveticaBold,
        color: black,
      });
      y -= 18;

      for (const q of roadmapJson.scope.questions) {
        checkPageBreak(60);
        drawText(`• ${q}`, margin + 10, 11, helvetica, darkGray, contentWidth - 20);
        y -= 10;
      }
    }
    y -= 20;
  }

  // Dataset
  if (roadmapJson.dataset) {
    checkPageBreak(100);
    currentPage.drawText('2. Primary Dataset', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: accentColor,
    });
    y -= 25;

    currentPage.drawText(sanitizeText(roadmapJson.dataset.name || 'Dataset'), {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: black,
    });
    y -= 18;

    if (roadmapJson.dataset.description) {
      drawText(roadmapJson.dataset.description, margin + 10, 11, helvetica, darkGray, contentWidth - 10);
      y -= 15;
    }

    if (roadmapJson.dataset.optional?.length) {
      currentPage.drawText('Optional Validation Sets:', {
        x: margin,
        y,
        size: 11,
        font: helveticaBold,
        color: black,
      });
      y -= 16;

      for (const opt of roadmapJson.dataset.optional) {
        checkPageBreak(30);
        drawText(`• ${opt}`, margin + 10, 10, helvetica, lightGray, contentWidth - 20);
      }
    }
    y -= 20;
  }

  // Milestones - each on new page
  if (roadmapJson.milestones?.length) {
    for (const milestone of roadmapJson.milestones) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;

      // Milestone header
      currentPage.drawText(
        sanitizeText(`Milestone ${milestone.number}: ${milestone.title}`),
        { x: margin, y, size: 16, font: helveticaBold, color: accentColor }
      );
      y -= 20;

      currentPage.drawText(
        sanitizeText(`Weeks ${milestone.weeks}`),
        { x: margin, y, size: 11, font: helveticaOblique, color: lightGray }
      );
      y -= 25;

      // Objectives
      if (milestone.objectives?.length) {
        currentPage.drawText('Objectives:', {
          x: margin,
          y,
          size: 12,
          font: helveticaBold,
          color: black,
        });
        y -= 16;

        for (const obj of milestone.objectives) {
          checkPageBreak(40);
          drawText(`• ${obj}`, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
        }
        y -= 10;
      }

      // Reading List (for milestone 1)
      if (milestone.reading_list?.length) {
        checkPageBreak(50);
        currentPage.drawText('Core Reading List:', {
          x: margin,
          y,
          size: 12,
          font: helveticaBold,
          color: black,
        });
        y -= 16;

        for (const paper of milestone.reading_list) {
          checkPageBreak(35);
          drawText(`• ${paper}`, margin + 10, 9, helvetica, darkGray, contentWidth - 20);
        }
        y -= 10;
      }

      // Tasks
      if (milestone.tasks?.length) {
        checkPageBreak(50);
        currentPage.drawText('Tasks:', {
          x: margin,
          y,
          size: 12,
          font: helveticaBold,
          color: black,
        });
        y -= 16;

        for (const task of milestone.tasks) {
          checkPageBreak(35);
          drawText(task, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
        }
        y -= 10;
      }

      // Ablations (if present)
      if (milestone.ablations?.length) {
        checkPageBreak(50);
        currentPage.drawText('Ablation Studies:', {
          x: margin,
          y,
          size: 12,
          font: helveticaBold,
          color: black,
        });
        y -= 16;

        for (const abl of milestone.ablations) {
          checkPageBreak(35);
          drawText(`${abl.id}: ${abl.factor} — Levels: ${abl.levels}`, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
        }
        y -= 10;
      }

      // Deliverables
      if (milestone.deliverables?.length) {
        checkPageBreak(50);
        currentPage.drawText('Deliverables:', {
          x: margin,
          y,
          size: 12,
          font: helveticaBold,
          color: black,
        });
        y -= 16;

        for (const del of milestone.deliverables) {
          checkPageBreak(25);
          drawText(`✓ ${del}`, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
        }
        y -= 10;
      }

      // Acceptance Check
      if (milestone.acceptance_check) {
        checkPageBreak(40);
        currentPage.drawText('Acceptance Check:', {
          x: margin,
          y,
          size: 11,
          font: helveticaBold,
          color: black,
        });
        y -= 14;
        drawText(milestone.acceptance_check, margin + 10, 10, helveticaOblique, darkGray, contentWidth - 20);
        y -= 10;
      }

      // Risks & Mitigations
      if (milestone.risks?.length) {
        checkPageBreak(60);
        currentPage.drawText('Risks & Mitigations:', {
          x: margin,
          y,
          size: 11,
          font: helveticaBold,
          color: black,
        });
        y -= 16;

        for (const risk of milestone.risks) {
          checkPageBreak(40);
          drawText(`⚠ Risk: ${risk.risk}`, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
          drawText(`  ↳ Mitigation: ${risk.mitigation}`, margin + 15, 9, helveticaOblique, lightGray, contentWidth - 30);
          y -= 5;
        }
      }
    }
  }

  // Timeline Table
  if (roadmapJson.timeline_table?.length) {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    currentPage.drawText('Timeline Summary', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: accentColor,
    });
    y -= 30;

    for (const row of roadmapJson.timeline_table) {
      checkPageBreak(40);
      currentPage.drawText(sanitizeText(row.milestone), {
        x: margin,
        y,
        size: 11,
        font: helveticaBold,
        color: black,
      });
      y -= 14;
      currentPage.drawText(sanitizeText(`Weeks: ${row.weeks}`), {
        x: margin + 10,
        y,
        size: 10,
        font: helvetica,
        color: darkGray,
      });
      y -= 12;
      drawText(`Deliverables: ${row.deliverables}`, margin + 10, 9, helvetica, lightGray, contentWidth - 20);
      y -= 15;
    }
  }

  // Appendices
  if (roadmapJson.appendices?.length) {
    for (const appendix of roadmapJson.appendices) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;

      currentPage.drawText(sanitizeText(`Appendix ${appendix.label}: ${appendix.title}`), {
        x: margin,
        y,
        size: 14,
        font: helveticaBold,
        color: accentColor,
      });
      y -= 25;

      if (Array.isArray(appendix.content)) {
        for (const item of appendix.content) {
          checkPageBreak(30);
          if (typeof item === 'string') {
            drawText(`- ${item}`, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
          } else if (item.name && item.definition) {
            drawText(`${item.name}: ${item.definition}`, margin + 10, 10, helvetica, darkGray, contentWidth - 20);
          }
        }
      } else if (typeof appendix.content === 'string') {
        // Code/folder structure
        const lines = appendix.content.split('\\n');
        for (const line of lines) {
          checkPageBreak(15);
          currentPage.drawText(sanitizeText(line), {
            x: margin + 10,
            y,
            size: 9,
            font: helvetica,
            color: darkGray,
          });
          y -= 12;
        }
      }
    }
  }

  // Footer on last page
  y -= 40;
  if (y > margin) {
    currentPage.drawText('Generated by Vizuara SciML Mentor', {
      x: margin,
      y,
      size: 9,
      font: helveticaOblique,
      color: lightGray,
    });
  }

  return await pdfDoc.save();
}
