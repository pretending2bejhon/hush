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
//            within ENDING_WAIT_MS of the last room; no other text may show before its rise ends (RISE_MS of
//            heard time, less SKEW_MS for the probe's polling); the final read comes AFTER_RISE_MS after the rise, and in ?playtest
//            mode it waits up to LINE_WAIT_MS after the rise for exactly one run line `run m:ss · deaths n`,
//            whose time lies between the last room's clear step and the step read when the ending was seen
//            (section 13 keeps the step at the finish) and whose deaths are the sim's
//   network  every request goes to the page's own origin (data: and blob: URLs included)
//   storage  no cookie, localStorage, sessionStorage, IndexedDB or Cache Storage entry at the end
//   unlock   X7's clear-time half in the live run (review R1, MAJOR 1): room k (each room up to the page's layer
//            count) returns layer k. Once its witness clears it, nothing restarts the run until that layer's
//            bar line has passed; layer k's gate must read 0 until GATE_SKEW_S before origin + bar x BAR and 1
//            from GATE_SKEW_S after it, bar being unlockBar(the clearing step) (section 4.5). The clear that
//            enters the gauntlet is then watched on: at its entry and its first respawn the engine's
//            gauntletBar must be the sim's gBeat / 4 (tools/probe-lib.mjs gauntletMapProblems)
//   visibility (only when named) the page reported hidden suspends the AudioContext and freezes the sim; visible
//            again, both run on (D4)
//   scene    (only when named; review R2, MAJOR 1 and 3) once in every room, half-way through its witness, the play
//            scene's baked images and Graphics where section 10.6 puts them, at the camera of the sim's creature
//            (tools/probe-lib.mjs playLayoutProblems); and through the ending, the glimpse rising to rest at y 0 by
//            the card (endingLayoutProblems). Review R3 (MAJOR 1 and 2, MINOR 3): and what they draw
//            (tools/scene-check.mjs). Every frame of every room's run is replayed on the reference, its full frames
//            compared command for command (the beat entities through the limiter, the ring, the creature, the dust,
//            the camera); half-way, every bake's pixels against its shapes; through the ending, the ceiling and the
//            card on the music's beat, and the glimpse's pixels
//   keys     (only when named; review R2, MAJOR 4 and 5) on a page of its own: the hand-over skipCalibration(KEYS_AV_MS,
//            KEYS_BIAS_MS) starts a run at room 1, then real keys pressed through the browser must reach the sim on
//            the steps stepOf names for them (keyReplayProblems)
// Exit 0 every check passes, 1 a check fails, 2 usage, a missing dist or a page that never boots.
// (Default checks: console, play, text, network, storage and unlock.)
import fs from 'node:fs';
import path from 'node:path';
import { compileWorld } from '../tests/fixtures/oracle/index.mjs';
import { FIELDS } from '../tests/fixtures/oracle/sim.mjs';
import { bootGame, emitJson, endingLayoutProblems, extraTexts, gauntletMapProblems, keyReplayProblems, launch, loadWitnesses, openPage, originViolations, parseOptions, playLayoutProblems, playthrough, PLAYTEST_TEXT, REPO, requireDist, serveDir, storageReport, textProblems } from './probe-lib.mjs';
import { loadRoomFiles } from './replay.mjs';
import { endingDrawnProblems, frameLogProblems, glimpseBake, pixelProblems, roomBakes } from './scene-check.mjs';

const ALL = ['console', 'play', 'text', 'network', 'storage', 'unlock'];
const OPTIONAL = ['visibility', 'scene', 'keys'];

// The key check's hand-over (review R2): with avOffset 100 and inputBias -60 the sim runs 0.1 s behind the heard time
// and a key is stamped 0.04 s behind it, so every key lands about 14 steps ahead of the sim and is applied on the
// very step stepOf names; a run that dropped the calibration, or its input lag, applies it elsewhere.
const KEYS_AV_MS = 100;
const KEYS_BIAS_MS = -60;
const KEYS_RUN_WAIT_MS = 5000;

// HUSH-SPEC section 13: the camera rises for RISE_S = 16 beats at 140 BPM of heard time, then the card.
const RISE_MS = ((16 * 60) / 140) * 1000;
// The probe sees the hand-over up to a poll and a round trip after the ending's first frame: a text before the
// card is one read earlier than RISE_MS - SKEW_MS into the ending (review R1, MINOR 1: the guard once stopped
// at half the rise).
const SKEW_MS = 400;
const ENDING_WAIT_MS = 15000;
const AFTER_RISE_MS = 3000;
const LINE_WAIT_MS = 6000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The unlock check's bar line (section 4.5, the oracle's unlockBar): the first bar at least a beat after the step
// whose tick cleared the room, at 140 BPM; and how far from it the gate is judged.
const BAR_S = (60 / 140) * 4;
const unlockBar = (step) => Math.ceil((step * 7 + 720) / 2880);
const GATE_SKEW_S = 0.03;
const GATE_WAIT_MS = 5000;

// Room `room` was just cleared by the tick of step `step` and the run goes on untouched: reads the context time
// and layer `layer`'s gate until GATE_SKEW_S past the bar line. Returns the problems and the reads made.
async function unlockProblems(page, { room, layer, step }) {
  const bar = unlockBar(step);
  const origin = await page.evaluate(() => window.__hush.audio().origin);
  const at = origin + bar * BAR_S;
  const label = `room ${room}: layer ${layer}'s gate`;
  const begun = Date.now();
  let before = 0;
  for (;;) {
    const s = await page.evaluate((l) => ({ t: window.__hush.audio().time, g: window.__hush.layerGainValue(l) }), layer);
    if (s.g === null) return [`${label} does not exist`];
    if (s.t >= at + GATE_SKEW_S) {
      if (!before) return [`${label}: no read before its bar line ${bar} (the clear was seen ${Math.round((s.t - at) * 1000)} ms after it)`];
      return s.g >= 0.999 ? [] : [`${label} reads ${s.g.toFixed(3)} ${Math.round((s.t - at) * 1000)} ms after its bar line ${bar} (want 1: the layer returns on that bar)`];
    }
    if (s.t < at - GATE_SKEW_S) {
      before += 1;
      if (s.g > 0.001) return [`${label} reads ${s.g.toFixed(3)} ${Math.round((at - s.t) * 1000)} ms before its bar line ${bar} (want 0 until that bar)`];
    }
    if (Date.now() - begun > GATE_WAIT_MS + (at - s.t) * 1000) return [`${label}: the context time stalled at ${s.t.toFixed(3)} s before bar line ${bar}`];
    await sleep(10);
  }
}

// The unlock check's gauntlet half (review R1, MAJOR 1): the clear of the room before the gauntlet (section 5.2,
// room 11) enters it, and the run goes on untouched, so the creature waits for its run's bar, runs, dies at the
// first obstacle and starts again. Reads the sim's gBeat (by the oracle's FIELDS names) beside the engine's
// gauntletBar until two run starts are seen or GAUNTLET_WAIT_MS has passed; tools/probe-lib.mjs judges them.
const GAUNTLET_ROOM = 11;
const GAUNTLET_WAIT_MS = 10000;
const GBEAT = FIELDS.indexOf('gBeat');
const ROOM_FIELD = FIELDS.indexOf('room');

async function gauntletReads(page) {
  const reads = [];
  const starts = new Set();
  const begun = Date.now();
  while (Date.now() - begun < GAUNTLET_WAIT_MS && starts.size < 2) {
    const o = await page.evaluate(([gi, ri]) => {
      const s = window.__hush.sim();
      const a = window.__hush.audio();
      return s && a ? { room: s.state[ri], gBeat: s.state[gi], bar: a.gauntletBar } : null;
    }, [GBEAT, ROOM_FIELD]);
    if (o && o.room === GAUNTLET_ROOM && o.gBeat > 0) {
      reads.push({ gBeat: o.gBeat, bar: o.bar });
      starts.add(o.gBeat);
    }
    await sleep(25);
  }
  return reads;
}

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

// The scene check follows a cleared room until its layer is back (section 4.5: on the first bar line at least a beat
// after the clear, at most 5 beats) and the layer's ring has been drawn for RING_SEEN_MS, so that the frame log holds it.
const LAYER_ROOMS = 10;
const LAYER_WAIT_MS = 4000;
const RING_SEEN_MS = 300;
const LAYERS = FIELDS.indexOf('layers');
async function layerBack(page, layer) {
  const begun = Date.now();
  while (Date.now() - begun < LAYER_WAIT_MS) {
    const s = await page.evaluate(() => window.__hush.sim());
    if (s && (s.state[LAYERS] & (1 << layer))) {
      await sleep(RING_SEEN_MS);
      return;
    }
    await sleep(25);
  }
}

// A bake's points read through the probe, a few hundred a page call so that frames go on between them; null when the
// texture could not be read.
const PIXEL_BATCH = 400;
async function readBake(page, bake) {
  const out = [];
  for (let i = 0; i < bake.probe.length; i += PIXEL_BATCH) {
    const points = bake.probe.slice(i, i + PIXEL_BATCH).map((p) => [p.x, p.y]);
    const got = await page.evaluate(([key, pts]) => window.__hush.texturePixels(key, pts), [bake.key, points]);
    if (!Array.isArray(got)) return null;
    out.push(...got);
  }
  return out;
}

// Waits for the scene `ending`, then reads the page texts every 100 ms through the rise until the card is up.
// Returns whether it started, the first text beyond the link and notice seen in the first half of the rise,
// the last read, and the sim when the ending was seen and at the last read. With `layouts`, every read also takes
// the ending's display list (the scene check, review R2), marked early while the rise is surely in its first half
// and final at the last read, and (review R3) its Graphics' commands with the heard time; once the card is up the
// glimpse bake's pixels are read at `glimpse`'s points.
async function watchEnding(page, { playtest, layouts = null, glimpse = null }) {
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
    const read = await page.evaluate((withLayout) => ({
      texts: window.__hush.pageTexts(),
      layout: withLayout ? window.__hush.layout('ending') : null,
      drawn: withLayout ? window.__hush.drawn('ending') : null,
      heard: withLayout ? window.__hush.heard() : null,
    }), Boolean(layouts));
    final = read.texts;
    const now = Date.now();
    const extra = extraTexts(final);
    if (extra.length && !early && now - seen < RISE_MS - SKEW_MS) early = { ms: now - seen, texts: extra };
    const last = now >= hard || (now >= soft && (!playtest || extra.length));
    if (layouts) layouts.push({ layout: read.layout, drawn: read.drawn, heard: read.heard, early: now - seen < RISE_MS / 2 - SKEW_MS, final: last });
    if (last) break;
    await sleep(100);
  }
  const glimpsePixels = glimpse ? await readBake(page, glimpse) : null;
  return { started: true, early, final, atStart, atEnd: await sim(), ms: Date.now() - seen, glimpsePixels };
}

// The key check (review R2, MAJOR 4 and 5), on a page of its own: the probe's hand-over with a calibration, a run at
// room 1 that must be running, then ArrowRight held and Space tapped through the browser's own keyboard while the
// page records each key (src/probe/api.ts keyLog). Returns its problems.
async function keysProblems(browser, url, { query, world }) {
  const { page, log } = await openPage(browser);
  const problems = [];
  try {
    await bootGame(page, url, { query, avOffset: KEYS_AV_MS, inputBias: KEYS_BIAS_MS });
    const read = () => page.evaluate(() => ({ scenes: window.__hush.scenes(), sim: window.__hush.sim(), audio: window.__hush.audio(), calibration: window.__hush.calibration() }));
    let first = await read();
    const begun = Date.now();
    for (;;) {
      await sleep(200);
      const now = await read();
      if (now.scenes.includes('play') && now.sim && now.sim.status.room === 1 && first.sim && now.sim.step > first.sim.step) { first = now; break; }
      if (Date.now() - begun > KEYS_RUN_WAIT_MS) {
        problems.push(`keys: no run at room 1 after the hand-over (scenes ${JSON.stringify(now.scenes)}, room ${now.sim ? now.sim.status.room : 'none'}, step ${now.sim ? now.sim.step : 'none'} after ${first.sim ? first.sim.step : 'none'})`);
        return problems;
      }
      first = now;
    }
    await page.evaluate(() => window.__hush.keyLogStart());
    const before = await page.evaluate(() => ({ sim: window.__hush.sim(), origin: window.__hush.audio().origin }));
    // The sim is read every 30 ms while the keys go down and up and the creature moves, and once at the end.
    const reads = [];
    const watch = async (ms) => {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        reads.push(await page.evaluate(() => window.__hush.sim()));
        await sleep(30);
      }
    };
    await page.keyboard.down('ArrowRight');
    await watch(300);
    await page.keyboard.up('ArrowRight');
    await watch(120);
    await page.keyboard.down('Space');
    await watch(150);
    await page.keyboard.up('Space');
    await watch(600);
    const after = await page.evaluate(() => ({ sim: window.__hush.sim(), origin: window.__hush.audio().origin, events: window.__hush.keyLogTake() }));
    reads.push(after.sim);
    if (after.origin !== before.origin) problems.push(`keys: the run restarted while the keys were pressed (origin ${before.origin} then ${after.origin})`);
    problems.push(...keyReplayProblems({ world, before: before.sim, reads, events: after.events, origin: before.origin, avOffset: KEYS_AV_MS, inputBias: KEYS_BIAS_MS }));
    for (const e of [...log.pageErrors, ...log.consoleErrors].slice(0, 3)) problems.push(`keys: page error ${e}`);
  } catch (e) {
    problems.push(`keys: ${String(e.message).split('\n')[0]}`);
  } finally {
    await page.close();
  }
  return problems;
}

// The ending's part of the text check: the hand-over, nothing before the card, and in ?playtest mode the run
// line's values against the run the probe played.
function endingProblems(ending, { playtest, clearStep }) {
  if (!ending.started) return [`the run never handed over to the scene "ending" (${ENDING_WAIT_MS / 1000} s after the last room)`];
  const problems = [];
  if (ending.early) problems.push(`a page text before the ending card: ${JSON.stringify(ending.early.texts.map((t) => t.slice(0, 60)))} ${ending.early.ms} ms into the ending (want none in its first ${Math.round(RISE_MS - SKEW_MS)} ms)`);
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
    // objects are destroyed), and again at the card. With the unlock check, every room that returns a layer is
    // then watched up to that layer's bar line before the next room starts.
    const objectCounts = [];
    const layerCount = await page.evaluate(() => window.__hush.layerCount());
    const unlock = { watched: 0, gauntletReads: 0, problems: [] };
    // The scene check reads each room once, half-way to the step its witness clears it on, the layout and the sim in
    // one page read.
    const world = want.includes('scene') || want.includes('keys') ? compileWorld(loadRoomFiles(path.resolve(REPO, o.rooms))) : null;
    const scene = { sampled: new Set(), problems: [], endingReads: want.includes('scene') ? [] : null, logs: [], frames: 0, held: 0, rings: 0, pixels: 0, fixedRead: false };
    const glimpse = want.includes('scene') ? glimpseBake() : null;
    const onPoll = want.includes('scene') ? async (w, s, clearStep) => {
      if (scene.sampled.has(w.room) || clearStep === null || s.step < clearStep / 2 || s.status.room !== w.room) return;
      const r = await page.evaluate(() => ({ layout: window.__hush.layout('play'), sim: window.__hush.sim() }));
      if (!r.sim || r.sim.status.room !== w.room) return;
      scene.sampled.add(w.room);
      const room = w.room === 11 ? world.gauntlet : world.rooms[w.room - 1];
      scene.problems.push(...playLayoutProblems(r.layout, { room, number: w.room, state: r.sim.state, label: `room ${w.stem} at step ${r.sim.step}` }));
      // Review R3 (MAJOR 1): the room's bakes read pixel by pixel (and the fog and the vignette once).
      for (const bake of roomBakes(room, w.room, { fixed: !scene.fixedRead })) {
        const pixels = await readBake(page, bake);
        scene.pixels += bake.probe.length;
        scene.problems.push(...pixelProblems(bake, pixels, `room ${w.stem}`));
      }
      scene.fixedRead = true;
    } : null;
    const rooms = await playthrough(page, witnesses, {
      onPoll,
      frameLog: want.includes('scene'),
      onRoom: async (w, phase, info) => {
        if (phase !== 'end') return;
        objectCounts.push(await page.evaluate(() => window.__hush.textObjects()));
        if (want.includes('unlock') && info.ok && info.clearStep !== null && w.room >= 1 && w.room <= layerCount) {
          unlock.watched += 1;
          unlock.problems.push(...await unlockProblems(page, { room: w.room, layer: w.room, step: info.clearStep - 1 }));
          if (w.room + 1 === GAUNTLET_ROOM) {
            const reads = await gauntletReads(page);
            unlock.gauntletReads = reads.length;
            unlock.problems.push(...gauntletMapProblems(reads));
          }
        }
        // Review R3 (MAJOR 1, MINOR 3): every frame the run drew, from its bake to now, is taken before the next run starts
        // (the last room's once the ending is watched, so that its timing is untouched) and judged after the ending. A room
        // that returns a layer is first followed until that layer is back and its ring has been drawn a while.
        if (want.includes('scene') && w !== witnesses[witnesses.length - 1]) {
          if (info.ok && w.room <= LAYER_ROOMS) await layerBack(page, w.room);
          scene.logs.push({ w, log: await page.evaluate(() => window.__hush.frameLogTake()) });
        }
        process.stdout.write(`play: ${label}: room ${w.stem} done\n`);
      },
    });
    const last = rooms.length ? rooms[rooms.length - 1] : null;
    const ending = await watchEnding(page, { playtest, layouts: scene.endingReads, glimpse });
    if (want.includes('scene') && witnesses.length) {
      scene.logs.push({ w: witnesses[witnesses.length - 1], log: await page.evaluate(() => window.__hush.frameLogTake()) });
      for (const { w, log } of scene.logs) {
        const r = frameLogProblems({ world, room: w.room, changes: w.witness.changes, log, label: `room ${w.stem}` });
        scene.frames += r.compared;
        scene.held += r.held;
        scene.rings += r.rings;
        scene.problems.push(...r.problems);
      }
    }
    process.stdout.write(`play: ${label}: ending ${ending.started ? `seen, texts read ${ending.ms} ms into it` : 'never started'}\n`);
    if (want.includes('visibility')) {
      const vp = await visibilityProblems(page);
      checks.visibility = { ok: vp.length === 0, detail: vp.join('; ') || 'hidden: audio suspended, sim frozen; visible: both run on' };
    }
    if (want.includes('scene')) {
      const unread = witnesses.filter((w) => !scene.sampled.has(w.room)).map((w) => w.stem);
      if (unread.length) scene.problems.push(`no layout read in ${unread.join(', ')}`);
      const drawn = ending.started ? endingDrawnProblems(scene.endingReads) : { problems: [], rise: 0, card: 0 };
      const endingSide = ending.started
        ? [...endingLayoutProblems(scene.endingReads), ...drawn.problems, ...pixelProblems(glimpse, ending.glimpsePixels, 'ending')]
        : ['the ending never started, so its layout was not read'];
      // The rooms' first problems and the ending's, so that neither hides the other.
      const shown = [...scene.problems.slice(0, 3), ...endingSide.slice(0, 2)];
      checks.scene = {
        ok: scene.problems.length + endingSide.length === 0,
        detail: shown.join('; ') || `${scene.sampled.size} rooms read half-way, every baked image and Graphics where section 10.6 puts it at the creature's camera, ${scene.pixels} bake pixels as their shapes; every frame of every run replayed, ${scene.frames} drawn command for command as the reference (${scene.held} while the limiter held a change, ${scene.rings} with a layer's ring); the glimpse risen to y 0 by the card, ${drawn.rise} reads of the ceiling and ${drawn.card} of the card on the beat as the reference, ${glimpse.probe.length} glimpse pixels (${scene.endingReads.length} ending reads)`,
      };
    }
    if (want.includes('keys')) {
      const kp = await keysProblems(browser, srv.url, { query: o.query, world });
      checks.keys = { ok: kp.length === 0, detail: kp.slice(0, 4).join('; ') || `after the hand-over (${KEYS_AV_MS}, ${KEYS_BIAS_MS}) a run at room 1; real keys reached the sim on the steps stepOf names, every state read while they were pressed and after equal to their replay` };
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
    if (!unlock.watched && !unlock.problems.length) unlock.problems.push(`no room returned a layer (the page has ${layerCount} layer(s))`);
    checks.unlock = { ok: unlock.problems.length === 0, detail: unlock.problems.slice(0, 4).join('; ') || `${unlock.watched} rooms cleared, each layer's gate closed until its bar line and open after it${unlock.gauntletReads ? `; the gauntlet's track mapped from its run's bar at its entry and its respawn (${unlock.gauntletReads} reads)` : ''}` };
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
