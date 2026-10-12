// The perf probe (X4, D17): headed Chrome on this laptop's GPU, window maximized, a 60 s autoplay: 40 s through
// the rooms by witness injection, then the gauntlet's busiest 20 s (from --busy-step of --busy-room's run),
// measured as the intervals of the page's animation frames.
//   node tools/probe-perf.mjs --headed [--dist dist] [--rooms rooms] [--replays replays] [--query <q>]
//        [--busy-room 11] [--busy-step 5349] [--json]
// Pass: mean fps >= 58 and at least 99% of frame intervals <= 20 ms over 60 s or more, every played room run
// without a death, and the conditions X4 names: headed, a WebGL renderer that is not SwiftShader, the power
// line online (AC), no energy saver and no Power saver plan, every display at 60 Hz, and no other process over
// 10% of the CPU or 20% of the GPU's 3D engine in the sample taken before the browser starts. A run that
// misses a condition is recorded and fails. Exit 0 PASS, 1 FAIL, 2 usage or a page that never boots.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootGame, emitJson, headSha, launch, loadWitnesses, openPage, parseOptions, REPO, requireDist, serveDir, verdictDigest } from './probe-lib.mjs';

export const MIN_MEAN_FPS = 58;
export const MIN_SHARE_20MS = 0.99;
export const ROOMS_SECONDS = 40;
export const BUSY_SECONDS = 20;
const POWER_SAVER_PLAN = 'a1841308-3541-4fab-bc81-f71556f20b4a';
const SELF = new Set(['node', 'powershell', 'conhost', 'wmiprvse']);

export function readMachine() {
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(REPO, 'tools', 'machine-state.ps1')], { encoding: 'utf8', timeout: 60000 });
  const m = JSON.parse(out.trim().split(/\r?\n/).pop());
  const heavy = [
    ...m.cpu.filter((p) => p.cpu > 10 && !SELF.has(String(p.name).replace(/#\d+$/, '').toLowerCase())).map((p) => `${p.name} ${p.cpu}% CPU`),
    ...m.gpu.filter((p) => p.gpu > 20).map((p) => `${p.name} ${p.gpu}% GPU`),
  ];
  return {
    power: m.powerLine === 'Online' ? 'ac' : m.powerLine === 'Offline' ? 'battery' : 'unknown',
    powerSaver: m.energySaver === 'On' || String(m.scheme).toLowerCase().includes(POWER_SAVER_PLAN),
    energySaver: m.energySaver,
    plan: String(m.scheme).replace(/^.*\(([^)]*)\)\s*$/, '$1'),
    refreshHz: m.refreshRates.length && m.refreshRates.every((r) => r === m.refreshRates[0]) ? m.refreshRates[0] : (m.refreshRates.length ? -1 : 0),
    refreshRates: m.refreshRates,
    heavyApps: heavy,
    sample: { cpu: m.cpu.slice(0, 4), gpu: m.gpu.slice(0, 3) },
  };
}

export function frameStats(intervals) {
  const n = intervals.length;
  const sum = intervals.reduce((a, b) => a + b, 0);
  const sorted = [...intervals].sort((a, b) => a - b);
  return {
    frames: n,
    seconds: sum / 1000,
    meanFps: n ? n / (sum / 1000) : 0,
    p20: n ? intervals.filter((d) => d <= 20).length / n : 0,
    p99Ms: n ? sorted[Math.min(n - 1, Math.floor(n * 0.99))] : 0,
    maxMs: n ? sorted[n - 1] : 0,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (x, k = 2) => Math.round(x * 10 ** k) / 10 ** k;

async function main(argv) {
  const o = parseOptions(argv, { dist: 'dist', rooms: 'rooms', replays: 'replays', query: '', headed: false, busyRoom: 11, busyStep: 5349, json: false });
  const dist = requireDist(o.dist);
  const witnesses = loadWitnesses(path.resolve(REPO, o.replays));
  const machine = readMachine();
  const srv = await serveDir(dist);
  const browser = await launch({ channel: 'chrome', headed: o.headed, maximized: o.headed });
  const played = [];
  let rooms = [];
  let busy = [];
  let env = null;
  try {
    const { page } = await openPage(browser, { viewport: o.headed ? null : { width: 1280, height: 720 } });
    try {
      await bootGame(page, srv.url, { query: o.query });
    } catch (e) {
      process.stdout.write(`perf: the page never booted: ${String(e.message).split('\n')[0]}\n`);
      return 2;
    }
    env = await page.evaluate(() => ({ webgl: window.__hush.webgl(), inner: [window.innerWidth, window.innerHeight], screen: [window.screen.availWidth, window.screen.availHeight], dpr: window.devicePixelRatio }));
    await page.evaluate(() => window.__hush.framesStart());
    const phaseEnd = Date.now() + ROOMS_SECONDS * 1000;
    for (const w of witnesses.filter((x) => x.room !== o.busyRoom)) {
      if (Date.now() >= phaseEnd) break;
      await page.evaluate(([room, ch]) => window.__hush.play(room, ch), [w.room, w.witness.changes]);
      let outcome = 'played until the phase ended';
      while (Date.now() < phaseEnd) {
        const s = await page.evaluate(() => window.__hush.sim());
        if (s.status.deaths > 0) { outcome = 'died'; break; }
        if (s.status.cleared > 0 || s.status.room !== w.room || s.status.finished) { outcome = 'cleared'; break; }
        await sleep(100);
      }
      played.push({ stem: w.stem, outcome });
    }
    while (Date.now() < phaseEnd) await sleep(100);
    rooms = await page.evaluate(() => window.__hush.framesTake());
    const g = witnesses.find((x) => x.room === o.busyRoom);
    if (g) {
      await page.evaluate(([room, ch]) => window.__hush.play(room, ch), [g.room, g.witness.changes]);
      const limit = Date.now() + 120000;
      for (;;) {
        const s = await page.evaluate(() => window.__hush.sim());
        if (s.step >= o.busyStep || s.status.deaths > 0 || Date.now() > limit) {
          played.push({ stem: g.stem, outcome: s.status.deaths > 0 ? 'died' : s.step >= o.busyStep ? `busy window from step ${s.step}` : 'never reached the busy window' });
          break;
        }
        await sleep(25);
      }
      await page.evaluate(() => window.__hush.framesTake());
    }
    await sleep(BUSY_SECONDS * 1000);
    busy = await page.evaluate(() => window.__hush.framesTake());
    if (g) {
      const s = await page.evaluate(() => window.__hush.sim());
      if (s.status.deaths > 0) played[played.length - 1].outcome = 'died in the busy window';
    }
    await page.evaluate(() => window.__hush.framesStop());
  } finally {
    await browser.close();
    await srv.close();
  }
  const all = frameStats([...rooms, ...busy]);
  const swiftshader = /swiftshader/i.test(`${env.webgl.renderer} ${env.webgl.vendor}`);
  const maximized = env.inner[0] >= env.screen[0] - 24 && env.inner[1] >= env.screen[1] - 160;
  const problems = [];
  if (!o.headed) problems.push('headless: X4 is measured headed only');
  if (swiftshader) problems.push(`SwiftShader renderer (${env.webgl.renderer})`);
  if (o.headed && !maximized) problems.push(`window not maximized (${env.inner.join('x')} of ${env.screen.join('x')})`);
  if (machine.power !== 'ac') problems.push(`power line ${machine.power}`);
  if (machine.powerSaver) problems.push(`power saver on (${machine.energySaver}, ${machine.plan})`);
  if (machine.refreshHz !== 60) problems.push(`display refresh ${JSON.stringify(machine.refreshRates)}`);
  if (machine.heavyApps.length) problems.push(`heavy apps: ${machine.heavyApps.join(', ')}`);
  if (all.seconds < 59.5) problems.push(`measured ${round(all.seconds, 1)} s, under 60`);
  if (all.meanFps < MIN_MEAN_FPS) problems.push(`mean ${round(all.meanFps, 1)} fps, under ${MIN_MEAN_FPS}`);
  if (all.p20 < MIN_SHARE_20MS) problems.push(`${round(all.p20 * 100, 2)}% of intervals at 20 ms or less, under 99%`);
  for (const p of played) if (/died|never/.test(p.outcome)) problems.push(`${p.stem}: ${p.outcome}`);
  const pass = problems.length === 0;
  const doc = {
    kind: 'perf', head: headSha(), digest: await verdictDigest(), query: o.query, headed: o.headed, swiftshader, renderer: env.webgl.renderer,
    window: { inner: env.inner, screen: env.screen, dpr: env.dpr, maximized }, power: machine.power, powerSaver: machine.powerSaver,
    plan: machine.plan, refreshHz: machine.refreshHz, heavyApps: machine.heavyApps, sample: machine.sample,
    meanFps: round(all.meanFps), p20: round(all.p20, 4), p99Ms: round(all.p99Ms), maxMs: round(all.maxMs), durationSec: round(all.seconds, 1),
    phases: { rooms: frameStats(rooms), busy: frameStats(busy) }, played, problems, pass,
  };
  process.stdout.write(`perf: ${doc.meanFps} fps mean, ${round(all.p20 * 100, 2)}% of ${all.frames} intervals <= 20 ms, p99 ${doc.p99Ms} ms, over ${doc.durationSec} s (${o.headed ? 'headed' : 'headless'}, ${env.webgl.renderer})\n`);
  process.stdout.write(`perf: machine: power ${machine.power}, saver ${machine.powerSaver ? 'on' : 'off'} (${machine.plan}), refresh ${JSON.stringify(machine.refreshRates)}, heavy apps ${machine.heavyApps.length ? machine.heavyApps.join(', ') : 'none'}\n`);
  for (const p of problems) process.stdout.write(`perf: ${p}\n`);
  process.stdout.write(`perf: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) emitJson(doc);
  return pass ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`perf: ${e.message}\n`); process.exitCode = 2; });
}
