# ZhiNengX Plugins

![Author](https://img.shields.io/badge/Author-winslght-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=flat-square)
![Target](https://img.shields.io/badge/Target-Math%201%20%7C%202%20%7C%203-red?style=flat-square)

> **定位**：为 [知能行考研数学](https://www.bestzixue.com) 打造的开源浏览器增强工具包，通过非侵入式 DOM 渲染与数据结构解析，提升网页视觉体验与数据诊断能力。

项目包含两个**可独立安装、互不依赖**的油猴脚本：

| 模块 | 一句话作用 | 入口 |
| :--- | :--- | :--- |
| 🎨 **Beautifier** | 毛玻璃视觉升级、深色模式同频、键盘快捷操作与 Live2D 看板娘 | [模块说明](zhinengx-beautifier/README.md) |
| 📊 **Exporter** | 考纲自适应做题数据导出、Markdown 诊断报告与 ECharts 可视化大屏 | [模块说明](zhinengx-exporter/README.md) |

---

## 📦 安装与渠道

先安装 [Tampermonkey](https://www.tampermonkey.net/)（Violentmonkey 亦可），再按需点击下表链接：

| 模块 | 稳定版 (`main`) | 公测版 (`beta`) |
| :--- | :--- | :--- |
| 🎨 Beautifier | [安装稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-beautifier/zhinengx_beautifier.user.js) | [安装公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-beautifier/zhinengx_beautifier.user.js) |
| 📊 Exporter | [安装稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js) | [安装公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-exporter/zhinengx_exporter.user.js) |

- **稳定版**：只收已验收的修复与功能，追求零意外。
- **公测版**：提前体验新功能，可能包含尚未实机回归的改动。
- **当前版本号以脚本头部 `@version` 与 [CHANGELOG](CHANGELOG.md) 顶部条目为准**——本页不硬编码版本，避免文档滞后于代码。
- 同一模块**请只启用一个渠道**，两个版本会重复注入界面。
- 开发者调参版（实时调节毛玻璃透明度/模糊度）不属于长期渠道，需要时从 `archive-dev-panel` 分支自取，不保证与主线同步维护。

---

## ✨ 功能概览

完整特性、交互细节与已知限制见各模块 README，此处只列主干能力。

**🎨 Beautifier** — 详见 [模块说明](zhinengx-beautifier/README.md)

- 全局 iOS/macOS 毛玻璃材质、做对/做错动态反馈底栏、Dark Reader 深色自适应。
- 键盘效率：数字键按**视觉顺序**选择选项、`Enter` 提交与继续、中文输入法防误触。
- 备考陪伴：考研倒计时悬浮窗、Live2D 看板娘、ACG 壁纸与做对撒花激励。

**📊 Exporter** — 详见 [模块说明](zhinengx-exporter/README.md)

- 自动识别数一/数二/数三考纲，并过滤非考纲章节。
- 深度拦截平台 API，一键导出 Markdown 诊断报告（档案 / 熟练度 / 三维能力 / 重计算 / 错因）。
- 一键导出可离线打开、自包含的 ECharts 全景数据大屏。

---

## 🌿 分支与发布节奏

| 分支 | 用途 | 是否对外提供安装链接 |
| :--- | :--- | :--- |
| `main` | 稳定发行版 | ✅ 稳定版渠道 |
| `beta` | 公测预发布 | ✅ 公测版渠道 |
| `develop` | 日常集成的开发主线 | ❌ 不对外 |
| `release/*`、`hotfix/*`、`feat/*`、`fix/*` | 封版与任务分支 | ❌ 不对外 |

分支模型、版本号规则与双语 Commit 纪律见 [Git Flow 规范](docs/GIT_FLOW_SPECIFICATION.md)。

---

## 📚 相关文档

全部文档的索引、权威来源声明与推荐阅读路径见 **[📚 docs/README.md](docs/README.md)**，常用入口：

- 📝 [CHANGELOG.md](CHANGELOG.md) — 版本变更履历（**版本号的唯一出处**）
- 🏛️ [GIT_FLOW_SPECIFICATION.md](docs/GIT_FLOW_SPECIFICATION.md) — 六维分支模型（**Git 规则唯一权威**）
- 🐞 [ROADMAP_AND_ISSUES.md](docs/ROADMAP_AND_ISSUES.md) — 缺陷矩阵与需求优先级（**唯一权威**）
- ⚡ [DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) — 本地 0 Push 调试与发版 SOP
- 🗃️ [archive/README.md](archive/README.md) — 历史版本快照索引与归档去向
- 🧪 [dev_resources/README.md](dev_resources/README.md) — 调试存根与回归夹具用法

---

## 📂 项目结构

```text
ZhiNengX/
├── zhinengx-beautifier/    # 🎨 美化插件源码与模块说明
├── zhinengx-exporter/      # 📊 导出插件源码与模块说明
├── docs/                   # 研发规范、需求设计、发布记录（索引见 docs/README.md）
├── archive/                # 历史版本快照与第三方原型归档（索引见 archive/README.md）
├── dev_resources/          # 本地调试存根、回归夹具与验收截图
├── AGENTS.md               # AI Agent 执行准则与项目红线
├── CHANGELOG.md            # 版本变更履历
├── icon.png                # 仓库图标（安装链接硬依赖，勿改名勿移动）
└── LICENSE                 # MIT 开源许可证
```

> ⚠️ `zhinengx-beautifier/`、`zhinengx-exporter/` 的目录名、其中的 `*.user.js` 文件名，以及根目录 `icon.png`，都是**安装链接硬依赖**（`raw.githubusercontent.com` 路径）。重命名会直接导致所有用户的一键安装失效。

---

## 📜 开源协议

[MIT License](LICENSE) · Copyright (c) 2026 winslght

*祝所有考研学子数学高分过关，顺利上岸！*
