const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
http.createServer((request, response) => {
    if (request.url === '/copy-module.js' || request.url === '/baseline-module.js') {
        const source = request.url === '/baseline-module.js'
            ? require('node:child_process').execFileSync('git', ['show', '78f537c:zhinengx-beautifier/zhinengx_beautifier.user.js'], { cwd: root, encoding: 'utf8' })
            : fs.readFileSync(path.join(root, 'zhinengx-beautifier/zhinengx_beautifier.user.js'), 'utf8');
        const start = source.indexOf('    function setupCopyProblemHandler() {');
        const end = source.indexOf('\n    // ==========================================', start);
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.end(`const isDarkModeActive = () => document.documentElement.hasAttribute('data-darkreader-scheme');\n${source.slice(start, end)}\nsetupCopyProblemHandler();`);
    } else if (request.url === '/' || request.url === '/copy-solution-test.html' || request.url === '/baseline.html') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        const html = fs.readFileSync(path.join(__dirname, 'copy-solution-test.html'), 'utf8');
        response.end(request.url === '/baseline.html' ? html.replace('/copy-module.js', '/baseline-module.js') : html);
    } else {
        response.writeHead(404);
        response.end();
    }
}).listen(8765, '127.0.0.1', () => console.log('Copy solution tests: http://localhost:8765'));
