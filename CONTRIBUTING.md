# Contributing to Chrono Lite

Thank you for your interest in contributing to Chrono Lite! 🎉

We welcome contributions of all kinds: code, documentation, bug reports, feature requests, and especially **sender database contributions**.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Contributing Sender Data](#contributing-sender-data)
- [Contributing Code](#contributing-code)
- [Contributing Documentation](#contributing-documentation)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Development Setup](#development-setup)
- [Code Style Guide](#code-style-guide)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)

---

## How to Contribute

There are many ways to contribute to Chrono Lite:

| Contribution Type | Difficulty | Impact | Where to Start |
|-------------------|------------|--------|----------------|
| 📬 **Add senders** | Easy | High | [Sender DB repo](https://github.com/msylctt/chrono-lite-newsletter-senders) |
| 🐛 **Report bugs** | Easy | Medium | [Issues](https://github.com/msylctt/chrono-lite/issues) |
| 📖 **Improve docs** | Easy | Medium | [Documentation files](./docs/) |
| 🌍 **Translate** | Medium | High | [README files](./README.md) |
| 💻 **Write code** | Hard | High | [Development guide](#development-setup) |
| 💡 **Suggest features** | Easy | Varies | [Discussions](https://github.com/msylctt/chrono-lite/discussions) |

**New contributors**: Start with **adding senders** - it's the most impactful and easiest way to help!

---

## Contributing Sender Data

The sender database is the heart of Chrono Lite. Expanding it improves accuracy for everyone.

### How to Submit Senders

1. **Check if already exists**:
   - Search the [verified.json](https://github.com/msylctt/chrono-lite/blob/main/data/verified.json) file
   - Or search in the [issues](https://github.com/msylctt/chrono-lite-newsletter-senders/issues)

2. **Create an issue**:
   - Go to [chrono-lite-newsletter-senders](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)
   - Use the "Add Sender" template

3. **Fill in the details**:
   ```
   Sender email: newsletter@example.com
   Category: newsletter
   Name: Example Newsletter
   Website: https://example.com (optional)
   Verification: I receive this email regularly
   ```

4. **Submit and wait for review**:
   - Maintainers will verify the sender
   - Once approved, it's added to the database
   - Database updates propagate to all users within 24 hours

---

### Sender Submission Guidelines

#### What to Submit

✅ **Good submissions**:
- Newsletters (e.g., Morning Brew, TechCrunch)
- Marketing emails (e.g., Amazon promotions, Uber discounts)
- Product updates (e.g., GitHub releases, Notion updates)
- Social notifications (e.g., LinkedIn, Twitter)

❌ **Don't submit**:
- Personal emails (e.g., `john@gmail.com`)
- Company-internal emails (e.g., `hr@mycompany.com`)
- Transactional emails (e.g., receipts, confirmations)
- Spam or suspicious senders

---

#### Category Definitions

| Category | Description | Examples |
|----------|-------------|----------|
| `newsletter` | Editorial content, digests, articles | Morning Brew, Substack, media newsletters |
| `marketing` | Promotions, sales, offers | Amazon deals, Uber discounts, retail ads |
| `product-updates` | Product announcements, release notes | GitHub releases, Notion updates |
| `social` | Social media notifications | LinkedIn, Twitter, Reddit |
| `transactional` | Receipts, confirmations, shipping | Avoid submitting these |

**When in doubt**: Choose `newsletter` for editorial content, `marketing` for promotions.

---

#### Verification Required

To prevent spam and ensure quality, we require:

1. ✅ **You personally receive** emails from this sender
2. ✅ **Sender is legitimate** (not spam or phishing)
3. ✅ **Sender is consistent** (sends regularly, not one-off)
4. ✅ **Category is accurate** (matches the definition above)

**Verification statement** in your submission:
```
I confirm that I receive emails from this sender and the category is accurate.
```

---

### Bulk Submissions

Have many senders to submit? Use this format:

```json
[
  {
    "email": "newsletter1@example.com",
    "category": "newsletter",
    "name": "Example Newsletter 1"
  },
  {
    "email": "newsletter2@example.com",
    "category": "newsletter",
    "name": "Example Newsletter 2"
  }
]
```

Submit as a GitHub issue with the label `bulk-submission`.

---

## Contributing Code

We welcome code contributions! Here's how to get started.

### Development Setup

#### Prerequisites

- Node.js (v14+)
- npm or yarn
- Git
- Google account (for Apps Script)

#### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/chrono-lite.git
cd chrono-lite
```

#### 2. Install Clasp

```bash
npm install -g @google/clasp
clasp login
```

#### 3. Create Apps Script Project

```bash
clasp create --type standalone --title "Chrono Lite Dev"
```

This creates a `.clasp.json` file with your script ID.

#### 4. Push and Test

```bash
# Push code to Apps Script
clasp push

# Open in editor
clasp open

# View logs
clasp logs --watch
```

See [CLAUDE.md](./CLAUDE.md) for detailed development guide.

---

### Development Workflow

```bash
# 1. Create a feature branch
git checkout -b feature/my-new-feature

# 2. Make changes
# Edit files in src/

# 3. Push to Apps Script for testing
clasp push

# 4. Test in Apps Script editor
# Run functions, check logs

# 5. Commit your changes
git add .
git commit -m "feat: add new feature"

# 6. Push to GitHub
git push origin feature/my-new-feature

# 7. Create a Pull Request
# Go to GitHub and create PR
```

---

## Code Style Guide

### JavaScript Style

We follow **Google Apps Script best practices**:

#### 1. Naming Conventions

```javascript
// ✅ Good
const CATEGORY_LABELS = { /* ... */ };  // Constants: UPPER_SNAKE_CASE
function loadSenderDatabase() { /* ... */ }  // Functions: camelCase
var userEmail = 'test@example.com';  // Variables: camelCase

// ❌ Bad
const category_labels = { /* ... */ };
function load_sender_database() { /* ... */ }
var UserEmail = 'test@example.com';
```

---

#### 2. Function Documentation

Use JSDoc comments:

```javascript
/**
 * Loads the sender database from CDN and stores in cache
 * @returns {Object} Database metadata {version, count, shardCount}
 */
function loadSenderDatabaseFromCDN() {
  // Implementation
}
```

---

#### 3. Error Handling

Always use try-catch for external calls:

```javascript
// ✅ Good
try {
  var response = UrlFetchApp.fetch(CDN_URL);
  var data = JSON.parse(response.getContentText());
} catch (error) {
  Logger.log('❌ Failed to load from CDN: ' + error);
  return fallbackData();
}

// ❌ Bad
var response = UrlFetchApp.fetch(CDN_URL);  // No error handling
```

---

#### 4. Logging

Use descriptive log messages with emojis:

```javascript
// ✅ Good
Logger.log('✅ Database loaded: ' + count + ' senders');
Logger.log('⚠️ Sender not found: ' + email);
Logger.log('❌ Error: ' + error.message);

// ❌ Bad
Logger.log('done');
Logger.log(email);
```

---

#### 5. Performance

Prefer batch operations:

```javascript
// ✅ Good - batch query
var results = queryBatch(['email1', 'email2', 'email3']);

// ❌ Bad - individual queries
var r1 = querySender('email1');
var r2 = querySender('email2');
var r3 = querySender('email3');
```

---

### File Organization

Each `.gs` file should have a **single responsibility**:

```
Code.gs          → Main entry points and orchestration
Config.gs        → Configuration constants
Database.gs      → Data loading and caching
Classifier.gs    → Email classification logic
Actions.gs       → Gmail actions (label, archive, etc.)
UI.gs            → Gmail sidebar cards
```

**Don't** mix concerns (e.g., don't put UI code in `Database.gs`).

---

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <subject>

# Types
feat: New feature
fix: Bug fix
docs: Documentation changes
refactor: Code refactoring
test: Adding tests
chore: Maintenance tasks

# Examples
feat(classifier): add domain matching fallback
fix(database): handle CDN timeout gracefully
docs(readme): update installation instructions
refactor(ui): simplify card layout logic
```

---

## Contributing Documentation

Documentation improvements are highly valued!

### What to Document

- Installation steps
- Usage examples
- Troubleshooting tips
- Code explanations
- FAQ entries

### Documentation Guidelines

1. **Be clear and concise**: Avoid jargon
2. **Use examples**: Show, don't just tell
3. **Add screenshots**: Visual aids help (use placeholders: `<!-- TODO: Add screenshot -->`)
4. **Test instructions**: Make sure they work
5. **Keep it updated**: Remove outdated info

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start |
| `README.zh-CN.md` | Chinese version |
| `docs/installation.md` | Detailed installation guide |
| `docs/user-guide.md` | How to use Chrono Lite |
| `docs/faq.md` | Common questions |
| `docs/privacy.md` | Privacy policy |
| `CLAUDE.md` | Developer guide |

---

### Translating Documentation

To add a new language:

1. Create `README.<lang>.md` (e.g., `README.es.md` for Spanish)
2. Translate content from `README.md`
3. Keep **code blocks and technical terms** in English
4. Update the language selector:
   ```markdown
   [English](./README.md) | [简体中文](./README.zh-CN.md) | [Español](./README.es.md)
   ```
5. Submit a Pull Request

**Priority languages**: Spanish, French, Japanese, Korean, German

---

## Reporting Bugs

Found a bug? Help us fix it!

### Before Reporting

1. **Search existing issues**: Your bug may already be reported
2. **Try the latest version**: Update and test again
3. **Check the FAQ**: [docs/faq.md](./docs/faq.md)

### How to Report

1. Go to [Issues](https://github.com/msylctt/chrono-lite/issues/new)
2. Choose "Bug Report" template
3. Fill in:
   - **Description**: What happened vs. what you expected
   - **Steps to reproduce**: Numbered list
   - **Environment**: Browser, Gmail version, etc.
   - **Logs**: Apps Script execution logs
   - **Screenshots**: If applicable

### Good Bug Report Example

```markdown
**Description**
Emails from `newsletter@example.com` are not being categorized.

**Steps to Reproduce**
1. Install Chrono Lite
2. Run `initialSetup()`
3. Check email from `newsletter@example.com`
4. No label applied

**Expected Behavior**
Email should have "Newsletter" label

**Actual Behavior**
No label applied, sender not found in database

**Environment**
- Browser: Chrome 120
- Gmail version: Latest
- Apps Script: V8 runtime

**Logs**
```
⚠️ Sender not found: newsletter@example.com
```

**Additional Context**
This sender sends weekly newsletters. I can provide a sample email header if needed.
```

---

## Requesting Features

Have an idea? We'd love to hear it!

### Before Requesting

1. **Check existing discussions**: [Discussions](https://github.com/msylctt/chrono-lite/discussions)
2. **Read the roadmap**: [README.md](./README.md#roadmap)

### How to Request

1. Go to [Discussions](https://github.com/msylctt/chrono-lite/discussions/new)
2. Choose "Feature Request" category
3. Describe:
   - **Problem**: What problem does this solve?
   - **Proposed solution**: How should it work?
   - **Alternatives**: Other ways to achieve the same goal
   - **Impact**: Who benefits from this?

**Tip**: Features that align with the project vision (privacy-first, open-source, lightweight) are more likely to be accepted.

---

## Pull Request Process

### Before Submitting

- [ ] Code follows [style guide](#code-style-guide)
- [ ] Tested in Apps Script editor
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow [conventions](#git-commit-messages)
- [ ] No merge conflicts with `main`

### Submitting

1. **Create a Pull Request** on GitHub
2. **Fill in the PR template**:
   - What does this PR do?
   - Related issue number (if any)
   - Screenshots/logs (if applicable)
3. **Request review** from maintainers
4. **Respond to feedback** promptly

### Review Process

1. **Automated checks**: Code linting, tests (if added)
2. **Maintainer review**: Code quality, functionality
3. **Testing**: Maintainer tests in Apps Script
4. **Approval and merge**: Once approved, PR is merged

**Typical turnaround**: 1-3 days for initial review

---

## Community Guidelines

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

**TL;DR**: Be respectful, inclusive, and constructive.

### Communication Channels

- 💬 **Discussions**: General questions, ideas, announcements
- 🐛 **Issues**: Bug reports, feature requests (actionable items)
- 📧 **Email**: [contribute@chrono-lite.example.com](mailto:contribute@chrono-lite.example.com) <!-- TODO: Update -->

### Recognition

Contributors are recognized in:
- [README.md](./README.md#acknowledgments)
- GitHub contributors page
- Release notes (for significant contributions)

---

## Questions?

- 📖 Read the [FAQ](./docs/faq.md)
- 💬 Ask in [Discussions](https://github.com/msylctt/chrono-lite/discussions)
- 📧 Email: [contribute@chrono-lite.example.com](mailto:contribute@chrono-lite.example.com)

---

**Thank you for contributing to Chrono Lite!** 🎉

Every contribution, no matter how small, makes a difference. Together, we're building a better email experience for everyone.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
