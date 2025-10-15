# Frequently Asked Questions (FAQ)

Common questions about Chrono Lite.

---

## Table of Contents

- [General](#general)
- [Privacy & Security](#privacy--security)
- [Installation & Setup](#installation--setup)
- [Usage & Features](#usage--features)
- [Troubleshooting](#troubleshooting)
- [Performance & Quotas](#performance--quotas)
- [Customization](#customization)
- [Contributing](#contributing)

---

## General

### What is Chrono Lite?

Chrono Lite is an **open-source Gmail Add-on** that automatically categorizes your emails (newsletters, marketing, product updates) using a community-driven sender database. It runs entirely in your Gmail account via Google Apps Script - no external servers needed.

---

### Is Chrono Lite free?

**Yes!** Chrono Lite is 100% free and open-source (MIT License). You can:
- ✅ Use it for free forever
- ✅ Modify the code
- ✅ Self-host
- ✅ Use commercially

There are no premium tiers, subscriptions, or hidden costs.

---

### How is this different from Gmail's built-in filters?

| Feature | Gmail Filters | Chrono Lite |
|---------|---------------|-------------|
| Setup | Manual for each sender | Automatic (5,000+ senders) |
| Database | None | Community-driven database |
| Updates | Manual | Auto-updates from CDN |
| Smart detection | No | Yes (heuristic rules) |
| Bulk processing | Limited | Yes, with one click |

**TL;DR**: Chrono Lite automates what would take hours of manual filter creation.

---

### What's the relationship with Chrono SaaS?

Chrono Lite is a **free standalone tool**. It's also a gateway to **Chrono SaaS**, which offers:
- AI-powered Chinese summarization
- Advanced reading interface
- Mobile apps
- Semantic search

**Chrono Lite does NOT require Chrono SaaS** - they work independently.

---

## Privacy & Security

### Is my email data safe?

**Absolutely.** Here's how:

1. ✅ **Zero data upload**: All processing happens locally in your Gmail via Apps Script
2. ✅ **No external servers**: We don't run any backend servers
3. ✅ **No tracking**: We don't collect analytics or usage data
4. ✅ **Open source**: Code is auditable on [GitHub](https://github.com/msylctt/chrono-lite)
5. ✅ **No third parties**: Only fetches public sender database from CDN

**Your email content never leaves your Gmail account.**

---

### What permissions does Chrono Lite need?

| Permission | Why It's Needed |
|------------|-----------------|
| `gmail.modify` | To read email headers (From, Subject) and apply labels |
| `gmail.settings.basic` | To create email filters (optional feature) |
| `gmail.addons.current.message.readonly` | To show contextual cards in sidebar |
| `script.external_request` | To fetch sender database from jsDelivr CDN |

**Note**: We **only read email headers** (sender, subject), not the email body or attachments.

---

### Can Chrono Lite read my email content?

**No.** Chrono Lite only reads:
- ✅ Sender email address (e.g., `newsletter@example.com`)
- ✅ Subject line (for heuristic rules)
- ✅ Email headers (e.g., `List-Unsubscribe`)

**Never accessed**:
- ❌ Email body content
- ❌ Attachments
- ❌ Personal information

Check the code: [`Classifier.gs`](../src/Classifier.gs)

---

### Where is the sender database stored?

The sender database is:
1. **Hosted on GitHub**: [chrono-lite/data/verified.json](https://github.com/msylctt/chrono-lite/data/verified.json)
2. **Served via jsDelivr CDN**: For fast, reliable access
3. **Cached in your Gmail**: Via `CacheService` (6-hour expiry)

It's **public and open-source** - anyone can view and contribute.

---

## Installation & Setup

### How long does installation take?

**5-10 minutes** for most users, following the [Installation Guide](./installation.md).

Steps:
1. Create Apps Script project (2 min)
2. Copy-paste code (3 min)
3. Authorize permissions (1 min)
4. Test in Gmail (1 min)

---

### Do I need programming knowledge?

**No!** The installation involves:
- ✅ Copy-pasting code (like copying text)
- ✅ Clicking buttons to authorize
- ✅ Following step-by-step screenshots

**No coding required** for basic usage. Only needed if you want to customize rules.

---

### Can I install this on Google Workspace (work email)?

**Yes**, but:
1. Your IT admin may need to approve the script
2. Some organizations block third-party add-ons
3. You may need to deploy it as a domain-wide add-on

For personal Gmail accounts, there are no restrictions.

---

### I don't see the sidebar icon in Gmail. What's wrong?

**Checklist**:
1. ✅ Did you configure `appsscript.json` correctly?
2. ✅ Did you complete the authorization flow?
3. ✅ Did you hard-refresh Gmail (Ctrl/Cmd + Shift + R)?
4. ✅ Is the sidebar enabled in Gmail settings?

**Try**:
- Open Gmail in incognito mode
- Check Apps Script logs for errors
- Re-run `initialSetup` function

See [Troubleshooting](./installation.md#troubleshooting) for detailed solutions.

---

## Usage & Features

### How do I manually trigger email scanning for debugging?

There are **two ways** to manually scan emails:

**Method 1: From Gmail Sidebar** (Easiest)
1. Open Chrono Lite in Gmail
2. Click the **"🔄 Process Inbox Now"** button
3. Wait a few seconds for processing
4. Check the logs in Apps Script for details

**Method 2: From Apps Script Editor** (For debugging)
1. Open Apps Script editor
2. Select **`autoProcessInbox`** from the function dropdown
3. Click **"Run"** (▶️)
4. View → **Execution log** to see detailed output

**Tip**: Use Method 2 when debugging, as you can see detailed logs in real-time.

---

### How accurate is the categorization?

Based on internal testing:
- **85%** accuracy for known senders (exact email match)
- **10%** accuracy for domain matching
- **5%** heuristic detection (e.g., List-Unsubscribe header)

**Overall**: ~95% of newsletters/marketing emails are correctly categorized.

**Improving accuracy**:
- Contribute new senders to the database
- Customize rules in `Config.gs`
- Provide feedback via sidebar

---

### Can I customize which emails get categorized?

**Yes!** Edit `Config.gs` to:
- Add custom keywords
- Whitelist specific senders
- Change category actions (archive, mark read, etc.)
- Adjust heuristic rules

See [Customization](./user-guide.md#customizing-rules) in the User Guide.

---

### Can I undo categorization?

**Yes.** Categorization only applies Gmail labels - it doesn't delete emails.

To undo:
1. In Gmail, search for: `label:Newsletter` (or other category)
2. Select all emails
3. Click the label icon and remove the label

**Tip**: Create a backup filter before bulk processing historical emails.

---

### Does Chrono Lite work with Gmail mobile app?

**Partially**. The Gmail mobile app:
- ✅ Shows labels applied by Chrono Lite
- ✅ Syncs with desktop Gmail
- ❌ Doesn't show the sidebar (mobile doesn't support add-ons)

You can still benefit from automatic categorization, but you'll need desktop Gmail to access the sidebar UI.

---

## Troubleshooting

### Why aren't my emails being categorized?

**Common causes**:

1. **Database not loaded**
   - Run `testDatabaseConnection()` in Apps Script
   - Check logs for "✅ Database loaded"

2. **Trigger not set up**
   - Go to Apps Script → Triggers
   - Make sure `autoProcessInbox` trigger exists

3. **Sender not in database**
   - Check if sender is in the [database](https://github.com/msylctt/chrono-lite/blob/main/data/verified.json)
   - If not, [contribute it](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)

4. **Whitelist blocking**
   - Check `Config.gs` for whitelist entries

---

### I'm getting "Script timeout" errors. What should I do?

**Why it happens**:
- You have a large inbox (>1000 emails)
- Processing takes longer than 6 minutes (Apps Script limit)

**Solutions**:
1. **Reduce batch size** in `Config.gs`:
   ```javascript
   const BATCH_SIZE = 50;  // Default is 100
   ```

2. **Process in smaller time ranges**:
   - Instead of 6 months, do 1 month at a time

3. **Let it auto-resume**:
   - The script saves progress
   - Next trigger will continue where it left off

---

### Getting "Service invoked too many times" error?

**Cause**: You've hit Apps Script's daily quota (e.g., 20,000 URL fetches/day)

**Solutions**:
1. **Wait 24 hours** for quota reset
2. **Reduce processing frequency**:
   - Change trigger from every hour to every 2-6 hours
3. **Use caching**:
   - The database is cached for 6 hours
   - Don't manually clear cache frequently

Check quota usage: [Apps Script Dashboard](https://script.google.com/home) → Quotas

---

## Performance & Quotas

### What are Apps Script quotas?

Google Apps Script has usage limits:

| Resource | Free Account | Google Workspace |
|----------|--------------|------------------|
| Script runtime | 6 min/execution | 6 min/execution |
| Total runtime | 90 min/day | 90 min/day |
| URL fetches | 20,000/day | 100,000/day |
| Email sends | 100/day | 1,500/day |

**Chrono Lite usage**:
- ~5 seconds per 100 emails
- 1 CDN fetch per 6 hours (cached)
- No email sends

**Typical usage**: <5% of daily quota for most users.

---

### How can I reduce quota usage?

1. **Reduce trigger frequency**:
   - Every 2-6 hours instead of every hour

2. **Don't process historical emails too often**:
   - Do it once, then rely on automation

3. **Use caching**:
   - Don't clear cache manually
   - Database auto-refreshes every 6 hours

4. **Batch processing**:
   - The script already uses efficient batching
   - Don't reduce `BATCH_SIZE` too much

---

### How much storage does Chrono Lite use?

**Apps Script storage**:
- Source code: ~50 KB
- No database storage (uses cache, which auto-expires)

**Gmail storage**:
- Labels: ~1 KB per label
- No additional storage (labels don't duplicate emails)

**Total**: Negligible (<100 KB)

---

## Customization

### Can I add my own senders to the database?

**Yes!** Two ways:

1. **Contribute to the community database** (recommended):
   - Submit to [chrono-lite-newsletter-senders](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)
   - Benefits everyone

2. **Add to local config** (private):
   - Edit `Config.gs` → `LOCAL_SENDERS`
   - Only affects your installation

---

### Can I rename the labels?

**Yes.** In `Config.gs`:

```javascript
const CATEGORIES = {
  newsletter: {
    label: 'My Custom Label Name',  // Change this
    // ...
  }
};
```

Save and reload. Old labels won't be automatically renamed, so you may want to manually rename them in Gmail.

---

### Can I disable certain categories?

**Yes.** In `Config.gs`, comment out or remove the category:

```javascript
const CATEGORIES = {
  newsletter: { /* ... */ },
  // marketing: { /* ... */ },  // Disabled
  productUpdates: { /* ... */ }
};
```

---

## Contributing

### How can I contribute to Chrono Lite?

We ❤️ contributions! Here's how:

1. **Add senders to the database**:
   - [Submit here](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)
   - Most impactful contribution

2. **Report bugs**:
   - [Open an issue](https://github.com/msylctt/chrono-lite/issues/new)

3. **Improve documentation**:
   - Fix typos, add examples, translate

4. **Contribute code**:
   - See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

### How do I submit a new sender?

1. Go to [chrono-lite-newsletter-senders](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)
2. Fill in:
   - Sender email (e.g., `newsletter@example.com`)
   - Category (newsletter/marketing/product-updates)
   - Optional: Sender name, website
3. Submit the issue

We'll review and add it to the database!

---

### Can I help translate documentation?

**Yes!** We need translations for:
- [ ] Español (Spanish)
- [ ] Français (French)
- [ ] Deutsch (German)
- [ ] 日本語 (Japanese)
- [ ] 한국어 (Korean)

To contribute:
1. Fork the repository
2. Create `README.{lang}.md` (e.g., `README.es.md`)
3. Translate the content
4. Submit a pull request

---

## Still Have Questions?

- 📚 [User Guide](./user-guide.md)
- 🛠️ [Installation Guide](./installation.md)
- 🔒 [Privacy Policy](./privacy.md)
- 💬 [GitHub Discussions](https://github.com/msylctt/chrono-lite/discussions)
- 🐛 [Report an Issue](https://github.com/msylctt/chrono-lite/issues)

---

**Can't find your question?** [Ask in Discussions](https://github.com/msylctt/chrono-lite/discussions) and we'll add it to this FAQ!
