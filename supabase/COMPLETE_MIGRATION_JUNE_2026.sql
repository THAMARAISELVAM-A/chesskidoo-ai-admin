-- =====================================================
-- COMPLETE DATABASE MIGRATION FOR EXPANSION FEATURES & V4 BILLING ENGINE
-- Date: June 11, 2026
-- Run this file in: Supabase Dashboard -> SQL Editor -> New Query
-- =====================================================

-- ─── 1. Core Table Modifications (Add Missing Columns Safely) ──────────

-- Add columns to students table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='country_code') THEN
    ALTER TABLE students ADD COLUMN country_code TEXT DEFAULT 'IN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='lichess_username') THEN
    ALTER TABLE students ADD COLUMN lichess_username TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='chesscom_username') THEN
    ALTER TABLE students ADD COLUMN chesscom_username TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='chessable_username') THEN
    ALTER TABLE students ADD COLUMN chessable_username TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='payment_status') THEN
    ALTER TABLE students ADD COLUMN payment_status TEXT DEFAULT 'Pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='credit_balance') THEN
    ALTER TABLE students ADD COLUMN credit_balance NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='outstanding_balance') THEN
    ALTER TABLE students ADD COLUMN outstanding_balance NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='billing_anchor_year') THEN
    ALTER TABLE students ADD COLUMN billing_anchor_year INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='billing_anchor_month') THEN
    ALTER TABLE students ADD COLUMN billing_anchor_month INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='last_payment_applied_month') THEN
    ALTER TABLE students ADD COLUMN last_payment_applied_month TEXT;
  END IF;
END $$;

-- Add columns to payments table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='applied_month') THEN
    ALTER TABLE payments ADD COLUMN applied_month TEXT;
  END IF;
END $$;

-- Add columns to attendance table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='classwork_notes') THEN
    ALTER TABLE attendance ADD COLUMN classwork_notes TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='homework_notes') THEN
    ALTER TABLE attendance ADD COLUMN homework_notes TEXT DEFAULT '';
  END IF;
END $$;

-- ─── 2. Create Supporting Tables (Rate Limits, Batches, Tournaments) ─────

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL,
  endpoint   TEXT        NOT NULL DEFAULT 'default',
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_ts ON rate_limits (key, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ts ON rate_limits (timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits (endpoint, timestamp DESC);

-- Enable RLS for rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role only" ON rate_limits;
CREATE POLICY "service_role only" ON rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create batches table (with coach_id as TEXT to match coaches.id)
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coach_id TEXT REFERENCES coaches(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner','Intermediate','Advanced','Elite')),
  days TEXT DEFAULT '',
  time_slot TEXT DEFAULT '',
  student_ids JSONB DEFAULT '[]'::jsonb,
  max_capacity INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  notes TEXT DEFAULT '',
  chessable_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add batch_id to students table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='batch_id') THEN
    ALTER TABLE students ADD COLUMN batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_batches_coach ON batches(coach_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);

-- Homework assignments for individual students and batches
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
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS for batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_batches" ON batches;
DROP POLICY IF EXISTS "anon_read_batches" ON batches;
CREATE POLICY "service_role_all_batches" ON batches FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_batches" ON batches FOR SELECT TO anon USING (true);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  location TEXT DEFAULT '',
  city TEXT DEFAULT 'chennai',
  entry_fee NUMERIC DEFAULT 0,
  rating_required TEXT DEFAULT 'Open',
  elo_limit INTEGER DEFAULT 9999,
  registration_url TEXT DEFAULT '',
  organizer TEXT DEFAULT 'FIDE',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_city ON tournaments(city);

-- Enable RLS for tournaments
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_tournaments" ON tournaments;
DROP POLICY IF EXISTS "anon_read_tournaments" ON tournaments;
CREATE POLICY "service_role_all_tournaments" ON tournaments FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_tournaments" ON tournaments FOR SELECT TO anon USING (true);

-- Create payment_allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  payment_id TEXT REFERENCES payments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  allocated_month TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  allocation_type TEXT DEFAULT 'DIRECT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_alloc_student ON payment_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_month ON payment_allocations(allocated_month);

-- Enable RLS for payment_allocations
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on payment_allocations" ON payment_allocations;
CREATE POLICY "Allow all on payment_allocations" ON payment_allocations FOR ALL USING (true);

-- ─── 3. Backfill Billing Anchors for Students ────────────────────────

DO $$
DECLARE
  r RECORD;
  v_enroll_date DATE;
  v_baseline DATE := DATE '2026-04-01';
  v_year INT;
  v_month INT;
BEGIN
  FOR r IN SELECT id, enrollment_date, created_at FROM students WHERE billing_anchor_year IS NULL LOOP
    v_enroll_date := COALESCE(
      r.enrollment_date::DATE,
      r.created_at::DATE,
      v_baseline
    );
    IF v_enroll_date < v_baseline THEN v_enroll_date := v_baseline; END IF;
    v_year := EXTRACT(YEAR FROM v_enroll_date)::INT;
    v_month := EXTRACT(MONTH FROM v_enroll_date)::INT;
    IF EXTRACT(DAY FROM v_enroll_date) >= 26 THEN
      v_month := v_month + 1;
      IF v_month > 12 THEN v_month := 1; v_year := v_year + 1; END IF;
    END IF;
    UPDATE students SET billing_anchor_year = v_year, billing_anchor_month = v_month WHERE id = r.id;
  END LOOP;
END $$;

-- ─── 4. Recreate View: students_decrypted with ALL columns ───────────

DROP VIEW IF EXISTS students_decrypted;

CREATE OR REPLACE VIEW students_decrypted AS
SELECT 
  id,
  name,
  decrypt_pii(phone) as phone,
  decrypt_pii(parent_phone) as parent_phone,
  decrypt_pii(email) as email,
  age,
  grade,
  parent_name,
  decrypt_pii(address) as address,
  country_code,
  enrollment_date,
  status,
  coach_id,
  rating,
  session_mode,
  session_time,
  monthly_fee,
  notes,
  account_status,
  due_date,
  batch_id,
  lichess_username,
  chesscom_username,
  chessable_username,
  payment_status,
  credit_balance,
  outstanding_balance,
  billing_anchor_year,
  billing_anchor_month,
  last_payment_applied_month,
  created_at,
  updated_at
FROM students;

GRANT SELECT ON students_decrypted TO anon, authenticated, service_role;

-- ─── 5. Core V4 Financial Functions ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_payment_debt_first(
  p_student_id  TEXT,
  p_payment_id  TEXT,
  p_amount       NUMERIC,
  p_paid_on      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_target_month TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_student    RECORD;
  v_anchor_year INT;
  v_anchor_month INT;
  v_target_key TEXT;
  v_target_year INT;
  v_target_month_num INT;
  v_remaining NUMERIC := p_amount;
  v_allocated NUMERIC := 0;
  v_result JSONB := '[]'::JSONB;
  v_owed NUMERIC;
  v_allocation NUMERIC;
  v_fee NUMERIC;
  v_next_month_num INT;
  v_next_year INT;
  v_next_key TEXT;
  v_cursor_year INT;
  v_cursor_month_num INT;
  v_cursor_key TEXT;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Student not found'); END IF;

  v_anchor_year := COALESCE(v_student.billing_anchor_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
  v_anchor_month := COALESCE(v_student.billing_anchor_month, EXTRACT(MONTH FROM CURRENT_DATE)::INT);
  v_fee := COALESCE(v_student.monthly_fee, 5000);

  IF p_target_month IS NULL THEN
    v_target_key := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  ELSE
    v_target_key := p_target_month;
  END IF;
  v_target_year := SUBSTRING(v_target_key FROM 1 FOR 4)::INT;
  v_target_month_num := SUBSTRING(v_target_key FROM 6 FOR 2)::INT;

  v_cursor_year := v_anchor_year;
  v_cursor_month_num := v_anchor_month;

  WHILE (v_cursor_year < v_target_year OR (v_cursor_year = v_target_year AND v_cursor_month_num < v_target_month_num))
    AND v_remaining > 0 LOOP

    v_cursor_key := v_cursor_year || '-' || LPAD(v_cursor_month_num::TEXT, 2, '0');

    SELECT COALESCE(SUM(amount), 0) INTO v_owed
    FROM payment_allocations
    WHERE student_id = p_student_id AND allocated_month = v_cursor_key;

    IF COALESCE(v_owed, 0) < v_fee THEN
      v_owed := v_fee - COALESCE(v_owed, 0);

      IF v_remaining >= v_owed THEN
        v_allocation := v_owed;
        v_remaining := v_remaining - v_owed;
      ELSE
        v_allocation := v_remaining;
        v_remaining := 0;
      END IF;

      INSERT INTO payment_allocations (payment_id, student_id, allocated_month, amount, allocation_type, description)
      VALUES (p_payment_id, p_student_id, v_cursor_key, v_allocation, 'DEBT_CLEAR',
              'Applied to ' || v_cursor_key);

      v_result := v_result || jsonb_build_object('month', v_cursor_key, 'allocated', v_allocation, 'type', 'DEBT_CLEAR');
      v_allocated := v_allocated + v_allocation;
    END IF;

    v_cursor_month_num := v_cursor_month_num + 1;
    IF v_cursor_month_num > 12 THEN v_cursor_month_num := 1; v_cursor_year := v_cursor_year + 1; END IF;
  END LOOP;

  IF v_remaining > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_owed
    FROM payment_allocations
    WHERE student_id = p_student_id AND allocated_month = v_target_key;
    v_owed := v_fee - COALESCE(v_owed, 0);

    IF v_remaining >= v_owed THEN
      v_allocation := v_owed;
      v_remaining := v_remaining - v_owed;
    ELSE
      v_allocation := v_remaining;
      v_remaining := 0;
    END IF;

    INSERT INTO payment_allocations (payment_id, student_id, allocated_month, amount, allocation_type, description)
    VALUES (p_payment_id, p_student_id, v_target_key, v_allocation, 'DIRECT',
            'Applied to ' || v_target_key);

    v_result := v_result || jsonb_build_object('month', v_target_key, 'allocated', v_allocation, 'type', 'DIRECT');
    v_allocated := v_allocated + v_allocation;
  END IF;

  IF v_remaining > 0 THEN
    v_next_month_num := v_target_month_num + 1;
    v_next_year := v_target_year;
    IF v_next_month_num > 12 THEN v_next_month_num := 1; v_next_year := v_next_year + 1; END IF;
    v_next_key := v_next_year || '-' || LPAD(v_next_month_num::TEXT, 2, '0');

    INSERT INTO payment_allocations (payment_id, student_id, allocated_month, amount, allocation_type, description)
    VALUES (p_payment_id, p_student_id, v_next_key, v_remaining, 'CREDIT_ROLLOVER',
            'Excess from ' || v_target_key || ' rolled forward to ' || v_next_key);

    v_result := v_result || jsonb_build_object('month', v_next_key, 'allocated', v_remaining, 'type', 'CREDIT_ROLLOVER');
    v_allocated := v_allocated + v_remaining;
    v_remaining := 0;
  END IF;

  UPDATE payments SET applied_month = v_target_key WHERE id = p_payment_id;

  UPDATE students SET
    credit_balance = 0,
    last_payment_applied_month = v_target_key
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'allocations', v_result,
    'carry_forward', v_remaining,
    'total_allocated', v_allocated,
    'target_month', v_target_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_student_financial_state(
  p_student_id TEXT,
  p_month TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_student RECORD;
  v_month TEXT;
  v_year INT;
  v_month_num INT;
  v_anchor_year INT;
  v_anchor_month INT;
  v_fee NUMERIC;
  v_month_allocated NUMERIC;
  v_credit NUMERIC;
  v_status TEXT;
  v_due_date DATE;
  v_today DATE := CURRENT_DATE;
  v_days_late INT;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Student not found'); END IF;

  v_fee := COALESCE(v_student.monthly_fee, 5000);
  v_credit := COALESCE(v_student.credit_balance, 0);
  v_anchor_year := COALESCE(v_student.billing_anchor_year, EXTRACT(YEAR FROM v_today)::INT);
  v_anchor_month := COALESCE(v_student.billing_anchor_month, EXTRACT(MONTH FROM v_today)::INT);

  IF p_month IS NULL THEN
    v_month := TO_CHAR(v_today, 'YYYY-MM');
  ELSE
    v_month := p_month;
  END IF;
  v_year := SUBSTRING(v_month FROM 1 FOR 4)::INT;
  v_month_num := SUBSTRING(v_month FROM 6 FOR 2)::INT;

  SELECT COALESCE(SUM(amount), 0) INTO v_month_allocated
  FROM payment_allocations
  WHERE student_id = p_student_id AND allocated_month = v_month;

  v_due_date := COALESCE(v_student.due_date, MAKE_DATE(v_year, v_month_num, 5));

  IF v_month_allocated >= v_fee THEN
    v_status := 'Paid';
  ELSIF v_today < v_due_date THEN
    v_status := 'Pending';
  ELSE
    v_days_late := (v_today - v_due_date);
    IF v_days_late > 5 THEN
      v_status := 'Overdue';
    ELSE
      v_status := 'Due';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'month', v_month,
    'monthly_fee', v_fee,
    'month_allocated', v_month_allocated,
    'month_outstanding', GREATEST(0, v_fee - v_month_allocated),
    'credit_balance', v_credit,
    'status', v_status,
    'due_date', TO_CHAR(v_due_date, 'YYYY-MM-DD'),
    'billing_anchor', v_anchor_year || '-' || LPAD(v_anchor_month::TEXT, 2, '0')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.monthly_rollover_job_v4()
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_old_month TEXT := TO_CHAR((v_today - INTERVAL '1 month'), 'YYYY-MM');
  v_new_month TEXT := TO_CHAR(v_today, 'YYYY-MM');
  v_student RECORD;
  v_old_allocated NUMERIC;
  v_fee NUMERIC;
  v_carry_credit NUMERIC := 0;
  v_new_status TEXT;
  v_count INT := 0;
  v_due_date DATE;
  v_days_late INT;
BEGIN
  FOR v_student IN SELECT * FROM students WHERE status = 'active' LOOP
    v_fee := COALESCE(v_student.monthly_fee, 5000);

    SELECT COALESCE(SUM(amount), 0) INTO v_old_allocated
    FROM payment_allocations
    WHERE student_id = v_student.id AND allocated_month = v_old_month;

    IF v_old_allocated >= v_fee THEN
      v_carry_credit := v_old_allocated - v_fee;
      IF v_carry_credit > 0 THEN
        INSERT INTO payment_allocations (student_id, allocated_month, amount, allocation_type, description)
        VALUES (v_student.id, v_new_month, v_carry_credit, 'CREDIT_ROLLOVER',
          'Auto-rollover credit from ' || v_old_month);
      END IF;
      v_new_status := 'Paid';
    ELSE
      v_carry_credit := 0;
      v_due_date := COALESCE(v_student.due_date, MAKE_DATE(EXTRACT(YEAR FROM v_today)::INT, EXTRACT(MONTH FROM v_today)::INT, 5));
      IF v_today < v_due_date THEN
        v_new_status := 'Pending';
      ELSE
        v_days_late := (v_today - v_due_date);
        IF v_days_late > 5 THEN
          v_new_status := 'Overdue';
        ELSE
          v_new_status := 'Due';
        END IF;
      END IF;
    END IF;

    v_count := v_count + 1;

    UPDATE students SET
      credit_balance = GREATEST(0, v_carry_credit),
      payment_status = v_new_status,
      last_payment_applied_month = v_new_month
    WHERE id = v_student.id;
  END LOOP;

  INSERT INTO audit_logs(table_name, action, new_value)
  VALUES ('students', 'MONTHOW_ROLLOVER_V4', jsonb_build_object('old_month', v_old_month, 'new_month', v_new_month, 'count', v_count));

  RETURN jsonb_build_object('old_month', v_old_month, 'new_month', v_new_month, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.recalc_student_balances()
RETURNS TRIGGER AS $$
DECLARE
  sid TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    sid := OLD.student_id;
  ELSE
    sid := NEW.student_id;
  END IF;

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recalc_balances_trigger ON payment_allocations;
CREATE TRIGGER recalc_balances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.recalc_student_balances();

-- ─── 6. Redefine update_payment_status to use v4 financial engine ──────

CREATE OR REPLACE FUNCTION public.update_payment_status(
  p_year   INT,
  p_month1 INT,
  p_month2 INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_student RECORD;
  v_month_key TEXT;
  v_state JSONB;
  v_count INT := 0;
  v_paid INT := 0;
  v_pending INT := 0;
  v_due INT := 0;
  v_overdue INT := 0;
BEGIN
  v_month_key := p_year || '-' || LPAD(p_month1::TEXT, 2, '0');
  
  FOR v_student IN SELECT * FROM public.students WHERE status = 'active' LOOP
    -- Call the financial state calculator for this student and month
    v_state := public.get_student_financial_state(v_student.id, v_month_key);
    
    -- Update the denormalized fields on the student record
    UPDATE public.students SET
      payment_status = (v_state->>'status'),
      credit_balance = (v_state->>'credit_balance')::NUMERIC,
      outstanding_balance = (v_state->>'month_outstanding')::NUMERIC
    WHERE id = v_student.id;
    
    IF (v_state->>'status') = 'Paid' THEN v_paid := v_paid + 1;
    ELSIF (v_state->>'status') = 'Pending' THEN v_pending := v_pending + 1;
    ELSIF (v_state->>'status') = 'Due' THEN v_due := v_due + 1;
    ELSIF (v_state->>'status') = 'Overdue' THEN v_overdue := v_overdue + 1;
    END IF;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'count', v_count,
    'paid', v_paid,
    'pending', v_pending,
    'due', v_due,
    'overdue', v_overdue,
    'year', p_year,
    'month1', p_month1,
    'run_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Recount Cron Schedules Safely ─────────────────────────────────
DO $$
BEGIN
  -- Only execute if pg_cron is active and its schema exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing jobs if they exist
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-payment-rollover') THEN
      PERFORM cron.unschedule('monthly-payment-rollover');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-payment-sync') THEN
      PERFORM cron.unschedule('daily-payment-sync');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-payment-rollover-v4') THEN
      PERFORM cron.unschedule('monthly-payment-rollover-v4');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-payment-sync-v4') THEN
      PERFORM cron.unschedule('daily-payment-sync-v4');
    END IF;

    -- Schedule new v4 jobs
    PERFORM cron.schedule('monthly-payment-rollover-v4', '1 0 1 * *', 'SELECT public.monthly_rollover_job_v4();');
    PERFORM cron.schedule('daily-payment-sync-v4', '5 0 * * *', 'SELECT public.update_payment_status(EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT);');
  ELSE
    RAISE NOTICE 'pg_cron extension not found, skipping cron schedule setup';
  END IF;
END $$;

-- ─── 8. Synchronize Statuses immediately for June 2026 ──────────────

SELECT public.update_payment_status(2026, 6);
