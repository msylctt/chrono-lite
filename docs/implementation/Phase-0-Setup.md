# Phase 0: 环境准备与基础验证

## 阶段目标

建立 Apps Script 开发环境，验证基础功能可用。这是后续所有阶段的基础。

**预计时间**：0.5 天

## 前置条件

- [ ] Gmail 账号（建议使用测试账号）
- [ ] Chrome 浏览器
- [ ] 基础 JavaScript 知识

## 实施步骤

### Step 1: 创建 Apps Script 项目

#### 方法 A：通过 Google Apps Script Editor（推荐初学者）

1. 访问 https://script.google.com
2. 点击"新建项目"
3. 重命名项目为 `Chrono Lite`
4. 保存（Ctrl+S / Cmd+S）

#### 方法 B：使用 clasp CLI（推荐进阶用户）

```bash
# 安装 clasp
npm install -g @google/clasp

# 登录
clasp login

# 创建项目
clasp create --type standalone --title "Chrono Lite"

# 推送代码
clasp push

# 打开浏览器编辑器
clasp open
```

**验证**：
- ✅ 项目创建成功
- ✅ 项目名称显示为 "Chrono Lite"

---

### Step 2: 配置 Manifest (appsscript.json)

在 Apps Script 编辑器中：

1. 点击左侧齿轮图标（项目设置）
2. 勾选"显示 appsscript.json"
3. 点击左侧 `appsscript.json`
4. 替换内容：

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
  ]
}
```

**验证**：
- ✅ 文件保存成功
- ✅ 无语法错误

---

### Step 3: 创建 Hello World 测试

创建 `Code.gs` 文件：

```javascript
/**
 * Phase 0: 基础验证
 * 验证 Apps Script 环境正常工作
 */

/**
 * 测试 1: Hello World
 */
function testHelloWorld() {
  Logger.log('🎉 Hello, Chrono Lite!');
  Logger.log('✅ Phase 0 - 环境验证成功');
  
  return {
    success: true,
    message: 'Apps Script 环境正常'
  };
}

/**
 * 测试 2: Logger 功能
 */
function testLogger() {
  var startTime = new Date();
  
  Logger.log('📝 测试 Logger 输出');
  Logger.log('当前时间: ' + startTime.toISOString());
  Logger.log('时区: ' + Session.getScriptTimeZone());
  
  var endTime = new Date();
  var duration = endTime - startTime;
  
  Logger.log('执行时间: ' + duration + 'ms');
  
  return {
    success: true,
    duration: duration,
    timezone: Session.getScriptTimeZone()
  };
}

/**
 * 测试 3: 基础 JavaScript 语法
 */
function testJavaScriptFeatures() {
  Logger.log('🔍 测试 JavaScript 特性');
  
  // ES6+ 语法（V8 运行时支持）
  const arr = [1, 2, 3, 4, 5];
  const doubled = arr.map(x => x * 2);
  
  Logger.log('原数组: ' + JSON.stringify(arr));
  Logger.log('翻倍后: ' + JSON.stringify(doubled));
  
  // 模板字符串
  const name = 'Chrono Lite';
  const greeting = `Hello, ${name}!`;
  Logger.log(greeting);
  
  // 解构
  const { length } = arr;
  Logger.log('数组长度: ' + length);
  
  return {
    success: true,
    features: ['arrow functions', 'template strings', 'destructuring']
  };
}

/**
 * 测试 4: 错误处理
 */
function testErrorHandling() {
  Logger.log('⚠️ 测试错误处理');
  
  try {
    Logger.log('正常执行...');
    
    // 模拟错误
    if (Math.random() > 0.5) {
      throw new Error('这是一个测试错误');
    }
    
    Logger.log('✅ 无错误发生');
    return { success: true, error: null };
    
  } catch (error) {
    Logger.log('❌ 捕获错误: ' + error.message);
    Logger.log('错误堆栈: ' + error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 测试 5: PropertiesService（持久化存储）
 */
function testPropertiesService() {
  Logger.log('💾 测试 PropertiesService');
  
  var userProps = PropertiesService.getUserProperties();
  
  // 写入
  userProps.setProperty('test_key', 'test_value');
  userProps.setProperty('test_timestamp', new Date().toISOString());
  
  // 读取
  var value = userProps.getProperty('test_key');
  var timestamp = userProps.getProperty('test_timestamp');
  
  Logger.log('读取值: ' + value);
  Logger.log('时间戳: ' + timestamp);
  
  // 清理
  userProps.deleteProperty('test_key');
  userProps.deleteProperty('test_timestamp');
  
  return {
    success: value === 'test_value',
    value: value,
    timestamp: timestamp
  };
}

/**
 * 完整验证套件
 */
function runPhase0Tests() {
  Logger.log('🚀 开始 Phase 0 验证');
  Logger.log('='.repeat(50));
  
  var results = {
    phase: 'Phase 0',
    tests: [],
    allPassed: true
  };
  
  // 测试 1
  try {
    testHelloWorld();
    results.tests.push({ name: 'Hello World', passed: true });
    Logger.log('✅ 测试 1 通过');
  } catch (e) {
    results.tests.push({ name: 'Hello World', passed: false, error: e.message });
    results.allPassed = false;
    Logger.log('❌ 测试 1 失败: ' + e.message);
  }
  
  // 测试 2
  try {
    testLogger();
    results.tests.push({ name: 'Logger', passed: true });
    Logger.log('✅ 测试 2 通过');
  } catch (e) {
    results.tests.push({ name: 'Logger', passed: false, error: e.message });
    results.allPassed = false;
    Logger.log('❌ 测试 2 失败: ' + e.message);
  }
  
  // 测试 3
  try {
    testJavaScriptFeatures();
    results.tests.push({ name: 'JavaScript Features', passed: true });
    Logger.log('✅ 测试 3 通过');
  } catch (e) {
    results.tests.push({ name: 'JavaScript Features', passed: false, error: e.message });
    results.allPassed = false;
    Logger.log('❌ 测试 3 失败: ' + e.message);
  }
  
  // 测试 4
  try {
    testErrorHandling();
    results.tests.push({ name: 'Error Handling', passed: true });
    Logger.log('✅ 测试 4 通过');
  } catch (e) {
    results.tests.push({ name: 'Error Handling', passed: false, error: e.message });
    results.allPassed = false;
    Logger.log('❌ 测试 4 失败: ' + e.message);
  }
  
  // 测试 5
  try {
    var propResult = testPropertiesService();
    results.tests.push({ name: 'PropertiesService', passed: propResult.success });
    Logger.log(propResult.success ? '✅ 测试 5 通过' : '❌ 测试 5 失败');
  } catch (e) {
    results.tests.push({ name: 'PropertiesService', passed: false, error: e.message });
    results.allPassed = false;
    Logger.log('❌ 测试 5 失败: ' + e.message);
  }
  
  Logger.log('='.repeat(50));
  Logger.log('🏁 Phase 0 验证完成');
  Logger.log('总测试数: ' + results.tests.length);
  Logger.log('通过数: ' + results.tests.filter(function(t) { return t.passed; }).length);
  Logger.log('状态: ' + (results.allPassed ? '✅ 全部通过' : '❌ 存在失败'));
  
  return results;
}
```

**运行测试**：

1. 在编辑器顶部选择函数 `runPhase0Tests`
2. 点击"运行"（或按 Ctrl+R / Cmd+R）
3. 首次运行会要求授权 → 点击"审查权限" → 选择账号 → "前往 Chrono Lite（不安全）" → "允许"
4. 查看"执行日志"（View → Logs 或 Ctrl+Enter）

**预期输出**：

```
🚀 开始 Phase 0 验证
==================================================
🎉 Hello, Chrono Lite!
✅ Phase 0 - 环境验证成功
✅ 测试 1 通过
📝 测试 Logger 输出
当前时间: 2025-10-14T12:00:00.000Z
时区: Asia/Shanghai
执行时间: 5ms
✅ 测试 2 通过
🔍 测试 JavaScript 特性
原数组: [1,2,3,4,5]
翻倍后: [2,4,6,8,10]
Hello, Chrono Lite!
数组长度: 5
✅ 测试 3 通过
⚠️ 测试错误处理
✅ 无错误发生
✅ 测试 4 通过
💾 测试 PropertiesService
读取值: test_value
时间戳: 2025-10-14T12:00:00.000Z
✅ 测试 5 通过
==================================================
🏁 Phase 0 验证完成
总测试数: 5
通过数: 5
状态: ✅ 全部通过
```

---

### Step 4: 验证授权权限

创建 Gmail 读取测试：

```javascript
/**
 * 测试 6: Gmail API 权限
 */
function testGmailPermissions() {
  Logger.log('📧 测试 Gmail API 权限');
  
  try {
    // 尝试读取收件箱统计
    var inboxCount = GmailApp.getInboxUnreadCount();
    Logger.log('✅ Gmail 权限正常');
    Logger.log('收件箱未读数: ' + inboxCount);
    
    // 尝试获取标签
    var labels = GmailApp.getUserLabels();
    Logger.log('标签数量: ' + labels.length);
    
    return {
      success: true,
      unreadCount: inboxCount,
      labelCount: labels.length
    };
    
  } catch (error) {
    Logger.log('❌ Gmail 权限异常: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**运行测试**：

1. 选择函数 `testGmailPermissions`
2. 点击"运行"
3. 如果提示授权，重复授权流程

**预期输出**：

```
📧 测试 Gmail API 权限
✅ Gmail 权限正常
收件箱未读数: 42
标签数量: 15
```

---

## 验收标准

### ✅ Phase 0 通过标准

- [ ] Apps Script 项目创建成功
- [ ] `runPhase0Tests()` 全部通过（5/5 tests）
- [ ] `testGmailPermissions()` 成功读取收件箱数据
- [ ] Logger 输出清晰可见
- [ ] 无授权错误

## 常见问题

### Q1: 运行函数时提示"未授权"

**原因**：首次运行需要用户授权。

**解决方案**：
1. 点击"审查权限"
2. 选择您的 Gmail 账号
3. 点击"高级" → "前往 Chrono Lite（不安全）"
4. 点击"允许"

### Q2: Logger 输出看不到

**原因**：没有打开执行日志。

**解决方案**：
- 方法 1：点击顶部菜单 View → Logs
- 方法 2：按快捷键 Ctrl+Enter (Windows) 或 Cmd+Enter (Mac)

### Q3: 运行时提示"V8 运行时不支持"

**原因**：项目使用旧版 Rhino 运行时。

**解决方案**：
1. 打开 `appsscript.json`
2. 确保有 `"runtimeVersion": "V8"`
3. 保存并重新运行

### Q4: clasp push 失败

**原因**：可能是本地代码格式问题或网络问题。

**解决方案**：
```bash
# 检查 clasp 状态
clasp status

# 强制推送
clasp push --force

# 如果仍然失败，使用 Web 编辑器
clasp open
```

## 性能基准

Phase 0 的测试非常轻量，预期性能：

| 测试 | 预期耗时 |
|-----|---------|
| `testHelloWorld()` | <10ms |
| `testLogger()` | <20ms |
| `testJavaScriptFeatures()` | <50ms |
| `testErrorHandling()` | <30ms |
| `testPropertiesService()` | <100ms |
| `testGmailPermissions()` | <500ms |
| **总耗时** | **<1秒** |

## 下一步

Phase 0 验证通过后，进入 [Phase 1: 数据层实现](./Phase-1-DataLayer.md)。

在 Phase 1 中，我们将：
- ✅ 从 CDN 加载发件人数据库
- ✅ 实现分片缓存策略
- ✅ 验证查询性能

---

**阶段状态**：🟢 就绪  
**难度**：⭐ 简单  
**关键性**：🔴 高（基础）

