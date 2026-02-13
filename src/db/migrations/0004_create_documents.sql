-- Create document_type enum
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('roadmap', 'research_interests', 'knowledge_resource', 'manuscript', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  document_type document_type NOT NULL,
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path VARCHAR(1000) NOT NULL,
  public_url VARCHAR(1000),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
