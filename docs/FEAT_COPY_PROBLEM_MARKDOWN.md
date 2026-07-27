# 📑 需求设计与技术规范文档：知能行一键复制原排版题目 (Markdown + LaTeX)

> **需求状态**：`已项目负责人评审修正 / 待开发分发 (P1 高优先级)`  
> **归属模块**：`ZhiNengX Beautifier (美化与助手包)`  
> **设计目标**：`纯粹极致 — 仅一键提取并复制当前题目完整格式与 LaTeX 公式，无任何多余提示词或冗余功能`  
> **目标源码**：[`zhinengx_beautifier.user.js`](file:///c:/Users/winsl/OneDrive/Desktop/Vibe%20Coding/ZhiNengX/zhinengx-beautifier/zhinengx_beautifier.user.js)

---

## 🎯 1. 核心需求与设计原则 (Core Goals & Design Principles)

### 1.1 唯一核心目标
在知能行做题页面提供一个 **`📋 复制题目`** 按钮。点击后，以**纯净的 Markdown 格式**精准提取当前题目的全部排版内容（含完整文字、换行排版、选项以及原生 LaTeX 数学公式），并一键写入系统剪贴板。

### 1.2 严格设计原则 (Zero Redundancy)
* 🚫 **无提示词包装**：剪贴板中**绝不添加**任何“请作为专家解答”、“解题要求”等 AI Prompt 模板。
* 🚫 **无冗余数据**：仅复制题目本身与选项内容，不包含无关按钮文字、做题状态或多余元数据。
* ⚡ **纯粹高效**：一键点击 ➔ 纯净 Markdown+LaTeX 内容进剪贴板 ➔ 可直接粘贴至任意 Markdown 编辑器或 LLM 输入框。

---

## 🎨 2. 界面与交互设计 (UI & UX Design)

### 2.1 按钮注入与幂等控制
* **注入位置**：做题界面顶部工具栏区域 (`div[class*="_3WnwfR"]` / `div[class*="_3r5idY"]`)，位于反馈与工具按钮协同排布区。
* **外观样式**：使用经典 Glassmorphism 毛玻璃样式，保持微光视觉与整洁对齐。
* **按钮文案**：`📋 复制题目`。
* **DOM 幂等保护**：元素 ID 强制固定为 `znx-copy-problem-btn`，防止 SPA 频繁重绘导致按钮重复挂载。

### 2.2 复制成功反馈 (Toast Notification)
* 点击后触发标准微光 Toast 提示（1.5 秒后自动消失）：
  > `✨ 题目与 LaTeX 公式已成功复制到剪贴板`

---

## 🛠️ 3. 技术实现与 DOM 解析规范 (Technical Specification)

### 3.1 容器定位与 DOM 解析算法

必须精准定位做题核心 DOM 节点，克隆 DOM 节点并预处理 LaTeX 公式（兼顾 KaTeX 与 MathJax），防止提取过程污染原生页面或产生字符串重复：

```javascript
// 1. 题目主容器 DOM 寻找逻辑 (适配多页面结构)
function getProblemContainerEl() {
    return document.querySelector('div[name="ProblemItemElement"]') ||
           document.querySelector('.jumbotron') ||
           document.querySelector('div[class*="_3WnwfR"]')?.parentElement;
}

// 2. 纯净题目 Markdown 提取算法
function extractPureProblemMarkdown(problemContainerEl) {
    if (!problemContainerEl) return '';

    // A. 克隆 DOM 节点，避免污染原生页面
    const clone = problemContainerEl.cloneNode(true);

    // B. 移除无用交互元素 (如内置的工具按钮、选项操作反馈等)
    clone.querySelectorAll('.MuiButton-root, button, script, style, .znx-ignored, [data-znx-checked]').forEach(el => el.remove());

    // C. 提取 KaTeX 公式源码 (精准防重复处理：剔除 .katex-html)
    const katexEls = clone.querySelectorAll('.katex');
    katexEls.forEach(el => {
        const texSource = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent ||
                          el.querySelector('.katex-mathml')?.textContent;
        if (texSource) {
            const isBlock = el.classList.contains('katex-display');
            const mathMd = isBlock ? `\n$$\n${texSource.trim()}\n$$\n` : ` $${texSource.trim()}$ `;
            
            // 替代整块 katex 容器，防止 katex-html 被提取为文本
            el.replaceWith(document.createTextNode(mathMd));
        }
    });

    // D. 提取 MathJax 公式源码 (若存在)
    const mathjaxEls = clone.querySelectorAll('script[type^="math/tex"]');
    mathjaxEls.forEach(el => {
        const texSource = el.textContent;
        const isBlock = el.getAttribute('type').includes('mode=display');
        const mathMd = isBlock ? `\n$$\n${texSource.trim()}\n$$\n` : ` $${texSource.trim()}$ `;
        el.replaceWith(document.createTextNode(mathMd));
    });

    // E. 提取并清洗纯净文本 (保留换行与段落结构)
    let text = clone.innerText || clone.textContent || '';

    // 清洗连续多余空行，保持排版工整
    return text.replace(/\n{3,}/g, '\n\n').trim();
}
```

---

### 3.2 复制输出示例 (Pure Output Example)

点击按钮后，剪贴板中的**实际输出内容**如下（示例）：

#### 示例 A（单选题）：
```markdown
设函数 $f(x) = \lim_{n \to \infty} \frac{x^{2n}-1}{x^{2n}+1}$，则 $f(x)$ 在 $x=1$ 处的连续性为：

A. 连续
B. 左连续但不右连续
C. 右连续但不左连续
D. 既不左连续也不右连续
```

#### 示例 B（解答题/大题）：
```markdown
计算二重积分
$$
\iint_{D} (x+y) dxdy
$$
其中区域 $D$ 是由曲线 $y = x^2$ 与直线 $y = 1$ 所围成的闭区域。
```

---

### 3.3 剪贴板写入与环境兼容保障 (`@grant none` 保持策略)

> [!IMPORTANT]
> **沙盒安全与环境兼容纪律**：
> `zhinengx_beautifier.user.js` 保持 `// @grant none` 配置，**严禁引入依赖 Tampermonkey 沙盒的 `GM_setClipboard`**，以防破坏全局 `AudioContext` 音效与 `window.confetti` 渲染。

**三级降级剪贴板引擎 (3-Tier Fallback Engine)**：
1. **Tier 1 (现代 Clipboard API)**：优先执行 `navigator.clipboard.writeText(text)`
2. **Tier 2 (ExecCommand 兼容 fallback)**：若无 Clipboard 权限，创建临时隐藏 `<textarea>` 执行 `document.execCommand('copy')`
3. **Tier 3 (ZhiNengX 毛玻璃 Modal 兜底)**：若自动化写入失败，弹出毛玻璃 Textarea 弹框提示用户手动按 Ctrl+C 复制。

---

## 🧪 4. 交付验收标准 (Acceptance Criteria)

| 用例 ID | 测试场景 | 预期结果 |
| :--- | :--- | :--- |
| `TC-CP-001` | 复制单选题 | 剪贴板获得纯净题目正文与 A/B/C/D 选项，无任何多余提示词或前缀后缀。 |
| `TC-CP-002` | 复制带公式题目 | 行内公式精准输出为 `$ ... $`，块级公式输出为 `$$ ... $$`。公式文本无重复拼接。 |
| `TC-CP-003` | SPA 视图切换重绘 | 在多道题目间切换时，`📋 复制题目` 按钮无重复创建且功能实时有效。 |
| `TC-CP-004` | 既有功能回归验证 | 复制功能上线后，键盘快捷键 (Enter/数字键 1-5)、音效撒花及 Live2D 看板娘均无故障。 |

---

## 🤝 5. Agent 团队分工与执行规范 (Agent Task Handoff)

* **版本控制 Agent**：从 `dev` 分支创建 `feat/copy-problem-markdown` 分支；提交必须带中英文双语 Commit。
* **程序开发 Agent**：依 3.1 节逻辑向 `zhinengx_beautifier.user.js` 添加复制按钮与 DOM 抽取算法。
* **代码审计 Agent**：审查 DOM `cloneNode` 无内存泄露，剪贴板 API 符合 `@grant none` 限制。
* **项目健康 Agent**：执行 `TC-CP-001` ~ `TC-CP-004` 自动化/手动测试。

---

## 📅 6. 开发排期
* **优先级**：`P1 (高优先级)`
* **预估工时**：`0.5 个工作日`
