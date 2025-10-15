# Phase 4: UI 层实现（Card Service）

## 阶段目标

实现 Gmail 侧边栏 UI，包括 Homepage Card、Context Card、Settings Card。

**预计时间**：2-3 天

## Card Service 基础

### 核心概念

```javascript
// Trigger → Card Builder → Card
buildHomepage(e) → CardService.newCardBuilder() → Card[]
```

### 关键限制

- 无法自定义 CSS
- 仅限预定义 widgets
- 异步交互通过 Action handlers

## 实施步骤

### Step 1: 创建 UI.gs 基础结构

```javascript
/**
 * Phase 4: Card Service UI
 */

/**
 * Homepage Trigger（侧边栏主页）
 */
function buildHomepage(e) {
  var userProps = PropertiesService.getUserProperties();
  var initialized = userProps.getProperty('chrono_initialized');
  
  if (!initialized) {
    return buildOnboardingCard();
  }
  
  return buildDashboardCard();
}

/**
 * Context Trigger（打开邮件时）
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);
  
  var result = classifyEmail(message);
  
  if (result) {
    return buildClassifiedCard(message, result);
  } else {
    return buildUnknownSenderCard(message);
  }
}
```

### Step 2: 实现 Onboarding Card

```javascript
/**
 * 引导卡片（首次使用）
 */
function buildOnboardingCard() {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🎉 欢迎使用 Chrono Lite'))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>3 步快速开始</b><br>① 加载数据库<br>② 处理邮件<br>③ 查看效果'))
      
      .addWidget(CardService.newTextButton()
        .setText('开始初始化')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('runInitialization'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)))
    
    .build();
  
  return [card];
}
```

### Step 3: 实现 Dashboard Card

```javascript
/**
 * 仪表盘卡片（主界面）
 */
function buildDashboardCard() {
  var stats = getEmailStats();
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Chrono Lite')
      .setSubtitle('邮件分类统计'))
    
    .addSection(CardService.newCardSection()
      .setHeader('📊 今日统计')
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('已处理')
        .setContent(stats.todayProcessed + ' 封')
        .setIcon(CardService.Icon.EMAIL))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Newsletter')
        .setContent(stats.newsletter + ' 封未读')
        .setIcon(CardService.Icon.BOOKMARK)))
    
    .addSection(CardService.newCardSection()
      .setHeader('⚡ 快速操作')
      
      .addWidget(CardService.newTextButton()
        .setText('🔄 手动同步')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('manualSync')))
      
      .addWidget(CardService.newTextButton()
        .setText('📥 更新数据库')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('forceUpdateDatabase'))))
    
    .build();
  
  return [card];
}

/**
 * 获取邮件统计
 */
function getEmailStats() {
  return {
    todayProcessed: GmailApp.search('newer_than:1d label:Chrono').length,
    newsletter: GmailApp.search('label:Chrono/Newsletter is:unread').length
  };
}
```

### Step 4: 实现 Context Card

```javascript
/**
 * 分类结果卡片（打开邮件时显示）
 */
function buildClassifiedCard(message, result) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Chrono Lite')
      .setSubtitle(extractEmail(message.getFrom())))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel('分类')
        .setContent('✅ ' + result.category)
        .setIcon(CardService.Icon.BOOKMARK))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('置信度')
        .setContent((result.confidence * 100).toFixed(0) + '%'))
      
      .addWidget(CardService.newKeyValue()
        .setTopLabel('匹配方式')
        .setContent(result.source)))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('✅ 应用标签并归档')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('applyLabelFromCard')
            .setParameters({
              messageId: message.getId(),
              category: result.category
            })))))
    
    .build();
  
  return [card];
}

/**
 * 未知发件人卡片
 */
function buildUnknownSenderCard(message) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❓ 未识别发件人')
      .setSubtitle(extractEmail(message.getFrom())))
    
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('此发件人不在数据库中'))
      
      .addWidget(CardService.newTextButton()
        .setText('📤 提交到数据库')
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new'))))
    
    .build();
  
  return [card];
}
```

### Step 5: 实现 Action Handlers

```javascript
/**
 * 运行初始化（按钮点击触发）
 */
function runInitialization(e) {
  try {
    // 加载数据库
    storeShardedDatabase();
    
    // 处理最近 7 天邮件
    var threads = GmailApp.search('in:inbox newer_than:7d', 0, 50);
    var processed = 0;
    
    threads.forEach(function(thread) {
      var message = thread.getMessages()[0];
      var result = classifyEmail(message);
      if (result) {
        applyCategory(thread, result.category);
        processed++;
      }
    });
    
    // 标记已初始化
    PropertiesService.getUserProperties()
      .setProperty('chrono_initialized', 'true');
    
    // 返回成功通知
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 初始化完成！已处理 ' + processed + ' 封邮件'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()))
      .build();
    
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 初始化失败：' + error.message))
      .build();
  }
}

/**
 * 从卡片应用标签
 */
function applyLabelFromCard(e) {
  var messageId = e.parameters.messageId;
  var category = e.parameters.category;
  
  var message = GmailApp.getMessageById(messageId);
  var thread = message.getThread();
  
  applyCategory(thread, category);
  
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ 已应用标签：' + category))
    .build();
}

/**
 * 手动同步
 */
function manualSync(e) {
  var threads = GmailApp.search('in:inbox newer_than:1h', 0, 20);
  var processed = 0;
  
  threads.forEach(function(thread) {
    var message = thread.getMessages()[0];
    var result = classifyEmail(message);
    if (result) {
      applyCategory(thread, result.category);
      processed++;
    }
  });
  
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ 同步完成，处理 ' + processed + ' 封邮件'))
    .build();
}

/**
 * 强制更新数据库
 */
function forceUpdateDatabase(e) {
  var cache = CacheService.getScriptCache();
  
  // 清除所有缓存
  cache.remove(CACHE_META_KEY);
  for (var i = 0; i < NUM_SHARDS; i++) {
    cache.remove(CACHE_SHARD_PREFIX + i);
  }
  
  // 重新加载
  var meta = storeShardedDatabase();
  
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ 数据库已更新！' + meta.totalEntries + ' 条记录'))
    .build();
}
```

### Step 6: 测试 UI（手动验证）

```javascript
/**
 * 测试 Homepage Card（通过 Apps Script 编辑器运行）
 */
function testHomepageCard() {
  // 模拟 event 对象
  var e = {};
  
  var cards = buildHomepage(e);
  Logger.log('Homepage Card 创建成功');
  Logger.log('Card 数量: ' + cards.length);
  
  // 注意：Card 对象无法直接在 Logger 中显示
  // 需要在 Gmail 中实际查看
  return cards;
}

/**
 * 测试 Context Card
 */
function testContextCard() {
  var threads = GmailApp.search('in:inbox', 0, 1);
  if (threads.length === 0) {
    Logger.log('❌ 收件箱无邮件');
    return;
  }
  
  var message = threads[0].getMessages()[0];
  var result = classifyEmail(message);
  
  if (result) {
    var cards = buildClassifiedCard(message, result);
    Logger.log('✅ Context Card 创建成功');
    return cards;
  } else {
    var cards = buildUnknownSenderCard(message);
    Logger.log('✅ Unknown Sender Card 创建成功');
    return cards;
  }
}
```

### Step 7: 更新 appsscript.json

```json
{
  "timeZone": "Asia/Shanghai",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.addons.current.message.readonly",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "addOns": {
    "common": {
      "name": "Chrono Lite",
      "logoUrl": "https://raw.githubusercontent.com/msylctt/chrono-lite/main/assets/logo.png",
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

## 验收标准

- [ ] Homepage Card 正常显示
- [ ] Context Card 显示分类结果
- [ ] 按钮点击触发正确的 Action
- [ ] Notification 正常显示
- [ ] Navigation 正常工作

## 测试方法

### 在 Gmail 中测试：

1. **测试 Homepage**：
   - 打开 Gmail
   - 点击右侧边栏的 Chrono Lite 图标
   - 应显示 Onboarding Card 或 Dashboard

2. **测试 Context Card**：
   - 打开任一邮件
   - 侧边栏应显示分类信息

3. **测试 Action**：
   - 点击"开始初始化"按钮
   - 观察通知和卡片更新

## 下一步

进入 [Phase 5: 触发器与自动化](./Phase-5-Triggers.md)。

---

**阶段状态**：🟢 就绪  
**难度**：⭐⭐ 简单-中等  
**关键性**：🟡 中

