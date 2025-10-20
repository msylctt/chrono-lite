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
 * @returns {void}
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

    // 处理最近 1 天的新邮件（避免漏掉），跳过已处理标签
    var query = 'in:inbox newer_than:1d -label:"' + PROCESSED_LABEL + '"';
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
 * @returns {void}
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

    // 2. 处理最近 7 天邮件（快速模式），跳过已处理标签
    var query = 'in:inbox newer_than:7d -label:"' + PROCESSED_LABEL + '"';
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
 * 运行此函数会触发授权对话框，授予触发器管理权限
 * @returns {string}
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
 * @returns {boolean}
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
 * @returns {void}
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
// 已由 Database.gs 提供 testDatabaseConnection()

/**
 * 提取邮件地址
 */
// 统一使用 Classifier.gs 中的 extractEmail()

/**
 * ==========================================
 * 自动化触发器管理
 * ==========================================
 */

/**
 * 确保触发器存在（自我修复机制）
 * 在 autoProcessInbox 中调用，防止触发器意外丢失
 * @returns {void}
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
 * @param {string} interval - 触发间隔，可选值：'1hour'|'2hour'|'4hour'|'6hour'|'12hour'|'24hour'
 * @returns {void}
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
 * @returns {void}
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
 * @returns {{enabled:boolean, createdAt?:string, lastRun?:string, lastProcessed?:string, nextRun?:string, interval:string, message:string, hint?:string}}
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
 * @param {string} interval
 * @returns {number}
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
 * @param {string} interval
 * @returns {string}
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

    // 构造更易命中启发式规则的测试邮件配置
    // - 主题包含 Newsletter 关键词或 Marketing 关键词
    // - 显示名包含常见平台域名（substack/beehiiv/convertkit/mailchimp/sendgrid）
    var testEmails = [
      // Newsletter via subject keyword + platform domain in display name
      {
        from: 'newsletter@stratechery.com',
        displayName: 'newsletter@substack.com', // 触发 platform_domain: substack.com
        subject: '[Test] Weekly Digest Newsletter - ' + timestamp, // 触发 "newsletter" / "weekly digest"
        body: 'Chrono Lite Debug Mode Test\n\nThis should match Newsletter via subject keywords and platform domain.\nTimestamp: ' + timestamp,
        replyTo: 'newsletter@stratechery.com'
      },
      // Newsletter via platform domain (beehiiv) + subject keyword
      {
        from: 'daily@morningbrew.com',
        displayName: 'newsletter@beehiiv.com', // 触发 platform_domain: beehiiv.com
        subject: '[Test] Daily Brief Newsletter - ' + timestamp, // 触发 "daily brief"
        body: 'Chrono Lite Debug Mode Test (beehiiv)\nTimestamp: ' + timestamp,
        replyTo: 'news@morningbrew.com'
      },
      // Marketing via subject keyword
      {
        from: 'offers@shop.com',
        displayName: 'mailer@mailchimp.com', // 触发 platform_domain: mailchimp.com
        subject: '[Test] Limited-time sale! Exclusive discount offer - ' + timestamp, // 触发 "sale/discount/offer"
        body: 'Marketing promo test. Should classify as Marketing via heuristics.\nTimestamp: ' + timestamp,
        replyTo: 'offers@shop.com'
      },
      // Update summary (should fall into Newsletter via keyword list)
      {
        from: 'updates@product.com',
        displayName: 'noreply@sendgrid.net', // 触发 platform_domain: sendgrid.net
        subject: '[Test] Monthly update summary - ' + timestamp, // 触发 "update summary"
        body: 'Product update summary test.\nTimestamp: ' + timestamp,
        replyTo: 'updates@product.com'
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
        name: testEmail.displayName, // 显示名包含平台域名，命中 platform_domain 启发式
        replyTo: testEmail.replyTo
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
