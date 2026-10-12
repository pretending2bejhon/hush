// SIM6: the gauntlet (the run starting on the bar line at least a beat after entry or respawn, x set from the
// beat-ticks at 4 tiles a beat, jump only, death on any horizontal collision, the wave bars through the portals,
// the finish) against the oracle.
import { describe, expect, it } from 'vitest';
import { O, compare, inputs, worlds } from './compare.mjs';

const all = worlds();
const start = { room: 11, step: 0, layers: 0x7fe, stopAtClear: true };
const J = 16;

// A state in mid-run: started on beat 4, at `step`, x where the auto-run puts it, on the floor.
function midRun(step) {
  const o = O.createSim(all.oracle, start);
  const s = o.save();
  const at = (f) => O.FIELDS.indexOf(f);
  const startX = 4 * 4096 + 768;
  s[at('step')] = step;
  s[at('gBeat')] = 4;
  s[at('gRun')] = 1;
  s[at('x')] = startX + Math.floor(((step * 7 - 4 * 720) * 1024) / 45);
  s[at('y')] = 15 * 4096 - 2560;
  s[at('grounded')] = 1;
  return Array.from(s);
}

describe('SIM6 gauntlet against the oracle', () => {
  it('agrees from the start: the wait for the bar, the first obstacles, deaths and restarts', () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(compare(all, start, inputs(seed, 4000, [0, 0, J], 30))).toBeNull();
    }
  });

  it('agrees in mid-run, into and out of the wave bars and to the finish', () => {
    for (const step of [3000, 6500, 6900, 9800, 10300, 12500]) {
      expect(compare(all, start, inputs(step, 3600, [0, J, J, 0], 18), { state: midRun(step) })).toBeNull();
    }
  });
});
