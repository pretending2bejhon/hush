// END1: the ending's art (src/render/ending-art.ts, HUSH-SPEC section 13) equals the reference
// (tests/fixtures/reference/art.mjs): the glimpse, the rise over four bars with the passing ceiling, and the
// card's three dots on every beat of the bar.
import { describe, expect, it } from 'vitest';
import * as REF from '../fixtures/reference/art.mjs';
import { load } from '../helpers/load.mjs';
import { sameShapes } from './same.mjs';

const P = await load('HUSH_ENDING_ART_MODULE', new URL('../../src/render/ending-art.ts', import.meta.url));

describe('END1 ending art', () => {
  it('draws the glimpse', () => {
    sameShapes(P.glimpseShapes(), REF.glimpseShapes(), 'glimpse');
  });

  it('rises over four bars', () => {
    expect(P.RISE_S).toBeCloseTo(REF.RISE_S, 9);
    for (let sec = -0.5; sec <= 8; sec += 0.05) {
      const p = P.riseAt(sec);
      const r = REF.riseAt(sec);
      for (const key of ['u', 'ceilingY', 'glimpseY']) expect(Math.abs(p[key] - r[key]), `${sec} ${key}`).toBeLessThan(1e-6);
      sameShapes(P.ceilingShapes(r.ceilingY), REF.ceilingShapes(r.ceilingY), `ceiling ${sec}`);
    }
  });

  it('lights one dot a beat and rests on the fourth', () => {
    for (let b = 0; b < 4; b++) sameShapes(P.cardShapes(b), REF.cardShapes(b), `card ${b}`);
  });
});
