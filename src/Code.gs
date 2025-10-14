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

  // 仅处理最近 1 小时的新邮件
  var query = 'in:inbox newer_than:1h';
  var threads = GmailApp.search(query, 0, 50);

  if (threads.length === 0) {
    Logger.log('ℹ️  没有新邮件需要处理');
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
