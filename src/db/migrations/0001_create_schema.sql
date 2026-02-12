-- Vizuara Teaching Assistant Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/aetqtdbsckrdbiomltwj/sql

-- ============== ENUMS ==============

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('mentor', 'student');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE phase AS ENUM ('phase1', 'phase2');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('student', 'agent', 'mentor', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('draft', 'approved', 'sent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE memory_type AS ENUM ('short_term', 'long_term');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============== TABLES ==============

-- Users table (both mentors and students)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Students table (extends users with student-specific fields)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mentor_id UUID REFERENCES users(id),
  enrollment_date TIMESTAMP DEFAULT NOW() NOT NULL,
  current_phase phase DEFAULT 'phase1' NOT NULL,
  phase1_start TIMESTAMP DEFAULT NOW(),
  phase2_start TIMESTAMP,
  current_topic_index INTEGER DEFAULT 1,
  current_milestone INTEGER DEFAULT 0,
  research_topic TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role message_role NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  status message_status DEFAULT 'sent' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Memory table (for both short-term and long-term memory)
CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  memory_type memory_type NOT NULL,
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP
);

-- Progress table (tracking Phase I topics and Phase II milestones)
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  phase phase NOT NULL,
  topic_index INTEGER,
  milestone INTEGER,
  status progress_status DEFAULT 'not_started' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Roadmaps table (Phase II research roadmaps)
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  topic VARCHAR(500) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============== INDEXES ==============

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_memory_student_id ON memory(student_id);
CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON progress(student_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_student_id ON roadmaps(student_id);

-- ============== ROW LEVEL SECURITY (Optional) ==============
-- Enable RLS on all tables (you can configure policies later)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you should restrict this in production)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for memory" ON memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for progress" ON progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for roadmaps" ON roadmaps FOR ALL USING (true) WITH CHECK (true);

-- Done!
SELECT 'Schema created successfully!' as status;
