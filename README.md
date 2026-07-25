# 知能行 UI 美化与考研助手 (ZhiNengX Enhancer)

![Version](https://img.shields.io/badge/Version-v7.2-brightgreen?style=for-the-badge)
![Author](https://img.shields.io/badge/Author-winslight-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)

专为 **知能行考研数学 (bestzixue.com / zhinengxing.com)** 打造的 UI 美化与学习增强油猴脚本。

通过实时可调的全局毛玻璃（Glassmorphism）、暗色模式自适应、Live2D 看板娘以及考研倒计时悬浮窗，提升知能行页面的视觉质感与刷题体验。

---

## 🛠️ 核心功能

- ⚙️ **界面参数调节面板**：集成于主导航栏，提供 6 组毛玻璃透明度与模糊度调节滑块，支持配置本地保存。
- 🌙 **Dark Reader 模式智能自适应**：自动联动 Dark Reader 插件，开启深色模式时切换为暗色毛玻璃并降低背景亮度（默认 0.60），保障夜间用眼舒适。
- 💃 **Live2D 互动看板娘**：提供悬浮看板娘挂件，支持侧边栏智能悬停显示与交互功能。
- 📅 **考研倒计时与时间管理**：实时计算 2027 考研倒计时天数，包含今日/本周/本月剩余比例进度条及公历日期显示。
- 🛡️ **原生样式保真**：采用 JSS 动态类名识别，保障原生三段式进度条（`height: 16px`）与图表样式不产生变形。
- ⚡ **性能与平板设备优化**：针对桌面端与 iPad / 安卓平板进行性能调优，采用 `requestIdleCallback` 节流与 GPU 硬件加速。

---

## 📦 安装说明

1. 在浏览器中安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 或 [Violentmonkey (暴力猴)] 扩展。
2. 打开并登录 [知能行考研数学](https://www.bestzixue.com/)。
3. 将仓库中的 `zhinengx_beautifier.user.js` 代码添加至 Tampermonkey 并保存启用。

---

## 📂 项目结构

```text
├── zhinengx_beautifier.user.js    # 脚本主文件 (v7.2)
├── README.md                      # 说明文档
└── LICENSE                        # MIT 开源许可证
```

---

## 📜 版权与开源协议 (License)

本项目遵循 **[MIT License](LICENSE)** 开源协议。

* **作者 (Author)**: **[winslight](https://github.com/winslight)**
* **许可说明**: 任何个人或组织在 Fork、修改或衍生本项目时，须在代码文件及文档中保留原作者 `winslight` 的署名与版权声明。

```text
Copyright (c) 2026 winslight
Licensed under the MIT License.
```
