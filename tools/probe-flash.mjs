// The flash probe (X6, D10): headless Chrome plays every room and the gauntlet by witness injection while a
// CDP screencast streams the page at half resolution; every frame is cropped to the canvas and fed to the
// WCAG 2.3.1 predicate of tools/flash-analyzer.mjs (general and red flashes counted separately, the combined
// area of everything over three flashes a second against 25,600 canvas pixels).
//   node tools/probe-flash.mjs [--dist dist] [--rooms rooms] [--replays replays] [--query <q>]
//        [--calibration] [--min-seconds 0] [--tail-seconds 10] [--json]
// --calibration lets the calibration screen run its course untouched (both passes, both repeats) before the
// rooms, so its flashes are measured too. A run that streamed fewer than 30 frames a second (median), or
// whose playthrough did not clear every room, cannot pass: what was not seen was not measured.
// Exit 0 PASS, 1 FAIL, 2 usage, a missing dist or a page that never boots.
import fs from 'node:fs';
import path from 'node:path';
import { createFlashAnalyzer } from './flash-analyzer.mjs';
import { decodePng } from './png.mjs';
import { bootGame, emitJson, headSha, launch, loadWitnesses, openGame, openPage, parseOptions, playthrough, REPO, requireDist, serveDir, verdictDigest } from './probe-lib.mjs';

export const MAX_MEDIAN_FRAME_MS = 34;

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
  const frameErrors = [];
  try {
    const { context, page } = await openPage(browser);
    try {
      if (o.calibration) {
        await openGame(page, srv.url, { query: o.query });
        await page.keyboard.press('KeyQ');
      } else await bootGame(page, srv.url, { query: o.query });
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
        } catch (e) {
          if (frameErrors.length < 5) frameErrors.push(String(e.message || e));
        }
        return cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
      });
    });
    await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 640, maxHeight: 360, everyNthFrame: 1 });
    if (o.calibration) {
      await page.waitForFunction(() => !window.__hush.scenes().includes('calibration'), null, { timeout: 120000 });
    }
    rooms = await playthrough(page, witnesses);
    await page.waitForTimeout(o.tailSeconds * 1000);
    const left = o.minSeconds * 1000 - (Date.now() - started);
    if (left > 0) await page.waitForTimeout(left);
    await cdp.send('Page.stopScreencast');
    await chain;
    result = analyzer ? analyzer.result() : null;
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
  const pass = problems.length === 0;
  if (result) {
    process.stdout.write(`flash: ${result.frames} frames over ${result.seconds.toFixed(1)} s, median ${result.medianFrameMs} ms; general max ${result.maxGeneralArea} px, red max ${result.maxRedArea} px (limit ${result.areaLimit})\n`);
  }
  for (const p of problems) process.stdout.write(`flash: ${p}\n`);
  process.stdout.write(`flash: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) emitJson({ kind: 'flash', head: headSha(), digest: await verdictDigest(), query: o.query, pass, problems, result, rooms });
  return pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`flash: ${e.message}\n`); process.exitCode = 2; });
