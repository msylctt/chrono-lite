# Phase 2: 分类引擎验证

## 阶段目标

实现三级匹配策略（精确匹配→域名匹配→启发式规则），验证分类准确率达到 85% 以上。

**预计时间**：2 天

## 核心逻辑

```
输入: message (GmailMessage 对象)
    ↓
提取发件人邮箱
    ↓
Level 1: 精确匹配数据库 (85% 命中率)
    ↓ 未命中
Level 2: 域名匹配 (10% 命中率)
    ↓ 未命中
Level 3: 启发式规则 (5% 命中率)
    ↓
返回: { category, confidence, source }
```

## 实施步骤

### Step 1: 创建 Classifier.gs

```javascript
/**
 * Phase 2: 分类引擎
 */

/**
 * 提取邮箱地址（处理各种格式）
 */
function extractEmail(fromString) {
  // 格式 1: "John Doe <john@example.com>"
  var match = fromString.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  
  // 格式 2: "john@example.com"
  return fromString.toLowerCase().trim();
}

/**
 * Level 1: 精确匹配
 */
function classifyByExactMatch(email) {
  var result = querySender(email);
  
  if (result && result.confidence_score >= 0.8) {
    return {
      category: result.category,
      confidence: result.confidence_score,
      source: 'database_exact',
      method: 'exact_match'
    };
  }
  
  return null;
}

/**
 * Level 2: 域名匹配
 */
function classifyByDomain(email) {
  var domain = email.split('@')[1];
  if (!domain) return null;
  
  // 尝试常见发件人格式
  var domainPatterns = [
    'noreply@' + domain,
    'newsletter@' + domain,
    'news@' + domain,
    'updates@' + domain,
    'notify@' + domain
  ];
  
  for (var i = 0; i < domainPatterns.length; i++) {
    var result = querySender(domainPatterns[i]);
    if (result) {
      return {
        category: result.category,
        confidence: Math.max(0.6, result.confidence_score * 0.8),
        source: 'database_domain',
        method: 'domain_match'
      };
    }
  }
  
  return null;
}

/**
 * Level 3: 启发式规则
 */
function classifyByHeuristics(message) {
  var rawContent = message.getRawContent();
  var subject = message.getSubject();
  var from = message.getFrom().toLowerCase();
  
  // 规则 1: List-Unsubscribe 头部
  if (rawContent.match(/List-Unsubscribe:/i)) {
    return {
      category: 'Newsletter',
      confidence: 0.6,
      source: 'heuristic',
      method: 'list_unsubscribe_header'
    };
  }
  
  // 规则 2: Newsletter 平台域名
  var newsletterPlatforms = [
    'substack.com',
    'beehiiv.com',
    'convertkit.com',
    'mailchimp.com',
    'sendgrid.net'
  ];
  
  for (var i = 0; i < newsletterPlatforms.length; i++) {
    if (from.includes(newsletterPlatforms[i])) {
      return {
        category: 'Newsletter',
        confidence: 0.65,
        source: 'heuristic',
        method: 'platform_domain'
      };
    }
  }
  
  // 规则 3: 主题关键词
  var newsletterKeywords = [
    'newsletter',
    'weekly digest',
    'daily brief',
    'roundup',
    'update summary'
  ];
  
  var subjectLower = subject.toLowerCase();
  for (var i = 0; i < newsletterKeywords.length; i++) {
    if (subjectLower.includes(newsletterKeywords[i])) {
      return {
        category: 'Newsletter',
        confidence: 0.55,
        source: 'heuristic',
        method: 'subject_keyword'
      };
    }
  }
  
  // 规则 4: 营销邮件特征
  if (rawContent.match(/promotional/i) || 
      subject.match(/sale|discount|offer|deal/i)) {
    return {
      category: 'Marketing',
      confidence: 0.5,
      source: 'heuristic',
      method: 'marketing_keyword'
    };
  }
  
  return null;
}

/**
 * 完整分类流程（三级匹配）
 */
function classifyEmail(message) {
  var senderEmail = extractEmail(message.getFrom());
  
  // Level 1: 精确匹配
  var exactResult = classifyByExactMatch(senderEmail);
  if (exactResult) {
    return exactResult;
  }
  
  // Level 2: 域名匹配
  var domainResult = classifyByDomain(senderEmail);
  if (domainResult) {
    return domainResult;
  }
  
  // Level 3: 启发式规则
  var heuristicResult = classifyByHeuristics(message);
  if (heuristicResult) {
    return heuristicResult;
  }
  
  return null; // 无法分类
}

/**
 * 批量分类（优化版）
 */
function classifyBatch(messages) {
  // 1. 提取所有发件人
  var senders = messages.map(function(msg) {
    return extractEmail(msg.getFrom());
  });
  
  // 2. 批量查询数据库
  var dbResults = queryBatch(senders);
  
  // 3. 映射分类结果
  return messages.map(function(msg, index) {
    var email = senders[index];
    var dbResult = dbResults[email];
    
    // 精确匹配
    if (dbResult && dbResult.confidence_score >= 0.8) {
      return {
        message: msg,
        category: dbResult.category,
        confidence: dbResult.confidence_score,
        source: 'database_exact'
      };
    }
    
    // 回退到完整分类
    return {
      message: msg,
      result: classifyEmail(msg)
    };
  });
}
```

### Step 2: 测试邮箱地址提取

```javascript
/**
 * 测试邮箱提取
 */
function testEmailExtraction() {
  Logger.log('📧 测试邮箱提取');
  
  var testCases = [
    { input: 'john@example.com', expected: 'john@example.com' },
    { input: 'John Doe <john@example.com>', expected: 'john@example.com' },
    { input: '"Doe, John" <john@example.com>', expected: 'john@example.com' },
    { input: 'Newsletter <newsletter@stratechery.com>', expected: 'newsletter@stratechery.com' }
  ];
  
  var passed = 0;
  testCases.forEach(function(test) {
    var result = extractEmail(test.input);
    var match = result === test.expected;
    
    Logger.log((match ? '✅' : '❌') + ' "' + test.input + '" → ' + result);
    if (match) passed++;
  });
  
  Logger.log('通过率: ' + (passed / testCases.length * 100) + '%');
  return passed === testCases.length;
}
```

### Step 3: 测试分类准确率

```javascript
/**
 * 测试分类准确率（使用真实 Gmail 数据）
 */
function testClassificationAccuracy() {
  Logger.log('🎯 测试分类准确率');
  
  // 确保数据已缓存
  storeShardedDatabase();
  
  // 获取最近 20 封邮件进行测试
  var threads = GmailApp.search('in:inbox', 0, 20);
  
  Logger.log('测试邮件数量: ' + threads.length);
  
  var stats = {
    total: threads.length,
    classified: 0,
    bySource: {
      database_exact: 0,
      database_domain: 0,
      heuristic: 0,
      unclassified: 0
    },
    byCategory: {}
  };
  
  threads.forEach(function(thread) {
    var message = thread.getMessages()[0];
    var result = classifyEmail(message);
    
    var from = extractEmail(message.getFrom());
    var subject = message.getSubject().substring(0, 50);
    
    if (result) {
      stats.classified++;
      stats.bySource[result.source]++;
      stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
      
      Logger.log('✅ ' + from);
      Logger.log('   → ' + result.category + ' (' + (result.confidence * 100).toFixed(0) + '%, ' + result.method + ')');
    } else {
      stats.bySource.unclassified++;
      Logger.log('❌ ' + from + ' (未分类)');
    }
  });
  
  Logger.log('\n📊 分类统计:');
  Logger.log('总数: ' + stats.total);
  Logger.log('已分类: ' + stats.classified + ' (' + (stats.classified / stats.total * 100).toFixed(1) + '%)');
  Logger.log('未分类: ' + stats.bySource.unclassified);
  
  Logger.log('\n📈 分类来源:');
  Logger.log('  - 精确匹配: ' + stats.bySource.database_exact);
  Logger.log('  - 域名匹配: ' + stats.bySource.database_domain);
  Logger.log('  - 启发式规则: ' + stats.bySource.heuristic);
  
  Logger.log('\n📁 分类分布:');
  Object.keys(stats.byCategory).forEach(function(cat) {
    Logger.log('  - ' + cat + ': ' + stats.byCategory[cat]);
  });
  
  return stats;
}
```

### Step 4: 性能基准测试

```javascript
/**
 * 测试分类性能
 */
function testClassificationPerformance() {
  Logger.log('⚡ 测试分类性能');
  
  storeShardedDatabase();
  
  // 获取 100 封邮件
  var threads = GmailApp.search('in:inbox', 0, 100);
  var messages = [];
  
  threads.forEach(function(thread) {
    messages.push(thread.getMessages()[0]);
  });
  
  Logger.log('测试邮件数量: ' + messages.length);
  
  // 方法 1: 逐个分类
  Logger.log('\n方法 1: 逐个分类');
  var start1 = new Date();
  var results1 = [];
  messages.forEach(function(msg) {
    results1.push(classifyEmail(msg));
  });
  var duration1 = new Date() - start1;
  Logger.log('耗时: ' + duration1 + 'ms');
  Logger.log('平均: ' + (duration1 / messages.length).toFixed(2) + 'ms/封');
  
  // 方法 2: 批量分类
  Logger.log('\n方法 2: 批量分类');
  var start2 = new Date();
  var results2 = classifyBatch(messages);
  var duration2 = new Date() - start2;
  Logger.log('耗时: ' + duration2 + 'ms');
  Logger.log('平均: ' + (duration2 / messages.length).toFixed(2) + 'ms/封');
  
  Logger.log('\n📊 性能提升: ' + ((1 - duration2 / duration1) * 100).toFixed(1) + '%');
  
  return {
    emailCount: messages.length,
    individualDuration: duration1,
    batchDuration: duration2,
    improvement: ((1 - duration2 / duration1) * 100).toFixed(1) + '%'
  };
}
```

### Step 5: 完整测试套件

```javascript
/**
 * Phase 2 完整验证
 */
function runPhase2Tests() {
  Logger.log('🚀 开始 Phase 2 验证');
  Logger.log('='.repeat(60));
  
  var results = {
    phase: 'Phase 2',
    tests: [],
    performance: {},
    allPassed: true
  };
  
  // 测试 1: 邮箱提取
  try {
    Logger.log('\n📧 测试 1: 邮箱提取');
    var extractPassed = testEmailExtraction();
    results.tests.push({ name: 'Email Extraction', passed: extractPassed });
  } catch (e) {
    results.tests.push({ name: 'Email Extraction', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  // 测试 2: 分类准确率
  try {
    Logger.log('\n🎯 测试 2: 分类准确率');
    var accuracyStats = testClassificationAccuracy();
    var accuracyRate = accuracyStats.classified / accuracyStats.total;
    results.tests.push({
      name: 'Classification Accuracy',
      passed: accuracyRate >= 0.85
    });
    results.performance.accuracyRate = (accuracyRate * 100).toFixed(1) + '%';
  } catch (e) {
    results.tests.push({ name: 'Classification Accuracy', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  // 测试 3: 性能基准
  try {
    Logger.log('\n⚡ 测试 3: 性能基准');
    var perfStats = testClassificationPerformance();
    results.tests.push({
      name: 'Performance Benchmark',
      passed: perfStats.batchDuration < 5000 // <5 秒处理 100 封
    });
    results.performance = Object.assign(results.performance, perfStats);
  } catch (e) {
    results.tests.push({ name: 'Performance Benchmark', passed: false, error: e.message });
    results.allPassed = false;
  }
  
  Logger.log('\n' + '='.repeat(60));
  Logger.log('🏁 Phase 2 验证完成');
  Logger.log('总测试数: ' + results.tests.length);
  Logger.log('通过数: ' + results.tests.filter(function(t) { return t.passed; }).length);
  Logger.log('状态: ' + (results.allPassed ? '✅ 全部通过' : '❌ 存在失败'));
  
  return results;
}
```

## 验收标准

### ✅ Phase 2 通过标准

- [ ] 邮箱提取测试 100% 通过
- [ ] 分类准确率 ≥85%
- [ ] 批量分类（100 封）耗时 <5 秒
- [ ] 三级匹配策略全部工作
- [ ] `runPhase2Tests()` 全部通过（3/3 tests）

## 性能基准

| 操作 | 目标 | 验证方法 |
|-----|------|---------|
| 单封分类 | <50ms | 运行 100 次取平均 |
| 批量分类（100 封） | <5秒 | 实际 Gmail 数据测试 |
| 准确率 | >85% | 人工验证样本 |

## 下一步

Phase 2 验证通过后，进入 [Phase 3: 动作执行](./Phase-3-Actions.md)。

---

**阶段状态**：🟢 就绪  
**难度**：⭐⭐ 简单  
**关键性**：🔴 高（核心逻辑）

