-- Add coach_id to homework_assignments for batch-based assignment tracking
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL;

-- Create index for coach-based queries
CREATE INDEX IF NOT EXISTS idx_homework_assignments_coach ON homework_assignments(coach_id);