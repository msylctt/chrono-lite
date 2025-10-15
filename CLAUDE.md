# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Chrono Lite** 是一个开源的 Gmail 自动化分类工具，基于 Google Apps Script 开发的 Gmail Add-on。

**核心功能**：
- Newsletter 自动识别（基于 5000+ 发件人数据库）
- Gmail 标签自动分类（Marketing/Newsletter/Product Updates）
- 批量历史邮件清理（一键处理 6 个月邮件）
- 完全自动化（定时后台运行，用户无感知）

**产品定位**：
- 免费开源的 Gmail 收件箱管理助手
- 无需服务器，完全运行在用户的 Google 账户中
- 零数据上传，隐私优先
- 为 Chrono SaaS 提供引流（非竞争关系）

## 技术栈

### 核心技术
- **平台**: Google Apps Script (JavaScript, V8 Runtime)
- **开发工具**: clasp (Command Line Apps Script Projects)
- **版本控制**: Git + GitHub
- **CDN**: jsDelivr (用于发件人数据库分发)

### Google Apps Script 服务
- **GmailApp**: 邮件读取、标签管理、过滤器创建
- **CacheService**: 分片数据缓存（6 小时有效期）
- **UrlFetchApp**: CDN 数据加载
- **ScriptApp**: 定时触发器管理
- **PropertiesService**: 用户配置存储
- **CardService**: Gmail 侧边栏 UI

### 数据存储
- **CacheService**: 分片缓存策略（50 个分片，<1000 条目限制）
- **PropertiesService**: 用户设置和状态
- **无服务器存储**: 所有数据存储在用户的 Google 账户中

## 项目架构

### 文件结构

```
chrono-lite/
├── src/                          # Apps Script 源代码
│   ├── Code.gs                   # 主逻辑（500 行）
│   │   ├── autoProcessInbox()    # 定时触发器入口
│   │   ├── initialSetup()        # 首次初始化
│   │   └── testDatabaseConnection() # 测试函数
│   ├── Database.gs               # 数据层（200 行）
│   │   ├── loadSenderDatabaseFromCDN()  # CDN 加载
│   │   ├── storeShardedDatabase()       # 分片存储
│   │   ├── querySender()                # 单个查询 O(1)
│   │   ├── queryBatch()                 # 批量查询优化
│   │   └── hashToShard()                # 哈希分片函数
│   ├── Classifier.gs             # 分类引擎（150 行）
│   │   ├── classifyEmail()       # 三级匹配策略
│   │   ├── classifyBatch()       # 批量分类
│   │   └── detectNewsletter()    # 启发式规则
│   ├── Actions.gs                # 动作执行（100 行）
│   │   └── applyCategory()       # 应用标签和动作
│   ├── Config.gs                 # 用户配置（100 行）
│   │   └── CATEGORIES            # 分类规则配置
│   └── UI.gs                     # 侧边栏 UI（150 行）
│       ├── buildHomepage()       # 主页卡片
│       ├── onGmailMessageOpen()  # 上下文卡片
│       └── buildOnboardingCard() # 引导流程
├── data/
│   └── verified.json             # 本地测试数据（60 条）
├── docs/
│   └── implementation/           # 实施文档
│       ├── Phase-1-DataLayer.md  # 数据层实现 ✅
│       ├── Phase-2-Classifier.md # 分类引擎
│       └── Phase-3-UI.md         # 用户界面
├── .clasp.json                   # Clasp 配置
├── appsscript.json               # Apps Script Manifest
├── .claspignore                  # 忽略文件配置
└── README.md

远程数据源：
└── https://cdn.jsdelivr.net/gh/msylctt/chrono-lite@latest/data/verified.json
    └── 生产环境发件人数据库（5000+ 条记录）
```

### 核心架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Chrono Lite 架构                      │
└─────────────────────────────────────────────────────────┘

用户层
├─ Gmail 界面（收件箱 + 标签）
└─ Gmail 侧边栏（Add-on UI + 设置）

核心逻辑层（Code.gs）
├─ 邮件同步模块
│   └─ GmailApp API（读取邮件列表）
├─ 分类引擎（Classifier.gs）
│   ├─ 精确匹配（email → category）     85% 命中
│   ├─ 域名匹配（@domain → category）   10% 命中
│   └─ 规则回退（heuristics）           5% 命中
└─ 动作执行模块（Actions.gs）
    ├─ 应用 Gmail 标签
    ├─ 移动到归档
    ├─ 标记已读/星标
    └─ 创建过滤器（高级）

数据层（Database.gs）
├─ CDN 加载（jsDelivr）
│   └─ verified.json（5000+ 条记录）
├─ 分片缓存（CacheService）
│   ├─ 50 个分片（每片 ~100 条）
│   ├─ O(1) 哈希查询
│   └─ 6 小时自动过期
└─ 回退数据（内嵌 Top 100）

触发层
├─ UI 触发（侧边栏按钮）
├─ 定时触发（每小时自动处理）
└─ 上下文触发（打开邮件时）
```

## 开发工作流

### 环境准备

#### 1. 安装 Node.js 和 clasp

```bash
# 安装 Node.js (推荐 v18+)
# macOS: brew install node
# Windows: 下载 Node.js 安装包

# 全局安装 clasp
npm install -g @google/clasp

# 验证安装
clasp --version
```

#### 2. 登录 Google 账户

```bash
# 登录（会打开浏览器授权）
clasp login

# 使用多账户
clasp login --user testaccount@gmail.com
```

#### 3. 克隆现有项目 或 创建新项目

```bash
# 克隆现有项目（如果已有 Script ID）
clasp clone <SCRIPT_ID>

# 或创建新的 Gmail Add-on 项目
clasp create --type standalone --title "Chrono Lite"
```

### 本地开发

#### 项目初始化

```bash
# 1. 克隆仓库
git clone https://github.com/msylctt/chrono-lite.git
cd chrono-lite

# 2. 配置 .clasp.json（已包含在仓库中）
cat .clasp.json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "./src"
}

# 3. 首次拉取（同步云端代码到本地）
clasp pull
```

#### 开发循环

```bash
# 1. 编辑代码
vim src/Database.gs

# 2. 推送到 Apps Script
clasp push

# 或启用监听模式（自动推送）
clasp push --watch

# 3. 打开 Apps Script 编辑器
clasp open

# 4. 在编辑器中测试函数
# 运行 testDatabaseConnection() 查看日志
```

#### 查看日志

```bash
# 实时查看日志（需要先在编辑器中运行函数）
clasp logs

# 或启用监听模式
clasp logs --watch
```

### 测试流程

#### 单元测试（在 Apps Script 编辑器中）

```javascript
// 在 Code.gs 中运行测试函数

// 测试数据库加载
function testDatabaseConnection() {
  Logger.log('🔍 测试数据库连接...');
  var meta = loadSenderDatabase();
  // 查看 Logger 输出
}

// 测试分类引擎
function testClassifier() {
  var testEmails = [
    'newsletter@google.com',
    'updates@apple.com',
    'promo@amazon.com'
  ];

  testEmails.forEach(function(email) {
    var result = querySender(email);
    Logger.log(email + ' → ' + (result ? result.category : 'NOT FOUND'));
  });
}

// Phase 1 完整测试套件
function runPhase1Tests() {
  // 执行所有数据层测试
  // 查看 docs/implementation/Phase-1-DataLayer.md
}
```

#### 集成测试（真实 Gmail 环境）

1. 在 Apps Script 编辑器中点击"部署" → "测试部署"
2. 打开 Gmail，点击右侧栏的 Chrono Lite 图标
3. 测试侧边栏 UI 交互
4. 查看 Apps Script 日志：clasp logs

### 部署流程

#### 创建版本和部署

```bash
# 1. 创建一个不可变版本
clasp push
clasp version "Phase 1: Data Layer Complete"

# 2. 部署为 Add-on（测试部署）
clasp deploy --description "Test Deployment v1.0"

# 3. 查看所有部署
clasp deployments

# 4. 打开 Apps Script 控制台
clasp open --deployments
```

#### 发布到 Google Workspace Marketplace（可选）

1. 在 Apps Script 编辑器中配置 Manifest (`appsscript.json`)
2. 添加 OAuth 作用域和 Add-on 配置
3. 提交到 Google Workspace Marketplace
4. 等待审核（通常 1-2 周）

## 配置文件

### .clasp.json（Clasp 配置）

```json
{
  "scriptId": "YOUR_APPS_SCRIPT_PROJECT_ID",
  "rootDir": "./src"
}
```

**注意**：首次使用需要替换 `scriptId` 为你的项目 ID。

### appsscript.json（Apps Script Manifest）

```json
{
  "timeZone": "Asia/Shanghai",
  "dependencies": {},
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
      "useLocaleFromApp": true,
      "homepageTrigger": {
        "runFunction": "buildHomepage"
      }
    },
    "gmail": {
      "contextualTriggers": [
        {
          "unconditional": {},
          "onTriggerFunction": "onGmailMessageOpen"
        }
      ]
    }
  }
}
```

### .claspignore（忽略文件）

```
# 忽略所有文件
**/**

# 仅包含源代码
!src/**/*.gs
!appsscript.json

# 忽略特定目录
.git/**
node_modules/**
docs/**
data/**
.env
*.md
```

## 最佳实践

### 1. 代码结构

✅ **模块化设计**
- 每个 .gs 文件负责单一职责
- 使用清晰的函数命名
- 添加详细的注释

```javascript
// ✅ 好的实践
/**
 * 从 CDN 加载发件人数据库
 * @returns {Object} 数据库元数据
 */
function loadSenderDatabaseFromCDN() {
  Logger.log('📥 从 CDN 加载数据库...');
  // ...
}

// ❌ 不好的实践
function load() {
  // 没有注释，函数名不清晰
}
```

### 2. 性能优化

✅ **批量操作优先**
```javascript
// ✅ 批量查询（一次缓存读取）
var results = queryBatch(['email1', 'email2', 'email3']);

// ❌ 逐个查询（多次缓存读取）
var r1 = querySender('email1');
var r2 = querySender('email2');
var r3 = querySender('email3');
```

✅ **缓存策略**
```javascript
// ✅ 使用 CacheService 减少网络请求
var cache = CacheService.getScriptCache();
var data = cache.get('key');
if (!data) {
  data = expensiveOperation();
  cache.put('key', data, 6 * 60 * 60); // 6 小时
}

// ❌ 每次都重新加载
var data = expensiveOperation();
```

✅ **分片存储**（避免超过 CacheService 限制）
```javascript
// ✅ 分片存储（支持 5000+ 条记录）
const NUM_SHARDS = 50;
function hashToShard(email, numShards) {
  var hash = 0;
  for (var i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
  }
  return Math.abs(hash) % numShards;
}

// ❌ 单个大对象（超过 100KB 限制）
cache.put('all_data', JSON.stringify(largeObject));
```

### 3. 错误处理

✅ **优雅降级**
```javascript
// ✅ CDN 失败时回退到本地数据
try {
  var data = UrlFetchApp.fetch(CDN_URL);
  return JSON.parse(data.getContentText());
} catch (error) {
  Logger.log('❌ CDN 加载失败，使用回退数据');
  return FALLBACK_DATA;
}

// ❌ 直接抛出错误
var data = UrlFetchApp.fetch(CDN_URL);
return JSON.parse(data.getContentText());
```

✅ **日志记录**
```javascript
// ✅ 详细的日志输出
Logger.log('✅ 数据库加载成功');
Logger.log('  - 版本: ' + version);
Logger.log('  - 条目数: ' + count);

// ❌ 没有日志
// ...
```

### 4. 配额管理

Apps Script 有严格的配额限制：
- 每天执行时间：90 分钟（免费账户）
- 单次执行时间：6 分钟
- UrlFetch 调用：20,000 次/天

✅ **断点续跑**
```javascript
function batchProcess() {
  var startTime = new Date();
  var threads = GmailApp.search('in:inbox', 0, 500);

  for (var i = 0; i < threads.length; i++) {
    processThread(threads[i]);

    // 检查执行时间
    if ((new Date() - startTime) > 5 * 60 * 1000) {
      Logger.log('⚠️ 接近时间限制，保存进度并退出');
      PropertiesService.getScriptProperties()
        .setProperty('last_index', i);
      return;
    }
  }
}
```

✅ **节流控制**
```javascript
// 每处理 100 个对象后休眠 2 秒
if (processed % 100 === 0) {
  Utilities.sleep(2000);
}
```

### 5. 安全性

✅ **权限最小化**
- 仅请求必要的 OAuth 作用域
- 在 manifest 中明确声明权限

✅ **数据隐私**
- 不上传邮件内容到外部服务器
- 所有处理在用户的 Google 账户中完成

✅ **输入验证**
```javascript
// ✅ 验证邮箱格式
function extractEmail(fromString) {
  var match = fromString.match(/<(.+?)>/);
  var email = match ? match[1] : fromString;

  if (!email || !email.includes('@')) {
    Logger.log('⚠️ 无效的邮箱格式: ' + fromString);
    return null;
  }

  return email;
}
```

## 实施阶段

项目采用分阶段实施策略，详细文档见 `docs/implementation/`：

### Phase 1: 数据层 ✅（已完成）
- ✅ CDN 加载（jsDelivr）
- ✅ 分片缓存策略（50 个分片）
- ✅ O(1) 查询接口
- ✅ 批量查询优化
- **文档**: `docs/implementation/Phase-1-DataLayer.md`

### Phase 2: 分类引擎（进行中）
- 三级匹配策略（精确 → 域名 → 规则）
- 启发式规则（List-Unsubscribe 检测）
- 置信度评分
- **文档**: `docs/implementation/Phase-2-Classifier.md`

### Phase 3: 用户界面（待开始）
- Gmail 侧边栏 UI
- 引导流程（Onboarding）
- 进度反馈
- **文档**: `docs/implementation/Phase-3-UI.md`

### Phase 4: 自动化（待开始）
- 定时触发器
- 过滤器自动创建
- 批量历史处理

## 常见问题

### Q: 如何调试 Apps Script 代码？

```bash
# 方法 1: 使用 Logger.log()
Logger.log('调试信息: ' + variable);

# 方法 2: 查看执行日志
clasp logs --watch

# 方法 3: 在 Apps Script 编辑器中使用断点
# 打开编辑器 → 选择函数 → 点击行号添加断点 → 运行
```

### Q: 如何处理 CacheService 超限？

使用分片存储策略，将大数据集分割成多个小块：
```javascript
// 参考 Database.gs 中的实现
// 50 个分片可支持 5000+ 条记录
// 即使扩展到 50,000 条，也只需 500 个分片
```

### Q: 如何测试 Gmail Add-on UI？

```bash
# 1. 推送代码
clasp push

# 2. 在 Apps Script 编辑器中创建测试部署
clasp open
# 部署 → 测试部署

# 3. 打开 Gmail 查看侧边栏
```

### Q: 如何更新生产环境的数据库？

```bash
# 1. 更新 data/verified.json
# 2. 提交并推送到 GitHub
git add data/verified.json
git commit -m "Update sender database"
git push

# 3. jsDelivr CDN 会在 1-24 小时内同步
# 4. 用户的缓存会在 6 小时后自动刷新
```

## 参考资源

### 官方文档
- [Google Apps Script 文档](https://developers.google.com/apps-script)
- [Gmail Service 参考](https://developers.google.com/apps-script/reference/gmail)
- [Clasp 文档](https://github.com/google/clasp)
- [Gmail Add-ons 指南](https://developers.google.com/gmail/add-ons)

### 项目文档
- [完整设计文档](docs/Chrono-Lite-Complete-Design.md)
- [Phase 1 实施文档](docs/implementation/Phase-1-DataLayer.md)
- [系统设计文档](System-Design.md)

### 社区资源
- [Apps Script 示例代码](https://github.com/googleworkspace/apps-script-samples)
- [Gmail Processor 参考](https://github.com/ahochsteger/gmail-processor)

## 贡献指南

### 提交代码

```bash
# 1. 创建功能分支
git checkout -b feature/new-classifier

# 2. 开发并测试
clasp push
# 在 Apps Script 编辑器中测试

# 3. 提交代码
git add .
git commit -m "feat: add new classifier logic"
git push origin feature/new-classifier

# 4. 创建 Pull Request
```

### 代码规范

- 使用 JSDoc 格式注释
- 函数名使用驼峰命名法
- 常量使用全大写下划线命名
- 每个函数前添加功能说明注释

### 测试要求

- 每个新功能必须包含测试函数
- 在 Pull Request 中说明测试结果
- 确保不破坏现有功能

---

## important-instruction-reminders

**核心原则**：
- 这是一个 Google Apps Script 项目，不是 FastAPI + Next.js 项目
- 所有代码使用 JavaScript（ES5 兼容，V8 Runtime）
- 使用 clasp 进行本地开发
- 遵循分阶段实施策略
- 性能优化优先（分片缓存、批量操作）
- 用户隐私第一（零数据上传）

**开发规范**：
- NEVER create files unless they're absolutely necessary for achieving your goal.
- ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files (*.md) unless explicitly requested.
- 遵循 docs/implementation/ 中的实施计划
- 参考 Phase-1-DataLayer.md 中的代码风格
- 使用 Logger.log() 进行调试，不要使用 console.log()
