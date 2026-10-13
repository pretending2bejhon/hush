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
    const ok = judgeCalibration({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 } });
    expect(ok.problems).toEqual([]);
    const bad = judgeCalibration({ seconds: 0.4, samples: [], trace: pulseTrace({ fills: 0, rings: 0 }), values: { avOffset: 12, inputBias: 0 } });
    expect(bad.problems.join(' | ')).toMatch(/left after 0\.4 s/);
    expect(bad.problems.join(' | ')).toMatch(/clicks 0 \(want 44 to 52\)/);
    expect(bad.problems.join(' | ')).toMatch(/fills 0 \(want 7 to 9\)/);
    expect(bad.problems.join(' | ')).toMatch(/rings 0 \(want 44 to 52\)/);
    expect(bad.problems.join(' | ')).toMatch(/values/);
    expect(judgeCalibration({ seconds: MIN_SECONDS - 0.1, samples: clickSamples(48), trace: pulseTrace(), values: { avOffset: 0, inputBias: 0 } }).problems).toHaveLength(1);
    expect(judgeCalibration({ seconds: 42, samples: clickSamples(48), trace: pulseTrace(), values: null }).problems).toHaveLength(1);
  });

  it('wants a count-in of 4 fills per pass A attempt: 6 or 10 fills cannot pass (review R1, MAJOR 2)', () => {
    for (const [fills, n] of [[6, 1], [7, 0], [9, 0], [10, 1]]) {
      expect(judgeCalibration({ seconds: 42.3, samples: clickSamples(48), trace: pulseTrace({ fills }), values: { avOffset: 0, inputBias: 0 } }).problems).toHaveLength(n);
    }
  });

  // Review R2 (MINOR 3 and MAJOR 4): a tapper's log of one attempt of each pass, pass A's taps aMs after clicks 4 to
  // 23 in heard time, pass B's bMs after rings 4 to 23 drawn 5 ms after they were due; `extra` taps are appended.
  function tapLog(aMs = TAP_A_MS, bMs = TAP_B_MS, { jitterB = 0, extra = [] } = {}) {
    const t0 = 10;
    const p0 = 30000;
    const frameTimes = Array.from({ length: 24 }, (_, i) => p0 + i * BEAT_S * 1000 + 5);
    const taps = [];
    for (let i = 4; i < 24; i++) taps.push({ attempt: 0, t: 0, h: t0 + i * BEAT_S + aMs / 1000 });
    for (let i = 4; i < 24; i++) taps.push({ attempt: 1, t: frameTimes[i] + bMs + (i % 2 ? jitterB : -jitterB), h: 0 });
    return { taps: [...taps, ...extra], attempts: [{ pass: 'A', t0, p0: null, frameTimes: null }, { pass: 'B', t0: null, p0, frameTimes }] };
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
    expect(judgeTapped({ seconds: 21.6, values: own, log: tapLog(), handover: running }).problems).toEqual([]);
    // Taps that landed 6 ms late still judge a correct scene by its own taps.
    const late = tapLog(TAP_A_MS + 6, TAP_B_MS + 6);
    expect(judgeTapped({ seconds: 21.6, values: tapLogValues(late).values, log: late, handover: running }).problems).toEqual([]);
    expect(judgeTapped({ seconds: 21.6, values: { avOffset: -65, inputBias: 25 }, log: tapLog(), handover: running }).problems.join(' | ')).toMatch(/tapped calibration values -65\.0 25\.0, the taps' own 15\.0 25\.0 \(want equal within 0\.5 ms\)/);
    expect(judgeTapped({ seconds: 21.6, values: { avOffset: own.avOffset + 0.6, inputBias: own.inputBias }, log: tapLog(), handover: running }).problems).toHaveLength(1);
    expect(judgeTapped({ seconds: 21.6, values: tapLogValues(tapLog(TAP_A_MS + 20)).values, log: tapLog(TAP_A_MS + 20), handover: running }).problems.join(' | ')).toMatch(/the taps strayed from their marks, they give 35\.0 25\.0/);
    expect(judgeTapped({ seconds: 21.6, values: own, log: tapLog(TAP_A_MS, TAP_B_MS, { jitterB: 60 }), handover: running }).problems.join(' | ')).toMatch(/the taps strayed, the first attempts judge A MAD 0\.0 on 20 taps, B MAD 60\.0 on 20 taps/);
    expect(judgeTapped({ seconds: 21.6, values: own, log: { taps: [], attempts: [] }, handover: running }).problems.join(' | ')).toMatch(/the tapper logged no attempt/);
    expect(judgeTapped({ seconds: 43.1, values: own, log: tapLog(), handover: running }).problems.join(' | ')).toMatch(/left after 43\.1 s/);
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
    for (const handover of bad) expect(judgeTapped({ seconds: 21.6, values: own, log: tapLog(), handover }).problems.join(' | ')).toMatch(/no run at room 1 after the hand-over/);
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
