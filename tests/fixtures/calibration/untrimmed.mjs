// A faulty calibrator (review R2, MINOR 1; PF-CONTROLS for X8): it judges a pass on every tap, the lowest and the
// highest included, so its median is the reference's but its spread counts the two stray taps. The X8 test must
// fail on it.
import { calibrate } from './reference.mjs';

export { calibrate };

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function judgePass(offsetsMs) {
  const taps = offsetsMs.length;
  if (taps < 10) return { median: 0, mad: 0, taps, accepted: false };
  const all = [...offsetsMs].sort((a, b) => a - b);
  const m = median(all);
  const mad = median(all.map((x) => Math.abs(x - m)));
  return { median: m, mad, taps, accepted: mad <= 35 };
}
