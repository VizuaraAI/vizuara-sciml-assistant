-- Add accepted column to roadmaps table
-- This tracks whether the student has accepted the research roadmap
-- Once accepted, the roadmap will be included in the AI context

ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS accepted BOOLEAN DEFAULT FALSE;

-- Update existing roadmaps to be accepted by default (for backward compatibility)
UPDATE roadmaps SET accepted = TRUE WHERE accepted IS NULL;
