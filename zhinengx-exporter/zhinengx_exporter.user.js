// ==UserScript==
// @name         知能行考研数学 - 通用诊断报告与数据大屏导出器
// @namespace    http://tampermonkey.net/
// @version      11.0.1-dev.1
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
    // 拦截 2：挂载 unsafeWindow.fetch
    // ==========================================
    try {
        const originalFetch = win.fetch;
        win.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

            if (url.includes('getUserProfileDiagramLast') || url.includes('getUserProfile')) {
                try {
                    const clone = response.clone();
                    const parsed = await clone.json();
                    if (parsed && (parsed.status || parsed.profile)) {
                        rawFullJson = parsed;
                        console.log('【知能行 AI 导出器】Fetch 捕获数据成功:', rawFullJson);
                        updateBtnState(true);
                    }
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
                const res = await win.fetch(url, { credentials: 'include' });
                if (res.ok) {
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

    // ==========================================
    // 纯粹诊断报告生成器 (最顶行指定标题)
    // ==========================================
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

    function updateBtnState(ready) {
        // 用户反馈：平时保持原生颜色，不需要变黄，如果有错误会在点击时弹出 alert
    }
})();
