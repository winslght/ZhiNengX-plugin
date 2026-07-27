// ==UserScript==
// @name         知能行 UI 视觉美化与考研助手
// @namespace    http://tampermonkey.net/
// @version      8.2.0-dev.3.1
// @description  为知能行考研数学提供全局毛玻璃视觉升级、回车快捷提交/下一步、Dark Reader 深色模式自适应、Live2D 看板娘(多CDN容灾)与考研倒计时(1位小数)辅助
// @author       winslght
// @license      MIT
// @icon         https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/icon.png
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = '8.2.0-dev.3.1';
    console.log(`[ZhiNengX Enhancer] 知能行视觉美化与助手 v${SCRIPT_VERSION} 已启动`);

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
            overlay.style.opacity = isDarkModeActive() ? '0.6' : '0';
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

        window.showFullCountdownCard = (durationMs = 5000) => {
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
                window.showFullCountdownCard(3000);
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

    function injectLive2D() {
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

                const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const monthTotal = eom.getDate();
                const monthLeft = monthTotal - now.getDate();
                const monthExactDays = (monthLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);

                return { daysLeft, h, m, s, todayRemainingRatio, weekExactDays, monthExactDays };
            }

            function updateTimerCapsuleHTML() {
                const info = getCountdownInfo();
                const dark = isDarkModeActive();
                const capsuleEl = document.getElementById('znx-doing-countdown-btn');
                if (capsuleEl) {
                    const renderKey = `${info.daysLeft}-${info.h}:${info.m}-${dark}`;
                    if (capsuleEl.getAttribute('data-znx-render-key') === renderKey) return;
                    capsuleEl.setAttribute('data-znx-render-key', renderKey);

                    capsuleEl.innerHTML = `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">
                            <span style="font-weight:900;color:#e11d48;font-size:12px;display:inline-flex;align-items:center;gap:2px;">🔥 ${info.daysLeft > 0 ? info.daysLeft : 0} <span style="font-size:11px;color:${dark ? '#94a3b8' : '#64748b'};font-weight:700">天</span></span>
                            <span style="font-size:10.5px;color:${dark ? '#38bdf8' : '#3b82f6'};font-weight:800;">${info.h}:${info.m}</span>
                        </div>
                        <div style="width:100%;height:3px;background:rgba(0,0,0,0.12);border-radius:2px;margin-top:2px;overflow:hidden">
                            <div style="width:${info.todayRemainingRatio.toFixed(1)}%;height:100%;background:#3b82f6;transition:width 1s"></div>
                        </div>
                    `;
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
                    transition: all 0.2s ease !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    height: 32px !important;
                    box-sizing: border-box !important;
                `;
            };

            // 1. 📋 复制题目 胶囊按钮
            const copyBtn = document.createElement('button');
            copyBtn.id = BUTTON_ID;
            copyBtn.type = 'button';
            copyBtn.title = '一键纯净提取当前题目与 LaTeX 公式';
            copyBtn.innerHTML = '📋 复制题目';
            copyBtn.style.cssText = getCapsuleStyle() + 'gap: 5px !important;';

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

            // 2. 🔥 27考研倒计时 做题极简胶囊按钮 (与复制按钮同层级同材质，带微型进度条)
            const timerBtn = document.createElement('div');
            timerBtn.id = 'znx-doing-countdown-btn';
            timerBtn.title = '点击查看考研倒计时详细分解';
            timerBtn.style.cssText = getCapsuleStyle() + 'min-width: 120px !important; flex-direction: column !important; justify-content: center !important;';

            timerBtn.onmouseover = () => {
                const dark = isDarkModeActive();
                timerBtn.style.setProperty('transform', 'translateY(-1px)', 'important');
                timerBtn.style.setProperty('border-color', dark ? 'rgba(56, 189, 248, 0.8)' : 'rgba(56, 189, 248, 0.6)', 'important');
            };
            timerBtn.onmouseout = () => {
                timerBtn.style.setProperty('transform', 'none', 'important');
                timerBtn.style.setProperty('border-color', isDarkModeActive() ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.75)', 'important');
            };

            timerBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.showFullCountdownCard) {
                    window.showFullCountdownCard(5000);
                }
            };

            toolsBar.appendChild(copyBtn);
            toolsBar.appendChild(timerBtn);

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
