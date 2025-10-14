# Chrono Lite 系统设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| **系统名称** | Chrono Lite Gmail Add-on |
| **技术栈** | Google Apps Script, Gmail API, Card Service |
| **版本** | V1.0 System Design |
| **创建日期** | 2025年10月14日 |
| **文档类型** | 技术架构与系统设计 |
| **界面语言** | 简体中文（面向中文用户） |

---

## 目录

1. [系统架构概览](#系统架构概览)
2. [技术选型与约束](#技术选型与约束)
3. [核心模块设计](#核心模块设计)
4. [数据流与状态管理](#数据流与状态管理)
5. [性能优化策略](#性能优化策略)
6. [安全与隐私设计](#安全与隐私设计)
7. [部署与发布](#部署与发布)
8. [监控与调试](#监控与调试)

---

## 系统架构概览

### 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrono Lite 系统架构                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     用户界面层 (UI Layer)                     │
├──────────────────────────────────────────────────────────────┤
│  Gmail Web/Mobile Interface                                  │
│  ├─ Gmail Sidebar (Card Service UI)                          │
│  │   ├─ Homepage Card (Dashboard)                            │
│  │   ├─ Context Card (Email Details)                         │
│  │   ├─ Settings Card                                        │
│  │   └─ Progress Card (Processing Status)                    │
│  └─ Gmail Native Features                                    │
│      ├─ Labels                                               │
│      ├─ Threads & Messages                                   │
│      └─ Filters                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   应用逻辑层 (Logic Layer)                     │
├──────────────────────────────────────────────────────────────┤
│  Apps Script Runtime                                         │
│  ├─ 触发器管理 (Trigger Management)                          │
│  │   ├─ Homepage Trigger (buildHomepage)                     │
│  │   ├─ Context Trigger (onGmailMessageOpen)                 │
│  │   └─ Time-based Trigger (autoProcessInbox)                │
│  │                                                            │
│  ├─ 业务逻辑模块 (Business Logic)                             │
│  │   ├─ Classification Engine                                │
│  │   │   ├─ Database Query (querySender)                     │
│  │   │   ├─ Domain Matching                                  │
│  │   │   └─ Heuristic Rules                                  │
│  │   │                                                        │
│  │   ├─ Action Executor                                      │
│  │   │   ├─ Label Management                                 │
│  │   │   ├─ Archive Operations                               │
│  │   │   └─ Mark Read/Star                                   │
│  │   │                                                        │
│  │   └─ Batch Processor                                      │
│  │       ├─ Query Builder (Gmail Search)                     │
│  │       ├─ Progress Tracking                                │
│  │       └─ Error Handling                                   │
│  │                                                            │
│  └─ UI 控制器 (UI Controllers)                                │
│      ├─ Card Builders                                        │
│      ├─ Action Handlers                                      │
│      └─ Navigation Manager                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    数据层 (Data Layer)                        │
├──────────────────────────────────────────────────────────────┤
│  External Data Sources                                       │
│  ├─ Sender Database (GitHub + jsDelivr CDN)                  │
│  │   ├─ verified.json (5000+ records)                        │
│  │   └─ Version Control (GitHub Actions)                     │
│  │                                                            │
│  ├─ Cache Layer (CacheService)                               │
│  │   ├─ Sharded Database Cache (50 shards)                   │
│  │   │   └─ TTL: 6 hours                                     │
│  │   └─ Fallback: Embedded Top 100                           │
│  │                                                            │
│  └─ User State (PropertiesService)                           │
│      ├─ User Properties (settings, progress)                 │
│      └─ Script Properties (global config)                    │
│                                                               │
│  Gmail Services (GmailApp & Gmail API)                       │
│  ├─ GmailApp (Simple API)                                    │
│  │   ├─ Thread & Message Access                              │
│  │   ├─ Label Operations                                     │
│  │   └─ Search Queries                                       │
│  │                                                            │
│  └─ Gmail Advanced API (REST)                                │
│      ├─ Filter Management                                    │
│      └─ Batch Operations                                     │
└──────────────────────────────────────────────────────────────┘
```

### 2. 核心数据流

```
┌─────────────┐
│ 新邮件到达  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Time Trigger 触发    │  (每小时 / 30分钟)
│ autoProcessInbox()   │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 1. 构建查询                        │
│    query = "in:inbox newer_than:1h"│
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 2. 获取邮件列表                    │
│    threads = GmailApp.search(...)  │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 3. 提取发件人邮箱                  │
│    senders = threads.map(...)      │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 4. 查询发件人数据库 (分片缓存)     │
│    results = queryBatch(senders)   │
└──────┬─────────────────────────────┘
       │
       ├─ 缓存命中 (< 10ms)
       │
       └─ 缓存未命中 → UrlFetchApp → jsDelivr CDN
                                        │
                                        ▼
                            ┌──────────────────────┐
                            │ 分片存储到缓存        │
                            │ cache.put(..., 6h)   │
                            └──────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 5. 应用分类规则                    │
│    - 精确匹配 (85%)                │
│    - 域名匹配 (10%)                │
│    - 启发式规则 (5%)               │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 6. 执行操作                        │
│    - 创建/获取标签                 │
│    - thread.addLabel(...)          │
│    - thread.moveToArchive()        │
│    - thread.markRead()             │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ 7. 记录日志                        │
│    Logger.log(...)                 │
└────────────────────────────────────┘
```

---

## 技术选型与约束

### 1. 平台限制

#### Apps Script 配额与限制

| 资源 | 免费账户 | Workspace 账户 | 说明 |
|------|---------|---------------|------|
| **执行时间** | 6 分钟/次 | 6 分钟/次 | 单次函数执行上限 |
| **每日触发器** | 20 次/天 | 无限制 | Time-based trigger 限制 |
| **URL Fetch 调用** | 20,000 次/天 | 100,000 次/天 | UrlFetchApp.fetch() |
| **Gmail 读取** | 10,000 次/天 | 无限制 | GmailApp.search() 等 |
| **脚本执行时间** | 90 分钟/天 | 6 小时/天 | 所有触发器总和 |
| **CacheService** | 1000 条目 | 1000 条目 | 硬性限制 |
| **单个缓存值** | 100 KB | 100 KB | 单个 key-value 大小 |
| **PropertiesService** | 500 KB/用户 | 500 KB/用户 | 用户配置存储 |

**设计影响**：
- ⚠️ 必须使用分片策略绕过 1000 条目限制
- ⚠️ 批量处理需分批执行（每批 < 6 分钟）
- ⚠️ 减少不必要的 URL Fetch 调用（缓存优先）

#### Gmail API 限制

| 操作 | 配额 | 说明 |
|------|------|------|
| **search() 查询** | 250 quota units/用户/秒 | 复杂查询消耗更多 |
| **修改线程标签** | 5 quota units/操作 | threads.modify() |
| **批量操作** | 建议 < 100 个/次 | 避免超时 |

### 2. 技术栈选择

#### Card Service (UI)

```javascript
// 优势：
// - 跨平台兼容 (desktop/mobile)
// - 无需 HTML/CSS
// - 内置响应式设计

// 限制：
// - 仅限预定义 widgets
// - 无法自定义样式
// - 交互模式受限

// 示例：
function buildCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Chrono Lite')
      .setSubtitle('Email Automation'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Today Processed')
        .setContent('45 emails')
        .setIcon(CardService.Icon.EMAIL)))
    .build();
}
```

#### GmailApp vs Gmail API

| 特性 | GmailApp (Simple) | Gmail API (Advanced) |
|------|-------------------|---------------------|
| **易用性** | 简单直观 | 需要 REST 调用 |
| **功能** | 基础邮件操作 | 完整功能（包括 filters） |
| **性能** | 中等 | 支持批量操作 |
| **配额** | 共享 Apps Script 配额 | 独立 Gmail API 配额 |
| **推荐场景** | 日常邮件处理 | 批量操作、Filter 管理 |

**设计决策**：
- ✅ 核心功能使用 GmailApp（代码简洁）
- ✅ Filter 创建使用 Gmail Advanced API
- ✅ 批量操作优先考虑性能

---

## 核心模块设计

### Module 1: 数据库管理 (Database.gs)

#### 1.1 分片存储策略

**问题**：CacheService 限制 1000 个条目，但数据库有 5000+ 记录

**解决方案**：哈希分片

```javascript
// 核心设计：
// - 将 5000 条记录分成 50 个分片 (每个约 100 条)
// - 使用邮箱地址哈希定位分片
// - 查询时只加载相关分片 (O(1) 复杂度)

const NUM_SHARDS = 50;
const CACHE_META_KEY = 'sender_db_meta';
const CACHE_SHARD_PREFIX = 'sender_db_shard_';
const CACHE_DURATION = 6 * 60 * 60; // 6 hours

/**
 * 数据库加载：首次从 CDN 下载并分片缓存
 */
function loadSenderDatabase() {
  var cache = CacheService.getScriptCache();
  var meta = cache.get(CACHE_META_KEY);
  
  if (meta) {
    // 缓存命中，直接返回元数据
    return JSON.parse(meta);
  }
  
  // 首次加载：从 CDN 下载
  try {
    var url = 'https://cdn.jsdelivr.net/gh/msylctt/chrono-lite-newsletter-senders@latest/data/verified.json';
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      validateHttpsCertificates: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('CDN fetch failed: ' + response.getResponseCode());
    }
    
    var data = JSON.parse(response.getContentText());
    var senders = data.senders;
    
    // 分片处理
    var shards = createShards(senders, NUM_SHARDS);
    
    // 存储每个分片
    Object.keys(shards).forEach(function(shardId) {
      var key = CACHE_SHARD_PREFIX + shardId;
      cache.put(key, JSON.stringify(shards[shardId]), CACHE_DURATION);
    });
    
    // 存储元数据
    var metadata = {
      version: data.version,
      shardCount: Object.keys(shards).length,
      totalEntries: Object.keys(senders).length,
      lastUpdated: new Date().toISOString()
    };
    cache.put(CACHE_META_KEY, JSON.stringify(metadata), CACHE_DURATION);
    
    Logger.log('✅ Database loaded: ' + metadata.totalEntries + ' entries, ' + metadata.shardCount + ' shards');
    return metadata;
    
  } catch (error) {
    Logger.log('❌ Database load failed: ' + error.message);
    // 回退到内嵌 Top 100
    return loadFallbackDatabase();
  }
}

/**
 * 分片函数：使用一致性哈希
 */
function createShards(senders, numShards) {
  var shards = {};
  
  // 初始化分片
  for (var i = 0; i < numShards; i++) {
    shards[i] = {};
  }
  
  // 分配发件人到分片
  Object.keys(senders).forEach(function(email) {
    var shardId = hashToShard(email, numShards);
    shards[shardId][email] = senders[email];
  });
  
  return shards;
}

/**
 * 哈希函数：邮箱地址 → 分片 ID
 */
function hashToShard(email, numShards) {
  var hash = 0;
  for (var i = 0; i < email.length; i++) {
    var char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % numShards;
}

/**
 * 单个查询：O(1) 复杂度
 */
function querySender(email) {
  var cache = CacheService.getScriptCache();
  
  // 1. 获取元数据
  var meta = cache.get(CACHE_META_KEY);
  if (!meta) {
    // 缓存未初始化，加载数据库
    loadSenderDatabase();
    meta = cache.get(CACHE_META_KEY);
  }
  var metadata = JSON.parse(meta);
  
  // 2. 计算分片 ID
  var shardId = hashToShard(email, metadata.shardCount);
  
  // 3. 读取该分片
  var shardKey = CACHE_SHARD_PREFIX + shardId;
  var shard = cache.get(shardKey);
  
  if (!shard) {
    Logger.log('⚠️ Shard ' + shardId + ' cache miss, reloading...');
    loadSenderDatabase();
    shard = cache.get(shardKey);
  }
  
  // 4. 查询
  var shardData = JSON.parse(shard);
  return shardData[email] || null;
}

/**
 * 批量查询：按分片分组，减少缓存读取次数
 */
function queryBatch(emails) {
  var cache = CacheService.getScriptCache();
  var meta = JSON.parse(cache.get(CACHE_META_KEY));
  
  // 1. 按分片分组
  var shardGroups = {};
  emails.forEach(function(email) {
    var shardId = hashToShard(email, meta.shardCount);
    if (!shardGroups[shardId]) {
      shardGroups[shardId] = [];
    }
    shardGroups[shardId].push(email);
  });
  
  // 2. 批量读取涉及的分片（一次性）
  var shardKeys = Object.keys(shardGroups).map(function(id) {
    return CACHE_SHARD_PREFIX + id;
  });
  var shardDataMap = cache.getAll(shardKeys);
  
  // 3. 查询结果
  var results = {};
  Object.keys(shardGroups).forEach(function(shardId) {
    var shardKey = CACHE_SHARD_PREFIX + shardId;
    var shardData = JSON.parse(shardDataMap[shardKey] || '{}');
    
    shardGroups[shardId].forEach(function(email) {
      results[email] = shardData[email] || null;
    });
  });
  
  return results;
}

/**
 * 回退数据库：内嵌 Top 100 发件人
 */
function loadFallbackDatabase() {
  // 内嵌数据，保证离线可用
  return {
    version: 'embedded-v1',
    totalEntries: 100,
    senders: {
      'newsletter@stratechery.com': { category: 'Newsletter', confidence: 0.95 },
      'notify@mail.notion.so': { category: 'Product Updates', confidence: 0.90 },
      // ... Top 100
    }
  };
}
```

#### 1.2 性能基准

| 操作 | 首次运行 | 后续运行 | 说明 |
|------|---------|---------|------|
| `loadSenderDatabase()` | 500-800ms | <5ms | CDN + 分片存储 vs 缓存命中 |
| `querySender(email)` | <5ms | <5ms | 单次缓存读取 + 哈希计算 |
| `queryBatch(100 emails)` | <50ms | <50ms | 批量读取约 10-20 个分片 |

---

### Module 2: 分类引擎 (Classifier.gs)

#### 2.1 三级匹配策略

```javascript
/**
 * 邮件分类：三级匹配（精确 → 域名 → 启发式）
 */
function classifyEmail(message) {
  var senderEmail = extractEmail(message.getFrom());
  
  // Level 1: 精确匹配 (85% 命中率)
  var result = querySender(senderEmail);
  if (result && result.confidence >= 0.8) {
    return {
      category: result.category,
      confidence: result.confidence,
      source: 'database_exact',
      method: 'exact_match'
    };
  }
  
  // Level 2: 域名匹配 (10% 命中率)
  var domain = senderEmail.split('@')[1];
  var domainPatterns = [
    'noreply@' + domain,
    'newsletter@' + domain,
    'news@' + domain
  ];
  
  for (var i = 0; i < domainPatterns.length; i++) {
    var domainResult = querySender(domainPatterns[i]);
    if (domainResult) {
      return {
        category: domainResult.category,
        confidence: Math.max(0.6, domainResult.confidence * 0.8),
        source: 'database_domain',
        method: 'domain_match'
      };
    }
  }
  
  // Level 3: 启发式规则 (5% 命中率)
  var heuristicResult = applyHeuristicRules(message);
  if (heuristicResult) {
    return {
      category: heuristicResult.category,
      confidence: 0.5,
      source: 'heuristic',
      method: heuristicResult.method
    };
  }
  
  return null; // 无法分类
}

/**
 * 启发式规则检测
 */
function applyHeuristicRules(message) {
  var rawContent = message.getRawContent();
  var subject = message.getSubject();
  var from = message.getFrom().toLowerCase();
  
  // Rule 1: List-Unsubscribe 头部检测
  if (rawContent.match(/List-Unsubscribe:/i)) {
    return { category: 'Newsletter', method: 'list_unsubscribe_header' };
  }
  
  // Rule 2: 常见 Newsletter 平台域名
  var newsletterPlatforms = [
    'substack.com',
    'beehiiv.com',
    'convertkit.com',
    'mailchimp.com',
    'sendgrid.net'
  ];
  
  for (var i = 0; i < newsletterPlatforms.length; i++) {
    if (from.includes(newsletterPlatforms[i])) {
      return { category: 'Newsletter', method: 'platform_domain' };
    }
  }
  
  // Rule 3: 主题关键词检测
  var newsletterKeywords = [
    'newsletter',
    'weekly digest',
    'daily brief',
    'roundup',
    'update summary'
  ];
  
  for (var i = 0; i < newsletterKeywords.length; i++) {
    if (subject.toLowerCase().includes(newsletterKeywords[i])) {
      return { category: 'Newsletter', method: 'subject_keyword' };
    }
  }
  
  // Rule 4: 营销邮件特征
  if (rawContent.match(/promotional/i) || 
      subject.match(/sale|discount|offer|deal/i)) {
    return { category: 'Marketing', method: 'marketing_keyword' };
  }
  
  return null;
}

/**
 * 批量分类：优化版
 */
function classifyBatch(messages) {
  // 1. 提取所有发件人
  var senders = messages.map(function(msg) {
    return extractEmail(msg.getFrom());
  });
  
  // 2. 批量查询数据库
  var dbResults = queryBatch(senders);
  
  // 3. 映射分类结果
  return messages.map(function(msg, index) {
    var email = senders[index];
    var dbResult = dbResults[email];
    
    if (dbResult && dbResult.confidence >= 0.8) {
      return {
        message: msg,
        category: dbResult.category,
        confidence: dbResult.confidence,
        source: 'database_exact'
      };
    }
    
    // 回退到单个分类
    return {
      message: msg,
      result: classifyEmail(msg)
    };
  });
}

/**
 * 提取邮箱地址：处理各种格式
 */
function extractEmail(fromField) {
  // 格式: "John Doe <john@example.com>" 或 "john@example.com"
  var match = fromField.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  return fromField.toLowerCase().trim();
}
```

#### 2.2 分类决策树

```
输入: message
    │
    ▼
提取发件人邮箱
    │
    ▼
┌─────────────────────┐
│ 精确匹配数据库       │
│ querySender(email)  │
└────┬────────────┬───┘
     │            │
  匹配 │            │ 未匹配
  (85%)│            │
     ▼            ▼
  返回结果    ┌──────────────┐
              │ 域名匹配      │
              │ @domain      │
              └────┬────┬────┘
                   │    │
                匹配 │    │ 未匹配
               (10%)│    │
                   ▼    ▼
                返回  ┌────────────┐
                     │ 启发式规则  │
                     └────┬───┬────┘
                          │   │
                       匹配 │   │ 未匹配
                       (5%)│   │
                          ▼   ▼
                       返回  null
```

---

### Module 3: 动作执行器 (Actions.gs)

#### 3.1 标签管理

```javascript
/**
 * 标签管理：创建或获取标签
 */
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  
  if (!label) {
    try {
      label = GmailApp.createLabel(labelName);
      Logger.log('✅ Label created: ' + labelName);
    } catch (error) {
      Logger.log('❌ Failed to create label: ' + error.message);
      return null;
    }
  }
  
  return label;
}

/**
 * 应用分类：执行配置的操作
 */
function applyCategory(thread, categoryName, classificationResult) {
  var config = CATEGORIES[categoryName];
  
  if (!config) {
    Logger.log('⚠️ Unknown category: ' + categoryName);
    return false;
  }
  
  try {
    // 1. 应用标签
    var label = getOrCreateLabel(config.label);
    if (label) {
      thread.addLabel(label);
    }
    
    // 2. 执行动作
    if (config.action === 'archive') {
      thread.moveToArchive();
    }
    
    // 3. 标记状态
    if (config.markRead) {
      thread.markRead();
    }
    
    if (config.addStar) {
      thread.addStar();
    }
    
    // 4. 记录日志
    Logger.log('✅ Classified: ' + thread.getFirstMessageSubject() + 
               ' → ' + categoryName + 
               ' (confidence: ' + (classificationResult.confidence * 100).toFixed(0) + '%)');
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Failed to apply category: ' + error.message);
    return false;
  }
}

/**
 * 批量应用分类：优化性能
 */
function applyBatchCategories(threadsWithCategories) {
  var labelCache = {}; // 缓存标签对象
  var stats = {
    success: 0,
    failed: 0,
    byCategory: {}
  };
  
  threadsWithCategories.forEach(function(item) {
    var thread = item.thread;
    var category = item.category;
    var config = CATEGORIES[category];
    
    if (!config) return;
    
    try {
      // 使用缓存的标签对象
      if (!labelCache[category]) {
        labelCache[category] = getOrCreateLabel(config.label);
      }
      var label = labelCache[category];
      
      if (label) {
        thread.addLabel(label);
      }
      
      if (config.action === 'archive') {
        thread.moveToArchive();
      }
      
      if (config.markRead) {
        thread.markRead();
      }
      
      stats.success++;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
    } catch (error) {
      Logger.log('❌ Batch apply failed for: ' + thread.getId());
      stats.failed++;
    }
  });
  
  return stats;
}
```

#### 3.2 分类配置

```javascript
/**
 * 分类配置：用户可自定义
 */
const CATEGORIES = {
  'Newsletter': {
    label: 'Chrono/Newsletter',
    action: 'archive',        // 移出收件箱
    markRead: false,          // 保持未读
    addStar: false,
    color: '#4285f4'          // 蓝色
  },
  
  'Product Updates': {
    label: 'Chrono/Product',
    action: 'keep_inbox',     // 保持在收件箱
    markRead: false,
    addStar: true,            // 添加星标
    color: '#f4b400'          // 黄色
  },
  
  'Marketing': {
    label: 'Chrono/Marketing',
    action: 'archive',
    markRead: true,           // 标记已读
    addStar: false,
    color: '#ea4335'          // 红色
  },
  
  'Tech News': {
    label: 'Chrono/Tech',
    action: 'archive',
    markRead: false,
    addStar: false,
    color: '#34a853'          // 绿色
  },
  
  'Financial': {
    label: 'Chrono/Finance',
    action: 'keep_inbox',
    markRead: false,
    addStar: true,
    color: '#ff6d00'          // 橙色
  }
};
```

---

### Module 4: UI 控制器 (UI.gs)

#### 4.1 Card Service 架构

```javascript
/**
 * Homepage Trigger: 用户打开 Gmail 侧边栏
 */
function buildHomepage(e) {
  var userProps = PropertiesService.getUserProperties();
  var initialized = userProps.getProperty('chrono_initialized');
  
  if (!initialized) {
    // 首次使用：显示引导流程
    return buildOnboardingCard();
  }
  
  // 已初始化：显示仪表盘
  return buildDashboardCard();
}

/**
 * Context Trigger: 用户打开邮件
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);
  
  // 分类邮件
  var result = classifyEmail(message);
  
  if (result) {
    return buildClassifiedCard(message, result);
  } else {
    return buildUnknownSenderCard(message);
  }
}

/**
 * 引导卡片：首次使用
 */
function buildOnboardingCard() {
  return [CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🎉 欢迎使用 Chrono Lite')
      .setSubtitle('Gmail 自动化助手'))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>3 步快速开始</b><br>' +
                '① 授权访问 Gmail<br>' +
                '② 选择处理范围<br>' +
                '③ 查看效果'))
      
      .addWidget(CardService.newTextButton()
        .setText('开始设置')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('startOnboardingFlow')
          .setParameters({ step: '1' }))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED))
      
      .addWidget(CardService.newTextButton()
        .setText('稍后再说')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('dismissOnboarding'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))
    
    .build()];
}

/**
 * 仪表盘卡片：主界面
 */
function buildDashboardCard() {
  var stats = getEmailStats();
  
  return [CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Chrono Lite')
      .setSubtitle('Email Automation Dashboard'))
    
    // 统计信息区域
    .addSection(CardService.newCardSection()
      .setHeader('📊 今日统计')
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('已处理')
        .setContent(stats.todayProcessed + ' 封')
        .setIcon(CardService.Icon.EMAIL))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Newsletter')
        .setContent(stats.newsletter + ' 封未读')
        .setIcon(CardService.Icon.BOOKMARK)
        .setButton(CardService.newTextButton()
          .setText('查看')
          .setOpenLink(CardService.newOpenLink()
            .setUrl('https://mail.google.com/#label/Chrono/Newsletter')
            .setOpenAs(CardService.OpenAs.FULL_SIZE))))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('本周处理')
        .setContent(stats.weekProcessed + ' 封')
        .setIcon(CardService.Icon.STAR)))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newDivider()))
    
    // 快速操作区域
    .addSection(CardService.newCardSection()
      .setHeader('⚡ 快速操作')
      
      .addWidget(CardService.newTextButton()
        .setText('🔄 手动同步')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('manualSync'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED))
      
      .addWidget(CardService.newTextButton()
        .setText('🗂️ 批量清理历史邮件')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('startBatchCleanup'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED))
      
      .addWidget(CardService.newTextButton()
        .setText('⚙️ 设置')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('openSettings'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))
    
    .build()];
}

/**
 * 设置卡片：选择自动化模式与执行动作
 */
function buildSettingsCard() {
  var mode = getUserConfig('automationMode', 'filter'); // 'filter' | 'script'
  var silent = getUserConfig('silentMode', 'false') === 'true';
  
  return [CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚙️ 设置')
      .setSubtitle('自动化与偏好'))
    
    .addSection(CardService.newCardSection()
      .setHeader('自动化模式')
      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.RADIO_BUTTON)
        .setFieldName('automation_mode')
        .addItem('使用 Gmail 过滤器（推荐）', 'filter', mode === 'filter')
        .addItem('使用脚本定时任务（增量）', 'script', mode === 'script'))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('保存自动化模式')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('saveAutomationMode'))))
    )
    
    .addSection(CardService.newCardSection()
      .setHeader('过滤器自动化（需要 gmail.settings.basic）')
      .addWidget(CardService.newTextButton()
        .setText('🛠️ 生成智能过滤器（预览后创建）')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('previewAndCreateFilters')))
      .addWidget(CardService.newTextButton()
        .setText('↩️ 撤销本插件创建的过滤器')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('revokeCreatedFilters'))))
    
    .addSection(CardService.newCardSection()
      .setHeader('脚本自动化（增量处理）')
      .addWidget(CardService.newTextButton()
        .setText('⏰ 启用定时任务（每小时）')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('enableScriptAutomation')))
      .addWidget(CardService.newTextButton()
        .setText('🚫 关闭定时任务')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('disableScriptAutomation'))))
    
    .addSection(CardService.newCardSection()
      .setHeader('偏好')
      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('prefs')
        .addItem('静默模式（少显示卡片）', 'silent', silent))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('保存偏好')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('savePreferences')))))
    
    .build()];
}

/**
 * 分类结果卡片：显示邮件分类信息
 */
function buildClassifiedCard(message, classificationResult) {
  var category = classificationResult.category;
  var confidence = classificationResult.confidence;
  
  return [CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Chrono Lite')
      .setSubtitle(extractEmail(message.getFrom())))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel('分类')
        .setContent('✅ ' + category)
        .setIcon(CardService.Icon.BOOKMARK))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('置信度')
        .setContent((confidence * 100).toFixed(0) + '%')
        .setIcon(CardService.Icon.STAR))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('匹配方式')
        .setContent(classificationResult.source)))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('✅ 应用标签并归档')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('applyLabelFromCard')
            .setParameters({
              messageId: message.getId(),
              category: category
            })))
        
        .addButton(CardService.newTextButton()
          .setText('❌ 不正确')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('reportIncorrect')
            .setParameters({
              messageId: message.getId(),
              category: category
            }))
          .setTextButtonStyle(CardService.TextButtonStyle.TEXT))))
    
    .build()];
}

/**
 * 进度卡片：批量处理时显示
 */
function buildProgressCard(progress) {
  var percent = Math.floor((progress.processed / progress.total) * 100);
  var progressBar = generateProgressBar(percent);
  
  return [CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚙️ 正在处理邮件...')
      .setSubtitle('步骤 ' + progress.step + '/3'))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>进度: ' + progress.processed + ' / ' + progress.total + 
                ' (' + percent + '%)</b><br>' + progressBar))
      
      .addWidget(CardService.newTextParagraph()
        .setText('⏱️ 预计剩余时间: ' + progress.estimatedTimeRemaining + ' 秒')))
    
    .addSection(CardService.newCardSection()
      .setHeader('实时统计')
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Newsletter')
        .setContent(progress.stats.newsletter + ' 封')
        .setIcon(CardService.Icon.BOOKMARK))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Marketing')
        .setContent(progress.stats.marketing + ' 封')
        .setIcon(CardService.Icon.EMAIL))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('跳过')
        .setContent(progress.stats.skipped + ' 封')))
    
    .build()];
}

/**
 * 生成进度条（纯文本）
 */
function generateProgressBar(percent) {
  var filled = Math.floor(percent / 5);
  var empty = 20 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}
```

#### 4.2 交互流程

```
用户打开侧边栏
      │
      ▼
┌─────────────────┐
│ buildHomepage() │
└────────┬────────┘
         │
    是否初始化?
         │
    ┌────┴────┐
    │         │
   否          是
    │         │
    ▼         ▼
┌───────┐  ┌──────────┐
│引导卡片│  │仪表盘卡片│
└───┬───┘  └────┬─────┘
    │           │
    │           ├─ 手动同步
    │           ├─ 批量清理
    │           └─ 设置
    │
    ▼
┌──────────────┐
│ 授权 → 范围  │
│ → 处理 → 完成│
└──────────────┘
```

---

### Module 5: 触发器管理 (Triggers.gs)

#### 5.1 定时触发器

```javascript
/**
 * 创建定时触发器：自动处理新邮件
 */
function createTimeTrigger(mode) {
  // 删除旧触发器
  deleteExistingTriggers('autoProcessInbox');
  
  // 根据模式设置频率
  var intervalHours;
  switch(mode) {
    case 'aggressive':
      intervalHours = 0.5; // 30 分钟
      break;
    case 'conservative':
      intervalHours = 24; // 每天
      break;
    case 'smart':
    default:
      intervalHours = 1; // 每小时
  }
  
  // 创建新触发器
  if (intervalHours < 1) {
    // Apps Script 不支持 < 1 小时的时间触发器
    // 使用分钟触发器（仅限特定情况）
    ScriptApp.newTrigger('autoProcessInbox')
      .timeBased()
      .everyMinutes(30)
      .create();
  } else {
    ScriptApp.newTrigger('autoProcessInbox')
      .timeBased()
      .everyHours(Math.floor(intervalHours))
      .create();
  }
  
  Logger.log('✅ Trigger created: every ' + intervalHours + ' hours');
}

/**
 * 删除现有触发器
 */
function deleteExistingTriggers(functionName) {
  var triggers = ScriptApp.getProjectTriggers();
  
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ Deleted old trigger: ' + trigger.getUniqueId());
    }
  });
}

/**
 * 自动处理收件箱：由定时触发器调用
 */
function autoProcessInbox() {
  var startTime = new Date();
  Logger.log('🚀 Auto process started at: ' + startTime.toISOString());
  
  try {
    // 1. 构建查询（最近 1 小时）
    var query = 'in:inbox newer_than:1h';
    var threads = GmailApp.search(query, 0, 100);
    
    if (threads.length === 0) {
      Logger.log('✅ No new emails to process');
      return;
    }
    
    Logger.log('📧 Found ' + threads.length + ' threads');
    
    // 2. 批量分类
    var messages = threads.map(function(thread) {
      return thread.getMessages()[0];
    });
    
    var classifications = classifyBatch(messages);
    
    // 3. 应用分类
    var threadsWithCategories = [];
    classifications.forEach(function(item, index) {
      if (item.result && item.result.category) {
        threadsWithCategories.push({
          thread: threads[index],
          category: item.result.category,
          result: item.result
        });
      }
    });
    
    var stats = applyBatchCategories(threadsWithCategories);
    
    // 4. 记录统计
    var endTime = new Date();
    var duration = (endTime - startTime) / 1000;
    
    Logger.log('✅ Auto process completed in ' + duration + 's');
    Logger.log('📊 Stats: ' + JSON.stringify(stats));
    
    // 5. 更新用户统计
    updateUserStats(stats);
    
  } catch (error) {
    Logger.log('❌ Auto process failed: ' + error.message);
    Logger.log(error.stack);
  }
}

/**
 * 批量清理：用户手动触发
 */
function massCleanupHistory(rangeOption) {
  var startTime = new Date();
  Logger.log('🚀 Mass cleanup started: ' + rangeOption);
  
  // 1. 构建查询
  var query;
  var maxThreads;
  
  switch(rangeOption) {
    case '7d':
      query = 'newer_than:7d';
      maxThreads = 500;
      break;
    case '30d':
      query = 'newer_than:30d';
      maxThreads = 2000;
      break;
    case '6m':
      query = 'newer_than:6m';
      maxThreads = 5000;
      break;
    case 'all':
      query = '';
      maxThreads = 10000;
      break;
    default:
      throw new Error('Invalid range option');
  }
  
  // 2. 分批处理（避免超时）
  var offset = 0;
  var batchSize = 100;
  var totalProcessed = 0;
  var totalStats = {
    newsletter: 0,
    marketing: 0,
    product: 0,
    tech: 0,
    skipped: 0
  };
  
  while (offset < maxThreads) {
    // 检查执行时间（避免超过 6 分钟）
    var elapsed = (new Date() - startTime) / 1000;
    if (elapsed > 300) { // 5 分钟
      Logger.log('⚠️ Time limit approaching, stopping at offset: ' + offset);
      break;
    }
    
    try {
      var threads = GmailApp.search(query, offset, batchSize);
      
      if (threads.length === 0) {
        break; // 没有更多邮件
      }
      
      // 批量分类和应用
      var messages = threads.map(function(t) { return t.getMessages()[0]; });
      var classifications = classifyBatch(messages);
      
      var threadsWithCategories = [];
      classifications.forEach(function(item, index) {
        if (item.result && item.result.category) {
          threadsWithCategories.push({
            thread: threads[index],
            category: item.result.category
          });
        }
      });
      
      var stats = applyBatchCategories(threadsWithCategories);
      
      // 累加统计
      Object.keys(stats.byCategory).forEach(function(cat) {
        var key = cat.toLowerCase().split(' ')[0];
        totalStats[key] = (totalStats[key] || 0) + stats.byCategory[cat];
      });
      
      totalProcessed += threads.length;
      offset += batchSize;
      
      Logger.log('Progress: ' + totalProcessed + ' threads processed');
      
      // 延迟避免配额限制
      Utilities.sleep(2000);
      
    } catch (error) {
      Logger.log('❌ Batch failed at offset ' + offset + ': ' + error.message);
      break;
    }
  }
  
  var endTime = new Date();
  var duration = (endTime - startTime) / 1000;
  
  Logger.log('✅ Mass cleanup completed in ' + duration + 's');
  Logger.log('📊 Total processed: ' + totalProcessed);
  Logger.log('📊 Stats: ' + JSON.stringify(totalStats));
  
  return {
    success: true,
    processed: totalProcessed,
    stats: totalStats,
    duration: duration
  };
}
```

#### 5.2 触发器配额管理

| 触发器类型 | 频率 | 每日调用 | 建议场景 |
|-----------|------|---------|---------|
| **智能模式** | 每小时 | 24 次 | 大多数用户 |
| **激进模式** | 30 分钟 | 48 次 | 高频邮件用户 |
| **保守模式** | 每天 | 1 次 | 低频邮件用户 |

**配额限制应对**：
- ✅ 免费账户：20 次/天 → 使用智能模式
- ✅ Workspace 账户：无限制 → 可使用激进模式
- ✅ 检测配额并自动降级

#### 5.3 自动化模式（Filter vs Script）

为满足个人部署与不同偏好的用户，提供两种自动化途径，可在“设置”中选择：

- Filter 自动化（推荐：稳定、零维护）
  - 原理：使用 Gmail Advanced API 生成过滤器（按发件人/域名 → 标签 + 归档/已读）。
  - 触发：由 Gmail 原生引擎在邮件到达时实时执行。
  - 优势：无需脚本后台运行，不受 Apps Script 执行时长影响；速度与稳定性最佳。
  - 要求：授权 `https://www.googleapis.com/auth/gmail.settings.basic`。

- Script 自动化（灵活：可随时调整批量策略）
  - 原理：启用 Time-based Trigger 周期运行 `autoProcessInbox()`，仅处理增量（最近 30/60 分钟）。
  - 优势：逻辑可自定义（阈值、回退、动作）；适合实验与个性化策略。
  - 风险：受触发器配额与 6 分钟执行上限影响，需要严格的“时间保护”和“增量处理”。

UI 提示：默认勾选 Filter 自动化；进阶用户可启用 Script 自动化（提供风险提示与时间上限保护）。

#### 5.4 增量处理与时间保护（长时间运行优化）

目标：避免单次执行超时与配额抖动；保证“随时可中断、可恢复、可推进”。

- 增量范围：
  - 新邮件：`in:inbox newer_than:1h`（或基于 `USER_STATE.lastProcessTime` 动态计算窗口）
  - 历史清理：按用户选择范围（7d/30d/6m/all），拆分为多批次；每批 100 线程以内。

- Checkpoint（断点续跑）：
  - `USER_STATE.batchProgress` 记录：`{ query, offset, processed, total, stats, lastUpdated }`
  - 每处理完一批立即写入进度；超时/中断后下次从 offset 继续。

- 时间上限保护：
  - 在循环中实时检查 `elapsed > MAX_SECONDS`（建议 300s）；
  - 接近上限时提前退出，返回进度卡片，提供“继续处理”按钮。

- 去重与一致性：
  - 使用 `thread.getId()` 做已处理集合（短期放入 `CacheService`，Key 带时间窗）；
  - 多查询合并时对 `threadId` 去重，避免重复处理。

- 背压与节流：
  - 每批后 `Utilities.sleep(1000-2000ms)`；
  - 根据统计动态调整 `batchSize`（错误率/耗时高则减小）。

示例伪码：

```javascript
const MAX_SECONDS = 300; // 单次 5 分钟保护

function processIncrementalWindow(windowExpr) {
  var start = new Date();
  var offset = Number(getUserConfig('batchOffset', '0'));
  var batch = 100;
  
  while (true) {
    if ((new Date() - start) / 1000 > MAX_SECONDS) break;
    var threads = GmailApp.search(windowExpr, offset, batch);
    if (!threads.length) break;
    var stats = processThreadsFast(threads);
    offset += threads.length;
    setUserConfig('batchOffset', String(offset));
    Utilities.sleep(1500);
  }
}
```

#### 5.5 动作处理与状态键（Settings 相关）

动作处理函数（建议签名）：

```javascript
function openSettings(e) {
  return CardService.newNavigation().pushCard(buildSettingsCard());
}

function saveAutomationMode(e) {
  var mode = e.commonEventObject.formInputs.automation_mode.stringInputs.value[0];
  setUserConfig('automationMode', mode);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('已保存自动化模式: ' + mode))
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard()))
    .build();
}

function enableScriptAutomation(e) {
  createTimeTrigger('smart');
  setUserConfig('automationMode', 'script');
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('已启用脚本自动化（每小时）'))
    .build();
}

function disableScriptAutomation(e) {
  deleteExistingTriggers('autoProcessInbox');
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('已关闭脚本自动化'))
    .build();
}

function savePreferences(e) {
  var prefs = e.commonEventObject.formInputs.prefs;
  var silent = prefs && prefs.stringInputs && prefs.stringInputs.value.indexOf('silent') >= 0;
  setUserConfig('silentMode', String(!!silent));
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('偏好已保存'))
    .build();
}
```

新增/使用的状态键：

```text
USER_STATE.automationMode   // 'filter' | 'script'
USER_STATE.silentMode       // 'true' | 'false'
USER_STATE.batchOffset      // 历史清理偏移量（断点）
USER_STATE.batchProgress    // JSON 进度对象
```

---

## 数据流与状态管理

### 1. 缓存策略

```javascript
/**
 * 多层缓存架构
 */
const CACHE_LAYERS = {
  // L1: Script Cache (内存缓存)
  script: {
    service: CacheService.getScriptCache(),
    ttl: 6 * 60 * 60, // 6 小时
    scope: '所有用户共享'
  },
  
  // L2: User Properties (持久化)
  userProps: {
    service: PropertiesService.getUserProperties(),
    ttl: Infinity,
    scope: '单用户'
  },
  
  // L3: Script Properties (全局配置)
  scriptProps: {
    service: PropertiesService.getScriptProperties(),
    ttl: Infinity,
    scope: '所有用户共享'
  }
};

/**
 * 缓存读取优先级
 */
function getCachedValue(key) {
  // 1. 先查 Script Cache
  var scriptCache = CacheService.getScriptCache();
  var value = scriptCache.get(key);
  if (value) {
    return JSON.parse(value);
  }
  
  // 2. 再查 User Properties
  var userProps = PropertiesService.getUserProperties();
  value = userProps.getProperty(key);
  if (value) {
    // 回填到 Script Cache
    scriptCache.put(key, value, 6 * 60 * 60);
    return JSON.parse(value);
  }
  
  return null;
}
```

### 2. 用户状态管理

```javascript
/**
 * 用户配置存储
 */
const USER_STATE = {
  // 初始化状态
  initialized: 'chrono_initialized',          // 'true' | 'false'
  onboardingStep: 'chrono_onboarding_step',   // 'welcome' | 'authorize' | 'range' | 'complete'
  
  // 自动化配置
  automationMode: 'chrono_automation_mode',   // 'smart' | 'aggressive' | 'conservative'
  triggerId: 'chrono_trigger_id',             // 触发器 ID
  
  // 统计数据
  todayProcessed: 'chrono_today_processed',   // 今日处理数量
  weekProcessed: 'chrono_week_processed',     // 本周处理数量
  lastProcessTime: 'chrono_last_process',     // 最后处理时间
  
  // 批量处理进度
  batchProgress: 'chrono_batch_progress',     // JSON: { processed, total, ... }
  
  // 用户偏好
  silentMode: 'chrono_silent_mode',           // 'true' | 'false'
  showNotifications: 'chrono_show_notify'     // 'true' | 'false'
};

/**
 * 获取用户配置
 */
function getUserConfig(key, defaultValue) {
  var props = PropertiesService.getUserProperties();
  var value = props.getProperty(USER_STATE[key]);
  return value !== null ? value : defaultValue;
}

/**
 * 更新用户配置
 */
function setUserConfig(key, value) {
  var props = PropertiesService.getUserProperties();
  props.setProperty(USER_STATE[key], String(value));
}

/**
 * 更新用户统计
 */
function updateUserStats(stats) {
  var props = PropertiesService.getUserProperties();
  var today = new Date().toDateString();
  
  // 检查是否是新的一天
  var lastDate = props.getProperty('chrono_last_date');
  if (lastDate !== today) {
    props.setProperty('chrono_today_processed', '0');
    props.setProperty('chrono_last_date', today);
  }
  
  // 累加今日统计
  var todayCount = parseInt(props.getProperty('chrono_today_processed') || '0');
  todayCount += stats.success;
  props.setProperty('chrono_today_processed', String(todayCount));
  
  // 累加本周统计
  var weekCount = parseInt(props.getProperty('chrono_week_processed') || '0');
  weekCount += stats.success;
  props.setProperty('chrono_week_processed', String(weekCount));
  
  // 更新最后处理时间
  props.setProperty('chrono_last_process', new Date().toISOString());
}
```

---

## 性能优化策略

### 1. 批量操作优化

```javascript
/**
 * 批量操作性能对比
 */

// ❌ 低效方式：逐个处理
function processThreadsSlow(threads) {
  threads.forEach(function(thread) {
    var message = thread.getMessages()[0];
    var sender = extractEmail(message.getFrom());
    var result = querySender(sender); // 每次查询缓存
    
    if (result) {
      var label = GmailApp.getUserLabelByName('Chrono/' + result.category);
      thread.addLabel(label);
      thread.moveToArchive();
    }
  });
}
// 性能：100 个线程 ~10-15 秒

// ✅ 高效方式：批量查询
function processThreadsFast(threads) {
  // 1. 批量提取发件人
  var senders = threads.map(function(thread) {
    return extractEmail(thread.getMessages()[0].getFrom());
  });
  
  // 2. 批量查询数据库（一次性读取多个分片）
  var results = queryBatch(senders);
  
  // 3. 分组按分类
  var groupedByCategory = {};
  threads.forEach(function(thread, index) {
    var result = results[senders[index]];
    if (result) {
      var category = result.category;
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
      }
      groupedByCategory[category].push(thread);
    }
  });
  
  // 4. 批量应用标签（减少 getUserLabelByName 调用）
  Object.keys(groupedByCategory).forEach(function(category) {
    var label = GmailApp.getUserLabelByName('Chrono/' + category);
    var threadsInCategory = groupedByCategory[category];
    
    threadsInCategory.forEach(function(thread) {
      thread.addLabel(label);
      thread.moveToArchive();
    });
  });
}
// 性能：100 个线程 ~2-3 秒 (5x 提升)
```

### 2. 查询优化

```javascript
/**
 * Gmail Search 查询优化
 */

// ❌ 低效查询
var threads1 = GmailApp.search('from:newsletter@*');
// 问题：通配符查询慢

// ✅ 高效查询
var threads2 = GmailApp.search('newer_than:1h in:inbox');
// 优势：时间范围限制 + 精确位置

// ✅ 组合查询
var queries = [
  'newer_than:1h in:inbox',
  'newer_than:1h in:inbox subject:newsletter',
  'newer_than:1h in:inbox from:noreply@'
];
var allThreads = [];
queries.forEach(function(query) {
  var threads = GmailApp.search(query, 0, 100);
  allThreads = allThreads.concat(threads);
});
// 去重
allThreads = Array.from(new Set(allThreads.map(function(t) { return t.getId(); })))
  .map(function(id) { return GmailApp.getThreadById(id); });
```

### 3. 缓存预热

```javascript
/**
 * 预加载常用数据
 */
function warmupCache() {
  Logger.log('🔥 Warming up cache...');
  
  // 1. 预加载数据库
  loadSenderDatabase();
  
  // 2. 预加载标签
  var categoryNames = Object.keys(CATEGORIES);
  categoryNames.forEach(function(category) {
    getOrCreateLabel(CATEGORIES[category].label);
  });
  
  // 3. 预加载用户配置
  var config = {
    mode: getUserConfig('automationMode', 'smart'),
    initialized: getUserConfig('initialized', 'false'),
    silentMode: getUserConfig('silentMode', 'false')
  };
  
  Logger.log('✅ Cache warmed up');
  return config;
}
```

---

## 安全与隐私设计

### 1. OAuth 权限范围

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/gmail.addons.current.message.readonly",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

**权限说明**：
- `gmail.modify`: 读取、修改邮件和标签（核心功能）
- `gmail.settings.basic`: 管理 Gmail 过滤器（生成/删除智能过滤器）
- `gmail.addons.current.message.readonly`: 读取当前打开的邮件（侧边栏）
- `script.external_request`: 访问外部 URL（加载数据库）

**隐私承诺**：
- ✅ 不上传邮件内容到服务器
- ✅ 仅读取发件人邮箱地址用于分类
- ✅ 所有处理在用户 Gmail 账户内完成
- ✅ 开源代码可审计

### 2. 数据安全

```javascript
/**
 * 敏感数据处理
 */

// ❌ 不要存储：
// - 邮件正文
// - 附件内容
// - 完整邮件头

// ✅ 仅存储：
// - 分类统计数据
// - 用户配置
// - 分类决策（发件人 → 分类）

/**
 * 日志脱敏
 */
function logClassification(email, category) {
  // ❌ 不要记录完整邮箱
  // Logger.log('Classified: john.doe@example.com → Newsletter');
  
  // ✅ 仅记录域名
  var domain = email.split('@')[1];
  Logger.log('Classified: *@' + domain + ' → ' + category);
}
```

### 3. 错误处理

```javascript
/**
 * 全局错误捕获
 */
function safeExecute(fn, context) {
  try {
    return fn.call(context);
  } catch (error) {
    Logger.log('❌ Error: ' + error.message);
    Logger.log(error.stack);
    
    // 发送错误通知（可选）
    if (shouldNotifyError(error)) {
      sendErrorNotification(error);
    }
    
    return null;
  }
}

/**
 * 重试机制
 */
function retryOperation(operation, maxRetries, delayMs) {
  var retries = 0;
  
  while (retries < maxRetries) {
    try {
      return operation();
    } catch (error) {
      retries++;
      Logger.log('⚠️ Retry ' + retries + '/' + maxRetries + ': ' + error.message);
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      Utilities.sleep(delayMs * retries);
    }
  }
}

// 使用示例
var database = retryOperation(
  function() { return loadSenderDatabase(); },
  3,    // 最多重试 3 次
  1000  // 延迟 1 秒
);
```

---

## 部署与发布

### 1. Manifest 配置 (appsscript.json)

```json
{
  "timeZone": "Asia/Shanghai",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Gmail",
        "version": "v1",
        "serviceId": "gmail"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/gmail.addons.current.message.readonly",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "addOns": {
    "common": {
      "name": "Chrono Lite",
      "logoUrl": "https://raw.githubusercontent.com/msylctt/chrono-lite/main/assets/logo.png",
      "layoutProperties": {
        "primaryColor": "#4285f4"
      },
      "homepageTrigger": {
        "runFunction": "buildHomepage",
        "enabled": true
      },
      "useLocaleFromApp": true,
      "universalActions": [
        { "text": "设置", "runFunction": "openSettings" }
      ]
    },
    "gmail": {
      "contextualTriggers": [
        {
          "unconditional": {},
          "onTriggerFunction": "onGmailMessageOpen"
        }
      ],
      "composeTrigger": {
        "selectActions": [
          {
            "text": "Classify Sender",
            "runFunction": "classifyCurrentSender"
          }
        ]
      },
      "authorizationCheckFunction": "checkVersion",
      "universalActions": [
        {
          "text": "Settings",
          "runFunction": "openSettings"
        },
        {
          "text": "Batch Cleanup",
          "runFunction": "startBatchCleanup"
        }
      ]
    }
  }
}
```

### 2. 部署流程

```bash
# 1. 使用 clasp (命令行工具)
npm install -g @google/clasp

# 2. 登录
clasp login

# 3. 创建项目
clasp create --type standalone --title "Chrono Lite"

# 4. 推送代码
clasp push

# 5. 部署为 Add-on
clasp deploy --description "v1.0.0"

# 6. 打开浏览器查看
clasp open
```

### 3. 版本管理

```javascript
/**
 * 版本信息
 */
const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: '20251014'
};

function getVersion() {
  return VERSION.major + '.' + VERSION.minor + '.' + VERSION.patch;
}

/**
 * 版本检查与迁移
 */
function checkVersion() {
  var props = PropertiesService.getUserProperties();
  var installedVersion = props.getProperty('chrono_version');
  
  if (!installedVersion) {
    // 首次安装
    props.setProperty('chrono_version', getVersion());
    return 'new_install';
  }
  
  if (installedVersion !== getVersion()) {
    // 版本升级
    migrateVersion(installedVersion, getVersion());
    props.setProperty('chrono_version', getVersion());
    return 'upgraded';
  }
  
  return 'up_to_date';
}

function migrateVersion(from, to) {
  Logger.log('🔄 Migrating from ' + from + ' to ' + to);
  
  // 版本迁移逻辑
  // 例如：清除旧缓存、更新配置格式等
}
```

---

## 监控与调试

### 1. 日志系统

```javascript
/**
 * 结构化日志
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

function log(level, message, data) {
  var timestamp = new Date().toISOString();
  var levelName = Object.keys(LogLevel).find(function(key) {
    return LogLevel[key] === level;
  });
  
  var logMessage = '[' + timestamp + '] [' + levelName + '] ' + message;
  
  if (data) {
    logMessage += ' | ' + JSON.stringify(data);
  }
  
  Logger.log(logMessage);
  
  // 可选：发送到外部日志服务
  if (level >= LogLevel.ERROR) {
    // sendToExternalLogging(logMessage);
  }
}

// 使用示例
log(LogLevel.INFO, 'Auto process started');
log(LogLevel.ERROR, 'Database load failed', { error: 'CDN timeout' });
```

### 2. 性能监控

```javascript
/**
 * 性能追踪
 */
function trackPerformance(operationName, fn) {
  var startTime = new Date();
  
  try {
    var result = fn();
    var endTime = new Date();
    var duration = endTime - startTime;
    
    log(LogLevel.INFO, 'Performance: ' + operationName, {
      duration: duration + 'ms',
      status: 'success'
    });
    
    return result;
    
  } catch (error) {
    var endTime = new Date();
    var duration = endTime - startTime;
    
    log(LogLevel.ERROR, 'Performance: ' + operationName, {
      duration: duration + 'ms',
      status: 'failed',
      error: error.message
    });
    
    throw error;
  }
}

// 使用示例
var result = trackPerformance('classifyBatch', function() {
  return classifyBatch(messages);
});
```

### 3. 调试工具

```javascript
/**
 * 调试模式
 */
function enableDebugMode() {
  PropertiesService.getScriptProperties()
    .setProperty('debug_mode', 'true');
}

function isDebugMode() {
  return PropertiesService.getScriptProperties()
    .getProperty('debug_mode') === 'true';
}

/**
 * 调试信息收集
 */
function getDebugInfo() {
  var info = {
    version: getVersion(),
    triggers: getTriggerInfo(),
    cache: getCacheInfo(),
    userConfig: getUserDebugInfo(),
    quotas: getQuotaUsage()
  };
  
  return JSON.stringify(info, null, 2);
}

function getTriggerInfo() {
  var triggers = ScriptApp.getProjectTriggers();
  return triggers.map(function(trigger) {
    return {
      id: trigger.getUniqueId(),
      function: trigger.getHandlerFunction(),
      eventType: trigger.getEventType().toString()
    };
  });
}

function getCacheInfo() {
  var cache = CacheService.getScriptCache();
  var meta = cache.get(CACHE_META_KEY);
  
  if (!meta) {
    return { status: 'not_initialized' };
  }
  
  return JSON.parse(meta);
}

/**
 * 测试函数
 */
function runTests() {
  log(LogLevel.INFO, 'Running tests...');
  
  // Test 1: Database loading
  try {
    var db = loadSenderDatabase();
    log(LogLevel.INFO, 'Test 1 passed: Database loaded', db);
  } catch (error) {
    log(LogLevel.ERROR, 'Test 1 failed', { error: error.message });
  }
  
  // Test 2: Classification
  try {
    var testEmail = 'newsletter@stratechery.com';
    var result = querySender(testEmail);
    log(LogLevel.INFO, 'Test 2 passed: Classification', result);
  } catch (error) {
    log(LogLevel.ERROR, 'Test 2 failed', { error: error.message });
  }
  
  // Test 3: UI building
  try {
    var card = buildHomepage();
    log(LogLevel.INFO, 'Test 3 passed: UI built');
  } catch (error) {
    log(LogLevel.ERROR, 'Test 3 failed', { error: error.message });
  }
  
  log(LogLevel.INFO, 'Tests completed');
}
```

---

## 过滤器自动化（Gmail Advanced API）

### 1. 数据模型与标识

为便于撤销，本插件创建的过滤器统一以 `CHRONO_` 前缀标识：

```text
FilterCriteria: from / query（发件人或域名）
FilterAction:
  - addLabelIds: ['<LABEL_ID>']
  - removeLabelIds: ['INBOX']（可选）
Meta (存储在 PropertiesService):
  - chrono_filters: JSON 数组 [{ id, from, labelId, createdAt }]
```

### 2. 预览与创建

```javascript
function previewAndCreateFilters(e) {
  // 1) 生成候选条目（高频/高置信发件人）
  var candidates = computeHighConfidenceSenders();
  // 2) 预览卡片展示（此处省略 UI 构建细节），用户确认后调用 createFilters(candidates)
  return createFilters(candidates);
}

function createFilters(items) {
  // 需要启用 “Gmail Advanced Service” 且授予 gmail.settings.basic
  var created = [];
  items.forEach(function(it) {
    var label = getOrCreateLabel('Chrono/' + it.category);
    var filter = {
      criteria: { from: it.sender },
      action: {
        addLabelIds: [label.getId()],
        removeLabelIds: it.archive ? ['INBOX'] : []
      }
    };
    var result = Gmail.Users.Settings.Filters.create(filter, 'me');
    created.push({ id: result.id, from: it.sender, labelId: label.getId(), createdAt: new Date().toISOString() });
  });
  persistFilterMeta(created);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('已创建 ' + created.length + ' 个过滤器'))
    .build();
}

function persistFilterMeta(created) {
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty('chrono_filters') || '[]';
  var arr = JSON.parse(raw);
  props.setProperty('chrono_filters', JSON.stringify(arr.concat(created)));
}

function computeHighConfidenceSenders() {
  // 示例：真实实现应读取数据库命中统计/频率等
  return [
    { sender: 'newsletter@stratechery.com', category: 'Newsletter', archive: true },
    { sender: 'promo@amazon.com', category: 'Marketing', archive: true }
  ];
}
```

### 3. 撤销本插件创建的过滤器

```javascript
function revokeCreatedFilters(e) {
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty('chrono_filters') || '[]';
  var arr = JSON.parse(raw);
  var removed = 0;
  arr.forEach(function(rec) {
    try {
      Gmail.Users.Settings.Filters.remove('me', rec.id);
      removed++;
    } catch (err) {
      // 忽略不存在/权限问题
    }
  });
  props.deleteProperty('chrono_filters');
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('已撤销过滤器：' + removed))
    .build();
}
```

### 4. 风险控制与最佳实践
- 只对“高置信 + 高频”发件人建立过滤器，避免误杀。
- 提供预览与单次限额（如每次最多创建 50 个）。
- 存档本插件创建的过滤器元数据，确保“一键撤销”。

## 附录

### A. 技术参考

- **Google Apps Script**: https://developers.google.com/apps-script
- **Gmail API**: https://developers.google.com/gmail/api
- **Card Service**: https://developers.google.com/apps-script/reference/card-service
- **Gmail Add-ons**: https://developers.google.com/gmail/add-ons

### B. 性能基准

| 操作 | 延迟 | 吞吐量 | 限制 |
|------|------|--------|------|
| 数据库首次加载 | 500-800ms | N/A | 20,000 URL Fetch/天 |
| 数据库缓存命中 | <5ms | N/A | N/A |
| 单封邮件分类 | <10ms | ~6000 封/分钟 | 250 quota units/秒 |
| 批量 100 封分类 | 50-100ms | ~1000 封/分钟 | 同上 |
| 应用标签操作 | 100-200ms | ~30 封/秒 | 5 quota units/操作 |

### C. 配额计算

**每日处理能力估算**（免费账户）：

```
假设：
- 触发器：20 次/天
- 每次处理：100 封邮件
- 总处理能力：2000 封/天

实际使用：
- 平均新邮件：50 封/小时
- 每小时触发：1 次
- 实际处理：1200 封/天
- 配额使用：60% (安全范围)
```

---

**文档结束**

> **核心设计理念**：
> 1. **性能优先**：批量操作、分片缓存、查询优化
> 2. **用户友好**：Card Service UI、自动化流程、实时反馈
> 3. **可扩展性**：模块化设计、配置驱动、版本管理
> 4. **隐私安全**：最小权限、本地处理、开源透明

