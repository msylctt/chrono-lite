## Tasks: 分类逻辑规范（category-logic）

Feature: 分类逻辑规范（基于 category-logic.md）
Branch: `001-category-logic-md`
Source: `/Users/darrenma/Documents/chrono-lite/specs/001-category-logic-md/plan.md`, `/Users/darrenma/Documents/chrono-lite/specs/001-category-logic-md/spec.md`

Notes
- Tests 未显式要求采用 TDD；本清单仅提供各故事的“可独立验证标准”，不生成测试任务。
- 任务以“用户故事”为主线组织；先完成基础与共用前置。
- [P] 表示可并行（修改不同文件或互不依赖的步骤）。

---

### Phase 1 — Setup（项目初始化与校验）

T001: [X] 校验特性目录与文档可用性 [P]
- Path: `/Users/darrenma/Documents/chrono-lite/specs/001-category-logic-md/`
- Action: 确认 `plan.md`、`spec.md` 存在并已读取，记录 FEATURE_DIR。

T002: [X] 确认代码基线与分支 [P]
- Path: `/Users/darrenma/Documents/chrono-lite/`
- Action: 确认当前分支 `001-category-logic-md`；不改动 Git 状态。

Checkpoint: Setup 完成后进入基础前置阶段。

---

### Phase 2 — Foundational（所有用户故事的阻塞前置）

T003: [X] 扩展 `Config.gs` 的分类与策略配置（父/子类、动作策略、阈值）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Config.gs`
- Action: 新增/确认：
  - `FEATURE_FLAGS`（per-layer 开关：L0..L4；灰度）
  - `CATEGORY_POLICIES`（14 类场景到 `ActionPolicy`：keepInbox/markRead/addStar/autoArchiveDurations）
  - 评分阈值/权重默认值（头部强信号优先；内容弱化）
- Note: 不改变 manifest；保持隐私优先与性能约束。

T004: [X] 增加发件人规范化与子域意图词表（工具函数）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 新增函数：
  - `normalizeEmailAddress(str)`（小写、去别名、Gmail 去点）
  - `extractDomainAndSubdomain(email)`（返回 `{domain, subdomainParts[]}`）
  - `intentLexicon`（正向：news/newsletter/updates/promo/info/email/go/e/hello；负向：auth/support/billing/security/app/my/account）

T005: [X] 本地信誉缓存接口（PropertiesService）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Database.gs`
- Action: 新增：`getSenderReputation(key)`, `putSenderReputation(key, entry)`，含 hits/lastSeenAt/ttl；用于早期短路。

T006: [X] 结构化日志最小集（解释性）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Logger.gs`
- Action: 新增/扩展日志方法：`logDecisionSummary({messageId, layer, matchedSignals, score, threshold, finalCategory, actionPolicy})`，遵循既有 Logger 风格。

Checkpoint: 完成后可并行启动 P1 用户故事实现。

---

### Phase 3 — [Story US1 | P1] 自动识别并降噪「新闻资讯/营销」

Story Goal
- 对群发/列表邮件（Newsletters/Promotions）进行稳定识别，默认保守降噪（不跳过收件箱、不自动已读，保留为可选项）。

Independent Test Criteria（非任务）
- 样本含有/缺少列表标识时均能正确打上 `Updates/Newsletters` 或 `Updates/Promotions`，且不影响高优先场景。

T007: 头部启发式解析（高置信度，优先）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 基于 `GmailMessage.getHeader` 提取：`List-Unsubscribe`, `List-Unsubscribe-Post`, `List-Id`, `Precedence`；构造强/中信号并评分。
- Rule: 命中 `List-Id`/`List-Unsubscribe` 强信号 → 倾向 Newsletters；主题含促销词倾向 Promotions。

T008: 发件人上下文与子域意图（中强度特征） [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 使用 T004 词表：若子域含 newsletter/news/email/go/e/hello → 增分；负向词（auth/support/billing/security/app/my/account）减分。

T009: 轻量主题/页脚扫描（仅回退） [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: L2 主题关键词（newsletter|unsubscribe|促销等），L3 页脚末尾 2–4KB 扫描退订链接；仅在头部与发件人信号不足时启用。

T010: 评分与阈值裁决（US1 范围）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 简单加权求和；与 `Config.gs` 阈值比较，生成候选 `Updates/Newsletters` 或 `Updates/Promotions`；与高优先场景冲突时让位。

T011: [X] 应用动作策略（US1）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Actions.gs`
- Action: 依据 `CATEGORY_POLICIES` 应用标签；默认不跳过收件箱、不标记已读；尊重偏好设置。

Checkpoint: US1 完成（可独立运行与验证）。

---

### Phase 4 — [Story US2 | P1] 保留并凸显「交易与安全」

Story Goal
- 对安全、订单、物流、账单等高优先邮件优先分类，保留在收件箱并支持到期自动归档。

Independent Test Criteria（非任务）
- 安全/验证码不被降噪；订单/物流/账单正确分类并在到期后自动归档。

T012: [X] L0 排除类（系统自动回复前置排除） [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 若 `Auto-Submitted` 存在且不为 `no`，直接归 `System/Auto-Replies` 并早退。

T013: [X] 安全/验证码识别（L1-L4）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 按 `plan.md` OTP 方案：
  - 负信号：存在 `List-Unsubscribe` 时降权。
  - 主题正则：`(验证码|one[- ]time password|OTP|verification code|security code|password reset)`
  - 必要时正文前 2KB 抽取 4–8 位验证码（回退）。
  - 与广播冲突时优先安全。

T014: [X] 订单/物流/账单识别（结构化关键词与发件人上下文） [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 主题与子域词典驱动（orders/shipping/invoice/bill/receipt/tracking 等）；与 `CATEGORY_POLICIES` 映射到 `Purchases/Orders`, `Purchases/Shipping`, `Finance/Bills`。

T015: 生命周期策略接入（到期自动归档）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Actions.gs`
- Action: 读取 `Config.gs` 的 `autoArchiveDurations` 执行到期处理（如订单 30 天、物流送达+3 天、账单 60 天）；仅添加/复用现有策略接口。

Checkpoint: US2 完成。

---

### Phase 5 — [Story US3 | P2] 行程邮件的聚合与时点后处理

Story Goal
- 航班/酒店等行程邮件在行程前凸显（可选加星），结束后自动归档。

Independent Test Criteria（非任务）
- 含出行日期样本在行程前被凸显，结束后 +1 日自动归档。

T016: 行程识别（主题/发件人上下文）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 主题关键词（itinerary/flight/hotel/booking/reservation 等）+ 子域上下文打分；分类到 `Travel/Flights`、`Travel/Hotels`。

T017: 行程前凸显与结束清理
- Path: `/Users/darrenma/Documents/chrono-lite/src/Actions.gs`
- Action: 行程前可选加星（由偏好控制）；结束 +1 日根据策略自动归档。

Checkpoint: US3 完成。

---

### Phase 6 — [Story US4 | P2] 系统自动回复的静默处理

Story Goal
- 自动回复/退信归入系统类并降噪，不干扰主收件箱。

Independent Test Criteria（非任务）
- 自动回复/退信样本被静默处理且可回溯。

T018: 系统自动回复识别与处理（巩固 L0）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 基于 `Auto-Submitted`, `Precedence`（bulk/list）；直接归 `System/Auto-Replies`；确保与其他规则不冲突。

T019: 降噪策略应用（系统类） [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Actions.gs`
- Action: 套用系统类默认策略（可配置），不跳过收件箱但弱提示；可被标签查阅回溯。

Checkpoint: US4 完成。

---

### Phase 7 — [Story US5 | P3] 可解释的决策输出

Story Goal
- 每次分类输出命中特征摘要与最终裁决理由（不记录候选或分数）。

Independent Test Criteria（非任务）
- 任一样本可看到标签、命中特征摘要与裁决理由。

T020: 分类结果结构扩展（返回解释字段）
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 将 `classifyEmail`/`classifyBatch` 返回结构中加入 `{method, features[], finalCategory, appliedPolicy}`；与 Logger 对齐。

T021: 结构化日志集成
- Path: `/Users/darrenma/Documents/chrono-lite/src/Logger.gs`
- Action: 使用 T006 的 `logDecisionSummary` 输出来源层级、命中特征、阈值、最终决策与动作策略；遵循默认低粒度策略。

Checkpoint: US5 完成。

---

### Phase 8 — Polish & Cross-Cutting

T022: 批处理与 API 调用优化 [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Classifier.gs`
- Action: 优化 `classifyBatch`：一次性提取常用元数据；仅在 L1/L2 失败时读取昂贵头部；复用会话级缓存。

T023: 灰度与开关校验 [P]
- Path: `/Users/darrenma/Documents/chrono-lite/src/Config.gs`
- Action: 验证 `FEATURE_FLAGS` 的默认值与灰度发布路径；确保默认保守策略。

T024: 未命中处理与安全护栏
- Path: `/Users/darrenma/Documents/chrono-lite/src/Actions.gs`
- Action: 对未命中的邮件仅打 `Chrono/Uncategorized`；确保任何高优先场景不得被降噪。

Checkpoint: Polish 完成。

---

### 执行顺序与编号（T001..T024）

顺序即编号；同阶段内带 [P] 可并行执行。跨阶段需满足前置阶段完成。

---

### 依赖关系（故事层级）

- Foundational → US1, US2, US3, US4, US5
- US1 ↔ US2：可并行（均为 P1），但建议先 US1 后 US2 以降低整体噪声
- US3, US4：依赖 Foundational，可与 US2 并行
- US5：依赖 Foundational，且与任一故事弱耦合，可并行

---

### 并行执行示例（每个用户故事内）

- US1: T008 [P] 与 T009 [P] 可并行；完成后合入 T010 → T011
- US2: T012 [P] 与 T014 [P] 可并行；完成后执行 T013 → T015
- US3: 仅两步，先 T016 后 T017（同文件改动较多，顺序更稳妥）
- US4: T019 [P] 可与 T018 并行，最终以 T018 的规则为主线
- US5: T021 依赖 T020 产出的返回结构定义，顺序执行

---

### 实施策略（MVP 优先、增量交付）

- MVP 建议范围：仅 US1（Newsletters/Promotions）+ Foundational（T003–T006）→ 立即降低收件箱噪声并验证性能。
- 随后交付 US2（交易/安全），保障高优先不被误杀。
- 继续 US3/US4（P2）与 US5（P3）按并行窗口推进。

---

### 汇总统计（生成时刻）

- 总任务数：24
- 分故事任务数：
  - US1: 5（T007–T011）
  - US2: 4（T012–T015）
  - US3: 2（T016–T017）
  - US4: 2（T018–T019）
  - US5: 2（T020–T021）
  - Setup: 2（T001–T002）
  - Foundational: 4（T003–T006）
- 并行机会：[P] 共 6 处（T001, T002, T008, T009, T012, T014, T019, T022, T023 计入并行点；单次并发建议 ≤3）
- 独立验证标准：已在每个故事中列出 “Independent Test Criteria”。
- 建议 MVP：US1 + Foundational。

---

Output
- Generated file: `/Users/darrenma/Documents/chrono-lite/specs/001-category-logic-md/tasks.md`
- Ready for execution by an LLM/agent with Apps Script context。


