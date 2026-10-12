// Beat-bound timing (spec sections 4.4 and 4.5), ported from tests/fixtures/oracle/sim.mjs. Integer math only (D3).
import { C } from './constants.ts';
import type { Entity } from './types.ts';

const mod = (a: number, b: number): number => ((a % b) + b) % b;

// Beat-bound entity state at a step: active when its layer is back, else its rest state.
export function entityOn(e: Pick<Entity, 'layer' | 'period' | 'phase' | 'on' | 'rest'>, step: number, layers: number): boolean {
  if (!(layers & (1 << e.layer))) return e.rest;
  const period = e.period * C.TICKS_PER_BEAT;
  return mod(step * C.TICKS_PER_STEP - e.phase * C.TICKS_PER_SIXTEENTH, period) < e.on * C.TICKS_PER_SIXTEENTH;
}

// Where a cleared room's layer comes back: the first step on or after the first bar line at least one
// beat after `step`, so the audio, which hears later than it schedules, can still unmute on that line.
export function unlockBar(step: number): number {
  return Math.ceil((step * C.TICKS_PER_STEP + C.TICKS_PER_BEAT) / C.TICKS_PER_BAR);
}

export function nextBarStep(step: number): number {
  return Math.ceil((unlockBar(step) * C.TICKS_PER_BAR) / C.TICKS_PER_STEP);
}

// The gauntlet's run starts on the first bar line at least one beat after `step` (a beat index).
export function gauntletStartBeat(step: number): number {
  return Math.ceil((step * C.TICKS_PER_STEP + C.GAUNTLET_LEAD_TICKS) / C.TICKS_PER_BAR) * 4;
}
