# 🎨 知能行 UI 视觉美化与考研助手 (ZhiNengX Beautifier)

![Version](https://img.shields.io/badge/Version-v8.1.0-brightgreen?style=for-the-badge)
![Author](https://img.shields.io/badge/Author-winslght-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)
![Target](https://img.shields.io/badge/Target-%E7%9F%A5%E8%83%BD%E8%A1%8C%E8%80%83%E7%A0%94%E6%95%B0%E5%AD%A6-red?style=for-the-badge)

专为 **知能行考研数学 (`bestzixue.com` / `zhinengxing.com`)** 打造的深度 UI 视觉美化与备考效率增强油猴插件！

拒绝原版单调枯燥的网页界面！本插件为您带来 **iOS/macOS 苹果级毛玻璃视觉升级**、**做对/做错动态反馈底栏**、**键盘 Enter 一键快捷提交**、**Dark Reader 深色模式自适应**、**27 考研倒计时悬浮窗** 与 **彩色撒花正向激励**，让考研刷题既高效又赏心悦目！

---

## 🌟 核心功能一览 (Full Features)

### 1. 💎 苹果级 iOS/macOS 磨砂毛玻璃 (Glassmorphism)
- **全局卡片重构**：将知能行主页、顶部导航栏、做题卡片面板、弹窗及工具栏全量升级为精致的磨砂毛玻璃。
- **硬编码极速渲染**：所有不透明度与高斯模糊参数经过黄金分割比精心调校并固化在核心中，**零运行时开销、零延迟、不卡顿**。

### 2. 🟢🔴 做对/做错/超时 动态水波纹毛玻璃底栏
- **做对提示**：底栏呈淡雅翡翠绿毛玻璃（`rgba(34, 197, 94, 0.4)`），配以柔和水波纹渐变与微光悬浮。
- **做错 / 超时未做**：底栏呈警示淡红毛玻璃（`rgba(239, 68, 68, 0.4)`），文字对比度极佳，清晰易读。
- **智能作用域防护**：做题底栏美化仅在实际做题页生效，主页“继续训练”及突破口弹窗绝不误伤变色。

### 3. ⚡ 键盘 `Enter` 回车一键快捷提交 & 下一步 (全新升级)
- **打完答案按回车**：在答案输入框填完答案后，手不用离开键盘，直接按下 **`Enter (回车)`** 键 ➔ 自动精准触发 **`提交答案`**！
- **看完题解按回车**：做完题或看完解题后，再次敲击 **`Enter`** 键 ➔ 自动触发 **`继续`** / **`下一步`** / **`再试一次`**。
- **中文输入法防误触**：内置拼音选词识别，在输入框打字选词敲回车时**绝不误提交**。

### 4. 🌙 Dark Reader 深色模式自适应 (Obsidian Dark Glass)
- **自动感应**：无缝检测 Dark Reader 浏览器插件或系统深色模式。
- **夜间保护**：开启深色模式时，界面自动切为黑曜石深色毛玻璃 + 夜视高亮字体，并自动叠加 `0.60` 暗化遮光罩，保护考研深夜刷题视力。

### 5. 🎉 做对撒花彩带与正向激励音效 (Confetti Fireworks & Audio)
- **成功反馈**：每当您做对题目、消灭突破口或满分通过时，触发璀璨五彩礼花撒花与悦耳提示音，给考研刷题满满的仪式感与成就感！
- **做错严禁撒花**：在题目做错、超时或点击“再试一次”时，坚决拦截撒花与成功音效。

### 6. 🔥 27 考研倒计时悬浮窗 (Exam Countdown Widget)
- **实时倒计时**：屏幕右侧挂载精致磨砂悬浮窗，实时计算并显示 27 考研剩余天数。
- **三重时间进度条**：精确展示【今日剩余小时/分/秒】、【本周剩余天数进度条】、【本月剩余天数进度条】，时刻提醒保持备考状态。
- **平滑交互**：鼠标悬停放大，简洁优雅。

### 7. 🖼️ 高清二次元/动漫壁纸背景 (Anime Theme)
- 默认搭载高清动漫风静音壁纸，全屏固定，极致柔和不抢眼，大幅提升刷题好心情。

### 8. 👧 Live2D 动漫看板娘 Companion
- 屏幕左下角互动式 Live2D 动漫看板娘，侧边工具栏智能隐藏（鼠标悬停才淡入，不遮挡题目）。

### 9. ⚡ 46% 体积精简与 GPU 硬件加速
- 移除所有冗余面板与存取逻辑，代码从 915 行精简至 **497 行**，启用 `transform: translateZ(0)` 硬件加速，杜绝平板与低配电脑掉帧！

---

## 📦 安装与更新 (Installation)

1. 在浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 插件。
2. 点击本页面上方的 **【安装此脚本 / Install this script】** 按钮。
3. 打开知能行官网 (`app.bestzixue.com` 或 `zhinengxing.com`) 即可享受全新刷题界面！

---

## 🛠️ 项目开源与反馈

- **GitHub 仓库**：[winslght / ZhiNengX-plugin](https://github.com/winslght/ZhiNengX-plugin)
- **作者**：`winslght`
- **开源协议**：`MIT License`

*祝所有考研学子数学高分过关，顺利上岸！*
