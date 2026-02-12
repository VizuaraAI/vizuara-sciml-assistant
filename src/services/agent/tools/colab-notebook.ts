/**
 * Google Colab Notebook Tool
 * Creates educational notebooks using Gemini 2.5 Pro
 * Following the paper-to-notebook repository approach with multi-step pipeline
 */

import type { Tool, ToolHandler } from './types';
import type { ToolRegistry } from './registry';
import * as fs from 'fs';
import * as path from 'path';

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCxs_tn_dxb_sQRHNAa0rPXKdcm-RxYTe4';
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Token limits per pipeline step (from paper-to-notebook config.py)
const MAX_TOKENS_ANALYSIS = 8192;
const MAX_TOKENS_DESIGN = 8192;
const MAX_TOKENS_GENERATE = 65536;
const MAX_TOKENS_VALIDATE = 65536;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // milliseconds

// Tool definitions
export const colabToolDefinitions: Record<string, Tool> = {
  create_colab_notebook: {
    name: 'create_colab_notebook',
    description: 'Creates a detailed educational Google Colab notebook.',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The technical topic to create a notebook for',
        },
        question: {
          type: 'string',
          description: 'The specific question the student asked',
        },
        studentName: {
          type: 'string',
          description: 'Name of the student (for personalization)',
        },
      },
      required: ['topic', 'question'],
    },
  },
};

// ============================================================================
// PROMPTS (from paper-to-notebook/prompts.py, adapted for educational topics)
// ============================================================================

const SYSTEM_PROMPT = `You are an expert research engineer and educator who creates runnable, educational Python code. You use real ML components (PyTorch, Transformer layers, actual training loops) at a reduced scale that runs on CPU. You prioritize faithful implementation while making the code deeply educational with clear explanations, verbose logging, and insightful visualizations.`;

// Step 1: Topic Analysis
const ANALYSIS_PROMPT = `Analyze this educational topic and extract a structured analysis.

Return a JSON object with EXACTLY these fields:

{
  "title": "Clear title for the topic",
  "summary": "2-3 sentence plain English summary",
  "problem_statement": "What problem or concept does this address? (2-3 sentences)",
  "key_insight": "The core idea in one sentence",
  "concepts": [
    {
      "name": "Concept name",
      "description": "What this concept does in plain English",
      "prerequisites": ["list of things student should know"],
      "key_points": ["important points to cover"],
      "equations": ["key equations if any, in LaTeX or descriptive form"]
    }
  ],
  "learning_objectives": ["what the student will learn"],
  "practical_applications": ["real-world uses of this concept"],
  "common_misconceptions": ["things students often get wrong"],
  "suggested_exercises": ["hands-on activities to reinforce learning"]
}

IMPORTANT:
- Be detailed about concepts — every important idea matters
- Extract ALL relevant equations
- Note prerequisites clearly
- Return ONLY valid JSON, no markdown fencing
`;

// Step 2: Design Plan
const DESIGN_PROMPT_TEMPLATE = `You are designing an educational notebook for teaching a concept.

Here is the structured analysis:
{analysis_json}

Design a complete implementation plan. The philosophy is:
"Teach from first principles with real, runnable code examples."

We use REAL components:
- Real PyTorch layers when relevant (nn.Linear, nn.Embedding, etc.)
- Real training loops with backpropagation when demonstrating ML
- Real visualizations with matplotlib
- Real data processing with numpy

We scale DOWN for education:
- Small datasets that illustrate the concept
- Simple models that run quickly on CPU
- Code that completes in under 5 minutes

Return a JSON object with EXACTLY these fields:

{
  "notebook_title": "A clear, descriptive title for the notebook",
  "target_audience": "Who this notebook is for",
  "estimated_time": "How long to complete (e.g., '20-30 minutes')",
  "sections": [
    {
      "title": "Section title",
      "purpose": "What this section teaches",
      "type": "markdown|code|both",
      "key_points": ["main ideas to cover"]
    }
  ],
  "code_examples": [
    {
      "name": "Example name",
      "description": "What this code demonstrates",
      "complexity": "simple|medium|advanced",
      "outputs_to_show": ["what to print or visualize"]
    }
  ],
  "visualizations": [
    {
      "title": "Plot title",
      "type": "line|bar|scatter|heatmap|histogram",
      "purpose": "What insight this provides"
    }
  ],
  "exercises": [
    {
      "title": "Exercise title",
      "difficulty": "easy|medium|hard",
      "skills_tested": ["what this tests"]
    }
  ]
}

Return ONLY valid JSON, no markdown fencing.
`;

// Step 3: Generate Notebook Cells
const GENERATE_PROMPT_TEMPLATE = `You are creating a complete educational Jupyter notebook.

Topic analysis:
{analysis_json}

Implementation plan:
{design_json}

Generate the COMPLETE notebook as a JSON array of cell objects. Each cell is:
{{"cell_type": "markdown" | "code", "source": "cell content as a string"}}

REQUIRED SECTIONS (in this EXACT order):

1. **Title & Overview** (markdown)
   - Topic title with emoji
   - One-paragraph summary
   - Prerequisites list
   - Learning objectives (3-5 bullet points)

2. **Table of Contents** (markdown)
   - Numbered list of all sections

3. **Imports & Setup** (code)
   - import torch, numpy as np, matplotlib.pyplot as plt
   - Set seeds: torch.manual_seed(42), np.random.seed(42)
   - Print versions

4. **Concept Introduction - The "Why"** (markdown)
   - Plain English explanation of why this matters
   - Real-world analogies
   - How this connects to other concepts

5. **First Principles Build-Up - The "What"** (code + markdown, 3-6 sub-sections)
   - Each sub-section follows this pattern:
     1. Markdown cell: Explain the idea in plain English
     2. Code cell: A minimal, runnable example (5-20 lines)
     3. Markdown cell: Interpret the output
   - Break concept into digestible pieces
   - Progressive complexity

6. **Putting It All Together** (code + markdown)
   - Larger example combining all concepts
   - Well-commented code
   - Clear output showing everything working

7. **Visualizations** (code + markdown)
   - At least 2-3 matplotlib plots
   - Clear labels, titles, legends
   - Explain what each visualization shows

8. **Hands-On Exercises** (code + markdown)
   - 2-3 exercises with # TODO: your code here placeholders
   - Include hints in comments
   - Solutions in separate cells marked "## Solution"

9. **Common Pitfalls & Tips** (markdown)
   - Things students often get wrong
   - Best practices
   - Debugging tips

10. **Key Takeaways** (markdown)
    - 4-6 bullet points with 🔑 emoji
    - Most important concepts summarized

11. **Further Reading** (markdown)
    - Links to documentation
    - Recommended papers or tutorials
    - Next topics to explore

CRITICAL RULES:
- Every code cell MUST be complete and runnable — NO placeholders except in exercises
- Variables must be defined before use (cells run top-to-bottom)
- torch.manual_seed(42) and np.random.seed(42) for reproducibility
- Total notebook runtime must be under 5 minutes on CPU
- Allowed libraries: torch, numpy, matplotlib, math, random, collections
- Add print() statements liberally to show intermediate values
- Add type hints to function signatures
- Each code cell: 5-25 lines max
- Include markdown cells between code cells explaining the "why"
- The code should be EDUCATIONAL — prioritize clarity over cleverness

Return ONLY a valid JSON array of cell objects. No markdown fencing around the JSON.
`;

// Step 4: Validate
const VALIDATE_PROMPT_TEMPLATE = `You are a code reviewer checking an educational Jupyter notebook.

Here is the notebook as a JSON array of cells:
{cells_json}

Check for ALL issues and fix any you find:

1. **Undefined variables**: Any variable used before it's defined
2. **Missing imports**: Any module used but not imported
3. **Placeholder code**: Any TODO, pass, "...", NotImplementedError (except in exercise cells)
4. **Syntax errors**: Any Python syntax issues
5. **Missing sections**: All 11 required sections must be present
6. **Missing seeds**: torch.manual_seed(42) and np.random.seed(42) must be set
7. **Missing outputs**: Code cells should have print() or visualization output
8. **Cell too long**: Split any code cell over 30 lines

For each issue found, fix it directly in the cells.
If the notebook is already correct, return it unchanged.

Return ONLY the complete JSON array of cells. No explanation, no markdown fencing.
`;

// ============================================================================
// GEMINI API FUNCTIONS (from paper-to-notebook/llm.py)
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0]?.content?.parts) {
    return data.candidates[0].content.parts.map((p: any) => p.text || '').join('');
  }

  throw new Error('Invalid Gemini API response structure');
}

async function callGeminiWithRetry(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callGemini(systemPrompt, userContent, maxTokens);
    } catch (e) {
      const error = e as Error;
      const errorStr = error.message.toLowerCase();

      if (errorStr.includes('429') || errorStr.includes('rate') ||
          errorStr.includes('500') || errorStr.includes('503') ||
          errorStr.includes('overloaded') || errorStr.includes('unavailable')) {
        lastError = error;
        const waitTime = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        console.log(`  Transient error. Waiting ${waitTime/1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} retries. Last error: ${lastError?.message}`);
}

async function parseLLMJson(rawText: string, stepName: string): Promise<any> {
  let text = rawText.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```json')) {
    text = text.slice(7);
  } else if (text.startsWith('```')) {
    const firstNewline = text.indexOf('\n');
    text = text.slice(firstNewline + 1);
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3);
  }
  text = text.trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.log(`  Warning: JSON parse failed in ${stepName}. Attempting repair...`);

    const repairPrompt = `The following text was supposed to be valid JSON but has a syntax error:

${text.slice(0, 8000)}

Error: ${e}

Return ONLY the corrected valid JSON, nothing else.`;

    const repaired = await callGeminiWithRetry(
      'You are a JSON repair tool. Return only valid JSON.',
      repairPrompt,
      Math.max(text.length / 2, 4096)
    );

    let repairedText = repaired.trim();
    if (repairedText.startsWith('```')) {
      repairedText = repairedText.split('\n').slice(1).join('\n');
    }
    if (repairedText.endsWith('```')) {
      repairedText = repairedText.slice(0, -3);
    }

    return JSON.parse(repairedText.trim());
  }
}

// ============================================================================
// PIPELINE (from paper-to-notebook/pipeline.py)
// ============================================================================

function printStep(stepNum: number, name: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Step ${stepNum}/4: ${name}`);
  console.log('='.repeat(60));
}

interface NotebookCell {
  cell_type: 'markdown' | 'code';
  source: string;
}

async function runPipeline(
  topic: string,
  question: string,
  studentName?: string
): Promise<{ title: string; cells: NotebookCell[] }> {

  // Step 1: Topic Analysis
  printStep(1, 'Analyzing topic');
  console.log('  Extracting concepts, objectives, prerequisites...');

  const analysisPrompt = `${ANALYSIS_PROMPT}

TOPIC: ${topic}
QUESTION: ${question}
STUDENT: ${studentName || 'Student'}

Analyze this topic thoroughly.`;

  const analysisRaw = await callGeminiWithRetry(SYSTEM_PROMPT, analysisPrompt, MAX_TOKENS_ANALYSIS);
  const analysis = await parseLLMJson(analysisRaw, 'topic_analysis');

  console.log(`  Topic: ${analysis.title || topic}`);
  console.log(`  Concepts: ${analysis.concepts?.length || 0}`);

  // Step 2: Design Plan
  printStep(2, 'Designing notebook');
  console.log('  Planning sections, examples, visualizations...');

  const designPrompt = DESIGN_PROMPT_TEMPLATE.replace('{analysis_json}', JSON.stringify(analysis, null, 2));
  const designRaw = await callGeminiWithRetry(SYSTEM_PROMPT, designPrompt, MAX_TOKENS_DESIGN);
  const design = await parseLLMJson(designRaw, 'notebook_design');

  console.log(`  Title: ${design.notebook_title || 'Educational Notebook'}`);
  console.log(`  Sections: ${design.sections?.length || 0}`);
  console.log(`  Visualizations: ${design.visualizations?.length || 0}`);

  // Step 3: Generate Notebook Cells
  printStep(3, 'Generating notebook cells');
  console.log('  Writing code and markdown for all sections...');

  const generatePrompt = GENERATE_PROMPT_TEMPLATE
    .replace('{analysis_json}', JSON.stringify(analysis, null, 2))
    .replace('{design_json}', JSON.stringify(design, null, 2));

  const cellsRaw = await callGeminiWithRetry(SYSTEM_PROMPT, generatePrompt, MAX_TOKENS_GENERATE);
  const cells = await parseLLMJson(cellsRaw, 'generate_cells') as NotebookCell[];

  const codeCells = cells.filter(c => c.cell_type === 'code').length;
  const mdCells = cells.filter(c => c.cell_type === 'markdown').length;
  console.log(`  Generated ${cells.length} cells (${codeCells} code, ${mdCells} markdown)`);

  // Step 4: Validate & Repair
  printStep(4, 'Validating notebook');
  console.log('  Checking for errors, missing imports, placeholders...');

  const validatePrompt = VALIDATE_PROMPT_TEMPLATE.replace('{cells_json}', JSON.stringify(cells, null, 2));
  const validatedRaw = await callGeminiWithRetry(SYSTEM_PROMPT, validatePrompt, MAX_TOKENS_VALIDATE);
  const validatedCells = await parseLLMJson(validatedRaw, 'validate') as NotebookCell[];

  console.log(`  Validated: ${validatedCells.length} cells`);

  return {
    title: design.notebook_title || analysis.title || topic,
    cells: validatedCells,
  };
}

// ============================================================================
// NOTEBOOK BUILDER (from paper-to-notebook/notebook_builder.py)
// ============================================================================

function buildNotebook(title: string, cells: NotebookCell[], studentName?: string): any {
  const notebookCells = cells.map((cell) => {
    // Handle both string and array source formats
    let source: string[];
    const rawSource = cell.source;

    if (Array.isArray(rawSource)) {
      source = rawSource.map((line: string, i: number, arr: string[]) => {
        const lineStr = String(line);
        if (i === arr.length - 1) return lineStr;
        return lineStr.endsWith('\n') ? lineStr : lineStr + '\n';
      });
    } else {
      const lines = String(rawSource || '').split('\n');
      source = lines.map((line: string, i: number, arr: string[]) =>
        i === arr.length - 1 ? line : line + '\n'
      );
    }

    if (cell.cell_type === 'markdown') {
      return {
        cell_type: 'markdown',
        metadata: {},
        source,
      };
    } else {
      return {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source,
      };
    }
  });

  return {
    nbformat: 4,
    nbformat_minor: 0,
    metadata: {
      colab: {
        name: `${title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50)}_${studentName || 'Student'}.ipynb`,
        provenance: [],
        toc_visible: true,
      },
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.9',
      },
    },
    cells: notebookCells,
  };
}

// ============================================================================
// TOOL HANDLER
// ============================================================================

export const colabToolHandlers: Record<string, ToolHandler> = {
  create_colab_notebook: async (input, _context) => {
    try {
      const topic = input.topic as string;
      const question = input.question as string;
      const studentName = input.studentName as string | undefined;

      console.log(`\n[Colab Tool] Starting notebook generation`);
      console.log(`[Colab Tool] Topic: ${topic}`);
      console.log(`[Colab Tool] Question: ${question}`);
      console.log(`[Colab Tool] This will take 1-2 minutes...`);

      // Run the multi-step pipeline
      const { title, cells } = await runPipeline(topic, question, studentName);

      // Build the notebook
      const notebook = buildNotebook(title, cells, studentName);

      // Save to file
      const timestamp = Date.now();
      const safeTopic = topic.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const filename = `${safeTopic}_${timestamp}.ipynb`;

      const publicDir = path.join(process.cwd(), 'public', 'notebooks');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const filePath = path.join(publicDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(notebook, null, 2));

      console.log(`\n[Colab Tool] Notebook saved: ${filePath}`);
      console.log(`[Colab Tool] Total cells: ${cells.length}`);

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const fullUrl = `${baseUrl}/notebooks/${filename}`;

      return {
        success: true,
        data: {
          filename,
          title,
          downloadUrl: fullUrl,
          downloadLink: `[📓 Download Colab Notebook: ${title}](${fullUrl})`,
          colabInstructions: `To open in Google Colab:\n1. Download the notebook from the link above\n2. Go to colab.research.google.com\n3. Click "Upload" and select the downloaded file\n4. Run cells sequentially from top to bottom`,
          message: `I've created a comprehensive Colab notebook on "${title}" with ${cells.length} cells!`,
          cellCount: cells.length,
        },
      };
    } catch (error) {
      console.error('[Colab Tool] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notebook',
      };
    }
  },
};

// Get tool definitions
export function getColabTools(): Tool[] {
  return Object.values(colabToolDefinitions);
}

// Register tools
export function registerColabTools(registry: ToolRegistry): void {
  Object.entries(colabToolDefinitions).forEach(([name, tool]) => {
    registry.register(tool, colabToolHandlers[name]);
  });
}
