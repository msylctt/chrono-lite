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
  Logger.log('🚀 开始自动处理收件箱...');

  // 记录运行时间
  var userProps = PropertiesService.getUserProperties();
  var now = new Date().toISOString();
  userProps.setProperty('chrono_last_run', now);

  // 仅处理最近 1 小时的新邮件
  var query = 'in:inbox newer_than:1h';
  var threads = GmailApp.search(query, 0, 50);

  if (threads.length === 0) {
    Logger.log('ℹ️  没有新邮件需要处理');
    userProps.setProperty('chrono_last_processed', '0');
    return;
  }

  Logger.log('📧 找到 ' + threads.length + ' 个对话');
  var processed = 0;

  threads.forEach(function(thread) {
    try {
      var message = thread.getMessages()[0];
      var result = classifyEmail(message);

      if (result) {
        applyCategory(thread, result.category);
        processed++;
      }
    } catch (error) {
      Logger.log('❌ 处理邮件失败: ' + error.message);
    }
  });

  Logger.log('✅ 定时任务完成，处理 ' + processed + ' 封邮件');

  // 记录处理数量
  userProps.setProperty('chrono_last_processed', processed.toString());
}

/**
 * 初始化设置（首次运行）
 */
function initialSetup() {
  Logger.log('🎉 开始初始化 Chrono Lite...');

  // 1. 加载数据库
  Logger.log('📥 加载发件人数据库...');
  var meta = loadSenderDatabase();

  if (!meta) {
    Logger.log('❌ 数据库加载失败');
    return;
  }

  Logger.log('✅ 数据库已加载：' + meta.totalEntries + ' 条记录');

  // 2. 处理最近 7 天邮件（快速模式）
  Logger.log('📧 扫描收件箱（最近 7 天）...');
  var query = 'in:inbox newer_than:7d';
  var threads = GmailApp.search(query, 0, 100);

  Logger.log('📊 找到 ' + threads.length + ' 个对话');

  var stats = {
    total: threads.length,
    processed: 0,
    newsletter: 0,
    marketing: 0,
    product: 0,
    skipped: 0
  };

  threads.forEach(function(thread) {
    try {
      var message = thread.getMessages()[0];
      var result = classifyEmail(message);

      if (result) {
        applyCategory(thread, result.category);
        stats.processed++;

        // 统计分类
        if (result.category === 'Newsletter') stats.newsletter++;
        else if (result.category === 'Marketing') stats.marketing++;
        else if (result.category === 'Product Updates') stats.product++;
      } else {
        stats.skipped++;
      }
    } catch (error) {
      Logger.log('⚠️  处理失败: ' + error.message);
      stats.skipped++;
    }
  });

  Logger.log('✅ 初始化完成！');
  Logger.log('📊 统计结果：');
  Logger.log('  - 总数：' + stats.total);
  Logger.log('  - 已处理：' + stats.processed);
  Logger.log('  - Newsletter：' + stats.newsletter);
  Logger.log('  - Marketing：' + stats.marketing);
  Logger.log('  - Product Updates：' + stats.product);
  Logger.log('  - 跳过：' + stats.skipped);

  // 3. 标记已初始化
  PropertiesService.getUserProperties()
    .setProperty('chrono_initialized', 'true');
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
  Logger.log('🔍 测试数据库连接...');

  var meta = loadSenderDatabase();

  if (meta) {
    Logger.log('✅ 数据库连接成功');
    Logger.log('📊 数据库信息：');
    Logger.log('  - 版本：' + (meta.version || '未知'));
    Logger.log('  - 分片数：' + meta.shardCount);
    Logger.log('  - 总条目数：' + meta.totalEntries);
    Logger.log('  - 最后更新：' + meta.lastUpdated);

    // 测试查询
    Logger.log('\n🔍 测试查询...');
    var testEmail = 'newsletter@stratechery.com';
    var result = querySender(testEmail);

    if (result) {
      Logger.log('✅ 查询成功：' + testEmail);
      Logger.log('  - 分类：' + result.category);
      Logger.log('  - 置信度：' + (result.confidence_score * 100).toFixed(0) + '%');
    } else {
      Logger.log('ℹ️  未找到：' + testEmail);
    }
  } else {
    Logger.log('❌ 数据库连接失败');
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
 * 创建定时触发器（每小时执行一次）
 */
function createAutoProcessTrigger() {
  // 删除现有触发器
  deleteAutoProcessTrigger();

  // 创建新的每小时触发器
  ScriptApp.newTrigger('autoProcessInbox')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✅ 已创建定时触发器（每小时执行）');

  // 记录创建时间
  PropertiesService.getUserProperties()
    .setProperty('chrono_trigger_created', new Date().toISOString());
}

/**
 * 删除自动处理触发器
 */
function deleteAutoProcessTrigger() {
  var triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoProcessInbox') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('🗑️  已删除触发器: ' + triggers[i].getUniqueId());
    }
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

  // 检查触发器是否已创建
  if (!createdAt) {
    return {
      enabled: false,
      message: '自动化未启用',
      hint: '完成初始化后自动启用'
    };
  }

  // 计算下次运行时间（基于上次运行时间）
  var nextRun = null;
  if (lastRun) {
    nextRun = new Date(new Date(lastRun).getTime() + 60 * 60 * 1000);
  } else {
    // 如果没有运行记录，使用创建时间估算
    nextRun = new Date(new Date(createdAt).getTime() + 60 * 60 * 1000);
  }

  return {
    enabled: true,
    createdAt: createdAt,
    lastRun: lastRun,
    lastProcessed: lastProcessed,
    nextRun: nextRun ? nextRun.toISOString() : null,
    message: '每小时自动运行'
  };
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
