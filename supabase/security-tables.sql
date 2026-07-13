-- Login Attempts table for security tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  password_attempt TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  location TEXT,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lock_expires TIMESTAMP
);

-- Operations Log table
CREATE TABLE IF NOT EXISTS operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  table_name TEXT,
  user_type TEXT CHECK (user_type IN ('master', 'admin', 'parent', 'coach', 'system')),
  user_id TEXT,
  user_name TEXT,
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(username, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_status ON login_attempts(status, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_operations_log_type ON operations_log(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_log_user ON operations_log(user_type, user_id, created_at DESC);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_log ENABLE ROW LEVEL SECURITY;

-- SECURITY: Only service_role (Edge Functions) can access login_attempts
-- The anon role must NOT have access to authentication logs
CREATE POLICY "service_role_all_login_attempts" ON login_attempts FOR ALL TO service_role USING (true);

-- SECURITY: Only service_role (Edge Functions) can access operations_log
CREATE POLICY "service_role_all_operations_log" ON operations_log FOR ALL TO service_role USING (true);

-- WARNING: The password_attempt column stores truncated password fragments.
-- This is a security risk. Consider removing this column or hashing values.
-- It is excluded from all API responses via the secure view below.
CREATE OR REPLACE VIEW login_attempts_safe AS
SELECT
  id, username, status, ip_address, user_agent, device, location,
  attempt_time, lock_expires
  -- password_attempt explicitly excluded
FROM login_attempts;
