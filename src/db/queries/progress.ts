import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { progress, type Progress, type NewProgress, type Phase, type ProgressStatus } from '../schema';

export async function getProgressByStudentId(studentId: string): Promise<Progress[]> {
  return db.select().from(progress).where(eq(progress.studentId, studentId));
}

export async function getProgressByPhase(studentId: string, phase: Phase): Promise<Progress[]> {
  return db
    .select()
    .from(progress)
    .where(and(eq(progress.studentId, studentId), eq(progress.phase, phase)));
}

export async function createProgress(data: NewProgress): Promise<Progress> {
  const result = await db.insert(progress).values(data).returning();
  return result[0];
}

export async function updateProgress(
  id: string,
  data: Partial<Progress>
): Promise<Progress> {
  const result = await db
    .update(progress)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(progress.id, id))
    .returning();
  return result[0];
}

export async function getOrCreateProgress(
  studentId: string,
  phase: Phase,
  topicIndex?: number,
  milestone?: number
): Promise<Progress> {
  const existing = await db
    .select()
    .from(progress)
    .where(
      and(
        eq(progress.studentId, studentId),
        eq(progress.phase, phase),
        topicIndex ? eq(progress.topicIndex, topicIndex) : undefined,
        milestone ? eq(progress.milestone, milestone) : undefined
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  return createProgress({
    studentId,
    phase,
    topicIndex,
    milestone,
    status: 'not_started',
  });
}
