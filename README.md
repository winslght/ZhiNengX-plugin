# <img src="icon.png" width="36" height="36" align="center"> 知能行考研开源插件合集 (ZhiNengX Plugins)

![Version](https://img.shields.io/badge/Version-v11.0.1%20%7C%20v8.1.0-brightgreen?style=for-the-badge)
![Branch](https://img.shields.io/badge/Branch-main%20%7C%20dev--panel%20%7C%20beta-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)
![Target](https://img.shields.io/badge/Target-%E6%95%B0%E5%AD%A6%E4%B8%80%20%7C%20%E6%95%B0%E5%AD%A6%E4%BA%8C%20%7C%20%E6%95%B0%E5%AD%A6%E4%BA%8C-red?style=for-the-badge)

专为 **知能行考研数学 (bestzixue.com / zhinengxing.com)** 打造的开源增强油猴插件工具包。

包含 **数据分析与诊断报告导出插件**（全自动支持数一、数二、数三）与 **UI 视觉美化与考研助手插件**。考研党可根据需求独立安装或配合使用！

---

## 📦 插件一键安装与版本分支导航 (One-Click Install)

在浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 插件后，根据需求点击下方相应按钮一键安装：

### 1. 📊 知能行通用诊断报告与数据大屏导出器 (`v11.0.1 Stable`)
自动适应**数学一、数学二、数学三**考纲。一键提取全量做题数据，导出纯净 Markdown 诊断报告与 ECharts 可视化全景数据大屏。

👉 **[🚀 点击一键安装【数据分析导出插件】](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js)**

---

### 2. 🎨 知能行 UI 视觉美化与考研助手 (3 大分支版本选择)

| 分支版本 | 适用人群 | 特性说明 | 一键安装链接 |
| :--- | :--- | :--- | :--- |
| 🌟 **Main 稳定版 (`v8.1.0`)** | **普通考生推荐** | 代码精简无感，零运行开销，纯净毛玻璃，100% 无 BUG | 👉 **[🚀 安装 Main 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js)** |
| 🛠️ **Dev-Panel 开发者版 (`v7.4.1`)** | **调参定制用户** | 内置可视化 GUI 控制面板，支持实时拖动调节透明度与模糊度 | 👉 **[🛠️ 安装 Dev-Panel 开发者版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/dev-panel/zhinengx-beautifier/zhinengx_beautifier.user.js)** |
| 🧪 **Beta 测试版 (`v8.2.1`)** | **体验与 BUG 尝鲜** | 包含做对/做错水波纹动态感应特效（存在已知局部染色 BUG） | 👉 **[🧪 安装 Beta 测试版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js)** |

---

## 🛠️ 插件核心功能概览

### 📊 数据分析与诊断报告导出器 (Exporter)
- 🎯 **自动识别数一/数二/数三**：根据用户账户自动切换考纲过滤规则，完美匹配对应科目。
- 📝 **纯净 Markdown 报告导出**：一键导出包含考纲能力分布、L1~L5 五级熟练度矩阵、重计算题做对率及错误归因报告。
- 📈 **ECharts 全景数据大屏**：嵌入原生选项卡，可视化生成三维能力雷达图与近期做题趋势图。

### 🎨 UI 视觉美化与考研助手 (Beautifier)
- 🌊 **高雅毛玻璃与暗色联动**：打造高舒适度毛玻璃界面，智能感应 Dark Reader 深色模式同频切换。
- ⌨️ **键盘 Enter 快捷提交**：键盘 Enter 回车自动触发“提交答案”、“继续”及“下一题”，答题效率大幅提升。
- 📅 **考研倒计时与时间管理**：2027 考研倒计时、今日/本周/本月剩余比例进度条及公历日期显示。
- 🤖 **Live2D 看板娘**：内置可折叠交互看板娘，伴你沉浸式备考。

---

## 🔄 版本日志与缺陷管理 (Changelog & Issues)

为了保持主 README 的纯净，全量更新历史与 Known Issues 独立在专用文档中维系：

- 📝 **[完整更新日志 (CHANGELOG.md)](CHANGELOG.md)**：查看全版本演进历程与详细修复细节。
- 🐞 **[已知 BUG 矩阵与 Roadmap (ROADMAP_AND_ISSUES.md)](docs/ROADMAP_AND_ISSUES.md)**：查看当前版本已知 BUG 规避方案与下版开发规划。

---

## 📂 项目结构

```text
ZhiNengX/
├── CHANGELOG.md                        # 📝 全量更新日志与迭代卡片
├── README.md                           # 📖 仓库主说明文档
├── LICENSE                             # 📜 MIT 开源许可证
├── icon.png                            # 🖼️ 项目图标
│
├── zhinengx-beautifier/                # 🎨 UI 视觉美化与考研助手
│   ├── zhinengx_beautifier.user.js     # 核心源码 (v8.1.0 稳定版)
│   └── README.md                       # Sub-module 说明
│
├── zhinengx-exporter/                  # 📊 诊断报告与数据大屏导出器
│   ├── zhinengx_exporter.user.js       # 核心源码 (v11.0.1 稳定版)
│   └── README.md                       # Sub-module 说明
│
├── docs/                               # 📖 项目规范与文档
│   ├── ROADMAP_AND_ISSUES.md          # 🐞 已知 BUG 矩阵与需求池
│   ├── RELEASE_TEMPLATE.md            # 📋 发版日志模版
│   └── version_history_and_ratings.md # 📜 历史评分记录
│
├── archive/                            # 📦 历史版本存档
│   ├── beautifier/                     # 历史美化插件备份
│   └── exporter/                       # 历史导出插件备份
│
└── dev_resources/                      # 🛠️ 开发测试资源 (Git Ignored)
    ├── data/                           # 调试 JSON 数据
    ├── html/                           # 离线 DOM 快照
    └── screenshots/                    # 问题反馈截图
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
