/**
 * Phase 2: 分类引擎
 */

/**
 * 会话级域名缓存
 */
var _domainCache = {};
var _reputationCache = null; // 运行期内缓存一次

/**
 * 日志采样判定
 */
function shouldLogSample() {
  try {
    var r = Math.random();
    return r < (LOG_SAMPLING_RATE || 1.0);
  } catch (e) {
    return true;
  }
}

/**
 * 测试辅助：构造模拟 GmailMessage
 */
function makeMockMessage(from, subject, headers) {
  var _from = from || '';
  var _subject = subject || '';
  var _headers = headers || {};
  return {
    getFrom: function() { return _from; },
    getSubject: function() { return _subject; },
    getHeader: function(name) { return _headers[name] || null; }
  };
}

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
 * 规范化邮箱：小写、移除 + 别名、Gmail 本地部分去点
 */
function normalizeEmail(email) {
  if (!email) return '';
  var lower = (email + '').toLowerCase().trim();
  var parts = lower.split('@');
  if (parts.length !== 2) return lower;
  var local = parts[0];
  var domain = parts[1];
  // 移除 + 别名
  var plusIdx = local.indexOf('+');
  if (plusIdx >= 0) {
    local = local.substring(0, plusIdx);
  }
  // Gmail 本地部分去点
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
  }
  return local + '@' + domain;
}

/**
 * 子域名意图评分
 */
function scoreSubdomainIntent(domain) {
  if (!domain) return { score: 0, features: [] };
  var features = [];
  var score = 0;
  var segments = domain.split('.');
  if (segments.length <= 2) return { score: 0, features: [] }; // 无子域
  var sub = segments.slice(0, segments.length - 2).join('.');
  for (var i = 0; i < SUBDOMAIN_POSITIVE.length; i++) {
    var kw = SUBDOMAIN_POSITIVE[i];
    if (sub.indexOf(kw) !== -1) {
      score += SENDER_CONTEXT_WEIGHTS.subdomain_positive;
      features.push('subdomain+' + kw);
    }
  }
  for (var j = 0; j < SUBDOMAIN_NEGATIVE.length; j++) {
    var nk = SUBDOMAIN_NEGATIVE[j];
    if (sub.indexOf(nk) !== -1) {
      score += SENDER_CONTEXT_WEIGHTS.subdomain_negative;
      features.push('subdomain-' + nk);
    }
  }
  return { score: score, features: features };
}

/**
 * 本地信誉：读取（PropertiesService）
 */
function getLocalReputation() {
  if (_reputationCache) return _reputationCache;
  try {
    var props = PropertiesService.getUserProperties();
    var raw = props.getProperty('CL_REPUTATION');
    _reputationCache = raw ? JSON.parse(raw) : {};
  } catch (e) {
    _reputationCache = {};
  }
  return _reputationCache;
}

/**
 * 写入/更新本地信誉
 */
function updateLocalReputation(key, category, score) {
  try {
    if (typeof FEATURE_FLAGS === 'undefined' || !FEATURE_FLAGS.enableReputation) return;
    if (score < REPUTATION_CONFIG.minScoreToCache) return;
    var now = new Date().getTime();
    var rep = getLocalReputation();
    var entry = rep[key] || { category: category, score: score, hits: 0, updatedAt: now };
    entry.category = category;
    entry.score = score;
    entry.hits = (entry.hits || 0) + 1;
    entry.updatedAt = now;
    rep[key] = entry;
    PropertiesService.getUserProperties().setProperty('CL_REPUTATION', JSON.stringify(rep));
    _reputationCache = rep;
  } catch (e) {
    // ignore
  }
}

/**
 * 读取信誉命中（含 TTL）
 */
function readReputation(key) {
  try {
    var rep = getLocalReputation();
    var entry = rep[key];
    if (!entry) return null;
    var ageDays = (new Date().getTime() - (entry.updatedAt || 0)) / (24*60*60*1000);
    if (ageDays > REPUTATION_CONFIG.ttlDays) {
      return null;
    }
    return entry;
  } catch (e) {
    return null;
  }
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
  var email = extractEmail(from);
  var domain = email.split('@')[1];

  // 头部启发式（Phase A）：仅在开启时计算
  if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableHeaders) {
    var score = 0;
    var features = [];

    // 负面信号优先：Auto-Submitted
    try {
      var autoSubmitted = message.getHeader('Auto-Submitted');
      if (autoSubmitted && /^(?!no$).+/i.test((autoSubmitted + '').trim())) {
        score += HEADER_WEIGHTS.auto_submitted_negative;
        features.push('auto_submitted');
      }
    } catch (e1) {}

    // List-Unsubscribe-Post (RFC 8058)
    try {
      var lup = message.getHeader('List-Unsubscribe-Post');
      if (lup && /one-click/i.test(lup)) {
        score += HEADER_WEIGHTS.list_unsubscribe_post;
        features.push('list_unsubscribe_post');
      }
    } catch (e2) {}

    // List-Unsubscribe (RFC 2369)
    try {
      var lu = message.getHeader('List-Unsubscribe');
      if (lu) {
        score += HEADER_WEIGHTS.list_unsubscribe;
        features.push('list_unsubscribe');
      }
    } catch (e3) {}

    // List-Id (RFC 2919)
    try {
      var lid = message.getHeader('List-Id');
      if (lid) {
        score += HEADER_WEIGHTS.list_id;
        features.push('list_id');
      }
    } catch (e4) {}

    // Precedence
    try {
      var prec = message.getHeader('Precedence');
      if (prec && /bulk|list|junk/i.test(prec)) {
        score += HEADER_WEIGHTS.precedence_bulk;
        features.push('precedence_bulk');
      }
    } catch (e5) {}

    // 常见 ESP 指纹（可选）
    try {
      var xsmtp = message.getHeader('X-SMTPAPI');
      if (xsmtp) {
        score += HEADER_WEIGHTS.x_smtpapi;
        features.push('x_smtpapi');
      }
    } catch (e6) {}
    try {
      var xcid = message.getHeader('X-Campaign-ID');
      if (xcid) {
        score += HEADER_WEIGHTS.x_campaign_id;
        features.push('x_campaign_id');
      }
    } catch (e7) {}

    // Phase B: 子域名意图
    if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableSenderContext && domain) {
      var ctx = scoreSubdomainIntent(domain);
      if (ctx.score !== 0) {
        score += ctx.score;
        features = features.concat(ctx.features);
      }
    }

    // Phase E: 主题关键词权重（合入总分）
    try {
      var subjectLower = subject.toLowerCase();
      for (var sk in SUBJECT_WEIGHTS) {
        if (SUBJECT_WEIGHTS.hasOwnProperty(sk) && subjectLower.indexOf(sk) !== -1) {
          score += SUBJECT_WEIGHTS[sk];
          features.push('subject_' + sk);
        }
      }
    } catch (eSubj) {}

    if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableScoring && score >= CLASSIFIER_THRESHOLD) {
      return {
        category: 'Newsletter',
        source: 'heuristic',
        method: 'headers_scoring',
        score: score,
        threshold: CLASSIFIER_THRESHOLD,
        features: features
      };
    }
  }

  // 平台域名不作为直接分类依据（ESP 域名覆盖泛交易/营销），改由头部/内容/上下文综合判定

  // 主题关键词已纳入加权模型（上方 Phase E），此处不再单独返回

  // 规则 4: 营销邮件特征（仅基于主题）
  // 保留营销主题快捷判断（不参与 newsletter 加权）
  if (subject.match(/sale|discount|offer|deal|促销|优惠/i)) {
    return {
      category: 'Marketing',
      source: 'heuristic',
      method: 'marketing_keyword'
    };
  }

  // Phase D: 内容层（轻量） - 扫描页脚退订
  if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableContent) {
    try {
      var raw = message.getPlainBody ? message.getPlainBody() : (message.getBody ? message.getBody() : '');
      if (raw) {
        var slice = raw.substring(Math.max(0, raw.length - CONTENT_CONFIG.footerScanBytes));
        var txt = (slice + '').toLowerCase();
        var score = 0;
        var kw = CONTENT_CONFIG.keywordWeights || {};
        for (var key in kw) {
          if (kw.hasOwnProperty(key) && txt.indexOf(key) !== -1) {
            score += kw[key];
          }
        }
        if (/unsubscribe/i.test(txt)) {
          score += CONTENT_CONFIG.unsubscribeWeight;
        }
        // 与前述 header/context/subject 得分合并
        if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableScoring && score >= CLASSIFIER_THRESHOLD) {
          return {
            category: 'Newsletter',
            source: 'heuristic',
            method: 'content_footer',
            score: score,
            threshold: CLASSIFIER_THRESHOLD
          };
        }
      }
    } catch (eContent) { /* ignore */ }
  }

  return null;
}

/**
 * 完整分类流程（三级匹配）
 */
function classifyEmail(message) {
  var senderEmail = extractEmail(message.getFrom());
  var normalized = (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableSenderContext) ? normalizeEmail(senderEmail) : senderEmail;
  var normDomain = (normalized && normalized.indexOf('@') !== -1) ? normalized.split('@')[1] : null;

  // Phase C: 信誉快速路径
  if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableReputation) {
    var repKey = normalized.split('@')[1] || normalized; // 优先按域名缓存
    var rep = readReputation(repKey);
    if (rep && rep.category) {
      if (shouldLogSample()) {
        Log.info(Log.Module.CLASSIFIER, 'classified (reputation)', {
          layer: 'R0',
          method: 'local_reputation',
          category: rep.category,
          sender: normalized,
          domain: normDomain
        });
      }
      return {
        category: rep.category,
        source: 'reputation',
        method: 'local_reputation'
      };
    }
  }

  // Level 1: 精确匹配
  var exactResult = classifyByExactMatch(senderEmail);
  if (exactResult) {
    if (shouldLogSample()) {
      Log.info(Log.Module.CLASSIFIER, 'classified (exact)', {
        layer: 'L1',
        method: exactResult.method,
        category: exactResult.category,
        sender: normalized,
        domain: normDomain
      });
    }
    return exactResult;
  }

  // Level 2: 域名匹配
  var domainResult = classifyByDomain(normalized);
  if (domainResult) {
    if (shouldLogSample()) {
      Log.info(Log.Module.CLASSIFIER, 'classified (domain)', {
        layer: 'L2',
        method: domainResult.method,
        category: domainResult.category,
        sender: normalized,
        domain: normDomain
      });
    }
    return domainResult;
  }

  // Level 3: 启发式规则
  var heuristicResult = classifyByHeuristics(message);
  if (heuristicResult) {
    if (shouldLogSample()) {
      Log.info(Log.Module.CLASSIFIER, 'classified (heuristic)', {
        layer: 'L3',
        method: heuristicResult.method,
        score: heuristicResult.score || 0,
        threshold: CLASSIFIER_THRESHOLD,
        category: heuristicResult.category,
        sender: normalized,
        domain: normDomain
      });
    }
    // 写回信誉（高置信度）
    if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableReputation) {
      var repKey2 = normalized.split('@')[1] || normalized;
      var scoreToCache = (heuristicResult.score || 0);
      updateLocalReputation(repKey2, heuristicResult.category, scoreToCache);
    }
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
    var normalized = (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableSenderContext) ? normalizeEmail(email) : email;
    var domain = email.split('@')[1];

    return {
      from: from.toLowerCase(),
      email: normalized,
      domain: domain,
      subject: msg.getSubject(),
      reputation: null,
      unsubscribe: null,
      autoSubmitted: null,
      listId: null,
      precedence: null,
      listUnsubscribePost: null,
      xSmtpapi: null,
      xCampaignId: null
    };
  });

  // 2. 批量精确匹配
  var exactEmails = metadata.map(function(m) { return m.email; });
  var exactResults = queryBatch(exactEmails);

  // 3. 收集需要域名匹配的索引和查询
  var needDomainMatch = [];
  var domainQueries = [];
  var domainQueryMap = {}; // email -> [query patterns]

  // Phase C: 预取信誉
  if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableReputation) {
    var repAll = getLocalReputation();
    for (var r = 0; r < metadata.length; r++) {
      var dk = metadata[r].domain || metadata[r].email;
      var entry = readReputation(dk);
      if (entry) metadata[r].reputation = entry;
    }
  }

  for (var i = 0; i < metadata.length; i++) {
    var m = metadata[i];
    var exactResult = exactResults[m.email];

    // 如果精确匹配失败
    if (!exactResult) {
      // 声誉命中直接使用
      if (m.reputation && m.reputation.category) {
        continue; // 将在后面结果合成处处理
      }
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

  // 5. 批量获取必要头部（仅对需要启发式规则的邮件）
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
      // 仅在必要时读取关键头部（Phase A）
      try { metadata[idx].autoSubmitted = messages[idx].getHeader('Auto-Submitted'); } catch (e1) { metadata[idx].autoSubmitted = null; }
      try { metadata[idx].listUnsubscribePost = messages[idx].getHeader('List-Unsubscribe-Post'); } catch (e2) { metadata[idx].listUnsubscribePost = null; }
      try { metadata[idx].unsubscribe = messages[idx].getHeader('List-Unsubscribe'); } catch (e3) { metadata[idx].unsubscribe = null; }
      try { metadata[idx].listId = messages[idx].getHeader('List-Id'); } catch (e4) { metadata[idx].listId = null; }
      try { metadata[idx].precedence = messages[idx].getHeader('Precedence'); } catch (e5) { metadata[idx].precedence = null; }
      try { metadata[idx].xSmtpapi = messages[idx].getHeader('X-SMTPAPI'); } catch (e6) { metadata[idx].xSmtpapi = null; }
      try { metadata[idx].xCampaignId = messages[idx].getHeader('X-Campaign-ID'); } catch (e7) { metadata[idx].xCampaignId = null; }
      // Phase D: 仅在需要时读取页脚文本（纯文本体尾部）
      try {
        var body = messages[idx].getPlainBody ? messages[idx].getPlainBody() : (messages[idx].getBody ? messages[idx].getBody() : '');
        if (body) {
          var slice = body.substring(Math.max(0, body.length - CONTENT_CONFIG.footerScanBytes));
          metadata[idx].footerText = slice;
        } else {
          metadata[idx].footerText = '';
        }
      } catch (e8) { metadata[idx].footerText = ''; }
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
      if (shouldLogSample()) {
        Log.debug(Log.Module.CLASSIFIER, 'classified (exact/batch)', {
          layer: 'L1',
          category: exactResult.category,
          sender: m.email,
          domain: m.domain
        });
      }
      continue;
    }

    // Reputation: 命中则使用
    if (m.reputation && m.reputation.category) {
      results.push({
        message: msg,
        category: m.reputation.category,
        source: 'reputation',
        method: 'local_reputation'
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
        if (shouldLogSample()) {
          Log.debug(Log.Module.CLASSIFIER, 'classified (domain/batch)', {
            layer: 'L2',
            category: dr.category,
            sender: m.email,
            domain: m.domain
          });
        }
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
      if (shouldLogSample()) {
        Log.debug(Log.Module.CLASSIFIER, 'classified (heuristic/batch)', {
          layer: 'L3',
          method: heuristicResult.method,
          category: heuristicResult.category,
          sender: m.email,
          domain: m.domain
        });
      }
      // 写回信誉
      if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableReputation) {
        var repKeyB = m.domain || m.email;
        var scoreToCacheB = (heuristicResult.score || 0);
        updateLocalReputation(repKeyB, heuristicResult.category, scoreToCacheB);
      }
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
  var autoSubmitted = metadata.autoSubmitted;
  var listId = metadata.listId;
  var precedence = metadata.precedence;
  var listUnsubscribePost = metadata.listUnsubscribePost;
  var xSmtpapi = metadata.xSmtpapi;
  var xCampaignId = metadata.xCampaignId;
  var domain = metadata.domain;
  var footerText = metadata.footerText;

  // Phase A: 头部评分（批量路径下）
  if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableHeaders) {
    var score = 0;
    var features = [];

    if (autoSubmitted && /^(?!no$).+/i.test((autoSubmitted + '').trim())) {
      score += HEADER_WEIGHTS.auto_submitted_negative;
      features.push('auto_submitted');
    }
    if (listUnsubscribePost && /one-click/i.test(listUnsubscribePost)) {
      score += HEADER_WEIGHTS.list_unsubscribe_post;
      features.push('list_unsubscribe_post');
    }
    if (unsubscribe) {
      score += HEADER_WEIGHTS.list_unsubscribe;
      features.push('list_unsubscribe');
    }
    if (listId) {
      score += HEADER_WEIGHTS.list_id;
      features.push('list_id');
    }
    if (precedence && /bulk|list|junk/i.test(precedence)) {
      score += HEADER_WEIGHTS.precedence_bulk;
      features.push('precedence_bulk');
    }
    if (xSmtpapi) {
      score += HEADER_WEIGHTS.x_smtpapi;
      features.push('x_smtpapi');
    }
    if (xCampaignId) {
      score += HEADER_WEIGHTS.x_campaign_id;
      features.push('x_campaign_id');
    }

    // Phase B: 子域名意图
    if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableSenderContext && domain) {
      var ctx = scoreSubdomainIntent(domain);
      if (ctx.score !== 0) {
        score += ctx.score;
        features = features.concat(ctx.features);
      }
    }

    if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableScoring && score >= CLASSIFIER_THRESHOLD) {
      return {
        category: 'Newsletter',
        method: 'headers_scoring'
      };
    }
  }

  // 平台域名不作为直接分类依据（ESP 域名覆盖泛交易/营销），改由头部/内容/上下文综合判定

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

  // Phase D: 内容层（轻量） - 扫描页脚退订
  if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableContent && footerText) {
    var txt = (footerText + '').toLowerCase();
    var scoreC = 0;
    var kw = CONTENT_CONFIG.keywordWeights || {};
    for (var key in kw) {
      if (kw.hasOwnProperty(key) && txt.indexOf(key) !== -1) {
        scoreC += kw[key];
      }
    }
    if (/unsubscribe/i.test(txt)) {
      scoreC += CONTENT_CONFIG.unsubscribeWeight;
    }
    if (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.enableScoring && scoreC >= CLASSIFIER_THRESHOLD) {
      return {
        category: 'Newsletter',
        method: 'content_footer'
      };
    }
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

  // 先运行合成用例，验证头部评分与回退规则
  try {
    Logger.log('\n🧪 合成用例: 头部启发式与回退');
    var syntheticMessages = [
      // 强阳性：一键退订 + List-Unsubscribe
      makeMockMessage('Weekly <news@example.com>', 'Your weekly digest', {
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'List-Unsubscribe': '<mailto:unsubscribe@example.com>',
        'List-Id': '<weekly.example.com>'
      }),
      // 负面：Auto-Submitted 自动回复
      makeMockMessage('Auto <bot@system.example>', 'Out of office', {
        'Auto-Submitted': 'auto-replied'
      }),
      // 主题回退：无头部，主题含营销词
      makeMockMessage('Store <promo@shop.example>', 'Big SALE today', { }),
      // 内容页脚：包含 unsubscribe 链接关键词
      (function(){
        var body = 'Hello user,\n...\nIf you wish to unsubscribe, click here.';
        var m = makeMockMessage('Footer <nl@brand.example>', 'Latest', {});
        // monkey-patch body accessors for mock
        m.getPlainBody = function(){ return body; };
        return m;
      })()
    ];

    var syntheticResults = syntheticMessages.map(function(m){ return classifyEmail(m); });
    for (var i = 0; i < syntheticResults.length; i++) {
      var r = syntheticResults[i];
      Logger.log('  - case ' + (i+1) + ': ' + (r ? (r.category + ' / ' + (r.method || 'n/a')) : 'unclassified'));
    }
  } catch (eSyn) {
    Logger.log('❌ 合成用例失败: ' + eSyn.message);
  }

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
