# 🧪 本地调试资源 (Dev Resources)

> **定位**：只服务于本地开发调试的资源集合 —— 不参与发布，也不被任何安装链接引用。

本目录存放**只服务于本地开发调试**的资源，**不参与发布**，也不被任何安装链接引用。

---

## 📦 内容清单

| 路径 | 用途 |
| :--- | :--- |
| `zhinengx_beautifier.dev.user.js` | Beautifier 本地调试存根。配合 Tampermonkey 的 `@require file://` 直加载，实现 IDE 保存后刷新页面即生效的 0 Push 调试（详见 [`../docs/DEVELOPMENT_WORKFLOW.md`](../docs/DEVELOPMENT_WORKFLOW.md)）。 |
| `zhinengx_exporter.dev.user.js` | Exporter 本地调试存根，机制同上。 |
| `copy-solution-server.cjs` | 「题目和解析复制」功能的本地夹具服务（`127.0.0.1:8765`）。运行时从正式源码中截取 `setupCopyProblemHandler()` 注入测试页，并以 `git show 78f537c:...` 提供改造前的基线版本用于 A/B 对比。 |
| `copy-solution-test.html` | 上述夹具服务的测试页面（模拟知能行「查看原题」弹窗 DOM）。 |
| `screenshots/` | 缺陷复现与视觉验收截图（实机采集）。提交新截图请用 `ScreenShot_YYYY-MM-DD_HHMMSS_NNN.jpg` 命名。 |
| `html/`、`data/` | 知能行页面原始抓包与导出数据 dump，体积大且含账号数据，**已被 `.gitignore` 忽略**，仅保留在本地。 |

---

## ⚙️ 使用存根前必改一行

两个 `*.dev.user.js` 中的 `@require file:///path/to/your/ZhiNengX/...` 是**占位路径**，直接安装不会加载任何代码。请改写为本机绝对路径，例如：

```javascript
// @require      file:///C:/Users/<你的用户名>/OneDrive/Desktop/Vibe Coding/ZhiNengX/zhinengx-beautifier/zhinengx_beautifier.user.js
```

> 注意：该文件已入库，请勿把个人本机路径提交回仓库。

---

## ▶️ 运行「复制题目和解析」回归夹具

```powershell
node dev_resources/copy-solution-server.cjs
```

随后在浏览器打开 `http://localhost:8765/`（改造后实现）与 `http://localhost:8765/baseline.html`（改造前基线）对照验证。

---

## 📚 相关文档

- [项目说明](../README.md) · [文档索引](../docs/README.md) · [更新日志](../CHANGELOG.md)
- [本地调试 SOP](../docs/DEVELOPMENT_WORKFLOW.md) — 调试存根的完整配置步骤
- [缺陷矩阵与 Roadmap](../docs/ROADMAP_AND_ISSUES.md) — 截图所对应的 BUG 登记与状态
