# Data Model: 分类逻辑（概念层）

## Entities

### Category（类别）
- path: 二级路径（如 `Chrono/Updates/Newsletters`）
- domain: 一级域（Finance/Purchases/Travel/Work/Updates/Personal/System）
- scenario: 二级场景（Bills/Security/...）
- defaultActionPolicy: 绑定的默认动作策略（见 ActionPolicy）

### Signal（信号）
- type: Header | SenderSubdomain | Subject | Content | Footer | Contact
- name: 具体信号名（如 List-Id、List-Unsubscribe、auth 子域、关键词模式）
- weight: 强/中/弱（用于评分与裁决）
- layer: L0..L4（信号提取层级）

### CandidateDecision（候选与裁决）
- candidates: [{categoryPath, score, matchedSignals[]}]
- finalCategory: 最终唯一类别
- rationale: 裁决理由（包含优先级规则与被舍弃候选）

### ActionPolicy（动作策略）
- keepInbox: 是否保留收件箱
- markRead: 是否标记已读
- addStar: 是否加星
- autoArchiveRule: 归档策略（如 30 天、送达+3 天、行程结束+1 天等）

### Preference（偏好）
- skipInboxForLowInterference: 低干扰清单是否跳过收件箱（默认 false）
- autoArchiveDurations: 各场景到期时长映射
- featureFlags: 分层与策略的灰度开关

### ReputationEntry（信誉项，可选）
- normalizedSender / domain
- trustScore / hits / lastSeenAt / ttl

## Relationships
- Category ↔ ActionPolicy: 1:1（默认绑定，可被偏好覆盖）
- Signal → CandidateDecision: 多对一（信号形成候选并参与裁决）
- Preference 覆盖默认策略但不改变类别语义
