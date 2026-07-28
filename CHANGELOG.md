# 📝 ZhiNengX (知能行考研开源插件合集) 更新日志

本文档遵守 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范，记录 **知能行 UI 视觉美化与考研助手 (Beautifier)** 与 **知能行通用诊断报告导出器 (Exporter)** 的全量更新历史、前版痛点修复归因、当前已知 BUG 及下一版本 Roadmap 规划。

---

## 🚀 [Unreleased / 下一版本 Roadmap 规划]

### 🧪 本地开发碎版本履历 (Dev History)
- **Beautifier v8.2.0-dev.1** (2026-07-27):
  - **Fixed**: 修复 `setupKeyboardShortcutsHandler` 中的致命 `ReferenceError: targetOption is not defined` 异常与缺失 `}` 导致的 `SyntaxError` 阻断级 Bug。
  - **Fixed**: 提前 `isCurrentlyInInput` 输入框判定顺序，防止主观题 `TEXTAREA` 多行换行与富文本框 `role="textbox"` 按回车被错误劫持为“提交答案”。
  - **Added**: 解析知能行真实 DOM (`#choiceButtonA~E`)，精准绑定数字键 `1~5` 到选择题选项 A-E。
  - **Reverted**: 彻底撤回 ESC/Space 快捷键与输入框虚空索敌对焦逻辑，仅保留极速 1~5 数字键秒选与 Enter 回车提交。

### 📌 下一版本重定义目标 (Architecture Refactor)
- **Beautifier 回车键 Primary Action 智能代理**：由文本白名单检索升级为基于 Material-UI 主色类 (`containedPrimary`) 与卡片右下角物理位置识别，确保盲操覆盖阶段过渡界面。
- **Beautifier 选择题 1-5 快捷键映射重构**：由字母 ID 硬编码绑定升级为 DOM 屏幕物理纵向坐标 (`getBoundingClientRect().top`) 动态排序绑定，彻底解决知能行打乱选项顺序导致的 1-5 键位错位痛点。
- **Beautifier 题目复制引擎重构**：将题目复制从“全量卡片克隆+正则洗涤”升级为“题干与选项源头靶向提取”架构，彻底解决倒计时胶囊文本泄露与空行多余问题。
- **Beautifier 暗色过渡卡片毛玻璃覆盖**：扩充 CSS 匹配选择器，覆盖 `#212529` 等暗色行内背景节点，赋予全流程通透视觉。
- **ZhiNengX Unified Engine v8.3.0 / v11.1.0 目标**：全量合并 Beautifier 与 Exporter 两个脚本，去除冗余共享组件并实现轻量化模块架构。

---

## 🧪 专版公测 (Beta Branches)

### 📌 [v8.2.0-beta.4] - 2026-07-27 (Beta 公测版)
> **本版主要动机**：全量发布做题端倒计时晶莹收纳胶囊、Glassmorphism 2.0 材质统一下沉、Live2D 动态金句与进度条全防护。

#### 🎨 知能行 UI 视觉美化与考研助手 (ZhiNengX Beautifier)
- **Refactored**: 重构考研倒计时布局：主页展开 260px 经典卡片；做题界面（`znx-doing-questions`）收纳为题目顶部与复制按钮协排的 `🔥 距考研 145天 · 今日 05:22` 晶莹胶囊，5 秒无操作自动收回。
- **Style**: 统一 Glassmorphism 2.0 材质：高透光渐变、高斯模糊 (`blur(12px)`)、`20px` 圆角胶囊形态与顶边内光，与 `📋 复制题目` 按钮并列居左对齐。
- **Added**: 看板娘考研精炼金句与做题交互提示（鼠标悬停提交/查看题解/输入框时触发提示）。
- **Fixed**: 修复对话框/成就卡片内的等级进度条 (`MuiLinearProgress`) 被毛玻璃图层误覆盖消隐问题，设置最高优先级保真防护。
- **Fixed**: 强化 Live2D 看板娘 Canvas 实体画面双重校验与破损节点自动擦除轮换。

### 📌 [v8.2.0-beta.3] - 2026-07-27 (Beta 公测版)
> **本版主要动机**：全量发布经过 5 轮本地对抗碎测无 BUG 的 **`📋 一键复制原排版题目 (Markdown + LaTeX)`** 核心功能。

#### 🎨 知能行 UI 视觉美化与考研助手 (ZhiNengX Beautifier)
- **Added**: 新增 `📋 复制题目` 按钮组件，纯粹提取当前题目全文与格式。
- **Added**: 提纯 KaTeX 与 MathJax v2.7 (SVG/TeX/MathML) 源码，行内公式输出为 `$ ... $`，块级公式输出为 `$$ ... $$`。
- **Added**: 三级降级剪贴板架构 (`navigator.clipboard` ➔ `execCommand` ➔ `Glassmorphism Modal` 弹框)，严格遵循 `@grant none` 沙盒安全机制。
- **Added**: 针对无标号选项自动补充 `A. `, `B. `, `C. `, `D. `, `E. ` 标号前缀，剔除假选项与做题提示，纯正则二次强洗擦除 UI 杂质。

### 📌 [v8.2.0-beta.1 / v11.0.1-beta.1] - 2026-07-26 (Beta 公测版)
> **本版主要动机**：全量修复三大已知 BUG（Live2D 容灾重试、导出报告卡死、倒计时精度）并发布公测。

#### ✨ 变更明细 (Changes)
- **Fixed (Beautifier)**: 修复由于 CDN 网络波动/超时导致 Live2D 看板娘加载失败后彻底消失的问题，引入多 CDN 容灾轮询（Fastly / Primary / TestingCF）与 8s DOM 健康重试 Guard。
- **Fixed (Beautifier)**: 优化考研倒计时面板，“本周剩余”与“本月剩余”全面升级为 1 位小数精准动态天数（如周日显示 `0.1 天`），消除原本周日显示 `0 天` 的断层尴尬感。
- **Fixed (Exporter)**: 彻底修复点击“导出报告”时因 `rates[0]` 等空指针异常与 `MATH2_EXCLUDE_KEYS` 变量未定义导致按钮卡死在“生成中...”的 Major BUG。
- **Added (Exporter)**: 增加全链路 `try-catch-finally` 防线与三级剪贴板降级机制 (`GM_setClipboard` -> `navigator.clipboard` -> 原生 `prompt()` 弹框）。

---

### 🔮 计划新增功能 (Planned Features)
- [ ] **【Beautifier】** 新增自定义背景图片 URL 替换输入框与模糊度独立微调。
- [ ] **【Exporter】** 增加各章节“做对/做错/重做”详细题目列表折叠树。

### 🛠️ 计划修复问题 (Planned Fixes)
- [ ] **【Beautifier】** 修复小分辨率屏幕下，顶部侧边栏折叠按钮偶发被毛玻璃边框遮挡的问题。
- [ ] **【Exporter】** 修复在极少数数三账户下，极值计算子模块得分百分比显示为 NaN 的边界异常。

---

## 🎨 知能行 UI 视觉美化与考研助手 (ZhiNengX Beautifier)

### 📌 [v8.2.1] - 2026-07-25
> **本版解决的前版 (v8.2.0) 痛点与修复动机**：
> v8.2.0 在引入毛玻璃染色的同时，由于样式选择器作用域过宽，导致做题卡片与弹窗对话框（Dialogs）偶发出现非预期的红绿背景染色（染色误伤），且突破口等级进度条存在被误填充满的情况。v8.2.1 旨在精确隔离作用域，确保 100% 仅针对底栏感应，并测试 Webhook 自动推送。

#### ✨ 变更明细 (Changes)
- **Fixed**: 修复突破口等级进度条（Progress Fill）在弹窗与卡片中被背景颜色填满的问题。
- **Fixed**: 优化感应染色 Selector，防止翡翠绿/红宝石毛玻璃染色误伤题目卡片与对话框 Popups。
- **Changed**: 优化 Webhook 推送元数据以支持 GreasyFork 自动同步。

#### ⚠️ 当前版本已知 BUG & 规避方案 (Known Issues in v8.2.1)
| BUG ID | 问题描述 | 影响组件 | 严重程度 | 临时规避方案 (Workaround) | 预计修复版本 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ISSUE-B01` | 小屏幕分辨率（<1280px）下，悬浮倒计时字体可能略微拥挤 | 考研倒计时 | 低 (P2) | 在控制面板中稍微调大透明度，提高文字辨识度 | v8.3.0 |
| `ISSUE-B02` | 开启某些极端第三方 Dark Reader 自定义 CSS 时，背景透明度可能偶发偏高 | 暗色模式联动 | 低 (P2) | 建议将 Dark Reader 保持为默认“动态”模式 | v8.3.0 |

---

### 📌 [v8.2.0] - 2026-07-25
> **本版修复动机**：解决高分屏下底栏交互反馈不明显的问题，并对三段式进度条施加硬性样式防护。

#### ✨ 变更明细 (Changes)
- **Added**: 引入做对/做错动态水波纹毛玻璃感应反馈（绿宝石/红宝石特效）。
- **Fixed**: 恢复弹窗中进度条的显示填充度。

---

### 📌 [v8.1.0] - 2026-07-25
> **本版修复动机**：用户反映手动点击“下一题/提交”效率较低，且自动点击功能容易在做错时误触发。

#### ✨ 变更明细 (Changes)
- **Added**: 新增键盘 `Enter` 快捷键，可直接触发“提交答案”、“继续”及“下一题”。
- **Removed**: 移除容易造成误操作的 `autoClickNextButton` 自动点击机制。

---

### 📌 [v8.0.0] - 2026-07-25
> **本版修复动机**：里程碑重构版本，全面升级毛玻璃架构与参数调节面板。

#### ✨ 变更明细 (Changes)
- **Refactored**: 彻底重构 UI 样式层，推出全新可调悬浮参数面板。
- **Added**: 支持 6 组参数（毛玻璃透明度、模糊度、遮光倍率等）实时本地存储。

---

## 📊 知能行通用诊断报告与数据大屏导出器 (ZhiNengX Exporter)

### 📌 [v11.0.1] - 2026-07-25
> **本版解决的前版 (v10.x) 痛点与修复动机**：
> 旧版本导出器仅针对数学一考纲，导致数学二与数学三考生的考纲模块匹配错位或数据缺失。v11.0.1 彻底重构了数据过滤器，实现自动感应数一/数二/数三全模块。

#### ✨ 变更明细 (Changes)
- **Added**: 自动感应并识别数学一、数学二、数学三考纲分类。
- **Added**: ECharts 3D 能力雷达图与做题趋势全景数据大屏。
- **Added**: 一键复制纯净 Markdown 诊断报告（含 L1~L5 五级熟练度矩阵与重计算错误归因）。

#### ⚠️ 当前版本已知 BUG & 规避方案 (Known Issues in v11.0.1)
| BUG ID | 问题描述 | 影响组件 | 严重程度 | 临时规避方案 (Workaround) | 预计修复版本 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ISSUE-E01` | 在未生成任何做题数据的新注册账号上，雷达图可能呈现空白 | ECharts 大屏 | 低 (P2) | 至少完成 10 道题目练习后再点击导出诊断报告 | v11.1.0 |

---
