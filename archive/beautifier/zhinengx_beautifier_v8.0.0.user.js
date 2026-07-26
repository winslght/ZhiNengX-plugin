// ==UserScript==
// @name         知能行 UI 视觉美化与考研助手
// @namespace    http://tampermonkey.net/
// @version      8.5.0
// @description  为知能行考研数学提供全局毛玻璃视觉升级、左侧抽屉平移网易云音乐考研播放器 (预置沉浸自习/雨声轻音乐/Lofi歌单+自定义歌单ID)、回车快捷提交/下一步、fghrsh 海量 Live2D 看板娘/换装/考研金句陪伴、Dark Reader 深色自适应与倒计时
// @author       winslght
// @license      MIT
// @icon         https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/icon.png
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[ZhiNengX Enhancer] 知能行视觉美化与助手 v8.2.1 已就绪');

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

            /* 进度条绝对防护：绝对保留经验值/等级进度条原生填充色彩，禁止被透明毛玻璃覆盖 */
            .MuiLinearProgress-root, .MuiLinearProgress-bar, div[role="progressbar"], [class*="progress"], [class*="Progress"] {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            .MuiLinearProgress-bar, div[role="progressbar"] > div, [class*="progress"] > div {
                opacity: 1 !important;
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

            /* G. 做题底栏做对/做错毛玻璃 (精准锁定底栏，绝不误伤题卡与关联题) */
            html.znx-doing-questions [data-znx-result="correct"] {
                background: rgba(34, 197, 94, 0.4) !important;
                backdrop-filter: blur(8px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
                border-top: 1.5px solid rgba(34, 197, 94, 0.8) !important;
                box-shadow: 0 -4px 20px rgba(34, 197, 94, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
                transition: background 0.2s ease !important;
            }
            html.znx-doing-questions [data-znx-result="correct"] div {
                background: transparent !important;
                box-shadow: none !important;
            }

            html.znx-doing-questions [data-znx-result="wrong"] {
                background: rgba(239, 68, 68, 0.4) !important;
                backdrop-filter: blur(8px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
                border-top: 1.5px solid rgba(239, 68, 68, 0.8) !important;
                box-shadow: 0 -4px 20px rgba(239, 68, 68, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
                transition: background 0.2s ease !important;
            }
            html.znx-doing-questions [data-znx-result="wrong"] div {
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
            // 排除所有进度条元素
            if (el.closest('.MuiLinearProgress-root, [role="progressbar"], [class*="progress"], [class*="Progress"], [style*="height: 16px"], [style*="height:16px"]')) return;

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
            const weekRemainingRatio = ((weekLeft + (todayMs / (24 * 60 * 60 * 1000))) / 7) * 100;

            const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthTotal = eom.getDate();
            const monthLeft = monthTotal - now.getDate();
            const monthRemainingRatio = ((monthLeft + (todayMs / (24 * 60 * 60 * 1000))) / monthTotal) * 100;

            const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const todayDateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;

            const bar = (label, value, ratio, color) => `<div style="margin-top:15px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-bottom:5px"><span>${label}</span><span style="color:${color}">${value}</span></div><div style="width:100%;height:8px;background:rgba(0,0,0,0.1);border-radius:4px;overflow:hidden"><div style="width:${ratio.toFixed(1)}%;height:100%;background:${color};transition:width 1s"></div></div></div>`;

            widget.innerHTML = `<div style="text-align:center;margin-bottom:15px"><h3 style="margin:0;font-size:18px;color:#1e3a8a;font-weight:900">🔥 27考研倒计时</h3><div style="font-size:42px;font-weight:900;color:#e11d48;line-height:1.2;text-shadow:2px 2px 4px rgba(0,0,0,0.1)">${daysLeft > 0 ? daysLeft : 0} <span style="font-size:16px;color:#666">天</span></div><div style="font-size:13px;color:#475569;font-weight:bold;margin-top:6px;letter-spacing:0.5px">📅 ${todayDateStr}</div></div><hr style="border:none;border-top:1px dashed rgba(0,0,0,0.2);margin:15px 0">${bar('今日剩余', h+'时 '+m+'分 '+s+'秒', todayRemainingRatio, '#3b82f6')}${bar('本周剩余', weekLeft+' 天', weekRemainingRatio, '#10b981')}${bar('本月剩余', monthLeft+' 天', monthRemainingRatio, '#8b5cf6')}`;
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
    // 7. Live2D 看板娘与考研专属互动小助手 (接入 fghrsh 全量模型库与换装系统)
    // ==========================================
    function injectLive2D() {
        if (document.getElementById('waifu') || document.getElementById('live2d-widget-script')) return;

        localStorage.removeItem('waifu-display');
        sessionStorage.removeItem('waifu-display');

        // 加载 Font-Awesome 图标库
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://fastly.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css';
        document.head.appendChild(fa);

        // 使用支持全量模型库 apiPath / cdnPath 的全局配置
        window.live2d_settings = {
            modelId: 1,                  // 默认模型：Pio (药水制作师) / 可自由切换海量角色
            modelTexturesId: 53,         // 默认服装皮肤
            modelStorage: true,          // 自动记忆用户选择的人物与服装
            canCloseLive2D: true,        // 允许隐藏看板娘
            canSwitchModel: true,        // 允许一键切换角色人物 (包含碧蓝航线/2233/初音/海王星等)
            canSwitchTexture: true,      // 允许一键切换角色服装皮肤 (换装系统)
            canSwitchHitokoto: true,     // 允许切换一言/考研金句
            canTakeScreenshot: true,     // 允许拍照截图
            canTurnToHomePage: false,
            waifuSize: '280x250',        // 尺寸大小
            waifuTipsSize: '250x70',     // 提示框尺寸
            waifuFontSize: '12px',       // 提示框字号
            waifuToolFont: '14px',       // 工具栏按钮字号
            waifuToolOpacity: '0.85',    // 工具栏透明度
            waifuToolPosition: 'right',  // 工具栏靠右排列
            aboutPageUrl: 'https://github.com/winslght/ZhiNengX-plugin',
            // 接入国内高速访问的 fghrsh 海量 Live2D 模型 API
            cdnPath: 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/',
            apiPath: 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/'
        };

        const s = document.createElement('script');
        s.id = 'live2d-widget-script';
        s.src = 'https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js';
        document.body.appendChild(s);

        // 注入考研专属陪伴互动提示语
        setupKaoyanWaifuTips();
    }

    function setupKaoyanWaifuTips() {
        const welcomeMsgs = [
            "✨ 欢迎！今天也要元气满满哦！",
            "🔥 坚持就是胜利，考研人加油！",
            "🎯 开始消灭今天的突破口吧！",
            "💡 保持专注，每一题都是进步！",
            "🚀 乾坤未定，你我皆是黑马！"
        ];
        const getRandomWelcome = () => welcomeMsgs[Math.floor(Math.random() * welcomeMsgs.length)];

        // 拦截并替换原脚本空的“欢迎阅读『』”提示
        const observer = new MutationObserver(() => {
            const tips = document.getElementById('waifu-tips');
            if (tips) {
                const text = (tips.innerText || tips.textContent || '').trim();
                if (text.includes('欢迎阅读') || text.includes('『』') || text === '欢迎阅读『』' || text.endsWith('『』')) {
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
            } else if (target.closest('#znx-time-manager')) {
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

    function showWaifuTip(text, timeout = 3000) {
        const tips = document.getElementById('waifu-tips');
        if (!tips) return;
        tips.innerHTML = text;
        tips.classList.add('waifu-tips-active');
        tips.style.opacity = '1';
        clearTimeout(window.znxWaifuTimer);
        window.znxWaifuTimer = setTimeout(() => {
            tips.style.opacity = '0';
            tips.classList.remove('waifu-tips-active');
        }, timeout);
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
    // 10. 底栏做对/做错状态感应器 (完美防误伤与防跨层染色)
    // ==========================================
    function setupJumbotronFeedbackObserver() {
        const updateStatus = () => {
            const isDoing = document.documentElement.classList.contains('znx-doing-questions');
            
            // 全局清理函数
            const clearFeedbackStyles = () => {
                document.querySelectorAll('[data-znx-result]').forEach(el => {
                    el.removeAttribute('data-znx-result');
                    ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-top', 'box-shadow'].forEach(p => el.style.removeProperty(p));
                    el.querySelectorAll('div').forEach(c => c.style.removeProperty('background'));
                });
            };

            if (!isDoing) {
                clearFeedbackStyles();
                return;
            }

            // 查找做题底栏的关键动作按钮
            const buttons = Array.from(document.querySelectorAll('button, .btn, .MuiButtonBase-root'));
            const actionBtn = buttons.find(b => {
                const t = (b.innerText || b.textContent || '').trim();
                return t.includes('提交答案') || t.includes('继续') || t.includes('再试一次') || t.includes('查看题解');
            });

            if (!actionBtn) {
                clearFeedbackStyles();
                return;
            }

            // 核心修复：精准定位最外层的底栏容器，绝不选到包含题目卡片（_3WnwfR）的大容器！
            let targetBar = actionBtn.closest('div[class*="_1JpWFCTNY81yLAVb14XE8H"]')?.parentElement ||
                            actionBtn.closest('div[class*="_1ktiDhx"]') ||
                            actionBtn.closest('div[class*="_3o6JR"]');

            // 如果找到的容器包含题目主体 (_3WnwfR)，说明找得太高了，降级锁定 actionBtn 所在的上一层父容器
            if (targetBar && (targetBar.querySelector('div[class*="_3WnwfR"]') || targetBar.innerText.includes('已掌握的有关联的题'))) {
                targetBar = actionBtn.parentElement?.parentElement || actionBtn.parentElement;
            }

            if (!targetBar) return;

            // 核心修复：排除所有弹窗 (Dialog) 影响！弹窗里的“确认查看”、“再试一次”不能干扰主做题判定
            let fullPageText = '';
            const rootEl = document.getElementById('root') || document.body;
            if (document.querySelector('.MuiDialog-root')) {
                const clone = rootEl.cloneNode(true);
                clone.querySelectorAll('.MuiDialog-root, .MuiDialog-paper, #znx-time-manager, #waifu').forEach(n => n.remove());
                fullPageText = clone.innerText || '';
            } else {
                fullPageText = rootEl.innerText || '';
            }

            // 1. 最高优先级：判定做错 / 超时 / 放弃场景
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

            // 保证同时只有一个底栏被染色，清除其他误染色的节点
            document.querySelectorAll('[data-znx-result]').forEach(el => {
                if (el !== targetBar) {
                    el.removeAttribute('data-znx-result');
                    ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-top', 'box-shadow'].forEach(p => el.style.removeProperty(p));
                    el.querySelectorAll('div').forEach(c => c.style.removeProperty('background'));
                }
            });

            const children = targetBar.querySelectorAll('div');

            if (isCorrect) {
                targetBar.setAttribute('data-znx-result', 'correct');
                targetBar.style.setProperty('background', 'rgba(34, 197, 94, 0.4)', 'important');
                targetBar.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
                targetBar.style.setProperty('-webkit-backdrop-filter', 'blur(8px)', 'important');
                targetBar.style.setProperty('border-top', '1.5px solid rgba(34, 197, 94, 0.8)', 'important');
                targetBar.style.setProperty('box-shadow', '0 -4px 20px rgba(34, 197, 94, 0.25)', 'important');
                children.forEach(c => c.style.setProperty('background', 'transparent', 'important'));
            } else if (isWrong) {
                targetBar.setAttribute('data-znx-result', 'wrong');
                targetBar.style.setProperty('background', 'rgba(239, 68, 68, 0.4)', 'important');
                targetBar.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
                targetBar.style.setProperty('-webkit-backdrop-filter', 'blur(8px)', 'important');
                targetBar.style.setProperty('border-top', '1.5px solid rgba(239, 68, 68, 0.8)', 'important');
                targetBar.style.setProperty('box-shadow', '0 -4px 20px rgba(239, 68, 68, 0.25)', 'important');
                children.forEach(c => c.style.setProperty('background', 'transparent', 'important'));
            } else {
                targetBar.removeAttribute('data-znx-result');
                ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-top', 'box-shadow'].forEach(p => targetBar.style.removeProperty(p));
                children.forEach(c => c.style.removeProperty('background'));
            }
        };

        new MutationObserver(updateStatus).observe(document.body, { childList: true, subtree: true, characterData: true });
        updateStatus();
    }

    // ==========================================
    // 11. 网易云考研音乐播放器 (支持预置考研歌单/自定义歌单与左侧抽屉平移动画)
    // ==========================================
    function injectNetEasePlayer() {
        if (document.getElementById('znx-netease-player')) return;

        const PRESET_PLAYLISTS = [
            { name: '🎹 考研沉浸自习', id: '2424911252' },
            { name: '🌧️ 雨声与轻音乐', id: '26467411' },
            { name: '☕ Lo-Fi 轻松复习', id: '2829883282' },
            { name: '🎻 史诗纯音乐打气', id: '4790176' }
        ];

        const savedPlaylistId = localStorage.getItem('znx_netease_playlist_id') || PRESET_PLAYLISTS[0].id;

        const container = document.createElement('div');
        container.id = 'znx-netease-player';
        container.className = 'znx-netease-collapsed';

        const style = document.createElement('style');
        style.textContent = `
            #znx-netease-player {
                position: fixed;
                left: 0;
                top: 50%;
                width: 340px;
                height: 510px;
                z-index: 999998;
                background: rgba(255, 255, 255, 0.45);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-left: none;
                border-radius: 0 16px 16px 0;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                color: #2c3e50;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                user-select: none;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            html.dark #znx-netease-player, [data-darkreader-scheme="dark"] #znx-netease-player {
                background: rgba(30, 41, 59, 0.75) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-left: none !important;
                color: #f1f5f9 !important;
            }
            #znx-netease-player.znx-netease-collapsed {
                transform: translateY(-50%) translateX(-340px);
            }
            #znx-netease-player.znx-netease-expanded {
                transform: translateY(-50%) translateX(0);
            }
            .znx-netease-tab {
                position: absolute;
                right: -36px;
                top: 50%;
                transform: translateY(-50%);
                width: 36px;
                height: 120px;
                background: rgba(255, 255, 255, 0.45);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-left: none;
                border-radius: 0 12px 12px 0;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 12px;
                font-weight: 600;
                writing-mode: vertical-lr;
                letter-spacing: 2px;
                box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08);
            }
            html.dark .znx-netease-tab, [data-darkreader-scheme="dark"] .znx-netease-tab {
                background: rgba(30, 41, 59, 0.75) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-left: none !important;
                color: #f1f5f9 !important;
            }
            .znx-netease-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 8px;
                padding-bottom: 6px;
                border-bottom: 1px solid rgba(0,0,0,0.06);
            }
            html.dark .znx-netease-header {
                border-bottom-color: rgba(255,255,255,0.1);
            }
            .znx-netease-close-btn {
                cursor: pointer;
                font-size: 12px;
                opacity: 0.7;
                padding: 2px 6px;
                border-radius: 6px;
                background: rgba(0,0,0,0.05);
            }
            .znx-netease-close-btn:hover {
                opacity: 1;
                background: rgba(0,0,0,0.1);
            }
            .znx-netease-toolbar {
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
            }
            .znx-netease-select {
                flex: 1;
                padding: 4px 8px;
                font-size: 12px;
                border-radius: 8px;
                border: 1px solid rgba(0,0,0,0.1);
                background: rgba(255,255,255,0.6);
                color: #2c3e50;
                outline: none;
                cursor: pointer;
            }
            html.dark .znx-netease-select {
                background: rgba(15, 23, 42, 0.6);
                color: #f1f5f9;
                border-color: rgba(255,255,255,0.15);
            }
            .znx-netease-iframe-box {
                flex: 1;
                width: 100%;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .znx-netease-iframe-box iframe {
                width: 100%;
                height: 100%;
                border: none;
            }
        `;
        document.head.appendChild(style);

        container.innerHTML = `
            <div class="znx-netease-tab">
                <span class="znx-sound-icon">🎵</span>
                <span>网易云</span>
                <span style="font-size:10px;">▶</span>
            </div>
            <div class="znx-netease-full-content" style="display:flex; flex-direction:column; height:100%;">
                <div class="znx-netease-header">
                    <span>🎵 网易云考研音乐</span>
                    <span class="znx-netease-close-btn">◀ 收起</span>
                </div>
                <div class="znx-netease-toolbar">
                    <select class="znx-netease-select">
                        ${PRESET_PLAYLISTS.map(p => `<option value="${p.id}" ${p.id === savedPlaylistId ? 'selected' : ''}>${p.name}</option>`).join('')}
                        <option value="custom">➕ 自定义歌单 ID</option>
                    </select>
                </div>
                <div class="znx-netease-iframe-box">
                    <iframe id="znx-netease-iframe" src="https://music.163.com/outchain/player?type=0&id=${savedPlaylistId}&auto=0&height=430" frameborder="no" border="0" marginwidth="0" marginheight="0"></iframe>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        const tab = container.querySelector('.znx-netease-tab');
        const closeBtn = container.querySelector('.znx-netease-close-btn');
        const select = container.querySelector('.znx-netease-select');
        const iframe = container.querySelector('#znx-netease-iframe');

        tab.addEventListener('click', () => {
            container.classList.remove('znx-netease-collapsed');
            container.classList.add('znx-netease-expanded');
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.remove('znx-netease-expanded');
            container.classList.add('znx-netease-collapsed');
        });

        select.addEventListener('change', (e) => {
            let playlistId = e.target.value;
            if (playlistId === 'custom') {
                const userInput = prompt('请输入您的网易云歌单 ID (可直接复制歌单链接中的 id 数字):');
                if (userInput) {
                    const match = userInput.match(/id=(\d+)/) || userInput.match(/(\d+)/);
                    if (match && match[1]) {
                        playlistId = match[1];
                        localStorage.setItem('znx_netease_playlist_id', playlistId);
                    } else {
                        alert('无法解析歌单 ID，请重新输入！');
                        return;
                    }
                } else {
                    return;
                }
            } else {
                localStorage.setItem('znx_netease_playlist_id', playlistId);
            }
            iframe.src = `https://music.163.com/outchain/player?type=0&id=${playlistId}&auto=0&height=430`;
        });
    }

    // ==========================================
    // 启动
    // ==========================================
    function init() {
        injectAnimeGlassTheme();
        injectTimeManager();
        injectNetEasePlayer();
        loadConfettiScript();
        injectLive2D();
        setupEnterKeySubmitHandler();
        setupQuestionModeObserver();
        setupJumbotronFeedbackObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
