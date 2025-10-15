# Chrono Lite 分阶段实施计划

## 文档概述

本文档提供 Chrono Lite Gmail Add-on 的完整实施计划，将项目拆分为7个独立可验证的阶段。由于 Apps Script 调试困难，每个阶段都包含详细的验证步骤和预期输出。

## 核心挑战

### Apps Script 特有的技术限制

| 限制类型 | 具体约束 | 应对策略 |
|---------|---------|---------|
| **调试能力** | 无断点调试，Logger 输出有限 | 详细日志 + 单元测试函数 |
| **执行时间** | 单次运行 6 分钟上限 | 分批处理 + 断点续跑 |
| **缓存限制** | 1000 条目 + 100KB/条目 | 分片存储策略 |
| **API 配额** | Gmail API 有日限额 | 批量操作 + 节流 |
| **UI 测试** | Card Service 难以单独测试 | 模拟 event 对象 |

## 实施原则

### 1. 由内而外（Inside-Out）

```
数据层（最底层）
    ↓
分类引擎（业务逻辑）
    ↓
动作执行（Gmail 操作）
    ↓
UI 层（Card Service）
    ↓
触发器（自动化）
```

### 2. 渐进式验证（Incremental Verification）

每个模块完成后立即验证，不依赖后续模块：

- ✅ **Phase 1** 完成 → 验证数据加载和缓存
- ✅ **Phase 2** 完成 → 验证分类准确率
- ✅ **Phase 3** 完成 → 验证 Gmail 操作
- ✅ **Phase 4** 完成 → 验证 UI 显示
- ✅ **Phase 5** 完成 → 验证自动化流程

### 3. 小数据集测试（Small Dataset First）

先用 10-20 条数据验证逻辑，再扩展到完整数据集：

```javascript
// 开发阶段
const TEST_SENDERS = {
  'newsletter@stratechery.com': { category: 'Newsletter' },
  'promo@amazon.com': { category: 'Marketing' }
  // ... 仅 20 条
};

// 验证通过后，切换到完整数据库
const SENDER_DB_URL = 'https://cdn.jsdelivr.net/gh/...';
```

## 实施阶段总览

| 阶段 | 名称 | 工作量 | 关键验证点 | 文档 |
|-----|------|-------|-----------|------|
| **Phase 0** | 环境准备 | 0.5天 | Apps Script 项目创建成功 | [详见](./Phase-0-Setup.md) |
| **Phase 1** | 数据层 | 2-3天 | CDN 加载 + 分片缓存工作 | [详见](./Phase-1-DataLayer.md) |
| **Phase 2** | 分类引擎 | 2天 | 准确率 >85% | [详见](./Phase-2-Classifier.md) |
| **Phase 3** | 动作执行 | 1天 | 标签、归档正确执行 | [详见](./Phase-3-Actions.md) |
| **Phase 4** | UI 层 | 2-3天 | 侧边栏卡片正常显示 | [详见](./Phase-4-UI.md) |
| **Phase 5** | 触发器 | 1-2天 | 定时任务自动运行 | [详见](./Phase-5-Triggers.md) |
| **Phase 6** | 集成测试 | 2-3天 | 端到端流程验证 | [详见](./Phase-6-Integration.md) |

**总工作量**：10-14 天（满负荷开发）

## 验证方法矩阵

| 验证类型 | 适用阶段 | 方法 | 工具 |
|---------|---------|-----|------|
| **功能验证** | 所有阶段 | 运行测试函数，检查 Logger 输出 | `Logger.log()` |
| **性能验证** | Phase 1, 2, 3 | 测量执行时间和配额消耗 | `new Date()` 计时 |
| **UI 验证** | Phase 4 | 在 Gmail 侧边栏查看实际显示 | Gmail 界面 |
| **集成验证** | Phase 6 | 完整用户流程测试 | Gmail + Apps Script |
| **错误注入** | Phase 1, 5 | 模拟网络失败、配额超限 | `throw new Error()` |

## 快速开始

### 推荐开发流程

```bash
# 1. 克隆仓库（如果已有）
git clone https://github.com/yourusername/chrono-lite.git
cd chrono-lite

# 2. 阅读各阶段文档
docs/implementation/Phase-0-Setup.md        # 先读这个
docs/implementation/Phase-1-DataLayer.md    # 然后开始实施
# ...

# 3. 使用 clasp 部署（可选）
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "Chrono Lite"
clasp push
```

### 核心代码模块

```
src/
├── Code.gs              # 主入口（Phase 0）
├── Config.gs            # 配置常量（Phase 0）
├── Database.gs          # 数据层（Phase 1）
├── Classifier.gs        # 分类引擎（Phase 2）
├── Actions.gs           # 动作执行（Phase 3）
├── UI.gs                # Card Service UI（Phase 4）
├── Triggers.gs          # 触发器管理（Phase 5）
└── Utils.gs             # 工具函数（所有阶段）
```

## 成功标准

### 各阶段通过标准

#### Phase 0 ✅
- Apps Script 项目创建成功
- `testHelloWorld()` 函数运行成功
- Logger 输出可见

#### Phase 1 ✅
- CDN 数据加载成功（<1秒）
- 分片缓存存储成功（50 个分片）
- `querySender()` 查询速度 <10ms
- 缓存命中率 >95%

#### Phase 2 ✅
- 单封邮件分类准确率 >90%
- 批量分类（100 封）耗时 <5 秒
- 三级匹配策略全部工作

#### Phase 3 ✅
- 标签创建/应用成功
- 归档、已读操作正确
- 批量操作无错误

#### Phase 4 ✅
- Homepage Card 正常显示
- Context Card 正确显示分类结果
- 按钮点击触发正确的动作

#### Phase 5 ✅
- Time-based Trigger 自动运行
- 增量处理（仅处理新邮件）
- 超时保护生效

#### Phase 6 ✅
- 完整用户流程无阻塞
- 性能满足基准要求
- 错误恢复机制工作

## 开发工具推荐

### 必备工具

| 工具 | 用途 | 安装 |
|-----|------|-----|
| **clasp** | 命令行部署 | `npm install -g @google/clasp` |
| **Apps Script Editor** | 在线开发 | https://script.google.com |
| **Gmail Test Account** | 测试邮件 | 创建测试 Gmail 账号 |

### 可选工具

| 工具 | 用途 |
|-----|------|
| **Postman** | 测试 Gmail API |
| **JSON Validator** | 验证数据库格式 |
| **Chrome DevTools** | 检查侧边栏 UI |

## 常见陷阱与解决方案

### 陷阱 #1：过早优化

❌ **错误做法**：
```javascript
// 一开始就实现完整的 5000 条数据库
var db = loadFullDatabase(); // 可能失败
```

✅ **正确做法**：
```javascript
// Phase 1：先用 10 条测试数据
var TEST_DB = { 'test@example.com': { category: 'Newsletter' } };

// Phase 6：再切换到完整数据库
var db = loadSenderDatabase();
```

### 陷阱 #2：忽略执行时间

❌ **错误做法**：
```javascript
// 一次性处理所有邮件，可能超时
var threads = GmailApp.search('in:inbox', 0, 10000); // 💥
```

✅ **正确做法**：
```javascript
// 分批处理，带时间保护
var MAX_TIME = 5 * 60 * 1000; // 5 分钟
var start = new Date();
for (var offset = 0; offset < 10000; offset += 100) {
  if (new Date() - start > MAX_TIME) break; // 提前退出
  var threads = GmailApp.search('in:inbox', offset, 100);
  // 处理...
}
```

### 陷阱 #3：缓存大小超限

❌ **错误做法**：
```javascript
// 将整个数据库存为单个 JSON（可能 >100KB）
cache.put('full_db', JSON.stringify(allSenders)); // 💥
```

✅ **正确做法**：
```javascript
// 分片存储（每片 <10KB）
for (var i = 0; i < shards.length; i++) {
  cache.put('shard_' + i, JSON.stringify(shards[i]));
}
```

## 关键性能指标

### 目标基准

| 操作 | 目标延迟 | 验证阶段 |
|-----|---------|---------|
| 数据库首次加载 | <1秒 | Phase 1 |
| 缓存命中查询 | <10ms | Phase 1 |
| 单封邮件分类 | <50ms | Phase 2 |
| 批量100封分类 | <5秒 | Phase 2 |
| 标签操作 | <200ms | Phase 3 |
| UI 卡片渲染 | <500ms | Phase 4 |

## 下一步

1. 📖 **阅读** [Phase 0: 环境准备](./Phase-0-Setup.md)
2. 💻 **实施** Phase 0，验证环境正常
3. ✅ **验证** 通过后进入 Phase 1
4. 🔁 **重复** 2-3，直到 Phase 6 完成

---

**文档版本**：V1.0  
**最后更新**：2025-10-14  
**维护者**：Chrono Lite Team  
**反馈**：请提交 GitHub Issue

