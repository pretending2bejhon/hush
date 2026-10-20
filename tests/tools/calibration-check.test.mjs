// The calibration check's arithmetic (tools/calibration-check.mjs) on synthetic traces: clicks counted once per
// rising edge, pulses split into fills and rings by their peak, the resting level taken from the median frame,
// and the verdict's every rule. Review R5 (MAJOR 1): and the pictures' time, on synthetic frame logs of a scene drawing
// section 12 frame by frame. The owner's ruling N-F1 c (2026-10-19): the course A1, then B1 only after a rejected A1,
// the waiting key, the row, the one-pass values and the page line. The browser side is controlled in
// tests/controls/calibration-probe.test.mjs.
import { describe, expect, it } from 'vitest';
import { BEAT_S, CALIB_DRAW, CALIB_MIN_FRAMES, CALIB_MIN_PRESS_FRAMES, CALIB_MIN_WAIT_FRAMES, calibFrameProblems, centreSum, countClicks, countPulses, judgeCalibration, judgeTapped, lineProblems, MIN_SECONDS, rowDraw, TAP_A_MS, TAP_B_MID, TAP_B_MS, tapLogValues } from '../../tools/calibration-check.mjs';
import { CALIBRATION_TEXT, PAGE_TEXTS, PAGE_TITLE } from '../../tools/probe-lib.mjs';
import { encodeShapes } from '../../tools/scene-check.mjs';

const S = BEAT_S / 4;
const ROW_N = 20;

// Review R5 (MAJOR 1): the frame log of a scene that draws section 12's pictures for `attempts` in order, as src/probe/api.ts
// logs it (calibLogTake). A frame every `dt` ms: the scene reads its frameMs at t, inside the bracket [t - lo, t + hi]
// between the probe's prestep and poststep, and the heard time is the performance time (a clock line of offset 0).
// `wait` frames before the first attempt draw the waiting key (the owner's ruling N-F1 c: pressed for a sixteenth from
// each beat line of performance time), beside two Graphics not drawn yet, which hold Phaser's default styles. An attempt
// begins on the frame after the one before it ended, or LEAD and a little latency before its first mark; its last frame
// draws for none, and the last attempt's is the scene's own last frame, logged `left` with no Graphics (it hands over in
// it). Pass B's first frame in each ring window sits on its
// frameTimes[i] when the attempt gives all 24, and otherwise frameTimes is filled in from the frames. The faults move one
// picture: the ring ringLateMs after its window, the fills fillLateS after their clicks, frameTimes frameTimeLateMs after
// the frame, the ring shown with each fill (ringInA), the key filled with each ring (fillInB), no fill at all (noFill), the
// waiting key never pressed (noPress) or pressed pressLateMs late, the row's dots rowLateS after their marks or no row
// (noRow), and each attempt ended a beat early (endEarly) or a beat late (endLate).
// Returns { log, attempts }: copies of the attempts, frameTimes filled in. Graphics: 0 the plain key, 1 the filled key,
// 2 nothing, 3 the ring, 4 the pressed key, 5 + n the row with n dots filled, 26 Phaser's default styles alone.
function drawnLog(attempts, o = {}) {
  const { dt = 1000 / 60, lo = 0.1, hi = 0.2, wait = 120, ringLateMs = 0, fillLateS = 0, frameTimeLateMs = 0, ringInA = false, fillInB = false, noFill = false, noPress = false, pressLateMs = 0, rowLateS = 0, noRow = false, endEarly = false, endLate = false } = o;
  const list = (attempts || []).map((a) => ({ ...a, frameTimes: Array.isArray(a.frameTimes) ? [...a.frameTimes] : a.frameTimes }));
  const frames = [];
  const push = (t, aPre, aPost, key, ring, dots) => frames.push({ pre: t - lo, post: t + hi, hPre: (t - lo) / 1000, hPost: (t + hi) / 1000, aPre, aPost, g: [key, ring ? 3 : 2, dots === null || noRow ? 2 : 5 + dots] });
  const startOf = (a) => (a.pass === 'A' ? (a.t0 - 0.52) * 1000 : a.p0 - 500);
  const endBeats = 23 + (endEarly ? -1 : endLate ? 1 : 0);
  let t = list.length ? startOf(list[0]) - wait * dt : 0;
  for (let n = 0; n < wait; n++, t += dt) {
    const ph = (((t - pressLateMs) % (BEAT_S * 1000)) + BEAT_S * 1000) % (BEAT_S * 1000);
    push(t, -1, -1, !noPress && ph < S * 1000 ? 4 : 0, false, null);
    frames[frames.length - 1].g = [frames[frames.length - 1].g[0], 26, 26];
  }
  list.forEach((a, k) => {
    t = Math.max(t, startOf(a));
    let aPre = -1;
    if (a.pass === 'A') {
      for (; t / 1000 < a.t0 + endBeats * BEAT_S + BEAT_S / 2; t += dt) {
        const h = t / 1000;
        let fill = false;
        for (let i = 0; i < 4; i++) if (h >= a.t0 + i * BEAT_S + fillLateS && h < a.t0 + i * BEAT_S + fillLateS + S) fill = true;
        if (noFill) fill = false;
        let dots = 0;
        for (let j = 0; j < ROW_N; j++) if (h >= a.t0 + (4 + j) * BEAT_S + rowLateS) dots = j + 1;
        push(t, aPre, k, fill ? 1 : 0, ringInA && fill, dots);
        aPre = k;
      }
    } else {
      const given = Array.isArray(a.frameTimes) && a.frameTimes.length === 24 && a.frameTimes.every((v) => typeof v === 'number');
      const forced = given ? [...a.frameTimes] : null;
      if (!given) a.frameTimes = [];
      let next = 0;
      for (; t < a.p0 + (endBeats * BEAT_S + BEAT_S / 2) * 1000; t += dt) {
        if (forced && next < 24 && t >= a.p0 + next * BEAT_S * 1000) t = forced[next++];
        let w = -1;
        let shown = false;
        for (let i = 0; i < 24; i++) {
          const d = a.p0 + i * BEAT_S * 1000;
          if (t >= d && t < d + S * 1000) w = i;
          if (t >= d + ringLateMs && t < d + ringLateMs + S * 1000) shown = true;
        }
        let dots = 0;
        for (let j = 0; j < ROW_N; j++) if (t >= a.p0 + ((4 + j) * BEAT_S + rowLateS) * 1000) dots = j + 1;
        if (!given && w >= 0 && a.frameTimes[w] === undefined) a.frameTimes[w] = t + frameTimeLateMs;
        push(t, aPre, k, fillInB && shown ? 1 : 0, shown, dots);
        aPre = k;
      }
      if (!given) a.frameTimes = Array.from({ length: 24 }, (_, i) => (typeof a.frameTimes[i] === 'number' ? a.frameTimes[i] : null));
    }
    push(t, k, -1, 0, false, null);
    if (k === list.length - 1) Object.assign(frames[frames.length - 1], { g: [], left: true });
    t += dt;
  });
  const buffers = [CALIB_DRAW.keyPlain, CALIB_DRAW.keyFilled, [], CALIB_DRAW.ring, CALIB_DRAW.keyPressed, ...Array.from({ length: ROW_N + 1 }, (_, n) => rowDraw(n)), [6, 1, 0, 0, 7, 0, 0]];
  const graphics = buffers.map((b) => ({ depth: 0, visible: true, alpha: 1, buffer: [...b] }));
  return { log: { frames, graphics, dropped: 0 }, attempts: list };
}
const framesOf = (attempts) => drawnLog(attempts).log;

// One analyser sample every 20 ms with a click of `len` samples on each beat.
function clickSamples(clicks, len = 4) {
  const out = [];
  for (let c = 0; c < clicks; c++) {
    for (let i = 0; i < 21; i++) out.push({ peak: i < len ? 0.4 - i * 0.05 : 0.001 });
  }
  return out;
}

// A centre trace at 60 frames a second: `rest` everywhere, `fill` for 6 frames on each count-in, `ring` for 6
// frames on each ring, 20 resting frames between stimuli, and a few frames of the next scene at the end.
function pulseTrace({ fills = 4, rings = 24, rest = 286, fill = 1256, ring = 358, tailBelow = 6 } = {}) {
  const trace = [];
  let t = 0;
  const push = (s, n) => { for (let i = 0; i < n; i++) trace.push({ t: (t += 16.7), s }); };
  push(rest, 30);
  for (let i = 0; i < fills; i++) { push(rest + fill, 6); push(rest, 20); }
  for (let i = 0; i < rings; i++) { push(rest + ring, 6); push(rest, 20); }
  push(49, tailBelow);
  return trace;
}

// What the page showed after Escape before the first key (review R3, MINOR 5): nothing started.
const ESC = { started: false, scenes: ['calibration'] };

// The owner's ruling N-F1 c: the page's texts while the calibration is up and once it is left.
const texts = (...extra) => ({ title: PAGE_TITLE, texts: [...PAGE_TEXTS, ...extra].map((text) => ({ text, inside: false })) });
const LINES = { before: texts(CALIBRATION_TEXT), after: texts() };

// Review R4 (MAJOR 1): the starts a page records for the clicks of the pass-A attempts given. Each click is two voice
// starts on the calibration orbit (layer 0), the 'sbd' click's oscillator and its noise, handed over 0.11 s ahead, beside
// a timer's ConstantSourceNode, which is no voice; `shiftMs` moves every click off its mark.
function clickStarts(attempts, shiftMs = 0) {
  const out = [];
  for (const a of attempts || []) {
    if (a.pass !== 'A') continue;
    for (let i = 0; i < 24; i++) {
      const when = a.t0 + i * BEAT_S + shiftMs / 1000;
      const at = a.t0 + i * BEAT_S - 0.11;
      out.push({ type: 'OscillatorNode', when, at, origin: 0, layer: 0 }, { type: 'AudioBufferSourceNode', when, at, origin: 0, layer: 0 }, { type: 'ConstantSourceNode', when: at, at, origin: 0, layer: -1 });
    }
  }
  return out;
}
// The untouched run's two attempts, A1 and B1, as the probe watches them, and (review R5, MAJOR 1) the frames of a scene
// that drew them, which fill in pass B's frameTimes.
const UNTOUCHED = [{ pass: 'A', t0: 4, p0: null, frameTimes: null }, { pass: 'B', t0: null, p0: 15000, frameTimes: [] }];
const UNTOUCHED_DRAWN = drawnLog(UNTOUCHED);
const untouchedRun = { seconds: 21.6, samples: clickSamples(24), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC, lines: LINES };
const judgeC = (o) => judgeCalibration({ starts: clickStarts(UNTOUCHED), attempts: UNTOUCHED_DRAWN.attempts, frames: UNTOUCHED_DRAWN.log, ...untouchedRun, ...o });
const judgeT = (o) => judgeTapped({ starts: clickStarts(o.log && o.log.attempts), frames: framesOf(o.log && o.log.attempts), lines: LINES, ...o });

describe('calibration check (section 12)', () => {
  it('counts each click once, with hysteresis', () => {
    expect(countClicks(clickSamples(24))).toBe(24);
    expect(countClicks([{ peak: 0.06 }, { peak: 0.03 }, { peak: 0.06 }, { peak: 0.01 }, { peak: 0.06 }])).toBe(2);
    expect(countClicks([])).toBe(0);
  });

  it('splits pulses into fills and rings above the median frame', () => {
    const p = countPulses(pulseTrace());
    expect(p.rest).toBe(286);
    expect(p.fills).toBe(4);
    expect(p.rings).toBe(24);
    const noFill = countPulses(pulseTrace({ fills: 0 }));
    expect(noFill.fills).toBe(24);
    expect(noFill.rings).toBe(0);
    expect(countPulses(pulseTrace({ fills: 0, rings: 0 })).fills).toBe(0);
    expect(countPulses([]).rings).toBe(0);
  });

  it('passes an untouched run and names every gap', () => {
    const ok = judgeC({});
    expect(ok.problems).toEqual([]);
    const bad = judgeC({ seconds: 0.4, samples: [], trace: pulseTrace({ fills: 0, rings: 0 }), values: { avOffset: 12, inputBias: 0 } });
    expect(bad.problems.join(' | ')).toMatch(/left after 0\.4 s \(want at least 19\.7 s: A1 and B1/);
    expect(bad.problems.join(' | ')).toMatch(/clicks 0 \(want 20 to 28\)/);
    expect(bad.problems.join(' | ')).toMatch(/fills 0 \(want 3 to 5\)/);
    expect(bad.problems.join(' | ')).toMatch(/rings 0 \(want 20 to 28\)/);
    expect(bad.problems.join(' | ')).toMatch(/values/);
    expect(judgeC({ seconds: MIN_SECONDS - 0.1 }).problems).toHaveLength(1);
    expect(judgeC({ values: null }).problems).toHaveLength(1);
  });

  it('wants a count-in of 4 fills and 24 rings: 2 or 6 fills, 19 or 29 rings cannot pass', () => {
    for (const [fills, n] of [[2, 1], [3, 0], [5, 0], [6, 1]]) expect(judgeC({ trace: pulseTrace({ fills }) }).problems).toHaveLength(n);
    for (const [rings, n] of [[19, 1], [20, 0], [28, 0], [29, 1]]) expect(judgeC({ trace: pulseTrace({ rings }) }).problems).toHaveLength(n);
  });

  // The owner's ruling N-F1 c: A1, then B1 after its rejection, and no repeat of either.
  it('wants the untouched scene to run A1 then B1, and nothing else', () => {
    const say = (attempts) => judgeCalibration({ ...untouchedRun, starts: clickStarts(attempts), attempts: drawnLog(attempts).attempts, frames: drawnLog(attempts).log }).problems.join(' | ');
    expect(say([UNTOUCHED[0], { pass: 'A', t0: 15, p0: null, frameTimes: null }, { ...UNTOUCHED[1], p0: 26000 }])).toMatch(/calibration: the scene ran A, A, B \(want A1, then B1 after its rejection, and no repeat\)/);
    expect(say([UNTOUCHED[0]])).toMatch(/calibration: the scene ran A \(want A1, then B1/);
    expect(say([UNTOUCHED[0], UNTOUCHED[1], { pass: 'B', t0: null, p0: 26000, frameTimes: [] }])).toMatch(/the scene ran A, B, B/);
  });

  // Review R2 (MINOR 3 and MAJOR 4): a tapper's log of the tapped run, A1 alone, its taps aMs after clicks 4 to 23 in heard
  // time. Review R3 (MINOR 5 and 6): the count-in's clicks 0 to 3 are tapped too, and three Escapes are logged, unless
  // `countIn` or `escapes` is false; review R6 (MINOR 2): and three key repeats, unless `repeats` is false. `extra` taps
  // are appended.
  function tapLog(aMs = TAP_A_MS, { extra = [], countIn = true, escapes = true, repeats = true, t0 = 10 } = {}) {
    const taps = [];
    for (let i = countIn ? 0 : 4; i < 24; i++) taps.push({ attempt: 0, t: 0, h: t0 + i * BEAT_S + aMs / 1000 });
    return {
      taps: [...taps, ...extra],
      escapes: escapes ? [6, 10, 14].map((i) => ({ attempt: 0, t: 0, h: t0 + i * BEAT_S + 0.2 })) : [],
      repeats: repeats ? [8, 12, 16].map((i) => ({ attempt: 0, t: 0, h: t0 + i * BEAT_S + 0.2 })) : [],
      attempts: [{ pass: 'A', t0, p0: null, frameTimes: null }],
    };
  }
  // The fallback run's log (the owner's ruling N-F1 c): A1 untapped (its Escapes and repeats only), then B1 tapped bMs after
  // rings 4 to 23 drawn 5 ms after they were due, with pass B's count-in taps, Escapes and repeats; `jitterB` spreads its
  // taps both ways.
  function fallbackLog(bMs = TAP_B_MS, { jitterB = 0, extra = [], t0 = 10, p0 = 21000 } = {}) {
    const frameTimes = Array.from({ length: 24 }, (_, i) => p0 + i * BEAT_S * 1000 + 5);
    const taps = [];
    for (let i = 0; i < 24; i++) taps.push({ attempt: 1, t: frameTimes[i] + bMs + (i % 2 ? jitterB : -jitterB), h: 0 });
    const marks = (list, k) => list.map((i) => (k === 0 ? { attempt: 0, t: 0, h: t0 + i * BEAT_S + 0.2 } : { attempt: 1, t: frameTimes[i] + 200, h: 0 }));
    return {
      taps: [...taps, ...extra],
      escapes: [...marks([6, 10, 14], 0), ...marks([6, 10, 14], 1)],
      repeats: [...marks([8, 12, 16], 0), ...marks([8, 12, 16], 1)],
      attempts: [{ pass: 'A', t0, p0: null, frameTimes: null }, { pass: 'B', t0: null, p0, frameTimes }],
    };
  }
  const running = { scenes: ['play'], room: 1, from: 120, to: 264 };

  it('recomputes the values section 12 gives for the logged taps, by the one-pass rule (review R2, MINOR 3; the owner\'s ruling N-F1 c)', () => {
    const r = tapLogValues(tapLog());
    expect(r.values.avOffset).toBeCloseTo(0, 6);
    expect(r.values.inputBias).toBeCloseTo(TAP_A_MS, 6);
    expect(r.passes.A.map((p) => p.accepted)).toEqual([true]);
    expect(r.passes.B).toEqual([]);
    const f = tapLogValues(fallbackLog());
    expect(f.passes.A.map((p) => p.accepted)).toEqual([false]);
    expect(f.values.avOffset).toBeCloseTo(0, 6);
    expect(f.values.inputBias).toBeCloseTo(TAP_B_MS, 6);
    // A tap that landed between attempts is not the scene's: it changes nothing.
    const between = tapLogValues(tapLog(TAP_A_MS, { extra: [{ attempt: -1, t: 0, h: 999 }] }));
    expect(between.values).toEqual(r.values);
    // Review R8 (MINOR 4): a tap logged in an attempt after its end is not counted; one before its end is.
    const end = 10 + 23 * BEAT_S + BEAT_S / 2;
    expect(r.passes.A[0].taps).toBe(20);
    expect(tapLogValues(tapLog(TAP_A_MS, { extra: [0, 1, 2].map(() => ({ attempt: 0, t: 0, h: end + 0.001 })) })).passes.A[0].taps).toBe(20);
    expect(tapLogValues(tapLog(TAP_A_MS, { extra: [0, 1, 2].map(() => ({ attempt: 0, t: 0, h: end - 0.001 })) })).passes.A[0].taps).toBe(23);
    const pEnd = 21000 + (23 * BEAT_S + BEAT_S / 2) * 1000;
    expect(tapLogValues(fallbackLog(TAP_B_MS, { extra: [{ attempt: 1, t: pEnd + 1, h: 0 }] })).passes.B[0].taps).toBe(20);
    expect(tapLogValues(fallbackLog(TAP_B_MS, { extra: [{ attempt: 1, t: pEnd - 1, h: 0 }] })).passes.B[0].taps).toBe(21);
  });

  it('passes a tapped run whose values are its taps\' own and whose run starts, and names every gap', () => {
    const own = tapLogValues(tapLog()).values;
    expect(judgeT({ seconds: 11.2, values: own, log: tapLog(), handover: running }).problems).toEqual([]);
    // Taps that landed 6 ms late still judge a correct scene by its own taps.
    const late = tapLog(TAP_A_MS + 6);
    expect(judgeT({ seconds: 11.2, values: tapLogValues(late).values, log: late, handover: running }).problems).toEqual([]);
    // The two-pass rule's values for a lone pass A, and values 0.6 ms off.
    expect(judgeT({ seconds: 11.2, values: { avOffset: 40, inputBias: 0 }, log: tapLog(), handover: running }).problems.join(' | ')).toMatch(/tapped calibration values 40\.0 0\.0, the taps' own 0\.0 40\.0 \(want equal within 0\.5 ms\)/);
    expect(judgeT({ seconds: 11.2, values: { avOffset: own.avOffset, inputBias: own.inputBias + 0.6 }, log: tapLog(), handover: running }).problems).toHaveLength(1);
    expect(judgeT({ seconds: 11.2, values: tapLogValues(tapLog(TAP_A_MS + 20)).values, log: tapLog(TAP_A_MS + 20), handover: running }).problems.join(' | ')).toMatch(/the taps strayed from their marks, they give 0\.0 60\.0 \(want within 15 ms of 0 40\)/);
    const wild = tapLog(TAP_A_MS, { extra: Array.from({ length: 40 }, (_, i) => ({ attempt: 0, t: 0, h: 10 + (4 + (i % 20)) * BEAT_S + (i % 2 ? 0.15 : -0.15) })) });
    expect(judgeT({ seconds: 11.2, values: tapLogValues(wild).values, log: wild, handover: running }).problems.join(' | ')).toMatch(/the taps strayed, A1 judges MAD \d+\.\d on \d+ taps/);
    expect(judgeT({ seconds: 11.2, values: own, log: { taps: [], escapes: [], repeats: [], attempts: [] }, handover: running }).problems.join(' | ')).toMatch(/the tapper logged no attempt/);
    expect(judgeT({ seconds: 21.6, values: own, log: tapLog(), handover: running }).problems.join(' | ')).toMatch(/tapped calibration left after 21\.6 s \(want 10 to 15 s: A1 accepted, and no pass B\)/);
  });

  // The owner's ruling N-F1 c: pass B only after a rejected pass A.
  it('fails a tapped scene that runs pass B after an accepted A1, or repeats A', () => {
    const log = tapLog();
    const withB = { ...log, attempts: [...log.attempts, { pass: 'B', t0: null, p0: 21000, frameTimes: [] }] };
    const said = judgeT({ seconds: 21.6, values: tapLogValues(withB).values, log: withB, handover: running }).problems.join(' | ');
    expect(said).toMatch(/tapped calibration: the scene ran A, B with A1 accepted \(want A1 accepted, and no pass B: B only after a rejected A, no repeat\)/);
    const twice = { ...log, attempts: [...log.attempts, { pass: 'A', t0: 21, p0: null, frameTimes: null }] };
    expect(judgeT({ seconds: 21.6, values: tapLogValues(twice).values, log: twice, handover: running }).problems.join(' | ')).toMatch(/the scene ran A, A with A1 accepted/);
  });

  it('wants Escape pressed before the first key to start nothing (review R3, MINOR 5)', () => {
    const run = (escape) => judgeC({ escape }).problems.join(' | ');
    expect(run(ESC)).toBe('');
    expect(run({ started: true, scenes: ['calibration'] })).toMatch(/Escape started the audio or left the scene \(audio started/);
    expect(run({ started: false, scenes: ['play'] })).toMatch(/Escape started the audio or left the scene/);
    expect(run(undefined)).toMatch(/Escape was not pressed before the first key/);
  });

  it('ignores the count-in taps, the Escapes and the repeats when it recomputes the values, and wants the tapper to have landed them (review R3, MINOR 5 and 6; review R6, MINOR 2)', () => {
    const plain = tapLogValues(tapLog(TAP_A_MS, { countIn: false, escapes: false, repeats: false })).values;
    expect(tapLogValues(tapLog()).values).toEqual(plain);
    const own = tapLogValues(tapLog()).values;
    expect(judgeT({ seconds: 11.2, values: own, log: tapLog(), handover: running }).problems).toEqual([]);
    expect(judgeT({ seconds: 11.2, values: own, log: tapLog(TAP_A_MS, { countIn: false }), handover: running }).problems.join(' | ')).toMatch(/the tapper landed 20 taps \(0 in the count-in\), 3 Escapes and 3 repeats \(want 4 count-in taps, 3 Escapes and 3 repeats in every attempt\)/);
    expect(judgeT({ seconds: 11.2, values: own, log: tapLog(TAP_A_MS, { escapes: false }), handover: running }).problems.join(' | ')).toMatch(/the tapper landed 24 taps \(4 in the count-in\), 0 Escapes and 3 repeats/);
    expect(judgeT({ seconds: 11.2, values: own, log: tapLog(TAP_A_MS, { repeats: false }), handover: running }).problems.join(' | ')).toMatch(/the tapper landed 24 taps \(4 in the count-in\), 3 Escapes and 0 repeats/);
  });

  // The owner's ruling N-F1 c: the fallback run, A1 untapped and rejected, B1 tapped and accepted.
  it('passes a fallback run judged by B1, and fails a scene that skips B, keeps A or takes the two-pass rule', () => {
    const own = tapLogValues(fallbackLog()).values;
    expect(own.avOffset).toBeCloseTo(0, 6);
    expect(own.inputBias).toBeCloseTo(TAP_B_MS, 6);
    const ok = judgeT({ seconds: 21.6, values: own, log: fallbackLog(), handover: running, fallback: true });
    expect(ok.problems).toEqual([]);
    expect(ok.marks).toEqual({ avOffset: 0, inputBias: TAP_B_MS + TAP_B_MID });
    // The two-pass rule's values for a lone pass B.
    expect(judgeT({ seconds: 21.6, values: { avOffset: -25, inputBias: 25 }, log: fallbackLog(), handover: running, fallback: true }).problems.join(' | ')).toMatch(/fallback calibration values -25\.0 25\.0, the taps' own 0\.0 25\.0 \(want equal within 0\.5 ms\)/);
    // A scene that never runs pass B after a rejected A1.
    const noB = { ...fallbackLog(), attempts: fallbackLog().attempts.slice(0, 1) };
    expect(judgeT({ seconds: 11.2, values: { avOffset: 0, inputBias: 0 }, log: noB, handover: running, fallback: true }).problems.join(' | ')).toMatch(/fallback calibration left after 11\.2 s \(want 19\.7 to 30 s.*the scene ran A with A1 rejected \(want A1 rejected untapped, then B1/);
    // A tapper that tapped A1: nothing fell back.
    expect(judgeT({ seconds: 11.2, values: tapLogValues(tapLog()).values, log: tapLog(), handover: running, fallback: true }).problems.join(' | ')).toMatch(/the scene ran A with A1 accepted \(want A1 rejected untapped, then B1/);
    // A tap that landed in A1.
    const stray = fallbackLog();
    stray.taps.push({ attempt: 0, t: 0, h: 10 + 6 * BEAT_S + 0.04 });
    expect(judgeT({ seconds: 21.6, values: tapLogValues(stray).values, log: stray, handover: running, fallback: true }).problems.join(' | ')).toMatch(/the tapper landed 1 taps \(0 in the count-in\), 3 Escapes and 3 repeats; 24 taps/);
    // B1's taps too wild to accept.
    const wild = fallbackLog(TAP_B_MS, { jitterB: 60 });
    expect(judgeT({ seconds: 21.6, values: tapLogValues(wild).values, log: wild, handover: running, fallback: true }).problems.join(' | ')).toMatch(/fallback calibration: the taps strayed, B1 judges MAD 60\.0 on 20 taps/);
  });

  it('wants a run at room 1 running after the tapped hand-over (review R2, MAJOR 4)', () => {
    const own = tapLogValues(tapLog()).values;
    const bad = [
      { scenes: ['calibration'], room: null, from: null, to: null },
      { scenes: ['play'], room: null, from: null, to: null },
      { scenes: ['play'], room: 2, from: 10, to: 90 },
      { scenes: ['play'], room: 1, from: 120, to: 120 },
      undefined,
    ];
    for (const handover of bad) expect(judgeT({ seconds: 11.2, values: own, log: tapLog(), handover }).problems.join(' | ')).toMatch(/no run at room 1 after the hand-over/);
  });

  // The owner's ruling N-F1 c: the page line, up while the calibration is and gone after the hand-over.
  it('wants the page line before the first key and gone after the hand-over', () => {
    expect(lineProblems(LINES, 'calibration')).toEqual([]);
    expect(lineProblems({ before: texts(), after: texts() }, 'calibration').join(' | ')).toMatch(/calibration line: before the first key: the calibration wants its one line "Press any key, then tap along with the beat to set your timing\.", found \[\]/);
    expect(lineProblems({ before: texts(CALIBRATION_TEXT), after: texts(CALIBRATION_TEXT) }, 'calibration').join(' | ')).toMatch(/calibration line: after the hand-over: extra page text \["Press any key/);
    expect(lineProblems({ before: texts('Press any key'), after: texts() }, 'calibration').join(' | ')).toMatch(/before the first key: the calibration wants its one line/);
    expect(lineProblems({ before: texts(CALIBRATION_TEXT, 'more'), after: texts() }, 'calibration').join(' | ')).toMatch(/before the first key: the calibration wants its one line .*found \["Press any key, then tap along with the beat to set your timing\.","more"\]/);
    expect(lineProblems(undefined, 'calibration').join(' | ')).toMatch(/the page texts were not read/);
    expect(judgeC({ lines: { before: texts(), after: texts() } }).problems.join(' | ')).toMatch(/^calibration line: before the first key/);
    const own = tapLogValues(tapLog()).values;
    expect(judgeT({ seconds: 11.2, values: own, log: tapLog(), handover: running, lines: { before: LINES.before, after: LINES.before } }).problems.join(' | ')).toMatch(/^tapped calibration line: after the hand-over/);
  });

  it('holds every click of every pass-A attempt to its mark, read from the recorded starts (review R4, MAJOR 1)', () => {
    const untouched = (starts, attempts = UNTOUCHED_DRAWN.attempts) => judgeC({ starts, attempts });
    const ok = untouched(clickStarts(UNTOUCHED));
    expect(ok.problems).toEqual([]);
    expect([ok.clickStarts, ok.clickMarks]).toEqual([24, 24]);
    // Within 1 ms passes; 1.5 ms off, early or late, and 100 ms late (the reviewer's mutant) each fail.
    expect(untouched(clickStarts(UNTOUCHED, 0.8)).problems).toEqual([]);
    expect(untouched(clickStarts(UNTOUCHED, -0.8)).problems).toEqual([]);
    expect(untouched(clickStarts(UNTOUCHED, 1.5)).problems.join(' | ')).toMatch(/calibration click starts: A1 has 0 of 24 clicks started on their marks and 48 off them \(the first \+1\.5 ms from its mark\)/);
    expect(untouched(clickStarts(UNTOUCHED, -1.5)).problems.join(' | ')).toMatch(/A1 has 0 of 24 clicks started on their marks and 48 off them \(the first -1\.5 ms/);
    expect(untouched(clickStarts(UNTOUCHED, 100)).problems.join(' | ')).toMatch(/A1 has 0 of 24 clicks started on their marks and 48 off them \(the first \+100\.0 ms from its mark\)/);
    // A click missing, a click doubled off its mark, and a click started at once (no voice: it was not scheduled).
    const some = clickStarts(UNTOUCHED).filter((s) => !(s.layer === 0 && Math.abs(s.when - (4 + 7 * BEAT_S)) < 1e-9));
    expect(untouched(some).problems.join(' | ')).toMatch(/A1 has 23 of 24 clicks started on their marks and 0 off them/);
    const extra = [...clickStarts(UNTOUCHED), { type: 'OscillatorNode', when: 4 + 5.5 * BEAT_S, at: 4 + 5.3 * BEAT_S, origin: 0, layer: 0 }];
    expect(untouched(extra).problems.join(' | ')).toMatch(/A1 has 24 of 24 clicks started on their marks and 1 off them/);
    const atOnce = clickStarts(UNTOUCHED).map((s) => ({ ...s, at: s.when }));
    expect(untouched(atOnce).problems.join(' | ')).toMatch(/A1 has 0 of 24 clicks/);
    // Clicks through a layer gate are not the calibration orbit's; a timer at a wrong time is no voice.
    expect(untouched(clickStarts(UNTOUCHED).map((s) => ({ ...s, layer: s.layer === 0 ? 1 : s.layer }))).problems.join(' | ')).toMatch(/A1 has 0 of 24/);
    expect(untouched([...clickStarts(UNTOUCHED), { type: 'ConstantSourceNode', when: 4.3, at: 4.2, origin: 0, layer: 0 }]).problems).toEqual([]);
    // No starts recorded.
    expect(untouched(undefined).problems.join(' | ')).toMatch(/calibration click starts: the probe recorded no start/);
    // The tapped and fallback runs hold their own attempts' clicks.
    const log = tapLog();
    const own = tapLogValues(log).values;
    const frames = framesOf(log.attempts);
    expect(judgeTapped({ seconds: 11.2, values: own, log, handover: running, starts: clickStarts(log.attempts), frames, lines: LINES }).problems).toEqual([]);
    expect(judgeTapped({ seconds: 11.2, values: own, log, handover: running, starts: clickStarts(log.attempts, 100), frames, lines: LINES }).problems.join(' | ')).toMatch(/tapped calibration click starts: A1 has 0 of 24 clicks started on their marks and 48 off them/);
    const f = fallbackLog();
    expect(judgeTapped({ seconds: 21.6, values: tapLogValues(f).values, log: f, handover: running, fallback: true, starts: clickStarts(f.attempts, 100), frames: framesOf(f.attempts), lines: LINES }).problems.join(' | ')).toMatch(/fallback calibration click starts: A1 has 0 of 24/);
    expect(judgeTapped({ seconds: 21.6, values: tapLogValues(f).values, log: f, handover: running, fallback: true, starts: [], frames: framesOf(f.attempts), lines: LINES }).problems.join(' | ')).toMatch(/fallback calibration click starts: A1 has 0 of 24 clicks started on their marks and 0 off them/);
  });

  // Review R5 (MAJOR 1): the pictures held to their windows, on the frames of a scene drawing UNTOUCHED's two attempts.
  const frameRun = (o = {}, attempts = UNTOUCHED, opts = { waiting: true }) => {
    const d = drawnLog(attempts, o);
    return { ...calibFrameProblems(d.log, d.attempts, 'calibration', opts), d };
  };
  const said = (r) => r.problems.join(' | ');

  it('passes a scene that draws section 12 frame for frame, at 60 and 30 frames a second, wherever in its bracket it reads the time (review R5, MAJOR 1)', () => {
    const ok = frameRun();
    expect(ok.problems).toEqual([]);
    expect(ok.judged).toBeGreaterThan(2 * 600);
    // 4 count-in sixteenths of about 6 frames, 24 rings of about 6 frames, the row in every attempt frame, and the
    // waiting key pressed about a quarter of the time.
    expect(ok.fills).toBeGreaterThanOrEqual(20);
    expect(ok.rings).toBeGreaterThanOrEqual(125);
    expect(ok.rows).toBeGreaterThan(2 * 600);
    expect(ok.waited).toBeGreaterThan(100);
    expect(ok.pressed).toBeGreaterThanOrEqual(20);
    expect(frameRun({ dt: 1000 / 30 }).problems).toEqual([]);
    // A 6 ms bracket read at its start or at its end: the frames it straddles a window's edge with are not judged.
    for (const o of [{ lo: 0, hi: 6 }, { lo: 6, hi: 0 }, { lo: 3, hi: 3 }]) {
      const r = frameRun(o);
      expect(r.problems).toEqual([]);
      expect(r.judged).toBeLessThan(ok.judged);
    }
  });

  it('fails the reviewer\'s three mutants: a ring 100 ms late, a fill 100 ms late, frameTimes 100 ms after their frames (review R5, MAJOR 1)', () => {
    expect(said(frameRun({ ringLateMs: 100 }))).toMatch(/calibration frames: B1: a frame \+\d+\.\d ms from ring 0's due time shows no ring \(want the ring for a sixteenth from each due time\)/);
    expect(said(frameRun({ ringLateMs: 100 }))).toMatch(/calibration frames: B1: a frame \+1\d\d\.\d ms from ring 0's due time shows the ring \(want it only for a sixteenth/);
    expect(said(frameRun({ fillLateS: 0.1 }))).toMatch(/calibration frames: A1: a frame heard \+\d+\.\d ms from count-in click 0 shows the key plain \(want it filled for a sixteenth from each count-in click\)/);
    expect(said(frameRun({ fillLateS: 0.1 }))).toMatch(/A1: a frame heard \+1\d\d\.\d ms from count-in click 0 shows the key filled/);
    expect(said(frameRun({ frameTimeLateMs: 100 }))).toMatch(/calibration frames: B1: frameTimes\[0\] is \+1\d\d\.\d ms from its due time, but the first frame that drew ring 0 ran [+-]\d+\.\d ms to [+-]\d+\.\d ms from it \(want that frame's frameMs\)/);
    expect(said(frameRun({ frameTimeLateMs: 100 }))).not.toMatch(/shows/);
  });

  it('fails a picture one frame off: a ring held a frame long, a fill a frame late, a frameTime 10 ms after its frame', () => {
    expect(said(frameRun({ ringLateMs: 17 }))).toMatch(/B1: a frame \+\d+\.\d ms from ring 0's due time shows no ring/);
    expect(said(frameRun({ fillLateS: 0.017 }))).toMatch(/A1: a frame heard \+\d+\.\d ms from count-in click 0 shows the key plain/);
    expect(said(frameRun({ frameTimeLateMs: 10 }))).toMatch(/B1: frameTimes\[0\] is \+[12]\d\.\d ms from its due time, but the first frame/);
    expect(said(frameRun({ frameTimeLateMs: -1 }))).toMatch(/B1: frameTimes\[0\] is/);
  });

  // The owner's ruling N-F1 c: the waiting key's press and the row, held to their marks.
  it('fails a waiting key never pressed or pressed off the beat, and a press anywhere else', () => {
    const none = frameRun({ noPress: true });
    expect(said(none)).toMatch(/calibration frames: a waiting frame \+\d+\.\d ms from a beat line shows the key plain \(want it pressed for a sixteenth from each beat line/);
    expect(said(none)).toMatch(/calibration frames: 0 waiting frames judged with the key pressed \(want at least 4\)/);
    expect(said(frameRun({ pressLateMs: 50 }))).toMatch(/a waiting frame \+\d+\.\d ms from a beat line shows the key (plain|pressed)/);
    expect(said(frameRun({ pressLateMs: 17 }))).toMatch(/a waiting frame/);
    const pressedInA = frameRun();
    pressedInA.d.log.frames.forEach((f) => { if (f.aPost === 0 && f.g[0] === 0) f.g = [4, f.g[1], f.g[2]]; });
    expect(said({ problems: calibFrameProblems(pressedInA.d.log, pressedInA.d.attempts, 'calibration').problems })).toMatch(/A1: a frame shows the key pressed \(want it pressed only while the scene waits/);
    // Too few waiting frames watched, when the log was meant to start before the first key.
    const short = frameRun({ wait: 10 });
    expect(said(short)).toMatch(/calibration frames: 10 waiting frames judged \(want at least 30 before the first attempt\)/);
    expect(frameRun({ wait: 10 }, UNTOUCHED, {}).problems).toEqual([]);
    expect([CALIB_MIN_WAIT_FRAMES, CALIB_MIN_PRESS_FRAMES]).toEqual([30, 4]);
  });

  it('fails a row that fills off its marks, a missing row, and a row outside an attempt', () => {
    expect(said(frameRun({ rowLateS: 0.1 }))).toMatch(/calibration frames: A1: a frame heard \+\d+\.\d ms from click 4 shows 0 dots filled \(want 1: a dot fills once its click has passed\)/);
    expect(said(frameRun({ rowLateS: 0.1 }))).toMatch(/B1: a frame \+\d+\.\d ms from ring 4 shows 0 dots filled \(want 1: a dot fills once its ring has passed\)/);
    expect(said(frameRun({ rowLateS: 0.017 }))).toMatch(/A1: a frame heard \+\d+\.\d ms from click 4 shows 0 dots filled/);
    expect(said(frameRun({ noRow: true }))).toMatch(/A1: a frame shows 0 rows \(want the row of 20 dots in every frame of an attempt\)/);
    const between = frameRun();
    const last = between.d.log.frames.findIndex((f) => f.aPre === 0 && f.aPost === -1);
    between.d.log.frames[last].g = [0, 2, 5];
    expect(said({ problems: calibFrameProblems(between.d.log, between.d.attempts, 'calibration').problems })).toMatch(/a frame drawn for no attempt shows the row/);
    const early = frameRun();
    early.d.log.frames[3].g = [0, 2, 5];
    expect(said({ problems: calibFrameProblems(early.d.log, early.d.attempts, 'calibration').problems })).toMatch(/a waiting frame shows the row \(want the key alone until the first attempt\)/);
    const dim = frameRun();
    dim.d.log.graphics[5 + 3].alpha = 0.5;
    expect(said({ problems: calibFrameProblems(dim.d.log, dim.d.attempts, 'calibration').problems })).toMatch(/a frame shows the row at alpha 0\.5/);
  });

  it('takes a Graphics of styles alone for nothing, and judges the scene\'s last frame for its end alone', () => {
    const ok = frameRun();
    expect(ok.d.log.frames.filter((f) => f.left)).toHaveLength(1);
    expect(ok.problems).toEqual([]);
    const styled = frameRun();
    styled.d.log.graphics[26].buffer = [6, 1, 0, 0, 7, 0, 0, 1];
    expect(said({ problems: calibFrameProblems(styled.d.log, styled.d.attempts, 'calibration', { waiting: true }).problems })).toMatch(/a frame shows a Graphics drawing what section 12 does not draw \(8 entries\)/);
  });

  // Review R8 (MINOR 4): each attempt held to its end.
  it('fails an attempt that ends a beat early or a beat late, or never ends in the log', () => {
    expect(said(frameRun({ endEarly: true }))).toMatch(/calibration frames: A1: the attempt ended in a frame heard -\d+\.\d ms from its end/);
    expect(said(frameRun({ endEarly: true }))).toMatch(/B1: the attempt ended in a frame -\d+\.\d ms from its end/);
    expect(said(frameRun({ endLate: true }))).toMatch(/calibration frames: A1: the attempt is still up in a frame heard \+\d+\.\d ms past its end/);
    expect(said(frameRun({ endLate: true }))).toMatch(/B1: the attempt is still up in a frame \+\d+\.\d ms past its end/);
    const cut = frameRun();
    cut.d.log.frames = cut.d.log.frames.filter((f) => !(f.aPre === 1 && f.aPost === -1));
    expect(said({ problems: calibFrameProblems(cut.d.log, cut.d.attempts, 'calibration').problems })).toMatch(/B1: no logged frame ends the attempt/);
  });

  it('fails a picture in the wrong pass, between attempts, or one section 12 does not draw', () => {
    expect(said(frameRun({ ringInA: true }))).toMatch(/calibration frames: A1: a frame shows the ring \(want no ring in pass A\)/);
    expect(said(frameRun({ fillInB: true }))).toMatch(/calibration frames: B1: a frame shows the key filled \(want it plain in pass B\)/);
    const between = frameRun();
    const last = between.d.log.frames.findIndex((f) => f.aPre === 0 && f.aPost === -1);
    between.d.log.frames[last].g = [0, 3, 2];
    expect(said({ problems: calibFrameProblems(between.d.log, between.d.attempts, 'calibration').problems })).toMatch(/a frame drawn for no attempt shows the ring/);
    const small = frameRun();
    small.d.log.graphics[3].buffer = encodeShapes([{ k: 'ring', x: 640, y: 360, r: 40, lw: 3, c: 0x7fd6ff, a: 1 }]);
    expect(calibFrameProblems(small.d.log, small.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows a Graphics drawing what section 12 does not draw/);
    const dim = frameRun();
    dim.d.log.graphics[3].alpha = 0.5;
    expect(calibFrameProblems(dim.d.log, dim.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows the ring at alpha 0\.5/);
    const hidden = frameRun();
    for (const n of [0, 1, 4]) hidden.d.log.graphics[n].visible = false;
    expect(calibFrameProblems(hidden.d.log, hidden.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows 0 key shapes \(want the key shape in every frame/);
    const keyless = frameRun();
    keyless.d.log.graphics[0].buffer = [];
    expect(calibFrameProblems(keyless.d.log, keyless.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows 0 key shapes/);
  });

  it('does not judge a picture whose window\'s edge lies in its frame\'s bracket, nor an attempt frame whose heard time could not be read', () => {
    // Fills flipped on frames that straddle a count-in edge, and rings flipped where a frame straddles a ring window's end.
    const r = frameRun({ lo: 3, hi: 3 });
    const fillAt = (a, h) => [0, 1, 2, 3].some((i) => h >= a.t0 + i * BEAT_S && h < a.t0 + i * BEAT_S + BEAT_S / 4);
    let flipped = 0;
    for (const f of r.d.log.frames) {
      const a = r.d.attempts[f.aPost];
      if (!a) continue;
      if (a.pass === 'A' && fillAt(a, f.hPre) !== fillAt(a, f.hPost)) { f.g = [f.g[0] === 1 ? 0 : 1, f.g[1], f.g[2]]; flipped += 1; }
      if (a.pass === 'B') {
        for (let i = 0; i < 24; i++) {
          const end = a.p0 + (i + 0.25) * BEAT_S * 1000;
          if (f.pre < end && f.post >= end) { f.g = [f.g[0], f.g[1] === 3 ? 2 : 3, f.g[2]]; flipped += 1; }
        }
      }
    }
    expect(flipped).toBeGreaterThan(4);
    expect(calibFrameProblems(r.d.log, r.d.attempts, 'calibration').problems).toEqual([]);
    // The heard time unreadable through A1's first two count-in clicks: the scene decides nothing there, whatever its
    // Graphics still hold.
    const dark = frameRun();
    const a1 = dark.d.attempts[0];
    for (const f of dark.d.log.frames) if (f.aPost === 0 && f.hPre < a1.t0 + 2 * BEAT_S) { f.hPost = null; f.g = [1, 3, 2]; }
    expect(calibFrameProblems(dark.d.log, dark.d.attempts, 'calibration').problems).toEqual([]);
  });

  it('holds each frameTime to the first frame that drew its ring', () => {
    const missing = frameRun();
    missing.d.attempts[1].frameTimes[5] = null;
    expect(calibFrameProblems(missing.d.log, missing.d.attempts, 'calibration').problems.join(' | ')).toMatch(/B1: frameTimes\[5\] is missing, but the first frame that drew ring 5 ran/);
    const second = frameRun();
    const b1 = second.d.attempts[1];
    const d7 = b1.p0 + 7 * BEAT_S * 1000;
    const drew = second.d.log.frames.filter((f) => f.aPost === 1 && f.post >= d7 && f.pre < d7 + BEAT_S * 250 && f.g[1] === 3);
    b1.frameTimes[7] = drew[1].pre + 0.1;
    expect(calibFrameProblems(second.d.log, second.d.attempts, 'calibration').problems.join(' | ')).toMatch(/B1: frameTimes\[7\] is \+\d+\.\d ms from its due time, but the first frame that drew ring 7 ran/);
    const undrawn = frameRun();
    const b = undrawn.d.attempts[1];
    const d9 = b.p0 + 9 * BEAT_S * 1000;
    for (const f of undrawn.d.log.frames) if (f.aPost === 1 && f.pre >= d9 - 1 && f.pre < d9 + BEAT_S * 250) f.g = [f.g[0], 2, f.g[2]];
    const u = calibFrameProblems(undrawn.d.log, undrawn.d.attempts, 'calibration').problems.join(' | ');
    expect(u).toMatch(/B1: a frame \+\d+\.\d ms from ring 9's due time shows no ring/);
    expect(u).toMatch(/B1: frameTimes\[9\] is \+\d+\.\d ms from its due time, but no frame drew ring 9/);
  });

  it('wants every attempt watched: no log, dropped frames, too few frames, no fill shown, a frame of an attempt the record lacks', () => {
    expect(calibFrameProblems(undefined, UNTOUCHED_DRAWN.attempts, 'calibration').problems).toEqual(['calibration frames: the probe logged no frame of the scene calibration']);
    expect(calibFrameProblems({ frames: [], graphics: [], dropped: 0 }, UNTOUCHED_DRAWN.attempts, 'calibration').problems).toHaveLength(1);
    expect(said({ problems: calibFrameProblems(UNTOUCHED_DRAWN.log, [], 'calibration').problems })).toMatch(/no attempt to hold the frames to/);
    expect(said({ problems: calibFrameProblems({ ...UNTOUCHED_DRAWN.log, dropped: 3 }, UNTOUCHED_DRAWN.attempts, 'calibration').problems })).toMatch(/the log dropped 3 frames/);
    const short = { ...UNTOUCHED_DRAWN.log, frames: UNTOUCHED_DRAWN.log.frames.filter((f) => f.aPost === 0).slice(0, 150) };
    expect(said({ problems: calibFrameProblems(short, UNTOUCHED_DRAWN.attempts, 'calibration').problems })).toMatch(new RegExp(`A1: 1[45]\\d frames judged \\(want at least ${CALIB_MIN_FRAMES}\\)`));
    const none = frameRun({ noFill: true });
    expect(said(none)).toMatch(/A1: a frame heard \+\d+\.\d ms from count-in click 0 shows the key plain/);
    expect(said(none)).toMatch(/A1: 0 frames judged with the key filled \(want at least 8\)/);
    expect(said({ problems: calibFrameProblems(UNTOUCHED_DRAWN.log, UNTOUCHED_DRAWN.attempts.slice(0, 1), 'calibration').problems })).toMatch(/a frame names attempt 1, which the record lacks/);
  });

  it('puts the frames in the untouched, tapped and fallback verdicts (review R5, MAJOR 1)', () => {
    const late = drawnLog(UNTOUCHED, { ringLateMs: 100 });
    expect(judgeC({ attempts: late.attempts, frames: late.log }).problems.join(' | ')).toMatch(/^calibration frames: B1: /);
    const ok = judgeC({});
    expect([ok.timed > 1000, ok.timedFills >= 20, ok.timedRings >= 125, ok.timedRows > 1000, ok.timedWaiting > 100, ok.timedPressed >= 20]).toEqual([true, true, true, true, true, true]);
    // The untouched run wants its waiting frames; a log that starts at the first attempt cannot pass it.
    const unwatched = drawnLog(UNTOUCHED, { wait: 0 });
    expect(judgeC({ attempts: unwatched.attempts, frames: unwatched.log }).problems.join(' | ')).toMatch(/calibration frames: 0 waiting frames judged/);
    const log = tapLog();
    const own = tapLogValues(log).values;
    const wrong = drawnLog(log.attempts, { noRow: true });
    expect(judgeT({ seconds: 11.2, values: own, log, handover: running, frames: wrong.log }).problems.join(' | ')).toMatch(/tapped calibration frames: A1: a frame shows 0 rows/);
    const f = fallbackLog();
    expect(judgeT({ seconds: 21.6, values: tapLogValues(f).values, log: f, handover: running, fallback: true }).problems).toEqual([]);
    expect(judgeT({ seconds: 21.6, values: tapLogValues(f).values, log: f, handover: running, fallback: true, frames: undefined }).problems.join(' | ')).toMatch(/fallback calibration frames: the probe logged no frame/);
  });

  it('sums the centre box of a canvas crop in canvas px', () => {
    const w = 640;
    const h = 360;
    const rgba = new Uint8Array(w * h * 4);
    const white = (x, y) => { const o = (y * w + x) * 4; rgba[o] = 255; rgba[o + 1] = 255; rgba[o + 2] = 255; rgba[o + 3] = 255; };
    white(320, 180);
    white(10, 10);
    expect(centreSum(rgba, w, h)).toBeCloseTo(4, 5);
  });
});
