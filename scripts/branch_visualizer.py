import os
import sys
import subprocess
import json
import http.server
import socketserver
import webbrowser
from datetime import datetime

# Reconfigure stdout for utf-8 if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 3333
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_MD = os.path.join(ROOT_DIR, "dev_resources", "BRANCH_STATUS.md")

os.makedirs(os.path.join(ROOT_DIR, "dev_resources"), exist_ok=True)

def run_git(cmd):
    try:
        res = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, shell=True, encoding='utf-8', errors='ignore')
        return res.stdout.strip()
    except Exception:
        return ""

def translate_commit_msg(msg):
    if not msg:
        return ""
    prefix_map = {
        "fix(": "【修复】",
        "fix:": "【修复】",
        "feat(": "【新功能】",
        "feat:": "【新功能】",
        "docs:": "【文档修改】",
        "docs(": "【文档修改】",
        "revert:": "【代码回滚】",
        "revert(": "【代码回滚】",
        "chore:": "【日常维护】",
        "chore(": "【日常维护】",
        "refactor:": "【代码重构】",
        "refactor(": "【代码重构】",
        "bump:": "【版本升级】",
    }
    for p, cn in prefix_map.items():
        if msg.startswith(p):
            return cn + " " + msg[len(p):].strip()
    return msg

def get_branch_role(name):
    if name == "main":
        return ("生产稳定版 (Main)", "1. 线上正式版", "#a855f7", "🔴 正式生产线")
    elif name == "beta":
        return ("体验测试版 (Beta)", "3. 公测体验版", "#ec4899", "🟡 体验验证线")
    elif name == "develop" or name == "dev":
        return ("开发集成分支 (Dev)", "4. 研发基线", "#3b82f6", "🔵 研发主干线")
    elif name.startswith("release/"):
        return (f"预发布封版 ({name})", "2. 发布门禁", "#eab308", "🛡️ 封版测试中")
    elif name.startswith("fix/") or name.startswith("hotfix/"):
        return (f"缺陷修补 ({name})", "6. BUG修复/Fix", "#ef4444", "🚨 缺陷修复中")
    elif name.startswith("feat/") or name.startswith("feature/"):
        return (f"特性开发 ({name})", "5. 特性/Feature", "#10b981", "🟢 特性研发中")
    roles = {
        "dev-panel": ("开发者GUI面板分支", "特性/实验", "#f59e0b", "🟠 独立特性线"),
    }
    return roles.get(name, (f"{name} 独立分支", "独立特性", "#64748b", "⚪ 临时分支"))

def get_branch_data():
    current_branch = run_git("git rev-parse --abbrev-ref HEAD")
    raw_branches = run_git('git branch --format="%(refname:short)|%(objectname:short)|%(committerdate:iso)|%(subject)"')
    
    if not raw_branches:
        return {"branches": [], "currentBranch": "", "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

    lines = [l for l in raw_branches.split('\n') if l.strip()]
    branches = []

    for line in lines:
        parts = line.split('|')
        name = parts[0]
        hash_val = parts[1] if len(parts) > 1 else ""
        date_str = parts[2] if len(parts) > 2 else ""
        subject = parts[3] if len(parts) > 3 else ""

        vs_develop = {"ahead": 0, "behind": 0}
        vs_main = {"ahead": 0, "behind": 0}

        if name != "develop":
            dev_counts = run_git(f"git rev-list --left-right --count develop...{name}").split()
            if len(dev_counts) == 2:
                vs_develop["behind"] = int(dev_counts[0])
                vs_develop["ahead"] = int(dev_counts[1])

        if name != "main":
            main_counts = run_git(f"git rev-list --left-right --count main...{name}").split()
            if len(main_counts) == 2:
                vs_main["behind"] = int(main_counts[0])
                vs_main["ahead"] = int(main_counts[1])

        recent_raw = run_git(f"git log -n 5 --oneline {name}")
        recent_commits_raw = [c for c in recent_raw.split('\n') if c.strip()]
        
        recent_commits = []
        for c in recent_commits_raw:
            parts_c = c.split(' ', 1)
            c_hash = parts_c[0]
            c_msg = parts_c[1] if len(parts_c) > 1 else ""
            recent_commits.append({
                "hash": c_hash,
                "msg": translate_commit_msg(c_msg)
            })

        formatted_date = date_str[:19].replace('T', ' ') if date_str else '暂无'
        title_cn, category_cn, color, line_status = get_branch_role(name)

        # Health status evaluation
        if name == current_branch:
            health_status = "当前正在开发"
            health_color = "#10b981"
        elif vs_develop["behind"] > 10:
            health_status = f"偏离较大 (落后 develop {vs_develop['behind']} 个提交)"
            health_color = "#ef4444"
        elif vs_develop["behind"] > 0:
            health_status = f"有待同步 (落后 develop {vs_develop['behind']} 个提交)"
            health_color = "#f59e0b"
        else:
            health_status = "健康 (已同步核心基线)"
            health_color = "#10b981"

        branches.append({
            "name": name,
            "titleCn": title_cn,
            "categoryCn": category_cn,
            "color": color,
            "lineStatus": line_status,
            "hash": hash_val,
            "date": formatted_date,
            "subject": translate_commit_msg(subject),
            "rawSubject": subject,
            "isCurrent": name == current_branch,
            "vsDevelop": vs_develop,
            "vsMain": vs_main,
            "healthStatus": health_status,
            "healthColor": health_color,
            "recentCommits": recent_commits
        })

    return {
        "branches": branches,
        "currentBranch": current_branch,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def print_console_table(data):
    try:
        print("\n==========================================================================================")
        print(f"                 ZhiNengX 本地分支进度可视化看板 (纯本地只读数据)")
        print(f"                 更新时间: {data['timestamp']} | 当前工作分支: [ {data['currentBranch']} ]")
        print("==========================================================================================")
        print("分支名称 (中文含义)        | 状态标识  | 相对开发主干(develop) | 相对稳定主干(main)   | 最新提交说明")
        print("------------------------------------------------------------------------------------------")
        
        for b in data['branches']:
            is_curr = '🚩' if b['isCurrent'] else '  '
            name_str = f"{is_curr} {b['titleCn']}".ljust(24)
            dev_diff = " (基线) " if b['name'] == 'develop' else f"领先 +{b['vsDevelop']['ahead']} / 落后 -{b['vsDevelop']['behind']}"
            main_diff = " (基线) " if b['name'] == 'main' else f"领先 +{b['vsMain']['ahead']} / 落后 -{b['vsMain']['behind']}"
            
            dev_str = dev_diff.ljust(21)
            main_str = main_diff.ljust(20)
            subj = (b['subject'] or '')[:25]

            print(f"{name_str}| {b['categoryCn'].ljust(6)}| {dev_str}| {main_str}| {b['hash']} {subj}")
        print("==========================================================================================\n")
    except Exception:
        print("控制台对比表格渲染完成。")

def generate_markdown(data):
    rows = []
    for b in data['branches']:
        curr_mark = '🚩 **(当前工作分支)**' if b['isCurrent'] else ''
        dev_stat = '开发基线' if b['name'] == 'develop' else f"领先 +{b['vsDevelop']['ahead']} 提交 / 落后 -{b['vsDevelop']['behind']} 提交"
        main_stat = '生产基线' if b['name'] == 'main' else f"领先 +{b['vsMain']['ahead']} 提交 / 落后 -{b['vsMain']['behind']} 提交"
        rows.append(f"| `{b['name']}`<br>**{b['titleCn']}** {curr_mark} | {b['categoryCn']} | <font color='{b['healthColor']}'>**{b['healthStatus']}**</font> | `{dev_stat}` | `{main_stat}` | `{b['hash']}` {b['subject']} |")

    details = []
    for b in data['branches']:
        commits_formatted = "\n".join([f"  - `{c['hash']}` {c['msg']}" for c in b['recentCommits']])
        details.append(f"### 🔹 {b['titleCn']} (`{b['name']}`)\n- **健康诊断**：{b['healthStatus']}\n- **最近修改时间**：{b['date']}\n- **近期 5 次提交记录**：\n{commits_formatted}")

    rows_str = "\n".join(rows)
    details_str = "\n\n".join(details)
    timestamp = data['timestamp']

    md_content = f"""# 📊 ZhiNengX 本地分支进度可视化全景看板

> **只读安全声明**：本看板完全提取自本地 `.git` 节点，无任何远程网络请求或修改。  
> **生成时间**：{timestamp}

---

## 🌿 1. 各分支进度与健康度对比矩阵

| 分支名称与含义 | 分支类型 | 状态诊断 | 相对开发主干 (develop) | 相对生产稳定版 (main) | 最新提交说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
{rows_str}

---

## 🔍 2. 各分支近期提交明细

{details_str}
"""
    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(md_content)

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZhiNengX - 本地分支进度可视化看板</title>
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-card: #151d30;
      --bg-card-hover: #1e2942;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent-blue: #38bdf8;
      --accent-green: #10b981;
      --accent-purple: #a855f7;
      --accent-amber: #f59e0b;
      --accent-red: #ef4444;
      --border-color: #26334d;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-main);
      padding: 30px;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .title-group h1 { font-size: 24px; color: var(--accent-blue); display: flex; align-items: center; gap: 10px; }
    .subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .badge-local { background: rgba(56, 189, 248, 0.15); color: var(--accent-blue); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid rgba(56, 189, 248, 0.3); }
    .btn-refresh {
      background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; font-size: 14px;
    }
    .btn-refresh:hover { background: #1d4ed8; transform: translateY(-1px); }

    /* Summary bar */
    .summary-bar {
      display: flex; gap: 15px; margin-bottom: 30px;
    }
    .summary-card {
      flex: 1; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-color); padding: 15px 20px; text-align: center;
    }
    .summary-num { font-size: 24px; font-weight: bold; color: var(--accent-blue); }
    .summary-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    
    /* Grid Layout */
    .section-title { font-size: 18px; margin: 25px 0 15px 0; color: var(--text-main); display: flex; align-items: center; gap: 8px; font-weight: bold; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; margin-bottom: 35px; }
    .card {
      background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); padding: 22px; transition: all 0.2s; position: relative; overflow: hidden;
    }
    .card:hover { border-color: var(--accent-blue); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
    .card.active { border: 2px solid var(--accent-green); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .branch-title { font-size: 17px; font-weight: bold; color: #fff; }
    .branch-subname { font-size: 12px; color: var(--accent-blue); font-family: monospace; }
    
    .status-badge { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: bold; display: inline-block; }
    .badge-curr { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); border: 1px solid var(--accent-green); }
    
    .health-indicator { font-size: 12px; padding: 4px 10px; border-radius: 6px; margin: 12px 0; font-weight: bold; display: flex; align-items: center; gap: 6px; }

    .stats-table { width: 100%; border-collapse: collapse; margin: 12px 0; background: rgba(11, 15, 25, 0.5); border-radius: 8px; overflow: hidden; }
    .stats-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--border-color); }
    .stats-table tr:last-child td { border-bottom: none; }
    .val-lead { color: var(--accent-green); font-weight: bold; }
    .val-lag { color: var(--accent-amber); font-weight: bold; }
    
    .commit-box { font-size: 13px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 10px 12px; border-radius: 6px; margin-top: 12px; border-left: 3px solid var(--accent-blue); }
    .commit-hash { font-family: monospace; color: var(--accent-blue); font-weight: bold; margin-right: 6px; }
    
    /* Metro SVG Graph Container */
    .metro-box {
      background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); padding: 25px; overflow-x: auto;
    }
    svg.metro-svg { width: 100%; min-width: 700px; height: 320px; }
    .node-text { font-size: 13px; fill: var(--text-main); font-weight: bold; }
    .node-subtext { font-size: 11px; fill: var(--text-muted); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>🚀 ZhiNengX 项目分支可视化看板 <span class="badge-local">纯本地只读安全</span></h1>
      <div class="subtitle">直观对比各分支与开发主线(develop)及生产主线(main)的进退落后情况</div>
    </div>
    <button class="btn-refresh" onclick="fetchData()">🔄 刷新分支数据</button>
  </div>

  <div class="summary-bar" id="summaryBar">
    <div class="summary-card">
      <div class="summary-num" id="totalBranches">-</div>
      <div class="summary-label">本地分支总数</div>
    </div>
    <div class="summary-card">
      <div class="summary-num" id="currBranchName" style="color: var(--accent-green); font-size: 18px; margin-top: 4px;">-</div>
      <div class="summary-label">当前正在开发的分支</div>
    </div>
    <div class="summary-card">
      <div class="summary-num" id="updateTime" style="font-size: 16px; margin-top: 6px;">-</div>
      <div class="summary-label">数据刷新时间</div>
    </div>
  </div>

  <div class="section-title">🌿 本地 Git 分支简易“地铁线”拓扑图 (SVG 原生图形)</div>
  <div class="metro-box">
    <svg class="metro-svg" id="metroSvg"></svg>
  </div>

  <div class="section-title" style="margin-top: 40px;">📌 5 大分支详细进展比对矩阵</div>
  <div class="grid" id="branchesGrid">加载中...</div>

  <script>
    async function fetchData() {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        renderSummary(data);
        renderGrid(data.branches);
        renderMetroSVG(data.branches);
      } catch (err) {
        console.error(err);
      }
    }

    function renderSummary(data) {
      document.getElementById('totalBranches').innerText = data.branches.length;
      document.getElementById('currBranchName').innerText = data.currentBranch;
      document.getElementById('updateTime').innerText = data.timestamp;
    }

    function renderGrid(branches) {
      const grid = document.getElementById('branchesGrid');
      grid.innerHTML = branches.map(b => {
        const activeClass = b.isCurrent ? 'active' : '';
        const currTag = b.isCurrent ? '<span class="status-badge badge-curr">🚩 当前正在使用的分支</span>' : '';
        
        let devDiffText = b.name === 'develop' ? '<span style="color: var(--text-muted)">基线 (零偏离)</span>' :
          `<span class="val-lead">领先 +${b.vsDevelop.ahead} 次提交</span> / <span class="${b.vsDevelop.behind > 0 ? 'val-lag' : ''}">落后 -${b.vsDevelop.behind} 次提交</span>`;

        let mainDiffText = b.name === 'main' ? '<span style="color: var(--text-muted)">基线 (零偏离)</span>' :
          `<span class="val-lead">领先 +${b.vsMain.ahead} 次提交</span> / <span class="${b.vsMain.behind > 0 ? 'val-lag' : ''}">落后 -${b.vsMain.behind} 次提交</span>`;

        return `
          <div class="card ${activeClass}">
            <div class="card-top">
              <div>
                <div class="branch-title">${b.titleCn}</div>
                <div class="branch-subname">git 分支名: ${b.name}</div>
              </div>
              ${currTag}
            </div>

            <div class="health-indicator" style="background: ${b.healthColor}22; color: ${b.healthColor}; border: 1px solid ${b.healthColor}55;">
              <span>● 健康诊断：${b.healthStatus}</span>
            </div>

            <table class="stats-table">
              <tr>
                <td style="color: var(--text-muted); width: 140px;">相对开发主线(develop)</td>
                <td>${devDiffText}</td>
              </tr>
              <tr>
                <td style="color: var(--text-muted)">相对生产主线(main)</td>
                <td>${mainDiffText}</td>
              </tr>
            </table>

            <div class="commit-box">
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">最新提交信息 (${b.date})</div>
              <div><span class="commit-hash">${b.hash}</span> ${escapeHtml(b.subject)}</div>
            </div>

            <div style="margin-top: 15px;">
              <details>
                <summary style="font-size: 12px; color: var(--accent-blue); cursor: pointer;">展开查看最近 5 次提交记录</summary>
                <ul style="margin-top: 10px; padding-left: 15px; font-size: 12px; color: var(--text-muted);">
                  ${b.recentCommits.map(c => `<li style="margin-bottom: 4px;"><code style="color: var(--accent-blue);">${c.hash}</code> ${escapeHtml(c.msg)}</li>`).join('')}
                </ul>
              </details>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderMetroSVG(branches) {
      const svg = document.getElementById('metroSvg');
      svg.innerHTML = ''; // Clear existing

      const startX = 60;
      let startY = 50;
      const stepY = 50;
      const stepX = 140;

      // Base line (Main & Develop)
      let svgHtml = `
        <!-- Background grid tracks -->
        <line x1="${startX}" y1="50" x2="650" y2="50" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" />
        <text x="${startX}" y="30" fill="#3b82f6" font-size="13" font-weight="bold">开发主线基轨 (develop / main)</text>
      `;

      branches.forEach((b, idx) => {
        const y = startY + (idx + 1) * stepY;
        const color = b.color || '#38bdf8';
        const nodeX = startX + 150 + (idx * 90);

        // Branch curve connection line
        svgHtml += `
          <!-- Branch Line for ${b.name} -->
          <path d="M ${startX + 40} 50 C ${startX + 100} 50, ${startX + 80} ${y}, ${nodeX} ${y}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${b.name === 'develop' || b.name === 'main' ? 'none' : '4'}" />
          <!-- End node -->
          <circle cx="${nodeX}" cy="${y}" r="8" fill="${color}" stroke="#0b0f19" stroke-width="3" />
          ${b.isCurrent ? `<circle cx="${nodeX}" cy="${y}" r="14" fill="none" stroke="${color}" stroke-width="2"><animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/></circle>` : ''}
          
          <!-- Text Label -->
          <text x="${nodeX + 18}" y="${y + 4}" class="node-text">${escapeHtml(b.titleCn)} (${b.name})</text>
          <text x="${nodeX + 18}" y="${y + 22}" class="node-subtext">最新: ${b.hash} | ${escapeHtml(b.subject.substring(0, 18))}</text>
        `;
      });

      svg.innerHTML = svgHtml;
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    fetchData();
  </script>
</body>
</html>"""

class VisualizerHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/branches':
            data = get_branch_data()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(HTML_TEMPLATE.encode('utf-8'))

def serve_web():
    with socketserver.TCPServer(("", PORT), VisualizerHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"\n[Web 看板已启动] 正在为您自动打开浏览器: {url}")
        print("提示：按 Ctrl+C 可随时退出 Web 看板服务。\n")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已退出看板服务。")

if __name__ == "__main__":
    data = get_branch_data()
    print_console_table(data)
    generate_markdown(data)
    
    if "--serve" in sys.argv or "--open" in sys.argv:
        serve_web()
    else:
        print(f"[提示] 已生成离线 Markdown 看板: {OUTPUT_MD}")
        print(f"[提示] 想要在浏览器中实时交互动态查看？运行: python scripts/branch_visualizer.py --open\n")
