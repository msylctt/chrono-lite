/**
 * Phase 4: Gmail Add-on UI (Card Service)
 *
 * 设计理念：
 * - 分步引导，降低认知负担
 * - 实时反馈，提升控制感
 * - 智能显示，减少干扰
 * - 情境转化，引导 SaaS
 */

/**
 * ==========================================
 * 主入口函数
 * ==========================================
 */

/**
 * Homepage Trigger（侧边栏主页）
 */
function buildHomepage(e) {
  var userProps = PropertiesService.getUserProperties();
  var initialized = userProps.getProperty('chrono_initialized');

  // 首次使用：显示引导流程
  if (!initialized || initialized === 'false') {
    return buildOnboardingCard();
  }

  // 已初始化：显示仪表盘
  return buildDashboardCard();
}

/**
 * Context Trigger（打开邮件时）
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);

  if (!message) {
    return buildErrorCard('无法加载邮件');
  }

  // 分类邮件
  var result = classifyEmail(message);

  if (result) {
    // 智能显示策略：精确匹配显示极简卡片，其他显示完整卡片
    if (result.source === 'database_exact') {
      // 精确匹配：极简卡片
      return buildMinimalClassifiedCard(message, result);
    } else {
      // 域名匹配或规则匹配：完整卡片（需要确认）
      return buildClassifiedCard(message, result);
    }
  } else {
    // 未识别：显示贡献提示
    return buildUnknownSenderCard(message);
  }
}

/**
 * ==========================================
 * Onboarding 引导流程
 * ==========================================
 */

/**
 * 引导卡片（首次使用）
 */
function buildOnboardingCard() {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🎉 欢迎使用 Chrono Lite')
      .setSubtitle('Gmail 收件箱自动化助手'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>3 步快速开始</b><br><br>' +
                '① 加载发件人数据库<br>' +
                '② 自动分类测试邮件<br>' +
                '③ 开启自动化工作流'))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">✨ 收件箱清零只需 3 分钟<br>' +
                '🔒 完全运行在您的 Gmail 中<br>' +
                '📊 支持 5000+ Newsletter 识别</font>')))

    // 副作用警告
    .addSection(CardService.newCardSection()
      .setHeader('⚠️ 操作说明')

      .addWidget(CardService.newTextParagraph()
        .setText('<b>初始化将执行以下操作：</b><br><br>' +
                '• 下载并缓存发件人数据库（5000+ 条）<br>' +
                '• 自动分类最近 7 天的 20 封邮件<br>' +
                '• 为识别的邮件添加 Chrono 标签<br>' +
                '• 根据配置归档/标记已读邮件<br><br>' +
                '<font color="#e67e22"><b>注意：</b>部分邮件可能被移出收件箱</font>')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('🚀 开始初始化')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('runInitialization'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED))

      .addWidget(CardService.newTextButton()
        .setText('⚙️ 自定义设置')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('openSettings')))

      .addWidget(CardService.newTextButton()
        .setText('📖 查看使用指南')
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite#readme'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))

    .build();

  return [card];
}

/**
 * ==========================================
 * Dashboard 仪表盘
 * ==========================================
 */

/**
 * 仪表盘卡片（主界面）
 */
function buildDashboardCard() {
  var stats = getEmailStats();
  var triggerStatus = getTriggerStatus();
  var debugStatus = getDebugModeStatus();

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('📊 Chrono Lite')
      .setSubtitle('邮件分类统计'));

  // 自动化状态区域
  var statusWidget = buildTriggerStatusWidget(triggerStatus);

  card = card.addSection(CardService.newCardSection()
    .setHeader('🤖 自动化状态')

    .addWidget(CardService.newKeyValue()
      .setTopLabel('状态')
      .setContent(triggerStatus.enabled ? '✅ 已启用' : '⏸️ 未启用')
      .setIcon(triggerStatus.enabled ? CardService.Icon.CLOCK : CardService.Icon.NONE))

    .addWidget(statusWidget));

  // Debug 模式状态
  if (debugStatus.enabled) {
    var debugWidget = buildDebugStatusWidget(debugStatus);
    card = card.addSection(CardService.newCardSection()
      .setHeader('🐛 Debug 模式')
      .addWidget(debugWidget));
  }

  card = card
    // 统计信息
    .addSection(CardService.newCardSection()
      .setHeader('📈 今日统计')

      .addWidget(CardService.newKeyValue()
        .setTopLabel('已处理')
        .setContent(stats.todayProcessed + ' 封')
        .setIcon(CardService.Icon.EMAIL))

      .addWidget(CardService.newKeyValue()
        .setTopLabel('Newsletter 未读')
        .setContent(stats.newsletterUnread + ' 封')
        .setIcon(CardService.Icon.BOOKMARK)))

    // 快速操作
    .addSection(CardService.newCardSection()
      .setHeader('⚡ 快速操作')

      .addWidget(CardService.newTextButton()
        .setText('🔄 手动同步收件箱')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('manualSync')))

      .addWidget(CardService.newTextButton()
        .setText('🤖 触发自动扫描 (Debug)')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('triggerAutoProcess')))

      .addWidget(CardService.newTextButton()
        .setText(debugStatus.enabled ? '🐛 关闭 Debug 模式' : '🐛 开启 Debug 模式')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(debugStatus.enabled ? 'disableDebugMode' : 'enableDebugMode')))

      .addWidget(CardService.newTextButton()
        .setText('📥 更新发件人数据库')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('forceUpdateDatabase')))

      .addWidget(CardService.newTextButton()
        .setText('🧹 清理测试标签')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('clearTestLabelsFromUI'))))

    // 设置与帮助
    .addSection(CardService.newCardSection()
      .setHeader('⚙️ 设置与帮助')

      .addWidget(CardService.newTextButton()
        .setText('⚙️ 设置')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('openSettings')))

      .addWidget(CardService.newTextButton()
        .setText('❓ 帮助与反馈')
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite/issues'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))

    .build();

  return [card];
}

/**
 * ==========================================
 * Result Cards（结果卡片）
 * ==========================================
 */

/**
 * 初始化结果卡片
 */
function buildInitializationResultCard(processed, total, categoryStats, executionLog) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✅ 初始化完成')
      .setSubtitle('已处理 ' + processed + '/' + total + ' 封邮件'));

  // 统计信息
  var statsSection = CardService.newCardSection()
    .setHeader('📊 处理结果');

  if (processed > 0) {
    Object.keys(categoryStats).forEach(function(category) {
      var count = categoryStats[category];
      var config = CATEGORIES[category];
      var actionText = config && config.action === 'archive' ? '已归档' : '保留收件箱';

      statsSection.addWidget(CardService.newKeyValue()
        .setTopLabel(category)
        .setContent(count + ' 封 | ' + actionText)
        .setIcon(CardService.Icon.BOOKMARK));
    });
  } else {
    statsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#666666">未找到可分类的邮件</font>'));
  }

  card.addSection(statsSection);

  // 执行日志
  if (executionLog && executionLog.length > 0) {
    var logText = executionLog.join('<br>');
    card.addSection(CardService.newCardSection()
      .setHeader('📋 执行日志')
      .setCollapsible(true)
      .setNumUncollapsibleWidgets(0)
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">' + logText + '</font>')));
  }

  // 刷新提示
  if (processed > 0) {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e67e22">💡 提示：标签已添加，刷新 Gmail 页面即可看到</font>')));
  }

  // 操作按钮
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('← 返回主页')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('goToDashboard'))));

  return card.build();
}

/**
 * 手动同步结果卡片
 */
function buildSyncResultCard(processed, total, categoryStats, processedEmails, skippedLowConfidence, unclassified) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✅ 同步完成')
      .setSubtitle('已处理 ' + processed + '/' + total + ' 封邮件'));

  // 统计信息
  var statsSection = CardService.newCardSection()
    .setHeader('📊 处理结果');

  if (processed > 0) {
    Object.keys(categoryStats).forEach(function(category) {
      var count = categoryStats[category];
      statsSection.addWidget(CardService.newKeyValue()
        .setTopLabel(category)
        .setContent(count + ' 封')
        .setIcon(CardService.Icon.BOOKMARK));
    });
  } else {
    statsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#666666">未找到可分类的邮件</font>'));
  }

  // 添加未分类统计
  if (unclassified > 0) {
    statsSection.addWidget(CardService.newKeyValue()
      .setTopLabel('未分类')
      .setContent(unclassified + ' 封')
      .setIcon(CardService.Icon.DESCRIPTION));
  }

  card.addSection(statsSection);

  // 处理详情
  if (processedEmails && processedEmails.length > 0) {
    var detailsText = processedEmails.slice(0, 10).map(function(item) {
      return '• ' + item.category + ' (' + item.method + '): ' + item.subject;
    }).join('<br>');

    if (processedEmails.length > 10) {
      detailsText += '<br>...(还有 ' + (processedEmails.length - 10) + ' 封)';
    }

    card.addSection(CardService.newCardSection()
      .setHeader('📧 处理详情')
      .setCollapsible(true)
      .setNumUncollapsibleWidgets(0)
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">' + detailsText + '</font>')));
  }

  // 刷新提示
  if (processed > 0) {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e67e22">💡 提示：标签已添加，刷新 Gmail 页面即可看到</font>')));
  }

  // 操作按钮
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('← 返回主页')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('goToDashboard'))));

  return card.build();
}

/**
 * ==========================================
 * Context Cards（上下文卡片）
 * ==========================================
 */

/**
 * 极简分类卡片（精确匹配）
 */
function buildMinimalClassifiedCard(message, result) {
  var senderEmail = extractEmail(message.getFrom());

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✅ ' + result.category)
      .setSubtitle(senderEmail))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel('匹配方式')
        .setContent(getSourceLabel(result.source))
        .setIcon(CardService.Icon.STAR)))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">✨ 自动化已启用，无需手动操作</font>')))

    .build();

  return [card];
}

/**
 * 完整分类卡片（域名匹配或规则匹配，需要确认）
 */
function buildClassifiedCard(message, result) {
  var senderEmail = extractEmail(message.getFrom());
  var subject = message.getSubject();

  // 检测是否为长文（可能触发 SaaS 转化）
  var wordCount = estimateWordCount(message.getPlainBody());
  var isLongArticle = wordCount > 3000;

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🔍 Chrono Lite')
      .setSubtitle(senderEmail))

    // 分类信息
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel('识别分类')
        .setContent(result.category)
        .setIcon(CardService.Icon.BOOKMARK))

      .addWidget(CardService.newKeyValue()
        .setTopLabel('匹配方式')
        .setContent(getSourceLabel(result.source))))

    // 操作按钮
    .addSection(CardService.newCardSection()
      .setHeader('快速操作')

      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('✅ 确认并应用')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('applyLabelFromCard')
            .setParameters({
              messageId: message.getId(),
              category: result.category
            })))

        .addButton(CardService.newTextButton()
          .setText('❌ 不正确')
          .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('rejectClassification')
            .setParameters({
              messageId: message.getId(),
              suggestedCategory: result.category
            })))));

  // 长文转化提示（情境化）
  if (isLongArticle) {
    card.addSection(CardService.newCardSection()
      .setHeader('💡 长文提示')

      .addWidget(CardService.newTextParagraph()
        .setText('这篇文章约 <b>' + wordCount + '</b> 字，预计阅读 <b>' +
                Math.ceil(wordCount / 500) + '</b> 分钟'))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">想要 AI 自动生成中文摘要？<br>' +
                '只需 1 分钟理解核心观点 ✨</font>'))

      .addWidget(CardService.newTextButton()
        .setText('🚀 免费试用 Chrono SaaS')
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://chrono.app?utm_source=lite&utm_medium=long_article&word_count=' + wordCount))));
  }

  card = card.build();
  return [card];
}

/**
 * 未知发件人卡片（贡献提示）
 */
function buildUnknownSenderCard(message) {
  var senderEmail = extractEmail(message.getFrom());

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❓ 未识别发件人')
      .setSubtitle(senderEmail))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('此发件人不在数据库中<br><br>' +
                '<font color="#666666">您可以帮助改进 Chrono Lite</font>')))

    // 快速标注
    .addSection(CardService.newCardSection()
      .setHeader('您认为这是：')

      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('📰 Newsletter')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('suggestCategory')
            .setParameters({
              email: senderEmail,
              category: 'Newsletter'
            })))

        .addButton(CardService.newTextButton()
          .setText('📢 Marketing')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('suggestCategory')
            .setParameters({
              email: senderEmail,
              category: 'Marketing'
            }))))

      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('📦 Product Updates')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('suggestCategory')
            .setParameters({
              email: senderEmail,
              category: 'Product Updates'
            })))

        .addButton(CardService.newTextButton()
          .setText('📰 Tech News')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('suggestCategory')
            .setParameters({
              email: senderEmail,
              category: 'Tech News'
            })))))

    // 提交到数据库
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('📤 提交到开源数据库')
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite/issues/new?title=New+Sender:+' +
                  encodeURIComponent(senderEmail)))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))

    .build();

  return [card];
}

/**
 * 错误卡片
 */
function buildErrorCard(errorMessage) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❌ 出错了'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>错误信息：</b><br>' + errorMessage))

      .addWidget(CardService.newTextButton()
        .setText('🔄 刷新')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('refreshCard'))))

    .build();

  return [card];
}

/**
 * ==========================================
 * Action Handlers（操作处理函数）
 * ==========================================
 */

/**
 * 运行初始化
 */
function runInitialization(e) {
  try {
    Logger.log('🚀 开始初始化...');

    // 0. 获取用户配置
    var userProps = PropertiesService.getUserProperties();
    var processDays = userProps.getProperty('chrono_process_days') || '7';
    var processLimit = parseInt(userProps.getProperty('chrono_process_limit') || '20');

    Logger.log('配置: days=' + processDays + ', limit=' + processLimit);

    // 存储执行日志到 UserProperties，供进度卡片读取
    var executionLog = [];

    // 1. 加载数据库
    executionLog.push('Step 1/3: 正在加载发件人数据库...');
    Logger.log('📥 加载发件人数据库...');
    var meta = storeShardedDatabase();

    if (!meta) {
      throw new Error('数据库加载失败');
    }

    executionLog.push('✅ 数据库加载成功（' + meta.totalEntries + ' 条记录）');

    // 2. 处理邮件（使用用户配置）
    executionLog.push('Step 2/3: 正在分类邮件...');
    Logger.log('📧 处理邮件...');
    var query = 'in:inbox newer_than:' + processDays + 'd';
    var threads = GmailApp.search(query, 0, processLimit);
    var processed = 0;
    var categoryStats = {};

    Logger.log('查询: ' + query + ', 找到 ' + threads.length + ' 封');
    executionLog.push('找到 ' + threads.length + ' 封邮件');

    threads.forEach(function(thread, index) {
      try {
        var message = thread.getMessages()[0];
        var result = classifyEmail(message);

        // 无置信度限制，处理所有能分类的邮件
        if (result) {
          applyCategory(thread, result.category);
          processed++;

          // 统计分类
          categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;

          // 每处理 5 封记录一次
          if ((index + 1) % 5 === 0) {
            executionLog.push('已处理: ' + (index + 1) + '/' + threads.length);
          }
        }
      } catch (error) {
        Logger.log('⚠️ 处理邮件失败: ' + error.message);
      }
    });

    executionLog.push('✅ 邮件分类完成（' + processed + '/' + threads.length + '）');

    // 添加分类统计
    Object.keys(categoryStats).forEach(function(cat) {
      executionLog.push('  • ' + cat + ': ' + categoryStats[cat] + ' 封');
    });

    // 3. 标记已初始化并创建自动化触发器
    executionLog.push('Step 3/3: 完成初始化设置');
    userProps.setProperty('chrono_initialized', 'true');

    // 自动创建定时触发器
    try {
      createAutoProcessTrigger();
      executionLog.push('✅ 已启用自动化（每小时运行）');
    } catch (error) {
      Logger.log('⚠️ 创建触发器失败: ' + error.message);
      executionLog.push('⚠️ 自动化启用失败，请手动启用');
    }

    Logger.log('✅ 初始化完成！');
    executionLog.push('✅ 全部完成！');

    // 构建结果卡片
    var resultCard = buildInitializationResultCard(processed, threads.length, categoryStats, executionLog);

    // 4. 返回成功通知
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 初始化完成！已处理 ' + processed + '/' + threads.length + ' 封邮件'))
      .setNavigation(CardService.newNavigation()
        .updateCard(resultCard))
      .build();

  } catch (error) {
    Logger.log('❌ 初始化失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 初始化失败：' + error.message))
      .build();
  }
}

/**
 * 从卡片应用标签
 */
function applyLabelFromCard(e) {
  try {
    var messageId = e.parameters.messageId;
    var category = e.parameters.category;

    Logger.log('应用标签: ' + category + ' to ' + messageId);

    var message = GmailApp.getMessageById(messageId);
    var thread = message.getThread();

    applyCategory(thread, category);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 已应用标签：' + category))
      .build();

  } catch (error) {
    Logger.log('❌ 应用标签失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 操作失败：' + error.message))
      .build();
  }
}

/**
 * 拒绝分类
 */
function rejectClassification(e) {
  var messageId = e.parameters.messageId;
  var suggestedCategory = e.parameters.suggestedCategory;

  // 记录用户反馈（用于改进数据库）
  Logger.log('用户拒绝分类: ' + suggestedCategory + ' for ' + messageId);

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ 已记录您的反馈，感谢改进 Chrono'))
    .build();
}

/**
 * 建议分类
 */
function suggestCategory(e) {
  var email = e.parameters.email;
  var category = e.parameters.category;

  // 记录用户建议（可以后续提交到数据库）
  Logger.log('用户建议分类: ' + email + ' → ' + category);

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ 感谢您的贡献！我们会审核后添加'))
    .build();
}

/**
 * 手动同步
 */
function manualSync(e) {
  try {
    Logger.log('🔄 开始手动同步...');

    // 获取用户配置
    var userProps = PropertiesService.getUserProperties();
    var processDays = userProps.getProperty('chrono_process_days') || '7';
    var processLimit = parseInt(userProps.getProperty('chrono_process_limit') || '20');

    // 使用配置的范围
    var query = 'in:inbox newer_than:' + processDays + 'd';
    var threads = GmailApp.search(query, 0, processLimit);
    var processed = 0;
    var categoryStats = {};
    var processedEmails = [];
    var skippedLowConfidence = 0;
    var unclassified = 0;

    Logger.log('查询: ' + query + ', 找到 ' + threads.length + ' 封');

    threads.forEach(function(thread, index) {
      try {
        var message = thread.getMessages()[0];
        var result = classifyEmail(message);
        var senderEmail = extractEmail(message.getFrom());
        var subject = message.getSubject();

        // 详细日志
        if (result) {
          Logger.log((index + 1) + '. ' + senderEmail + ' → ' + result.category +
                    ' (' + result.method + ')');

          // 处理所有能分类的邮件
          applyCategory(thread, result.category);
          processed++;

          // 统计分类
          categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;

          // 记录处理的邮件（截取主题前30字符）
          if (subject.length > 30) {
            subject = subject.substring(0, 30) + '...';
          }

          processedEmails.push({
            category: result.category,
            subject: subject,
            from: senderEmail,
            method: result.method
          });
        } else {
          unclassified++;
          Logger.log((index + 1) + '. ' + senderEmail + ' → 未分类');
        }
      } catch (error) {
        Logger.log('⚠️ 处理邮件失败: ' + error.message);
      }
    });

    Logger.log('✅ 同步完成！');
    Logger.log('  - 处理: ' + processed + '/' + threads.length);
    Logger.log('  - 低置信度跳过: ' + skippedLowConfidence);
    Logger.log('  - 未分类: ' + unclassified);

    // 构建结果卡片
    var resultCard = buildSyncResultCard(processed, threads.length, categoryStats, processedEmails, skippedLowConfidence, unclassified);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 同步完成！已处理 ' + processed + '/' + threads.length + ' 封邮件'))
      .setNavigation(CardService.newNavigation()
        .updateCard(resultCard))
      .build();

  } catch (error) {
    Logger.log('❌ 同步失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 同步失败：' + error.message))
      .build();
  }
}

/**
 * 强制更新数据库（从 UI 调用）
 */
function forceUpdateDatabase(e) {
  try {
    Logger.log('📥 强制更新数据库...');

    // 清除缓存
    clearSenderCache();

    // 重新加载
    var meta = storeShardedDatabase();

    if (!meta) {
      throw new Error('数据库加载失败');
    }

    Logger.log('✅ 数据库更新完成！');

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 数据库已更新！共 ' + meta.totalEntries + ' 条记录'))
      .build();

  } catch (error) {
    Logger.log('❌ 更新数据库失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 更新失败：' + error.message))
      .build();
  }
}

/**
 * 清理测试标签（从 UI 调用）
 */
function clearTestLabelsFromUI(e) {
  try {
    Logger.log('🧹 清理测试标签...');

    clearTestLabels();

    // 构建结果卡片，提示用户刷新
    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('✅ 清理完成')
        .setSubtitle('所有 Chrono 标签已移除'))

      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('<b>已完成操作：</b><br>' +
                  '• 删除所有 Chrono 标签<br>' +
                  '• 从邮件中移除标签<br><br>' +
                  '<font color="#e67e22"><b>💡 重要提示：</b></font><br>' +
                  '<font color="#e67e22">请刷新 Gmail 页面以查看更新</font>')))

      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('<font color="#666666">刷新方法：按 Cmd/Ctrl + R<br>' +
                  '或点击浏览器刷新按钮</font>')))

      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextButton()
          .setText('← 返回主页')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('goToDashboard'))))

      .build();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 已清理所有 Chrono 标签，请刷新 Gmail 页面'))
      .setNavigation(CardService.newNavigation()
        .updateCard(card))
      .build();

  } catch (error) {
    Logger.log('❌ 清理失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 清理失败：' + error.message))
      .build();
  }
}

/**
 * 触发自动处理（Debug 用）
 */
function triggerAutoProcess(e) {
  try {
    Logger.log('🤖 手动触发自动处理...');

    // 直接调用自动处理函数
    autoProcessInbox();

    // 获取处理结果
    var userProps = PropertiesService.getUserProperties();
    var lastProcessed = userProps.getProperty('chrono_last_processed') || '0';

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 自动扫描完成！处理 ' + lastProcessed + ' 封邮件'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('❌ 自动处理失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 自动扫描失败：' + error.message))
      .build();
  }
}

/**
 * 启用 Debug 模式
 */
function enableDebugMode(e) {
  try {
    Logger.log('🐛 启用 Debug 模式...');

    // 创建 Debug 触发器
    createDebugEmailTrigger();

    // 立即发送一封测试邮件
    sendDebugTestEmail();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Debug 模式已启用！已发送首封测试邮件'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('❌ 启用 Debug 模式失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 启用失败：' + error.message))
      .build();
  }
}

/**
 * 禁用 Debug 模式
 */
function disableDebugMode(e) {
  try {
    Logger.log('🐛 禁用 Debug 模式...');

    // 删除 Debug 触发器
    deleteDebugEmailTrigger();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Debug 模式已关闭'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('❌ 禁用 Debug 模式失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 禁用失败：' + error.message))
      .build();
  }
}

/**
 * 打开设置页面
 */
function openSettings(e) {
  // 获取当前配置
  var userProps = PropertiesService.getUserProperties();
  var processDays = userProps.getProperty('chrono_process_days') || '7';
  var processLimit = userProps.getProperty('chrono_process_limit') || '20';
  var triggerInterval = userProps.getProperty('chrono_trigger_interval') || '1hour';

  // 获取数据库元数据
  var meta = getCacheMeta();
  var dbInfo = meta ?
    '版本: ' + (meta.version || 'unknown') + ' | 条目数: ' + meta.totalEntries :
    '未加载';

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚙️ 设置')
      .setSubtitle('配置 Chrono Lite'))

    // 数据库信息
    .addSection(CardService.newCardSection()
      .setHeader('📊 数据库状态')

      .addWidget(CardService.newKeyValue()
        .setTopLabel('当前数据库')
        .setContent(dbInfo)
        .setIcon(CardService.Icon.DESCRIPTION))

      .addWidget(CardService.newTextButton()
        .setText('查看分类列表')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('viewCategories'))))

    // 自动化触发器设置
    .addSection(CardService.newCardSection()
      .setHeader('⏰ 自动化运行周期')

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">设置自动扫描邮件的频率<br>' +
                '<font color="#e67e22">⚠️ Gmail Add-on 限制：最小间隔 1 小时</font></font>'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('运行频率')
        .setFieldName('trigger_interval')
        .addItem('每小时（推荐）', '1hour', triggerInterval === '1hour')
        .addItem('每 2 小时', '2hour', triggerInterval === '2hour')
        .addItem('每 4 小时', '4hour', triggerInterval === '4hour')
        .addItem('每 6 小时', '6hour', triggerInterval === '6hour')
        .addItem('每 12 小时', '12hour', triggerInterval === '12hour')
        .addItem('每天', '24hour', triggerInterval === '24hour'))

      .addWidget(CardService.newTextButton()
        .setText('💾 保存并重启触发器')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('saveTriggerInterval')))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">💡 提示：使用"触发自动扫描"按钮可立即执行</font>')))

    // 处理范围配置
    .addSection(CardService.newCardSection()
      .setHeader('📧 邮件处理范围')

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">配置初始化和手动同步时处理的邮件范围</font>'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('时间范围')
        .setFieldName('process_days')
        .addItem('最近 1 天', '1', processDays === '1')
        .addItem('最近 3 天', '3', processDays === '3')
        .addItem('最近 7 天（推荐）', '7', processDays === '7')
        .addItem('最近 14 天', '14', processDays === '14')
        .addItem('最近 30 天', '30', processDays === '30'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('邮件数量')
        .setFieldName('process_limit')
        .addItem('10 封', '10', processLimit === '10')
        .addItem('20 封（推荐）', '20', processLimit === '20')
        .addItem('50 封', '50', processLimit === '50')
        .addItem('100 封', '100', processLimit === '100')
        .addItem('200 封', '200', processLimit === '200'))

      .addWidget(CardService.newTextButton()
        .setText('💾 保存配置')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('saveProcessingConfig'))))

    // 危险操作
    .addSection(CardService.newCardSection()
      .setHeader('⚠️ 危险操作')

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e74c3c"><b>警告：</b>以下操作不可恢复</font>'))

      .addWidget(CardService.newTextButton()
        .setText('🔄 完全还原')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('confirmResetAll'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">将删除所有 Chrono 标签，<br>清除缓存和配置，恢复到初始状态</font>')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('← 返回主页')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('returnToDashboard'))))

    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card))
    .build();
}

/**
 * 查看分类列表
 */
function viewCategories(e) {
  var categories = Object.keys(CATEGORIES);
  var meta = getCacheMeta();

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('📁 分类列表')
      .setSubtitle('当前支持的邮件分类'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>数据库信息</b><br>' +
                '条目数: ' + (meta ? meta.totalEntries : '未知') + '<br>' +
                '版本: ' + (meta ? meta.version : '未知'))));

  // 显示每个分类
  categories.forEach(function(categoryName) {
    var config = CATEGORIES[categoryName];
    var actionText = config.action === 'archive' ? '📦 归档' : '📥 保留';
    var readText = config.markRead ? '✓ 已读' : '○ 未读';

    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel(categoryName)
        .setContent(config.label)
        .setBottomLabel(actionText + ' | ' + readText)
        .setIcon(CardService.Icon.BOOKMARK)));
  });

  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('<font color="#666666">💡 修改 Config.gs 可自定义分类规则</font>'))

    .addWidget(CardService.newTextButton()
      .setText('← 返回设置')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('openSettings'))));

  card = card.build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card))
    .build();
}

/**
 * 保存触发器周期
 */
function saveTriggerInterval(e) {
  try {
    var formInput = e.formInput;
    var triggerInterval = formInput.trigger_interval;

    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_trigger_interval', triggerInterval);

    Logger.log('保存触发器周期: ' + triggerInterval);

    // 重新创建触发器
    createAutoProcessTrigger(triggerInterval);

    var intervalLabel = getIntervalLabel(triggerInterval);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 触发器已更新为' + intervalLabel))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('保存触发器周期失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 保存失败：' + error.message))
      .build();
  }
}

/**
 * 保存处理配置
 */
function saveProcessingConfig(e) {
  try {
    var formInput = e.formInput;
    var processDays = formInput.process_days;
    var processLimit = formInput.process_limit;

    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_process_days', processDays);
    userProps.setProperty('chrono_process_limit', processLimit);

    Logger.log('保存配置: days=' + processDays + ', limit=' + processLimit);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 配置已保存'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('保存配置失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 保存失败：' + error.message))
      .build();
  }
}

/**
 * 确认还原（二次确认）
 */
function confirmResetAll(e) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚠️ 确认还原')
      .setSubtitle('此操作不可恢复'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e74c3c"><b>警告：即将执行以下操作</b></font><br><br>' +
                '1️⃣ 删除所有 Chrono 标签<br>' +
                '2️⃣ 从邮件中移除标签<br>' +
                '3️⃣ 清除所有缓存数据<br>' +
                '4️⃣ 重置用户配置<br><br>' +
                '<b>邮件本身不会被删除</b>，但会恢复到未分类状态')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">此操作预计需要 1-2 分钟</font>'))

      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔄 确认还原')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('executeResetAll'))
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED))

        .addButton(CardService.newTextButton()
          .setText('❌ 取消')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('openSettings'))
          .setTextButtonStyle(CardService.TextButtonStyle.TEXT))))

    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card))
    .build();
}

/**
 * 执行完全还原
 */
function executeResetAll(e) {
  try {
    Logger.log('🔄 开始完全还原...');

    // 1. 删除所有 Chrono 标签
    Logger.log('删除标签...');
    clearTestLabels();

    // 2. 清除缓存
    Logger.log('清除缓存...');
    clearSenderCache();

    // 3. 重置用户配置
    Logger.log('重置配置...');
    var userProps = PropertiesService.getUserProperties();
    userProps.deleteProperty('chrono_initialized');
    userProps.deleteProperty('chrono_process_days');
    userProps.deleteProperty('chrono_process_limit');

    Logger.log('✅ 还原完成！');

    var onboardingCard = buildOnboardingCard();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 已完全还原到初始状态'))
      .setNavigation(CardService.newNavigation()
        .updateCard(onboardingCard[0]))
      .build();

  } catch (error) {
    Logger.log('❌ 还原失败: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 还原失败：' + error.message))
      .build();
  }
}

/**
 * 返回仪表盘
 */
function returnToDashboard(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .popCard())
    .build();
}

/**
 * 构建触发器状态显示控件
 */
function buildTriggerStatusWidget(status) {
  // 未启用
  if (!status.enabled) {
    var hintText = status.hint || '初始化完成后自动创建';
    return CardService.newTextParagraph()
      .setText('<font color="#666666">' + status.message + '<br>' + hintText + '</font>');
  }

  // 已启用，显示详情
  var nextRunText = '下次运行: ';
  if (status.nextRun) {
    var nextDate = new Date(status.nextRun);
    var now = new Date();
    var diffMinutes = Math.round((nextDate - now) / 60000);

    if (diffMinutes < 0) {
      nextRunText += '即将运行';
    } else if (diffMinutes < 60) {
      nextRunText += diffMinutes + ' 分钟后';
    } else {
      var diffHours = Math.floor(diffMinutes / 60);
      nextRunText += diffHours + ' 小时后';
    }
  } else {
    nextRunText += '约 1 小时内';
  }

  var lastRunText = '';
  if (status.lastRun) {
    var lastDate = new Date(status.lastRun);
    lastRunText = '<br>上次运行: ' + formatRelativeTime(lastDate) + ' (处理 ' + status.lastProcessed + ' 封)';
  } else {
    lastRunText = '<br><font color="#e67e22">等待首次运行...</font>';
  }

  return CardService.newTextParagraph()
    .setText('<font color="#666666">' + status.message + '<br>' +
            nextRunText + lastRunText + '</font>');
}

/**
 * 构建 Debug 模式状态显示控件
 */
function buildDebugStatusWidget(debugStatus) {
  var statusText = '✅ 每小时自动发送测试邮件';

  if (debugStatus.lastEmail) {
    var lastEmailDate = new Date(debugStatus.lastEmail);
    statusText += '<br>上次发送: ' + formatRelativeTime(lastEmailDate);
  }

  if (debugStatus.enabledAt) {
    var enabledDate = new Date(debugStatus.enabledAt);
    statusText += '<br>启用时间: ' + formatRelativeTime(enabledDate);
  }

  statusText += '<br><br><font color="#e67e22">💡 观察收件箱中的 [Test] 邮件，检查是否自动归类</font>';

  return CardService.newTextParagraph()
    .setText('<font color="#666666">' + statusText + '</font>');
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(date) {
  var now = new Date();
  var diffMs = now - date;
  var diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return diffMinutes + ' 分钟前';

  var diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return diffHours + ' 小时前';

  var diffDays = Math.floor(diffHours / 24);
  return diffDays + ' 天前';
}


/**
 * 启用自动化（Action Handler）
 */
function enableAutomation(e) {
  try {
    createAutoProcessTrigger();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ 自动化已启用'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 启用失败：' + error.message))
      .build();
  }
}

/**
 * 禁用自动化（Action Handler）
 */
function disableAutomation(e) {
  try {
    deleteAutoProcessTrigger();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('⏸️ 自动化已禁用'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ 禁用失败：' + error.message))
      .build();
  }
}

/**
 * 跳转到仪表盘（用于结果卡片）
 */
function goToDashboard(e) {
  var dashboardCard = buildDashboardCard();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .updateCard(dashboardCard[0]))
    .build();
}

/**
 * 刷新卡片
 */
function refreshCard(e) {
  var dashboardCard = buildDashboardCard();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .updateCard(dashboardCard[0]))
    .build();
}

/**
 * ==========================================
 * 辅助函数
 * ==========================================
 */

/**
 * 获取邮件统计
 */
function getEmailStats() {
  try {
    return {
      todayProcessed: GmailApp.search('newer_than:1d label:Chrono').length,
      newsletterUnread: GmailApp.search('label:Chrono/Newsletter is:unread').length
    };
  } catch (error) {
    Logger.log('获取统计失败: ' + error.message);
    return {
      todayProcessed: 0,
      newsletterUnread: 0
    };
  }
}

/**
 * 获取来源标签（翻译）
 */
function getSourceLabel(source) {
  var labels = {
    'database_exact': '🎯 精确匹配',
    'database_domain': '🌐 域名匹配',
    'heuristic': '🧠 规则匹配'
  };
  return labels[source] || source;
}

/**
 * 估算字数
 */
function estimateWordCount(text) {
  if (!text) return 0;

  // 移除 HTML 标签
  text = text.replace(/<[^>]*>/g, '');

  // 中文字数 + 英文单词数
  var chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  var englishWords = text.match(/[a-zA-Z]+/g) || [];
  var englishCount = englishWords.length;

  return chineseCount + englishCount;
}
