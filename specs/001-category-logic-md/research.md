# Research Notes: 分类逻辑规范（category-logic）

## Sources
- `docs/implementation/category-logic.md`（核心需求与分层模型）
- `docs/implementation/Phase-1-DataLayer.md`（数据层与缓存策略）
- 现有源码 `src/*.gs`（`Classifier.gs`、`Config.gs`、`Database.gs`、`Logger.gs`）

## Key Findings
- L0→L4 分层能在 GAS 配额下保证性能；头部与发件人上下文为主、内容为辅。
- 优先级裁决（P0→P4）避免误杀；交易/安全优先于广播内容。
- 首发覆盖 14 类；默认保守降噪（不跳过收件箱，仅可选标记已读）。
- 联系人来源 + 手动白名单并行，满足隐私与易用性。

## Open Questions（均已在规范中明确）
- 默认降噪策略 → 采用保守模式；
- MVP 覆盖范围 → 全量 14 类；
- 重要联系人来源 → 采用联系人来源，并辅以手动白名单。

## Risks & Mitigations
- 性能：仅在必要时升级昂贵调用；批处理与会话缓存；内容扫描限流。
- 误杀：P0→P4 优先级约束与高优先默认保留策略；解释性输出便于回归。
- 维护性：配置化和结构化日志，支持在线微调与灰度开关。
