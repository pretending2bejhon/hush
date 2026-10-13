// The flash probe (X6, D10): headless Chrome plays every room and the gauntlet by witness injection while a
// CDP screencast streams the page at half resolution; every frame is cropped to the canvas and fed to the
// WCAG 2.3.1 predicate of tools/flash-analyzer.mjs (general and red flashes counted separately, the combined
// area of everything over three flashes a second against 25,600 canvas pixels).
//   node tools/probe-flash.mjs [--dist dist] [--rooms rooms] [--replays replays] [--query <q>]
//        [--calibration] [--min-seconds 0] [--tail-seconds 10] [--json]
// --calibration lets the calibration screen run its course untouched (both passes, both repeats) before the
// rooms, so its flashes are measured too, and wants that course seen (tools/calibration-check.mjs): the scene
// up for four attempts, their clicks on the master analyser, their count-in fills and rings in the
// screencast, then the values 0 and 0. Then, on a page of its own, a tapped calibration (review R1, MAJOR 2):
// the probe's tapper presses at known offsets after each click and each ring, the scene is left after one attempt
// of each pass, and (review R2) the values in use must be the ones its logged taps give through section 12, those
// taps near their marks, and a run at room 1 must be running after the hand-over. Review R3: Escape pressed before the
// first key starts nothing, and the tapper also taps the count-in, presses Escape in every attempt and spreads its
// taps, so a scene that counts either is judged off its taps' own values. Review R4 (MAJOR 2): then, on a third page,
// a retried calibration: the tapper leaves each pass's first attempt untapped, so the scene must repeat both passes,
// be left after four attempts and use the repeats' values. A run that streamed fewer than 30
// frames a second (median), or whose playthrough did not clear every room, cannot pass: what was not seen was
// not measured.
// Exit 0 PASS, 1 FAIL, 2 usage, a missing dist or a page that never boots.
import fs from 'node:fs';
import path from 'node:path';
import { centreSum, judgeCalibration, judgeTapped, TAP_A_MS, TAP_B_MS } from './calibration-check.mjs';
import { createFlashAnalyzer } from './flash-analyzer.mjs';
import { decodePng } from './png.mjs';
import { bootGame, emitJson, headSha, launch, loadWitnesses, openGame, openPage, parseOptions, playthrough, REPO, requireDist, serveDir, verdictDigest } from './probe-lib.mjs';

export const MAX_MEDIAN_FRAME_MS = 34;
export const CALIBRATION_TIMEOUT_MS = 120000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The untouched calibration: Escape first, which must start nothing (review R3, MINOR 5), then one key the game
// ignores starts the audio; the analyser is sampled until the scene `calibration` is gone. Returns the wall-clock
// window it was up and what the page showed.
async function runCalibration(page) {
  await page.keyboard.press('Escape');
  await sleep(1500);
  const esc = await page.evaluate(() => { const a = window.__hush.audio(); return { started: Boolean(a && a.state !== 'none'), scenes: window.__hush.scenes() }; });
  const t0 = Date.now();
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(() => { const a = window.__hush.audio(); return Boolean(a && a.state === 'running'); }, null, { timeout: 10000 });
  await page.evaluate(() => window.__hush.meterStart(20));
  let left = 0;
  let stuck = false;
  while (!left) {
    const up = await page.evaluate(() => window.__hush.scenes().includes('calibration'));
    if (!up) left = Date.now();
    else if (Date.now() - t0 > CALIBRATION_TIMEOUT_MS) { left = Date.now(); stuck = true; }
    else await sleep(50);
  }
  const samples = await page.evaluate(() => { const s = window.__hush.meterTake(); window.__hush.meterStop(); return s; });
  const values = await page.evaluate(() => window.__hush.calibration());
  // A scene that never hands over is left by the probe, so the rooms are still measured.
  if (stuck) await page.evaluate(() => window.__hush.skipCalibration(0, 0));
  return { t0, left, stuck, samples, values, esc };
}

// The tapped calibration, on a page of its own: one key starts the audio, then the probe's tapper (src/probe/api.ts
// tapCalibration) presses TAP_A_MS after each click of pass A and TAP_B_MS after each ring of pass B; the values in
// use are read once the scene `calibration` is gone. With `retry` (review R4, MAJOR 2) the tapper leaves the first
// attempt of each pass untapped, so the scene must repeat both passes and judge the repeats.
async function runTapped(browser, url, query, retry = false) {
  const { page } = await openPage(browser);
  await openGame(page, url, { query });
  const t0 = Date.now();
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(() => { const a = window.__hush.audio(); return Boolean(a && a.state === 'running'); }, null, { timeout: 10000 });
  const armed = await page.evaluate(([a, b, r]) => window.__hush.tapCalibration(a, b, r), [TAP_A_MS, TAP_B_MS, retry]);
  if (!armed) return { seconds: 0, values: null, problems: ['the probe could not reach the scene calibration to tap it'] };
  let left = 0;
  while (!left) {
    const up = await page.evaluate(() => window.__hush.scenes().includes('calibration'));
    if (!up || Date.now() - t0 > CALIBRATION_TIMEOUT_MS) left = Date.now();
    else await sleep(50);
  }
  const values = await page.evaluate(() => window.__hush.calibration());
  const log = await page.evaluate(() => window.__hush.tapLog());
  // Review R2 (MAJOR 4): the hand-over starts a run at room 1, which must be running.
  const read = () => page.evaluate(() => { const s = window.__hush.sim(); return { scenes: window.__hush.scenes(), room: s ? s.status.room : null, step: s ? s.step : null }; });
  const a = await read();
  await sleep(600);
  const b = await read();
  await page.close();
  return judgeTapped({ seconds: (left - t0) / 1000, values, log, handover: { scenes: b.scenes, room: b.room, from: a.step, to: b.step }, retry });
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
  let retried = null;
  const frameErrors = [];
  const centre = [];
  try {
    const { context, page } = await openPage(browser);
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
      const trace = centre.filter((p) => p.t >= c.t0 && p.t <= c.left);
      calib = judgeCalibration({ seconds: (c.left - c.t0) / 1000, samples: c.samples, trace, values: c.values, escape: c.esc });
      if (c.stuck) calib.problems.unshift(`the calibration scene was still up after ${CALIBRATION_TIMEOUT_MS / 1000} s`);
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
      retried = await runTapped(browser, srv.url, o.query, true);
    }
  } finally {
    await browser.close();
    await srv.close();
  }
  const problems = [];
  if (!result || result.frames < 2) problems.push('no frames were analysed');
  else {
    if (result.maxGeneralArea >= result.areaLimit) problems.push(`general flashes over ${result.maxGeneralArea} canvas px at ${result.maxGeneralAtMs} ms (limit ${result.areaLimit})`);
    if (result.maxRedArea >= result.areaLimit) problems.push(`red flashes over ${result.maxRedArea} canvas px at ${result.maxRedAtMs} ms (limit ${result.areaLimit})`);
    if (result.medianFrameMs > MAX_MEDIAN_FRAME_MS) problems.push(`undersampled: median frame interval ${result.medianFrameMs} ms`);
  }
  if (frameErrors.length) problems.push(`frame errors: ${frameErrors.join(' | ')}`);
  const missing = roomFiles.filter((f) => !witnesses.some((w) => `${w.stem}.txt` === f));
  if (missing.length) problems.push(`no witness for ${missing.join(', ')}`);
  const failedRooms = rooms.filter((r) => !r.ok);
  if (failedRooms.length) problems.push(`rooms not covered: ${failedRooms.map((r) => `${r.stem} (${r.why})`).join(', ')}`);
  if (calib) problems.push(...calib.problems);
  if (tapped) problems.push(...tapped.problems);
  if (retried) problems.push(...retried.problems);
  const pass = problems.length === 0;
  if (calib) {
    process.stdout.write(`flash: calibration up ${calib.seconds} s: clicks ${calib.clicks}, count-in fills ${calib.fills}, rings ${calib.rings}, values ${calib.values ? `${calib.values.avOffset} ${calib.values.inputBias}` : 'none'}, Escape ${calib.escape ? 'ignored' : 'not ignored'} (${calib.frames} frames, ${calib.samples} analyser samples)\n`);
  }
  if (tapped) {
    const v = tapped.values;
    const own = tapped.own;
    process.stdout.write(`flash: tapped calibration up ${tapped.seconds} s: values ${v ? `${v.avOffset.toFixed(1)} ${v.inputBias.toFixed(1)}` : 'none'} (the taps' own ${own ? `${own.avOffset.toFixed(1)} ${own.inputBias.toFixed(1)}`: 'none'}; taps ${TAP_A_MS - 19} to ${TAP_A_MS + 19} ms after each click and ${TAP_B_MS} to ${TAP_B_MS + 19} ms after each ring, the count-in's too, and Escape 3 times an attempt; marks ${tapped.marks.avOffset} ${tapped.marks.inputBias})\n`);
  }
  if (retried) {
    const v = retried.values;
    const own = retried.own;
    process.stdout.write(`flash: retried calibration up ${retried.seconds} s: values ${v ? `${v.avOffset.toFixed(1)} ${v.inputBias.toFixed(1)}` : 'none'} (the taps' own ${own ? `${own.avOffset.toFixed(1)} ${own.inputBias.toFixed(1)}`: 'none'}; A1 and B1 untapped, A2 and B2 tapped as above; marks ${retried.marks.avOffset} ${retried.marks.inputBias})\n`);
  }
  if (result) {
    process.stdout.write(`flash: ${result.frames} frames over ${result.seconds.toFixed(1)} s, median ${result.medianFrameMs} ms; general max ${result.maxGeneralArea} px, red max ${result.maxRedArea} px (limit ${result.areaLimit})\n`);
  }
  for (const p of problems) process.stdout.write(`flash: ${p}\n`);
  process.stdout.write(`flash: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) emitJson({ kind: 'flash', head: headSha(), digest: await verdictDigest(), query: o.query, pass, problems, result, calibration: calib, tapped, retried, rooms });
  return pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`flash: ${e.message}\n`); process.exitCode = 2; });
