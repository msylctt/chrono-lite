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
  },

  // US4（系统自动回复/退信）
  'System/Auto-Replies': {
    label: 'Chrono/System',
    action: 'keep_inbox',
    markRead: false,
    addStar: false
  },

  // Phase 8（未命中）
  'Uncategorized': {
    label: 'Chrono/Uncategorized',
    action: 'keep_inbox',
    markRead: false,
    addStar: false
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
 * 系统状态标签与 TTL
 */
const SEEN_LABEL = 'Chrono/System/Seen';
const SEEN_TTL_DAYS = 7; // 未分类的“已看过”缓存时间

/**
 * 全局日志级别（默认 INFO）。可被用户属性 chrono_log_level 覆盖
 * 可选: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 */
const LOG_LEVEL = 'INFO';

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
 * UI 特性开关（渐进式发布）
 */
const UI_FLAGS = {
  enableNavBar: true,        // 顶部伪 Tab 导航
  enableWhySection: true,    // 在上下文卡显示“为什么被识别”
  enableUndo: true,          // 支持撤销入口
  enablePreviewMode: true,   // 允许在设置中开启“仅打标不归档”
  enableWhatsNew: false      // 可选：新版本说明卡片
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
 * 动作策略映射（Foundational）
 * 说明：与分类名称（Classifier 返回的 category）对齐。
 * 可被后续用户偏好覆盖（到期自动归档策略等）。
 */
const CATEGORY_POLICIES = {
  // US1（降噪保守）
  'Newsletter': { keepInbox: true,  markRead: false, addStar: false, autoArchiveRule: null },
  'Marketing':  { keepInbox: true,  markRead: false, addStar: false, autoArchiveRule: null },
  'Product Updates': { keepInbox: true, markRead: false, addStar: false, autoArchiveRule: null },

  // US2（高优先场景占位，后续故事接入）
  'Finance/Security': { keepInbox: true,  markRead: false, addStar: false, autoArchiveRule: { days: 1 } },
  'Purchases/Orders': { keepInbox: true,  markRead: false, addStar: false, autoArchiveRule: { days: 30 } },
  'Purchases/Shipping': { keepInbox: true, markRead: false, addStar: false, autoArchiveRule: { days: 7 } },
  'Finance/Bills': { keepInbox: true,    markRead: false, addStar: false, autoArchiveRule: { days: 60 } },

  // US4（系统自动回复/退信）
  'System/Auto-Replies': { keepInbox: true, markRead: false, addStar: false, autoArchiveRule: null },

  // Phase 8（未命中）
  'Uncategorized': { keepInbox: true, markRead: false, addStar: false, autoArchiveRule: null }
};

/**
 * 到期自动归档时长（默认值），按场景定义
 */
const AUTO_ARCHIVE_DURATIONS = {
  security: 1,    // 天
  orders: 30,
  shipping: 7,
  bills: 60
};
