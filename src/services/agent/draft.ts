/**
 * Draft Mode Logic
 * Ensures all agent responses are saved as drafts for mentor approval
 */

import { db } from '@/db';
import { messages, conversations, type Message, type NewMessage } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getConversationByStudentId, createConversation } from '@/db/queries/conversations';
import { createMessage, updateMessageStatus } from '@/db/queries/messages';
import type { ToolCall } from './tools/types';

export interface Draft {
  id: string;
  studentId: string;
  conversationId: string;
  content: string;
  toolCalls: ToolCall[] | null;
  toolResults: any[] | null;
  status: 'draft' | 'approved' | 'sent';
  createdAt: Date;
}

/**
 * Save agent response as a draft
 */
export async function saveDraft(
  studentId: string,
  content: string,
  toolCalls?: ToolCall[],
  toolResults?: any[]
): Promise<Draft> {
  // Get or create conversation
  let conversation = await getConversationByStudentId(studentId);
  if (!conversation) {
    conversation = await createConversation(studentId);
  }

  // Create the draft message
  const message = await createMessage({
    conversationId: conversation.id,
    role: 'agent',
    content,
    toolCalls: toolCalls || null,
    toolResults: toolResults || null,
    status: 'draft',
  });

  return {
    id: message.id,
    studentId,
    conversationId: conversation.id,
    content: message.content,
    toolCalls: message.toolCalls as ToolCall[] | null,
    toolResults: message.toolResults as any[] | null,
    status: message.status,
    createdAt: message.createdAt,
  };
}

/**
 * Approve a draft (mentor action)
 * Changes status from 'draft' to 'approved' then 'sent'
 */
export async function approveDraft(
  draftId: string,
  _mentorId: string
): Promise<Message> {
  // Update to sent status
  const updatedMessage = await updateMessageStatus(draftId, 'sent');
  return updatedMessage;
}

/**
 * Reject a draft (mentor action)
 * Marks the draft as rejected (we'll use a new status or delete)
 */
export async function rejectDraft(
  draftId: string,
  _mentorId: string,
  _reason?: string
): Promise<void> {
  // For now, delete rejected drafts
  // In production, you might want to keep them with a 'rejected' status
  await db.delete(messages).where(eq(messages.id, draftId));
}

/**
 * Edit and approve a draft
 * Allows mentor to modify content before approving
 */
export async function editAndApproveDraft(
  draftId: string,
  _mentorId: string,
  newContent: string
): Promise<Message> {
  // Update content and status
  const result = await db
    .update(messages)
    .set({
      content: newContent,
      status: 'sent',
    })
    .where(eq(messages.id, draftId))
    .returning();

  return result[0];
}

/**
 * Get pending drafts for a student
 */
export async function getPendingDrafts(studentId: string): Promise<Draft[]> {
  const conversation = await getConversationByStudentId(studentId);
  if (!conversation) return [];

  const drafts = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversation.id), eq(messages.status, 'draft')));

  return drafts.map((d: Message) => ({
    id: d.id,
    studentId,
    conversationId: conversation.id,
    content: d.content,
    toolCalls: d.toolCalls as ToolCall[] | null,
    toolResults: d.toolResults as any[] | null,
    status: d.status,
    createdAt: d.createdAt,
  }));
}

/**
 * Get all pending drafts for a mentor's students
 */
export async function getAllPendingDraftsForMentor(
  mentorId: string
): Promise<{ studentId: string; drafts: Draft[] }[]> {
  // This would require a join with students table
  // For now, return empty array - implement fully when mentor dashboard is built
  return [];
}

/**
 * Check if student has any pending drafts
 */
export async function hasPendingDrafts(studentId: string): Promise<boolean> {
  const drafts = await getPendingDrafts(studentId);
  return drafts.length > 0;
}
