import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { conversations, messages, type Conversation, type NewConversation } from '../schema';

export async function getConversationById(id: string): Promise<Conversation | null> {
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0] || null;
}

export async function getConversationByStudentId(studentId: string): Promise<Conversation | null> {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.studentId, studentId))
    .limit(1);
  return result[0] || null;
}

export async function createConversation(studentId: string): Promise<Conversation> {
  const result = await db
    .insert(conversations)
    .values({ studentId })
    .returning();
  return result[0];
}

export async function getOrCreateConversation(studentId: string): Promise<Conversation> {
  const existing = await getConversationByStudentId(studentId);
  if (existing) return existing;
  return createConversation(studentId);
}

export async function updateConversationTimestamp(id: string): Promise<void> {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));
}
