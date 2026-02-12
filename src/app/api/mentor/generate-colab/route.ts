/**
 * Mentor Colab Notebook Generation API
 * POST /api/mentor/generate-colab - Generate a Colab notebook for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { colabToolHandlers } from '@/services/agent/tools/colab-notebook';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, studentName, question } = body;

    if (!studentId || !question) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: studentId, question' },
        { status: 400 }
      );
    }

    console.log(`[Mentor API] Generating Colab notebook for ${studentName}: ${question}`);

    // Detect topic from question
    const topicKeywords = question.toLowerCase();
    let topic = 'general';
    if (topicKeywords.includes('rag') || topicKeywords.includes('retrieval')) {
      topic = 'rag';
    } else if (topicKeywords.includes('embedding') || topicKeywords.includes('vector')) {
      topic = 'embeddings';
    } else if (topicKeywords.includes('transformer') || topicKeywords.includes('attention')) {
      topic = 'transformers';
    } else if (topicKeywords.includes('llm') || topicKeywords.includes('language model')) {
      topic = 'llm';
    }

    // Generate the notebook using the existing tool
    const result = await colabToolHandlers.create_colab_notebook(
      {
        topic,
        question,
        studentName,
      },
      {
        studentId,
        currentPhase: 'phase1',
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate notebook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.data?.message || `I've created a practical Colab notebook for you!`,
      downloadLink: result.data?.downloadLink || '',
      downloadUrl: result.data?.downloadUrl || '',
    });
  } catch (error) {
    console.error('Generate colab API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
