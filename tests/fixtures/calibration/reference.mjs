// The calibration math of HUSH-SPEC section 12 as a reference (PF-CONTROLS fixture for X8): the test in
// tests/input/calibrate.test.ts passes on this module and fails on its two faulty twins.
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function judgePass(offsetsMs) {
  const taps = offsetsMs.length;
  if (taps < 10) return { median: 0, mad: 0, taps, accepted: false };
  const trimmed = [...offsetsMs].sort((a, b) => a - b).slice(1, -1);
  const m = median(trimmed);
  const mad = median(trimmed.map((x) => Math.abs(x - m)));
  return { median: m, mad, taps, accepted: mad <= 35 };
}

export function calibrate(a, v) {
  const medianA = a.accepted ? a.median : 0;
  const medianV = v.accepted ? v.median : 0;
  return { avOffset: medianA - medianV, inputBias: medianV };
}
