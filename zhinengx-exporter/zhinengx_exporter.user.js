// ==UserScript==
// @name         知能行考研数学 - 通用诊断报告与数据大屏导出器
// @namespace    http://tampermonkey.net/
// @version      11.0.1-beta.1
// @description  自动识别数学一、数学二、数学三，一键导出纯净 Markdown 诊断报告与 ECharts 可视化数据大屏
// @author       winslght
// @license      MIT
// @match        https://*.bestzixue.com/*
// @match        https://*.zhinengxing.com/*
// @icon         https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/icon.png
// @run-at       document-start
// @grant        GM_setClipboard
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const SCRIPT_VERSION = '11.1.0-dev.1.13';
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
            if (incoming?.[noProgressFlags[key]] === false ||
                (Array.isArray(next?.sorted_topics) && next.sorted_topics.length === 0 &&
                    next.progress_improvement_info_per_topic && !Object.keys(next.progress_improvement_info_per_topic).length)) {
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
                        captureProgress(parsed);
                    } catch (e) {}
                }
            });
            return originalSend.apply(this, arguments);
        };
    } catch (e) {}

    // ==========================================
    // 拦截 2：挂载 unsafeWindow.fetch
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

    function getChapterChanges(period, excludeKeys) {
        const topics = period?.progress_improvement_info_per_topic || {};
        const keys = [...new Set([...(period?.sorted_topics || []), ...orderedTopics(Object.keys(topics), excludeKeys)])];
        return keys.filter(key => !excludeKeys.has(key)).flatMap(key => {
            const deltas = PROGRESS_METRICS.map(metric => {
                const { old_progress: previous, new_progress: current } = topics[key]?.[metric] || {};
                if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
                return Number(((current - previous) * 100).toFixed(2));
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
        if (!echartsLoaded || !progressSnapshot) return;
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
            exportBtn.title = SCRIPT_VERSION;
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
                    } else {
                        prompt((warning ? warning + '\n' : '') + '请按 Ctrl+C 复制报告：', reportMarkdown);
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
            chartBtn.title = SCRIPT_VERSION;
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
                if (!echartsLoaded) {
                    alert('图表库 ECharts 正在加载，请稍候再试...'); return;
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadECharts();
            observer.observe(document.body, { childList: true, subtree: true });
        });
    } else {
        loadECharts();
        observer.observe(document.body, { childList: true, subtree: true });
        injectTabs();
    }

})();
