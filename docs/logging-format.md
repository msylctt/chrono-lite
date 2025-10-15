# Chrono Lite - 日志格式规范

**作者**: ultrathink
**版本**: 1.0.0

---

## 日志格式

```
[LEVEL] [MODULE] Message | key=value key2=value2
```

### 示例

```
[INFO] [TRIGGER] autoProcessInbox started |
[INFO] [TRIGGER] Found threads to process | query=in:inbox newer_than:1d thread_count=15
[INFO] [CLASSIFIER] Email classified | email=news@example.com category=Newsletter method=exact_match
[INFO] [ACTION] Label applied | thread_id=abc123 label=Chrono/Newsletter
[INFO] [TRIGGER] autoProcessInbox completed | duration_ms=2341 status=success found=15 processed=12 failed=0
```

---

## 日志级别

| 级别  | 用途 | 示例 |
|-------|------|------|
| **ERROR** | 错误，需要立即关注 | 数据库加载失败、API调用失败 |
| **WARN**  | 警告，可能有问题 | 查询无结果、配额接近上限 |
| **INFO**  | 重要信息流程 | 操作开始/完成、主要步骤 |
| **DEBUG** | 调试详情 | 中间变量、详细状态 |

---

## 模块定义

| 模块名 | 说明 |
|--------|------|
| **INIT** | 初始化流程 |
| **DATABASE** | 数据库操作（CDN加载、缓存） |
| **CLASSIFIER** | 邮件分类引擎 |
| **ACTION** | 动作执行（标签、归档） |
| **TRIGGER** | 触发器管理 |
| **DEBUG** | Debug模式 |
| **UI** | 用户界面操作 |
| **SYNC** | 手动同步 |

---

## 实际日志示例

### 1. 自动处理流程

```
[INFO] [TRIGGER] autoProcessInbox started |
[INFO] [TRIGGER] Found threads to process | query=in:inbox newer_than:1d thread_count=23
[INFO] [CLASSIFIER] Email classified | email=newsletter@stratechery.com category=Newsletter method=exact_match source=database_exact
[INFO] [ACTION] Label applied | thread_id=18a1b2c3 label=Chrono/Newsletter
[INFO] [ACTION] Thread archived | thread_id=18a1b2c3
[ERROR] [TRIGGER] Failed to process thread | thread_id=29d4e5f6 error=Invalid message format index=15
[INFO] [TRIGGER] autoProcessInbox completed | duration_ms=3245 status=success found=23 processed=22 failed=1 categories={"Newsletter":15,"Marketing":7}
```

### 2. 初始化流程

```
[INFO] [INIT] initialSetup started |
[INFO] [DATABASE] loadSenderDatabase started |
[INFO] [DATABASE] Loading from CDN | url=https://cdn.jsdelivr.net/...
[INFO] [DATABASE] Database stored in cache | shard_count=50 total_entries=5234
[INFO] [DATABASE] loadSenderDatabase completed | duration_ms=1823 status=success source=cdn entries=5234
[INFO] [INIT] Database loaded | total_entries=5234 shard_count=50 version=2.1.0
[INFO] [INIT] Scanning inbox | query=in:inbox newer_than:7d found=47
[INFO] [INIT] initialSetup completed | duration_ms=8945 status=success total=47 processed=41 failed=0 categories={"Newsletter":28,"Marketing":13}
```

### 3. Debug 模式

```
[INFO] [DEBUG] createDebugEmailTrigger started |
[DEBUG] [DEBUG] Deleted debug trigger | trigger_id=12345abc
[INFO] [DEBUG] createDebugEmailTrigger completed | duration_ms=234 status=success interval=1hour
[INFO] [DEBUG] sendDebugTestEmail started |
[INFO] [DEBUG] sendDebugTestEmail completed | duration_ms=456 status=success recipient=user@gmail.com mock_sender=newsletter@stratechery.com subject=[Test] Stratechery Newsletter - 2025-10-15 14:30:00
```

### 4. 错误处理

```
[INFO] [DATABASE] loadSenderDatabase started |
[ERROR] [DATABASE] CDN fetch failed | url=https://cdn.jsdelivr.net/... error=Network timeout
[WARN] [DATABASE] Using fallback data | source=embedded entries=100
[INFO] [DATABASE] loadSenderDatabase completed | duration_ms=125 status=success source=fallback entries=100
```

---

## 使用方法

### 基本用法

```javascript
// 简单日志
Log.info(Log.Module.DATABASE, 'Cache updated', {
  shard_count: 50,
  total_entries: 5234
});

// 错误日志
Log.error(Log.Module.TRIGGER, 'Failed to create trigger', {
  interval: '1hour',
  error: error.message
});
```

### 操作日志（推荐）

```javascript
// 带开始和结束的操作
var op = Log.operation(Log.Module.INIT, 'initialSetup');

try {
  // ... 执行操作 ...

  op.success({
    total: 100,
    processed: 95,
    failed: 5
  });
} catch (error) {
  op.fail(error, {additional: 'context'});
}
```

### 性能计时

```javascript
var timer = Log.timer('Database load');
// ... 执行操作 ...
timer.end(Log.Module.DATABASE, {entries: 5234});
```

---

## 日志查看

### 查看实时日志

```bash
clasp logs --watch
```

### 过滤特定模块

在 Apps Script 编辑器中查看执行日志，使用浏览器搜索功能过滤：
- 搜索 `[TRIGGER]` - 查看触发器日志
- 搜索 `[ERROR]` - 查看所有错误
- 搜索 `duration_ms` - 查看性能数据

---

## 最佳实践

### ✅ 推荐

```javascript
// 1. 使用结构化元数据
Log.info(Log.Module.CLASSIFIER, 'Email classified', {
  email: senderEmail,
  category: result.category,
  method: result.method
});

// 2. 记录关键性能指标
var op = Log.operation(Log.Module.SYNC, 'manualSync');
op.success({
  duration_ms: 3245,
  processed: 50,
  rate: 15.4  // emails/second
});

// 3. 错误包含上下文
Log.error(Log.Module.ACTION, 'Label creation failed', {
  label_name: labelName,
  error: error.message,
  thread_id: threadId
});
```

### ❌ 避免

```javascript
// 1. 避免模糊的消息
Logger.log('完成');  // ❌
Log.info(Log.Module.INIT, 'Initialization completed', {});  // ✅

// 2. 避免过度日志
threads.forEach(function(thread) {
  Logger.log('Processing ' + thread.getId());  // ❌ 太多日志
});
// 只在关键点记录汇总统计 ✅

// 3. 避免敏感信息
Log.debug(Log.Module.DATABASE, 'User data', {
  password: userPassword  // ❌ 不要记录密码
});
```

---

## 监控指标

通过日志可以追踪的关键指标：

1. **性能**: `duration_ms`
2. **成功率**: `processed / (processed + failed)`
3. **分类分布**: `categories` JSON
4. **错误率**: ERROR 日志数量
5. **触发器健康**: 上次运行时间、处理数量

---

**作者**: ultrathink
**最后更新**: 2025-10-15
