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
