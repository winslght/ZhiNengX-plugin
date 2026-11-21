const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const baseline = file => execFileSync('git', ['show', 'ab81e2b:' + file], { cwd: root, encoding: 'utf8' });
const beauty = baseline('zhinengx-beautifier/zhinengx_beautifier.user.js');
const exporter = baseline('zhinengx-exporter/zhinengx_exporter.user.js');
const unified = read('zhinengx-unified/zhinengx_unified.user.js');
const fixtureText = name => read('zhinengx-unified/fixtures/' + name);
const profile = JSON.parse(fixtureText('profile.json'));
const fixture = read('dev_resources/copy-solution-test.html');
const origin = 'https://replay.invalid';
const html = '<div id="root"><div class="MuiTabs-flexContainer"><button id="modulePageTabs历史">历史</button></div></div>';
const outputs = {};

async function verifyVersionBadge(browser) {
    const devBuild = unified.match(/const DEV_BUILD = \{ version: '([^']+)', modifiedAt: '([^']+)' \};/);
    const releaseSource = devBuild ? unified.replace(devBuild[0], 'const DEV_BUILD = null;') : unified;
    const cases = [
        { source: unified, script: undefined },
        { source: unified, script: { name: '知能行考研数学-增强插件', version: '10.0.0-beta.2' } },
        { source: releaseSource, script: { name: '[DEV] 知能行本地调试', version: '10.0.0-dev.1.1' } },
    ];
    if (devBuild) cases.push({
        source: unified,
        script: { name: '[DEV] 知能行合体助手（本地调试）', version: '8.4.1-dev.1.5' },
        badge: [devBuild[1], devBuild[2]],
    });

    const page = await browser.newPage();
    await page.route('**/*', route => route.request().url() === origin + '/' ?
        route.fulfill({ contentType: 'text/html;charset=utf-8', body: html }) : route.abort());
    try {
        for (const { source, script, badge } of cases) {
            await page.goto(origin);
            await page.evaluate(script => {
                if (script) window.GM_info = { script };
                localStorage.setItem('znx_beautifier_settings', '{"showWaifu":false,"showWallpaper":false}');
            }, script);
            await page.addScriptTag({ content: source });
            await page.locator('#modulePageTabs美化').waitFor({ timeout: 6000 });
            const actual = await page.locator('#znx-dev-watermark').allTextContents();
            if (badge) {
                assert.equal(actual.length, 1);
                assert.ok(badge.every(value => actual[0].includes(value)), 'DEV footer must use the source version and timestamp');
            } else {
                assert.deepEqual(actual, [], 'public or unmarked installation must never show the DEV footer');
            }
        }
        console.log('DEV footer appears only with the DEV build and local debug header');
    } finally {
        await page.close();
    }
}

async function run(browser, variant) {
    const combined = variant === 'unified';
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    let documentHtml = html;
    let requests = 0;
    await context.route('**/*', async route => {
        const url = route.request().url();
        if (url === origin + '/') return route.fulfill({ contentType: 'text/html;charset=utf-8', body: documentHtml });
        if (url === origin + '/getUserProfileDiagramLast') {
            requests++;
            return route.fulfill({ json: profile });
        }
        return route.abort();
    });
    await page.addInitScript(() => {
        localStorage.setItem('znx_beautifier_settings', JSON.stringify({ showWaifu:false, showWallpaper:false }));
        if (!localStorage.getItem('znx_countdown_card_pos'))
            localStorage.setItem('znx_countdown_card_pos', '{"top":110,"left":100}');
        Date.now = () => new Date(2026,10,20,12).getTime();
        window.copyResult = '';
        window.GM_setClipboard = value => { window.copyResult = value; };
        Object.defineProperty(navigator,'clipboard',{ configurable:true,value:{writeText:async value => { window.copyResult = value; }} });
        window.soundStarts = 0;
        const start = OscillatorNode.prototype.start;
        OscillatorNode.prototype.start = function(...args) { window.soundStarts++; return start.apply(this,args); };
    });
    await page.addInitScript({content: combined ? unified : exporter + '\n' + beauty});
    documentHtml = '<head><script>fetch("/getUserProfileDiagramLast")</script></head>' + html;
    await page.goto(origin);
    await page.waitForFunction(() => !!sessionStorage.getItem('znx-exporter-session'));
    // The legacy exporter checks the initial tab on a DOM mutation.
    await page.evaluate(() => document.body.append(document.createElement('span')));
    await page.locator('#modulePageTabs导出').click();
    await page.waitForFunction(() => window.copyResult.startsWith('# 知能行'));
    assert.equal(requests, 1, 'export must use the initial page response');
    outputs[variant] = await page.evaluate(() => window.copyResult);
    assert.match(outputs[variant], /12月20日/);
    console.log(variant, 'first response, Markdown report, date column OK');

    if (combined) {
        await page.evaluate(()=>{
            navigator.clipboard.writeText=async()=>{throw Error('simulated clipboard rejection')};
            document.execCommand=()=>false;
        });
        await page.locator('#modulePageTabs导出').click();
        const manual=page.locator('#znx-copy-modal');
        assert.match(await manual.locator('h4').innerText(),/诊断报告/);
        assert.equal(await manual.locator('textarea').inputValue(),outputs[variant]);
        await manual.locator('#znx-modal-close-btn').click();
        await page.evaluate(()=>{
            document.execCommand=command=>{
                if(command!=='copy') return false;
                window.compatValue=document.activeElement.value;
                return true;
            };
        });
        await page.locator('#modulePageTabs导出').click();
        assert.equal(await page.evaluate(()=>window.compatValue),outputs[variant]);
        console.log('Report clipboard compatibility and manual fallback OK');
    }
    await page.locator('#modulePageTabs美化').click();
    const pet=page.locator('#znx-toggle-waifu');
    await pet.check();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('znx_beautifier_settings')).showWaifu),true);
    await page.waitForFunction(()=>!!document.querySelector('#live2d-fa-css, #live2d-widget-script'));
    await pet.uncheck();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('znx_beautifier_settings')).showWaifu),false);
    await page.evaluate(()=>{
        const modal=document.getElementById('znx-toggle-waifu').closest('div[id*="modal"]');
        if(modal) modal.remove();
    });
    console.log(variant,'pet control, resource request and persisted setting OK');
    const card = page.locator('#znx-time-manager');
    const pos = () => page.evaluate(() => JSON.parse(localStorage.getItem('znx_countdown_card_pos')));
    assert.equal(Math.round((await card.boundingBox()).x),100);
    assert.equal(await page.locator('#znx-anime-bg').evaluate(el => el.style.display),'none');
    assert.equal(await page.locator('#waifu').count(),0);
    const point = await card.boundingBox();
    const x=point.x+30, y=point.y+20;
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+50,y+40); await page.mouse.up();
    assert.deepEqual(await pos(),{left:150,top:150});
    const cdp=await context.newCDPSession(page);
    for (const [type,touchPoints] of [['touchStart',[{x:180,y:170}]],['touchMove',[{x:230,y:205}]],['touchEnd',[]]]) {
        await cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    }
    assert.deepEqual(await pos(),{left:200,top:185});
    console.log(variant,'legacy settings, mouse and touch drag OK');

    for (const kind of ['choice', 'blank']) {
        await page.evaluate(source => {
            const tree = new DOMParser().parseFromString(source, 'text/html');
            document.querySelector('#root').replaceWith(document.importNode(tree.querySelector('#root'), true));
            document.activeElement.blur();
        }, fixtureText(kind + '.html'));
        if (kind === 'choice') {
            const second = 'choiceButtonB';
            const visualOrder = await page.locator('label').evaluateAll(labels =>
                labels.sort((a,b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(el => el.id));
            assert.deepEqual(visualOrder, ['choiceButtonA', second]);
            await page.keyboard.press('2');
            assert.equal(await page.locator('input[name=choice]:checked').evaluate(el=>el.closest('label').id),second);
            assert.equal(await page.locator('input[name=choice]:checked').count(),1);
            await page.evaluate(() => {
                const btn=document.querySelector('#checkAnswerButton');
                btn.disabled=false;
                btn.addEventListener('click',()=>window.submitCount=(window.submitCount||0)+1);
            });
            await page.keyboard.press('Enter');
            assert.equal(await page.evaluate(()=>window.submitCount),1);
            const sounds = await page.evaluate(()=>window.soundStarts);
            await page.locator('#checkAnswerButton').click();
            assert.ok(await page.evaluate(()=>window.soundStarts)>sounds);
        } else {
            await page.keyboard.press('7');
            assert.equal(await page.locator('#answer').inputValue(),'7');
            assert.equal(await page.evaluate(()=>document.activeElement.id),'answer');
        }
        console.log(variant, kind,'keyboard OK');
    }
    await context.close();

    // Use the repository's full copy-module fixture in isolation, including its modal/error paths.
    const moduleSource = combined ? unified : beauty;
    const start = moduleSource.indexOf('function setupCopyProblemHandler()');
    const end = moduleSource.indexOf('// ==========================================',start);
    const shared = combined ? unified.slice(unified.indexOf('function isDarkModeActive'),unified.indexOf('function onDomReady')) :
        beauty.slice(beauty.indexOf('function isDarkModeActive'),beauty.indexOf('// ===',beauty.indexOf('function isDarkModeActive')));
    const cp = await browser.newPage();
    await cp.route('**/*',r=>r.fulfill(r.request().url().endsWith('/copy-module.js') ?
        {contentType:'text/javascript',body:shared+'\n'+moduleSource.slice(start,end)+'\nsetupCopyProblemHandler();'} :
        {contentType:'text/html;charset=utf-8',body:fixture}));
    for (const dark of [false,true]) {
        await cp.goto(origin);
        if (dark) await cp.locator('#theme').click();
        await cp.locator('#run-tests').click();
        await cp.waitForFunction(()=>document.querySelector('#results').textContent.includes('PASS') || document.querySelector('#results').textContent.includes('FAIL'));
        const results=await cp.locator('#results').innerText();
        assert.doesNotMatch(results,/FAIL/);
        assert.match(results,/重新进入训练页恢复入口/);
        await cp.evaluate(() => { testState.mode='manual'; document.querySelector('[data-znx-copy-solution]').click(); });
        const label=cp.locator('#znx-copy-modal h4');
        await label.waitFor();
        assert.equal(await label.evaluate(el=>getComputedStyle(el).color),dark?'rgb(56, 189, 248)':'rgb(15, 23, 42)');
        console.log(variant,dark?'dark':'light',results.split('\n').length,'copy assertions OK');
    }
    if (combined) {
        await cp.goto(origin);
        await cp.evaluate(() => {
            fixtures.replaceChildren();
            document.querySelector('.ProblemItem').innerHTML = '问题 <span class="katex"><span class="katex-mathml">x+1</span></span>';
        });
        await cp.locator('#znx-copy-problem-btn').click();
        assert.equal(await cp.evaluate(()=>testState.clipboard), '问题 $x+1$');
        await cp.evaluate(() => {
            const stem = document.querySelector('.ProblemItem');
            stem.innerHTML = '<div><img id="bookmarkStar" src="/star.png" alt="favStar"></div>' +
                '<div class="_2oaHGiIP00g_4hrsNR2dgf">[2016年真题] 设函数' +
                '<span class="katex-display"><span class="katex"><span class="katex-mathml">x+1</span></span></span>' +
                '<img alt="题图" src="/fixture.png">' +
                '<span class="MathJax_SVG"><math><msqrt><mi>x</mi></msqrt></math></span><script type="math/asciimath">sqrt(x)</script></div>';
            const options = document.createElement('div');
            options.style.cssText = 'display:flex;flex-direction:column-reverse';
            options.innerHTML = '<label id="choiceButtonB">乙</label><label id="choiceButtonA">甲</label>';
            stem.after(options);
        });
        await cp.locator('#znx-copy-problem-btn').click();
        const training = await cp.evaluate(()=>testState.clipboard);
        assert.match(training, /^\[2016年真题\] 设函数/);
        assert.doesNotMatch(training, /favStar|\/star\.png/);
        assert.ok(training.includes('$$\nx+1\n$$'));
        assert.ok(training.includes('![题图](' + origin + '/fixture.png)'));
        assert.ok(training.includes('\\sqrt{x}') && !training.includes('sqrt(x)'));
        assert.match(training, /A\. 甲[\s\S]+B\. 乙/);
        await cp.evaluate(() => {
            document.querySelector('._2oaHGiIP00g_4hrsNR2dgf').innerHTML =
                '比较下列各式 <span id="stem-math-Frame" class="MathJax_SVG" data-mathml="<math><mi>x</mi></math>"></span>。';
            document.querySelector('#choiceButtonA').innerHTML =
                '第一项 <math><munder><mo>lim</mo><mrow><mi>t</mi><mo>→</mo><mn>0</mn></mrow></munder><mi>t</mi></math>';
            document.querySelector('#choiceButtonB').innerHTML =
                '第二项 <span id="option-math-Frame" class="MathJax_SVG" data-mathml="<math><mi>y</mi></math>"></span>';
            window.MathJax = { Hub: { getAllJax: () => [
                { inputID: 'stem-math', inputJax: 'TeX', originalText: '\\frac{1}{x}' },
                { inputID: 'option-math', inputJax: 'AsciiMath', originalText: 'sqrt(y)' },
            ] } };
        });
        await cp.locator('#znx-copy-problem-btn').click();
        assert.equal(await cp.evaluate(() => testState.clipboard),
            '比较下列各式 $\\frac{1}{x}$ 。\n\nA. 第一项 $\\lim\\limits_{t\\to 0}t$\nB. 第二项 $y$');
        for (const formula of [
            '<span class="katex"><span class="katex-mathml">x+1</span></span>',
            '<script type="math/asciimath">sqrt(2)</script>'
        ]) {
            await cp.evaluate(markup => {
                fixtures.replaceChildren();
                makeDialog('<p>问题</p>',markup);
                testState.clipboard='unchanged';
            },formula);
            await cp.locator('[data-znx-copy-solution]').click();
            assert.equal(await cp.evaluate(()=>testState.clipboard),'unchanged');
            assert.match(await cp.locator('#znx-copy-toast').innerText(),/提取失败/);
        }
        console.log('Training stem, real images, text-only KaTeX and strict solution rejection OK');
    }
    await cp.close();
}
const chartStub = 'window.chartData={};window.echarts={getInstanceByDom:()=>null,init:el=>({getWidth:()=>el.clientWidth,getHeight:()=>el.clientHeight,setOption:opt=>{chartData[el.dataset.znxProgressPlot||el.id]=opt.series},dispose(){}})};';

async function verifyChartRetry(browser) {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    const pending = [];
    await page.route('**/*', async route => {
        const url = route.request().url();
        if (url.includes('/echarts@')) {
            pending.push(route);
        } else if (url === origin + '/') {
            await route.fulfill({contentType:'text/html;charset=utf-8', body:
                '<script>fetch("/getUserProfileDiagramLast")</script>' + html});
        } else if (url === origin + '/getUserProfileDiagramLast') {
            await route.fulfill({json:profile});
        } else {
            await route.abort();
        }
    });
    await page.addInitScript({content:unified});
    const firstRequest = page.waitForEvent('request', r => r.url().includes('/echarts@'));
    await page.goto(origin, {waitUntil:'domcontentloaded'});
    await firstRequest;
    await page.waitForFunction(()=>!!sessionStorage.getItem('znx-exporter-session'));
    const charts = page.locator('#modulePageTabs图表');
    await charts.click();
    const failure = page.waitForEvent('dialog');
    await pending[0].abort();
    const notice = await failure;
    assert.match(notice.message(), /加载失败/);
    await notice.dismiss();
    assert.equal(await page.locator('#echarts-lib').count(),0);
    const retry = page.waitForEvent('request', r => r.url().includes('/echarts@'));
    await charts.click();
    await retry;
    await charts.click();
    assert.equal(pending.length,2);
    await pending[1].fulfill({contentType:'text/javascript',body:chartStub});
    await page.locator('#znx-dashboard-modal').waitFor();
    await page.waitForFunction(()=>window.chartData?.today);
    await page.getByRole('button',{name:/关闭大屏/}).click();
    await charts.click();
    await page.locator('#znx-dashboard-modal').waitFor();
    assert.equal(pending.length,2);
    console.log('Chart preload failure, concurrent retry, reopen: 2 requests OK');
    await page.close();
}
async function verifyMigration(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    let artifact = exporter;
    let legacy = true;
    let date = [2026,10,20];
    const account = { username:'regression',examType:2 };
    function response(key, levels, ability) {
        return {profile:account,status:{topic_to_final_progress:{[key]:ability},progress_report_info:{
            progress_info_per_topic_all_module:{[key]:levels}
        }}};
    }
    let payload=response('limit-compute',[0,null,.3],0);
    const topic = {sorted_topics:['limit-compute'],progress_improvement_info_per_topic:{
        'limit-compute':{'0':{old_progress:0,new_progress:.1},'Dec25':{old_progress:.2,new_progress:.2}}
    }};
    payload.status.progress_report_info.period_to_progress_change_info={today:topic,cur_week:topic,last_week:topic};
    await context.route('**/*',async r=>{
        const url=r.request().url();
        if (url === origin+'/') return r.fulfill({contentType:'text/html;charset=utf-8',body:
            '<head><script src="/clock"></script><script src="/early"></script><script>fetch("/getUserProfileDiagramLast")</script></head>'+
            html+(legacy?'<script src="/beauty"></script>':'')});
        if (url === origin+'/clock') return r.fulfill({contentType:'text/javascript',body:
            'Date.now=()=>new Date('+date.join(',')+',12).getTime();'});
        if (url === origin+'/early' || url === origin+'/beauty')
            return r.fulfill({contentType:'text/javascript',body:url.endsWith('/early')?artifact:beauty});
        if (url === origin+'/getUserProfileDiagramLast') return r.fulfill({json:payload});
        if (url.includes('/echarts@')) return r.fulfill({contentType:'text/javascript',body:
            chartStub});
        return r.abort();
    });
    await page.addInitScript(()=>{
        if (!localStorage.getItem('znx_beautifier_settings')) {
            localStorage.setItem('znx_beautifier_settings','{"showWaifu":false,"showWallpaper":false}');
            localStorage.setItem('znx_countdown_card_pos','{"top":120,"left":130}');
        }
    });
    await page.goto(origin);
    await page.waitForFunction(()=>!!sessionStorage.getItem('znx-exporter-session'));
    const snapshot = () => page.evaluate(()=>JSON.parse(sessionStorage.getItem('znx-exporter-session')));
    const settings = () => page.evaluate(()=>[localStorage.getItem('znx_beautifier_settings'),localStorage.getItem('znx_countdown_card_pos')]);
    const originalSettings = await settings();
    async function reloadWith(source,isLegacy) {
        artifact=source;legacy=isLegacy;
        await page.reload();
        await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('znx-exporter-session')).pageLoad===performance.timeOrigin);
        await page.evaluate(()=>document.body.append(document.createElement('span')));
        assert.equal(await page.locator('#modulePageTabs导出').count(),1);
        assert.equal(await page.locator('#modulePageTabs图表').count(),1);
        assert.equal(await page.locator('#znx-time-manager').count(),1);
        assert.deepEqual(await settings(),originalSettings);
    }
    for (const [source,isLegacy] of [[unified,false],[exporter,true]]) {
        payload=response('det-compute',[.4],.15);
        await reloadWith(source,isLegacy);
        assert.deepEqual((await snapshot()).data.status.topic_to_final_progress,{'limit-compute':0,'det-compute':.15});
        await page.locator('#modulePageTabs图表').click();
        await page.waitForFunction(()=>window.chartData?.last_week);
        const matrix=await page.locator('#znx-chart-bar tbody tr').filter({hasText:'函数极限'}).locator('td').allTextContents();
        assert.deepEqual(matrix.map(x=>x.trim()),['函数极限','0.0%','—','30.0%','—','—','0%']);
        for (const period of ['today','cur_week','last_week']) {
            const series=await page.evaluate(key=>window.chartData[key],period);
            assert.deepEqual(series.map(s=>s.data[0]),[10,null,null,null,null,0]);
            assert.equal(series[5].name,'12月20日');
        }
    }
    async function xhrUpdate(day,key,periods) {
        date=[2026,10,day];
        payload=response(key,[.5],.25);
        payload.status.progress_report_info.period_to_progress_change_info=periods;
        await page.evaluate(async d=>{
            Date.now=()=>new Date(...d,12).getTime();
            await new Promise(resolve=>{
                const x=new XMLHttpRequest();
                x.open('GET','/getUserProfileDiagramLast');
                x.addEventListener('loadend',resolve);
                x.send();
            });
        },date);
        return (await snapshot()).data.status.progress_report_info.period_to_progress_change_info;
    }
    payload.status.progress_report_info.period_to_progress_change_info={
        today:topic,did_make_progress_today:false
    };
    await reloadWith(unified,false);
    await page.locator('#modulePageTabs图表').click();
    await page.waitForFunction(()=>window.chartData?.today);
    assert.deepEqual(await page.evaluate(()=>chartData.today.map(s=>s.data[0])),[10,null,null,null,null,0]);

    const noProgress={today:{sorted_topics:[],progress_improvement_info_per_topic:{}},did_make_progress_today:false};
    assert.deepEqual(Object.keys(await xhrUpdate(20,'det-compute',noProgress)).sort(),['cur_week','last_week']);
    assert.deepEqual((await xhrUpdate(20,'limit-compute',{today:topic})).today,topic);
    assert.deepEqual(Object.keys(await xhrUpdate(21,'det-compute')).sort(),['cur_week','last_week']);
    assert.deepEqual(await xhrUpdate(23,'limit-compute'),{});
    assert.equal((await snapshot()).data.status.topic_to_final_progress['det-compute'],.25);
    console.log('Upgrade, rollback, storage reuse, XHR subject merge, day/week rollover, zero/null, date bar and three chart series OK');
    await context.close();
}
(async()=>{
    const browser=await chromium.launch({ channel:process.env.CHROME_CHANNEL||'chrome',headless:true });
    try {
        await verifyChartRetry(browser);
        await verifyVersionBadge(browser);
        await verifyMigration(browser);
        await run(browser,'baseline');
        await run(browser,'unified');
        const todaySection = /^### 今天\n\n[\s\S]+?(?=^### 本周\n)/m;
        const restoredToday = outputs.unified.match(todaySection)?.[0];
        assert.ok(restoredToday?.split('\n').some(line=>line.startsWith('| ') && /\+\d+\.\d{2}/.test(line)),
            'today report section must contain a positive chapter delta');
        assert.equal(outputs.unified.replace(todaySection,''),outputs.baseline,'report differs outside the restored today section');
        console.log('Today chapter deltas restored in Markdown, remaining report identical');
    } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;});
