// ==UserScript==
// @name         [ZhiNengX] 页面快照收集器
// @namespace    https://github.com/winslght/ZhiNengX
// @version      2.1.0
// @description  把知能行的页面状态拍成离线快照（双视图 + 插件产物清单 + 公式真值表），支持自动连拍与一键导出合集，用于插件开发与回归测试
// @author       winslght
// @license      MIT
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @noframes
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * 用法一（推荐）：Tampermonkey 安装本文件，之后在知能行页面按热键。
 * 用法二：全选本文件 → F12 → Console → 粘贴 → 回车（刷新即失效，但能力相同）。
 *
 * 热键（Ctrl/Cmd + Shift + …）：
 *   S  拍下当前状态（存进本地快照库并写入选定文件夹）
 *   A  开关自动连拍（页面状态变化并稳定后自动拍，默认关闭）
 *   E  导出合集（一个可双击打开的 HTML，内含全部状态与索引）
 *   X  清空本地快照库（会二次确认）
 *
 * 设计要点：
 *   1. 快照存 IndexedDB 而不是立刻下载，避免刷屏式下载拦截，也方便连续拍摄。
 *   2. 每张快照都保留「插件后 / 原版」两棵 DOM，以及插件产物清单。
 *   3. 额外记录 MathJax/KaTeX 公式真值表（TeX 源码），用于校验「复制题目」功能的输出。
 *   4. 拍摄前会把收集器自己的 UI 从克隆树里剔除，不污染画面。
 */

(function () {
    'use strict';

    const VERSION = '2.1.0';
    const NS = '__ZNX_SNAPSHOT__';
    if (window[NS]) {
        try { window[NS].toast('快照收集器已在运行'); } catch (err) { /* noop */ }
        return;
    }

    const ORIGIN = location.origin;
    const DB_NAME = 'znx_snapshot_db';
    const DB_STORE = 'shots';
    const DB_VERSION = 2;
    const SETTINGS_STORE = 'settings';
    let directoryHandle = null;
    const MAX_SHOTS = 80;

    const UI_PREFIX = 'znx-snapshot-';
    const PLUGIN_NODE_IDS = new Set([
        'waifu', 'waifu-toggle', 'waifu-tool',
        'live2d-widget-script', 'live2d-fa-css', 'confetti-script',
        'modulePageTabs美化'
    ]);
    const ABSOLUTE_URL_RE = /^(?:data:|blob:|https?:|\/\/|#)/i;

    /* ============================================================
     * 1. 基础工具
     * ============================================================ */

    const pad2 = (n) => String(n).padStart(2, '0');

    function timeStamp(d) {
        const date = d || new Date();
        return [
            date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())
        ].join('') + '-' + [pad2(date.getHours()), pad2(date.getMinutes()), pad2(date.getSeconds())].join('');
    }

    function esc(str) {
        return String(str).replace(/[&<>"]/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
        ));
    }

    function hash32(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(36);
    }

    function download(name, text, mime) {
        const blob = new Blob([text], { type: mime || 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        (document.body || document.documentElement).appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return blob.size;
    }

    function rebaseCssUrls(css, cssUrl) {
        return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, raw) => {
            const value = String(raw).trim();
            if (!value || ABSOLUTE_URL_RE.test(value)) return full;
            try {
                return 'url("' + new URL(value, cssUrl).href + '")';
            } catch (err) {
                return full;
            }
        });
    }

    /** 便于人读的节点路径，最多 5 层 */
    function describePath(el, root) {
        const parts = [];
        let node = el;
        let depth = 0;
        while (node && node !== root && depth < 5) {
            let seg = (node.tagName || '?').toLowerCase();
            if (node.id) seg += '#' + node.id;
            const cls = node.getAttribute && node.getAttribute('class');
            if (cls) seg += '.' + cls.trim().split(/\s+/).slice(0, 2).join('.');
            parts.unshift(seg);
            node = node.parentElement;
            depth++;
        }
        return parts.join(' > ').slice(0, 160);
    }

    /* ============================================================
     * 2. 公式真值表（用于校验「复制题目/解析」功能）
     * ============================================================ */

    function collectMathTruth() {
        const truth = { katex: [], mathjax: [], mathjaxUnavailable: false, mathmlFallback: [] };

        document.querySelectorAll('.katex').forEach((el) => {
            const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
            const tex = annotation && annotation.textContent ? annotation.textContent.trim() : '';
            truth.katex.push({
                tex: tex || null,
                block: !!el.closest('.katex-display')
            });
        });

        let jaxList = null;
        try {
            const hub = window.MathJax && window.MathJax.Hub;
            if (hub && typeof hub.getAllJax === 'function') jaxList = hub.getAllJax();
        } catch (err) { /* noop */ }

        if (jaxList && jaxList.length) {
            jaxList.slice(0, 200).forEach((jax) => {
                const tex = jax && (jax.originalText || (jax.root && jax.root.tex) || '');
                truth.mathjax.push({
                    inputID: (jax && (jax.inputID || jax.id)) || '',
                    tex: tex ? String(tex) : null
                });
            });
        } else {
            // 运行时拿不到 MathJax 时，退化为记录 MathML（顺序与渲染节点一致）
            truth.mathjaxUnavailable = true;
            document.querySelectorAll('.MathJax_SVG[data-mathml], .MathJax_SVG_Display[data-mathml]')
                .forEach((el) => {
                    truth.mathmlFallback.push({
                        mathml: (el.getAttribute('data-mathml') || '').slice(0, 2000),
                        block: el.classList.contains('MathJax_SVG_Display')
                    });
                });
        }

        truth.summary = {
            katexNodes: truth.katex.length,
            mathjaxNodes: document.querySelectorAll('.MathJax_SVG, .MathJax_SVG_Display').length,
            mathScripts: document.querySelectorAll('script[type^="math/"]').length,
            previewNodes: document.querySelectorAll('.MathJax_Preview').length,
            texSourcesAvailable: truth.katex.length + truth.mathjax.length
        };
        return truth;
    }

    /* ============================================================
     * 3. 插件产物识别与剥离
     * ============================================================ */

    function pluginOwnedReason(el) {
        const id = el.getAttribute ? (el.getAttribute('id') || '') : '';
        if (id.indexOf(UI_PREFIX) === 0) return 'collector-ui';
        if (id && (id.indexOf('znx') === 0 || PLUGIN_NODE_IDS.has(id))) return 'id=' + id;
        if (el.tagName === 'STYLE') {
            const cls = el.getAttribute('class') || '';
            if (/znx/i.test(cls) || /znx/i.test(el.textContent || '')) return 'plugin-style';
            return null;
        }
        const classList = el.classList;
        if (classList && classList.length === 1 && classList[0].indexOf('znx-') === 0) {
            return 'class=' + classList[0];
        }
        return null;
    }

    function stripPluginArtifacts(rootEl) {
        const report = { nodes: [], attributes: [], classes: [] };
        const candidates = [];
        const doomedSet = new Set();

        rootEl.querySelectorAll('*').forEach((el) => {
            const reason = pluginOwnedReason(el);
            if (!reason) return;
            doomedSet.add(el);
            candidates.push({
                el,
                tag: (el.tagName || '').toLowerCase(),
                id: el.id || '',
                cls: (el.getAttribute('class') || '').slice(0, 120),
                reason,
                path: describePath(el, rootEl)
            });
        });

        candidates.forEach((item) => {
            const nested = !!(item.el.parentElement && doomedSet.has(item.el.parentElement));
            if (!item.el.parentNode) return;
            item.el.remove();
            report.nodes.push({
                tag: item.tag,
                id: item.id,
                cls: item.cls,
                reason: item.reason,
                nested,
                path: item.path
            });
        });

        rootEl.querySelectorAll('*').forEach((el) => {
            Array.from(el.attributes || []).forEach((attr) => {
                if (attr.name.indexOf('data-znx') !== 0) return;
                if (attr.name.indexOf('data-znx-inlined-from') === 0) return; // 我们自己内联 CSS 的标记
                report.attributes.push({
                    path: describePath(el, rootEl),
                    name: attr.name,
                    value: String(attr.value).slice(0, 120)
                });
                el.removeAttribute(attr.name);
            });
            Array.from(el.classList || []).forEach((cls) => {
                if (cls.indexOf('znx-') !== 0) return;
                report.classes.push({ path: describePath(el, rootEl), name: cls });
                el.classList.remove(cls);
            });
        });

        return report;
    }

    /* ============================================================
     * 4. 构建一张快照
     * ============================================================ */

    async function buildShot() {
        const now = new Date();
        const htmlEl = document.documentElement;

        // ---- 4.1 插件活跃证据 ----
        const evidence = [];
        if (document.getElementById('znx-glass-style')) evidence.push('#znx-glass-style');
        const znxNodes = document.querySelectorAll('[id^="znx-"], [id^="znx_"]');
        if (znxNodes.length) evidence.push(znxNodes.length + ' 个 znx-* 节点');
        const znxMarks = document.querySelectorAll(
            '[data-znx-checked],[data-znx-result],[data-znx-render-key],' +
            '[data-znx-training-progress-root],[data-znx-training-progress-fill],' +
            '[data-znx-training-transition-card],[data-znx-copy-solution]'
        );
        if (znxMarks.length) evidence.push(znxMarks.length + ' 处 data-znx-* 标记');
        if (htmlEl.classList.contains('znx-doing-questions')) evidence.push('html.znx-doing-questions');
        const dynamicGlass = document.querySelectorAll('style.znx-dynamic-glass');
        if (dynamicGlass.length) evidence.push(dynamicGlass.length + ' 段动态毛玻璃规则');
        const pluginActive = evidence.length > 0;

        // ---- 4.2 环境与设置 ----
        const badgeMatch = ((document.getElementById('znx-dev-watermark') || {}).textContent || '')
            .match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?/);
        let settings = null;
        try { settings = JSON.parse(localStorage.getItem('znx_beautifier_settings') || 'null'); } catch (err) { settings = null; }
        const storage = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (/^znx|waifu/i.test(key || '')) storage[key] = String(localStorage.getItem(key)).slice(0, 200);
            }
        } catch (err) { /* noop */ }

        const meta = {
            url: location.href,
            path: location.pathname,
            title: document.title || '',
            capturedAt: now.toISOString(),
            localTime: now.toLocaleString('zh-CN', { hour12: false }),
            viewport: window.innerWidth + 'x' + window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            scroll: Math.round(window.scrollX || 0) + ',' + Math.round(window.scrollY || 0),
            darkReader: htmlEl.getAttribute('data-darkreader-scheme')
                || (htmlEl.classList.contains('darkreader') ? 'class:darkreader' : 'off'),
            htmlClass: htmlEl.getAttribute('class') || '',
            userAgent: navigator.userAgent,
            pluginActive,
            pluginEvidence: evidence,
            pluginVersion: badgeMatch ? badgeMatch[0] : '',
            collectorVersion: VERSION
        };

        // ---- 4.3 公式真值 ----
        const math = collectMathTruth();

        // ---- 4.4 克隆并剥离站点脚本 ----
        const doc = htmlEl.cloneNode(true);

        // 先剔除收集器与快照工具自身的 UI
        doc.querySelectorAll('[id^="' + UI_PREFIX + '"], [data-znx-snapshot-tool]').forEach((el) => el.remove());

        const stats = { removedScripts: 0, removedOthers: 0, inlinedCss: 0, remoteCss: 0, failedCss: 0 };
        const scripts = doc.querySelectorAll('script:not([type^="math/tex"]):not([type="application/json"])');
        stats.removedScripts = scripts.length;
        scripts.forEach((el) => el.remove());

        const others = doc.querySelectorAll([
            'iframe', 'noscript', '#MathJax_Message',
            'meta[http-equiv="refresh"]',
            'link[rel="preload"]', 'link[rel="modulepreload"]',
            'link[rel="preconnect"]', 'link[rel="dns-prefetch"]'
        ].join(', '));
        stats.removedOthers = others.length;
        others.forEach((el) => el.remove());

        // <base>
        const headEl = doc.querySelector('head');
        if (headEl) {
            doc.querySelectorAll('base').forEach((el) => el.remove());
            const base = document.createElement('base');
            base.setAttribute('href', ORIGIN + '/');
            headEl.insertBefore(base, headEl.firstChild);
        }

        // ---- 4.5 同源 CSS 内联 ----
        const links = Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'));
        await Promise.all(links.map(async (link) => {
            let absUrl;
            try {
                absUrl = new URL(link.getAttribute('href'), location.href).href;
            } catch (err) { stats.failedCss++; return; }
            if (new URL(absUrl).origin !== ORIGIN) { stats.remoteCss++; return; }
            try {
                const res = await fetch(absUrl, { credentials: 'include' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const style = document.createElement('style');
                style.setAttribute('data-znx-inlined-from', absUrl);
                style.textContent = rebaseCssUrls(await res.text(), absUrl);
                link.replaceWith(style);
                stats.inlinedCss++;
            } catch (err) { stats.failedCss++; }
        }));

        // ---- 4.6 标记插件注入的 <style>（原版视图要能禁用它们） ----
        const pluginStyles = [];
        doc.querySelectorAll('style').forEach((styleEl) => {
            const id = styleEl.getAttribute('id') || '';
            const cls = styleEl.getAttribute('class') || '';
            const isPlugin = id.indexOf('znx') === 0 || /znx/i.test(cls) || /znx/i.test(styleEl.textContent || '');
            if (!isPlugin) return;
            styleEl.setAttribute('data-znx-plugin-style', '1');
            pluginStyles.push({
                id,
                cls,
                bytes: (styleEl.textContent || '').length,
                // 离屏克隆没有 CSSOM，规则条数从主文档同名节点上取
                rules: countLiveRules(id, cls)
            });
        });

        function countLiveRules(id, cls) {
            let live = null;
            if (id) live = document.getElementById(id);
            if (!live && cls) live = document.querySelector('style.' + cls);
            if (!live) return -1;
            try { return live.sheet ? live.sheet.cssRules.length : -1; } catch (err) { return -1; }
        }

        // ---- 4.7 原版 body + 产物清单 ----
        const fullBodyEl = doc.querySelector('body');
        const fullHtml = fullBodyEl ? fullBodyEl.innerHTML : '';
        const rawBodyEl = fullBodyEl ? fullBodyEl.cloneNode(true) : null;
        const stripReport = rawBodyEl
            ? stripPluginArtifacts(rawBodyEl)
            : { nodes: [], attributes: [], classes: [] };
        const rawHtml = rawBodyEl ? rawBodyEl.innerHTML : '';

        // ---- 4.8 资源与可交互元素清单 ----
        const resources = { styles: [], scripts: [] };
        try {
            const entries = performance.getEntriesByType('resource') || [];
            resources.styles = entries.filter((e) => /\.css(\?|$)/.test(e.name)).map((e) => e.name).slice(0, 40);
            resources.scripts = entries.filter((e) => /\.js(\?|$)/.test(e.name)).map((e) => e.name).slice(0, 40);
        } catch (err) { /* noop */ }

        const interactive = { dialogs: [], buttons: [], inputs: 0 };
        try {
            const ownUI = '[id^="' + UI_PREFIX + '"]';
            interactive.dialogs = Array.from(document.querySelectorAll('[role="dialog"], .MuiDialog-root'))
                .filter((el) => !el.closest(ownUI))
                .map((el) => (el.textContent || '').trim().slice(0, 80)).filter(Boolean).slice(0, 20);
            interactive.buttons = Array.from(document.querySelectorAll('button'))
                .filter((el) => !el.closest(ownUI))
                .map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40))
                .filter(Boolean).slice(0, 80);
            interactive.inputs = document.querySelectorAll('input, textarea, select').length;
        } catch (err) { /* noop */ }

        // ---- 4.9 组装报告 ----
        const report = {
            capture: 'v' + VERSION,
            env: meta,
            plugin: {
                active: pluginActive,
                evidence,
                versionInDom: meta.pluginVersion || null,
                settings,
                storage,
                injectedStyles: pluginStyles
            },
            stripped: {
                nodesTotal: stripReport.nodes.length,
                attributesTotal: stripReport.attributes.length,
                classesTotal: stripReport.classes.length,
                nodes: stripReport.nodes.slice(0, 80),
                attributes: stripReport.attributes.slice(0, 160),
                classes: stripReport.classes.slice(0, 100)
            },
            math,
            interactive,
            resources,
            notes: [
                'nodes = 插件新增节点（nested=true 表示随祖先一起被移除）',
                'attributes/classes = 插件在站点原有节点上加的标记',
                '原版视图 = 快照减去上述产物；若插件曾直接改写原元素 style 则原值不可恢复',
                'math 为公式真值表，可用于校验「复制题目/解析」的输出',
                '未采集：后端 JSON、事件行为、动画中间帧、canvas/WebGL、iframe 内部'
            ]
        };

        return {
            meta,
            report,
            fullHtml,
            rawHtml,
            headHtml: headEl ? headEl.innerHTML : '',
            htmlAttrs: Array.from(doc.attributes).map((a) => ({ name: a.name, value: a.value })),
            stats,
            sizeKB: Math.round((fullHtml.length + headEl.innerHTML.length) / 1024)
        };
    }

    /* ============================================================
     * 5. 渲染：单张快照
     * ============================================================ */

    const TOOL_CSS = [
        'body{--znx-snap:1}',
        '#znx-snapshot-toolbar{position:fixed;left:12px;bottom:12px;z-index:2147483647;',
        'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;',
        'background:rgba(15,23,42,.86);color:#e2e8f0;font:12px/1.4 system-ui,sans-serif;',
        'box-shadow:0 6px 18px rgba(0,0,0,.35);border:1px solid rgba(148,163,184,.35)}',
        '#znx-snapshot-toolbar b{color:#38bdf8;font-weight:600}',
        '#znx-snapshot-toggle{cursor:pointer;border:0;border-radius:999px;padding:3px 9px;',
        'background:#38bdf8;color:#0f172a;font:12px/1.4 system-ui,sans-serif;font-weight:600}',
        '#znx-snapshot-toggle:hover{background:#7dd3fc}'
    ].join('');

    const TOOLBAR = [
        '<div id="znx-snapshot-toolbar" data-znx-snapshot-tool="1">',
        '<span>快照视图：<b id="znx-snapshot-mode-label">插件后</b></span>',
        '<button id="znx-snapshot-toggle" type="button">切到原版</button>',
        '</div>'
    ].join('');

    // 注意：模板节点在首次 replaceChildren 后会脱离 body，必须提前持有引用，
    // 否则第二次切换按 id 查不到模板（v1.1 曾踩过这个坑）。
    const VIEW_SWITCH_JS = [
        '(function(){',
        '"use strict";',
        'var body=document.body;',
        'var bar=document.getElementById("znx-snapshot-toolbar");',
        'var fullTpl=document.getElementById("znx-snapshot-full");',
        'var rawTpl=document.getElementById("znx-snapshot-raw");',
        'var htmlEl=document.documentElement;',
        'var hadDoing=htmlEl.classList.contains("znx-doing-questions");',
        'var baseTitle=document.title;',
        'var label=document.getElementById("znx-snapshot-mode-label");',
        'var btn=document.getElementById("znx-snapshot-toggle");',
        'var mode=/[?#&]raw/.test(location.search+location.hash)?"raw":"full";',
        'if(!bar||!fullTpl||!rawTpl){return;}',
        'function pluginStyles(){return document.querySelectorAll("style[data-znx-plugin-style]");}',
        'function render(){',
        'var tpl=mode==="raw"?rawTpl:fullTpl;',
        'body.replaceChildren(bar,tpl.content.cloneNode(true));',
        'var list=pluginStyles(),i;',
        'for(i=0;i<list.length;i++){try{list[i].disabled=(mode==="raw");}catch(e){}}',
        'htmlEl.classList.toggle("znx-doing-questions",mode==="full"&&hadDoing);',
        'label.textContent=mode==="raw"?"原版（无插件）":"插件后";',
        'btn.textContent=mode==="raw"?"切到插件后":"切到原版";',
        'document.title=(mode==="raw"?"[原版] ":"")+baseTitle;',
        '}',
        'btn.onclick=function(){mode=mode==="raw"?"full":"raw";render();};',
        'document.addEventListener("keydown",function(e){',
        'var t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)){return;}',
        'if(e.key==="r"||e.key==="R"){mode=mode==="raw"?"full":"raw";render();}',
        '},true);',
        'render();',
        '})();'
    ].join('\n');

    /** HTML 注释里的页面数据必须消毒：标题可能含 --> 或 </script>，会截断注释/结构 */
    function commentSafe(value) {
        return String(value == null ? '' : value)
            .replace(/[\r\n]+/g, ' ')
            .replace(/-{2,}/g, '- -')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderSingleShot(shot) {
        const reportJson = JSON.stringify(shot.report, null, 2).replace(/</g, '\\u003c');
        const htmlAttrs = shot.htmlAttrs
            .map((a) => a.name + '="' + String(a.value).replace(/"/g, '&quot;') + '"')
            .join(' ');
        const metaComment = [
            '<!-- ===== znx-snapshot =====',
            ' url: ' + commentSafe(shot.meta.url),
            ' title: ' + commentSafe(shot.meta.title),
            ' capturedAt: ' + shot.meta.capturedAt + '  (' + shot.meta.localTime + ')',
            ' viewport: ' + shot.meta.viewport + ' @' + shot.meta.devicePixelRatio + 'x  scroll: ' + shot.meta.scroll,
            ' darkReader: ' + commentSafe(shot.meta.darkReader)
                + '   html.class: ' + commentSafe(shot.meta.htmlClass || '(空)'),
            ' plugin: ' + commentSafe(shot.report.plugin.active
                ? '已生效 —— ' + shot.report.plugin.evidence.join(' / ')
                : '未检测到') + (shot.meta.pluginVersion ? '  v' + shot.meta.pluginVersion : ''),
            ' pluginSettings: ' + commentSafe(shot.report.plugin.settings
                ? JSON.stringify(shot.report.plugin.settings) : '(无)'),
            ' stripped: 新增节点 ' + shot.report.stripped.nodesTotal
                + ' / 属性 ' + shot.report.stripped.attributesTotal
                + ' / class ' + shot.report.stripped.classesTotal
                + ' / 注入样式段 ' + shot.report.plugin.injectedStyles.length,
            ' math: katex ' + shot.report.math.summary.katexNodes
                + ' / mathjax ' + shot.report.math.summary.mathjaxNodes
                + ' / TeX 源码可得 ' + shot.report.math.summary.texSourcesAvailable,
            ' capture: v' + VERSION + '（按 R 或点左下角按钮切换视图）',
            '===== /znx-snapshot ===== -->'
        ].join('\n');

        return [
            '<!DOCTYPE html>',
            metaComment,
            '<html ' + htmlAttrs + '>',
            '<head>',
            shot.headHtml,
            '<style data-znx-snapshot-tool="1">' + TOOL_CSS + '</style>',
            '<script type="application/json" id="znx-snapshot-report">' + reportJson + '</script>',
            '</head>',
            '<body>',
            '<template id="znx-snapshot-full">' + shot.fullHtml + '</template>',
            '<template id="znx-snapshot-raw">' + shot.rawHtml + '</template>',
            TOOLBAR,
            '<script data-znx-snapshot-tool="1">' + VIEW_SWITCH_JS + '</script>',
            '</body>',
            '</html>'
        ].join('\n');
    }

    /* ============================================================
     * 6. 渲染：合集
     * ============================================================ */

    function renderBundle(shots) {
        const heads = [];            // 去重后的 head 片段
        const headIndex = new Map(); // hash -> id
        const metaList = [];

        shots.forEach((shot) => {
            const h = hash32(shot.headHtml);
            if (!headIndex.has(h)) {
                headIndex.set(h, heads.length);
                heads.push({ id: heads.length, html: shot.headHtml });
            }
        });

        const parts = [];
        parts.push('<!DOCTYPE html>');
        parts.push('<html lang="zh-CN">');
        parts.push('<head>');
        parts.push('<meta charset="utf-8">');
        parts.push('<title>知能行快照合集（' + shots.length + ' 个状态）</title>');
        parts.push('<style data-znx-bundle="1">' + BUNDLE_CSS + '</style>');
        parts.push('</head>');
        parts.push('<body>');
        parts.push(BUNDLE_BAR);

        // 每个唯一的 head 片段
        heads.forEach((head) => {
            parts.push('<template id="znx-bundle-head-' + head.id + '">' + head.html + '</template>');
        });

        // 每张快照的三件套
        shots.forEach((shot, i) => {
            metaList.push({
                i,
                url: shot.meta.url,
                path: shot.meta.path,
                title: shot.meta.title,
                time: shot.meta.localTime,
                viewport: shot.meta.viewport,
                pluginActive: shot.report.plugin.active,
                darkReader: shot.meta.darkReader,
                htmlAttrs: shot.htmlAttrs,
                htmlClass: shot.meta.htmlClass,
                headId: headIndex.get(hash32(shot.headHtml)),
                math: shot.report.math.summary,
                stripped: {
                    nodes: shot.report.stripped.nodesTotal,
                    attributes: shot.report.stripped.attributesTotal
                }
            });
            parts.push('<template id="znx-bundle-full-' + i + '">' + shot.fullHtml + '</template>');
            parts.push('<template id="znx-bundle-raw-' + i + '">' + shot.rawHtml + '</template>');
        });

        parts.push('<script type="application/json" id="znx-bundle-meta">'
            + JSON.stringify(metaList).replace(/</g, '\\u003c') + '</script>');
        parts.push('<script data-znx-bundle="1">' + BUNDLE_JS + '</script>');
        parts.push('</body>');
        parts.push('</html>');
        return parts.join('\n');
    }

    const BUNDLE_CSS = [
        '#znx-bundle-bar{position:fixed;left:12px;bottom:12px;z-index:2147483647;display:flex;',
        'align-items:center;gap:8px;padding:7px 10px;border-radius:12px;max-width:calc(100vw - 24px);',
        'background:rgba(15,23,42,.9);color:#e2e8f0;font:12px/1.5 system-ui,sans-serif;',
        'box-shadow:0 8px 24px rgba(0,0,0,.4);border:1px solid rgba(148,163,184,.35)}',
        '#znx-bundle-bar select{max-width:320px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;',
        'border-radius:8px;padding:3px 6px;font:12px system-ui,sans-serif}',
        '#znx-bundle-bar button{cursor:pointer;border:0;border-radius:8px;padding:4px 9px;',
        'background:#38bdf8;color:#0f172a;font:12px/1.4 system-ui,sans-serif;font-weight:600}',
        '#znx-bundle-bar button.ghost{background:rgba(148,163,184,.25);color:#e2e8f0}',
        '#znx-bundle-bar .sep{width:1px;height:18px;background:rgba(148,163,184,.35)}',
        '#znx-bundle-url{max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
        'color:#94a3b8}'
    ].join('');

    const BUNDLE_BAR = [
        '<div id="znx-bundle-bar" data-znx-bundle="1">',
        '<button id="znx-bundle-prev" class="ghost" title="上一个 ( [ )">◀</button>',
        '<select id="znx-bundle-select" title="选择状态"></select>',
        '<button id="znx-bundle-next" class="ghost" title="下一个 ( ] )">▶</button>',
        '<span class="sep"></span>',
        '<button id="znx-bundle-view" title="切换 插件后/原版 ( R )">切到原版</button>',
        '<span class="sep"></span>',
        '<span id="znx-bundle-url"></span>',
        '</div>'
    ].join('');

    const BUNDLE_JS = [
        '(function(){',
        '"use strict";',
        'var meta=JSON.parse(document.getElementById("znx-bundle-meta").textContent||"[]");',
        'var tpls={};',
        'Array.prototype.slice.call(document.querySelectorAll("template[id]")).forEach(function(t){',
        'if(t.id.indexOf("znx-bundle-")===0){tpls[t.id]=t;}',
        '});',
        'var bar=document.getElementById("znx-bundle-bar");',
        'var sel=document.getElementById("znx-bundle-select");',
        'var urlEl=document.getElementById("znx-bundle-url");',
        'var viewBtn=document.getElementById("znx-bundle-view");',
        'var htmlEl=document.documentElement;',
        'var current=0;',
        'var mode="full";',
        'if(!bar||!meta.length){return;}',
        'meta.forEach(function(m){',
        'var o=document.createElement("option");',
        'o.value=String(m.i);',
        'o.textContent=(m.i+1)+". "+m.path+(m.pluginActive?"":" (无插件)");',
        'sel.appendChild(o);',
        '});',
        'function setHtmlAttrs(attrs){',
        'Array.prototype.slice.call(htmlEl.attributes).forEach(function(a){',
        'if(a.name!=="lang"){htmlEl.removeAttribute(a.name);}',
        '});',
        '(attrs||[]).forEach(function(a){htmlEl.setAttribute(a.name,a.value);});',
        '}',
        'function apply(i){',
        'if(i<0){i=0;}if(i>=meta.length){i=meta.length-1;}',
        'current=i;',
        'var m=meta[i];',
        'var headTpl=tpls["znx-bundle-head-"+m.headId];',
        'Array.prototype.slice.call(document.head.querySelectorAll("[data-znx-head]")).forEach(function(n){n.remove();});',
        'if(headTpl){',
        'var frag=headTpl.content.cloneNode(true);',
        'Array.prototype.slice.call(frag.children).forEach(function(n){n.setAttribute("data-znx-head","1");});',
        'document.head.appendChild(frag);',
        '}',
        'setHtmlAttrs(m.htmlAttrs||[]);',
        'var tpl=tpls["znx-bundle-"+(mode==="raw"?"raw":"full")+"-"+i];',
        'if(tpl){document.body.replaceChildren(bar,tpl.content.cloneNode(true));}',
        'var list=document.querySelectorAll("style[data-znx-plugin-style]"),k;',
        'for(k=0;k<list.length;k++){try{list[k].disabled=(mode==="raw");}catch(e){}}',
        'var doing=mode==="full"&&/znx-doing-questions/.test(m.htmlClass||"");',
        'htmlEl.classList.toggle("znx-doing-questions",doing);',
        'sel.value=String(i);',
        'urlEl.textContent=m.viewport+"  "+m.time+"  "+m.url;',
        'urlEl.title=m.title||"";',
        'viewBtn.textContent=mode==="raw"?"切到插件后":"切到原版";',
        'document.title=(mode==="raw"?"[原版] ":"")+(m.title||"快照")+" ("+(i+1)+"/"+meta.length+")";',
        '}',
        'sel.onchange=function(){apply(parseInt(sel.value,10)||0);};',
        'document.getElementById("znx-bundle-prev").onclick=function(){apply(current-1);};',
        'document.getElementById("znx-bundle-next").onclick=function(){apply(current+1);};',
        'viewBtn.onclick=function(){mode=mode==="raw"?"full":"raw";apply(current);};',
        'document.addEventListener("keydown",function(e){',
        'var t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)){return;}',
        'if(e.key==="["){apply(current-1);}',
        'else if(e.key==="]"){apply(current+1);}',
        'else if(e.key==="r"||e.key==="R"){mode=mode==="raw"?"full":"raw";apply(current);}',
        '},true);',
        'var q=/[?#&]i=(\\d+)/.exec(location.search+location.hash);',
        'apply(q?Math.max(0,parseInt(q[1],10)-1):0);',
        '})();'
    ].join('\n');

    /* ============================================================
     * 7. IndexedDB 快照库
     * ============================================================ */

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function dbAll() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const request = tx.objectStore(DB_STORE).getAll();
            request.onsuccess = () => resolve((request.result || []).sort((a, b) => a.createdAt - b.createdAt));
            request.onerror = () => reject(request.error);
        });
    }

    async function dbPut(record) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).put(record);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async function dbClear() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async function directorySetting(mode, value) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SETTINGS_STORE, mode);
            const store = tx.objectStore(SETTINGS_STORE);
            const request = mode === 'readonly' ? store.get('directory') : store.put(value, 'directory');
            let result;
            request.onsuccess = () => { result = request.result; };
            tx.oncomplete = () => { db.close(); resolve(result); };
            tx.onerror = () => { db.close(); reject(tx.error); };
            tx.onabort = () => { db.close(); reject(tx.error || new Error('文件夹设置事务已中止')); };
        });
    }

    async function chooseDirectory() {
        if (typeof window.showDirectoryPicker !== 'function') {
            toast('浏览器不支持选择文件夹，请使用最新版 Chrome 或 Edge');
            return;
        }
        try {
            const handle = await window.showDirectoryPicker({ id: 'znx-snapshot-inbox', mode: 'readwrite' });
            await directorySetting('readwrite', handle);
            directoryHandle = handle;
            refreshDirectory();
            toast('保存文件夹已选择：' + handle.name);
        } catch (err) {
            if (err.name !== 'AbortError') toast('选择文件夹失败：' + err.message);
        }
    }

    async function authorizeDirectory() {
        if (!directoryHandle) { await chooseDirectory(); return; }
        try {
            const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
            refreshDirectory();
            toast(permission === 'granted' ? '文件夹写入权限已恢复' : '未获得文件夹写入权限');
        } catch (err) { toast('授权失败：' + err.message); }
    }

    async function saveFile(name, text) {
        if (!directoryHandle) throw new Error('请先在面板选择 inbox 文件夹');
        if (await directoryHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
            throw new Error('请在面板点击“恢复写入权限”');
        }
        const handle = await directoryHandle.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        try { await writable.write(text); await writable.close(); }
        catch (err) { try { await writable.abort(); } catch (_) {} throw err; }
        return new Blob([text]).size;
    }

    function refreshDirectory() {
        const status = document.getElementById(UI_PREFIX + 'directory-status');
        if (status) status.textContent = directoryHandle ? '保存目录：' + directoryHandle.name : '尚未选择保存目录，请选择 inbox';
    }

    /* ============================================================
     * 8. UI
     * ============================================================ */

    let ui = { badge: null, panel: null, toast: null, counter: 0 };
    let shotCache = [];   // 内存中的元信息（不含大字段）

    const UI_STYLE = [
        '#znx-snapshot-badge{position:fixed;left:12px;bottom:12px;z-index:2147483646;cursor:pointer;',
        'display:flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;',
        'background:rgba(15,23,42,.82);color:#e2e8f0;font:12px/1.4 system-ui,sans-serif;',
        'border:1px solid rgba(148,163,184,.35);box-shadow:0 4px 14px rgba(0,0,0,.3);user-select:none}',
        '#znx-snapshot-badge:hover{background:rgba(15,23,42,.95)}',
        '#znx-snapshot-badge .dot{width:7px;height:7px;border-radius:50%;background:#38bdf8}',
        '#znx-snapshot-badge.auto .dot{background:#22c55e;box-shadow:0 0 8px #22c55e}',
        '#znx-snapshot-panel{position:fixed;left:12px;bottom:48px;z-index:2147483647;width:330px;',
        'background:rgba(15,23,42,.96);color:#e2e8f0;border:1px solid rgba(148,163,184,.35);',
        'border-radius:14px;padding:12px;font:12px/1.6 system-ui,sans-serif;',
        'box-shadow:0 12px 34px rgba(0,0,0,.45);display:none}',
        '#znx-snapshot-panel h4{margin:0 0 6px;font-size:13px;color:#38bdf8}',
        '#znx-snapshot-panel p{margin:0 0 8px;color:#94a3b8}',
        '#znx-snapshot-panel .row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}',
        '#znx-snapshot-panel button{cursor:pointer;border:0;border-radius:8px;padding:5px 10px;',
        'background:#38bdf8;color:#0f172a;font:12px/1.5 system-ui,sans-serif;font-weight:600}',
        '#znx-snapshot-panel button.ghost{background:rgba(148,163,184,.25);color:#e2e8f0}',
        '#znx-snapshot-panel button.danger{background:#f43f5e;color:#fff}',
        '#znx-snapshot-panel code{background:rgba(148,163,184,.2);padding:1px 4px;border-radius:4px}',
        '#znx-snapshot-toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);',
        'z-index:2147483647;background:rgba(15,23,42,.94);color:#e2e8f0;padding:8px 14px;',
        'border-radius:10px;font:13px/1.5 system-ui,sans-serif;border:1px solid rgba(56,189,248,.5);',
        'opacity:0;transition:opacity .2s ease;pointer-events:none;max-width:80vw}',
        '#znx-snapshot-toast.show{opacity:1}'
    ].join('');

    let toastTimer = null;
    function toast(message) {
        if (!ui.toast) return;
        ui.toast.textContent = message;
        ui.toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2200);
    }

    function buildUI() {
        const style = document.createElement('style');
        style.id = UI_PREFIX + 'style';
        style.textContent = UI_STYLE;
        document.head.appendChild(style);

        const badge = document.createElement('div');
        badge.id = UI_PREFIX + 'badge';
        badge.title = '快照收集器：点击打开面板';
        badge.innerHTML = '<span class="dot"></span><span id="' + UI_PREFIX + 'count">📸 0</span>';
        document.body.appendChild(badge);

        const panel = document.createElement('div');
        panel.id = UI_PREFIX + 'panel';
        panel.innerHTML = [
            '<h4>📸 快照收集器 v' + VERSION + '</h4>',
            '<p>热键：<code>Ctrl+Shift+S</code> 拍当前 · <code>D</code> 保存单张 · <code>A</code> 自动拍 · <code>E</code> 导出合集 · <code>X</code> 清空</p>',
            '<div class="row">',
            '<button id="' + UI_PREFIX + 'shot">拍下当前状态</button>',
            '<button id="' + UI_PREFIX + 'visual" title="选择当前知能行标签页，保存 HTML 和 PNG">拍照 + PNG</button>',
            '<button id="' + UI_PREFIX + 'auto" class="ghost">自动连拍：关</button>',
            '</div>',
            '<div class="row">',
            '<button id="' + UI_PREFIX + 'export">导出合集</button>',
            '<button id="' + UI_PREFIX + 'single" class="ghost">保存这一张</button>',
            '<button id="' + UI_PREFIX + 'list" class="ghost">刷新</button>',
            '<button id="' + UI_PREFIX + 'clear" class="danger">清空</button>',
            '</div>',
            '<div class="row"><button id="' + UI_PREFIX + 'directory" class="ghost">选择保存文件夹</button><button id="' + UI_PREFIX + 'authorize" class="ghost">恢复写入权限</button></div>',
            '<p id="' + UI_PREFIX + 'directory-status">尚未选择保存目录，请选择 inbox</p>',
            '<p id="' + UI_PREFIX + 'stat">本地已存 0 张</p>',
            '<p style="color:#64748b">自动连拍：页面内容稳定后自动拍一张，同一状态自动去重。做一次题即可录全所有界面。</p>'
        ].join('');
        document.body.appendChild(panel);

        const toastEl = document.createElement('div');
        toastEl.id = UI_PREFIX + 'toast';
        document.body.appendChild(toastEl);

        ui.badge = badge;
        ui.panel = panel;
        ui.toast = toastEl;

        badge.onclick = () => {
            const open = panel.style.display === 'block';
            panel.style.display = open ? 'none' : 'block';
            if (!open) refreshStat();
        };

        document.getElementById(UI_PREFIX + 'directory').onclick = chooseDirectory;
        document.getElementById(UI_PREFIX + 'authorize').onclick = authorizeDirectory;
        document.getElementById(UI_PREFIX + 'shot').onclick = () => capture({ source: 'manual' });
        document.getElementById(UI_PREFIX + 'auto').onclick = () => toggleAuto();
        document.getElementById(UI_PREFIX + 'export').onclick = () => exportBundle();
        document.getElementById(UI_PREFIX + 'single').onclick = () => downloadCurrent();
        document.getElementById(UI_PREFIX + 'list').onclick = () => refreshStat();
        document.getElementById(UI_PREFIX + 'clear').onclick = () => clearLibrary();
    }

    function refreshStat() {
        const stat = document.getElementById(UI_PREFIX + 'stat');
        const count = document.getElementById(UI_PREFIX + 'count');
        if (count) count.textContent = '📸 ' + shotCache.length;
        if (!stat) return;
        if (!shotCache.length) {
            stat.textContent = '本地已存 0 张';
            return;
        }
        const totalKB = shotCache.reduce((sum, s) => sum + (s.sizeKB || 0), 0);
        stat.textContent = '本地已存 ' + shotCache.length + ' 张（约 '
            + (totalKB / 1024).toFixed(1) + ' MB）';
    }

    /* ============================================================
     * 9. 拍照 / 自动连拍 / 导出 / 清空
     * ============================================================ */

    let capturing = false;

    function signature() {
        // 必须只看站点内容：收集器自己的徽标会显示「📸 N」，N 每拍一张就变，
        // 若把它算进签名，会导致拍完立刻又被判为"新状态"，陷入无限连拍。
        const root = document.getElementById('root');
        const host = root || document.body;
        let textLen = 0;
        try { textLen = (host.innerText || '').length; } catch (err) { textLen = 0; }
        let allCount = 0;
        try {
            allCount = (root ? root : document).getElementsByTagName('*').length;
        } catch (err) { allCount = 0; }
        const dialogs = document.querySelectorAll('[role="dialog"]').length;
        return [location.pathname, document.title, allCount, textLen, dialogs].join('|');
    }

    async function capture(options) {
        if (capturing) { toast('正在拍，稍等…'); return null; }
        capturing = true;
        const opts = options || {};
        try {
            const hide = [ui.badge, ui.panel, ui.toast];
            hide.forEach((el) => { if (el) el.style.display = 'none'; });
            const shot = await buildShot();
            hide.forEach((el) => {
                if (!el) return;
                el.style.display = el === ui.panel ? 'none' : '';
            });

            const createdAt = Date.now();
            const record = {
                id: timeStamp(new Date(createdAt)) + '-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
                createdAt,
                meta: shot.meta,
                report: shot.report,
                fullHtml: shot.fullHtml,
                rawHtml: shot.rawHtml,
                headHtml: shot.headHtml,
                htmlAttrs: shot.htmlAttrs,
                sizeKB: shot.sizeKB,
                signature: signature()
            };
            await dbPut(record);
            shotCache.push({ id: record.id, sizeKB: shot.sizeKB, meta: shot.meta });
            refreshStat();
            try {
                await saveFile('znx_' + record.id + '.html', renderSingleShot(shot));
                if (opts.source !== 'auto') toast('已保存至文件夹（共 ' + shotCache.length + ' 张）');
            } catch (err) {
                console.error('[快照收集器] 文件保存失败：', err);
                toast('已存浏览器，文件保存失败：' + err.message);
            }
            if (shotCache.length >= MAX_SHOTS) {
                autoOn = false;
                setAutoButton();
                toast('已达 ' + MAX_SHOTS + ' 张上限，自动连拍已停止，请导出后清空');
            }
            return record;
        } catch (err) {
            console.error('[快照收集器] 拍照失败：', err);
            toast('拍照失败：' + (err && err.message ? err.message : err));
            return null;
        } finally {
            capturing = false;
            if (ui.badge) ui.badge.style.display = '';
        }
    }

    let autoOn = false;
    let autoTimer = null;
    let lastSig = '';
    let stableTicks = 0;
    let lastCapturedSig = '';

    function setAutoButton() {
        const btn = document.getElementById(UI_PREFIX + 'auto');
        if (btn) btn.textContent = '自动连拍：' + (autoOn ? '开' : '关');
        if (ui.badge) ui.badge.classList.toggle('auto', autoOn);
    }

    function toggleAuto(force) {
        autoOn = typeof force === 'boolean' ? force : !autoOn;
        setAutoButton();
        if (autoOn) {
            lastSig = '';
            stableTicks = 0;
            lastCapturedSig = '';
            if (autoTimer) clearInterval(autoTimer);
            autoTimer = setInterval(autoTick, 1500);
            toast('自动连拍已开启：去正常做题，状态会自动录下来');
        } else {
            if (autoTimer) clearInterval(autoTimer);
            autoTimer = null;
            toast('自动连拍已关闭');
        }
    }

    function autoTick() {
        if (!autoOn || capturing) return;
        const sig = signature();
        if (sig !== lastSig) {
            lastSig = sig;
            stableTicks = 0;
            return;
        }
        stableTicks++;
        // 连续两轮（约 3 秒）内容没变，视为稳定
        if (stableTicks < 2 || sig === lastCapturedSig) return;
        lastCapturedSig = sig;
        capture({ source: 'auto' });
    }

    /** 下载当前状态为单张自包含 HTML（等同 v1.1 的行为） */
    async function downloadCurrent() {
        try {
            const shot = await buildShot();
            const slug = (location.pathname.replace(/[^\w\u4e00-\u9fa5-]+/g, '_').replace(/^_+|_+$/g, '') || 'root')
                .slice(0, 40);
            const suffix = shot.report.plugin.active ? 'plugin' : 'clean';
            const name = 'znx_' + timeStamp() + '_' + slug + '_' + shot.meta.viewport + '_' + suffix + '.html';
            const size = await saveFile(name, renderSingleShot(shot));
            toast('已保存单张：' + name + '（' + (size / 1024).toFixed(0) + ' KB）');
            console.log('[快照收集器] 单张快照：' + name);
        } catch (err) {
            console.error('[快照收集器] 单张下载失败：', err);
            toast('下载失败：' + (err && err.message ? err.message : err));
        }
    }

    async function exportBundle() {        try {
            const records = await dbAll();
            if (!records.length) { toast('还没有快照，先拍一张'); return; }
            toast('正在打包 ' + records.length + ' 张…');
            const shots = records.map((r) => ({
                meta: r.meta,
                report: r.report,
                fullHtml: r.fullHtml,
                rawHtml: r.rawHtml,
                headHtml: r.headHtml,
                htmlAttrs: r.htmlAttrs
            }));
            const html = renderBundle(shots);
            const name = 'znx-bundle_' + timeStamp() + '_' + records.length + 'shots.html';
            const size = await saveFile(name, html);
            toast('已导出 ' + name + '（' + (size / 1024 / 1024).toFixed(1) + ' MB）');
            console.log('[快照收集器] 导出合集：' + name + '，大小 ' + (size / 1024 / 1024).toFixed(1) + ' MB');
        } catch (err) {
            console.error('[快照收集器] 导出失败：', err);
            toast('导出失败：' + (err && err.message ? err.message : err));
        }
    }

    async function clearLibrary() {
        if (!window.confirm('确定清空本地全部快照吗？此操作不可撤销（导出后才能恢复）。')) return;
        try {
            await dbClear();
            shotCache = [];
            refreshStat();
            toast('已清空');
        } catch (err) {
            toast('清空失败：' + (err && err.message ? err.message : err));
        }
    }

    /* ============================================================
     * 10. 启动
     * ============================================================ */

    function bindHotkeys() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd 搭配 Shift 或 Alt 均可：Ctrl+Shift+S 被浏览器占用时，用 Ctrl+Alt+S
            if (!(event.ctrlKey || event.metaKey)) return;
            if (!event.shiftKey && !event.altKey) return;
            const key = (event.key || '').toLowerCase();
            if (key === 's') {
                event.preventDefault();
                capture({ source: 'manual' });
            } else if (key === 'a') {
                event.preventDefault();
                toggleAuto();
            } else if (key === 'e') {
                event.preventDefault();
                exportBundle();
            } else if (key === 'd') {
                event.preventDefault();
                downloadCurrent();
            } else if (key === 'x') {
                event.preventDefault();
                clearLibrary();
            }
        }, true);
    }

    const api = {
        version: VERSION,
        capture,
        exportBundle,
        toggleAuto,
        toast,
        buildShot,
        dbAll,
        dbClear
    };
    window[NS] = api;

    function boot() {
        buildUI();
        bindHotkeys();
        directorySetting('readonly').then((handle) => { directoryHandle = handle || null; refreshDirectory(); })
            .catch((err) => console.error('[快照收集器] 读取保存目录失败：', err));
        dbAll().then((records) => {
            shotCache = records.map((r) => ({ id: r.id, sizeKB: r.sizeKB, meta: r.meta }));
            refreshStat();
            if (shotCache.length) {
                console.log('[快照收集器] 本地已有 ' + shotCache.length + ' 张快照，按 Ctrl+Shift+E 导出合集');
            }
        }).catch(() => { /* noop */ });
        console.log('[快照收集器] v' + VERSION + ' 已就绪：Ctrl+Shift+S 拍当前页 / A 自动连拍 / E 导出 / X 清空');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
