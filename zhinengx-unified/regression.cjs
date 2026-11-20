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
const profile = JSON.parse(read('dev_resources/data/getUserProfileDiagramLast.json').replace(/^\uFEFF/, ''));
const inbox = 'dev_resources/snapshots/inbox';
function snapshot(prefix) {
    const file = fs.readdirSync(path.join(root, inbox)).find(name => name.startsWith(prefix));
    assert.ok(file, 'missing snapshot ' + prefix);
    return read(path.join(inbox, file));
}
const fixture = read('dev_resources/copy-solution-test.html');
const origin = 'https://replay.invalid';
const html = '<div id="root"><div class="MuiTabs-flexContainer"><button id="modulePageTabs历史">历史</button></div></div>';
const outputs = {};
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

    for (const [kind, prefix] of [['choice','znx_20261120-151159'],['blank','znx_20261120-152535']]) {
        await page.evaluate(source => {
            const tree = new DOMParser().parseFromString(source,'text/html');
            const captured = tree.querySelector('#znx-snapshot-full').content.querySelector('#root');
            if (!captured) throw Error('missing snapshot root');
            captured.querySelectorAll('script:not([type^="math/"]),iframe').forEach(el=>el.remove());
            document.querySelector('#root').replaceWith(document.importNode(captured,true));
            document.activeElement.blur();
        }, snapshot(prefix));
        if (kind === 'choice') {
            const second = await page.locator('input[name=choice]').evaluateAll(inputs =>
                inputs.filter(input => input.getBoundingClientRect().height > 0 &&
                    !/我没有思路|显示有问题/.test(input.closest('label')?.textContent || ''))
                    .sort((a,b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[1]?.closest('label')?.id);
            assert.ok(second, 'snapshot must contain a second choice');
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
    await cp.close();
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
            'window.chartData={};window.echarts={getInstanceByDom:()=>null,init:el=>({getWidth:()=>el.clientWidth,getHeight:()=>el.clientHeight,setOption:opt=>{chartData[el.dataset.znxProgressPlot||el.id]=opt.series},dispose(){}})};'});
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
    async function xhrUpdate(day,key) {
        date=[2026,10,day];
        payload=response(key,[.5],.25);
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
    await reloadWith(unified,false);
    assert.deepEqual(Object.keys(await xhrUpdate(21,'det-compute')).sort(),['cur_week','last_week']);
    assert.deepEqual(await xhrUpdate(23,'limit-compute'),{});
    assert.equal((await snapshot()).data.status.topic_to_final_progress['det-compute'],.25);
    console.log('Upgrade, rollback, storage reuse, XHR subject merge, day/week rollover, zero/null, date bar and three chart series OK');
    await context.close();
}
(async()=>{
    const browser=await chromium.launch({ channel:process.env.CHROME_CHANNEL||'chrome',headless:true });
    try {
        await verifyMigration(browser);
        await run(browser,'baseline');
        await run(browser,'unified');
        assert.equal(outputs.unified,outputs.baseline,'full report differs');
        console.log('Full Markdown reports identical');
    } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;});
