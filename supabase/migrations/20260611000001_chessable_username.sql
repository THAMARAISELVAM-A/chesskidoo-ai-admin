-- Migration: Add chessable_username to students table
-- Description: Adds a new column for tracking students' Chessable usernames, and updates students_decrypted view.

ALTER TABLE students ADD COLUMN IF NOT EXISTS chessable_username TEXT DEFAULT '';

-- Recreate view to include the new column
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

GRANT SELECT ON students_decrypted TO anon, authenticated, service_role;
