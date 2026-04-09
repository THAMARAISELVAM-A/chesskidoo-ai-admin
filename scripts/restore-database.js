import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/chesskidoo.db');
const backupDir = path.join(__dirname, '../backups');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'THAMARAISELVAM-A';
const GITHUB_REPO = process.env.GITHUB_REPO || 'chesskidoo-ai-admin';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function listBackups() {
  try {
    console.log('📂 Fetching backup list from GitHub...\n');
    
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: 'database-backups'
    });

    if (!Array.isArray(data)) {
      console.log('No backups found');
      return [];
    }

    const backups = data
      .filter(file => file.name.endsWith('.json'))
      .sort((a, b) => new Date(b.name) - new Date(a.name));

    console.log(`Found ${backups.length} backups:\n`);
    backups.forEach((backup, index) => {
      const date = backup.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || 'Unknown';
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   Date: ${date.replace(/T/, ' ').replace(/-/g, ':')}`);
      console.log(`   Size: ${(backup.size / 1024).toFixed(1)} KB\n`);
    });

    return backups;
  } catch (error) {
    if (error.status === 404) {
      console.log('No backups found on GitHub');
      return [];
    }
    console.error('❌ Failed to list backups:', error.message);
    process.exit(1);
  }
}

async function downloadBackup(backupName) {
  try {
    console.log(`📥 Downloading backup: ${backupName}\n`);

    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: `database-backups/${backupName}`
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const backupData = JSON.parse(content);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const localPath = path.join(backupDir, backupName);
    fs.writeFileSync(localPath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Downloaded to: ${localPath}`);

    return backupData;
  } catch (error) {
    console.error('❌ Failed to download backup:', error.message);
    process.exit(1);
  }
}

async function restoreDatabase(backupData) {
  try {
    console.log('\n🔄 Restoring database...\n');

    if (fs.existsSync(dbPath)) {
      const backupDbPath = dbPath + '.backup.' + Date.now();
      fs.copyFileSync(dbPath, backupDbPath);
      console.log(`✅ Previous database backed up to: ${backupDbPath}`);
    }

    const db = new Database(dbPath);
    
    const tables = Object.keys(backupData);
    console.log(`Restoring ${tables.length} tables...\n`);

    for (const tableName of tables) {
      const records = backupData[tableName];
      
      db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
      
      const columns = records.length > 0 ? Object.keys(records[0]) : ['id'];
      const columnDefs = columns.map(col => `${col} TEXT`).join(', ');
      
      db.prepare(`CREATE TABLE ${tableName} (${columnDefs})`).run();
      
      if (records.length > 0) {
        const placeholders = columns.map(() => '?').join(', ');
        const insert = db.prepare(`INSERT INTO ${tableName} VALUES (${placeholders})`);
        
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            insert.run(...columns.map(col => row[col]));
          }
        });
        
        insertMany(records);
      }
      
      console.log(`  ✓ ${tableName}: ${records.length} records`);
    }

    db.close();
    console.log('\n✨ Database restored successfully!');
    console.log(`📍 Location: ${dbPath}`);

  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'list') {
    await listBackups();
  } else if (command === 'restore') {
    const backupName = args[1];
    if (!backupName) {
      console.error('❌ Please specify backup name');
      console.log('Usage: node restore-database.js restore <backup-name>');
      console.log('       node restore-database.js list');
      process.exit(1);
    }
    const backupData = await downloadBackup(backupName);
    await restoreDatabase(backupData);
  } else {
    console.log('Usage:');
    console.log('  node restore-database.js list          - List all available backups');
    console.log('  node restore-database.js restore <name> - Restore specific backup');
  }
}

main();
