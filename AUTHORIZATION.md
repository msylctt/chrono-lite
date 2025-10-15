# 🔑 Chrono Lite 自动化授权指南

## 为什么需要授权？

Chrono Lite 使用了 **Google Apps Script 可安装触发器**（Installable Triggers）来实现每小时自动处理邮件的功能。

根据 [Google 官方文档](https://developers.google.com/apps-script/guides/triggers/installable)，可安装触发器需要以下权限：

- `https://www.googleapis.com/auth/script.scriptapp` - 管理触发器

这个权限在**首次使用时必须通过用户授权**，这是 Google 的安全机制。

---

## 🚨 重要说明

**我们已经在代码中实现了自动创建触发器的功能**（`createAutoProcessTrigger()`），但由于以下限制：

1. Gmail Add-on 运行在沙箱环境中
2. 无法在侧边栏中显示授权对话框
3. 必须在 Apps Script 编辑器中首次授权

**授权后，触发器会自动创建，无需任何手动操作！**

---

## ✅ 一键授权步骤

### 方法 1: 使用 clasp（推荐）

```bash
# 1. 打开 Apps Script 编辑器
clasp open

# 2. 在编辑器中：
#    - 顶部函数下拉列表选择 "authorizeChronoLite"
#    - 点击运行按钮 ▶️
#    - 在弹出的授权对话框中点击"审核权限"
#    - 选择你的 Google 账户
#    - 点击"高级" → "转至 Chrono Lite（不安全）"
#    - 点击"允许"

# 3. 查看执行日志
clasp logs
# 应该看到：✅ 授权成功！

# 4. 返回 Gmail，刷新侧边栏
# Dashboard 会显示：✅ 已启用
```

### 方法 2: 直接访问 Apps Script

1. 访问 https://script.google.com
2. 打开 Chrono Lite 项目
3. 运行 `authorizeChronoLite` 函数
4. 按照授权对话框完成授权

---

## 🤔 常见问题

### Q: 为什么显示"不安全"？

**A:** 这是因为 Chrono Lite 是私有脚本，未经 Google 验证。您的代码完全运行在您自己的 Google 账户中，不会上传到任何外部服务器。

### Q: 授权后需要做什么？

**A:** 什么都不需要！授权成功后：
- ✅ 触发器会自动创建
- ✅ 每小时自动处理新邮件
- ✅ Dashboard 会显示下次运行时间

### Q: 可以撤销授权吗？

**A:** 可以！访问 https://myaccount.google.com/permissions 撤销对 Chrono Lite 的授权。

### Q: 触发器会消耗多少配额？

**A:** Google Apps Script 免费账户的配额：
- 每天 90 分钟执行时间
- Chrono Lite 每小时运行约 5-10 秒
- 一天 24 小时 = 最多 4 分钟
- **完全在免费配额内**

---

## 🔍 技术细节

### 我们使用的是可安装触发器

```javascript
// Code.gs 第 169 行
ScriptApp.newTrigger('autoProcessInbox')
  .timeBased()           // ✅ 时间驱动触发器
  .everyHours(1)         // ✅ 每小时运行
  .create();             // ✅ 创建可安装触发器
```

这就是 [Google 官方文档](https://developers.google.com/apps-script/guides/triggers/installable?hl=zh-cn) 推荐的方式！

### 为什么不用简单触发器？

简单触发器（Simple Triggers）有严格限制：
- ❌ 无法访问需要授权的服务（如 Gmail）
- ❌ 无法设置时间驱动
- ❌ 执行时间限制为 30 秒

可安装触发器的优势：
- ✅ 可以访问所有授权的服务
- ✅ 可以设置复杂的时间规则
- ✅ 执行时间限制为 6 分钟

---

## 📊 授权后的体验

### Dashboard 自动化状态显示

```
🤖 自动化状态
━━━━━━━━━━━━━━━━━━━━━━
状态: ✅ 已启用

每小时自动运行
下次运行: 42 分钟后
上次运行: 18 分钟前 (处理 3 封)
```

### 自动处理流程

```
每小时自动执行
    ↓
查询最近 1 小时的新邮件
    ↓
使用分类引擎识别
    ↓
应用标签和动作
    ↓
记录统计数据
    ↓
等待下一小时
```

---

## 💡 最佳实践

### 首次使用流程

1. **安装 Add-on** → 侧边栏显示欢迎页面
2. **点击初始化** → 处理最近 7 天邮件
3. **自动授权提示** → Dashboard 显示"需要授权"
4. **运行授权函数** → `authorizeChronoLite()`
5. **完成！** → 自动化已启用

### 后续使用

- ✅ 无需任何操作
- ✅ 每小时自动处理新邮件
- ✅ 在 Dashboard 查看统计
- ✅ 手动同步收件箱（可选）

---

## 🛠️ 故障排除

### 问题：Dashboard 显示"需要授权"

**解决方案**：
```bash
clasp open
# 运行 authorizeChronoLite 函数
```

### 问题：授权成功但触发器未创建

**检查步骤**：
```javascript
// 在 Apps Script 编辑器中运行
function checkTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  Logger.log('触发器数量: ' + triggers.length);

  triggers.forEach(function(t) {
    Logger.log('- ' + t.getHandlerFunction());
  });
}
```

**预期输出**：
```
触发器数量: 1
- autoProcessInbox
```

### 问题：触发器未按时运行

**原因**：Google Apps Script 的时间触发器有 ±15 分钟的误差

**正常行为**：设置为"每小时"，实际可能在 45-75 分钟之间运行

---

## 📚 参考资料

- [Google Apps Script 触发器指南](https://developers.google.com/apps-script/guides/triggers/installable)
- [可安装触发器限制](https://developers.google.com/apps-script/guides/services/quotas)
- [授权作用域](https://developers.google.com/apps-script/guides/services/authorization)

---

**总结**：我们完全按照 Google 官方推荐的方式使用可安装触发器，只是首次授权需要在编辑器中完成。授权后，一切都是自动的！🎉
