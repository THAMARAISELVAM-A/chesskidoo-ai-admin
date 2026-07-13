-- Homework lifecycle and notification support
-- Adds submission state tracking, revision metadata, review workflow fields,
-- notification scheduling, and notification grouping for batch reminders.

ALTER TABLE homework_assignments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at_date DATE;

ALTER TABLE homework_completion
  ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted' CHECK (submission_status IN ('submitted', 'late', 'missing', 'excused', 'resubmitted')),
  ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_action TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_action_by TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_group_id UUID,
  ADD COLUMN IF NOT EXISTS notification_batch_id UUID,
  ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_closed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS homework_notification_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID,
  batch_id UUID,
  scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'batch', 'student')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_groups_homework ON homework_notification_groups(homework_id);
CREATE INDEX IF NOT EXISTS idx_notification_groups_batch ON homework_notification_groups(batch_id);
CREATE INDEX IF NOT EXISTS idx_notification_groups_status ON homework_notification_groups(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_homework_completion_lifecycle ON homework_completion(submission_status, revision_count, notification_sent);
CREATE INDEX IF NOT EXISTS idx_homework_completion_review ON homework_completion(next_action, review_started_at);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_due_notification ON homework_assignments(due_date, reminder_sent_at);
