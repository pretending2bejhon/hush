// The ending's art (spec sections 10.6 and 13), ported from tests/fixtures/reference/art.mjs: the glimpse of the next
// area, the rise over four bars with the gauntlet's ceiling passing, the card of three dots, and each frame of the
// scene with the card on the music's beat, counted from the run's origin.
import { COLOR, LINE_PX, ZOOM } from './art.ts';
import type { Shape } from './art.ts';
import { makeRng } from './depth-art.ts';

type Range = readonly [number, number];

const between = (rng: () => number, [lo, hi]: Range): number => lo + (hi - lo) * rng();

export const BEAT_S = 60 / 140;
export const RISE_S = 16 * BEAT_S;

// The glimpse of the next area, baked once, 1280 by 720: seven spires on a ground line from a PRNG seeded
// with 12, and one warm light in the tallest spire, with two soft halos.
export function glimpseShapes(): Shape[] {
  const rng = makeRng(12);
  const out: Shape[] = [];
  let tallest: { x: number; h: number } | null = null;
  for (let i = 0; i < 7; i++) {
    const w = between(rng, [30, 60]);
    const h = between(rng, [120, 300]);
    const x = 120 + i * 170 + between(rng, [-30, 30]);
    const shoulder = 720 - h * 0.45;
    out.push({ k: 'rect', x: x - w / 2, y: shoulder, w, h: h * 0.45, c: COLOR.GLIMPSE, a: 1 });
    out.push({ k: 'tri', p: [x - w / 2, shoulder, x + w / 2, shoulder, x, 720 - h], c: COLOR.GLIMPSE, a: 1 });
    if (!tallest || h > tallest.h) tallest = { x, h };
  }
  out.push({ k: 'rect', x: 0, y: 700, w: 1280, h: 20, c: COLOR.GLIMPSE, a: 1 });
  if (tallest) {
    const ly = 720 - tallest.h * 0.35;
    for (const [r, a] of [[24, 0.08], [12, 0.2], [5, 1]] as const) out.push({ k: 'ellipse', x: tallest.x, y: ly, rx: r, ry: r, c: COLOR.LIGHT, a });
  }
  return out;
}

export interface Rise {
  u: number;
  ceilingY: number;
  glimpseY: number;
}

// The rise, `sec` seconds after the ending began (heard time): over RISE_S (4 bars) a smoothstep e carries
// the gauntlet's ceiling down and out of the view while the glimpse rises to rest at y 0.
export function riseAt(sec: number): Rise {
  const u = Math.min(Math.max(sec / RISE_S, 0), 1);
  const e = u * u * (3 - 2 * u);
  return { u, ceilingY: -120 + 840 * e, glimpseY: 720 * (1 - e) };
}

// The gauntlet's ceiling as it passes: a band of tile 120 px tall with its edge along the bottom.
export function ceilingShapes(y: number): Shape[] {
  return [
    { k: 'rect', x: 0, y, w: 1280, h: 120, c: COLOR.TILE, a: 1 },
    { k: 'rect', x: 0, y: y + 120 - LINE_PX, w: 1280, h: LINE_PX, c: COLOR.EDGE, a: 1 },
  ];
}

// The card: three dots 6 world px across, 24 world px apart, in the centre; dot i at full alpha on beat i
// of the bar (0 to 2), every dot at 0.3 otherwise (beat 3 rests all three).
export function cardShapes(beatOfBar: number): Shape[] {
  return [0, 1, 2].map((i): Shape => ({ k: 'ellipse', x: 640 + (i - 1) * 24 * ZOOM, y: 360, rx: 3 * ZOOM, ry: 3 * ZOOM, c: COLOR.SHELL, a: beatOfBar === i ? 1 : 0.3 }));
}

// The beat of the bar heard at context time `heard` (0 to 3): the music's bars begin on the run's origin, the
// context time of sim step 0, every 4 beats (review R1, MAJOR 4).
export function beatOfBar(heard: number, origin: number): number {
  return ((Math.floor((heard - origin) / BEAT_S) % 4) + 4) % 4;
}

// One frame of the scene `ending` at heard time `heard` (review R1, MAJOR 4): t0 is the heard time of its first
// frame and run the run, whose origin carries the music's bars. Returns the glimpse image's y, the shapes its
// Graphics draws (the passing ceiling during the rise, then the card on the beat) and whether the card is up (the
// moment of the ?playtest line).
export function endingFrame(heard: number, t0: number, run: { readonly origin: number }): { glimpseY: number; card: boolean; shapes: Shape[] } {
  const r = riseAt(heard - t0);
  if (r.u < 1) return { glimpseY: r.glimpseY, card: false, shapes: ceilingShapes(r.ceilingY) };
  return { glimpseY: r.glimpseY, card: true, shapes: cardShapes(beatOfBar(heard, run.origin)) };
}
