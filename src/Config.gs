/**
 * Phase 3: 分类配置
 */

/**
 * 分类规则配置
 *
 * 配置项说明：
 * - label: Gmail 标签名称（支持嵌套，如 "Chrono/Newsletter"）
 * - action: 动作类型
 *   - 'archive': 归档（移出收件箱）
 *   - 'keep_inbox': 保留在收件箱
 * - markRead: 是否标记为已读
 * - addStar: 是否添加星标
 */
const CATEGORIES = {
  'Newsletter': {
    label: 'Chrono/Newsletter',
    action: 'archive',
    markRead: false,
    addStar: false
  },

  'Product Updates': {
    label: 'Chrono/Product',
    action: 'keep_inbox',
    markRead: false,
    addStar: true
  },

  'Marketing': {
    label: 'Chrono/Marketing',
    action: 'archive',
    markRead: true,
    addStar: false
  },

  'Tech News': {
    label: 'Chrono/Tech',
    action: 'archive',
    markRead: false,
    addStar: false
  },

  'Financial': {
    label: 'Chrono/Finance',
    action: 'keep_inbox',
    markRead: false,
    addStar: true
  }
};

/**
 * 测试配置常量
 */
const TEST_LABEL = 'Chrono/Test'; // 测试标签
const TEST_EMAIL_COUNT = 10;       // 测试邮件数量

/**
 * 处理标记（避免重复扫描）
 */
const PROCESSED_LABEL = 'Chrono/Processed';

/**
 * 全局日志级别（默认 INFO）。可被用户属性 chrono_log_level 覆盖
 * 可选: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 */
const LOG_LEVEL = 'INFO';

/**
 * 动作策略映射（与分类器输出保持一致）
 */
const CATEGORY_POLICIES = {
  'Newsletter': { keepInbox: true,  markRead: false, addStar: false },
  'Marketing':  { keepInbox: true,  markRead: false, addStar: false },
  'Product Updates': { keepInbox: true, markRead: false, addStar: false },
  'Finance/Security': { keepInbox: true, markRead: false, addStar: false },
  'Purchases/Orders': { keepInbox: true, markRead: false, addStar: false },
  'Purchases/Shipping': { keepInbox: true, markRead: false, addStar: false },
  'Finance/Bills': { keepInbox: true, markRead: false, addStar: false },
  'Travel/Flights': { keepInbox: true, markRead: false, addStar: false },
  'Travel/Hotels': { keepInbox: true, markRead: false, addStar: false },
  'System/Auto-Replies': { keepInbox: true, markRead: false, addStar: false },
  'Uncategorized': { keepInbox: true, markRead: false, addStar: false }
};

/**
 * 分类器特性开关（渐进式发布）
 */
const FEATURE_FLAGS = {
  enableHeaders: true,          // Phase A: 启用高置信度头部启发式
  enableSenderContext: false,   // Phase B: 发件人规范化与子域意图
  enableReputation: false,      // Phase C: 本地信誉缓存
  enableContent: true,          // Phase D: 轻量内容启发式
  enableScoring: true           // Phase E: 评分与阈值
};

/**
 * 头部启发式权重（初始值，可在线微调）
 */
const HEADER_WEIGHTS = {
  list_unsubscribe_post: 20,   // RFC 8058 一键退订
  list_unsubscribe: 9,         // RFC 2369
  list_id: 9,                  // RFC 2919
  precedence_bulk: 8,          // 事实标准：bulk/list/junk
  x_smtpapi: 9,                // SendGrid 指纹
  x_campaign_id: 7,            // 通用活动追踪头
  auto_submitted_negative: -20 // RFC 3834 自动回复（非 no）
};

/**
 * 分类阈值（加权求和超过此值触发分类）
 */
const CLASSIFIER_THRESHOLD = 15;

/**
 * 日志采样（0-1），用于控制结构化日志输出频率
 */
const LOG_SAMPLING_RATE = 1.0;

/**
 * 发件人上下文（子域名意图）配置
 */
const SUBDOMAIN_POSITIVE = [
  'promo', 'news', 'newsletter', 'updates', 'info', 'email', 'go', 'e', 'hello'
];
const SUBDOMAIN_NEGATIVE = [
  'auth', 'support', 'billing', 'security', 'app', 'my', 'account'
];

const SENDER_CONTEXT_WEIGHTS = {
  subdomain_positive: 12,
  subdomain_negative: -15
};

/**
 * 本地信誉缓存配置（PropertiesService）
 */
const REPUTATION_CONFIG = {
  ttlDays: 30,             // 过期时间（天）
  minScoreToCache: 15,     // 仅当决策分数≥该值时写入信誉
  maxEntries: 2000         // 软上限（未强制执行）
};

/**
 * 内容层配置（轻量扫描）
 */
const CONTENT_CONFIG = {
  footerScanBytes: 2048, // 扫描正文末尾 N 字节
  unsubscribeWeight: 10, // 退订链接权重
  keywordWeights: {
    'unsubscribe': 10,
    'manage preferences': 8,
    'opt-out': 8,
    'view in browser': 4
  }
};

/**
 * 主题关键词权重（Newsletter）
 */
const SUBJECT_WEIGHTS = {
  'newsletter': 5,
  'weekly digest': 5,
  'daily brief': 5,
  'roundup': 4,
  'update summary': 4
};

/**
 * 用户覆盖：分类动作（PropertiesService 存储）
 */
function getCategoryOverrides() {
  try {
    var raw = PropertiesService.getUserProperties().getProperty('CATEGORY_OVERRIDES');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setCategoryOverrides(overrides) {
  try {
    PropertiesService.getUserProperties().setProperty('CATEGORY_OVERRIDES', JSON.stringify(overrides || {}));
  } catch (e) { /* ignore */ }
}

function clearCategoryOverrides() {
  try {
    PropertiesService.getUserProperties().deleteProperty('CATEGORY_OVERRIDES');
  } catch (e) { /* ignore */ }
}

/**
 * 统一分类定义（单一真相源）
 * - 以 CATEGORY_POLICIES 的键为主（与分类器输出一致）
 * - 合并 CATEGORIES 中的显示/动作配置
 * - 缺省时提供合理默认：label = 'Chrono/' + category，action=keep_inbox，markRead=false
 */
function getUnifiedCategories() {
  var unified = {};
  try {
    if (typeof CATEGORY_POLICIES !== 'undefined' && CATEGORY_POLICIES) {
      for (var cat in CATEGORY_POLICIES) {
        if (!CATEGORY_POLICIES.hasOwnProperty(cat)) continue;
        var cfg = (typeof CATEGORIES !== 'undefined' && CATEGORIES && CATEGORIES[cat]) ? CATEGORIES[cat] : null;
        if (!cfg) {
          cfg = {
            label: 'Chrono/' + cat,
            action: 'keep_inbox',
            markRead: false,
            addStar: false
          };
        }
        unified[cat] = cfg;
      }
    }
    if (typeof CATEGORIES !== 'undefined' && CATEGORIES) {
      for (var cat2 in CATEGORIES) {
        if (!CATEGORIES.hasOwnProperty(cat2)) continue;
        if (!unified[cat2]) {
          unified[cat2] = CATEGORIES[cat2];
        }
      }
    }
  } catch (e) { /* ignore */ }
  return unified;
}

/**
 * 获取最终生效的分类配置（合并用户覆盖）
 * @param {string} category - 分类名称
 * @returns {{label:string, action:string, markRead:boolean, addStar:boolean}}
 */
function getEffectiveCategoryConfig(category) {
  var unified = getUnifiedCategories();
  var base = unified[category] || { label: 'Chrono/' + category, action: 'keep_inbox', markRead: false };
  var overrides = getCategoryOverrides();
  var ov = overrides[category] || {};
  return {
    label: base.label,
    action: (typeof ov.action !== 'undefined') ? ov.action : base.action,
    markRead: (typeof ov.markRead !== 'undefined') ? ov.markRead : base.markRead,
    addStar: (typeof ov.addStar !== 'undefined') ? ov.addStar : (base.addStar || false)
  };
}
