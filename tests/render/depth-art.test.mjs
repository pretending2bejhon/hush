// RN4: depth (src/render/depth-art.ts, HUSH-SPEC section 10.4) equals the reference
// (tests/fixtures/reference/art.mjs): the xorshift32 sequence, the four bands of every room, the fog, the
// vignette, and the dust of every room over a run's worth of steps.
import { describe, expect, it } from 'vitest';
import * as REF from '../fixtures/reference/art.mjs';
import { load } from '../helpers/load.mjs';
import { ALL_ROOMS, roomOf, sameShapes, world } from './same.mjs';

const P = await load('HUSH_DEPTH_ART_MODULE', new URL('../../src/render/depth-art.ts', import.meta.url));
const W = world();
const rooms = ALL_ROOMS.map((_, i) => roomOf(W, i + 1));

describe('RN4 depth', () => {
  it('steps xorshift32 as the reference does', () => {
    let a = 1;
    let b = 1;
    for (let i = 0; i < 2000; i++) {
      a = P.xorshift32(a);
      b = REF.xorshift32(b);
      expect(a).toBe(b);
    }
    expect(REF.xorshift32(1)).toBe(270369);
  });

  it('draws the four bands of every room', () => {
    for (const room of rooms) {
      const p = P.depthBands(room);
      const r = REF.depthBands(room);
      expect(p.length).toBe(4);
      r.forEach((band, i) => {
        expect({ factor: p[i].factor, w: p[i].w, h: p[i].h }, `${room.name} band ${i}`).toEqual({ factor: band.factor, w: band.w, h: band.h });
        sameShapes(p[i].shapes, band.shapes, `${room.name} band ${i}`);
      });
    }
  });

  it('draws the fog and the vignette', () => {
    sameShapes(P.fogShapes(), REF.fogShapes(), 'fog');
    sameShapes(P.vignetteShapes(), REF.vignetteShapes(), 'vignette');
  });

  it('drifts the dust of every room', () => {
    for (const room of rooms) {
      const pf = P.moteField(room);
      const rf = REF.moteField(room);
      expect(pf).toEqual(rf);
      for (let step = 0; step < 30000; step += 997) sameShapes(P.moteShapes(pf, step), REF.moteShapes(rf, step), `${room.name} motes ${step}`);
    }
  });
});
