// ==UserScript==
// @name         知能行 UI 视觉美化与考研助手
// @namespace    http://tampermonkey.net/
// @version      7.3
// @description  为知能行考研数学提供全局毛玻璃视觉升级、Dark Reader 深色模式自适应、Live2D 看板娘与考研倒计时辅助
// @author       winslght
// @icon         https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/icon.png
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[ZhiNengX Enhancer] 知能行视觉美化与助手已启动');

    // ==========================================
    // 0. 可调参数
    // ==========================================
    const defaultParams = {
        A_opacity:   { val: 0.35, min: 0, max: 1,   step: 0.05, label: 'A.顶部导航栏 不透明度' },
        A_blur:      { val: 10,   min: 0, max: 50,  step: 1,    label: 'A.顶部导航栏 模糊' },
        B_opacity:   { val: 0.35, min: 0, max: 1,   step: 0.05, label: 'B.所有卡片面板 不透明度' },
        B_blur:      { val: 10,   min: 0, max: 50,  step: 1,    label: 'B.所有卡片面板 模糊' },
        C_opacity:   { val: 0.8,  min: 0, max: 1,   step: 0.05, label: 'C.行内白色背景 不透明度' },
        C_blur:      { val: 10,   min: 0, max: 50,  step: 1,    label: 'C.行内白色背景 模糊' },
        D_opacity:   { val: 0.8,  min: 0, max: 1,   step: 0.05, label: 'D.弹窗 不透明度' },
        D_blur:      { val: 20,   min: 0, max: 50,  step: 1,    label: 'D.弹窗 模糊' },
        E_opacity:   { val: 0.6,  min: 0, max: 1,   step: 0.05, label: 'E.做题面板(Bootstrap) 不透明度' },
        E_blur:      { val: 5,    min: 0, max: 50,  step: 1,    label: 'E.做题面板(Bootstrap) 模糊' },
        F_opacity:   { val: 0.85, min: 0, max: 1,   step: 0.05, label: 'F.做题页顶栏 不透明度' },
        F_blur:      { val: 15,   min: 0, max: 50,  step: 1,    label: 'F.做题页顶栏 模糊' },
        Dark_glass:  { val: 2,    min: 0, max: 2,   step: 1,    label: '🌙 深色模式 (2自动 1强开 0强关)' },
        Dark_dim:    { val: 0.60, min: 0, max: 0.98,step: 0.05, label: '🌙 壁纸暗化遮光度' },
    };

    let savedParams = {};
    try {
        savedParams = JSON.parse(localStorage.getItem('znx-glass-params')) || {};
    } catch(e) {}

    const params = {};
    for (const key in defaultParams) {
        params[key] = { ...defaultParams[key], val: savedParams[key] !== undefined ? savedParams[key] : defaultParams[key].val };
    }

    let styleEl;

    // ==========================================
    // 1. 生成全局 CSS (使用 CSS 变量，确保实时调节时不闪烁)
    // ==========================================
    // 判断深色模式状态 (2: 自动感应 Dark Reader 插件，1: 强制深色，0: 强制浅色)
    function isDarkModeActive() {
        const mode = params.Dark_glass.val;
        if (mode === 1) return true;
        if (mode === 0) return false;
        
        // 自动联动 Dark Reader 插件检测
        return document.documentElement.hasAttribute('data-darkreader-scheme') || 
               document.documentElement.classList.contains('darkreader') ||
               !!document.querySelector('meta[name="darkreader-theme"]');
    }

    function updateCSSVariables() {
        const root = document.documentElement;
        for (const k in params) {
            root.style.setProperty(`--znx-${k}`, params[k].val);
        }
        
        const darkActive = isDarkModeActive();
        root.classList.toggle('znx-dark-mode', darkActive);
        
        // 遮光罩与深色模式完美联动：
        // 开启 Dark Reader/深色模式时，使用滑块设定的 0.60 舒适遮光度；
        // 关闭 Dark Reader/深色模式时，自动归零遮光罩，还原亮色壁纸原生亮度！
        const overlay = document.getElementById('znx-anime-overlay');
        if (overlay) {
            overlay.style.opacity = darkActive ? params.Dark_dim.val : '0';
        }
    }

    function generateBaseCSS() {
        return `
            /* 定义毛玻璃核心变量，使用 var(--znx-...) 绑定实时滑动值 */
            :root {
                --znx-glass-rgb: 255, 255, 255;
                --znx-tab-text: #444;
                --znx-a-bg: rgba(var(--znx-glass-rgb), var(--znx-A_opacity));
                --znx-a-blur: blur(calc(var(--znx-A_blur) * 1px)) saturate(140%);
                
                --znx-b-bg: rgba(var(--znx-glass-rgb), var(--znx-B_opacity));
                --znx-b-blur: blur(calc(var(--znx-B_blur) * 1px)) saturate(140%);
                
                --znx-c-bg: rgba(var(--znx-glass-rgb), var(--znx-C_opacity));
                --znx-c-blur: blur(calc(var(--znx-C_blur) * 1px));
                
                --znx-d-bg: rgba(var(--znx-glass-rgb), var(--znx-D_opacity));
                --znx-d-blur: blur(calc(var(--znx-D_blur) * 1px));
                
                --znx-e-bg: rgba(var(--znx-glass-rgb), var(--znx-E_opacity));
                --znx-e-blur: blur(calc(var(--znx-E_blur) * 1px));
                
                --znx-f-bg: rgba(var(--znx-glass-rgb), var(--znx-F_opacity));
                --znx-f-blur: blur(calc(var(--znx-F_blur) * 1px)) saturate(160%);
            }

            /* 自动感应 Dark Reader 插件或开启深色模式，切换为黑曜石深色毛玻璃及高亮字体 */
            html[data-darkreader-scheme],
            html.znx-dark-mode {
                --znx-glass-rgb: 20, 22, 28;
                --znx-tab-text: #eee;
            }

            /* 全局透明化，铲除原生底色，但严格避开看板娘和其它外挂组件 */
            #root, #root > div, #root > div > div {
                background: transparent !important;
            }
            body { background-color: transparent !important; }

            /* A. 顶部导航栏 (增加极高权重 html body #root，防止被原站动态样式顶掉) */
            html body #root .MuiAppBar-root {
                background: var(--znx-a-bg) !important;
                backdrop-filter: var(--znx-a-blur) !important;
                -webkit-backdrop-filter: var(--znx-a-blur) !important;
                border: none !important;
                box-shadow: 0 2px 16px rgba(0,0,0,0.08) !important;
            }
            html body #root .MuiAppBar-root .MuiButton-label,
            html body #root .MuiAppBar-root .MuiTab-wrapper,
            html body #root .MuiAppBar-root .MuiToolbar-root span,
            html body #root .MuiAppBar-root .MuiToolbar-root a span {
                color: var(--znx-tab-text) !important;
            }

            /* 进度条保真防护：知能行原生三段式进度条 (height: 16px)，绝对强制 0 圆角与 0 毛玻璃 */
            html body #root div[style*="height: 16px"],
            html body #root div[style*="height:16px"] {
                border-radius: 0 !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            /* 做题界面顶部工具栏 (含 反馈 / 复习 / 退出 这一栏)，使用 F 滑块独立控制高级磨砂 */
            div[class*="_3WnwfR"],
            div[class*="_3r5idY"] {
                background: var(--znx-f-bg) !important;
                backdrop-filter: var(--znx-f-blur) !important;
                -webkit-backdrop-filter: var(--znx-f-blur) !important;
                border: none !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
            }

            /* 只要处于做题状态 (html.znx-doing-questions)，淡隐底部的蓝色导航条；退出做题时，CSS 秒级无痕还原！ */
            html.znx-doing-questions #navigation-pills,
            html.znx-doing-questions #moduleHeader,
            html.znx-doing-questions .MuiTabs-root {
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.2s ease !important;
            }

            /* GPU 硬件加速排版，专为平板/移动端优化，杜绝高频重绘掉帧 */
            html body #root .MuiAppBar-root,
            .MuiPaper-root:not(.MuiAppBar-root):not(.MuiDialog-paper),
            .jumbotron,
            div[class*="_3WnwfR"],
            div[class*="_3r5idY"] {
                transform: translateZ(0);
                will-change: backdrop-filter, transform;
            }
            .MuiPaper-root:not(.MuiAppBar-root):not(.MuiDialog-paper) {
                background: var(--znx-b-bg) !important;
                backdrop-filter: var(--znx-b-blur) !important;
                -webkit-backdrop-filter: var(--znx-b-blur) !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
            }

            /* C. 行内白色背景的 div (利用属性选择器，瞬间生效无闪烁，严格排除进度条三段式容器) */
            div[style*="background-color: white"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color: rgb(255, 255, 255)"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color: #fff"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color:#fff"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background-color: antiquewhite"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background: white;"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background: white !important"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]),
            div[style*="background: antiquewhite"]:not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height:16px"]):not([style*="rgb(69, 101, 155)"]) {
                background: var(--znx-c-bg) !important;
                backdrop-filter: var(--znx-c-blur) !important;
                -webkit-backdrop-filter: var(--znx-c-blur) !important;
                border-radius: 10px !important;
            }

            /* D. 弹窗/对话框 */
            .MuiDialog-paper {
                background: var(--znx-d-bg) !important;
                backdrop-filter: var(--znx-d-blur) !important;
                -webkit-backdrop-filter: var(--znx-d-blur) !important;
            }

            /* E. 做题面板 (Bootstrap) */
            .jumbotron {
                background: var(--znx-e-bg) !important;
                backdrop-filter: var(--znx-e-blur) !important;
                -webkit-backdrop-filter: var(--znx-e-blur) !important;
                border-radius: 12px !important;
                border: 1px solid rgba(255, 255, 255, 0.4) !important;
                box-shadow: 0 4px 16px rgba(0,0,0,0.05) !important;
            }

            /* 其他例外处理 */
            .MuiButtonBase-root, .btn {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            .MuiTabs-indicator { background-color: #1a73e8 !important; }
            footer { background: transparent !important; }
            
            /* 看板娘 (Waifu / Live2D / Landlord) 最高级防护墙，绝对免受任何毛玻璃、透明度、层级覆盖干扰 */
            [id*="waifu"], [id*="live2d"], [id*="landlord"], [class*="waifu"], [class*="live2d"], [class*="landlord"] { 
                z-index: 2147483647 !important; 
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                transform: none !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            [id*="waifu"] canvas, [id*="live2d"] canvas, [id*="landlord"] canvas, [class*="waifu"] canvas, [class*="live2d"] canvas {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                transform: none !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            /* 看板娘侧边工具栏 (#waifu-tool) 智能隐藏：平时自动隐藏，鼠标悬停在看板娘身上时才优雅淡入 */
            #waifu-tool {
                opacity: 0 !important;
                transition: opacity 0.3s ease-in-out !important;
                pointer-events: none !important;
            }
            #waifu:hover #waifu-tool,
            #waifu-tool:hover {
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            
            /* 调参面板不受任何影响 */
            #znx-tuner-panel, #znx-tuner-panel * {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            /* 做题底栏动态美化 (做对淡绿 / 做错淡红，调高不透明度至 0.22 更加清晰典雅) */
            .jumbotron[data-znx-result="correct"],
            div[class*="jumbotron"][data-znx-result="correct"] {
                background-color: rgba(34, 197, 94, 0.22) !important;
                border-top: 1px solid rgba(34, 197, 94, 0.5) !important;
                box-shadow: inset 0 1px 20px rgba(34, 197, 94, 0.18) !important;
                transition: all 0.4s ease !important;
            }

            .jumbotron[data-znx-result="wrong"],
            div[class*="jumbotron"][data-znx-result="wrong"] {
                background-color: rgba(239, 68, 68, 0.22) !important;
                border-top: 1px solid rgba(239, 68, 68, 0.5) !important;
                box-shadow: inset 0 1px 20px rgba(239, 68, 68, 0.18) !important;
                transition: all 0.4s ease !important;
            }
        `;
    }

    function initCSS() {
        updateCSSVariables();
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'znx-glass-style';
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = generateBaseCSS();
    }

    // ==========================================
    // 2. 动态捕获 JSS 类的白色背景 (性能优化防抖版，极致降低平板 CPU/内存消耗)
    // ==========================================
    const processedClasses = new Set();
    const excludedClasses = new Set();
    let isProcessingScheduled = false;

    function processDynamicJssClasses() {
        isProcessingScheduled = false;
        const root = document.getElementById('root');
        if (!root) return;
        const appBar = document.querySelector('.MuiAppBar-root');
        
        // 查找所有未被标记处理的容器
        const candidateDivs = root.querySelectorAll('div[class*="jss"]:not(.MuiPaper-root):not([data-znx-checked]), div[class^="_"]:not(.MuiPaper-root):not([data-znx-checked]), div[class*=" _"]:not(.MuiPaper-root):not([data-znx-checked])');
        
        candidateDivs.forEach(el => {
            el.setAttribute('data-znx-checked', '1'); // 标记已检查，避免重复触发 getComputedStyle 导致的强制重排 (Reflow)

            // 【安全避坑】绝不处理看板娘及 Live2D 挂件，防止 WebGL 上下文失效导致看板娘消失！
            if (el.closest('[id*="waifu"], [id*="live2d"], [id*="landlord"], [class*="waifu"], [class*="live2d"]')) return;

            const targetClasses = Array.from(el.classList).filter(c => c.startsWith('jss') || c.startsWith('_'));
            if (targetClasses.length === 0) return;
            
            // 如果这些类都处理过了，直接跳过
            if (targetClasses.every(c => processedClasses.has(c) || excludedClasses.has(c))) return;
            
            // 【安全拦截】绝对不要处理顶栏及其父元素！
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
                    const bgVar = isHeaderBar ? 'var(--znx-a-bg)' : 'var(--znx-c-bg)';
                    const blurVar = isHeaderBar ? 'var(--znx-a-blur)' : 'var(--znx-c-blur)';
                    const borderRadius = isHeaderBar ? '0' : '10px';

                    const style = document.createElement('style');
                    style.className = 'znx-dynamic-glass';
                    style.innerHTML = `
                        .${targetClass} {
                            background: ${bgVar} !important;
                            backdrop-filter: ${blurVar} !important;
                            -webkit-backdrop-filter: ${blurVar} !important;
                            border-radius: ${borderRadius} !important;
                            transform: translateZ(0);
                        }
                    `;
                    document.head.appendChild(style);
                }
            } else {
                targetClasses.forEach(c => excludedClasses.add(c));
            }
        });
    }

    // 性能优化：高频 DOM 变动防抖节流函数
    function scheduleProcessing() {
        injectMainTabButton(); // 确保主导航按钮第一优先级挂载
        if (!isProcessingScheduled) {
            isProcessingScheduled = true;
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => processDynamicJssClasses(), { timeout: 150 });
            } else {
                requestAnimationFrame(() => processDynamicJssClasses());
            }
        }
    }

    // 借鉴 zhinengx_exporter.user.js 的精准注入逻辑
    function injectMainTabButton() {
        // 必须锁定顶栏的主导航按钮 (如“训练”、“进度”、“历史”)，绝不误入子页面选项卡
        const mainNavTab = document.getElementById('modulePageTabs历史') || 
                           document.getElementById('modulePageTabs训练') || 
                           document.getElementById('modulePageTabs进度') ||
                           document.getElementById('modulePageTabs导出') ||
                           document.getElementById('modulePageTabs图表');
        
        if (!mainNavTab) return;
        const tabContainer = mainNavTab.parentElement;
        if (!tabContainer) return;

        if (!document.getElementById('modulePageTabs美化')) {
            const beautifyBtn = document.createElement('button');
            beautifyBtn.className = mainNavTab.className.replace('Mui-selected', '').trim();
            beautifyBtn.tabIndex = -1;
            beautifyBtn.type = 'button';
            beautifyBtn.role = 'tab';
            beautifyBtn.setAttribute('aria-selected', 'false');
            beautifyBtn.id = 'modulePageTabs美化';
            
            const mainWrapper = mainNavTab.querySelector('.MuiTab-wrapper');
            const wrapper = document.createElement('span');
            wrapper.className = mainWrapper ? mainWrapper.className : 'MuiTab-wrapper';

            wrapper.innerHTML = `
                <svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" id="beautifyIconSvg">
                    <path fill="none" d="M0 0h24v24H0V0z"></path>
                    <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path>
                </svg>
                <span id="beautifyTabText">美化面板</span>
            `;
            
            const ripple = document.createElement('span');
            ripple.className = 'MuiTouchRipple-root';
            beautifyBtn.appendChild(wrapper);
            beautifyBtn.appendChild(ripple);

            beautifyBtn.addEventListener('click', () => {
                const panel = document.getElementById('znx-tuner-panel');
                if (panel) {
                    if (panel.style.display === 'none' || !panel.style.display) {
                        panel.style.display = 'block';
                    } else {
                        panel.style.display = 'none';
                    }
                }
            });

            tabContainer.appendChild(beautifyBtn);
        }
    }

    function setupObserver() {
        const observer = new MutationObserver(() => {
            scheduleProcessing();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // 监听 documentElement 的属性变动，实时感应 Dark Reader 插件开关状态
        const darkReaderObserver = new MutationObserver(() => {
            updateCSSVariables();
        });
        darkReaderObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-darkreader-scheme', 'class'] });

        scheduleProcessing(); // 初始执行
    }

    // ==========================================
    // 3. 注入壁纸
    // ==========================================
    function injectAnimeGlassTheme() {
        const bg = document.createElement('div');
        bg.id = 'znx-anime-bg';
        bg.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -999; pointer-events: none;
            background: url('https://t.alcy.cc/ycy') center center / cover no-repeat fixed;
        `;
        
        // 专为 Dark Reader 打造的硬件级黑遮罩层，免疫一切插件劫持
        const overlay = document.createElement('div');
        overlay.id = 'znx-anime-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: #000 !important; pointer-events: none;
            transition: opacity 0.15s ease;
        `;
        bg.appendChild(overlay);

        document.body.appendChild(bg);
        initCSS();
        setupObserver();
    }

    // ==========================================
    // 4. 注入控制面板 (修复了 v4 的显示 Bug)
    // ==========================================
    function injectTunerPanel() {
        // 主面板
        const panel = document.createElement('div');
        panel.id = 'znx-tuner-panel';
        Object.assign(panel.style, {
            position: 'fixed', top: '70px', right: '20px', left: 'auto', width: '320px',
            background: 'rgba(35, 35, 35, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '16px', zIndex: '9999998',
            color: '#eee', fontFamily: 'sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'none' // 默认隐藏主面板
        });

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
                <h3 style="margin:0; font-size: 16px; color: #fff;">⚙️ 界面参数调节面板</h3>
                <button id="znx-tuner-close" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">🔽 收起</button>
            </div>
        `;

        for (const key in params) {
            const p = params[key];
            html += `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                        <span>${p.label}</span>
                        <span id="val-${key}" style="color: #4fc3f7; font-weight: bold;">${p.val}</span>
                    </div>
                    <input type="range" id="slider-${key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.val}" style="width: 100%; cursor: pointer;">
                </div>
            `;
        }

        html += `
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="znx-btn-save" style="flex: 1; padding: 8px; background: #4fc3f7; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">💾 保存参数</button>
                <button id="znx-btn-copy" style="flex: 1; padding: 8px; background: #666; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📋 复制参数</button>
            </div>
        `;
        panel.innerHTML = html;
        document.body.appendChild(panel);

        // 绑定滑块事件 (使用 CSS Variables 极速无缝更新)
        for (const key in params) {
            const slider = document.getElementById(`slider-${key}`);
            const valDisplay = document.getElementById(`val-${key}`);
            slider.addEventListener('input', (e) => {
                const newVal = e.target.value;
                valDisplay.innerText = newVal;
                params[key].val = parseFloat(newVal);
                updateCSSVariables(); // 仅更新 CSS 变量，无需重写整个 style
            });
        }

        // 保存参数
        document.getElementById('znx-btn-save').addEventListener('click', () => {
            const saveObj = {};
            for (const key in params) saveObj[key] = params[key].val;
            localStorage.setItem('znx-glass-params', JSON.stringify(saveObj));
            const btn = document.getElementById('znx-btn-save');
            btn.innerText = '✅ 已保存';
            btn.style.background = '#81c784';
            setTimeout(() => {
                btn.innerText = '💾 保存参数';
                btn.style.background = '#4fc3f7';
            }, 1500);
        });

        document.getElementById('znx-btn-copy').addEventListener('click', () => {
            let text = '我调好的毛玻璃参数值：\n';
            for (const key in params) {
                text += `${params[key].label}: ${params[key].val}\n`;
            }
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById('znx-btn-copy');
                btn.innerText = '✅ 已复制';
                setTimeout(() => btn.innerText = '📋 复制参数', 1500);
            });
        });

        // 面板折叠逻辑
        document.getElementById('znx-tuner-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });
    }

    // ==========================================
    // 5. 考研倒计时悬浮窗
    // ==========================================
    function injectTimeManager() {
        if (document.getElementById('znx-time-manager')) return;
        const widget = document.createElement('div');
        widget.id = 'znx-time-manager';
        widget.style.cssText = `
            position: fixed; top: 50%; right: 20px; transform: translateY(-50%);
            width: 260px; background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 20px;
            padding: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            z-index: 999998; font-family: -apple-system, "PingFang SC", sans-serif;
            color: #333; transition: all 0.3s;
        `;

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
            // 剩余比例 (有颜色的部分代表剩余时间，随着时间流逝往左减少)
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

            const bar = (label, value, ratio, color) => `
                <div style="margin-top:15px">
                  <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-bottom:5px">
                    <span>${label}</span><span style="color:${color}">${value}</span>
                  </div>
                  <div style="width:100%;height:8px;background:rgba(0,0,0,0.1);border-radius:4px;overflow:hidden">
                    <div style="width:${ratio.toFixed(1)}%;height:100%;background:${color};transition:width 1s"></div>
                  </div>
                </div>`;

            widget.innerHTML = `
                <div style="text-align:center;margin-bottom:15px">
                  <h3 style="margin:0;font-size:18px;color:#1e3a8a;font-weight:900">🔥 27考研倒计时</h3>
                  <div style="font-size:42px;font-weight:900;color:#e11d48;line-height:1.2;text-shadow:2px 2px 4px rgba(0,0,0,0.1)">
                    ${daysLeft > 0 ? daysLeft : 0} <span style="font-size:16px;color:#666">天</span>
                  </div>
                  <div style="font-size:13px;color:#475569;font-weight:bold;margin-top:6px;letter-spacing:0.5px">
                    📅 ${todayDateStr}
                  </div>
                </div>
                <hr style="border:none;border-top:1px dashed rgba(0,0,0,0.2);margin:15px 0">
                ${bar('今日剩余', h+'时 '+m+'分 '+s+'秒', todayRemainingRatio, '#3b82f6')}
                ${bar('本周剩余', weekLeft+' 天', weekRemainingRatio, '#10b981')}
                ${bar('本月剩余', monthLeft+' 天', monthRemainingRatio, '#8b5cf6')}`;
        }

        updateTime();
        setInterval(updateTime, 1000);
    }

    // ==========================================
    // 6. 点击特效、音效与撒花
    // ==========================================
    let audioCtx;
    function getAudioCtx() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
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
        const script = document.createElement('script');
        script.id = 'confetti-script';
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
        document.head.appendChild(script);
    }

    const successKeywords = [
        '我的答案正确', '提交答案', '完全会做', '太简单', '掌握了', '消灭',
        '做对了', '答对', '正确', '已掌握', '满分',
        '下一题', '继续', '完成', '显示答案'
    ];

    document.addEventListener('click', (e) => {
        // 【关键防护】如果是代码自动触发的模拟点击 (isTrusted === false)，绝对不触发撒花与音效！
        if (!e.isTrusted) return;

        const btn = e.target.closest('button') || e.target.closest('.MuiButtonBase-root') || e.target.closest('.btn');
        if (!btn) return;
        try { playPopSound(); } catch(err) {}
        const text = (btn.innerText || btn.textContent || '').trim();
        const isSuccess = successKeywords.some(kw => text.includes(kw));
        if (isSuccess && window.confetti) {
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
    // 7. Live2D 看板娘加载函数
    // ==========================================
    function injectLive2D() {
        if (document.getElementById('waifu') || document.getElementById('live2d-widget-script')) return;

        localStorage.removeItem('waifu-display');
        sessionStorage.removeItem('waifu-display');

        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://fastly.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css';
        document.head.appendChild(fa);

        const script = document.createElement('script');
        script.id = 'live2d-widget-script';
        script.src = 'https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js';
        document.body.appendChild(script);
    }

    // ==========================================
    // 8. 自动答题辅助机制 (自动点击下一题/继续，绝不自动提交空答案)
    // ==========================================
    function autoClickNextButton() {
        // 剔除“提交答案”和“显示答案”，防止在未做题时自动提交引发死循环撒花
        const keywords = ['掌握得不错', '做对了', '厉害了', '继续努力', '太棒了', '不错！', '下一个突破口'];
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const buttons = node.querySelectorAll ? node.querySelectorAll('button, .btn, .MuiButtonBase-root') : [];
                        const elementItself = (node.tagName === 'BUTTON' || node.classList?.contains('btn') || node.classList?.contains('MuiButtonBase-root')) ? [node] : [];
                        const allButtons = [...buttons, ...elementItself];

                        allButtons.forEach(button => {
                            if (button.dataset.znxAutoclicked) return;
                            const text = (button.innerText || button.textContent || '').trim();
                            if (text && keywords.some(kw => text.includes(kw))) {
                                button.dataset.znxAutoclicked = 'true';
                                setTimeout(() => {
                                    if (document.body.contains(button)) {
                                        button.click();
                                        console.log('✅ [知能行小助手] 自动点击成功:', text);
                                    }
                                }, 800); // 稍微延迟更像人类，也为了等动画结束
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ==========================================
    // 9. 做题模式感应器 (纯 Class 控制，退出做题时蓝条 100% 秒级还原)
    // ==========================================
    function setupQuestionModeObserver() {
        const checkMode = () => {
            const isDoing = !!document.querySelector('div[class*="_3WnwfR"]');
            document.documentElement.classList.toggle('znx-doing-questions', isDoing);
        };
        const obs = new MutationObserver(checkMode);
        obs.observe(document.body, { childList: true, subtree: true });
        checkMode();
    }

    // ==========================================
    // 10. 底栏做对/做错状态感应器 (精准匹配“答案正确”/“继续”与“答案错误”/“再试一次”)
    // ==========================================
    function setupJumbotronFeedbackObserver() {
        const updateStatus = () => {
            const jumbotron = document.querySelector('.jumbotron, div[class*="jumbotron"]');
            if (!jumbotron) return;

            const text = jumbotron.innerText || jumbotron.textContent || '';
            if (text.includes('答案正确') || text.includes('继续')) {
                jumbotron.setAttribute('data-znx-result', 'correct');
            } else if (text.includes('答案错误') || text.includes('再试一次')) {
                jumbotron.setAttribute('data-znx-result', 'wrong');
            } else {
                jumbotron.removeAttribute('data-znx-result');
            }
        };

        const observer = new MutationObserver(updateStatus);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        updateStatus();
    }

    // ==========================================
    // 启动流程
    // ==========================================
    function init() {
        injectAnimeGlassTheme();
        injectTunerPanel();
        injectTimeManager();
        loadConfettiScript();
        injectLive2D();
        autoClickNextButton();
        setupQuestionModeObserver();
        setupJumbotronFeedbackObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
