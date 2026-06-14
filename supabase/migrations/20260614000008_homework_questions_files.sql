-- Add questions_files column to homework_assignments for coach-uploaded homework materials
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS questions_files JSONB DEFAULT '[]'::jsonb;

-- Create index for efficient queries on questions_files
CREATE INDEX IF NOT EXISTS idx_homework_assignments_questions_files ON homework_assignments USING GIN (questions_files);