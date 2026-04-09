-- Login Sessions table for tracking real login history
CREATE TABLE IF NOT EXISTS login_sessions (
  id TEXT PRIMARY KEY,
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

-- Allow all operations
CREATE POLICY "Allow all on sessions" ON login_sessions FOR ALL USING (true);
