// Shared machinery of the browser probes (X1, X4 to X7, X10, X12): a static server for a built page under
// /hush/, the installed browsers through Playwright (never a downloaded one), the collectors (console and
// page errors, every request, storage), the boot through the probe API, and the witness playthrough.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { canonicalLayers, readWitness, roomNumber } from './replay.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = '/hush/';

// The page around the canvas (HUSH-SPEC Handoff, D16): the title, the source link and the music notice, and in
// ?playtest mode one more text once the ending card is up. Nothing may sit over the canvas.
export const PAGE_TITLE = 'The Hush';
export const PAGE_TEXTS = ['Source (AGPL-3.0)', 'Music engine: Strudel, AGPL-3.0-or-later'];
export const PLAYTEST_TEXT = /^run (\d+):([0-5]\d) · deaths (\d+)$/;

// The texts a page shows beyond the link and the notice, any text over the canvas included.
export function extraTexts(report) {
  return report.texts.filter((t) => t.inside || !PAGE_TEXTS.includes(t.text)).map((t) => t.text);
}

export function textProblems(report, { playtest = false } = {}) {
  const problems = [];
  if (report.title !== PAGE_TITLE) problems.push(`page title is ${JSON.stringify(report.title)}`);
  for (const t of report.texts) if (t.inside) problems.push(`text over the canvas: ${JSON.stringify(t.text.slice(0, 60))}`);
  const outside = report.texts.filter((t) => !t.inside).map((t) => t.text);
  const extra = outside.filter((t) => !PAGE_TEXTS.includes(t));
  for (const want of PAGE_TEXTS) if (!outside.includes(want)) problems.push(`missing page text ${JSON.stringify(want)}`);
  if (playtest) {
    if (extra.length !== 1 || !PLAYTEST_TEXT.test(extra[0])) problems.push(`?playtest wants one run line, found ${JSON.stringify(extra)}`);
  } else if (extra.length) problems.push(`extra page text ${JSON.stringify(extra.map((t) => t.slice(0, 60)))}`);
  if (outside.length !== new Set(outside).size) problems.push('a page text repeats');
  return problems;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

// Serves `dir` at http://127.0.0.1:<port><base>, GET and HEAD only; anything outside the base or missing is 404.
export function serveDir(dir, base = BASE) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let file = null;
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith(base)) {
      let rel;
      try { rel = decodeURIComponent(url.pathname.slice(base.length)); } catch { rel = null; }
      if (rel !== null && !rel.includes('\0')) {
        const abs = path.resolve(root, rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel);
        if ((abs === root || abs.startsWith(root + path.sep)) && fs.existsSync(abs) && fs.statSync(abs).isFile()) file = abs;
      }
    }
    if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const origin = `http://127.0.0.1:${server.address().port}`;
      resolve({ origin, url: `${origin}${base}`, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

// A page built with Vite outside the repo config (the controls build the control page and its faulty twins).
export async function buildPage({ root, outDir, base = BASE, sha = '0'.repeat(40) }) {
  const { build } = await import('vite');
  await build({
    root: path.resolve(root), base, configFile: false, logLevel: 'error', publicDir: false,
    build: { outDir: path.resolve(outDir), emptyOutDir: true, target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 4096 },
    plugins: [{ name: 'hush-build-meta', transformIndexHtml: (html) => ({ html, tags: [{ tag: 'meta', attrs: { name: 'hush-build', content: sha }, injectTo: 'head' }] }) }],
  });
  return path.resolve(outDir);
}

export const CHANNELS = { chrome: 'chrome', edge: 'msedge', msedge: 'msedge' };

// The installed Chrome or Edge (channel), never a browser Playwright would download.
export async function launch({ channel = 'chrome', headed = false, maximized = false, unmuted = false } = {}) {
  const ch = CHANNELS[channel];
  if (!ch) throw new Error(`unknown browser ${channel} (chrome or edge)`);
  const args = maximized ? ['--start-maximized'] : [];
  return chromium.launch({ channel: ch, headless: !headed, args, ignoreDefaultArgs: unmuted ? ['--mute-audio'] : [] });
}

// A page with every collector attached. viewport null keeps the window's own size (a maximized headed run).
export async function openPage(browser, { viewport = { width: 1280, height: 720 } } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport ? 1 : undefined });
  const page = await context.newPage();
  const log = { consoleErrors: [], pageErrors: [], requests: [], failed: [], badStatus: [] };
  page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => log.pageErrors.push(String(e && e.message ? e.message : e).slice(0, 300)));
  page.on('request', (r) => log.requests.push(r.url()));
  page.on('requestfailed', (r) => log.failed.push(`${r.url()} ${r.failure() ? r.failure().errorText : ''}`.slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400) log.badStatus.push(`${r.status()} ${r.url()}`.slice(0, 300)); });
  return { context, page, log };
}

export function withQuery(url, query) {
  if (!query) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

// Loads the page with ?probe, waits for the first scene, presses one key the game ignores (the first
// keydown starts the audio), waits for a running AudioContext and leaves calibration with fixed values.
export async function openGame(page, url, { query = '', timeout = 20000 } = {}) {
  await page.goto(withQuery(withQuery(url, 'probe'), query), { waitUntil: 'load', timeout });
  await page.waitForFunction(() => window.__hush && window.__hush.ready(), null, { timeout });
}

export async function bootGame(page, url, { query = '', avOffset = 0, inputBias = 0, timeout = 20000, skip = true } = {}) {
  await openGame(page, url, { query, timeout });
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(() => { const a = window.__hush.audio(); return Boolean(a && a.state === 'running'); }, null, { timeout: 10000 });
  if (skip) await page.evaluate(([a, b]) => window.__hush.skipCalibration(a, b), [avOffset, inputBias]);
}

// replays/NN-name.json in room order: {stem, room, witness}.
export function loadWitnesses(dir) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) throw new Error(`no witness folder ${dir}`);
  return fs.readdirSync(abs).filter((f) => /^\d\d-[a-z-]+\.json$/.test(f)).sort().map((f) => {
    const stem = f.replace(/\.json$/, '');
    return { stem, room: roomNumber(stem), witness: readWitness(path.join(abs, f)) };
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every room by witness injection: the in-page headless replay (its checksum against the witness's, D3),
// then the live run from the room's entrance until it clears, dies or times out. clearStep is the step on
// which the in-page replay cleared the room (null when it did not): its sim's step after the clearing tick, so
// that tick ran at step clearStep - 1. onRoom(w, 'end', { ok, clearStep }) runs before the next room starts.
export async function playthrough(page, witnesses, { onRoom = null, timeoutPad = 15 } = {}) {
  const results = [];
  for (const w of witnesses) {
    const { changes, end, checksum } = w.witness;
    const inPage = await page.evaluate(([room, ch, e, layers]) => window.__hush.replay(room, ch, e, layers), [w.room, changes, end, canonicalLayers(w.room)]);
    if (onRoom) await onRoom(w, 'start');
    await page.evaluate(([room, ch]) => window.__hush.play(room, ch), [w.room, changes]);
    const started = Date.now();
    const limit = (end / 240 + timeoutPad) * 1000;
    let outcome = null;
    while (!outcome) {
      const s = await page.evaluate(() => window.__hush.sim());
      if (!s) outcome = { ok: false, why: 'no sim' };
      else if (s.status.deaths > 0) outcome = { ok: false, why: `died by step ${s.step}` };
      else if (s.status.cleared > 0 || s.status.room !== w.room || s.status.finished) outcome = { ok: true, why: `clear by step ${s.step}` };
      else if (Date.now() - started > limit) outcome = { ok: false, why: `no clear in ${Math.round(limit / 1000)} s (step ${s.step})` };
      else await sleep(40);
    }
    await page.evaluate(() => window.__hush.stopInput());
    if (onRoom) await onRoom(w, 'end', { ok: outcome.ok, clearStep: inPage && inPage.ok ? inPage.step : null });
    results.push({
      room: w.room, stem: w.stem, ...outcome, seconds: Math.round((Date.now() - started) / 100) / 10,
      inPage: inPage ? `${inPage.why}, checksum ${inPage.checksum}` : 'no simFactory',
      checksumOk: Boolean(inPage && inPage.ok && inPage.checksum === checksum),
      clearStep: inPage && inPage.ok ? inPage.step : null,
    });
  }
  return results;
}

// Everything the page may have persisted (X10): cookies, both storages, IndexedDB databases, Cache Storage.
export async function storageReport(page, context) {
  const cookies = (await context.cookies()).length;
  const inPage = await page.evaluate(async () => {
    let dbs = [];
    try { dbs = (await window.indexedDB.databases()).map((d) => d.name); } catch (e) { dbs = [`<databases() failed: ${e}>`]; }
    let cacheKeys = [];
    try { cacheKeys = window.caches ? await window.caches.keys() : []; } catch { cacheKeys = []; }
    return { cookie: document.cookie, localStorage: window.localStorage.length, sessionStorage: window.sessionStorage.length, indexedDB: dbs, caches: cacheKeys.length };
  });
  const clean = cookies === 0 && inPage.cookie === '' && inPage.localStorage === 0 && inPage.sessionStorage === 0 && inPage.indexedDB.length === 0 && inPage.caches === 0;
  return { cookies, ...inPage, clean };
}

// Requests to any origin but the page's own (data: and blob: URLs are the page's own).
export function originViolations(requests, allowed) {
  const out = new Set();
  for (const u of requests) {
    if (/^(data|blob):/i.test(u)) continue;
    let o;
    try { o = new URL(u).origin; } catch { out.add(u.slice(0, 120)); continue; }
    if (!allowed.includes(o)) out.add(o);
  }
  return [...out];
}

export function headSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

export async function verdictDigest() {
  try {
    const { digest } = await import('./ship-gate.mjs');
    return digest(REPO).digest;
  } catch { return null; }
}

// One JSON document for tools/evidence.mjs --json.
export function emitJson(doc) {
  process.stdout.write(`HUSH-JSON-BEGIN\n${JSON.stringify(doc, null, 2)}\nHUSH-JSON-END\n`);
}

// --name value and --flag options; positional words are refused.
export function parseOptions(argv, spec) {
  const o = {};
  for (const [k, v] of Object.entries(spec)) o[k] = v;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!Object.hasOwn(spec, key)) throw new Error(`unknown option ${a}`);
    if (typeof spec[key] === 'boolean') o[key] = true;
    else {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      o[key] = typeof spec[key] === 'number' ? Number(v) : v;
    }
  }
  return o;
}

export function requireDist(dist) {
  const abs = path.resolve(REPO, dist);
  if (!fs.existsSync(path.join(abs, 'index.html'))) throw new Error(`${dist}/index.html is missing: run npm run build first`);
  return abs;
}
