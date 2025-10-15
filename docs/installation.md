# Installation Guide

This guide provides detailed step-by-step instructions for installing Chrono Lite.

**Estimated time**: 5-10 minutes

---

## Prerequisites

Before you begin, make sure you have:

- ✅ A Gmail account
- ✅ Access to [Google Apps Script](https://script.google.com/)
- ✅ Basic understanding of how to copy-paste code (no programming knowledge required)

---

## Installation Methods

Choose the method that works best for you:

- **[Method A: Marketplace Install](#method-a-marketplace-install)** (Recommended, coming soon)
- **[Method B: Manual Install](#method-b-manual-install)** (Available now)
- **[Method C: Developer Install with Clasp](#method-c-developer-install-with-clasp)** (For developers)

---

## Method A: Marketplace Install

🚧 **Status**: Coming soon (currently under Google review)

Once approved, you'll be able to:

1. Visit the [Google Workspace Marketplace](https://workspace.google.com/marketplace)
2. Search for "Chrono Lite"
3. Click "Install"
4. Authorize permissions
5. Done!

**Expected availability**: [Date TBD]

---

## Method B: Manual Install

This is the current recommended method for most users.

### Step 1: Open Google Apps Script Console

1. Go to https://script.google.com
2. Sign in with your Gmail account
3. Click the **"New Project"** button (usually in the top-left corner)

<!-- TODO: Add screenshot -->
![Open Apps Script](../assets/screenshots/installation-1-open-console.png)

4. You'll see a new project with default code. We'll replace this in the next steps.

---

### Step 2: Download Chrono Lite Source Code

You have two options:

#### Option A: Download ZIP (Easier)

1. Go to https://github.com/msylctt/chrono-lite
2. Click the green **"Code"** button
3. Select **"Download ZIP"**
4. Extract the ZIP file to your computer

<!-- TODO: Add screenshot -->
![Download ZIP](../assets/screenshots/installation-2-download-zip.png)

#### Option B: Clone with Git (For developers)

```bash
git clone https://github.com/msylctt/chrono-lite.git
cd chrono-lite
```

---

### Step 3: Copy Source Files to Apps Script

You need to create 6 script files. For each file:

1. In the Apps Script editor, click **Files** (📁) in the left sidebar
2. Click the **"+"** icon next to "Files"
3. Select **"Script"**
4. Name the file (see table below for names)
5. Copy-paste the content from the corresponding file in `src/` folder

**Files to create**:

| Apps Script File | Source File | Description |
|-----------------|-------------|-------------|
| `Code.gs` | `src/Code.gs` | Main logic and entry points |
| `Config.gs` | `src/Config.gs` | Configuration and category rules |
| `Database.gs` | `src/Database.gs` | Data loading and caching |
| `Classifier.gs` | `src/Classifier.gs` | Email classification engine |
| `Actions.gs` | `src/Actions.gs` | Gmail actions (label, archive, etc.) |
| `UI.gs` | `src/UI.gs` | Gmail sidebar interface |

<!-- TODO: Add screenshot -->
![Create Script File](../assets/screenshots/installation-3-create-files.png)

**Tips**:
- Copy the entire content of each file (Ctrl/Cmd + A, then Ctrl/Cmd + C)
- Paste into the Apps Script editor (Ctrl/Cmd + V)
- Save frequently (Ctrl/Cmd + S)

---

### Step 4: Configure the Manifest File

The manifest file (`appsscript.json`) tells Google what permissions the add-on needs.

1. In Apps Script editor, click **"Project Settings"** (⚙️) in the left sidebar
2. Scroll down and check **"Show 'appsscript.json' manifest file in editor"**
3. Go back to **"Editor"** view
4. You should now see `appsscript.json` in the file list
5. Click on it to open
6. Replace the entire content with the content from `appsscript.json` in the repository

<!-- TODO: Add screenshot -->
![Configure Manifest](../assets/screenshots/installation-4-manifest.png)

**Important**: Make sure you copy the **entire** `appsscript.json` file, including the opening `{` and closing `}`.

---

### Step 5: Save and Name Your Project

1. Click **"Untitled project"** at the top
2. Rename it to **"Chrono Lite"** (or any name you like)
3. Save all files (Ctrl/Cmd + S or File → Save All)

<!-- TODO: Add screenshot -->
![Rename Project](../assets/screenshots/installation-5-rename.png)

---

### Step 6: Authorize the Script

Before running, you need to authorize the script to access your Gmail.

1. In the toolbar, select **`initialSetup`** from the function dropdown
2. Click the **"Run"** button (▶️)

<!-- TODO: Add screenshot -->
![Run Initial Setup](../assets/screenshots/installation-6-run.png)

3. A popup will appear asking for permissions:
   - Click **"Review permissions"**
   - Select your Google account
   - You may see a warning "Google hasn't verified this app" - this is normal for personal scripts
   - Click **"Advanced"** → **"Go to Chrono Lite (unsafe)"**
   - Review the permissions and click **"Allow"**

<!-- TODO: Add screenshot -->
![Authorization Flow](../assets/screenshots/installation-7-authorize.png)

4. Wait for the script to finish running (you'll see "Execution completed" in the logs)

**What `initialSetup` does**:
- Loads the sender database from CDN
- Processes your recent emails (last 7 days)
- Creates Gmail labels if they don't exist
- Tests the classification engine

---

### Step 7: Verify Installation in Gmail

1. Open Gmail in a new tab (or refresh if already open)
2. Look at the **right sidebar** - you should see the Chrono Lite icon
3. Click the icon to open the add-on

<!-- TODO: Add screenshot -->
![Gmail Sidebar](../assets/screenshots/installation-8-gmail-sidebar.png)

4. You should see:
   - A welcome card
   - Statistics about categorized emails
   - Options to enable automation

**If you don't see the icon**:
- Hard refresh Gmail (Ctrl/Cmd + Shift + R)
- Check that `appsscript.json` is configured correctly
- Make sure you completed the authorization step
- See [Troubleshooting](#troubleshooting) below

---

### Step 8: Enable Automation (Optional)

To automatically process new emails every hour:

1. In the Gmail sidebar, click **"Enable Automation"**

**OR**

Manually create a trigger in Apps Script:

1. Go back to the Apps Script editor
2. Click **"Triggers"** (⏰) in the left sidebar
3. Click **"Add Trigger"** in the bottom-right
4. Configure:
   - Function: `autoProcessInbox`
   - Event source: **Time-driven**
   - Type: **Hour timer**
   - Time interval: **Every hour**
5. Click **"Save"**

<!-- TODO: Add screenshot -->
![Create Trigger](../assets/screenshots/installation-9-trigger.png)

---

## Method C: Developer Install with Clasp

For developers who want to develop locally and push changes to Apps Script.

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Git

### Steps

```bash
# 1. Install clasp globally
npm install -g @google/clasp

# 2. Login to your Google account
clasp login

# 3. Clone the repository
git clone https://github.com/msylctt/chrono-lite.git
cd chrono-lite

# 4. Create a new Apps Script project
clasp create --type standalone --title "Chrono Lite"

# This will create a .clasp.json file with your script ID

# 5. Push code to Apps Script
clasp push

# 6. Open in editor (to complete authorization)
clasp open

# 7. Follow Steps 6-8 from Method B above
```

### Development Workflow

```bash
# Watch for changes and auto-push
clasp push --watch

# Pull changes from Apps Script
clasp pull

# View logs
clasp logs --watch
```

For more details, see [CLAUDE.md](../CLAUDE.md).

---

## Troubleshooting

### Problem: Can't see the sidebar icon in Gmail

**Possible causes**:
- Authorization not completed
- `appsscript.json` not configured correctly
- Gmail cache issue

**Solutions**:
1. Hard refresh Gmail (Ctrl/Cmd + Shift + R)
2. Check Apps Script → Project Settings → Make sure manifest is enabled
3. Re-run `initialSetup` function
4. Try opening Gmail in incognito mode
5. Check the Apps Script logs for errors (View → Logs)

---

### Problem: No emails are being categorized

**Possible causes**:
- Database not loaded
- No matching senders in your inbox
- Trigger not set up

**Solutions**:
1. Run `testDatabaseConnection()` in Apps Script to verify database loading
2. Check the logs - you should see "✅ Database loaded: X senders"
3. Run `initialSetup()` again to process recent emails
4. Check if automation trigger is created (Triggers tab)
5. Manually trigger `autoProcessInbox()` and check logs

---

### Problem: "Authorization error" or "Permission denied"

**Solutions**:
1. Make sure you completed the authorization flow in Step 6
2. Revoke and re-authorize:
   - Go to https://myaccount.google.com/permissions
   - Find "Chrono Lite" and remove access
   - Go back to Apps Script and re-run `initialSetup`
3. Make sure the required OAuth scopes are in `appsscript.json`

---

### Problem: Script timeout errors

**Possible causes**:
- Large inbox (>1000 emails)
- Slow internet connection
- Gmail API quota exceeded

**Solutions**:
1. This is normal for large inboxes - the script will resume on next run
2. Reduce `BATCH_SIZE` in `Config.gs` (e.g., from 100 to 50)
3. Wait a few minutes before re-running
4. Check Gmail API quota: Apps Script Dashboard → Quotas

---

### Problem: Getting "Service invoked too many times" error

**Cause**: Apps Script has usage quotas (e.g., max 20,000 URL fetches per day)

**Solutions**:
1. Wait 24 hours for quota reset
2. The script uses caching to minimize API calls
3. Reduce processing frequency (e.g., trigger every 2 hours instead of 1)

---

## Video Tutorials

### Installation Walkthrough

📺 **English**: [YouTube Tutorial](https://www.youtube.com) <!-- TODO: Add actual link -->

📺 **中文**: [Bilibili 教程](https://www.bilibili.com) <!-- TODO: Add actual link -->

---

## Next Steps

After installation, you can:

1. **Customize categories**: Edit `Config.gs` to add your own rules
2. **Process historical emails**: Run bulk cleanup from the sidebar
3. **Contribute senders**: Help expand the database at [chrono-lite-newsletter-senders](https://github.com/msylctt/chrono-lite-newsletter-senders)

See [User Guide](./user-guide.md) for detailed usage instructions.

---

## Need More Help?

- 📚 [User Guide](./user-guide.md)
- 💡 [FAQ](./faq.md)
- 🐛 [Report an issue](https://github.com/msylctt/chrono-lite/issues)
- 💬 [Ask in Discussions](https://github.com/msylctt/chrono-lite/discussions)

---

**Congratulations! 🎉** You've successfully installed Chrono Lite. Enjoy your organized inbox!
