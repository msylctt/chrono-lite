# Google Workspace 插件增强 Chrono 功能可行性调研

## 文档信息

| 项目 | 内容 |
|------|------|
| **调研目标** | 评估 Gmail Add-on 如何增强邮箱分类功能 |
| **关注场景** | 用户首次使用时对混乱邮箱进行批量分类 |
| **调研日期** | 2025年10月14日 |
| **结论预览** | ⚠️ **不推荐作为核心功能，可作为补充工具** |

---

## 执行摘要

### 核心发现

1. **Gmail Add-on 能力受限**：主要用于单邮件场景，不适合大规模批量操作
2. **Apps Script 更适合批处理**：可处理历史邮件，但需用户手动运行脚本
3. **AI 分类已有成熟案例**：结合 Gemini/OpenAI API 可实现智能分类
4. **建议策略**：Add-on 作为辅助工具，核心功能仍在 Chrono Web 应用

### 推荐方案组合

```
主产品（Chrono Web 应用）
    ↓ 核心功能
[邮件聚合 + AI 摘要 + 翻译 + 阅读器]
    ↓
补充工具：Gmail Add-on（可选）
    ↓ 增强功能
[侧边栏快速标记 + 一键导入到 Chrono + Newsletter 识别辅助]
    ↓
高级工具：Apps Script（技术用户）
    ↓ 批量处理
[历史邮件批量分类 + 自动化规则]
```

---

## 1. Google Workspace Add-on 技术能力分析

### 1.1 界面与交互限制

#### 界面结构
- **展示位置**：Gmail 右侧边栏（Sidebar）
- **UI 组件**：基于 Card-based UI
  - 卡片（Card）：每个"页面"的基本单位
  - 小部件（Widgets）：按钮、文本框、下拉菜单、图片等
  - 限制：**无法自定义 HTML/CSS**，仅能使用预定义组件

#### 触发机制
| 触发类型 | 说明 | 适用场景 |
|----------|------|----------|
| **Contextual Trigger** | 当用户打开某封邮件时触发 | 单邮件操作（如快速标记为 Newsletter） |
| **Homepage Trigger** | 用户打开 Add-on 时显示主页 | 展示统计信息、设置入口 |
| **Compose Trigger** | 用户撰写邮件时触发 | 不适用 Chrono 场景 |

**关键限制**：
- ✅ 可以访问当前打开的邮件内容
- ❌ **无法主动扫描整个邮箱**
- ❌ **无法批量操作多封邮件**（需用户逐个打开）
- ❌ **无法在后台运行**（必须用户打开侧边栏）

### 1.2 API 访问能力

#### 可用服务
```javascript
// Gmail Add-on 可调用的核心 API
GmailApp.getMessageById(messageId)     // 获取单封邮件
GmailApp.getUserLabelByName(name)      // 获取标签
message.getSubject()                   // 邮件主题
message.getFrom()                      // 发件人
message.getPlainBody()                 // 纯文本正文
message.addLabel(label)                // 应用标签
message.markRead()                     // 标记已读
```

#### 不可用操作
- ❌ **批量搜索**：无法直接调用 `GmailApp.search()` 扫描全邮箱
- ❌ **后台定时任务**：Add-on 无法设置 Time-driven Trigger
- ❌ **跨邮件分析**：无法同时处理多封邮件进行对比分类

### 1.3 与 Apps Script 的关键区别

| 维度 | Gmail Add-on | Google Apps Script |
|------|--------------|---------------------|
| **运行环境** | Gmail 侧边栏 UI | 独立脚本（后台运行） |
| **触发方式** | 用户打开邮件 | 手动运行 / 定时触发 |
| **批量操作** | ❌ 不支持 | ✅ 支持（最多 500 threads/次） |
| **用户体验** | 无缝集成 Gmail | 需到 Apps Script 编辑器运行 |
| **开发复杂度** | 中等（Card UI 学习曲线） | 简单（纯 JavaScript） |
| **适用场景** | 单邮件快速操作 | 批量历史数据处理 |

---

## 2. 竞品案例分析

### 2.1 AI Label Assistant（Gmail Marketplace）

**功能**：
- 使用 ChatGPT/GPT-4o 自动标记邮件
- 侧边栏显示 AI 推荐的标签
- 用户一键应用标签

**技术实现**：
- Gmail Add-on 框架
- 调用 OpenAI API 分析邮件内容
- 将分类结果存储到 Gmail 标签

**局限性**：
- ⚠️ **仅对打开的邮件生效**，无法批量处理历史邮件
- ⚠️ 每次分类需用户逐个打开邮件
- ⚠️ 高频使用下 OpenAI API 成本较高

### 2.2 Gmail Unsubscriber（开源 Apps Script）

**项目**：[labnol/unsubscribe-gmail](https://github.com/labnol/unsubscribe-gmail)

**功能**：
- 批量识别带 `List-Unsubscribe` 头部的邮件
- 提取退订链接
- 自动访问链接完成退订

**技术实现**：
```javascript
function findNewsletters() {
  var threads = GmailApp.search('has:nouserlabels', 0, 500);
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var headers = messages[j].getRawContent();
      if (headers.match(/List-Unsubscribe:/)) {
        // 应用 "Newsletter" 标签
        threads[i].addLabel(newsletterLabel);
      }
    }
  }
}
```

**优势**：
- ✅ 可批量处理最多 500 个 threads
- ✅ 检测邮件头部，准确识别 Newsletter
- ✅ 开源免费，用户可自行部署

**局限性**：
- ⚠️ **需用户手动运行脚本**（到 Apps Script 编辑器点击执行）
- ⚠️ Gmail API 配额限制：每天最多 20,000 次 API 调用
- ⚠️ 每次处理 500 threads，大邮箱需多次运行

### 2.3 AI Email Classifier（Apps Script + Gemini）

**案例来源**：nicoletangsy.com 文章（2025年）

**技术方案**：
1. 使用 `GmailApp.search('is:unread newer_than:1d')` 获取新邮件
2. 将邮件主题、发件人、正文片段发送给 Gemini API
3. Gemini 返回分类标签（Newsletter、Financial、Purchase 等）
4. 应用标签到 Gmail

**关键代码片段**：
```javascript
function classifyEmails() {
  var threads = GmailApp.search('is:unread newer_than:1d', 0, 100);

  threads.forEach(function(thread) {
    var message = thread.getMessages()[0];
    var emailData = {
      subject: message.getSubject(),
      from: message.getFrom(),
      snippet: message.getPlainBody().substring(0, 500)
    };

    // 调用 Gemini API
    var category = callGeminiAPI(emailData);

    // 应用标签
    var label = GmailApp.getUserLabelByName(category);
    if (!label) label = GmailApp.createLabel(category);
    thread.addLabel(label);
  });
}
```

**成本分析**：
- Gemini 1.5 Flash：$0.00001875/1K tokens
- 假设每封邮件 500 tokens，1000 封邮件成本 ≈ $0.01
- **远低于人工处理成本**

**优势**：
- ✅ AI 分类准确率高（可根据邮件内容语义分类）
- ✅ 可自定义分类标签（如"Competitor Updates"、"Tech News"）
- ✅ 成本低（Gemini 比 OpenAI 便宜 10 倍）

**局限性**：
- ⚠️ 需设置定时触发器（每小时/每天运行）
- ⚠️ 无法实时分类（有延迟）
- ⚠️ 用户需授权 Apps Script 访问 Gmail

---

## 3. 针对 Chrono 的应用场景评估

### 3.1 场景 1：用户首次导入混乱邮箱

**需求描述**：
用户有 5000+ 封历史邮件，其中约 30% 是 Newsletter，需一次性分类整理。

#### 方案 A：Gmail Add-on（❌ 不可行）
**为何不可行**：
- Add-on 无法主动扫描全邮箱
- 用户需逐个打开 1500 封邮件触发分类
- 体验极差，违背"节省时间"的产品价值

#### 方案 B：Apps Script 批量脚本（✅ 可行但体验差）
**实现步骤**：
1. 提供预写好的 Apps Script 代码
2. 用户复制到 Apps Script 编辑器
3. 授权后运行脚本
4. 脚本批量处理 500 threads/次，自动应用标签

**优势**：
- 可快速处理大量历史邮件
- 准确识别 Newsletter（检测 `List-Unsubscribe`）

**劣势**：
- ⚠️ **技术门槛高**：普通用户不熟悉 Apps Script
- ⚠️ **授权担忧**：用户需授予脚本完整 Gmail 访问权限
- ⚠️ **维护负担**：脚本出错需提供支持

#### 方案 C：Chrono 后端 + Gmail API（✅ 推荐）
**实现步骤**：
1. 用户在 Chrono 应用内点击"导入历史邮件"
2. 通过 OAuth 授权 Chrono 访问 Gmail（只读权限）
3. Chrono 后端调用 Gmail API 批量抓取邮件
4. 后端 AI 分类，结果存储到 Chrono 数据库
5. 用户在 Chrono 界面查看分类结果

**优势**：
- ✅ **用户体验最佳**：一键操作，无需离开 Chrono
- ✅ **无技术门槛**：OAuth 流程标准且安全
- ✅ **可控性强**：Chrono 掌握分类逻辑，可持续优化
- ✅ **隐私友好**：仅请求只读权限，符合 PRD 承诺

**成本分析**：
- Gmail API 配额：20,000 次调用/天（免费）
- 5000 封邮件 ≈ 10,000 次 API 调用（获取邮件 + 元数据）
- 可在 1-2 天内完成导入（分批处理）

### 3.2 场景 2：日常新邮件自动分类

**需求描述**：
用户每天收到 20-50 封新邮件，需自动识别 Newsletter 并导入 Chrono。

#### 方案 A：Gmail Add-on 辅助（✅ 可选功能）
**用户体验**：
1. 用户在 Gmail 打开一封邮件
2. Chrono Add-on 侧边栏显示：
   - "✅ 这是 Newsletter"
   - [一键导入到 Chrono] 按钮
   - AI 生成的简短摘要预览（50 字）
3. 用户点击按钮，邮件立即同步到 Chrono 应用

**技术实现**：
```javascript
// Add-on 代码示例
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);

  // 检测是否为 Newsletter
  var isNewsletter = detectNewsletter(message);

  if (isNewsletter) {
    // 调用 Chrono API 生成快速摘要
    var summary = callChronoAPI('/quick-summary', {
      subject: message.getSubject(),
      from: message.getFrom()
    });

    // 构建侧边栏卡片
    var card = CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('✅ Newsletter 检测到'))
        .addWidget(CardService.newTextParagraph()
          .setText('摘要：' + summary))
        .addWidget(CardService.newTextButton()
          .setText('导入到 Chrono')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('importToChrono'))))
      .build();

    return card;
  }
}

function importToChrono(e) {
  var messageId = e.gmail.messageId;
  // 调用 Chrono API 触发完整导入
  callChronoAPI('/import-email', { gmail_message_id: messageId });

  // 返回成功提示
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('已导入到 Chrono！'))
    .build();
}
```

**优势**：
- ✅ **无缝集成 Gmail**：用户无需切换应用
- ✅ **快速验证**：在 Gmail 内预览摘要，确认后导入
- ✅ **降低误判影响**：用户可选择性导入

**劣势**：
- ⚠️ 需用户手动打开邮件（不是全自动）
- ⚠️ Add-on 开发与审核周期长（Google Workspace Marketplace 审核）

#### 方案 B：Chrono 后端定时同步（✅ 推荐核心方案）
**实现步骤**：
1. Chrono 后端每 5-10 分钟调用 Gmail API 拉取新邮件
2. AI 自动识别 Newsletter 并生成摘要
3. 用户打开 Chrono 应用即可看到新邮件

**优势**：
- ✅ **全自动**：无需用户任何操作
- ✅ **实时性好**：10 分钟延迟可接受
- ✅ **与 PRD 一致**：符合现有技术架构

---

## 4. 综合建议与实施优先级

### 4.1 功能优先级矩阵

| 功能 | 实现方式 | 优先级 | 开发成本 | 用户价值 | 推荐阶段 |
|------|----------|--------|----------|----------|----------|
| **历史邮件批量导入** | Chrono 后端 + Gmail API | P0 | 中 | 极高 | MVP |
| **新邮件自动同步** | Chrono 后端定时任务 | P0 | 低 | 极高 | MVP |
| **Gmail Add-on 侧边栏** | Google Workspace Add-on | P2 | 高 | 中 | V2 |
| **专属邮箱接收** | Mailgun Inbound | P0 | 中 | 高 | MVP（已在 PRD） |
| **Apps Script 批量脚本** | 开源工具 | P3 | 极低 | 中 | 社区贡献 |

### 4.2 推荐实施路线图

#### MVP 阶段（Week 1-12）
**核心功能**：
1. ✅ Gmail OAuth 连接（PRD 已定义）
2. ✅ 后端定时同步新邮件（IMAP 或 Gmail API）
3. ✅ AI 自动识别 Newsletter 并生成摘要
4. ✅ 专属邮箱地址接收新订阅

**不做**：
- ❌ Gmail Add-on（开发成本高，用户价值边际）
- ❌ Apps Script 脚本（技术用户可自行实现，无需官方支持）

#### V2 阶段（MVP 上线后 3-6 个月）
**条件触发**：
- 用户反馈强烈要求"在 Gmail 内快速操作"
- 付费用户数 >500，有足够资源投入

**可选功能**：
1. 开发 Gmail Add-on，提供：
   - 侧边栏显示 AI 摘要预览
   - 一键导入到 Chrono
   - 快速标记为"已读"或"归档"
2. 提交到 Google Workspace Marketplace
3. 作为差异化卖点宣传（"唯一深度集成 Gmail 的 Newsletter 工具"）

#### 社区贡献（持续）
**低优先级工具**：
- 提供开源 Apps Script 模板
- 文档说明如何批量标记历史邮件
- 由社区用户自行部署使用

### 4.3 技术决策总结

#### ✅ 推荐做的
1. **Gmail API 集成**（PRD 已定义）
   - 使用 OAuth 2.0 只读权限
   - 后端调用 `users.messages.list()` 和 `users.messages.get()`
   - 缓存邮件元数据，不存储正文（符合隐私承诺）

2. **Newsletter 识别算法**（可复用开源逻辑）
   ```python
   def is_newsletter(message):
       headers = message['payload']['headers']
       # 检测 List-Unsubscribe 头部
       if any(h['name'] == 'List-Unsubscribe' for h in headers):
           return True
       # 检测关键词
       subject = get_header(headers, 'Subject')
       if re.search(r'newsletter|weekly|digest|update', subject, re.I):
           return True
       return False
   ```

3. **AI 分类抽象层**（PRD 已定义）
   - 使用 Claude/Gemini API 生成摘要
   - 成本控制：$0.01/封邮件以内

#### ❌ 不推荐做的
1. **Gmail Add-on 作为 MVP 核心功能**
   - 理由：开发成本高（Card UI 学习曲线），用户价值有限
   - 替代方案：专注优化 Chrono Web 应用体验

2. **提供官方 Apps Script 脚本工具**
   - 理由：维护负担重，技术支持成本高
   - 替代方案：提供文档，引导用户到开源社区方案

3. **在 Add-on 内嵌入完整 AI 处理**
   - 理由：Add-on 性能受限，延迟高
   - 替代方案：Add-on 仅作为轻量级触发器，重计算在 Chrono 后端

---

## 5. 风险与注意事项

### 5.1 Gmail API 配额限制

| 操作 | 配额 | 影响 |
|------|------|------|
| **每日 API 调用** | 20,000 次/用户/天 | 约可处理 5000 封邮件/天 |
| **批量读取速率** | 250 次/秒 | 需实现速率限制（Rate Limiting） |
| **用户数限制** | 取决于 Google Cloud 配额 | 需监控并申请提升配额 |

**缓解措施**：
- 实现指数退避（Exponential Backoff）
- 优先同步最近 30 天邮件
- 历史邮件分批导入（每天处理 5000 封）

### 5.2 Add-on 审核风险

**Google Workspace Marketplace 审核要求**：
- 安全审核：第三方安全评估（成本 $15,000-$75,000）
- OAuth 范围审核：需证明请求的权限最小化
- 隐私政策：详细说明数据使用方式
- 审核周期：4-8 周

**建议**：
- MVP 阶段不发布到 Marketplace
- 仅作为"未发布应用"供内测用户使用
- V2 阶段再投入资源通过审核

### 5.3 用户隐私顾虑

**潜在担忧**：
- "为什么 Chrono 需要访问我的 Gmail？"
- "我的邮件内容会被存储吗？"

**沟通策略**（在 PRD 基础上强化）：
1. **OAuth 授权页面**：清晰展示
   - ✅ 我们会：读取邮件元数据（发件人、主题、时间）
   - ✅ 我们会：临时读取邮件正文生成摘要
   - ❌ 我们不会：存储邮件正文
   - ❌ 我们不会：发送邮件或修改邮件

2. **安全徽章**：
   - "SOC 2 认证"（V2 阶段考虑）
   - "零邮件正文存储保证"

3. **透明报告**：
   - 定期发布"隐私透明度报告"
   - 展示 API 调用统计（去除敏感信息）

---

## 6. 结论与行动建议

### 6.1 核心结论

1. **Gmail Add-on 不是 MVP 必需品**
   - 适合作为 V2 的差异化功能
   - 核心价值仍在 Chrono Web 应用的 AI 处理能力

2. **Gmail API 是最佳技术路径**
   - 完全满足 PRD 需求
   - 用户体验最佳，技术可控

3. **Apps Script 可作为社区工具**
   - 提供文档引导技术用户
   - 降低官方维护负担

### 6.2 立即行动项（MVP 阶段）

#### Week 1-2：Gmail API 集成（PRD 已定义）
- [ ] 实现 Gmail OAuth 2.0 流程
- [ ] 开发 Newsletter 识别算法（检测 `List-Unsubscribe`）
- [ ] 测试批量导入 500 封邮件的性能

#### Week 3-4：AI 分类测试
- [ ] 对比 Claude vs Gemini 的分类准确率
- [ ] 优化 Prompt 工程（参考竞品案例）
- [ ] 计算单封邮件处理成本

#### Week 5-6：用户引导优化
- [ ] 设计"首次导入"向导界面
- [ ] 撰写隐私政策清晰说明 Gmail 访问范围
- [ ] 制作演示视频（展示 OAuth 授权安全性）

### 6.3 V2 阶段决策点（上线后 3 个月评估）

**决策标准**：
- 付费用户数 >500
- 用户反馈中 >30% 提及"希望在 Gmail 内操作"
- 团队有余力投入 8-12 周开发周期

**如果满足条件，启动 Gmail Add-on 开发**：
- [ ] 招聘/外包 Google Workspace Add-on 专家
- [ ] 设计侧边栏 UI（Figma 原型）
- [ ] 开发并内测
- [ ] 申请 Marketplace 审核

---

## 7. 参考资料

### 7.1 技术文档
- [Gmail API Reference](https://developers.google.com/gmail/api)
- [Google Workspace Add-ons Overview](https://developers.google.com/workspace/add-ons)
- [Apps Script Gmail Service](https://developers.google.com/apps-script/reference/gmail)

### 7.2 开源项目
- [labnol/unsubscribe-gmail](https://github.com/labnol/unsubscribe-gmail)（Newsletter 识别参考）
- [justjake/gmail-unsubscribe](https://github.com/justjake/gmail-unsubscribe)（批量处理参考）

### 7.3 竞品研究
- **AI Label Assistant**：Gmail Marketplace 排名前 10 的 AI 分类工具
- **Meco**：Newsletter 聚合器（未使用 Add-on，纯 Web 应用）
- **Summate.io**：AI 邮件摘要（同样未使用 Add-on）

### 7.4 成本参考
- Gmail API：免费（20,000 次调用/天）
- Gemini 1.5 Flash API：$0.00001875/1K tokens
- Google Workspace Marketplace 安全审核：$15,000-$75,000
- Add-on 开发时间：8-12 周（全职开发者）

---

## 附录：示例代码片段

### A. Newsletter 检测函数（Python）

```python
import re
from typing import Dict, Any

def is_newsletter(message: Dict[str, Any]) -> bool:
    """
    检测邮件是否为 Newsletter

    Args:
        message: Gmail API 返回的邮件对象

    Returns:
        True 表示是 Newsletter，False 表示不是
    """
    headers = {h['name']: h['value'] for h in message['payload']['headers']}

    # 检查 1：List-Unsubscribe 头部（最准确）
    if 'List-Unsubscribe' in headers or 'List-Id' in headers:
        return True

    # 检查 2：主题关键词
    subject = headers.get('Subject', '').lower()
    newsletter_keywords = [
        'newsletter', 'weekly', 'digest', 'update',
        'changelog', 'release notes', 'bulletin'
    ]
    if any(kw in subject for kw in newsletter_keywords):
        return True

    # 检查 3：发件人域名模式
    from_email = headers.get('From', '').lower()
    newsletter_domains = [
        'substack.com', 'beehiiv.com', 'convertkit.com',
        'mailchimp.com', 'sendgrid.net'
    ]
    if any(domain in from_email for domain in newsletter_domains):
        return True

    # 检查 4：Gmail 分类（需额外 API 调用）
    labels = message.get('labelIds', [])
    if 'CATEGORY_PROMOTIONS' in labels or 'CATEGORY_UPDATES' in labels:
        # 需结合其他信号，避免误判
        if 'unsubscribe' in headers.get('Body', '').lower():
            return True

    return False
```

### B. 批量导入脚本（Apps Script）

```javascript
/**
 * 批量标记 Newsletter 邮件
 * 可由用户手动运行，或设置为每日定时任务
 */
function batchLabelNewsletters() {
  var label = GmailApp.getUserLabelByName('Newsletter');
  if (!label) {
    label = GmailApp.createLabel('Newsletter');
  }

  // 搜索未分类的邮件（最近 30 天）
  var query = 'is:unread newer_than:30d -in:spam -in:trash';
  var threads = GmailApp.search(query, 0, 100); // 每次处理 100 个

  var processedCount = 0;
  var newsletterCount = 0;

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    var firstMessage = messages[0];

    // 检测是否为 Newsletter
    if (isNewsletter(firstMessage)) {
      thread.addLabel(label);
      thread.markRead(); // 可选：标记已读
      newsletterCount++;
    }
    processedCount++;
  });

  Logger.log('处理了 ' + processedCount + ' 个对话');
  Logger.log('识别出 ' + newsletterCount + ' 个 Newsletter');
}

/**
 * Newsletter 检测函数
 */
function isNewsletter(message) {
  var rawContent = message.getRawContent();

  // 检测 List-Unsubscribe 头部
  if (rawContent.match(/List-Unsubscribe:/i)) {
    return true;
  }

  // 检测主题关键词
  var subject = message.getSubject().toLowerCase();
  var keywords = ['newsletter', 'weekly', 'digest', 'update'];
  for (var i = 0; i < keywords.length; i++) {
    if (subject.indexOf(keywords[i]) !== -1) {
      return true;
    }
  }

  return false;
}
```

### C. Gmail Add-on 卡片示例（Apps Script）

```javascript
/**
 * 当用户打开邮件时触发
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var accessToken = e.gmail.accessToken;

  // 获取邮件内容
  GmailApp.setCurrentMessageAccessToken(accessToken);
  var message = GmailApp.getMessageById(messageId);

  // 检测 Newsletter
  var isNL = isNewsletter(message);

  if (!isNL) {
    // 不是 Newsletter，不显示卡片
    return CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('这不是 Newsletter')))
      .build();
  }

  // 构建侧边栏卡片
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Chrono Newsletter')
      .setImageUrl('https://chrono.app/icon.png'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('✅ 检测到 Newsletter'))
      .addWidget(CardService.newTextParagraph()
        .setText('<b>发件人：</b>' + message.getFrom()))
      .addWidget(CardService.newTextParagraph()
        .setText('<b>主题：</b>' + message.getSubject())))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('🚀 导入到 Chrono')
        .setBackgroundColor('#1E40AF')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('importToChrono')
          .setParameters({messageId: messageId}))))

    .build();

  return card;
}

/**
 * 导入到 Chrono
 */
function importToChrono(e) {
  var messageId = e.parameters.messageId;

  // 调用 Chrono API
  var url = 'https://api.chrono.app/v1/import-email';
  var payload = {
    gmail_message_id: messageId,
    user_id: Session.getActiveUser().getEmail()
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      'Authorization': 'Bearer ' + PropertiesService.getUserProperties().get('chronoApiKey')
    }
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

    // 显示成功通知
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 已导入到 Chrono！'))
      .build();

  } catch (error) {
    Logger.log('导入失败：' + error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 导入失败，请稍后重试'))
      .build();
  }
}
```

---

**文档结束**

> **总结**：Gmail Add-on 技术上可行，但不应作为 MVP 核心功能。建议 MVP 专注于 Gmail API 集成的 Web 应用，V2 阶段根据用户反馈决定是否投入 Add-on 开发。
