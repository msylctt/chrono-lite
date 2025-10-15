/**
 * Phase 2: 分类引擎
 */

/**
 * 会话级域名缓存
 */
var _domainCache = {};

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

  if (result) {
    return {
      category: result.category,
      source: 'database_exact',
      method: 'exact_match'
    };
  }

  return null;
}

/**
 * Level 2: 域名匹配（带缓存）
 */
function classifyByDomain(email) {
  var domain = email.split('@')[1];
  if (!domain) return null;

  // 检查缓存
  if (_domainCache[domain]) {
    return _domainCache[domain];
  }

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
      var cachedResult = {
        category: result.category,
        source: 'database_domain',
        method: 'domain_match'
      };
      // 存入缓存
      _domainCache[domain] = cachedResult;
      return cachedResult;
    }
  }

  // 缓存未找到结果（避免重复查询）
  _domainCache[domain] = null;
  return null;
}

/**
 * Level 3: 启发式规则
 */
function classifyByHeuristics(message) {
  var subject = message.getSubject();
  var from = message.getFrom().toLowerCase();

  // 规则 1: List-Unsubscribe 头部（使用轻量级 API）
  try {
    var unsubscribeHeader = message.getHeader('List-Unsubscribe');
    if (unsubscribeHeader) {
      return {
        category: 'Newsletter',
        source: 'heuristic',
        method: 'list_unsubscribe_header'
      };
    }
  } catch (e) {
    // 某些邮件可能没有此头部，继续下一条规则
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
        source: 'heuristic',
        method: 'subject_keyword'
      };
    }
  }

  // 规则 4: 营销邮件特征（仅基于主题）
  if (subject.match(/sale|discount|offer|deal|促销|优惠/i)) {
    return {
      category: 'Marketing',
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
  if (!messages || messages.length === 0) return [];

  // 1. 批量提取元数据（避免重复 API 调用）
  var metadata = messages.map(function(msg) {
    var from = msg.getFrom();
    var email = extractEmail(from);
    var domain = email.split('@')[1];

    return {
      from: from.toLowerCase(),
      email: email,
      domain: domain,
      subject: msg.getSubject(),
      unsubscribe: null
    };
  });

  // 2. 批量精确匹配
  var exactEmails = metadata.map(function(m) { return m.email; });
  var exactResults = queryBatch(exactEmails);

  // 3. 收集需要域名匹配的索引和查询
  var needDomainMatch = [];
  var domainQueries = [];
  var domainQueryMap = {}; // email -> [query patterns]

  for (var i = 0; i < metadata.length; i++) {
    var m = metadata[i];
    var exactResult = exactResults[m.email];

    // 如果精确匹配失败
    if (!exactResult) {
      needDomainMatch.push(i);

      // 生成域名匹配查询
      var patterns = [
        'noreply@' + m.domain,
        'newsletter@' + m.domain,
        'news@' + m.domain,
        'updates@' + m.domain,
        'notify@' + m.domain
      ];

      domainQueryMap[m.email] = patterns;
      domainQueries = domainQueries.concat(patterns);
    }
  }

  // 4. 批量域名匹配查询
  var domainResults = {};
  if (domainQueries.length > 0) {
    domainResults = queryBatch(domainQueries);
  }

  // 5. 批量获取 List-Unsubscribe 头部（仅对需要启发式规则的邮件）
  var needHeuristics = [];
  for (var j = 0; j < needDomainMatch.length; j++) {
    var idx = needDomainMatch[j];
    var m = metadata[idx];
    var patterns = domainQueryMap[m.email];

    // 检查域名匹配是否成功
    var domainMatched = false;
    for (var k = 0; k < patterns.length; k++) {
      if (domainResults[patterns[k]]) {
        domainMatched = true;
        break;
      }
    }

    if (!domainMatched) {
      needHeuristics.push(idx);
      // 尝试获取 List-Unsubscribe 头部
      try {
        var header = messages[idx].getHeader('List-Unsubscribe');
        metadata[idx].unsubscribe = header;
      } catch (e) {
        metadata[idx].unsubscribe = null;
      }
    }
  }

  // 6. 构建最终结果
  var results = [];
  for (var n = 0; n < messages.length; n++) {
    var msg = messages[n];
    var m = metadata[n];
    var exactResult = exactResults[m.email];

    // Level 1: 精确匹配
    if (exactResult) {
      results.push({
        message: msg,
        category: exactResult.category,
        source: 'database_exact',
        method: 'exact_match'
      });
      continue;
    }

    // Level 2: 域名匹配
    var patterns = domainQueryMap[m.email];
    var domainMatched = false;
    if (patterns) {
      for (var p = 0; p < patterns.length; p++) {
        var dr = domainResults[patterns[p]];
        if (dr) {
          results.push({
            message: msg,
            category: dr.category,
            source: 'database_domain',
            method: 'domain_match'
          });
          domainMatched = true;
          break;
        }
      }
    }
    if (domainMatched) continue;

    // Level 3: 启发式规则（批量处理）
    var heuristicResult = applyBatchHeuristics(m);
    if (heuristicResult) {
      results.push({
        message: msg,
        category: heuristicResult.category,
        source: 'heuristic',
        method: heuristicResult.method
      });
      continue;
    }

    // 无法分类
    results.push({
      message: msg,
      result: null
    });
  }

  return results;
}

/**
 * 批量启发式规则（基于预提取的元数据）
 */
function applyBatchHeuristics(metadata) {
  var subject = metadata.subject;
  var from = metadata.from;
  var unsubscribe = metadata.unsubscribe;

  // 规则 1: List-Unsubscribe 头部
  if (unsubscribe) {
    return {
      category: 'Newsletter',
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
  for (var j = 0; j < newsletterKeywords.length; j++) {
    if (subjectLower.includes(newsletterKeywords[j])) {
      return {
        category: 'Newsletter',
        method: 'subject_keyword'
      };
    }
  }

  // 规则 4: 营销邮件特征
  if (subject.match(/sale|discount|offer|deal|促销|优惠/i)) {
    return {
      category: 'Marketing',
      method: 'marketing_keyword'
    };
  }

  return null;
}

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
      Logger.log('   → ' + result.category + ' (' + result.method + ')');
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

/**
 * Phase 2 完整验证
 */
function runPhase2Tests() {
  Logger.log('🚀 开始 Phase 2 验证');
  Logger.log('='.repeat(60));

  // 清空域名缓存
  _domainCache = {};

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
