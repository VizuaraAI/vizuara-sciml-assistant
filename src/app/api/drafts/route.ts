/**
 * Drafts API Endpoint
 * GET /api/drafts?studentId=xxx - Get pending drafts
 * POST /api/drafts - Approve, reject, or edit a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    // Get conversation for this student
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (!conversation) {
      return NextResponse.json({
        success: true,
        data: { count: 0, drafts: [] },
      });
    }

    // Get draft messages
    const { data: drafts, error } = await supabase
      .from('messages')
      .select('id, content, tool_calls, created_at')
      .eq('conversation_id', conversation.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        count: drafts?.length || 0,
        drafts: (drafts || []).map((d) => ({
          id: d.id,
          content: d.content,
          toolCalls: d.tool_calls,
          createdAt: d.created_at,
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

interface Attachment {
  filename: string;
  url: string;
  mimeType: string;
  storagePath: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, draftId, content, reason, attachments } = body as {
      action: string;
      draftId: string;
      content?: string;
      reason?: string;
      attachments?: Attachment[];
    };

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: draftId' },
        { status: 400 }
      );
    }

    console.log(`[Drafts API] Action: ${action}, draftId: ${draftId}, attachments: ${attachments?.length || 0}`);

    switch (action) {
      case 'approve': {
        // Update status to 'approved' (sent to student)
        // Include attachments if provided
        const updateData: any = { status: 'approved' };
        if (attachments && attachments.length > 0) {
          updateData.attachments = attachments;
          console.log(`[Drafts API] Adding ${attachments.length} attachment(s) to approved message`);
        }

        const { data, error } = await supabase
          .from('messages')
          .update(updateData)
          .eq('id', draftId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Draft approved', messageId: data.id },
        });
      }

      case 'reject': {
        // Delete the draft
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', draftId);

        if (error) {
          throw new Error(error.message);
        }

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

        // Fetch original message to preserve the subject
        const { data: originalMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('id', draftId)
          .single();

        // Extract subject from original content and prepend to edited content
        let finalContent = content;
        if (originalMsg?.content?.startsWith('Subject:')) {
          const firstLine = originalMsg.content.split('\n')[0];
          const subject = firstLine; // Keep full "Subject: xyz" line
          // Only add subject if the edited content doesn't already have one
          if (!content.startsWith('Subject:')) {
            finalContent = `${subject}\n\n${content}`;
          }
        }

        // Update content and approve, include attachments if provided
        const updateData: any = { content: finalContent, status: 'approved' };
        if (attachments && attachments.length > 0) {
          updateData.attachments = attachments;
          console.log(`[Drafts API] Adding ${attachments.length} attachment(s) to edited message`);
        }

        const { data, error } = await supabase
          .from('messages')
          .update(updateData)
          .eq('id', draftId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Draft edited and approved', messageId: data.id },
        });
      }

      case 'update': {
        // Update content only (keep as draft)
        if (!content) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: content for update action' },
            { status: 400 }
          );
        }

        const { data, error } = await supabase
          .from('messages')
          .update({ content })
          .eq('id', draftId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Draft updated', messageId: data.id },
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
