# ZhiNengX Project Rules & Agent Guidelines

Welcome to the **ZhiNengX** workspace! This project consists of browser enhancement plugins for the ZhiNengX考研数学 platform (*ZhiNengX Exporter* & *ZhiNengX Beautifier*).

All AI agents working on this project MUST strictly follow the repository rules and development SOPs outlined below.

---

## 💬 1. Mandatory Bilingual Commit Rule (中英文双语 Commit 纪律)

All git commits MUST strictly follow the **Bilingual Commit Format**:
`<type>(<scope>): <English Description> / <中文说明>`

### Examples:
- `feat(shortcuts): add choice keys 1-5 support / 合并选择题 1-5 快捷键功能`
- `fix(beautifier): resolve ReferenceError in DOM handler / 修复快捷键处理逻辑中的未定义变量与语法错误`
- `docs(spec): update development workflow SOP / 更新本地开发调试 SOP`
- `chore(release): bump version to 8.2.0 / 发布 v8.2.0 版本`

### 1.1 Low-Frequency Batch Commit Rule (禁止高频微小 Commit / 阶段性合并提交纪律)
- **NO Micro/Fragmented Commits (严禁碎片化频繁提交)**: 严禁针对单条文档更新、单行文本微调或临时对话点频繁执行 `git commit`。
- **Batch & Consolidate (阶段性合并提交)**: 必须将同一阶段或里程碑的相关改动（如需求录入、多处代码优化、文档调整）在阶段完成时**合并整合为单次有价值的完整 Commit**。

---

## 🌿 2. Git Branching & Protection Redlines (分支模型与防护红线)

1. **`main` Branch**: Production branch for stable releases. **NEVER commit directly to `main`**. All changes to `main` must arrive via `release/*` or `hotfix/*` branches.
2. **`develop` Branch**: Main development branch. Day-to-day feature merges happen here.
3. **`beta` Branch**: Public beta testing branch for pre-release validation.
4. **Task Branches**: Always create isolated task branches from `develop`:
   - Feature branches: `feat/<feature-name>`
   - Bug fix branches: `fix/<bug-name>`
   - Release branches: `release/vX.Y.Z`
   - Hotfix branches: `hotfix/vX.Y.Z`

---

## 📌 3. Version Bumping Rules (版本号规则)

- **Do NOT bump Userscript `@version` headers on `develop` or task branches**.
- Only update `@version` headers in Userscript files and `CHANGELOG.md` when preparing a release on a `release/*` or `hotfix/*` branch.
- Version string format:
  - Production (`main`): `X.Y.Z`
  - Public Beta (`beta`): `X.Y.Z-beta.N`
  - Development (`develop`): `X.Y.Z-dev.N`

---

## ⚡ 4. Sandbox Security & API Restrictions (`@grant none`)

- `zhinengx_beautifier.user.js` MUST maintain `// @grant none` configuration to prevent Tampermonkey sandbox isolation from breaking global page features (`AudioContext`, `window.confetti`, etc.).
- Clipboard operations MUST use the **3-Tier Fallback Engine**:
  1. `navigator.clipboard.writeText(text)`
  2. Hidden `<textarea>` + `document.execCommand('copy')` fallback
  3. Glassmorphism Modal fallback for manual copying

---

## 🧠 5. Clean Architecture & High-Cohesion Low-Coupling Principles (高内聚低耦合与 Clean Code 原则)

To prevent monolithic/spaghetti code ("屎山代码") and breaking unexpected global regressions ("牵一发而动全身"), all code written for ZhiNengX MUST strictly follow these 6 Clean Code principles:

1. **High Cohesion & Low Coupling (高内聚、低耦合)**: Modules must be tightly focused on their inner domain while staying decoupled from external modules. Modifying feature A must NEVER break feature B.
2. **Single Responsibility Principle (单一职责原则 / SRP)**: One module/function only does ONE thing well. Separate DOM extraction, CSS injection, state management, event listening, and API fallback into decoupled helper functions.
3. **Depend on Abstractions, Not Implementations (依赖抽象与接口，而不是具体实现 / DIP)**: Define uniform interfaces (e.g., standard adapter functions for DOM containers, fallback clipboard contracts) rather than coupling directly to volatile page structures.
4. **Composition Over Inheritance (少用继承，多用组合)**: Prefer small, composable utility functions and component factories over heavy OOP classes or prototype inheritance chains.
5. **Incremental Feature Addition & Per-Step Verification (渐进式增量开发与每步验证)**: Implement features step-by-step in small, verifiable increments. Validate each increment thoroughly before proceeding to the next.
6. **Minimize Global State, Favor Pure Functions (少写全局状态，多写无副作用纯函数)**: Minimize global mutable variables. Data parsing, TeX extraction, and Markdown formatting MUST be written as deterministic pure functions (inputs ➔ outputs without side-effects).

---

## 🤖 6. Codex Agent Operational Guidelines (Codex Agent 规范与高效协作原则)

All agents executing tasks in this codebase MUST incorporate the following operational guidelines adapted from Codex CLI:

### 6.1 Personality & Responsiveness (表达风格与 Preamble 响应)
- **Concise & Direct**: Keep responses concise, factual, and direct. Avoid unnecessary filler or verbose commentary.
- **Preamble Updates**: Before taking grouped tool calls or major code edits, provide a brief 1-2 sentence preamble (8-12 words) informing the user of the immediate next step.
- **Light & Collaborative**: Maintain a friendly, light, and collaborative tone.

### 6.2 Surgical Precision & Root Cause Remediation (外科手术式精准度与根因修复)
- **Surgical Precision**: When operating in existing code, make minimal, surgical changes that strictly fulfill requirements. Do not rename variables, alter unrelated formatting, or modify out-of-scope files.
- **Root Cause Remediation**: Fix issues at their root cause rather than applying superficial symptom patches or swallowing exceptions.
- **Strict Scope Discipline**: Do not fix unrelated broken tests or out-of-scope code. Focus only on the task at hand.

### 6.3 Task Planning & Step-by-Step Execution (计划驱动与逐步验证)
- **High-Quality Plans**: For complex tasks, define a concise step-by-step plan (1-sentence per step).
- **Progress Tracking**: Mark steps as `in_progress` or `completed` as execution advances. Ensure prior steps are validated before proceeding.

### 6.4 File References & Code Handoff (代码引用与结果呈现)
- **Standard File Path References**: Reference files using standard inline code backticks with line numbers (e.g., `zhinengx-beautifier/zhinengx_beautifier.user.js:42` or `zhinengx-exporter/zhinengx_exporter.user.js#L105`).
- **No Citation Brackets**: NEVER output citation brackets like `【F:...】`.
- **Concise Handoff**: Do not dump large file contents in final responses. Summarize substantive changes concisely and highlight tangible next steps.

---

## 📚 Project Skills Reference

The workspace includes specialized Antigravity Skills in `.agents/skills/`:
- [`zhinengx-git-flow`](file:///.agents/skills/zhinengx-git-flow/SKILL.md) — 6-Dimensional Git flow model & merge SOPs
- [`zhinengx-dev-debug-sop`](file:///.agents/skills/zhinengx-dev-debug-sop/SKILL.md) — `file://` local zero-push debugging & bug isolation
- [`zhinengx-release-sop`](file:///.agents/skills/zhinengx-release-sop/SKILL.md) — Release SOP, version bumping, and tag management
- [`zhinengx-architecture-spec`](file:///.agents/skills/zhinengx-architecture-spec/SKILL.md) — Plugin architecture, DOM parsing, LaTeX extraction, CSS glassmorphism, Clean Code principles
- [`zhinengx-roadmap-and-issues`](file:///.agents/skills/zhinengx-roadmap-and-issues/SKILL.md) — Active known issues matrix & feature backlog roadmap
- [`zhinengx-adversarial-dev-sop`](file:///.agents/skills/zhinengx-adversarial-dev-sop/SKILL.md) — Multi-agent adversarial development workflow (A/B/C role model)
