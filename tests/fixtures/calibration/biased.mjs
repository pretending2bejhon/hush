// A faulty calibrator (PF-CONTROLS for X8): its avOffset is 8 ms off. The X8 test must fail on it.
import { calibrate as exact, judgePass } from './reference.mjs';

export { judgePass };

export function calibrate(a, v) {
  const r = exact(a, v);
  return { avOffset: r.avOffset + 8, inputBias: r.inputBias };
}
