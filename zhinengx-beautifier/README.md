# 🎨 知能行 UI 视觉美化与考研助手 (ZhiNengX Beautifier)

![Author](https://img.shields.io/badge/Author-winslght-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=flat-square)
![Target](https://img.shields.io/badge/Target-%E7%9F%A5%E8%83%BD%E8%A1%8C%E8%80%83%E7%A0%94%E6%95%B0%E5%AD%A6-red?style=flat-square)

> **定位**：把知能行单调的做题界面换成 iOS/macOS 毛玻璃质感，并把高频操作压到键盘上，让考研刷题更顺手、更耐久。

---

## 📦 安装

| 渠道 | 说明 | 安装链接 |
| :--- | :--- | :--- |
| **稳定版** (`main`) | 只含已验收的改动 | [安装稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **公测版** (`beta`) | 提前体验新功能，可能含未实机回归的改动 | [安装公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js) |

1. 先安装 [Tampermonkey](https://www.tampermonkey.net/)（Violentmonkey 亦可）。
2. 点击上表链接完成安装。
3. 打开知能行官网（`app.bestzixue.com` 或 `zhinengxing.com`）即可生效。

> 版本号以脚本头部 `@version` 与 [CHANGELOG](../CHANGELOG.md) 顶部条目为准。两个渠道**请只启用其一**，同时启用会重复注入界面。

---

## ✨ 功能特性

### 💎 毛玻璃材质体系
- 主页、顶部导航、做题卡片、弹窗与工具栏统一升级为磨砂毛玻璃。
- 材质参数固化在核心样式中，运行时不做额外计算，不引入掉帧。

### 🟢🔴 做对 / 做错动态反馈
- 做对：淡翡翠绿毛玻璃底栏，配柔和水波纹渐变。
- 做错 / 超时：淡红警示底栏，保证文字对比度。
- 作用域限定在实际做题页，主页与突破口弹窗不会被误染色。

### ⌨️ 键盘效率增强
- 数字键 `1`~`5`（及 `A`~`E`）按**屏幕从上到下的视觉顺序**选中选项，不受平台打乱选项 ID 影响。
- `Enter` 提交答案 / 继续 / 下一步；中文输入法选词回车不会误提交。

### 🌙 Dark Reader 深色自适应
- 监听 `html[data-darkreader-scheme]` 自动切换到黑曜石深色毛玻璃，并叠加暗化遮光罩保护夜间视力。

### 📋 题目与解析复制
- 做题页「复制题目」：一键复制题干与选项（Markdown + LaTeX）。
- 训练页「查看原题」弹窗：复制完整题目与解析，按 Markdown 章节输出，题图保留为链接，不下载不上传图片。
- 浏览器拒绝剪贴板权限时自动走备用方案，最终回退到手动复制弹窗；内容不完整或公式结构不支持时会明确提示失败，而非复制残缺结果。
- 致谢：解析提取能力参考 **玄鸟墨色** 以 MIT 许可发布的「知能行题目解析提取」组件（原型存档见 [`archive/legacy/`](../archive/legacy/)）。使用整合版时请停用其独立脚本，避免出现两个入口。

### 🔥 备考陪伴
- 考研倒计时悬浮窗：今日剩余、本周 / 本月进度一眼可见，可展开为大卡片并记住拖拽位置。
- Live2D 看板娘与 ACG 背景：可在美化面板随时开关，退场与进场动画平滑。
- 做对撒花彩带与提示音，做错时严格拦截。

---

## 🧩 与其它模块的关系

与 [Exporter](../zhinengx-exporter/README.md) 相互独立，可单独安装，也可同时启用。

---

## 📚 相关文档

- [项目说明](../README.md) · [文档索引](../docs/README.md) · [更新日志](../CHANGELOG.md)
- [缺陷矩阵与 Roadmap](../docs/ROADMAP_AND_ISSUES.md) — 已知问题、规避方案与下版规划
- [复制题目需求设计](../docs/FEAT_COPY_PROBLEM_MARKDOWN.md) — 提取算法、边界与交互设计
- [本地调试 SOP](../docs/DEVELOPMENT_WORKFLOW.md) — 免 Push 秒级调试

---

## 🛠️ 开源与反馈

- **仓库**：[winslght / ZhiNengX-plugin](https://github.com/winslght/ZhiNengX-plugin)
- **作者**：`winslght`
- **协议**：[MIT License](../LICENSE)

*祝所有考研学子数学高分过关，顺利上岸！*
