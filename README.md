# Chrono Lite

Gmail 自动化分类工具 - 开源 Gmail Add-on

## 项目概述

Chrono Lite 是一个开源的 Gmail 邮件自动化分类工具，通过 Google Apps Script 实现：
- **自动识别** Newsletter、Marketing、Product Updates 等邮件类型
- **智能分类** 基于 5000+ 发件人开源数据库
- **完全自动化** 定时后台运行，无需用户手动操作
- **隐私优先** 所有处理都在用户的 Gmail 中完成，不上传数据到服务器

## 项目结构

```
chrono-lite/
├── src/                        # Google Apps Script 源代码
│   ├── Code.gs                # 主逻辑
│   ├── Config.gs              # 用户配置
│   ├── Database.gs            # 数据库加载（分片缓存）
│   ├── Classifier.gs          # 分类引擎
│   ├── Actions.gs             # 动作执行
│   └── UI.gs                  # Gmail Add-on 侧边栏界面
├── appsscript.json            # Apps Script Manifest
├── docs/                       # 文档
│   ├── installation.md        # 安装教程
│   ├── customization.md       # 自定义指南
│   └── troubleshooting.md     # 故障排查
├── examples/                   # 示例配置
│   └── configs/               # 配置示例
├── Chrono-Lite-Complete-Design.md  # 完整产品设计文档
└── Proposal-OpenSource-Gmail-Addon.md  # 开源方案建议书
```

## 核心功能

### Gmail Add-on (开源版本)
- ✅ Newsletter 自动识别（基于开源发件人数据库）
- ✅ Gmail 标签自动分类
- ✅ 批量历史邮件处理
- ✅ 完全自动化工作流
- ✅ 开发者自定义规则
- ✅ Gmail 侧边栏界面（Card UI）

### 不包含功能（引流到 SaaS）
- ❌ AI 中文摘要
- ❌ 全文翻译
- ❌ 专用阅读器界面
- ❌ 移动端 App
- ❌ 语义搜索
- ❌ 团队协作

## 快速开始

### 1. 前置要求

- Gmail 账户
- 访问 [Google Apps Script](https://script.google.com/)
- 基本的 JavaScript 知识（可选，用于自定义）

### 2. 安装步骤

详细安装步骤请参考 [完整设计文档](./Chrono-Lite-Complete-Design.md#阶段-0发现与安装5-分钟)

**快速版本**：

1. 访问 [script.google.com](https://script.google.com/)
2. 新建项目
3. 复制 `src/` 目录下的所有文件到项目中
4. 复制 `appsscript.json` 的内容
5. 保存并授权
6. 首次打开 Gmail，点击侧边栏的 Chrono Lite 图标
7. 按照引导完成初始化

### 3. 首次配置

```javascript
// 在 Apps Script 编辑器中运行测试
testDatabaseConnection()  // 测试数据库连接
initialSetup()            // 初始化（处理最近 7 天邮件）
```

### 4. 开启自动化

在 Gmail 侧边栏点击"开启自动化"，或手动设置：

1. Apps Script 编辑器 → 触发器
2. 添加新触发器
3. 函数：`autoProcessInbox`
4. 事件源：时间驱动
5. 类型：小时计时器
6. 频率：每小时

## 技术架构

### 核心技术
- **语言**: Google Apps Script (JavaScript ES5)
- **数据源**: jsDelivr CDN (开源发件人数据库)
- **存储**: CacheService (分片缓存，6小时过期)
- **UI**: Gmail Cards Framework
- **触发器**: Time-driven + Contextual

### 分片缓存策略

为了突破 CacheService 的 1000 条目限制，采用基于哈希的分片策略：

```javascript
// 5000+ 条记录分成 50 个分片
// 每个分片 ~100 条记录，~10KB
// 查询时 O(1) 哈希定位分片

数据结构：
{
  "sender_db_meta": {           // 元数据
    "shardCount": 50,
    "totalEntries": 5234,
    "version": "1.0.0"
  },
  "sender_db_shard_0": {...},   // 分片 0
  "sender_db_shard_1": {...},   // 分片 1
  ...
  "sender_db_shard_49": {...}   // 分片 49
}
```

### 智能卡片显示

V2.0 采用智能显示策略，减少 85% 的卡片干扰：

- **高置信度（>90%）**: 极简卡片（10% 邮件）
- **中置信度（60-90%）**: 完整卡片（5% 邮件）
- **未识别**: 贡献提示（5% 邮件）
- **其他**: 不显示（80% 邮件）

## 文档

- [完整产品设计文档](./Chrono-Lite-Complete-Design.md) - 包含完整的产品设计、技术实现和 UX 优化（12,000+ 行）
- [开源方案建议书](./Proposal-OpenSource-Gmail-Addon.md) - 开源 Gmail Add-on 的战略价值分析
- [安装教程](./docs/installation.md) - 详细安装步骤（待完成）
- [自定义指南](./docs/customization.md) - 如何自定义规则和配置（待完成）
- [故障排查](./docs/troubleshooting.md) - 常见问题解决（待完成）

## 开发计划

### Phase 1: Gmail Add-on MVP (2-3 周)
- [x] 完整产品设计（V2.0）
- [x] UX 优化方案
- [ ] 发件人数据库建设 (Top 1000)
- [ ] 完整代码实现
  - [x] Code.gs 框架
  - [ ] Config.gs
  - [ ] Database.gs (分片缓存)
  - [ ] Classifier.gs
  - [ ] Actions.gs
  - [ ] UI.gs (V2.0 分步引导)
- [ ] 测试与优化

### Phase 2: 数据库生态 (持续)
- [ ] 扩展到 5000+ 发件人
- [ ] 社区贡献机制
- [ ] GitHub Actions 自动化验证
- [ ] jsDelivr CDN 发布

### Phase 3: 社区运营 (持续)
- [ ] Product Hunt 发布
- [ ] Hacker News Show HN
- [ ] 中文技术社区推广
- [ ] 文档完善（中英双语）

### Phase 4: SaaS 转化 (未来)
- [ ] 情境化转化提示（长文、里程碑）
- [ ] SaaS 落地页
- [ ] AI 摘要功能
- [ ] 移动端适配

## 贡献指南

我们欢迎社区贡献！特别是：

### 发件人数据库
提交新的 Newsletter 发件人到 [chrono-lite-newsletter-senders](https://github.com/msylctt/chrono-lite-newsletter-senders)

### 代码优化
- 性能优化
- 错误处理
- 用户体验改进

### 文档翻译
- 英文文档
- 其他语言支持

## 开源协议

MIT License - 详见 [LICENSE](./LICENSE)

## 联系方式

- GitHub Issues: [提交问题](https://github.com/msylctt/chrono-lite/issues)
- 发件人数据库: [提交发件人](https://github.com/msylctt/chrono-lite-newsletter-senders/issues/new)

## 致谢

- 感谢所有贡献发件人数据库的社区成员
- 感谢 Claude Code 在产品设计和 UX 优化中的支持

---

**⚡ 从开源工具到 SaaS，与用户一起成长**

*Chrono Lite - 让 Gmail 收件箱清零变得简单*
