// Layer gates (spec section 8.3, Vault City's ensureLayer without the duck): a layer's gain is 0 until its room is
// cleared, then it opens on a bar line with a 5 ms ramp, so the music and the hazards return together (X7).
import { BAR } from './scheduler.ts';

export function unlockTime(origin: number, bar: number): number {
  return origin + bar * BAR;
}

export function openAt(param: AudioParam, t: number): void {
  param.setValueAtTime(0, t - 0.005);
  param.linearRampToValueAtTime(1, t);
}

// Gate i is layer i + 1: it is set to 1 when the mask has the bit of that layer, else to 0.
export function setMask(params: AudioParam[], mask: number, now: number): void {
  params.forEach((g, i) => {
    g.cancelScheduledValues(now);
    g.setValueAtTime(mask & (1 << (i + 1)) ? 1 : 0, now);
  });
}
