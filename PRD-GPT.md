一、首选方案：IMAP 只读文件夹同步（无需逐个转发）
- 适用：Gmail、Outlook/Office 365、其他支持 IMAP 的邮箱
- 原理：用户把 newsletter 自动归到某个标签/文件夹（如“Newsletters/OutboundReader”），产品用 IMAP 只读抓取这个标签，既能导入历史邮件，也能持续同步新邮件。
- 优点：一步到位、无需转发验证、不碰收发限额、历史与新邮件都覆盖；权限可限制为“只读+指定文件夹”。
- 风险与注意：IMAP 凭证管理要安全（建议应用专用密码），抓取频率控制在每5–10分钟，避免被限频。
- 用户操作示例
  - Gmail
    1) 新建标签：OutboundReader
    2) 建立过滤器，条件建议用“Has the words”：List-Unsubscribe OR unsubscribe（可再加 category:updates OR category:promotions），动作：应用标签 OutboundReader，跳过收件箱
    3) 历史应用：创建过滤器时勾选“同时应用到匹配的现有对话”
    4) 在产品内：填入IMAP服务器 imap.gmail.com、邮箱、应用专用密码，仅同步标签 OutboundReader
  - Outlook/Office 365
    1) 新建文件夹 OutboundReader
    2) 新建规则：如果“邮件头包含 List-Unsubscribe”或“正文包含 unsubscribe”，则移动到 OutboundReader
    3) 运行一次“立即运行规则”处理历史邮件
    4) 在产品内：填入 outlook.office365.com 的IMAP参数，只同步该文件夹

二、超轻方案：Gmail 过滤器定向自动转发（针对新到邮件）
- 适用：Gmail
- 原理：验证一次产品提供的“专属收件地址”，创建过滤器将“像 newsletter 的新邮件”自动转发到该地址。
- 优点：无需提供IMAP密码；设置简单；新邮件自动送达产品。
- 局限：Gmail 过滤器仅对新到邮件生效，历史邮件不覆盖；一个账户默认只能选已验证的固定转发地址。
- 用户操作步骤
  1) 在 Gmail 设置 → 转发与 POP/IMAP → 添加转发地址，填入你的“专属收件地址”（例如 user_abc@inbox.yourproduct.com），完成验证码确认
  2) 创建过滤器：搜索条件放在“包含以下字词”（Has the words）
     - 推荐条件（可直接粘贴）：List-Unsubscribe OR unsubscribe OR category:updates OR category:promotions
     - 如容易误伤，可先用 category:updates OR list-unsubscribe
  3) 勾选“将其转发至：你的专属地址”，保存
  4) 可选：勾选“跳过收件箱”“应用标签 OutboundReader”以便自我管理

三、一次性历史导入方式（任选其一与上面结合）
- 方式A：IMAP 只读同步（见方案一）最省事，历史邮件全量抓取
- 方式B：Gmail Takeout 导出 MBOX 上传
  - Gmail Takeout 只选择“邮件”，勾选特定标签（如 OutboundReader），导出得到 .mbox 文件后上传到产品
  - 优点：不需要IMAP密码；一次性大批量导入
  - 注意：MBOX 解析要稳健，避免重复导入（用 Message-ID 去重）
- 方式C：Gmail Apps Script 批量转发（供不便IMAP的用户）
  - 在脚本编辑器中运行以下脚本，将某标签下历史邮件分批转发到你的专属地址；设置为每天定时触发，避免触发配额
  - 示例脚本（用户只需改标签名与目标地址）
    - 搜索标签：label:OutboundReader newer_than:365d
    - 批量大小建议 50–100 封/天，按配额慢慢搬运
  - 配额提示：个人 Gmail 每日转发/发送配额有限（Apps Script 通常数百级），建议分天迁移

四、Outlook/Office 365 自动转发与历史处理
- 新邮件自动转发
  - 管理员未禁用的前提下，在“规则”中添加条件“邮件头包含 List-Unsubscribe”或主题/正文包含“unsubscribe”，操作为“转发到 专属收件地址”
  - 如果租户禁用外部自动转发，建议改用 IMAP 只读方案
- 历史导入
  - 桌面版 Outlook 可“立即运行规则”对既有邮件执行移动/转发（视企业策略可能限制）
  - 或将历史 newsletter 移动到 OutboundReader 文件夹，产品用 IMAP 抓取该文件夹

五、Apple Mail/其他客户端的通用做法
- 建规则（邮件包含“unsubscribe”或“List-Unsubscribe”）→ 移动到 OutboundReader 文件夹
- 产品通过 IMAP 抓取该文件夹；若客户端支持自动转发规则，也可添加转发到专属地址
- 历史导入：将已有 newsletter 批量移动到该文件夹，等待产品同步

六、为用户降低心智负担的“迁移向导”设计建议（产品侧）
- 入口：导入向导，提供三条路径
  1) 推荐：只读连接邮箱（IMAP），选择要同步的标签/文件夹
  2) Gmail 用户：一键复制过滤器条件 + 引导验证转发地址（新邮件自动进入）
  3) 历史导入：Gmail Takeout 上传 MBOX 或运行一段脚本（提供复制按钮与详步骤）
- 自动生成个性化指引
  - 展示用户的“专属收件地址”
  - 一键复制推荐过滤条件
  - 按邮箱类型展示对应步骤图示（Gmail、Outlook、Apple Mail）
- 防误伤与回退机制
  - 提供“测试模式”：先仅转发或同步最近50封，校验准确率
  - 提供“误转黑名单”：用户点一下即可把误抓的源静音
  - 去重保障：用 Message-ID/指纹去重，避免历史与新邮件重复

七、推荐过滤条件与经验规则
- 核心命中信号
  - 头部字段：List-Unsubscribe、List-Id（Outlook 规则可匹配 Header；Gmail 可在“包含以下字词”里写 List-Unsubscribe 亦有较高命中）
  - 文本关键字：unsubscribe、newsletter、weekly、digest、changelog、release notes
  - Gmail 类别：category:updates、category:promotions（较多 newsletter 会被归类）
- 建议起步条件（命中更广，误伤稍多）：List-Unsubscribe OR unsubscribe OR category:updates
- 若误伤偏多，逐步收紧：List-Unsubscribe OR listid:（Outlook可匹配头部），或改为“应用标签”+IMAP同步

八、常见问题与对策
- 转发后的“原始发件人”丢失？
  - 产品侧应解析原始 MIME 与 Received/From 字段；建议用户开启“作为附件转发”（Outlook 里可选），或产品接受普通转发但尽量保留原 header
- Gmail/公司策略不允许外发自动转发
  - 使用 IMAP 只读文件夹同步；或用 Takeout/MBOX 上传
- 大量历史邮件导入导致重复与成本升高
  - 去重：Message-ID + 近似指纹
  - 节流：历史导入不做全文摘要，先做轻抽取，待用户访问或入选 Digest 再精炼摘要（延迟计算，降成本）
- 隐私与安全
  - 建议只同步“Newsletter文件夹/标签”，不抓取其他邮件
  - IMAP 使用应用专用密码；支持一键断开与数据删除

九、给用户的最短路径建议（可复制到产品“帮助”里）
- 你想最快开始且包含历史邮件：用 IMAP 只读连接 + 把 newsletter 自动打上 OutboundReader 标签/文件夹
- 你只想处理新到邮件且不想给 IMAP：Gmail 验证专属地址 → 创建过滤器 → 新邮件自动转发
- 你想一次性把过往半年 newsletter 也用上：先 IMAP 同步或用 Takeout 导出 MBOX 上传；不想给 IMAP 就跑脚本，分天搬运

通过以上组合，你可以把“逐个转发发件人”的繁琐，改成“建一个规则/标签 + 选择一个同步/转发方式”的一次性设置，3–5分钟完成，后续全自动。