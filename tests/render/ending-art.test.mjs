// END1: the ending's art (src/render/ending-art.ts, HUSH-SPEC section 13) equals the reference
// (tests/fixtures/reference/art.mjs): the glimpse, the rise over four bars with the passing ceiling, the card's
// three dots on every beat of the bar, and (review R1, MAJOR 4) the beat of the bar counted from the run's origin
// and every frame of the scene (endingFrame).
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

  // Review R1, MAJOR 4: the card's beat is the music's, counted from the run's origin, never from the ending's own
  // first frame; the scene draws what endingFrame returns.
  it('counts the beat of the bar from the run\'s origin', () => {
    for (const origin of [3.7, 12.25]) {
      for (let heard = origin - 2; heard < origin + 6; heard += 0.031) expect(P.beatOfBar(heard, origin), `${origin} ${heard}`).toBe(REF.beatOfBar(heard, origin));
    }
    expect(P.beatOfBar(5 + REF.BEAT_S * 1.5, 5)).toBe(1);
    expect(P.beatOfBar(5 + REF.BEAT_S * 5.5, 5)).toBe(1);
    expect(P.beatOfBar(5 - REF.BEAT_S * 0.5, 5)).toBe(3);
  });

  it('draws each frame of the ending: the rise, then the card on the music\'s beat', () => {
    const run = { origin: 3.7 };
    for (const t0 of [run.origin + 61.3, run.origin + 64.01]) {
      for (let heard = t0; heard < t0 + REF.RISE_S + 4 * 4 * REF.BEAT_S; heard += 0.0173) {
        const p = P.endingFrame(heard, t0, run);
        const r = REF.endingFrame(heard, t0, run);
        expect(Math.abs(p.glimpseY - r.glimpseY), `${t0} ${heard} glimpseY`).toBeLessThan(1e-6);
        expect(p.card, `${t0} ${heard} card`).toBe(r.card);
        sameShapes(p.shapes, r.shapes, `ending ${t0} ${heard}`);
      }
    }
  });
});
