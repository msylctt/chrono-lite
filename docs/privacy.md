# Privacy Policy

**Last updated**: 2025-01-01

Chrono Lite is committed to protecting your privacy. This document explains how we handle your data.

---

## TL;DR (Summary)

- ✅ **Zero data collection**: We don't collect any personal data
- ✅ **No tracking**: No analytics, cookies, or telemetry
- ✅ **Local processing**: Everything runs in your Gmail via Apps Script
- ✅ **Open source**: All code is [auditable on GitHub](https://github.com/msylctt/chrono-lite)
- ✅ **No external servers**: We don't run any backend infrastructure

**Your email content never leaves your Gmail account.**

---

## Table of Contents

- [What Data We Access](#what-data-we-access)
- [What Data We Don't Access](#what-data-we-dont-access)
- [How We Process Data](#how-we-process-data)
- [Data Storage](#data-storage)
- [Third-Party Services](#third-party-services)
- [Required Permissions](#required-permissions)
- [Your Rights](#your-rights)
- [Security](#security)
- [Changes to This Policy](#changes-to-this-policy)

---

## What Data We Access

Chrono Lite **only accesses the minimum data necessary** to categorize emails:

### 1. Email Headers

**What we read**:
- ✅ `From` field (sender email address)
- ✅ `Subject` line (for heuristic pattern matching)
- ✅ `List-Unsubscribe` header (to detect newsletters)
- ✅ `Date` (to filter by time range)

**Why we need it**:
- To identify the sender and match against our database
- To detect newsletter characteristics
- To apply the correct category label

**Example**:
```
From: newsletter@example.com
Subject: Weekly Digest - Jan 2025
List-Unsubscribe: <mailto:unsubscribe@example.com>
```

---

### 2. Gmail Labels

**What we access**:
- ✅ Read existing label names
- ✅ Create new labels (e.g., "Newsletter", "Marketing")
- ✅ Apply labels to emails

**Why we need it**:
- To organize emails by category
- To check if a label already exists before creating

---

### 3. Thread Metadata

**What we access**:
- ✅ Thread ID (Gmail's internal identifier)
- ✅ Message count in thread
- ✅ Read/unread status

**Why we need it**:
- To avoid processing the same email multiple times
- To apply actions (mark read, archive) if configured

---

## What Data We Don't Access

Chrono Lite **never** accesses:

- ❌ **Email body content** (text, HTML)
- ❌ **Attachments** (files, images)
- ❌ **Contact lists**
- ❌ **Calendar events**
- ❌ **Google Drive files**
- ❌ **Location data**
- ❌ **Personal information** (name, age, etc.)
- ❌ **Payment information**

**Verification**: You can review the source code at [`Classifier.gs`](../src/Classifier.gs) to confirm we only use `message.getFrom()` and `message.getSubject()`.

---

## How We Process Data

### Local Processing Only

All email processing happens **locally in your Gmail account** via Google Apps Script:

1. **Fetch email headers** → Read sender email from Gmail API
2. **Query database** → Match against cached sender database
3. **Apply label** → Use Gmail API to add label
4. **Log result** → Write to Apps Script logs (stored in your Google account)

**No data leaves your Gmail account** during this process.

---

### Database Matching

When categorizing an email:

1. Extract sender email (e.g., `newsletter@example.com`)
2. Hash the email to find the correct cache shard
3. Query the sharded cache (stored in your Apps Script cache)
4. Return category if found (e.g., "newsletter")
5. Apply heuristic rules if not found

**Note**: The database query happens **locally in cache** - no network requests.

---

### Heuristic Rules

If a sender isn't in the database, we use pattern matching:

- Check for `List-Unsubscribe` header → Likely a newsletter
- Check subject line for keywords like "unsubscribe", "sale" → Likely marketing
- Check domain against common patterns

These rules run **locally** using only email headers.

---

## Data Storage

### What We Store

Chrono Lite stores data in **your Google Apps Script environment**:

| Data Type | Storage Location | Duration | Purpose |
|-----------|------------------|----------|---------|
| Sender database | CacheService | 6 hours | Email categorization |
| User config | PropertiesService | Permanent | Settings (until you delete) |
| Execution logs | Apps Script Logs | 30 days | Debugging |

**All stored in your Google account** - we don't have access to any of it.

---

### What We Don't Store

- ❌ Email content
- ❌ Sender lists (we query the database, not store results)
- ❌ User analytics
- ❌ Usage statistics
- ❌ IP addresses

---

### Cache Expiry

The sender database cache **automatically expires after 6 hours**. This:
- Keeps data fresh (database updates are picked up)
- Minimizes storage footprint
- Protects privacy (no long-term data retention)

---

## Third-Party Services

Chrono Lite uses **one external service**:

### jsDelivr CDN

**What it is**: A public, open-source CDN (Content Delivery Network)

**What we use it for**:
- Fetching the sender database ([`verified.json`](https://github.com/msylctt/chrono-lite/blob/main/data/verified.json))

**What data is sent to jsDelivr**:
- Your Apps Script IP address (required for HTTP requests)
- Request timestamp

**What jsDelivr does with it**:
- Serves the JSON file
- Standard CDN logging (IP, timestamp, user agent)
- See [jsDelivr Privacy Policy](https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net)

**Data protection**:
- The database is **public** (open-source on GitHub)
- No personal email data is sent to jsDelivr
- Only the database fetch request is made

---

### Google Apps Script

Chrono Lite runs on **Google Apps Script**, which is part of Google Cloud Platform.

**Data handling**:
- Governed by [Google's Privacy Policy](https://policies.google.com/privacy)
- Apps Script logs are stored in your Google account
- Google may access logs for debugging (standard practice)

**Your data remains in Google's infrastructure** - we don't have access.

---

## Required Permissions

When you authorize Chrono Lite, you grant these OAuth scopes:

### 1. `https://www.googleapis.com/auth/gmail.modify`

**What it allows**:
- Read email headers (From, Subject, etc.)
- Add/remove labels
- Mark emails as read/unread
- Archive/unarchive emails

**What it does NOT allow**:
- Send emails on your behalf
- Delete emails permanently
- Access email body content (though technically possible, we don't use it)

**Why we need it**: Core categorization functionality

---

### 2. `https://www.googleapis.com/auth/gmail.settings.basic`

**What it allows**:
- Create Gmail filters
- Read/modify filter settings

**What it does NOT allow**:
- Access emails
- Change account settings beyond filters

**Why we need it**: Optional feature to create filters based on categories

---

### 3. `https://www.googleapis.com/auth/gmail.addons.current.message.readonly`

**What it allows**:
- Read the currently open email (when you open an email)
- Display contextual cards in sidebar

**What it does NOT allow**:
- Access other emails
- Modify any data

**Why we need it**: To show category information when you open an email

---

### 4. `https://www.googleapis.com/auth/script.external_request`

**What it allows**:
- Make HTTP requests to external URLs

**Why we need it**: To fetch the sender database from jsDelivr CDN

**What URLs we access**:
- `https://cdn.jsdelivr.net/gh/msylctt/chrono-lite@latest/data/verified.json` (sender database)

You can verify this in [`Database.gs`](../src/Database.gs) - search for `UrlFetchApp.fetch()`.

---

## Your Rights

You have full control over your data:

### Right to Access

- ✅ All code is [open-source on GitHub](https://github.com/msylctt/chrono-lite)
- ✅ You can view Apps Script logs anytime
- ✅ You can inspect cached data via Apps Script console

---

### Right to Delete

You can delete all Chrono Lite data at any time:

1. **Revoke authorization**:
   - Go to https://myaccount.google.com/permissions
   - Find "Chrono Lite" and click "Remove access"

2. **Delete labels**:
   - In Gmail, go to Settings → Labels
   - Delete Chrono Lite labels (won't delete emails, just labels)

3. **Delete the script**:
   - Go to https://script.google.com
   - Delete the Chrono Lite project

**After deletion**:
- All cached data expires within 6 hours
- Stored config is permanently deleted
- Gmail labels remain (but you can delete manually)

---

### Right to Export

You can export categorization data:

1. Open Apps Script editor
2. Run this function:

```javascript
function exportData() {
  var cache = CacheService.getScriptCache();
  var meta = cache.get('sender_db_meta');
  Logger.log(meta);
}
```

3. View → Logs to see the data

---

## Security

### How We Protect Your Data

1. **No external storage**: Data stays in your Google account
2. **HTTPS only**: All network requests use encrypted connections
3. **Minimal permissions**: Only request what's absolutely necessary
4. **Open-source code**: Community-audited for security issues
5. **No authentication**: We don't store your credentials

---

### Apps Script Security

Google Apps Script provides:
- ✅ Sandboxed execution environment
- ✅ OAuth 2.0 authentication
- ✅ Automatic security scanning
- ✅ Rate limiting and quota management

---

### Reporting Security Issues

If you find a security vulnerability:

1. **Don't** open a public issue
2. Email us at: [security@chrono-lite.example.com](mailto:security@chrono-lite.example.com) <!-- TODO: Update email -->
3. Or report via [GitHub Security Advisories](https://github.com/msylctt/chrono-lite/security/advisories)

We'll respond within 48 hours.

---

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be:

1. Published on GitHub with a new version date
2. Announced in the [Discussions](https://github.com/msylctt/chrono-lite/discussions)
3. Highlighted in release notes

**Your continued use** of Chrono Lite after changes constitutes acceptance of the new policy.

---

## Contact

Questions about privacy?

- 📧 Email: [privacy@chrono-lite.example.com](mailto:privacy@chrono-lite.example.com) <!-- TODO: Update email -->
- 💬 Discuss: [GitHub Discussions](https://github.com/msylctt/chrono-lite/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/msylctt/chrono-lite/issues)

---

## Compliance

### GDPR (European Union)

Chrono Lite complies with GDPR principles:
- ✅ **Data minimization**: Only collect what's necessary
- ✅ **Purpose limitation**: Data used only for categorization
- ✅ **Storage limitation**: Cache expires after 6 hours
- ✅ **Transparency**: Open-source code
- ✅ **User control**: Easy deletion and revocation

**Data controller**: You (the user)
**Data processor**: Google Apps Script (on your behalf)

---

### CCPA (California)

Under CCPA, you have the right to:
- ✅ Know what data is collected (see "What Data We Access" above)
- ✅ Delete your data (see "Right to Delete" above)
- ✅ Opt-out of data sales (**N/A** - we don't sell any data)

---

### Children's Privacy

Chrono Lite does not knowingly collect data from children under 13. If you believe a child has used Chrono Lite, please contact us.

---

## Open Source Transparency

Unlike proprietary email tools, Chrono Lite is **fully transparent**:

- 📖 **Source code**: https://github.com/msylctt/chrono-lite
- 📊 **Sender database**: https://github.com/msylctt/chrono-lite/blob/main/data/verified.json
- 🔍 **No obfuscation**: All code is human-readable
- 🛡️ **Community audited**: Anyone can review and report issues

**Don't trust, verify.**

---

**Summary**: Chrono Lite is designed to be **privacy-first**. Your email data stays in your Gmail account, and we don't collect anything. Period.

If you have concerns, please [open an issue](https://github.com/msylctt/chrono-lite/issues) or [start a discussion](https://github.com/msylctt/chrono-lite/discussions).
