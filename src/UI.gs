/**
 * Phase 4: Gmail Add-on UI (Card Service)
 *
 * Design Philosophy:
 * - Step-by-step guidance to reduce cognitive load
 * - Real-time feedback to enhance control
 * - Smart display to minimize interference
 * - Contextual conversion to guide SaaS adoption
 */

/**
 * ==========================================
 * Main Entry Functions
 * ==========================================
 */

/**
 * Homepage Trigger (Sidebar Homepage)
 */
function buildHomepage(e) {
  var userProps = PropertiesService.getUserProperties();
  var initialized = userProps.getProperty('chrono_initialized');

  // First time use: show onboarding flow
  if (!initialized || initialized === 'false') {
    return buildOnboardingCard();
  }

  // Already initialized: show dashboard
  return buildDashboardCard();
}

/**
 * Context Trigger (When opening an email)
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);

  if (!message) {
    return buildErrorCard('Unable to load email');
  }

  // Classify email (UI-optimized): disable content scan to reduce latency
  var original = FEATURE_FLAGS && FEATURE_FLAGS.enableContent;
  try { if (FEATURE_FLAGS) FEATURE_FLAGS.enableContent = false; } catch (eFlag) {}
  var result = classifyEmail(message);
  try { if (FEATURE_FLAGS) FEATURE_FLAGS.enableContent = original; } catch (eFlag2) {}

  if (result) {
    // Smart display strategy: exact match shows minimal card, others show full card
    if (result.source === 'database_exact') {
      // Exact match: minimal card
      return buildMinimalClassifiedCard(message, result);
    } else {
      // Domain match or rule match: full card (needs confirmation)
      return buildClassifiedCard(message, result);
    }
  } else {
    // Unrecognized: show contribution prompt
    return buildUnknownSenderCard(message);
  }
}

/**
 * ==========================================
 * Onboarding Flow
 * ==========================================
 */

/**
 * Onboarding Card (First time use)
 */
function buildOnboardingCard() {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🎉 Welcome to Chrono Lite')
      .setSubtitle('Gmail Inbox Automation Assistant'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>3-Step Quick Start</b><br><br>' +
                '① Load sender database<br>' +
                '② Auto-classify test emails<br>' +
                '③ Enable automation workflow'))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">✨ Inbox zero in just 3 minutes<br>' +
                '🔒 Runs entirely in your Gmail<br>' +
                '📊 Supports 5000+ Newsletter recognition</font>')))

    // Side effects warning (collapsible)
    .addSection(CardService.newCardSection()
      .setHeader('⚠️ ' + t('op_instructions'))
      .setCollapsible(true)
      .setNumUncollapsibleWidgets(0)

      .addWidget(CardService.newTextParagraph()
        .setText(t('op_instructions_body'))))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText(t('start_init'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('runInitialization'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED))

      .addWidget(CardService.newTextButton()
        .setText(t('start_preview'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('startInitializationPreview')))

      .addWidget(CardService.newTextButton()
        .setText(t('custom_settings'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('openSettings')))

      .addWidget(CardService.newTextButton()
        .setText(t('view_user_guide'))
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite#readme'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))

    .build();

  return [card];
}

/**
 * ==========================================
 * Dashboard
 * ==========================================
 */

/**
 * Dashboard Card (Main Interface)
 */
function buildDashboardCard() {
  var stats = getEmailStats();
  var triggerStatus = getTriggerStatus();
  var debugStatus = getDebugModeStatus();

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('📊 ' + t('dashboard_title'))
      .setSubtitle(t('dashboard_subtitle')));


  // Optional: What's New banner (frequency capped)
  try {
    if (typeof UI_FLAGS !== 'undefined' && UI_FLAGS.enableWhatsNew && shouldShowWhatsNew()) {
      card = card.addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('<b>What\'s New</b><br><font color="#666666">UI refreshed: faster actions, undo support, and smarter tips.</font>'))
        .addWidget(CardService.newTextButton()
          .setText('Dismiss')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('dismissWhatsNew')))
      );
    }
  } catch (eWN) { /* ignore */ }

  // Automation status area
  var statusWidget = buildTriggerStatusWidget(triggerStatus);

  card = card.addSection(CardService.newCardSection()
    .setHeader('🤖 ' + t('automation_status'))

    .addWidget(CardService.newKeyValue()
      .setTopLabel(t('status'))
      .setContent(triggerStatus.enabled ? '✅ ' + t('enabled') : '⏸️ ' + t('disabled'))
      .setIcon(triggerStatus.enabled ? CardService.Icon.CLOCK : CardService.Icon.NONE))

    .addWidget(statusWidget));

  // Debug mode status
  if (debugStatus.enabled) {
    var debugWidget = buildDebugStatusWidget(debugStatus);
    card = card.addSection(CardService.newCardSection()
      .setHeader('🐛 Debug Mode')
      .addWidget(debugWidget));
  }

  card = card
    // Statistics
    .addSection(CardService.newCardSection()
      .setHeader('📈 ' + t('today_stats'))

      .addWidget(CardService.newKeyValue()
        .setTopLabel(t('processed'))
        .setContent(stats.todayProcessed + ' emails')
        .setIcon(CardService.Icon.EMAIL))

      .addWidget(CardService.newKeyValue()
        .setTopLabel(t('newsletter_unread'))
        .setContent(stats.newsletterUnread + ' emails')
        .setIcon(CardService.Icon.BOOKMARK)))

    // Quick Actions
    .addSection(CardService.newCardSection()
      .setHeader('⚡ ' + t('quick_actions'))

      .addWidget(CardService.newTextButton()
        .setText('🔄 ' + t('manual_sync'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('manualSync')))

      .addWidget(CardService.newTextButton()
        .setText('🤖 ' + t('trigger_auto'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('triggerAutoProcess')))

      .addWidget(CardService.newTextButton()
        .setText(debugStatus.enabled ? t('disable_debug') : t('enable_debug'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName(debugStatus.enabled ? 'disableDebugMode' : 'enableDebugMode')))

      .addWidget(CardService.newTextButton()
        .setText('📥 ' + t('update_db'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('forceUpdateDatabase')))

      .addWidget(CardService.newTextButton()
        .setText('🧹 ' + t('clear_test_labels'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('clearTestLabelsFromUI'))))

    // Settings and Help
    .addSection(CardService.newCardSection()
      .setHeader('⚙️ ' + t('settings_help'))

      .addWidget(CardService.newTextButton()
        .setText('⚙️ ' + t('settings_btn'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('openSettings')))

      .addWidget(CardService.newTextButton()
        .setText('❓ ' + t('help_feedback'))
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite/issues'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))

    .build();

  return [card];
}

/**
 * Actions page (from navbar)
 */
function openActions(e) {
  var debugStatus = getDebugModeStatus();

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚡ Actions')
      .setSubtitle('Quick operations'))

    

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('🔄 ' + t('manual_sync'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('manualSync')))

      .addWidget(CardService.newTextButton()
        .setText('📥 ' + t('update_db'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('forceUpdateDatabase')))

      .addWidget(CardService.newTextButton()
        .setText('🧹 ' + t('clear_test_labels'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('clearTestLabelsFromUI')))

      .addWidget(CardService.newTextButton()
        .setText(debugStatus.enabled ? '🐛 Disable Debug Mode' : '🐛 Enable Debug Mode')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(debugStatus.enabled ? 'disableDebugMode' : 'enableDebugMode'))))

    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card))
    .build();
}

/**
 * Undo from Card (UI handler)
 */
function undoApplyFromCard(e) {
  try {
    var threadId = e.parameters.threadId;
    var category = e.parameters.category;
    var ok = undoApply(threadId, category);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(ok ? '↩️ Undone' : '❌ Undo failed'))
      .build();
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Undo failed: ' + error.message))
      .build();
  }
}

/**
 * ==========================================
 * Result Cards
 * ==========================================
 */

/**
 * Initialization Result Card
 */
function buildInitializationResultCard(processed, total, categoryStats, executionLog) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✅ ' + t('init_complete'))
      .setSubtitle(t('init_processed_of').replace('{p}', processed).replace('{t}', total)));

  // Statistics
  var statsSection = CardService.newCardSection()
    .setHeader('📊 ' + t('processing_results'));

  if (processed > 0) {
    Object.keys(categoryStats).forEach(function(category) {
      var count = categoryStats[category];
      var config = CATEGORIES[category];
      var actionText = config && config.action === 'archive' ? 'Archived' : 'Kept in inbox';

      statsSection.addWidget(CardService.newKeyValue()
        .setTopLabel(category)
        .setContent(count + ' emails | ' + actionText)
        .setIcon(CardService.Icon.BOOKMARK));
    });
  } else {
    statsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#666666">' + t('none_found') + '</font>'));
  }

  card.addSection(statsSection);

  // Execution log
  if (executionLog && executionLog.length > 0) {
    var logText = executionLog.join('<br>');
    card.addSection(CardService.newCardSection()
      .setHeader('📋 Execution Log')
      .setCollapsible(true)
      .setNumUncollapsibleWidgets(0)
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">' + logText + '</font>')));
  }

  // Refresh tip
  if (processed > 0) {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e67e22">💡 Tip: Labels have been added, refresh Gmail page to see them</font>')));
  }

  // Action buttons
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText(t('back_home'))
      .setOnClickAction(CardService.newAction()
        .setFunctionName('goToDashboard')))
    .addWidget(CardService.newTextButton()
      .setText(t('open_settings'))
      .setOnClickAction(CardService.newAction()
        .setFunctionName('openSettings'))));

  return card.build();
}

/**
 * Manual Sync Result Card
 */
function buildSyncResultCard(processed, total, categoryStats, processedEmails, skippedLowConfidence, unclassified) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✅ ' + t('sync_complete'))
      .setSubtitle(t('init_processed_of').replace('{p}', processed).replace('{t}', total)));

  // Statistics
  var statsSection = CardService.newCardSection()
    .setHeader('📊 ' + t('processing_results'));

  if (processed > 0) {
    Object.keys(categoryStats).forEach(function(category) {
      var count = categoryStats[category];
      statsSection.addWidget(CardService.newKeyValue()
        .setTopLabel(category)
        .setContent(count + ' emails')
        .setIcon(CardService.Icon.BOOKMARK));
    });
  } else {
    statsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#666666">' + t('none_found') + '</font>'));
  }

  // Add unclassified statistics
  if (unclassified > 0) {
    statsSection.addWidget(CardService.newKeyValue()
      .setTopLabel(t('unclassified'))
      .setContent(unclassified + ' emails')
      .setIcon(CardService.Icon.DESCRIPTION));
  }

  card.addSection(statsSection);

  // Processing details
  if (processedEmails && processedEmails.length > 0) {
    var detailsText = processedEmails.slice(0, 10).map(function(item) {
      return '• ' + item.category + ' (' + item.method + '): ' + item.subject;
    }).join('<br>');

    if (processedEmails.length > 10) {
      detailsText += '<br>...(and ' + (processedEmails.length - 10) + ' more)';
    }

    card.addSection(CardService.newCardSection()
      .setHeader('📧 ' + t('processing_details'))
      .setCollapsible(true)
      .setNumUncollapsibleWidgets(0)
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">' + detailsText + '</font>')));
  }

  // Refresh tip
  if (processed > 0) {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e67e22">💡 Tip: Labels have been added, refresh Gmail page to see them</font>')));
  }

  // Action buttons
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('← Back to Home')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('goToDashboard'))));

  return card.build();
}

/**
 * ==========================================
 * Context Cards
 * ==========================================
 */

/**
 * Minimal Classification Card (Exact Match)
 */
function buildMinimalClassifiedCard(message, result) {
  var senderEmail = extractEmail(message.getFrom());

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✅ ' + result.category)
      .setSubtitle(senderEmail))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Match Method')
        .setContent(getSourceLabel(result.source))
        .setIcon(CardService.Icon.STAR)))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">✨ Automation enabled, no manual action needed</font>')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('↩️ Undo')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('undoApplyFromCard')
          .setParameters({
            threadId: message.getThread().getId(),
            category: result.category
          }))))

    .build();

  return [card];
}

/**
 * Full Classification Card (Domain match or rule match, needs confirmation)
 */
function buildClassifiedCard(message, result) {
  var senderEmail = extractEmail(message.getFrom());
  var subject = message.getSubject();

  // Detect if it's a long article (may trigger SaaS conversion)
  var wordCount = estimateWordCount(message.getPlainBody());
  var isLongArticle = wordCount > 3000;

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🔍 ' + t('dashboard_title'))
      .setSubtitle(senderEmail))

    // Classification information
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel(t('identified_category'))
        .setContent(result.category)
        .setIcon(CardService.Icon.BOOKMARK))

      .addWidget(CardService.newKeyValue()
        .setTopLabel(t('match_method'))
        .setContent(getSourceLabel(result.source))))

    // Action buttons
    .addSection(CardService.newCardSection()
      .setHeader('Quick Actions')

      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText(t('confirm_apply'))
          .setOnClickAction(CardService.newAction()
            .setFunctionName('applyLabelFromCard')
            .setParameters({
              messageId: message.getId(),
              category: result.category
            })))

        .addButton(CardService.newTextButton()
          .setText(t('incorrect'))
          .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('rejectClassification')
            .setParameters({
              messageId: message.getId(),
              suggestedCategory: result.category
            })))));

  // Why section (collapsible)
  try {
    if (typeof UI_FLAGS !== 'undefined' && UI_FLAGS.enableWhySection && result && result.features && result.features.length > 0) {
      card.addSection(buildWhySection(result));
    }
  } catch (eWhy) { /* ignore */ }

  // Long article conversion prompt (contextual)
  if (isLongArticle && shouldShowLongArticleCTA()) {
    card.addSection(CardService.newCardSection()
      .setHeader(t('long_article_tip'))

      .addWidget(CardService.newTextParagraph()
        .setText('This article is about <b>' + wordCount + '</b> words, estimated reading time <b>' +
                Math.ceil(wordCount / 500) + '</b> minutes'))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">Want AI to generate automatic summaries?<br>' +
                'Understand key points in just 1 minute ✨</font>'))

      .addWidget(CardService.newTextButton()
        .setText(t('try_saas'))
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://chrono.app?utm_source=lite&utm_medium=long_article&word_count=' + wordCount))));
  }

  card = card.build();
  return [card];
}

/**
 * Unknown Sender Card (Contribution Prompt)
 */
function buildUnknownSenderCard(message) {
  var senderEmail = extractEmail(message.getFrom());

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❓ ' + t('unknown_sender'))
      .setSubtitle(senderEmail))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(t('contrib_help'))))

    // Quick labeling
    .addSection(CardService.newCardSection()
      .setHeader(t('what_is_this'))

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

    // Submit to database
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText(t('submit_to_oss'))
        .setOpenLink(CardService.newOpenLink()
          .setUrl('https://github.com/msylctt/chrono-lite/issues/new?title=New+Sender:+' +
                  encodeURIComponent(senderEmail)))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT)))

    .build();

  return [card];
}

/**
 * Error Card
 */
function buildErrorCard(errorMessage) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(t('error_title')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(t('error_message').replace('{msg}', errorMessage)))

      .addWidget(CardService.newTextButton()
        .setText(t('refresh'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('refreshCard'))))

    .build();

  return [card];
}

/**
 * ==========================================
 * Action Handlers
 * ==========================================
 */

/**
 * Run Initialization
 */
function runInitialization(e) {
  try {
    Logger.log('🚀 Starting initialization...');

    // 0. Get user configuration
    var userProps = PropertiesService.getUserProperties();
    var processDays = userProps.getProperty('chrono_process_days') || '7';
    var processLimit = parseInt(userProps.getProperty('chrono_process_limit') || '20');

    Logger.log('Configuration: days=' + processDays + ', limit=' + processLimit);

    // Store execution log to UserProperties for progress card reading
    var executionLog = [];

    // 1. Load database
    executionLog.push('Step 1/3: Loading sender database...');
    Logger.log('📥 Loading sender database...');
    var meta = storeShardedDatabase();

    if (!meta) {
      throw new Error('Database loading failed');
    }

    executionLog.push('✅ Database loaded successfully (' + meta.totalEntries + ' records)');

    // 2. Process emails (using user configuration)
    executionLog.push('Step 2/3: Classifying emails...');
    Logger.log('📧 Processing emails...');
    var query = 'in:inbox newer_than:' + processDays + 'd';
    var threads = GmailApp.search(query, 0, processLimit);
    var processed = 0;
    var categoryStats = {};

    Logger.log('Query: ' + query + ', found ' + threads.length + ' emails');
    executionLog.push('Found ' + threads.length + ' emails');

    threads.forEach(function(thread, index) {
      try {
        var message = thread.getMessages()[0];
        var result = classifyEmail(message);

        // No confidence limit, process all classifiable emails
        if (result) {
          applyCategory(thread, result.category);
          processed++;

          // Statistics by category
          categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;

          // Record every 5 processed emails
          if ((index + 1) % 5 === 0) {
            executionLog.push('Processed: ' + (index + 1) + '/' + threads.length);
          }
        }
      } catch (error) {
        Logger.log('⚠️ Failed to process email: ' + error.message);
      }
    });

    executionLog.push('✅ Email classification complete (' + processed + '/' + threads.length + ')');

    // Add classification statistics
    Object.keys(categoryStats).forEach(function(cat) {
      executionLog.push('  • ' + cat + ': ' + categoryStats[cat] + ' emails');
    });

    // 3. Mark as initialized and create automation trigger
    executionLog.push('Step 3/3: Completing initialization setup');
    userProps.setProperty('chrono_initialized', 'true');

    // Automatically create scheduled trigger
    try {
      createAutoProcessTrigger();
      executionLog.push('✅ Automation enabled (runs hourly)');
    } catch (error) {
      Logger.log('⚠️ Failed to create trigger: ' + error.message);
      executionLog.push('⚠️ Automation enable failed, please enable manually');
    }

    Logger.log('✅ Initialization complete!');
    executionLog.push('✅ All done!');

    // Build result card
    var resultCard = buildInitializationResultCard(processed, threads.length, categoryStats, executionLog);

    // 4. Return success notification
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Initialization complete! Processed ' + processed + '/' + threads.length + ' emails'))
      .setNavigation(CardService.newNavigation()
        .updateCard(resultCard))
      .build();

  } catch (error) {
    Logger.log('❌ Initialization failed: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Initialization failed: ' + error.message))
      .build();
  }
}

/**
 * Start initialization in preview mode (labels only)
 */
function startInitializationPreview(e) {
  try {
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_preview_mode', 'true');
    // delegate to normal initialization
    return runInitialization(e);
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Preview init failed: ' + error.message))
      .build();
  }
}

/**
 * Apply Label from Card
 */
function applyLabelFromCard(e) {
  try {
    var messageId = e.parameters.messageId;
    var category = e.parameters.category;

    Logger.log('Applying label: ' + category + ' to ' + messageId);

    var message = GmailApp.getMessageById(messageId);
    var thread = message.getThread();

    applyCategory(thread, category);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Label applied: ' + category))
      .build();

  } catch (error) {
    Logger.log('❌ Failed to apply label: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Operation failed: ' + error.message))
      .build();
  }
}

/**
 * Reject Classification
 */
function rejectClassification(e) {
  var messageId = e.parameters.messageId;
  var suggestedCategory = e.parameters.suggestedCategory;

  // Record user feedback (for database improvement)
  Logger.log('User rejected classification: ' + suggestedCategory + ' for ' + messageId);

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ Your feedback has been recorded, thank you for improving Chrono'))
    .build();
}

/**
 * Suggest Category
 */
function suggestCategory(e) {
  var email = e.parameters.email;
  var category = e.parameters.category;

  // Record user suggestion (can be submitted to database later)
  Logger.log('User suggested classification: ' + email + ' → ' + category);

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('✅ Thank you for your contribution! We will review and add it'))
    .build();
}

/**
 * Manual Sync
 */
function manualSync(e) {
  try {
    Logger.log('🔄 Starting manual sync...');

    // Get user configuration
    var userProps = PropertiesService.getUserProperties();
    var processDays = userProps.getProperty('chrono_process_days') || '7';
    var processLimit = parseInt(userProps.getProperty('chrono_process_limit') || '20');

    // Use configured scope
    var query = 'in:inbox newer_than:' + processDays + 'd';
    var threads = GmailApp.search(query, 0, processLimit);
    var processed = 0;
    var categoryStats = {};
    var processedEmails = [];
    var skippedLowConfidence = 0;
    var unclassified = 0;

    Logger.log('Query: ' + query + ', found ' + threads.length + ' emails');

    threads.forEach(function(thread, index) {
      try {
        var message = thread.getMessages()[0];
        var result = classifyEmail(message);
        var senderEmail = extractEmail(message.getFrom());
        var subject = message.getSubject();

        // Detailed logging
        if (result) {
          Logger.log((index + 1) + '. ' + senderEmail + ' → ' + result.category +
                    ' (' + result.method + ')');

          // Process all classifiable emails
          applyCategory(thread, result.category);
          processed++;

          // Statistics by category
          categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;

          // Record processed emails (truncate subject to first 30 characters)
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
          Logger.log((index + 1) + '. ' + senderEmail + ' → Unclassified');
        }
      } catch (error) {
        Logger.log('⚠️ Failed to process email: ' + error.message);
      }
    });

    Logger.log('✅ Sync complete!');
    Logger.log('  - Processed: ' + processed + '/' + threads.length);
    Logger.log('  - Low confidence skipped: ' + skippedLowConfidence);
    Logger.log('  - Unclassified: ' + unclassified);

    // Build result card
    var resultCard = buildSyncResultCard(processed, threads.length, categoryStats, processedEmails, skippedLowConfidence, unclassified);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Sync complete! Processed ' + processed + '/' + threads.length + ' emails'))
      .setNavigation(CardService.newNavigation()
        .updateCard(resultCard))
      .build();

  } catch (error) {
    Logger.log('❌ Sync failed: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Sync failed: ' + error.message))
      .build();
  }
}

/**
 * Force Update Database (called from UI)
 */
function forceUpdateDatabase(e) {
  try {
    Logger.log('📥 Force updating database...');

    // Clear cache
    clearSenderCache();

    // Reload
    var meta = storeShardedDatabase();

    if (!meta) {
      throw new Error('Database loading failed');
    }

    Logger.log('✅ Database update complete!');

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Database updated! Total ' + meta.totalEntries + ' records'))
      .build();

  } catch (error) {
    Logger.log('❌ Database update failed: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Update failed: ' + error.message))
      .build();
  }
}

/**
 * Clear Test Labels (called from UI)
 */
function clearTestLabelsFromUI(e) {
  try {
    Logger.log('🧹 Clearing test labels...');

    clearTestLabels();

    // Build result card, prompt user to refresh
    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('✅ Cleanup Complete')
        .setSubtitle('All Chrono labels have been removed'))

      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('<b>Completed operations:</b><br>' +
                  '• Deleted all Chrono labels<br>' +
                  '• Removed labels from emails<br><br>' +
                  '<font color="#e67e22"><b>💡 Important:</b></font><br>' +
                  '<font color="#e67e22">Please refresh Gmail page to see updates</font>')))

      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('<font color="#666666">Refresh method: Press Cmd/Ctrl + R<br>' +
                  'or click browser refresh button</font>')))

      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextButton()
          .setText('← Back to Home')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('goToDashboard'))))

      .build();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ All Chrono labels cleared, please refresh Gmail page'))
      .setNavigation(CardService.newNavigation()
        .updateCard(card))
      .build();

  } catch (error) {
    Logger.log('❌ Cleanup failed: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Cleanup failed: ' + error.message))
      .build();
  }
}

/**
 * Trigger Auto Process (for Debug)
 */
function triggerAutoProcess(e) {
  try {
    Logger.log('🤖 Manually triggering auto process...');

    // Directly call auto process function
    autoProcessInbox();

    // Get processing results
    var userProps = PropertiesService.getUserProperties();
    var lastProcessed = userProps.getProperty('chrono_last_processed') || '0';

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Auto scan complete! Processed ' + lastProcessed + ' emails'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('❌ Auto process failed: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Auto scan failed: ' + error.message))
      .build();
  }
}

/**
 * Enable Debug Mode
 */
function enableDebugMode(e) {
  try {
    Logger.log('🐛 Enabling Debug mode...');

    // Create Debug trigger
    createDebugEmailTrigger();

    // Immediately send a test email
    sendDebugTestEmail();

    // Persist debug status
    try {
      var u = PropertiesService.getUserProperties();
      u.setProperty('chrono_debug_enabled', 'true');
      u.setProperty('chrono_debug_enabled_at', '' + Date.now());
      u.setProperty('chrono_debug_last_email', '' + Date.now());
    } catch (eProps1) { /* ignore */ }

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Debug mode enabled! First test email sent'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('❌ Failed to enable Debug mode: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Enable failed: ' + error.message))
      .build();
  }
}

/**
 * Disable Debug Mode
 */
function disableDebugMode(e) {
  try {
    Logger.log('🐛 Disabling Debug mode...');

    // Delete Debug trigger
    deleteDebugEmailTrigger();

    // Persist debug status
    try {
      var u = PropertiesService.getUserProperties();
      u.setProperty('chrono_debug_enabled', 'false');
    } catch (eProps2) { /* ignore */ }

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Debug mode disabled'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('❌ Failed to disable Debug mode: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Disable failed: ' + error.message))
      .build();
  }
}

/**
 * Open Settings Page
 */
function openSettings(e) {
  // Get current configuration
  var userProps = PropertiesService.getUserProperties();
  var processDays = userProps.getProperty('chrono_process_days') || '7';
  var processLimit = userProps.getProperty('chrono_process_limit') || '20';
  var triggerInterval = userProps.getProperty('chrono_trigger_interval') || '1hour';

  // Get database metadata
  var meta = getCacheMeta();
  var dbInfo = meta ?
    'Version: ' + (meta.version || 'unknown') + ' | Entries: ' + meta.totalEntries :
    'Not loaded';

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚙️ ' + t('settings_btn'))
      .setSubtitle('Configure ' + t('dashboard_title')))

    // Database information
    .addSection(CardService.newCardSection()
      .setHeader('📊 Database Status')

      .addWidget(CardService.newKeyValue()
        .setTopLabel('Current Database')
        .setContent(dbInfo)
        .setIcon(CardService.Icon.DESCRIPTION))

      .addWidget(CardService.newTextButton()
        .setText('View Category List')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('viewCategories'))))

    // Automation trigger settings
    .addSection(CardService.newCardSection()
      .setHeader('⏰ Automation Run Cycle')

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">Set frequency for automatic email scanning<br>' +
                '<font color="#e67e22">⚠️ Gmail Add-on limit: minimum interval 1 hour</font></font>'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('Run Frequency')
        .setFieldName('trigger_interval')
        .addItem('Every hour (recommended)', '1hour', triggerInterval === '1hour')
        .addItem('Every 2 hours', '2hour', triggerInterval === '2hour')
        .addItem('Every 4 hours', '4hour', triggerInterval === '4hour')
        .addItem('Every 6 hours', '6hour', triggerInterval === '6hour')
        .addItem('Every 12 hours', '12hour', triggerInterval === '12hour')
        .addItem('Daily', '24hour', triggerInterval === '24hour'))

      .addWidget(CardService.newTextButton()
        .setText('💾 Save & Restart Trigger')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('saveTriggerInterval')))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">💡 Tip: Use "Trigger Auto Scan" button to execute immediately</font>')))

    // Processing scope configuration
    .addSection(CardService.newCardSection()
      .setHeader('📧 Email Processing Scope')

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">Configure email processing scope for initialization and manual sync</font>'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('Time Range')
        .setFieldName('process_days')
        .addItem('Last 1 day', '1', processDays === '1')
        .addItem('Last 3 days', '3', processDays === '3')
        .addItem('Last 7 days (recommended)', '7', processDays === '7')
        .addItem('Last 14 days', '14', processDays === '14')
        .addItem('Last 30 days', '30', processDays === '30'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('Email Count')
        .setFieldName('process_limit')
        .addItem('10 emails', '10', processLimit === '10')
        .addItem('20 emails (recommended)', '20', processLimit === '20')
        .addItem('50 emails', '50', processLimit === '50')
        .addItem('100 emails', '100', processLimit === '100')
        .addItem('200 emails', '200', processLimit === '200'))

      .addWidget(CardService.newTextButton()
        .setText('💾 Save Configuration')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('saveProcessingConfig'))))

    // Preferences
    .addSection(CardService.newCardSection()
      .setHeader(t('preview_mode_title'))

      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setTitle(t('preview_mode_label'))
        .setFieldName('preview_mode')
        .addItem(t('preview_mode_enable'), 'true', (PropertiesService.getUserProperties().getProperty('chrono_preview_mode') === 'true')))

      .addWidget(CardService.newTextButton()
        .setText(t('save_preferences'))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('savePreferences'))))

    // Dangerous operations
    .addSection(CardService.newCardSection()
      .setHeader('⚠️ Dangerous Operations')

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e74c3c"><b>Warning:</b> The following operations are irreversible</font>'))

      .addWidget(CardService.newTextButton()
        .setText('🔄 Complete Reset')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('confirmResetAll'))
        .setTextButtonStyle(CardService.TextButtonStyle.TEXT))

      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">Will delete all Chrono labels,<br>clear cache and configuration, restore to initial state</font>')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('← Back to Home')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('returnToDashboard'))))

    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card))
    .build();
}

/**
 * Save Preferences (preview mode)
 */
function savePreferences(e) {
  try {
    var formInput = e.formInput || {};
    var preview = formInput.preview_mode;
    var enabled = false;
    if (preview) {
      if (Array.isArray(preview)) { enabled = preview.indexOf('true') !== -1; }
      else { enabled = (preview === 'true'); }
    }

    PropertiesService.getUserProperties().setProperty('chrono_preview_mode', enabled ? 'true' : 'false');

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(enabled ? '✅ Preview mode enabled' : '✅ Preview mode disabled'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Save failed: ' + error.message))
      .build();
  }
}

/**
 * View Category List
 */
function viewCategories(e) {
  var categories = Object.keys(CATEGORIES);
  var meta = getCacheMeta();

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('📁 Category List')
      .setSubtitle('Currently supported email categories'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<b>Database Information</b><br>' +
                'Entries: ' + (meta ? meta.totalEntries : 'Unknown') + '<br>' +
                'Version: ' + (meta ? meta.version : 'Unknown'))));

  // Display each category
  categories.forEach(function(categoryName) {
    var config = CATEGORIES[categoryName];
    var actionText = config.action === 'archive' ? '📦 Archive' : '📥 Keep';
    var readText = config.markRead ? '✓ Read' : '○ Unread';

    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel(categoryName)
        .setContent(config.label)
        .setBottomLabel(actionText + ' | ' + readText)
        .setIcon(CardService.Icon.BOOKMARK)));
  });

  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('<font color="#666666">💡 Modify Config.gs to customize category rules</font>'))

    .addWidget(CardService.newTextButton()
      .setText('← Back to Settings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('openSettings'))));

  card = card.build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card))
    .build();
}

/**
 * Save Trigger Interval
 */
function saveTriggerInterval(e) {
  try {
    var formInput = e.formInput;
    var triggerInterval = formInput.trigger_interval;

    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_trigger_interval', triggerInterval);

    Logger.log('Saving trigger interval: ' + triggerInterval);

    // Recreate trigger
    createAutoProcessTrigger(triggerInterval);

    var intervalLabel = getIntervalLabel(triggerInterval);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Trigger updated to ' + intervalLabel))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('Failed to save trigger interval: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Save failed: ' + error.message))
      .build();
  }
}

/**
 * Save Processing Configuration
 */
function saveProcessingConfig(e) {
  try {
    var formInput = e.formInput;
    var processDays = formInput.process_days;
    var processLimit = formInput.process_limit;

    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('chrono_process_days', processDays);
    userProps.setProperty('chrono_process_limit', processLimit);

    Logger.log('Saving configuration: days=' + processDays + ', limit=' + processLimit);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Configuration saved'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    Logger.log('Failed to save configuration: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Save failed: ' + error.message))
      .build();
  }
}

/**
 * Confirm Reset (Secondary Confirmation)
 */
function confirmResetAll(e) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚠️ Confirm Reset')
      .setSubtitle('This operation is irreversible'))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#e74c3c"><b>Warning: About to execute the following operations</b></font><br><br>' +
                '1️⃣ Delete all Chrono labels<br>' +
                '2️⃣ Remove labels from emails<br>' +
                '3️⃣ Clear all cache data<br>' +
                '4️⃣ Reset user configuration<br><br>' +
                '<b>Emails themselves will not be deleted</b>, but will be restored to unclassified state')))

    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#666666">This operation is expected to take 1-2 minutes</font>'))

      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔄 Confirm Reset')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('executeResetAll'))
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED))

        .addButton(CardService.newTextButton()
          .setText('❌ Cancel')
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
 * Execute Complete Reset
 */
function executeResetAll(e) {
  try {
    Logger.log('🔄 Starting complete reset...');

    // 1. Delete all Chrono labels
    Logger.log('Deleting labels...');
    clearTestLabels();

    // 2. Clear cache
    Logger.log('Clearing cache...');
    clearSenderCache();

    // 3. Reset user configuration
    Logger.log('Resetting configuration...');
    var userProps = PropertiesService.getUserProperties();
    userProps.deleteProperty('chrono_initialized');
    userProps.deleteProperty('chrono_process_days');
    userProps.deleteProperty('chrono_process_limit');

    Logger.log('✅ Reset complete!');

    var onboardingCard = buildOnboardingCard();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Completely reset to initial state'))
      .setNavigation(CardService.newNavigation()
        .updateCard(onboardingCard[0]))
      .build();

  } catch (error) {
    Logger.log('❌ Reset failed: ' + error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Reset failed: ' + error.message))
      .build();
  }
}

/**
 * Return to Dashboard
 */
function returnToDashboard(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .popCard())
    .build();
}

/**
 * Build Trigger Status Display Widget
 */
function buildTriggerStatusWidget(status) {
  // Not enabled
  if (!status.enabled) {
    var hintText = status.hint || 'Automatically created after initialization';
    return CardService.newTextParagraph()
      .setText('<font color="#666666">' + status.message + '<br>' + hintText + '</font>');
  }

  // Enabled, show details
  var nextRunText = 'Next run: ';
  if (status.nextRun) {
    var nextDate = new Date(status.nextRun);
    var now = new Date();
    var diffMinutes = Math.round((nextDate - now) / 60000);

    if (diffMinutes < 0) {
      nextRunText += 'About to run';
    } else if (diffMinutes < 60) {
      nextRunText += diffMinutes + ' minutes later';
    } else {
      var diffHours = Math.floor(diffMinutes / 60);
      nextRunText += diffHours + ' hours later';
    }
  } else {
    nextRunText += 'Within about 1 hour';
  }

  var lastRunText = '';
  if (status.lastRun) {
    var lastDate = new Date(status.lastRun);
    lastRunText = '<br>Last run: ' + formatRelativeTime(lastDate) + ' (processed ' + status.lastProcessed + ' emails)';
  } else {
    lastRunText = '<br><font color="#e67e22">Waiting for first run...</font>';
  }

  return CardService.newTextParagraph()
    .setText('<font color="#666666">' + status.message + '<br>' +
            nextRunText + lastRunText + '</font>');
}

/**
 * Get Debug Mode Status (from UserProperties)
 */
function getDebugModeStatus() {
  try {
    var u = PropertiesService.getUserProperties();
    var enabled = u.getProperty('chrono_debug_enabled') === 'true';
    var lastEmail = u.getProperty('chrono_debug_last_email');
    var enabledAt = u.getProperty('chrono_debug_enabled_at');
    return {
      enabled: enabled,
      lastEmail: lastEmail ? parseInt(lastEmail, 10) : null,
      enabledAt: enabledAt ? parseInt(enabledAt, 10) : null
    };
  } catch (e) {
    return { enabled: false };
  }
}

/**
 * Build Debug Mode Status Display Widget
 */
function buildDebugStatusWidget(debugStatus) {
  var statusText = '✅ Automatically sends test emails every hour';

  if (debugStatus.lastEmail) {
    var lastEmailDate = new Date(debugStatus.lastEmail);
    statusText += '<br>Last sent: ' + formatRelativeTime(lastEmailDate);
  }

  if (debugStatus.enabledAt) {
    var enabledDate = new Date(debugStatus.enabledAt);
    statusText += '<br>Enabled at: ' + formatRelativeTime(enabledDate);
  }

  statusText += '<br><br><font color="#e67e22">💡 Observe [Test] emails in inbox to check if they are automatically classified</font>';

  return CardService.newTextParagraph()
    .setText('<font color="#666666">' + statusText + '</font>');
}

/**
 * Format Relative Time
 */
function formatRelativeTime(date) {
  var now = new Date();
  var diffMs = now - date;
  var diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return diffMinutes + ' minutes ago';

  var diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return diffHours + ' hours ago';

  var diffDays = Math.floor(diffHours / 24);
  return diffDays + ' days ago';
}


/**
 * Enable Automation (Action Handler)
 */
function enableAutomation(e) {
  try {
    createAutoProcessTrigger();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Automation enabled'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Enable failed: ' + error.message))
      .build();
  }
}

/**
 * Disable Automation (Action Handler)
 */
function disableAutomation(e) {
  try {
    deleteAutoProcessTrigger();

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('⏸️ Automation disabled'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildDashboardCard()[0]))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Disable failed: ' + error.message))
      .build();
  }
}

/**
 * Go to Dashboard (for result cards)
 */
function goToDashboard(e) {
  var dashboardCard = buildDashboardCard();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .updateCard(dashboardCard[0]))
    .build();
}

/**
 * Refresh Card
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
 * Helper Functions
 * ==========================================
 */

/**
 * Get Email Statistics
 */
function getEmailStats() {
  try {
    var props = PropertiesService.getUserProperties();
    var cacheKey = 'chrono_stats_cache_v1';
    var ttlMs = 5 * 60 * 1000; // 5 minutes
    var now = new Date().getTime();

    // Read cache
    var raw = props.getProperty(cacheKey);
    if (raw) {
      try {
        var cached = JSON.parse(raw);
        if (cached && cached.ts && (now - cached.ts) < ttlMs) {
          return { todayProcessed: cached.todayProcessed || 0, newsletterUnread: cached.newsletterUnread || 0 };
        }
      } catch (e1) { /* ignore parse errors */ }
    }

    // Compute fresh stats
    var todayProcessed = GmailApp.search('newer_than:1d label:Chrono').length;
    var newsletterUnread = GmailApp.search('label:Chrono/Newsletter is:unread').length;

    // Write cache
    try {
      props.setProperty(cacheKey, JSON.stringify({ ts: now, todayProcessed: todayProcessed, newsletterUnread: newsletterUnread }));
    } catch (e2) { /* ignore set errors */ }

    return { todayProcessed: todayProcessed, newsletterUnread: newsletterUnread };

  } catch (error) {
    Logger.log('Failed to get statistics: ' + error.message);
    return { todayProcessed: 0, newsletterUnread: 0 };
  }
}

/**
 * Get Source Label (Translation)
 */
function getSourceLabel(source) {
  var labels = {
    'database_exact': '🎯 Exact Match',
    'database_domain': '🌐 Domain Match',
    'heuristic': '🧠 Rule Match'
  };
  return labels[source] || source;
}

/**
 * i18n helpers & navbar / why / CTA frequency (minimal inline impl)
 */
function getUserLocale() {
  try { return (Session.getActiveUserLocale && Session.getActiveUserLocale()) || 'en'; } catch (e) { return 'en'; }
}
var I18N = {
  en: {
    home: 'Home', actions: 'Actions', settings: 'Settings', why: 'Why identified',
    dashboard_title: 'Chrono Lite', dashboard_subtitle: 'Email Classification Statistics',
    automation_status: 'Automation Status', status: 'Status', enabled: 'Enabled', disabled: 'Disabled',
    today_stats: "Today's Statistics", processed: 'Processed', newsletter_unread: 'Newsletter Unread',
    quick_actions: 'Quick Actions', manual_sync: 'Manual Sync Inbox', trigger_auto: 'Trigger Auto Scan (Debug)',
    enable_debug: '🐛 Enable Debug Mode', disable_debug: '🐛 Disable Debug Mode', update_db: 'Update Sender Database', clear_test_labels: 'Clear Test Labels',
    settings_help: 'Settings & Help', settings_btn: 'Settings', help_feedback: 'Help & Feedback',
    onboarding_title: 'Welcome to Chrono Lite', onboarding_subtitle: 'Gmail Inbox Automation Assistant',
    onboarding_qs: '3-Step Quick Start', onboarding_qs_1: '① Load sender database', onboarding_qs_2: '② Auto-classify test emails', onboarding_qs_3: '③ Enable automation workflow',
    onboarding_bullets_tip: '✨ Inbox zero in just 3 minutes', onboarding_bullets_privacy: '🔒 Runs entirely in your Gmail', onboarding_bullets_db: '📊 Supports 5000+ Newsletter recognition',
    op_instructions: 'Operation Instructions', op_instructions_body: '<b>Initialization will perform the following operations:</b><br><br>• Download and cache sender database (5000+ entries)<br>• Auto-classify 20 emails from the last 7 days<br>• Add Chrono labels to identified emails<br>• Archive/mark as read based on configuration<br><br><font color="#e67e22"><b>Note:</b> Some emails may be moved out of inbox</font><br><font color="#666666">You can <b>undo</b> on the email card if needed</font>',
    start_init: '🚀 Start Initialization', start_preview: '🧪 Start in Preview Mode', custom_settings: '⚙️ Custom Settings', view_user_guide: '📖 View User Guide',
    init_complete: 'Initialization Complete', init_processed_of: 'Processed {p}/{t} emails',
    processing_results: 'Processing Results', none_found: 'No classifiable emails found', back_home: '← Back to Home', open_settings: '⚙️ Open Settings',
    sync_complete: 'Sync Complete', unclassified: 'Unclassified', processing_details: 'Processing Details',
    minimal_auto_tip: '✨ Automation enabled, no manual action needed', undo: '↩️ Undo',
    identified_category: 'Identified Category', match_method: 'Match Method', confirm_apply: '✅ Confirm & Apply', incorrect: '❌ Incorrect',
    unknown_sender: 'Unknown Sender', contrib_help: 'You can help improve Chrono Lite', what_is_this: 'What do you think this is:', submit_to_oss: '📤 Submit to Open Source Database',
    long_article_tip: '💡 Long Article Tip', try_saas: '🚀 Try Chrono SaaS Free',
    error_title: '❌ Error Occurred', error_message: '<b>Error Message:</b><br>{msg}', refresh: '🔄 Refresh',
    whats_new_title: "What's New", whats_new_body: 'UI refreshed: faster actions, undo support, and smarter tips.', dismiss: 'Dismiss',
    preview_mode_title: '🔧 Preferences', preview_mode_label: 'Preview Mode (labels only, no archive/read)', preview_mode_enable: 'Enable', save_preferences: '💾 Save Preferences', saved: '✅ Saved',
    preview_enabled: '✅ Preview mode enabled', preview_disabled: '✅ Preview mode disabled', save_failed: '❌ Save failed: {msg}',
    trigger_updated: '✅ Trigger updated to {label}', config_saved: '✅ Configuration saved'
  },
  zh_cn: {
    home: '主页', actions: '操作', settings: '设置', why: '为什么被识别',
    dashboard_title: 'Chrono Lite', dashboard_subtitle: '邮件分类统计',
    automation_status: '自动化状态', status: '状态', enabled: '已启用', disabled: '未启用',
    today_stats: '今日统计', processed: '已处理', newsletter_unread: 'Newsletter 未读',
    quick_actions: '快捷操作', manual_sync: '手动同步收件箱', trigger_auto: '触发自动扫描（调试）',
    enable_debug: '🐛 启用调试模式', disable_debug: '🐛 关闭调试模式', update_db: '更新发件人数据库', clear_test_labels: '清理测试标签',
    settings_help: '设置与帮助', settings_btn: '设置', help_feedback: '帮助与反馈',
    onboarding_title: '欢迎使用 Chrono Lite', onboarding_subtitle: 'Gmail 收件箱自动化助手',
    onboarding_qs: '三步快速开始', onboarding_qs_1: '① 加载发件人数据库', onboarding_qs_2: '② 自动分类测试邮件', onboarding_qs_3: '③ 启用自动化流程',
    onboarding_bullets_tip: '✨ 3 分钟内看到效果', onboarding_bullets_privacy: '🔒 完全运行在你的 Gmail 账户', onboarding_bullets_db: '📊 识别 5000+ Newsletter',
    op_instructions: '操作说明', op_instructions_body: '<b>初始化将执行以下操作：</b><br><br>• 下载并缓存发件人数据库（5000+）<br>• 自动分类最近 7 天 20 封邮件<br>• 为识别的邮件添加 Chrono 标签<br>• 按配置进行归档/标记已读<br><br><font color="#e67e22"><b>注意：</b>部分邮件可能移出收件箱</font><br><font color="#666666">如需还原，可在邮件卡片中<b>撤销</b></font>',
    start_init: '🚀 开始初始化', start_preview: '🧪 以预览模式开始', custom_settings: '⚙️ 自定义设置', view_user_guide: '📖 查看使用指南',
    init_complete: '初始化完成', init_processed_of: '已处理 {p}/{t} 封邮件',
    processing_results: '处理结果', none_found: '未找到可分类的邮件', back_home: '← 返回首页', open_settings: '⚙️ 打开设置',
    sync_complete: '同步完成', unclassified: '未分类', processing_details: '处理详情',
    minimal_auto_tip: '✨ 自动化已启用，无需手动操作', undo: '↩️ 撤销',
    identified_category: '识别的类别', match_method: '匹配方式', confirm_apply: '✅ 确认并执行', incorrect: '❌ 不正确',
    unknown_sender: '未知发件人', contrib_help: '你可以帮助改进 Chrono Lite', what_is_this: '你认为这是：', submit_to_oss: '📤 提交到开源数据库',
    long_article_tip: '💡 长文提示', try_saas: '🚀 免费试用 Chrono SaaS',
    error_title: '❌ 发生错误', error_message: '<b>错误信息：</b><br>{msg}', refresh: '🔄 刷新',
    whats_new_title: '新版本说明', whats_new_body: 'UI 焕新：更快的操作、撤销支持与更智能的提示。', dismiss: '忽略',
    preview_mode_title: '🔧 偏好', preview_mode_label: '预览模式（仅打标，不归档/不改已读）', preview_mode_enable: '启用', save_preferences: '💾 保存偏好', saved: '✅ 已保存',
    preview_enabled: '✅ 已开启预览模式', preview_disabled: '✅ 已关闭预览模式', save_failed: '❌ 保存失败：{msg}',
    trigger_updated: '✅ 触发器已更新为 {label}', config_saved: '✅ 配置已保存'
  }
};
function t(key) {
  var loc = (getUserLocale() || 'en').toLowerCase();
  var lang = I18N[loc] ? loc : (loc.indexOf('zh') === 0 ? 'zh_cn' : 'en');
  return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] || key);
}
// buildNavBar removed per design (no pseudo tabs)
function buildWhySection(result) {
  var features = (result && result.features) ? result.features : [];
  if (!features.length) features = [];
  var text = features.map(function(f){ return '• ' + f; }).join('<br>');
  return CardService.newCardSection()
    .setHeader(t('why'))
    .setCollapsible(true)
    .setNumUncollapsibleWidgets(0)
    .addWidget(CardService.newTextParagraph().setText('<font color="#666666">' + (text || '-') + '</font>'));
}
function shouldShowLongArticleCTA() {
  try {
    var props = PropertiesService.getUserProperties();
    var raw = props.getProperty('cta_long_article');
    var data = raw ? JSON.parse(raw) : { ts: 0, count: 0 };
    var now = Date.now();
    if (now - data.ts > 7 * 24 * 3600 * 1000) data = { ts: now, count: 0 };
    if (data.count >= 3) return false;
    data.count += 1; data.ts = now; props.setProperty('cta_long_article', JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

function shouldShowWhatsNew() {
  try {
    var props = PropertiesService.getUserProperties();
    var raw = props.getProperty('ui_whats_new');
    var data = raw ? JSON.parse(raw) : { ts: 0, count: 0 };
    var now = Date.now();
    if (now - data.ts > 30 * 24 * 3600 * 1000) data = { ts: now, count: 0 };
    if (data.count >= 1) return false; // show at most once per 30 days
    data.count += 1; data.ts = now; props.setProperty('ui_whats_new', JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

function dismissWhatsNew(e) {
  try {
    // No-op, frequency already increased in shouldShowWhatsNew
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('✅ Dismissed'))
      .setNavigation(CardService.newNavigation().updateCard(buildDashboardCard()[0]))
      .build();
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('❌ Failed'))
      .build();
  }
}

/**
 * Estimate Word Count
 */
function estimateWordCount(text) {
  if (!text) return 0;

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Chinese character count + English word count
  var chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  var englishWords = text.match(/[a-zA-Z]+/g) || [];
  var englishCount = englishWords.length;

  return chineseCount + englishCount;
}
