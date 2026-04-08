import Database from 'better-sqlite3';
import { Octokit } from '@octokit/rest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/chesskidoo.db');
const backupPath = path.join(__dirname, '../backups');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'THAMARAISELVAM-A';
const GITHUB_REPO = process.env.GITHUB_REPO || 'chesskidoo-ai-admin';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

function ensureBackupDir() {
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
}

async function backupDatabase() {
  try {
    console.log('🔄 Starting database backup...\n');

    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database file not found:', dbPath);
      process.exit(1);
    }

    const db = new Database(dbPath, { readonly: true });
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`📊 Found ${tables.length} tables`);

    const backupData = {};
    for (const table of tables) {
      const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
      backupData[table.name] = rows;
      console.log(`  ✓ ${table.name}: ${rows.length} records`);
    }
    db.close();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chesskidoo-backup-${timestamp}.json`;
    const localBackupPath = path.join(backupPath, filename);

    fs.writeFileSync(localBackupPath, JSON.stringify(backupData, null, 2));
    console.log(`\n💾 Local backup saved: ${filename}`);

    const content = fs.readFileSync(localBackupPath, 'utf-8');
    const contentBase64 = Buffer.from(content).toString('base64');
    const githubPath = `database-backups/${filename}`;

    console.log(`\n📤 Uploading to GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/${githubPath}`);

    try {
      const existing = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: githubPath
      });

      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: githubPath,
        message: `Database backup: ${timestamp}`,
        content: contentBase64,
        sha: existing.data.sha
      });
      console.log('✅ Backup updated on GitHub');
    } catch (error) {
      if (error.status === 404) {
        await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: githubPath,
          message: `Database backup: ${timestamp}`,
          content: contentBase64
        });
        console.log('✅ New backup created on GitHub');
      } else {
        throw error;
      }
    }

    const totalRecords = Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`\n✨ Backup completed successfully!`);
    console.log(`   - Tables: ${tables.length}`);
    console.log(`   - Total records: ${totalRecords}`);
    console.log(`   - GitHub URL: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/${githubPath}`);

  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();
