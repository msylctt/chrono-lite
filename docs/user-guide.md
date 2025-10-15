# User Guide

Welcome to Chrono Lite! This guide will help you get the most out of your automated Gmail inbox.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Understanding Categories](#understanding-categories)
- [Using the Gmail Sidebar](#using-the-gmail-sidebar)
- [Managing Automation](#managing-automation)
- [Customizing Rules](#customizing-rules)
- [Bulk Processing Historical Emails](#bulk-processing-historical-emails)
- [Understanding Labels](#understanding-labels)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)

---

## Getting Started

After [installation](./installation.md), Chrono Lite will:

1. ✅ Load the sender database (5,000+ verified senders)
2. ✅ Create Gmail labels for each category
3. ✅ Process your recent emails (last 7 days by default)
4. ✅ Show statistics in the sidebar

**First-time tip**: Give it a few minutes to process your inbox. You can check progress in the Apps Script logs.

---

## Understanding Categories

Chrono Lite automatically categorizes emails into these types:

### 📧 Newsletter
Newsletters and content digests from publishers, blogs, and media outlets.

**Examples**:
- Morning Brew
- TechCrunch newsletters
- The Hustle
- Substack newsletters

**Gmail Label**: `Newsletter`

---

### 📢 Marketing
Promotional emails, sales, special offers, and marketing campaigns.

**Examples**:
- Amazon promotions
- Uber discounts
- Retail store sales
- Black Friday deals

**Gmail Label**: `Marketing`

---

### 🔔 Product Updates
Product announcements, feature releases, and service updates.

**Examples**:
- GitHub release notes
- Notion updates
- Slack announcements
- Software changelogs

**Gmail Label**: `Product Updates`

---

### 🎯 Social
Social media notifications and community updates.

**Examples**:
- LinkedIn connection requests
- Twitter notifications
- Reddit replies

**Gmail Label**: `Social`

---

### 📦 Transactional
Receipts, confirmations, shipping notifications, and other transactional emails.

**Examples**:
- Order confirmations
- Shipping tracking
- Payment receipts

**Gmail Label**: `Transactional`

**Note**: Transactional emails are usually **not** auto-categorized to avoid missing important confirmations. You can customize this behavior.

---

## Using the Gmail Sidebar

The Chrono Lite sidebar appears on the right side of Gmail.

<!-- TODO: Add sidebar screenshot -->
![Sidebar UI](../assets/screenshots/sidebar-ui.png)

### Home Card

When you open Chrono Lite from Gmail, you'll see:

1. **Statistics**:
   - Total emails processed
   - Newsletters categorized
   - Marketing emails categorized
   - Product updates categorized

2. **Quick Actions**:
   - 🔄 **Process Inbox Now**: Manually trigger categorization
   - 🗑️ **Bulk Cleanup**: Process historical emails
   - ⚙️ **Settings**: Configure automation and rules

---

### Contextual Cards

When you **open an email**, Chrono Lite shows a contextual card with:

1. **Sender Information**:
   - Detected category
   - Confidence score
   - Domain reputation

2. **Quick Actions**:
   - ✅ **Correct Category**: If categorized correctly
   - 🔄 **Suggest Different Category**: If wrong
   - 🚫 **Never Categorize This Sender**: Whitelist

**Smart Display Strategy**:
- **High confidence (>90%)**: Shows minimal card (doesn't interrupt)
- **Medium confidence (60-90%)**: Shows full card with actions
- **Low confidence (<60%)**: Asks for your help to improve

---

## Managing Automation

Chrono Lite can run automatically to keep your inbox organized.

### Enable Automation

**Method 1: From Sidebar** (Recommended)
1. Open Chrono Lite in Gmail
2. Click **"Enable Automation"** button
3. Confirm the trigger creation

**Method 2: Manual Trigger Creation**
1. Go to Apps Script editor
2. Click **"Triggers"** (⏰) in the left sidebar
3. Click **"Add Trigger"**
4. Configure:
   - Function: `autoProcessInbox`
   - Event source: Time-driven
   - Type: Hour timer
   - Interval: Every hour (recommended)

---

### Disable Automation

1. Open Apps Script editor
2. Go to **"Triggers"** (⏰)
3. Find the `autoProcessInbox` trigger
4. Click the three dots (⋮) → **"Delete trigger"**

---

### Adjust Frequency

You can change how often emails are processed:

1. Delete the existing trigger
2. Create a new trigger with different interval:
   - **Every hour**: Most active (recommended)
   - **Every 2 hours**: Moderate
   - **Every 6 hours**: Light usage
   - **Daily**: Minimal processing

**Note**: More frequent processing = better real-time categorization, but higher quota usage.

---

## Customizing Rules

You can customize how emails are categorized by editing `Config.gs`.

### Edit Category Rules

1. Open Apps Script editor
2. Open `Config.gs` file
3. Find the `CATEGORIES` object
4. Modify the rules:

```javascript
const CATEGORIES = {
  newsletter: {
    label: 'Newsletter',
    color: 'blue',
    actions: {
      markRead: false,  // Change to true to auto-mark as read
      archive: false,   // Change to true to auto-archive
      star: false
    }
  },
  // ... other categories
};
```

---

### Add Custom Keywords

You can add keywords to improve detection:

```javascript
const HEURISTIC_KEYWORDS = {
  newsletter: [
    'newsletter',
    'digest',
    'weekly roundup',
    'your custom keyword'  // Add your own
  ],
  marketing: [
    'unsubscribe',
    'sale',
    'discount',
    'your custom keyword'
  ]
};
```

---

### Whitelist Senders

To prevent specific senders from being categorized:

```javascript
const WHITELIST = [
  'important@company.com',
  'boss@work.com',
  '@trusteddomain.com'  // Entire domain
];
```

**Save and Reload**: After editing, save (Ctrl/Cmd + S) and the changes will apply on next run.

---

## Bulk Processing Historical Emails

Chrono Lite can process old emails in bulk.

### From Sidebar

1. Open Chrono Lite in Gmail
2. Click **"Bulk Cleanup"**
3. Choose time range:
   - Last 30 days
   - Last 90 days
   - Last 6 months
   - Custom range
4. Click **"Start Processing"**
5. Wait for completion (may take several minutes for large ranges)

<!-- TODO: Add bulk cleanup screenshot -->
![Bulk Cleanup](../assets/screenshots/bulk-cleanup.png)

---

### From Apps Script

For advanced users, you can run bulk processing manually:

```javascript
// Process last 30 days
function bulkProcess30Days() {
  var thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  var query = 'after:' + Utilities.formatDate(thirtyDaysAgo, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  var threads = GmailApp.search(query, 0, 500);

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    messages.forEach(function(message) {
      classifyAndApply(message);
    });
  });
}
```

**Warning**: Bulk processing can take a long time and may hit quota limits. Process in batches if needed.

---

## Understanding Labels

Chrono Lite uses Gmail labels to organize emails.

### Label Structure

```
Newsletter/
├── Marketing
├── Product Updates
└── Social
```

By default, all categorized labels are **nested under a parent label**. You can change this in `Config.gs`:

```javascript
const PARENT_LABEL = 'Chrono';  // Change to your preferred parent label
// Or set to empty string '' for no parent label
```

---

### Label Colors

Each category has a default color:
- Newsletter: Blue
- Marketing: Yellow
- Product Updates: Green
- Social: Purple

To change colors:
1. In Gmail, go to **Settings** → **Labels**
2. Find the Chrono Lite labels
3. Click the colored square and choose a new color

---

### Archiving Categorized Emails

You can configure Chrono Lite to automatically archive categorized emails:

In `Config.gs`:
```javascript
newsletter: {
  actions: {
    archive: true  // Auto-archive newsletters
  }
}
```

Archived emails are hidden from inbox but searchable via labels.

---

## Best Practices

### 1. Start with Default Settings

Don't customize too much at first. Use default settings for a week to see how it works.

### 2. Review Categorization Accuracy

Periodically check if emails are categorized correctly. Use the sidebar to provide feedback.

### 3. Use Labels, Not Folders

Gmail labels are more flexible than folders. One email can have multiple labels.

### 4. Don't Delete Newsletters Immediately

Archive instead of delete. You might want to search old newsletters later.

### 5. Contribute Back

If you find senders that aren't in the database, [contribute them](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)!

### 6. Monitor Quota Usage

Apps Script has quotas. Check your usage at:
- Apps Script Dashboard → **Quotas**
- If you hit limits, reduce processing frequency

---

## Advanced Usage

### Creating Filters Based on Categorization

You can create Gmail filters to further automate actions:

1. In Gmail, search for: `label:Newsletter`
2. Click **"Create filter"** (in search box dropdown)
3. Configure actions:
   - Skip inbox (archive)
   - Mark as read
   - Apply another label
4. Click **"Create filter"**

---

### Integrating with Other Tools

Chrono Lite can work alongside:

- **Gmail's built-in filters**: Chrono Lite runs after Gmail filters
- **Other Gmail Add-ons**: Usually compatible
- **Email clients**: Works with any client that syncs with Gmail

---

### Exporting Categorization Data

Want to see all categorized senders?

1. Open Apps Script editor
2. Run this function:

```javascript
function exportCategorizedSenders() {
  var senders = [];
  var labels = ['Newsletter', 'Marketing', 'Product Updates'];

  labels.forEach(function(labelName) {
    var label = GmailApp.getUserLabelByName(labelName);
    if (label) {
      var threads = label.getThreads();
      threads.forEach(function(thread) {
        var message = thread.getMessages()[0];
        var from = message.getFrom();
        senders.push({
          sender: from,
          category: labelName
        });
      });
    }
  });

  Logger.log(JSON.stringify(senders, null, 2));
}
```

3. View → Logs to see the output

---

### Debugging and Logs

To see what Chrono Lite is doing:

1. Open Apps Script editor
2. Run a function (e.g., `autoProcessInbox`)
3. View → **Execution log**

Or use `clasp logs --watch` for real-time logs.

---

## Keyboard Shortcuts

**Gmail shortcuts** (enable in Gmail Settings → General → Keyboard shortcuts):

- `gi`: Go to inbox
- `gl`: Go to labels
- `*` + `a`: Select all
- `l`: Apply label

**Tip**: Combine with Chrono Lite labels for fast triaging!

---

## Tips for Power Users

### 1. Separate Work and Personal

Create two instances:
- One for work email
- One for personal email

Each with different rules in `Config.gs`.

### 2. Time-based Processing

Process work emails during work hours only:

```javascript
function autoProcessInbox() {
  var hour = new Date().getHours();
  if (hour >= 9 && hour <= 17) {  // 9 AM - 5 PM
    // Process work emails
  }
}
```

### 3. Priority Senders

Keep important senders in inbox:

```javascript
const PRIORITY_SENDERS = [
  'boss@company.com',
  'client@important.com'
];

// Check before categorizing
if (PRIORITY_SENDERS.includes(senderEmail)) {
  return;  // Don't categorize
}
```

---

## Need Help?

- 📚 [Installation Guide](./installation.md)
- 💡 [FAQ](./faq.md)
- 🐛 [Report an issue](https://github.com/msylctt/chrono-lite/issues)
- 💬 [Discussions](https://github.com/msylctt/chrono-lite/discussions)

---

**Happy organizing! 📬** Enjoy your clean inbox with Chrono Lite.
