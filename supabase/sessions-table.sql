-- Login Sessions table for tracking real login history
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'parent', 'coach')),
  user_id TEXT,
  user_name TEXT NOT NULL,
  device TEXT,
  ip_address TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_sessions_user ON login_sessions(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON login_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- SECURITY: Only service_role (Edge Functions) can access login_sessions
-- This table contains IP addresses, device info, and user names
CREATE POLICY "service_role_all_sessions" ON login_sessions FOR ALL TO service_role USING (true);
