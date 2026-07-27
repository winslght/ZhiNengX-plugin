// ==UserScript==
// @name         知能行考研全能助手 (ZhiNengX Suite)
// @namespace    http://tampermonkey.net/
// @version      12.0.0-beta.1
// @description  知能行全能一体化引擎：全局毛玻璃视觉、做题端倒计时胶囊、Live2D 看板娘、纯净题目复制、诊断报告与 ECharts 大屏导出
// @author       winslght
// @license      MIT
// @icon         https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/icon.png
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @run-at       document-start
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = '12.0.0-beta.1';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    console.log(`[ZhiNengX Suite] 知能行全能引擎 v${SCRIPT_VERSION} 正在启动...`);

    // ============================================================
    // PHASE 0: EXPORTER EARLY INTERCEPTORS (must run at document-start)
    // ============================================================
    let rawFullJson = null;

    // 强行约束原生侧边栏顺序 (包含数一、数二、数三全模块)
    const TOPIC_ORDER = [
        "limit-compute", "func-basic", "series-limit", "func-deri",
        "mean-value", "der-application", "der-proof",
        "int-compute", "def-int-comp", "int-application",
        "2d-der", "2der-compute", "2d-int", "diff-equation",
        // 数一/数三 专属高数模块
        "curve-int", "surface-int", "series-sum", "power-series", "fourier-series", "eco-app",
        // 线代模块
        "det-compute", "vector-rank", "linear-eqn", "eigen", "quad-form",
        // 概率论模块
        "prob", "probability"
    ];

    // 知能行 核心知识点映射字典
    const TOPIC_NAMES = {
        "limit-compute": "函数极限",
        "func-basic": "函数•微专题",
        "series-limit": "数列极限",
        "func-deri": "连续、间断与导数",
        "mean-value": "中值定理",
        "der-application": "导数应用",
        "der-proof": "导数证明",
        "int-compute": "积分1",
        "def-int-comp": "积分2",
        "int-application": "定积分应用",
        "2d-der": "多元微分概念",
        "2der-compute": "多元微分计算",
        "2d-int": "重积分",
        "diff-equation": "微分方程",

        // 数一/数三专属模块
        "curve-int": "曲线积分",
        "surface-int": "曲面积分",
        "series-sum": "级数求和",
        "power-series": "幂级数",
        "fourier-series": "傅里叶级数",
        "eco-app": "微积分在经济中的应用",
        
        // 线代模块
        "det-compute": "行列式计算",
        "vector-rank": "向量组与矩阵的秩",
        "linear-eqn": "线性方程组",
        "eigen": "特征值与特征向量",
        "quad-form": "二次型",

        // 概率论模块
        "prob": "概率论与数理统计",
        "probability": "概率论与数理统计"
    };

    // 各科目考纲排除黑名单字典 (自动适应数一、数二、数三)
    const EXCLUDE_KEYS_BY_EXAM = {
        1: new Set([]), // 数学一：全考纲，不过滤任何章节
        2: new Set([    // 数学二：过滤 曲线/曲面积分、级数、傅里叶、经济应用、概率论
            "curve-int", "curve-int-11-1", "curve-int-11-2", "curve-int-11-3",
            "surface-int", "surface-int-11-4", "surface-int-11-5", "surface-int-11-6", "surface-int-11-7",
            "series-sum", "series-sum-12-1", "series-sum-12-2-1", "series-sum-12-2-2",
            "power-series", "power-series-12-3", "power-series-12-4",
            "fourier-12-8", "fourier-series", "fourier-12-7-2", "fourier-12-7-3", "fourier-dirichlet-12-7-2", "fourier-extend-12-7-3",
            "eco-app", "prob", "probability", "probability_396"
        ]),
        3: new Set([    // 数学三：过滤 曲线/曲面积分、傅里叶级数
            "curve-int", "curve-int-11-1", "curve-int-11-2", "curve-int-11-3",
            "surface-int", "surface-int-11-4", "surface-int-11-5", "surface-int-11-6", "surface-int-11-7",
            "fourier-12-8", "fourier-series", "fourier-12-7-2", "fourier-12-7-3", "fourier-dirichlet-12-7-2", "fourier-extend-12-7-3"
        ])
    };

    function getExcludeKeys(examType) {
        return EXCLUDE_KEYS_BY_EXAM[examType] || EXCLUDE_KEYS_BY_EXAM[2];
    }

    // 格式化当前日期为 yyyy/mm/dd
    function getYYYYMMDD() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    // 格式化当前时间为精确到分钟的时间戳 (YYYY-MM-DD HH:mm)
    function getFormattedTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // ==========================================
    // 拦截 1：挂载 unsafeWindow.XMLHttpRequest
    // ==========================================
    try {
        const XHR = win.XMLHttpRequest.prototype;
        const originalOpen = XHR.open;
        const originalSend = XHR.send;

        XHR.open = function(method, url) {
            this._url = String(url);
            return originalOpen.apply(this, arguments);
        };

        XHR.send = function(body) {
            this.addEventListener('load', function() {
                if (this._url && (this._url.includes('getUserProfileDiagramLast') || this._url.includes('getUserProfile'))) {
                    try {
                        const parsed = JSON.parse(this.responseText);
                        if (parsed && (parsed.status || parsed.profile)) {
                            rawFullJson = parsed;
                            console.log('【知能行 AI 导出器】XHR 捕获数据成功:', rawFullJson);
                            updateBtnState(true);
                        }
                    } catch (e) {}
                }
            });
            return originalSend.apply(this, arguments);
        };
    } catch (e) {}

    // ==========================================
    // 拦截 2：挂载 unsafeWindow.fetch (非阻塞式异步拦截)
    // ==========================================
    try {
        const originalFetch = win.fetch;
        if (originalFetch) {
            win.fetch = function(...args) {
                const fetchPromise = originalFetch.apply(this, args);
                const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

                if (url && (url.includes('getUserProfileDiagramLast') || url.includes('getUserProfile'))) {
                    fetchPromise.then(response => {
                        if (response && response.ok) {
                            try {
                                const clone = response.clone();
                                clone.json().then(parsed => {
                                    if (parsed && (parsed.status || parsed.profile)) {
                                        rawFullJson = parsed;
                                        console.log('【知能行 AI 导出器】Fetch 捕获数据成功:', rawFullJson);
                                        updateBtnState(true);
                                    }
                                }).catch(() => {});
                            } catch (err) {}
                        }
                    }).catch(() => {});
                }
                return fetchPromise;
            };
        }
    } catch (e) {}

    // ==========================================
    // 主动接口请求机制 (带 2.5 秒超时保护)
    // ==========================================
    async function fetchFullJsonActively() {
        const candidateUrls = [
            '/getUserProfileDiagramLast',
            '/getUserProfile',
            '/getUserProfileDiagram',
            'https://app.bestzixue.com/getUserProfileDiagramLast',
            'https://app.bestzixue.com/getUserProfile',
            'https://app.zhinengxing.com/getUserProfileDiagramLast',
            'https://app.zhinengxing.com/getUserProfile'
        ];

        for (const url of candidateUrls) {
            try {
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;

                const fetchOptions = { credentials: 'include' };
                if (controller) fetchOptions.signal = controller.signal;

                const res = await win.fetch(url, fetchOptions);
                if (timeoutId) clearTimeout(timeoutId);

                if (res && res.ok) {
                    const data = await res.json();
                    if (data && (data.status || data.profile)) {
                        rawFullJson = data;
                        console.log('【知能行 AI 导出器】主动 Fetch 补全数据成功:', rawFullJson);
                        return rawFullJson;
                    }
                }
            } catch (e) {}
        }
        return null;
    }

    function updateBtnState(ready) {
        // 用户反馈：平时保持原生颜色，不需要变黄，如果有错误会在点击时弹出 alert
    }

    // ============================================================
    // BEAUTIFIER MODULE (ALL code from beautifier, lines 20-1624)
    // ============================================================
    let styleEl;

    // ==========================================
    // 1. 深色模式检测 (自动联动 Dark Reader)
    // ==========================================
    function isDarkModeActive() {
        return document.documentElement.hasAttribute('data-darkreader-scheme') ||
               document.documentElement.classList.contains('darkreader') ||
               !!document.querySelector('meta[name="darkreader-theme"]');
    }

    // ==========================================
    // 2. 生成全局 CSS (所有参数硬编码，零运行时开销)
    // ==========================================
    function generateBaseCSS() {
        const isDark = isDarkModeActive();
        const glassRgb = isDark ? '20, 22, 28' : '255, 255, 255';
        const tabText = isDark ? '#eee' : '#444';

        return `
            :root {
                --znx-glass-rgb: ${glassRgb};
                --znx-tab-text: ${tabText};
            }

            /* 全局透明化 */
            #root, #root > div, #root > div > div { background: transparent !important; }
            body { background-color: transparent !important; }

            /* A. 顶部导航栏 (opacity: 0.35, blur: 10px) */
            html body #root .MuiAppBar-root {
                background: rgba(${glassRgb}, 0.35) !important;
                backdrop-filter: blur(10px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(10px) saturate(140%) !important;
                border: none !important;
                box-shadow: 0 2px 16px rgba(0,0,0,0.08) !important;
            }
            html body #root .MuiAppBar-root .MuiButton-label,
            html body #root .MuiAppBar-root .MuiTab-wrapper,
            html body #root .MuiAppBar-root .MuiToolbar-root span,
            html body #root .MuiAppBar-root .MuiToolbar-root a span {
                color: var(--znx-tab-text) !important;
            }

            /* 进度条最高优先级保真防护 (防止对话框/成就卡片内的等级进度条被毛玻璃规则覆盖) */
            .MuiLinearProgress-root,
            .MuiLinearProgress-bar,
            div[class*="MuiLinearProgress"],
            div[class*="LinearProgress"],
            div[class*="linearProgress"],
            div[class*="progressbar"],
            div[class*="progressBar"],
            div[class*="ProgressBar"],
            div[role="progressbar"],
            div[aria-valuenow],
            div[style*="height: 16px"], div[style*="height:16px"],
            div[style*="height: 14px"], div[style*="height:14px"],
            div[style*="height: 12px"], div[style*="height:12px"],
            div[style*="height: 10px"], div[style*="height:10px"],
            div[style*="height: 8px"],  div[style*="height:8px"] {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                opacity: 1 !important;
                visibility: visible !important;
            }

            .MuiLinearProgress-bar,
            div[class*="MuiLinearProgress"] > div,
            div[class*="LinearProgress"] > div,
            div[class*="progressBar"] > div,
            div[class*="ProgressBar"] > div,
            div[role="progressbar"] > div,
            div[aria-valuenow] > div,
            div[style*="height: 16px"] > div, div[style*="height:16px"] > div,
            div[style*="height: 14px"] > div, div[style*="height:14px"] > div,
            div[style*="height: 12px"] > div, div[style*="height:12px"] > div {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                opacity: 1 !important;
                visibility: visible !important;
            }

            /* F. 做题界面顶部工具栏 (opacity: 0.85, blur: 15px) */
            div[class*="_3WnwfR"],
            div[class*="_3r5idY"] {
                background: rgba(${isDark ? '20, 20, 35' : '255, 255, 255'}, 0.85) !important;
                backdrop-filter: blur(15px) !important;
                -webkit-backdrop-filter: blur(15px) !important;
                border: none !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
            }

            /* 做题状态下淡隐底部蓝色导航条 */
            html.znx-doing-questions #navigation-pills,
            html.znx-doing-questions #moduleHeader,
            html.znx-doing-questions .MuiTabs-root {
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.2s ease !important;
            }

            /* GPU 硬件加速 */
            html body #root .MuiAppBar-root,
            .MuiPaper-root:not(.MuiAppBar-root):not(.MuiDialog-paper),
            .jumbotron,
            div[class*="_3WnwfR"],
            div[class*="_3r5idY"] {
                transform: translateZ(0);
                will-change: backdrop-filter, transform;
            }

            /* B. 所有卡片面板 (opacity: 0.35, blur: 10px) */
            .MuiPaper-root:not(.MuiAppBar-root):not(.MuiDialog-paper) {
                background: rgba(${glassRgb}, 0.35) !important;
                backdrop-filter: blur(10px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(10px) saturate(140%) !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
            }

            /* C. 行内白色背景 (opacity: 0.8, blur: 10px) */
            div[style*="background-color: white"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color: rgb(255, 255, 255)"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color: #fff"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color:#fff"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color: antiquewhite"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background: white;"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background: white !important"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background: antiquewhite"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]) {
                background: rgba(${glassRgb}, 0.8) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                border-radius: 10px !important;
            }

            /* D. 弹窗/对话框 (opacity: 0.8, blur: 20px) */
            .MuiDialog-paper {
                background: rgba(${glassRgb}, 0.8) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
            }

            /* E. 做题面板 Bootstrap (opacity: 0.6, blur: 5px) */
            .jumbotron {
                background: rgba(${glassRgb}, 0.6) !important;
                backdrop-filter: blur(5px) !important;
                -webkit-backdrop-filter: blur(5px) !important;
                border-radius: 12px !important;
                border: 1px solid rgba(255, 255, 255, 0.4) !important;
                box-shadow: 0 4px 16px rgba(0,0,0,0.05) !important;
            }

            /* 按钮与其他例外 */
            .MuiButtonBase-root, .btn { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
            .MuiTabs-indicator { background-color: #1a73e8 !important; }
            footer { background: transparent !important; }

            /* 看板娘最高级防护墙 */
            [id*="waifu"], [id*="live2d"], [id*="landlord"], [class*="waifu"], [class*="live2d"], [class*="landlord"] {
                z-index: 2147483647 !important;
                backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
                transform: none !important; visibility: visible !important; opacity: 1 !important;
            }
            [id*="waifu"] canvas, [id*="live2d"] canvas, [id*="landlord"] canvas, [class*="waifu"] canvas, [class*="live2d"] canvas {
                backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
                transform: none !important; visibility: visible !important; opacity: 1 !important;
            }

            /* 看板娘侧边工具栏智能隐藏 */
            #waifu-tool { opacity: 0 !important; transition: opacity 0.3s ease-in-out !important; pointer-events: none !important; }
            #waifu:hover #waifu-tool, #waifu-tool:hover { opacity: 1 !important; pointer-events: auto !important; }

            /* G. 做题底栏做对/做错毛玻璃 (opacity: 0.4, blur: 8px) */
            html.znx-doing-questions .jumbotron:has(#FootcontentYes),
            html.znx-doing-questions div[class*="_3o6JR"]:has(#FootcontentYes),
            html.znx-doing-questions div[class*="jumbotron"]:has(#FootcontentYes),
            html.znx-doing-questions .jumbotron[data-znx-result="correct"],
            html.znx-doing-questions div[class*="_3o6JR"][data-znx-result="correct"] {
                background: rgba(34, 197, 94, 0.4) !important;
                backdrop-filter: blur(8px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
                border-top: 1.5px solid rgba(34, 197, 94, 0.8) !important;
                box-shadow: 0 -4px 20px rgba(34, 197, 94, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
                transition: background 0.2s ease !important;
            }
            html.znx-doing-questions .jumbotron:has(#FootcontentYes) div,
            html.znx-doing-questions div[class*="_3o6JR"]:has(#FootcontentYes) div,
            html.znx-doing-questions div[class*="jumbotron"]:has(#FootcontentYes) div,
            html.znx-doing-questions .jumbotron[data-znx-result="correct"] div,
            html.znx-doing-questions div[class*="_3o6JR"][data-znx-result="correct"] div {
                background: transparent !important;
                box-shadow: none !important;
            }

            html.znx-doing-questions .jumbotron:has(#FootcontentNo),
            html.znx-doing-questions .jumbotron:has(#FootcontentWrong),
            html.znx-doing-questions div[class*="_3o6JR"]:has(#FootcontentNo),
            html.znx-doing-questions div[class*="_3o6JR"]:has(#FootcontentWrong),
            html.znx-doing-questions div[class*="jumbotron"]:has(#FootcontentNo),
            html.znx-doing-questions div[class*="jumbotron"]:has(#FootcontentWrong),
            html.znx-doing-questions .jumbotron[data-znx-result="wrong"],
            html.znx-doing-questions div[class*="_3o6JR"][data-znx-result="wrong"] {
                background: rgba(239, 68, 68, 0.4) !important;
                backdrop-filter: blur(8px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
                border-top: 1.5px solid rgba(239, 68, 68, 0.8) !important;
                box-shadow: 0 -4px 20px rgba(239, 68, 68, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
                transition: background 0.2s ease !important;
            }
            html.znx-doing-questions .jumbotron:has(#FootcontentNo) div,
            html.znx-doing-questions .jumbotron:has(#FootcontentWrong) div,
            html.znx-doing-questions div[class*="_3o6JR"]:has(#FootcontentNo) div,
            html.znx-doing-questions div[class*="_3o6JR"]:has(#FootcontentWrong) div,
            html.znx-doing-questions div[class*="jumbotron"]:has(#FootcontentNo) div,
            html.znx-doing-questions div[class*="jumbotron"]:has(#FootcontentWrong) div,
            html.znx-doing-questions .jumbotron[data-znx-result="wrong"] div,
            html.znx-doing-questions div[class*="_3o6JR"][data-znx-result="wrong"] div {
                background: transparent !important;
                box-shadow: none !important;
            }
        `;
    }

    function initCSS() {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'znx-glass-style';
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = generateBaseCSS();

        // 壁纸遮光罩联动 Dark Reader
        const overlay = document.getElementById('znx-anime-overlay');
        if (overlay) {
            overlay.style.opacity = isDarkModeActive() ? '0.5' : '0';
        }
    }

    // ==========================================
    // 3. 动态捕获 JSS 类白色背景
    // ==========================================
    const processedClasses = new Set();
    const excludedClasses = new Set();
    let isProcessingScheduled = false;

    function processDynamicJssClasses() {
        isProcessingScheduled = false;
        const root = document.getElementById('root');
        if (!root) return;
        const appBar = document.querySelector('.MuiAppBar-root');

        const candidateDivs = root.querySelectorAll('div[class*="jss"]:not(.MuiPaper-root):not([data-znx-checked]), div[class^="_"]:not(.MuiPaper-root):not([data-znx-checked]), div[class*=" _"]:not(.MuiPaper-root):not([data-znx-checked])');

        const isDark = isDarkModeActive();
        const glassRgb = isDark ? '20, 22, 28' : '255, 255, 255';

        candidateDivs.forEach(el => {
            el.setAttribute('data-znx-checked', '1');
            if (el.closest('[id*="waifu"], [id*="live2d"], [id*="landlord"], [class*="waifu"], [class*="live2d"]')) return;
            if (el.closest('.jumbotron, div[class*="jumbotron"], div[class*="_3o6JR"]')) return;

            const targetClasses = Array.from(el.classList).filter(c => c.startsWith('jss') || c.startsWith('_'));
            if (targetClasses.length === 0) return;
            if (targetClasses.every(c => processedClasses.has(c) || excludedClasses.has(c))) return;

            // 严禁捕获并覆盖进度条及填充轨道的类名，防止弹窗或卡片内的等级进度条丢失
            if (
                el.closest('.MuiLinearProgress-root, div[class*="LinearProgress"], div[class*="progressbar"], div[role="progressbar"], div[aria-valuenow]') ||
                el.classList.contains('MuiLinearProgress-bar') ||
                el.classList.contains('MuiLinearProgress-root') ||
                (el.style.height && ['16px', '14px', '12px', '10px', '8px'].some(h => el.style.height.includes(h)))
            ) {
                targetClasses.forEach(c => excludedClasses.add(c));
                return;
            }

            if (appBar && el.contains(appBar)) {
                targetClasses.forEach(c => excludedClasses.add(c));
                return;
            }

            const bg = getComputedStyle(el).backgroundColor;
            if (bg === 'rgb(255, 255, 255)' || bg === 'rgb(250, 235, 215)' || bg === '#fff') {
                const targetClass = targetClasses.find(c => !processedClasses.has(c) && !excludedClasses.has(c));
                if (targetClass) {
                    processedClasses.add(targetClass);

                    const text = el.innerText || '';
                    const isHeaderBar = text.includes('反馈') || text.includes('退出') || text.includes('复习');
                    const bgVal = isHeaderBar ? `rgba(${glassRgb}, 0.35)` : `rgba(${glassRgb}, 0.8)`;
                    const blurVal = isHeaderBar ? 'blur(10px) saturate(140%)' : 'blur(10px)';
                    const borderRadius = isHeaderBar ? '0' : '10px';

                    const style = document.createElement('style');
                    style.className = 'znx-dynamic-glass';
                    style.innerHTML = `.${targetClass} { background: ${bgVal} !important; backdrop-filter: ${blurVal} !important; -webkit-backdrop-filter: ${blurVal} !important; border-radius: ${borderRadius} !important; transform: translateZ(0); }`;
                    document.head.appendChild(style);
                }
            } else {
                targetClasses.forEach(c => excludedClasses.add(c));
            }
        });
    }

    function scheduleProcessing() {
        if (!isProcessingScheduled) {
            isProcessingScheduled = true;
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => processDynamicJssClasses(), { timeout: 150 });
            } else {
                requestAnimationFrame(() => processDynamicJssClasses());
            }
        }
    }

    function setupObserver() {
        const observer = new MutationObserver(() => scheduleProcessing());
        observer.observe(document.body, { childList: true, subtree: true });

        // 监听 Dark Reader 开关，实时重建 CSS
        const darkReaderObserver = new MutationObserver(() => initCSS());
        darkReaderObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-darkreader-scheme', 'class'] });

        scheduleProcessing();
    }

    // ==========================================
    // 4. 注入壁纸
    // ==========================================
    function injectAnimeGlassTheme() {
        const bg = document.createElement('div');
        bg.id = 'znx-anime-bg';
        bg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-999;pointer-events:none;background:url("https://t.alcy.cc/ycy") center center/cover no-repeat fixed;';

        const overlay = document.createElement('div');
        overlay.id = 'znx-anime-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background-color:#000 !important;pointer-events:none;transition:opacity 0.15s ease;';
        bg.appendChild(overlay);

        document.body.appendChild(bg);
        initCSS();
        setupObserver();
    }

    // ==========================================
    // 5. 考研倒计时悬浮窗
    // ==========================================
    // ==========================================
    // 5. 考研倒计时悬浮窗 (支持闲时 5 秒自动靠边收纳、点击展开、拖拽与位置记忆)
    // ==========================================
    // ==========================================
    // 5. 考研倒计时 (非做题界面全量展开经典卡片 / 做题界面收纳为题目卡片顶部晶莹胶囊，点击展开大卡片 5s 自动收回)
    // ==========================================
    let expandTimer = null;
    let isTempExpanded = false;

    function injectTimeManager() {
        if (document.getElementById('znx-time-manager')) return;

        const widget = document.createElement('div');
        widget.id = 'znx-time-manager';
        widget.title = '27考研倒计时';

        widget.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 260px;
            z-index: 999998;
            font-family: -apple-system, "PingFang SC", sans-serif;
            user-select: none;
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;

        win.showFullCountdownCard = (durationMs = 5000) => {
            isTempExpanded = true;
            widget.style.display = 'block';
            requestAnimationFrame(() => {
                widget.style.opacity = '1';
                widget.style.transform = 'translateY(-50%) scale(1)';
            });

            if (expandTimer) clearTimeout(expandTimer);
            expandTimer = setTimeout(() => {
                const isDoing = document.documentElement.classList.contains('znx-doing-questions');
                if (isDoing) {
                    isTempExpanded = false;
                    widget.style.opacity = '0';
                    widget.style.transform = 'translateY(-50%) scale(0.95)';
                    setTimeout(() => {
                        if (!isTempExpanded && document.documentElement.classList.contains('znx-doing-questions')) {
                            widget.style.display = 'none';
                        }
                    }, 300);
                }
            }, durationMs);
        };

        widget.onmouseenter = () => {
            if (expandTimer) clearTimeout(expandTimer);
        };

        widget.onmouseleave = () => {
            const isDoing = document.documentElement.classList.contains('znx-doing-questions');
            if (isDoing && isTempExpanded) {
                win.showFullCountdownCard(3000);
            }
        };

        document.body.appendChild(widget);

        const targetDate = new Date('2026-12-19T00:00:00').getTime();

        function renderWidget() {
            const isDark = isDarkModeActive();
            const isDoing = document.documentElement.classList.contains('znx-doing-questions');

            // 做题界面且非主动点击展开状态时，隐藏侧边固定大卡片
            if (isDoing && !isTempExpanded) {
                widget.style.display = 'none';
                return;
            } else {
                widget.style.display = 'block';
                widget.style.opacity = '1';
            }

            const now = new Date();
            const diffMs = targetDate - now.getTime();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            const todayMs = endOfDay - now;
            const h = Math.floor(todayMs / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((todayMs / (1000 * 60)) % 60).toString().padStart(2, '0');
            const s = Math.floor((todayMs / 1000) % 60).toString().padStart(2, '0');
            const todayRemainingRatio = Math.max(0, Math.min(100, (todayMs / (24 * 60 * 60 * 1000)) * 100));

            let dow = now.getDay(); if (dow === 0) dow = 7;
            const weekLeft = 7 - dow;
            const weekExactDays = (weekLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);
            const weekRemainingRatio = Math.max(0, Math.min(100, ((weekLeft + (todayMs / (24 * 60 * 60 * 1000))) / 7) * 100));

            const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthTotal = eom.getDate();
            const monthLeft = monthTotal - now.getDate();
            const monthExactDays = (monthLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);
            const monthRemainingRatio = Math.max(0, Math.min(100, ((monthLeft + (todayMs / (24 * 60 * 60 * 1000))) / monthTotal) * 100));

            const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const todayDateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;

            // 应用经典全量毛玻璃卡片材质
            widget.style.padding = '20px';
            widget.style.borderRadius = '20px';
            widget.style.background = isDark
                ? 'rgba(15, 23, 42, 0.88)'
                : 'rgba(255, 255, 255, 0.85)';
            widget.style.backdropFilter = 'blur(20px) saturate(180%)';
            widget.style.webkitBackdropFilter = 'blur(20px)';
            widget.style.border = isDark
                ? '1px solid rgba(56, 189, 248, 0.45)'
                : '1px solid rgba(255, 255, 255, 0.7)';
            widget.style.boxShadow = isDark
                ? '0 12px 36px rgba(0, 0, 0, 0.45)'
                : '0 12px 36px rgba(0, 0, 0, 0.12)';

            const bar = (label, value, ratio, color) => `
                <div style="margin-top:14px">
                    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px;color:${isDark ? '#e2e8f0' : '#334155'}">
                        <span>${label}</span>
                        <span style="color:${color};font-weight:800;">${value}</span>
                    </div>
                    <div style="width:100%;height:8px;background:rgba(0,0,0,0.12);border-radius:4px;overflow:hidden">
                        <div style="width:${ratio.toFixed(1)}%;height:100%;background:${color};transition:width 1s"></div>
                    </div>
                </div>`;

            widget.innerHTML = `
                <div style="text-align:left">
                    <h3 style="margin:0;font-size:16px;color:${isDark ? '#38bdf8' : '#1e3a8a'};font-weight:900;display:flex;align-items:center;gap:4px;">🔥 27考研倒计时</h3>
                    <div style="font-size:36px;font-weight:900;color:#e11d48;line-height:1.1;margin-top:2px;text-shadow:0 2px 8px rgba(225,29,72,0.15)">${daysLeft > 0 ? daysLeft : 0} <span style="font-size:15px;color:${isDark ? '#94a3b8' : '#64748b'};font-weight:700">天</span></div>
                </div>
                <div style="font-size:12px;color:${isDark ? '#cbd5e1' : '#475569'};font-weight:700;margin-top:6px;margin-bottom:8px;">📅 ${todayDateStr}</div>
                <hr style="border:none;border-top:1px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};margin:10px 0">
                ${bar('今日剩余', h+'时 '+m+'分 '+s+'秒', todayRemainingRatio, '#3b82f6')}
                ${bar('本周剩余', weekExactDays+' 天', weekRemainingRatio, '#10b981')}
                ${bar('本月剩余', monthExactDays+' 天', monthRemainingRatio, '#8b5cf6')}
            `;
        }

        renderWidget();
        setInterval(renderWidget, 1000);
    }

    // ==========================================
    // 6. 点击特效、音效与撒花
    // ==========================================
    let audioCtx;
    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }

    function playPopSound() {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(800, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.1);
    }

    function playSuccessSound() {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(523.25, ctx.currentTime);
        o.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        o.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.5);
    }

    function loadConfettiScript() {
        if (window.confetti || document.getElementById('confetti-script')) return;
        const s = document.createElement('script');
        s.id = 'confetti-script';
        s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
        document.head.appendChild(s);
    }

    const successKeywords = ['我的答案正确', '完全会做', '太简单', '掌握了', '消灭', '做对了', '答对', '已掌握', '满分', '下一个突破口'];

    document.addEventListener('click', (e) => {
        if (!e.isTrusted) return;
        const btn = e.target.closest('button') || e.target.closest('.MuiButtonBase-root') || e.target.closest('.btn');
        if (!btn) return;
        try { playPopSound(); } catch(err) {}

        const text = (btn.innerText || btn.textContent || '').trim();
        const pageText = document.body.innerText || '';

        // 【坚决禁止做错/超时撒花】如果页面处于“答案错误”、“超时”、“做不出来”或按钮是“再试一次”，绝对不撒花！
        if (pageText.includes('答案错误') || pageText.includes('再试一次') || pageText.includes('超时') || pageText.includes('做不出来') || text.includes('再试一次')) return;

        const isSuccessBtn = successKeywords.some(kw => text.includes(kw)) ||
            ((text === '继续' || text.includes('下一题')) && (pageText.includes('答案正确') || !!document.getElementById('FootcontentYes')));

        if (isSuccessBtn && window.confetti) {
            try { playSuccessSound(); } catch(err) {}
            const rect = btn.getBoundingClientRect();
            window.confetti({
                particleCount: 150, spread: 80,
                origin: { x: (rect.left + rect.right) / 2 / window.innerWidth, y: (rect.top + rect.bottom) / 2 / window.innerHeight },
                colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42']
            });
        }
    });

    // ==========================================
    // 7. Live2D 看板娘 (多 CDN 容灾与健康重试 Guard)
    // ==========================================
    const LIVE2D_CDN_SOURCES = [
        'https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js',
        'https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js',
        'https://testingcf.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js'
    ];

    const FA_CDN_SOURCES = [
        'https://fastly.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css',
        'https://cdn.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css',
        'https://testingcf.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css'
    ];

    let live2dCdnIndex = 0;
    let live2dRetryCount = 0;
    const MAX_LIVE2D_RETRIES = 5;
    let live2dHealthGuardTimer = null;

    // ==========================================
    // 7.1 看板娘考研短精炼金句与交互提示 (移植自 v8.3.3)
    // ==========================================
    function showWaifuTip(text, timeout = 3000) {
        if (typeof win.showMessage === 'function') {
            win.showMessage(text, timeout, 5000);
        } else {
            const tips = document.getElementById('waifu-tips');
            if (tips) {
                tips.innerHTML = text;
                tips.classList.add('waifu-tips-active');
                setTimeout(() => tips.classList.remove('waifu-tips-active'), timeout);
            }
        }
    }

    let isKaoyanTipsSetup = false;
    function setupKaoyanWaifuTips() {
        if (isKaoyanTipsSetup) return;
        isKaoyanTipsSetup = true;

        const welcomeMsgs = [
            "✨ 欢迎！今天也要元气满满哦！",
            "🔥 坚持就是胜利，考研人加油！",
            "🎯 开始消灭今天的突破口吧！",
            "💡 保持专注，每一题都是进步！",
            "🚀 乾坤未定，你我皆是黑马！"
        ];
        const getRandomWelcome = () => welcomeMsgs[Math.floor(Math.random() * welcomeMsgs.length)];

        // 拦截并替换原脚本空的“欢迎阅读『』”与“欢迎阅读（）”提示
        const observer = new MutationObserver(() => {
            const tips = document.getElementById('waifu-tips');
            if (tips) {
                const text = (tips.innerText || tips.textContent || '').trim();
                if (text.includes('欢迎阅读') || text.includes('『』') || text.includes('（）') || text.includes('()') || text === '欢迎阅读『』' || text.endsWith('『』')) {
                    tips.innerHTML = getRandomWelcome();
                }
            }
        });

        const checkTipsInterval = setInterval(() => {
            const tips = document.getElementById('waifu-tips');
            if (tips) {
                observer.observe(tips, { childList: true, characterData: true, subtree: true });
                showWaifuTip(getRandomWelcome(), 4000);
                clearInterval(checkTipsInterval);
            }
        }, 300);

        const kaoyanQuotes = [
            "消灭突破口，名校在等你！",
            "遇到难题别慌，一步步来！",
            "手写算一算，手感更棒！",
            "适度休息，保持好心态！",
            "熟能生巧，数学无捷径！",
            "消灭小黄点，离高分更近！",
            "保持节奏，27考研必胜！",
            "错题是上岸的阶梯！加油！",
            "相信自己，你远比想象中强大！",
            "星光不问赶路人，加油！",
            "越努力，越幸运！",
            "每一分汗水，都在为高分加码！",
            "今天高数刷了几题？加油！"
        ];

        document.addEventListener('mouseover', (e) => {
            const target = e.target;
            if (!target) return;
            if (target.closest('input[type="text"], textarea')) {
                showWaifuTip('✍️ 用心计算，按回车（Enter）直接提交！', 2500);
            } else if (target.closest('#znx-time-manager, #znx-doing-countdown-btn')) {
                showWaifuTip('🔥 每一秒都在为高分加码！', 2500);
            } else if (target.closest('button, .btn, .MuiButtonBase-root')) {
                const text = (target.innerText || target.textContent || '').trim();
                if (text.includes('提交答案')) {
                    showWaifuTip('🎯 准备好了吗？按回车提交答案！', 2000);
                } else if (text.includes('查看题解')) {
                    showWaifuTip('💡 搞懂错题逻辑就是进步！', 2000);
                } else if (text.includes('继续') || text.includes('下一步')) {
                    showWaifuTip('🚀 乘胜追击，下一题！', 2000);
                }
            }
        });

        // 点击看板娘触发精炼考研金句
        document.addEventListener('click', (e) => {
            if (e.target.closest('#waifu canvas, #live2d')) {
                const randomQuote = kaoyanQuotes[Math.floor(Math.random() * kaoyanQuotes.length)];
                showWaifuTip(randomQuote, 3000);
            }
        });
    }

    function injectLive2D() {
        setupKaoyanWaifuTips();
        const existingWaifu = document.getElementById('waifu');
        const existingCanvas = document.getElementById('live2d') || existingWaifu?.querySelector('canvas');
        if (existingWaifu && existingCanvas && (existingCanvas.offsetWidth > 0 || existingCanvas.offsetHeight > 0)) {
            // 看板娘与 Canvas 画布已真实健康渲染，无需重复注入
            return;
        }

        // 清除可能残留的失败/空壳 waifu 与 script 节点
        if (existingWaifu) {
            existingWaifu.remove();
        }
        const oldScript = document.getElementById('live2d-widget-script');
        if (oldScript) {
            oldScript.remove();
        }

        localStorage.removeItem('waifu-display');
        sessionStorage.removeItem('waifu-display');

        // 注入 Font Awesome CSS (带容灾)
        if (!document.getElementById('live2d-fa-css')) {
            const fa = document.createElement('link');
            fa.id = 'live2d-fa-css';
            fa.rel = 'stylesheet';
            fa.href = FA_CDN_SOURCES[0];
            fa.onerror = () => {
                fa.href = FA_CDN_SOURCES[1] || FA_CDN_SOURCES[2];
            };
            document.head.appendChild(fa);
        }

        const currentCdn = LIVE2D_CDN_SOURCES[live2dCdnIndex % LIVE2D_CDN_SOURCES.length];
        console.log(`[ZhiNengX Live2D] 尝试加载 Live2D 看板娘 (CDN ${live2dCdnIndex + 1}/${LIVE2D_CDN_SOURCES.length}, 第 ${live2dRetryCount + 1} 次):`, currentCdn);

        const s = document.createElement('script');
        s.id = 'live2d-widget-script';
        s.src = currentCdn;

        // 绑定 onerror 事件：当前 CDN 加载失败时，清除旧 script 并自动轮换 CDN 重试
        s.onerror = () => {
            console.warn(`[ZhiNengX Live2D] ⚠️ 当前 CDN 加载失败: ${currentCdn}，自动切换至下一镜像重试...`);
            s.remove();
            live2dCdnIndex++;
            scheduleLive2DRetry(2000);
        };

        s.onload = () => {
            console.log(`[ZhiNengX Live2D] Live2D autoload.js 脚本成功响应 (${currentCdn})`);
        };

        document.body.appendChild(s);

        // 启动 8s DOM 健康检测 Guard
        setupLive2DHealthGuard();
    }

    function scheduleLive2DRetry(delayMs) {
        if (live2dRetryCount >= MAX_LIVE2D_RETRIES) {
            console.warn(`[ZhiNengX Live2D] 🛑 已达最大重试次数 (${MAX_LIVE2D_RETRIES} 次)，看板娘暂无法加载。`);
            return;
        }

        live2dRetryCount++;
        const backoffDelay = delayMs || Math.min(3000 * Math.pow(2, live2dRetryCount - 1), 30000);
        console.log(`[ZhiNengX Live2D] 🔄 计划在 ${(backoffDelay / 1000).toFixed(1)} 秒后触发下一次重试...`);

        setTimeout(() => {
            const waifu = document.getElementById('waifu');
            const canvas = document.getElementById('live2d') || waifu?.querySelector('canvas');
            if (!waifu || !canvas || canvas.offsetWidth === 0) {
                injectLive2D();
            }
        }, backoffDelay);
    }

    function setupLive2DHealthGuard() {
        if (live2dHealthGuardTimer) clearTimeout(live2dHealthGuardTimer);

        live2dHealthGuardTimer = setTimeout(() => {
            const waifu = document.getElementById('waifu');
            const canvas = document.getElementById('live2d') || waifu?.querySelector('canvas');
            const isCanvasVisible = canvas && (canvas.offsetWidth > 0 || canvas.offsetHeight > 0);
            const isWaifuVisible = waifu && (waifu.offsetWidth > 0 || waifu.offsetHeight > 0) && getComputedStyle(waifu).display !== 'none';

            const isHealthy = waifu && canvas && isCanvasVisible && isWaifuVisible;

            if (!isHealthy) {
                console.warn('[ZhiNengX Live2D] ⚠️ 8 秒内未检测到有效的 #waifu 画布渲染 (模型可能加载失败)，自动清理无效节点并轮换 CDN 重试...');
                if (waifu) waifu.remove();
                const oldScript = document.getElementById('live2d-widget-script');
                if (oldScript) oldScript.remove();
                live2dCdnIndex++;
                scheduleLive2DRetry(2000);
            } else {
                console.log('[ZhiNengX Live2D] ✅ 看板娘健康校验通过 (#waifu 与 Canvas 画布已正常渲染)');
                live2dRetryCount = 0;
            }
        }, 8000);
    }

    // ==========================================
    // 8. 键盘高效刷题交互代理
    // ==========================================
    function setupKeyboardShortcutsHandler() {
        document.addEventListener('keydown', (e) => {
            // 1. 忽略修饰键组合 (Ctrl/Alt/Meta/Cmd) 与功能键 (F1~F12/Escape/Tab)
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const ignoreKeys = ['Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Tab', 'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
            if (ignoreKeys.includes(e.key)) return;

            // 2. 检查当前焦点是否在可编辑文本输入框内
            const activeEl = document.activeElement;
            const isMultilineInput = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
            const isSingleLineInput = activeEl && (
                (activeEl.tagName === 'INPUT' && !['radio', 'checkbox', 'button', 'submit', 'hidden'].includes((activeEl.type || '').toLowerCase())) ||
                activeEl.getAttribute('role') === 'textbox'
            );
            const isInAnyInput = isMultilineInput || isSingleLineInput;

            // 3. 回车键代理逻辑 (无论光标是否在单行填空数字输入框内，按回车直通“提交答案/继续”)
            if (e.key === 'Enter' || e.keyCode === 13) {
                // 如果是在多行 TEXTAREA 内，且未按 Shift，优先交由文本框原生换行，按 Shift+Enter 才触发提交
                if (isMultilineInput && !e.shiftKey) return;

                const buttons = Array.from(document.querySelectorAll('button, .btn, .MuiButtonBase-root'));
                const actionKeywords = ['提交答案', '继续', '下一步', '再试一次', '查看题解'];

                let targetBtn = null;
                for (const kw of actionKeywords) {
                    targetBtn = buttons.find(b => {
                        const t = (b.innerText || b.textContent || '').trim();
                        return t.includes(kw) && !t.includes('继续训练') && !t.includes('反馈') && !t.includes('退出');
                    });
                    if (targetBtn) break;
                }

                if (targetBtn && document.body.contains(targetBtn)) {
                    e.preventDefault();
                    targetBtn.click();
                    console.log('⚡ [知能行小助手] 回车按键触发点击:', targetBtn.innerText.trim());
                    return;
                }
            }

            // 4. 数字键 1~5 选择题秒选 (仅在未聚焦在输入框时触发，避免干扰数字输入)
            if (isInAnyInput) return;

            const numVal = parseInt(e.key, 10);
            if (!isNaN(numVal) && numVal >= 1 && numVal <= 5) {
                const choiceLetters = ['A', 'B', 'C', 'D', 'E'];
                const letter = choiceLetters[numVal - 1];

                let targetOption = document.getElementById(`choiceButton${letter}`);

                if (!targetOption) {
                    const inputRadio = document.querySelector(`input[name="choice"][value="${letter}"]`);
                    if (inputRadio) {
                        targetOption = inputRadio.closest('label') || inputRadio;
                    }
                }

                if (!targetOption) {
                    const optionLabels = Array.from(document.querySelectorAll('label[name="choiceButton"], label[id^="choiceButton"], div[name="ProblemItemElement"] label'))
                        .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
                    if (optionLabels.length >= numVal) {
                        targetOption = optionLabels[numVal - 1];
                    }
                }

                if (targetOption && document.body.contains(targetOption)) {
                    e.preventDefault();
                    targetOption.click();
                    console.log(`⚡ [知能行小助手] 数字键 ${numVal} 选中选择题选项 ${letter}:`, targetOption);
                    return;
                }
            }
        });
    }

    // ==========================================
    // 9. 做题模式感应器
    // ==========================================
    function setupQuestionModeObserver() {
        const checkMode = () => {
            document.documentElement.classList.toggle('znx-doing-questions', !!document.querySelector('div[class*="_3WnwfR"]'));
        };
        new MutationObserver(checkMode).observe(document.body, { childList: true, subtree: true });
        checkMode();
    }

    // ==========================================
    // 10. 底栏做对/做错状态感应器
    // ==========================================
    function setupJumbotronFeedbackObserver() {
        const updateStatus = () => {
            const isDoing = document.documentElement.classList.contains('znx-doing-questions');
            const jumbotron = document.querySelector('.jumbotron, div[class*="jumbotron"], div[class*="_3o6JR"]');

            if (!isDoing || !jumbotron) {
                if (jumbotron) {
                    jumbotron.removeAttribute('data-znx-result');
                    ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-top', 'box-shadow'].forEach(p => jumbotron.style.removeProperty(p));
                    jumbotron.querySelectorAll('div').forEach(c => c.style.removeProperty('background'));
                }
                return;
            }

            const buttons = Array.from(document.querySelectorAll('button, .btn, .MuiButtonBase-root'));
            const actionBtn = buttons.find(b => {
                const t = (b.innerText || b.textContent || '').trim();
                return t.includes('提交答案') || t.includes('继续') || t.includes('再试一次') || t.includes('查看题解');
            });

            const targetJumbotron = actionBtn ? (
                actionBtn.closest('.jumbotron') || actionBtn.closest('div[class*="jumbotron"]') ||
                actionBtn.closest('div[class*="_3o6JR"]') || actionBtn.closest('div[class*="_1ktiDhx"]') ||
                actionBtn.parentElement?.parentElement
            ) : jumbotron;

            if (!targetJumbotron) return;

            const fullPageText = document.body.innerText || '';

            // 1. 最高优先级：判定做错 / 超时 / 放弃场景（防止“超时，点击继续”被误识别为做对继续）
            const isWrong = fullPageText.includes('答案错误') ||
                            fullPageText.includes('再试一次') ||
                            fullPageText.includes('超时') ||
                            fullPageText.includes('做不出来') ||
                            fullPageText.includes('换个简单') ||
                            !!document.getElementById('FootcontentNo') ||
                            !!document.getElementById('FootcontentWrong');

            // 2. 只有在【非做错且非超时】的前提下，才识别为做对
            const isCorrect = !isWrong && (
                fullPageText.includes('答案正确') ||
                !!document.getElementById('FootcontentYes') ||
                (fullPageText.includes('继续') && !fullPageText.includes('继续训练') && !fullPageText.includes('点击继续'))
            );

            const children = targetJumbotron.querySelectorAll('div');

            if (isCorrect) {
                targetJumbotron.setAttribute('data-znx-result', 'correct');
                targetJumbotron.style.setProperty('background', 'rgba(34, 197, 94, 0.4)', 'important');
                targetJumbotron.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
                targetJumbotron.style.setProperty('-webkit-backdrop-filter', 'blur(8px)', 'important');
                targetJumbotron.style.setProperty('border-top', '1.5px solid rgba(34, 197, 94, 0.8)', 'important');
                targetJumbotron.style.setProperty('box-shadow', '0 -4px 20px rgba(34, 197, 94, 0.25)', 'important');
                children.forEach(c => c.style.setProperty('background', 'transparent', 'important'));
            } else if (isWrong) {
                targetJumbotron.setAttribute('data-znx-result', 'wrong');
                targetJumbotron.style.setProperty('background', 'rgba(239, 68, 68, 0.4)', 'important');
                targetJumbotron.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
                targetJumbotron.style.setProperty('-webkit-backdrop-filter', 'blur(8px)', 'important');
                targetJumbotron.style.setProperty('border-top', '1.5px solid rgba(239, 68, 68, 0.8)', 'important');
                targetJumbotron.style.setProperty('box-shadow', '0 -4px 20px rgba(239, 68, 68, 0.25)', 'important');
                children.forEach(c => c.style.setProperty('background', 'transparent', 'important'));
            } else {
                targetJumbotron.removeAttribute('data-znx-result');
                ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-top', 'box-shadow'].forEach(p => targetJumbotron.style.removeProperty(p));
                children.forEach(c => c.style.removeProperty('background'));
            }
        };

        new MutationObserver(updateStatus).observe(document.body, { childList: true, subtree: true, characterData: true });
        updateStatus();
    }

    // ==========================================
    // 11. 本地 Dev 碎版本底栏追溯水印
    // ==========================================
    function injectDevVersionBadge() {
        const scriptName = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.name) ? GM_info.script.name : '';
        const version = SCRIPT_VERSION;
        const isDev = version.toLowerCase().includes('dev') || scriptName.includes('DEV') || scriptName.includes('开发') || location.hostname.includes('localhost');

        if (!isDev || document.getElementById('znx-dev-watermark')) return;

        const badge = document.createElement('div');
        badge.id = 'znx-dev-watermark';
        badge.title = '知能行 0-Push 本地开发调试模式 - 点击可一键复制当前碎版本号';
        badge.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(15,23,42,0.85);backdrop-filter:blur(12px) saturate(180%);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.4);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#38bdf8;box-shadow:0 4px 14px rgba(0,0,0,0.25),0 0 10px rgba(56,189,248,0.15);cursor:pointer;user-select:none;transition:all 0.2s ease;display:flex;align-items:center;gap:6px;letter-spacing:0.5px;';

        badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#38bdf8;box-shadow:0 0 6px #38bdf8;animation:znxPulse 1.5s infinite"></span><span>🛠️ DEV <span style="color:#f43f5e;font-weight:800">v${version}</span> | 本地直加载模式</span>`;

        const style = document.createElement('style');
        style.innerHTML = `@keyframes znxPulse{0%{opacity:0.4;transform:scale(0.9)}50%{opacity:1;transform:scale(1.2)}100%{opacity:0.4;transform:scale(0.9)}}#znx-dev-watermark:hover{background:rgba(15,23,42,0.95) !important;border-color:rgba(56,189,248,0.8) !important;transform:translateX(-50%) translateY(-2px) !important;box-shadow:0 6px 18px rgba(0,0,0,0.35),0 0 14px rgba(56,189,248,0.3) !important}`;
        document.head.appendChild(style);

        badge.onclick = () => {
            navigator.clipboard.writeText(`v${version}`);
            const oldHTML = badge.innerHTML;
            badge.innerHTML = `<span style="color:#10b981">✓ 已复制版本号 v${version}</span>`;
            setTimeout(() => { badge.innerHTML = oldHTML; }, 1500);
        };

        document.body.appendChild(badge);
    }

    // ==========================================
    // 12. 一键复制原排版题目 (Markdown + LaTeX)
    //     - 仅在做题界面生效 (znx-doing-questions)
    //     - 位于题目卡片左侧，毛玻璃风格深度融合
    //     - 纯正则安全清洗 UI 杂质文本，绝对不因匹配文案销毁 DOM 节点
    // ==========================================
    function setupCopyProblemHandler() {
        const BUTTON_ID = 'znx-copy-problem-btn';
        let isCapsuleExpanded = false;
        let capsuleTimer = null;

        const showToast = (message, isError = false) => {
            let toast = document.getElementById('znx-copy-toast');
            if (toast) toast.remove();

            const isDark = isDarkModeActive();
            toast = document.createElement('div');
            toast.id = 'znx-copy-toast';

            // 浅色模式材质：与“📋 复制题目”按钮一致的透亮晶莹毛玻璃；深色模式材质：保存暗高斯毛玻璃与天蓝荧光
            const toastBg = isError
                ? (isDark ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.88) 0%, rgba(185, 28, 28, 0.78) 100%)' : 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(252, 165, 165, 0.85) 100%)')
                : (isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(30, 41, 59, 0.72) 100%)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.35) 100%)');

            const toastBorder = isError
                ? (isDark ? 'rgba(252, 165, 165, 0.45)' : 'rgba(239, 68, 68, 0.4)')
                : (isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.6)');

            const toastColor = isError
                ? (isDark ? '#ffffff' : '#991b1b')
                : (isDark ? '#38bdf8' : '#1e293b');

            const toastShadow = isDark
                ? '0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                : '0 10px 30px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)';

            toast.style.cssText = `
                position: fixed;
                top: 28px;
                left: 50%;
                transform: translateX(-50%) translateY(-10px) scale(0.95);
                opacity: 0;
                z-index: 999999;
                background: ${toastBg};
                backdrop-filter: blur(16px) saturate(200%);
                -webkit-backdrop-filter: blur(16px) saturate(200%);
                border: 1px solid ${toastBorder};
                border-radius: 20px;
                padding: 9px 22px;
                font-size: 13px;
                font-weight: 700;
                color: ${toastColor};
                box-shadow: ${toastShadow};
                transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 8px;
                letter-spacing: 0.3px;
            `;
            toast.innerHTML = message;
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            });

            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(-50%) translateY(-12px) scale(0.95)';
                    setTimeout(() => toast.remove(), 350);
                }
            }, 2000);
        };

        const copyToClipboard = (text) => {
            if (!text || !text.trim()) {
                showToast('⚠️ 未能提取到有效题目内容', true);
                return;
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast('✨ 题目与 LaTeX 公式已成功复制到剪贴板');
                }).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
        };

        const fallbackCopy = (text) => {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    showToast('✨ 题目与 LaTeX 公式已成功复制到剪贴板');
                } else {
                    showModalCopy(text);
                }
            } catch (err) {
                showModalCopy(text);
            }
        };

        const showModalCopy = (text) => {
            let modal = document.getElementById('znx-copy-modal');
            if (modal) modal.remove();

            const isDark = isDarkModeActive();
            modal = document.createElement('div');
            modal.id = 'znx-copy-modal';

            const maskBg = isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(15, 23, 42, 0.35)';
            const cardBg = isDark
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 244, 248, 0.75) 100%)';
            const cardBorder = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.6)';
            const cardShadow = isDark
                ? '0 24px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : '0 24px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
            const titleColor = isDark ? '#38bdf8' : '#0f172a';
            const areaBg = isDark ? 'rgba(2, 6, 23, 0.7)' : 'rgba(255, 255, 255, 0.6)';
            const areaColor = isDark ? '#f8fafc' : '#0f172a';
            const areaBorder = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0, 0, 0, 0.12)';

            modal.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:${maskBg};backdrop-filter:blur(12px) saturate(160%);-webkit-backdrop-filter:blur(12px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;transition:opacity 0.25s ease;`;

            modal.innerHTML = `
                <div style="background:${cardBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${cardBorder};border-radius:20px;padding:24px;width:100%;max-width:560px;box-shadow:${cardShadow};color:${areaColor};">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <h4 style="margin:0;font-size:15px;font-weight:700;color:${titleColor};display:flex;align-items:center;gap:6px;">📋 请按 Ctrl+C 复制题目内容</h4>
                        <button id="znx-modal-close-btn" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:28px;height:28px;color:${titleColor};font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;">✕</button>
                    </div>
                    <textarea readonly style="width:100%;height:230px;background:${areaBg};border:1px solid ${areaBorder};border-radius:12px;color:${areaColor};padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;resize:none;outline:none;box-shadow:inset 0 2px 6px rgba(0,0,0,0.1);"></textarea>
                </div>
            `;
            document.body.appendChild(modal);

            const ta = modal.querySelector('textarea');
            ta.value = text;
            ta.select();

            modal.querySelector('#znx-modal-close-btn').onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        };

        const extractPureProblemMarkdown = (problemContainerEl) => {
            console.log('[ZhiNengX Copy] 🚀 开始提取题目，目标容器:', problemContainerEl);
            if (!problemContainerEl) {
                console.warn('[ZhiNengX Copy] ⚠️ 未传入有效题目容器 DOM 节点！');
                return '';
            }

            const clone = problemContainerEl.cloneNode(true);

            // 1. 仅清理无用按钮与样式 (严格不根据文字内容删除任何 DOM 容器节点)
            const itemsToRemove = clone.querySelectorAll(`
                .MuiButton-root, button, style,
                .znx-ignored, #${BUTTON_ID}
            `);
            console.log(`[ZhiNengX Copy] 🧹 清理交互/样式节点 ${itemsToRemove.length} 个`);
            itemsToRemove.forEach(el => el.remove());

            // 2. 选择题选项智能过滤与标号补全 (A. / B. / C. / D. / E.)
            const choiceLetters = ['A', 'B', 'C', 'D', 'E'];
            let choiceLabels = Array.from(clone.querySelectorAll('label[id^="choiceButton"], label[name="choiceButton"], label[class*="choiceButton"], div[class*="choice"] label'));
            if (choiceLabels.length === 0) {
                choiceLabels = Array.from(clone.querySelectorAll('label')).filter(l => l.querySelector('input[type="radio"], input[type="checkbox"], input[name="choice"]'));
            }

            // 剔除包含“我没有思路”或“显示有问题”的假选项 (如 E 选项“我没有思路”)
            choiceLabels = choiceLabels.filter(label => {
                const txt = (label.textContent || '').trim();
                if (txt.includes('我没有思路') || txt.includes('显示有问题')) {
                    label.remove();
                    return false;
                }
                return true;
            });

            console.log(`[ZhiNengX Copy] 📝 匹配到有效选择题选项 ${choiceLabels.length} 个`);
            choiceLabels.forEach((label, idx) => {
                const letter = choiceLetters[idx] || '';
                const txt = (label.textContent || '').trim();
                if (letter && !txt.startsWith(`${letter}.`) && !txt.startsWith(`${letter} `)) {
                    label.prepend(document.createTextNode(`${letter}. `));
                }
                label.before(document.createTextNode('\n'));
            });

            // 3. 提取 KaTeX 公式源码并干净替换整个展示块
            const katexEls = clone.querySelectorAll('.katex');
            if (katexEls.length > 0) {
                console.log(`[ZhiNengX Copy] 📐 匹配到 KaTeX 公式 ${katexEls.length} 个`);
            }
            katexEls.forEach(el => {
                const texSource = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent ||
                                  el.querySelector('.katex-mathml')?.textContent;
                if (texSource) {
                    const displayParent = el.closest('.katex-display');
                    const isBlock = !!displayParent;
                    const mathMd = isBlock ? `\n$$\n${texSource.trim()}\n$$\n` : ` $${texSource.trim()}$ `;

                    const targetToReplace = displayParent || el;
                    targetToReplace.replaceWith(document.createTextNode(mathMd));
                }
            });

            // 4. 提取 MathJax v2.7 (SVG / AsciiMath / TeX) 全模式公式源码
            const mathjaxScripts = Array.from(clone.querySelectorAll('script[type^="math/"], script[type^="Math/"]'));
            if (mathjaxScripts.length > 0) {
                console.log(`[ZhiNengX Copy] 📐 匹配到 MathJax 脚本 ${mathjaxScripts.length} 个`);
            }
            mathjaxScripts.forEach(script => {
                const rawFormula = (script.textContent || script.innerText || '').trim();
                const scriptType = (script.getAttribute('type') || '').toLowerCase();
                const scriptId = script.id || '';

                if (rawFormula) {
                    const isBlock = scriptType.includes('mode=display') || !!script.closest('.MathJax_Display');
                    const mathMd = isBlock ? `\n$$\n${rawFormula}\n$$\n` : ` $${rawFormula}$ `;

                    // 清理关联的 MathJax 渲染 Frame 节点
                    if (scriptId) {
                        const frame = clone.querySelector(`#${scriptId}-Frame`) || clone.querySelector(`[id^="${scriptId}-Frame"]`);
                        if (frame) frame.remove();
                    }

                    // 清理紧邻的 MathJax_Preview 节点
                    const prev = script.previousElementSibling;
                    if (prev && (prev.classList.contains('MathJax_Preview') || prev.classList.contains('MathJax_SVG') || prev.classList.contains('MathJax'))) {
                        prev.remove();
                    }

                    script.replaceWith(document.createTextNode(mathMd));
                } else {
                    script.remove();
                }
            });

            // 5. 扫尾清理残存的 MathJax DOM 节点与所有剩余 script 标签
            clone.querySelectorAll('.MathJax_SVG, .MathJax_Preview, .MathJax, .MathJax_Display, .MJX_Assistive_MathML, script').forEach(el => el.remove());

            // 6. 提纯文本：纯正则洗涤 UI 杂质文本 (绝对安全，不销毁 DOM 节点)
            let text = clone.innerText || clone.textContent || '';
            let cleanedText = text
                .replace(/小贴士：?[^\n]*/g, '')
                .replace(/对界面不熟悉[^\n]*/g, '')
                .replace(/使用教程也许会帮到你[^\n]*/g, '')
                .replace(/请输入你的答案[^\n]*/g, '')
                .replace(/答案为数值形式[^\n]*/g, '')
                .replace(/不包含特殊字符[^\n]*/g, '')
                .replace(/添加中间步骤[^\n]*/g, '')
                .replace(/我没有思路[^\n]*/g, '')
                .replace(/显示有问题[^\n]*/g, '')
                .replace(/[ \t]+/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            console.log(`[ZhiNengX Copy] ✅ 纯净题目提取完成，字符数: ${cleanedText.length}`);
            console.log('[ZhiNengX Copy] 📄 最终提纯 Markdown 预览:\n' + cleanedText);

            return cleanedText;
        };

        const checkAndUpdateButton = () => {
            const isDoing = document.documentElement.classList.contains('znx-doing-questions');
            let toolsBar = document.getElementById('znx-problem-tools-bar');

            if (!isDoing) {
                if (toolsBar) toolsBar.remove();
                return;
            }

            const problemCard = document.querySelector('div[name="ProblemItemElement"]') ||
                                document.querySelector('div[class*="_3saCwwTEZwjVS61OHwIkcP"]') ||
                                document.querySelector('.jumbotron') ||
                                document.querySelector('div[class*="jumbotron"]') ||
                                document.querySelector('div[class*="_3WnwfR"]');

            if (!problemCard) {
                if (toolsBar) toolsBar.remove();
                return;
            }

            // 倒计时信息获取函数
            function getCountdownInfo() {
                const targetDate = new Date('2026-12-19T00:00:00').getTime();
                const now = new Date();
                const diffMs = targetDate - now.getTime();
                const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                const todayMs = endOfDay - now;
                const h = Math.floor(todayMs / (1000 * 60 * 60)).toString().padStart(2, '0');
                const m = Math.floor((todayMs / (1000 * 60)) % 60).toString().padStart(2, '0');
                const s = Math.floor((todayMs / 1000) % 60).toString().padStart(2, '0');
                const todayRemainingRatio = Math.max(0, Math.min(100, (todayMs / (24 * 60 * 60 * 1000)) * 100));

                let dow = now.getDay(); if (dow === 0) dow = 7;
                const weekLeft = 7 - dow;
                const weekExactDays = (weekLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);
                const weekRemainingRatio = Math.max(0, Math.min(100, ((weekLeft + (todayMs / (24 * 60 * 60 * 1000))) / 7) * 100));

                const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const monthTotal = eom.getDate();
                const monthLeft = monthTotal - now.getDate();
                const monthExactDays = (monthLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);
                const monthRemainingRatio = Math.max(0, Math.min(100, ((monthLeft + (todayMs / (24 * 60 * 60 * 1000))) / monthTotal) * 100));

                const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                const todayDateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;

                return { daysLeft, h, m, s, todayRemainingRatio, weekExactDays, weekRemainingRatio, monthExactDays, monthRemainingRatio, todayDateStr };
            }

            function updateTimerCapsuleHTML() {
                const info = getCountdownInfo();
                const dark = isDarkModeActive();
                const capsuleEl = document.getElementById('znx-doing-countdown-btn');
                if (!capsuleEl) return;

                const renderKey = `${info.daysLeft}-${info.h}:${info.m}-${dark}-${isCapsuleExpanded}`;
                if (capsuleEl.getAttribute('data-znx-render-key') === renderKey) return;
                capsuleEl.setAttribute('data-znx-render-key', renderKey);

                if (!isCapsuleExpanded) {
                    // 1. 紧凑胶囊态 (绝对定位在占位父节点上，z-index 99)
                    capsuleEl.style.setProperty('position', 'absolute', 'important');
                    capsuleEl.style.setProperty('top', '0', 'important');
                    capsuleEl.style.setProperty('left', '0', 'important');
                    capsuleEl.style.setProperty('z-index', '99', 'important');
                    capsuleEl.style.setProperty('transform-origin', 'top left', 'important');
                    capsuleEl.style.setProperty('width', '135px', 'important');
                    capsuleEl.style.setProperty('height', '32px', 'important');
                    capsuleEl.style.setProperty('min-height', '32px', 'important');
                    capsuleEl.style.setProperty('padding', '4px 12px', 'important');
                    capsuleEl.style.setProperty('border-radius', '12px', 'important');
                    capsuleEl.style.setProperty('box-shadow', dark ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)', 'important');

                    capsuleEl.innerHTML = `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">
                            <span style="font-weight:900;color:#e11d48;font-size:12px;display:inline-flex;align-items:center;gap:2px;">🔥 ${info.daysLeft > 0 ? info.daysLeft : 0} <span style="font-size:11px;color:${dark ? '#94a3b8' : '#64748b'};font-weight:700">天</span></span>
                            <span style="font-size:10.5px;color:${dark ? '#38bdf8' : '#3b82f6'};font-weight:800;">${info.h}:${info.m}</span>
                        </div>
                        <div style="width:100%;height:3px;background:rgba(0,0,0,0.12);border-radius:2px;margin-top:2px;overflow:hidden">
                            <div style="width:${info.todayRemainingRatio.toFixed(1)}%;height:100%;background:#3b82f6;transition:width 1s"></div>
                        </div>
                    `;
                } else {
                    // 2. 就地形变放大态 (向右下方直接对角线弹性展开，提升至 z-index 99999)
                    capsuleEl.style.setProperty('position', 'absolute', 'important');
                    capsuleEl.style.setProperty('top', '0', 'important');
                    capsuleEl.style.setProperty('left', '0', 'important');
                    capsuleEl.style.setProperty('z-index', '99999', 'important');
                    capsuleEl.style.setProperty('transform-origin', 'top left', 'important');
                    capsuleEl.style.setProperty('width', '250px', 'important');
                    capsuleEl.style.setProperty('min-height', '215px', 'important');
                    capsuleEl.style.setProperty('height', 'auto', 'important');
                    capsuleEl.style.setProperty('padding', '16px', 'important');
                    capsuleEl.style.setProperty('border-radius', '16px', 'important');
                    capsuleEl.style.setProperty('box-shadow', dark ? '0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)' : '0 16px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9)', 'important');

                    const bar = (label, value, ratio, color) => `
                        <div style="margin-top:10px">
                            <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;margin-bottom:3px;color:${dark ? '#e2e8f0' : '#334155'}">
                                <span>${label}</span>
                                <span style="color:${color};font-weight:800;">${value}</span>
                            </div>
                            <div style="width:100%;height:6px;background:rgba(0,0,0,0.12);border-radius:3px;overflow:hidden">
                                <div style="width:${ratio.toFixed(1)}%;height:100%;background:${color};transition:width 1s"></div>
                            </div>
                        </div>`;

                    capsuleEl.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;width:100%;">
                            <h4 style="margin:0;font-size:14px;color:${dark ? '#38bdf8' : '#1e3a8a'};font-weight:900;">🔥 27考研倒计时</h4>
                            <span id="znx-close-capsule-btn" style="font-size:11px;color:${dark ? '#94a3b8' : '#64748b'};cursor:pointer;padding:2px 6px;border-radius:8px;background:rgba(0,0,0,0.06)">收起 ➖</span>
                        </div>
                        <div style="font-size:28px;font-weight:900;color:#e11d48;line-height:1;margin-bottom:4px;">${info.daysLeft > 0 ? info.daysLeft : 0} <span style="font-size:13px;color:${dark ? '#94a3b8' : '#64748b'};font-weight:700">天</span></div>
                        <div style="font-size:11px;color:${dark ? '#cbd5e1' : '#475569'};font-weight:700;">📅 ${info.todayDateStr}</div>
                        <hr style="border:none;border-top:1px dashed ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};margin:8px 0;width:100%;">
                        ${bar('今日剩余', info.h+'时 '+info.m+'分 '+info.s+'秒', info.todayRemainingRatio, '#3b82f6')}
                        ${bar('本周剩余', info.weekExactDays+' 天', info.weekRemainingRatio, '#10b981')}
                        ${bar('本月剩余', info.monthExactDays+' 天', info.monthRemainingRatio, '#8b5cf6')}
                    `;

                    const closeBtn = capsuleEl.querySelector('#znx-close-capsule-btn');
                    if (closeBtn) {
                        closeBtn.onclick = (ev) => {
                            ev.stopPropagation();
                            collapseCapsule();
                        };
                    }
                }
            }

            function expandCapsule(durationMs = 5000) {
                isCapsuleExpanded = true;
                const timerEl = document.getElementById('znx-doing-countdown-btn');
                if (timerEl) {
                    timerEl.removeAttribute('data-znx-render-key');
                    updateTimerCapsuleHTML();
                }

                if (capsuleTimer) clearTimeout(capsuleTimer);
                capsuleTimer = setTimeout(() => {
                    collapseCapsule();
                }, durationMs);
            }

            function collapseCapsule() {
                isCapsuleExpanded = false;
                if (capsuleTimer) clearTimeout(capsuleTimer);
                const timerEl = document.getElementById('znx-doing-countdown-btn');
                if (timerEl) {
                    timerEl.removeAttribute('data-znx-render-key');
                    updateTimerCapsuleHTML();
                }
            }

            // 如果工具栏已经存在且归属于当前题目卡片，仅更新倒计时内容，绝不重新操作 DOM，防止 MutationObserver 死循环！
            if (toolsBar && problemCard.contains(toolsBar)) {
                updateTimerCapsuleHTML();
                return;
            }

            if (toolsBar) toolsBar.remove();

            toolsBar = document.createElement('div');
            toolsBar.id = 'znx-problem-tools-bar';
            toolsBar.style.cssText = `
                display: inline-flex !important;
                align-items: center !important;
                gap: 10px !important;
                margin-bottom: 10px !important;
                margin-right: auto !important;
                flex-wrap: wrap !important;
                position: relative !important;
                height: 32px !important;
                z-index: 1 !important;
            `;

            // 统一胶囊 2.0 材质 (与复制按钮和倒计时胶囊完全一致，与题目卡片在同一 DOM 层级)
            const getCapsuleStyle = () => {
                const dark = isDarkModeActive();
                return `
                    background: ${dark
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(30, 41, 59, 0.72) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.45) 100%)'} !important;
                    backdrop-filter: blur(12px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(12px) saturate(180%) !important;
                    border: 1px solid ${dark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.75)'} !important;
                    border-radius: 12px !important;
                    padding: 4px 12px !important;
                    font-size: 12px !important;
                    font-weight: 800 !important;
                    color: ${dark ? '#38bdf8' : '#1e293b'} !important;
                    box-shadow: ${dark ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'} !important;
                    cursor: pointer !important;
                    user-select: none !important;
                    transform-origin: top left !important;
                    transition: width 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), min-height 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), height 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), padding 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), background 0.3s ease, border-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease !important;
                    display: inline-flex !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                `;
            };

            // 1. 📋 复制题目 胶囊按钮
            const copyBtn = document.createElement('button');
            copyBtn.id = BUTTON_ID;
            copyBtn.type = 'button';
            copyBtn.title = '一键纯净提取当前题目与 LaTeX 公式';
            copyBtn.innerHTML = '📋 复制题目';
            copyBtn.style.cssText = getCapsuleStyle() + 'gap: 5px !important; align-items: center !important; height: 32px !important;';

            copyBtn.onmouseover = () => {
                const dark = isDarkModeActive();
                copyBtn.style.setProperty('transform', 'translateY(-1px)', 'important');
                copyBtn.style.setProperty('border-color', dark ? 'rgba(56, 189, 248, 0.8)' : 'rgba(56, 189, 248, 0.6)', 'important');
            };
            copyBtn.onmouseout = () => {
                copyBtn.style.setProperty('transform', 'none', 'important');
                copyBtn.style.setProperty('border-color', isDarkModeActive() ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.75)', 'important');
            };

            copyBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[ZhiNengX Copy] 🖱️ 用户点击了 📋 复制题目 按钮');
                const currentCard = document.querySelector('div[name="ProblemItemElement"]') ||
                                    document.querySelector('div[class*="_3saCwwTEZwjVS61OHwIkcP"]') ||
                                    copyBtn.closest('.jumbotron') ||
                                    copyBtn.closest('div[class*="jumbotron"]') ||
                                    copyBtn.closest('div[class*="_3WnwfR"]') ||
                                    document.querySelector('.jumbotron') ||
                                    problemCard;
                const pureText = extractPureProblemMarkdown(currentCard);
                copyToClipboard(pureText);
            };

            // 2. 🔥 27考研倒计时 做题极简胶囊按钮 Wrapper (固定 135px x 32px 占位，防止拉下下方题目文本)
            const timerWrapper = document.createElement('div');
            timerWrapper.id = 'znx-doing-countdown-wrapper';
            timerWrapper.style.cssText = `
                position: relative !important;
                width: 135px !important;
                height: 32px !important;
                flex-shrink: 0 !important;
            `;

            const timerBtn = document.createElement('div');
            timerBtn.id = 'znx-doing-countdown-btn';
            timerBtn.title = '点击展开/收起考研倒计时卡片 (闲置5秒自动收回)';
            timerBtn.style.cssText = getCapsuleStyle() + `
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                z-index: 99 !important;
                flex-direction: column !important;
                justify-content: center !important;
            `;

            timerBtn.onmouseover = () => {
                if (isCapsuleExpanded && capsuleTimer) {
                    clearTimeout(capsuleTimer);
                } else if (!isCapsuleExpanded) {
                    const dark = isDarkModeActive();
                    timerBtn.style.setProperty('transform', 'translateY(-1px)', 'important');
                    timerBtn.style.setProperty('border-color', dark ? 'rgba(56, 189, 248, 0.8)' : 'rgba(56, 189, 248, 0.6)', 'important');
                }
            };

            timerBtn.onmouseout = () => {
                if (isCapsuleExpanded) {
                    if (capsuleTimer) clearTimeout(capsuleTimer);
                    capsuleTimer = setTimeout(() => collapseCapsule(), 3000);
                } else {
                    timerBtn.style.setProperty('transform', 'none', 'important');
                    timerBtn.style.setProperty('border-color', isDarkModeActive() ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.75)', 'important');
                }
            };

            timerBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isCapsuleExpanded) {
                    expandCapsule(5000);
                } else {
                    collapseCapsule();
                }
            };

            timerWrapper.appendChild(timerBtn);
            toolsBar.appendChild(copyBtn);
            toolsBar.appendChild(timerWrapper);

            updateTimerCapsuleHTML();

            const targetHeader = problemCard.querySelector('div[class*="_3r5idY"]') || problemCard.firstElementChild || problemCard;
            if (targetHeader !== problemCard) {
                targetHeader.insertBefore(toolsBar, targetHeader.firstChild);
            } else {
                problemCard.insertBefore(toolsBar, problemCard.firstChild);
            }
        };

        let isScheduled = false;
        let copyObserver = null;

        const scheduleCheckAndUpdateButton = () => {
            if (isScheduled) return;
            isScheduled = true;
            const runTask = () => {
                isScheduled = false;
                if (copyObserver) copyObserver.disconnect();
                checkAndUpdateButton();
                if (copyObserver) copyObserver.observe(document.body, { childList: true, subtree: true });
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(runTask, { timeout: 100 });
            } else {
                requestAnimationFrame(runTask);
            }
        };

        copyObserver = new MutationObserver(() => scheduleCheckAndUpdateButton());
        copyObserver.observe(document.body, { childList: true, subtree: true });
        scheduleCheckAndUpdateButton();
    }

    // ==========================================
    // 启动
    // ==========================================
    function init() {
        injectAnimeGlassTheme();
        injectTimeManager();
        loadConfettiScript();
        injectLive2D();
        setupKeyboardShortcutsHandler();
        setupQuestionModeObserver();
        setupJumbotronFeedbackObserver();
        setupCopyProblemHandler();
        injectDevVersionBadge();
    }

    // ============================================================
    // EXPORTER MODULE: REPORT & DASHBOARD (remaining exporter code)
    // ============================================================ 
    function buildPureMarkdownReport(json) {
        if (!json || !json.status) return null;

        const status = json.status || {};
        const profile = json.profile || {};
        const survey = profile.surveyContent || {};
        const reportInfo = status.progress_report_info || {};
        const mockExam = reportInfo.mock_exam_correct_rate_info || {};
        const wrongInfo = reportInfo.wrong_problem_reason_info || {};
        const changeInfo = reportInfo.period_to_progress_change_info || {};
        const detailed = status.topic_to_detailedProgress || {};
        const topicScores = status.topic || {};
        const topicWithoutRusty = status.topic_without_rusty || {};
        const compSkillInfo = status.computational_skill_info_all_topic || {};
        const yellowDots = status.topics_with_yellowDot || [];
        const inApp = profile.inAppMessageInfo || {};

        const excludeKeys = getExcludeKeys(profile.examType);
        const examName = profile.examType === 1 ? '数学一 (数一)' : (profile.examType === 2 ? '数学二 (数二)' : (profile.examType === 3 ? '数学三 (数三)' : '考研数学'));
        const yyyymmdd = getYYYYMMDD();
        const timestamp = getFormattedTimestamp();

        let levelsData = reportInfo.progress_info_per_topic_all_module;
        if (!levelsData && status.extra_info_for_annual_plan?.module_to_topic_to_progress_per_level) {
            levelsData = {};
            const modules = status.extra_info_for_annual_plan.module_to_topic_to_progress_per_level;
            for (let m in modules) {
                Object.assign(levelsData, modules[m]);
            }
        }
        if (!levelsData) levelsData = status.topic_to_level_to_progress_with_self_check_obs || {};

        // 顶行要求格式: 知能行yyyy/mm/dd导出报告
        let md = `# 知能行${yyyymmdd}导出报告\n\n`;
        
        // 1. 考生档案与学习概况
        md += `## 1. 考生档案与学习概况\n\n`;
        md += `- **报告生成时间**：\`${timestamp}\` (精准至分钟)\n`;
        md += `- **学员昵称**：${profile.nickname || '考研学员'}\n`;
        md += `- **报考科目**：**${examName}**\n`;
        md += `- **目标年份**：${survey.examYear || '2027'} 年 | **目标分数**：${survey.targetScore || '105-120'} 分\n`;
        md += `- **参考教材与视频**：${survey.usingTextBookcalc || '未指定'} / ${survey.usingVideocalc || '未指定'}\n`;
        md += `- **累计刷题时长**：${inApp.totalTimeSpent ? (inApp.totalTimeSpent / 3600000).toFixed(1) + ' 小时' : '未知'}\n`;
        md += `- **完成辅导 Session**：${inApp.numFinishedTutorSession || 0} 次\n`;
        if (yellowDots.length > 0) {
            const yellowNames = yellowDots.filter(k => !excludeKeys.has(k)).map(k => TOPIC_NAMES[k] || k).join('、');
            if (yellowNames) {
                md += `- ⚠️ **须优先消灭小黄点章节**：${yellowNames}\n`;
            }
        }
        md += `\n`;

        // 2. 核心章节熟练度五级分布 (过滤 0% 与非考纲章节)
        md += `## 2. 核心章节熟练度分布 (Level 1 ~ Level 5)\n\n`;
        md += `| 章节代号 | 章节名称 | 综合熟练度 | 抗生锈熟练度 | L1 (基础%) | L2 (进阶%) | L3 (熟练%) | L4 (拔高%) | L5 (通精%) |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        for (const key in levelsData) {
            if (excludeKeys.has(key)) continue;

            const rates = levelsData[key];
            const safeRates = Array.isArray(rates) ? rates : [0, 0, 0, 0, 0];
            const rawScoreVal = topicScores[key] || 0;
            const noRustyScoreVal = topicWithoutRusty[key] || 0;

            const hasProgress = safeRates.some(r => r > 0) || rawScoreVal > 0 || noRustyScoreVal > 0;
            if (!hasProgress) continue;

            const topicName = TOPIC_NAMES[key] || key;
            const rawScore = (rawScoreVal * 100).toFixed(1) + '%';
            const noRustyScore = (noRustyScoreVal * 100).toFixed(1) + '%';

            const l1 = ((safeRates[0] || 0) * 100).toFixed(1) + '%';
            const l2 = ((safeRates[1] || 0) * 100).toFixed(1) + '%';
            const l3 = ((safeRates[2] || 0) * 100).toFixed(1) + '%';
            const l4 = ((safeRates[3] || 0) * 100).toFixed(1) + '%';
            const l5 = ((safeRates[4] || 0) * 100).toFixed(1) + '%';
            
            md += `| \`${key}\` | **${topicName}** | **${rawScore}** | ${noRustyScore} | ${l1} | ${l2} | ${l3} | ${l4} | ${l5} |\n`;
        }

        // 3. 三维能力拆解 (过滤 0% 章节)
        md += `\n## 3. 知识点三维能力拆解 (概念 / 简单应用 / 综合技巧)\n\n`;
        md += `| 章节代号 | 章节名称 | 💡 概念掌握 (CONCEPTS) | 🛠️ 简单应用 (APPLICATION) | ⚡ 综合技巧 (COMBO) |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- |\n`;

        for (const key in detailed) {
            if (excludeKeys.has(key)) continue;

            const dims = detailed[key];
            if (dims && (dims.CONCEPTS > 0 || dims.SIMPLE_APPLICATION > 0 || dims.COMBO_SKILL > 0)) {
                const topicName = TOPIC_NAMES[key] || key;
                const concepts = (dims.CONCEPTS * 100).toFixed(1) + '%';
                const app = (dims.SIMPLE_APPLICATION * 100).toFixed(1) + '%';
                const combo = (dims.COMBO_SKILL * 100).toFixed(1) + '%';
                md += `| \`${key}\` | **${topicName}** | ${concepts} | ${app} | ${combo} |\n`;
            }
        }

        // 4. 重计算题能力明细 (过滤 0 次接触的章节)
        md += `\n## 4. 重计算题硬核能力明细\n\n`;
        md += `| 章节代号 | 章节名称 | 重计算题接触数 | 独立做对率 | 二次尝试修正次数 |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- |\n`;
        for (const key in compSkillInfo) {
            if (excludeKeys.has(key)) continue;

            const info = compSkillInfo[key];
            if (info && info.num_seen_computational_heavy_problems > 0) {
                const name = TOPIC_NAMES[key] || key;
                const ratio = (info.correct_ratio * 100).toFixed(1) + '%';
                md += `| \`${key}\` | **${name}** | ${info.num_seen_computational_heavy_problems} 题 | **${ratio}** | ${info.num_2nd_attempt_numerical_problems} 次 |\n`;
            }
        }

        // 5. 近期每日刷题与测试正确率明细
        if (mockExam.correctness_info_per_day && mockExam.correctness_info_per_day.length > 0) {
            md += `\n## 5. 近期每日刷题与测试正确率明细\n\n`;
            md += `| 日期 | 综合做题总数 | 做对题数 | 做错题数 | 测验正确率 |\n`;
            md += `| :--- | :--- | :--- | :--- | :--- |\n`;
            mockExam.correctness_info_per_day.forEach(day => {
                const total = day.num_correct_all_stages + day.num_wrong_all_stages;
                const accuracy = total > 0 ? ((day.num_correct_all_stages / total) * 100).toFixed(1) + '%' : '0.0%';
                md += `| ${day.date} | ${total} 题 | ${day.num_correct_all_stages} 题 | ${day.num_wrong_all_stages} 题 | **${accuracy}** |\n`;
            });
        }

        // 6. 做错原因归因与诊断
        if (wrongInfo && wrongInfo.total_num_wrong > 0) {
            md += `\n## 6. 做错原因归因与诊断\n\n`;
            md += `- **记录错题总数**：${wrongInfo.total_num_wrong} 题\n`;
            md += `- **因做题速度过快粗心导致错题**：${wrongInfo.total_num_wrong_due_to_answer_too_fast || 0} 题\n`;
            md += `- **成功通过 Tutor 辅导阶段**：${wrongInfo.total_num_success_tutor_session || 0} 次\n`;
            md += `- **未成功通过 Tutor 辅导阶段**：${wrongInfo.total_num_failed_tutor_session || 0} 次\n`;
        }

        // 7. 近期进步突破排行
        if (changeInfo.cur_week && changeInfo.cur_week.sorted_topics) {
            md += `\n## 7. 近期进步提升轨迹排行\n\n`;
            const validCur = changeInfo.cur_week.sorted_topics.filter(k => !excludeKeys.has(k));
            if (validCur.length > 0) {
                md += `- **本周提升较快章节排行**：${validCur.map(k => TOPIC_NAMES[k] || k).join(' -> ')}\n`;
            }
            if (changeInfo.last_week && changeInfo.last_week.sorted_topics) {
                const validLast = changeInfo.last_week.sorted_topics.filter(k => !excludeKeys.has(k));
                if (validLast.length > 0) {
                    md += `- **上周提升较快章节排行**：${validLast.map(k => TOPIC_NAMES[k] || k).join(' -> ')}\n`;
                }
            }
        }

        return md;
    }

    // ==========================================
    // ECharts 与大屏 UI
    // ==========================================
    let echartsLoaded = false;
    function loadECharts() {
        if (echartsLoaded || document.getElementById('echarts-lib')) return;
        const script = document.createElement('script');
        script.id = 'echarts-lib';
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
        script.onload = () => { echartsLoaded = true; };
        document.head.appendChild(script);
    }

    function createDashboardModal() {
        if (document.getElementById('znx-dashboard-modal')) {
            document.getElementById('znx-dashboard-modal').style.display = 'block';
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'znx-dashboard-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(245, 247, 250, 0.95); z-index: 9999999;
            overflow-y: auto; display: block; padding: 40px; box-sizing: border-box;
            backdrop-filter: blur(10px);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖ 关闭大屏';
        closeBtn.style.cssText = `
            position: fixed; top: 20px; right: 40px; padding: 10px 20px;
            background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px;
            cursor: pointer; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            color: #374151; z-index: 10; transition: all 0.2s;
        `;
        closeBtn.onmouseover = () => { closeBtn.style.background = '#f3f4f6'; };
        closeBtn.onmouseout = () => { closeBtn.style.background = '#ffffff'; };
        closeBtn.onclick = () => { modal.style.display = 'none'; };

        const title = document.createElement('h1');
        title.innerHTML = '📊 知能行数据全景图';
        title.style.cssText = 'text-align: center; color: #1e3a8a; margin-bottom: 30px; font-size: 32px; font-weight: bold;';

        const chartsContainer = document.createElement('div');
        chartsContainer.style.cssText = `
            display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 1400px; margin: 0 auto;
        `;

        const chart1 = document.createElement('div'); chart1.id = 'znx-chart-bar'; chart1.style.cssText = 'background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 30px; grid-column: 1 / -1; overflow-x: auto;';
        const chart2 = document.createElement('div'); chart2.id = 'znx-chart-radar'; chart2.style.cssText = 'height: 450px; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px;';
        const chart3 = document.createElement('div'); chart3.id = 'znx-chart-line'; chart3.style.cssText = 'height: 450px; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px;';
        
        chartsContainer.appendChild(chart1);
        chartsContainer.appendChild(chart2);
        chartsContainer.appendChild(chart3);
        
        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(chartsContainer);
        document.body.appendChild(modal);

        renderCharts();
    }

    function renderCharts() {
        if (!echartsLoaded || !rawFullJson) return;
        const status = rawFullJson.status || {};
        const profile = rawFullJson.profile || {};
        const excludeKeys = getExcludeKeys(profile.examType);

        const filterTopics = (keys) => keys.filter(k => !excludeKeys.has(k) && TOPIC_NAMES[k]);

        // 1. 原生级进度矩阵
        let levelsData = status.progress_report_info?.progress_info_per_topic_all_module || status.topic_to_level_to_progress_with_self_check_obs || {};
        const matrixContainer = document.getElementById('znx-chart-bar');
        
        let matrixHtml = `
            <div style="font-size: 22px; font-weight: bold; text-align: center; color: #1f2937; margin-bottom: 25px;">各章节熟练度分布 (Level 1 - Level 5)</div>
            <table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 800px;">
                <thead>
                    <tr style="border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 15px;">
                        <th style="padding: 15px 10px; text-align: left; width: 20%;">章节名称</th>
                        <th style="padding: 15px 10px; width: 16%;">等级 1 (基础)</th>
                        <th style="padding: 15px 10px; width: 16%;">等级 2 (进阶)</th>
                        <th style="padding: 15px 10px; width: 16%;">等级 3 (熟练)</th>
                        <th style="padding: 15px 10px; width: 16%;">等级 4 (拔高)</th>
                        <th style="padding: 15px 10px; width: 16%;">等级 5 (通精)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // 强行按照原生侧边栏的章节顺序遍历
        TOPIC_ORDER.forEach(k => {
            // 如果用户不是数二，或者该章节不在数二黑名单中
            if (!excludeKeys.has(k)) {
                const rates = levelsData[k] || [0, 0, 0, 0, 0];
                const rawScoreVal = status.topic ? (status.topic[k] || 0) : 0;
                
                // 只有该章节至少有一级进度>0，或者总进度>0才展示
                if (rates.some(r => r > 0) || rawScoreVal > 0) {
                    matrixHtml += `<tr style="border-bottom: 1px solid #f3f4f6;">`;
                    matrixHtml += `<td style="padding: 18px 10px; text-align: left; font-weight: bold; color: #111827; font-size: 16px;">${TOPIC_NAMES[k] || k}</td>`;
                    
                    for (let i = 0; i < 5; i++) {
                        const percent = (rates[i] || 0) * 100;
                        if (percent > 0) {
                            matrixHtml += `
                                <td style="padding: 15px 10px;">
                                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                        <div style="border: 1px solid rgb(69, 101, 155); background: linear-gradient(to right, rgb(121, 179, 82) ${percent}%, white ${percent}%); height: 16px; width: 90%; border-radius: 2px;"></div>
                                        <div style="color: #4b5563; font-size: 13px; font-weight: bold; margin-top: 6px;">${percent.toFixed(1)}%</div>
                                    </div>
                                </td>
                            `;
                        } else {
                            matrixHtml += `
                                <td style="padding: 15px 10px;">
                                    <div style="color: #d1d5db; font-size: 13px; font-weight: 500;">0.0%</div>
                                </td>
                            `;
                        }
                    }
                    matrixHtml += `</tr>`;
                }
            }
        });

        matrixHtml += `</tbody></table>`;
        matrixContainer.innerHTML = matrixHtml;

        // 2. 三维能力雷达图
        const detailed = status.topic_to_detailedProgress || {};
        const radarTopics = filterTopics(Object.keys(detailed)).filter(k => detailed[k].CONCEPTS > 0 || detailed[k].SIMPLE_APPLICATION > 0);
        const indicator = radarTopics.map(k => ({ name: TOPIC_NAMES[k], max: 100 }));
        const valConcepts = [], valApp = [], valCombo = [];
        radarTopics.forEach(k => {
            valConcepts.push((detailed[k].CONCEPTS * 100).toFixed(1));
            valApp.push((detailed[k].SIMPLE_APPLICATION * 100).toFixed(1));
            valCombo.push((detailed[k].COMBO_SKILL * 100).toFixed(1));
        });
        const radarChart = echarts.init(document.getElementById('znx-chart-radar'));
        radarChart.setOption({
            title: { text: '知识点三维能力雷达', left: 'center' },
            tooltip: {},
            legend: { top: 'bottom' },
            radar: { indicator: indicator.length > 0 ? indicator : [{name:'暂无数据', max:100}], radius: '60%' },
            series: [{
                type: 'radar',
                data: [
                    { value: valConcepts, name: '概念掌握' },
                    { value: valApp, name: '简单应用' },
                    { value: valCombo, name: '综合技巧' }
                ]
            }]
        });

        // 3. 近期每日正确率
        const mockExam = status.progress_report_info?.mock_exam_correct_rate_info?.correctness_info_per_day || [];
        const dates = [], acc = [], vol = [];
        mockExam.forEach(day => {
            dates.push(day.date.substring(5)); // MM-DD
            const total = day.num_correct_all_stages + day.num_wrong_all_stages;
            vol.push(total);
            acc.push(total > 0 ? ((day.num_correct_all_stages / total) * 100).toFixed(1) : 0);
        });
        const lineChart = echarts.init(document.getElementById('znx-chart-line'));
        lineChart.setOption({
            title: { text: '近期每日测验正确率与题量', left: 'center' },
            tooltip: { trigger: 'axis' },
            legend: { top: 'bottom' },
            xAxis: { type: 'category', data: dates },
            yAxis: [
                { type: 'value', name: '正确率(%)', max: 100 },
                { type: 'value', name: '做题量', position: 'right' }
            ],
            series: [
                { name: '正确率', type: 'line', data: acc, itemStyle: { color: '#10b981' }, smooth: true },
                { name: '做题量', type: 'bar', yAxisIndex: 1, data: vol, itemStyle: { color: '#93c5fd', opacity: 0.5 } }
            ]
        });
    }

    // ==========================================
    // 创建无缝集成的选项卡 UI
    // ==========================================
    function injectTabs() {
        const tabContainer = document.querySelector('.MuiTabs-flexContainer');
        const historyTab = document.getElementById('modulePageTabs历史');
        
        if (!tabContainer || !historyTab) return;

        // 注入导出选项卡
        if (!document.getElementById('modulePageTabs导出')) {
            const exportBtn = document.createElement('button');
            exportBtn.className = historyTab.className.replace('Mui-selected', '').trim();
            exportBtn.tabIndex = -1;
            exportBtn.type = 'button';
            exportBtn.role = 'tab';
            exportBtn.setAttribute('aria-selected', 'false');
            exportBtn.id = 'modulePageTabs导出';
            
            const historyWrapper = historyTab.querySelector('.MuiTab-wrapper');
            const wrapper = document.createElement('span');
            wrapper.className = historyWrapper ? historyWrapper.className : 'MuiTab-wrapper';

            wrapper.innerHTML = `
                <svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" id="exportIconSvg">
                    <path fill="none" d="M0 0h24v24H0V0z"></path>
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path>
                </svg>
                <span id="exportTabText">导出报告</span>
            `;
            
            const ripple = document.createElement('span'); ripple.className = 'MuiTouchRipple-root';
            exportBtn.appendChild(wrapper); exportBtn.appendChild(ripple);

            exportBtn.addEventListener('click', async () => {
                const textSpan = exportBtn.querySelector('#exportTabText');
                const iconSvg = exportBtn.querySelector('#exportIconSvg');
                const originalText = '导出报告';

                try {
                    textSpan.innerText = '生成中...';
                    
                    let data = rawFullJson;
                    if (!data) data = await fetchFullJsonActively();
                    if (!data) {
                        alert('未能调取到熟练度 JSON 数据，请确认知能行是否已登录并刷新页面！');
                        return;
                    }

                    const reportMarkdown = buildPureMarkdownReport(data);
                    if (!reportMarkdown) {
                        alert('诊断报告生成失败：返回的数据解构缺乏核心状态，请刷新页面重试！');
                        return;
                    }

                    let copySuccess = false;

                    // 1. 优先尝试油猴特权 GM_setClipboard
                    if (typeof GM_setClipboard !== 'undefined') {
                        try {
                            GM_setClipboard(reportMarkdown);
                            copySuccess = true;
                        } catch (e) {
                            console.warn('【知能行 AI 导出器】GM_setClipboard 写入失败:', e);
                        }
                    }

                    // 2. 降级尝试原生 navigator.clipboard.writeText
                    if (!copySuccess && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                        try {
                            await navigator.clipboard.writeText(reportMarkdown);
                            copySuccess = true;
                        } catch (e) {
                            console.warn('【知能行 AI 导出器】navigator.clipboard.writeText 写入失败:', e);
                        }
                    }

                    // 3. UI 反馈与终极 prompt 兜底
                    if (copySuccess) {
                        textSpan.innerText = '复制成功!';
                        textSpan.style.color = '#4ade80';
                        if (iconSvg) iconSvg.style.color = '#4ade80';
                        setTimeout(() => {
                            textSpan.innerText = originalText;
                            textSpan.style.color = '';
                            if (iconSvg) iconSvg.style.color = '';
                        }, 2500);
                    } else {
                        prompt('已成功生成诊断报告 Markdown，请按下 Ctrl+C 复制以下内容：', reportMarkdown);
                    }
                } catch (err) {
                    console.error('【知能行 AI 导出器】导出报告运行时异常:', err);
                    alert('导出报告时发生未捕获异常错误：' + (err.message || err));
                } finally {
                    if (textSpan && textSpan.innerText !== '复制成功!') {
                        textSpan.innerText = originalText;
                    }
                }
            });

            tabContainer.appendChild(exportBtn);
        }

        // 注入数据图表选项卡
        if (!document.getElementById('modulePageTabs图表')) {
            const chartBtn = document.createElement('button');
            chartBtn.className = historyTab.className.replace('Mui-selected', '').trim();
            chartBtn.tabIndex = -1;
            chartBtn.type = 'button';
            chartBtn.role = 'tab';
            chartBtn.setAttribute('aria-selected', 'false');
            chartBtn.id = 'modulePageTabs图表';
            
            const historyWrapper = historyTab.querySelector('.MuiTab-wrapper');
            const wrapper = document.createElement('span');
            wrapper.className = historyWrapper ? historyWrapper.className : 'MuiTab-wrapper';

            // 数据图表图标 (Assessment Icon)
            wrapper.innerHTML = `
                <svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" id="chartIconSvg">
                    <path fill="none" d="M0 0h24v24H0V0z"></path>
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"></path>
                </svg>
                <span id="chartTabText">数据图表</span>
            `;
            
            const ripple = document.createElement('span'); ripple.className = 'MuiTouchRipple-root';
            chartBtn.appendChild(wrapper); chartBtn.appendChild(ripple);

            chartBtn.addEventListener('click', async () => {
                let data = rawFullJson;
                if (!data) data = await fetchFullJsonActively();
                if (!data) {
                    alert('未能调取到熟练度 JSON 数据，请确认知能行是否已登录并刷新页面！'); return;
                }
                if (!echartsLoaded) {
                    alert('图表库 ECharts 正在加载，请稍候再试...'); return;
                }
                createDashboardModal();
            });

            tabContainer.appendChild(chartBtn);
        }
    }


    // ============================================================
    // UNIFIED INITIALIZATION
    // ============================================================
    const exporterObserver = new MutationObserver(() => {
        if (!document.getElementById('modulePageTabs导出') && document.querySelector('.MuiTabs-flexContainer')) {
            injectTabs();
        }
    });

    function unifiedInit() {
        init();
        loadECharts();
        exporterObserver.observe(document.body, { childList: true, subtree: true });
        injectTabs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', unifiedInit);
    } else {
        unifiedInit();
    }
})();
