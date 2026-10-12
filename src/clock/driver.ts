// The tick driver's arithmetic (spec section 9.1): the sim steps one step past the heard time, never more than
// MAX_STEPS_PER_FRAME in a frame, and the render interpolates between the two states that bracket the time.
export const MAX_STEPS_PER_FRAME = 24;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const stepsDue = (simStep: number, target: number): number => Math.min(Math.max(target - simStep, 0), MAX_STEPS_PER_FRAME);

export const targetStep = (heardSec: number, origin: number, displaySecs: number): number =>
  Math.floor((heardSec - origin + displaySecs) * 240) + 1;

export const displaySec = (avOffsetMs: number): number => clamp(-avOffsetMs / 1000, -0.15, 0.15);

export const inputLagSec = (avOffsetMs: number, inputBiasMs: number): number => clamp((avOffsetMs + inputBiasMs) / 1000, 0, 0.15);

export const alpha = (heardSec: number, origin: number, displaySecs: number, simStep: number): number =>
  clamp((heardSec - origin + displaySecs) * 240 - simStep + 1, 0, 1);
