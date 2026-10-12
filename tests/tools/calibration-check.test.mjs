// The calibration check's arithmetic (tools/calibration-check.mjs) on synthetic traces: clicks counted once per
// rising edge, pulses split into fills and rings by their peak, the resting level taken from the median frame,
// and the verdict's every rule. The browser side is controlled in tests/controls/calibration-probe.test.mjs.
import { describe, expect, it } from 'vitest';
import { centreSum, countClicks, countPulses, judgeCalibration, judgeTapped, MIN_SECONDS, TAP_A_MS, TAP_B_MS } from '../../tools/calibration-check.mjs';

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

  it('passes a tapped run within 5 ms of the taps and names every gap (review R1, MAJOR 2)', () => {
    expect(judgeTapped({ seconds: 21.6, values: { avOffset: TAP_A_MS - TAP_B_MS + 4.9, inputBias: TAP_B_MS - 4.9 } }).problems).toEqual([]);
    expect(judgeTapped({ seconds: 21.6, values: { avOffset: -(TAP_A_MS + TAP_B_MS), inputBias: TAP_B_MS } }).problems.join(' | ')).toMatch(/tapped calibration values -65 25 \(want avOffset 15 and inputBias 25 within 5 ms\)/);
    expect(judgeTapped({ seconds: 21.6, values: { avOffset: 15, inputBias: 30.2 } }).problems).toHaveLength(1);
    expect(judgeTapped({ seconds: 43.1, values: { avOffset: 0, inputBias: 0 } }).problems).toHaveLength(2);
    expect(judgeTapped({ seconds: 21.6, values: null }).problems).toHaveLength(1);
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
