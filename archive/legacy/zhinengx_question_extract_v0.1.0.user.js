// ==UserScript==
// @name         知能行题目解析提取
// @namespace    https://github.com/yourname/znx-extract
// @version      0.1.0
// @description  在知能行训练页弹窗中注入「提取题目和解析」按钮，一键提取题目与解析并复制到剪贴板
// @author       玄鸟墨色
// @license      MIT
// @match        https://*.bestzixue.com/*
// @match        https://*.zhinengxing.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    if (window.__znxExtractLoaded) return;
    window.__znxExtractLoaded = true;

    // 调度状态放在最前面，确保早于任何函数调用和监听器
    let injectTimer = null;

    // ---------------------------------------------------------------- 配置
    const CONFIG = {
        // 目标页面标题（精确匹配；如页面标题有变化可改为 includes 判断）
        TITLE: '知能行考研数学-训练中 - App',

        BTN_ID: 'znx-extract-btn',
        BTN_TEXT: '提取题目和解析',

        // 「查看题解」按钮的定位链
        COL_SELECTOR: 'div.col-lg-2.col-md-2.col-sm-2.col-2',
        WRAP_SELECTOR: 'div._1JpWFCTNY81yLAVb14XE8H',
        // 「查看题解」或「显示答案」按钮，任一命中即可（按优先级排列）
        ACTION_BTN_SELECTORS: [
            'button#solutionButton._1TMrC-JL-0LvQoT4D51hDZ.btn.btn-default', // 查看题解
            'button._37pDomo-xb8b_s3DevUI8U.btn.btn-default', // 显示答案
            'button#solutionButton' // 退化：只看 id
        ],
        // 文本兜底（class 动态变化时仍能识别）
        ACTION_BTN_TEXTS: ['查看题解', '显示答案'],

        // 弹窗
        DIALOG_SELECTOR: 'h3[style*="rgb(85, 85, 85)"]',
        DIALOG_TITLE_TEXT: '查看原题',
        BUTTON_ROOT: 'div.MuiDialogActions-root',
        QUESTION_SELECTOR: 'div.MuiExpansionPanelDetails-root',
        ANSWER_SELECTOR: 'div.uo3HrFxA_ZeWKX9v8kg8i#solution, #solution.uo3HrFxA_ZeWKX9v8kg8i',

        DEBUG: false
    };

    const log = (...args) => CONFIG.DEBUG && console.log('[知能行提取]', ...args);

    // ------------------------------------------------------- 一、前置条件判断

    /** 注入按钮的严格条件：标题正确 + 存在 id=solutionButton 的查看题解按钮 */
    /** 页面是否满足注入条件 */
    function isReady() {
        if (!isTargetPage()) {
            log('title 不匹配：', document.title);
            return false;
        }
        if (!findSolutionButton()) {
            log('未找到「查看题解 / 显示答案」按钮');
            return false;
        }
        return true;
    }

    function isTargetPage() {
        return document.title === CONFIG.TITLE;
    }

    /** 判断一个 button 是否是目标动作按钮 */
    function isActionButton(btn) {
        if (!btn) return false;
        if (btn.id === 'solutionButton') return true; // 查看题解
        const text = (btn.textContent || '').trim();
        return CONFIG.ACTION_BTN_TEXTS.includes(text);// 显示答案等
    }

    /** 查找动作按钮：先列内 → 再整列 → 最后全局兜底 */
    function findSolutionButton() {
        // 1) 按原来的层级链：列 → wrap → 候选选择器
        const cols = document.querySelectorAll(CONFIG.COL_SELECTOR);
        for (const col of cols) {
            const scopes = [col.querySelector(CONFIG.WRAP_SELECTOR), col].filter(Boolean);
            for (const scope of scopes) {
                for (const sel of CONFIG.ACTION_BTN_SELECTORS) {
                    const btn = scope.querySelector(sel);
                    if (isActionButton(btn)) return btn;
                }
            }
        }

        // 2) 全局兜底：先按 id，再按文本
        const byId = document.querySelector('button#solutionButton');
        if (isActionButton(byId)) return byId;

        for (const btn of document.querySelectorAll('button.btn.btn-default')) {
            if (isActionButton(btn)) return btn;
        }

        return null;
    }

    // --------------------------------------------------- 二、监听 DOM 变化

    let scheduled = null;
    function scheduleInject() {
        if (scheduled) return;
        scheduled = setTimeout(() => {
            scheduled = null;
            injectButton();
        }, 250);
    }

    // 观察 body：弹窗打开 / 内容重建时重新注入
    new MutationObserver(scheduleInject).observe(document.body, {
        childList: true,
        subtree: true
    });

    // 观察 head：SPA 切换页面时 document.title 会变化，需要重新判断
    new MutationObserver(scheduleInject).observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // 路由 / 点击兜底
    window.addEventListener('popstate', scheduleInject);
    document.addEventListener('click', scheduleInject, true);

    // 初始化
    scheduleInject();


    // ------------------------------------------------------- 二、定位弹窗内容

    function isVisible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    /** 找到弹窗内容容器 div.MuiDialogContent-root，返回带“题目解析”四个字的那个 */
    function findContentRoot() {
        const contentBoxes = Array.from(document.querySelectorAll(CONFIG.DIALOG_SELECTOR));
        if (!contentBoxes.length) {
            log('未找到弹窗root');
            return {content: null, button: null};
        }

        // 可见的弹窗标题优先
        //dialogs.sort((a, b) => Number(isVisible(b)) - Number(isVisible(a)));

        for (const contentBox of contentBoxes) {
            log('查找目标文字');
            if (contentBox.innerText.includes(CONFIG.DIALOG_TITLE_TEXT)){
                log('找到目标文字');
                const dialog = contentBox.parentElement.parentElement;
                if (dialog == null) continue;
                const buttons = [...dialog.querySelectorAll('*')].filter(
                    el => el.style.width === '100%'
                );
                return{content: contentBox, button: buttons[0]};
            }
        }
    }

    // ------------------------------------------------------- 三、注入按钮

    function createButton() {
        const btn = document.createElement('button');
        btn.id = CONFIG.BTN_ID;
        btn.type = 'button';
        btn.textContent = CONFIG.BTN_TEXT;
        btn.style.cssText = [
            'margin-left: 35px',
            'display:inline-block',
            'white-space: nowrap',
            'padding:6px 12px',
            'margin:6 12 6 12',
            'font-size:14px',
            'font-weight:400',
            'line-height: 1.42857143',
            'border:none',
            'border-radius:4px',
            'background:#f0ad4e',
            'color:#fff',
            'cursor:pointer',
            'transition:background .2s'
        ].join(';');
        btn.addEventListener('mouseenter', () => (btn.style.background = '#eea236'));
        btn.addEventListener('mouseleave', () => (btn.style.background = '#f0ad4e'));
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleExtract();
        });
        return btn;
    }

    function injectButton() {
        if (!isReady()) return;

        const buttonRoot = findContentRoot().button;
        if (!buttonRoot) {
            log('未找到弹窗root');
            return;
        }

        // 同一个弹窗内已注入则跳过
        if (buttonRoot.querySelector('#' + CONFIG.BTN_ID)) {
            log('已注入跳过');
            return;
        }

        buttonRoot.appendChild(createButton());
        log('按钮已注入');
    }

    // ------------------------------------------------------- 四、按钮点击逻辑

    function handleExtract() {
        // 点击时只校验标题，避免「查看题解」按钮收起后误拦
        if (!isTargetPage()) {
            toast('当前不是「知能行考研数学-训练中」页面');
            return;
        }
        if (!findSolutionButton()) {
            toast('未找到「查看题解 / 显示答案」按钮，可能尚未生成');
            return;
        }

        const result = extractContent();
        if (!result) {
            toast('未找到题目或解析内容，请先展开题解');
            return;
        }

        (async () => {
            let finalOutput = '';
            finalOutput += htmlToLatex(result.questionHTML.cloneNode(true)); + '\n\n'
            finalOutput += htmlToLatex(result.answerHTML.cloneNode(true));

            // 清理多余空行
            finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n').trim();

            // 复制到剪贴板
            if (navigator.clipboard) {
                console.group('[知能行提取] 提取结果');
                console.log('题目和解析：', '\n' + finalOutput);
                console.groupEnd();
                navigator.clipboard.writeText(finalOutput).then(() => {
                    console.log("已提取并复制到剪贴板 ✔");
                });
            }
        })();
        window.__znxExtractResult = result;
    }

    function toast(msg, duration = 2200) {
        let el = document.getElementById('znx-extract-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'znx-extract-toast';
            el.style.cssText = [
                'position:fixed',
                'left:50%',
                'top:24px',
                'transform:translateX(-50%)',
                'z-index:2147483647',
                'background:rgba(0,0,0,.82)',
                'color:#fff',
                'padding:10px 18px',
                'border-radius:8px',
                'font-size:14px',
                'line-height:1.5',
                'max-width:70vw',
                'pointer-events:none',
                'transition:opacity .25s',
                'box-shadow:0 4px 16px rgba(0,0,0,.25)'
            ].join(';');
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(() => {
            el.style.opacity = '0';
        }, duration);
    }

    // ------------------------------------------------------- 五、提取节点

    function extractContent() {
        const contentRoot = findContentRoot().content;
        if (!contentRoot) {
            log('未找到 MuiDialogContent-root');
            return null;
        }

        let questionEl = contentRoot.querySelector(CONFIG.QUESTION_SELECTOR);
        let answerEl = contentRoot.querySelector(CONFIG.ANSWER_SELECTOR);

        // 兜底查找
        if (!answerEl) {
            answerEl =
                document.querySelector(CONFIG.ANSWER_SELECTOR) ||
                document.querySelector('div#solution');
        }
        if (!questionEl) {
            const dialog = contentRoot.closest(CONFIG.DIALOG_SELECTOR);
            questionEl = dialog ? dialog.querySelector(CONFIG.QUESTION_SELECTOR) : null;
        }

        if (!questionEl && !answerEl) {
            log('题目与解析元素均未找到');
            return null;
        }
        log("question:" + questionEl);

        return { questionHTML: questionEl, answerHTML: answerEl};
    }

    /// ------------------------------------------------------- 六、清理节点

    // 跳过标签、块级标签集合
    const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg']);
    const BLOCK_TAGS = new Set(['div', 'p', 'li', 'tr', 'section', 'article',
                                'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    /**
     * @param {Node} cloneNode  目标节点的克隆（已脱离文档，不会被修改）
     * @param {Object} [options]
     * @param {boolean} [options.escape=true]          是否转义正文
     * @param {[string,string]} [options.blockDelim]   块级公式定界符，默认 ['\\[', '\\]']
     * @param {[string,string]} [options.inlineDelim]  行内公式定界符，默认 ['$', '$']
     * @returns {string}  纯 .tex 正文（不含 \documentclass / \begin{document}）
     */
    function htmlToLatex(cloneNode, options = {}) {
        const { formulaMap, frameIds } = collectFormulas(cloneNode);

        // 过滤纯 MathML 兜底
        if (options.skipFallback) {
            for (const [node, info] of formulaMap) {
                if (info.source === 'mathml-fallback') info.skip = true;
            }
        }
        const chunks = walkAndRender(cloneNode, formulaMap, frameIds, {
            escape:      options.escape ?? true,
            blockDelim:  options.blockDelim ?? ['\\[', '\\]'],
            inlineDelim: options.inlineDelim ?? ['$', '$'],
        });

        return chunks
            .join('')
            .replace(/[ \t]+\n/g, '\n')// 行尾空格
            .replace(/\n{3,}/g, '\n\n')// 连续空行压成一个空行
            .trim();
    }

    // ============ 符号表 ============
    const symbolMap = {
        'δ': '\\delta', 'π': '\\pi', '≥': '\\ge', '≠': '\\ne',
        'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'Δ': '\\Delta',
        'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu', 'σ': '\\sigma',
        'φ': '\\phi', 'ω': '\\omega', '±': '\\pm', '×': '\\times',
        '÷': '\\div', '≈': '\\approx', '≤': '\\le', '∞': '\\infty',
        '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊃': '\\supset',
        '∪': '\\cup', '∩': '\\cap', '∅': '\\emptyset', '∀': '\\forall',
        '∃': '\\exists', '∠': '\\angle', '⊥': '\\perp', '∥': '\\parallel',
        '∴': '\\therefore', '∵': '\\because', '∝': '\\propto', '∑': '\\sum',
        '∏': '\\prod', '∮': '\\oint', '∇': '\\nabla', '∂': '\\partial',
        'f^\'(x)': 'f\'(x)', '{f}^{′}(x)': 'f^(x)', '!=': '\\ne', 'ξ':'\\xi'
    };

    function applySymbolMap(text) {
        if (!text) return '';
        // 整串精确匹配优先
        if (Object.prototype.hasOwnProperty.call(symbolMap, text)) {
            return symbolMap[text];
        }
        // 逐字符替换（仅单字符键）
        let out = '';
        for (const ch of text) {
            out += Object.prototype.hasOwnProperty.call(symbolMap, ch)
                ? symbolMap[ch]: ch;
        }
        return out;
    }

    // 只取多字符键，避免和字符级重复替换
    const sequenceReplacements = Object.entries(symbolMap)
    .filter(([k]) => k.length > 1);

    function applySequenceReplacements(latex) {
        let result = latex;
        for (const [key, val] of sequenceReplacements) {
            if (result.includes(key)) result = result.split(key).join(val);
        }
        return result;
    }

    // ============ MathML → LaTeX ============
    // 关键修复：不再用 math.textContent（会丢失 \frac / ^ / _ / \sqrt 结构），
    // 改为递归按标签转 LaTeX；symbolMap 只在 <mo> 上应用。
    function mathmlToLatex(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.localName;

        // 标识符 / 操作符 / 数字 / 文本：统一走 symbolMap
        if (tag === 'mo' || tag === 'mi' || tag === 'mn' || tag === 'mtext') {
            return applySymbolMap(node.textContent);
        }
        if (tag === 'mspace') return '';

        // 分式（修复分式丢失的关键）
        if (tag === 'mfrac') {
            const kids = Array.from(node.children);
            return `\\frac{${mathmlToLatex(kids[0])}}{${mathmlToLatex(kids[1])}}`;
        }

        // 上标
        if (tag === 'msup') {
            const [b, s] = Array.from(node.children);
            return `{${mathmlToLatex(b)}}^{${mathmlToLatex(s)}}`;
        }

        // 下标
        if (tag === 'msub') {
            const [b, s] = Array.from(node.children);
            return `{${mathmlToLatex(b)}}_{${mathmlToLatex(s)}}`;
        }

        // 上下标
        if (tag === 'msubsup') {
            const [b, sub, sup] = Array.from(node.children);
            return `{${mathmlToLatex(b)}}_{${mathmlToLatex(sub)}}^{${mathmlToLatex(sup)}}`;
        }

        // 根号
        if (tag === 'msqrt') {
            return `\\sqrt{${Array.from(node.children).map(mathmlToLatex).join('')}}`;
        }
        if (tag === 'mroot') {
            const [b, i] = Array.from(node.children);
            return `\\sqrt[${mathmlToLatex(i)}]{${mathmlToLatex(b)}}`;
        }

        // 矩阵 / 方程组
        if (tag === 'mtable') {
            const rows = Array.from(node.children).filter(c => c.localName === 'mtr');
            const body = rows.map(tr => {
                const cells = Array.from(tr.children).filter(c => c.localName === 'mtd');
                return cells.map(td =>
                                 Array.from(td.children).map(mathmlToLatex).join('')
                                ).join(' & ');
            }).join(' \\\\ ');
            return `\\begin{array}{l} ${body} \\end{array}`;
        }

        // 其他容器：math / mrow / mstyle / semantics / mpadded / mtd / mtr …
        return Array.from(node.childNodes).map(mathmlToLatex).join('');
    }

    // 收集层：找出所有公式
    function collectFormulas(root) {
        const formulaMap = new Map(); // node -> { latex, isBlock, source }
        const frameIds = new Set(); // 需要整棵跳过的视觉 span id
        const coveredScriptKeys = new Set(); // 已被 script 覆盖的公式 key

        //  MathJax v2 script
        root.querySelectorAll('script').forEach(script => {
            const type = script.getAttribute('type') || '';
            if (!type.startsWith('math/tex')) return;

            const latex = script.textContent.trim();
            if (!latex) return;
            const visualContainer = script.closest('.MathJax_SVG_Display, .MathJax_SVG');

            formulaMap.set(script, {
                latex,
                forceBlock: visualContainer?.classList.contains('MathJax_SVG_Display') || false,
                isBlock: /mode=display/.test(type), // 此属性可保留，但 forceBlock 优先级更高
                source: 'mathjax-v2',
                skip: false
            });

            if (script.id) {
                const key = script.id.replace(/-Frame$/, '');
                coveredScriptKeys.add(key);
                frameIds.add(key + '-Frame');
            }
        });

        // KaTeX / MathJax v3 <annotation encoding="application/x-tex">
        root.querySelectorAll('annotation').forEach(ann => {
            if (ann.getAttribute('encoding') !== 'application/x-tex') return;

            const latex = ann.textContent.trim();
            if (!latex) return;

            const math = ann.closest('math');
            const target = math || ann;
            if (formulaMap.has(target)) return; // 保险

            // 若该 math 已被某个 script 覆盖（MathJax v2 视觉残留），跳过
            if (math) {
                const frameAncestor = math.closest('[id$="-Frame"]');
                if (frameAncestor) {
                    const key = frameAncestor.id.replace(/-Frame$/, '');
                    if (coveredScriptKeys.has(key)) return;
                }
            }

            formulaMap.set(target, {
                latex,
                forceBlock: math?.closest('.MathJax_SVG_Display') != null || false,
                isBlock: math ? math.getAttribute('display') === 'block' : false,
                source: 'mathml-annotation',
            });
        });

        // 纯 MathML 兜底
        root.querySelectorAll('math').forEach(math => {
            // 有 annotation 的归 collector 2
            if (math.querySelector('annotation')) return;
            // 已在 formulaMap 中
            if (formulaMap.has(math)) return;
            // 属于已被 script 覆盖的视觉残留
            const frameAncestor = math.closest('[id$="-Frame"]');
            if (frameAncestor) {
                const key = frameAncestor.id.replace(/-Frame$/, '');
                if (coveredScriptKeys.has(key)) return;
            }

            const latex = applySequenceReplacements(mathmlToLatex(math)).trim();
            if (!latex) return;

            formulaMap.set(math, {
                latex,
                forceBlock: math.closest('.MathJax_SVG_Display')
                != null || math.getAttribute('display') === 'block',
                isBlock: math.getAttribute('display') === 'block',
                source: 'mathml-fallback',
            });
        });

        return { formulaMap, frameIds };
    }

    // 遍历层
    function walkAndRender(root, formulaMap, frameIds, options) {
        const { escape, blockDelim, inlineDelim } = options;
        const esc = escape ? (s) => s.replace(/([\\$%&_#{}~^])/g, '\\$1') : (s) => s;
        const out = [];

        (function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                out.push(esc(node.nodeValue));
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            // 公式节点优先输出（三种来源统一走这里）
            const info = formulaMap.get(node);
            if (info && info.latex) {
                // 优先采用从DOM读到的 forceBlock 标志
                const isBlock = info.forceBlock ?? (info.isBlock || false);
                out.push(isBlock?
                         `\n\n${blockDelim[0]}\n${info.latex}\n${blockDelim[1]}\n\n`
                         : `${inlineDelim[0]}${info.latex}${inlineDelim[1]}`)
                return;
            }

            const tag = node.nodeName.toLowerCase();
            if (SKIP_TAGS.has(tag)) return;
            if (node.getAttribute('aria-hidden') === 'true') return;
            if (frameIds.has(node.id)) return; // 被 script 覆盖的视觉 span 整棵跳过
            if (tag === 'br') { out.push('\n'); return; }

            for (const child of node.childNodes) walk(child);
            if (BLOCK_TAGS.has(tag)) out.push('\n');
        })(root);

        return out;
    }

    // ------------------------------------------------- 七、对外暴露（调试用）
    window.znxExtract = {
        isReady,
        extractContent,
        injectButton,
        run() {
            const res = extractContent();
            if (res) window.__znxExtractResult = res;
            return res;
        }
    };

    log('脚本已加载');
})();