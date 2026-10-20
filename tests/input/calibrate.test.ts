// X8: the calibration math of HUSH-SPEC section 12 (src/input/calibrate.ts) with synthetic taps at known
// offsets. HUSH_CALIBRATE_MODULE points the same test at a fixture calibrator (the controls: the reference
// passes, a biased one and one that never rejects fail).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

interface PassResult { median: number; mad: number; taps: number; accepted: boolean }
interface Calibrator {
  judgePass(offsetsMs: number[]): PassResult;
  calibrate(a: PassResult, v: PassResult): { avOffset: number; inputBias: number };
}

const override = process.env.HUSH_CALIBRATE_MODULE;
const target = override ? pathToFileURL(path.resolve(override)).href : new URL('../../src/input/calibrate.ts', import.meta.url).href;
const mod = (await import(target)) as Calibrator;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// n taps around `centre` within +-spread ms, plus one wild tap on each side (the two the pass drops).
function taps(n: number, centre: number, spread: number, seed: number): number[] {
  const r = rng(seed);
  const out = Array.from({ length: n }, () => centre + (r() * 2 - 1) * spread);
  out.push(centre - 400, centre + 400);
  return out.sort(() => r() - 0.5);
}

describe('calibration (X8)', () => {
  it('returns avOffset and inputBias within 5 ms of the injected values', () => {
    let n = 0;
    for (const av of [-80, -25, 0, 30, 95]) {
      for (const bias of [0, 18, 45, 110]) {
        for (let seed = 1; seed <= 4; seed++) {
          const a = mod.judgePass(taps(24, av + bias, 4, seed * 101 + av));
          const v = mod.judgePass(taps(24, bias, 4, seed * 211 + bias));
          expect(a.accepted && v.accepted).toBe(true);
          const r = mod.calibrate(a, v);
          expect(Math.abs(r.avOffset - av)).toBeLessThanOrEqual(5);
          expect(Math.abs(r.inputBias - bias)).toBeLessThanOrEqual(5);
          n += 1;
        }
      }
    }
    expect(n).toBe(80);
  });

  it('rejects a run whose deviation is over 35 ms and keeps a steady one', () => {
    expect(mod.judgePass(taps(24, 40, 150, 9)).accepted).toBe(false);
    expect(mod.judgePass(taps(24, 40, 20, 9)).accepted).toBe(true);
    const spread = (d: number) => [-1000, ...Array<number>(5).fill(-d), ...Array<number>(5).fill(d), 1000];
    const over = mod.judgePass(spread(36));
    expect(over.mad).toBeCloseTo(36, 6);
    expect(over.accepted).toBe(false);
    const under = mod.judgePass(spread(34));
    expect(under.mad).toBeCloseTo(34, 6);
    expect(under.accepted).toBe(true);
  });

  // Review R6 (MINOR 1), carried as review R7's MINOR 6: X8's edge itself. A deviation of exactly 35 ms is kept, and one of
  // 35.5 ms is rejected.
  it('keeps a pass whose deviation is exactly 35 ms and rejects one of 35.5 ms', () => {
    const spread = (d: number) => [-1000, ...Array<number>(5).fill(-d), ...Array<number>(5).fill(d), 1000];
    const edge = mod.judgePass(spread(35));
    expect(edge.mad).toBeCloseTo(35, 6);
    expect(edge.accepted).toBe(true);
    const past = mod.judgePass(spread(35.5));
    expect(past.mad).toBeCloseTo(35.5, 6);
    expect(past.accepted).toBe(false);
  });

  it('rejects a pass of fewer than 10 taps', () => {
    expect(mod.judgePass([1, 2, 3, 4, 5, 6, 7, 8, 9]).accepted).toBe(false);
    expect(mod.judgePass([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).accepted).toBe(true);
  });

  it('drops the lowest and the highest tap before the median', () => {
    const p = mod.judgePass([-5000, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 5000]);
    expect(p.median).toBeCloseTo(14.5, 6);
    expect(p.taps).toBe(12);
  });

  // Review R2, MINOR 1: dropping the two ends never moves a median, so only the spread shows the trim. Kept, the two
  // stray taps double it.
  it('drops the lowest and the highest tap before the spread', () => {
    const p = mod.judgePass([-50, -10, -10, 0, 0, 0, 0, 10, 10, 50]);
    expect(p.median).toBeCloseTo(0, 6);
    expect(p.mad).toBeCloseTo(5, 6);
    expect(p.taps).toBe(10);
    expect(p.accepted).toBe(true);
  });

  // The owner's ruling N-F1 c (2026-10-19): the scene runs pass B only when pass A is rejected, so a lone accepted pass
  // gives the input bias alone and never shifts the picture by the player's tap lag (the one-pass rule).
  it('gives a lone accepted pass A as the input bias, with no display shift', () => {
    const good = mod.judgePass(taps(24, 30, 4, 3));
    const bad = mod.judgePass(taps(24, 30, 200, 4));
    expect(good.accepted).toBe(true);
    expect(bad.accepted).toBe(false);
    const r = mod.calibrate(good, bad);
    expect(r.avOffset).toBeCloseTo(0, 6);
    expect(r.inputBias).toBeCloseTo(good.median, 6);
    const none = mod.calibrate(good, mod.judgePass([]));
    expect(none.avOffset).toBeCloseTo(0, 6);
    expect(none.inputBias).toBeCloseTo(good.median, 6);
  });

  it('gives a lone accepted pass B as the input bias, with no display shift', () => {
    const good = mod.judgePass(taps(24, 45, 4, 5));
    const bad = mod.judgePass(taps(24, 45, 200, 6));
    expect(good.accepted).toBe(true);
    expect(bad.accepted).toBe(false);
    const r = mod.calibrate(bad, good);
    expect(r.avOffset).toBeCloseTo(0, 6);
    expect(r.inputBias).toBeCloseTo(good.median, 6);
  });

  it('takes 0 and 0 when neither pass is accepted', () => {
    const bad = mod.judgePass(taps(24, 30, 200, 4));
    const none = mod.judgePass([]);
    for (const [a, v] of [[bad, none], [none, bad], [bad, bad], [none, none]]) {
      const r = mod.calibrate(a, v);
      expect(r.avOffset).toBeCloseTo(0, 6);
      expect(r.inputBias).toBeCloseTo(0, 6);
    }
  });
});
