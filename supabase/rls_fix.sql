-- =====================================================
-- RLS SECURITY FIX - Run in Supabase SQL Editor
-- =====================================================

-- First, enable RLS on all tables if not already enabled
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STUDENTS - Secure policies
-- =====================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "students_select_all" ON students;
DROP POLICY IF EXISTS "students_insert_all" ON students;
DROP POLICY IF EXISTS "students_update_all" ON students;
DROP POLICY IF EXISTS "students_delete_all" ON students;
DROP POLICY IF EXISTS "Allow public SELECT students" ON students;
DROP POLICY IF EXISTS "Allow anon UPDATE students" ON students;
DROP POLICY IF EXISTS "Allow anon DELETE students" ON students;

-- Create secure policies for students
-- Public can read (SELECT) - needed for the app to work
CREATE POLICY "Public can read students" ON students 
  FOR SELECT USING (true);

-- Only authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "Auth can insert students" ON students 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth can update students" ON students 
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth can delete students" ON students 
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- COACHES - Secure policies
-- =====================================================

DROP POLICY IF EXISTS "coaches_select_all" ON coaches;
DROP POLICY IF EXISTS "coaches_insert_all" ON coaches;
DROP POLICY IF EXISTS "coaches_update_all" ON coaches;
DROP POLICY IF EXISTS "coaches_delete_all" ON coaches;

CREATE POLICY "Public can read coaches" ON coaches 
  FOR SELECT USING (true);

CREATE POLICY "Auth can insert coaches" ON coaches 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth can update coaches" ON coaches 
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth can delete coaches" ON coaches 
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- EVENTS - Secure policies
-- =====================================================

DROP POLICY IF EXISTS "events_select_all" ON events;
DROP POLICY IF EXISTS "events_insert_all" ON events;
DROP POLICY IF EXISTS "events_update_all" ON events;
DROP POLICY IF EXISTS "events_delete_all" ON events;

CREATE POLICY "Public can read events" ON events 
  FOR SELECT USING (true);

CREATE POLICY "Auth can insert events" ON events 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth can update events" ON events 
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth can delete events" ON events 
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- ACHIEVEMENTS - Secure policies
-- =====================================================

DROP POLICY IF EXISTS "achievements_select_all" ON achievements;
DROP POLICY IF EXISTS "achievements_insert_all" ON achievements;
DROP POLICY IF EXISTS "achievements_update_all" ON achievements;
DROP POLICY IF EXISTS "achievements_delete_all" ON achievements;

CREATE POLICY "Public can read achievements" ON achievements 
  FOR SELECT USING (true);

CREATE POLICY "Auth can insert achievements" ON achievements 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth can update achievements" ON achievements 
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth can delete achievements" ON achievements 
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- PAYMENTS - Read-only for public, auth for writes
-- =====================================================

DROP POLICY IF EXISTS "payments_select_all" ON payments;
DROP POLICY IF EXISTS "payments_insert_all" ON payments;
DROP POLICY IF EXISTS "payments_update_all" ON payments;
DROP POLICY IF EXISTS "payments_delete_all" ON payments;

CREATE POLICY "Public can read payments" ON payments 
  FOR SELECT USING (true);

CREATE POLICY "Auth can insert payments" ON payments 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth can update payments" ON payments 
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth can delete payments" ON payments 
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- MESSAGES - Read for all, auth for writes
-- =====================================================

DROP POLICY IF EXISTS "messages_select_all" ON messages;
DROP POLICY IF EXISTS "messages_insert_all" ON messages;
DROP POLICY IF EXISTS "messages_update_all" ON messages;
DROP POLICY IF EXISTS "messages_delete_all" ON messages;

CREATE POLICY "Public can read messages" ON messages 
  FOR SELECT USING (true);

CREATE POLICY "Auth can insert messages" ON messages 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth can update messages" ON messages 
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth can delete messages" ON messages 
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- Verify policies
-- =====================================================

-- Check created policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;