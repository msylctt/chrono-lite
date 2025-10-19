# Implementation Plan: 分类逻辑规范（基于 category-logic.md）

**Branch**: `001-category-logic-md` | **Date**: 2025-10-17 | **Spec**: ../spec.md
**Input**: Feature specification from `/specs/001-category-logic-md/spec.md`

**Note**: This plan converts the approved specification into an actionable engineering plan.

## Summary

目标：交付一套覆盖 14 类场景的端侧启发式分类方案，默认对「新闻资讯/营销」采取保守降噪（不跳过收件箱，仅可选标记已读），对「交易/安全/行程」等高优先场景提供稳定可见性与到期自动归档策略，并输出可解释的决策信息。

方法：采用分层信号提取（L0-L4），以邮件头与发件人上下文为主、内容扫描为辅；执行明确的优先级裁决（P0→P4）；配置化类别-动作映射；支持联系人来源识别与手动白名单并行；全流程本地化、隐私优先。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Google Apps Script (V8 Runtime, JavaScript ES5 兼容)
**Primary Dependencies**: 内置服务（GmailApp, PropertiesService, CacheService, ScriptApp, UrlFetchApp）
**Storage**: 用户侧 PropertiesService + CacheService（无外部服务器）
**Testing**: Apps Script 编辑器内手动测试 + `clasp logs` 验证；阶段性真实样本抽样评估
**Target Platform**: Gmail Add-on（用户 Google 账户环境）
**Project Type**: 单一 Apps Script 项目（`src/*.gs`）
**Performance Goals**: 单封决策 < 50ms；100 封批量 < 5s
**Constraints**: 严格遵守 GAS 配额；避免深度扫描的过度使用；零数据外传
**Scale/Scope**: 个人级邮箱自动化；首发覆盖 14 类场景

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Privacy-First**: 不需要外传数据；全部处理在用户侧完成。
**Performance**: 通过 L0→L4 分层早退与头部优先策略满足单封 <50ms 目标。
**Quota Management**: 严控 `getHeader` 与 `getBody` 调用；仅在 L1/L2 失败时升级更昂贵操作；批处理读取与会话缓存减少重复调用。
**Testing**: 规格已定义 SC-001~SC-006（覆盖率/准确率/误杀率/性能/可解释/闭环）。
**Open Source**: 配置化与日志解释，便于社区贡献 verified 列表与规则微调。
**Progressive Rollout**: 在 `Config.gs` 提供分层与策略开关（灰度发布）。

## OTP / 安全警报识别方案（Security / Verification Codes）

### 识别策略（分层映射）
- L0（排除）：若 `Auto-Submitted` 存在且值非 `no`，直接分类为 `System/Auto-Replies`，停止。
- L1（发件人与头）：
  - 发件人子域命中 auth/security/verify/no-reply 强信号 → 计强/中权重。
  - 头部不得包含 `List-Unsubscribe`（负向排除）。
- L2（主题）：
  - 正则：`/(验证码|one[- ]time password|OTP|verification code|security code|password reset)/i`
  - 结构化主题模板（如 `[Service] verification code: 123456`）。
- L3（页脚）：
  - 无需强依赖；若存在群发页脚词（unsubscribe 等）降权处理，避免误杀。
- L4（正文片段）：
  - 仅在 L1/L2 不确定时，扫描纯文本前 2KB，提取 4–8 位数字验证码模式：`/(?:code|验证码)[:\s]*([0-9]{4,8})/i`。

### 裁决与动作
- 优先级：P1 交易/安全高于广播；与营销/新闻冲突时，归入 `Finance/Security`。
- 动作：保留收件箱；不标记已读；自动归档策略：1 天后（可配置）。

### 误杀与对策
- 排除 `List-Unsubscribe`、`List-Id` 作为负信号；
- 主题/正文同时命中促销关键词时：以安全关键词为主（更高权重）。
- 多语种支持：初期中英为主；允许在 `Config.gs` 扩展词表。

### 测试要点
- 样本集：含不同服务来源（银行、云服务、社交）、不同语种与格式；
- 验证：
  - 准确率 ≥ 98%（高优先误杀为 0%）。
  - 性能：单封 < 50ms；仅在不确定时进入 L4。
  - 日志：记录命中特征简要与最终裁决（不含候选分数）。

## Project Structure

### Documentation (this feature)

```
specs/001-category-logic-md/
├── plan.md              # 本文件（/speckit.plan 输出）
├── research.md          # Phase 0 输出（/speckit.plan 创建）
├── data-model.md        # Phase 1 输出（/speckit.plan 创建）
├── quickstart.md        # Phase 1 输出（/speckit.plan 创建）
└── contracts/           # Phase 1 输出（/speckit.plan 创建）
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
src/
├── Code.gs            # 主流程入口与批处理
├── Database.gs        # 数据层（CDN/缓存/查询）
├── Classifier.gs      # 分类引擎与分层信号提取
├── Actions.gs         # 标签与动作应用
├── Config.gs          # 配置与特性开关
├── Logger.gs          # 结构化日志
└── UI.gs              # Add-on 侧边栏 UI

appsscript.json        # 清单
docs/implementation/   # 设计与说明文档
```

**Structure Decision**: 采用单一 Apps Script 项目结构；本特性主要修改 `Classifier.gs`、`Config.gs`、`Database.gs`、`Logger.gs` 并保持现有文件划分。

## Complexity Tracking

*无强制违反项；保持最小复杂度与最小外部依赖。*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
