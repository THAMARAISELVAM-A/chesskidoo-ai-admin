-- Feature 3: Batch / Classroom Management
-- Stores coaching batches dynamically instead of the hardcoded schedule array.
-- Each batch belongs to one coach, has a level tier, day/time schedule, and a
-- list of assigned student UUIDs.

CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                             -- e.g. "Batch 1", "Evening Group A"
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner','Intermediate','Advanced','Elite')),
  days TEXT DEFAULT '',                           -- e.g. "Monday & Wednesday"
  time_slot TEXT DEFAULT '',                      -- e.g. "6:00 PM - 7:00 PM"
  student_ids JSONB DEFAULT '[]'::jsonb,          -- Array of student UUID strings
  max_capacity INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  notes TEXT DEFAULT '',
  chessable_url TEXT DEFAULT '',                  -- Link to external Chessable Classroom
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alter students table to add batch_id column for direct relation
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_batches_coach ON batches(coach_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);

-- RLS policies — match existing pattern
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_batches" ON batches;
DROP POLICY IF EXISTS "anon_read_batches" ON batches;
CREATE POLICY "service_role_all_batches" ON batches FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_batches" ON batches FOR SELECT TO anon USING (true);
