import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { memory, type Memory, type NewMemory, type MemoryType } from '../schema';

// Check if db is available (not available on Railway due to direct PostgreSQL connection issues)
function isDbAvailable(): boolean {
  return db !== null;
}

export async function getMemory(
  studentId: string,
  type: MemoryType,
  key?: string
): Promise<Memory[]> {
  if (!isDbAvailable()) {
    return []; // Return empty array if db is not available
  }
  if (key) {
    return db
      .select()
      .from(memory)
      .where(
        and(
          eq(memory.studentId, studentId),
          eq(memory.memoryType, type),
          eq(memory.key, key)
        )
      );
  }
  return db
    .select()
    .from(memory)
    .where(and(eq(memory.studentId, studentId), eq(memory.memoryType, type)));
}

export async function getMemoryValue(
  studentId: string,
  type: MemoryType,
  key: string
): Promise<any | null> {
  if (!isDbAvailable()) {
    return null;
  }
  const result = await db
    .select()
    .from(memory)
    .where(
      and(
        eq(memory.studentId, studentId),
        eq(memory.memoryType, type),
        eq(memory.key, key)
      )
    )
    .limit(1);
  return result[0]?.value || null;
}

export async function setMemory(
  studentId: string,
  type: MemoryType,
  key: string,
  value: any
): Promise<Memory | null> {
  if (!isDbAvailable()) {
    return null;
  }
  // Check if memory exists
  const existing = await db
    .select()
    .from(memory)
    .where(
      and(
        eq(memory.studentId, studentId),
        eq(memory.memoryType, type),
        eq(memory.key, key)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const result = await db
      .update(memory)
      .set({ value, updatedAt: new Date() })
      .where(eq(memory.id, existing[0].id))
      .returning();
    return result[0];
  } else {
    // Create new
    const result = await db
      .insert(memory)
      .values({ studentId, memoryType: type, key, value })
      .returning();
    return result[0];
  }
}

export async function appendToMemory(
  studentId: string,
  type: MemoryType,
  key: string,
  value: any
): Promise<Memory | null> {
  if (!isDbAvailable()) {
    return null;
  }
  const existing = await getMemoryValue(studentId, type, key);
  const currentArray = Array.isArray(existing) ? existing : [];
  const newArray = [...currentArray, value];
  return setMemory(studentId, type, key, newArray);
}

export async function deleteMemory(
  studentId: string,
  type: MemoryType,
  key?: string
): Promise<void> {
  if (!isDbAvailable()) {
    return;
  }
  if (key) {
    await db
      .delete(memory)
      .where(
        and(
          eq(memory.studentId, studentId),
          eq(memory.memoryType, type),
          eq(memory.key, key)
        )
      );
  } else {
    await db
      .delete(memory)
      .where(and(eq(memory.studentId, studentId), eq(memory.memoryType, type)));
  }
}

export async function getAllMemoryForStudent(studentId: string): Promise<Memory[]> {
  if (!isDbAvailable()) {
    return [];
  }
  return db.select().from(memory).where(eq(memory.studentId, studentId));
}
