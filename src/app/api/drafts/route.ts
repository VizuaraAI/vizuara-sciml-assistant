/**
 * Drafts API Endpoint
 * GET /api/drafts?studentId=xxx - Get pending drafts
 * POST /api/drafts/approve - Approve a draft
 * POST /api/drafts/reject - Reject a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPendingDrafts, approveDraft, rejectDraft, editAndApproveDraft } from '@/services/agent';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: studentId' },
        { status: 400 }
      );
    }

    const drafts = await getPendingDrafts(studentId);

    return NextResponse.json({
      success: true,
      data: {
        count: drafts.length,
        drafts: drafts.map((d) => ({
          id: d.id,
          content: d.content,
          toolCalls: d.toolCalls,
          createdAt: d.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Drafts GET error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, draftId, mentorId, content, reason } = body;

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: draftId' },
        { status: 400 }
      );
    }

    // For now, use a placeholder mentor ID
    const mentor = mentorId || 'mentor-placeholder';

    switch (action) {
      case 'approve': {
        const message = await approveDraft(draftId, mentor);
        return NextResponse.json({
          success: true,
          data: { message: 'Draft approved', messageId: message.id },
        });
      }

      case 'reject': {
        await rejectDraft(draftId, mentor, reason);
        return NextResponse.json({
          success: true,
          data: { message: 'Draft rejected' },
        });
      }

      case 'edit': {
        if (!content) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: content for edit action' },
            { status: 400 }
          );
        }
        const message = await editAndApproveDraft(draftId, mentor, content);
        return NextResponse.json({
          success: true,
          data: { message: 'Draft edited and approved', messageId: message.id },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be: approve, reject, or edit' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Drafts POST error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
