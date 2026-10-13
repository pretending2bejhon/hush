// Shared machinery of the browser probes (X1, X4 to X7, X10, X12): a static server for a built page under
// /hush/, the installed browsers through Playwright (never a downloaded one), the collectors (console and
// page errors, every request, storage), the boot through the probe API, and the witness playthrough.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createSim, FIELDS } from '../tests/fixtures/oracle/index.mjs';
import { bakeChunks, cameraPx, depthBands, TILE_PX, ZOOM } from '../tests/fixtures/reference/art.mjs';
import { displaySec, inputLagSec } from '../tests/fixtures/reference/driver.mjs';
import { KEY_BITS } from '../tests/fixtures/reference/keys.mjs';
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
// that tick ran at step clearStep - 1. onRoom(w, 'end', { ok, clearStep }) runs before the next room starts;
// onPoll(w, s, clearStep), when given, runs after every read of the sim while the room is still being played.
export async function playthrough(page, witnesses, { onRoom = null, onPoll = null, timeoutPad = 15 } = {}) {
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
      else {
        if (onPoll) await onPoll(w, s, inPage && inPage.ok ? inPage.step : null);
        await sleep(40);
      }
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

// The unlock check's gauntlet half (review R1, MAJOR 1): reads, after the clear that enters the gauntlet, of the
// sim's gBeat in room 11 beside the engine's gauntletBar ({ gBeat, bar }). Each run start (the entry, each
// respawn) sets gBeat; the engine must map the track from bar gBeat / 4 on every read, and at least two run
// starts must have been seen (the entry and a respawn).
export function gauntletMapProblems(reads) {
  const problems = [];
  const wrong = reads.find((o) => o.bar !== o.gBeat / 4);
  if (wrong) problems.push(`the gauntlet's track is mapped from bar ${wrong.bar} while its run starts on bar ${wrong.gBeat / 4} (gBeat ${wrong.gBeat})`);
  const starts = new Set(reads.map((o) => o.gBeat)).size;
  if (starts < 2) problems.push(`the gauntlet's mapping was read for ${starts} run start(s), want the entry and a respawn`);
  return problems;
}

// The av probe's mix check (review R3, MINOR 4): the speakers' chain as the page built it (src/probe/api.ts
// audioGraph), held to section 8.4. The master analyser (fftSize 2048, smoothing 0) feeds the speakers, and nothing
// else that could sound does: every other input of the speakers is silent by construction (superdough's timers, at
// gain 0, and its own output, which no patched orbit feeds). The analyser has one input, the master gain (0.8), and
// the master one, the compressor (threshold -10, knee 6, ratio 4, attack 0.005, release 0.12). Every layer gate is an
// input of the compressor, besides at most one more (the calibration orbit). The parameters are read back as float32,
// hence MIX_TOLERANCE.
export const MIX = Object.freeze({ fftSize: 2048, smoothing: 0, gain: 0.8, threshold: -10, knee: 6, ratio: 4, attack: 0.005, release: 0.12 });
export const MIX_TOLERANCE = 1e-5;

export function audioGraphProblems(graph, layers) {
  if (!graph) return ['the audio graph could not be read'];
  const problems = [];
  const near = (v, want) => Number.isFinite(v) && Math.abs(v - want) <= MIX_TOLERANCE;
  if (!graph.analyserAtSpeakers) problems.push('the master analyser does not feed the speakers');
  const loud = graph.others.filter((n) => !n.silent);
  if (loud.length) problems.push(`the speakers have ${loud.length} input(s) besides the analyser that are not silent by construction (${loud.map((n) => `${n.type}${n.gain !== undefined ? ` at gain ${n.gain}` : ''}`).join(', ')}): something bypasses the analyser`);
  const a = graph.analyser;
  if (a && (a.fftSize !== MIX.fftSize || !near(a.smoothing, MIX.smoothing))) problems.push(`the analyser has fftSize ${a.fftSize} and smoothing ${a.smoothing}, want ${MIX.fftSize} and ${MIX.smoothing}`);
  const m = graph.master;
  if (!m || m.type !== 'GainNode' || !near(m.gain, MIX.gain)) problems.push(`the analyser is fed by ${m ? `${m.type}${m.gain !== undefined ? ` at gain ${m.gain}` : ''}` : 'no single node'}, want the master gain at ${MIX.gain}`);
  const c = graph.compressor;
  const keys = ['threshold', 'knee', 'ratio', 'attack', 'release'];
  if (!c || c.type !== 'DynamicsCompressorNode' || !keys.every((k) => near(c[k], MIX[k]))) problems.push(`the master gain is fed by ${c ? `${c.type} ${keys.map((k) => `${k} ${c[k]}`).join(', ')}` : 'no single node'}, want the compressor of section 8.4`);
  const out = graph.gatesIn.map((g, i) => (g ? 0 : i + 1)).filter(Boolean);
  if (graph.gatesIn.length !== layers || out.length) problems.push(`the compressor's inputs miss layer gate(s) ${out.join(', ') || `(${graph.gatesIn.length} of ${layers} read)`}`);
  else if (graph.compressorInputs > layers + 1) problems.push(`the compressor has ${graph.compressorInputs} inputs, want the ${layers} layer gates and at most the calibration orbit`);
  return problems;
}

// The playthrough's scene check (review R2, MAJOR 1): one read of the play scene's display list (src/probe/api.ts
// layout) with the sim's state, taken between two frames in room `number`. Section 10.6 places the room's baked
// images: chunk i of bakeChunks(room) at depth 5, at x col0 x 40 less the camera; band b of depthBands(room) at depth
// b and scale ZOOM, at x -round(factor x camera); the fog at depth 4 and the vignette at depth 9, at (0, 0); every one
// with origin (0, 0), y 0, its baked size, visible and opaque, and no other image. The camera they share must be
// cameraPx(room, the creature's centre) within CAMERA_SLACK_PX: the frame drew the creature between its last two
// steps, and it moves at most 1.75 world px (a dash) in one. The beat entities, the creature and the dust are three
// Graphics at depths 6, 7 and 8, unmoved and unscaled, the creature's and the dust's holding commands.
export const CAMERA_SLACK_PX = 5;
const X_FIELD = FIELDS.indexOf('x');

export function playLayoutProblems(layout, { room, number, state, label }) {
  if (!Array.isArray(layout)) return [`${label}: the play scene could not be read`];
  const problems = [];
  const nn = String(number).padStart(2, '0');
  const want = new Map();
  bakeChunks(room).forEach((c, i) => want.set(`room-${nn}-${i}`, { kind: 'chunk', col0: c.col0, w: c.w, h: c.h, depth: 5, scale: 1 }));
  depthBands(room).forEach((b, i) => want.set(`band-${nn}-${i}`, { kind: 'band', factor: b.factor, w: b.w, h: b.h, depth: i, scale: ZOOM }));
  want.set('fog', { kind: 'fixed', w: 1280, h: 720, depth: 4, scale: 1 });
  want.set('vignette', { kind: 'fixed', w: 1280, h: 720, depth: 9, scale: 1 });
  const seen = new Map();
  for (const o of layout.filter((g) => g.type === 'Image')) {
    if (!want.has(o.key)) problems.push(`${label}: an image ${JSON.stringify(o.key)} that the room does not bake`);
    else if (seen.has(o.key)) problems.push(`${label}: the image ${o.key} shown twice`);
    else seen.set(o.key, o);
  }
  for (const k of want.keys()) if (!seen.has(k)) problems.push(`${label}: the image ${k} is missing`);
  for (const [k, o] of seen) {
    const w = want.get(k);
    if (o.originX !== 0 || o.originY !== 0) problems.push(`${label}: ${k} has origin (${o.originX}, ${o.originY}), want (0, 0)`);
    if (o.y !== 0) problems.push(`${label}: ${k} at y ${o.y}, want 0`);
    if (o.scaleX !== w.scale || o.scaleY !== w.scale) problems.push(`${label}: ${k} at scale ${o.scaleX} by ${o.scaleY}, want ${w.scale}`);
    if (o.depth !== w.depth) problems.push(`${label}: ${k} at depth ${o.depth}, want ${w.depth}`);
    if (!o.visible || o.alpha !== 1) problems.push(`${label}: ${k} hidden or faded (visible ${o.visible}, alpha ${o.alpha})`);
    // A texture's side may come out one px over an odd size asked for (the gauntlet's far band, 1741 px wide, is 1742).
    if (!(o.w >= w.w && o.w <= w.w + 1) || !(o.h >= w.h && o.h <= w.h + 1)) problems.push(`${label}: ${k} is ${o.w} by ${o.h}, want ${w.w} by ${w.h}`);
    if (w.kind === 'fixed' && o.x !== 0) problems.push(`${label}: ${k} at x ${o.x}, want 0`);
  }
  const first = seen.get(`room-${nn}-0`);
  if (first) {
    const camPx = -first.x;
    for (const [k, o] of seen) {
      const w = want.get(k);
      if (w.kind === 'chunk' && o.x !== w.col0 * TILE_PX - camPx) problems.push(`${label}: ${k} at x ${o.x}, want ${w.col0 * TILE_PX - camPx} (column ${w.col0} at the camera ${camPx} of the first chunk)`);
      if (w.kind === 'band' && o.x !== -Math.round(w.factor * camPx)) problems.push(`${label}: ${k} at x ${o.x}, want ${-Math.round(w.factor * camPx)} (factor ${w.factor} of the camera ${camPx})`);
    }
    const centreX = state[X_FIELD] / 256 + 5;
    const expected = cameraPx(room, centreX);
    if (Math.abs(camPx - expected) > CAMERA_SLACK_PX) problems.push(`${label}: the room is drawn at camera ${camPx} px, the creature's camera is ${expected} px (want within ${CAMERA_SLACK_PX} px, one step's motion)`);
  }
  const graphics = layout.filter((g) => g.type === 'Graphics');
  const depths = graphics.map((g) => g.depth).sort((a, b) => a - b);
  if (depths.join(',') !== '6,7,8') problems.push(`${label}: Graphics at depths ${JSON.stringify(depths)}, want 6, 7 and 8 (the beat entities, the creature, the dust)`);
  for (const g of graphics) {
    if (g.x !== 0 || g.y !== 0 || g.scaleX !== 1 || g.scaleY !== 1 || !g.visible || g.alpha !== 1) problems.push(`${label}: the Graphics at depth ${g.depth} is moved, scaled, hidden or faded`);
    if ((g.depth === 7 || g.depth === 8) && !(g.commands > 0)) problems.push(`${label}: the Graphics at depth ${g.depth} draws nothing (want the ${g.depth === 7 ? 'creature' : 'dust'})`);
  }
  return problems;
}

// The scene check's ending half (review R2, MAJOR 3): reads of the ending's display list ({ layout, final }, in time
// order) through the rise and, `final`, once the card is up. Section 13 shows the glimpse as one image of 1280 by 720
// at depth 0, origin (0, 0), x 0 and scale 1, rising from y 720 to rest at y 0 (riseAt): its y never moves back down,
// a read in the rise's first half sees it at 360 or below the view's middle, and once the card is up it is 0. The
// Graphics of the ceiling and the card sits at depth 1.
export function endingLayoutProblems(reads, { label = 'ending' } = {}) {
  const problems = [];
  const ys = [];
  for (const r of reads) {
    if (!Array.isArray(r.layout)) { problems.push(`${label}: the ending scene could not be read`); break; }
    const images = r.layout.filter((g) => g.type === 'Image');
    const graphics = r.layout.filter((g) => g.type === 'Graphics');
    const glimpse = images.filter((g) => g.key === 'glimpse');
    if (glimpse.length !== 1 || images.length !== 1) { problems.push(`${label}: images ${JSON.stringify(images.map((g) => g.key))}, want the one glimpse`); break; }
    const o = glimpse[0];
    if (o.x !== 0 || o.originX !== 0 || o.originY !== 0 || o.scaleX !== 1 || o.scaleY !== 1 || o.depth !== 0 || !o.visible || o.alpha !== 1 || o.w !== 1280 || o.h !== 720) {
      problems.push(`${label}: the glimpse at x ${o.x}, origin (${o.originX}, ${o.originY}), scale ${o.scaleX}, depth ${o.depth}, visible ${o.visible}, alpha ${o.alpha}, ${o.w} by ${o.h} (want x 0, origin (0, 0), scale 1, depth 0, shown, 1280 by 720)`);
      break;
    }
    if (graphics.length !== 1 || graphics[0].depth !== 1 || !graphics[0].visible) { problems.push(`${label}: Graphics at depths ${JSON.stringify(graphics.map((g) => g.depth))}, want one at depth 1`); break; }
    ys.push({ y: o.y, final: Boolean(r.final), early: Boolean(r.early) });
  }
  if (problems.length) return problems;
  for (let i = 1; i < ys.length; i++) if (ys[i].y > ys[i - 1].y) { problems.push(`${label}: the glimpse moved back down from y ${ys[i - 1].y} to ${ys[i].y}`); break; }
  if (!ys.some((r) => r.early && r.y >= 360)) problems.push(`${label}: the glimpse was never below the view's middle in the rise's first half (reads ${JSON.stringify(ys.filter((r) => r.early).map((r) => Math.round(r.y)))})`);
  const last = ys[ys.length - 1];
  if (!last || !last.final) problems.push(`${label}: no read once the card was up`);
  else if (last.y !== 0) problems.push(`${label}: the glimpse at y ${last.y} once the card is up, want 0`);
  return problems;
}

// The playthrough's key check (review R2, MAJOR 5): the keys a probe pressed through the browser, as the page saw
// them (src/probe/api.ts keyLog), against the sim's state before and after them, on a run handed over with
// (avOffset, inputBias). When a key arrives, the sim stands where the driver puts it (section 9.1): at most
// targetStep(its heard time, the origin, displaySec(avOffset)), and no more than KEY_SIM_SLACK steps (one late frame)
// behind it. The game stamps each key with stepOf (section 9.2), floor((its time through the clock line - the run's
// origin - inputLagSec) x 240), and the keys' queue applies it on the first tick at or after that step once it has
// arrived: max(stepOf, the sim's step when it arrived). Replayed so on the oracle from the state before, the keys
// must give every state read while they were pressed and after (`reads`, in step order), field for field: a room
// without beat entities forgets when a move happened once the creature stands still again, so the reads taken while
// it moves are the ones that pin the steps. The same replay without the keys must differ from them.
export const KEY_SIM_SLACK = 24;

export function keyReplayProblems({ world, before, reads, events, origin, avOffset, inputBias }) {
  if (!before || !reads || !reads.length || reads.some((r) => !r)) return ['keys: the sim could not be read before and after the keys'];
  const lag = inputLagSec(avOffset, inputBias);
  const display = displaySec(avOffset);
  const placed = [];
  for (const e of events) {
    const tgt = Math.floor((e.t / 1000 + e.offset - origin + display) * 240) + 1;
    if (!(e.step <= tgt + 1 && e.step >= tgt - KEY_SIM_SLACK)) placed.push(`keys: the sim stood at step ${e.step} when ${e.code} ${e.type === 'keydown' ? 'went down' : 'came up'}, where the heard time less the display offset names step ${tgt} (want at most ${tgt}, and no more than ${KEY_SIM_SLACK} behind)`);
  }
  if (placed.length) return placed.slice(0, 2);
  const queue = events.filter((e) => KEY_BITS[e.code] !== undefined && !e.repeat).map((e) => ({
    code: e.code,
    down: e.type === 'keydown',
    at: Math.max(Math.floor((e.t / 1000 + e.offset - origin - lag) * 240), e.step),
  }));
  if (!queue.some((q) => q.down)) return [`keys: no game key reached the page (${events.length} key events)`];
  const sorted = [...reads].filter((r) => r.step >= before.step).sort((a, b) => a.step - b.step);
  // The first read the replay does not give, as a phrase, or null when it gives every one.
  const replay = (withKeys) => {
    const sim = createSim(world, { room: 1, step: 0, layers: 0 });
    sim.load(Int32Array.from(before.state));
    const held = new Set();
    const done = new Set();
    for (const r of sorted) {
      while (sim.step < r.step) {
        const s = sim.step;
        if (withKeys) {
          queue.forEach((q, i) => {
            if (done.has(i) || q.at > s) return;
            done.add(i);
            if (q.down) held.add(q.code); else held.delete(q.code);
          });
        }
        let bits = 0;
        for (const c of held) bits |= KEY_BITS[c];
        sim.tick(bits);
      }
      const got = sim.save();
      const i = got.findIndex((v, k) => v !== r.state[k]);
      if (i >= 0) return `at step ${r.step} ${FIELDS[i]} live ${r.state[i]}, replay ${got[i]}`;
    }
    return null;
  };
  const problems = [];
  const keyed = replay(true);
  if (keyed) problems.push(`keys: the sim's states while the keys were pressed differ from their replay on the steps stepOf names (${keyed}; ${queue.length} key events, ${sorted.length} reads from step ${before.step})`);
  if (!replay(false)) problems.push('keys: the run went on as if no key had been pressed');
  return problems;
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
