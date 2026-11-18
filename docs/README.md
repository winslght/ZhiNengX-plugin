# 📚 文档索引 (Docs Index)

> **定位**：`docs/` 的总入口与权威来源判定表 —— 告诉你某一主题该看哪一篇、多篇冲突时听谁的。

`docs/` 采用**扁平结构**维护，存放团队内部的研发规范、需求设计与发布记录。**文档数量与清单以本页表格为准**，不在其他文件中重复清点；新增文档请按下表归类，并在本索引登记。

---

## ⚖️ 权威来源声明 (Single Source of Truth)

同一主题存在多份描述时，按此表判定唯一权威，避免规范漂移：

| 主题 | 唯一权威文档 | 其他位置的性质 |
| :--- | :--- | :--- |
| Git 分支模型、版本号与渠道隔离 | [`GIT_FLOW_SPECIFICATION.md`](./GIT_FLOW_SPECIFICATION.md) | `AGENTS.md` §2、`.agents/skills/zhinengx-git-flow` 均为执行摘要，冲突时以此文档为准 |
| 缺陷矩阵与需求优先级 (P0~P3) | [`ROADMAP_AND_ISSUES.md`](./ROADMAP_AND_ISSUES.md) | `CHANGELOG.md` 只记录**已发布**变更，不承担待办追踪 |
| 本地调试与发版操作步骤 | [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md) | — |
| 任务分支隔离与 BUG 止损回退 | [`GIT_DEVELOPMENT_SOP.md`](./GIT_DEVELOPMENT_SOP.md) | — |
| AI Agent 执行准则与项目红线 | [`../AGENTS.md`](../AGENTS.md) | 项目最高执行准则 |

> 修改任何规范时：先改权威文档，再同步摘要，禁止反向操作。

---

## 🗂️ 文档清单

| 文档 | 类别 | 用途 | 更新时机 |
| :--- | :--- | :--- | :--- |
| [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md) | 操作 SOP | Tampermonkey `file://` 直加载实现 0 Push 秒级调试，以及规范化发版流程 | 调试机制或发版流程变更时 |
| [`GIT_DEVELOPMENT_SOP.md`](./GIT_DEVELOPMENT_SOP.md) | 操作 SOP | 任务分支隔离 (`feat/` `fix/`) 与修改产生衍生 BUG 时的止损回退判定 | 回退策略变更时 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 贡献指南 | 提交问题、准备复现、验证改动与提交 PR | 贡献流程调整时 |
| [`GIT_FLOW_SPECIFICATION.md`](./GIT_FLOW_SPECIFICATION.md) | 架构规范 | 六维分支模型、渠道隔离与版本号流转的**最高规范** | 分支模型变更时（需评审） |
| [`FEAT_COPY_PROBLEM_MARKDOWN.md`](./FEAT_COPY_PROBLEM_MARKDOWN.md) | 需求设计 | 「一键复制原排版题目 (Markdown + LaTeX)」的需求边界、DOM 靶向提取与交互设计 | 需求评审或实现方案调整时 |
| [`ROADMAP_AND_ISSUES.md`](./ROADMAP_AND_ISSUES.md) | 追踪矩阵 | 已发现 BUG 动态矩阵 + 需求规划池与回归排查顺序 | 每次发现 BUG / 完成需求时 |
| [`RELEASE_TEMPLATE.md`](./RELEASE_TEMPLATE.md) | 发布模板 | GitHub Release / GreasyFork 更新卡片的填空模版 | 发布流程变更时 |
| [`RELEASE_v8.0.0.md`](./RELEASE_v8.0.0.md) | 发布记录 | v8.0.0 Stable 首版发布说明（历史留档，勿改） | 冻结 |
| [`VERSION_HISTORY_AND_RATINGS.md`](./VERSION_HISTORY_AND_RATINGS.md) | 历史档案 | Beautifier v1.0 ~ v7.2 版本演进与用户评价汇总 | 仅在补录早期历史时 |
| [`diagnostic_report_sample.md`](./diagnostic_report_sample.md) | 输出样例 | Exporter 导出的 Markdown 报告范式（2026-07-22 采集） | 报告结构变更后重新采集 |

---

## 🧭 推荐阅读路径

- **新手接手项目**：`AGENTS.md` → `GIT_FLOW_SPECIFICATION.md` → `DEVELOPMENT_WORKFLOW.md` → `ROADMAP_AND_ISSUES.md`
- **要修一个 BUG**：`ROADMAP_AND_ISSUES.md`（确认是否已登记）→ `GIT_DEVELOPMENT_SOP.md`（分支与止损）
- **要发一个版本**：`GIT_FLOW_SPECIFICATION.md` → `RELEASE_TEMPLATE.md` → 发布后新增 `RELEASE_vX.Y.Z.md`

---

## 📌 维护约定

1. **发布说明按版本留档**：每次正式发布新增 `RELEASE_vX.Y.Z.md`，历史文件不再修改。
2. **相对链接优先**：文档内互相引用一律使用相对路径（`./X.md`、`../dir/file`），禁止写入本机绝对路径（如 `file:///c:/Users/...`），否则换机即失效。
3. **文件名大写约定**：规范与档案类文档使用 `UPPER_SNAKE_CASE.md`；仅「数据样例」类可保留小写。

### README 撰写纪律（六份 README 统一骨架）

所有 README 遵循同一骨架：`标题` → `徽章` → `> 定位一句话` → `安装与渠道` → `功能特性` → `相关文档` → `开源与反馈`。为避免每次发版都要改文档，正文**禁止**出现下列易失信息：

| 禁止 | 原因 | 正确写法 |
| :--- | :--- | :--- |
| 具体版本号（如 `8.4.0-beta.1`） | 每次发版都要同步改 | 「以脚本头部 `@version` 与 CHANGELOG 顶部为准」 |
| 会失效的量化（行数、体积百分比、代码压缩率） | 随迭代即刻失真 | 只写定性描述（如「零运行时开销」） |
| 年份（如「27 考研」） | 跨年即过期 | 「考研倒计时」 |
| 文件级目录树 | 增删文档就要改树 | 目录树只到目录层级，文件清单交给本索引 |
| 把开发/临时分支当安装渠道宣传 | 分支退役后链接失效 | 安装只列 `main`（稳定）与 `beta`（公测） |
