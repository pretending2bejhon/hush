// SIM3: the dash (eight directions, its exit speed, cooldown and refill on the ground, the run-speed reduce
// after it) against the oracle.
import { describe, expect, it } from 'vitest';
import { DASHES, compare, inputs, worlds } from './compare.mjs';

const open = worlds(['01-open']);
const all = worlds();

describe('SIM3 dash against the oracle', () => {
  it('agrees in an open room on dashes in every direction', () => {
    for (let seed = 21; seed <= 28; seed++) {
      expect(compare(open, { room: 1, step: 0, layers: 0, stopAtClear: true }, inputs(seed, 2400, DASHES, 30))).toBeNull();
    }
  });

  it('agrees in 03-dash', () => {
    for (let seed = 31; seed <= 36; seed++) {
      expect(compare(all, { room: 3, step: 0, layers: 6, stopAtClear: true }, inputs(seed, 3000, DASHES, 40))).toBeNull();
    }
  });
});
