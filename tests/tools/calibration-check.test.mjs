// The calibration check's arithmetic (tools/calibration-check.mjs) on synthetic traces: clicks counted once per
// rising edge, pulses split into fills and rings by their peak, the resting level taken from the median frame,
// and the verdict's every rule. Review R5 (MAJOR 1): and the pictures' time, on synthetic frame logs of a scene drawing
// section 12 frame by frame. The browser side is controlled in tests/controls/calibration-probe.test.mjs.
import { describe, expect, it } from 'vitest';
import { BEAT_S, CALIB_DRAW, CALIB_MIN_FRAMES, calibFrameProblems, centreSum, countClicks, countPulses, judgeCalibration, judgeTapped, MIN_SECONDS, TAP_A_MS, TAP_B_MS, tapLogValues } from '../../tools/calibration-check.mjs';
import { encodeShapes } from '../../tools/scene-check.mjs';

// Review R5 (MAJOR 1): the frame log of a scene that draws section 12's pictures for `attempts` in order, as src/probe/api.ts
// logs it (calibLogTake). A frame every `dt` ms: the scene reads its frameMs at t, inside the bracket [t - lo, t + hi]
// between the probe's prestep and poststep, and the heard time is the performance time (a clock line of offset 0). A few
// frames before the first attempt draw for none. An attempt begins on the frame after the one before it ended, or LEAD and
// a little latency before its first mark; its last frame draws for none. Pass B's first frame in each ring window sits on its
// frameTimes[i] when the attempt gives all 24, and otherwise frameTimes is filled in from the frames. The faults move one
// picture: the ring ringLateMs after its window, the fills fillLateS after their clicks, frameTimes frameTimeLateMs after
// the frame, the ring shown with each fill (ringInA), the key filled with each ring (fillInB), no fill at all (noFill).
// Returns { log, attempts }: copies of the attempts, frameTimes filled in. Graphics: 0 the plain key, 1 the filled key,
// 2 nothing, 3 the ring.
function drawnLog(attempts, o = {}) {
  const { dt = 1000 / 60, lo = 0.1, hi = 0.2, settle = 20, ringLateMs = 0, fillLateS = 0, frameTimeLateMs = 0, ringInA = false, fillInB = false, noFill = false } = o;
  const S = BEAT_S / 4;
  const list = (attempts || []).map((a) => ({ ...a, frameTimes: Array.isArray(a.frameTimes) ? [...a.frameTimes] : a.frameTimes }));
  const frames = [];
  const push = (t, aPre, aPost, key, ring) => frames.push({ pre: t - lo, post: t + hi, hPre: (t - lo) / 1000, hPost: (t + hi) / 1000, aPre, aPost, g: [key, ring ? 3 : 2] });
  const startOf = (a) => (a.pass === 'A' ? (a.t0 - 0.52) * 1000 : a.p0 - 500);
  let t = list.length ? startOf(list[0]) - settle * dt : 0;
  for (let n = 0; n < settle; n++, t += dt) push(t, -1, -1, 0, false);
  list.forEach((a, k) => {
    t = Math.max(t, startOf(a));
    let aPre = -1;
    if (a.pass === 'A') {
      for (; t / 1000 < a.t0 + 23 * BEAT_S + BEAT_S / 2; t += dt) {
        const h = t / 1000;
        let fill = false;
        for (let i = 0; i < 4; i++) if (h >= a.t0 + i * BEAT_S + fillLateS && h < a.t0 + i * BEAT_S + fillLateS + S) fill = true;
        if (noFill) fill = false;
        push(t, aPre, k, fill ? 1 : 0, ringInA && fill);
        aPre = k;
      }
    } else {
      const given = Array.isArray(a.frameTimes) && a.frameTimes.length === 24 && a.frameTimes.every((v) => typeof v === 'number');
      const forced = given ? [...a.frameTimes] : null;
      if (!given) a.frameTimes = [];
      let next = 0;
      for (; t < a.p0 + (23 * BEAT_S + BEAT_S / 2) * 1000; t += dt) {
        if (forced && next < 24 && t >= a.p0 + next * BEAT_S * 1000) t = forced[next++];
        let w = -1;
        let shown = false;
        for (let i = 0; i < 24; i++) {
          const d = a.p0 + i * BEAT_S * 1000;
          if (t >= d && t < d + S * 1000) w = i;
          if (t >= d + ringLateMs && t < d + ringLateMs + S * 1000) shown = true;
        }
        if (!given && w >= 0 && a.frameTimes[w] === undefined) a.frameTimes[w] = t + frameTimeLateMs;
        push(t, aPre, k, fillInB && shown ? 1 : 0, shown);
        aPre = k;
      }
      if (!given) a.frameTimes = Array.from({ length: 24 }, (_, i) => (typeof a.frameTimes[i] === 'number' ? a.frameTimes[i] : null));
    }
    push(t, k, -1, 0, false);
    t += dt;
  });
  const graphics = [CALIB_DRAW.keyPlain, CALIB_DRAW.keyFilled, [], CALIB_DRAW.ring].map((b) => ({ depth: 0, visible: true, alpha: 1, buffer: [...b] }));
  return { log: { frames, graphics, dropped: 0 }, attempts: list };
}
const framesOf = (attempts) => drawnLog(attempts).log;

// One analyser sample every 20 ms over `beats` beats with a click of `len` samples on each beat.
function clickSamples(clicks, len = 4) {
  const out = [];
  for (let c = 0; c < clicks; c++) {
    for (let i = 0; i < 21; i++) out.push({ peak: i < len ? 0.4 - i * 0.05 : 0.001 });
  }
  return out;
}

// A centre trace at 60 frames a second: `rest` everywhere, `fill` for 6 frames on each count-in, `ring` for 6
// frames on each ring, 20 resting frames between stimuli, and a few frames of the next scene at the end.
function pulseTrace({ fills = 8, rings = 48, rest = 286, fill = 1256, ring = 358, tailBelow = 6 } = {}) {
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
// The untouched run's four attempts, A1, A2, B1 and B2, as the probe watches them, and (review R5, MAJOR 1) the frames of a
// scene that drew them, which fill in pass B's frameTimes.
const UNTOUCHED = [{ pass: 'A', t0: 2, p0: null, frameTimes: null }, { pass: 'A', t0: 13, p0: null, frameTimes: null }, { pass: 'B', t0: null, p0: 24000, frameTimes: [] }, { pass: 'B', t0: null, p0: 35000, frameTimes: [] }];
const UNTOUCHED_DRAWN = drawnLog(UNTOUCHED);
const judgeC = (o) => judgeCalibration({ starts: clickStarts(UNTOUCHED), attempts: UNTOUCHED_DRAWN.attempts, frames: UNTOUCHED_DRAWN.log, ...o });
const judgeT = (o) => judgeTapped({ starts: clickStarts(o.log && o.log.attempts), frames: framesOf(o.log && o.log.attempts), ...o });

describe('calibration check (section 12)', () => {
  it('counts each click once, with hysteresis', () => {
    expect(countClicks(clickSamples(48))).toBe(48);
    expect(countClicks([{ peak: 0.06 }, { peak: 0.03 }, { peak: 0.06 }, { peak: 0.01 }, { peak: 0.06 }])).toBe(2);
    expect(countClicks([])).toBe(0);
  });

  it('splits pulses into fills and rings above the median frame', () => {
    const p = countPulses(pulseTrace());
    expect(p.rest).toBe(286);
    expect(p.fills).toBe(8);
    expect(p.rings).toBe(48);
    const noFill = countPulses(pulseTrace({ fills: 0 }));
    expect(noFill.fills).toBe(48);
    expect(noFill.rings).toBe(0);
    expect(countPulses(pulseTrace({ fills: 0, rings: 0 })).fills).toBe(0);
    expect(countPulses([]).rings).toBe(0);
  });

  it('passes an untouched run and names every gap', () => {
    const ok = judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC });
    expect(ok.problems).toEqual([]);
    const bad = judgeC({ seconds: 0.4, samples: [], trace: pulseTrace({ fills: 0, rings: 0 }), values: { avOffset: 12, inputBias: 0 }, escape: ESC });
    expect(bad.problems.join(' | ')).toMatch(/left after 0\.4 s/);
    expect(bad.problems.join(' | ')).toMatch(/clicks 0 \(want 44 to 52\)/);
    expect(bad.problems.join(' | ')).toMatch(/fills 0 \(want 7 to 9\)/);
    expect(bad.problems.join(' | ')).toMatch(/rings 0 \(want 44 to 52\)/);
    expect(bad.problems.join(' | ')).toMatch(/values/);
    expect(judgeC({ seconds: MIN_SECONDS - 0.1, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC }).problems).toHaveLength(1);
    expect(judgeC({ seconds: 42, samples: clickSamples(48), trace: pulseTrace(), values: null, escape: ESC }).problems).toHaveLength(1);
  });

  it('wants a count-in of 4 fills per pass A attempt: 6 or 10 fills cannot pass (review R1, MAJOR 2)', () => {
    for (const [fills, n] of [[6, 1], [7, 0], [9, 0], [10, 1]]) {
      expect(judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace({ fills }), values: { avOffset: 0, inputBias: 0 }, escape: ESC }).problems).toHaveLength(n);
    }
  });

  // Review R2 (MINOR 3 and MAJOR 4): a tapper's log of one attempt of each pass, pass A's taps aMs after clicks 4 to
  // 23 in heard time, pass B's bMs after rings 4 to 23 drawn 5 ms after they were due; `extra` taps are appended.
  // Review R3 (MINOR 5 and 6): the count-in's clicks and rings 0 to 3 are tapped too, and three Escapes are logged in
  // each attempt, unless `countIn` or `escapes` is false.
  function tapLog(aMs = TAP_A_MS, bMs = TAP_B_MS, { jitterB = 0, extra = [], countIn = true, escapes = true, p0 = 30000 } = {}) {
    const t0 = 10;
    const frameTimes = Array.from({ length: 24 }, (_, i) => p0 + i * BEAT_S * 1000 + 5);
    const taps = [];
    for (let i = countIn ? 0 : 4; i < 24; i++) taps.push({ attempt: 0, t: 0, h: t0 + i * BEAT_S + aMs / 1000 });
    for (let i = countIn ? 0 : 4; i < 24; i++) taps.push({ attempt: 1, t: frameTimes[i] + bMs + (i % 2 ? jitterB : -jitterB), h: 0 });
    const esc = escapes ? [6, 10, 14].flatMap((i) => [{ attempt: 0, t: 0, h: t0 + i * BEAT_S + 0.2 }, { attempt: 1, t: frameTimes[i] + 200, h: 0 }]) : [];
    return { taps: [...taps, ...extra], escapes: esc, attempts: [{ pass: 'A', t0, p0: null, frameTimes: null }, { pass: 'B', t0: null, p0, frameTimes }] };
  }
  const running = { scenes: ['play'], room: 1, from: 120, to: 264 };

  it('recomputes the values section 12 gives for the logged taps (review R2, MINOR 3)', () => {
    const r = tapLogValues(tapLog());
    expect(r.values.avOffset).toBeCloseTo(TAP_A_MS - TAP_B_MS, 6);
    expect(r.values.inputBias).toBeCloseTo(TAP_B_MS, 6);
    expect(r.passes.A.map((p) => p.accepted)).toEqual([true]);
    // A tap that landed between attempts is not the scene's: it changes nothing.
    const between = tapLogValues(tapLog(TAP_A_MS, TAP_B_MS, { extra: [{ attempt: -1, t: 0, h: 999 }] }));
    expect(between.values).toEqual(r.values);
  });

  it('passes a tapped run whose values are its taps\' own and whose run starts, and names every gap', () => {
    const own = tapLogValues(tapLog()).values;
    expect(judgeT({ seconds: 21.6, values: own, log: tapLog(), handover: running }).problems).toEqual([]);
    // Taps that landed 6 ms late still judge a correct scene by its own taps.
    const late = tapLog(TAP_A_MS + 6, TAP_B_MS + 6);
    expect(judgeT({ seconds: 21.6, values: tapLogValues(late).values, log: late, handover: running }).problems).toEqual([]);
    expect(judgeT({ seconds: 21.6, values: { avOffset: -65, inputBias: 25 }, log: tapLog(), handover: running }).problems.join(' | ')).toMatch(/tapped calibration values -65\.0 25\.0, the taps' own 15\.0 25\.0 \(want equal within 0\.5 ms\)/);
    expect(judgeT({ seconds: 21.6, values: { avOffset: own.avOffset + 0.6, inputBias: own.inputBias }, log: tapLog(), handover: running }).problems).toHaveLength(1);
    expect(judgeT({ seconds: 21.6, values: tapLogValues(tapLog(TAP_A_MS + 20)).values, log: tapLog(TAP_A_MS + 20), handover: running }).problems.join(' | ')).toMatch(/the taps strayed from their marks, they give 35\.0 25\.0/);
    expect(judgeT({ seconds: 21.6, values: own, log: tapLog(TAP_A_MS, TAP_B_MS, { jitterB: 60 }), handover: running }).problems.join(' | ')).toMatch(/the taps strayed, the first attempts judge A MAD 0\.0 on 20 taps, B MAD 60\.0 on 20 taps/);
    expect(judgeT({ seconds: 21.6, values: own, log: { taps: [], attempts: [] }, handover: running }).problems.join(' | ')).toMatch(/the tapper logged no attempt/);
    expect(judgeT({ seconds: 43.1, values: own, log: tapLog(), handover: running }).problems.join(' | ')).toMatch(/left after 43\.1 s/);
  });

  it('wants Escape pressed before the first key to start nothing (review R3, MINOR 5)', () => {
    const run = (escape) => judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape }).problems.join(' | ');
    expect(run(ESC)).toBe('');
    expect(run({ started: true, scenes: ['calibration'] })).toMatch(/Escape started the audio or left the scene \(audio started/);
    expect(run({ started: false, scenes: ['play'] })).toMatch(/Escape started the audio or left the scene/);
    expect(run(undefined)).toMatch(/Escape was not pressed before the first key/);
  });

  it('ignores the count-in taps and the Escapes when it recomputes the values, and wants the tapper to have landed them (review R3, MINOR 5 and 6)', () => {
    const plain = tapLogValues(tapLog(TAP_A_MS, TAP_B_MS, { countIn: false, escapes: false })).values;
    expect(tapLogValues(tapLog()).values).toEqual(plain);
    const own = tapLogValues(tapLog()).values;
    expect(judgeT({ seconds: 21.6, values: own, log: tapLog(), handover: running }).problems).toEqual([]);
    expect(judgeT({ seconds: 21.6, values: own, log: tapLog(TAP_A_MS, TAP_B_MS, { countIn: false }), handover: running }).problems.join(' | ')).toMatch(/the tapper landed 0 count-in taps and 3 Escapes, 0 count-in taps and 3 Escapes \(want 4 and 3 in every attempt\)/);
    expect(judgeT({ seconds: 21.6, values: own, log: tapLog(TAP_A_MS, TAP_B_MS, { escapes: false }), handover: running }).problems.join(' | ')).toMatch(/the tapper landed 4 count-in taps and 0 Escapes/);
  });

  // Review R4 (MAJOR 2): a retried run's log, A1, A2, B1, B2: the first attempt of each pass untapped (its three Escapes
  // only), the repeats tapped as tapLog's two attempts.
  function retryLog(aMs = TAP_A_MS, bMs = TAP_B_MS) {
    // Each attempt ends before the next begins, as a scene runs them (review R4 and R5, MAJOR 1): A1 before A2 (t0 10), A2
    // before B1 (p0 21000), B1 before B2 (p0 32000).
    const one = tapLog(aMs, bMs, { p0: 32000 });
    const t0 = -0.5;
    const p0 = 21000;
    const frameTimes = Array.from({ length: 24 }, (_, i) => p0 + i * BEAT_S * 1000 + 5);
    const moved = (k) => (k === 0 ? 1 : 3);
    return {
      taps: one.taps.map((t) => ({ ...t, attempt: moved(t.attempt) })),
      escapes: [
        ...[6, 10, 14].flatMap((i) => [{ attempt: 0, t: 0, h: t0 + i * BEAT_S + 0.2 }, { attempt: 2, t: frameTimes[i] + 200, h: 0 }]),
        ...one.escapes.map((t) => ({ ...t, attempt: moved(t.attempt) })),
      ],
      attempts: [{ pass: 'A', t0, p0: null, frameTimes: null }, one.attempts[0], { pass: 'B', t0: null, p0, frameTimes }, one.attempts[1]],
    };
  }

  it('passes a retried run judged by its repeats, and fails a scene that keeps the first result or never repeats (review R4, MAJOR 2)', () => {
    const own = tapLogValues(retryLog()).values;
    expect(own.avOffset).toBeCloseTo(TAP_A_MS - TAP_B_MS, 6);
    expect(judgeT({ seconds: 42.6, values: own, log: retryLog(), handover: running, retry: true }).problems).toEqual([]);
    // A scene that keeps each pass's first (rejected) result: 0 and 0.
    expect(judgeT({ seconds: 42.6, values: { avOffset: 0, inputBias: 0 }, log: retryLog(), handover: running, retry: true }).problems.join(' | ')).toMatch(/retried calibration values 0\.0 0\.0, the taps' own 15\.0 25\.0 \(want equal within 0\.5 ms\)/);
    // A scene that never repeats a rejected pass: two attempts and out.
    const once = { ...retryLog(), attempts: retryLog().attempts.filter((_, k) => k === 0 || k === 2) };
    expect(judgeT({ seconds: 21.6, values: { avOffset: 0, inputBias: 0 }, log: once, handover: running, retry: true }).problems.join(' | ')).toMatch(/retried calibration left after 21\.6 s \(want 39\.4 to 50 s.*the scene ran A, B with the first attempts A rejected, B rejected/);
    // A tapper that tapped the first attempts: nothing was retried.
    expect(judgeT({ seconds: 21.6, values: tapLogValues(tapLog()).values, log: tapLog(), handover: running, retry: true }).problems.join(' | ')).toMatch(/the first attempts A accepted, B accepted \(want A1 and B1 rejected untapped/);
    // A tap that landed in a first attempt.
    const stray = retryLog();
    stray.taps.push({ attempt: 0, t: 0, h: -0.5 + 6 * BEAT_S + 0.04 });
    expect(judgeT({ seconds: 42.6, values: tapLogValues(stray).values, log: stray, handover: running, retry: true }).problems.join(' | ')).toMatch(/the tapper landed 1 taps \(0 in the count-in\) and 3 Escapes/);
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
    for (const handover of bad) expect(judgeT({ seconds: 21.6, values: own, log: tapLog(), handover }).problems.join(' | ')).toMatch(/no run at room 1 after the hand-over/);
  });

  it('holds every click of every pass-A attempt to its mark, read from the recorded starts (review R4, MAJOR 1)', () => {
    const untouched = (starts, attempts = UNTOUCHED_DRAWN.attempts) => judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC, starts, attempts });
    const ok = untouched(clickStarts(UNTOUCHED));
    expect(ok.problems).toEqual([]);
    expect([ok.clickStarts, ok.clickMarks]).toEqual([48, 48]);
    // Within 1 ms passes; 1.5 ms off, early or late, and 100 ms late (the reviewer's mutant) each fail.
    expect(untouched(clickStarts(UNTOUCHED, 0.8)).problems).toEqual([]);
    expect(untouched(clickStarts(UNTOUCHED, -0.8)).problems).toEqual([]);
    expect(untouched(clickStarts(UNTOUCHED, 1.5)).problems.join(' | ')).toMatch(/calibration click starts: A1 has 0 of 24 clicks started on their marks and 48 off them \(the first \+1\.5 ms from its mark\)/);
    expect(untouched(clickStarts(UNTOUCHED, -1.5)).problems.join(' | ')).toMatch(/A2 has 0 of 24 clicks started on their marks and 48 off them \(the first -1\.5 ms/);
    expect(untouched(clickStarts(UNTOUCHED, 100)).problems.join(' | ')).toMatch(/A1 has 0 of 24 clicks started on their marks and 48 off them \(the first \+100\.0 ms from its mark\)/);
    // A click missing, a click doubled off its mark, and a click started at once (no voice: it was not scheduled).
    const some = clickStarts(UNTOUCHED).filter((s) => !(s.layer === 0 && Math.abs(s.when - (2 + 7 * BEAT_S)) < 1e-9));
    expect(untouched(some).problems.join(' | ')).toMatch(/A1 has 23 of 24 clicks started on their marks and 0 off them/);
    const extra = [...clickStarts(UNTOUCHED), { type: 'OscillatorNode', when: 13 + 5.5 * BEAT_S, at: 13 + 5.3 * BEAT_S, origin: 0, layer: 0 }];
    expect(untouched(extra).problems.join(' | ')).toMatch(/A2 has 24 of 24 clicks started on their marks and 1 off them/);
    const atOnce = clickStarts(UNTOUCHED).map((s) => ({ ...s, at: s.when }));
    expect(untouched(atOnce).problems.join(' | ')).toMatch(/A1 has 0 of 24 clicks/);
    // Clicks through a layer gate are not the calibration orbit's; a timer at a wrong time is no voice.
    expect(untouched(clickStarts(UNTOUCHED).map((s) => ({ ...s, layer: s.layer === 0 ? 1 : s.layer }))).problems.join(' | ')).toMatch(/A1 has 0 of 24/);
    expect(untouched([...clickStarts(UNTOUCHED), { type: 'ConstantSourceNode', when: 2.3, at: 2.2, origin: 0, layer: 0 }]).problems).toEqual([]);
    // No starts recorded, no pass-A attempt watched.
    expect(untouched(undefined).problems.join(' | ')).toMatch(/calibration click starts: the probe recorded no start/);
    expect(untouched(clickStarts(UNTOUCHED), UNTOUCHED.filter((a) => a.pass === 'B')).problems.join(' | ')).toMatch(/calibration click starts: no pass-A attempt to hold the clicks to/);
    // The tapped and retried runs hold their own attempts' clicks.
    const log = tapLog();
    const own = tapLogValues(log).values;
    const frames = framesOf(log.attempts);
    expect(judgeTapped({ seconds: 21.6, values: own, log, handover: running, starts: clickStarts(log.attempts), frames }).problems).toEqual([]);
    expect(judgeTapped({ seconds: 21.6, values: own, log, handover: running, starts: clickStarts(log.attempts, 100), frames }).problems.join(' | ')).toMatch(/tapped calibration click starts: A1 has 0 of 24 clicks started on their marks and 48 off them/);
    const r = retryLog();
    const late2 = [...clickStarts([r.attempts[0]]), ...clickStarts([r.attempts[1]], 100)];
    expect(judgeTapped({ seconds: 42.6, values: tapLogValues(r).values, log: r, handover: running, retry: true, starts: late2, frames: framesOf(r.attempts) }).problems.join(' | ')).toMatch(/retried calibration click starts: A2 has 0 of 24/);
    expect(judgeTapped({ seconds: 42.6, values: tapLogValues(r).values, log: r, handover: running, retry: true, starts: late2, frames: framesOf(r.attempts) }).problems.join(' | ')).not.toMatch(/A1 has/);
  });

  // Review R5 (MAJOR 1): the pictures held to their windows, on the frames of a scene drawing UNTOUCHED's four attempts.
  const frameRun = (o = {}, attempts = UNTOUCHED) => {
    const d = drawnLog(attempts, o);
    return { ...calibFrameProblems(d.log, d.attempts, 'calibration'), d };
  };
  const said = (r) => r.problems.join(' | ');

  it('passes a scene that draws section 12 frame for frame, at 60 and 30 frames a second, wherever in its bracket it reads the time (review R5, MAJOR 1)', () => {
    const ok = frameRun();
    expect(ok.problems).toEqual([]);
    expect(ok.judged).toBeGreaterThan(4 * 600);
    // 8 count-in sixteenths of about 6 frames, and 48 rings of about 6 frames.
    expect(ok.fills).toBeGreaterThanOrEqual(40);
    expect(ok.rings).toBeGreaterThanOrEqual(250);
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

  it('fails a picture in the wrong pass, between attempts, or one section 12 does not draw', () => {
    expect(said(frameRun({ ringInA: true }))).toMatch(/calibration frames: A1: a frame shows the ring \(want no ring in pass A\)/);
    expect(said(frameRun({ fillInB: true }))).toMatch(/calibration frames: B1: a frame shows the key filled \(want it plain in pass B\)/);
    const between = frameRun();
    between.d.log.frames[0].g = [0, 3];
    expect(said({ problems: calibFrameProblems(between.d.log, between.d.attempts, 'calibration').problems })).toMatch(/a frame drawn for no attempt shows the ring/);
    const small = frameRun();
    small.d.log.graphics[3].buffer = encodeShapes([{ k: 'ring', x: 640, y: 360, r: 40, lw: 3, c: 0x7fd6ff, a: 1 }]);
    expect(calibFrameProblems(small.d.log, small.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows a Graphics drawing what section 12 does not draw/);
    const dim = frameRun();
    dim.d.log.graphics[3].alpha = 0.5;
    expect(calibFrameProblems(dim.d.log, dim.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows the ring at alpha 0\.5/);
    const hidden = frameRun();
    hidden.d.log.graphics[0].visible = false;
    hidden.d.log.graphics[1].visible = false;
    expect(calibFrameProblems(hidden.d.log, hidden.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows 0 key shapes \(want the key shape in every frame/);
    const keyless = frameRun();
    keyless.d.log.graphics[0].buffer = [];
    expect(calibFrameProblems(keyless.d.log, keyless.d.attempts, 'calibration').problems.join(' | ')).toMatch(/a frame shows 0 key shapes/);
  });

  it('does not judge a frame whose bracket holds a window\'s edge or whose heard time could not be read', () => {
    // Fills flipped on frames that straddle a count-in edge, and rings flipped where a frame straddles a ring window's end.
    const r = frameRun({ lo: 3, hi: 3 });
    const fillAt = (a, h) => [0, 1, 2, 3].some((i) => h >= a.t0 + i * BEAT_S && h < a.t0 + i * BEAT_S + BEAT_S / 4);
    let flipped = 0;
    for (const f of r.d.log.frames) {
      const a = r.d.attempts[f.aPost];
      if (!a) continue;
      if (a.pass === 'A' && fillAt(a, f.hPre) !== fillAt(a, f.hPost)) { f.g = [f.g[0] === 1 ? 0 : 1, f.g[1]]; flipped += 1; }
      if (a.pass === 'B') {
        for (let i = 0; i < 24; i++) {
          const end = a.p0 + (i + 0.25) * BEAT_S * 1000;
          if (f.pre < end && f.post >= end) { f.g = [f.g[0], f.g[1] === 3 ? 2 : 3]; flipped += 1; }
        }
      }
    }
    expect(flipped).toBeGreaterThan(4);
    expect(calibFrameProblems(r.d.log, r.d.attempts, 'calibration').problems).toEqual([]);
    // The heard time unreadable through A1's first two count-in clicks: the scene decides nothing there, whatever its
    // Graphics still hold.
    const dark = frameRun();
    const a1 = dark.d.attempts[0];
    for (const f of dark.d.log.frames) if (f.aPost === 0 && f.hPre < a1.t0 + 2 * BEAT_S) { f.hPost = null; f.g = [1, 3]; }
    expect(calibFrameProblems(dark.d.log, dark.d.attempts, 'calibration').problems).toEqual([]);
  });

  it('holds each frameTime to the first frame that drew its ring', () => {
    const missing = frameRun();
    missing.d.attempts[2].frameTimes[5] = null;
    expect(calibFrameProblems(missing.d.log, missing.d.attempts, 'calibration').problems.join(' | ')).toMatch(/B1: frameTimes\[5\] is missing, but the first frame that drew ring 5 ran/);
    const second = frameRun();
    const b1 = second.d.attempts[2];
    const d7 = b1.p0 + 7 * BEAT_S * 1000;
    const drew = second.d.log.frames.filter((f) => f.aPost === 2 && f.post >= d7 && f.pre < d7 + BEAT_S * 250 && f.g[1] === 3);
    b1.frameTimes[7] = drew[1].pre + 0.1;
    expect(calibFrameProblems(second.d.log, second.d.attempts, 'calibration').problems.join(' | ')).toMatch(/B1: frameTimes\[7\] is \+\d+\.\d ms from its due time, but the first frame that drew ring 7 ran/);
    const undrawn = frameRun();
    const b2 = undrawn.d.attempts[3];
    const d9 = b2.p0 + 9 * BEAT_S * 1000;
    for (const f of undrawn.d.log.frames) if (f.aPost === 3 && f.pre >= d9 - 1 && f.pre < d9 + BEAT_S * 250) f.g = [f.g[0], 2];
    const u = calibFrameProblems(undrawn.d.log, undrawn.d.attempts, 'calibration').problems.join(' | ');
    expect(u).toMatch(/B2: a frame \+\d+\.\d ms from ring 9's due time shows no ring/);
    expect(u).toMatch(/B2: frameTimes\[9\] is \+\d+\.\d ms from its due time, but no frame drew ring 9/);
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
    expect(said({ problems: calibFrameProblems(UNTOUCHED_DRAWN.log, UNTOUCHED_DRAWN.attempts.slice(0, 2), 'calibration').problems })).toMatch(/a frame names attempt 2, which the record lacks/);
  });

  it('puts the frames in the untouched, tapped and retried verdicts (review R5, MAJOR 1)', () => {
    const late = drawnLog(UNTOUCHED, { ringLateMs: 100 });
    expect(judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC, attempts: late.attempts, frames: late.log }).problems.join(' | ')).toMatch(/^calibration frames: B1: /);
    const ok = judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC });
    expect([ok.timed > 2000, ok.timedFills >= 40, ok.timedRings >= 250]).toEqual([true, true, true]);
    const log = tapLog();
    const own = tapLogValues(log).values;
    const wrong = drawnLog(log.attempts, { frameTimeLateMs: 0 });
    wrong.log.frames.forEach((f) => { if (f.aPost === 1) f.g = [f.g[0], 2]; });
    expect(judgeT({ seconds: 21.6, values: own, log, handover: running, frames: wrong.log }).problems.join(' | ')).toMatch(/tapped calibration frames: B1: /);
    const r = retryLog();
    expect(judgeT({ seconds: 42.6, values: tapLogValues(r).values, log: r, handover: running, retry: true }).problems).toEqual([]);
    expect(judgeT({ seconds: 42.6, values: tapLogValues(r).values, log: r, handover: running, retry: true, frames: undefined }).problems.join(' | ')).toMatch(/retried calibration frames: the probe logged no frame/);
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
