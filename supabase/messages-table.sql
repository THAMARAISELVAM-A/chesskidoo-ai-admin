-- Messages table for parent-admin communication
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('parent', 'admin', 'system')),
  sender_id TEXT,
  receiver_type TEXT NOT NULL CHECK (receiver_type IN ('parent', 'admin', 'system')),
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reply_to TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_type);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations (use double quotes for policy name)
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);
