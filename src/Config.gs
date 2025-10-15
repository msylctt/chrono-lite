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
