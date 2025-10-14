# Chrono 产品需求文档 (PRD)

## 文档信息

| 项目 | 内容 |
|------|------|
| **产品名称** | Chrono |
| **文档版本** | V1.0 (MVP) |
| **负责人** | [项目负责人] |
| **最后更新** | 2025年10月14日 |
| **文档状态** | 待评审 |
| **变更历史** | V1.0 - 初始版本，综合三份AI生成PRD优化而成 |

---

## 执行摘要

### 一句话描述
Chrono 是面向中国出海独立开发者的智能Newsletter聚合与阅读工具，通过AI驱动的摘要和翻译，将混乱的英文邮件流转化为结构化的中文知识库。

### 核心价值主张
- **解决痛点**：信息过载 + 语言壁垒 + 工作流断裂
- **价值承诺**：将每日1-2小时的邮件处理时间缩短至10-15分钟
- **差异化优势**：专注中国出海用户的文化语境，零数据保留的隐私承诺

### MVP目标
- **时间范围**：12周（3个月）
- **核心验证**：用户愿意为"聚合-摘要-翻译-阅读"闭环付费
- **成功标准**：100名付费用户，月留存率>30%

---

## 1. 市场分析与战略定位

### 1.1 市场机会

#### 宏观趋势
- **中国出海浪潮**：2025年上半年中国企业成立2292个海外子公司（数据来源：Abovea.tech）
- **信息获取刚需**：出海创业者严重依赖英文Newsletter获取市场情报
- **市场规模**：
  - 邮件营销软件市场到2032年达37.3亿美元，CAGR 11.8%（Fortune Business Insights）
  - 新闻聚合市场CAGR 9.1%（Business Research Insights）

#### 竞争态势
| 竞品 | 定位 | 优势 | 劣势 |
|------|------|------|------|
| Meco | Newsletter聚合器 | 界面美观，已有用户基础 | 无AI摘要，无翻译 |
| Summate.io | AI邮件摘要 | 摘要能力强 | 不聚焦Newsletter，无中文优化 |
| Gmail过滤器 | 原生工具 | 免费，无学习成本 | 无智能处理，仍需手动阅读 |

#### 竞争优势
1. **垂直定位**：唯一专注中国出海用户的Newsletter工具
2. **AI深度整合**：摘要+翻译+结构化提取
3. **隐私承诺**：零邮件正文存储（仅元数据）
4. **文化语境**：针对中文思维习惯的摘要结构

### 1.2 目标用户

#### 主要用户画像："李雷"
- **基本信息**：30岁，中国独立开发者，正在开发北美市场的SaaS工具
- **行为特征**：
  - Gmail订阅超过100个英文Newsletter（Stratechery、竞品更新、技术博客）
  - 每天花费1-2小时处理邮件
  - 当前工作流：Gmail → 复制到翻译工具 → 手动记录到Notion
- **核心痛点**：
  1. 严重的FOMO（信息错失恐惧症）
  2. 邮箱被海量非结构化信息淹没
  3. 阅读英文消耗大量认知资源
  4. 频繁切换工具导致工作流断裂
- **目标与动机**：
  - 将时间从"处理信息"转移到"思考与决策"
  - 快速建立对海外市场的清晰认知
  - 愿意为效率工具付费（已付费Notion、Figma等）
- **付费能力**：月收入2-5万元，可接受$10-30/月的工具订阅

#### 次要用户
- **关注海外趋势的投资人/分析师**：使用频率更高但对翻译要求更严格

---

## 2. 产品目标与成功指标

### 2.1 产品目标

#### MVP阶段目标（3个月）
1. **验证核心价值**：证明用户愿意为AI处理Newsletter付费
2. **建立技术基础**：稳定的邮件聚合+AI处理管道
3. **获取种子用户**：100名付费用户，建立反馈渠道

#### 长期愿景（12个月）
成为中国出海独立开发者的"跨境信息中枢"，年收入达到50万元，支持独立开发者全职投入。

### 2.2 核心成功指标 (KPI)

| 指标分类 | 具体指标 | MVP目标值 | 数据来源 | 备注 |
|----------|----------|-----------|----------|------|
| **激活率** | 注册后7天内连接邮箱并处理≥10封邮件的用户占比 | >40% | 后端日志 | 验证上手流畅度 |
| **留存率** | 月度留存率 | >30% | 数据库查询 | 核心健康指标 |
| **核心功能使用率** | 每周使用≥5次AI摘要/翻译的用户占比 | >60% | 后端日志 | 验证功能粘性 |
| **付费转化率** | 免费试用→付费订阅 | >8% | Stripe数据 | 商业可行性 |
| **MRR** | 月度经常性收入 | ≥1.5万元 | Stripe数据 | 100用户×$20×7.2=14,400元 |
| **NPS** | 净推荐值 | >50 | 应用内问卷 | 产品满意度 |

### 2.3 次要指标

- **技术健康度**：API成功率>99%，P95响应时间<3秒
- **成本效率**：AI API成本/用户<$2/月
- **支持负担**：支持工单/100用户<5个/周

---

## 3. MVP功能需求

### 3.1 功能架构概览

```
用户注册 → 邮件聚合 → AI处理 → 专注阅读 → 知识沉淀（V2）
    ↓          ↓          ↓          ↓
  OAuth   Newsletter   摘要/翻译   Reader
  认证      识别与过滤              Mode
```

### 3.2 详细功能需求（用户故事格式）

#### Epic 1：邮件聚合 - 将Newsletter导入系统

**User Story 1.1：Gmail OAuth连接（P0 - 必须实现）**
- **作为** 新用户
- **我想要** 通过OAuth方式安全连接Gmail账户
- **以便** 应用能访问邮件而无需交出密码
- **验收标准**：
  - 使用Google OAuth 2.0标准流程
  - 仅请求Gmail只读权限（`gmail.readonly`）
  - 连接成功率>95%
  - 展示清晰的权限说明页面
- **技术方案**（来源：PRD-GPT）：
  - 使用Gmail API，引导用户在产品内授权
  - 存储加密的refresh token
  - 每5-10分钟同步一次新邮件
- **估算工作量**：5个故事点

**User Story 1.2：专属邮箱地址（P0 - 必须实现）**
- **作为** 用户
- **我想要** 获得专属的`@chrono.app`邮箱地址
- **以便** 用新地址订阅信息源，从源头分离情报与日常邮件
- **验收标准**：
  - 自动生成格式为`{username}@chrono.app`的地址
  - 到达该地址的邮件自动进入情报收件箱
  - 提供一键复制地址功能
  - 展示使用该地址的引导教程
- **技术方案**（来源：PRD-GPT）：
  - 集成Mailgun Inbound Parse或类似服务
  - 解析Received/From字段保留原始发件人
  - 设置SPF/DKIM避免被标记为垃圾邮件
- **优先级调整理由**：
  - 原PRD-Gemini标记为P1，但专属邮箱可降低IMAP同步风险
  - 用户无需暴露主邮箱权限
  - 更符合"从源头分离"的产品理念
  - **建议调整为P0**
- **估算工作量**：8个故事点

**User Story 1.3：Newsletter自动识别（P0 - 必须实现）**
- **作为** 用户
- **我想要** 应用自动识别收件箱中的Newsletter
- **以便** 主邮箱保持整洁，仅聚合有价值内容
- **验收标准**：
  - 识别准确率>85%（测试集：1000封邮件）
  - 支持用户手动标记误判
  - 白名单/黑名单机制
- **技术方案**（来源：PRD-GPT）：
  - 启发式规则：
    - 检测`List-Unsubscribe`或`List-Id`头部
    - 关键词：unsubscribe、newsletter、weekly、digest
    - Gmail类别：category:updates、category:promotions
  - 初始条件（可复制给用户）：
    ```
    List-Unsubscribe OR unsubscribe OR category:updates
    ```
- **估算工作量**：5个故事点

**User Story 1.4：历史邮件导入（P1 - 应该实现）**
- **作为** 用户
- **我想要** 导入过去3-6个月的历史Newsletter
- **以便** 快速建立知识库
- **验收标准**：
  - 支持Gmail IMAP标签同步
  - 支持Google Takeout的MBOX文件上传
  - 使用Message-ID去重
  - 显示导入进度
- **技术方案**（来源：PRD-GPT）：
  - 方式A：IMAP只读同步（推荐）
    - 用户在Gmail创建标签`Chrono`
    - 应用仅同步该标签
  - 方式B：MBOX上传
    - 用户通过Takeout导出特定标签
    - 后端解析MBOX格式
  - 节流策略：历史邮件先不生成摘要，仅索引元数据
- **估算工作量**：8个故事点

---

#### Epic 2：AI驱动消化 - 理解信息核心

**User Story 2.1：AI中文摘要（P0 - 必须实现）**
- **作为** 用户
- **我想要** 打开邮件时看到精炼的中文摘要
- **以便** 在1分钟内判断价值，决定是否深度阅读
- **验收标准**：
  - 摘要长度：80-150字
  - 生成时间：<5秒
  - 准确性：用户满意度>80%（应用内点赞/踩）
  - 缓存机制：相同邮件不重复生成
- **Prompt工程指引**（来源：PRD-Gemini结构化思路）：
  ```
  你是专业的信息摘要助手。请用中文总结以下英文Newsletter，
  按以下结构输出（每个板块1-2句话）：
  - 核心论点/主题
  - 关键数据或新功能
  - 对中国出海创业者的启示

  邮件内容：
  [邮件正文]
  ```
- **AI模型选择**（来源：PRD-Gemini风险意识）：
  - **必须构建抽象层**，避免供应商锁定
  - MVP推荐：Claude 3.7 Sonnet或Gemini 1.5 Pro
  - 理由：性能与成本均衡，对中国友好（OpenAI有API访问限制风险）
  - 成本控制：单次摘要成本<$0.01
- **估算工作量**：8个故事点

**User Story 2.2：全文翻译（P0 - 必须实现）**
- **作为** 用户
- **我想要** 一键翻译邮件全文为流畅中文
- **以便** 无障碍深度阅读
- **验收标准**：
  - 翻译自然度：>4.0/5（用户评分）
  - 保留原文格式（段落、列表、链接）
  - 支持中英对照模式
  - 生成时间：<8秒（3000词邮件）
- **技术方案**：
  - 使用与摘要相同的AI抽象层
  - 优化Prompt保留技术术语（如"SaaS"、"API"）
  - 缓存翻译结果
- **估算工作量**：5个故事点

**User Story 2.3：结构化摘要（P1 - 应该实现）**
- **作为** 用户
- **我想要** AI生成的摘要是结构化的
- **以便** 快速扫描关键信息
- **验收标准**：
  - 摘要自动分类为：核心论点、新功能、关键数据、行动建议
  - 支持折叠/展开各板块
  - 板块数量：2-4个（避免过于复杂）
- **延后理由**：需先验证基础摘要质量，避免过早优化
- **估算工作量**：5个故事点

---

#### Epic 3：专注式阅读 - 沉浸式消费信息

**User Story 3.1：Reader Mode（P0 - 必须实现）**
- **作为** 用户
- **我想要** 干净无干扰的阅读界面
- **以便** 专注于内容本身
- **验收标准**：
  - 自动去除页眉、页脚、广告
  - 提取正文并重新排版
  - 保留图片和代码块
  - 字体可读性：行高1.6，字号可调
- **技术方案**：
  - 使用Readability.js或类似库
  - CSS：最大宽度700px，居中显示
- **估算工作量**：5个故事点

**User Story 3.2：阅读个性化（P1 - 应该实现）**
- **作为** 用户
- **我想要** 调整阅读界面设置
- **以便** 满足个人习惯
- **验收标准**：
  - 字体大小：小/中/大/特大
  - 主题：浅色/深色/自动跟随系统
  - 设置持久化保存
- **估算工作量**：3个故事点

**User Story 3.3：移动端响应式（P0 - 必须实现）**
- **作为** 用户
- **我想要** 在手机上流畅阅读
- **以便** 利用碎片时间处理邮件
- **验收标准**：
  - 支持iOS Safari、Android Chrome
  - 触摸手势：左右滑动切换邮件
  - 加载时间：<2秒（4G网络）
- **估算工作量**：5个故事点

---

#### Epic 4：账户与付费 - 商业化闭环

**User Story 4.1：用户认证（P0 - 必须实现）**
- **作为** 用户
- **我想要** 快速注册和登录
- **以便** 简化上手流程
- **验收标准**：
  - 支持Google OAuth登录
  - 支持邮箱+密码注册
  - 密码强度验证
  - 发送验证邮件
- **技术方案**：
  - 使用Supabase Auth或Firebase Auth
  - JWT token管理
- **估算工作量**：5个故事点

**User Story 4.2：订阅与支付（P0 - 必须实现）**
- **作为** 用户
- **我想要** 订阅月度/年度套餐
- **以便** 持续使用服务
- **验收标准**：
  - 支持支付宝/微信支付/信用卡
  - 14天免费试用（无需绑卡）
  - 订阅页面清晰展示：
    - 当前计划
    - 下次扣费日期
    - 已用/剩余配额（邮件数）
  - 取消订阅流程：<3次点击
- **定价策略**（新增，来源：商业分析）：
  - **免费计划**：不提供（降低支持成本）
  - **月度订阅**：￥99/月
    - 无限邮件聚合
    - 每月300次AI摘要/翻译
  - **年度订阅**：￥999/年（相当于￥83/月，优惠17%）
    - 所有月度功能
    - 优先AI模型（更快、更准）
  - **超量付费**：￥0.5/次摘要（避免恶意使用）
- **技术方案**：
  - Stripe Connect（支持支付宝/微信）
  - Webhook处理订阅状态变更
- **估算工作量**：13个故事点

**User Story 4.3：账户管理（P0 - 必须实现）**
- **作为** 用户
- **我想要** 管理我的账户设置
- **以便** 掌控数据与付费
- **验收标准**：
  - 查看订阅状态
  - 断开邮箱连接
  - 导出个人数据（GDPR合规）
  - 删除账户（包含30天恢复期）
- **估算工作量**：5个故事点

---

### 3.3 明确排除的功能（MVP阶段不做）

为确保独立开发者聚焦核心价值，以下功能明确延后至V2：

| 功能 | 排除理由 | 可能优先级（V2） |
|------|----------|------------------|
| 团队协作（共享、评论） | 增加复杂度，MVP聚焦单人 | High |
| 多邮箱支持（Outlook、Apple Mail） | 技术栈复杂，Gmail占比>70% | High |
| 标签系统、笔记、高亮 | 知识管理非MVP核心验证点 | Medium |
| 导出至Notion/Obsidian | 集成成本高，可先用复制功能 | Medium |
| 原生客户端（iOS/Android） | 响应式Web已足够，避免分散资源 | Low |
| 播客/PDF转录 | 偏离核心Newsletter场景 | Low |
| 跨邮件主题分析（趋势报告） | AI成本高，需先验证基础摘要 | Medium |
| 社交媒体整合（Reddit/X） | 偏离核心，增加信息过载风险 | Low |
| 个性化推荐算法 | 需大量数据训练，过早优化 | Medium |

---

## 4. 非功能性需求

### 4.1 性能要求

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 页面加载时间 | <2秒（首屏） | Lighthouse |
| AI摘要生成 | <5秒 | 后端日志P95 |
| 全文翻译 | <8秒（3000词） | 后端日志P95 |
| 邮件同步延迟 | <10分钟 | 监控Dashboard |
| API可用性 | >99.5% | Uptime监控 |

### 4.2 安全与隐私

**数据隐私承诺（核心卖点）**：
- ✅ **零邮件正文存储**：邮件内容仅在生成摘要/翻译时临时通过AI API，不存储在数据库
- ✅ **存储内容**：仅存储元数据（发件人、主题、时间戳、摘要文本、翻译文本）
- ✅ **用户控制**：一键断开邮箱连接，删除所有关联数据
- ✅ **传输加密**：所有API调用使用HTTPS/TLS 1.3

**技术实现**：
```python
# 伪代码示例
def process_email(email_id):
    raw_content = fetch_from_gmail_api(email_id)  # 临时获取
    summary = call_ai_api(raw_content)             # AI处理
    # raw_content 不写入数据库
    db.save({
        'email_id': email_id,
        'summary': summary,           # 仅存储摘要
        'metadata': extract_metadata(raw_content)
    })
```

**合规性**：
- GDPR：提供数据导出、删除功能
- CCPA：明确隐私政策，用户可选择退出
- 中国《个人信息保护法》：获取明确授权，最小化数据收集

### 4.3 可扩展性

- **初期架构**：Serverless（Vercel Functions + Supabase）
- **预期负载**：
  - MVP阶段：100用户，平均每人50封邮件/天 = 5000封/天
  - AI API调用：按需触发，非批量处理
- **成本控制**：
  - AI成本：$0.01/摘要 × 5000 = $50/天 = $1500/月
  - 基础设施：<$100/月（Vercel + Supabase免费额度内）
  - **单用户成本**：$16/月 < 定价$20/月（健康利润率）

### 4.4 可维护性

- **代码规范**：TypeScript强类型，ESLint + Prettier
- **测试覆盖率**：核心逻辑>80%（单元测试 + 集成测试）
- **监控告警**：
  - Sentry：前后端错误跟踪
  - 自定义Dashboard：AI API成功率、成本、延迟
- **文档**：API文档（Swagger）、用户帮助中心

---

## 5. 用户体验与设计

### 5.1 关键用户流程

#### 流程1：首次上手（Onboarding）
```
注册账户
  → 连接Gmail（OAuth授权）
  → 获得专属邮箱地址（展示使用教程）
  → 自动同步最近30天邮件
  → 引导查看第一封摘要
  → 完成！（<3分钟）
```

**设计原则**：
- 每步展示清晰的进度条（1/4, 2/4...）
- 提供"跳过"选项（可稍后配置）
- 使用动画展示AI处理过程（降低等待焦虑）

#### 流程2：日常使用
```
打开应用
  → 查看"今日摘要"卡片（3-5条高优先级）
  → 点击感兴趣的邮件
  → 阅读中文摘要（10秒决策）
  → [选项A] 点击"全文翻译"深度阅读
  → [选项B] 标记"稍后阅读"（V2功能）
  → [选项C] 直接归档
```

### 5.2 界面设计原则

**视觉风格**：
- 简约、专业、无干扰
- 参考：Linear（清晰层次）、Readwise（阅读友好）
- 配色：主色调深蓝#1E40AF，辅色浅灰#F3F4F6

**组件优先级**：
1. **收件箱视图**（列表）
   - 左侧：发件人Logo + 名称
   - 中间：邮件主题 + AI摘要预览（前50字）
   - 右侧：时间标签
   - 悬停效果：显示"翻译"、"归档"快捷按钮
2. **阅读视图**（详情页）
   - 顶部：发件人信息 + 原邮件链接
   - 卡片1：AI摘要（高亮显示）
   - 卡片2：翻译全文（可折叠）
   - 底部：点赞/踩（收集反馈）

**响应式设计**：
- 桌面端：左侧边栏（邮箱列表）+ 右侧内容区
- 移动端：单列布局，手势切换

### 5.3 错误状态处理

| 场景 | 用户提示 | 后续动作 |
|------|----------|----------|
| Gmail授权失败 | "连接失败，请重试或检查网络" | 提供重试按钮 + 联系支持链接 |
| AI生成超时 | "处理中...平均需5秒"（进度条） | 后台继续处理，完成后推送通知 |
| 配额用尽 | "本月摘要次数已用完，升级至年度计划解锁无限次" | 展示升级卡片 |
| 邮件解析失败 | "该邮件格式异常，已跳过"（不打断用户） | 记录日志供开发者排查 |

---

## 6. 技术架构与实现

### 6.1 技术栈选型（面向独立开发者）

| 层级 | 技术选择 | 理由 |
|------|----------|------|
| **前端** | Next.js 15 (App Router) + TypeScript | 已有技术栈，SSR性能好，Vercel部署便捷 |
| **样式** | Tailwind CSS v4 | 已配置，快速开发 |
| **后端** | FastAPI (Python) | 已有技术栈，与AI集成便捷 |
| **数据库** | Supabase (PostgreSQL) | 一体化方案，免费额度充足 |
| **认证** | Supabase Auth | 内置OAuth，减少开发量 |
| **邮件服务** | Gmail API (读取) + Mailgun (接收) | Gmail API官方稳定，Mailgun成本低 |
| **AI模型** | **抽象层**：LangChain or LiteLLM<br>**Provider**：Claude 3.7 Sonnet (主) + Gemini 1.5 Pro (备) | 避免供应商锁定，降低OpenAI限制风险 |
| **支付** | Stripe | 支持支付宝/微信，文档完善 |
| **部署** | Vercel (前端+Serverless Functions) + Railway (FastAPI后端) | 低运维成本，自动扩缩容 |
| **监控** | Sentry (错误) + PostHog (分析) | 开源友好，免费额度足够 |

### 6.2 核心模块架构

```
┌─────────────────────────────────────────────────┐
│                  前端 (Next.js)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │收件箱页面│  │阅读器页面│  │设置页面  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │
│       └─────────────┴─────────────┘             │
│                     │                           │
│              ┌──────▼──────┐                    │
│              │  API Client  │                    │
│              └──────┬──────┘                    │
└─────────────────────┼──────────────────────────┘
                      │ HTTPS
┌─────────────────────▼──────────────────────────┐
│              后端 (FastAPI)                      │
│  ┌─────────────────────────────────────────┐   │
│  │          API Gateway                     │   │
│  │  /auth  /emails  /summary  /translate   │   │
│  └───┬──────────┬──────────┬──────────┬────┘   │
│      │          │          │          │         │
│  ┌───▼────┐ ┌──▼────┐ ┌───▼────┐ ┌───▼────┐   │
│  │Auth Svc│ │Email  │ │AI Proc │ │Payment │   │
│  │        │ │Sync   │ │(摘要/  │ │Service │   │
│  │        │ │Service│ │ 翻译)  │ │        │   │
│  └───┬────┘ └──┬────┘ └───┬────┘ └───┬────┘   │
└──────┼─────────┼──────────┼──────────┼─────────┘
       │         │          │          │
       ▼         ▼          ▼          ▼
┌──────────┐ ┌─────────┐ ┌────────┐ ┌────────┐
│ Supabase │ │Gmail API│ │AI API  │ │ Stripe │
│   DB     │ │Mailgun  │ │(抽象层)│ │        │
└──────────┘ └─────────┘ └────────┘ └────────┘
```

### 6.3 数据模型（核心表）

**users 表**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  subscription_tier VARCHAR(20) DEFAULT 'trial', -- trial/monthly/yearly
  subscription_expires_at TIMESTAMP,
  gmail_refresh_token TEXT ENCRYPTED,  -- 加密存储
  custom_email VARCHAR(100) UNIQUE,    -- 如 "zhangsan@chrono.app"
  quota_used_this_month INT DEFAULT 0,
  quota_limit INT DEFAULT 300
);
```

**emails 表**
```sql
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255) UNIQUE,  -- 去重
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  subject TEXT,
  received_at TIMESTAMP,
  summary_zh TEXT,                       -- AI生成的中文摘要
  translation_zh TEXT,                   -- 全文翻译（按需生成）
  is_newsletter BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_received (user_id, received_at DESC)
);
```

**ai_usage_logs 表**（成本追踪）
```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(20),  -- 'summary' or 'translate'
  email_id UUID REFERENCES emails(id),
  model_used VARCHAR(50),   -- 如 'claude-3-sonnet'
  tokens_used INT,
  cost_usd DECIMAL(10, 6),
  latency_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.4 邮件同步流程（详细技术方案）

**方案A：Gmail OAuth + IMAP同步（推荐）**
```python
# 伪代码
def sync_gmail_emails(user_id):
    user = db.get_user(user_id)
    gmail_service = build_gmail_service(user.refresh_token)

    # 仅同步带有 List-Unsubscribe 头部的邮件
    query = 'newer_than:7d'  # 最近7天
    messages = gmail_service.users().messages().list(
        userId='me', q=query, maxResults=100
    ).execute()

    for msg_ref in messages.get('messages', []):
        msg = gmail_service.users().messages().get(
            userId='me', id=msg_ref['id'], format='full'
        ).execute()

        # Newsletter识别
        if is_newsletter(msg):
            save_email_metadata(user_id, msg)
            # 不存储正文，仅触发AI处理
            trigger_ai_summary.delay(user_id, msg['id'])
```

**方案B：专属邮箱接收（补充）**
```python
# Mailgun Webhook接收
@app.post("/webhook/inbound-email")
async def handle_inbound(request: Request):
    data = await request.form()
    recipient = data.get('recipient')  # 如 zhangsan@chrono.app

    username = recipient.split('@')[0]
    user = db.get_user_by_custom_email(recipient)

    # 解析邮件
    email_data = {
        'sender': data.get('from'),
        'subject': data.get('subject'),
        'body': data.get('body-plain'),
        'received_at': datetime.now()
    }

    # 自动识别为Newsletter
    email_id = save_email_metadata(user.id, email_data)
    trigger_ai_summary.delay(user.id, email_id)
```

### 6.5 AI处理抽象层

```python
# ai_service.py
from abc import ABC, abstractmethod

class AIProvider(ABC):
    @abstractmethod
    def generate_summary(self, content: str, lang: str = 'zh') -> str:
        pass

class ClaudeProvider(AIProvider):
    def generate_summary(self, content: str, lang: str = 'zh') -> str:
        # 调用 Anthropic API
        response = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"用中文总结以下Newsletter:\n{content}"
            }]
        )
        return response.content[0].text

class GeminiProvider(AIProvider):
    def generate_summary(self, content: str, lang: str = 'zh') -> str:
        # 调用 Google Gemini API
        ...

# 工厂模式
def get_ai_provider(provider_name: str = 'claude') -> AIProvider:
    if provider_name == 'claude':
        return ClaudeProvider()
    elif provider_name == 'gemini':
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")
```

---

## 7. 开发计划与里程碑

### 7.1 时间表（12周，3个月）

| 阶段 | 周数 | 里程碑 | 可交付成果 | 负责人 |
|------|------|--------|------------|--------|
| **阶段1：基础设施** | Week 1-2 | 环境搭建完成 | - Next.js + FastAPI项目初始化<br>- Supabase数据库表创建<br>- Gmail OAuth集成<br>- AI抽象层代码 | [开发者] |
| **阶段2：核心功能** | Week 3-6 | Alpha版本 | - 邮件同步功能<br>- Newsletter识别<br>- AI摘要生成<br>- 基础UI（收件箱+阅读器） | [开发者] |
| **阶段3：商业化** | Week 7-9 | Beta版本 | - 专属邮箱功能<br>- 全文翻译<br>- Stripe支付集成<br>- 订阅管理页面 | [开发者] |
| **阶段4：测试与优化** | Week 10-11 | RC版本 | - 20名种子用户封闭测试<br>- Bug修复<br>- 性能优化<br>- 帮助文档编写 | [开发者] |
| **阶段5：发布** | Week 12 | MVP上线 | - Product Hunt发布<br>- V2EX/即刻宣传<br>- 开放注册 | [开发者] |

### 7.2 每周开发节奏（建议）

- **周一**：规划本周任务，更新GitHub Issues
- **周二-周五**：专注开发，每日提交代码
- **周六**：Code Review，撰写周报
- **周日**：休息或处理紧急Bug

### 7.3 风险与缓解措施

| 风险 | 可能性 | 影响 | 缓解措施 | 应急方案 |
|------|--------|------|----------|----------|
| Gmail API限流/封禁 | 中 | 高 | 严格遵守配额限制（10000 req/day），使用指数退避 | 优先推广专属邮箱功能 |
| AI成本超预算 | 高 | 中 | 实现配额限制，缓存摘要结果，监控单用户成本 | 降低免费额度，提高定价 |
| Newsletter识别准确率低 | 中 | 中 | 持续优化规则，收集误判数据，引入ML分类器（V2） | 提供手动标记功能 |
| 开发延期 | 高 | 中 | 严格执行MVP范围，砍掉P1功能 | 延长Beta测试，推迟发布1-2周 |
| 用户隐私担忧 | 低 | 高 | 清晰展示隐私政策，强调零存储承诺 | 提供开源安全审计报告 |
| 付费转化率低 | 中 | 高 | 14天免费试用，产品内引导，展示价值对比 | 调整定价，增加社交证明 |

---

## 8. 营销与增长策略（概要）

### 8.1 发布策略

**目标**：MVP上线首周获得500注册用户，转化50名付费用户

**渠道**：
1. **Product Hunt**：周二上线，准备精美视频Demo
2. **中文社区**：
   - V2EX（/go/create、/go/programmer）
   - 即刻（独立开发者、出海话题）
   - Twitter中文圈（@indie_makers_cn）
3. **内容营销**：
   - 发布"我如何用AI处理100个Newsletter"技术博客
   - 录制YouTube视频（中英双语）
4. **冷启动**：
   - 邀请20名出海创业者朋友内测
   - 提供终身折扣（早鸟价￥699/年）

### 8.2 留存策略

- **邮件提醒**：每日摘要邮件（可选）
- **成就系统**：连续使用7天解锁徽章（游戏化）
- **定期NPS调查**：每月询问满意度，快速响应反馈

### 8.3 增长指标（12个月目标）

| 月份 | 注册用户 | 付费用户 | MRR（元） | 月留存率 |
|------|----------|----------|-----------|----------|
| M1   | 500      | 50       | 5,000     | - |
| M3   | 1,200    | 150      | 15,000    | 35% |
| M6   | 3,000    | 400      | 40,000    | 40% |
| M12  | 8,000    | 1,000    | 100,000   | 45% |

---

## 9. 开放问题与决策待定

| 问题 | 当前状态 | 决策截止日期 | 负责人 |
|------|----------|--------------|--------|
| AI模型最终选型（Claude vs Gemini） | 需成本测试 | Week 2 | [开发者] |
| 是否在MVP提供历史邮件导入 | 标记为P1，待评估开发量 | Week 4 | [开发者] |
| 专属邮箱域名确定（chrono.app还是其他） | chrono.app已购买 | 已解决 | [开发者] |
| 是否提供免费计划 | 当前倾向不提供，降低支持成本 | Week 8 | [开发者] |
| 支付方式是否包含PayPal | 暂不考虑，优先支付宝/微信 | Week 7 | [开发者] |

---

## 10. 附录

### 10.1 术语表

| 术语 | 定义 |
|------|------|
| **Newsletter** | 通过邮件订阅的定期资讯，通常包含行业分析、产品更新等 |
| **FOMO** | Fear of Missing Out，信息错失恐惧症 |
| **MRR** | Monthly Recurring Revenue，月度经常性收入 |
| **NPS** | Net Promoter Score，净推荐值 |
| **OAuth** | 开放授权标准，允许应用安全访问用户数据 |
| **IMAP** | Internet Message Access Protocol，邮件访问协议 |

### 10.2 参考资料

1. **市场研究**：
   - [Fortune Business Insights - Email Marketing Software Market](https://www.fortunebusinessinsights.com/email-marketing-software-market-103100)
   - [Abovea.tech - Chinese Brands Expansion 2025](https://abovea.tech/chinese-brands-expansion-2025/)
2. **竞品分析**：
   - [Meco App](https://meco.app/)
   - [Summate.io](https://summate.io/)
3. **技术文档**：
   - [Gmail API Documentation](https://developers.google.com/gmail/api)
   - [Anthropic Claude API](https://docs.anthropic.com/)
4. **独立开发者指南**：
   - [Indie Hackers - SaaS Playbook](https://www.indiehackers.com/)

### 10.3 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| V1.0 | 2025-10-14 | 初始版本，综合PRD-Gemini、PRD-Grok、PRD-GPT优化而成 | [产品管理者] |

---

## 11. 审批与签署

本PRD需以下人员审批后方可进入开发：

| 角色 | 姓名 | 签名 | 日期 |
|------|------|------|------|
| 产品负责人 | [姓名] | __________ | ______ |
| 技术负责人 | [姓名] | __________ | ______ |
| 业务负责人 | [姓名] | __________ | ______ |

---

**文档结束**

> **注**：本PRD为活文档，将根据用户反馈和市场变化持续迭代。建议每2周召开一次评审会议，确保产品方向正确。
