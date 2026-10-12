// GAME1 (X7, the clear-time half in the run; review R1, MAJOR 1): the run's wiring (src/game/run.ts) under a fake
// engine, keys and clock, driven by the witnesses. A room cleared by the tick of step s returns its layer through
// engine.unlockAt(k, unlockBar(s)), once, right after that tick; startRoom restarts the engine at the run's
// origin, 0.25 s past the context time (MINOR 4), with the layers of every earlier room (the gauntlet mapped from
// its first run's bar); in the gauntlet every new gBeat (the entry from room 10, each respawn) maps the track
// through engine.gauntlet(gBeat / 4).
// HUSH_RUN_MODULE points the test at another run module (the controls: the reference passes, a broken copy fails).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';
import * as O from '../fixtures/oracle/index.mjs';
import { ALL_ROOMS, roomFiles } from '../sim/compare.mjs';
import { readWitness } from '../../tools/replay.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = await load('HUSH_RUN_MODULE', new URL('../../src/game/run.ts', import.meta.url));
const world = O.compileWorld(roomFiles(ALL_ROOMS));
const GBEAT = O.FIELDS.indexOf('gBeat');
const ROOM = O.FIELDS.indexOf('room');
const canonical = (r) => (r <= 1 ? 0 : ((1 << Math.min(r, 11)) - 2) & 0x7fe);
const witness = (k) => readWitness(path.join(REPO, 'replays', `${ALL_ROOMS[k - 1]}.json`));

// The probe's witness source (src/probe/api.ts play): the witness's bits by step while the room is played, then 0.
function source(sim, room, changes) {
  let k = 0;
  let bits = 0;
  return {
    next(step) {
      const st = sim().status();
      if (st.room !== room || st.cleared > 0 || st.finished) return 0;
      while (k < changes.length && changes[k][0] <= step) {
        bits = changes[k][1];
        k += 1;
      }
      return bits;
    },
  };
}

// A run on a fake engine whose context runs and whose device-clock line sits at offset 0, so the heard time is
// the frame time; every engine call is recorded with the sim's step at the call.
function harness() {
  const calls = [];
  const ctx = { state: 'running', currentTime: 5 };
  const clock = { offset: 0, valid: true, resyncs: 0, sample: () => clock };
  let attached = null;
  let run = null;
  const engine = {
    context: () => ctx,
    clock: () => clock,
    restart: (origin, layers, gauntletStartBar) => calls.push(['restart', origin, layers, gauntletStartBar]),
    unlockAt: (layer, bar) => calls.push(['unlockAt', layer, bar, run.sim.step]),
    gauntlet: (bar) => calls.push(['gauntlet', bar, run.sim.step]),
  };
  const keys = { next: (s) => (attached ? attached.next(s) : 0), attachSource: (s) => { attached = s; } };
  run = R.createRun({ world, engine, keys });
  // Frames that bring the sim to step `to`: each frame's heard time lies half a step before its target, so the
  // driver ticks up to it (one step past the heard time), at most 24 steps a frame.
  const advance = (to) => {
    while (run.sim.step < to) run.frame((run.origin + (Math.min(run.sim.step + 24, to) - 0.5) / 240) * 1000);
  };
  return { calls, run, advance };
}

// The oracle's own run of the witness from the room's entrance: the step whose tick clears the room.
function clearStep(k) {
  const w = witness(k);
  const o = O.createSim(world, { room: k, step: 0, layers: canonical(k), stopAtClear: true });
  const src = source(() => o, k, w.changes);
  for (let s = 0; s < w.end + 240; s++) {
    o.tick(src.next(s));
    if (o.status().cleared > 0) return s;
  }
  throw new Error(`the witness of room ${k} does not clear it on the oracle`);
}

describe('GAME1 the run returns a layer on the bar line of its clear', () => {
  for (let k = 1; k <= 10; k++) {
    it(`room ${k}: unlockAt(${k}, unlockBar(clear step)) once, right after the clearing tick`, () => {
      const s = clearStep(k);
      const h = harness();
      h.run.startRoom(k);
      expect(h.calls).toEqual([['restart', h.run.origin, canonical(k), -1]]);
      h.run.attachInput(source(() => h.run.sim, k, witness(k).changes));
      h.advance(s);
      expect(h.calls.filter((c) => c[0] === 'unlockAt')).toEqual([]);
      // Well past the bar line, in the next room standing still: exactly the one call.
      h.advance(O.nextBarStep(s) + 480);
      expect(h.calls.filter((c) => c[0] === 'unlockAt')).toEqual([['unlockAt', k, O.unlockBar(s), s + 1]]);
    });
  }
});

describe('GAME1 the run starts ahead of the heard time', () => {
  // Review R1, MINOR 4: a room's bake (up to 150 ms for the gauntlet) ends before the run's first sixteenth.
  it('puts step 0 at 0.25 s past the context time when a run starts', () => {
    for (const room of [1, 11]) {
      const h = harness();
      h.run.startRoom(room);
      expect(h.run.origin).toBeCloseTo(5 + 0.25, 12);
      expect(h.calls[0][1]).toBe(h.run.origin);
    }
  });
});

describe('GAME1 the run maps the gauntlet on every run start', () => {
  it('restarts room 11 with the gauntlet mapped from its first run bar', () => {
    const h = harness();
    h.run.startRoom(11);
    expect(h.calls).toEqual([['restart', h.run.origin, canonical(11), O.gauntletStartBeat(0) / 4]]);
  });

  it('maps gBeat / 4 on the entry from room 10 and on every respawn in the gauntlet', () => {
    const w = witness(10);
    const end = clearStep(10) + 1 + 240 * 20;
    // The oracle fed the same inputs: every gBeat the gauntlet takes after the entry, with the step it was set by.
    const o = O.createSim(world, { room: 10, step: 0, layers: canonical(10) });
    const src = source(() => o, 10, w.changes);
    const want = [];
    let last = o.save()[GBEAT];
    for (let s = 0; s < end; s++) {
      o.tick(src.next(s));
      const st = o.save();
      if (st[ROOM] === 11 && st[GBEAT] !== last) want.push(['gauntlet', st[GBEAT] / 4, s + 1]);
      last = st[GBEAT];
    }
    expect(want.length).toBeGreaterThanOrEqual(3);
    const h = harness();
    h.run.startRoom(10);
    h.run.attachInput(source(() => h.run.sim, 10, w.changes));
    h.advance(end);
    expect(h.calls.filter((c) => c[0] === 'gauntlet')).toEqual(want);
  });
});
