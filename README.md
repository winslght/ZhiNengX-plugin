# ZhiNengX Plugins

![Version](https://img.shields.io/badge/Version-v11.0.1%20%7C%20v8.1.0-brightgreen?style=flat-square)
![Branch](https://img.shields.io/badge/Branch-main%20%7C%20develop%20%7C%20dev--panel%20%7C%20beta-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=flat-square)
![Target](https://img.shields.io/badge/Target-Math%201%20%7C%20Math%202%20%7C%20Math%203-red?style=flat-square)

ZhiNengX Plugins 是专为 [知能行考研数学](https://www.bestzixue.com) 平台打造的开源浏览器增强工具包。通过非侵入式的 DOM 动态渲染与数据结构解析引擎，提升 Web 端的视觉体验与数据诊断分析能力。

项目包含以下两个独立运行的辅助模块：
- **ZhiNengX Exporter**：通用做题数据导出与 ECharts 可视化诊断大屏。
- **ZhiNengX Beautifier**：全局 Glassmorphism 毛玻璃视觉升级、Dark Reader 深色模式同频联动与考研倒计时助手。

---

## 📦 模块安装与分支说明

在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/) 插件后，点击下方对应链接即可安装：

### 1. 数据诊断与报告导出器 (Exporter)
自动识别数学一、数学二、数学三考纲分类。提取全量做题数据并生成标准化 Markdown 格式诊断报告与 ECharts 三维能力雷达图。

- [安装 Exporter 稳定版 (v11.0.1)](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js)

### 2. UI 视觉美化与考研助手 (Beautifier)

| 分支 (Branch) | 版本 (Version) | 定位与适用场景 | 安装链接 |
| :--- | :--- | :--- | :--- |
| **`main`** | **v8.1.0 (Stable)** | **生产稳定版**。无感 CSS 变量渲染，零运行开销，适合日常使用 | [安装 Main 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **`dev-panel`** | **v7.4.1 (Dev GUI)** | **开发者调参版**。内置 GUI 控制面板，支持实时调节透明度与模糊度 | [安装 Dev-Panel 开发者版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/dev-panel/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **`beta`** | **v8.2.0-beta.1** | **预发布公测版**。包含水波纹做题感应与多 CDN 容灾重试等最新特性 | [安装 Beta 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js) |

---

## 🛠️ 功能特性与技术设计

### 📊 ZhiNengX Exporter
- **考纲自适应**：根据账户数据自动匹配数一/数二/数三专属模块过滤逻辑。
- **纯净报告导出**：导出包含能力分布、熟练度矩阵与重计算错误归因的标准化 Markdown 文本。
- **ECharts 可视化**：原生嵌入能力雷达图与近期做题趋势图表。

### 🎨 ZhiNengX Beautifier
- **Glassmorphism 视觉体系**：基于无感 CSS 变量构建毛玻璃与阴影图层，保护原生布局。
- **Dark Reader 自动同频**：监听 `html[data-darkreader-scheme]` 属性变动，无缝切换深色黑曜石样式。
- **高频交互优化**：支持键盘 `Enter` 快捷键提交与下一步。
- **倒计时天数追踪**：提供精细至 1 位小数的今日/本周/本月剩余时间比例。

---

## 📖 工程化规范与文档索引

本项目建立了完整的规范体系，研发与缺陷追踪详见以下文档：

- 📝 **[更新日志 (CHANGELOG.md)](CHANGELOG.md)**：项目全量演进历史与版本变更履历。
- 🐞 **[缺陷矩阵与 Roadmap (ROADMAP_AND_ISSUES.md)](docs/ROADMAP_AND_ISSUES.md)**：已知 BUG 追踪表、临时规避方案与下版功能规划。
- ⚡ **[0 Push 秒级调试指南 (DEVELOPMENT_WORKFLOW.md)](docs/DEVELOPMENT_WORKFLOW.md)**：基于 Tampermonkey `file://` 直加载机制的本地调试与发版 SOP。
- 🛡️ **[Git Task 分支隔离规范 (GIT_DEVELOPMENT_SOP.md)](docs/GIT_DEVELOPMENT_SOP.md)**：任务分支隔离 (feature/fix) 与止损回退决策 SOP。

---

## 📂 项目结构

```text
ZhiNengX/
├── CHANGELOG.md                        # 变更历史与版本履历
├── README.md                           # 项目说明文档
├── LICENSE                             # MIT 开源许可证
├── zhinengx-beautifier/                # 美化插件源码与说明
│   └── zhinengx_beautifier.user.js
├── zhinengx-exporter/                  # 导出插件源码与说明
│   └── zhinengx_exporter.user.js
├── docs/                               # 研发 SOP 与缺陷追踪文档
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── GIT_DEVELOPMENT_SOP.md
│   ├── ROADMAP_AND_ISSUES.md
│   ├── RELEASE_TEMPLATE.md
│   └── version_history_and_ratings.md
├── archive/                            # 历史版本归档备份
└── dev_resources/                      # 本地调试与测试资源
```

---

## 📜 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2026 winslght.
