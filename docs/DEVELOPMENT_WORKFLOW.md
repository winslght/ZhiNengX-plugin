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
// @require      file:///c:/Users/winsl/OneDrive/Desktop/Vibe%20Coding/ZhiNengX/zhinengx-beautifier/zhinengx_beautifier.user.js
// ==/UserScript==
```

> 💡 **提示**：如果在关闭生产版插件的同时开启此 `[DEV]` 存根脚本，你对 `zhinengx-beautifier/zhinengx_beautifier.user.js` 的任何代码修改，在浏览器刷新后均能秒级生效！

---

## 🌿 2. Git 双层分支模型与版本号规则

- **`main` 分支**：唯一的线上生产分支，只接受经过完整验证的代码。保持 100% 稳健无 BUG。
- **`develop` 分支**：常驻开发与集成分支。所有日常编码、Task 分支合并均在此分支汇总。
- **版本号规则**：
  - **在 `develop` 分支上日常编码与多次 Commit 时，严格不改动 Header 中的 `@version`**！
  - 只有在确定要将代码从 `develop` 合并到 `main` 进行对外发布时，才**单次自增版本号**。

---

## 🚀 3. 标准发版流程四步法 (Release Checklist)

当在 `develop` 分支上完成了一阶段开发并准备发布新版本时：

```bash
# 1. 在 develop 分支上修改 Header 中的 @version 并更新 CHANGELOG.md
git checkout develop
# (编辑版本号如 8.1.0 -> 8.2.0，更新 CHANGELOG.md)
git commit -am "chore(release): bump version to 8.2.0"

# 2. 合并入 main 生产分支
git checkout main
git merge develop

# 3. 打上标准 Git Tag 标记
git tag -a v8.2.0 -m "release: v8.2.0"

# 4. 推送到 GitHub 远程仓库
git push origin main --tags
git checkout develop  # 切回开发分支继续后续研发
```
