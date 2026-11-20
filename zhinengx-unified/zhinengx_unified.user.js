// ==UserScript==
// @name         知能行考研数学-增强插件
// @namespace    http://tampermonkey.net/
// @version      10.0.0-beta.1
// @description  知能行视觉美化、答题快捷键、题目与解析复制、诊断报告导出与数据图表
// @author       winslght
// @license      MIT
// @icon         https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/icon.png
// @match        *://*.bestzixue.com/*
// @match        *://*.zhinengxing.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function isDarkModeActive() {
        return document.documentElement.hasAttribute('data-darkreader-scheme') ||
               document.documentElement.classList.contains('darkreader') ||
               !!document.querySelector('meta[name="darkreader-theme"]');
    }

    const showModalCopy = (text, subject) => {
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

        modal.querySelector('h4').textContent = '请按 Ctrl+C 复制' + subject;
        const ta = modal.querySelector('textarea');
        ta.value = text;
        ta.select();

        modal.querySelector('#znx-modal-close-btn').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };

    async function copyText(text, subject) {
        try {
            if (window.isSecureContext && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // Continue with synchronous selection-based copying.
        }
        const textArea = document.createElement('textarea');
        let successful = false;
        try {
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            successful = document.execCommand('copy');
        } catch {
            // The manual copy dialog remains available when the command throws.
        } finally {
            textArea.remove();
        }

        if (!successful) showModalCopy(text, subject);
        return successful;
    }

    function onDomReady(mount) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount, { once: true });
        } else {
            mount();
        }
    }

    function startExporter() {
        const win = window;

        const CACHE_KEY = 'znx-exporter-session';
        const PAGE_LOAD = performance.timeOrigin;
        let progressSnapshot = null;

        // 跨科目导出顺序与网页「分类进度」的章节顺序一致
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
            "det-compute": "行列式与矩阵",
            "vector-rank": "秩与向量",
            "linear-eqn": "线性方程组",
            "eigen": "特征值",
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

        const EXAM_ABILITY_LABEL = '12月20日';

        function orderedTopics(keys, excludeKeys) {
            const remaining = new Set(keys.filter(key => !excludeKeys.has(key)));
            const ordered = TOPIC_ORDER.filter(key => remaining.delete(key));
            return [...ordered, ...remaining];
        }

        function getExamAbility(status, key) {
            const verified = status.topic_to_final_progress?.[key];
            if (!Number.isFinite(verified) || verified < 0 || verified > 1) return null;

            // The native label reflects self-check and short-term memory when they
            // improve the verified value by more than 0.1 percentage points.
            const base = Math.ceil(verified * 1000);
            const selfCheck = Math.ceil((status.topic_to_final_progress_with_self_check_obs?.[key] || 0) * 1000);
            const shortTerm = Math.ceil((status.topic_to_shortTermMem_final_progress_with_self_check_obs?.[key] || 0) * 1000);
            const displayed = shortTerm - Math.max(base, selfCheck) > 1 ? shortTerm :
                (selfCheck - base > 1 ? selfCheck : base);

            return (displayed / 10) + '%';
        }

        function getLevelsData(status) {
            const reportLevels = status.progress_report_info?.progress_info_per_topic_all_module;
            const annualModules = status.extra_info_for_annual_plan?.module_to_topic_to_progress_per_level;
            if (reportLevels) return reportLevels;
            if (annualModules) return Object.assign({}, ...Object.values(annualModules));

            return status.topic_to_level_to_progress_with_self_check_obs || {};
        }

        function getProgressRows(status, excludeKeys) {
            const levelsData = getLevelsData(status);
            const rows = [];

            for (const key of orderedTopics([...Object.keys(levelsData), ...Object.keys(status.topic_to_final_progress || {})], excludeKeys)) {
                const levels = Array.isArray(levelsData[key]) ? levelsData[key] : [];
                const score = status.topic?.[key];
                const noRustyScore = status.topic_without_rusty?.[key];
                const examAbility = getExamAbility(status, key);
                if (examAbility !== null || levels.some(rate => rate > 0) || score > 0 || noRustyScore > 0) {
                    rows.push({ key, levels, score, noRustyScore, examAbility });
                }
            }
            return rows;
        }

        function formatCaptureTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString('sv-SE', { hour12: false });
        }

        const TOPIC_DETAIL_FIELDS = [
            'topic', 'topic_without_rusty', 'topic_to_final_progress', 'topic_to_final_progress_with_self_check_obs',
            'topic_to_shortTermMem_final_progress_with_self_check_obs', 'topic_to_detailedProgress',
            'computational_skill_info_all_topic'
        ];

        function mergeAvailable(previous, incoming) {
            if (incoming == null || incoming === '' || (Array.isArray(incoming) && !incoming.length)) return previous;
            if (typeof incoming !== 'object' || Array.isArray(incoming)) return incoming;

            const fields = previous && typeof previous === 'object' ? previous : {};
            return Object.fromEntries([...new Set([...Object.keys(fields), ...Object.keys(incoming)])].flatMap(key => {
                const value = mergeAvailable(Object.hasOwn(fields, key) ? fields[key] : undefined,
                    Object.hasOwn(incoming, key) ? incoming[key] : undefined);
                return value === undefined ? [] : [[key, value]];
            }));
        }

        function mergeLevelProgress(previous, incoming) {
            return Object.fromEntries(Object.entries(incoming).flatMap(([key, rates]) => {
                if (!Array.isArray(rates) || !rates.some(Number.isFinite)) return [];

                const prior = previous[key] || [];
                const merged = Array.from({ length: Math.max(rates.length, prior.length) }, (_, index) =>
                    Number.isFinite(rates[index]) ? rates[index] : prior[index]);
                return [[key, merged]];
            }));
        }

        function hasValue(value) {
            if (value == null || value === '') return false;
            return typeof value === 'object' ? Object.values(value).some(hasValue) : true;
        }

        function readSessionSnapshot() {
            try {
                return JSON.parse(sessionStorage.getItem(CACHE_KEY));
            } catch {
                return null;
            }
        }

        function saveSessionSnapshot() {
            if (!progressSnapshot?.account) return;
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(progressSnapshot));
            } catch {
                // The current tab can still export if browser storage is unavailable.
            }
        }

        function progressPeriodStart(timestamp, period) {
            const date = new Date(timestamp);
            date.setHours(0, 0, 0, 0);
            if (period !== 'today') {
                date.setDate(date.getDate() - (date.getDay() + 6) % 7 - (period === 'last_week' ? 7 : 0));
            }
            return date.getTime();
        }

        function mergeProgressPeriods(previous, incoming, previousAt, capturedAt) {
            const noProgressFlags = { today: 'did_make_progress_today', last_week: 'did_make_progress_last_week' };
            const periods = {};
            for (const [key] of PROGRESS_PERIODS) {
                const next = incoming?.[key];
                const changes = next?.progress_improvement_info_per_topic;
                const explicitlyEmpty = Array.isArray(next?.sorted_topics) && next.sorted_topics.length === 0 &&
                    changes && !Object.keys(changes).length;
                if (explicitlyEmpty || (incoming?.[noProgressFlags[key]] === false &&
                    !Object.values(changes || {}).some(topic => PROGRESS_METRICS.some(metric => {
                        const delta = getProgressDelta(topic?.[metric]);
                        return delta !== null && delta !== 0;
                    })))) {
                    continue;
                }

                const samePeriod = progressPeriodStart(previousAt, key) === progressPeriodStart(capturedAt, key);
                const merged = mergeAvailable(samePeriod ? previous?.[key] : undefined, next);
                if (merged) periods[key] = merged;
            }
            return periods;
        }

        function captureProgress(response) {
            const profile = response?.profile;
            const account = profile?.email || profile?.username || progressSnapshot?.account;
            const stored = progressSnapshot || (account && readSessionSnapshot());
            const previous = stored?.account === account &&
                (!profile?.examType || profile.examType === stored?.data?.profile?.examType) ? stored : null;
            const status = response?.status;
            const levels = status ? getLevelsData(status) : {};
            const topicMaps = Object.fromEntries(TOPIC_DETAIL_FIELDS.map(field => [field, status?.[field]]));
            if (!hasValue(levels) && !hasValue(topicMaps)) {
                progressSnapshot = previous || null;
                return progressSnapshot;
            }

            const info = status.progress_report_info || {};
            const capturedAt = Date.now();
            const receivedAt = {};
            for (const [field, topics] of Object.entries(topicMaps)) {
                receivedAt[field] = Object.fromEntries(Object.entries(topics || {})
                    .filter(([, value]) => hasValue(value)).map(([key]) => [key, capturedAt]));
            }

            const data = mergeAvailable(previous?.data, {
                profile: profile && {
                    examType: profile.examType,
                    nickname: profile.nickname,
                    surveyContent: profile.surveyContent && {
                        examYear: profile.surveyContent.examYear,
                        targetScore: profile.surveyContent.targetScore,
                        usingTextBookcalc: profile.surveyContent.usingTextBookcalc,
                        usingVideocalc: profile.surveyContent.usingVideocalc
                    },
                    inAppMessageInfo: profile.inAppMessageInfo && {
                        totalTimeSpent: profile.inAppMessageInfo.totalTimeSpent,
                        numFinishedTutorSession: profile.inAppMessageInfo.numFinishedTutorSession
                    }
                },
                status: {
                    ...topicMaps,
                    progress_report_info: {
                        progress_info_per_topic_all_module: mergeLevelProgress(getLevelsData(previous?.data?.status || {}), levels),
                        mock_exam_correct_rate_info: info.mock_exam_correct_rate_info,
                        wrong_problem_reason_info: info.wrong_problem_reason_info
                    }
                }
            });
            if (Array.isArray(status.topics_with_yellowDot)) data.status.topics_with_yellowDot = status.topics_with_yellowDot;
            const previousPeriods = previous?.data.status.progress_report_info?.period_to_progress_change_info;
            data.status.progress_report_info.period_to_progress_change_info = mergeProgressPeriods(
                previousPeriods, info.period_to_progress_change_info, previous?.capturedAt, capturedAt);
            const unchanged = previous && buildPureMarkdownReport(previous.data) === buildPureMarkdownReport(data);
            const unchangedRefreshes = unchanged ?
                (previous.unchangedRefreshes || 0) + (previous.pageLoad !== PAGE_LOAD ? 1 : 0) : 0;
            progressSnapshot = {
                account, data, capturedAt, pageLoad: PAGE_LOAD, unchangedRefreshes,
                receivedAt: mergeAvailable(previous?.receivedAt, receivedAt),
                lastCopy: previous?.lastCopy
            };
            saveSessionSnapshot();
            return progressSnapshot;
        }

        function getSectionCoverage(snapshot) {
            const { status, profile } = snapshot.data;
            const levels = getLevelsData(status);
            const excludeKeys = getExcludeKeys(profile?.examType);
            const linearStart = TOPIC_ORDER.indexOf('det-compute');
            const probabilityStart = TOPIC_ORDER.indexOf('prob');
            const sections = [
                ['高数', TOPIC_ORDER.slice(0, linearStart)],
                ['线代', TOPIC_ORDER.slice(linearStart, probabilityStart)],
                ['概率论', TOPIC_ORDER.slice(probabilityStart)]
            ];
            const hasCoreDetail = key => ['topic', 'topic_without_rusty', 'topic_to_final_progress'].some(field =>
                Number.isFinite(status[field]?.[key]));

            return sections.flatMap(([name, topics]) => {
                const keys = topics.filter(key => !excludeKeys.has(key));
                const reportedKeys = keys.filter(key =>
                    (Array.isArray(levels[key]) && levels[key].some(rate => rate > 0)) || hasCoreDetail(key));
                if (!keys.length || (name === '概率论' && !reportedKeys.length)) return [];

                const times = Object.values(snapshot.receivedAt || {}).flatMap(topicTimes =>
                    keys.map(key => topicTimes?.[key]).filter(Number.isFinite));
                const incomplete = !keys.some(hasCoreDetail) || reportedKeys.some(key => !hasCoreDetail(key));
                return [{ name, times, incomplete }];
            });
        }

        function buildSourceNotes(snapshot, sections) {
            return sections.map(({ name, times, incomplete }) => {
                if (!times.length) return name + '明细尚未获取';
                const oldest = Math.min(...times);
                const latest = Math.max(...times);
                return name + ' ' + formatCaptureTime(oldest) +
                    (latest !== oldest ? ' 至 ' + formatCaptureTime(latest) : '') +
                    (oldest < snapshot.capturedAt ? '（含缓存）' : '') +
                    (incomplete ? '（明细不全）' : '');
            }).join('；');
        }

        async function fingerprintReport(report) {
            try {
                const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(report));
                return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
            } catch {
                return report;
            }
        }

        function recordSuccessfulCopy(snapshot, fingerprint) {
            const prior = snapshot.lastCopy;
            const same = prior?.fingerprint === fingerprint;
            const refreshed = snapshot.pageLoad === PAGE_LOAD && prior?.pageLoad !== PAGE_LOAD;
            if (progressSnapshot?.account === snapshot.account) {
                progressSnapshot.lastCopy = { fingerprint, pageLoad: snapshot.pageLoad };
                saveSessionSnapshot();
            }

            const captured = formatCaptureTime(snapshot.capturedAt);
            const source = snapshot.pageLoad !== PAGE_LOAD ? '本次未取得新的有效数据，正在使用 ' + captured + ' 的缓存。' :
                '数据获取于 ' + captured + '。';
            if (!same) return '已复制。' + source;
            if (snapshot.pageLoad !== PAGE_LOAD) return '已复制，内容与上次一致。' + source;
            if (refreshed && snapshot.unchangedRefreshes >= 2) return '已于 ' + captured + ' 重新获取，数据暂无变化。完成新的练习或测试后，可以再导出看看。';
            if (refreshed) return '已于 ' + captured + ' 重新获取，内容与上次相同。';
            if (snapshot.unchangedRefreshes > 0) return '已复制，内容与上次一致。' + source;
            return '已复制，内容与上次相同。可刷新网页重新获取。' + source;
        }

        function showCopyNotice(message, isError = false) {
            let toast = document.getElementById('znx-export-copy-notice');
            if (toast) toast.remove();

            const scheme = document.documentElement.getAttribute('data-darkreader-scheme');
            const isDark = scheme ? scheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
            toast = document.createElement('div');
            toast.id = 'znx-export-copy-notice';

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
                max-width: min(580px, calc(100vw - 24px));
                white-space: pre-line;
                text-align: center;
                letter-spacing: 0.3px;
            `;
            toast.setAttribute('role', isError ? 'alert' : 'status');
            toast.textContent = message;
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
            }, 6500);
        }

        // ==========================================
        // 拦截 1：挂载 window.XMLHttpRequest
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
                            captureProgress(parsed);
                        } catch (e) {}
                    }
                });
                return originalSend.apply(this, arguments);
            };
        } catch (e) {}

        // ==========================================
        // 拦截 2：挂载 window.fetch
        // ==========================================
        const originalFetch = win.fetch;
        try {
            win.fetch = async function(...args) {
                const response = await originalFetch.apply(this, args);
                const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

                if (url.includes('getUserProfileDiagramLast') || url.includes('getUserProfile')) {
                    try {
                        const clone = response.clone();
                        const parsed = await clone.json();
                        captureProgress(parsed);
                    } catch (err) {}
                }
                return response;
            };
        } catch (e) {}

        // ==========================================
        // 主动接口请求机制
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
                    const res = await originalFetch.call(win, url, { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        const snapshot = captureProgress(data);
                        if (snapshot) return snapshot;
                    }
                } catch (e) {}
            }
            return null;
        }

        // ==========================================
        // 纯粹诊断报告生成器 (最顶行指定标题)
        // ==========================================
        function getReportTopicName(key) {
            return Object.hasOwn(TOPIC_NAMES, key) ? TOPIC_NAMES[key] : '未命名章节';
        }

        const PROGRESS_PERIODS = [['today', '今天'], ['cur_week', '本周'], ['last_week', '上周']];
        const PROGRESS_METRICS = ['0', '1', '2', '3', '4', 'Dec25'];
        const PROGRESS_HEADERS = ['章节', '等级 1', '等级 2', '等级 3', '等级 4', '等级 5', EXAM_ABILITY_LABEL];

        function getDailyPractice(mockExam) {
            const result = (correct, wrong) => {
                const total = Number.isFinite(correct) && Number.isFinite(wrong) ? correct + wrong : null;
                const accuracy = total > 0 ? Number((correct / total * 100).toFixed(1)) : null;
                return { correct, wrong, total, accuracy };
            };
            return (mockExam?.correctness_info_per_day || []).map(day => ({
                date: day.date,
                all: result(day.num_correct_all_stages, day.num_wrong_all_stages),
                mock: result(day.num_correct_mock_exam_only, day.num_wrong_mock_exam_only),
                tutor: Number.isFinite(day.num_tutor_all_stages) ? day.num_tutor_all_stages : null
            }));
        }

        function getProgressDelta(change) {
            const { old_progress: previous, new_progress: current } = change || {};
            return Number.isFinite(previous) && Number.isFinite(current) ? (current - previous) * 100 : null;
        }

        function getChapterChanges(period, excludeKeys) {
            const topics = period?.progress_improvement_info_per_topic || {};
            const keys = [...new Set([...(period?.sorted_topics || []), ...orderedTopics(Object.keys(topics), excludeKeys)])];
            return keys.filter(key => !excludeKeys.has(key)).flatMap(key => {
                const deltas = PROGRESS_METRICS.map(metric => {
                    const delta = getProgressDelta(topics[key]?.[metric]);
                    return delta === null ? null : Number(delta.toFixed(2));
                });
                return deltas.some(value => value !== null) ? [[getReportTopicName(key), ...deltas]] : [];
            });
        }

        function formatProgressDelta(value) {
            return value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
        }

        function buildPureMarkdownReport(json, capturedAt, asOf) {
            if (!json || !json.status) return null;

            const status = json.status || {};
            const profile = json.profile || {};
            const survey = profile.surveyContent || {};
            const reportInfo = status.progress_report_info || {};
            const mockExam = reportInfo.mock_exam_correct_rate_info || {};
            const wrongInfo = reportInfo.wrong_problem_reason_info || {};
            const changeInfo = asOf === undefined ? reportInfo.period_to_progress_change_info || {} :
                mergeProgressPeriods(reportInfo.period_to_progress_change_info, null, capturedAt, asOf);
            const detailed = status.topic_to_detailedProgress || {};
            const compSkillInfo = status.computational_skill_info_all_topic || {};
            const yellowDots = status.topics_with_yellowDot || [];
            const inApp = profile.inAppMessageInfo || {};

            const excludeKeys = getExcludeKeys(profile.examType);
            const examName = profile.examType === 1 ? '数学一 (数一)' : (profile.examType === 2 ? '数学二 (数二)' : (profile.examType === 3 ? '数学三 (数三)' : '考研数学'));
            let md = `## 1. 考生档案与学习概况\n\n`;
            md += `- **学员昵称**：${profile.nickname || '考研学员'}\n`;
            md += `- **报考科目**：**${examName}**\n`;
            md += `- **目标年份**：${survey.examYear || '2027'} 年 | **目标分数**：${survey.targetScore || '105-120'} 分\n`;
            md += `- **参考教材与视频**：${survey.usingTextBookcalc || '未指定'} / ${survey.usingVideocalc || '未指定'}\n`;
            md += `- **累计刷题时长**：${inApp.totalTimeSpent ? (inApp.totalTimeSpent / 3600000).toFixed(1) + ' 小时' : '未知'}\n`;
            md += `- **完成辅导 Session**：${inApp.numFinishedTutorSession || 0} 次\n`;
            if (yellowDots.length > 0) {
                const yellowNames = orderedTopics(yellowDots, excludeKeys).map(getReportTopicName).join('、');
                if (yellowNames) {
                    md += `- ⚠️ **须优先消灭小黄点章节**：${yellowNames}\n`;
                }
            }
            md += `\n`;

            // 2. 核心章节熟练度五级分布 (过滤 0% 与非考纲章节)
            md += `## 2. 核心章节熟练度分布 (Level 1 ~ Level 5)\n\n`;
            const rows = getProgressRows(status, excludeKeys);
            const showExamAbility = rows.some(row => row.examAbility !== null);
            const dateHeader = showExamAbility ? ` ${EXAM_ABILITY_LABEL} |` : '';
            md += `| 章节名称 | 综合熟练度 | 抗生锈熟练度 | L1 (基础%) | L2 (进阶%) | L3 (熟练%) | L4 (拔高%) | L5 (通精%) |${dateHeader}\n`;
            md += `|${' :--- |'.repeat(showExamAbility ? 9 : 8)}\n`;

            for (const { key, levels, score, noRustyScore, examAbility } of rows) {
                const topicName = getReportTopicName(key);
                const rawScore = Number.isFinite(score) ? (score * 100).toFixed(1) + '%' : '—';
                const noRusty = Number.isFinite(noRustyScore) ? (noRustyScore * 100).toFixed(1) + '%' : '—';
                const levelCells = Array.from({ length: 5 }, (_, index) => ` ${Number.isFinite(levels[index]) ? (levels[index] * 100).toFixed(1) + '%' : '—'} |`).join('');
                const dateCell = showExamAbility ? ` ${examAbility ?? '—'} |` : '';
                md += `| **${topicName}** | **${rawScore}** | ${noRusty} |${levelCells}${dateCell}\n`;
            }

            // 3. 三维能力拆解 (过滤 0% 章节)
            md += `\n## 3. 知识点三维能力拆解 (概念 / 简单应用 / 综合技巧)\n\n`;
            md += `| 章节名称 | 💡 概念掌握 (CONCEPTS) | 🛠️ 简单应用 (APPLICATION) | ⚡ 综合技巧 (COMBO) |\n`;
            md += `| :--- | :--- | :--- | :--- |\n`;

            for (const key of orderedTopics(Object.keys(detailed), excludeKeys)) {
                const dims = detailed[key];
                if (dims && (dims.CONCEPTS > 0 || dims.SIMPLE_APPLICATION > 0 || dims.COMBO_SKILL > 0)) {
                    const topicName = getReportTopicName(key);
                    const concepts = Number.isFinite(dims.CONCEPTS) ? (dims.CONCEPTS * 100).toFixed(1) + '%' : '—';
                    const app = Number.isFinite(dims.SIMPLE_APPLICATION) ? (dims.SIMPLE_APPLICATION * 100).toFixed(1) + '%' : '—';
                    const combo = Number.isFinite(dims.COMBO_SKILL) ? (dims.COMBO_SKILL * 100).toFixed(1) + '%' : '—';
                    md += `| **${topicName}** | ${concepts} | ${app} | ${combo} |\n`;
                }
            }

            // 4. 重计算题能力明细 (过滤 0 次接触的章节)
            md += `\n## 4. 重计算题硬核能力明细\n\n`;
            md += `| 章节名称 | 重计算题接触数 | 独立做对率 | 二次尝试修正次数 |\n`;
            md += `| :--- | :--- | :--- | :--- |\n`;
            for (const key of orderedTopics(Object.keys(compSkillInfo), excludeKeys)) {
                const info = compSkillInfo[key];
                if (info && info.num_seen_computational_heavy_problems > 0) {
                    const name = getReportTopicName(key);
                    const ratio = Number.isFinite(info.correct_ratio) ? (info.correct_ratio * 100).toFixed(1) + '%' : '—';
                    md += `| **${name}** | ${info.num_seen_computational_heavy_problems} 题 | **${ratio}** | ${info.num_2nd_attempt_numerical_problems} 次 |\n`;
                }
            }

            const daily = getDailyPractice(mockExam);
            if (daily.length) {
                md += `\n## 5. 每日综合刷题与纯综测\n\n`;
                md += `| 日期 | 综合题量 | 综合做对 | 综合做错 | 综合正确率 | 纯综测题量 | 纯综测正确率 | 辅导题量 |\n`;
                md += `|${' :--- |'.repeat(8)}\n`;
                const accuracy = value => value === null ? '—' : value.toFixed(1) + '%';
                for (const { date, all, mock, tutor } of daily) {
                    md += `| ${date} | ${all.total ?? '—'} | ${all.correct ?? '—'} | ${all.wrong ?? '—'} | ${accuracy(all.accuracy)} | ${mock.total ?? '—'} | ${accuracy(mock.accuracy)} | ${tutor ?? '—'} |\n`;
                }
            }

            // 6. 做错原因归因与诊断
            if (wrongInfo && wrongInfo.total_num_wrong > 0) {
                md += `\n## 6. 做错原因归因与诊断\n\n`;
                md += `- **记录错题总数**：${wrongInfo.total_num_wrong} 题\n`;
                md += `- **因做题速度过快粗心导致错题**：${wrongInfo.total_num_wrong_due_to_answer_too_fast || 0} 题\n`;
                md += `- **成功通过 Tutor 辅导阶段**：${wrongInfo.total_num_success_tutor_session || 0} 次\n`;
                md += `- **未成功通过 Tutor 辅导阶段**：${wrongInfo.total_num_failed_tutor_session || 0} 次\n`;
            }

            const periods = PROGRESS_PERIODS.map(([key, label]) => [label, getChapterChanges(changeInfo[key], excludeKeys)])
                .filter(([, rows]) => rows.length);
            if (periods.length) {
                md += `\n## 7. 章节进步幅度（百分点）\n\n`;
                for (const [label, rows] of periods) {
                    md += `### ${label}\n\n| ${PROGRESS_HEADERS.join(' | ')} |\n`;
                    md += `|${' :--- |'.repeat(PROGRESS_HEADERS.length)}\n`;
                    for (const [chapter, ...deltas] of rows) {
                        md += `| ${chapter} | ${deltas.map(formatProgressDelta).join(' | ')} |\n`;
                    }
                    md += '\n';
                }
            }

            return md;
        }

        // ==========================================
        // ECharts 与大屏 UI
        // ==========================================
        // A pending promise is shared by preloading and chart clicks. Keep a
        // successful load, but discard a failed attempt so the next click retries.
        let echartsLoad = null;
        function loadECharts() {
            if (echartsLoad) return echartsLoad;
            echartsLoad = new Promise(resolve => {
                const script = document.createElement('script');
                script.id = 'echarts-lib';
                script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
                const finish = loaded => {
                    if (!loaded) {
                        script.remove();
                        echartsLoad = null;
                    }
                    resolve(loaded);
                };
                script.onload = () => finish(typeof window.echarts?.init === 'function');
                script.onerror = () => finish(false);
                document.head.appendChild(script);
            });
            return echartsLoad;
        }

        function createDashboardModal() {
            const existingModal = document.getElementById('znx-dashboard-modal');
            if (existingModal) {
                existingModal.style.display = 'block';
                renderCharts();
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
                display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, max(430px, calc((100% - 30px) / 2))), 1fr)); gap: 30px; max-width: 1400px; margin: 0 auto;
            `;

            const chart1 = document.createElement('div'); chart1.id = 'znx-chart-bar'; chart1.style.cssText = 'background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 30px; grid-column: 1 / -1; overflow-x: auto;';
            const chart2 = document.createElement('div'); chart2.id = 'znx-chart-radar'; chart2.style.cssText = 'height: 560px; min-width: 0; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px;';
            const chart3 = document.createElement('div'); chart3.id = 'znx-chart-line'; chart3.style.cssText = 'height: 560px; min-width: 0; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px;';

            chartsContainer.appendChild(chart1);
            chartsContainer.appendChild(chart2);
            chartsContainer.appendChild(chart3);

            const changes = document.createElement('section');
            changes.id = 'znx-chart-progress-changes';
            changes.style.cssText = chart1.style.cssText;
            chartsContainer.appendChild(changes);

            modal.appendChild(closeBtn);
            modal.appendChild(title);
            modal.appendChild(chartsContainer);
            document.body.appendChild(modal);

            renderCharts();
        }

        const PROGRESS_SERIES_STYLES = [
            { color: '#ffffff', borderColor: '#64748b', borderWidth: 1 },
            { color: '#16a34a' },
            { color: '#2563eb' },
            { color: '#9333ea' },
            { color: '#ea580c' },
            { color: '#dc2626' }
        ];

        function formatProgressTooltip(points) {
            const content = document.createElement('div');
            content.style.cssText = 'display:grid;grid-template-columns:max-content max-content;gap:3px 20px;';
            const title = document.createElement('div');
            title.style.gridColumn = '1 / -1';
            title.textContent = points[0]?.axisValueLabel || '';
            content.append(title);

            for (const { seriesName, seriesIndex, value } of points) {
                const label = document.createElement('span');
                const dot = document.createElement('span');
                const style = PROGRESS_SERIES_STYLES[seriesIndex];
                dot.style.cssText = 'display:inline-block;width:10px;height:10px;box-sizing:border-box;border-radius:50%;margin-right:6px';
                dot.style.backgroundColor = style.color;
                if (style.borderWidth) dot.style.border = style.borderWidth + 'px solid ' + style.borderColor;
                label.append(dot, seriesName);
                const amount = document.createElement('span');
                amount.style.cssText = 'text-align:right;font-variant-numeric:tabular-nums;';
                amount.textContent = Number.isFinite(value) ? formatProgressDelta(value) + ' 个百分点' : '—';
                content.append(label, amount);
            }
            return content.outerHTML;
        }

        function renderProgressChanges(changeInfo, excludeKeys) {
            const panel = document.getElementById('znx-chart-progress-changes');
            const openDetails = new Set([...panel.querySelectorAll('details[open]')].map(details => details.dataset.period));
            for (const plot of panel.querySelectorAll('[data-znx-progress-plot]')) {
                echarts.getInstanceByDom(plot)?.dispose();
            }

            const periods = PROGRESS_PERIODS.map(([key, label]) =>
                ({ key, label, rows: getChapterChanges(changeInfo?.[key], excludeKeys) }));
            const values = periods.flatMap(({ rows }) => rows.flatMap(([, ...deltas]) =>
                deltas.filter(value => value !== null)));
            const min = Math.min(0, Math.floor(Math.min(0, ...values) * 1.1));
            const max = Math.max(1, Math.ceil(Math.max(0, ...values) * 1.1));

            panel.innerHTML = `<h2 style="font-size:20px;margin:0 0 18px">章节进步幅度（百分点）</h2>` +
                periods.map(({ key, label, rows }) => `
                    <section style="padding:16px 0;border-top:1px solid #e5e7eb">
                        <h3 style="font-size:16px;margin:0 0 8px">${label}</h3>
                        ${rows.length ? `
                            <div data-znx-progress-plot="${key}" style="height:${Math.max(210, rows.length * 72 + 90)}px"></div>
                            <details data-period="${key}"${openDetails.has(key) ? ' open' : ''}>
                                <summary style="cursor:pointer;width:fit-content;padding:8px 12px;border:1px solid #93c5fd;border-radius:8px;background:#eff6ff;color:#1e40af;font-size:15px;font-weight:700">查看明细</summary>
                                <div style="overflow-x:auto">
                                    <table style="width:100%;min-width:620px;margin-top:12px;border-collapse:collapse;text-align:center;font-size:15px;line-height:1.5">
                                        <thead><tr>${PROGRESS_HEADERS.map(name => `<th scope="col" style="padding:10px">${name}</th>`).join('')}</tr></thead>
                                        <tbody>${rows.map(([chapter, ...deltas]) => `<tr style="border-top:1px solid #e5e7eb">
                                            ${[chapter, ...deltas.map(formatProgressDelta)].map(value => `<td style="padding:10px">${value}</td>`).join('')}
                                        </tr>`).join('')}</tbody>
                                    </table>
                                </div>
                            </details>` : '<p>这个时段暂无章节进步明细。</p>'}
                    </section>`).join('');

            for (const { key, rows } of periods) {
                if (!rows.length) continue;

                const plot = panel.querySelector(`[data-znx-progress-plot="${key}"]`);
                const names = PROGRESS_HEADERS.slice(1);
                echarts.init(plot).setOption({
                    grid: { left: 8, right: 20, top: 38, bottom: 18, containLabel: true },
                    legend: { type: 'scroll', top: 0, data: names, icon: 'rect' },
                    tooltip: { trigger: 'axis', formatter: formatProgressTooltip },
                    xAxis: { type: 'value', min, max },
                    yAxis: {
                        type: 'category', inverse: true, data: rows.map(([chapter]) => chapter),
                        axisLabel: { fontSize: 16, fontWeight: 'bold', width: 165, overflow: 'truncate' },
                        axisLine: { onZero: false },
                        splitLine: { show: true, interval: 0, lineStyle: { color: '#cbd5e1', width: 1.25 } }
                    },
                    series: names.map((name, index) => ({
                        name,
                        type: 'bar',
                        barMaxWidth: 7,
                        data: rows.map(row => row[index + 1]),
                        itemStyle: PROGRESS_SERIES_STYLES[index],
                        markLine: {
                            silent: true, symbol: 'none', label: { show: false },
                            lineStyle: { type: 'solid', color: '#64748b' },
                            data: [{ xAxis: 0 }]
                        }
                    }))
                });
            }
        }

        function getDashboardChart(id) {
            const container = document.getElementById(id);
            return echarts.getInstanceByDom(container) || echarts.init(container);
        }

        function renderMatrixProgressCell(percent, label) {
            return `
                <td style="padding: 15px 10px;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="border: 1px solid rgb(69, 101, 155); background: linear-gradient(to right, rgb(121, 179, 82) ${percent}%, white ${percent}%); height: 16px; width: 90%; border-radius: 2px;"></div>
                        <div style="color: #4b5563; font-size: 13px; font-weight: bold; margin-top: 6px;">${label}</div>
                    </div>
                </td>
            `;
        }

        function renderCharts() {
            if (!progressSnapshot) return;
            const { status, profile = {} } = progressSnapshot.data;
            const excludeKeys = getExcludeKeys(profile.examType);

            const rows = getProgressRows(status, excludeKeys);
            const showExamAbility = rows.some(row => row.examAbility !== null);
            const filterTopics = keys => orderedTopics(keys, excludeKeys).filter(key => TOPIC_NAMES[key]);

            // 1. 原生级进度矩阵
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
                            ${showExamAbility ? `<th style="padding: 15px 10px; white-space: nowrap;">${EXAM_ABILITY_LABEL}</th>` : ''}
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const { key, levels: rates, examAbility } of rows) {
                matrixHtml += `<tr style="border-bottom: 1px solid #f3f4f6;">`;
                matrixHtml += `<td style="padding: 18px 10px; text-align: left; font-weight: bold; color: #111827; font-size: 16px;">${TOPIC_NAMES[key] || key.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`;

                for (let i = 0; i < 5; i++) {
                    const percent = Number.isFinite(rates[i]) ? rates[i] * 100 : null;
                    if (percent > 0) {
                        matrixHtml += renderMatrixProgressCell(percent, percent.toFixed(1) + '%');
                    } else {
                        matrixHtml += `
                            <td style="padding: 15px 10px;">
                                <div style="color: #d1d5db; font-size: 13px; font-weight: 500;">${percent === null ? '—' : '0.0%'}</div>
                            </td>
                        `;
                    }
                }
                if (showExamAbility) {
                    matrixHtml += examAbility === null
                        ? '<td style="padding: 15px 10px;">—</td>'
                        : renderMatrixProgressCell(Number.parseFloat(examAbility), examAbility);
                }
                matrixHtml += `</tr>`;
            }

            matrixHtml += `</tbody></table>`;
            matrixContainer.innerHTML = matrixHtml;

            // 2. 三维能力雷达图
            const detailed = status.topic_to_detailedProgress || {};
            const radarTopics = filterTopics(Object.keys(detailed)).filter(k => detailed[k].CONCEPTS > 0 || detailed[k].SIMPLE_APPLICATION > 0);
            const indicator = radarTopics.map(k => ({ name: TOPIC_NAMES[k], max: 100 }));
            const valConcepts = [], valApp = [], valCombo = [];
            radarTopics.forEach(k => {
                const { CONCEPTS, SIMPLE_APPLICATION, COMBO_SKILL } = detailed[k];
                valConcepts.push(Number.isFinite(CONCEPTS) ? (CONCEPTS * 100).toFixed(1) : null);
                valApp.push(Number.isFinite(SIMPLE_APPLICATION) ? (SIMPLE_APPLICATION * 100).toFixed(1) : null);
                valCombo.push(Number.isFinite(COMBO_SKILL) ? (COMBO_SKILL * 100).toFixed(1) : null);
            });
            const radarChart = getDashboardChart('znx-chart-radar');
            const radarWidth = radarChart.getWidth();
            const radarRadius = Math.max(24, Math.min(radarWidth * 0.34, (radarWidth - 250) / 2, radarChart.getHeight() * 0.43));
            radarChart.setOption({
                title: { text: '知识点三维能力雷达', left: 'center' },
                tooltip: {},
                legend: { top: 'bottom' },
                radar: {
                    indicator: indicator.length > 0 ? indicator : [{ name: '暂无数据', max: 100 }],
                    radius: radarRadius,
                    axisNameGap: 8,
                    axisName: { fontSize: 14, width: 90, overflow: 'breakAll' }
                },
                series: [{
                    type: 'radar',
                    data: [
                        { value: valConcepts, name: '概念掌握' },
                        { value: valApp, name: '简单应用' },
                        { value: valCombo, name: '综合技巧' }
                    ]
                }]
            });

            const daily = getDailyPractice(status.progress_report_info?.mock_exam_correct_rate_info);
            getDashboardChart('znx-chart-line').setOption({
                title: { text: '每日刷题与综测', left: 'center' },
                tooltip: { trigger: 'axis' },
                legend: { type: 'scroll', bottom: 0 },
                grid: { bottom: 55, containLabel: true },
                xAxis: { type: 'category', data: daily.map(day => day.date) },
                yAxis: [
                    { type: 'value', name: '正确率 (%)', max: 100 },
                    { type: 'value', name: '题量', position: 'right' }
                ],
                series: [
                    { name: '综合正确率', type: 'line', data: daily.map(day => day.all.accuracy), itemStyle: { color: '#047857' } },
                    { name: '纯综测正确率', type: 'line', data: daily.map(day => day.mock.accuracy), itemStyle: { color: '#7c3aed' } },
                    { name: '综合题量', type: 'bar', yAxisIndex: 1, data: daily.map(day => day.all.total), itemStyle: { color: '#93c5fd' } },
                    { name: '纯综测题量', type: 'bar', yAxisIndex: 1, data: daily.map(day => day.mock.total), itemStyle: { color: '#a78bfa' } },
                    { name: '辅导题量', type: 'bar', yAxisIndex: 1, data: daily.map(day => day.tutor), itemStyle: { color: '#fbbf24' } }
                ]
            });
            const changeInfo = mergeProgressPeriods(status.progress_report_info?.period_to_progress_change_info,
                null, progressSnapshot.capturedAt, Date.now());
            renderProgressChanges(changeInfo, excludeKeys);
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
                    if (exportBtn.disabled) return;
                    exportBtn.disabled = true;
                    const textSpan = exportBtn.querySelector('#exportTabText');
                    const iconSvg = exportBtn.querySelector('#exportIconSvg');
                    const originalText = '导出报告';

                    try {
                        textSpan.innerText = '生成中...';

                        const snapshot = progressSnapshot || await fetchFullJsonActively();
                        if (!snapshot) {
                            showCopyNotice('尚未获取进度数据。请确认已登录，再刷新网页。', true);
                            return;
                        }

                        const reportContent = buildPureMarkdownReport(snapshot.data, snapshot.capturedAt, Date.now());
                        if (!reportContent) {
                            showCopyNotice('进度数据不完整，请刷新网页后再导出。', true);
                            return;
                        }

                        const captured = formatCaptureTime(snapshot.capturedAt);
                        const date = captured.slice(0, 10).replaceAll('-', '/');
                        const sections = getSectionCoverage(snapshot);
                        const sources = buildSourceNotes(snapshot, sections);
                        const missing = sections.filter(section => section.incomplete).map(section => section.name).join('、');
                        const warning = missing ? missing + '明细不全。请切换到对应科目并刷新，再导出完整报告。' : '';
                        if (warning) showCopyNotice(warning, true);

                        const reportMarkdown = `# 知能行${date}导出报告\n\n- **数据获取时间**：${captured}\n` +
                            (sources ? `- **各科明细**：${sources}\n` : '') + `\n${reportContent}`;
                        const copySuccess = await copyText(reportMarkdown, '诊断报告');
                        if (copySuccess) {
                            const fingerprint = await fingerprintReport(reportContent);
                            const feedback = recordSuccessfulCopy(snapshot, fingerprint);
                            showCopyNotice(warning ? warning + '\n' + feedback : feedback, Boolean(warning));
                            textSpan.innerText = '复制成功!';
                            textSpan.style.color = '#4ade80';
                            if (iconSvg) iconSvg.style.color = '#4ade80';
                            setTimeout(() => {
                                textSpan.innerText = originalText;
                                textSpan.style.color = '';
                                if (iconSvg) iconSvg.style.color = '';
                            }, 2500);
                        }
                    } catch (err) {
                        console.error('【知能行 AI 导出器】导出报告运行时异常:', err);
                        showCopyNotice('导出报告失败：' + (err.message || err), true);
                    } finally {
                        exportBtn.disabled = false;
                        if (textSpan && textSpan.innerText === '生成中...') {
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
                    const snapshot = progressSnapshot || await fetchFullJsonActively();
                    if (!snapshot) {
                        alert('未能调取到熟练度 JSON 数据，请确认知能行是否已登录并刷新页面！'); return;
                    }
                    if (!await loadECharts()) {
                        alert('图表库 ECharts 加载失败，请再次点击数据图表重试。'); return;
                    }
                    createDashboardModal();
                });

                tabContainer.appendChild(chartBtn);
            }
        }

        const observer = new MutationObserver(() => {
            if (!document.getElementById('modulePageTabs导出') && document.querySelector('.MuiTabs-flexContainer')) {
                injectTabs();
            }
        });

        onDomReady(() => {
            observer.observe(document.body, { childList: true, subtree: true });
            injectTabs();
            loadECharts();
        });
    }

    function mountBeautifier() {
        const SCRIPT_VERSION = '10.0.0-dev.1.3';
        const DEV_SOURCE_MODIFIED_AT = '2026-11-20 20:27:11';
        console.log(`[ZhiNengX Enhancer] 知能行视觉美化与助手 v${SCRIPT_VERSION} 已启动`);

        let styleEl;

        // ==========================================
        // 1. 深色模式检测 (自动联动 Dark Reader)
        // ==========================================
        // ==========================================
        // 2. 生成全局 CSS (所有参数硬编码，零运行时开销)
        // ==========================================
        function generateBaseCSS() {
            const isDark = isDarkModeActive();
            const glassRgb = isDark ? '14, 14, 14' : '255, 255, 255';
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
                    background: rgba(${glassRgb}, ${isDark ? '0.5' : '0.35'}) !important;
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

                /* 训练成果与阶段过渡卡片：按脚本标记恢复原生填充和分层毛玻璃 */
                [data-znx-training-progress-root] {
                    background: rgba(0, 0, 0, 0.12) !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    overflow: hidden !important;
                }
                [data-znx-training-progress-fill] {
                    background: var(--znx-training-progress-fill) !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                }
                [data-znx-training-transition-card] {
                    background: rgba(${glassRgb}, 0.5) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06) !important;
                }
                /* 成功内容与底部操作栏共用外层毛玻璃，避免叠加底色。 */
                [data-znx-training-success-row],
                [data-znx-training-success-actions],
                [data-znx-training-overview-surface] {
                    background: transparent !important;
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
                    background: rgba(${isDark ? '14, 14, 14' : '255, 255, 255'}, ${isDark ? '0.5' : '0.85'}) !important;
                    backdrop-filter: blur(${isDark ? '10px' : '15px'}) !important;
                    -webkit-backdrop-filter: blur(${isDark ? '10px' : '15px'}) !important;
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

                /* B. 全站内容卡片 Surface 统一毛玻璃 Token (透光度 0.5, 高斯模糊 10px) */
                html.znx-doing-questions label[name="choiceButton"][style*="background-color: rgb(255, 255, 255)"]:has(> input[name="choice"]:not(:checked)),
                .jumbotron,
                div[class*="jumbotron"],
                .MuiPaper-root:not(.MuiAppBar-root):not(.MuiDialog-paper):not(.MuiPopover-paper),
                div[id*="weaknessDisplayContainer"],
                div[id*="DisplayContainer"],
                div[id*="displayContainer"],
                div[style*="background-color: white"]:not([style*="url"]):not([id^="znx-anime"]):not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height: 14px"]):not([style*="height: 12px"]):not([style*="height: 10px"]):not([style*="height: 8px"]),
                div[style*="background-color: rgb(255, 255, 255)"]:not([style*="url"]):not([id^="znx-anime"]):not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height: 14px"]):not([style*="height: 12px"]):not([style*="height: 10px"]):not([style*="height: 8px"]),
                div[style*="background-color: antiquewhite"]:not([style*="url"]):not([id^="znx-anime"]):not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height: 14px"]):not([style*="height: 12px"]):not([style*="height: 10px"]):not([style*="height: 8px"]),
                div[style*="background: antiquewhite"]:not([style*="url"]):not([id^="znx-anime"]):not([id*="waifu"]):not([id*="live2d"]):not([style*="height: 16px"]):not([style*="height: 14px"]):not([style*="height: 12px"]):not([style*="height: 10px"]):not([style*="height: 8px"]) {
                    background: rgba(${glassRgb}, 0.5) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 12px !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
                }

                /* 判题锁定后，普通选项保留与题干一致的毛玻璃叠加效果。 */
                html.znx-doing-questions label.disabled[name="choiceButton"][style*="background-color: rgb(255, 255, 255)"]:has(> input[name="choice"]:not(:checked)) {
                    opacity: 1 !important;
                }

                #navigation-pills[data-znx-account-settings-glass] {
                    background: rgba(${glassRgb}, 0.72) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 12px;
                }

                /* C. 复习提要与弹窗内卡片/标题块专属 0.3 通透度 Token */
                div[class*="_1WPKAzobBNGZO4ntJOK2Fy"],
                .MuiDialogContent-root h2[style*="background-color"],
                .MuiDialogContent-root div[style*="background-color"],
                div[style*="background-color: rgb(235, 235, 235)"],
                div[style*="background-color: #ebebeb"],
                h2[style*="background-color: rgb(235, 235, 235)"],
                h2[style*="background-color: #ebebeb"] {
                    background: rgba(${glassRgb}, 0.3) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 8px !important;
                    border: 1px solid rgba(255, 255, 255, 0.25) !important;
                }

                /* D. 弹窗/对话框 (opacity: 0.8, blur: 20px) */
                .MuiDialog-paper {
                    background: rgba(${glassRgb}, 0.8) !important;
                    backdrop-filter: blur(20px) !important;
                    -webkit-backdrop-filter: blur(20px) !important;
                }
                .MuiDialog-paper[data-znx-finish-test-dialog] {
                    background: rgba(${glassRgb}, 0.65) !important;
                }

                /* E. 做题面板 Bootstrap (opacity: 0.5, blur: 10px) */
                .jumbotron {
                    background: rgba(${glassRgb}, 0.5) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 12px !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
                }

                /* 做题顶栏单题倒计时：霸气 24px 红色加粗、无背景盒、代码等宽抗抖动 */
                .znx-topbar-timer {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Roboto Mono", monospace !important;
                    font-variant-numeric: tabular-nums !important;
                    -webkit-font-feature-settings: "tnum" 1 !important;
                    font-feature-settings: "tnum" 1 !important;
                    font-size: 24px !important;
                    font-weight: 900 !important;
                    color: #ff3344 !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 2px !important;
                    letter-spacing: 0.5px !important;
                    transition: text-shadow 0.3s ease, color 0.3s ease !important;
                    display: inline-block !important;
                }

                /* 时间少于 3 分钟 (< 180s)：字体边缘红色光极清高亮 (4层叠加高饱和立体常亮红光) */
                .znx-timer-warning-glow {
                    color: #ff3344 !important;
                    background: transparent !important;
                    text-shadow:
                        0 0 3px #ff0033,
                        0 0 8px #ff0033,
                        0 0 16px rgba(255, 0, 51, 0.95),
                        0 0 26px rgba(255, 0, 51, 0.75) !important;
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
                html.znx-doing-questions [data-znx-result="correct"] {
                    background: rgba(34, 197, 94, 0.4) !important;
                    backdrop-filter: blur(8px) saturate(140%) !important;
                    -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
                    border-top: 1.5px solid rgba(34, 197, 94, 0.8) !important;
                    box-shadow: 0 -4px 20px rgba(34, 197, 94, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
                    transition: background 0.2s ease !important;
                }
                html.znx-doing-questions [data-znx-result="wrong"] {
                    background: rgba(239, 68, 68, 0.4) !important;
                    backdrop-filter: blur(8px) saturate(140%) !important;
                    -webkit-backdrop-filter: blur(8px) saturate(140%) !important;
                    border-top: 1.5px solid rgba(239, 68, 68, 0.8) !important;
                    box-shadow: 0 -4px 20px rgba(239, 68, 68, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
                    transition: background 0.2s ease !important;
                }
                html.znx-doing-questions [data-znx-result] div {
                    background: transparent !important;
                    box-shadow: none !important;
                }

                [data-znx-copy-solution-control] {
                    position: relative;
                    display: inline-block;
                    vertical-align: middle;
                    margin-inline-end: 8px;
                }
                button[data-znx-copy-solution].btn-primary {
                    background-color: #E58068 !important;
                    border-color: #E58068 !important;
                }
                button[data-znx-copy-solution].btn-primary:hover,
                button[data-znx-copy-solution].btn-primary:focus-visible,
                button[data-znx-copy-solution].btn-primary:active {
                    background-color: #D86B52 !important;
                    border-color: #D86B52 !important;
                }
                .znx-copy-solution-tooltip {
                    position: absolute;
                    inset-block-end: calc(100% + 14px);
                    inset-inline-start: 50%;
                    transform: translateX(-50%) scale(0.75, 0.5625);
                    transform-origin: center bottom;
                    width: max-content;
                    max-width: min(200px, 70vw);
                    padding: 10px 15px;
                    border-radius: 4px;
                    background-color: #fff;
                    color: #555;
                    box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
                    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                    font-size: 15px;
                    font-weight: 500;
                    line-height: 1.4;
                    text-align: center;
                    white-space: normal;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
                        transform 133ms cubic-bezier(0.4, 0, 0.2, 1),
                        visibility 0s linear 200ms;
                    pointer-events: none;
                    z-index: 2;
                }
                button[data-znx-copy-solution]:hover + .znx-copy-solution-tooltip,
                button[data-znx-copy-solution]:focus-visible + .znx-copy-solution-tooltip {
                    transform: translateX(-50%) scale(1);
                    opacity: 1;
                    visibility: visible;
                    transition-delay: 0s;
                }
                @media (prefers-reduced-motion: reduce) {
                    .znx-copy-solution-tooltip {
                        transition: none;
                    }
                }

                /* 做题工具栏与倒计时胶囊全设备多端 (PC / 平板 / 手机端) 响应式适配 */
                #znx-problem-tools-bar {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    margin-bottom: 10px !important;
                    margin-right: auto !important;
                    flex-wrap: wrap !important;
                    position: relative !important;
                    min-height: 32px !important;
                    z-index: 1 !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }

                @media (max-width: 600px) {
                    #znx-problem-tools-bar {
                        width: 100% !important;
                        justify-content: space-between !important;
                        gap: 8px !important;
                    }
                    #znx-problem-tools-bar > button,
                    #znx-doing-countdown-wrapper {
                        flex: 1 1 calc(50% - 4px) !important;
                        min-width: 140px !important;
                        box-sizing: border-box !important;
                    }
                    #znx-doing-countdown-btn {
                        width: 100% !important;
                        max-width: 100% !important;
                        font-size: 11px !important;
                        padding: 4px 6px !important;
                    }
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
            const glassRgb = isDark ? '14, 14, 14' : '255, 255, 255';

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

                // 凡带有背景壁纸图片或尺寸接近全屏的大容器，绝对不加毛玻璃，防止挡屏遮遮壁纸
                if (
                    getComputedStyle(el).backgroundImage.includes('url') ||
                    (el.clientWidth > window.innerWidth * 0.85 && el.clientHeight > window.innerHeight * 0.85)
                ) {
                    targetClasses.forEach(c => excludedClasses.add(c));
                    return;
                }

                const bg = getComputedStyle(el).backgroundColor;
                if (bg === 'rgb(255, 255, 255)' || bg === 'rgb(250, 235, 215)' || bg === 'rgb(235, 235, 235)' || bg === '#fff' || bg === '#ebebeb' || bg === 'rgb(35, 38, 40)') {
                    const targetClass = targetClasses.find(c => !processedClasses.has(c) && !excludedClasses.has(c));
                    if (targetClass) {
                        processedClasses.add(targetClass);

                        const text = el.innerText || '';
                        const isHeaderBar = text.includes('反馈') || text.includes('退出') || text.includes('复习');
                        const bgVal = isHeaderBar ? `rgba(${glassRgb}, 0.35)` : `rgba(${glassRgb}, 0.5)`;
                        const blurVal = isHeaderBar ? 'blur(10px) saturate(140%)' : 'blur(10px)';
                        const borderRadius = isHeaderBar ? '0' : '12px';

                        const style = document.createElement('style');
                        style.className = 'znx-dynamic-glass';
                        style.innerHTML = `.${targetClass} { background: ${bgVal} !important; backdrop-filter: ${blurVal} !important; -webkit-backdrop-filter: ${blurVal} !important; border-radius: ${borderRadius} !important; border: 1px solid rgba(255, 255, 255, 0.3) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important; transform: translateZ(0); }`;
                        document.head.appendChild(style);
                    }
                } else {
                    targetClasses.forEach(c => excludedClasses.add(c));
                }
            });
        }

        function markTrainingOverviewSurfaces() {
            const attribute = 'data-znx-training-overview-surface';
            const surfaces = new Set();
            document.querySelectorAll('#root button').forEach(button => {
                const label = button.textContent.trim();
                const matchesContent = label === '返回主页'
                    ? row => /^温故知新[！!]/.test(row.textContent.trim())
                    : label === '开始训练' ? row => !!row.querySelector('#weaknessDisplayContainer') : null;
                if (!matchesContent) return;
                for (let actions = button.parentElement; actions && actions.id !== 'root'; actions = actions.parentElement) {
                    if (getComputedStyle(actions).position !== 'fixed') continue;
                    const row = Array.from(actions.parentElement.children).find(el =>
                        getComputedStyle(el).display === 'table-row' &&
                        matchesContent(el) &&
                        Array.from(el.children).some(child => getComputedStyle(child).display === 'table-cell')
                    );
                    if (row) {
                        surfaces.add(row);
                        surfaces.add(actions);
                    }
                    break;
                }
            });
            document.querySelectorAll(`[${attribute}]`).forEach(el => {
                if (!surfaces.has(el)) el.removeAttribute(attribute);
            });
            surfaces.forEach(el => el.setAttribute(attribute, '1'));
        }

        function restoreTrainingVisuals() {
            const textOf = el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            const trainingText = /训练成果|阶段|你已经初步掌握|有进步|成功！/;

            document.querySelectorAll('[data-znx-training-success-row]').forEach(row => {
                if (!/成功[！!]/.test(textOf(row)) || !/训练|知识点/.test(textOf(row)) || !row.querySelector('button')) {
                    row.removeAttribute('data-znx-training-success-row');
                }
            });
            document.querySelectorAll('#root button').forEach(button => {
                for (let el = button.parentElement; el && el.id !== 'root'; el = el.parentElement) {
                    if (getComputedStyle(el).display === 'table-row' &&
                        /成功[！!]/.test(textOf(el)) && /训练|知识点/.test(textOf(el)) &&
                        Array.from(el.children).some(child => getComputedStyle(child).display === 'table-cell')) {
                        el.setAttribute('data-znx-training-success-row', '1');
                        break;
                    }
                }
            });

            document.querySelectorAll('[data-znx-training-success-actions]').forEach(el => {
                const labels = Array.from(el.querySelectorAll('button'), button => textOf(button));
                if (!labels.includes('休息一下') || !labels.includes('继续') ||
                    !el.parentElement?.querySelector('[data-znx-training-success-row]')) {
                    el.removeAttribute('data-znx-training-success-actions');
                }
            });
            document.querySelectorAll('#root button').forEach(button => {
                if (textOf(button) !== '休息一下') return;
                for (let el = button.parentElement; el && el.id !== 'root'; el = el.parentElement) {
                    if (getComputedStyle(el).position === 'fixed' &&
                        el.parentElement?.querySelector('[data-znx-training-success-row]') &&
                        Array.from(el.querySelectorAll('button')).some(other => textOf(other) === '继续')) {
                        el.setAttribute('data-znx-training-success-actions', '1');
                        break;
                    }
                }
            });

            const cards = Array.from(document.querySelectorAll('div')).filter(el =>
                el.clientHeight >= 60 && el.clientHeight <= 300 && trainingText.test(textOf(el)) && el.querySelector('button')
            );

            cards.forEach(card => {
                card.setAttribute('data-znx-training-transition-card', '1');
                card.querySelectorAll('div').forEach(el => {
                    const style = getComputedStyle(el);
                    const parent = el.parentElement;
                    if (!parent) return;

                    const isProgressRoot = el.children.length === 1 &&
                        el.clientWidth > 0 && el.clientHeight > 0 &&
                        el.clientWidth >= el.firstElementChild.clientWidth &&
                        el.clientHeight <= 24 &&
                        style.overflow === 'hidden';
                    const isProgressFill = parent.clientHeight > 0 &&
                        parent.clientHeight <= 24 &&
                        el.clientHeight >= parent.clientHeight * 0.7 &&
                        el.clientWidth <= parent.clientWidth &&
                        (el.getAttribute('style') || '').includes('%');

                    if (isProgressRoot) el.setAttribute('data-znx-training-progress-root', '1');
                    if (isProgressFill && !el.hasAttribute('data-znx-training-progress-fill')) {
                        const background = style.backgroundImage !== 'none' ? style.backgroundImage : style.backgroundColor;
                        el.style.setProperty('--znx-training-progress-fill', background);
                        el.setAttribute('data-znx-training-progress-fill', '1');
                    }
                });
            });
        }

        function markFinishTestDialog() {
            document.querySelectorAll('.MuiDialog-paper[role="dialog"]').forEach(dialog => {
                const title = dialog.querySelector('.MuiDialogTitle-root h2');
                const message = dialog.querySelector('.MuiDialogContent-root');
                dialog.toggleAttribute('data-znx-finish-test-dialog',
                    title?.textContent.trim() === '完成测试' &&
                    message?.textContent.trim() === '请先完成测试，不要切换专题');
            });
        }

        function markAccountSettingsSurface() {
            const panel = document.querySelector('#root #navigation-pills');
            const isSettingsPanel = /^\/accountsetting\/?$/.test(location.pathname) &&
                !!panel?.querySelector('[role="tablist"]') &&
                !!panel?.querySelector('.react-swipeable-view-container');
            panel?.toggleAttribute('data-znx-account-settings-glass', isSettingsPanel);
        }

        function scheduleProcessing() {
            if (!isProcessingScheduled) {
                isProcessingScheduled = true;
                const task = () => {
                    processDynamicJssClasses();
                    restoreTrainingVisuals();
                    markTrainingOverviewSurfaces();
                    markFinishTestDialog();
                    markAccountSettingsSurface();
                    injectMainTabButton();
                };
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(task, { timeout: 150 });
                } else {
                    requestAnimationFrame(task);
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

            const CARD_POS_KEY = 'znx_countdown_card_pos';

            // 1. 恢复历史拖拽位置记忆
            let hasCustomPos = false;
            try {
                const savedPos = localStorage.getItem(CARD_POS_KEY);
                if (savedPos) {
                    const pos = JSON.parse(savedPos);
                    if (Number.isFinite(pos.top) && Number.isFinite(pos.left)) {
                        widget.style.top = `${pos.top}px`;
                        widget.style.left = `${pos.left}px`;
                        widget.style.right = 'auto';
                        widget.style.transform = 'none';
                        hasCustomPos = true;
                    }
                }
            } catch (e) {}

            if (!hasCustomPos) {
                widget.style.cssText = `
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    transform: translateY(-50%);
                    width: 260px;
                    z-index: 999998;
                    font-family: -apple-system, "PingFang SC", sans-serif;
                    user-select: none;
                    transition: opacity 0.3s ease;
                    cursor: grab;
                `;
            } else {
                widget.style.cssText += `
                    position: fixed;
                    width: 260px;
                    z-index: 999998;
                    font-family: -apple-system, "PingFang SC", sans-serif;
                    user-select: none;
                    transition: opacity 0.3s ease;
                    cursor: grab;
                `;
            }

            widget.style.touchAction = 'none';
            let drag = null;

            function placeCard(left, top) {
                const maxLeft = Math.max(10, window.innerWidth - widget.offsetWidth - 10);
                const maxTop = Math.max(10, window.innerHeight - widget.offsetHeight - 10);
                widget.style.left = `${Math.max(10, Math.min(maxLeft, left))}px`;
                widget.style.top = `${Math.max(10, Math.min(maxTop, top))}px`;
                widget.style.right = 'auto';
                widget.style.transform = 'none';
            }

            function keepCardInViewport() {
                if (!hasCustomPos || !widget.offsetWidth) return;
                placeCard(widget.offsetLeft, widget.offsetTop);
            }

            window.addEventListener('resize', keepCardInViewport);

            widget.addEventListener('pointerdown', event => {
                if (drag || !event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return;

                const { left, top } = widget.getBoundingClientRect();
                widget.setPointerCapture(event.pointerId);
                drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left, top, moved: false };
            });

            widget.addEventListener('pointermove', event => {
                if (drag?.id !== event.pointerId) return;

                const dx = event.clientX - drag.x;
                const dy = event.clientY - drag.y;
                if (!drag.moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;

                drag.moved = true;
                hasCustomPos = true;
                widget.style.cursor = 'grabbing';
                placeCard(drag.left + dx, drag.top + dy);
            });

            function finishCardDrag(event) {
                if (drag?.id !== event.pointerId) return;

                const { moved } = drag;
                drag = null;
                widget.style.cursor = 'grab';
                if (moved) {
                    try {
                        localStorage.setItem(CARD_POS_KEY, JSON.stringify({
                            top: widget.offsetTop,
                            left: widget.offsetLeft
                        }));
                    } catch (err) {}
                }
            }

            widget.addEventListener('pointerup', finishCardDrag);
            widget.addEventListener('pointercancel', finishCardDrag);
            widget.addEventListener('lostpointercapture', finishCardDrag);

            window.showFullCountdownCard = (durationMs = 5000) => {
                isTempExpanded = true;
                widget.style.display = 'block';
                keepCardInViewport();
                requestAnimationFrame(() => {
                    widget.style.opacity = '1';
                    if (!hasCustomPos) {
                        widget.style.transform = 'translateY(-50%) scale(1)';
                    } else {
                        widget.style.transform = 'none';
                    }
                });

                if (expandTimer) clearTimeout(expandTimer);
                expandTimer = setTimeout(() => {
                    const isDoing = document.documentElement.classList.contains('znx-doing-questions');
                    if (isDoing) {
                        isTempExpanded = false;
                        widget.style.opacity = '0';
                        if (!hasCustomPos) {
                            widget.style.transform = 'translateY(-50%) scale(0.95)';
                        } else {
                            widget.style.transform = 'none';
                        }
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
                    ? 'rgba(14, 14, 14, 0.6)'
                    : 'rgba(255, 255, 255, 0.85)';
                widget.style.backdropFilter = 'blur(20px) saturate(180%)';
                widget.style.webkitBackdropFilter = 'blur(20px)';
                widget.style.border = isDark
                    ? '1px solid rgba(255, 255, 255, 0.3)'
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
            keepCardInViewport();
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
        // 6.5 Live2D 看板娘 IndexedDB 离线缓存引擎 (Task 4)
        // ==========================================
        const ZnxIndexedDBCache = {
            DB_NAME: 'znx_waifu_cache',
            STORE_NAME: 'assets',
            DB_VERSION: 1,

            openDB() {
                return new Promise((resolve, reject) => {
                    if (!window.indexedDB) {
                        reject(new Error('IndexedDB is not supported'));
                        return;
                    }
                    const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);
                    request.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                            db.createObjectStore(this.STORE_NAME);
                        }
                    };
                    request.onsuccess = (e) => resolve(e.target.result);
                    request.onerror = (e) => reject(e.target.error);
                });
            },

            async getAsset(url) {
                try {
                    const db = await this.openDB();
                    return new Promise((resolve) => {
                        const tx = db.transaction(this.STORE_NAME, 'readonly');
                        const store = tx.objectStore(this.STORE_NAME);
                        const req = store.get(url);
                        req.onsuccess = () => resolve(req.result || null);
                        req.onerror = () => resolve(null);
                    });
                } catch (e) {
                    return null;
                }
            },

            async saveAsset(url, blob) {
                try {
                    const db = await this.openDB();
                    return new Promise((resolve) => {
                        const tx = db.transaction(this.STORE_NAME, 'readwrite');
                        const store = tx.objectStore(this.STORE_NAME);
                        store.put(blob, url);
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = () => resolve(false);
                    });
                } catch (e) {
                    return false;
                }
            },

            async fetchAndCache(url) {
                const cachedBlob = await this.getAsset(url);
                if (cachedBlob && cachedBlob instanceof Blob) {
                    console.log('⚡ [ZhiNengX Live2D] 从 IndexedDB 秒速加载离线资源:', url);
                    return URL.createObjectURL(cachedBlob);
                }

                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = await res.blob();
                    await this.saveAsset(url, blob);
                    console.log('✨ [ZhiNengX Live2D] 首次下载完成，已写入 IndexedDB 离线缓存:', url);
                    return URL.createObjectURL(blob);
                } catch (e) {
                    console.warn('⚠️ [ZhiNengX Live2D] 远程拉取失败，使用原始 URL:', url, e);
                    return url;
                }
            }
        };

        // ==========================================
        // 6.6 美化功能开关控制面板状态管理器 (Task 5)
        // ==========================================
        const ZNX_SETTINGS = {
            showWaifu: true,
            showWallpaper: true,

            load() {
                try {
                    const raw = localStorage.getItem('znx_beautifier_settings');
                    if (raw) {
                        const data = JSON.parse(raw);
                        if (typeof data.showWaifu === 'boolean') this.showWaifu = data.showWaifu;
                        if (typeof data.showWallpaper === 'boolean') this.showWallpaper = data.showWallpaper;
                    }
                } catch (e) {}
            },

            save() {
                try {
                    localStorage.setItem('znx_beautifier_settings', JSON.stringify({
                        showWaifu: this.showWaifu,
                        showWallpaper: this.showWallpaper
                    }));
                } catch (e) {}
            },

            apply() {
                const bg = document.getElementById('znx-anime-bg');
                if (bg) {
                    bg.style.display = this.showWallpaper ? 'block' : 'none';
                }

                const toggle = document.getElementById('waifu-toggle');
                if (toggle) toggle.remove();

                if (this.showWaifu) {
                    triggerWaifuNativeSlideShow();
                } else {
                    triggerWaifuNativeSlideHide(false);
                }
            }
        };

        // ==========================================
        // 6.7 Live2D 看板娘原生平移出场/入场与挂件状态同步管理器
        // ==========================================
        function triggerWaifuNativeSlideHide(syncSettings = true) {
            const waifu = document.getElementById('waifu');
            if (waifu) {
                // 完全使用原版 waifu.css 的 bottom 动画下沉退场
                waifu.style.bottom = '-1000px';
                setTimeout(() => {
                    if (!ZNX_SETTINGS.showWaifu) {
                        waifu.style.display = 'none';
                    }
                }, 500);
            }

            // 物理彻底销毁 DOM 节点
            const toggle = document.getElementById('waifu-toggle');
            if (toggle) toggle.remove();

            if (syncSettings) {
                ZNX_SETTINGS.showWaifu = false;
                ZNX_SETTINGS.save();
                try {
                    localStorage.setItem('waifu-display', Date.now().toString());
                } catch (e) {}

                const modalWaifuCb = document.getElementById('znx-toggle-waifu');
                if (modalWaifuCb) modalWaifuCb.checked = false;
            }
        }

        function triggerWaifuNativeSlideShow() {
            try {
                localStorage.removeItem('waifu-display');
                sessionStorage.removeItem('waifu-display');
            } catch (e) {}

            // 物理彻底销毁 DOM 节点
            const toggle = document.getElementById('waifu-toggle');
            if (toggle) toggle.remove();

            let waifu = document.getElementById('waifu');
            if (!waifu) {
                if (typeof injectLive2D === 'function') injectLive2D();
                return;
            }

            // 完全使用原版 waifu.css 的 bottom 0 平滑上升进场
            waifu.style.display = 'block';
            waifu.style.bottom = '-1000px';
            void waifu.offsetWidth;

            requestAnimationFrame(() => {
                waifu.style.bottom = '0';
            });
        }

        let isWaifuCloseListenerBound = false;
        function setupWaifuNativeCloseSync() {
            if (isWaifuCloseListenerBound) return;
            isWaifuCloseListenerBound = true;

            // 物理监视 DOM 树，若 live2d-widget 生成了 #waifu-toggle，立刻物理删除
            const toggleObserver = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    for (const node of m.addedNodes) {
                        if (node.nodeType === 1 && (node.id === 'waifu-toggle' || node.querySelector?.('#waifu-toggle'))) {
                            const el = node.id === 'waifu-toggle' ? node : node.querySelector('#waifu-toggle');
                            el?.remove();
                        }
                    }
                }
            });
            toggleObserver.observe(document.body, { childList: true, subtree: true });

            // 捕获看板娘原生右下角 ✕ 退出按钮点击
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (!target) return;
                const waifuTool = target.closest('#waifu-tool');
                if (!waifuTool) return;

                const isQuitBtn = target.closest('#waifu-tool-quit, .fa-times, .fa-close, [class*="times"], [class*="close"], [id*="quit"]') ||
                                  target === waifuTool.lastElementChild ||
                                  target.closest('span') === waifuTool.lastElementChild ||
                                  target.closest('svg') === waifuTool.lastElementChild;

                if (isQuitBtn) {
                    console.log('[ZhiNengX Live2D] 🖱️ 捕获看板娘原生 ✕ 关闭事件，调取原版 bottom 下沉退场');
                    triggerWaifuNativeSlideHide(true);
                }
            }, true);
        }

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
            if (typeof window.showMessage === 'function') {
                window.showMessage(text, timeout, 5000);
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

            // 点击看板娘触发精炼考研金句，或点击原生关闭按键 (✕) 联动设置面板
            document.addEventListener('click', (e) => {
                if (e.target.closest('#waifu-tool .fa-times, #waifu-tool .fa-close, #waifu-tool [class*="times"], #waifu-tool [class*="close"]')) {
                    console.log('[ZhiNengX Live2D] 🖱️ 用户点击了看板娘原生关闭按键 (✕)，已自动同步控制面板状态并清理挂件');
                    ZNX_SETTINGS.showWaifu = false;
                    ZNX_SETTINGS.save();
                    ZNX_SETTINGS.apply();
                    const toggle = document.getElementById('waifu-toggle');
                    if (toggle) toggle.remove();
                    return;
                }

                if (e.target.closest('#waifu canvas, #live2d')) {
                    const randomQuote = kaoyanQuotes[Math.floor(Math.random() * kaoyanQuotes.length)];
                    showWaifuTip(randomQuote, 3000);
                }
            });
        }

        function injectLive2D() {
            setupWaifuNativeCloseSync();

            if (!ZNX_SETTINGS.showWaifu) {
                console.log('[ZhiNengX Live2D] 用户配置隐藏 Live2D 看板娘，跳过载入与初始化');
                const waifu = document.getElementById('waifu');
                if (waifu) waifu.style.display = 'none';
                const toggle = document.getElementById('waifu-toggle');
                if (toggle) toggle.remove();
                return;
            }

            setupKaoyanWaifuTips();
            const existingWaifu = document.getElementById('waifu');
            const existingCanvas = document.getElementById('live2d') || existingWaifu?.querySelector('canvas');
            if ((existingWaifu && existingCanvas && (existingCanvas.offsetWidth > 0 || existingCanvas.offsetHeight > 0)) || window.Live2D || window.loadlive2d) {
                // 看板娘引擎与 Canvas 画布或 Live2D 全局变量已存在，禁止重复 append script 触发 Identifier 'Live2D' has already been declared 报错
                if (existingWaifu && existingWaifu.style.display === 'none') {
                    existingWaifu.style.display = '';
                }
                return;
            }

            // 清除可能残留的旧节点
            if (existingWaifu) {
                existingWaifu.remove();
            }
            const oldScript = document.getElementById('live2d-widget-script');
            if (oldScript) {
                oldScript.remove();
            }

            try {
                localStorage.removeItem('waifu-display');
                sessionStorage.removeItem('waifu-display');
            } catch (e) {}

            // 注入 Font Awesome CSS (优先从 IndexedDB 本地 Blob 秒载)
            const faCdn = FA_CDN_SOURCES[0];
            if (!document.getElementById('live2d-fa-css')) {
                ZnxIndexedDBCache.fetchAndCache(faCdn).then(cssUrl => {
                    if (document.getElementById('live2d-fa-css')) return;
                    const fa = document.createElement('link');
                    fa.id = 'live2d-fa-css';
                    fa.rel = 'stylesheet';
                    fa.href = cssUrl;
                    document.head.appendChild(fa);
                }).catch(() => {
                    if (document.getElementById('live2d-fa-css')) return;
                    const fa = document.createElement('link');
                    fa.id = 'live2d-fa-css';
                    fa.rel = 'stylesheet';
                    fa.href = faCdn;
                    document.head.appendChild(fa);
                });
            }

            const currentCdn = LIVE2D_CDN_SOURCES[live2dCdnIndex % LIVE2D_CDN_SOURCES.length];
            console.log(`[ZhiNengX Live2D] 驱动 IndexedDB 离线缓存引擎挂载 Live2D 资源 (${currentCdn})`);

            // 使用 IndexedDB 离线缓存引擎拉取或命中快照 Blob 秒速加载
            ZnxIndexedDBCache.fetchAndCache(currentCdn).then(scriptUrl => {
                const s = document.createElement('script');
                s.id = 'live2d-widget-script';
                s.src = scriptUrl;

                s.onerror = () => {
                    console.warn(`[ZhiNengX Live2D] ⚠️ 当前资源加载失败 (${currentCdn})，降级直接使用原始 CDN 挂载...`);
                    s.remove();
                    const fallbackScript = document.createElement('script');
                    fallbackScript.id = 'live2d-widget-script';
                    fallbackScript.src = currentCdn;
                    document.body.appendChild(fallbackScript);
                };

                s.onload = () => {
                    console.log(`[ZhiNengX Live2D] ✅ Live2D 脚本装载完成 (${currentCdn})`);
                };

                document.body.appendChild(s);
            }).catch(() => {
                const s = document.createElement('script');
                s.id = 'live2d-widget-script';
                s.src = currentCdn;
                document.body.appendChild(s);
            });
        }

        // ==========================================
        // 8. 键盘高效刷题交互代理 (Primary Action & Visual Order Choice Shortcuts)
        // ==========================================
        /**
         * 主行动按键 Primary Action 智能定位逻辑 (基于主色 Class 与物理底部位置排序)
         */
        function isVisibleElement(el) {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;

            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }

        /**
         * 正向定位当前可交互的做题容器，避免依赖宿主页面的单个动态 class。
         */
        function findQuestionInteractionContext() {
            const contextSelectors = [
                'div[name="ProblemItemElement"]',
                'div[class*="ProblemItem"]',
                '.jumbotron',
                'div[class*="jumbotron"]',
                'div[class*="_3WnwfR"]'
            ];

            const questionControlSelector = [
                'label[id^="choiceButton"]',
                'label[name="choiceButton"]',
                'input[name="choice"]',
                'input[type="radio"]',
                'input[type="checkbox"]',
                'input[type="text"]',
                'input[type="number"]',
                'textarea'
            ].join(', ');

            for (const selector of contextSelectors) {
                const contexts = Array.from(document.querySelectorAll(selector));
                const activeContext = contexts.find(context => {
                    if (!isVisibleElement(context)) return false;
                    return Array.from(context.querySelectorAll(questionControlSelector)).some(isVisibleElement);
                });
                if (activeContext) return activeContext;
            }

            return null;
        }

        const QUESTION_FOOTER_SELECTOR = '.jumbotron, div[class*="jumbotron"], div[class*="_3o6JR"], div[class*="_1ktiDhx"]';
        const QUESTION_ACTION_LABELS = new Set(['提交答案', '继续', '再试一次', '查看题解', '显示答案', '想看答案']);
        const CHOICE_INPUT_SELECTOR = 'input[name="choice"][type="radio"], input[name="choice"][type="checkbox"]';

        function findPrimaryActionButton(questionContext) {
            const isAvailable = button => !button.matches(':disabled, [aria-disabled="true"], .disabled') &&
                !button.closest('[aria-hidden="true"]') && isVisibleElement(button);
            for (const id of ['checkAnswerButton', 'continueButton', 'retryButton', 'submitButton']) {
                const button = [...document.querySelectorAll(`button#${id}, input#${id}, [role="button"]#${id}`)].find(isAvailable);
                if (button) return button;
            }

            const isQuestionAction = button => isAvailable(button) && QUESTION_ACTION_LABELS.has(button.textContent.trim());
            const inQuestion = [...questionContext.querySelectorAll('button, [role="button"]')].find(isQuestionAction);
            if (inQuestion) return inQuestion;

            return [...document.querySelectorAll('button, [role="button"]')].find(button =>
                button.closest(QUESTION_FOOTER_SELECTOR) && isQuestionAction(button)) || null;
        }

        // 选项 ID 代表选项身份，数字键按用户看到的物理顺序映射。
        function getSortedChoiceOptions(questionContext) {
            const choiceSelector = [
                'label[id^="choiceButton"]', 'label[name="choiceButton"]', 'label[class*="choiceButton"]',
                'button[id^="choiceButton"]', 'button[name="choiceButton"]', 'button[class*="choiceButton"]',
                'div[id^="choiceButton"]', '[role="radio"]', '[role="checkbox"]'
            ].join(', ');
            const options = new Set(questionContext.querySelectorAll(choiceSelector));
            for (const input of questionContext.querySelectorAll(CHOICE_INPUT_SELECTOR)) {
                options.add(input.closest(choiceSelector) || input.closest('label') || input.parentElement);
            }

            const visibleOptions = [];
            for (const el of options) {
                if (!isVisibleElement(el) || el.closest('[aria-hidden="true"]') ||
                    options.has(el.parentElement?.closest(choiceSelector))) continue;

                const text = el.textContent.trim();
                if (text.includes('我没有思路') || text.includes('显示有问题')) continue;
                const { top, left } = el.getBoundingClientRect();
                visibleOptions.push({ el, top, left });
            }
            visibleOptions.sort((a, b) => Math.abs(a.top - b.top) > 10 ? a.top - b.top : a.left - b.left);
            return visibleOptions.map(option => option.el);
        }

        const KeyboardManager = {
            isBound: false,

            trace(stage, details = {}) {
                console.log('[ZNX-KBD]', stage, {
                    ...details,
                    activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
                    answerDisabled: document.querySelector('#answer')?.disabled ?? null,
                    doingClass: document.documentElement.classList.contains('znx-doing-questions'),
                    contextCount: document.querySelectorAll('div[name="ProblemItemElement"], div[class*="ProblemItem"], .jumbotron, div[class*="_3WnwfR"]').length,
                    actionButtons: ['checkAnswerButton', 'continueButton', 'retryButton'].map(id => ({
                        id,
                        present: !!document.getElementById(id),
                        disabled: document.getElementById(id)?.disabled ?? null
                    }))
                });
            },

            init() {
                if (this.isBound) {
                    this.trace('listener-already-bound');
                    return;
                }
                this.isBound = true;
                this.trace('listener-registering', { target: 'window', capture: true });

                window.addEventListener('keydown', (e) => {
                const isDiagnosticKey = e.key === 'Enter' || /^[1-5]$/.test(e.key);
                if (isDiagnosticKey) this.trace('keydown-received', {
                    key: e.key,
                    eventPhase: e.eventPhase,
                    defaultPrevented: e.defaultPrevented,
                    cancelBubble: e.cancelBubble,
                    isTrusted: e.isTrusted
                });

                // 0. 环境隔离判断：仅在可见的做题上下文中接管按键，Modal 始终保留原生交互。
                const questionContext = findQuestionInteractionContext();
                const hasOpenModal = Array.from(
                    document.querySelectorAll('.MuiDialog-root, [role="dialog"], .modal-dialog')
                ).some(el => {
                    return el.getAttribute('aria-hidden') !== 'true' && isVisibleElement(el);
                });
                if (!questionContext) {
                    if (isDiagnosticKey) this.trace('ignored-no-question-context', { key: e.key });
                    return;
                }
                if (hasOpenModal) {
                    if (isDiagnosticKey) this.trace('ignored-modal-open', { key: e.key });
                    return;
                }

                // 1. 忽略修饰键组合 (Ctrl/Alt/Meta/Cmd) 与功能键 (F1~F12/Escape/Tab)
                if (e.ctrlKey || e.altKey || e.metaKey) {
                    if (isDiagnosticKey) this.trace('ignored-modifier', { key: e.key });
                    return;
                }
                const ignoreKeys = ['Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Tab', 'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
                if (ignoreKeys.includes(e.key)) {
                    if (isDiagnosticKey) this.trace('ignored-function-key', { key: e.key });
                    return;
                }

                // 2. 检查当前焦点是否在可编辑文本输入框内
                const activeEl = document.activeElement;
                const isMultilineInput = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
                const isSingleLineInput = activeEl && (
                    (activeEl.tagName === 'INPUT' && !['radio', 'checkbox', 'button', 'submit', 'hidden'].includes((activeEl.type || '').toLowerCase())) ||
                    activeEl.getAttribute('role') === 'textbox'
                );
                const isInAnyInput = isMultilineInput || isSingleLineInput;

                // 3. 回车键 Primary Action 智能代理
                if (e.key === 'Enter' || e.keyCode === 13) {
                    // 多行 TEXTAREA 内未按 Shift 时交由原生换行
                    if (isMultilineInput && !e.shiftKey) {
                        this.trace('ignored-multiline-input', { key: e.key });
                        return;
                    }

                    const primaryBtn = findPrimaryActionButton(questionContext);
                    if (primaryBtn && document.body.contains(primaryBtn)) {
                        this.trace('enter-target-found', { buttonId: primaryBtn.id, buttonText: (primaryBtn.innerText || primaryBtn.textContent || '').trim() });
                        e.preventDefault();
                        primaryBtn.click();
                        console.log('⚡ [ZhiNengX] 回车触发行动按键:', (primaryBtn.innerText || primaryBtn.textContent || '').trim());
                        return;
                    }
                    this.trace('enter-no-target', { key: e.key });
                }

                // 4. 数字键 1~5 物理纵向位置自然绑定
                if (isInAnyInput) {
                    if (isDiagnosticKey) this.trace('ignored-editable-input', { key: e.key });
                    return;
                }

                // 空焦点下先把输入交给当前题卡的答题框，浏览器会原生写入本次按键。
                const hasPageFocus = activeEl === document.body || activeEl === document.documentElement;
                if (hasPageFocus && !e.defaultPrevented && !e.isComposing && e.key.length === 1 && e.key.trim()) {
                    const answer = questionContext.querySelector('input#answer:not(:disabled):not([readonly]), textarea#answer:not(:disabled):not([readonly])');
                    if (isVisibleElement(answer)) {
                        answer.focus();
                        if (document.activeElement === answer) return;
                    }
                }

                if (/^[1-5]$/.test(e.key)) {
                    const numVal = Number(e.key);
                    const sortedOptions = getSortedChoiceOptions(questionContext);
                    if (sortedOptions.length >= numVal) {
                        const targetOption = sortedOptions[numVal - 1];
                        if (targetOption && document.body.contains(targetOption)) {
                            const innerInput = targetOption.querySelector('input[type="radio"], input[type="checkbox"]');
                            const clickTarget = innerInput || targetOption;
                            if (targetOption.matches(':disabled, [aria-disabled="true"], .disabled') ||
                                clickTarget.matches(':disabled, [aria-disabled="true"], .disabled')) return;
                            e.preventDefault();
                            clickTarget.click();
                            console.log(`⚡ [ZhiNengX] 数字键 ${numVal} 选中肉眼第 ${numVal} 行选项:`, (targetOption.innerText || targetOption.textContent || '').trim());
                            return;
                        }
                    }
                    this.trace('choice-no-target', { key: e.key, optionCount: sortedOptions.length });
                }
                }, true);
            }
        };

        function setupKeyboardShortcutsHandler() {
            KeyboardManager.init();
        }

        // ==========================================
        // 9. 做题模式感应器
        // ==========================================
        function setupQuestionModeObserver() {
            const checkMode = () => {
                document.documentElement.classList.toggle('znx-doing-questions', !!findQuestionInteractionContext());
            };
            new MutationObserver(checkMode).observe(document.body, { childList: true, subtree: true });
            checkMode();
        }

        // ==========================================
        // 10. 底栏做对/做错状态感应器
        // ==========================================
        function setupJumbotronFeedbackObserver() {
            const footerSelector = QUESTION_FOOTER_SELECTOR;
            const markerSelector = '#FootcontentYes, #FootcontentNo, #FootcontentWrong';
            const actionLabels = QUESTION_ACTION_LABELS;
            let activeFooter = null;

            const findFooter = () => {
                const controls = document.querySelectorAll(`#root button, #root #FootcontentYes, #root #FootcontentNo, #root #FootcontentWrong`);
                for (const control of controls) {
                    if (!control.matches(markerSelector) && !actionLabels.has(control.textContent.trim())) continue;
                    if (!isVisibleElement(control)) continue;
                    const footer = control.closest(footerSelector);
                    if (footer) return footer;
                }
                return null;
            };

            const updateStatus = () => {
                const footer = document.documentElement.classList.contains('znx-doing-questions') ? findFooter() : null;
                if (activeFooter !== footer) {
                    activeFooter?.removeAttribute('data-znx-result');
                    activeFooter = footer;
                }
                if (!footer) return;

                const text = footer.innerText;
                const isWrong = /答案错误|再试一次|超时|做不出来|换个简单/.test(text) ||
                    Array.from(footer.querySelectorAll('#FootcontentNo, #FootcontentWrong')).some(isVisibleElement);
                const isCorrect = text.includes('答案正确') || isVisibleElement(footer.querySelector('#FootcontentYes'));
                if (isWrong || isCorrect) footer.dataset.znxResult = isWrong ? 'wrong' : 'correct';
                else footer.removeAttribute('data-znx-result');
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

            badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#38bdf8;box-shadow:0 0 6px #38bdf8;animation:znxPulse 1.5s infinite"></span><span>🛠️ DEV <span style="color:#f43f5e;font-weight:800">v${version}</span> | 本地直加载模式 | 修改于 ${DEV_SOURCE_MODIFIED_AT}</span>`;

            const style = document.createElement('style');
            style.innerHTML = `@keyframes znxPulse{0%{opacity:0.4;transform:scale(0.9)}50%{opacity:1;transform:scale(1.2)}100%{opacity:0.4;transform:scale(0.9)}}#znx-dev-watermark:hover{background:rgba(15,23,42,0.95) !important;border-color:rgba(56,189,248,0.8) !important;transform:translateX(-50%) translateY(-2px) !important;box-shadow:0 6px 18px rgba(0,0,0,0.35),0 0 14px rgba(56,189,248,0.3) !important}`;
            document.head.appendChild(style);

            badge.onclick = async () => {
                if (!await copyText(`v${version}`, '版本号')) return;
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

            const copyToClipboard = async (text, subject = '题目与 LaTeX 公式') => {
                if (!text || !text.trim()) {
                    showToast('⚠️ 未能提取到有效题目内容', true);
                    return;
                }
                if (await copyText(text, subject)) showToast(`${subject}已成功复制到剪贴板`);
            };

            const replaceMathJaxScripts = (clone) => {
                const mathjaxScripts = Array.from(clone.querySelectorAll('script[type^="math/"], script[type^="Math/"]'));
                mathjaxScripts.forEach(script => {
                    const rawFormula = (script.textContent || script.innerText || '').trim();
                    const scriptType = (script.getAttribute('type') || '').toLowerCase();
                    const scriptId = script.id || '';
                    const frame = scriptId ? (clone.querySelector(`#${CSS.escape(scriptId + '-Frame')}`) ||
                        Array.from(clone.querySelectorAll('[id]')).find(element => element.id.startsWith(`${scriptId}-Frame`))) : null;
                    const prev = script.previousElementSibling;
                    if (!/^math\/tex(?:\s*;|\s*$)/.test(scriptType)) {
                        const rendered = frame || prev;
                        if (rawFormula && !rendered?.matches('[data-mathml], math') &&
                            !rendered?.querySelector('[data-mathml], math')) {
                            throw new Error('非 TeX 公式尚未渲染');
                        }
                        script.remove();
                        return;
                    }
                    if (rawFormula) {
                        const displaySelector = '.MathJax_Display, .MathJax_SVG_Display';
                        const isBlock = scriptType.includes('mode=display') || !!script.closest(displaySelector) ||
                            !!frame?.closest(displaySelector) || !!prev?.matches(displaySelector);
                        const mathMd = isBlock ? `\n$$\n${rawFormula}\n$$\n` : ` $${rawFormula}$ `;
                        if (frame && !frame.contains(script)) frame.remove();
                        if (prev?.matches('.MathJax_Preview, .MathJax_SVG, .MathJax, .MathJax_SVG_Display, .MathJax_Display')) prev.remove();
                        script.replaceWith(document.createTextNode(mathMd));
                    } else {
                        script.remove();
                    }
                });
            };

            const normalizeExtractedText = (text) => text
                .replace(/[ \t]+/g, ' ')
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .join('\n');

            const extractPureProblemMarkdown = (problemContainerEl) => {
                console.log('[ZhiNengX Copy] 🚀 开始正向靶向提取题目，目标容器:', problemContainerEl);
                if (!problemContainerEl) {
                    console.warn('[ZhiNengX Copy] ⚠️ 未传入有效题目容器 DOM 节点！');
                    return '';
                }

                // 1. 正向靶向定位【题干 DOM】
                const stemEl = problemContainerEl.querySelector('div[name="ProblemItemElement"]') ||
                               problemContainerEl.querySelector('div[class*="_3saCwwTEZwjVS61OHwIkcP"]') ||
                               problemContainerEl.querySelector('div[class*="ProblemItem"]');

                const stemText = extractContentMarkdown(stemEl || problemContainerEl, { training: true });

                // 2. 正向靶向定位【选择题选项 DOM】按物理 Y 轴位置升序排列
                const choiceLetters = ['A', 'B', 'C', 'D', 'E'];
                let optionEls = Array.from(problemContainerEl.querySelectorAll('label[id^="choiceButton"], label[name="choiceButton"], label[class*="choiceButton"], div[class*="choice"] label'));
                if (optionEls.length === 0) {
                    optionEls = Array.from(problemContainerEl.querySelectorAll('label')).filter(l => l.querySelector('input[type="radio"], input[type="checkbox"], input[name="choice"]'));
                }

                // 正向过滤掉纯功能性辅助标签（如“我没有思路”或“显示有问题”）
                optionEls = optionEls.filter(label => {
                    const txt = (label.textContent || '').trim();
                    return !txt.includes('我没有思路') && !txt.includes('显示有问题');
                });

                // 按纵向物理位置升序排列
                optionEls.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

                const optionTexts = optionEls.map((label, idx) => {
                    const letter = choiceLetters[idx] || '';
                    let txt = extractContentMarkdown(label, { training: true });
                    if (letter && !txt.startsWith(`${letter}.`) && !txt.startsWith(`${letter} `)) {
                        txt = `${letter}. ${txt}`;
                    }
                    return txt;
                }).filter(Boolean);

                // 3. 正向组装 Markdown (彻底零正则黑名单剔除)
                const parts = [];
                if (stemText) parts.push(stemText);
                if (optionTexts.length > 0) parts.push(optionTexts.join('\n'));

                const cleanedText = parts.join('\n\n').trim();

                console.log(`[ZhiNengX Copy] ✅ 正向靶向提纯题目完成，字符数: ${cleanedText.length}`);
                console.log('[ZhiNengX Copy] 📄 最终纯净 Markdown:\n' + cleanedText);

                return cleanedText;
            };

            const mathmlToLatex = (node) => {
                if (!node) throw new Error('公式结构不完整');
                if (node.nodeType === Node.TEXT_NODE) return node.textContent;
                const content = renderMathmlNode(node);
                const color = node.getAttribute('mathcolor')?.trim().toLowerCase();
                if (content && /^(?:black|blue|cyan|green|magenta|red|white|yellow)$/.test(color ?? '')) {
                    return `\\textcolor{${color}}{${content}}`;
                }
                return content;
            };

            const renderMathmlNode = (node) => {
                const children = Array.from(node.children);
                const parts = () => children.map(mathmlToLatex).join('');
                const symbols = { '{': '\\{', '}': '\\}', '%': '\\%', '&': '\\&', '#': '\\#', '$': '\\$', '_': '\\_', '\\': '\\backslash ', '−': '-', '×': '\\times ', '÷': '\\div ', '≤': '\\leq ', '≥': '\\geq ', '≠': '\\neq ', '∞': '\\infty ', '∑': '\\sum ', '∏': '\\prod ', '∫': '\\int ', '∂': '\\partial ', '∈': '\\in ', '→': '\\to ', 'α': '\\alpha ', 'β': '\\beta ', 'θ': '\\theta ', 'π': '\\pi ', 'λ': '\\lambda ' };
                const operators = { '⋅': '\\cdot ', '∣': '\\vert ', '′': '\\prime ', '″': '\\prime\\prime ' };
                const identifier = node.textContent.trim();
                switch (node.localName) {
                    case 'mi':
                        if (/^(?:ln|log|exp|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|lim|max|min)$/.test(identifier)) {
                            return `\\${identifier} `;
                        }
                        // 普通标识符沿用符号映射。
                    case 'mn': case 'mo':
                        return Array.from(node.textContent).map(char => operators[char] || symbols[char] || char).join('');
                    case 'mtext':
                        return `\\text{${node.textContent.replace(/[\\{}%$&#_]/g, char => `\\${char}`)}}`;
                    case 'mspace': return ' ';
                    case 'mfrac': return `\\frac{${mathmlToLatex(children[0])}}{${mathmlToLatex(children[1])}}`;
                    case 'msup': return `{${mathmlToLatex(children[0])}}^{${mathmlToLatex(children[1])}}`;
                    case 'msub': return `{${mathmlToLatex(children[0])}}_{${mathmlToLatex(children[1])}}`;
                    case 'msubsup': return `{${mathmlToLatex(children[0])}}_{${mathmlToLatex(children[1])}}^{${mathmlToLatex(children[2])}}`;
                    case 'mover': return `\\overset{${mathmlToLatex(children[1])}}{${mathmlToLatex(children[0])}}`;
                    case 'munder': return `\\underset{${mathmlToLatex(children[1])}}{${mathmlToLatex(children[0])}}`;
                    case 'munderover': return `\\overset{${mathmlToLatex(children[2])}}{\\underset{${mathmlToLatex(children[1])}}{${mathmlToLatex(children[0])}}}`;
                    case 'msqrt': return `\\sqrt{${parts()}}`;
                    case 'mroot': return `\\sqrt[${mathmlToLatex(children[1])}]{${mathmlToLatex(children[0])}}`;
                    case 'semantics': return mathmlToLatex(children[0]);
                    case 'mfenced': {
                        const separators = Array.from((node.getAttribute('separators') ?? ',').replace(/\s/g, ''));
                        const fence = value => Array.from(value).map(char => symbols[char] || char).join('');
                        return fence(node.getAttribute('open') ?? '(') + children.map((child, index) =>
                            (index && separators.length ? fence(separators[Math.min(index - 1, separators.length - 1)]) : '') + mathmlToLatex(child)
                        ).join('') + fence(node.getAttribute('close') ?? ')');
                    }
                    case 'mtable': {
                        const rows = children.filter(child => child.localName === 'mtr');
                        const columns = Math.max(1, ...rows.map(row => row.children.length));
                        return `\\begin{array}{${'c'.repeat(columns)}}${rows.map(row => Array.from(row.children).map(mathmlToLatex).join(' & ')).join(' \\\\ ')}\\end{array}`;
                    }
                    case 'math': case 'mrow': case 'mstyle': case 'mpadded': case 'mtd': case 'mtr':
                        return parts();
                    default: throw new Error(`暂不支持的公式结构：${node.localName}`);
                }
            };

            const extractContentMarkdown = (node, { training = false } = {}) => {
                const clone = node.cloneNode(true);
                replaceMathJaxScripts(clone);
                clone.querySelectorAll('.katex, mjx-container, .MathJax_SVG[data-mathml], .MathJax[data-mathml], math').forEach(math => {
                    if (!clone.contains(math)) return;
                    const annotation = math.querySelector('annotation[encoding="application/x-tex"]');
                    const source = annotation?.textContent.trim();
                    let mathml = math.matches('math') ? math : math.querySelector('math');
                    const serialized = math.getAttribute('data-mathml');
                    if (!source && !mathml && serialized) {
                        const root = new DOMParser().parseFromString(serialized, 'application/xml').documentElement;
                        if (root.localName === 'math') mathml = root;
                    }
                    let latex = source || (mathml && mathmlToLatex(mathml).trim());
                    if (!latex && training && math.matches('.katex')) {
                        const plain = math.querySelector('.katex-mathml');
                        if (plain && !plain.childElementCount) latex = plain.textContent.trim();
                    }
                    if (!latex && !mathml) throw new Error('未找到公式源码');
                    // MathJax SVG 外壳识别参考玄鸟墨色的解析提取脚本（MIT）。
                    const display = math.closest('.katex-display, mjx-container[display="true"], .MathJax_SVG_Display, .MathJax_Display');
                    const visual = math.closest('.MathJax_SVG, .MathJax') || math.closest('.MJX_Assistive_MathML');
                    const isBlock = !!display || mathml?.getAttribute('display') === 'block';
                    const markdown = latex ? (isBlock ? `\n$$\n${latex}\n$$\n` : ` $${latex}$ `) : '';
                    (display || visual || math).replaceWith(document.createTextNode(markdown));
                });
                clone.querySelectorAll('img').forEach(image => {
                    const source = image.getAttribute('src');
                    if (!source) throw new Error('题图尚未加载，请稍后重试');
                    const url = new URL(source, document.baseURI);
                    if (!['https:', 'http:', 'data:'].includes(url.protocol) || (url.protocol === 'data:' && !url.href.startsWith('data:image/'))) {
                        throw new Error('题图链接暂不支持导出');
                    }
                    const alt = (image.getAttribute('alt') || '题图').replace(/[\[\]\\\r\n]/g, ' ');
                    image.replaceWith(document.createTextNode(`\n![${alt}](${url.href.replace(/\(/g, '%28').replace(/\)/g, '%29')})\n`));
                });
                clone.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
                clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, tr').forEach(block => {
                    block.prepend(document.createTextNode('\n'));
                    block.append(document.createTextNode('\n'));
                });
                clone.querySelectorAll('.MathJax_SVG, .MathJax_Preview, .MathJax, .MathJax_Display, .MJX_Assistive_MathML, script, style, button, .znx-ignored, #znx-problem-tools-bar').forEach(el => el.remove());

                const rawText = clone.innerText || clone.textContent || '';

                // 块公式单独成段，正文清理不触碰块内的 TeX。
                return rawText.split(/(^[ \t]*\$\$[ \t]*\r?\n[\s\S]*?^[ \t]*\$\$[ \t]*(?=\r?\n|$))/gm)
                    .map((part, index) => index % 2 ? part.trim() : normalizeExtractedText(part))
                    .filter(Boolean)
                    .join('\n\n');
            };

            const getOriginalProblemDialogs = () => {
                const dialogs = new Set();
                document.querySelectorAll('h2, h3, .MuiDialogTitle-root').forEach(title => {
                    const titleText = title.textContent.trim();
                    if (titleText !== '查看原题' && titleText !== '题目解析') return;
                    const dialog = title.closest('[role="dialog"], .MuiDialog-paper');
                    if (dialog && !title.closest('.MuiDialogContent-root') && dialog.getClientRects().length &&
                        !dialog.closest('[aria-hidden="true"]') && getComputedStyle(dialog).visibility === 'visible') dialogs.add(dialog);
                });
                return Array.from(dialogs);
            };

            let nextSolutionTooltipId = 0;
            const updateSolutionCopyButtons = () => {
                const dialogs = getOriginalProblemDialogs();
                document.querySelectorAll('[data-znx-copy-solution-control]').forEach(control => {
                    if (!dialogs.includes(control.closest('[role="dialog"], .MuiDialog-paper'))) control.remove();
                });
                dialogs.forEach(dialog => {
                    if (dialog.querySelector('[data-znx-copy-solution]')) return;
                    const actions = dialog.querySelector('.MuiDialogActions-root');
                    const close = actions?.querySelector('button#closeSolutionModalButton');
                    const host = actions || dialog.querySelector('.MuiDialogContent-root');
                    if (!host) return;
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.dataset.znxCopySolution = '';
                    button.textContent = '复制题目及解析';
                    button.className = 'btn btn-primary';
                    const tooltip = document.createElement('span');
                    tooltip.id = `znx-copy-solution-tooltip-${++nextSolutionTooltipId}`;
                    tooltip.className = 'znx-copy-solution-tooltip';
                    tooltip.setAttribute('role', 'tooltip');
                    tooltip.textContent = '复制到剪贴板，请粘贴到支持 Markdown 和 LaTeX 的笔记应用。';
                    button.setAttribute('aria-describedby', tooltip.id);
                    button.onclick = event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!getOriginalProblemDialogs().includes(dialog)) return;
                        const question = dialog.querySelector('.MuiExpansionPanelDetails-root, .MuiAccordionDetails-root');
                        const solution = dialog.querySelector('#solution');
                        const questionPanel = question?.closest('.MuiExpansionPanel-root, .MuiAccordion-root');
                        const questionToggle = questionPanel?.querySelector('.MuiExpansionPanelSummary-root, .MuiAccordionSummary-root');
                        if (questionToggle?.getAttribute('aria-expanded') === 'false') {
                            showToast('请先展开「查看原题」，等待公式显示后再复制', true);
                            return;
                        }
                        if (!question || !solution) {
                            showToast('未找到完整题目和解析，请先展开原题与题解', true);
                            return;
                        }
                        try {
                            const questionText = extractContentMarkdown(question);
                            const solutionText = extractContentMarkdown(solution);
                            if (!questionText || !solutionText) {
                                showToast('题目或解析内容为空，请等待加载完成', true);
                                return;
                            }
                            copyToClipboard(`## 题目\n\n${questionText}\n\n## 解析\n\n${solutionText}`, '题目及解析');
                        } catch (error) {
                            showToast('题目和解析提取失败，请检查公式或题图是否完整', true);
                        }
                    };
                    const control = document.createElement('span');
                    control.dataset.znxCopySolutionControl = '';
                    control.append(button, tooltip);
                    if (close) close.before(control);
                    else host.appendChild(control);
                });
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
                    if (copyObserver) copyObserver.disconnect();
                    const info = getCountdownInfo();
                    const dark = isDarkModeActive();
                    const capsuleEl = document.getElementById('znx-doing-countdown-btn');
                    if (!capsuleEl) {
                        if (copyObserver) copyObserver.observe(document.body, { childList: true, subtree: true });
                        return;
                    }

                    const renderKey = `${info.daysLeft}-${info.h}:${info.m}-${dark}-${isCapsuleExpanded}`;
                    if (capsuleEl.getAttribute('data-znx-render-key') === renderKey) {
                        if (copyObserver) copyObserver.observe(document.body, { childList: true, subtree: true });
                        return;
                    }
                    capsuleEl.setAttribute('data-znx-render-key', renderKey);

                    if (!isCapsuleExpanded) {
                        // 1. 紧凑胶囊态 (绝对定位在占位父节点上，z-index 99)
                        capsuleEl.style.setProperty('position', 'absolute', 'important');
                        capsuleEl.style.setProperty('top', '0', 'important');
                        capsuleEl.style.setProperty('left', '0', 'important');
                        capsuleEl.style.setProperty('z-index', '99', 'important');
                        capsuleEl.style.setProperty('transform-origin', 'top left', 'important');
                        capsuleEl.style.setProperty('width', '176px', 'important');
                        capsuleEl.style.setProperty('height', '32px', 'important');
                        capsuleEl.style.setProperty('min-height', '32px', 'important');
                        capsuleEl.style.setProperty('padding', '4px 10px', 'important');
                        capsuleEl.style.setProperty('border-radius', '12px', 'important');
                        capsuleEl.style.setProperty('box-shadow', dark ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)', 'important');

                        const labelColor = dark ? '#e2e8f0' : '#0f172a';
                        const numColor = dark ? '#38bdf8' : '#3b82f6';
                        const remainingHours = parseInt(info.h, 10);

                        capsuleEl.innerHTML = `
                            <div style="display:flex;flex-direction:column;justify-content:space-between;width:100%;height:100%;box-sizing:border-box;">
                                <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;width:100%;line-height:1.2;margin-top:1px;">
                                    <span style="font-weight:900;color:#e11d48;font-size:12px;display:inline-flex;align-items:baseline;gap:2px;white-space:nowrap;font-variant-numeric:tabular-nums;">🔥 ${info.daysLeft > 0 ? info.daysLeft : 0} <span style="font-size:12px;color:${dark ? '#cbd5e1' : '#475569'};font-weight:700">天</span></span>
                                    <span style="font-size:12px;font-weight:700;color:${labelColor};display:inline-flex;align-items:baseline;gap:2px;white-space:nowrap;">今日剩余 <span style="font-size:12px;font-weight:900;color:${numColor};font-variant-numeric:tabular-nums;">${remainingHours}h${info.m}m</span></span>
                                </div>
                                <div style="width:100%;height:3px;background:${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'};border-radius:2px;overflow:hidden;margin-bottom:1px;">
                                    <div style="width:${info.todayRemainingRatio.toFixed(1)}%;height:100%;background:linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);border-radius:2px;transition:width 0.8s ease-in-out;"></div>
                                </div>
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

                    if (copyObserver) copyObserver.observe(document.body, { childList: true, subtree: true });
                }

                function closeCapsuleOnOutsidePress(event) {
                    if (!timerWrapper.contains(event.target)) collapseCapsule();
                }

                function expandCapsule(durationMs = 5000) {
                    isCapsuleExpanded = true;
                    document.addEventListener('pointerdown', closeCapsuleOnOutsidePress, true);
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
                    document.removeEventListener('pointerdown', closeCapsuleOnOutsidePress, true);
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
                    try {
                        const pureText = extractPureProblemMarkdown(currentCard);
                        if (pureText) copyToClipboard(pureText);
                        else showToast('未提取到题目内容', true);
                    } catch (error) {
                        showToast('题目提取失败，请检查公式或题图是否完整', true);
                    }
                };

                // 2. 🔥 27考研倒计时 做题极简胶囊按钮 Wrapper (自适应弹性 Wrapper)
                const timerWrapper = document.createElement('div');
                timerWrapper.id = 'znx-doing-countdown-wrapper';
                timerWrapper.style.cssText = `
                    position: relative !important;
                    min-width: 168px !important;
                    height: 32px !important;
                    flex: 1 1 auto !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
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
                    try {
                        updateSolutionCopyButtons();
                        checkAndUpdateButton();
                    } finally {
                        if (copyObserver) copyObserver.observe(document.body, { childList: true, subtree: true });
                    }
                };

                // 使用 16ms requestAnimationFrame 极速优先响应替代 requestIdleCallback
                requestAnimationFrame(runTask);
            };

            copyObserver = new MutationObserver(() => scheduleCheckAndUpdateButton());
            copyObserver.observe(document.body, { childList: true, subtree: true });
            scheduleCheckAndUpdateButton();

            // 引入 React 异步渲染补打兜底微重试 (100ms / 300ms)
            setTimeout(() => scheduleCheckAndUpdateButton(), 100);
            setTimeout(() => scheduleCheckAndUpdateButton(), 300);
        }

        // ==========================================
        // 10. 美化功能开关控制面板 UI & 顶栏主导航【美化面板】按钮
        // ==========================================
        function injectMainTabButton() {
            if (document.getElementById('modulePageTabs美化')) return;

            const mainNavTab = document.getElementById('modulePageTabs历史') ||
                               document.getElementById('modulePageTabs训练') ||
                               document.getElementById('modulePageTabs进度') ||
                               document.getElementById('modulePageTabs导出') ||
                               document.getElementById('modulePageTabs图表') ||
                               document.querySelector('.MuiAppBar-root button[id*="modulePageTabs"]');

            if (!mainNavTab) return;
            const tabContainer = mainNavTab.parentElement;
            if (!tabContainer) return;

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
                <svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" id="beautifyIconSvg" style="font-size: 20px; margin-right: 4px;">
                    <path fill="none" d="M0 0h24v24H0V0z"></path>
                    <path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61.43.53 1.03 1.39 1.03 2.39 0 .55.45 1 1 1h5.5c.55 0 1-.45 1-1v-.5c0-.55.45-1 1-1h.5c3.86 0 7-3.14 7-7 0-4.97-4.03-9-9-9zm-4 6c.83 0 1.5.67 1.5 1.5S8.83 12 8 12s-1.5-.67-1.5-1.5S7.17 9 8 9zm3-3c.83 0 1.5.67 1.5 1.5S11.83 9 11 9s-1.5-.67-1.5-1.5S10.17 6 11 6zm4 3c.83 0 1.5.67 1.5 1.5S15.83 12 15 12s-1.5-.67-1.5-1.5S14.17 9 15 9z"></path>
                </svg>
                <span id="beautifyTabText">美化面板</span>
            `;

            const ripple = document.createElement('span');
            ripple.className = 'MuiTouchRipple-root';
            beautifyBtn.appendChild(wrapper);
            beautifyBtn.appendChild(ripple);

            beautifyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showSettingsModal();
            });

            tabContainer.appendChild(beautifyBtn);
        }

        function showSettingsModal() {
            let modal = document.getElementById('znx-settings-modal');
            if (modal) modal.remove();

            const isDark = isDarkModeActive();
            modal = document.createElement('div');
            modal.id = 'znx-settings-modal';

            const maskBg = isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(15, 23, 42, 0.35)';
            const cardBg = isDark
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 244, 248, 0.8) 100%)';
            const cardBorder = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.6)';
            const titleColor = isDark ? '#38bdf8' : '#0f172a';
            const textColor = isDark ? '#f8fafc' : '#0f172a';

            modal.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:${maskBg};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;`;

            modal.innerHTML = `
                <div style="background:${cardBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${cardBorder};border-radius:20px;padding:24px;width:100%;max-width:380px;color:${textColor};box-shadow:0 24px 48px rgba(0,0,0,0.25);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                        <h3 style="margin:0;font-size:16px;font-weight:800;color:${titleColor};display:flex;align-items:center;gap:8px;">🎨 美化功能控制面板</h3>
                        <button id="znx-settings-close-btn" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:28px;height:28px;color:${titleColor};font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <label style="display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:700;cursor:pointer;">
                            <span>🌸 Live2D 看板娘</span>
                            <input type="checkbox" id="znx-toggle-waifu" ${ZNX_SETTINGS.showWaifu ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                        </label>
                        <label style="display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:700;cursor:pointer;">
                            <span>🖼️ ACG 动漫背景壁纸</span>
                            <input type="checkbox" id="znx-toggle-wallpaper" ${ZNX_SETTINGS.showWallpaper ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                        </label>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#znx-settings-close-btn').onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

            const waifuCb = modal.querySelector('#znx-toggle-waifu');
            const wallpaperCb = modal.querySelector('#znx-toggle-wallpaper');

            waifuCb.onchange = () => {
                ZNX_SETTINGS.showWaifu = waifuCb.checked;
                ZNX_SETTINGS.save();
                ZNX_SETTINGS.apply();
            };

            wallpaperCb.onchange = () => {
                ZNX_SETTINGS.showWallpaper = wallpaperCb.checked;
                ZNX_SETTINGS.save();
                ZNX_SETTINGS.apply();
            };
        }

        // ==========================================
        // 11. 做题顶栏单题计时器醒目高亮与 3 分钟动态霓虹发光预警 (Task 7)
        // ==========================================
        function setupTopBarTimerEnhancer() {
            const checkTimer = () => {
                // 在全页面范围内扫描形如 "7:06" / "01:45" 的时间数字节点 (全域防漏)
                const candidateEls = Array.from(document.querySelectorAll('body *')).filter(el => {
                    if (el.children.length > 1) return false;
                    const txt = (el.textContent || el.innerText || '').trim();
                    return /^\d{1,2}:\d{2}$/.test(txt);
                });

                candidateEls.forEach(timerEl => {
                    // 顶部 250px 范围内的节点才是顶栏倒计时，防止误伤做题卡片内部节点
                    const rect = timerEl.getBoundingClientRect();
                    if (rect.top > 250) return;

                    timerEl.classList.add('znx-topbar-timer');

                    const txt = (timerEl.textContent || timerEl.innerText || '').trim();
                    const parts = txt.split(':');
                    if (parts.length === 2) {
                        const totalSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                        // 倒计时剩余时间少于 3 分钟 (180 秒) 自动触发平稳常亮式边缘红光高亮预警
                        if (totalSec < 180) {
                            timerEl.classList.add('znx-timer-warning-glow');
                        } else {
                            timerEl.classList.remove('znx-timer-warning-glow');
                        }
                    }
                });
            };

            setInterval(checkTimer, 500);
            checkTimer();
        }

        // ==========================================
        // 启动
        // ==========================================
        function init() {
            ZNX_SETTINGS.load();
            injectAnimeGlassTheme();
            ZNX_SETTINGS.apply();
            injectMainTabButton();
            injectTimeManager();
            loadConfettiScript();
            injectLive2D();
            setupKeyboardShortcutsHandler();
            setupQuestionModeObserver();
            setupJumbotronFeedbackObserver();
            setupCopyProblemHandler();
            setupTopBarTimerEnhancer();
            injectDevVersionBadge();
        }

        init();
    }

    if (location.protocol === 'https:') startExporter();
    onDomReady(mountBeautifier);
})();
