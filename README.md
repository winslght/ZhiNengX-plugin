# <img src="icon.png" width="38" height="38" align="center"> ZhiNengX Plugins (知能行考研开源插件合集)

![Version](https://img.shields.io/badge/Version-v11.0.1%20%7C%20v8.2.0--beta.1-brightgreen?style=for-the-badge&logo=tampermonkey)
![Branch](https://img.shields.io/badge/Branch-main%20%7C%20develop%20%7C%20beta-blue?style=for-the-badge&logo=git)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)
![Target](https://img.shields.io/badge/Target-Math%201%20%7C%20Math%202%20%7C%20Math%203-red?style=for-the-badge)

**ZhiNengX Plugins** 是专为 **[知能行考研数学 (bestzixue.com / zhinengxing.com)](https://www.bestzixue.com)** 平台量身打造的高性能、模块化开源浏览器辅助工具包。

基于非侵入式 DOM 动态感应引擎、无感 CSS 变量渲染管道与底层 XHR/Fetch 双模数据拦截技术，为考研党提供极致的**全局 Glassmorphic 视觉升级、高效刷题辅助工具**以及**考纲自适应数据诊断与 ECharts 可视化报告**。

---

## 🏗️ 架构概览 (Architecture Overview)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ZhiNengX Plugins Suite                               │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ 🎨 ZhiNengX Beautifier                    │ 📊 ZhiNengX Exporter                       │
│ 视觉美化与考研助手                            │ 通用诊断报告与数据大屏导出器                   │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ 💎 Glassmorphism GPU 加速毛玻璃引擎         │ 🎓 自动感知数一 / 数二 / 数三考纲分类          │
│ 🌙 Dark Reader 深色模式同频自适应          │ 📊 ECharts 3D 能力雷达 & 每日做题趋势大屏   │
│ ⚡ 做题状态感应 (翡翠绿/红宝石水波纹)       │ 📝 7 大维度标准化 Markdown 诊断报告导出     │
│ ⌨️ 回车快捷提交 / 下一步全流程代理         │ 🛡️ 全链路 try-catch-finally 异常防线        │
│ ⏳ 精准至 1 位小数倒计时与时间管理        │ 📋 GM_setClipboard 三级剪贴板降级机制       │
│ 🤖 Live2D 看板娘 (多 CDN 容灾+8s Guard)   │ ⚡ XHR / Fetch 双模拦截 + 主动 Fetch 补全  │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 📦 模块安装与分支矩阵 (Install & Branch Matrix)

在浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 插件后，根据需求一键安装：

### 1. 📊 知能行通用诊断报告与数据大屏导出器 (`ZhiNengX Exporter`)

| 分支 (Branch) | 版本 (Version) | 特性与适用场景 | 一键安装链接 |
| :--- | :--- | :--- | :--- |
| 🌟 **`main` (稳定版)** | **`v11.0.1`** | **生产稳定版**。支持数一/二/三全考纲，Markdown 报告导出与 ECharts 可视化 | 👉 **[🚀 安装 Main 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js)** |
| 🧪 **`beta` (公测版)** | **`v11.0.1-beta.1`** | **最新公测版**。包含全链路 `try-catch-finally` 防线与三级剪贴板降级兜底 | 👉 **[🧪 安装 Beta 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-exporter/zhinengx_exporter.user.js)** |

---

### 2. 🎨 知能行 UI 视觉美化与考研助手 (`ZhiNengX Beautifier`)

| 分支 (Branch) | 版本 (Version) | 特性与适用场景 | 一键安装链接 |
| :--- | :--- | :--- | :--- |
| 🌟 **`main` (稳定版)** | **`v8.1.0`** | **生产稳定版**。代码精简无感，零运行开销，纯净毛玻璃，100% 稳健 | 👉 **[🚀 安装 Main 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js)** |
| 🧪 **`beta` (公测版)** | **`v8.2.0-beta.1`** | **最新公测版**。含做对/做错水波纹、Live2D 多 CDN 容灾与 1 位小数倒计时 | 👉 **[🧪 安装 Beta 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js)** |
| 🛠️ **`dev-panel` (调参版)**| **`v7.4.1`** | **开发者调参版**。内置可视化 GUI 控制面板，支持拖动调节透明度与模糊度 | 👉 **[🛠️ 安装 Dev-Panel 调参版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/dev-panel/zhinengx-beautifier/zhinengx_beautifier.user.js)** |

---

## ⚡ 核心功能与技术实现全景 (Feature Deep-Dive)

### 🎨 ZhiNengX Beautifier (UI 美化与考研助手)

1. 💎 **Glassmorphism 视觉渲染管道**：
   - 采用 CSS 自定义变量 (`--znx-glass-rgb`) 与 GPU 硬件加速图层 (`will-change: backdrop-filter`)。
   - 零侵入式对顶栏 (`MuiAppBar`)、功能卡片 (`MuiPaper`)、做题对话框 (`MuiDialog`) 施加自适应毛玻璃与高斯模糊效果。
2. 🌙 **Dark Reader 深色模式同频自适应**：
   - 实时监听 `document.documentElement` 的 `data-darkreader-scheme` 及类名变更，自动在亮色模式 (`rgba(255,255,255,0.35)`) 与暗色黑曜石模式 (`rgba(20,22,28,0.35)`) 之间无缝切换。
3. ⚡ **做题状态动态感应与视觉/音效反馈**：
   - 智能判定做题结果（做对、做错、超时、放弃），优先保护正确状态。
   - 做对时触发翡翠绿水波纹毛玻璃感应与成功音效、彩色纸屑撒花 (`canvas-confetti`)；做错时施加红宝石毛玻璃警示。
4. ⌨️ **回车快捷提交全流程代理**：
   - 智能绑定键盘 `Enter` 键，填完答案后敲击回车直接触发“提交答案”、“继续”、“下一题”、“再试一次”。
   - 内置输入法 `isComposing` 保护，防止中文输入选词时误触发。
5. ⏳ **精细至 1 位小数的考研倒计时面板**：
   - 提供右侧悬浮考研倒计时，包含【今日剩余】(时/分/秒)、【本周剩余】(1位小数) 与【本月剩余】(1位小数) 三段式动态进度条。
   - 彻底解决传统整数天数在周日显示 `剩余 0 天` 的尴尬断层感。
6. 🤖 **Live2D 看板娘与多 CDN 容灾 Guard**：
   - 整合 Live2D 看板娘与 FontAwesome 矢量图标库。
   - 内置 3 组 jsDelivr CDN 镜像轮询 (`Fastly` / `Primary` / `TestingCF`) 与 `script.onerror` 自动清除。
   - 包含 8 秒 DOM 健康检测 Guard 与指数退避重试队列，确保网络波动时看板娘高可用。
7. 🛠️ **DEV 碎版本底栏追溯水印**：
   - 在开发调试与测试版本下，屏幕底部正中悬浮显示炫酷 Dev 水印（如 `🛠️ DEV v8.2.0-beta.1`），支持一键点击复制版本号。

---

### 📊 ZhiNengX Exporter (数据诊断与大屏导出器)

1. 🎓 **考纲自动感应与精准过滤器**：
   - 解析用户 Profile 数据中的 `examType`，自动切换 **数学一**（全考纲）、**数学二**（自动屏蔽曲线/曲面积分、级数、傅里叶、经济应用、概率论）、**数学三**（自动屏蔽曲线/曲面积分、傅里叶级数）。
2. 📊 **ECharts 3D 可视化诊断全景大屏**：
   - 注入原生 Modal 模态框，绘制知识点三维能力雷达图（概念掌握 / 简单应用 / 综合技巧）与近期每日刷题量/正确率混合趋势柱状图。
3. 📝 **标准化 Markdown 诊断报告一键导出**：
   - 导出包含 **7 大维度** 的 Markdown 诊断报告：
     1. 考生档案与学习概况 (含小黄点优先消灭章节警示)
     2. 核心章节熟练度五级分布矩阵 (Level 1 ~ Level 5)
     3. 知识点三维能力拆解 (CONCEPTS / APPLICATION / COMBO)
     4. 重计算题硬核能力明细 (接触数 / 独立做对率 / 二次修正数)
     5. 近期每日刷题与测试正确率明细
     6. 做错原因归因与诊断 (粗心过快 / Tutor 辅导通过率)
     7. 近期进步提升轨迹排行 (本周 / 上周)
4. 🛡️ **全链路 `try-catch-finally` 异常防线与三级剪贴板降级**：
   - `try-catch-finally` 强行保护，确保无论遇到何种网络或未知错误，按钮文案绝不卡死在“生成中...”。
   - 剪贴板三级降级机制：`GM_setClipboard` 特权 -> `navigator.clipboard` 原生 API -> 原生 `prompt()` 复制框兜底。
5. ⚡ **双模网络拦截与主动 Fetch 补全引擎**：
   - 拦截 `XMLHttpRequest.prototype.open` / `send` (检查 `responseURL`) 与 `unsafeWindow.fetch`。
   - 内置多 candidate API 接口列表，支持点击时主动 Fetch 补全 JSON 数据。

---

## 📖 研发 SOP 与工程规范 (Developer Portal)

本项目建立了完整的现代前端工程化规范体系，开发者可查阅以下 SOP 文档：

- 📝 **[完整更新日志 (CHANGELOG.md)](CHANGELOG.md)**：全量演进历史、版本变更履历与 Dev History 记录。
- ⚡ **[0 次 Push 秒级调试指南 (DEVELOPMENT_WORKFLOW.md)](docs/DEVELOPMENT_WORKFLOW.md)**：基于油猴 `file://` 直加载存根的本地免提交秒级调试与 Release Checklist SOP。
- 🛡️ **[Git Task 分支隔离与止损回退 SOP (GIT_DEVELOPMENT_SOP.md)](docs/GIT_DEVELOPMENT_SOP.md)**：规范 `fix/xxx` 与 `feat/xxx` 分支隔离、Fix Forward 与 Revert / Abandon 止损决策树。
- 🐞 **[缺陷矩阵与 Roadmap (ROADMAP_AND_ISSUES.md)](docs/ROADMAP_AND_ISSUES.md)**：已知 BUG 规避方案与下一版本需求池。

---

## 📂 项目结构 (Project Sitemap)

```text
ZhiNengX/
├── CHANGELOG.md                        # 📝 全量更新日志与版本履历
├── README.md                           # 📖 仓库主说明文档
├── LICENSE                             # 📜 MIT 开源许可证
├── icon.png                            # 🖼️ 项目图标
│
├── zhinengx-beautifier/                # 🎨 UI 视觉美化与考研助手
│   ├── zhinengx_beautifier.user.js     # 核心源码 (v8.1.0 稳定版 / v8.2.0-beta.1)
│   └── README.md                       # Sub-module 说明
│
├── zhinengx-exporter/                  # 📊 诊断报告与数据大屏导出器
│   ├── zhinengx_exporter.user.js       # 核心源码 (v11.0.1 稳定版 / v11.0.1-beta.1)
│   └── README.md                       # Sub-module 说明
│
├── docs/                               # 📖 研发 SOP 与工程规范
│   ├── DEVELOPMENT_WORKFLOW.md        # ⚡ 0 Push 秒级调试与发版 SOP
│   ├── GIT_DEVELOPMENT_SOP.md         # 🛡️ Task 分支隔离与止损回退 SOP
│   ├── ROADMAP_AND_ISSUES.md          # 🐞 已知 BUG 矩阵与需求池
│   ├── RELEASE_TEMPLATE.md            # 📋 发版日志模版
│   └── version_history_and_ratings.md # 📜 历史评分记录
│
├── archive/                            # 📦 历史版本归档备份
│   ├── beautifier/
│   └── exporter/
│
└── dev_resources/                      # 🛠️ 本地开发调试资源 (Git Ignored)
    ├── zhinengx_beautifier.dev.user.js # 美化助手 file:// 直加载调试存根
    └── zhinengx_exporter.dev.user.js   # 导出器 file:// 直加载调试存根
```

---

## 📜 版权与开源协议 (License)

本项目遵循 **[MIT License](LICENSE)** 开源协议。

* **作者 (Author)**: **[winslght](https://github.com/winslght)**
* **许可说明**: 任何个人或组织在 Fork、修改或衍生本项目时，须在代码文件及文档中保留原作者 `winslght` 的署名与版权声明。

```text
Copyright (c) 2026 winslght
Licensed under the MIT License.
```
