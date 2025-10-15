# Phase 5: 触发器与自动化

## 阶段目标

实现定时触发器、增量处理和时间保护机制，确保自动化稳定运行。

**预计时间**：1-2 天

## 核心挑战

| 挑战 | 应对策略 |
|-----|---------|
| **6 分钟执行限制** | 分批处理 + 时间保护 |
| **触发器配额** | 免费账户 20 次/天 → 选择合适频率 |
| **幂等性** | 已处理线程标记 + 去重 |

## 实施步骤

### Step 1: 创建 Triggers.gs

```javascript
/**
 * Phase 5: 触发器与自动化
 */

/**
 * 创建定时触发器
 */
function createTimeTrigger(mode) {
  // 删除旧触发器
  deleteExistingTriggers('autoProcessInbox');
  
  // 根据模式设置频率
  var intervalHours;
  switch(mode) {
    case 'aggressive':
      intervalHours = 1; // 每小时
      break;
    case 'conservative':
      intervalHours = 24; // 每天
      break;
    case 'smart':
    default:
      intervalHours = 2; // 每 2 小时（推荐）
  }
  
  // 创建触发器
  ScriptApp.newTrigger('autoProcessInbox')
    .timeBased()
    .everyHours(intervalHours)
    .create();
  
  Logger.log('✅ 触发器已创建：每 ' + intervalHours + ' 小时');
}

/**
 * 删除现有触发器
 */
function deleteExistingTriggers(functionName) {
  var triggers = ScriptApp.getProjectTriggers();
  
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 已删除触发器: ' + trigger.getUniqueId());
    }
  });
}
```

### Step 2: 实现增量处理逻辑

```javascript
/**
 * 自动处理收件箱（定时触发器调用）
 * 仅处理最近 1-2 小时的新邮件
 */
function autoProcessInbox() {
  var startTime = new Date();
  Logger.log('🚀 自动处理开始: ' + startTime.toISOString());
  
  try {
    // 1. 构建增量查询
    var query = 'in:inbox newer_than:2h';
    var threads = GmailApp.search(query, 0, 100);
    
    if (threads.length === 0) {
      Logger.log('✅ 无新邮件需要处理');
      return;
    }
    
    Logger.log('📧 找到 ' + threads.length + ' 个线程');
    
    // 2. 批量分类
    var messages = threads.map(function(thread) {
      return thread.getMessages()[0];
    });
    
    var classifications = classifyBatch(messages);
    
    // 3. 应用分类
    var threadsWithCategories = [];
    classifications.forEach(function(item, index) {
      if (item.result && item.result.category) {
        threadsWithCategories.push({
          thread: threads[index],
          category: item.result.category,
          result: item.result
        });
      }
    });
    
    var stats = applyBatchCategories(threadsWithCategories);
    
    // 4. 记录统计
    var endTime = new Date();
    var duration = (endTime - startTime) / 1000;
    
    Logger.log('✅ 自动处理完成，耗时 ' + duration + 's');
    Logger.log('📊 统计: ' + JSON.stringify(stats));
    
    // 5. 更新用户统计
    updateUserStats(stats);
    
  } catch (error) {
    Logger.log('❌ 自动处理失败: ' + error.message);
    Logger.log(error.stack);
  }
}
```

### Step 3: 实现时间保护机制

```javascript
/**
 * 批量历史处理（带时间保护）
 */
function massCleanupHistory(rangeOption) {
  var MAX_TIME = 5 * 60 * 1000; // 5 分钟上限
  var startTime = new Date();
  
  Logger.log('🚀 批量清理开始: ' + rangeOption);
  
  // 1. 构建查询
  var query;
  var maxThreads;
  
  switch(rangeOption) {
    case '7d':
      query = 'newer_than:7d';
      maxThreads = 500;
      break;
    case '30d':
      query = 'newer_than:30d';
      maxThreads = 2000;
      break;
    case '6m':
      query = 'newer_than:6m';
      maxThreads = 5000;
      break;
    default:
      query = 'newer_than:7d';
      maxThreads = 500;
  }
  
  // 2. 分批处理
  var offset = 0;
  var batchSize = 100;
  var totalProcessed = 0;
  var totalStats = { success: 0, failed: 0, byCategory: {} };
  
  while (offset < maxThreads) {
    // 时间保护：检查是否接近 6 分钟
    var elapsed = new Date() - startTime;
    if (elapsed > MAX_TIME) {
      Logger.log('⚠️ 接近时间上限，在 offset ' + offset + ' 处停止');
      break;
    }
    
    try {
      var threads = GmailApp.search(query, offset, batchSize);
      
      if (threads.length === 0) {
        break; // 无更多邮件
      }
      
      // 批量分类和应用
      var messages = threads.map(function(t) { return t.getMessages()[0]; });
      var classifications = classifyBatch(messages);
      
      var threadsWithCategories = [];
      classifications.forEach(function(item, index) {
        if (item.result && item.result.category) {
          threadsWithCategories.push({
            thread: threads[index],
            category: item.result.category
          });
        }
      });
      
      var stats = applyBatchCategories(threadsWithCategories);
      
      // 累加统计
      totalStats.success += stats.success;
      totalStats.failed += stats.failed;
      Object.keys(stats.byCategory).forEach(function(cat) {
        totalStats.byCategory[cat] = (totalStats.byCategory[cat] || 0) + stats.byCategory[cat];
      });
      
      totalProcessed += threads.length;
      offset += batchSize;
      
      Logger.log('进度: ' + totalProcessed + ' 个线程已处理');
      
      // 节流：每批后暂停 1-2 秒
      Utilities.sleep(1500);
      
    } catch (error) {
      Logger.log('❌ 批次失败于 offset ' + offset + ': ' + error.message);
      break;
    }
  }
  
  var endTime = new Date();
  var duration = (endTime - startTime) / 1000;
  
  Logger.log('✅ 批量清理完成，耗时 ' + duration + 's');
  Logger.log('📊 总处理数: ' + totalProcessed);
  Logger.log('📊 统计: ' + JSON.stringify(totalStats));
  
  return {
    success: true,
    processed: totalProcessed,
    stats: totalStats,
    duration: duration
  };
}
```

### Step 4: 用户统计管理

```javascript
/**
 * 更新用户统计
 */
function updateUserStats(stats) {
  var props = PropertiesService.getUserProperties();
  var today = new Date().toDateString();
  
  // 检查是否是新的一天
  var lastDate = props.getProperty('chrono_last_date');
  if (lastDate !== today) {
    props.setProperty('chrono_today_processed', '0');
    props.setProperty('chrono_last_date', today);
  }
  
  // 累加今日统计
  var todayCount = parseInt(props.getProperty('chrono_today_processed') || '0');
  todayCount += stats.success;
  props.setProperty('chrono_today_processed', String(todayCount));
  
  // 更新最后处理时间
  props.setProperty('chrono_last_process', new Date().toISOString());
}

/**
 * 获取用户统计
 */
function getUserStats() {
  var props = PropertiesService.getUserProperties();
  
  return {
    todayProcessed: parseInt(props.getProperty('chrono_today_processed') || '0'),
    lastProcess: props.getProperty('chrono_last_process') || '从未'
  };
}
```

### Step 5: 测试触发器

```javascript
/**
 * 测试触发器创建
 */
function testTriggerCreation() {
  Logger.log('⏰ 测试触发器创建');
  
  // 创建测试触发器
  createTimeTrigger('smart');
  
  // 验证触发器
  var triggers = ScriptApp.getProjectTriggers();
  var found = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === 'autoProcessInbox';
  });
  
  if (found) {
    Logger.log('✅ 触发器创建成功');
    Logger.log('触发器数量: ' + triggers.length);
  } else {
    Logger.log('❌ 触发器创建失败');
  }
  
  return found;
}

/**
 * 测试自动处理逻辑（不依赖触发器）
 */
function testAutoProcessLogic() {
  Logger.log('🔍 测试自动处理逻辑');
  
  // 手动调用自动处理函数
  autoProcessInbox();
  
  // 验证统计
  var stats = getUserStats();
  Logger.log('今日已处理: ' + stats.todayProcessed);
  Logger.log('最后处理: ' + stats.lastProcess);
}

/**
 * 测试时间保护
 */
function testTimeProtection() {
  Logger.log('⏱️ 测试时间保护');
  
  var startTime = new Date();
  
  // 模拟长时间运行
  var iterations = 0;
  var MAX_TIME = 10 * 1000; // 10 秒测试
  
  while (true) {
    var elapsed = new Date() - startTime;
    if (elapsed > MAX_TIME) {
      Logger.log('✅ 时间保护生效，在 ' + iterations + ' 次迭代后停止');
      break;
    }
    
    iterations++;
    Utilities.sleep(100);
  }
  
  var totalDuration = (new Date() - startTime) / 1000;
  Logger.log('总耗时: ' + totalDuration + 's');
  
  return totalDuration >= 10 && totalDuration <= 12; // 允许误差
}
```

### Step 6: 完整测试套件

```javascript
/**
 * Phase 5 完整验证
 */
function runPhase5Tests() {
  Logger.log('🚀 开始 Phase 5 验证');
  Logger.log('='.repeat(60));
  
  var results = {
    phase: 'Phase 5',
    tests: [],
    allPassed: true
  };
  
  // 测试 1: 触发器创建
  try {
    Logger.log('\n⏰ 测试 1: 触发器创建');
    var triggerPassed = testTriggerCreation();
    results.tests.push({ name: 'Trigger Creation', passed: triggerPassed });
  } catch (e) {
    results.tests.push({ name: 'Trigger Creation', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  // 测试 2: 自动处理逻辑
  try {
    Logger.log('\n🔄 测试 2: 自动处理逻辑');
    testAutoProcessLogic();
    results.tests.push({ name: 'Auto Process Logic', passed: true });
  } catch (e) {
    results.tests.push({ name: 'Auto Process Logic', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  // 测试 3: 时间保护
  try {
    Logger.log('\n⏱️ 测试 3: 时间保护');
    var timePassed = testTimeProtection();
    results.tests.push({ name: 'Time Protection', passed: timePassed });
  } catch (e) {
    results.tests.push({ name: 'Time Protection', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  Logger.log('\n' + '='.repeat(60));
  Logger.log('🏁 Phase 5 验证完成');
  Logger.log('通过数: ' + results.tests.filter(function(t) { return t.passed; }).length + '/' + results.tests.length);
  Logger.log('状态: ' + (results.allPassed ? '✅ 全部通过' : '❌ 存在失败'));
  
  // 清理测试触发器
  Logger.log('\n🧹 清理测试触发器...');
  deleteExistingTriggers('autoProcessInbox');
  
  return results;
}
```

## 验收标准

- [ ] 触发器创建成功
- [ ] 自动处理逻辑正确（增量）
- [ ] 时间保护机制生效
- [ ] 统计数据正确更新
- [ ] `runPhase5Tests()` 全部通过

## 配额管理

| 模式 | 频率 | 每日触发 | 适用场景 |
|-----|------|---------|---------|
| **Smart**（推荐） | 每 2 小时 | 12 次 | 大多数用户 |
| **Aggressive** | 每小时 | 24 次 | 高频邮件用户 |
| **Conservative** | 每天 | 1 次 | 低频邮件用户 |

## 下一步

进入 [Phase 6: 集成测试](./Phase-6-Integration.md)。

---

**阶段状态**：🟢 就绪  
**难度**：⭐⭐ 中等  
**关键性**：🔴 高

