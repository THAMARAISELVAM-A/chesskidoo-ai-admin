import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/chesskidoo.db');

let db = null;

export function getDatabase() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coaches (
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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      date_achieved TEXT,
      category TEXT,
      level TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      white_player TEXT,
      black_player TEXT,
      result TEXT,
      date_played TEXT,
      moves TEXT,
      opening TEXT,
      tournament TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT,
      description TEXT,
      payment_date TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
    CREATE INDEX IF NOT EXISTS idx_students_coach ON students(coach_id);
    CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_achievements_student ON achievements(student_id);
    CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
