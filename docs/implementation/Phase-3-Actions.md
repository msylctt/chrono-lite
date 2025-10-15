# Phase 3: 动作执行验证

## 阶段目标

实现 Gmail 操作（标签、归档、已读、星标），验证操作正确性和性能。

**预计时间**：1 天

## 核心操作

```javascript
// 配置 → 动作映射
CATEGORIES['Newsletter'] → {
  label: 'Chrono/Newsletter',
  action: 'archive',
  markRead: false,
  addStar: false
}
```

## 实施步骤

### Step 1: 创建 Actions.gs

```javascript
/**
 * Phase 3: 动作执行
 */

/**
 * 创建或获取标签
 */
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  
  if (!label) {
    try {
      label = GmailApp.createLabel(labelName);
      Logger.log('✅ 创建标签: ' + labelName);
    } catch (error) {
      Logger.log('❌ 创建标签失败: ' + error.message);
      return null;
    }
  }
  
  return label;
}

/**
 * 应用分类动作
 */
function applyCategory(thread, categoryName) {
  var config = CATEGORIES[categoryName];
  
  if (!config) {
    Logger.log('⚠️ 未知分类: ' + categoryName);
    return false;
  }
  
  try {
    // 1. 应用标签
    var label = getOrCreateLabel(config.label);
    if (label) {
      thread.addLabel(label);
    }
    
    // 2. 执行动作
    if (config.action === 'archive') {
      thread.moveToArchive();
    }
    
    // 3. 标记已读
    if (config.markRead) {
      thread.markRead();
    }
    
    // 4. 添加星标
    if (config.addStar) {
      thread.addStar();
    }
    
    Logger.log('✅ 应用分类: ' + thread.getFirstMessageSubject() + ' → ' + categoryName);
    
    return true;
    
  } catch (error) {
    Logger.log('❌ 应用分类失败: ' + error.message);
    return false;
  }
}

/**
 * 批量应用分类
 */
function applyBatchCategories(threadsWithCategories) {
  var labelCache = {};
  var stats = {
    success: 0,
    failed: 0,
    byCategory: {}
  };
  
  threadsWithCategories.forEach(function(item) {
    var thread = item.thread;
    var category = item.category;
    var config = CATEGORIES[category];
    
    if (!config) return;
    
    try {
      // 使用缓存的标签
      if (!labelCache[category]) {
        labelCache[category] = getOrCreateLabel(config.label);
      }
      var label = labelCache[category];
      
      if (label) {
        thread.addLabel(label);
      }
      
      if (config.action === 'archive') {
        thread.moveToArchive();
      }
      
      if (config.markRead) {
        thread.markRead();
      }
      
      stats.success++;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
    } catch (error) {
      Logger.log('❌ 批量应用失败: ' + thread.getId());
      stats.failed++;
    }
  });
  
  return stats;
}
```

### Step 2: 创建 Config.gs

```javascript
/**
 * 分类配置
 */
const CATEGORIES = {
  'Newsletter': {
    label: 'Chrono/Newsletter',
    action: 'archive',
    markRead: false,
    addStar: false
  },
  
  'Product Updates': {
    label: 'Chrono/Product',
    action: 'keep_inbox',
    markRead: false,
    addStar: true
  },
  
  'Marketing': {
    label: 'Chrono/Marketing',
    action: 'archive',
    markRead: true,
    addStar: false
  },
  
  'Tech News': {
    label: 'Chrono/Tech',
    action: 'archive',
    markRead: false,
    addStar: false
  },
  
  'Financial': {
    label: 'Chrono/Finance',
    action: 'keep_inbox',
    markRead: false,
    addStar: true
  }
};
```

### Step 3: 测试标签操作

```javascript
/**
 * 测试标签创建
 */
function testLabelCreation() {
  Logger.log('🏷️  测试标签创建');
  
  var testLabels = [
    'Chrono/Newsletter',
    'Chrono/Marketing',
    'Chrono/Product'
  ];
  
  var created = 0;
  testLabels.forEach(function(labelName) {
    var label = getOrCreateLabel(labelName);
    if (label) {
      Logger.log('✅ 标签: ' + labelName);
      created++;
    }
  });
  
  Logger.log('成功创建: ' + created + '/' + testLabels.length);
  return created === testLabels.length;
}
```

### Step 4: 测试完整流程

```javascript
/**
 * 测试完整分类+动作流程
 */
function testCompleteWorkflow() {
  Logger.log('🔄 测试完整工作流');
  
  // 确保数据已缓存
  storeShardedDatabase();
  
  // 获取 10 封测试邮件
  var threads = GmailApp.search('in:inbox', 0, 10);
  
  Logger.log('测试线程数: ' + threads.length);
  
  var stats = {
    total: threads.length,
    classified: 0,
    applied: 0,
    byCategory: {}
  };
  
  threads.forEach(function(thread) {
    var message = thread.getMessages()[0];
    var result = classifyEmail(message);
    
    if (result) {
      stats.classified++;
      
      var success = applyCategory(thread, result.category);
      if (success) {
        stats.applied++;
        stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
      }
    }
  });
  
  Logger.log('\n📊 执行统计:');
  Logger.log('总数: ' + stats.total);
  Logger.log('已分类: ' + stats.classified);
  Logger.log('已应用: ' + stats.applied);
  Logger.log('成功率: ' + (stats.applied / stats.total * 100).toFixed(1) + '%');
  
  Logger.log('\n📁 分类分布:');
  Object.keys(stats.byCategory).forEach(function(cat) {
    Logger.log('  - ' + cat + ': ' + stats.byCategory[cat]);
  });
  
  return stats;
}
```

### Step 5: 完整测试套件

```javascript
/**
 * Phase 3 完整验证
 */
function runPhase3Tests() {
  Logger.log('🚀 开始 Phase 3 验证');
  Logger.log('='.repeat(60));
  
  var results = {
    phase: 'Phase 3',
    tests: [],
    allPassed: true
  };
  
  // 测试 1: 标签创建
  try {
    Logger.log('\n🏷️  测试 1: 标签创建');
    var labelPassed = testLabelCreation();
    results.tests.push({ name: 'Label Creation', passed: labelPassed });
  } catch (e) {
    results.tests.push({ name: 'Label Creation', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  // 测试 2: 完整工作流
  try {
    Logger.log('\n🔄 测试 2: 完整工作流');
    var workflowStats = testCompleteWorkflow();
    var successRate = workflowStats.applied / workflowStats.total;
    results.tests.push({
      name: 'Complete Workflow',
      passed: successRate >= 0.8
    });
  } catch (e) {
    results.tests.push({ name: 'Complete Workflow', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  Logger.log('\n' + '='.repeat(60));
  Logger.log('🏁 Phase 3 验证完成');
  Logger.log('通过数: ' + results.tests.filter(function(t) { return t.passed; }).length + '/' + results.tests.length);
  Logger.log('状态: ' + (results.allPassed ? '✅ 全部通过' : '❌ 存在失败'));
  
  return results;
}
```

## 验收标准

- [ ] 标签创建成功
- [ ] 归档操作正确
- [ ] 已读/星标操作正确
- [ ] 完整工作流成功率 >80%
- [ ] `runPhase3Tests()` 全部通过

## 下一步

进入 [Phase 4: UI 层实现](./Phase-4-UI.md)。

---

**阶段状态**：🟢 就绪  
**难度**：⭐ 简单  
**关键性**：🟡 中

