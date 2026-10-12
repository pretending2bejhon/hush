// Shared by the art tests (RN1 to RN4, END1): the spec's rooms compiled by the oracle, the witnesses run on the
// oracle sim, and a shape-list comparison. Two lists agree when they hold the same shapes in the same order:
// the same kind, colour and keys, every number within 1e-6 (a port may group its arithmetic differently).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import * as O from '../fixtures/oracle/index.mjs';
import { specBlocks } from '../../tools/spec-content.mjs';
import { canonicalLayers, readWitness } from '../../tools/replay.mjs';

export const ALL_ROOMS = ['01-wake', '02-heartbeat', '03-dash', '04-thorns', '05-doors', '06-wave', '07-current', '08-steps', '09-gates', '10-crown', '11-gauntlet'];
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function world() {
  const blocks = specBlocks();
  return O.compileWorld(ALL_ROOMS.map((n) => ({ name: `${n}.txt`, text: blocks.get(`rooms/${n}.txt`) })));
}

export function roomOf(w, n) {
  return n === 11 ? w.gauntlet : w.rooms[n - 1];
}

// The oracle sim's state after each tick, by field name (x and y in sub), driven by `input(step)` from the
// room's entrance until it clears or `steps` have run.
export function* inputStates(w, room, layers, input, steps) {
  const sim = O.createSim(w, { room, step: 0, layers, stopAtClear: true });
  for (let i = 0; i < steps; i++) {
    sim.tick(input(i));
    const saved = sim.save();
    const s = Object.fromEntries(O.FIELDS.map((f, k) => [f, saved[k]]));
    yield s;
    if (s.cleared) return;
  }
}

// The same through a witness of replays/ (the executor's, found by tools/solve.mjs).
export function* witnessStates(w, stem) {
  const room = Number(stem.slice(0, 2));
  const wit = readWitness(path.join(REPO, 'replays', `${stem}.json`));
  yield* inputStates(w, room, canonicalLayers(room), (step) => {
    let bits = 0;
    for (const [s, b] of wit.changes) if (s <= step) bits = b;
    return bits;
  }, wit.end);
}

function sameNumber(a, b) {
  return typeof a === 'number' && Math.abs(a - b) <= 1e-6;
}

// The first difference between two shape lists, or null.
export function shapeDiff(got, want) {
  if (!Array.isArray(got)) return 'not a list';
  if (got.length !== want.length) return `${got.length} shapes, want ${want.length}`;
  for (let i = 0; i < want.length; i++) {
    const g = got[i];
    const w = want[i];
    const keys = Object.keys(w).sort().join(',');
    if (!g || Object.keys(g).sort().join(',') !== keys) return `[${i}] keys ${g ? Object.keys(g).sort().join(',') : g}, want ${keys}`;
    for (const key of Object.keys(w)) {
      const a = g[key];
      const b = w[key];
      if (Array.isArray(b)) {
        if (!Array.isArray(a) || a.length !== b.length || b.some((v, j) => !sameNumber(a[j], v))) return `[${i}] ${w.k}.${key} ${JSON.stringify(a)}, want ${JSON.stringify(b)}`;
      } else if (typeof b === 'number' ? !sameNumber(a, b) : a !== b) return `[${i}] ${w.k}.${key} ${a}, want ${b}`;
    }
  }
  return null;
}

export function sameShapes(got, want, label = 'shapes') {
  const d = shapeDiff(got, want);
  if (d) expect.fail(`${label}: ${d}`);
}
