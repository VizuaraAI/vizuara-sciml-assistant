/**
 * Roadmap tools for the teaching assistant
 * Generates research roadmaps using the Python reportlab script
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { Tool, ToolHandler, ToolResult, ToolContext } from './types';
import type { ToolRegistry } from './registry';
import { getResearchTopic } from '@/services/resources';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ============== TOOL DEFINITIONS ==============

export const roadmapToolDefinitions = {
  generate_roadmap: {
    name: 'generate_roadmap',
    description:
      'Generate a detailed research roadmap PDF for the student\'s chosen topic. Creates a professional document with milestones, deliverables, and guidance. Use this when the student has confirmed their research topic and needs a structured plan.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string' as const,
          description: 'The research topic title (can be a topic ID like "1.1" or a custom topic name)',
        },
        duration_weeks: {
          type: 'number' as const,
          description: 'Duration in weeks (8, 10, or 12). Default is 10.',
        },
        custom_requirements: {
          type: 'string' as const,
          description: 'Any custom requirements or focus areas from the student',
        },
      },
      required: ['topic'],
    },
  } satisfies Tool,

  get_milestone_details: {
    name: 'get_milestone_details',
    description:
      "Get details of a specific milestone in the student's roadmap.",
    input_schema: {
      type: 'object' as const,
      properties: {
        milestone_number: {
          type: 'number' as const,
          description: 'Milestone number (1-5)',
        },
      },
      required: ['milestone_number'],
    },
  } satisfies Tool,

  get_roadmap_status: {
    name: 'get_roadmap_status',
    description: "Check if the student has a roadmap and get its status.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  } satisfies Tool,
};

// ============== ROADMAP JSON GENERATION PROMPT ==============
// Based on the detailed SKILL.md specification for dense, actionable roadmaps

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
      "objectives": [
        "Set up reproducible development environment",
        "Download and preprocess primary dataset",
        "Implement 2 baseline methods for comparison"
      ],
      "tasks": [
        "1. Create conda environment with pinned versions; export to environment.yml",
        "2. Download dataset; create data/raw/ and data/processed/ directories",
        "3. Write data_loader.py with train/val/test splits",
        "4. Create data card (README) documenting: source, license, preprocessing steps",
        "5. Implement Baseline 1: [specific simple baseline]",
        "6. Implement Baseline 2: [specific stronger baseline]",
        "7. Run baselines; log results to results/baselines/"
      ],
      "deliverables": [
        "environment.yml with all dependencies pinned",
        "data/README.md with data card",
        "src/data_loader.py with documented functions",
        "src/baselines/ with baseline implementations",
        "results/baselines/baseline_results.csv"
      ],
      "acceptance_check": "Both baselines run end-to-end on validation set with logged metrics",
      "risks": [
        {"risk": "Dataset too large for local machine", "mitigation": "Use subset (10%) for development; full dataset on cloud GPU"},
        {"risk": "Baseline implementation bugs", "mitigation": "Compare against reported numbers in original papers; must be within 2%"}
      ]
    },
    {
      "number": 3,
      "weeks": "5–6",
      "title": "Core Experiments & Ablations",
      "objectives": [
        "Implement proposed method",
        "Run systematic ablation studies",
        "Generate preliminary results"
      ],
      "ablations": [
        {"id": "A1", "factor": "Model size", "levels": "7B, 13B, 30B parameters"},
        {"id": "A2", "factor": "Prompting strategy", "levels": "zero-shot, 1-shot, 3-shot, 5-shot"},
        {"id": "A3", "factor": "Decoding method", "levels": "greedy, temperature={0.3, 0.7}, top-p={0.9, 0.95}"},
        {"id": "A4", "factor": "Context length", "levels": "512, 1024, 2048 tokens"},
        {"id": "A5", "factor": "Fine-tuning epochs", "levels": "1, 3, 5, 10 epochs"},
        {"id": "A6", "factor": "Learning rate", "levels": "1e-5, 5e-5, 1e-4"},
        {"id": "A7", "factor": "Batch size", "levels": "8, 16, 32"},
        {"id": "A8", "factor": "Data augmentation", "levels": "none, backtranslation, paraphrase"}
      ],
      "implementation_notes": [
        "Use random seeds {42, 123, 456} for all experiments; report mean ± std",
        "Cache embeddings to disk to avoid recomputation",
        "Log all hyperparameters to wandb/mlflow for reproducibility",
        "Save checkpoints every epoch; keep best 3 by validation metric"
      ],
      "tasks": [
        "1. Implement core method in src/models/",
        "2. Create experiment config files in configs/",
        "3. Run ablation grid (prioritize A1-A4 first)",
        "4. Log all results to results/ablations/",
        "5. Create preliminary analysis notebook"
      ],
      "deliverables": [
        "src/models/main_model.py",
        "configs/ablation_configs.yaml",
        "results/ablations/ablation_results.csv with columns: model, seed, factor, level, metric1, metric2, ...",
        "notebooks/preliminary_analysis.ipynb"
      ],
      "risks": [
        {"risk": "GPU OOM on larger models", "mitigation": "Use gradient checkpointing; reduce batch size; use 8-bit quantization"},
        {"risk": "Experiments take too long", "mitigation": "Prioritize high-impact ablations; use smaller dev set for initial runs"}
      ]
    },
    {
      "number": 4,
      "weeks": "7–8",
      "title": "Evaluation & Analysis",
      "objectives": [
        "Run final experiments with best configurations",
        "Compute all metrics with confidence intervals",
        "Generate publication-quality figures and tables"
      ],
      "metrics": [
        {"name": "Accuracy", "definition": "Accuracy = (TP + TN) / (TP + TN + FP + FN), where TP=true positives, etc."},
        {"name": "Macro-F1", "definition": "F1_macro = (1/C) * sum_{c=1}^{C} F1_c, where C is number of classes"},
        {"name": "BLEU-4", "definition": "BLEU = BP * exp(sum_{n=1}^{4} w_n * log(p_n)), BP = min(1, exp(1 - r/c))"},
        {"name": "ROUGE-L", "definition": "ROUGE-L = F_lcs = (1 + beta^2) * R_lcs * P_lcs / (R_lcs + beta^2 * P_lcs)"}
      ],
      "statistical_analysis": {
        "bootstrap_replicates": 5000,
        "confidence_level": 0.95,
        "significance_test": "McNemar's test for paired comparisons",
        "effect_size": "Cohen's d or h depending on metric type"
      },
      "visualizations": [
        "Figure 1: Bar chart comparing all methods on primary metric with 95% CI error bars",
        "Figure 2: Ablation heatmap showing interaction between top 2 factors",
        "Figure 3: Learning curves (train/val loss over epochs)",
        "Figure 4: Confusion matrix heatmap for classification tasks",
        "Figure 5: Example predictions (qualitative analysis)"
      ],
      "tasks": [
        "1. Run final experiments with 3 seeds each",
        "2. Compute bootstrap confidence intervals for all metrics",
        "3. Run statistical significance tests vs baselines",
        "4. Generate all figures in figures/ (PDF + PNG)",
        "5. Create summary tables in tables/ (LaTeX format)"
      ],
      "deliverables": [
        "results/final_results.csv with all metrics and CIs",
        "figures/*.pdf (5+ publication-quality figures)",
        "tables/*.tex (3+ formatted LaTeX tables)",
        "notebooks/final_analysis.ipynb"
      ],
      "risks": [
        {"risk": "Results not statistically significant", "mitigation": "Report effect sizes even if p>0.05; discuss practical significance"},
        {"risk": "Missing deadline for figure generation", "mitigation": "Create figure templates early; automate with matplotlib scripts"}
      ]
    },
    {
      "number": 5,
      "weeks": "9–10",
      "title": "Manuscript Writing",
      "objectives": [
        "Write complete workshop-quality manuscript",
        "Prepare supplementary materials and code release"
      ],
      "sections": [
        "Abstract (150-250 words)",
        "Introduction (1-1.5 pages): motivation, contributions, outline",
        "Related Work (1 page): position against prior work",
        "Methods (1.5-2 pages): detailed methodology with equations",
        "Experiments (2-3 pages): setup, results, ablations, analysis",
        "Conclusion (0.5 page): summary, limitations, future work"
      ],
      "tasks": [
        "1. Create Overleaf project with conference template",
        "2. Draft each section sequentially",
        "3. Integrate figures and tables",
        "4. Write appendix with additional results",
        "5. Prepare GitHub repo: clean code, README, requirements",
        "6. Internal review and revision"
      ],
      "deliverables": [
        "manuscript/main.pdf (6-8 pages + references)",
        "manuscript/supplementary.pdf",
        "GitHub repository with MIT license",
        "README.md with quickstart guide"
      ],
      "risks": [
        {"risk": "Manuscript too long for page limit", "mitigation": "Move details to appendix; use compact formatting"},
        {"risk": "Missing conference deadline", "mitigation": "Set internal deadline 3 days before; have backup venue"}
      ]
    }
  ],

  "timeline_table": [
    {"milestone": "M1: Literature Review", "weeks": "1–2", "deliverables": "review_memo.pdf, papers.xlsx (15+ entries)"},
    {"milestone": "M2: Setup & Baselines", "weeks": "3–4", "deliverables": "environment.yml, data_loader.py, baseline_results.csv"},
    {"milestone": "M3: Experiments", "weeks": "5–6", "deliverables": "main_model.py, ablation_results.csv"},
    {"milestone": "M4: Evaluation", "weeks": "7–8", "deliverables": "final_results.csv, figures/*.pdf, tables/*.tex"},
    {"milestone": "M5: Manuscript", "weeks": "9–10", "deliverables": "main.pdf, GitHub repo, supplementary.pdf"}
  ],

  "appendices": [
    {
      "label": "A",
      "title": "Literature Tracking Spreadsheet Columns",
      "content": ["Paper Title", "Authors", "Year", "Venue (Conference/Journal)", "Problem/Task Addressed", "Dataset(s) Used", "Method Summary (5-7 sentences)", "Key Results (numbers)", "Limitations/Critique", "Relevance to Our Work (1-5)"]
    },
    {
      "label": "B",
      "title": "Metric Definitions (Formal)",
      "content": [
        {"name": "Accuracy", "definition": "Acc = (1/N) * sum_{i=1}^{N} 1{y_i = y_hat_i}, where N is sample size, y_i is true label, y_hat_i is predicted label"},
        {"name": "Precision", "definition": "P = TP / (TP + FP), the fraction of positive predictions that are correct"},
        {"name": "Recall", "definition": "R = TP / (TP + FN), the fraction of actual positives correctly identified"},
        {"name": "F1-Score", "definition": "F1 = 2 * P * R / (P + R), harmonic mean of precision and recall"},
        {"name": "Macro-F1", "definition": "F1_macro = (1/C) * sum_{c=1}^{C} F1_c, average F1 across C classes"}
      ]
    },
    {
      "label": "C",
      "title": "Project Folder Layout",
      "content": "project-root/\\n├── data/\\n│   ├── raw/                    # Original downloaded data\\n│   ├── processed/              # Preprocessed data\\n│   └── README.md               # Data card\\n├── src/\\n│   ├── data_loader.py          # Data loading utilities\\n│   ├── models/                 # Model implementations\\n│   │   ├── baseline1.py\\n│   │   ├── baseline2.py\\n│   │   └── main_model.py\\n│   ├── training.py             # Training loop\\n│   └── evaluation.py           # Metrics computation\\n├── configs/\\n│   ├── base_config.yaml\\n│   └── ablation_configs.yaml\\n├── notebooks/\\n│   ├── exploratory_analysis.ipynb\\n│   ├── preliminary_analysis.ipynb\\n│   └── final_analysis.ipynb\\n├── results/\\n│   ├── baselines/\\n│   ├── ablations/\\n│   └── final/\\n├── figures/                    # PDF + PNG figures\\n├── tables/                     # LaTeX tables\\n├── manuscript/\\n│   ├── main.tex\\n│   └── supplementary.tex\\n├── literature_review/\\n│   ├── papers.xlsx\\n│   └── review_memo.pdf\\n├── environment.yml\\n├── requirements.txt\\n├── README.md\\n└── LICENSE"
    }
  ]
}

## CHECKLIST (verify before returning):
- Abstract is 4-6 sentences with dataset, methods, metrics, target
- Goal is 2-3 sentences (not one vague sentence)
- Each RQ is 2-3 sentences with specifics
- Dataset has version, year, 3-4 sentence description
- 2-4 optional datasets with one-line descriptions
- Milestone 1 has 10-15 REAL paper citations
- Milestone 2 has 4-6 concrete steps with file paths
- Milestone 3 has 8-10 ablation studies with exact levels
- Milestone 3 has implementation notes (seeds, caching, etc.)
- Milestone 4 has 3-5 metrics with formulas
- Milestone 4 has 4-5 visualization types
- All deliverables have specific file paths
- Every risk has a concrete mitigation
- Total content should fill 10-15 PDF pages`;

// ============== HELPER FUNCTIONS ==============

async function generateRoadmapJSON(
  studentName: string,
  topic: string,
  topicDescription: string,
  durationWeeks: number,
  customRequirements?: string
): Promise<any> {
  const durationText = durationWeeks === 8 ? 'Eight' : durationWeeks === 12 ? 'Twelve' : 'Ten';
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const userPrompt = `Generate a ${durationText}-Week research roadmap for:

Student Name: ${studentName}
Research Topic: ${topic}
Topic Description: ${topicDescription}
Date: ${currentDate}

${customRequirements ? `Custom Requirements: ${customRequirements}` : ''}

Follow the JSON structure EXACTLY. Include real papers, real datasets, and actionable guidance.`;

  console.log('[Roadmap Generation] User prompt:', userPrompt);

  console.log('[Roadmap Generation] Generating detailed roadmap - this may take 60-90 seconds...');

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',  // Most capable model for dense, detailed output
    max_completion_tokens: 16000,  // Allow for very detailed, 10-15 page PDF content
    temperature: 0.7,
    messages: [
      { role: 'system', content: ROADMAP_GENERATION_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0].message.content || '';

  // Clean up the response
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.slice(7);
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3);
  }

  return JSON.parse(cleanContent.trim());
}

async function generatePDFWithPython(roadmapJson: any, outputPath: string): Promise<void> {
  const projectRoot = process.cwd();
  const jsonPath = path.join(projectRoot, 'temp_roadmap_gen.json');
  const pythonScript = path.join(process.env.HOME || '', '.claude/skills/roadmap-gen/generate_roadmap.py');
  const venvPython = path.join(projectRoot, '.venv/bin/python');

  // Write JSON to temp file
  fs.writeFileSync(jsonPath, JSON.stringify(roadmapJson, null, 2));

  try {
    // Use the virtual environment Python if available, otherwise try system Python
    // Quote ALL paths to handle spaces in directory names
    const pythonCmd = fs.existsSync(venvPython) ? `"${venvPython}"` : 'python3';

    await execAsync(`${pythonCmd} "${pythonScript}" "${jsonPath}" "${outputPath}"`);
  } finally {
    // Clean up temp file
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }
  }
}

// ============== TOOL HANDLERS ==============

const generateRoadmapHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { topic, duration_weeks = 10, custom_requirements } = input;

  console.log('[Roadmap Tool] Input received:', JSON.stringify(input, null, 2));
  console.log('[Roadmap Tool] Topic:', topic);

  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: topic',
    };
  }

  try {
    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        users!students_user_id_fkey (name, email)
      `)
      .eq('id', context.studentId)
      .single();

    if (studentError || !student) {
      return {
        success: false,
        error: `Student not found: ${context.studentId}`,
      };
    }

    const studentName = student.users?.name || 'Student';

    // Get topic details
    let topicTitle = topic;
    let topicDescription = '';

    const predefinedTopic = getResearchTopic(topic);
    if (predefinedTopic) {
      topicTitle = predefinedTopic.title;
      topicDescription = predefinedTopic.description || '';
    } else {
      topicDescription = custom_requirements || `Research project on ${topic}`;
    }

    // Generate roadmap JSON using OpenAI
    const roadmapJson = await generateRoadmapJSON(
      studentName,
      topicTitle,
      topicDescription,
      duration_weeks,
      custom_requirements
    );

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

    // Verify PDF was created
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF generation failed - file not created');
    }

    const pdfUrl = `/uploads/roadmaps/${filename}`;

    // Save roadmap to database (content includes pdf_url)
    const roadmapContent = {
      ...roadmapJson,
      pdf_url: pdfUrl,
      generated_at: new Date().toISOString(),
    };

    const { data: savedRoadmap, error: saveError } = await supabase
      .from('roadmaps')
      .insert({
        student_id: context.studentId,
        topic: topicTitle,
        content: roadmapContent,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save roadmap to database:', saveError);
    }

    // Update student's research topic
    await supabase
      .from('students')
      .update({
        research_topic: topicTitle,
        current_milestone: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.studentId);

    // Get the base URL for absolute links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fullPdfUrl = `${baseUrl}${pdfUrl}`;

    return {
      success: true,
      data: {
        roadmapId: savedRoadmap?.id,
        topic: topicTitle,
        pdfUrl: fullPdfUrl,
        pdfFilename: filename,
        milestoneCount: roadmapJson.milestones?.length || 5,
        duration: `${duration_weeks} weeks`,
        downloadLink: `[Download Your Research Roadmap (PDF)](${fullPdfUrl})`,
        message: `Research roadmap generated successfully for "${topicTitle}". Download it here: ${fullPdfUrl}`,
        roadmapJson: roadmapJson,  // Include full JSON for context storage
      },
    };
  } catch (error) {
    console.error('Roadmap generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate roadmap',
    };
  }
};

const getMilestoneDetailsHandler: ToolHandler = async (
  input,
  context: ToolContext
): Promise<ToolResult> => {
  const { milestone_number } = input;

  if (milestone_number === undefined || typeof milestone_number !== 'number') {
    return {
      success: false,
      error: 'Missing required parameter: milestone_number',
    };
  }

  try {
    const { data: roadmap, error: roadmapError } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('student_id', context.studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (roadmapError || !roadmap) {
      return {
        success: false,
        error: 'No roadmap found. Generate a roadmap first using the generate_roadmap tool.',
      };
    }

    const content = roadmap.content as any;
    const milestone = content.milestones?.find((m: any) => m.number === milestone_number);

    if (!milestone) {
      return {
        success: false,
        error: `Milestone ${milestone_number} not found in the roadmap.`,
      };
    }

    const { data: student } = await supabase
      .from('students')
      .select('current_milestone')
      .eq('id', context.studentId)
      .single();

    return {
      success: true,
      data: {
        milestone,
        isCurrentMilestone: milestone_number === student?.current_milestone,
        roadmapTopic: roadmap.topic,
        pdfUrl: roadmap.pdf_path,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get milestone details',
    };
  }
};

const getRoadmapStatusHandler: ToolHandler = async (
  _input,
  context: ToolContext
): Promise<ToolResult> => {
  try {
    const { data: roadmap, error: roadmapError } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('student_id', context.studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (roadmapError || !roadmap) {
      return {
        success: true,
        data: {
          hasRoadmap: false,
          message: 'No roadmap found. Help the student choose a research topic and generate a roadmap.',
        },
      };
    }

    const content = roadmap.content as any;

    return {
      success: true,
      data: {
        hasRoadmap: true,
        topic: roadmap.topic,
        pdfUrl: roadmap.pdf_path,
        milestoneCount: content.milestones?.length || 0,
        createdAt: roadmap.created_at,
        message: `Roadmap exists for "${roadmap.topic}". PDF available for download.`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check roadmap status',
    };
  }
};

// ============== REGISTRATION ==============

export function registerRoadmapTools(registry: ToolRegistry): void {
  registry.register(roadmapToolDefinitions.generate_roadmap, generateRoadmapHandler);
  registry.register(roadmapToolDefinitions.get_milestone_details, getMilestoneDetailsHandler);
  registry.register(roadmapToolDefinitions.get_roadmap_status, getRoadmapStatusHandler);
}

export function getRoadmapTools(): Tool[] {
  return Object.values(roadmapToolDefinitions);
}

// Export handlers for direct use (e.g., from mentor API)
export const roadmapToolHandlers = {
  generate_roadmap: generateRoadmapHandler,
  get_milestone_details: getMilestoneDetailsHandler,
  get_roadmap_status: getRoadmapStatusHandler,
};
