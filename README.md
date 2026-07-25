# <img src="icon.png" width="36" height="36" align="center"> 知能行考研开源插件合集 (ZhiNengX Plugins)

![Version](https://img.shields.io/badge/Version-v11.0%20%7C%20v8.0.0%20Stable-brightgreen?style=for-the-badge)
![Author](https://img.shields.io/badge/Author-winslght-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)
![Target](https://img.shields.io/badge/Target-%E6%95%B0%E5%AD%A6%E4%B8%80%20%7C%20%E6%95%B0%E5%AD%A6%E4%BA%8C%20%7C%20%E6%95%B0%E5%AD%A6%E4%B8%89-red?style=for-the-badge)

专为 **知能行考研数学 (bestzixue.com / zhinengxing.com)** 打造的开源增强油猴插件工具包。

包含 **数据分析与诊断报告导出插件**（全自动支持数一、数二、数三）与 **UI 视觉美化与考研助手插件**。考研党可根据需求独立安装或配合使用！

---

## 📦 插件一键安装 (One-Click Install)

在浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 插件后，点击下方相应按钮即可自动安装：

### 1. 📊 知能行通用诊断报告与数据大屏导出器 (`v11.0`)
自动适应**数学一、数学二、数学三**考纲。一键提取全量做题数据，导出纯净 Markdown 诊断报告与 ECharts 可视化全景数据大屏。

👉 **[🚀 点击一键安装【数据分析导出插件】](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js)**

---

### 2. 🎨 知能行 UI 视觉美化与考研助手 (`v8.0.0 Stable`)
首个稳定发行版！全局毛玻璃（Glassmorphism）、做对/做错动态绿色与红色毛玻璃底栏、Dark Reader 深色模式自适应、Live2D 看板娘及 27 考研倒计时悬浮窗。所有视觉参数经精心调校后硬编码，代码精简 46%。

👉 **[🚀 点击一键安装【UI 视觉美化插件】](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js)**

---

## 🛠️ 插件功能概览

### 📊 数据分析与诊断报告导出器 (Exporter)
- 🎯 **自动识别数一/数二/数三**：根据用户账户自动切换考纲过滤规则，完美匹配对应科目。
- 📝 **纯净 Markdown 报告导出**：一键导出包含考纲能力分布、L1~L5 五级熟练度矩阵、重计算题做对率及错误归因报告。
- 📈 **ECharts 全景数据大屏**：嵌入原生选项卡，可视化生成三维能力雷达图与近期做题趋势图。

### 🎨 UI 视觉美化与考研助手 (Beautifier)
- 🌊 **做对/做错动态水波纹毛玻璃**：提交答案时，底栏感应答题反馈——做对了切入**翡翠绿水波纹毛玻璃**，做错了切入**红宝石水波纹毛玻璃**。
- ⚙️ **界面参数调节面板**：支持 6 组毛玻璃透明度与模糊度调节，实时本地保存配置。
- 🌙 **Dark Reader 深色模式自适应**：智能感应深色模式切换，配备 0.60 背景遮光防晃眼机制。
- 📅 **考研倒计时与时间管理**：2027 考研倒计时、今日/本周/本月剩余比例进度条及公历日期显示。

---

## 📂 项目结构

```text
ZhiNengX-plugin/
├── README.md                           # 仓库主说明文档
├── LICENSE                             # MIT 开源许可证
├── icon.png                            # 2D 简约图标
├── zhinengx-exporter/                  # 📊 数据分析与导出插件
│   └── zhinengx_exporter.user.js       # (通用版: 支持数一/数二/数三)
└── zhinengx-beautifier/                # 🎨 UI 视觉美化与考研助手
    └── zhinengx_beautifier.user.js     # (v7.3 动态水波纹毛玻璃版)
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
