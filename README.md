# ZhiNengX Plugins

![Branch](https://img.shields.io/badge/Branch-main%20%7C%20develop%20%7C%20dev--panel%20%7C%20beta-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=flat-square)
![Target](https://img.shields.io/badge/Target-Math%201%20%7C%20Math%202%20%7C%20Math%203-red?style=flat-square)

ZhiNengX Plugins 是专为 [知能行考研数学](https://www.bestzixue.com) 平台打造的开源浏览器增强工具包。通过非侵入式的 DOM 动态渲染与数据结构解析引擎，提升 Web 端的视觉体验与数据诊断分析能力。

项目包含以下两个独立运行的辅助模块：
- **知能行原生数据诊断报告导出及可视化全景视图 (ZhiNengX Exporter)**：通用做题数据导出与 ECharts 可视化诊断大屏。
- **知能行UI深度美化及体验高度优化 (ZhiNengX Beautifier)**：全局 Glassmorphism 毛玻璃视觉升级、Dark Reader 深色模式同频联动与考研倒计时助手。

---

## 📦 模块安装与分支说明

在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/) 插件后，点击下方表格中的对应链接即可安装：

### 1. 知能行原生数据诊断报告导出及可视化全景视图 (ZhiNengX Exporter)

| 分支 (Branch) | 定位与适用场景 | 一键安装链接 |
| :--- | :--- | :--- |
| **`main`** | **稳定版**。自动匹配数一/二/三全考纲，Markdown 报告导出与 ECharts 可视化 | [安装 Exporter 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js) |
| **`beta`** | **预发布公测版**。包含全链路异常防护与三级剪贴板降级机制 (`GM_setClipboard` -> `clipboard` -> `prompt`) | [安装 Exporter 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-exporter/zhinengx_exporter.user.js) |

---

### 2. 知能行UI深度美化及体验高度优化 (ZhiNengX Beautifier)

| 分支 (Branch) | 定位与适用场景 | 一键安装链接 |
| :--- | :--- | :--- |
| **`main`** | **稳定版**。无感 CSS 变量渲染，零运行开销，纯净毛玻璃，适合日常使用 | [安装 Beautifier 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **`dev-panel`** | **开发者调参版**。内置 GUI 控制面板，支持实时手动调节透明度与模糊度 | [安装 Dev-Panel 调参版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/archive-dev-panel/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **`beta`** | **预发布公测版**。集成做题端倒计时晶莹收纳胶囊、一键复制题目 (Markdown + LaTeX) 与 Glassmorphism 2.0 材质体系 | [安装 Beautifier 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js) |

---

## 🛠️ 功能特性与技术设计

### 📊 知能行原生数据诊断报告导出及可视化全景视图 (Exporter)

- **考纲自适应**：根据账户数据自动匹配数一/数二/数三专属模块过滤逻辑。
- **按钮原生集成**：按钮原生融合知能行系统。
- **纯净报告导出**：导出包含能力分布、熟练度矩阵与重计算错误归因的标准化 Markdown 文本。
- **ECharts 可视化**：原生嵌入能力雷达图与近期做题趋势图表。

### 🎨 知能行UI深度美化及体验高度优化 (Beautifier)

- **原有材质替换为iOS/Mac OS毛玻璃材质**：基于无感 CSS 变量构建毛玻璃与阴影图层，保护原生布局。
- **高质量随机ACG背景**：自动随机高质量ACG背景，随刷新更换。
- **Dark Reader 自适应深色模式**：监听 `html[data-darkreader-scheme]` 属性变动，无缝切换深色黑曜石样式。
- **Live2D 看板娘**：加入动态Live2D 看板娘，支持更换模型与服装。
- **高频交互优化**：支持任意位置输入锁定输入框、数字键12345锁定选项、键盘 `Enter` 快捷键提交与下一步。
- **倒计时天数追踪**：提供精细至 1 位小数的今日/本周/本月剩余时间比例。

---

## 📖 工程化规范与文档索引

本项目建立了完整的规范体系。**全部文档的索引、权威来源声明与推荐阅读路径见 [📚 docs/README.md](docs/README.md)**，核心文档速览：

- 📝 **[更新日志 (CHANGELOG.md)](CHANGELOG.md)**：项目全量演进历史与版本变更履历。
- 🏛️ **[六维 Git Flow 分支架构规范 (GIT_FLOW_SPECIFICATION.md)](docs/GIT_FLOW_SPECIFICATION.md)**：分层隔离递进交付模型与中英文双语 Commit 提交纪律（**Git 规则唯一权威**）。
- ⚡ **[0 Push 秒级调试指南 (DEVELOPMENT_WORKFLOW.md)](docs/DEVELOPMENT_WORKFLOW.md)**：基于 Tampermonkey `file://` 直加载机制的本地调试与发版 SOP。
- 🛡️ **[Git Task 分支隔离规范 (GIT_DEVELOPMENT_SOP.md)](docs/GIT_DEVELOPMENT_SOP.md)**：任务分支隔离 (feature/fix) 与止损回退决策 SOP。
- 🐞 **[缺陷矩阵与 Roadmap (ROADMAP_AND_ISSUES.md)](docs/ROADMAP_AND_ISSUES.md)**：已知 BUG 追踪表、临时规避方案与下版功能规划（**优先级唯一权威**）。
- 🗃️ **[历史版本归档索引 (archive/README.md)](archive/README.md)**：v4.1 ~ v8.4.1 版本快照、第三方原型溯源与归档去重记录。
- 🧪 **[本地调试资源说明 (dev_resources/README.md)](dev_resources/README.md)**：调试存根用法、复制回归夹具与截图规范。

---

## 📂 项目结构

```text
ZhiNengX/
├── AGENTS.md                           # AI Agent 最高执行准则与项目红线
├── CHANGELOG.md                        # 变更历史与版本履历
├── README.md                           # 项目说明与安装入口
├── LICENSE                             # MIT 开源许可证
├── icon.png                            # 仓库图标（被 user.js @icon 与 raw 链接引用，勿移动勿改名）
├── zhinengx-beautifier/                # 美化插件源码与说明
│   ├── README.md
│   └── zhinengx_beautifier.user.js
├── zhinengx-exporter/                  # 导出插件源码与说明
│   ├── README.md
│   └── zhinengx_exporter.user.js
├── docs/                               # 研发 SOP、需求规范、发布记录与缺陷追踪
│   ├── README.md                       # 📚 文档索引与权威来源声明（先读这个）
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── GIT_DEVELOPMENT_SOP.md
│   ├── GIT_FLOW_SPECIFICATION.md
│   ├── FEAT_COPY_PROBLEM_MARKDOWN.md
│   ├── ROADMAP_AND_ISSUES.md
│   ├── RELEASE_TEMPLATE.md
│   ├── RELEASE_v8.0.0.md
│   ├── VERSION_HISTORY_AND_RATINGS.md
│   └── diagnostic_report_sample.md
├── archive/                            # 历史版本与第三方原型归档
│   ├── README.md                       # 🗃️ 归档索引与去重记录
│   ├── beautifier/                     # Beautifier v4.1 ~ v8.4.1 快照
│   ├── exporter/                       # Exporter v11.0 快照
│   └── legacy/                         # 第三方 MIT 原型（已整合进 8.4.0）
└── dev_resources/                      # 本地调试存根、回归夹具与验收截图
    ├── README.md                       # 🧪 调试资源使用说明
    ├── zhinengx_beautifier.dev.user.js
    ├── zhinengx_exporter.dev.user.js
    ├── copy-solution-server.cjs
    ├── copy-solution-test.html
    └── screenshots/
```

> ⚠️ `zhinengx-beautifier/`、`zhinengx-exporter/` 的目录名与文件名、以及根目录 `icon.png` 均为**安装链接硬依赖**（raw.githubusercontent.com 路径），重命名会直接导致所有用户的一键安装失效。

---

## 📜 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2026 winslght.