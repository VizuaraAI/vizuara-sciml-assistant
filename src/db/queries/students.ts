import { eq } from 'drizzle-orm';
import { db } from '../index';
import { students, users, type Student, type NewStudent } from '../schema';

export async function getStudentById(id: string): Promise<Student | null> {
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result[0] || null;
}

export async function getStudentByUserId(userId: string): Promise<Student | null> {
  const result = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  return result[0] || null;
}

export async function getStudentsByMentorId(mentorId: string): Promise<Student[]> {
  return db.select().from(students).where(eq(students.mentorId, mentorId));
}

export async function createStudent(data: NewStudent): Promise<Student> {
  const result = await db.insert(students).values(data).returning();
  return result[0];
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<Student> {
  const result = await db
    .update(students)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();
  return result[0];
}

export async function getAllStudents(): Promise<Student[]> {
  return db.select().from(students);
}

// Get student with user details
export async function getStudentWithUser(studentId: string) {
  const result = await db
    .select({
      student: students,
      user: users,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(students.id, studentId))
    .limit(1);

  return result[0] || null;
}

// Get all students with their user details
export async function getAllStudentsWithUsers() {
  return db
    .select({
      student: students,
      user: users,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id));
}
