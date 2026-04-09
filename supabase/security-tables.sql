-- Login Attempts table for security tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
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
  id TEXT PRIMARY KEY,
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

-- Policies
CREATE POLICY "Allow all on login_attempts" ON login_attempts FOR ALL USING (true);
CREATE POLICY "Allow all on operations_log" ON operations_log FOR ALL USING (true);
