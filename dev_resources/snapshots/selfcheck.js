#!/usr/bin/env node
/**
 * 快照收集器自检（不需要浏览器）
 * ---------------------------------------------------------------------------
 * 用途：改完 capture.user.js 后先跑一遍，避免"语法过了但产物结构错"的低级问题。
 * 用法：node dev_resources/snapshots/selfcheck.js
 *
 * 覆盖：
 *   1. 会被写进快照的内嵌 CSS / HTML / JS 字符串：能否构建、语法是否正确
 *   2. renderSingleShot / renderBundle 的真实产物结构：模板、报告 JSON、转义
 *   3. 关键实现特征（模板引用缓存、自动拍去重、IDB、UI 剔除）
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const TARGET = path.join(__dirname, 'capture.user.js');
const src = fs.readFileSync(TARGET, 'utf8');

let failed = 0;
function check(label, ok, detail) {
    if (ok) {
        console.log('  ✓ ' + label);
    } else {
        failed++;
        console.log('  ✗ ' + label + (detail ? '  → ' + detail : ''));
    }
}

/* ---------- 提取器 ---------- */

function extractArray(name) {
    const marker = 'const ' + name + ' = [';
    const start = src.indexOf(marker);
    if (start === -1) throw new Error('找不到常量 ' + name);
    const from = start + marker.length - 1;
    let depth = 0;
    let quote = null;
    for (let i = from; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            if (ch === '\\') { i++; continue; }
            if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '[') depth++;
        else if (ch === ']' && --depth === 0) {
            const tail = src.slice(i, i + 40);
            const m = /^\]\s*\.join\((['"])(.*?)\1\)/.exec(tail);
            if (!m) throw new Error(name + ' 的 join 形式异常');
            return vm.runInNewContext(src.slice(from, i) + m[0]);
        }
    }
    throw new Error(name + ' 未闭合');
}

function extractFunction(name) {
    const marker = 'function ' + name + '(';
    const start = src.indexOf(marker);
    if (start === -1) throw new Error('找不到函数 ' + name);
    let depth = 0;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(start, i + 1);
        }
    }
    throw new Error(name + ' 未闭合');
}

/* ---------- 1. 内嵌资源 ---------- */

console.log('\n[1/3] 内嵌资源');
const arrays = {};
['TOOL_CSS', 'TOOLBAR', 'VIEW_SWITCH_JS', 'BUNDLE_CSS', 'BUNDLE_BAR', 'BUNDLE_JS'].forEach((name) => {
    try {
        const value = extractArray(name);
        if (typeof value !== 'string' || !value.length) throw new Error('结果不是非空字符串');
        if (name.endsWith('_JS')) new vm.Script('(function(){' + value + '})();', { filename: name });
        if (name.endsWith('_CSS') && value.split('{').length !== value.split('}').length) {
            throw new Error('花括号不配对');
        }
        arrays[name] = value;
        check(name + '（' + value.length + ' 字符）', true);
    } catch (err) {
        check(name, false, err.message);
    }
});

/* ---------- 2. 渲染产物 ---------- */

console.log('\n[2/3] 渲染产物');
let renderSingleShot;
let renderBundle;
try {
    const factory = new Function(
        'VERSION', 'TOOL_CSS', 'TOOLBAR', 'VIEW_SWITCH_JS', 'BUNDLE_CSS', 'BUNDLE_BAR', 'BUNDLE_JS',
        extractFunction('hash32') + '\n'
        + extractFunction('commentSafe') + '\n'
        + extractFunction('renderSingleShot') + '\n'
        + extractFunction('renderBundle') + '\n'
        + 'return { renderSingleShot, renderBundle };'
    );
    const built = factory('2.0.0', arrays.TOOL_CSS, arrays.TOOLBAR, arrays.VIEW_SWITCH_JS,
        arrays.BUNDLE_CSS, arrays.BUNDLE_BAR, arrays.BUNDLE_JS);
    renderSingleShot = built.renderSingleShot;
    renderBundle = built.renderBundle;
    check('渲染函数可构建', true);
} catch (err) {
    check('渲染函数可构建', false, err.message);
}

function makeShot(tag, headHtml) {
    return {
        meta: {
            url: 'https://app.bestzixue.com/exam', path: '/' + tag, title: '训练中',
            capturedAt: '2026-11-16T12:00:00.000Z', localTime: '2026/11/16 20:00:00',
            viewport: '1184x949', devicePixelRatio: 1, scroll: '0,0', darkReader: 'off',
            htmlClass: 'znx-doing-questions', pluginVersion: '', pluginActive: true
        },
        report: {
            plugin: { active: true, evidence: ['#znx-glass-style'], settings: { showWaifu: true }, injectedStyles: [{ id: 'a', rules: 5 }] },
            stripped: { nodesTotal: 1, attributesTotal: 2, classesTotal: 0, nodes: [], attributes: [], classes: [] },
            math: { summary: { katexNodes: 0, mathjaxNodes: 3, texSourcesAvailable: 3 } }
        },
        fullHtml: '<div id="root">FULL-' + tag + '</div>',
        rawHtml: '<div id="root">RAW-' + tag + '</div>',
        headHtml: headHtml,
        htmlAttrs: [{ name: 'class', value: 'znx-doing-questions' }, { name: 'lang', value: 'zh-CN' }],
        stats: {},
        sizeKB: 10
    };
}

if (renderSingleShot) {
    const single = renderSingleShot(makeShot('one', '<base href="https://app.bestzixue.com/">'));
    check('单张：DOCTYPE', single.startsWith('<!DOCTYPE html>'));
    check('单张：html 属性', single.includes('<html class="znx-doing-questions" lang="zh-CN">'));
    check('单张：双视图模板', single.includes('id="znx-snapshot-full"') && single.includes('id="znx-snapshot-raw"'));
    check('单张：工具栏', single.includes('id="znx-snapshot-toolbar"'));
    const reportMatch = /<script type="application\/json" id="znx-snapshot-report">([\s\S]*?)<\/script>/.exec(single);
    let report = null;
    try { report = JSON.parse(reportMatch[1].trim()); } catch (err) { report = null; }
    check('单张：报告 JSON 可解析', !!report && report.plugin.active === true);
    check('单张：script 标签配对',
        (single.match(/<script/g) || []).length === (single.match(/<\/script>/g) || []).length);
}

if (renderBundle) {
    const bundle = renderBundle([
        makeShot('a', '<base href="https://app.bestzixue.com/"><style>.x{color:red}</style>'),
        makeShot('b', '<base href="https://app.bestzixue.com/"><style>.x{color:red}</style>'),
        makeShot('c', '<base href="https://app.bestzixue.com/"><style>.y{color:blue}</style>')
    ]);
    const metaMatch = /<script type="application\/json" id="znx-bundle-meta">([\s\S]*?)<\/script>/.exec(bundle);
    let meta = null;
    try { meta = JSON.parse(metaMatch[1]); } catch (err) { meta = null; }
    check('合集：meta JSON 可解析', Array.isArray(meta) && meta.length === 3);
    check('合集：head 去重', (bundle.match(/id="znx-bundle-head-/g) || []).length === 2);
    check('合集：每张两棵 DOM 模板', (bundle.match(/id="znx-bundle-(full|raw)-/g) || []).length === 6);
    check('合集：工具栏', bundle.includes('id="znx-bundle-bar"'));
    check('合集：headId 正确复用', !!meta && meta[0].headId === meta[1].headId && meta[2].headId !== meta[0].headId);
    check('合集：script 标签配对',
        (bundle.match(/<script/g) || []).length === (bundle.match(/<\/script>/g) || []).length);
}

if (renderSingleShot) {
    const nasty = makeShot('x', '<style>.x{color:red}</style>');
    nasty.meta.title = 'PWN --> </script><script>alert(1)</script>';
    nasty.meta.url = 'https://app.bestzixue.com/exam?a=1&b="2"';
    const escaped = renderSingleShot(nasty);
    check('转义：标题里的 </script> 不破坏结构',
        (escaped.match(/<script/g) || []).length === (escaped.match(/<\/script>/g) || []).length);
    check('转义：注释标记配对', (escaped.match(/<!--/g) || []).length === (escaped.match(/-->/g) || []).length);
    check('转义：标题未以裸形式注入', !escaped.includes('<script>alert(1)'));
}

/* ---------- 3. 实现特征 ---------- */

console.log('\n[3/3] 关键实现');
check('单张切换器缓存模板引用', /var fullTpl=document\.getElementById\("znx-snapshot-full"\)/.test(src));
check('合集缓存模板引用', /tpls\[t\.id\]=t/.test(src));
check('自动连拍去重', /lastCapturedSig/.test(src));
check('文件夹选择及权限恢复', /showDirectoryPicker/.test(src) && /requestPermission/.test(src));
check('拍摄和合集写入所选目录', /saveFile\('znx_' \+ record\.id/.test(src) && /await saveFile\(name, html\)/.test(src));
check('写入失败保留本地记录', /已存浏览器，文件保存失败/.test(src));
check('IndexedDB 存储', /indexedDB\.open\(DB_NAME/.test(src));
check('拍摄时剔除自身 UI', /id\^="' \+ UI_PREFIX/.test(src));
check('内嵌脚本剥离但保留公式源码', /script:not\(\[type\^="math\/tex"\]\)/.test(src));
check('公式真值表（MathJax）', /getAllJax/.test(src));
check('公式真值表（KaTeX）', /application\/x-tex/.test(src));
check('HTML 注释消毒', /function commentSafe/.test(src));
check('签名只取站点 #root（不把徽标算进去）', /document\.getElementById\('root'\)/.test(src));
check('可交互清单排除自身 UI', /closest\(ownUI\)/.test(src));

console.log(failed
    ? '\n❌ 自检未通过：' + failed + ' 项'
    : '\n✅ 自检全部通过');
process.exit(failed ? 1 : 0);
