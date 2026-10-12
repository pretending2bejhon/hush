// CL2: the tick driver's arithmetic (src/clock/driver.ts, HUSH-SPEC section 9): the target step from the heard
// clock, the catch-up cap of 24 steps a frame, the calibration's display shift and input lag, and the render's
// interpolation factor.
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';

const D = await load('HUSH_DRIVER_MODULE', new URL('../../src/clock/driver.ts', import.meta.url));

describe('CL2 tick driver', () => {
  it('runs the steps due, never more than 24 a frame and never backwards', () => {
    expect(D.MAX_STEPS_PER_FRAME).toBe(24);
    expect(D.stepsDue(100, 104)).toBe(4);
    expect(D.stepsDue(100, 100)).toBe(0);
    expect(D.stepsDue(100, 90)).toBe(0);
    expect(D.stepsDue(100, 1000)).toBe(24);
  });

  it('takes the target step from the heard time, the origin and the display shift: one step past the time', () => {
    expect(D.targetStep(10.5, 10, 0)).toBe(121);
    expect(D.targetStep(10.5, 10, 0.02)).toBe(125);
    expect(D.targetStep(10, 10.1, 0)).toBe(-23);
    expect(D.targetStep(10 + 1 / 240 - 1e-9, 10, 0)).toBe(1);
  });

  it('turns the calibration into a display shift and an input lag, both clamped', () => {
    expect(D.displaySec(40)).toBeCloseTo(-0.04, 12);
    expect(D.displaySec(-500)).toBeCloseTo(0.15, 12);
    expect(D.displaySec(500)).toBeCloseTo(-0.15, 12);
    expect(D.inputLagSec(40, 25)).toBeCloseTo(0.065, 12);
    expect(D.inputLagSec(-80, 20)).toBe(0);
    expect(D.inputLagSec(200, 100)).toBeCloseTo(0.15, 12);
  });

  it('interpolates between the two states that bracket the time', () => {
    expect(D.alpha(10 + 120.25 / 240, 10, 0, 121)).toBeCloseTo(0.25, 9);
    expect(D.alpha(10 + 121.5 / 240, 10, 0, 122)).toBeCloseTo(0.5, 9);
    expect(D.alpha(10, 10, 0, 50)).toBe(0);
    expect(D.alpha(20, 10, 0, 50)).toBe(1);
  });
});
