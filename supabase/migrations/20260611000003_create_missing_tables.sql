-- =====================================================
-- CREATE MISSING TABLES: batches & tournaments
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- Date: June 11, 2026
-- =====================================================

-- ─── 1. Batches Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT '',
    coach_id TEXT,
    level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'Elite')),
    days TEXT DEFAULT '',
    time_slot TEXT DEFAULT '',
    student_ids JSONB DEFAULT '[]'::JSONB,
    max_capacity INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT DEFAULT '',
    chessable_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read batches
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'batches_select_policy' AND tablename = 'batches') THEN
    CREATE POLICY batches_select_policy ON batches FOR SELECT USING (true);
  END IF;
END $$;

-- Allow service role full access to batches
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'batches_service_all' AND tablename = 'batches') THEN
    CREATE POLICY batches_service_all ON batches FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ─── 2. Tournaments Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    start_date DATE,
    location TEXT DEFAULT '',
    city TEXT DEFAULT 'chennai',
    entry_fee NUMERIC(10,2) DEFAULT 0,
    rating_required TEXT DEFAULT 'Open',
    elo_limit INTEGER DEFAULT 9999,
    registration_url TEXT DEFAULT '',
    organizer TEXT DEFAULT 'FIDE',
    source TEXT DEFAULT 'manual',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for tournaments
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read tournaments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tournaments_select_policy' AND tablename = 'tournaments') THEN
    CREATE POLICY tournaments_select_policy ON tournaments FOR SELECT USING (true);
  END IF;
END $$;

-- Allow service role full access to tournaments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tournaments_service_all' AND tablename = 'tournaments') THEN
    CREATE POLICY tournaments_service_all ON tournaments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── 3. Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_batches_coach ON batches(coach_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_city ON tournaments(city);
