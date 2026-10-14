// X7, the sim side, with the audio's bar line: clearing room k on step s brings layer k back at nextBarStep(s),
// the first step on the bar line unlockBar(s), at least a beat after the clear; until then every hazard bound to
// layer k holds its rest state, and from then on it follows its pattern; the audio gate opens on the same bar
// line (unlockTime(origin, unlockBar(s))), within one step of the sim's.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readWitness } from '../../tools/replay.mjs';
import { load } from '../helpers/load.mjs';
import * as O from '../fixtures/oracle/index.mjs';
import { worlds } from './compare.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const B = await load('HUSH_BEAT_MODULE', new URL('../../src/sim/beat.ts', import.meta.url));
const G = await load('HUSH_AUDIO_MODULE', new URL('../../src/audio/gates.ts', import.meta.url));
const P = await load('HUSH_SIM_MODULE', new URL('../../src/sim/headless.ts', import.meta.url));
const w = worlds();
const canonical = (room) => (room <= 1 ? 0 : ((1 << Math.min(room, 11)) - 2) & 0x7fe);

// A spot two columns from the exit: both columns empty on that row, solid under the first.
function exitRow(room) {
  const { W, H, tiles } = room;
  for (let r = H - 2; r >= 0; r--) {
    if (tiles[r * W + W - 1] === 0 && tiles[r * W + W - 2] === 0 && tiles[(r + 1) * W + W - 2] === 1) return r;
  }
  throw new Error(`no standing spot at the exit of ${room.name}`);
}

describe('X7 progression: a layer returns on the bar line', () => {
  it('computes the bar line as the oracle does', () => {
    for (let s = 0; s < 20000; s += 37) {
      expect(B.unlockBar(s)).toBe(O.unlockBar(s));
      expect(B.nextBarStep(s)).toBe(O.nextBarStep(s));
      expect(B.gauntletStartBeat(s)).toBe(O.gauntletStartBeat(s));
      expect(B.nextBarStep(s) * 7 - s * 7).toBeGreaterThanOrEqual(720);
    }
  });

  // Review R7 (MINOR 1): a clear on the one step per bar whose next step lies past the bar line's edge. Room 1's witness,
  // delayed 337 steps, clears on the tick of step 1954, where unlockBar is 5 and one step later 6: the layer comes back
  // on bar 5's first step, nextBarStep(1954), not nextBarStep(1955).
  it('room 1 cleared on the bar line\'s edge step: layer 1 back on that step\'s bar line', () => {
    const D = 337;
    const changes = readWitness(path.join(REPO, 'replays', '01-wake.json')).changes.map(([s, b]) => [s + D, b]);
    const sim = P.createSim(w.product, { room: 1, step: 0, layers: canonical(1), stopAtClear: false });
    let k = 0;
    let bits = 0;
    let clearStep = -1;
    for (let s = 0; s < 4000 && clearStep < 0; s++) {
      while (k < changes.length && changes[k][0] <= s) { bits = changes[k][1]; k += 1; }
      const before = sim.step;
      sim.tick(bits);
      if (sim.status().cleared > 0) clearStep = before;
    }
    expect(clearStep).toBe(1954);
    expect([B.unlockBar(1954), B.unlockBar(1955)]).toEqual([5, 6]);
    const st = sim.save();
    expect(st[O.FIELDS.indexOf('pendingLayer')]).toBe(1);
    expect(st[O.FIELDS.indexOf('pendingAt')]).toBe(B.nextBarStep(1954));
    expect(B.nextBarStep(1954)).not.toBe(B.nextBarStep(1955));
  });

  for (let k = 1; k <= 10; k++) {
    it(`room ${k}: layer ${k} back on the bar line, its hazards at rest until then`, () => {
      const start = { room: k, step: 0, layers: canonical(k), stopAtClear: false };
      const sim = P.createSim(w.product, start);
      const s0 = sim.save();
      const at = (f) => O.FIELDS.indexOf(f);
      const W = w.product.rooms[k - 1].W;
      s0[at('x')] = (W - 2) * 4096 + 768;
      s0[at('y')] = (exitRow(w.product.rooms[k - 1]) + 1) * 4096 - 2560;
      s0[at('step')] = 500 + 61 * k;
      sim.load(s0);
      let clearStep = -1;
      for (let i = 0; i < 400 && clearStep < 0; i++) { const before = sim.step; sim.tick(2); if (sim.status().cleared > 0) clearStep = before; }
      expect(clearStep).toBeGreaterThan(0);
      const st = sim.save();
      expect(st[at('pendingLayer')]).toBe(k);
      expect(st[at('pendingAt')]).toBe(B.nextBarStep(clearStep));
      const bar = B.unlockBar(clearStep);
      const origin = 3.25;
      expect(Math.abs((origin + st[at('pendingAt')] / 240) - G.unlockTime(origin, bar))).toBeLessThan(1 / 240);
      const next = k < 10 ? w.product.rooms[k] : null;
      const bound = next ? next.entities.filter((e) => e.layer === k) : [];
      for (let step = clearStep; step < st[at('pendingAt')] + 3000; step += 7) {
        const layers = step >= st[at('pendingAt')] ? canonical(k) | (1 << k) : canonical(k);
        for (const e of bound) {
          const want = step < st[at('pendingAt')] ? e.rest : O.entityOn(e, step, canonical(k) | (1 << k));
          expect(B.entityOn(e, step, layers)).toBe(want);
        }
      }
      while (sim.step < st[at('pendingAt')]) { sim.tick(0); expect(sim.save()[at('layers')] & (1 << k)).toBe(0); }
      sim.tick(0);
      expect(sim.save()[at('layers')] & (1 << k)).toBe(1 << k);
    });
  }
});
