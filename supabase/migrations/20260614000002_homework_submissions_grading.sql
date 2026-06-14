-- Homework Submissions, File Uploads, Grading, and RLS Hardening
-- Extends the homework management schema with parent file submissions and coach grading.

CREATE TABLE IF NOT EXISTS homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL DEFAULT 'student' CHECK (target_type IN ('student', 'batch')),
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  batch_id UUID CONSTRAINT homework_assignments_batch_fkey REFERENCES batches(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  max_marks NUMERIC(5,2) DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT homework_assignments_single_target
    CHECK (
      (target_type = 'student' AND student_id IS NOT NULL AND batch_id IS NULL) OR
      (target_type = 'batch' AND batch_id IS NOT NULL AND student_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS homework_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  notes TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ,
  submission_notes TEXT DEFAULT '',
  submission_files JSONB DEFAULT '[]'::jsonb,
  grade_status TEXT DEFAULT 'ungraded' CHECK (grade_status IN ('ungraded', 'graded')),
  mark NUMERIC(5,2),
  graded_at TIMESTAMPTZ,
  graded_by TEXT DEFAULT '',
  coach_review TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  parent_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_assignments' AND column_name='max_marks') THEN
    ALTER TABLE homework_assignments ADD COLUMN max_marks NUMERIC(5,2) DEFAULT 100;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='submitted_at') THEN
    ALTER TABLE homework_completion ADD COLUMN submitted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='submission_notes') THEN
    ALTER TABLE homework_completion ADD COLUMN submission_notes TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='submission_files') THEN
    ALTER TABLE homework_completion ADD COLUMN submission_files JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='grade_status') THEN
    ALTER TABLE homework_completion ADD COLUMN grade_status TEXT DEFAULT 'ungraded' CHECK (grade_status IN ('ungraded', 'graded'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='mark') THEN
    ALTER TABLE homework_completion ADD COLUMN mark NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='graded_at') THEN
    ALTER TABLE homework_completion ADD COLUMN graded_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='graded_by') THEN
    ALTER TABLE homework_completion ADD COLUMN graded_by TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homework_completion' AND column_name='coach_review') THEN
    ALTER TABLE homework_completion ADD COLUMN coach_review TEXT DEFAULT '';
  END IF;
END $$;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'homework_assignments'::regclass
      AND contype = 'f'
      AND conname IN ('homework_assignments_batch_fkey', 'homework_assignments_batch_id_fkey')
  LOOP
    EXECUTE format('ALTER TABLE homework_assignments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'homework_assignments'::regclass
      AND contype = 'f'
      AND conname = 'homework_assignments_batch_fkey'
  ) THEN
    ALTER TABLE homework_assignments
      ADD CONSTRAINT homework_assignments_batch_fkey
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT;
  END IF;

  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'homework_assignments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%target_type%'
  LOOP
    EXECUTE format('ALTER TABLE homework_assignments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'homework_assignments'::regclass
      AND conname = 'homework_assignments_single_target'
  ) THEN
    ALTER TABLE homework_assignments DROP CONSTRAINT IF EXISTS homework_assignments_single_target;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'homework_assignments'::regclass
      AND conname = 'homework_assignments_single_target'
  ) THEN
    ALTER TABLE homework_assignments
      ADD CONSTRAINT homework_assignments_single_target
      CHECK (
        (target_type = 'student' AND student_id IS NOT NULL AND batch_id IS NULL) OR
        (target_type = 'batch' AND batch_id IS NOT NULL AND student_id IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_homework_assignments_target ON homework_assignments(target_type, student_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_due_date ON homework_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_status ON homework_assignments(status);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_created_at ON homework_assignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_student_created ON homework_assignments(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_batch_created ON homework_assignments(batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_homework_completion_assignment ON homework_completion(assignment_id);
CREATE INDEX IF NOT EXISTS idx_homework_completion_student ON homework_completion(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_completion_updated ON homework_completion(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_homework_completion_grade ON homework_completion(grade_status, mark);
CREATE INDEX IF NOT EXISTS idx_batches_student_ids_gin ON batches USING GIN (student_ids);

ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_completion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_homework_assignments" ON homework_assignments;
DROP POLICY IF EXISTS "anon_read_homework_assignments" ON homework_assignments;
DROP POLICY IF EXISTS "authenticated_read_homework_assignments" ON homework_assignments;
CREATE POLICY "service_role_all_homework_assignments" ON homework_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_homework_completion" ON homework_completion;
DROP POLICY IF EXISTS "anon_read_homework_completion" ON homework_completion;
DROP POLICY IF EXISTS "anon_write_homework_completion" ON homework_completion;
DROP POLICY IF EXISTS "authenticated_homework_completion" ON homework_completion;
CREATE POLICY "service_role_all_homework_completion" ON homework_completion FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-submissions',
  'Homework Submissions',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/x-chess-pgn',
    'text/x-chess-pgn'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
