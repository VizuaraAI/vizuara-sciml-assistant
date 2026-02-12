/**
 * Streaming Colab Generation API
 * Uses Server-Sent Events to stream thinking tokens and progress
 * Files are stored in Supabase Storage for production compatibility
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCxs_tn_dxb_sQRHNAa0rPXKdcm-RxYTe4';
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;

// Token limits
const MAX_TOKENS_ANALYSIS = 8192;
const MAX_TOKENS_DESIGN = 8192;
const MAX_TOKENS_GENERATE = 65536;
const MAX_TOKENS_VALIDATE = 65536;

// Prompts (same as in colab-notebook.ts)
const SYSTEM_PROMPT = `You are an expert research engineer and educator who creates runnable, educational Python code. You use real ML components (PyTorch, Transformer layers, actual training loops) at a reduced scale that runs on CPU. You prioritize faithful implementation while making the code deeply educational with clear explanations, verbose logging, and insightful visualizations.`;

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

const DESIGN_PROMPT_TEMPLATE = `You are designing an educational notebook for teaching a concept.

Here is the structured analysis:
{analysis_json}

Design a complete implementation plan. Return a JSON object with these fields:

{
  "notebook_title": "A clear, descriptive title for the notebook",
  "target_audience": "Who this notebook is for",
  "estimated_time": "How long to complete",
  "sections": [{"title": "Section title", "purpose": "What this teaches", "type": "markdown|code|both"}],
  "code_examples": [{"name": "Example name", "description": "What this demonstrates"}],
  "visualizations": [{"title": "Plot title", "type": "line|bar|scatter", "purpose": "What insight"}],
  "exercises": [{"title": "Exercise title", "difficulty": "easy|medium|hard"}]
}

Return ONLY valid JSON, no markdown fencing.
`;

const GENERATE_PROMPT_TEMPLATE = `You are creating a complete educational Jupyter notebook.

Topic analysis:
{analysis_json}

Implementation plan:
{design_json}

Generate the COMPLETE notebook as a JSON array of cell objects. Each cell is:
{{"cell_type": "markdown" | "code", "source": "cell content as a string"}}

REQUIRED SECTIONS (in order):
1. Title & Overview (markdown) - title with emoji, summary, prerequisites, objectives
2. Table of Contents (markdown)
3. Imports & Setup (code) - torch, numpy, matplotlib, seeds
4. Concept Introduction - The "Why" (markdown)
5. First Principles Build-Up - The "What" (code + markdown, 3-6 sub-sections)
6. Putting It All Together (code + markdown)
7. Visualizations (code + markdown) - 2-3 matplotlib plots
8. Hands-On Exercises (code + markdown) - 2-3 exercises with TODO placeholders
9. Common Pitfalls & Tips (markdown)
10. Key Takeaways (markdown) - 4-6 bullet points with 🔑
11. Further Reading (markdown)

CRITICAL RULES:
- Every code cell MUST be runnable — NO placeholders except in exercises
- Variables must be defined before use
- torch.manual_seed(42) and np.random.seed(42)
- Add print() statements liberally
- Each code cell: 5-25 lines max

Return ONLY a valid JSON array. No markdown fencing.
`;

const VALIDATE_PROMPT_TEMPLATE = `You are a code reviewer checking an educational Jupyter notebook.

Here is the notebook as a JSON array of cells:
{cells_json}

Check for issues and fix any: undefined variables, missing imports, placeholder code (except exercises), syntax errors.
Return ONLY the complete JSON array of cells. No explanation, no markdown fencing.
`;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { topic, question, studentName } = body;

        console.log('[Colab] Starting generation for topic:', topic);
        send('status', { step: 1, message: 'Generating notebook...', phase: 'generate' });
        send('thinking', { text: `Creating notebook for: "${topic}"...` });

        // Single API call to generate everything
        const prompt = `Create a complete educational Jupyter notebook about: ${topic}

Question from student: ${question || topic}
Student name: ${studentName || 'Student'}

Generate the notebook as a JSON array of cells. Each cell:
{"cell_type": "markdown" | "code", "source": "content"}

Include:
1. Title with emoji and overview (markdown)
2. Imports: torch, numpy, matplotlib (code)
3. Concept explanation (markdown)
4. Working implementation with comments (code)
5. Example usage with print outputs (code)
6. Key takeaways (markdown)

Rules:
- Code must be runnable
- Use torch.manual_seed(42)
- Add print() statements
- Keep code cells under 20 lines

Return ONLY valid JSON array. No markdown fencing.`;

        const result = await callGeminiStreaming(
          SYSTEM_PROMPT,
          prompt,
          MAX_TOKENS_GENERATE,
          (thought) => send('thinking', { text: thought })
        );

        console.log('[Colab] Generation complete, parsing...');
        send('status', { step: 2, message: 'Processing...', phase: 'process' });

        const cells = parseJSON(result.text);
        const codeCells = cells.filter((c: any) => c.cell_type === 'code').length;
        send('status', { step: 2, message: `Generated ${cells.length} cells (${codeCells} code)`, phase: 'generate-done' });

        // Build notebook (skipping validation to save time)
        console.log('[Colab] Step 3: Building notebook file...');
        send('status', { step: 3, message: 'Building notebook file...', phase: 'build' });

        const title = topic;
        const notebook = buildNotebook(title, cells, studentName);

        const timestamp = Date.now();
        const safeTopic = topic.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
        const filename = `${safeTopic}_${timestamp}.ipynb`;

        const notebookContent = JSON.stringify(notebook, null, 2);

        // Try to upload to Supabase Storage
        let fullUrl = '';
        try {
          const notebookBuffer = new Uint8Array(Buffer.from(notebookContent));

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('notebooks')
            .upload(filename, notebookBuffer, {
              contentType: 'application/json',
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('notebooks')
              .getPublicUrl(filename);
            fullUrl = publicUrlData.publicUrl;
          }
        } catch (storageError) {
          console.warn('Storage upload failed, using data URL fallback:', storageError);
        }

        // If storage failed, create a data URL
        if (!fullUrl) {
          const base64Content = Buffer.from(notebookContent).toString('base64');
          fullUrl = `data:application/json;base64,${base64Content}`;
        }

        send('complete', {
          success: true,
          title,
          filename,
          downloadUrl: fullUrl,
          downloadLink: `[📓 Download: ${title}](${fullUrl})`,
          message: `I've created a Google Colab code file for you.`,
          cellCount: cells.length,
          notebookContent: notebookContent, // Include content for frontend fallback
        });

      } catch (error) {
        console.error('Colab generation error:', error);
        try {
          send('error', {
            message: error instanceof Error ? error.message : 'Failed to generate notebook'
          });
        } catch (sendError) {
          console.error('Failed to send error event:', sendError);
        }
      } finally {
        try {
          controller.close();
        } catch (closeError) {
          console.error('Failed to close controller:', closeError);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
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
  console.log('[Gemini] Making API call with maxTokens:', maxTokens);

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
    console.error('[Gemini] API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText.slice(0, 200)}`);
  }

  console.log('[Gemini] Response OK, reading stream...');

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

function buildNotebook(title: string, cells: any[], studentName?: string): any {
  const notebookCells = cells.map((cell: any) => {
    const rawSource = cell.source || cell.content || '';
    let source: string[];

    if (Array.isArray(rawSource)) {
      source = rawSource.map((line: string, i: number, arr: string[]) => {
        const lineStr = String(line);
        return i === arr.length - 1 ? lineStr : (lineStr.endsWith('\n') ? lineStr : lineStr + '\n');
      });
    } else {
      const lines = String(rawSource).split('\n');
      source = lines.map((line: string, i: number, arr: string[]) =>
        i === arr.length - 1 ? line : line + '\n'
      );
    }

    return cell.cell_type === 'markdown'
      ? { cell_type: 'markdown', metadata: {}, source }
      : { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source };
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
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.9' },
    },
    cells: notebookCells,
  };
}
