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

// The owner's ruling N-F1 c (2026-10-19), the one-pass rule: both passes accepted give the display shift and the input
// bias as before; a lone accepted pass gives the input bias alone, so it never shifts the picture by the player's tap
// lag; neither gives 0 and 0.
export function calibrate(a, v) {
  if (a.accepted && v.accepted) return { avOffset: a.median - v.median, inputBias: v.median };
  if (a.accepted) return { avOffset: 0, inputBias: a.median };
  if (v.accepted) return { avOffset: 0, inputBias: v.median };
  return { avOffset: 0, inputBias: 0 };
}
