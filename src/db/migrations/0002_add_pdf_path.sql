-- Add pdf_path column to roadmaps table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/aetqtdbsckrdbiomltwj/sql

-- Add pdf_path column
ALTER TABLE roadmaps
ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);

-- Done!
SELECT 'pdf_path column added to roadmaps table!' as status;
