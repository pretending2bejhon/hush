// The e2e playthrough (X5, X10's browser rows, D3 in the browser, D8 and D16): the built page, booted through the
// probe API, plays every room and the gauntlet by witness injection, in order, in one page.
//   node tools/probe-play.mjs [--dist dist] [--rooms rooms] [--replays replays] [--channel chrome|edge]
//        [--headed] [--query <q>] [--check console,play,text,network,storage] [--json]
// Checks (each named in --check; default all):
//   console  zero console errors and zero page errors from load to the end of the run
//   play     every room file under --rooms has a witness; each one's in-page headless replay ends on the
//            witness's checksum, and each live run clears its room with no death
//   text     no Phaser text object, nothing over the canvas, and the page texts exactly the title, link and
//            notice (plus the run line once the run is finished, in ?playtest mode)
//   network  every request goes to the page's own origin (data: and blob: URLs included)
//   storage  no cookie, localStorage, sessionStorage, IndexedDB or Cache Storage entry at the end
//   visibility (only when named) the page reported hidden suspends the AudioContext and freezes the sim; visible
//            again, both run on (D4)
// Exit 0 every check passes, 1 a check fails, 2 usage, a missing dist or a page that never boots.
import fs from 'node:fs';
import path from 'node:path';
import { bootGame, emitJson, launch, loadWitnesses, openPage, originViolations, parseOptions, playthrough, REPO, requireDist, serveDir, storageReport, textProblems } from './probe-lib.mjs';

const ALL = ['console', 'play', 'text', 'network', 'storage'];
const OPTIONAL = ['visibility'];

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

async function main(argv) {
  const o = parseOptions(argv, { dist: 'dist', rooms: 'rooms', replays: 'replays', channel: 'chrome', headed: false, query: '', check: ALL.join(','), json: false });
  const want = o.check.split(',').filter(Boolean);
  if (!want.length || want.some((c) => !ALL.includes(c) && !OPTIONAL.includes(c))) throw new Error(`--check takes ${[...ALL, ...OPTIONAL].join(', ')}`);
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
    const rooms = await playthrough(page, witnesses, {
      onRoom: (w, phase) => { if (phase === 'end') process.stdout.write(`play: ${label}: room ${w.stem} done\n`); },
    });
    await page.waitForTimeout(1500);
    if (want.includes('visibility')) {
      const vp = await visibilityProblems(page);
      checks.visibility = { ok: vp.length === 0, detail: vp.join('; ') || 'hidden: audio suspended, sim frozen; visible: both run on' };
    }
    const texts = await page.evaluate(() => window.__hush.pageTexts());
    const objects = await page.evaluate(() => window.__hush.textObjects());
    const storage = await storageReport(page, context);
    const violations = originViolations(log.requests, [srv.origin]);
    const roomProblems = [
      ...missing.map((f) => `no witness for ${f}`),
      ...rooms.filter((r) => !r.ok || !r.checksumOk).map((r) => `${r.stem}: ${r.ok ? '' : `${r.why}; `}in page ${r.inPage}${r.checksumOk ? '' : ' (checksum differs from the witness)'}`),
    ];
    if (!witnesses.length) roomProblems.push('no witnesses');
    const tp = textProblems(texts, { playtest: /(^|&)playtest(=|&|$)/.test(o.query) });
    if (objects !== 0) tp.push(`text objects ${objects}`);
    checks.console = { ok: log.consoleErrors.length === 0 && log.pageErrors.length === 0, detail: [...log.pageErrors, ...log.consoleErrors].slice(0, 5).join(' | ') || 'zero console and page errors' };
    checks.play = { ok: roomProblems.length === 0, detail: roomProblems.join(' | ') || `${rooms.length} rooms cleared by witness, in-page checksums equal` };
    checks.text = { ok: tp.length === 0, detail: tp.join('; ') || 'title, link and notice only; nothing over the canvas; no text object' };
    checks.network = { ok: violations.length === 0, detail: violations.length ? `other origins: ${violations.join(', ')}` : `${log.requests.length} requests, all to the page's origin` };
    checks.storage = { ok: storage.clean, detail: storage.clean ? 'nothing stored' : JSON.stringify(storage) };
    report = { kind: 'play', browser: label, rooms, checks, requests: log.requests.length, storage };
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
