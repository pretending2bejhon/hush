// RN3: beat entities and the layer's return (src/render/beat-art.ts, HUSH-SPEC sections 10.3, 10.4 and 11)
// equal the reference (tests/fixtures/reference/art.mjs): every entity's look at every step of two of its
// periods, with its layer back and not back; frame after frame of every room with entities through the flash
// limiter (one fresh reference limiter a frame for each side, the levels carried from frame to frame) at two
// cameras; the fill's luminance model; the ring.
import { describe, expect, it } from 'vitest';
import * as REF from '../fixtures/reference/art.mjs';
import { createFlashLimiter } from '../fixtures/reference/flash-limiter.mjs';
import { load } from '../helpers/load.mjs';
import { roomOf, sameShapes, world } from './same.mjs';

const P = await load('HUSH_BEAT_ART_MODULE', new URL('../../src/render/beat-art.ts', import.meta.url));
const W = world();
const ROOMS = [2, 4, 5, 7, 8, 9, 10];
const ALL_LAYERS = 0x7fe;

describe('RN3 beat art', () => {
  it('gives every entity the reference look, layer back or not', () => {
    for (const n of ROOMS) {
      for (const e of roomOf(W, n).entities) {
        const span = Math.ceil((2 * e.period * 720) / 7);
        for (let step = 0; step <= span; step++) {
          for (const layers of [0, ALL_LAYERS]) expect(P.entityLook(e, step, layers), `${n} ${e.letter} ${step} ${layers}`).toEqual(REF.entityLook(e, step, layers));
        }
      }
    }
  });

  it('models the fill\'s luminance as the reference does', () => {
    for (let i = 0; i <= 100; i++) expect(Math.abs(P.levelLum(i / 100) - REF.levelLum(i / 100))).toBeLessThan(1e-9);
    expect(REF.levelLum(1) - REF.levelLum(0)).toBeGreaterThan(0.1);
  });

  it('draws frame after frame through the limiter as the reference does', () => {
    for (const n of ROOMS) {
      const room = roomOf(W, n);
      const camMax = Math.round(Math.max(room.W * 16 - 512, 0) * 2.5);
      for (const cam of [0, camMax]) {
        let pl = [];
        let rl = [];
        for (let step = 0; step < 3000; step += 4) {
          const pf = createFlashLimiter(1280, 720);
          const rf = createFlashLimiter(1280, 720);
          pf.beginFrame();
          rf.beginFrame();
          const layers = step < 1500 ? ALL_LAYERS : 0;
          const p = P.beatShapes(room, step, layers, cam, pl, pf);
          const r = REF.beatShapes(room, step, layers, cam, rl, rf);
          sameShapes(p.shapes, r.shapes, `room ${n} cam ${cam} step ${step}`);
          expect(p.levels, `room ${n} cam ${cam} step ${step}: levels`).toEqual(r.levels);
          pl = p.levels;
          rl = r.levels;
        }
      }
    }
  });

  it('expands the ring over one bar from the step a layer came back', () => {
    const t = { ...REF.createTrack(), ringAt: 1000 };
    for (let step = 990; step < 1500; step += 1) sameShapes(P.ringShapes(t, step, 300, 600), REF.ringShapes(t, step, 300, 600), `ring ${step}`);
  });
});
