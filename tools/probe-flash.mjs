// The flash probe (X6, D10): headless Chrome plays every room and the gauntlet by witness injection while a
// CDP screencast streams the page at half resolution; every frame is cropped to the canvas and fed to the
// WCAG 2.3.1 predicate of tools/flash-analyzer.mjs (general and red flashes counted separately, the combined
// area of everything over three flashes a second against 25,600 canvas pixels).
//   node tools/probe-flash.mjs [--dist dist] [--rooms rooms] [--replays replays] [--query <q>]
//        [--calibration] [--min-seconds 0] [--tail-seconds 10] [--json]
// --calibration lets the calibration screen run its course untouched (A1 rejected, then B1 rejected: the owner's
// ruling N-F1 c, 2026-10-19) before the rooms, so its flashes are measured too, and wants that course seen
// (tools/calibration-check.mjs): the waiting key pressed on the beat before the first key, the scene up for two
// attempts, A1's clicks on the master analyser, its count-in fills and B1's rings in the screencast from A1's first
// frame on, each attempt's row, then the values 0 and 0. Then, on a page of its own, a tapped calibration (review R1,
// MAJOR 2): the probe's tapper presses at known offsets after each click, A1 is accepted and the scene is left after
// it, and (review R2) the values in use must be the ones its logged taps give through section 12 (the one-pass rule:
// avOffset 0, inputBias A1's median), those taps near their marks, and a run at room 1 must be running after the
// hand-over. Review R3: Escape pressed before the first key starts nothing, and the tapper also taps the count-in,
// presses Escape in every attempt and spreads its taps, so a scene that counts either is judged off its taps' own
// values; review R6 (MINOR 2) and R7 (MINOR 3): it sends key repeats too, and dispatches every key 8 ms after its time
// stamp. Then, on a third page, the fallback calibration (the owner's ruling N-F1 c; review R4's retried run before
// it): the tapper leaves pass A untapped, so A1 is rejected, B1 tapped and accepted, the scene is left after both, and
// its values must be B1's by the one-pass rule. Review R4 (MAJOR 1): in all three runs, every click of every pass-A
// attempt must start within 1 ms of its mark, read from the starts the page records (clickStartProblems), the untouched
// run's attempts watched without a tap. Review R5 (MAJOR 1): in all three runs, every frame of the scene is logged
// between Phaser's prestep and poststep, and the waiting key's presses, pass A's count-in fills, pass B's rings and its
// frameTimes, each attempt's row and (review R8, MINOR 4) its end must show in their windows (calibFrameProblems).
// Review R5 (NOTE 2): each calibration page, once its scene is left, must have logged no console or page error, asked no
// other origin and stored nothing (X5 and X10). And (the owner's ruling N-F1 c) each page must show its line under the
// canvas before the first key and none once the scene is left. A run that streamed fewer than 30 frames a second
// (median), or whose playthrough did not clear every room, cannot pass: what was not seen was not measured.
// Exit 0 PASS, 1 FAIL, 2 usage, a missing dist or a page that never boots.
import fs from 'node:fs';
import path from 'node:path';
import { centreSum, judgeCalibration, judgeTapped, TAP_A_MS, TAP_B_MS } from './calibration-check.mjs';
import { createFlashAnalyzer, flashProblems } from './flash-analyzer.mjs';
import { decodePng } from './png.mjs';
import { bootGame, emitJson, headSha, launch, loadWitnesses, networkViolations, openGame, openPage, parseOptions, playthrough, REPO, requireDist, serveDir, storageReport, verdictDigest } from './probe-lib.mjs';

export const MAX_MEDIAN_FRAME_MS = 34;
export const CALIBRATION_TIMEOUT_MS = 120000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Review R5 (MAJOR 1): how many of a run's frames were held to their windows; and (the owner's ruling N-F1 c) how many
// had their row judged, and how many waiting frames were judged and pressed.
const timedLine = (r) => `frames ${r.timed} timed (${r.timedFills} filled, ${r.timedRings} with the ring, ${r.timedRows} with the row; ${r.timedPressed} of ${r.timedWaiting} waiting frames pressed)`;

// Review R5 (NOTE 2): X5 and X10 over the real calibration scene. Each calibration page, read once its scene is left, must
// have logged no console or page error, asked no origin but its own and stored nothing (probe-lib storageReport), as the
// playthrough's page must.
async function pageProblems(name, page, context, log, origin) {
  const problems = [];
  const errors = [...log.pageErrors, ...log.consoleErrors];
  if (errors.length) problems.push(`${name} page: ${errors.length} console or page error(s): ${errors.slice(0, 2).join(' | ')}`);
  const away = await networkViolations(page, log, [origin]);
  if (away.length) problems.push(`${name} page: requests to other origins: ${away.join(', ')}`);
  const storage = await storageReport(page, context);
  if (!storage.clean) problems.push(`${name} page: something was stored: ${JSON.stringify(storage)}`);
  return problems;
}

// The untouched calibration. The attempts are watched and the scene's frames logged from before its first key (the
// owner's ruling N-F1 c: the waiting key), then Escape, which must start nothing (review R3, MINOR 5), and the page line
// is read; then one key the game ignores starts the audio. The analyser is sampled until the scene `calibration` is
// gone, and the page line read again. Returns the wall-clock window it was up, from the key and from the first
// attempt's first sight, and what the page showed.
async function runCalibration(page) {
  // Review R4 (MAJOR 1): the attempts are watched, untouched, so that the clicks' starts can be held to their marks.
  await page.evaluate(() => window.__hush.watchCalibration());
  await page.keyboard.press('Escape');
  await sleep(1500);
  const esc = await page.evaluate(() => { const a = window.__hush.audio(); return { started: Boolean(a && a.state !== 'none'), scenes: window.__hush.scenes() }; });
  const before = await page.evaluate(() => window.__hush.pageTexts());
  const t0 = Date.now();
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(() => { const a = window.__hush.audio(); return Boolean(a && a.state === 'running'); }, null, { timeout: 10000 });
  await page.evaluate(() => window.__hush.meterStart(20));
  let tA = 0;
  let left = 0;
  let stuck = false;
  while (!left) {
    const r = await page.evaluate(() => ({ up: window.__hush.scenes().includes('calibration'), attempts: window.__hush.tapLog().attempts.length }));
    if (!tA && r.attempts > 0) tA = Date.now();
    if (!r.up) left = Date.now();
    else if (Date.now() - t0 > CALIBRATION_TIMEOUT_MS) { left = Date.now(); stuck = true; }
    else await sleep(50);
  }
  const samples = await page.evaluate(() => { const s = window.__hush.meterTake(); window.__hush.meterStop(); return s; });
  const values = await page.evaluate(() => window.__hush.calibration());
  const after = await page.evaluate(() => window.__hush.pageTexts());
  const starts = (await page.evaluate(() => window.__hush.starts())).starts;
  const attempts = (await page.evaluate(() => window.__hush.tapLog())).attempts;
  // Review R5 (MAJOR 1): every frame of the scene, logged from watchCalibration on.
  const frames = await page.evaluate(() => window.__hush.calibLogTake());
  // A scene that never hands over is left by the probe, so the rooms are still measured.
  if (stuck) await page.evaluate(() => window.__hush.skipCalibration(0, 0));
  return { t0, tA: tA || left, left, stuck, samples, values, esc, starts, attempts, frames, lines: { before, after } };
}

// The tapped calibration, on a page of its own: the page line read, one key starts the audio, then the probe's tapper
// (src/probe/api.ts tapCalibration) presses around TAP_A_MS after each click of pass A and TAP_B_MS after each ring of
// pass B; the values in use and the page line are read once the scene `calibration` is gone. With `fallback` (the
// owner's ruling N-F1 c) the tapper leaves pass A untapped, so the scene must fall back to pass B and judge it.
async function runTapped(browser, url, query, fallback = false) {
  const { context, page, log } = await openPage(browser);
  await openGame(page, url, { query });
  const before = await page.evaluate(() => window.__hush.pageTexts());
  const t0 = Date.now();
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(() => { const a = window.__hush.audio(); return Boolean(a && a.state === 'running'); }, null, { timeout: 10000 });
  const armed = await page.evaluate(([a, b, f]) => window.__hush.tapCalibration(a, b, f), [TAP_A_MS, TAP_B_MS, fallback]);
  if (!armed) return { seconds: 0, values: null, problems: ['the probe could not reach the scene calibration to tap it'] };
  let left = 0;
  while (!left) {
    const up = await page.evaluate(() => window.__hush.scenes().includes('calibration'));
    if (!up || Date.now() - t0 > CALIBRATION_TIMEOUT_MS) left = Date.now();
    else await sleep(50);
  }
  const values = await page.evaluate(() => window.__hush.calibration());
  const after = await page.evaluate(() => window.__hush.pageTexts());
  const tapLog = await page.evaluate(() => window.__hush.tapLog());
  // Review R4 (MAJOR 1): every start, the clicks among them, since the page opened.
  const starts = (await page.evaluate(() => window.__hush.starts())).starts;
  // Review R5 (MAJOR 1): every frame of the scene, logged from tapCalibration on.
  const frames = await page.evaluate(() => window.__hush.calibLogTake());
  // Review R2 (MAJOR 4): the hand-over starts a run at room 1, which must be running.
  const read = () => page.evaluate(() => { const s = window.__hush.sim(); return { scenes: window.__hush.scenes(), room: s ? s.status.room : null, step: s ? s.step : null }; });
  const a = await read();
  await sleep(600);
  const b = await read();
  const pp = await pageProblems(fallback ? 'fallback calibration' : 'tapped calibration', page, context, log, new URL(url).origin);
  await page.close();
  const verdict = judgeTapped({ seconds: (left - t0) / 1000, values, log: tapLog, handover: { scenes: b.scenes, room: b.room, from: a.step, to: b.step }, fallback, starts, frames, lines: { before, after } });
  verdict.problems.push(...pp);
  return verdict;
}

async function main(argv) {
  const o = parseOptions(argv, { dist: 'dist', rooms: 'rooms', replays: 'replays', query: '', calibration: false, minSeconds: 0, tailSeconds: 10, json: false });
  const dist = requireDist(o.dist);
  const roomFiles = fs.readdirSync(path.resolve(REPO, o.rooms)).filter((f) => /^\d\d-[a-z-]+\.txt$/.test(f));
  const witnesses = loadWitnesses(path.resolve(REPO, o.replays));
  const srv = await serveDir(dist);
  const browser = await launch({ channel: 'chrome' });
  const started = Date.now();
  let rooms = [];
  let result = null;
  let calib = null;
  let tapped = null;
  let fallback = null;
  const frameErrors = [];
  const centre = [];
  try {
    const { context, page, log } = await openPage(browser);
    try {
      if (o.calibration) await openGame(page, srv.url, { query: o.query });
      else await bootGame(page, srv.url, { query: o.query });
    } catch (e) {
      process.stdout.write(`flash: the page never booted: ${String(e.message).split('\n')[0]}\n`);
      return 2;
    }
    const rect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const cdp = await context.newCDPSession(page);
    let analyzer = null;
    let crop = null;
    let chain = Promise.resolve();
    cdp.on('Page.screencastFrame', (f) => {
      chain = chain.then(() => {
        try {
          const img = decodePng(Buffer.from(f.data, 'base64'));
          if (!analyzer) {
            const s = img.width / f.metadata.deviceWidth;
            const x0 = Math.ceil(rect.x * s);
            const y0 = Math.ceil(rect.y * s);
            const x1 = Math.min(img.width, Math.floor((rect.x + rect.w) * s));
            const y1 = Math.min(img.height, Math.floor((rect.y + rect.h) * s));
            crop = { x0, y0, w: x1 - x0, h: y1 - y0, fw: img.width, fh: img.height };
            analyzer = createFlashAnalyzer({ width: crop.w, height: crop.h, pxArea: (1280 * 720) / (crop.w * crop.h) });
          }
          if (img.width !== crop.fw || img.height !== crop.fh) throw new Error(`frame size changed to ${img.width} by ${img.height}`);
          const buf = new Uint8Array(crop.w * crop.h * 4);
          for (let y = 0; y < crop.h; y++) {
            const from = ((crop.y0 + y) * img.width + crop.x0) * 4;
            buf.set(img.data.subarray(from, from + crop.w * 4), y * crop.w * 4);
          }
          analyzer.push(buf, f.metadata.timestamp * 1000);
          if (o.calibration && !calib) centre.push({ t: f.metadata.timestamp * 1000, s: centreSum(buf, crop.w, crop.h) });
        } catch (e) {
          if (frameErrors.length < 5) frameErrors.push(String(e.message || e));
        }
        return cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
      });
    });
    await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 640, maxHeight: 360, everyNthFrame: 1 });
    if (o.calibration) {
      await sleep(500);
      const c = await runCalibration(page);
      await chain;
      // The owner's ruling N-F1 c: the trace starts once A1 was seen, after the waiting key's last press.
      const trace = centre.filter((p) => p.t >= c.tA && p.t <= c.left);
      calib = judgeCalibration({ seconds: (c.left - c.t0) / 1000, samples: c.samples, trace, values: c.values, escape: c.esc, starts: c.starts, attempts: c.attempts, frames: c.frames, lines: c.lines });
      if (c.stuck) calib.problems.unshift(`the calibration scene was still up after ${CALIBRATION_TIMEOUT_MS / 1000} s`);
      calib.problems.push(...(await pageProblems('calibration', page, context, log, srv.origin)));
    }
    rooms = await playthrough(page, witnesses);
    await page.waitForTimeout(o.tailSeconds * 1000);
    const left = o.minSeconds * 1000 - (Date.now() - started);
    if (left > 0) await page.waitForTimeout(left);
    await cdp.send('Page.stopScreencast');
    await chain;
    result = analyzer ? analyzer.result() : null;
    if (o.calibration) {
      tapped = await runTapped(browser, srv.url, o.query);
      fallback = await runTapped(browser, srv.url, o.query, true);
    }
  } finally {
    await browser.close();
    await srv.close();
  }
  const problems = [];
  if (!result || result.frames < 2) problems.push('no frames were analysed');
  else {
    problems.push(...flashProblems(result));
    if (result.medianFrameMs > MAX_MEDIAN_FRAME_MS) problems.push(`undersampled: median frame interval ${result.medianFrameMs} ms`);
  }
  if (frameErrors.length) problems.push(`frame errors: ${frameErrors.join(' | ')}`);
  const missing = roomFiles.filter((f) => !witnesses.some((w) => `${w.stem}.txt` === f));
  if (missing.length) problems.push(`no witness for ${missing.join(', ')}`);
  const failedRooms = rooms.filter((r) => !r.ok);
  if (failedRooms.length) problems.push(`rooms not covered: ${failedRooms.map((r) => `${r.stem} (${r.why})`).join(', ')}`);
  if (calib) problems.push(...calib.problems);
  if (tapped) problems.push(...tapped.problems);
  if (fallback) problems.push(...fallback.problems);
  const pass = problems.length === 0;
  if (calib) {
    process.stdout.write(`flash: calibration up ${calib.seconds} s: clicks ${calib.clicks}, count-in fills ${calib.fills}, rings ${calib.rings}, values ${calib.values ? `${calib.values.avOffset} ${calib.values.inputBias}` : 'none'}, Escape ${calib.escape ? 'ignored' : 'not ignored'} (${calib.frames} frames, ${calib.samples} analyser samples); click starts ${calib.clickStarts} of ${calib.clickMarks} on their marks; ${timedLine(calib)}\n`);
  }
  const pair = (v) => (v && Number.isFinite(v.avOffset) && Number.isFinite(v.inputBias) ? `${v.avOffset.toFixed(1)} ${v.inputBias.toFixed(1)}` : 'none');
  if (tapped) {
    process.stdout.write(`flash: tapped calibration up ${tapped.seconds} s: values ${pair(tapped.values)} (the taps' own ${pair(tapped.own)}; taps ${TAP_A_MS - 19} to ${TAP_A_MS + 19} ms after each click, the count-in's too, and Escape and a key repeat 3 times each; marks ${tapped.marks ? `${tapped.marks.avOffset} ${tapped.marks.inputBias}` : 'none'}); click starts ${tapped.clickStarts} of ${tapped.clickMarks} on their marks; ${timedLine(tapped)}\n`);
  }
  if (fallback) {
    process.stdout.write(`flash: fallback calibration up ${fallback.seconds} s: values ${pair(fallback.values)} (the taps' own ${pair(fallback.own)}; A1 untapped, B1 tapped ${TAP_B_MS} to ${TAP_B_MS + 19} ms after each ring, the count-in's too, and Escape and a key repeat 3 times in each attempt; marks ${fallback.marks ? `${fallback.marks.avOffset} ${fallback.marks.inputBias}` : 'none'}); click starts ${fallback.clickStarts} of ${fallback.clickMarks} on their marks; ${timedLine(fallback)}\n`);
  }
  if (result) {
    process.stdout.write(`flash: ${result.frames} frames over ${result.seconds.toFixed(1)} s, median ${result.medianFrameMs} ms; general max ${result.maxGeneralArea} px, red max ${result.maxRedArea} px (limit ${result.areaLimit})\n`);
  }
  for (const p of problems) process.stdout.write(`flash: ${p}\n`);
  process.stdout.write(`flash: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) emitJson({ kind: 'flash', head: headSha(), digest: await verdictDigest(), query: o.query, pass, problems, result, calibration: calib, tapped, fallback, rooms });
  return pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`flash: ${e.message}\n`); process.exitCode = 2; });
