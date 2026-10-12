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

// The audio and visual passes to the display shift and the input bias: a rejected pass takes 0.
export function calibrate(a: PassResult, v: PassResult): { avOffset: number; inputBias: number } {
  const medianA = a.accepted ? a.median : 0;
  const medianV = v.accepted ? v.median : 0;
  return { avOffset: medianA - medianV, inputBias: medianV };
}
