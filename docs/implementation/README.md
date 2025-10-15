# Chrono Lite 分阶段实施文档

## 文档概述

本目录包含 Chrono Lite Gmail Add-on 的完整分阶段实施计划，将项目拆分为 7 个独立可验证的阶段。由于 Apps Script 调试困难，每个阶段都包含详细的验证步骤、测试代码和预期输出。

**总工作量**：10-14 天（满负荷开发）

## 📚 文档列表

| 文档 | 内容 | 预计时间 | 难度 |
|-----|------|---------|------|
| [00-Overview.md](./00-Overview.md) | 实施计划总览、核心原则、验证方法 | - | - |
| [Phase-0-Setup.md](./Phase-0-Setup.md) | 环境准备、基础验证（6 个测试函数） | 0.5 天 | ⭐ |
| [Phase-1-DataLayer.md](./Phase-1-DataLayer.md) | CDN 加载、分片缓存、查询优化 | 2-3 天 | ⭐⭐⭐ |
| [Phase-2-Classifier.md](./Phase-2-Classifier.md) | 三级匹配策略、准确率验证 | 2 天 | ⭐⭐ |
| [Phase-3-Actions.md](./Phase-3-Actions.md) | Gmail 操作（标签、归档、已读） | 1 天 | ⭐ |
| [Phase-4-UI.md](./Phase-4-UI.md) | Card Service UI、侧边栏卡片 | 2-3 天 | ⭐⭐ |
| [Phase-5-Triggers.md](./Phase-5-Triggers.md) | 定时触发器、增量处理、时间保护 | 1-2 天 | ⭐⭐ |
| [Phase-6-Integration.md](./Phase-6-Integration.md) | 端到端测试、性能优化、发布检查 | 2-3 天 | ⭐⭐⭐ |
| [Quick-Reference.md](./Quick-Reference.md) | 快速参考、常用命令、问题速查 | - | - |

## 🎯 实施策略

### 核心原则

1. **由内而外（Inside-Out）**：先验证数据层，再逐步添加业务逻辑、UI 和自动化
2. **渐进式验证（Incremental）**：每个阶段独立验证通过后再进入下一阶段
3. **小数据集测试（Small Data First）**：先用 10-20 条测试数据验证逻辑

### 推荐路径

#### 路径 1：完整实施（适合充足时间）

```
Phase 0 (0.5天) → Phase 1 (2-3天) → Phase 2 (2天) 
    → Phase 3 (1天) → Phase 4 (2-3天) → Phase 5 (1-2天) → Phase 6 (2-3天)

总计：10-14 天
```

#### 路径 2：MVP 快速验证（适合时间紧张）

```
Phase 0 (0.5天) → Phase 1 (1天，仅测试数据) → Phase 2 (1天) → Phase 3 (1天)
    → 手动运行验证（跳过 Phase 4-5）→ 有效后再完善

总计：3-4 天
```

#### 路径 3：分两轮实施（推荐）

**第一轮（验证核心价值）**：
```
Phase 0-3（4-5 天）→ 验证分类准确率和 Gmail 操作
```

**第二轮（完善用户体验）**：
```
Phase 4-6（5-8 天）→ 添加 UI、自动化和优化
```

## 🚀 快速开始

### 最小可行流程（1天验证）

```bash
# 1. 阅读概览
docs/implementation/00-Overview.md

# 2. 环境准备（30 分钟）
docs/implementation/Phase-0-Setup.md
→ 创建 Apps Script 项目
→ 运行 runPhase0Tests()

# 3. 数据层（2-3 小时）
docs/implementation/Phase-1-DataLayer.md
→ 创建测试数据集（20 条）
→ 实现分片缓存
→ 运行 runPhase1Tests()

# 4. 分类引擎（1-2 小时）
docs/implementation/Phase-2-Classifier.md
→ 实现三级匹配
→ 运行 runPhase2Tests()

# 5. 动作执行（1 小时）
docs/implementation/Phase-3-Actions.md
→ 实现 Gmail 操作
→ 运行 testCompleteWorkflow()

# 6. 验证效果（30 分钟）
→ 在真实 Gmail 测试
→ 检查分类准确率
→ 确认标签和归档正确
```

## 📊 阶段验收标准

每个阶段都有明确的通过标准：

### Phase 0 ✅
- Apps Script 项目创建成功
- `runPhase0Tests()` 全部通过（5/5）
- Gmail 权限正常

### Phase 1 ✅
- 数据库加载成功（<1秒）
- 分片缓存工作正常
- 单个查询 <10ms
- 批量查询性能提升 >50%

### Phase 2 ✅
- 邮箱提取 100% 正确
- 分类准确率 ≥85%
- 批量分类（100 封）<5 秒

### Phase 3 ✅
- 标签创建/应用成功
- 归档、已读操作正确
- 完整工作流成功率 >80%

### Phase 4 ✅
- Homepage Card 正常显示
- Context Card 显示分类结果
- 按钮点击触发正确动作

### Phase 5 ✅
- 触发器创建成功
- 增量处理仅处理新邮件
- 时间保护机制生效

### Phase 6 ✅
- 4 个测试场景全部通过
- 性能满足所有基准
- 发布检查清单完成

## 🧪 关键测试函数

每个阶段都提供完整的测试函数，可直接在 Apps Script 编辑器中运行：

```javascript
// Phase 0
runPhase0Tests()

// Phase 1
runPhase1Tests()
testLoadDatabase()
testSingleQuery()
testBatchQuery()

// Phase 2
runPhase2Tests()
testClassificationAccuracy()

// Phase 3
runPhase3Tests()
testCompleteWorkflow()

// Phase 4
testHomepageCard()
testContextCard()

// Phase 5
runPhase5Tests()
testAutoProcessLogic()

// Phase 6
runPhase6Tests()
runPreLaunchChecklist()
```

## 📖 文档使用建议

### 新手开发者

1. **完整阅读 Overview**（30 分钟）
2. **按顺序实施 Phase 0-3**（重点理解原理）
3. **暂停，阅读 Apps Script 官方文档**（2 小时）
4. **继续 Phase 4-6**（逐步完成）

### 进阶开发者

1. **快速浏览 Overview**（10 分钟）
2. **重点阅读 Phase 1**（分片策略）
3. **快速实施 Phase 0-3**（1 天）
4. **重点投入 Phase 4-6**（完善体验）

### 技术决策者

1. **阅读 Overview + Quick Reference**（了解架构）
2. **查看各 Phase 的验收标准**（评估可行性）
3. **关注 Phase 1 的分片策略**（核心技术难点）
4. **查看 Phase 6 的性能基准**（验证可靠性）

## ⚡ 核心技术亮点

### 1. 分片缓存策略（Phase 1）

**问题**：CacheService 限制 1000 个条目，无法存储 5000+ 条记录

**解决方案**：
```javascript
// 哈希分片
5000 条 → 50 个分片（每片 ~100 条）
查询时：email → hash(email) → shard_id → 读取单个分片
性能：O(1) 查询，<10ms
```

### 2. 三级匹配策略（Phase 2）

```javascript
Level 1: 精确匹配（85% 命中）
    ↓ 未命中
Level 2: 域名匹配（10% 命中）
    ↓ 未命中
Level 3: 启发式规则（5% 命中）
```

### 3. 时间保护机制（Phase 5）

**问题**：Apps Script 单次执行 6 分钟上限

**解决方案**：
```javascript
const MAX_TIME = 5 * 60 * 1000; // 5 分钟
var start = new Date();

while (hasMoreWork) {
  if (new Date() - start > MAX_TIME) {
    saveProgress(); // 断点续跑
    break;
  }
  doWork();
}
```

## 🔧 开发工具

### 必备工具

- **Apps Script Editor**：https://script.google.com
- **clasp CLI**：`npm install -g @google/clasp`（可选）
- **Gmail 测试账号**：用于真实环境测试

### 推荐工具

- **VS Code** + Apps Script 插件
- **Postman**：测试 Gmail API
- **Chrome DevTools**：检查侧边栏 UI

## 📝 常见问题

### Q1: 从哪里开始？

**答**：先阅读 [00-Overview.md](./00-Overview.md)，了解整体架构和实施原则。然后从 [Phase-0-Setup.md](./Phase-0-Setup.md) 开始逐步实施。

### Q2: 可以跳过某些阶段吗？

**答**：
- **不可跳过**：Phase 0-3（核心功能）
- **可延后**：Phase 4-5（UI 和自动化，可先手动验证）
- **必须完成**：Phase 6（集成测试，确保质量）

### Q3: 遇到错误怎么办？

**答**：
1. 查看 [Quick-Reference.md](./Quick-Reference.md) 的常见问题部分
2. 检查 Logger 输出（View → Logs）
3. 运行对应阶段的测试函数验证
4. 查阅 Apps Script 官方文档

### Q4: 性能不达标怎么办？

**答**：
1. 检查是否使用批量操作（而非逐个）
2. 验证缓存命中率（应 >95%）
3. 减少不必要的 API 调用
4. 查看各 Phase 的性能优化建议

## 🎓 学习资源

- [Apps Script 官方文档](https://developers.google.com/apps-script)
- [Gmail API 参考](https://developers.google.com/gmail/api)
- [Card Service 指南](https://developers.google.com/apps-script/reference/card-service)
- [Apps Script 配额限制](https://developers.google.com/apps-script/guides/services/quotas)

## 🎉 完成后的下一步

Phase 6 通过后：

1. **准备发布材料**
   - 录制演示视频（5 分钟）
   - 编写 README 文档
   - 准备 GitHub 仓库

2. **内测**
   - 邀请 5-10 名用户
   - 收集反馈
   - 快速迭代

3. **公开发布**
   - Product Hunt
   - Hacker News
   - V2EX / 即刻

---

**开始实施**：[Phase 0: 环境准备](./Phase-0-Setup.md) →

**需要帮助？** 查看 [Quick Reference](./Quick-Reference.md) 或在 GitHub 提交 Issue

