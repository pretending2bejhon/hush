// The av probe (X7, D5): headed Chrome on this laptop's real audio device (unmuted), the page's own
// AudioContext measured through the probe API: the master analyser, the layer gate gains, the scheduler's
// counters and the device-clock line. The protocol, about 65 s for the product's ten layers:
//   1. the first keydown must leave the AudioContext running;
//   2. silence: room 1, no layer back and no input (so it is not cleared), two bars: the master stays silent;
//   3. unlock windows: room k for k = 2 .. N+1 (layers 1 .. k-1 back, the witness of room k playing), two
//      bars each: the master carries signal;
//   4. solos: in room N+1, each layer alone at its gate for one bar (its own signal), then muted with the
//      others for half a bar (silence); held until the run has lasted 60 s;
//   5. the counters: scheduled voices at or above the track's onsets for the time elapsed in every segment
//      (all layers are scheduled from the start, muted or not), zero voice errors, zero late-dropped notes;
//   6. the device clock: valid, and the peak-to-peak of its offset after it became valid under the bound;
//   7. the mix (review R3, MINOR 4): the speakers' chain as the page built it, held to section 8.4's values;
//   8. the starts (review R4, MAJOR 1): every voice handed to superdough from the first room on, held to an onset of its
//      own layer in the run that handed it over, and every onset given a voice start of its layer (judgeStarts).
//   node tools/probe-av.mjs --headed [--dist dist] [--replays replays] [--track music/area1.strudel]
//        [--gauntlet-room 11] [--query <q>] [--json]
// Exit 0 PASS, 1 FAIL, 2 usage or a page that never boots.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audioGraphProblems, bootGame, emitJson, headSha, isVoiceStart, launch, loadWitnesses, openPage, parseOptions, REPO, requireDist, serveDir, verdictDigest } from './probe-lib.mjs';
import { compileTrack } from './strudel-node.mjs';

// Measured on the control page's synths through the same graph [VL]: the quietest solo (a square at gain .1,
// decay .035, high-passed at 2 kHz, area1's perc) peaks near 0.0067 RMS a frame; a muted master reads 0.
export const SIGNAL_RMS = 0.002;
export const SILENCE_PEAK = 0.0003;
// X7's device-clock bound, HUSH-SPEC section 8.4 (review R7, MAJOR 2): tests/tools/ship-gate.test.mjs pins it, and the
// control page's ?av=nostamps (a line without output timestamps, about 190 ms peak to peak) must fail on it alone.
export const CLOCK_JITTER_BOUND_MS = 3;
export const MIN_SECONDS = 60;
const BAR = (60 / 140) * 4;
const SETTLE = 0.2;

// Onset times of every layer in [origin, end), cycle by cycle; startBar >= 0 maps bar b >= startBar to cycle
// b - startBar (the gauntlet, HUSH-SPEC section 8.3).
export function countOnsets(layers, origin, end, startBar = -1) {
  let n = 0;
  for (let b = 0; origin + b * BAR < end; b++) {
    const cycle = startBar >= 0 && b >= startBar ? b - startBar : b;
    for (const pattern of layers) {
      for (const h of pattern.queryArc(cycle, cycle + 1)) {
        if (!h.hasOnset()) continue;
        const t = origin + (b + Number(h.whole.begin) - cycle) * BAR;
        if (t < end) n += 1;
      }
    }
  }
  return n;
}

// Review R4 (MAJOR 1): when each sound is handed over. The page records every start of an AudioScheduledSourceNode
// (src/probe/api.ts starts(): its type, when, the context time at the call, the transport's origin then, and the layer
// gate it plays into). A voice start is an OscillatorNode's or an AudioBufferSourceNode's start asked for ahead of the
// call: superdough's ConstantSourceNodes (its timers and DC offsets) and every node started at once (an FM modulator, the
// reverb's player) are not voices, and a voice that reaches no gate and no speaker (layer -1) cannot sound. Every other
// voice start must lie within [t - START_EARLY_S, t + START_LATE_S] of an onset t of its own layer in the run whose origin
// was in force at the call, or be the transport's late shift of such an onset (section 8.3: an onset due at most LATE
// before the call starts SHIFT_S after it, and counts in lateShifted). And every onset of every layer from START_SETTLE_S
// into its run until the run ended must have a voice start of its layer there. So music handed over off the sim's beat,
// or a layer played through another layer's gate, cannot pass.
export const START_EARLY_S = 0.001;
export const START_LATE_S = 0.006;
export const START_SETTLE_S = 0.3;
// Notes the lookahead handed over before a run was left, past its end.
const START_TAIL_S = 0.25;
const LATE_S = 0.05;
const SHIFT_S = 0.005;

// The onset times of each layer in [origin, end), walked as countOnsets walks them: one sorted list of distinct times per
// layer (index 0 is layer 1).
export function layerOnsets(layers, origin, end, startBar = -1) {
  const out = layers.map(() => []);
  for (let b = 0; origin + b * BAR < end; b++) {
    const cycle = startBar >= 0 && b >= startBar ? b - startBar : b;
    layers.forEach((pattern, i) => {
      for (const h of pattern.queryArc(cycle, cycle + 1)) {
        if (!h.hasOnset()) continue;
        const t = origin + (b + Number(h.whole.begin) - cycle) * BAR;
        if (t < end) out[i].push(t);
      }
    });
  }
  return out.map((ts) => ts.sort((a, b) => a - b).filter((t, k, a) => k === 0 || t - a[k - 1] > 1e-9));
}

// The index of the time in sorted `ts` nearest to x among those in [lo, hi], or -1.
function nearestIn(ts, x, lo, hi) {
  let a = 0;
  let b = ts.length;
  while (a < b) {
    const m = (a + b) >> 1;
    if (ts[m] < lo) a = m + 1;
    else b = m;
  }
  let best = -1;
  for (let k = a; k < ts.length && ts[k] <= hi; k++) if (best < 0 || Math.abs(ts[k] - x) < Math.abs(ts[best] - x)) best = k;
  return best;
}

// The verdict on the starts of a run of segments ({ room, origin, end, startBar }), the track's layers and the
// transport's own count of shifted notes.
export function judgeStarts(starts, segments, layers, lateShifted = 0) {
  const voices = (starts || []).filter(isVoiceStart);
  const segs = segments.map((s) => ({ ...s, onsets: layerOnsets(layers, s.origin, s.end + START_TAIL_S, s.startBar ?? -1), hit: layers.map(() => new Set()) }));
  const r = { voices: voices.length, matched: 0, shifted: 0, silent: 0, onsets: 0, covered: 0, earliestMs: null, latestMs: null };
  const off = [];
  const orphan = [];
  const ungated = [];
  const tangled = [];
  const unread = [];
  for (const v of voices) {
    if (v.layer === null || v.layer === undefined) { unread.push(v); continue; }
    if (v.layer === -1) { r.silent += 1; continue; }
    if (v.layer === 0) { ungated.push(v); continue; }
    if (!(v.layer >= 1 && v.layer <= layers.length)) { tangled.push(v); continue; }
    // Two runs started on one context time share their origin: the later one is in force.
    const seg = segs.findLast((s) => typeof v.origin === 'number' && Math.abs(s.origin - v.origin) < 1e-9);
    if (!seg) { orphan.push(v); continue; }
    const ts = seg.onsets[v.layer - 1];
    const k = nearestIn(ts, v.when, v.when - START_LATE_S, v.when + START_EARLY_S);
    if (k >= 0) {
      seg.hit[v.layer - 1].add(k);
      r.matched += 1;
      const d = (v.when - ts[k]) * 1000;
      r.earliestMs = r.earliestMs === null ? d : Math.min(r.earliestMs, d);
      r.latestMs = r.latestMs === null ? d : Math.max(r.latestMs, d);
      continue;
    }
    if (v.when - v.at <= SHIFT_S + 0.0005) {
      const j = nearestIn(ts, v.when - SHIFT_S, v.when - SHIFT_S - LATE_S - 0.0005, v.when - SHIFT_S);
      if (j >= 0) {
        seg.hit[v.layer - 1].add(j);
        r.shifted += 1;
        continue;
      }
    }
    const n = nearestIn(ts, v.when, -Infinity, Infinity);
    off.push({ layer: v.layer, room: seg.room, ms: n >= 0 ? (v.when - ts[n]) * 1000 : null });
  }
  const missing = [];
  for (const s of segs) {
    s.onsets.forEach((ts, i) => ts.forEach((t, k) => {
      if (t < s.origin + START_SETTLE_S || t >= s.end) return;
      r.onsets += 1;
      if (s.hit[i].has(k)) r.covered += 1;
      else missing.push({ layer: i + 1, room: s.room, at: t - s.origin, t });
    }));
  }
  const problems = [];
  const ms = (x) => (x === null ? 'none' : `${x >= 0 ? '+' : ''}${x.toFixed(1)} ms`);
  if (!voices.length) problems.push('starts: no voice start recorded (the probe API records every start under ?probe)');
  if (unread.length) problems.push(`starts: ${unread.length} voice start(s) whose layer was never read`);
  if (ungated.length) problems.push(`starts: ${ungated.length} voice start(s) reach the speakers through no layer gate`);
  if (tangled.length) problems.push(`starts: ${tangled.length} voice start(s) meet more than one way out (layer ${tangled[0].layer})`);
  if (orphan.length) problems.push(`starts: ${orphan.length} voice start(s) under a transport origin no run of the probe had`);
  if (off.length) problems.push(`starts: ${off.length} of ${voices.length} voice start(s) off their layer's onsets (want ${-START_EARLY_S * 1000} to +${START_LATE_S * 1000} ms), the first in room ${off[0].room}: layer ${off[0].layer} at ${ms(off[0].ms)} from its nearest onset`);
  if (missing.length) problems.push(`starts: ${missing.length} of ${r.onsets} onset(s) without a voice start of their layer, the first: layer ${missing[0].layer} ${missing[0].at.toFixed(3)} s into room ${missing[0].room}`);
  if (r.shifted > 2 * lateShifted) problems.push(`starts: ${r.shifted} voice start(s) read as late shifts, the transport shifted ${lateShifted} note(s)`);
  const runs = segs.map((s, n) => ({
    room: s.room,
    seconds: Math.round((s.end - s.origin) * 1000) / 1000,
    voices: voices.filter((v) => typeof v.origin === 'number' && Math.abs(s.origin - v.origin) < 1e-9 && !segs.slice(n + 1).some((u) => Math.abs(u.origin - v.origin) < 1e-9)).length,
    onsets: s.onsets.map((ts) => ts.filter((t) => t >= s.origin + START_SETTLE_S && t < s.end).length),
    started: s.onsets.map((ts, i) => ts.filter((t, k) => t >= s.origin + START_SETTLE_S && t < s.end && s.hit[i].has(k)).length),
  }));
  return { ...r, off: off.length, missing: missing.length, ungated: ungated.length, tangled: tangled.length, orphan: orphan.length, unread: unread.length, runs, firstOff: off.slice(0, 5), firstMissing: missing.slice(0, 5), problems };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main(argv) {
  const o = parseOptions(argv, { dist: 'dist', replays: 'replays', track: 'music/area1.strudel', gauntletRoom: 11, query: '', headed: false, json: false });
  const dist = requireDist(o.dist);
  const trackFile = path.resolve(REPO, o.track);
  const layers = [...(await compileTrack(fs.readFileSync(trackFile, 'utf8'))).values()];
  const N = layers.length;
  const witnesses = loadWitnesses(path.resolve(REPO, o.replays));
  const witnessOf = (room) => witnesses.find((w) => w.room === room) || null;
  const srv = await serveDir(dist);
  const browser = await launch({ channel: 'chrome', headed: o.headed, unmuted: true });
  const samples = [];
  const segments = [];
  const checks = { silence: null, windows: [], solos: [] };
  let contextRunning = false;
  let audioEnd = null;
  let started = 0;
  let deaths = 0;
  let graph = null;
  let starts = [];
  let takenAt = null;
  // The run the hand-over starts, before the probe's first room: its starts are judged too (review R4, MAJOR 1).
  let pre = null;
  try {
    const { page } = await openPage(browser);
    const take = async () => { samples.push(...await page.evaluate(() => window.__hush.meterTake())); };
    const now = async () => (await page.evaluate(() => window.__hush.audio())).time;
    const waitUntil = async (t) => { for (;;) { const c = await now(); if (c >= t) return; await take(); await sleep(Math.min(200, Math.max(20, (t - c) * 1000))); } };
    const window_ = (from, to) => samples.filter((s) => s.t >= from && s.t < to);
    const startRoom = async (room, idle = false) => {
      const t = await now();
      if (segments.length) segments[segments.length - 1].end = t;
      else if (pre) pre.end = t;
      const w = idle ? null : witnessOf(room);
      if (w) await page.evaluate(([r, ch]) => window.__hush.play(r, ch), [room, w.witness.changes]);
      else await page.evaluate((r) => window.__hush.startRoom(r), room);
      const a = await page.evaluate(() => window.__hush.audio());
      segments.push({ room, origin: a.origin, end: null, gauntlet: room === o.gauntletRoom, witness: Boolean(w) });
      return a.origin;
    };
    try {
      await bootGame(page, srv.url, { query: o.query, skip: false });
      contextRunning = true;
      await page.evaluate(() => window.__hush.skipCalibration(0, 0));
      const a0 = await page.evaluate(() => window.__hush.audio());
      pre = { room: 1, origin: a0.origin, end: a0.time, gauntlet: false };
      // Everything started before the hand-over's run (the calibration's clicks) is left out.
      await page.evaluate(() => window.__hush.starts());
    } catch (e) {
      process.stdout.write(`av: the page never booted to a running AudioContext: ${String(e.message).split('\n')[0]}\n`);
      return 2;
    }
    started = Date.now();
    await page.evaluate(() => window.__hush.meterStart(20));
    // Room 1 untouched: no input, so it is not cleared and no layer comes back during the window.
    let origin = await startRoom(1, true);
    await waitUntil(origin + 2 * BAR);
    await take();
    const quiet = window_(origin + 0.5 * BAR, origin + 2 * BAR);
    checks.silence = { ok: quiet.length > 10 && quiet.every((s) => s.peak <= SILENCE_PEAK), peak: Math.max(0, ...quiet.map((s) => s.peak)), samples: quiet.length };
    for (let k = 2; k <= N + 1; k++) {
      origin = await startRoom(k);
      await waitUntil(origin + 2 * BAR);
      await take();
      const w = window_(origin + 0.25 * BAR, origin + 2 * BAR);
      const rms = Math.max(0, ...w.map((s) => s.rms));
      checks.windows.push({ room: k, layersBack: k - 1, ok: w.length > 10 && rms >= SIGNAL_RMS, rms });
    }
    const st = await page.evaluate(() => window.__hush.sim());
    deaths += st ? st.status.deaths : 0;
    for (let layer = 1; layer <= N; layer++) {
      for (let j = 1; j <= N; j++) await page.evaluate(([l, v]) => window.__hush.setLayerGain(l, v), [j, j === layer ? 1 : 0]);
      let t0 = await now();
      await waitUntil(t0 + BAR);
      await take();
      const on = window_(t0 + SETTLE, t0 + BAR);
      await page.evaluate((l) => window.__hush.setLayerGain(l, 0), layer);
      t0 = await now();
      await waitUntil(t0 + BAR / 2);
      await take();
      const off = window_(t0 + SETTLE, t0 + BAR / 2);
      const rms = Math.max(0, ...on.map((s) => s.rms));
      const peak = Math.max(0, ...off.map((s) => s.peak));
      checks.solos.push({ layer, soloSignalOk: on.length > 10 && rms >= SIGNAL_RMS, soloSilenceOk: off.length > 5 && peak <= SILENCE_PEAK, rms, peak });
    }
    for (let j = 1; j <= N; j++) await page.evaluate((l) => window.__hush.setLayerGain(l, 1), j);
    // Review R3 (MINOR 4): the speakers' chain as built, held to section 8.4's values.
    graph = await page.evaluate(() => window.__hush.audioGraph());
    while (Date.now() - started < MIN_SECONDS * 1000 + 500) { await take(); await sleep(250); }
    await take();
    const fin = await page.evaluate(() => window.__hush.sim());
    if (fin) deaths += fin.status.deaths;
    // Review R4 (MAJOR 1): every start since the hand-over whose layer was read, taken before the run's end is read; the
    // onsets the take must cover end at its own context time.
    const taken = await page.evaluate(() => window.__hush.starts());
    starts = taken.starts;
    takenAt = taken.time;
    audioEnd = await page.evaluate(() => window.__hush.audio());
    segments[segments.length - 1].end = audioEnd.time;
    await page.evaluate(() => window.__hush.meterStop());
  } finally {
    await browser.close();
    await srv.close();
  }
  const gauntletStartBar = Math.ceil(720 / 2880);
  const expectedVoices = segments.reduce((a, s) => a + countOnsets(layers, s.origin, s.end, s.gauntlet ? gauntletStartBar : -1), 0);
  const valid = samples.filter((s) => s.valid);
  const offsets = valid.map((s) => s.offset);
  const clockJitterMs = offsets.length ? (Math.max(...offsets) - Math.min(...offsets)) * 1000 : Infinity;
  const resyncs = samples.length ? samples[samples.length - 1].resyncs : 0;
  const durationSec = (Date.now() - started) / 1000;
  const doc = {
    kind: 'av', head: headSha(), digest: await verdictDigest(), query: o.query, headed: o.headed, track: path.relative(REPO, trackFile).split(path.sep).join('/'),
    contextRunning, state: audioEnd.state, scheduledVoices: audioEnd.scheduledVoices, expectedVoices, voiceErrors: audioEnd.voiceErrors,
    lateShifted: audioEnd.lateShifted, lateDropped: audioEnd.lateDropped,
    masterSignalOk: checks.windows.length === N && checks.windows.every((w) => w.ok), masterSilenceOk: Boolean(checks.silence && checks.silence.ok),
    silence: checks.silence, windows: checks.windows, layers: checks.solos,
    signalFloorRms: SIGNAL_RMS, silenceCeilingPeak: SILENCE_PEAK,
    clockValid: valid.length > 0, clockJitterMs: Math.round(clockJitterMs * 1000) / 1000, clockJitterBoundMs: CLOCK_JITTER_BOUND_MS, clockResyncs: resyncs,
    deaths, durationSec: Math.round(durationSec * 10) / 10, segments: segments.map((s) => ({ room: s.room, seconds: Math.round((s.end - s.origin) * 100) / 100, witness: s.witness })),
  };
  const problems = [];
  if (!o.headed) problems.push('headless: X7 is measured headed, on the real audio device');
  if (!doc.contextRunning) problems.push('the AudioContext was not running after the first keydown');
  if (doc.scheduledVoices < doc.expectedVoices) problems.push(`scheduled ${doc.scheduledVoices} voices, the track has ${doc.expectedVoices} onsets in the time played`);
  if (doc.voiceErrors) problems.push(`${doc.voiceErrors} voice errors`);
  if (doc.lateDropped) problems.push(`${doc.lateDropped} late-dropped notes`);
  if (!doc.masterSilenceOk) problems.push(`no silence with every layer muted (peak ${checks.silence ? checks.silence.peak.toExponential(2) : 'n/a'})`);
  for (const w of checks.windows) if (!w.ok) problems.push(`no master signal in room ${w.room} with ${w.layersBack} layer(s) back (rms ${w.rms.toExponential(2)})`);
  for (const l of checks.solos) {
    if (!l.soloSignalOk) problems.push(`layer ${l.layer} soloed: no signal (rms ${l.rms.toExponential(2)})`);
    if (!l.soloSilenceOk) problems.push(`layer ${l.layer} muted alone: not silent (peak ${l.peak.toExponential(2)})`);
  }
  if (!doc.clockValid) problems.push('the device clock never became valid');
  else if (!(doc.clockJitterMs <= CLOCK_JITTER_BOUND_MS)) problems.push(`device clock offset moved ${doc.clockJitterMs} ms peak to peak (bound ${CLOCK_JITTER_BOUND_MS})`);
  if (deaths) problems.push(`${deaths} death(s) in the witness rooms`);
  if (doc.durationSec < MIN_SECONDS) problems.push(`ran ${doc.durationSec} s, under ${MIN_SECONDS}`);
  doc.graph = graph;
  problems.push(...audioGraphProblems(graph, N));
  const runs = [...(pre ? [pre] : []), ...segments].map((s) => ({ room: s.room, origin: s.origin, end: typeof takenAt === 'number' ? Math.min(s.end, takenAt) : s.end, startBar: s.gauntlet ? gauntletStartBar : -1 }));
  const st = judgeStarts(starts, runs, layers, audioEnd.lateShifted);
  doc.starts = { ...st, problems: undefined, recorded: starts.length };
  problems.push(...st.problems);
  doc.problems = problems;
  doc.pass = problems.length === 0;
  process.stdout.write(`av: ${doc.scheduledVoices} voices scheduled for ${doc.expectedVoices} onsets, ${doc.voiceErrors} errors, ${doc.lateDropped} dropped, ${doc.lateShifted} shifted; clock ${doc.clockJitterMs} ms p-p, ${resyncs} resyncs; ${doc.durationSec} s\n`);
  process.stdout.write(`av: silence peak ${checks.silence.peak.toExponential(2)}; windows rms ${checks.windows.map((w) => w.rms.toFixed(4)).join(' ')}\n`);
  process.stdout.write(`av: solos rms ${checks.solos.map((l) => l.rms.toFixed(4)).join(' ')}; muted peaks ${checks.solos.map((l) => l.peak.toExponential(1)).join(' ')}\n`);
  process.stdout.write(`av: mix ${graph ? `speakers <- ${graph.analyserAtSpeakers ? 'AnalyserNode' : 'no analyser'} and ${graph.others.length} other(s), ${graph.others.filter((n) => n.silent).length} silent by construction; master gain ${graph.master ? graph.master.gain : 'none'}; compressor ${graph.compressor ? `${graph.compressor.threshold} ${graph.compressor.knee} ${graph.compressor.ratio} ${graph.compressor.attack} ${graph.compressor.release}` : 'none'}; ${graph.gatesIn.filter(Boolean).length} of ${graph.gatesIn.length} gates in, ${graph.compressorInputs} inputs` : 'not read'}\n`);
  const fmtMs = (x) => (x === null ? 'n/a' : `${x >= 0 ? '+' : ''}${x.toFixed(2)}`);
  process.stdout.write(`av: starts ${st.voices} voice start(s) of ${starts.length} recorded: ${st.matched} on their layer's onsets (${fmtMs(st.earliestMs)} to ${fmtMs(st.latestMs)} ms), ${st.shifted} late-shifted, ${st.silent} unable to sound, ${st.off} off; ${st.covered} of ${st.onsets} onsets started\n`);
  for (const p of problems) process.stdout.write(`av: ${p}\n`);
  process.stdout.write(`av: ${doc.pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) emitJson(doc);
  return doc.pass ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`av: ${e.stack || e.message}\n`); process.exitCode = 2; });
}
