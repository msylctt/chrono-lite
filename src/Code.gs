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
    // 记录运行时间
    var userProps = PropertiesService.getUserProperties();
    var now = new Date().toISOString();
    userProps.setProperty('chrono_last_run', now);

    // 处理最近 1 天的新邮件（避免漏掉）
    var query = 'in:inbox newer_than:1d';
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

    // 2. 处理最近 7 天邮件（快速模式）
    var query = 'in:inbox newer_than:7d';
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
function sendDebugTestEmail() {
  var op = Log.operation(Log.Module.DEBUG_MODE, 'sendDebugTestEmail');

  try {
    var userEmail = Session.getActiveUser().getEmail();

    if (!userEmail) {
      op.fail(new Error('Unable to get user email'), {});
      return;
    }

    // 获取当前时间
    var now = new Date();
    var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // 模拟一封 Newsletter 邮件
    var testEmails = [
      {
        from: 'newsletter@stratechery.com',
        subject: '[Test] Stratechery Newsletter - ' + timestamp,
        body: 'This is a test email from Chrono Lite Debug Mode.\n\n' +
              'Timestamp: ' + timestamp + '\n\n' +
              'This email should be automatically classified as Newsletter.'
      },
      {
        from: 'news@morningbrew.com',
        subject: '[Test] Morning Brew Daily - ' + timestamp,
        body: 'This is a test email from Chrono Lite Debug Mode.\n\n' +
              'Timestamp: ' + timestamp + '\n\n' +
              'This email should be automatically classified as Newsletter.'
      }
    ];

    // 随机选择一个测试邮件
    var testEmail = testEmails[Math.floor(Math.random() * testEmails.length)];

    // 发送邮件给自己
    GmailApp.sendEmail(
      userEmail,
      testEmail.subject,
      testEmail.body,
      {
        from: userEmail,
        name: testEmail.from.split('@')[0],
        replyTo: testEmail.from
      }
    );

    // 记录发送时间
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_debug_last_email', now.toISOString());

    op.success({
      recipient: userEmail,
      mock_sender: testEmail.from,
      subject: testEmail.subject
    });

  } catch (error) {
    op.fail(error, {});
  }
}

/**
 * 创建 Debug 模式触发器（每小时发送测试邮件）
 */
function createDebugEmailTrigger() {
  var op = Log.operation(Log.Module.DEBUG_MODE, 'createDebugEmailTrigger');

  try {
    // 删除现有的 Debug 触发器
    deleteDebugEmailTrigger();

    // 创建每小时触发器
    ScriptApp.newTrigger('sendDebugTestEmail')
      .timeBased()
      .everyHours(1)
      .create();

    // 记录启用时间
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_debug_mode', 'true');
    userProps.setProperty('chrono_debug_enabled_at', new Date().toISOString());

    op.success({interval: '1hour'});

  } catch (error) {
    op.fail(error, {});
  }
}

/**
 * 删除 Debug 模式触发器
 */
function deleteDebugEmailTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var deleted = 0;

  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDebugTestEmail') {
      var triggerId = triggers[i].getUniqueId();
      ScriptApp.deleteTrigger(triggers[i]);
      deleted++;
      Log.debug(Log.Module.DEBUG_MODE, 'Deleted debug trigger', {trigger_id: triggerId});
    }
  }

  // 清除 Debug 模式标记
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteProperty('chrono_debug_mode');

  if (deleted > 0) {
    Log.info(Log.Module.DEBUG_MODE, 'Debug mode disabled', {triggers_deleted: deleted});
  }
}

/**
 * 获取 Debug 模式状态
 */
function getDebugModeStatus() {
  var userProps = PropertiesService.getUserProperties();
  var debugMode = userProps.getProperty('chrono_debug_mode') === 'true';
  var enabledAt = userProps.getProperty('chrono_debug_enabled_at');
  var lastEmail = userProps.getProperty('chrono_debug_last_email');

  return {
    enabled: debugMode,
    enabledAt: enabledAt,
    lastEmail: lastEmail
  };
}
