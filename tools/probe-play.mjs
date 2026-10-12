// The e2e playthrough (X5, X10's browser rows, D3 in the browser, D8 and D16): the built page, booted through the
// probe API, plays every room and the gauntlet by witness injection, in order, in one page, then watches the
// ending until its card is up (HUSH-SPEC section 13).
//   node tools/probe-play.mjs [--dist dist] [--rooms rooms] [--replays replays] [--channel chrome|edge]
//        [--headed] [--query <q>] [--check console,play,text,network,storage] [--json]
// Checks (each named in --check; default all):
//   console  zero console errors and zero page errors from load to the ending's card
//   play     every room file under --rooms has a witness; each one's in-page headless replay ends on the
//            witness's checksum, and each live run clears its room with no death
//   text     no Phaser text object at the end of any room or at the card, nothing over the canvas, and the
//            page texts exactly the title, link and notice. The run must hand over to the scene `ending`
//            within ENDING_WAIT_MS of the last room; no other text may show in the first half of its rise
//            (RISE_MS of heard time); the final read comes AFTER_RISE_MS after the rise, and in ?playtest
//            mode it waits up to LINE_WAIT_MS after the rise for exactly one run line `run m:ss · deaths n`,
//            whose time lies between the last room's clear step and the step read when the ending was seen
//            (section 13 keeps the step at the finish) and whose deaths are the sim's
//   network  every request goes to the page's own origin (data: and blob: URLs included)
//   storage  no cookie, localStorage, sessionStorage, IndexedDB or Cache Storage entry at the end
//   visibility (only when named) the page reported hidden suspends the AudioContext and freezes the sim; visible
//            again, both run on (D4)
// Exit 0 every check passes, 1 a check fails, 2 usage, a missing dist or a page that never boots.
import fs from 'node:fs';
import path from 'node:path';
import { bootGame, emitJson, extraTexts, launch, loadWitnesses, openPage, originViolations, parseOptions, playthrough, PLAYTEST_TEXT, REPO, requireDist, serveDir, storageReport, textProblems } from './probe-lib.mjs';

const ALL = ['console', 'play', 'text', 'network', 'storage'];
const OPTIONAL = ['visibility'];

// HUSH-SPEC section 13: the camera rises for RISE_S = 16 beats at 140 BPM of heard time, then the card.
const RISE_MS = ((16 * 60) / 140) * 1000;
const ENDING_WAIT_MS = 15000;
const AFTER_RISE_MS = 3000;
const LINE_WAIT_MS = 6000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reports the page hidden, then visible again, through the Page Visibility API the game listens to.
async function visibilityProblems(page) {
  const read = () => page.evaluate(() => ({ state: window.__hush.audio() ? window.__hush.audio().state : 'none', step: window.__hush.sim() ? window.__hush.sim().step : -1 }));
  const report = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await report(true);
  await page.waitForTimeout(600);
  const a = await read();
  await page.waitForTimeout(500);
  const b = await read();
  await report(false);
  await page.waitForTimeout(1200);
  const c = await read();
  const problems = [];
  if (a.state !== 'suspended') problems.push(`hidden: the audio is ${a.state}, not suspended`);
  if (b.step !== a.step) problems.push(`hidden: the sim moved ${b.step - a.step} steps`);
  if (c.state !== 'running') problems.push(`visible again: the audio is ${c.state}`);
  if (!(c.step > b.step)) problems.push('visible again: the sim did not move on');
  return problems;
}

// Waits for the scene `ending`, then reads the page texts every 100 ms through the rise until the card is up.
// Returns whether it started, the first text beyond the link and notice seen in the first half of the rise,
// the last read, and the sim when the ending was seen and at the last read.
async function watchEnding(page, { playtest }) {
  const texts = () => page.evaluate(() => window.__hush.pageTexts());
  const sim = () => page.evaluate(() => window.__hush.sim());
  const begun = Date.now();
  while (!(await page.evaluate(() => window.__hush.scenes())).includes('ending')) {
    if (Date.now() - begun > ENDING_WAIT_MS) return { started: false, early: null, final: await texts(), atStart: null, atEnd: await sim(), ms: 0 };
    await sleep(40);
  }
  const seen = Date.now();
  const atStart = await sim();
  const soft = seen + RISE_MS + AFTER_RISE_MS;
  const hard = seen + RISE_MS + LINE_WAIT_MS;
  let early = null;
  let final;
  for (;;) {
    final = await texts();
    const now = Date.now();
    const extra = extraTexts(final);
    if (extra.length && !early && now - seen < RISE_MS / 2) early = { ms: now - seen, texts: extra };
    if (now >= hard || (now >= soft && (!playtest || extra.length))) break;
    await sleep(100);
  }
  return { started: true, early, final, atStart, atEnd: await sim(), ms: Date.now() - seen };
}

// The ending's part of the text check: the hand-over, nothing before the card, and in ?playtest mode the run
// line's values against the run the probe played.
function endingProblems(ending, { playtest, clearStep }) {
  if (!ending.started) return [`the run never handed over to the scene "ending" (${ENDING_WAIT_MS / 1000} s after the last room)`];
  const problems = [];
  if (ending.early) problems.push(`a page text before the ending card: ${JSON.stringify(ending.early.texts.map((t) => t.slice(0, 60)))} ${ending.early.ms} ms into the ending (want none in its first ${Math.round(RISE_MS / 2)} ms)`);
  const extra = extraTexts(ending.final);
  const m = playtest && extra.length === 1 ? PLAYTEST_TEXT.exec(extra[0]) : null;
  if (m) {
    const seconds = Number(m[1]) * 60 + Number(m[2]);
    const lo = clearStep === null ? 0 : Math.floor(clearStep / 240);
    const hi = ending.atStart ? Math.floor(ending.atStart.step / 240) : 0;
    if (seconds < lo || seconds > hi) problems.push(`the run line says ${seconds} s, want ${lo} to ${hi} s (the last room cleared on step ${clearStep}, the ending seen on step ${ending.atStart ? ending.atStart.step : 'none'})`);
    const deaths = ending.atEnd ? ending.atEnd.status.deaths : null;
    if (Number(m[3]) !== deaths) problems.push(`the run line says deaths ${m[3]}, the sim ${deaths}`);
  }
  return problems;
}

async function main(argv) {
  const o = parseOptions(argv, { dist: 'dist', rooms: 'rooms', replays: 'replays', channel: 'chrome', headed: false, query: '', check: ALL.join(','), json: false });
  const want = o.check.split(',').filter(Boolean);
  if (!want.length || want.some((c) => !ALL.includes(c) && !OPTIONAL.includes(c))) throw new Error(`--check takes ${[...ALL, ...OPTIONAL].join(', ')}`);
  const playtest = /(^|&)playtest(=|&|$)/.test(o.query);
  const dist = requireDist(o.dist);
  const roomFiles = fs.readdirSync(path.resolve(REPO, o.rooms)).filter((f) => /^\d\d-[a-z-]+\.txt$/.test(f)).sort();
  const witnesses = loadWitnesses(path.resolve(REPO, o.replays));
  const missing = roomFiles.filter((f) => !witnesses.some((w) => `${w.stem}.txt` === f));
  const srv = await serveDir(dist);
  const browser = await launch({ channel: o.channel, headed: o.headed });
  const label = `${o.channel}${o.headed ? ' headed' : ' headless'}`;
  const checks = {};
  let report;
  try {
    const { context, page, log } = await openPage(browser);
    try {
      await bootGame(page, srv.url, { query: o.query });
    } catch (e) {
      process.stdout.write(`play: ${label}: the page never booted: ${String(e.message).split('\n')[0]}\n`);
      for (const err of [...log.pageErrors, ...log.consoleErrors].slice(0, 5)) process.stdout.write(`play:   ${err}\n`);
      return 2;
    }
    // Text objects are counted at the end of every room, while the play scene is up (a stopped scene's
    // objects are destroyed), and again at the card.
    const objectCounts = [];
    const rooms = await playthrough(page, witnesses, {
      onRoom: async (w, phase) => {
        if (phase !== 'end') return;
        objectCounts.push(await page.evaluate(() => window.__hush.textObjects()));
        process.stdout.write(`play: ${label}: room ${w.stem} done\n`);
      },
    });
    const last = rooms.length ? rooms[rooms.length - 1] : null;
    const ending = await watchEnding(page, { playtest });
    process.stdout.write(`play: ${label}: ending ${ending.started ? `seen, texts read ${ending.ms} ms into it` : 'never started'}\n`);
    if (want.includes('visibility')) {
      const vp = await visibilityProblems(page);
      checks.visibility = { ok: vp.length === 0, detail: vp.join('; ') || 'hidden: audio suspended, sim frozen; visible: both run on' };
    }
    objectCounts.push(await page.evaluate(() => window.__hush.textObjects()));
    const objects = Math.max(...objectCounts);
    const storage = await storageReport(page, context);
    const violations = originViolations(log.requests, [srv.origin]);
    const roomProblems = [
      ...missing.map((f) => `no witness for ${f}`),
      ...rooms.filter((r) => !r.ok || !r.checksumOk).map((r) => `${r.stem}: ${r.ok ? '' : `${r.why}; `}in page ${r.inPage}${r.checksumOk ? '' : ' (checksum differs from the witness)'}`),
    ];
    if (!witnesses.length) roomProblems.push('no witnesses');
    const tp = [
      ...textProblems(ending.final, { playtest }),
      ...endingProblems(ending, { playtest, clearStep: last ? last.clearStep : null }),
    ];
    if (objects !== 0) tp.push(`text objects ${objects}`);
    const runLine = extraTexts(ending.final).find((t) => PLAYTEST_TEXT.test(t)) || null;
    checks.console = { ok: log.consoleErrors.length === 0 && log.pageErrors.length === 0, detail: [...log.pageErrors, ...log.consoleErrors].slice(0, 5).join(' | ') || 'zero console and page errors' };
    checks.play = { ok: roomProblems.length === 0, detail: roomProblems.join(' | ') || `${rooms.length} rooms cleared by witness, in-page checksums equal` };
    checks.text = { ok: tp.length === 0, detail: tp.join('; ') || `title, link and notice only${runLine ? `, and once the card is up ${JSON.stringify(runLine)}` : ' through the ending'}; nothing over the canvas; no text object` };
    checks.network = { ok: violations.length === 0, detail: violations.length ? `other origins: ${violations.join(', ')}` : `${log.requests.length} requests, all to the page's origin` };
    checks.storage = { ok: storage.clean, detail: storage.clean ? 'nothing stored' : JSON.stringify(storage) };
    report = {
      kind: 'play', browser: label, rooms, checks, requests: log.requests.length, storage,
      ending: { started: ending.started, early: ending.early, readMs: ending.ms, stepSeen: ending.atStart ? ending.atStart.step : null, runLine },
    };
  } finally {
    await browser.close();
    await srv.close();
  }
  for (const c of want) process.stdout.write(`play: ${label}: ${c}: ${checks[c].ok ? 'ok' : 'FAIL'}: ${checks[c].detail}\n`);
  const pass = want.every((c) => checks[c].ok);
  process.stdout.write(`play: ${label}: ${pass ? 'PASS' : 'FAIL'} (${want.join(',')})\n`);
  if (o.json) emitJson({ ...report, pass, checked: want });
  return pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`play: ${e.message}\n`); process.exitCode = 2; });
