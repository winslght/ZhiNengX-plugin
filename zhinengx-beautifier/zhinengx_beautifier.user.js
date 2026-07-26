// ==UserScript==
// @name         知能行 UI 视觉美化与考研助手
// @namespace    http://tampermonkey.net/
// @version      8.2.0-beta.1
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

    const SCRIPT_VERSION = '8.2.0-beta.1';
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

            /* 进度条保真防护 */
            html body #root div[style*="height: 16px"],
            html body #root div[style*="height:16px"] {
                border-radius: 0 !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
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
    function injectTimeManager() {
        if (document.getElementById('znx-time-manager')) return;
        const widget = document.createElement('div');
        widget.id = 'znx-time-manager';
        widget.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);width:260px;background:rgba(255,255,255,0.75);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.6);border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.1);z-index:999998;font-family:-apple-system,"PingFang SC",sans-serif;color:#333;transition:all 0.3s;';

        widget.onmouseenter = () => widget.style.transform = 'translateY(-50%) scale(1.02)';
        widget.onmouseleave = () => widget.style.transform = 'translateY(-50%) scale(1)';
        document.body.appendChild(widget);

        const targetDate = new Date('2026-12-19T00:00:00').getTime();

        function updateTime() {
            const now = new Date();
            const diffMs = targetDate - now.getTime();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            const todayMs = endOfDay - now;
            const h = Math.floor(todayMs / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((todayMs / (1000 * 60)) % 60).toString().padStart(2, '0');
            const s = Math.floor((todayMs / 1000) % 60).toString().padStart(2, '0');
            const todayRemainingRatio = (todayMs / (24 * 60 * 60 * 1000)) * 100;

            let dow = now.getDay(); if (dow === 0) dow = 7;
            const weekLeft = 7 - dow;
            const weekExactDays = (weekLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);
            const weekRemainingRatio = ((weekLeft + (todayMs / (24 * 60 * 60 * 1000))) / 7) * 100;

            const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthTotal = eom.getDate();
            const monthLeft = monthTotal - now.getDate();
            const monthExactDays = (monthLeft + (todayMs / (24 * 60 * 60 * 1000))).toFixed(1);
            const monthRemainingRatio = ((monthLeft + (todayMs / (24 * 60 * 60 * 1000))) / monthTotal) * 100;

            const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const todayDateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;

            const bar = (label, value, ratio, color) => `<div style="margin-top:15px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-bottom:5px"><span>${label}</span><span style="color:${color}">${value}</span></div><div style="width:100%;height:8px;background:rgba(0,0,0,0.1);border-radius:4px;overflow:hidden"><div style="width:${ratio.toFixed(1)}%;height:100%;background:${color};transition:width 1s"></div></div></div>`;

            widget.innerHTML = `<div style="text-align:center;margin-bottom:15px"><h3 style="margin:0;font-size:18px;color:#1e3a8a;font-weight:900">🔥 27考研倒计时</h3><div style="font-size:42px;font-weight:900;color:#e11d48;line-height:1.2;text-shadow:2px 2px 4px rgba(0,0,0,0.1)">${daysLeft > 0 ? daysLeft : 0} <span style="font-size:16px;color:#666">天</span></div><div style="font-size:13px;color:#475569;font-weight:bold;margin-top:6px;letter-spacing:0.5px">📅 ${todayDateStr}</div></div><hr style="border:none;border-top:1px dashed rgba(0,0,0,0.2);margin:15px 0">${bar('今日剩余', h+'时 '+m+'分 '+s+'秒', todayRemainingRatio, '#3b82f6')}${bar('本周剩余', weekExactDays+' 天', weekRemainingRatio, '#10b981')}${bar('本月剩余', monthExactDays+' 天', monthRemainingRatio, '#8b5cf6')}`;
        }

        updateTime();
        setInterval(updateTime, 1000);
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
        // 如果已经成功渲染出 waifu 容器，无需重复注入
        if (document.getElementById('waifu')) return;

        // 清除可能残留的失败 script 节点
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
            if (!document.getElementById('waifu')) {
                injectLive2D();
            }
        }, backoffDelay);
    }

    function setupLive2DHealthGuard() {
        if (live2dHealthGuardTimer) clearTimeout(live2dHealthGuardTimer);

        // 脚本插入 8 秒后检测 #waifu 节点是否存在
        live2dHealthGuardTimer = setTimeout(() => {
            const waifu = document.getElementById('waifu');
            if (!waifu) {
                console.warn('[ZhiNengX Live2D] ⚠️ 8 秒内未检测到 #waifu 渲染节点 (可能网络超时)，启动健康保底重试...');
                const oldScript = document.getElementById('live2d-widget-script');
                if (oldScript) oldScript.remove();
                live2dCdnIndex++;
                scheduleLive2DRetry(3000);
            } else {
                console.log('[ZhiNengX Live2D] ✅ 看板娘健康校验通过 (#waifu 已渲染)');
                live2dRetryCount = 0; // 校验成功，重置计数器
            }
        }, 8000);
    }

    // ==========================================
    // 8. 回车快捷键辅助 (填完答案按回车直接触发：提交答案 / 继续 / 下一步)
    // ==========================================
    function setupEnterKeySubmitHandler() {
        document.addEventListener('keydown', (e) => {
            // 输入法输入选词时不触发 (防止中文输入法敲回车误触发)
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' || e.keyCode === 13) {
                const buttons = Array.from(document.querySelectorAll('button, .btn, .MuiButtonBase-root'));
                const actionKeywords = ['提交答案', '继续', '下一步', '再试一次', '查看题解'];

                let targetBtn = null;
                for (const kw of actionKeywords) {
                    targetBtn = buttons.find(b => {
                        const t = (b.innerText || b.textContent || '').trim();
                        return t.includes(kw) && !t.includes('继续训练');
                    });
                    if (targetBtn) break;
                }

                if (targetBtn && document.body.contains(targetBtn)) {
                    e.preventDefault();
                    targetBtn.click();
                    console.log('⚡ [知能行小助手] 回车按键触发点击:', targetBtn.innerText.trim());
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
    // 启动
    // ==========================================
    function init() {
        injectAnimeGlassTheme();
        injectTimeManager();
        loadConfettiScript();
        injectLive2D();
        setupEnterKeySubmitHandler();
        setupQuestionModeObserver();
        setupJumbotronFeedbackObserver();
        injectDevVersionBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
