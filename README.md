# ZhiNengX Plugins (知能行考研插件合集)

![Version](https://img.shields.io/badge/Version-v11.0.1%20%7C%20v8.2.0--beta.1-brightgreen?style=flat-square)
![Branch](https://img.shields.io/badge/Branch-main%20%7C%20develop%20%7C%20beta-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=flat-square)
![Target](https://img.shields.io/badge/Target-Math%201%20%7C%20Math%202%20%7C%20Math%203-red?style=flat-square)

ZhiNengX Plugins 是专为 [知能行考研数学](https://www.bestzixue.com) Web 端打造的开源增强工具包。项目基于非侵入式 DOM 动态感应引擎、无感 CSS 变量渲染管道与底层 XHR/Fetch 双模数据拦截技术，提供全局毛玻璃视觉升级、高效刷题辅助功能以及考纲自适应数据诊断与 ECharts 可视化报告导出。

---

## 架构体系

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ZhiNengX Plugins Suite                               │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ ZhiNengX Beautifier                       │ ZhiNengX Exporter                          │
│ UI 视觉美化与考研助手                           │ 通用诊断报告与数据大屏导出器                      │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Glassmorphism GPU 加速渲染管道            │ • 数一 / 数二 / 数三考纲分类自适应算法          │
│ • Dark Reader 深色模式同频自适应           │ • ECharts 3D 能力雷达与每日刷题趋势大屏     │
│ • 做题状态感应与做对/做错反馈机制            │ • 7 大维度标准化 Markdown 诊断报告导出      │
│ • 键盘 Enter 快捷提交全流程代理             │ • 全链路 try-catch-finally 异常保护防线      │
│ • 精细至 1 位小数倒计时与时间管理 Widget    │ • GM_setClipboard 三级剪贴板降级机制        │
│ • Live2D 看板娘 (多 CDN 容灾 + 8s Guard)  │ • XHR / Fetch 双模网络拦截 + 主动 Fetch 补全 │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 模块安装与分支说明

### 1. 数据诊断与报告导出器 (ZhiNengX Exporter)

| 分支 (Branch) | 版本 (Version) | 定位与适用场景 | 一键安装链接 |
| :--- | :--- | :--- | :--- |
| **`main` (稳定版)** | **`v11.0.1`** | **生产稳定版**。支持数一/二/三全考纲，Markdown 报告导出与 ECharts 可视化 | [安装 Main 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js) |
| **`beta` (公测版)** | **`v11.0.1-beta.1`** | **最新公测版**。包含全链路异常保护防线与三级剪贴板降级机制 | [安装 Beta 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-exporter/zhinengx_exporter.user.js) |

### 2. UI 视觉美化与考研助手 (ZhiNengX Beautifier)

| 分支 (Branch) | 版本 (Version) | 定位与适用场景 | 一键安装链接 |
| :--- | :--- | :--- | :--- |
| **`main` (稳定版)** | **`v8.1.0`** | **生产稳定版**。无感 CSS 变量渲染，零运行开销，纯净毛玻璃 | [安装 Main 稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **`beta` (公测版)** | **`v8.2.0-beta.1`** | **最新公测版**。含做对/做错水波纹、Live2D 多 CDN 容灾与 1 位小数倒计时 | [安装 Beta 公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| **`dev-panel` (调参版)**| **`v7.4.1`** | **开发者调参版**。内置 GUI 控制面板，支持实时调节透明度与模糊度 | [安装 Dev-Panel 调参版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/dev-panel/zhinengx-beautifier/zhinengx_beautifier.user.js) |

---

## 核心功能与技术实现明细

### 1. ZhiNengX Beautifier (UI 视觉美化与考研助手)

#### 1.1 Glassmorphism 视觉渲染管道
- **底层架构**：采用 CSS 自定义变量 (`--znx-glass-rgb` 与 `--znx-tab-text`) 配合 GPU 硬件加速图层 (`transform: translateZ(0)`, `will-change: backdrop-filter`)。
- **DOM 覆盖范围**：非侵入式针对顶部导航栏 (`MuiAppBar`)、功能卡片 (`MuiPaper`)、做题对话框 (`MuiDialog`) 及动态 JSS 样式类 (`jss*`, `_*`) 覆盖高斯模糊（5px ~ 20px）与毛玻璃半透明效果。
- **智能圆角与背景区分**：识别行内白色背景与头部工具栏，给予差异化的圆角矩形与透明度配置。

#### 1.2 Dark Reader 深色模式同频自适应
- **状态监听**：通过 `MutationObserver` 监听 `document.documentElement` 的 `data-darkreader-scheme` 及 `class` 属性变更。
- **调色盘切换**：动态在亮色环境 (`rgba(255,255,255,0.35)`) 与暗色黑曜石环境 (`rgba(20,22,28,0.35)`) 之间切换，同步微调壁纸遮光罩 (`#znx-anime-overlay`) 的透明度。

#### 1.3 做题状态感应与视觉/音效反馈
- **模式判定**：智能捕获页面 DOM 变动与语义文本，识别做题模式并在 `<html>` 挂载 `znx-doing-questions` 类名，自动淡隐无关导航元素。
- **正确反馈**：感应 `FootcontentYes` 或“答案正确”状态，触发翡翠绿毛玻璃水波纹 (`rgba(34, 197, 94, 0.4)`)、Web Audio API 合成成功音效与 `canvas-confetti` 粒子彩带撒花。
- **错误警示**：优先判定“答案错误”、“超时”、“再试一次”及“做不出来”，施加红宝石毛玻璃警示 (`rgba(239, 68, 68, 0.4)`).
- **纯代码音频合成**：基于 Web Audio API 振荡器 (`OscillatorNode`) 纯代码合成点击与成功音效，无外部音频依赖。

#### 1.4 回车快捷提交全流程代理
- **键盘事件代理**：监听 `Enter` 按键，填完答案后自动代理触发“提交答案”、“继续”、“下一步”、“再试一次”及“查看题解”。
- **输入法防误触发**：内置 `isComposing` 与 `keyCode === 229` 状态检查，避免中文输入法选词回车时引发误操作。

#### 1.5 考研倒计时与时间管理 Widget
- **悬浮组件**：右侧注入毛玻璃挂件，实时计算距离考研目标日期的倒计时天数。
- **三段式精细进度条**：
  - 今日剩余：`时:分:秒` 实时倒计时与动态进度条。
  - 本周剩余：精确至 1 位小数的动态天数（包含当日剩余时间比例，消除周日显示 `0 天` 的体验断层）。
  - 本月剩余：结合当月实际总天数计算的 1 位小数动态天数。

#### 1.6 Live2D 看板娘与高可用容灾Guard
- **组件集成**：集成 Live2D 看板娘模型与 Font Awesome 矢量图标库。
- **多 CDN 容灾轮询**：预置 Fastly jsDelivr、Primary jsDelivr 及 TestingCF jsDelivr 3 组 CDN 镜像源。
- **自动降级与 DOM 健康检测**：挂载 `script.onerror` 事件清理失败节点并轮换 CDN；内置 8 秒 DOM 健康检测 Guard 与指数退避重试队列。

#### 1.7 DEV 本地碎版本追溯水印
- **版本标识**：调试模式或预发布版本下，屏幕底栏正中显示调试胶囊水印（如 `v8.2.0-beta.1`），支持点击一键复制版本号至剪贴板。

---

### 2. ZhiNengX Exporter (诊断报告与数据大屏导出器)

#### 2.1 考纲自适应与数据过滤器
- **科目识别**：自动解析学员 Profile 数据中的 `examType`（1: 数一, 2: 数二, 3: 数三）。
- **动态黑名单过滤**：数学二自动过滤曲线/曲面积分、级数、傅里叶、经济应用与概率论；数学三自动过滤曲线/曲面积分与傅里叶级数。

#### 2.2 双模接口数据拦截与主动 Fetch 补全
- **网络拦截器**：重写 `XMLHttpRequest.prototype.open` / `send`（绑定 `responseURL`）与 `unsafeWindow.fetch`，捕获后端返回的 `getUserProfileDiagramLast` 及 `getUserProfile` 数据。
- **主动拉取机制**：内置 Candidate API 接口列表，在拦截错过时支持点击主动补全 Fetch 请求。

#### 2.3 标准化 Markdown 诊断报告导出
- **7 大维度导出**：
  1. 考生档案与学习概况 (含小黄点优先消灭章节警示)
  2. 核心章节熟练度五级分布矩阵 (Level 1 ~ Level 5，包含综合与抗生锈熟练度)
  3. 知识点三维能力拆解 (概念掌握 / 简单应用 / 综合技巧)
  4. 重计算题硬核能力明细 (接触数 / 独立做对率 / 二次修正数)
  5. 近期每日刷题与测试正确率明细
  6. 做错原因归因与诊断 (粗心过快 / Tutor 辅导通过率)
  7. 近期进步提升轨迹排行 (本周 / 上周)

#### 2.4 ECharts 3D 可视化诊断大屏
- **模态框渲染**：注入原生 Modal GUI，动态加载 ECharts 引擎。
- **图表绘制**：生成知识点三维能力雷达图与近期每日测验正确率/做题量混合趋势柱状图。

#### 2.5 全链路 try-catch-finally 防线与三级剪贴板降级
- **异常防护**：全函数包裹 `try-catch-finally`，确保出现未捕获错误时按钮文案恢复，不卡死在“生成中...”。
- **三级剪贴板降级**：`GM_setClipboard` 油猴特权 API -> `navigator.clipboard.writeText` 原生 API -> 原生 `prompt()` 复制框兜底。

---

## 研发 SOP 与工程规范

本项目建立了完善的开发与版本控制规范：

- 📝 **[更新日志 (CHANGELOG.md)](CHANGELOG.md)**：全量演进历史与版本变更履历。
- ⚡ **[0 Push 秒级调试指南 (DEVELOPMENT_WORKFLOW.md)](docs/DEVELOPMENT_WORKFLOW.md)**：基于油猴 `file://` 直加载存根的本地调试与发版 SOP。
- 🛡️ **[Git Task 分支隔离规范 (GIT_DEVELOPMENT_SOP.md)](docs/GIT_DEVELOPMENT_SOP.md)**：任务分支隔离与止损回退决策 SOP。
- 🐞 **[缺陷矩阵与 Roadmap (ROADMAP_AND_ISSUES.md)](docs/ROADMAP_AND_ISSUES.md)**：已知问题表与需求规划。

---

## 项目结构

```text
ZhiNengX/
├── CHANGELOG.md                        # 全量更新日志与版本履历
├── README.md                           # 仓库主说明文档
├── LICENSE                             # MIT 开源许可证
├── icon.png                            # 项目图标
│
├── zhinengx-beautifier/                # UI 视觉美化与考研助手
│   ├── zhinengx_beautifier.user.js     # 核心源码
│   └── README.md                       # 模块说明
│
├── zhinengx-exporter/                  # 诊断报告与数据大屏导出器
│   ├── zhinengx_exporter.user.js       # 核心源码
│   └── README.md                       # 模块说明
│
├── docs/                               # 研发 SOP 与工程规范
│   ├── DEVELOPMENT_WORKFLOW.md        # 0 Push 秒级调试与发版 SOP
│   ├── GIT_DEVELOPMENT_SOP.md         # Task 分支隔离与止损回退 SOP
│   ├── ROADMAP_AND_ISSUES.md          # 已知 BUG 矩阵与需求池
│   ├── RELEASE_TEMPLATE.md            # 发版日志模版
│   └── version_history_and_ratings.md # 历史评分记录
│
├── archive/                            # 历史版本归档备份
│   ├── beautifier/
│   └── exporter/
│
└── dev_resources/                      # 本地开发调试资源 (Git Ignored)
    ├── zhinengx_beautifier.dev.user.js # 美化助手 file:// 直加载调试存根
    └── zhinengx_exporter.dev.user.js   # 导出器 file:// 直加载调试存根
```

---

## 版权与开源协议

本项目遵循 [MIT License](LICENSE) 开源协议。

- **作者 (Author)**: [winslght](https://github.com/winslght)
- **许可说明**: 任何个人或组织在 Fork、修改或衍生本项目时，须在代码文件及文档中保留原作者 `winslght` 的署名与版权声明。

```text
Copyright (c) 2026 winslght
Licensed under the MIT License.
```
