/**
 * Chrono Lite - Gmail 自动化分类工具
 *
 * 主逻辑文件
 *
 * @author Chrono Lite Team
 * @version 2.0.0
 */

/**
 * 自动处理收件箱（定时触发器调用）
 */
function autoProcessInbox() {
  var op = Log.operation(Log.Module.TRIGGER, 'autoProcessInbox');

  try {
    // 0. 健康检查：确保触发器存在（自我修复机制）
    ensureTriggerExists();

    // 1. 记录运行时间
    var userProps = PropertiesService.getUserProperties();
    var now = new Date().toISOString();
    userProps.setProperty('chrono_last_run', now);

    // 处理最近 1 天的新邮件（避免漏掉），跳过系统“已看过”标签（未分类缓存）
    var query = 'in:inbox newer_than:1d -label:"' + SEEN_LABEL + '"';
    var threads = GmailApp.search(query, 0, 100);

    if (threads.length === 0) {
      Log.info(Log.Module.TRIGGER, 'No new emails to process', {query: query});
      userProps.setProperty('chrono_last_processed', '0');
      op.success({processed: 0, found: 0});
      return;
    }

    Log.info(Log.Module.TRIGGER, 'Found threads to process', {
      query: query,
      thread_count: threads.length
    });

    var processed = 0;
    var failed = 0;
    var categoryStats = {};

    threads.forEach(function(thread, index) {
      try {
        var message = thread.getMessages()[0];
        var result = classifyEmail(message);

        if (result) {
          applyCategory(thread, result.category);
          processed++;
          categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;
        }
        // 未分类：打上 System/Seen，结合 TTL 作为短期跳过标记
        else {
          try {
            var seenLabel = GmailApp.getUserLabelByName(SEEN_LABEL) || GmailApp.createLabel(SEEN_LABEL);
            thread.addLabel(seenLabel);
            // 记录 TTL 时间戳
            var props = PropertiesService.getUserProperties();
            var key = 'seen:' + thread.getId();
            props.setProperty(key, '' + Date.now());
          } catch (eSeen) { /* ignore */ }
        }
      } catch (error) {
        failed++;
        Log.error(Log.Module.TRIGGER, 'Failed to process thread', {
          thread_id: thread.getId(),
          error: error.message,
          index: index
        });
      }
    });

    // 记录处理数量
    userProps.setProperty('chrono_last_processed', processed.toString());

    // 清理过期的 System/Seen（TTL）
    try {
      var propsClean = PropertiesService.getUserProperties();
      var allProps = propsClean.getProperties();
      var now = Date.now();
      var ttlMs = (SEEN_TTL_DAYS || 7) * 24 * 60 * 60 * 1000;
      var seenLabelClean = GmailApp.getUserLabelByName(SEEN_LABEL);
      for (var k in allProps) {
        if (allProps.hasOwnProperty(k) && k.indexOf('seen:') === 0) {
          var ts = parseInt(allProps[k], 10) || 0;
          if (ts && (now - ts) > ttlMs) {
            var threadId = k.substring(5);
            try {
              var th = GmailApp.getThreadById(threadId);
              if (th && seenLabelClean) th.removeLabel(seenLabelClean);
            } catch (eRm) { /* ignore */ }
            try { propsClean.deleteProperty(k); } catch (eDel) { /* ignore */ }
          }
        }
      }
    } catch (eTTL) { /* ignore */ }

    op.success({
      found: threads.length,
      processed: processed,
      failed: failed,
      categories: JSON.stringify(categoryStats)
    });

  } catch (error) {
    op.fail(error, {});
  }
}

/**
 * 初始化设置（首次运行）
 */
function initialSetup() {
  var op = Log.operation(Log.Module.INIT, 'initialSetup');

  try {
    // 1. 加载数据库
    var meta = loadSenderDatabase();

    if (!meta) {
      op.fail(new Error('Database load failed'), {});
      return;
    }

    Log.info(Log.Module.INIT, 'Database loaded', {
      total_entries: meta.totalEntries,
      shard_count: meta.shardCount,
      version: meta.version
    });

    // 2. 处理最近 7 天邮件（快速模式），跳过系统“已看过”标签（未分类缓存）
    var query = 'in:inbox newer_than:7d -label:"' + SEEN_LABEL + '"';
    var threads = GmailApp.search(query, 0, 100);

    Log.info(Log.Module.INIT, 'Scanning inbox', {
      query: query,
      found: threads.length
    });

    var stats = {
      total: threads.length,
      processed: 0,
      failed: 0,
      byCategory: {}
    };

    threads.forEach(function(thread, index) {
      try {
        var message = thread.getMessages()[0];
        var result = classifyEmail(message);

        if (result) {
          applyCategory(thread, result.category);
          stats.processed++;
          stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
        }
        else {
          try {
            var seenLabel2 = GmailApp.getUserLabelByName(SEEN_LABEL) || GmailApp.createLabel(SEEN_LABEL);
            thread.addLabel(seenLabel2);
            var props2 = PropertiesService.getUserProperties();
            props2.setProperty('seen:' + thread.getId(), '' + Date.now());
          } catch (eSeen2) { /* ignore */ }
        }
      } catch (error) {
        stats.failed++;
        Log.error(Log.Module.INIT, 'Failed to process thread', {
          index: index,
          error: error.message
        });
      }
    });

    // 3. 标记已初始化
    PropertiesService.getUserProperties()
      .setProperty('chrono_initialized', 'true');

    // 4. 自动创建触发器（确保自动化启用）
    try {
      createAutoProcessTrigger('1hour'); // 默认每小时
      Log.info(Log.Module.INIT, 'Auto-process trigger created', {interval: '1hour'});
    } catch (triggerError) {
      Log.error(Log.Module.INIT, 'Failed to create trigger', {error: triggerError.message});
      // 不阻断初始化流程
    }

    op.success({
      total: stats.total,
      processed: stats.processed,
      failed: stats.failed,
      categories: JSON.stringify(stats.byCategory)
    });

  } catch (error) {
    op.fail(error, {});
  }
}

/**
 * 授权辅助函数（在 Apps Script 编辑器中运行）
 *
 * 运行此函数会触发授权对话框，授予触发器管理权限
 */
function authorizeChronoLite() {
  Logger.log('🔑 开始授权流程...');

  try {
    // 尝试访问触发器（会触发授权）
    var triggers = ScriptApp.getProjectTriggers();
    Logger.log('✅ 授权成功！');
    Logger.log('📊 当前触发器数量: ' + triggers.length);

    // 显示现有触发器
    triggers.forEach(function(trigger) {
      Logger.log('  - ' + trigger.getHandlerFunction() + ' (' + trigger.getTriggerSource() + ')');
    });

    return '授权完成！现在可以返回 Gmail 使用自动化功能了。';

  } catch (error) {
    Logger.log('❌ 授权失败: ' + error.message);
    return '授权失败，请重试。';
  }
}

/**
 * 手动创建触发器（在 Apps Script 编辑器中运行）
 * 用于调试和修复触发器问题
 */
function manuallyCreateTrigger() {
  Logger.log('🔧 手动创建触发器...');

  try {
    // 先删除现有触发器
    var triggers = ScriptApp.getProjectTriggers();
    var deletedCount = 0;

    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'autoProcessInbox') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      Logger.log('🗑️  删除了 ' + deletedCount + ' 个旧触发器');
    }

    // 创建新触发器
    createAutoProcessTrigger('1hour');

    // 验证
    triggers = ScriptApp.getProjectTriggers();
    var hasAutoTrigger = false;

    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'autoProcessInbox') {
        hasAutoTrigger = true;
        Logger.log('✅ 触发器创建成功！');
        Logger.log('  - ID: ' + trigger.getUniqueId());
        Logger.log('  - 函数: ' + trigger.getHandlerFunction());
        Logger.log('  - 间隔: 每小时');
      }
    });

    if (!hasAutoTrigger) {
      Logger.log('❌ 触发器创建失败，请检查权限');
      return false;
    }

    return true;

  } catch (error) {
    Logger.log('❌ 创建触发器失败: ' + error.message);
    Logger.log('💡 请确保已运行 authorizeChronoLite() 获取权限');
    return false;
  }
}

/**
 * 诊断触发器问题（在 Apps Script 编辑器中运行）
 * 完整检查触发器状态、权限和配置
 */
function diagnoseTriggerIssue() {
  Logger.log('='.repeat(60));
  Logger.log('🔍 Chrono Lite 触发器诊断');
  Logger.log('='.repeat(60));

  // 1. 检查触发器权限
  Logger.log('\n📋 步骤 1: 检查触发器权限');
  try {
    var triggers = ScriptApp.getProjectTriggers();
    Logger.log('✅ 有触发器权限 (ScriptApp.getProjectTriggers)');
  } catch (e) {
    Logger.log('❌ 没有触发器权限: ' + e.message);
    Logger.log('💡 解决方案: 运行 authorizeChronoLite() 函数');
    return;
  }

  // 2. 列出所有触发器
  Logger.log('\n📋 步骤 2: 列出所有触发器');
  Logger.log('当前项目触发器总数: ' + triggers.length);

  if (triggers.length === 0) {
    Logger.log('⚠️  没有任何触发器');
  } else {
    triggers.forEach(function(t, index) {
      Logger.log('  ' + (index + 1) + '. 函数: ' + t.getHandlerFunction());
      Logger.log('     来源: ' + t.getTriggerSource());
      Logger.log('     ID: ' + t.getUniqueId());
    });
  }

  // 3. 检查 autoProcessInbox 触发器
  Logger.log('\n📋 步骤 3: 检查 autoProcessInbox 触发器');
  var autoTriggers = [];
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'autoProcessInbox') {
      autoTriggers.push(t);
    }
  });

  if (autoTriggers.length === 0) {
    Logger.log('❌ autoProcessInbox 触发器不存在');
    Logger.log('💡 解决方案: 运行 manuallyCreateTrigger() 函数');
  } else if (autoTriggers.length === 1) {
    Logger.log('✅ autoProcessInbox 触发器存在');
    var t = autoTriggers[0];
    Logger.log('  - ID: ' + t.getUniqueId());
    Logger.log('  - 事件源: ' + t.getTriggerSource());
    Logger.log('  - 事件类型: ' + t.getEventType());
  } else {
    Logger.log('⚠️  发现 ' + autoTriggers.length + ' 个重复的 autoProcessInbox 触发器');
    Logger.log('💡 解决方案: 运行 manuallyCreateTrigger() 清理并重建');
  }

  // 4. 检查 Debug 模式触发器
  Logger.log('\n📋 步骤 4: 检查 Debug 模式触发器');
  var debugTriggers = [];
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDebugTestEmail') {
      debugTriggers.push(t);
    }
  });

  if (debugTriggers.length === 0) {
    Logger.log('ℹ️  Debug 模式未启用');
  } else {
    Logger.log('✅ Debug 模式已启用 (' + debugTriggers.length + ' 个触发器)');
  }

  // 5. 检查用户属性
  Logger.log('\n📋 步骤 5: 检查用户属性 (PropertiesService)');
  var props = PropertiesService.getUserProperties();
  var allProps = props.getProperties();

  var chronoProps = {
    'chrono_initialized': props.getProperty('chrono_initialized'),
    'chrono_trigger_created': props.getProperty('chrono_trigger_created'),
    'chrono_trigger_interval': props.getProperty('chrono_trigger_interval'),
    'chrono_last_run': props.getProperty('chrono_last_run'),
    'chrono_last_processed': props.getProperty('chrono_last_processed'),
    'chrono_debug_mode': props.getProperty('chrono_debug_mode')
  };

  Object.keys(chronoProps).forEach(function(key) {
    var value = chronoProps[key];
    if (value) {
      Logger.log('  ✅ ' + key + ': ' + value);
    } else {
      Logger.log('  ⚪ ' + key + ': (未设置)');
    }
  });

  // 6. 检查数据库状态
  Logger.log('\n📋 步骤 6: 检查数据库缓存状态');
  try {
    var meta = getCacheMeta();
    if (meta) {
      Logger.log('✅ 数据库缓存已初始化');
      Logger.log('  - 版本: ' + meta.version);
      Logger.log('  - 分片数: ' + meta.shardCount);
      Logger.log('  - 总条目数: ' + meta.totalEntries);
      Logger.log('  - 最后更新: ' + meta.lastUpdated);
    } else {
      Logger.log('⚠️  数据库缓存未初始化');
      Logger.log('💡 解决方案: 运行 storeShardedDatabase() 函数');
    }
  } catch (e) {
    Logger.log('❌ 无法检查数据库缓存: ' + e.message);
  }

  // 7. 生成诊断报告
  Logger.log('\n' + '='.repeat(60));
  Logger.log('📊 诊断总结');
  Logger.log('='.repeat(60));

  var issues = [];
  var warnings = [];

  if (autoTriggers.length === 0) {
    issues.push('❌ autoProcessInbox 触发器缺失');
  }

  if (!chronoProps.chrono_initialized) {
    warnings.push('⚠️  系统未初始化 (chrono_initialized)');
  }

  if (!chronoProps.chrono_trigger_created) {
    warnings.push('⚠️  触发器创建时间未记录');
  }

  if (!chronoProps.chrono_last_run) {
    warnings.push('⚠️  触发器从未运行过');
  }

  if (issues.length === 0 && warnings.length === 0) {
    Logger.log('✅ 所有检查通过！系统运行正常。');
  } else {
    if (issues.length > 0) {
      Logger.log('\n🚨 发现 ' + issues.length + ' 个问题:');
      issues.forEach(function(issue) {
        Logger.log('  ' + issue);
      });
    }

    if (warnings.length > 0) {
      Logger.log('\n⚠️  发现 ' + warnings.length + ' 个警告:');
      warnings.forEach(function(warning) {
        Logger.log('  ' + warning);
      });
    }

    Logger.log('\n💡 推荐操作:');
    if (autoTriggers.length === 0) {
      Logger.log('  1. 运行 manuallyCreateTrigger() 创建触发器');
    }
    if (!chronoProps.chrono_initialized) {
      Logger.log('  2. 运行 initialSetup() 初始化系统');
    }
    Logger.log('  3. 等待 1 小时后检查日志，查看触发器是否运行');
  }

  Logger.log('\n' + '='.repeat(60));
  Logger.log('🏁 诊断完成');
  Logger.log('='.repeat(60));
}

/**
 * 测试数据库连接
 */
function testDatabaseConnection() {
  var op = Log.operation(Log.Module.DATABASE, 'testDatabaseConnection');

  try {
    var meta = loadSenderDatabase();

    if (!meta) {
      op.fail(new Error('Database connection failed'), {});
      return;
    }

    Log.info(Log.Module.DATABASE, 'Database connection successful', {
      version: meta.version || 'unknown',
      shard_count: meta.shardCount,
      total_entries: meta.totalEntries,
      last_updated: meta.lastUpdated
    });

    // 测试查询
    var testEmail = 'newsletter@stratechery.com';
    var result = querySender(testEmail);

    if (result) {
      Log.info(Log.Module.DATABASE, 'Query test successful', {
        email: testEmail,
        category: result.category
      });
    } else {
      Log.warn(Log.Module.DATABASE, 'Query test returned no result', {
        email: testEmail
      });
    }

    op.success({
      db_entries: meta.totalEntries,
      query_test: result ? 'success' : 'not_found'
    });

  } catch (error) {
    op.fail(error, {});
  }
}

/**
 * 提取邮件地址
 */
function extractEmail(fromString) {
  var match = fromString.match(/<(.+?)>/);
  return match ? match[1] : fromString;
}

/**
 * ==========================================
 * 自动化触发器管理
 * ==========================================
 */

/**
 * 确保触发器存在（自我修复机制）
 * 在 autoProcessInbox 中调用，防止触发器意外丢失
 */
function ensureTriggerExists() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var hasAutoTrigger = false;

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'autoProcessInbox') {
        hasAutoTrigger = true;
        break;
      }
    }

    if (!hasAutoTrigger) {
      Log.warn(Log.Module.TRIGGER, 'Auto-process trigger missing, recreating', {});
      var userProps = PropertiesService.getUserProperties();
      var interval = userProps.getProperty('chrono_trigger_interval') || '1hour';
      createAutoProcessTrigger(interval);
      Log.info(Log.Module.TRIGGER, 'Trigger auto-recreated', {interval: interval});
    }
  } catch (error) {
    // 如果没有触发器权限，静默失败（避免阻断邮件处理）
    Log.debug(Log.Module.TRIGGER, 'Trigger check skipped', {
      reason: 'No ScriptApp permission or error',
      error: error.message
    });
  }
}

/**
 * 创建定时触发器（支持自定义周期）
 * @param {string} interval - 触发间隔，可选值：'1hour', '2hour', '4hour', '6hour', '12hour', '24hour'
 */
function createAutoProcessTrigger(interval) {
  var op = Log.operation(Log.Module.TRIGGER, 'createAutoProcessTrigger');

  try {
    // 删除现有触发器
    deleteAutoProcessTrigger();

    // 获取用户配置的间隔（如果未传参数）
    if (!interval) {
      var userProps = PropertiesService.getUserProperties();
      interval = userProps.getProperty('chrono_trigger_interval') || '1hour';
    }

    var trigger = ScriptApp.newTrigger('autoProcessInbox').timeBased();

    // 根据间隔设置触发器（Gmail Add-on 最小间隔 1 小时）
    switch (interval) {
      case '1hour':
        trigger.everyHours(1);
        break;
      case '2hour':
        trigger.everyHours(2);
        break;
      case '4hour':
        trigger.everyHours(4);
        break;
      case '6hour':
        trigger.everyHours(6);
        break;
      case '12hour':
        trigger.everyHours(12);
        break;
      case '24hour':
        trigger.everyDays(1);
        break;
      default:
        trigger.everyHours(1);
        interval = '1hour'; // 标准化
        break;
    }

    trigger.create();

    // 记录创建时间和间隔
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_trigger_created', new Date().toISOString());
    userProps.setProperty('chrono_trigger_interval', interval);

    op.success({interval: interval});

  } catch (error) {
    op.fail(error, {interval: interval});
  }
}

/**
 * 删除自动处理触发器
 */
function deleteAutoProcessTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var deleted = 0;

  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoProcessInbox') {
      var triggerId = triggers[i].getUniqueId();
      ScriptApp.deleteTrigger(triggers[i]);
      deleted++;
      Log.debug(Log.Module.TRIGGER, 'Deleted trigger', {trigger_id: triggerId});
    }
  }

  if (deleted > 0) {
    Log.info(Log.Module.TRIGGER, 'Deleted auto-process triggers', {count: deleted});
  }
}

/**
 * 获取触发器状态（基于 PropertiesService，不需要触发器权限）
 */
function getTriggerStatus() {
  var userProps = PropertiesService.getUserProperties();
  var createdAt = userProps.getProperty('chrono_trigger_created');
  var lastRun = userProps.getProperty('chrono_last_run');
  var lastProcessed = userProps.getProperty('chrono_last_processed') || '0';
  var interval = userProps.getProperty('chrono_trigger_interval') || '1hour';

  // 检查触发器是否已创建
  if (!createdAt) {
    return {
      enabled: false,
      message: '自动化未启用',
      hint: '完成初始化后自动启用',
      interval: interval
    };
  }

  // 计算间隔毫秒数
  var intervalMs = getIntervalMilliseconds(interval);

  // 计算下次运行时间（基于上次运行时间）
  var nextRun = null;
  if (lastRun) {
    nextRun = new Date(new Date(lastRun).getTime() + intervalMs);
  } else {
    // 如果没有运行记录，使用创建时间估算
    nextRun = new Date(new Date(createdAt).getTime() + intervalMs);
  }

  // 生成友好的消息
  var intervalLabel = getIntervalLabel(interval);

  return {
    enabled: true,
    createdAt: createdAt,
    lastRun: lastRun,
    lastProcessed: lastProcessed,
    nextRun: nextRun ? nextRun.toISOString() : null,
    interval: interval,
    message: intervalLabel + '自动运行'
  };
}

/**
 * 获取间隔毫秒数
 */
function getIntervalMilliseconds(interval) {
  switch (interval) {
    case '1hour':
      return 1 * 60 * 60 * 1000;
    case '2hour':
      return 2 * 60 * 60 * 1000;
    case '4hour':
      return 4 * 60 * 60 * 1000;
    case '6hour':
      return 6 * 60 * 60 * 1000;
    case '12hour':
      return 12 * 60 * 60 * 1000;
    case '24hour':
      return 24 * 60 * 60 * 1000;
    default:
      return 1 * 60 * 60 * 1000;
  }
}

/**
 * 获取间隔友好标签
 */
function getIntervalLabel(interval) {
  switch (interval) {
    case '1hour':
      return '每小时';
    case '2hour':
      return '每 2 小时';
    case '4hour':
      return '每 4 小时';
    case '6hour':
      return '每 6 小时';
    case '12hour':
      return '每 12 小时';
    case '24hour':
      return '每天';
    default:
      return '每小时';
  }
}

/**
 * 获取触发器状态（管理员版本，需要触发器权限）
 * 仅在 Apps Script 编辑器中使用，不在 Add-on UI 中调用
 */
function getTriggerStatusAdmin() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var autoTrigger = null;

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'autoProcessInbox') {
        autoTrigger = triggers[i];
        break;
      }
    }

    if (!autoTrigger) {
      Logger.log('⚠️ 未找到自动化触发器');
      return {
        enabled: false,
        message: '自动化未启用'
      };
    }

    Logger.log('✅ 触发器已启用');
    Logger.log('  - ID: ' + autoTrigger.getUniqueId());
    Logger.log('  - 函数: ' + autoTrigger.getHandlerFunction());
    Logger.log('  - 类型: ' + autoTrigger.getTriggerSource());

    return {
      enabled: true,
      triggerId: autoTrigger.getUniqueId(),
      message: '触发器运行正常'
    };

  } catch (error) {
    Logger.log('❌ 获取触发器失败: ' + error.message);
    return {
      enabled: false,
      error: error.message
    };
  }
}

/**
 * ==========================================
 * Debug 模式 - 自动发送测试邮件
 * ==========================================
 */

/**
 * 发送测试邮件（模拟 Newsletter）
 */
// sendDebugTestEmail 已移除（不再构造与发送测试数据）

/**
 * 创建 Debug 模式触发器（每小时发送测试邮件）
 */
// createDebugEmailTrigger 已移除（不再构造与发送测试数据）

/**
 * 删除 Debug 模式触发器
 */
// deleteDebugEmailTrigger 已移除（由 clearClassifierTestData 内联处理）

/**
 * 获取 Debug 模式状态
 */
// getDebugModeStatus 已移除（不再维护 Debug 模式状态）

/**
 * 清空测试邮件数据（将匹配到的测试线程移入回收站，并清理调试属性与触发器）
 * @param {number} days 可选，仅清理最近 N 天（默认 30 天）
 */
function clearClassifierTestData(days) {
  var op = Log.operation(Log.Module.DEBUG_MODE, 'clearClassifierTestData');

  try {
    var userEmail = Session.getActiveUser().getEmail();
    var n = (typeof days === 'number' && days > 0) ? Math.floor(days) : 30;

    // 仅清理我们生成的测试邮件：主题前缀为 [Test] 且发件人为当前账户
    var query = 'subject:"[Test]" from:(' + userEmail + ') newer_than:' + n + 'd';
    var threads = GmailApp.search(query, 0, 500);

    var removed = 0;
    var testLabel = GmailApp.getUserLabelByName(TEST_LABEL);

    for (var i = 0; i < threads.length; i++) {
      try {
        if (testLabel) {
          try { threads[i].removeLabel(testLabel); } catch (eLab) { /* ignore */ }
        }
        threads[i].moveToTrash();
        removed++;
      } catch (eMove) {
        Log.warn(Log.Module.DEBUG_MODE, 'Move to trash failed', { error: eMove.message });
      }
    }

    // 清理 Debug 属性
    try {
      var props = PropertiesService.getUserProperties();
      props.deleteProperty('chrono_debug_last_email');
      props.deleteProperty('chrono_debug_mode');
      props.deleteProperty('chrono_debug_enabled_at');
    } catch (eProps) { /* ignore */ }

    // 关闭历史残留 Debug 触发器（兼容老版本 sendDebugTestEmail 名称）
    try {
      var triggers = ScriptApp.getProjectTriggers();
      var deleted = 0;
      for (var t = 0; t < triggers.length; t++) {
        if (triggers[t].getHandlerFunction && triggers[t].getHandlerFunction() === 'sendDebugTestEmail') {
          ScriptApp.deleteTrigger(triggers[t]);
          deleted++;
        }
      }
      if (deleted > 0) {
        Log.info(Log.Module.DEBUG_MODE, 'Deleted legacy debug triggers', { count: deleted });
      }
    } catch (eTrig) { /* ignore */ }

    op.success({ query: query, found: threads.length, removed: removed });

  } catch (error) {
    op.fail(error, {});
  }
}
/**
 * 发送一批分类器测试邮件到当前用户邮箱（手动运行）
 * 覆盖：Newsletter / Marketing / OTP / Orders / Shipping / Bills / Footer Unsubscribe / Product Updates
 */
function sendClassifierTestBatch() {
  var op = Log.operation(Log.Module.DEBUG_MODE, 'sendClassifierTestBatch');

  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      op.fail(new Error('Unable to get active user email'), {});
      return;
    }

    var now = new Date();
    var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    var footerUnsub = '\n\n—\nManage preferences | Unsubscribe\nIf you wish to unsubscribe, click here.';

    var cases = [
      // Newsletter via subject keywords + footer unsubscribe
      {
        name: 'Newsletter',
        subject: '[Test] Weekly Digest Newsletter - ' + ts,
        body: 'This is a newsletter test email.\nIt should match newsletter heuristics. ' + footerUnsub,
        displayName: 'newsletter@substack.com',
        replyTo: 'newsletter@test.example'
      },
      // Marketing via subject keywords
      {
        name: 'Marketing',
        subject: '[Test] Big SALE today: exclusive discount offer - ' + ts,
        body: 'Limited-time sale and discount offer!',
        displayName: 'mailer@mailchimp.com',
        replyTo: 'offers@test.example'
      },
      // Security / OTP via subject + body fallback
      {
        name: 'Security OTP',
        subject: '[Test] Your verification code (OTP) - ' + ts,
        body: 'Your verification code is 123456.\nAlternatively, code: 654321',
        displayName: 'no-reply@security.example',
        replyTo: 'security@test.example'
      },
      // Orders
      {
        name: 'Order',
        subject: '[Test] Order confirmation #12345 and receipt - ' + ts,
        body: 'Thanks for your purchase. This email confirms your order.',
        displayName: 'orders@shop.example',
        replyTo: 'orders@test.example'
      },
      // Shipping
      {
        name: 'Shipping',
        subject: '[Test] Shipping update: tracking available - ' + ts,
        body: 'Your item has shipped. Tracking number: 1Z999AA10123456784',
        displayName: 'shipping@shop.example',
        replyTo: 'shipping@test.example'
      },
      // Bills / Invoice / Due
      {
        name: 'Bills',
        subject: '[Test] Invoice statement and payment due - ' + ts,
        body: 'Your bill is due soon. Invoice attached (simulated).',
        displayName: 'billing@service.example',
        replyTo: 'billing@test.example'
      },
      // Footer Unsubscribe only (content-layer)
      {
        name: 'Footer Unsubscribe',
        subject: '[Test] Latest updates - ' + ts,
        body: 'Here are the latest updates.' + footerUnsub,
        displayName: 'nl@brand.example',
        replyTo: 'newsletter@test.example'
      },
      // Product Updates (update summary)
      {
        name: 'Product Updates',
        subject: '[Test] Monthly update summary - ' + ts,
        body: 'Product update summary for this month. ' + footerUnsub,
        displayName: 'updates@product.example',
        replyTo: 'updates@test.example'
      },
      // Travel - Flight
      {
        name: 'Travel Flight',
        subject: '[Test] Flight itinerary and boarding pass - ' + ts,
        body: 'Your flight itinerary is confirmed. Boarding pass available soon.',
        displayName: 'no-reply@airline.example',
        replyTo: 'support@airline.example'
      },
      // Travel - Hotel
      {
        name: 'Travel Hotel',
        subject: '[Test] Hotel reservation confirmation - ' + ts,
        body: 'Your hotel booking has been confirmed. Check-in details enclosed.',
        displayName: 'booking@hotel.example',
        replyTo: 'booking@hotel.example'
      }
    ];

    var sent = 0;
    for (var i = 0; i < cases.length; i++) {
      var c = cases[i];
      try {
        GmailApp.sendEmail(
          userEmail,
          c.subject,
          c.body,
          {
            from: userEmail, // 使用自身地址（别名未配置时忽略）
            name: c.displayName,
            replyTo: c.replyTo
          }
        );
        Utilities.sleep(250); // 轻微节流
        sent++;
      } catch (eSend) {
        Log.warn(Log.Module.DEBUG_MODE, 'Test email send failed', { name: c.name, error: eSend.message });
      }
    }

    op.success({ total: cases.length, sent: sent });

  } catch (error) {
    op.fail(error, {});
  }
}
