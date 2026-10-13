// The calibration check's arithmetic (tools/calibration-check.mjs) on synthetic traces: clicks counted once per
// rising edge, pulses split into fills and rings by their peak, the resting level taken from the median frame,
// and the verdict's every rule. The browser side is controlled in tests/controls/calibration-probe.test.mjs.
import { describe, expect, it } from 'vitest';
import { BEAT_S, centreSum, countClicks, countPulses, judgeCalibration, judgeTapped, MIN_SECONDS, TAP_A_MS, TAP_B_MS, tapLogValues } from '../../tools/calibration-check.mjs';

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
// The untouched run's four attempts, A1, A2, B1 and B2, as the probe watches them.
const UNTOUCHED = [{ pass: 'A', t0: 2, p0: null, frameTimes: null }, { pass: 'A', t0: 13, p0: null, frameTimes: null }, { pass: 'B', t0: null, p0: 24000, frameTimes: [] }, { pass: 'B', t0: null, p0: 35000, frameTimes: [] }];
const judgeC = (o) => judgeCalibration({ starts: clickStarts(UNTOUCHED), attempts: UNTOUCHED, ...o });
const judgeT = (o) => judgeTapped({ starts: clickStarts(o.log && o.log.attempts), ...o });

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
  function tapLog(aMs = TAP_A_MS, bMs = TAP_B_MS, { jitterB = 0, extra = [], countIn = true, escapes = true } = {}) {
    const t0 = 10;
    const p0 = 30000;
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
    const one = tapLog(aMs, bMs);
    // A1 ends before A2 (t0 10) begins, as a scene runs them: 23 beats, the tail and the lead apart (review R4, MAJOR 1).
    const t0 = -0.5;
    const p0 = 20000;
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
    const untouched = (starts, attempts = UNTOUCHED) => judgeC({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 }, escape: ESC, starts, attempts });
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
    expect(judgeTapped({ seconds: 21.6, values: own, log, handover: running, starts: clickStarts(log.attempts) }).problems).toEqual([]);
    expect(judgeTapped({ seconds: 21.6, values: own, log, handover: running, starts: clickStarts(log.attempts, 100) }).problems.join(' | ')).toMatch(/tapped calibration click starts: A1 has 0 of 24 clicks started on their marks and 48 off them/);
    const r = retryLog();
    const late2 = [...clickStarts([r.attempts[0]]), ...clickStarts([r.attempts[1]], 100)];
    expect(judgeTapped({ seconds: 42.6, values: tapLogValues(r).values, log: r, handover: running, retry: true, starts: late2 }).problems.join(' | ')).toMatch(/retried calibration click starts: A2 has 0 of 24/);
    expect(judgeTapped({ seconds: 42.6, values: tapLogValues(r).values, log: r, handover: running, retry: true, starts: late2 }).problems.join(' | ')).not.toMatch(/A1 has/);
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
