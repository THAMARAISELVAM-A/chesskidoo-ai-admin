-- Feature 5: Tournaments Schema Creation
-- Stores external tournament listings for both admin management and parent/student discovery.

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

-- Index on start_date for filtering out past events
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_city ON tournaments(city);

-- RLS policies
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_tournaments" ON tournaments;
DROP POLICY IF EXISTS "anon_read_tournaments" ON tournaments;
CREATE POLICY "service_role_all_tournaments" ON tournaments FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_tournaments" ON tournaments FOR SELECT TO anon USING (true);
