# Contracts: 分类逻辑（internal）

## External APIs
- 无外部 API 依赖；全部在用户 Google 账户内执行。

## Internal Contracts
- Category 命名：与 `spec.md` 一致（14 类）。
- Config 键：阈值、权重、autoArchiveDurations、featureFlags、skipInboxForLowInterference。
- Logger 格式：包含 `layer`、`signals[]`、`candidates[]`、`finalCategory`、`rationale`、`actionPolicy`。
- 批处理接口：`classifyBatch(threads/messages)` 对外行为不变，内部增加解释性输出（仅日志）。

## Acceptance Mapping
- 对应 `Success Criteria`：覆盖率、准确率、误杀为零、性能、解释性、反馈闭环。
