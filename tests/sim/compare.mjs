// The product sim against the oracle (HUSH-SPEC section 4: the oracle wins): both compile the same room
// texts (the spec's byte-exact blocks), both run the same inputs from the same state, and save() must agree
// field for field after every step. Inputs are seeded runs of held keys, as a player holds them.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as O from '../fixtures/oracle/index.mjs';
import { specBlocks } from '../../tools/spec-content.mjs';
import { openRoomText } from '../../tools/reach.mjs';

export { O };
// HUSH_SIM_MODULE points these tests at another headless module (the controls: the oracle itself passes, a
// mutated copy fails).
const override = process.env.HUSH_SIM_MODULE;
export const P = await import(override ? pathToFileURL(path.resolve(override)).href : '../../src/sim/headless.ts');

const blocks = specBlocks();
export function roomFiles(names) {
  return names.map((n) => {
    const key = n === '11-gauntlet' ? 'rooms/11-gauntlet.txt' : `rooms/${n}.txt`;
    const text = n === '01-open' ? openRoomText('01-open') : blocks.get(key);
    if (!text) throw new Error(`no spec block for ${n}`);
    return { name: `${n}.txt`, text };
  });
}

export const ALL_ROOMS = ['01-wake', '02-heartbeat', '03-dash', '04-thorns', '05-doors', '06-wave', '07-current', '08-steps', '09-gates', '10-crown', '11-gauntlet'];

export function worlds(names = ALL_ROOMS) {
  const files = roomFiles(names);
  return { oracle: O.compileWorld(files), product: P.compileWorld(files) };
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// steps inputs: each held for 1 to `hold` steps, drawn from `pool`.
export function inputs(seed, steps, pool, hold = 40) {
  const r = rng(seed);
  const out = [];
  while (out.length < steps) {
    const bits = pool[Math.floor(r() * pool.length)];
    const n = 1 + Math.floor(r() * hold);
    for (let i = 0; i < n && out.length < steps; i++) out.push(bits);
  }
  return out;
}

// Runs both sims; returns null when they agree at every step, else the first difference.
export function compare(w, start, seq, { state = null } = {}) {
  const o = O.createSim(w.oracle, start);
  const p = P.createSim(w.product, start);
  if (state) { o.load(Int32Array.from(state)); p.load(Int32Array.from(state)); }
  const a0 = o.save();
  const b0 = p.save();
  for (let f = 0; f < O.FIELDS.length; f++) if (a0[f] !== b0[f]) return { step: -1, field: O.FIELDS[f], oracle: a0[f], product: b0[f] };
  for (let i = 0; i < seq.length; i++) {
    o.tick(seq[i]);
    p.tick(seq[i]);
    const a = o.save();
    const b = p.save();
    if (a.length !== b.length) return { step: i, field: 'length', oracle: a.length, product: b.length };
    for (let f = 0; f < a.length; f++) if (a[f] !== b[f]) return { step: i, field: O.FIELDS[f], oracle: a[f], product: b[f], input: seq[i] };
  }
  if (o.checksum() !== p.checksum()) return { step: seq.length, field: 'checksum', oracle: o.checksum(), product: p.checksum() };
  const so = o.status();
  const sp = p.status();
  for (const k of Object.keys(so)) if (so[k] !== sp[k]) return { step: seq.length, field: `status.${k}`, oracle: so[k], product: sp[k] };
  return null;
}

// A state of the oracle in `room` with the creature moved to (col, row) on the ground of that cell.
export function placed(w, start, col, row, patch = {}) {
  const o = O.createSim(w.oracle, start);
  const s = o.save();
  const at = (f) => O.FIELDS.indexOf(f);
  s[at('x')] = col * 4096 + 768;
  s[at('y')] = (row + 1) * 4096 - 2560;
  for (const [k, v] of Object.entries(patch)) s[at(k)] = v;
  return Array.from(s);
}

export const BITS = { L: 1, R: 2, U: 4, D: 8, J: 16, X: 32 };
const { L, R, U, D, J, X } = BITS;
export const WALK = [0, L, R, R, R, J, R | J, R | J, L | J, U, D];
export const DASHES = [...WALK, X, R | X, L | X, U | X, D | X, R | U | X, R | D | X, L | U | X, R | J | X];
export const WAVE = [0, J, U, R, R | J, J, 0];
