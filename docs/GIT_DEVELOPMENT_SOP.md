# 🛡️ Git Task 分支隔离与 BUG 止损回退 SOP

本文档规定了在编写新功能与修复 BUG 时的分支隔离规范，以及当修改产生衍生物 BUG 时的止损与回退标准。

---

## 🌿 1. Task 任务分支隔离规范

不要直接在 `develop` 或 `main` 分支上进行破坏性实验。每次开发新功能或修复复杂 BUG 时，从 `develop` 分支拉出临时任务分支：

```bash
git checkout develop
git checkout -b fix/stain-scope    # 修复类任务分支命名: fix/xxxx
# 或
git checkout -b feat/theme-presets  # 特性类任务分支命名: feat/xxxx
```

---

## 🎯 2. BUG 止损与回退决策矩阵

当在任务分支上修改代码引发了新 BUG 时，按以下流程评估与处置：

```text
                               修 BUG 产生新 BUG
                                      │
                         分析新 BUG 的根源与影响范围
                                      │
             ┌────────────────────────┴────────────────────────┐
   思路方向正确 & 仅为局部小缝补                    设计方向错误 & 引发全局结构崩溃
             │                                                 │
   【继续修 (Fix Forward)】                             【切断止损 (Revert / Abandon)】
 编写原子化 Commit 修复新问题                     方案 A: 单 Commit 回退 (git revert)
 例如: fix: resolve popup z-index               方案 B: 放弃整个 Task 分支 (git branch -D)
```

### 选项 A：继续修复 (Fix Forward)
- **适用于**：原本解法正确，只是漏掉了某种边缘 DOM 选择器或样式影响。
- **操作**：提交一个清晰的补充 Commit：
  ```bash
  git commit -m "fix(beautifier): limit stain selector to action buttons"
  # 补充修复:
  git commit -m "fix(beautifier): fix z-index overlay issue caused by selector limit"
  ```

### 选项 B：止损与优雅回退 (Revert / Abandon)
- **适用于**：尝试的机制导致了 React 动态列表卡死、全局样式污染严重或引发了链式崩溃。
- **操作**：
  - **方法 1（撤销最近提交）**：
    ```bash
    git revert HEAD
    ```
  - **方法 2（销毁脏分支）**：
    ```bash
    git checkout develop
    git branch -D fix/bad-approach  # 彻底删除被污染的分支，零痕迹
    ```

---

## 🏁 3. 验证与合并 (Git Flow 标准流转)

当 Task 分支在本地测试 100% 稳健后，遵循标准 Git Flow 汇聚流程：

- **Feature 分支**：测试通过后合回 `develop` 并清除特性分支：
  ```bash
  git checkout develop
  git merge feat/my-feature
  git branch -d feat/my-feature
  ```
- **Hotfix 分支**：测试通过后，合回 `main` 打 Tag，同时合回 `develop`：
  ```bash
  git checkout main
  git merge hotfix/v8.1.1
  git tag -a v8.1.1 -m "hotfix: v8.1.1"
  git checkout develop
  git merge hotfix/v8.1.1
  git branch -d hotfix/v8.1.1
  ```

> 详细生产线级规范请参阅架构文档：[GIT_FLOW_SPECIFICATION.md](file:///c:/Users/winsl/OneDrive/Desktop/Vibe%20Coding/ZhiNengX/docs/GIT_FLOW_SPECIFICATION.md)
