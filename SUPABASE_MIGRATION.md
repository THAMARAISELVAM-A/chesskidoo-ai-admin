# Supabase Migration Guide

## Why Supabase?

**Perfect for Chesskidoo Admin Panel:**
- ✅ Cloud PostgreSQL database (accessible from anywhere)
- ✅ Parents can login from any device
- ✅ Real-time data synchronization
- ✅ Built-in authentication system
- ✅ Automatic backups (7-day retention on free tier)
- ✅ Free tier: 500MB database, 1GB bandwidth
- ✅ Easy to use and deploy

## Migration Steps

### Step 1: Create Supabase Project

1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign up/login with GitHub
4. Click "New Project"
5. Fill in details:
   - **Name**: `chesskidoo-admin`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to you (e.g., Singapore)
6. Click "Create new project"
7. Wait 2-3 minutes for project to be ready

### Step 2: Get Project Credentials

1. Go to: https://supabase.com/dashboard/project/_/settings/api
2. Copy these values:
   - **Project URL** (looks like: https://xxxxxxxx.supabase.co)
   - **anon public key** (starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
3. Save these - you'll need them!

### Step 3: Create Database Tables

Go to: https://supabase.com/dashboard/project/_/sql/new

Run this SQL script to create all tables:

```sql
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
```

### Step 4: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 5: Update Environment Variables

Update your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret for authentication
JWT_SECRET=chesskidoo-secret-2024

# Port for local development
PORT=5000

# Razorpay Configuration (for payment processing)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Step 6: Update API Endpoints

The API files will be updated to use Supabase instead of SQLite.

### Step 7: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

## Benefits After Migration

✅ **Multi-device access** - Parents can login from anywhere
✅ **Real-time sync** - Changes appear instantly
✅ **Automatic backups** - Supabase handles this
✅ **No local database** - No risk of data loss
✅ **Scalable** - Can handle many users
✅ **Free tier** - 500MB database, 1GB bandwidth
✅ **Easy deployment** - One command to deploy

## Cost

**Free Tier (Recommended for starting):**
- 500MB database
- 1GB bandwidth/month
- 50MB file storage
- 2 concurrent connections
- 7-day backup retention

**Pro Tier ($25/month):**
- 8GB database
- 50GB bandwidth/month
- 100GB file storage
- 30-day backup retention
- More connections

## Next Steps

1. Create Supabase project
2. Run SQL script to create tables
3. Update `.env` with Supabase credentials
4. Update API endpoints (we'll do this)
5. Test locally
6. Deploy to Vercel

## Migration Timeline

- **Setup**: 30 minutes
- **Testing**: 1 hour
- **Deployment**: 15 minutes
- **Total**: ~2 hours

## Data Migration

If you have existing data in SQLite:

1. Export data from SQLite
2. Import to Supabase using SQL INSERT statements
3. Verify all data migrated correctly

We'll provide a migration script if needed.

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.gg/supabase
- GitHub Issues: https://github.com/THAMARAISELVAM-A/chesskidoo-ai-admin/issues
