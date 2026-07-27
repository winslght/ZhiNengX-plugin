# 🏛️ ZhiNengX Git Flow 六维分支模型架构规范

本文档为 ZhiNengX 项目的 Git 研发分支管理与版本流转最高规范。针对项目多用户层级（正式版用户与 Beta 尝鲜用户）需求，采用**六维分支架构**进行严格隔离与递进交付。

---

## 🌿 1. 六维分支定义与生命周期矩阵

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ZhiNengX 六维生产线递进流转图解                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. main       ───────► (v8.1.0 正式版) ──────────────► (v8.2.0 正式版) ──  │
│                             ▲                             ▲                 │
│                             │ (hotfix/fix)                │ (release 封版)   │
│  2. release    ─────────────┼─────────────────────────────┴───────────────  │
│                             │                               ▲               │
│  3. beta       ─────────────┼───────────────────────────────┴ (公测验证) ───  │
│                             │                               ▲               │
│  4. dev/develop ────┬───────┼───────────────────────────────┤ (集成分支) ───  │
│                     │       │ (紧急修复)                     ▲               │
│                     ▼       ▼                               │ (特性合入)     │
│  5. feature    ─────┴───────┴───────────────────────────────┘               │
│  6. fix/hotfix                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| 分支层级 | 分支名称/前缀 | 起始父分支 | 最终合并目标 | 常驻/临时 | 核心职责与原则 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 正式生产** | `main` | - | - | 🔒 **常驻** | 线上正式用户稳定版本基线。任何 Commit 必须可直接面向全体用户上线。**严禁直接 Commit**。 |
| **2. 发布门禁** | `release/*` | `beta` / `develop` | `main` & `develop` | ⏳ **临时** | 🛡️ **正式发版最高门禁**。仅在体验完毕准备发布正式版时拉出（如 `release/v8.2.0`），锁定版本号与 CHANGELOG。 |
| **3. 体验测试** | `beta` | `develop` | `release/*` | 🔒 **常驻** | 预发布/公测用户体验分支。发布 Beta 尝鲜脚本（如 `@version X.Y.Z-beta`），供深度用户体验验证。 |
| **4. 研发主干** | `dev` (`develop`)| `main` | `beta` | 🔒 **常驻** | 研发日常集成分支。所有完成开发测试的 Feature/Fix 回归主线。 |
| **5. 特性开发** | `feature/*` / `feat/*`| `dev` | `dev` | ⏳ **临时** | 独立新功能开发分支（如 `feat/keyboard-shortcuts`）。开发测试完毕合回 `dev` 并销毁。 |
| **6. BUG修复** | `fix/*` / `hotfix/*` | `main` / `dev` | `main` / `dev` | ⏳ **临时** | 缺陷修补分支（线上大火从 `main` 拉 `hotfix`；日常 Bug 从 `dev` 拉 `fix`）。 |

---

## ⛔ 2. 分支合并门禁与严格防污染纪律

> [!CAUTION]
> **六维分支递进门禁纪律**
> 1. **逐层递进，严禁跨级跳合**：代码流转须遵循 `feature/fix` ➔ `dev` ➔ `beta` ➔ `release/*` ➔ `main` 的单向递进链条。严禁未经 `dev` 和 `beta` 验证的代码直接强合入 `release` 或 `main`。
> 2. **`release/*` 零杂质原则**：`release/*` 封版分支仅用于正式发版前的版本号标记、CHANGELOG 整理与终极微调，严禁塞入任何新的未经测试的实验代码。
> 3. **`beta` 尝鲜通道职责**：`beta` 分支保持与 Beta 油猴脚本更新同步，使用户能在正式版发布前提前体验新特性并反馈 Bug。

---

## 📌 3. 版本号管理与修改准则

1. **语义化版本号格式**：
   - **正式版 (`main`)**：`v8.2.0` (Major.Minor.Patch)
   - **测试体验版 (`beta`)**：`v8.2.0-beta.1`
   - **紧急修复 (`hotfix`)**：`v8.1.1`

2. **修改权限锁定**：
   - ❌ **`dev` / `feature/*`**：编码时**严禁修改** `@version`。
   - ✅ **`beta`**：推送体验测试时修改为 `-beta` 版本号。
   - ✅ **`release/*`**：正式封版时统一固化为正式版本号（如 `8.2.0`）并记录 `CHANGELOG.md`。

---

## 💬 5. 提交信息规范与中英文双语纪律 (Commit Message Guidelines)

> [!IMPORTANT]
> **【强制】中英文双语 Commit 提交纪律 (Bilingual Commit Rule)**
> 项目所有分支（包括 `feat` / `fix` / `develop` / `beta` / `main`）的每次提交（Commit），必须严格包含**中英文双语提交信息**，以确保国际化团队与本土研发的清晰协作。
> 
> **标准格式 (Standard Format):**
> `<type>(<scope>): <English Description> / <中文说明>`
> 
> **标准示例 (Examples):**
> - `feat(shortcuts): add choice keys 1-5 support / 合并选择题 1-5 快捷键功能`
> - `fix(beautifier): resolve ReferenceError in DOM handler / 修复快捷键处理逻辑中的未定义变量与语法错误`
> - `merge: release v8.2.0-beta.2 - integrate shortcuts / 合并发布 v8.2.0-beta.2 - 集成快捷键功能与稳定性修复`
> - `docs(spec): add bilingual commit message specification / 添加中英文双语 Commit 提交信息规范`

---

## 🚀 4. 标准六维流转操作示例 (SOP)

### 4.1 开发与集成分程 (`feature` ➔ `dev`)
```bash
git checkout develop
git checkout -b feat/my-feature
# 开发完成后
git checkout develop
git merge feat/my-feature
git branch -d feat/my-feature
```

### 4.2 体验版测试 (`dev` ➔ `beta`)
```bash
git checkout beta
git merge develop
# 修改 @version 为 X.Y.Z-beta 并推送到 beta 通道
```

### 4.3 正式封版发布 (`beta` ➔ `release` ➔ `main`)
```bash
git checkout beta
git checkout -b release/v8.2.0
# 修改版本号为 8.2.0 正式版，更新 CHANGELOG.md
git checkout main
git merge release/v8.2.0
git tag -a v8.2.0 -m "release: v8.2.0"
git checkout develop
git merge release/v8.2.0
git branch -d release/v8.2.0
```

### 4.4 线上急救 (`main` ➔ `fix` ➔ `main` & `dev`)
```bash
git checkout main
git checkout -b fix/urgent-bug
# 修复后
git checkout main
git merge fix/urgent-bug
git tag -a v8.1.1 -m "hotfix: v8.1.1"
git checkout develop
git merge fix/urgent-bug
git branch -d fix/urgent-bug
```
