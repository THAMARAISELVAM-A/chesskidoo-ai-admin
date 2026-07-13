-- Feature 1: Enhanced Attendance — Classwork & Homework Notes
-- Adds two unlimited-text columns for per-session classwork and homework notes.
-- These are surfaced in the Admin attendance marking modal and in the Parent Portal
-- attendance report.

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS classwork_notes TEXT DEFAULT '';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS homework_notes TEXT DEFAULT '';

-- Backfill: no data to migrate — new columns default to empty string.
