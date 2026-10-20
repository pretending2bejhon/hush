// The calibration math (spec section 12): memory only, no storage of any kind.
export interface PassResult {
  median: number;
  mad: number;
  taps: number;
  accepted: boolean;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? (s[(n - 1) / 2] ?? 0) : ((s[n / 2 - 1] ?? 0) + (s[n / 2] ?? 0)) / 2;
}

// One pass of tap offsets in ms: fewer than 10 taps is rejected; else the lowest and the highest tap are
// dropped, `median` is the median of the rest, `mad` the median of the absolute deviations from it, and the
// pass is accepted when mad <= 35.
export function judgePass(offsetsMs: number[]): PassResult {
  const taps = offsetsMs.length;
  if (taps < 10) return { median: 0, mad: 0, taps, accepted: false };
  const trimmed = [...offsetsMs].sort((a, b) => a - b).slice(1, -1);
  const m = median(trimmed);
  const mad = median(trimmed.map((x) => Math.abs(x - m)));
  return { median: m, mad, taps, accepted: mad <= 35 };
}

// The audio and visual passes to the display shift and the input bias, by the one-pass rule (the owner's ruling N-F1 c,
// 2026-10-19): both passes accepted give avOffset a.median - v.median and inputBias v.median; a lone accepted pass gives
// avOffset 0 and its median as inputBias, so it never shifts the picture by the player's tap lag; neither gives 0 and 0.
export function calibrate(a: PassResult, v: PassResult): { avOffset: number; inputBias: number } {
  if (a.accepted && v.accepted) return { avOffset: a.median - v.median, inputBias: v.median };
  if (a.accepted) return { avOffset: 0, inputBias: a.median };
  if (v.accepted) return { avOffset: 0, inputBias: v.median };
  return { avOffset: 0, inputBias: 0 };
}
