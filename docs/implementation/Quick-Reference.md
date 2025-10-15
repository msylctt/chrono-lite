# Chrono Lite 实施快速参考

## 🚀 快速开始

### 最小可行流程（1天内验证核心功能）

```bash
# 1. 创建 Apps Script 项目
访问 script.google.com → 新建项目

# 2. 只实施核心模块
- Phase 0（30 分钟）：环境验证
- Phase 1（2-3 小时）：数据层（测试数据）
- Phase 2（1-2 小时）：分类引擎（基础版）
- Phase 3（1 小时）：动作执行
- 验证：手动运行 testCompleteWorkflow()

# 3. 立即获得反馈
- 在真实 Gmail 上测试
- 验证分类准确率
- 确认可行性后再完善 UI 和自动化
```

## 📁 文件结构

### 最小代码集（MVP）

```
src/
├── Code.gs           # 主入口 + Phase 0 测试
├── Config.gs         # 分类配置（CATEGORIES）
├── Database.gs       # Phase 1: 数据加载 + 分片缓存
├── Classifier.gs     # Phase 2: 三级匹配分类
├── Actions.gs        # Phase 3: Gmail 操作
└── appsscript.json   # Manifest
```

### 完整代码集（包含 UI 和自动化）

```
src/
├── Code.gs           # ✅ 主逻辑 + 测试函数
├── Config.gs         # ✅ 配置常量
├── Database.gs       # ✅ 数据层
├── Classifier.gs     # ✅ 分类引擎
├── Actions.gs        # ✅ 动作执行
├── UI.gs             # Phase 4: Card Service UI
├── Triggers.gs       # Phase 5: 定时触发器
└── appsscript.json   # ✅ Add-on 配置
```

## 🧪 关键测试函数

### Phase 0（环境验证）

```javascript
runPhase0Tests()       // 运行所有 Phase 0 测试
testGmailPermissions() // 验证 Gmail 权限
```

### Phase 1（数据层）

```javascript
runPhase1Tests()          // 完整验证
testLoadDatabase()        // 测试数据库加载
testHashDistribution()    // 哈希分布验证
testSingleQuery()         // 单个查询测试
testBatchQuery()          // 批量查询性能
```

### Phase 2（分类引擎）

```javascript
runPhase2Tests()                 // 完整验证
testEmailExtraction()            // 邮箱提取
testClassificationAccuracy()     // 准确率测试
testClassificationPerformance()  // 性能测试
```

### Phase 3（动作执行）

```javascript
runPhase3Tests()         // 完整验证
testLabelCreation()      // 标签创建
testCompleteWorkflow()   // 端到端流程
```

### Phase 4（UI）

```javascript
testHomepageCard()   // 测试主页卡片
testContextCard()    // 测试上下文卡片
// UI 主要在 Gmail 中手动验证
```

### Phase 5（触发器）

```javascript
runPhase5Tests()           // 完整验证
testTriggerCreation()      // 触发器创建
testAutoProcessLogic()     // 自动处理逻辑
testTimeProtection()       // 时间保护
```

### Phase 6（集成）

```javascript
runPhase6Tests()           // 所有场景测试
runPreLaunchChecklist()    // 发布前检查
testPerformanceBenchmarks() // 性能基准
```

## ⚡ 常用命令

### 开发环境

```bash
# 安装 clasp
npm install -g @google/clasp

# 登录
clasp login

# 创建项目
clasp create --type standalone --title "Chrono Lite"

# 推送代码
clasp push

# 拉取代码
clasp pull

# 打开浏览器编辑器
clasp open

# 查看日志
clasp logs
```

### 调试技巧

```javascript
// 1. 详细日志
Logger.log('🔍 Debug: ' + JSON.stringify(data));

// 2. 计时
var start = new Date();
// ... 执行代码
Logger.log('耗时: ' + (new Date() - start) + 'ms');

// 3. 断点（在编辑器中运行）
function debugFunction() {
  var data = loadData();
  debugger; // 在编辑器中运行时暂停
  processData(data);
}

// 4. Try-Catch
try {
  riskyOperation();
} catch (error) {
  Logger.log('❌ 错误: ' + error.message);
  Logger.log('堆栈: ' + error.stack);
}
```

## 🎯 性能优化检查清单

### 数据层

- [ ] 使用分片缓存（避免单个缓存 >100KB）
- [ ] 批量查询而非逐个查询
- [ ] 缓存命中率 >95%

### 分类引擎

- [ ] 批量分类（减少重复数据库查询）
- [ ] 提前退出（精确匹配后立即返回）

### Gmail 操作

- [ ] 批量操作（减少 API 调用）
- [ ] 标签缓存（避免重复 getUserLabelByName）
- [ ] 节流（每批后 sleep 1-2 秒）

### 触发器

- [ ] 增量处理（仅处理新邮件）
- [ ] 时间保护（单次 <5 分钟）
- [ ] 断点续跑（大任务分批）

## 🐛 常见问题速查

### Q: Logger 输出看不到？

```javascript
// 方法 1: 查看执行日志
// 编辑器顶部 View → Logs 或 Ctrl+Enter

// 方法 2: 使用 console.log（新版支持）
console.log('Debug info');

// 方法 3: 使用 Stackdriver
// View → Stackdriver Logging
```

### Q: 超出执行时间限制？

```javascript
// 添加时间保护
const MAX_TIME = 5 * 60 * 1000;
var start = new Date();

while (hasMoreWork) {
  if (new Date() - start > MAX_TIME) {
    Logger.log('⚠️ 接近时间上限，保存进度并退出');
    break;
  }
  doWork();
}
```

### Q: 缓存超出 1000 条目限制？

```javascript
// 使用分片策略
const NUM_SHARDS = 50;

// 每个分片 <100KB
var shards = shardDatabase(data, NUM_SHARDS);

// 存储
shards.forEach(function(shard, id) {
  cache.put('shard_' + id, JSON.stringify(shard));
});
```

### Q: Gmail API 配额超限？

```javascript
// 1. 减少查询频率
var threads = GmailApp.search('...', 0, 50); // 而非 500

// 2. 批量操作
threads.forEach(function(thread) {
  // ... 批量处理
});

// 3. 节流
Utilities.sleep(2000); // 每批后暂停

// 4. 监控配额
// Apps Script Dashboard → Quotas
```

## 📊 性能基准参考

| 操作 | 目标延迟 | 可接受范围 |
|-----|---------|-----------|
| 数据库首次加载 | <1秒 | <2秒 |
| 缓存命中查询 | <10ms | <20ms |
| 单封邮件分类 | <50ms | <100ms |
| 批量100封分类 | <5秒 | <10秒 |
| 标签操作 | <200ms | <500ms |
| UI 卡片渲染 | <500ms | <1秒 |

## 🔄 开发工作流

### 推荐流程

```
1. 本地编辑代码（VS Code + clasp）
   ↓
2. clasp push 推送到 Apps Script
   ↓
3. 在编辑器中运行测试函数
   ↓
4. 查看 Logger 输出验证
   ↓
5. 在 Gmail 中测试 UI 和实际效果
   ↓
6. 发现问题 → 返回步骤 1
```

### 快速迭代技巧

```bash
# 监听文件变化自动推送（需要 nodemon）
npm install -g nodemon
nodemon --watch src --ext gs,json --exec "clasp push"

# 或使用 watch 脚本
while true; do
  clasp push
  sleep 5
done
```

## 📚 关键文档链接

- [Apps Script 文档](https://developers.google.com/apps-script)
- [Gmail API 参考](https://developers.google.com/gmail/api)
- [Card Service 指南](https://developers.google.com/apps-script/reference/card-service)
- [配额限制](https://developers.google.com/apps-script/guides/services/quotas)

## 🎓 学习路径

### 新手（第一次开发 Apps Script）

1. Phase 0（1小时）→ 熟悉环境
2. Phase 1（3小时）→ 理解数据层
3. Phase 2（2小时）→ 理解业务逻辑
4. 暂停，阅读 Apps Script 文档（2小时）
5. Phase 3-6（逐步完成）

### 进阶（有 Apps Script 经验）

1. 快速浏览 Phase 0-2（30分钟）
2. 重点实施 Phase 1 的分片策略（1小时）
3. 直接跳到 Phase 4-6（UI 和集成）

## ✅ 最终检查清单

发布前必须完成：

- [ ] 所有 Phase 测试通过（runPhase0Tests ~ runPhase6Tests）
- [ ] 在真实 Gmail 账号测试（至少 50 封邮件）
- [ ] 分类准确率 >85%
- [ ] 性能满足所有基准
- [ ] 错误处理完善（网络失败、配额超限等）
- [ ] 用户隐私保护（不上传邮件内容）
- [ ] README 文档完整
- [ ] 演示视频录制完成

---

**提示**：如果时间紧张，优先完成 Phase 0-3（核心功能），Phase 4-6 可以后续迭代。最重要的是先验证产品价值！

