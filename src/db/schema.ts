import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============== ENUMS ==============

export const userRoleEnum = pgEnum('user_role', ['mentor', 'student']);
export const phaseEnum = pgEnum('phase', ['phase1', 'phase2']);
export const messageRoleEnum = pgEnum('message_role', ['student', 'agent', 'mentor', 'system']);
export const messageStatusEnum = pgEnum('message_status', ['draft', 'approved', 'sent']);
export const memoryTypeEnum = pgEnum('memory_type', ['short_term', 'long_term']);
export const progressStatusEnum = pgEnum('progress_status', ['not_started', 'in_progress', 'completed']);

// ============== TABLES ==============

// Users table (both mentors and students)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Students table (extends users with student-specific fields)
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  mentorId: uuid('mentor_id').references(() => users.id),
  enrollmentDate: timestamp('enrollment_date').defaultNow().notNull(),
  currentPhase: phaseEnum('current_phase').default('phase1').notNull(),
  phase1Start: timestamp('phase1_start').defaultNow(),
  phase2Start: timestamp('phase2_start'),
  currentTopicIndex: integer('current_topic_index').default(1), // 1-8 for Phase I topics
  currentMilestone: integer('current_milestone').default(0), // 0-4 for Phase II milestones
  researchTopic: text('research_topic'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'), // Array of tool calls made by the agent
  toolResults: jsonb('tool_results'), // Results from tool executions
  status: messageStatusEnum('status').default('sent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Memory table (for both short-term and long-term memory)
export const memory = pgTable('memory', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  memoryType: memoryTypeEnum('memory_type').notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // For short-term memory expiration
});

// Progress table (tracking Phase I topics and Phase II milestones)
export const progress = pgTable('progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  phase: phaseEnum('phase').notNull(),
  topicIndex: integer('topic_index'), // 1-8 for Phase I
  milestone: integer('milestone'), // 1-4 for Phase II
  status: progressStatusEnum('status').default('not_started').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Roadmaps table (Phase II research roadmaps)
export const roadmaps = pgTable('roadmaps', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  topic: varchar('topic', { length: 500 }).notNull(),
  content: jsonb('content').notNull(), // Full roadmap structure
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============== RELATIONS ==============

export const usersRelations = relations(users, ({ many }) => ({
  studentsAsMentor: many(students, { relationName: 'mentor' }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [students.mentorId],
    references: [users.id],
    relationName: 'mentor',
  }),
  conversations: many(conversations),
  memory: many(memory),
  progress: many(progress),
  roadmaps: many(roadmaps),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  student: one(students, {
    fields: [conversations.studentId],
    references: [students.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const memoryRelations = relations(memory, ({ one }) => ({
  student: one(students, {
    fields: [memory.studentId],
    references: [students.id],
  }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  student: one(students, {
    fields: [progress.studentId],
    references: [students.id],
  }),
}));

export const roadmapsRelations = relations(roadmaps, ({ one }) => ({
  student: one(students, {
    fields: [roadmaps.studentId],
    references: [students.id],
  }),
}));

// ============== TYPES ==============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Roadmap = typeof roadmaps.$inferSelect;
export type NewRoadmap = typeof roadmaps.$inferInsert;

// Enum types
export type UserRole = 'mentor' | 'student';
export type Phase = 'phase1' | 'phase2';
export type MessageRole = 'student' | 'agent' | 'mentor' | 'system';
export type MessageStatus = 'draft' | 'approved' | 'sent';
export type MemoryType = 'short_term' | 'long_term';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
