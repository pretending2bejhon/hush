// RN4 (review R1, MAJOR 3): the play scene's frame (src/render/play-frame.ts, HUSH-SPEC section 10.6) equals the
// reference's playFrame (tests/fixtures/reference/art.mjs): frame after frame of every witness run, through the
// flash limiter (one fresh reference limiter a frame for each side, the levels carried from frame to frame), at
// three interpolation points, the camera, the beat entities with the layer's ring, the creature and the dust, all
// read from the sim it is given. The scene draws what playFrame returns and nothing else, so the beat binding (the
// hazards drawn at the step the sim collides on) lives inside this tested function.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as REF from '../fixtures/reference/art.mjs';
import { createFlashLimiter } from '../fixtures/reference/flash-limiter.mjs';
import * as O from '../fixtures/oracle/index.mjs';
import { load } from '../helpers/load.mjs';
import { ALL_ROOMS, roomOf, sameShapes, world } from './same.mjs';
import { canonicalLayers, readWitness } from '../../tools/replay.mjs';

const P = await load('HUSH_PLAY_FRAME_MODULE', new URL('../../src/render/play-frame.ts', import.meta.url));
const W = world();
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALPHAS = [0, 0.37, 1];

// The witness's bits at a step.
function bitsAt(changes, step) {
  let bits = 0;
  for (const [s, b] of changes) if (s <= step) bits = b;
  return bits;
}

// Plays room n's witness on the oracle from its entrance and compares both frames every `every` steps; returns
// the number of frames compared.
function compareRun(n, every) {
  const wit = readWitness(path.join(REPO, 'replays', `${ALL_ROOMS[n - 1]}.json`));
  const room = roomOf(W, n);
  const sim = O.createSim(W, { room: n, step: 0, layers: canonicalLayers(n), stopAtClear: true });
  const field = REF.moteField(room);
  const named = (saved) => Object.fromEntries(O.FIELDS.map((f, k) => [f, saved[k]]));
  let track = REF.createTrack();
  let pl = [];
  let rl = [];
  let frames = 0;
  for (let i = 0; i < wit.end && !sim.status().cleared; i++) {
    const before = sim.status();
    sim.tick(bitsAt(wit.changes, i));
    const after = sim.status();
    track = REF.trackStep(track, named(sim.save()));
    if (i % every) continue;
    const view = { prevX: before.x, prevY: before.y, x: after.x, y: after.y, alpha: ALPHAS[frames % ALPHAS.length] };
    const pf = createFlashLimiter(1280, 720);
    const rf = createFlashLimiter(1280, 720);
    pf.beginFrame();
    rf.beginFrame();
    const p = P.playFrame({ room, sim, view, track, field, levels: pl, limiter: pf });
    const r = REF.playFrame({ room, sim, view, track, field, levels: rl, limiter: rf });
    const at = `room ${n} step ${sim.step}`;
    expect(p.camPx, `${at}: camera`).toBe(r.camPx);
    sameShapes(p.beat, r.beat, `${at}: beat`);
    sameShapes(p.creature, r.creature, `${at}: creature`);
    sameShapes(p.dust, r.dust, `${at}: dust`);
    expect(p.levels, `${at}: levels`).toEqual(r.levels);
    pl = p.levels;
    rl = r.levels;
    frames += 1;
  }
  return frames;
}

// Review R2, MINOR 2: plays room n's witness on the oracle and on past the clear, into the next room, until the layer
// the clear returns has come back and its ring has run out, comparing both frames every `every` steps, the room
// and the dust following the sim and the levels starting afresh in each room, as the scene does. Returns the number
// of compared frames that drew the ring.
function compareReturn(n, every) {
  const wit = readWitness(path.join(REPO, 'replays', `${ALL_ROOMS[n - 1]}.json`));
  const sim = O.createSim(W, { room: n, step: 0, layers: canonicalLayers(n) });
  const named = (saved) => Object.fromEntries(O.FIELDS.map((f, k) => [f, saved[k]]));
  let track = REF.createTrack();
  let roomNo = 0;
  let room = null;
  let field = [];
  let pl = [];
  let rl = [];
  let ringFrames = 0;
  let clearedAt = -1;
  for (let i = 0; clearedAt < 0 || i < O.nextBarStep(clearedAt) + REF.RING_STEPS + 24; i++) {
    if (i > wit.end + 2400) throw new Error(`room ${n}: no clear`);
    const before = sim.status();
    sim.tick(before.room === n && !before.cleared ? bitsAt(wit.changes, i) : 0);
    const after = sim.status();
    if (clearedAt < 0 && after.room !== n) clearedAt = i;
    track = REF.trackStep(track, named(sim.save()));
    if (after.room !== roomNo) {
      roomNo = after.room;
      room = roomOf(W, roomNo);
      field = REF.moteField(room);
      pl = [];
      rl = [];
    }
    if (i % every) continue;
    const view = { prevX: before.x, prevY: before.y, x: after.x, y: after.y, alpha: ALPHAS[i % ALPHAS.length] };
    const pf = createFlashLimiter(1280, 720);
    const rf = createFlashLimiter(1280, 720);
    pf.beginFrame();
    rf.beginFrame();
    const p = P.playFrame({ room, sim, view, track, field, levels: pl, limiter: pf });
    const r = REF.playFrame({ room, sim, view, track, field, levels: rl, limiter: rf });
    const at = `room ${n} step ${sim.step}`;
    expect(p.camPx, `${at}: camera`).toBe(r.camPx);
    sameShapes(p.beat, r.beat, `${at}: beat`);
    sameShapes(p.creature, r.creature, `${at}: creature`);
    sameShapes(p.dust, r.dust, `${at}: dust`);
    expect(p.levels, `${at}: levels`).toEqual(r.levels);
    pl = p.levels;
    rl = r.levels;
    if (r.beat.some((s) => s.k === 'ring')) ringFrames += 1;
  }
  return ringFrames;
}

describe('RN4 the play scene\'s frame', () => {
  it('draws every frame of the rooms\' witness runs as the reference does', () => {
    for (let n = 1; n <= 10; n++) expect(compareRun(n, 2), `room ${n}`).toBeGreaterThan(300);
  });

  it('draws the layer\'s ring as the reference does, past a room\'s clear until the ring has run out', () => {
    for (const n of [1, 6]) expect(compareReturn(n, 3), `room ${n}`).toBeGreaterThan(100);
  });

  it('draws the gauntlet\'s witness run as the reference does', () => {
    expect(compareRun(11, 5)).toBeGreaterThan(2000);
  });
});
