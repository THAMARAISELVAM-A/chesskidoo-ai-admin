import 'dotenv/config';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/chesskidoo.db');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  console.error('Please set them in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateTable(tableName, transformFn = null) {
  try {
    console.log(`\n📦 Migrating ${tableName}...`);

    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    db.close();

    if (rows.length === 0) {
      console.log(`  ℹ️  No data found in ${tableName}`);
      return;
    }

    const data = transformFn ? rows.map(transformFn) : rows;

    const { error } = await supabase
      .from(tableName)
      .insert(data);

    if (error) {
      console.error(`  ❌ Error migrating ${tableName}:`, error.message);
      throw error;
    }

    console.log(`  ✅ Successfully migrated ${rows.length} records from ${tableName}`);
  } catch (error) {
    console.error(`  ❌ Failed to migrate ${tableName}:`, error.message);
    throw error;
  }
}

async function migrateAll() {
  console.log('🚀 Starting migration from SQLite to Supabase...\n');

  try {
    if (!fs.existsSync(dbPath)) {
      console.log('❌ SQLite database not found:', dbPath);
      console.log('If you have no existing data, you can skip migration.');
      process.exit(0);
    }

    await migrateTable('students', (row) => ({
      ...row,
      created_at: row.createdAt || row.created_at,
      updated_at: row.updatedAt || row.updated_at
    }));

    await migrateTable('coaches', (row) => ({
      ...row,
      created_at: row.createdAt || row.created_at,
      updated_at: row.updatedAt || row.updated_at
    }));

    await migrateTable('events', (row) => ({
      ...row,
      created_at: row.createdAt || row.created_at,
      updated_at: row.updatedAt || row.updated_at
    }));

    await migrateTable('achievements', (row) => ({
      ...row,
      created_at: row.createdAt || row.created_at
    }));

    await migrateTable('games', (row) => ({
      ...row,
      created_at: row.createdAt || row.created_at
    }));

    await migrateTable('payments', (row) => ({
      ...row,
      created_at: row.createdAt || row.created_at
    }));

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify data in Supabase dashboard');
    console.log('2. Test the application locally');
    console.log('3. Deploy to Vercel when ready');
    console.log('\n💡 Your SQLite database is still intact as backup.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.error('1. Check your Supabase credentials in .env');
    console.error('2. Ensure Supabase tables are created (run SQL script)');
    console.error('3. Check internet connection');
    console.error('4. Verify Supabase project is active');
    process.exit(1);
  }
}

migrateAll();
