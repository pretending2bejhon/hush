// RN2: the creature (src/render/creature.ts, HUSH-SPEC section 10.3) equals the reference
// (tests/fixtures/reference/art.mjs): its track advanced step by step through every witness and through runs
// that die and respawn, and its shapes at every step of those runs in both forms, landing, dying and
// respawning, at two cameras and two interpolations.
import { describe, expect, it } from 'vitest';
import * as REF from '../fixtures/reference/art.mjs';
import { load } from '../helpers/load.mjs';
import { ALL_ROOMS, inputStates, roomOf, sameShapes, witnessStates, world } from './same.mjs';

const P = await load('HUSH_CREATURE_MODULE', new URL('../../src/render/creature.ts', import.meta.url));
const W = world();

// Holding right in room 1 runs into the first spike pit: a death, a respawn, then another.
const RUNS = [
  ...ALL_ROOMS.map((stem) => ({ name: stem, states: () => witnessStates(W, stem) })),
  { name: 'room 1, right held', states: () => inputStates(W, 1, 0, () => 2, 900) },
  { name: 'room 6, right then jump held', states: () => inputStates(W, 6, 0x3e, (s) => (s < 300 ? 2 : 18), 1200) },
];

function check(run) {
  let pt = P.createTrack();
  let rt = REF.createTrack();
  let prev = null;
  let n = 0;
  for (const s of run.states()) {
    pt = P.trackStep(pt, s);
    rt = REF.trackStep(rt, s);
    expect(pt, `${run.name} step ${s.step}: track`).toEqual(rt);
    const room = roomOf(W, s.room);
    for (const alpha of [1, 0.5]) {
      const x = prev ? (prev.x + (s.x - prev.x) * alpha) / 256 : s.x / 256;
      const y = prev ? (prev.y + (s.y - prev.y) * alpha) / 256 : s.y / 256;
      const c = { step: s.step, x, y, form: s.form, vy: s.vy, facing: s.facing, dead: s.dead, lock: s.lock };
      for (const cam of [REF.cameraPx(room, x + 5), 0]) {
        sameShapes(P.creatureShapes(c, pt, cam), REF.creatureShapes(c, rt, cam), `${run.name} step ${s.step} a ${alpha} cam ${cam}`);
      }
    }
    prev = s;
    n += 1;
  }
  return n;
}

describe('RN2 creature', () => {
  for (const run of RUNS) {
    it(`tracks and draws the creature through ${run.name}`, () => {
      expect(check(run)).toBeGreaterThan(100);
    });
  }

  it('starts every track the same', () => {
    expect(P.createTrack()).toEqual(REF.createTrack());
  });
});
