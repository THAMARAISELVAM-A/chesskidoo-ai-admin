-- Add questions_files column to homework_assignments for coach-uploaded homework materials
-- This migration should be run after homework_submissions_grading.sql which creates the table
-- If the table doesn't exist yet, this will safely skip
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'homework_assignments'
  ) THEN
    -- Add column if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'homework_assignments' AND column_name = 'questions_files'
    ) THEN
      ALTER TABLE homework_assignments ADD COLUMN questions_files JSONB DEFAULT '[]'::JSONB;
    END IF;
    
    -- Create index if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'homework_assignments' AND indexname = 'idx_homework_assignments_questions_files'
    ) THEN
      CREATE INDEX idx_homework_assignments_questions_files ON homework_assignments USING GIN (questions_files);
    END IF;
  END IF;
END $$;