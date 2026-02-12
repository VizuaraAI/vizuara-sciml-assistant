-- Vizuara Teaching Assistant Seed Data
-- Run this AFTER 0001_create_schema.sql in Supabase SQL Editor

-- Create mentor user (Dr. Raj Dandekar)
-- Password: mentor123 (bcrypt hash)
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dr. Raj Dandekar', 'raj@vizuara.com', '$2a$10$8K1p/a0dR1xqM8K3hM8ui.MhXKs2B.CjYcM0TzHlQvDjHTSJWKJYm', 'mentor')
ON CONFLICT (email) DO NOTHING;

-- Create test student users
-- Password: student123 (bcrypt hash)
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Alice Johnson', 'alice@student.com', '$2a$10$rZ3mNvF6T2E2N5K7hL9xuO0FJpQHXxKqL8M6N9O0P1Q2R3S4T5U6V', 'student'),
  ('00000000-0000-0000-0000-000000000003', 'Bob Smith', 'bob@student.com', '$2a$10$rZ3mNvF6T2E2N5K7hL9xuO0FJpQHXxKqL8M6N9O0P1Q2R3S4T5U6V', 'student'),
  ('00000000-0000-0000-0000-000000000004', 'Carol White', 'carol@student.com', '$2a$10$rZ3mNvF6T2E2N5K7hL9xuO0FJpQHXxKqL8M6N9O0P1Q2R3S4T5U6V', 'student')
ON CONFLICT (email) DO NOTHING;

-- Create student profiles
INSERT INTO students (id, user_id, mentor_id, current_phase, current_topic_index, current_milestone) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'phase1', 3, 0),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'phase1', 1, 0),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'phase2', 8, 2)
ON CONFLICT DO NOTHING;

-- Create conversations for each student
INSERT INTO conversations (id, student_id) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103')
ON CONFLICT DO NOTHING;

-- Add some initial progress for students
INSERT INTO progress (student_id, phase, topic_index, status) VALUES
  ('00000000-0000-0000-0000-000000000101', 'phase1', 1, 'completed'),
  ('00000000-0000-0000-0000-000000000101', 'phase1', 2, 'completed'),
  ('00000000-0000-0000-0000-000000000101', 'phase1', 3, 'in_progress'),
  ('00000000-0000-0000-0000-000000000102', 'phase1', 1, 'in_progress'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 1, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 2, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 3, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 4, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 5, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 6, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 7, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase1', 8, 'completed')
ON CONFLICT DO NOTHING;

-- Add Phase II progress for Carol (she's in Phase 2)
INSERT INTO progress (student_id, phase, milestone, status) VALUES
  ('00000000-0000-0000-0000-000000000103', 'phase2', 1, 'completed'),
  ('00000000-0000-0000-0000-000000000103', 'phase2', 2, 'in_progress')
ON CONFLICT DO NOTHING;

-- Set Carol's research topic
UPDATE students
SET research_topic = 'Retrieval-Augmented Generation for Scientific Literature'
WHERE id = '00000000-0000-0000-0000-000000000103';

-- Done!
SELECT 'Seed data inserted successfully!' as status;
SELECT 'Test accounts created:' as info;
SELECT '  Mentor: raj@vizuara.com / mentor123' as mentor_login;
SELECT '  Students: alice@student.com, bob@student.com, carol@student.com / student123' as student_logins;
