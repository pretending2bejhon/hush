// FX1: the flash limiter (src/fx/flash-limiter.ts, HUSH-SPEC section 11): within one frame, beat-driven changes of
// 0.1 or more in relative luminance pass until their summed area (in canvas pixels at 1280 by 720) would reach
// 25,600; that change and every later one in the frame come back as a change under 0.1; smaller changes pass
// uncounted; each frame starts from zero.
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';

const F = await load('HUSH_FX_MODULE', new URL('../../src/fx/flash-limiter.ts', import.meta.url));

describe('FX1 flash limiter', () => {
  it('has the limit of section 11', () => {
    expect(F.FLASH_AREA_LIMIT).toBe(25600);
    expect(F.LUM_STEP).toBe(0.1);
  });

  it('lets changes through until the frame would reach the limit, then keeps them under 0.1', () => {
    const f = F.createFlashLimiter(1280, 720);
    f.beginFrame();
    expect(f.request(10000, 0.02, 0.5)).toBe(0.5);
    expect(f.request(10000, 0.5, 0.02)).toBe(0.02);
    const held = f.request(6000, 0.02, 0.6);
    expect(held - 0.02).toBeLessThan(0.1);
    expect(held).toBeGreaterThan(0.02);
    const down = f.request(10, 0.6, 0.1);
    expect(0.6 - down).toBeLessThan(0.1);
    expect(f.request(900000, 0.3, 0.35)).toBe(0.35);
    f.beginFrame();
    expect(f.request(25000, 0.02, 0.5)).toBe(0.5);
  });

  it('counts areas in canvas pixels at 1280 by 720', () => {
    const half = F.createFlashLimiter(640, 360);
    half.beginFrame();
    expect(half.request(6000, 0, 0.5)).toBe(0.5);
    expect(half.request(500, 0, 0.5)).toBeLessThan(0.1);
  });
});
