// Reference for tests/clock/driver.test.mjs (PF-CONTROLS): HUSH-SPEC section 9.1 in a few lines.
export const MAX_STEPS_PER_FRAME = 24;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const stepsDue = (simStep, target) => Math.min(Math.max(target - simStep, 0), MAX_STEPS_PER_FRAME);
export const targetStep = (heardSec, origin, displaySec) => Math.floor((heardSec - origin + displaySec) * 240) + 1;
export const displaySec = (avOffsetMs) => clamp(-avOffsetMs / 1000, -0.15, 0.15);
export const inputLagSec = (avOffsetMs, inputBiasMs) => clamp((avOffsetMs + inputBiasMs) / 1000, 0, 0.15);
export const alpha = (heardSec, origin, display, simStep) => clamp((heardSec - origin + display) * 240 - simStep + 1, 0, 1);
