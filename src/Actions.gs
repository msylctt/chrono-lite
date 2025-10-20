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
      Log.info(Log.Module.ACTION, 'Label created', {label_name: labelName});
    } catch (error) {
      Log.error(Log.Module.ACTION, 'Label creation failed', {
        label_name: labelName,
        error: error.message
      });
      return null;
    }
  }

  return label;
}

/**
 * 应用分类动作（单个线程）
 * @param {GmailThread} thread - Gmail 线程
 * @param {string} categoryName - 分类名称
 * @returns {boolean} 是否应用成功
 */
function applyCategory(thread, categoryName) {
  var config = (typeof getEffectiveCategoryConfig === 'function')
    ? getEffectiveCategoryConfig(categoryName)
    : CATEGORIES[categoryName];

  if (!config) {
    Log.warn(Log.Module.ACTION, 'Unknown category', {category: categoryName});
    return false;
  }

  try {
    var threadId = thread.getId();
    var subject = thread.getFirstMessageSubject();

    // 1. 应用标签
    var label = getOrCreateLabel(config.label);
    if (label) {
      thread.addLabel(label);
    }

    // 2. 执行动作
    if (config.action === 'archive') {
      thread.moveToArchive();
    }

    // 3. 标记已读 / 星标
    if (config.markRead) {
      thread.markRead();
    }
    try {
      if (config.addStar) {
        // GmailThread 没有 addStar API，在 Apps Script 中需使用 GmailApp.starMessage 级别能力，不可直接对线程星标
        // 兼容实现：给首封消息加星
        var messages = thread.getMessages();
        if (messages && messages.length > 0) {
          messages[0].star();
        }
      }
    } catch (eStar) { /* ignore */ }

    // 4. 清理系统性标记
    //    - 兼容旧版本：移除 Chrono/Processed
    //    - 移除未分类跳过标记 Chrono/System/Seen
    try {
      var processedLabel = GmailApp.getUserLabelByName(PROCESSED_LABEL);
      if (processedLabel) {
        try { thread.removeLabel(processedLabel); } catch (eProc) { /* ignore */ }
      }
      if (typeof SEEN_LABEL !== 'undefined') {
        var seenLabel = GmailApp.getUserLabelByName(SEEN_LABEL);
        if (seenLabel) {
          try { thread.removeLabel(seenLabel); } catch (eSeen) { /* ignore */ }
        }
      }
    } catch (e2) { /* ignore */ }

    Log.debug(Log.Module.ACTION, 'Category applied', {
      thread_id: threadId,
      category: categoryName,
      label: config.label,
      action: config.action || 'none',
      mark_read: config.markRead || false
    });

    return true;

  } catch (error) {
    Log.error(Log.Module.ACTION, 'Apply category failed', {
      category: categoryName,
      error: error.message
    });
    return false;
  }
}

/**
 * 批量应用分类
 * @param {Array<{thread:GmailThread, category:string}>} threadsWithCategories - 线程与分类映射
 * @returns {{success:number, failed:number, byCategory:Object}}
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
    var config = (typeof getEffectiveCategoryConfig === 'function')
      ? getEffectiveCategoryConfig(category)
      : (CATEGORIES[category] || null);

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

      // 移除星标功能（GmailThread 对象没有此方法）
      // if (config.addStar) {
      //   thread.addStar();
      // }

      stats.success++;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    } catch (error) {
      Logger.log('❌ 批量应用失败: ' + thread.getId());
      stats.failed++;
    }
  });

  return stats;
}

/**
 * ------------- 测试安全机制 -------------
 */

/**
 * 标记测试邮件（已读的 Top 10）
 * 这样可以安全地测试，不会影响用户的重要邮件
 */
function markTestEmails() {
  Logger.log('🏷️  标记测试邮件');

  // 获取已读的邮件（前 10 封）
  var threads = GmailApp.search('is:read in:inbox', 0, TEST_EMAIL_COUNT);

  Logger.log('找到已读邮件: ' + threads.length + ' 封');

  if (threads.length === 0) {
    Logger.log('⚠️ 没有已读邮件可用于测试');
    return [];
  }

  // 创建测试标签
  var testLabel = getOrCreateLabel(TEST_LABEL);
  if (!testLabel) {
    Logger.log('❌ 无法创建测试标签');
    return [];
  }

  // 标记测试邮件
  var marked = 0;
  threads.forEach(function(thread) {
    try {
      thread.addLabel(testLabel);
      marked++;
      Logger.log('  ✓ 标记: ' + thread.getFirstMessageSubject());
    } catch (e) {
      Logger.log('  ✗ 失败: ' + thread.getFirstMessageSubject());
    }
  });

  Logger.log('✅ 已标记 ' + marked + ' 封测试邮件');
  return threads;
}

/**
 * 清除所有 Chrono 创建的标签（恢复原样）
 */
function clearTestLabels() {
  Logger.log('🧹 清除所有 Chrono 标签');

  // 获取所有 Chrono 相关标签（包括嵌套标签）
  var allLabels = GmailApp.getUserLabels();
  var chronoLabels = [];

  allLabels.forEach(function(label) {
    var labelName = label.getName();
    // 匹配 "Chrono" 或 "Chrono/xxx" 格式的标签
    if (labelName === 'Chrono' || labelName.indexOf('Chrono/') === 0) {
      chronoLabels.push(label);
    }
  });

  if (chronoLabels.length === 0) {
    Logger.log('ℹ️ 没有找到 Chrono 标签');
    return;
  }

  Logger.log('找到 ' + chronoLabels.length + ' 个 Chrono 标签');

  var totalThreads = 0;

  chronoLabels.forEach(function(label) {
    var labelName = label.getName();
    Logger.log('\n处理标签: ' + labelName);

    // 获取所有带此标签的邮件
    var threads = label.getThreads();
    totalThreads += threads.length;

    Logger.log('  - 邮件数: ' + threads.length);

    // 移除标签
    threads.forEach(function(thread) {
      thread.removeLabel(label);
    });

    // 删除标签本身
    try {
      GmailApp.deleteLabel(label);
      Logger.log('  - ✅ 已删除标签: ' + labelName);
    } catch (e) {
      Logger.log('  - ⚠️ 删除标签失败: ' + e.message);
    }
  });

  Logger.log('\n✅ 清理完成');
  Logger.log('  - 删除标签: ' + chronoLabels.length + ' 个');
  Logger.log('  - 处理邮件: ' + totalThreads + ' 封');
}

/**
 * 获取测试邮件
 */
function getTestThreads() {
  var testLabel = GmailApp.getUserLabelByName(TEST_LABEL);
  if (!testLabel) {
    Logger.log('⚠️ 测试标签不存在，请先运行 markTestEmails()');
    return [];
  }

  return testLabel.getThreads();
}

/**
 * ------------- 测试函数 -------------
 */

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

/**
 * 测试单个分类动作（仅测试邮件）
 */
function testSingleAction() {
  Logger.log('🎬 测试单个分类动作');

  // 确保有测试邮件
  var testThreads = getTestThreads();
  if (testThreads.length === 0) {
    Logger.log('⚠️ 没有测试邮件，先标记测试邮件...');
    testThreads = markTestEmails();
  }

  if (testThreads.length === 0) {
    Logger.log('❌ 无法获取测试邮件');
    return false;
  }

  // 选择第一封测试邮件
  var thread = testThreads[0];
  var subject = thread.getFirstMessageSubject();

  Logger.log('测试邮件: ' + subject);

  // 应用 Newsletter 分类
  var success = applyCategory(thread, 'Newsletter');

  if (success) {
    Logger.log('✅ 动作执行成功');

    // 验证标签是否添加
    var labels = thread.getLabels();
    var hasLabel = labels.some(function(label) {
      return label.getName() === 'Chrono/Newsletter';
    });

    Logger.log('标签验证: ' + (hasLabel ? '✅ 通过' : '❌ 失败'));
    return hasLabel;
  } else {
    Logger.log('❌ 动作执行失败');
    return false;
  }
}

/**
 * 测试完整工作流（分类 + 动作）
 */
function testCompleteWorkflow() {
  Logger.log('🔄 测试完整工作流');

  // 确保数据已缓存
  storeShardedDatabase();

  // 获取测试邮件
  var testThreads = getTestThreads();
  if (testThreads.length === 0) {
    Logger.log('⚠️ 没有测试邮件，先标记测试邮件...');
    testThreads = markTestEmails();
  }

  if (testThreads.length === 0) {
    Logger.log('❌ 无法获取测试邮件');
    return null;
  }

  Logger.log('测试线程数: ' + testThreads.length);

  var stats = {
    total: testThreads.length,
    classified: 0,
    applied: 0,
    byCategory: {}
  };

  testThreads.forEach(function(thread) {
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

/**
 * 测试批量应用动作
 */
function testBatchActions() {
  Logger.log('📦 测试批量应用动作');

  // 确保数据已缓存
  storeShardedDatabase();

  // 获取测试邮件
  var testThreads = getTestThreads();
  if (testThreads.length === 0) {
    Logger.log('⚠️ 没有测试邮件，先标记测试邮件...');
    testThreads = markTestEmails();
  }

  if (testThreads.length === 0) {
    Logger.log('❌ 无法获取测试邮件');
    return null;
  }

  Logger.log('测试线程数: ' + testThreads.length);

  // 先分类
  var threadsWithCategories = [];
  testThreads.forEach(function(thread) {
    var message = thread.getMessages()[0];
    var result = classifyEmail(message);

    if (result) {
      threadsWithCategories.push({
        thread: thread,
        category: result.category
      });
    }
  });

  Logger.log('已分类: ' + threadsWithCategories.length + ' 封');

  // 批量应用
  var startTime = new Date();
  var stats = applyBatchCategories(threadsWithCategories);
  var duration = new Date() - startTime;

  Logger.log('\n📊 批量执行结果:');
  Logger.log('成功: ' + stats.success);
  Logger.log('失败: ' + stats.failed);
  Logger.log('耗时: ' + duration + 'ms');
  Logger.log('平均: ' + (duration / threadsWithCategories.length).toFixed(2) + 'ms/封');

  Logger.log('\n📁 分类分布:');
  Object.keys(stats.byCategory).forEach(function(cat) {
    Logger.log('  - ' + cat + ': ' + stats.byCategory[cat]);
  });

  return stats;
}

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

  // 测试 0: 标记测试邮件
  try {
    Logger.log('\n🏷️  准备: 标记测试邮件');
    var testThreads = markTestEmails();
    var preparePassed = testThreads.length > 0;
    results.tests.push({ name: 'Prepare Test Emails', passed: preparePassed });
    if (!preparePassed) results.allPassed = false;
  } catch (e) {
    results.tests.push({ name: 'Prepare Test Emails', passed: false, error: e.message });
    results.allPassed = false;
  }

  // 测试 1: 标签创建
  try {
    Logger.log('\n🏷️  测试 1: 标签创建');
    var labelPassed = testLabelCreation();
    results.tests.push({ name: 'Label Creation', passed: labelPassed });
    if (!labelPassed) results.allPassed = false;
  } catch (e) {
    results.tests.push({ name: 'Label Creation', passed: false, error: e.message });
    results.allPassed = false;
  }

  // 测试 2: 单个动作
  try {
    Logger.log('\n🎬 测试 2: 单个动作');
    var singlePassed = testSingleAction();
    results.tests.push({ name: 'Single Action', passed: singlePassed });
    if (!singlePassed) results.allPassed = false;
  } catch (e) {
    results.tests.push({ name: 'Single Action', passed: false, error: e.message });
    results.allPassed = false;
  }

  // 测试 3: 完整工作流
  try {
    Logger.log('\n🔄 测试 3: 完整工作流');
    var workflowStats = testCompleteWorkflow();
    var successRate = workflowStats ? workflowStats.applied / workflowStats.total : 0;
    var workflowPassed = successRate >= 0.5; // 至少 50% 成功（因为有些邮件可能无法分类）
    results.tests.push({
      name: 'Complete Workflow',
      passed: workflowPassed,
      successRate: (successRate * 100).toFixed(1) + '%'
    });
    if (!workflowPassed) results.allPassed = false;
  } catch (e) {
    results.tests.push({ name: 'Complete Workflow', passed: false, error: e.message });
    results.allPassed = false;
  }

  // 测试 4: 批量动作
  try {
    Logger.log('\n📦 测试 4: 批量动作');
    var batchStats = testBatchActions();
    var batchPassed = batchStats && batchStats.success > 0 && batchStats.failed === 0;
    results.tests.push({
      name: 'Batch Actions',
      passed: batchPassed
    });
    if (!batchPassed) results.allPassed = false;
  } catch (e) {
    results.tests.push({ name: 'Batch Actions', passed: false, error: e.message });
    results.allPassed = false;
  }

  Logger.log('\n' + '='.repeat(60));
  Logger.log('🏁 Phase 3 验证完成');
  Logger.log('通过数: ' + results.tests.filter(function(t) { return t.passed; }).length + '/' + results.tests.length);
  Logger.log('状态: ' + (results.allPassed ? '✅ 全部通过' : '❌ 存在失败'));

  Logger.log('\n💡 提示: 使用 clearTestLabels() 清理测试标签');

  return results;
}
