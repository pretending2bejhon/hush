// Reference for tests/game/run.test.mjs (review R1, MAJOR 1; review R2, MAJOR 4 and MINOR 2): the run's wiring of
// HUSH-SPEC sections 4.5, 8.4, 9.1, 9.2 and 10.6 (GAME1, RN2) on the oracle sim, for the controls only. startRoom
// restarts the engine at a fresh origin with the layers of every earlier room (the gauntlet mapped from its first
// run's bar) and a fresh creature's track; every frame ticks the sim up to one step past the heard time less the
// calibration's display offset, at most 24 steps; after the tick of step s, the track takes the sim's state, a new
// pending layer k calls engine.unlockAt(k, unlockBar(s)) and, in room 11, a new gBeat calls engine.gauntlet(gBeat /
// 4). stepOf stamps an input event with the step heard at its time less the calibration's input lag. Every start
// first flushes the keys (the owner's ruling N-F4 a: play again), so the new run holds exactly the keys that are
// down. The view is the render's and is left out.
import { createSim, FIELDS, gauntletStartBeat, unlockBar } from '../oracle/index.mjs';
import { createTrack, trackStep } from './art.mjs';
import { displaySec, inputLagSec, stepsDue, targetStep } from './driver.mjs';

// A run starts this far ahead of the context time (section 8.4; review R1, MINOR 4: the gauntlet's bake held the main
// thread up to 150 ms, and the transport drops a sixteenth more than 50 ms late, so a lead of 0.1 s lost the run's
// first notes).
export const ORIGIN_LEAD = 0.25;
const PENDING = FIELDS.indexOf('pendingLayer');
const GBEAT = FIELDS.indexOf('gBeat');
const ROOM = FIELDS.indexOf('room');
const TRACK_FIELDS = ['step', 'x', 'y', 'form', 'grounded', 'dead', 'layers'];

export const canonical = (r) => (r <= 1 ? 0 : ((1 << Math.min(r, 11)) - 2) & 0x7fe);

// The sim's state after a tick, as the creature's track reads it (by FIELDS name).
const named = (state) => Object.fromEntries(TRACK_FIELDS.map((f) => [f, state[FIELDS.indexOf(f)]]));

export function createRun({ world, engine, keys }) {
  let sim = null;
  let origin = 0;
  let avOffset = 0;
  let inputBias = 0;
  let lastPending = 0;
  let lastGBeat = 0;
  let track = createTrack();
  return {
    get sim() { return sim; },
    get origin() { return origin; },
    track() { return track; },
    startRoom(room) {
      const ctx = engine.context();
      if (!ctx) return;
      keys.flush();
      origin = ctx.currentTime + ORIGIN_LEAD;
      sim = createSim(world, { room, step: 0, layers: canonical(room) });
      track = createTrack();
      keys.attachSource(null);
      engine.restart(origin, canonical(room), room === 11 ? gauntletStartBeat(0) / 4 : -1);
      const state = sim.save();
      lastPending = state[PENDING];
      lastGBeat = state[GBEAT];
    },
    frame(frameMs) {
      const ctx = engine.context();
      const clock = engine.clock();
      if (!sim || !ctx || !clock || ctx.state !== 'running') return;
      clock.sample();
      if (!clock.valid) return;
      const heard = frameMs / 1000 + clock.offset;
      for (let n = stepsDue(sim.step, targetStep(heard, origin, displaySec(avOffset))); n > 0; n--) {
        const step = sim.step;
        sim.tick(keys.next(step));
        const state = sim.save();
        track = trackStep(track, named(state));
        const pending = state[PENDING];
        if (pending !== 0 && pending !== lastPending) engine.unlockAt(pending, unlockBar(step));
        lastPending = pending;
        const gBeat = state[GBEAT];
        if (state[ROOM] === 11 && gBeat !== lastGBeat) engine.gauntlet(gBeat / 4);
        lastGBeat = gBeat;
      }
    },
    stepOf(eventTimeStampMs) {
      const clock = engine.clock();
      if (!sim || !clock) return -1;
      return Math.floor((eventTimeStampMs / 1000 + clock.offset - origin - inputLagSec(avOffset, inputBias)) * 240);
    },
    setCalibration(a, b) { avOffset = a; inputBias = b; },
    attachInput(source) { keys.attachSource(source); },
  };
}
