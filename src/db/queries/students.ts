import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../index';
import { students, users, conversations, messages, type Student, type NewStudent } from '../schema';

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

// Get all students with their last message timestamp for inactivity tracking
export interface InactiveStudentInfo {
  studentId: string;
  studentName: string;
  studentEmail: string;
  currentPhase: 'phase1' | 'phase2';
  lastStudentMessageAt: Date | null;
  daysSinceLastMessage: number;
}

export async function getStudentsWithLastActivity(): Promise<InactiveStudentInfo[]> {
  // Get all students with their last student message timestamp
  const results = await db
    .select({
      studentId: students.id,
      studentName: users.name,
      studentEmail: users.email,
      currentPhase: students.currentPhase,
      enrollmentDate: students.enrollmentDate,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id));

  const now = new Date();
  const studentsWithActivity: InactiveStudentInfo[] = [];

  for (const student of results) {
    // Get the conversation for this student
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.studentId, student.studentId))
      .limit(1);

    let lastStudentMessageAt: Date | null = null;

    if (conversation.length > 0) {
      // Get the last message from the student (not agent/mentor)
      const lastStudentMessage = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation[0].id),
            eq(messages.role, 'student')
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (lastStudentMessage.length > 0) {
        lastStudentMessageAt = lastStudentMessage[0].createdAt;
      }
    }

    // Calculate days since last message
    let daysSinceLastMessage = 0;
    if (lastStudentMessageAt) {
      daysSinceLastMessage = Math.floor(
        (now.getTime() - lastStudentMessageAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    } else {
      // If no messages, calculate from enrollment date
      daysSinceLastMessage = Math.floor(
        (now.getTime() - student.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    studentsWithActivity.push({
      studentId: student.studentId,
      studentName: student.studentName,
      studentEmail: student.studentEmail,
      currentPhase: student.currentPhase as 'phase1' | 'phase2',
      lastStudentMessageAt,
      daysSinceLastMessage,
    });
  }

  // Sort by days since last message (most inactive first)
  studentsWithActivity.sort((a, b) => b.daysSinceLastMessage - a.daysSinceLastMessage);

  return studentsWithActivity;
}

// Get inactive students (those who haven't messaged in N days)
export async function getInactiveStudents(minDaysInactive: number = 3): Promise<InactiveStudentInfo[]> {
  const allStudents = await getStudentsWithLastActivity();
  return allStudents.filter(s => s.daysSinceLastMessage >= minDaysInactive);
}
