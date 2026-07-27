const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = 3333;
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_MD = path.join(ROOT_DIR, 'dev_resources', 'BRANCH_STATUS.md');

// Ensure dev_resources directory exists
if (!fs.existsSync(path.join(ROOT_DIR, 'dev_resources'))) {
  fs.mkdirSync(path.join(ROOT_DIR, 'dev_resources'), { recursive: true });
}

function runGit(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch (err) {
    return '';
  }
}

function getBranchData() {
  const currentBranch = runGit('git rev-parse --abbrev-ref HEAD');
  const rawBranches = runGit('git branch --format="%(refname:short)|%(objectname:short)|%(committerdate:iso)|%(subject)"');
  
  if (!rawBranches) return { branches: [], currentBranch: '' };

  const lines = rawBranches.split('\n').filter(Boolean);
  const branches = lines.map(line => {
    const [name, hash, dateStr, subject] = line.split('|');
    
    let vsDevelop = { ahead: 0, behind: 0 };
    let vsMain = { ahead: 0, behind: 0 };

    if (name !== 'develop') {
      const devCounts = runGit(`git rev-list --left-right --count develop...${name}`).split(/\s+/);
      if (devCounts.length === 2) {
        vsDevelop.behind = parseInt(devCounts[0], 10) || 0;
        vsDevelop.ahead = parseInt(devCounts[1], 10) || 0;
      }
    }

    if (name !== 'main') {
      const mainCounts = runGit(`git rev-list --left-right --count main...${name}`).split(/\s+/);
      if (mainCounts.length === 2) {
        vsMain.behind = parseInt(mainCounts[0], 10) || 0;
        vsMain.ahead = parseInt(mainCounts[1], 10) || 0;
      }
    }

    const recentCommitsRaw = runGit(`git log -n 5 --oneline ${name}`);
    const recentCommits = recentCommitsRaw ? recentCommitsRaw.split('\n') : [];
    const formattedDate = dateStr ? dateStr.substring(0, 19).replace('T', ' ') : 'N/A';

    return {
      name,
      hash,
      date: formattedDate,
      subject,
      isCurrent: name === currentBranch,
      vsDevelop,
      vsMain,
      recentCommits
    };
  });

  return { branches, currentBranch, timestamp: new Date().toLocaleString() };
}

function renderConsoleTable(data) {
  console.log('\n========================================================================================');
  console.log('                 🚀 ZhiNengX 本地分支进度可视化全景 (LOCAL ONLY)');
  console.log(`                 更新时间: ${data.timestamp} | 当前分支: [ ${data.currentBranch} ]`);
  console.log('========================================================================================');
  console.log('分支名称                 | 状态     | 相对 develop  | 相对 main     | 最新 Commit 说明');
  console.log('----------------------------------------------------------------------------------------');
  
  data.branches.forEach(b => {
    const isCurrentMark = b.isCurrent ? '*' : ' ';
    const namePadded = (isCurrentMark + ' ' + b.name).padEnd(24, ' ');
    const tag = b.name === 'main' ? '【稳定主干】' : b.name === 'develop' ? '【开发主线】' : b.name === 'beta' ? '【预发布】' : '【特性/组件】';
    const tagPadded = tag.padEnd(9, ' ');
    
    const devStr = b.name === 'develop' ? ' (基线) ' : `+${b.vsDevelop.ahead} / -${b.vsDevelop.behind}`.padEnd(13, ' ');
    const mainStr = b.name === 'main' ? ' (基线) ' : `+${b.vsMain.ahead} / -${b.vsMain.behind}`.padEnd(13, ' ');
    const subjTrunc = (b.subject || '').substring(0, 30);

    console.log(`${namePadded}| ${tagPadded}| ${devStr}| ${mainStr}| ${b.hash} ${subjTrunc}`);
  });
  console.log('========================================================================================\n');
}

function generateMarkdownReport(data) {
  let mermaidDiagram = '```mermaid\ngitGraph\n';
  mermaidDiagram += '   commit id: "v8.1.0 (Base)"\n';
  mermaidDiagram += '   branch develop\n';
  mermaidDiagram += '   checkout develop\n';
  mermaidDiagram += '   commit id: "develop-sync"\n';
  
  data.branches.forEach(b => {
    if (b.name !== 'main' && b.name !== 'develop') {
      mermaidDiagram += `   branch ${b.name.replace(/[^a-zA-Z0-9_-]/g, '_')}\n`;
      mermaidDiagram += `   checkout ${b.name.replace(/[^a-zA-Z0-9_-]/g, '_')}\n`;
      mermaidDiagram += `   commit id: "${b.hash}"\n`;
    }
  });
  mermaidDiagram += '```\n';

  let md = `# 📊 ZhiNengX 本地分支进度全景看板

> **只读声明**：本看板仅分析本地 \`.git\` 历史，无任何远程同步与仓库修改。  
> **更新时间**：${data.timestamp}

---

## 🌿 1. 各分支偏离对比矩阵

| 分支名称 | 状态标记 | 相对 develop (Ahead/Behind) | 相对 main (Ahead/Behind) | 最新 Commit Hash | 最新提交说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${data.branches.map(b => {
  const currentMark = b.isCurrent ? '🚩 **(当前)**' : '';
  const devStat = b.name === 'develop' ? '基线' : `+${b.vsDevelop.ahead} / -${b.vsDevelop.behind}`;
  const mainStat = b.name === 'main' ? '基线' : `+${b.vsMain.ahead} / -${b.vsMain.behind}`;
  return `| \`${b.name}\` ${currentMark} | ${b.name === 'main' ? '主干' : b.name === 'develop' ? '开发' : '特性'} | \`${devStat}\` | \`${mainStat}\` | \`${b.hash}\` | ${b.subject} |`;
}).join('\n')}

---

## 📈 2. 本地分支简易拓扑示意

${mermaidDiagram}

---

## 🔍 3. 各分支最近 5 次 Commit 明细

${data.branches.map(b => `
### 🔹 分支 \`${b.name}\`
- **最新提交时间**：${b.date}
- **近期日志**：
${b.recentCommits.map(c => `  - \`${c}\``).join('\n')}
`).join('\n')}
`;

  fs.writeFileSync(OUTPUT_MD, md, 'utf-8');
}

function getWebHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZhiNengX - 本地分支可视化看板</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-card: #1e293b;
      --bg-card-hover: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-blue: #38bdf8;
      --accent-green: #4ade80;
      --accent-purple: #c084fc;
      --accent-amber: #fbbf24;
      --border-color: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-main);
      padding: 30px;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .title-group h1 { font-size: 26px; color: var(--accent-blue); display: flex; align-items: center; gap: 10px; }
    .subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
    .badge-local { background: rgba(56, 189, 248, 0.15); color: var(--accent-blue); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid rgba(56, 189, 248, 0.3); }
    .btn-refresh {
      background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s;
    }
    .btn-refresh:hover { background: #1d4ed8; transform: translateY(-1px); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card {
      background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); padding: 20px; transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover { border-color: var(--accent-blue); }
    .card.active { border: 2px solid var(--accent-green); }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .branch-name { font-size: 18px; font-weight: bold; word-break: break-all; }
    .status-tag { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: bold; }
    .tag-current { background: rgba(74, 222, 128, 0.2); color: var(--accent-green); border: 1px solid var(--accent-green); }
    .tag-main { background: rgba(192, 132, 252, 0.2); color: var(--accent-purple); }
    
    .stats-row { display: flex; gap: 15px; margin: 15px 0; background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; }
    .stat-item { flex: 1; text-align: center; }
    .stat-val { font-size: 16px; font-weight: bold; margin-top: 2px; }
    .val-plus { color: var(--accent-green); }
    .val-minus { color: var(--accent-amber); }
    
    .commit-preview { font-size: 13px; color: var(--text-muted); border-top: 1px solid var(--border-color); pt: 10px; margin-top: 10px; }
    .commit-hash { font-family: monospace; color: var(--accent-blue); background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px; }
    
    .section-title { font-size: 20px; margin: 30px 0 15px 0; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
    .diagram-container { background: var(--bg-card); padding: 25px; border-radius: 12px; border: 1px solid var(--border-color); overflow-x: auto; text-align: center; }
    
    ul.commits-list { list-style: none; padding: 0; }
    ul.commits-list li { font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: monospace; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>🚀 ZhiNengX 分支进度全景看板 <span class="badge-local">纯本地 100% 只读</span></h1>
      <div class="subtitle">实时调取本地 .git 节点状态 | 绝不干涉远程仓库</div>
    </div>
    <button class="btn-refresh" onclick="fetchData()">🔄 刷新分支数据</button>
  </div>

  <div class="section-title">📌 各分支状态与偏离比对 Matrix</div>
  <div class="grid" id="branchesGrid">加载中...</div>

  <div class="section-title">🌿 动态分支拓扑关系 (Mermaid Graph)</div>
  <div class="diagram-container">
    <div class="mermaid" id="mermaidContainer">
      gitGraph
        commit id: "Initial"
        branch develop
        commit id: "v8.2.0-dev"
    </div>
  </div>

  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    async function fetchData() {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        renderGrid(data.branches);
        renderMermaid(data.branches);
      } catch (err) {
        console.error(err);
      }
    }

    function renderGrid(branches) {
      const grid = document.getElementById('branchesGrid');
      grid.innerHTML = branches.map(b => {
        const activeClass = b.isCurrent ? 'active' : '';
        const currentTag = b.isCurrent ? '<span class="status-tag tag-current">当前分支</span>' : '';
        const devDiff = b.name === 'develop' ? '基线' : \`<span class="val-plus">+${b.vsDevelop.ahead}</span> / <span class="val-minus">-${b.vsDevelop.behind}</span>\`;
        const mainDiff = b.name === 'main' ? '基线' : \`<span class="val-plus">+${b.vsMain.ahead}</span> / <span class="val-minus">-${b.vsMain.behind}</span>\`;

        return \`
          <div class="card \${activeClass}">
            <div class="card-head">
              <div class="branch-name">\${b.name}</div>
              \${currentTag}
            </div>
            <div class="stats-row">
              <div class="stat-item">
                <div style="font-size: 11px; color: var(--text-muted)">相对 develop</div>
                <div class="stat-val">\${devDiff}</div>
              </div>
              <div class="stat-item">
                <div style="font-size: 11px; color: var(--text-muted)">相对 main</div>
                <div class="stat-val">\${mainDiff}</div>
              </div>
            </div>
            <div class="commit-preview">
              <span class="commit-hash">\${b.hash}</span> \${escapeHtml(b.subject)}
            </div>
            <div style="margin-top: 12px;">
              <details>
                <summary style="font-size: 12px; color: var(--accent-blue); cursor: pointer;">查看近期 5 次 Commit</summary>
                <ul class="commits-list" style="margin-top: 8px;">
                  \${b.recentCommits.map(c => \`<li>\${escapeHtml(c)}</li>\`).join('')}
                </ul>
              </details>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderMermaid(branches) {
      let code = 'gitGraph\\n  commit id: "v8.1.0"\\n  branch develop\\n  checkout develop\\n  commit id: "develop-head"\\n';
      branches.forEach(b => {
        if (b.name !== 'main' && b.name !== 'develop') {
          const safeName = b.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          code += \`  branch \${safeName}\\n  checkout \${safeName}\\n  commit id: "\${b.hash}"\\n\`;
        }
      });

      const container = document.getElementById('mermaidContainer');
      container.removeAttribute('data-processed');
      container.innerHTML = code;
      mermaid.contentLoaded();
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    fetchData();
  </script>
</body>
</html>`;
}

function startWebServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/branches') {
      const data = getBranchData();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getWebHtml());
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n🌐 [Web 看板已启动] 正在为您自动打开浏览器: ${url}`);
    console.log(`👉 提示：按 Ctrl+C 可随时退出 Web 看板服务。\n`);

    try {
      execSync(`start ${url}`);
    } catch (e) {
      // Ignore if auto open fails
    }
  });
}

// Main execution
const data = getBranchData();
renderConsoleTable(data);
generateMarkdownReport(data);

if (process.argv.includes('--serve') || process.argv.includes('--open')) {
  startWebServer();
} else {
  console.log(`💡 [提示] 已生成离线看板文件: ${OUTPUT_MD}`);
  console.log(`💡 想要在浏览器中动态交互查看？运行命令: node scripts/branch_visualizer.js --serve\n`);
}
