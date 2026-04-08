-- Students Table
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  grade TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  enrollment_date TEXT,
  status TEXT DEFAULT 'active',
  coach_id TEXT,
  rating INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coaches Table
CREATE TABLE coaches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialization TEXT,
  experience INTEGER,
  rating REAL DEFAULT 0,
  bio TEXT,
  status TEXT DEFAULT 'active',
  hourly_rate REAL,
  availability TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT,
  event_time TEXT,
  location TEXT,
  type TEXT,
  status TEXT DEFAULT 'upcoming',
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements Table
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  date_achieved TEXT,
  category TEXT,
  level TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Games Table
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  white_player TEXT,
  black_player TEXT,
  result TEXT,
  date_played TEXT,
  moves TEXT,
  opening TEXT,
  tournament TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  description TEXT,
  payment_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Create Indexes for better performance
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_coach ON students(coach_id);
CREATE INDEX idx_coaches_email ON coaches(email);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_achievements_student ON achievements(student_id);
CREATE INDEX idx_payments_student ON payments(student_id);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for parent view)
CREATE POLICY "Public read access for students" ON students
  FOR SELECT USING (true);

CREATE POLICY "Public read access for coaches" ON coaches
  FOR SELECT USING (true);

CREATE POLICY "Public read access for events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Public read access for achievements" ON achievements
  FOR SELECT USING (true);

CREATE POLICY "Public read access for games" ON games
  FOR SELECT USING (true);

CREATE POLICY "Public read access for payments" ON payments
  FOR SELECT USING (true);

-- Allow full access for authenticated users (admin)
CREATE POLICY "Full access for authenticated users on students" ON students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Full access for authenticated users on coaches" ON coaches
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Full access for authenticated users on events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Full access for authenticated users on achievements" ON achievements
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Full access for authenticated users on games" ON games
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Full access for authenticated users on payments" ON payments
  FOR ALL USING (auth.role() = 'authenticated');
