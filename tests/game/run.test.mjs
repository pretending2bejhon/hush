// GAME1 (X7, the clear-time half in the run; review R1, MAJOR 1): the run's wiring (src/game/run.ts) under a fake
// engine, keys and clock, driven by the witnesses. A room cleared by the tick of step s returns its layer through
// engine.unlockAt(k, unlockBar(s)), once, right after that tick; startRoom restarts the engine at the run's
// origin, 0.25 s past the context time (MINOR 4), with the layers of every earlier room (the gauntlet mapped from
// its first run's bar); in the gauntlet every new gBeat (the entry from room 10, each respawn) maps the track
// through engine.gauntlet(gBeat / 4).
// Review R2: the calibration the run is given moves the sim's target by displaySec(avOffset) and an input event's
// step by inputLagSec(avOffset, inputBias) (section 9; MAJOR 4), and the run steps the creature's track after every
// tick, as RN2's trackStep over the sim's state (section 10.6; MINOR 2). Review R4 (MINOR 2): a frame far behind the
// heard time ticks at most 24 steps (section 9.1), the cap pinned in the run itself, not only in driver.ts.
// The owner's ruling N-F4 a (2026-10-19): every start flushes the keys, so a run started again from the ending's card
// holds exactly the keys that are down.
// HUSH_RUN_MODULE points the test at another run module (the controls: the reference passes, a broken copy fails).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';
import * as O from '../fixtures/oracle/index.mjs';
import * as ART from '../fixtures/reference/art.mjs';
import * as D from '../fixtures/reference/driver.mjs';
import * as KREF from '../fixtures/reference/keys.mjs';
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

// A run on a fake engine whose context runs and whose device-clock line sits at `offset` (0: the heard time is the
// frame time); every engine call is recorded with the sim's step at the call.
function harness({ offset = 0 } = {}) {
  const calls = [];
  const ctx = { state: 'running', currentTime: 5 };
  const clock = { offset, valid: true, resyncs: 0, sample: () => clock };
  let attached = null;
  let run = null;
  const engine = {
    context: () => ctx,
    clock: () => clock,
    restart: (origin, layers, gauntletStartBar) => calls.push(['restart', origin, layers, gauntletStartBar]),
    unlockAt: (layer, bar) => calls.push(['unlockAt', layer, bar, run.sim.step]),
    gauntlet: (bar) => calls.push(['gauntlet', bar, run.sim.step]),
  };
  const keys = { next: (s) => (attached ? attached.next(s) : 0), attachSource: (s) => { attached = s; }, flush: () => {} };
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

  // Review R7 (MINOR 1): the clear on the bar line's edge. Room 1's witness, delayed D steps, clears on the tick of
  // step 1954: unlockBar(1954) is 5 and unlockBar(1955) is 6, so the run must ask for bar 5, where the sim returns it.
  // Room 1 has no beat entity, so D comes from the witness's own clearing tick, whatever witness the solver found
  // (amended for the owner's ruling N-F2 a).
  it('room 1 cleared on the bar line\'s edge step: unlockAt(1, 5), the clearing tick\'s bar', () => {
    const D = 1954 - clearStep(1);
    const changes = witness(1).changes.map(([s, b]) => [s + D, b]);
    const o = O.createSim(world, { room: 1, step: 0, layers: canonical(1), stopAtClear: true });
    const src = source(() => o, 1, changes);
    let s = -1;
    for (let i = 0; i < 4000 && s < 0; i++) {
      o.tick(src.next(i));
      if (o.status().cleared > 0) s = i;
    }
    expect(s).toBe(1954);
    expect([O.unlockBar(s), O.unlockBar(s + 1)]).toEqual([5, 6]);
    const h = harness();
    h.run.startRoom(1);
    h.run.attachInput(source(() => h.run.sim, 1, changes));
    h.advance(O.nextBarStep(s) + 480);
    expect(h.calls.filter((c) => c[0] === 'unlockAt')).toEqual([['unlockAt', 1, 5, s + 1]]);
  });
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

// The calibrations the tests use: none, the probe's key check (MAJOR 5), the tapped run's, a negative offset, and two
// that the clamps of section 9.1 hold at 0.15 s and 0.
const CALIBRATIONS = [[0, 0], [100, -60], [15, 25], [-80, 30], [400, 0], [-50, 0]];

describe('GAME1 the run follows its calibration (review R2, MAJOR 4)', () => {
  it('ends every frame one step past the heard time less displaySec(avOffset)', () => {
    for (const [av, bias] of CALIBRATIONS) {
      const h = harness({ offset: 0.0375 });
      h.run.setCalibration(av, bias);
      h.run.startRoom(1);
      for (const sec of [0.75, 2, 3.5]) {
        const ms = (h.run.origin + sec) * 1000;
        for (let i = 0; i < 40; i++) h.run.frame(ms);
        expect(h.run.sim.step, `avOffset ${av} inputBias ${bias} at ${sec} s`).toBe(D.targetStep(ms / 1000 + 0.0375, h.run.origin, D.displaySec(av)));
      }
    }
  });

  it('stamps an input event with the step heard at its time less inputLagSec(avOffset, inputBias)', () => {
    for (const [av, bias] of CALIBRATIONS) {
      const h = harness({ offset: 0.0375 });
      h.run.setCalibration(av, bias);
      h.run.startRoom(1);
      for (const sec of [0.5, 1.25, 3]) {
        const ms = (h.run.origin + sec) * 1000 + 3.3;
        expect(h.run.stepOf(ms), `avOffset ${av} inputBias ${bias} at ${sec} s`).toBe(Math.floor((ms / 1000 + 0.0375 - h.run.origin - D.inputLagSec(av, bias)) * 240));
      }
    }
  });
});

describe('GAME1 the run catches up at most 24 steps a frame (review R4, MINOR 2)', () => {
  it('ticks exactly MAX_STEPS_PER_FRAME steps in a frame heard 100 steps past the sim, and as many in the next', () => {
    const h = harness();
    h.run.startRoom(1);
    h.advance(120);
    expect(h.run.sim.step).toBe(120);
    // After a stall: one step past the heard time would be step 220.
    const ms = (h.run.origin + (120 + 100 - 0.5) / 240) * 1000;
    h.run.frame(ms);
    expect(h.run.sim.step).toBe(120 + D.MAX_STEPS_PER_FRAME);
    h.run.frame(ms);
    expect(h.run.sim.step).toBe(120 + 2 * D.MAX_STEPS_PER_FRAME);
    for (let i = 0; i < 4; i++) h.run.frame(ms);
    expect(h.run.sim.step).toBe(220);
  });
});

// The sim's state after a tick, as the creature's track reads it (by FIELDS name).
const named = (state) => Object.fromEntries(['step', 'x', 'y', 'form', 'grounded', 'dead', 'layers'].map((f) => [f, state[O.FIELDS.indexOf(f)]]));

describe('GAME1 the run keeps the creature\'s track (review R2, MINOR 2)', () => {
  it('steps the track after every tick, as trackStep over the sim\'s states, through landings, the wave and a layer\'s return', () => {
    for (const k of [6, 1]) {
      const w = witness(k);
      const end = O.nextBarStep(clearStep(k)) + 240;
      const o = O.createSim(world, { room: k, step: 0, layers: canonical(k) });
      const src = source(() => o, k, w.changes);
      const want = [ART.createTrack()];
      for (let s = 0; s < end; s++) {
        o.tick(src.next(s));
        want.push(ART.trackStep(want[s], named(o.save())));
      }
      const h = harness();
      h.run.startRoom(k);
      expect(h.run.track(), `room ${k} at its start`).toEqual(want[0]);
      h.run.attachInput(source(() => h.run.sim, k, w.changes));
      for (let to = 120; to <= end; to += 120) {
        h.advance(to);
        expect(h.run.track(), `room ${k} at step ${to}`).toEqual(want[to]);
      }
      expect(want[end].ringAt, `room ${k}: the layer's return was stepped`).toBeGreaterThan(0);
    }
  });
});

// The owner's ruling N-F4 a (2026-10-19): any key at the ending's card plays again, a new run at room 1 while the keys
// still hold events stamped with the finished run's steps. Every start flushes them first, so the new run holds
// exactly the keys that are down on its first step, never a key the run before stamped thousands of steps ahead.
class Key extends Event {
  constructor(type, code, t) {
    super(type, { cancelable: true });
    Object.defineProperties(this, { code: { value: code }, repeat: { value: false }, timeStamp: { value: t } });
  }
}

describe('GAME1 the run starts again holding exactly the keys that are down (the owner\'s ruling N-F4 a)', () => {
  it('flushes the keys on every start: a key still down is held on the first step, a key pressed and released is not', () => {
    const target = new EventTarget();
    const ctx = { state: 'running', currentTime: 5 };
    const clock = { offset: 0, valid: true, resyncs: 0, sample: () => clock };
    const engine = { context: () => ctx, clock: () => clock, restart: () => {}, unlockAt: () => {}, gauntlet: () => {} };
    let run = null;
    const keys = KREF.createKeys({ target, stepOf: (t) => run.stepOf(t) });
    run = R.createRun({ world, engine, keys });
    const send = (type, code, sec) => target.dispatchEvent(new Key(type, code, (run.origin + sec) * 1000));
    run.startRoom(1);
    // A minute into the first run: Space tapped, then ArrowRight held, each stamped about 14,400 steps in.
    send('keydown', 'Space', 60);
    send('keyup', 'Space', 60.05);
    send('keydown', 'ArrowRight', 60.1);
    ctx.currentTime = run.origin + 60.2;
    run.startRoom(1);
    run.frame((run.origin + 0.5 / 240) * 1000);
    expect(run.sim.step).toBe(1);
    expect(run.sim.save()[O.FIELDS.indexOf('prevIn')]).toBe(2);
  });
});
