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

  it('takes 0 for a rejected pass', () => {
    const good = mod.judgePass(taps(24, 30, 4, 3));
    const bad = mod.judgePass(taps(24, 30, 200, 4));
    expect(bad.accepted).toBe(false);
    const r1 = mod.calibrate(bad, good);
    expect(r1.avOffset).toBeCloseTo(-good.median, 6);
    expect(r1.inputBias).toBeCloseTo(good.median, 6);
    const r2 = mod.calibrate(good, bad);
    expect(r2.avOffset).toBeCloseTo(good.median, 6);
    expect(r2.inputBias).toBe(0);
  });
});
