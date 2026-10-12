// A faulty calibrator (PF-CONTROLS for X8): it accepts any pass, however noisy. The X8 test must fail on it.
import { calibrate, judgePass as exact } from './reference.mjs';

export { calibrate };

export function judgePass(offsetsMs) {
  return { ...exact(offsetsMs), accepted: true };
}
