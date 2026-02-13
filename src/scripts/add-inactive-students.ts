/**
 * Add inactive students for testing
 * Run with: npx tsx src/scripts/add-inactive-students.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function addInactiveStudents() {
  console.log('Adding inactive students for testing...\n');

  const passwordHash = await hashPassword('password123');

  // Get mentor
  const { eq } = await import('drizzle-orm');
  const mentors = await db.select().from(schema.users).where(eq(schema.users.role, 'mentor'));
  const mentor = mentors[0];

  if (!mentor) {
    console.error('No mentor found. Run npm run db:seed first.');
    process.exit(1);
  }

  // Inactive student 1: John - 5 days inactive (Phase I)
  console.log('Creating John (5 days inactive, Phase I)...');
  const [johnUser] = await db
    .insert(schema.users)
    .values({
      name: 'John Davis',
      email: 'john@example.com',
      passwordHash,
      role: 'student',
    })
    .onConflictDoNothing()
    .returning();

  if (johnUser) {
    const [john] = await db
      .insert(schema.students)
      .values({
        userId: johnUser.id,
        mentorId: mentor.id,
        currentPhase: 'phase1',
        currentTopicIndex: 2,
        enrollmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        phase1Start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // Create conversation and old message
    const [johnConv] = await db
      .insert(schema.conversations)
      .values({ studentId: john.id })
      .returning();

    await db.insert(schema.messages).values({
      conversationId: johnConv.id,
      role: 'student',
      content: "Hi Dr. Raj, I'm working through the prompt engineering section. Will update you soon!",
      status: 'sent',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    });

    console.log('  Created John (5 days inactive)');
  }

  // Inactive student 2: Maria - 10 days inactive (Phase I)
  console.log('Creating Maria (10 days inactive, Phase I)...');
  const [mariaUser] = await db
    .insert(schema.users)
    .values({
      name: 'Maria Garcia',
      email: 'maria@example.com',
      passwordHash,
      role: 'student',
    })
    .onConflictDoNothing()
    .returning();

  if (mariaUser) {
    const [maria] = await db
      .insert(schema.students)
      .values({
        userId: mariaUser.id,
        mentorId: mentor.id,
        currentPhase: 'phase1',
        currentTopicIndex: 4,
        enrollmentDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        phase1Start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      })
      .returning();

    const [mariaConv] = await db
      .insert(schema.conversations)
      .values({ studentId: maria.id })
      .returning();

    await db.insert(schema.messages).values({
      conversationId: mariaConv.id,
      role: 'student',
      content: "Just finished the semantic search module. The chunking strategies make a lot more sense now!",
      status: 'sent',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    });

    console.log('  Created Maria (10 days inactive)');
  }

  // Inactive student 3: Kevin - 15 days inactive (Phase II)
  console.log('Creating Kevin (15 days inactive, Phase II)...');
  const [kevinUser] = await db
    .insert(schema.users)
    .values({
      name: 'Kevin Park',
      email: 'kevin@example.com',
      passwordHash,
      role: 'student',
    })
    .onConflictDoNothing()
    .returning();

  if (kevinUser) {
    const [kevin] = await db
      .insert(schema.students)
      .values({
        userId: kevinUser.id,
        mentorId: mentor.id,
        currentPhase: 'phase2',
        currentTopicIndex: 8,
        currentMilestone: 1,
        researchTopic: 'Multimodal RAG for Financial Document Analysis',
        enrollmentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        phase1Start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        phase2Start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      })
      .returning();

    const [kevinConv] = await db
      .insert(schema.conversations)
      .values({ studentId: kevin.id })
      .returning();

    await db.insert(schema.messages).values({
      conversationId: kevinConv.id,
      role: 'student',
      content: "Dr. Raj, I started the literature review but got busy with work. Will catch up this weekend.",
      status: 'sent',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    });

    console.log('  Created Kevin (15 days inactive)');
  }

  // Inactive student 4: Lisa - 20 days inactive (Phase II)
  console.log('Creating Lisa (20 days inactive, Phase II)...');
  const [lisaUser] = await db
    .insert(schema.users)
    .values({
      name: 'Lisa Thompson',
      email: 'lisa@example.com',
      passwordHash,
      role: 'student',
    })
    .onConflictDoNothing()
    .returning();

  if (lisaUser) {
    const [lisa] = await db
      .insert(schema.students)
      .values({
        userId: lisaUser.id,
        mentorId: mentor.id,
        currentPhase: 'phase2',
        currentTopicIndex: 8,
        currentMilestone: 2,
        researchTopic: 'LLM-Powered Code Review Assistant',
        enrollmentDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        phase1Start: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        phase2Start: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      })
      .returning();

    const [lisaConv] = await db
      .insert(schema.conversations)
      .values({ studentId: lisa.id })
      .returning();

    await db.insert(schema.messages).values({
      conversationId: lisaConv.id,
      role: 'student',
      content: "The baseline implementation is taking longer than expected. Having some issues with the evaluation setup.",
      status: 'sent',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    });

    console.log('  Created Lisa (20 days inactive)');
  }

  console.log('\n Done! Added inactive students for testing.');
  console.log('\nNew test credentials (all use password: password123):');
  console.log('  john@example.com - 5 days inactive (Phase I)');
  console.log('  maria@example.com - 10 days inactive (Phase I)');
  console.log('  kevin@example.com - 15 days inactive (Phase II)');
  console.log('  lisa@example.com - 20 days inactive (Phase II)');

  await client.end();
  process.exit(0);
}

addInactiveStudents().catch((error) => {
  console.error('Failed to add inactive students:', error);
  process.exit(1);
});
