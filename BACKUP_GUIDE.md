# Database Backup & Restore Guide

## ⚠️ Important Warning

**Your database is stored locally on your computer.** If you lose your computer or the database file gets corrupted, **ALL DATA WILL BE LOST** unless you have backups.

## 🔄 Automatic Backup System

We've implemented a GitHub-based backup system to protect your data.

### Setup (One-Time)

1. **Create GitHub Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "Chesskidoo Database Backup"
   - Select permissions: ✅ `repo` (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

2. **Add to .env file:**
   ```bash
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GITHUB_OWNER=THAMARAISELVAM-A
   GITHUB_REPO=chesskidoo-ai-admin
   ```

### Daily Backup Routine

**Run this command daily after making changes:**
```bash
npm run backup
```

This will:
- ✅ Backup all tables from your local database
- ✅ Save backup locally in `backups/` folder
- ✅ Upload backup to GitHub repository
- ✅ Keep history of all backups

### View Available Backups

```bash
npm run backup:list
```

This shows all backups stored on GitHub with dates and sizes.

### Restore from Backup

**If you lose your database or need to restore:**

1. List backups: `npm run backup:list`
2. Restore specific backup:
   ```bash
   npm run backup:restore chesskidoo-backup-2024-04-09T10-30-00.json
   ```

The system will:
- ✅ Backup your current database (just in case)
- ✅ Download the selected backup from GitHub
- ✅ Restore all tables and data
- ✅ Keep your database at `data/chesskidoo.db`

## 📁 Backup Locations

**Local Backups:** `backups/` folder in project directory
**GitHub Backups:** `database-backups/` folder in your GitHub repository

## 🚨 Emergency Recovery

If your computer is lost or database is corrupted:

1. **On a new computer:**
   ```bash
   git clone https://github.com/THAMARAISELVAM-A/chesskidoo-ai-admin.git
   cd chesskidoo-ai-admin
   npm install
   ```

2. **Set up .env file** with your GitHub token

3. **Restore latest backup:**
   ```bash
   npm run backup:list
   npm run backup:restore <latest-backup-name>
   ```

4. **Start using the system:**
   ```bash
   npm run dev
   ```

## 📅 Recommended Backup Schedule

- **Daily:** After adding students, coaches, or making changes
- **Weekly:** Even if no changes (just to be safe)
- **Before major updates:** Always backup before updating the system

## 🔒 Security Notes

- Your GitHub token gives access to your repository
- Store it securely in `.env` file (never commit to git)
- The `.env` file is in `.gitignore` so it won't be uploaded
- Backups contain all your data - keep your GitHub repository private

## 💡 Pro Tips

1. **Set a reminder** to run `npm run backup` daily
2. **Check backups regularly** with `npm run backup:list`
3. **Test restore process** occasionally to ensure it works
4. **Keep multiple backups** - GitHub stores all versions
5. **Monitor backup size** - if it grows too large, consider archiving old data

## 🆘 Troubleshooting

**Error: "GITHUB_TOKEN environment variable is required"**
- Add your GitHub token to `.env` file

**Error: "Database file not found"**
- Make sure you've used the system at least once to create the database

**Error: "Failed to upload to GitHub"**
- Check your internet connection
- Verify GitHub token has `repo` permissions
- Check that GITHUB_OWNER and GITHUB_REPO are correct

**Restore shows wrong data**
- You might have restored an old backup
- Check backup dates with `npm run backup:list`
- Restore a more recent backup

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify your `.env` file is correct
3. Ensure you have internet connection for GitHub operations
4. Check GitHub repository permissions
