#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupBackup() {
  console.log('\n🔧 Chesskidoo Backup Setup\n');
  console.log('This will help you set up automatic database backups to GitHub.\n');

  const envPath = path.join(__dirname, '.env');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  console.log('📝 Step 1: GitHub Personal Access Token\n');
  console.log('1. Go to: https://github.com/settings/tokens');
  console.log('2. Click "Generate new token" → "Generate new token (classic)"');
  console.log('3. Name it: "Chesskidoo Database Backup"');
  console.log('4. Select permissions: ✅ repo (Full control of private repositories)');
  console.log('5. Click "Generate token"');
  console.log('6. Copy the token (you won\'t see it again!)\n');

  const token = await question('Paste your GitHub token here: ');
  
  if (!token || token.length < 10) {
    console.log('\n❌ Invalid token. Token should be at least 10 characters.');
    rl.close();
    process.exit(1);
  }

  console.log('\n📝 Step 2: GitHub Repository Details\n');
  
  const owner = await question('GitHub username (default: THAMARAISELVAM-A): ') || 'THAMARAISELVAM-A';
  const repo = await question('Repository name (default: chesskidoo-ai-admin): ') || 'chesskidoo-ai-admin';

  console.log('\n📝 Step 3: Updating .env file\n');

  const lines = envContent.split('\n');
  const newLines = [];

  let tokenAdded = false;
  let ownerAdded = false;
  let repoAdded = false;

  for (const line of lines) {
    if (line.startsWith('GITHUB_TOKEN=')) {
      newLines.push(`GITHUB_TOKEN=${token}`);
      tokenAdded = true;
    } else if (line.startsWith('GITHUB_OWNER=')) {
      newLines.push(`GITHUB_OWNER=${owner}`);
      ownerAdded = true;
    } else if (line.startsWith('GITHUB_REPO=')) {
      newLines.push(`GITHUB_REPO=${repo}`);
      repoAdded = true;
    } else {
      newLines.push(line);
    }
  }

  if (!tokenAdded) newLines.push(`GITHUB_TOKEN=${token}`);
  if (!ownerAdded) newLines.push(`GITHUB_OWNER=${owner}`);
  if (!repoAdded) newLines.push(`GITHUB_REPO=${repo}`);

  fs.writeFileSync(envPath, newLines.join('\n'));

  console.log('✅ .env file updated successfully!\n');

  console.log('📝 Step 4: Testing backup\n');
  console.log('Running: npm run backup\n');

  const { exec } = await import('child_process');
  
  exec('npm run backup', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Backup test failed:', error.message);
      console.error(stderr);
      rl.close();
      process.exit(1);
    }

    console.log(stdout);
    
    if (stdout.includes('✨ Backup completed successfully!')) {
      console.log('\n✅ Setup complete!\n');
      console.log('📋 Summary:');
      console.log('   - GitHub token configured');
      console.log('   - Repository: ' + owner + '/' + repo);
      console.log('   - Backup system tested and working\n');
      console.log('📅 Daily usage:');
      console.log('   npm run backup           - Backup database');
      console.log('   npm run backup:list       - View all backups');
      console.log('   npm run backup:restore    - Restore from backup\n');
      console.log('📖 Read BACKUP_GUIDE.md for more information.\n');
    } else {
      console.log('\n⚠️  Backup completed but may have issues. Check output above.\n');
    }

    rl.close();
  });
}

setupBackup().catch(error => {
  console.error('❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
