// SIM2: the base form (run, gravity, jump, variable jump, coyote, buffer, collision, static spikes, the fall,
// death, respawn and lock, the room clear) and the solver's key and the checksum, against the oracle.
import { describe, expect, it } from 'vitest';
import { O, P, WALK, compare, inputs, placed, worlds } from './compare.mjs';

const open = worlds(['01-open']);
const all = worlds();

describe('SIM2 base form against the oracle', () => {
  it('agrees in an open room on held walks and jumps', () => {
    for (let seed = 1; seed <= 6; seed++) {
      expect(compare(open, { room: 1, step: 0, layers: 0, stopAtClear: true }, inputs(seed, 2400, WALK))).toBeNull();
    }
  });

  it('agrees in 01-wake, spikes, pits, deaths and respawns included', () => {
    for (let seed = 11; seed <= 18; seed++) {
      expect(compare(all, { room: 1, step: 0, layers: 0, stopAtClear: true }, inputs(seed, 3000, WALK, 60))).toBeNull();
    }
  });

  it('agrees on the clear at the right edge', () => {
    const start = { room: 1, step: 0, layers: 0, stopAtClear: true };
    for (const row of [10, 11]) {
      const state = placed(all, start, 69, row);
      expect(compare(all, start, inputs(row, 200, [2, 18]), { state })).toBeNull();
    }
  });

  it('starts at the spawn, keeps every state field an integer, and gives the oracle key and checksum', () => {
    const start = { room: 1, step: 0, layers: 0, stopAtClear: true };
    const o = O.createSim(all.oracle, start);
    const p = P.createSim(all.product, start);
    expect(Array.from(p.save())).toEqual(Array.from(o.save()));
    expect(p.save()).toBeInstanceOf(Int32Array);
    for (const bits of inputs(5, 600, WALK)) { o.tick(bits); p.tick(bits); }
    expect(p.step).toBe(o.step);
    expect(p.checksum()).toBe(o.checksum());
    for (const period of [2880, 5760, 11520]) expect(p.key(period)).toBe(o.key(period));
    expect(P.FIELDS).toEqual(O.FIELDS);
  });
});
