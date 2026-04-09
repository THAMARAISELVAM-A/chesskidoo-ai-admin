-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access for students" ON students;
DROP POLICY IF EXISTS "Public read access for coaches" ON coaches;
DROP POLICY IF EXISTS "Public read access for events" ON events;
DROP POLICY IF EXISTS "Public read access for achievements" ON achievements;
DROP POLICY IF EXISTS "Public read access for games" ON games;
DROP POLICY IF EXISTS "Public read access for payments" ON payments;

DROP POLICY IF EXISTS "Full access for authenticated users on students" ON students;
DROP POLICY IF EXISTS "Full access for authenticated users on coaches" ON coaches;
DROP POLICY IF EXISTS "Full access for authenticated users on events" ON events;
DROP POLICY IF EXISTS "Full access for authenticated users on achievements" ON achievements;
DROP POLICY IF EXISTS "Full access for authenticated users on games" ON games;
DROP POLICY IF EXISTS "Full access for authenticated users on payments" ON payments;

DROP POLICY IF EXISTS "Service role full access on students" ON students;
DROP POLICY IF EXISTS "Service role full access on coaches" ON coaches;
DROP POLICY IF EXISTS "Service role full access on events" ON events;
DROP POLICY IF EXISTS "Service role full access on achievements" ON achievements;
DROP POLICY IF EXISTS "Service role full access on games" ON games;
DROP POLICY IF EXISTS "Service role full access on payments" ON payments;

-- Allow public read access (for parent view)
CREATE POLICY "Public read access for students" ON students
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public read access for coaches" ON coaches
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public read access for events" ON events
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public read access for achievements" ON achievements
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public read access for games" ON games
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public read access for payments" ON payments
  FOR SELECT TO anon, authenticated, service_role USING (true);

-- Allow full access for authenticated users (admin)
CREATE POLICY "Full access for authenticated users on students" ON students
  FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access for authenticated users on coaches" ON coaches
  FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access for authenticated users on events" ON events
  FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access for authenticated users on achievements" ON achievements
  FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access for authenticated users on games" ON games
  FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access for authenticated users on payments" ON payments
  FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);