// Local static server for dist/ that mimics vercel.json (cleanUrls, / redirect).
//   node scripts/serve.mjs [port]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const target = path.join(dist, clean);
  if (!target.startsWith(dist)) return null;
  for (const candidate of [target, `${target}.html`, path.join(target, 'index.html')]) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* next */ }
  }
  return null;
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/') { res.writeHead(307, { Location: '/theme-preview' }); return res.end(); }
  const file = await resolve(pathname);
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(await readFile(file));
}).listen(port, () => console.log(`serving dist/ at http://localhost:${port}/theme-preview`));
