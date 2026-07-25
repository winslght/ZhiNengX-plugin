# 🌟 知能行美化专家 (ZhiNengX Beautifier)

![Version](https://img.shields.io/badge/Version-v7.2-brightgreen.style=for-the-badge)
![Author](https://img.shields.io/badge/Author-winslight-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)
![Target](https://img.shields.io/badge/Target-2027%E8%80%83%E7%A0%94%E6%95%B0%E5%AD%A6-red?style=for-the-badge)

为 **知能行考研数学 (bestzixue.com / zhinengxing.com)** 打造的终极美化与沉浸式刷题增强油猴脚本。

通过实时可调的全局毛玻璃（Glassmorphism）、动漫动态壁纸、智能 Dark Reader 插件双向联动、Live2D 动态看板娘以及 27 考研时间管理悬浮窗，让你的刷题体验颜值拉满、高效沉浸！

---

## ✨ 核心特性

- 🎛️ **实时可调毛玻璃控制面板**：无缝内嵌至知能行主导航栏，提供 6 组玻璃透明度与模糊度滑块，支持参数本地保存与一键复制分享。
- 🌙 **Dark Reader 插件智能双向联动**：自动感知 Dark Reader 插件开关状态。开启时秒级切入**黑曜石夜间毛玻璃**，配合专属**壁纸暗化遮光度**（默认 0.60），夜间刷题绝不晃眼。
- 💃 **Live2D 互动看板娘**：引入可爱的二次元 Live2D 挂件，支持侧边栏智能悬停淡入淡出，内置名言刷新与解压小游戏彩蛋。
- 🔥 **27 考研精细时间管理悬浮窗**：实时计算 2027 考研倒计时天数，包含今日/本周/本月剩余比例进度条（动态向左递减）与公历星期显示。
- 🛡️ **原生样式 100% 精准保真**：独创 JSS 动态类名过滤器，绝不误伤原生三段式进度条（`height: 16px`）与图表，彻底消除变形。
- 🚀 **GPU 硬件加速与平板优化**：针对 iPad 及安卓平板设备深度优化，采用 `requestIdleCallback` 节流防抖与 GPU 硬件加速排版，全程稳定 60 帧流畅运行。

---

## 📦 安装与使用教程

### 前置要求
1. 在浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 或 [Violentmonkey (暴力猴)] 插件。
2. 登录并打开 [知能行考研数学](https://www.bestzixue.com/) 页面。

### 安装脚本
1. 克隆或下载本仓库中的 `zhinengx_beautifier.user.js` 文件。
2. 在 Tampermonkey 中新建脚本并粘贴代码保存，或直接安装。

---

## 📂 项目结构

```text
├── zhinengx_beautifier.user.js    # 主脚本文件 (v7.2 最新版)
├── version_history_and_ratings.md # 全版本更新日志与评价汇总表
├── README.md                      # 项目说明文档
└── LICENSE                        # MIT 开源许可证 (Copyright © 2026 winslight)
```

---

## 📜 版权与开源协议 (License & Attribution)

本项目基于 **[MIT License](LICENSE)** 开源。

* **原作者 (Original Author)**: **[winslight](https://github.com/winslight)**
* **Fork 与二次开发规则 (Forking Terms)**: 
  根据 MIT 开源许可协议的规定，任何个人或组织在 Fork、修改、分发或衍生本项目的代码时，**必须在代码 Header tag (`@author winslight`)、`LICENSE` 文件及文档中完整保留原作者 `winslight` 的署名与版权声明**。

```text
Copyright (c) 2026 winslight
Licensed under the MIT License.
```

---

*💪 祝所有 27 考研学子一战成名，顺利上岸！*
