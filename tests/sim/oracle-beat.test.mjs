// SIM4: beat entities (blocks and spikes, on their layer's period and phase, their rest state while the layer
// is not back), the crush rule, and progression (a cleared room's layer pending to the next bar line, the next
// room entered at its spawn) against the oracle.
import { describe, expect, it } from 'vitest';
import { DASHES, O, WALK, compare, inputs, placed, worlds } from './compare.mjs';

const all = worlds();
const canonical = (room) => (room <= 1 ? 0 : ((1 << Math.min(room, 11)) - 2) & 0x7fe);

describe('SIM4 beat entities and progression against the oracle', () => {
  for (const room of [2, 4, 5, 8]) {
    it(`agrees in room ${room} with its layers back, and with none back (rest states)`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        expect(compare(all, { room, step: 0, layers: canonical(room), stopAtClear: true }, inputs(room * 100 + seed, 3000, DASHES, 50))).toBeNull();
        expect(compare(all, { room, step: 0, layers: 0, stopAtClear: true }, inputs(room * 100 + seed + 50, 1500, WALK, 50))).toBeNull();
      }
    });
  }

  it('agrees on the crush: a block that comes on over the creature', () => {
    const start = { room: 2, step: 0, layers: canonical(2), stopAtClear: true };
    const e = all.oracle.rooms[1].entities[0];
    const [col, row] = e.cells[0];
    for (let step = 0; step < 1440; step += 97) {
      if (O.entityOn(e, step, start.layers)) continue;
      const state = placed(all, start, col, row - 1, { step, grounded: 0 });
      expect(compare(all, start, inputs(step, 400, [0]), { state })).toBeNull();
    }
  });

  it('agrees on the clear, the pending layer and the next room, without stopping at the clear', () => {
    for (const room of [1, 2, 5, 9, 10]) {
      const start = { room, step: 0, layers: canonical(room), stopAtClear: false };
      const W = all.oracle.rooms[room - 1].W;
      for (let k = 0; k < 4; k++) {
        const state = placed(all, start, W - 2, room === 10 ? 11 : 10, { step: 1000 + 331 * k, vx: 176 });
        expect(compare(all, start, inputs(room * 10 + k, 2600, WALK, 60), { state })).toBeNull();
      }
    }
  });
});
