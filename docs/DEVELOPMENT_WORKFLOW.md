# 🛠️ ZhiNengX 本地开发调试与规范化发版 SOP

本文档详细介绍了如何使用 **Tampermonkey 本地 `file://` 直加载机制** 实现 **0 次 Git Push 免频繁提交秒级调试**，以及如何规范地进行语义化版本发布。

---

## ⚡ 1. 油猴本地 `file://` 免 Push 秒级调试 (极速开发配置)

通过此机制，在 IDE (如 VSCode) 中修改脚本代码并按 `Ctrl + S` 保存后，无需运行任何 Git 操作，直接刷新浏览器页面即可实时预览最新代码效果。

### 步骤 A：开启 Tampermonkey 权限
1. 打开 Chrome / Edge / Firefox 的扩展程序管理页面 (`chrome://extensions/`)。
2. 找到 **Tampermonkey (油猴)** 插件，点击 **“详细信息” (Details)**。
3. 勾选 **“允许访问文件网址” (Allow access to file URLs)**。

### 步骤 B：在 Tampermonkey 中安装本地开发存根脚本
1. 点击油猴图标 -> **添加新脚本**。
2. 将以下 5 行存根代码复制并保存：

```javascript
// ==UserScript==
// @name         [DEV] 知能行美化助手 (本地开发调试)
// @namespace    http://tampermonkey.net/
// @version      8.1.0.dev
// @description  本地秒级调试存根脚本 - 无需 Push，IDE 保存即刷新生效
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @require      file:///path/to/your/ZhiNengX/zhinengx-beautifier/zhinengx_beautifier.user.js
// ==/UserScript==
```

> 💡 **提示**：如果在关闭生产版插件的同时开启此 `[DEV]` 存根脚本，你对 `zhinengx-beautifier/zhinengx_beautifier.user.js` 的任何代码修改，在浏览器刷新后均能秒级生效！

---

## 🌿 2. Git Flow 分支模型与版本号规则

- **`main` 分支**：唯一的线上生产分支，只接受经过完整验证的代码。保持 100% 稳健无 BUG。
- **`develop` 分支**：常驻开发与集成分支。所有日常编码、`feature/*` 分支合并均在此分支汇总。
- **`release/*` 分支**：预发布封版分支（如 `release/v8.2.0`）。修改 Header 中的 `@version` 与 `CHANGELOG.md` 均在此分支进行。
- **`hotfix/*` 分支**：线上紧急修复分支（如 `hotfix/v8.1.1`）。从 `main` 拉出急救，合回 `main` 与 `develop`。
- **版本号修改规则**：
  - **在 `develop` 和 `feature/*` 分支上编码与多次 Commit 时，严格禁止改动 Header 中的 `@version`**！
  - 只有在拉出 `release/*` 或 `hotfix/*` 分支封版准备发布时，才**单次自增版本号**。

---

## 🚀 3. 标准 Git Flow Release 发版 Checklist

当在 `develop` 分支上完成了一阶段开发并准备发布新版本（如 `v8.2.0`）时：

```bash
# 1. 从 develop 拉出 release 预发布封版分支
git checkout develop
git checkout -b release/v8.2.0

# 2. 在 release 分支上修改 Header 中的 @version 并更新 CHANGELOG.md
# (编辑版本号 8.1.0 -> 8.2.0，更新 CHANGELOG.md)
git commit -am "chore(release): bump version to 8.2.0"

# 3. 验证无误后合并入 main 生产分支并打标准 Git Tag
git checkout main
git merge release/v8.2.0
git tag -a v8.2.0 -m "release: v8.2.0"

# 4. 同步合并回 develop，清理 release 分支
git checkout develop
git merge release/v8.2.0
git branch -d release/v8.2.0

# 5. 推送到 GitHub 远程仓库
git push origin main develop --tags
```
