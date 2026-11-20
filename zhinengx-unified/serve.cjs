// Run from any directory. Reopen the URL after editing to reinstall the current file.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const file = 'zhinengx_unified.user.js';
const port = 18767;
http.createServer(async (request, response) => {
    if (request.method !== 'GET' || request.url !== '/' + file) {
        response.writeHead(404).end();
        return;
    }
    try {
        const source = await fs.readFile(path.join(__dirname, file));
        response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }).end(source);
    } catch {
        response.writeHead(500).end('Cannot read userscript');
    }
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/' + file));
