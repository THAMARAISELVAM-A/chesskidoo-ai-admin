-- =====================================================
-- COMPLETE DATABASE MIGRATION FOR EXPANSION FEATURES
-- Run this file in: Supabase Dashboard -> SQL Editor -> New Query
-- =====================================================

-- ─── 1. Attendance Table Enhancements ────────────────
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS classwork_notes TEXT DEFAULT '';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS homework_notes TEXT DEFAULT '';

-- ─── 2. Students Table Chess Platform Columns ─────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS lichess_username TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS chesscom_username TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS chessable_username TEXT DEFAULT '';

-- ─── 3. Batches Table Creation ───────────────────────
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
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

-- Alter students table to add batch_id column for direct relation
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;

-- Indexes for batches
CREATE INDEX IF NOT EXISTS idx_batches_coach ON batches(coach_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);

-- Enable RLS for batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_batches" ON batches;
DROP POLICY IF EXISTS "anon_read_batches" ON batches;
CREATE POLICY "service_role_all_batches" ON batches FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_batches" ON batches FOR SELECT TO anon USING (true);

-- ─── 4. Tournaments Table Creation ───────────────────
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

-- Indexes for tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_city ON tournaments(city);

-- Enable RLS for tournaments
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_tournaments" ON tournaments;
DROP POLICY IF EXISTS "anon_read_tournaments" ON tournaments;
CREATE POLICY "service_role_all_tournaments" ON tournaments FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_tournaments" ON tournaments FOR SELECT TO anon USING (true);

-- ─── 5. Recreate Decrypted View to Propagate Columns ───
-- This is critical so the Edge Functions (which query students_decrypted)
-- can read and write lichess_username, chesscom_username, and batch_id!
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
  created_at,
  updated_at
FROM students;

-- Grant Select access on the view to public roles
GRANT SELECT ON students_decrypted TO anon, authenticated, service_role;
