// SIM5: the wave (slope 1 at WAVE_SPEED, rising while JUMP or UP is held, a horizontal collision kills, a
// vertical one slides) and the portals (W into the wave, B back to the base form) against the oracle.
import { describe, expect, it } from 'vitest';
import { WALK, WAVE, compare, inputs, placed, worlds } from './compare.mjs';

const all = worlds();
const canonical = (room) => (room <= 1 ? 0 : ((1 << Math.min(room, 11)) - 2) & 0x7fe);
// The column just left of each room's wave portal, on the floor row below it.
const PORTAL = { 6: [8, 15], 7: [10, 15], 9: [22, 15], 10: [34, 15] };

describe('SIM5 wave and portals against the oracle', () => {
  for (const [room, [col, row]] of Object.entries(PORTAL).map(([r, v]) => [Number(r), v])) {
    it(`agrees in room ${room} through its wave portal`, () => {
      const start = { room, step: 0, layers: canonical(room), stopAtClear: true };
      for (let seed = 1; seed <= 6; seed++) {
        const state = placed(all, start, col, row, { vx: 176, step: 97 * seed });
        const seq = [...inputs(seed, 30, [2]), ...inputs(room * 50 + seed, 2400, WAVE, 25)];
        expect(compare(all, start, seq, { state })).toBeNull();
      }
    });
  }

  it('agrees on the way from the spawn to the portal in 06-wave and on through it', () => {
    for (let seed = 61; seed <= 66; seed++) {
      const seq = [...inputs(seed, 120, [2]), ...inputs(seed + 7, 2400, [...WAVE, ...WALK], 20)];
      expect(compare(all, { room: 6, step: 0, layers: canonical(6), stopAtClear: true }, seq)).toBeNull();
    }
  });
});
