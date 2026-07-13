-- Homework Management
-- Adds structured homework assignments for individual students and batches,
-- plus per-student completion tracking for parent-portal acknowledgements.

CREATE TABLE IF NOT EXISTS homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL DEFAULT 'student' CHECK (target_type IN ('student', 'batch')),
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  batch_id UUID CONSTRAINT homework_assignments_batch_fkey REFERENCES batches(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
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
  completed_at TIMESTAMPTZ,
  parent_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_homework_assignments_target ON homework_assignments(target_type, student_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_due_date ON homework_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_status ON homework_assignments(status);
CREATE INDEX IF NOT EXISTS idx_homework_completion_assignment ON homework_completion(assignment_id);
CREATE INDEX IF NOT EXISTS idx_homework_completion_student ON homework_completion(student_id);

ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_completion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_homework_assignments" ON homework_assignments;
DROP POLICY IF EXISTS "anon_read_homework_assignments" ON homework_assignments;
CREATE POLICY "service_role_all_homework_assignments" ON homework_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_homework_completion" ON homework_completion;
DROP POLICY IF EXISTS "anon_read_homework_completion" ON homework_completion;
CREATE POLICY "service_role_all_homework_completion" ON homework_completion FOR ALL TO service_role USING (true) WITH CHECK (true);
