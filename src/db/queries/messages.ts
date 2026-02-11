import { eq, desc, and, ne, asc } from 'drizzle-orm';
import { db } from '../index';
import { messages, type Message, type NewMessage, type MessageStatus } from '../schema';

export async function getMessageById(id: string): Promise<Message | null> {
  const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return result[0] || null;
}

export async function getMessagesByConversationId(
  conversationId: string,
  options?: {
    limit?: number;
    excludeDrafts?: boolean;
  }
): Promise<Message[]> {
  let query = db
    .select()
    .from(messages)
    .where(
      options?.excludeDrafts
        ? and(eq(messages.conversationId, conversationId), ne(messages.status, 'draft'))
        : eq(messages.conversationId, conversationId)
    )
    .orderBy(asc(messages.createdAt));

  if (options?.limit) {
    // @ts-ignore - limit method exists
    query = query.limit(options.limit);
  }

  return query;
}

export async function getRecentMessages(
  conversationId: string,
  limit: number = 20
): Promise<Message[]> {
  // Get most recent messages, then reverse for chronological order
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return result.reverse();
}

export async function createMessage(data: NewMessage): Promise<Message> {
  const result = await db.insert(messages).values(data).returning();
  return result[0];
}

export async function updateMessageStatus(id: string, status: MessageStatus): Promise<Message> {
  const result = await db
    .update(messages)
    .set({ status })
    .where(eq(messages.id, id))
    .returning();
  return result[0];
}

export async function getPendingDrafts(conversationId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.status, 'draft')))
    .orderBy(desc(messages.createdAt));
}

export async function getLastMessage(conversationId: string): Promise<Message | null> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return result[0] || null;
}
