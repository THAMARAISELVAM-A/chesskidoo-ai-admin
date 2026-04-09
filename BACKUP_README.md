# 🚨 CRITICAL: Data Backup Required!

## Your Data is at Risk!

**Current Situation:**
- ✅ Frontend: Hosted on GitHub Pages (https://thamaraiselvam-a.github.io/chesskidoo-ai-admin/)
- ❌ Database: Stored ONLY on your local computer (`data/chesskidoo.db`)
- ❌ API: Won't work on GitHub Pages (static hosting only)

**If you lose your computer → ALL DATA IS LOST!**

## 🛡️ Solution: GitHub Backup System

We've created an automatic backup system to protect your data.

### Quick Setup (5 minutes)

1. **Create GitHub Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: "Chesskidoo Backup"
   - Permissions: ✅ `repo` (Full control)
   - Generate and **copy the token**

2. **Add to .env file:**
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   GITHUB_OWNER=THAMARAISELVAM-A
   GITHUB_REPO=chesskidoo-ai-admin
   ```

3. **Test backup:**
   ```bash
   npm run backup
   ```

### Daily Usage

**After making any changes (students, coaches, payments):**
```bash
npm run backup
```

**View all backups:**
```bash
npm run backup:list
```

**Restore if needed:**
```bash
npm run backup:restore chesskidoo-backup-2024-04-09T10-30-00.json
```

## 📁 What Gets Backed Up?

- ✅ All students
- ✅ All coaches
- ✅ All events
- ✅ All achievements
- ✅ All games
- ✅ All payments
- ✅ Complete database structure

## 🔄 How It Works

1. **You make changes** in admin panel
2. **Data saves** to local SQLite database
3. **You run backup** → uploads to GitHub
4. **Data is safe** even if computer is lost
5. **Restore anytime** on any computer

## 🚨 Emergency Recovery

**If your computer is lost:**

1. Get a new computer
2. Clone the repository
3. Install dependencies
4. Add GitHub token to .env
5. Run: `npm run backup:restore <latest-backup>`
6. All data restored!

## 📅 Backup Schedule

**Recommended:**
- ⏰ **Daily** - After making changes
- ⏰ **Weekly** - Even if no changes
- ⏰ **Before updates** - Always backup first

## 📖 Full Documentation

See `BACKUP_GUIDE.md` for complete instructions.

## ⚠️ Important Notes

1. **GitHub Pages is static only** - Cannot run databases or APIs
2. **Your database is local** - Only on your computer
3. **Backups are essential** - Without them, data loss is permanent
4. **Test backups regularly** - Ensure restore process works
5. **Keep token secure** - Don't share or commit to git

## 🆘 Need Help?

- Read `BACKUP_GUIDE.md` for detailed instructions
- Check error messages carefully
- Verify .env file is correct
- Ensure internet connection for GitHub operations

---

**Remember: No backup = No data recovery!**
**Run `npm run backup` daily!**
