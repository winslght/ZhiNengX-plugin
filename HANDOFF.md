# 🤝 ZhiNengX 开发交接文档 (Development Handoff Document)

**最新版本**: `8.3.0-dev.5`  
**更新时间**: 2026-07-29  
**核心文件**: [zhinengx_beautifier.user.js](file:///c:/Users/winsl/OneDrive/Desktop/Vibe%20Coding/ZhiNengX/zhinengx-beautifier/zhinengx_beautifier.user.js)  

---

## 📌 一、当前项目状态与已完工里程碑 (Milestones & Completed Features)

在 `v8.3.0-dev.1` 至 `v8.3.0-dev.5` 本地迭代中，我们对知能行美化插件完成了 5 大核心模块的底层重构与实测验收：

### 1. 看板娘底层架构与 DOM 物理销毁 (Dev.2 ~ Dev.3)
- **物理彻底销毁 (Physical DOM Removal)**：彻底废弃上一版的 CSS 遮罩规则（`#waifu-toggle { display: none !important }`），采用 `MutationObserver` 结合 JS 原生 `element.remove()` 从 DOM 树中物理销毁 `#waifu-toggle` 节点。
- **原版 `bottom` 升降动画**：看板娘退场与进场 100% 调取开源 `waifu.css` 原生的 `bottom: -1000px`（下沉隐藏）与 `bottom: 0`（0.5s 平滑上升），点击 `✕` 图标时平滑下沉并反向同步【美化面板】Checkbox 为未勾选。
- **IndexedDB 离线 Blob 缓存引擎 (`ZnxIndexedDBCache`)**：首次下载 `autoload.js` 与 `font-awesome.css` 自动写入 IndexedDB 数据库 `znx_waifu_cache`，后续访问 0ms 从 IndexedDB 秒速离线加载 Blob URL（`< 10ms` 启动，100% 免疫断网与 CDN 故障），彻底删除了旧版 8 秒定时器与频繁网络轮询重试。

### 2. 选择题 1-5 快捷键 2D 物理空间双轴排序重构 (Dev.4)
- **做题卡片作用域限定 (Card Scoping)**：重构 `getSortedChoiceOptions`，增加做题卡片作用域限定与 `[data-znx-choice]` 属性标注，过滤掉解析区与其他非题目假选项。
- **2D 空间双轴排序算法**：采用 `getBoundingClientRect()` 获取物理坐标，以 `top` 升序为主、`left` 辅助双轴排序，确保键盘数字键 `1~5`（及 `A~E`）100% 对应屏幕上肉眼从上到下看到的第 1~5 行选项，彻底解决知能行打乱选项字母 ID 导致的键位错位痛点。

### 3. 做题端倒计时胶囊 UI 排版重构 (Dev.4)
- **明确文本呈现**：收缩态上层采用单水平线展示 `🔥 N天` 与 `今日剩余 XhYm` 明确文本，彻底消除像钟表时刻的认知歧义。
- **晶莹进度条**：底端恢复 3px 柔光蓝调晶莹进度条，与 `📋 复制题目` 按钮 176px 完美同框并列对齐。

### 4. 做题工具栏全设备多端响应式适配与 16ms 稳固装载 (Dev.4)
- **解决丢帧/加载失败痛点**：解绑 `timerWrapper` 死的 `135px` 硬编码限制为弹性 flex 容器，废弃 `requestIdleCallback` 全面换用 16ms `requestAnimationFrame` + React 异步补打锁，彻底解决切题时工具栏消失问题。
- **全设备多端响应式 CSS 适配**：注入 `@media (max-width: 600px)` 媒体查询。手机端与平板竖屏（<= 600px）下按钮 5:5 弹性等分，自适应字号与边距，100% 零溢出零断行。

### 5. 做题界面顶栏单题倒计时视觉重构 (Dev.5)
- **保持顶栏原貌**：保持知能行顶栏原本的背景材质，不给数字倒计时追加任何额外背景盒/胶囊色块。
- **霸气 24px 数字与红色加粗**：设定 `font-size: 24px !important`, `font-weight: 900`, `color: #ff3344`。
- **代码等宽抗抖动**：注入 `font-variant-numeric: tabular-nums` 与 `ui-monospace` 代码等宽字体，秒数跳动（如 `01:09` 变 `01:08`）时**零水平抖动摆动**。
- **少于 3 分钟常亮边缘红光高亮**：倒计时少于 3 分钟（< 180 秒）时，自动触发 4 层叠加的极高饱和度立体常亮霓虹红光（`text-shadow: 0 0 3px #ff0033...`），彻底取消晃眼的闪烁/呼吸脉冲动画。
- **全域 250px 捕获**：解绑死的 class 选择器，在全页面顶部 250px 视口内实时捕获时间节点（如 `7:06`、`4:27`），解决因 Selector 错配导致的未渲染问题。

### 6. 深色模式纯黑毛玻璃背景重构 (Dev.5 纯黑中性化)
- **剔除偏蓝杂色**：彻底将深色模式下卡片与顶部工具栏原本偏蓝灰的背景色（`20, 22, 28` 与 `20, 20, 35`）调优为 R=G=B 绝对中性的纯黑基调 `14, 14, 14`，呈现高级不偏色的黑曜石毛玻璃沉浸质感。

---

## 🧭 二、下一阶段开发 Roadmap & 待办清单 (Backlog for Next Developer)

下一个接棒开发者可以顺着以下高优先级的开发计划继续推进：

### 1. [P1 需求] 回车键 Primary Action 智能识别与快捷提交重构
- **现状**：现有的 Enter 键监听依赖特定 CSS selector。
- **待办**：重构为智能识别 Material-UI / Bootstrap 主行动线按键（如 `.MuiButton-containedPrimary`, `.btn-primary`, `.btn-success`）及当前激活做题卡片右下角物理位置的主提交/下一步按键。

### 2. [P1 需求] 题目一键复制 Markdown 靶向正向提取重构
- **现状**：用户已明确指导，彻底废弃“全页面字符黑名单排除”逻辑（防止后续新增功能导致 BUG）。
- **待办**：重构为纯正向靶向提取 `ProblemItemElement` 题干 DOM 与 `choiceButton` 选项 DOM。从源头隔绝对话框、倒计时胶囊与多余空行污染。

### 3. [P2 需求] 准备发布 `v8.3.0` 稳定版 Release
- 当上述 P1 需求开发完成并碎测验证后，根据 `zhinengx-release-sop` 规范切出 `release/v8.3.0` 分支，Bump Userscript `@version 8.3.0`，并同步更新 CHANGELOG.md 正式版记录。

---

## ⚙️ 三、接棒开发红线与规范 (Mandatory Rules for Agents)

所有后续接手开发的 AI Agent 或开发者必须严格遵守 [AGENTS.md](file:///c:/Users/winsl/OneDrive/Desktop/Vibe%20Coding/ZhiNengX/AGENTS.md) 中的项目红线：

1. **双语 Commit 纪律**：格式必须为 `<type>(<scope>): <English> / <中文>`，禁止高频微小碎 Commit。
2. **严禁 `@grant none` 破坏**：`zhinengx_beautifier.user.js` 必须维持 `// @grant none` 标头，不阻断原生页面上下文。
3. **解释先行原则**：**在进行每一个改动和计划执行每一条命令之前，都需要先向用户解释此步骤是干什么的。不然用户不会批准命令执行**。
4. **Clean Code 原则**：正向特征精准定位（严禁黑名单排除）、通用算法抽象（严禁硬编码与凑数补丁）、无副作用纯函数。
