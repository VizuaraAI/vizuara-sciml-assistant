import { eq } from 'drizzle-orm';
import { db } from '../index';
import { roadmaps, type Roadmap, type NewRoadmap } from '../schema';

export async function getRoadmapByStudentId(studentId: string): Promise<Roadmap | null> {
  const result = await db
    .select()
    .from(roadmaps)
    .where(eq(roadmaps.studentId, studentId))
    .limit(1);
  return result[0] || null;
}

export async function createRoadmap(data: NewRoadmap): Promise<Roadmap> {
  const result = await db.insert(roadmaps).values(data).returning();
  return result[0];
}

export async function updateRoadmap(id: string, data: Partial<Roadmap>): Promise<Roadmap> {
  const result = await db
    .update(roadmaps)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(roadmaps.id, id))
    .returning();
  return result[0];
}
