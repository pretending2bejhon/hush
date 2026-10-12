// Depth: the parallax bands, the fog, the vignette and the dust (spec sections 10.4 and 10.6), ported from
// tests/fixtures/reference/art.mjs. Every procedural silhouette comes from a seeded xorshift32 PRNG.
import type { Room } from '../sim/types.ts';
import { COLOR, VIEW_H, VIEW_W, ZOOM } from './art.ts';
import type { Shape } from './art.ts';

type Range = readonly [number, number];
interface BandSize {
  R: Range;
  T: Range;
  legs: Range;
  PW: Range;
  PH: Range;
  RL: Range;
  G: Range;
}

// The four bands, far to near: scroll factor, colour and the ranges their silhouettes are drawn from.
const BANDS: readonly { factor: number; color: number; z: BandSize }[] = [
  { factor: 0.15, color: COLOR.FAR, z: { R: [40, 70], T: [8, 12], legs: [60, 120], PW: [10, 18], PH: [120, 200], RL: [20, 50], G: [10, 40] } },
  { factor: 0.35, color: COLOR.FAR2, z: { R: [30, 55], T: [7, 10], legs: [50, 100], PW: [9, 15], PH: [100, 170], RL: [30, 70], G: [12, 44] } },
  { factor: 0.6, color: COLOR.MID, z: { R: [25, 45], T: [6, 9], legs: [40, 80], PW: [8, 13], PH: [80, 140], RL: [40, 90], G: [14, 48] } },
  { factor: 0.85, color: COLOR.NEAR, z: { R: [20, 35], T: [5, 8], legs: [30, 60], PW: [7, 11], PH: [60, 110], RL: [50, 110], G: [16, 56] } },
];
export const BAND_FACTORS: readonly number[] = BANDS.map((band) => band.factor);
export const BAND_COLORS: readonly number[] = BANDS.map((band) => band.color);
export const FOG_STRIPS = 24;
export const FOG_ALPHA = 0.35;
export const VIGNETTE_CELL = 20;
export const VIGNETTE_ALPHA = 0.45;
export const MOTES = 60;

export function xorshift32(x: number): number {
  let s = x;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return s >>> 0;
}

// A PRNG over xorshift32: each call advances the state and returns it divided by 2^32.
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = xorshift32(s);
    return s / 4294967296;
  };
}

const between = (rng: () => number, [lo, hi]: Range): number => lo + (hi - lo) * rng();
export const roomNumber = (room: Pick<Room, 'name'>): number => parseInt(room.name, 10);

const widthAt = (room: Pick<Room, 'W'>, factor: number): number => Math.ceil(VIEW_W + factor * Math.max(room.W * 16 - VIEW_W, 0));

// A band's width in world px: the view plus its factor's share of the room's scroll.
export function bandWidth(room: Pick<Room, 'W'>, b: number): number {
  return widthAt(room, BAND_FACTORS[b] ?? 0);
}

export interface Band {
  factor: number;
  w: number;
  h: number;
  shapes: Shape[];
}

// The four bands, far to near, each in its own world px (x 0 to its width, y 0 to 288), drawn by one PRNG
// seeded with the room number: arches (draw under 0.4), pillars with a capital (under 0.75) and roots
// hanging from the top, left to right with gaps.
export function depthBands(room: Pick<Room, 'name' | 'W'>): Band[] {
  const rng = makeRng(roomNumber(room));
  return BANDS.map(({ factor, color: c, z }) => {
    const w = widthAt(room, factor);
    const shapes: Shape[] = [];
    let x = between(rng, [0, z.G[1]]);
    while (x < w) {
      const kind = rng();
      if (kind < 0.4) {
        const R = between(rng, z.R);
        const T = between(rng, z.T);
        const cy = VIEW_H - between(rng, z.legs);
        const cx = x + R;
        const p: number[] = [x, VIEW_H];
        for (let i = 0; i <= 12; i++) {
          const ang = Math.PI + (i * Math.PI) / 12;
          p.push(cx + R * Math.cos(ang), cy + R * Math.sin(ang));
        }
        p.push(x + 2 * R, VIEW_H, x + 2 * R - T, VIEW_H);
        for (let i = 12; i >= 0; i--) {
          const ang = Math.PI + (i * Math.PI) / 12;
          p.push(cx + (R - T) * Math.cos(ang), cy + (R - T) * Math.sin(ang));
        }
        p.push(x + T, VIEW_H);
        shapes.push({ k: 'poly', p, c, a: 1 });
        x += 2 * R;
      } else if (kind < 0.75) {
        const pw = between(rng, z.PW);
        const ph = between(rng, z.PH);
        shapes.push({ k: 'rect', x, y: VIEW_H - ph, w: pw, h: ph, c, a: 1 });
        shapes.push({ k: 'rect', x: x - 2, y: VIEW_H - ph - 4, w: pw + 4, h: 4, c, a: 1 });
        x += pw;
      } else {
        const rw = between(rng, [3, 8]);
        const rl = between(rng, z.RL);
        const sway = between(rng, [-6, 6]);
        shapes.push({ k: 'tri', p: [x, 0, x + rw, 0, x + rw / 2 + sway, rl], c, a: 1 });
        x += rw;
      }
      x += between(rng, z.G);
    }
    return { factor, w, h: VIEW_H, shapes };
  });
}

// The fog over the bands, under the room: FOG_STRIPS strips of the far fog colour, screen-fixed, alpha rising
// from the top to FOG_ALPHA at the bottom.
export function fogShapes(): Shape[] {
  const h = 720 / FOG_STRIPS;
  return Array.from({ length: FOG_STRIPS }, (_, i): Shape => ({ k: 'rect', x: 0, y: i * h, w: 1280, h, c: COLOR.FAR, a: (FOG_ALPHA * (i + 0.5)) / FOG_STRIPS }));
}

// The vignette over everything: cells of VIGNETTE_CELL px darkened by a smoothstep of their distance from the
// centre (0 inside 0.85 of the half-axes, VIGNETTE_ALPHA in the corners); cells at 0 are left out.
export function vignetteShapes(): Shape[] {
  const out: Shape[] = [];
  const half = VIGNETTE_CELL / 2;
  for (let y = 0; y < 720; y += VIGNETTE_CELL) {
    for (let x = 0; x < 1280; x += VIGNETTE_CELL) {
      const dx = (x + half - 640) / 640;
      const dy = (y + half - 360) / 360;
      const t = Math.min(Math.max((Math.sqrt(dx * dx + dy * dy) - 0.85) / (Math.SQRT2 - 0.85), 0), 1);
      const a = VIGNETTE_ALPHA * t * t * (3 - 2 * t);
      if (a > 0) out.push({ k: 'rect', x, y, w: VIGNETTE_CELL, h: VIGNETTE_CELL, c: COLOR.BG, a });
    }
  }
  return out;
}

export interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// The dust of a room: MOTES motes from a PRNG seeded with 1000 + the room number, each a start in the view
// (world px) and a drift in world px a second.
export function moteField(room: Pick<Room, 'name'>): Mote[] {
  const rng = makeRng(1000 + roomNumber(room));
  return Array.from({ length: MOTES }, () => ({ x: rng() * VIEW_W, y: rng() * VIEW_H, vx: between(rng, [-6, 6]), vy: between(rng, [-5, -1]) }));
}

// The motes at sim step `step`, screen-fixed and wrapping in the view: one world px each.
export function moteShapes(field: Mote[], step: number): Shape[] {
  const sec = step / 240;
  return field.map(
    (m): Shape => ({
      k: 'rect',
      x: ((((m.x + m.vx * sec) % VIEW_W) + VIEW_W) % VIEW_W) * ZOOM,
      y: ((((m.y + m.vy * sec) % VIEW_H) + VIEW_H) % VIEW_H) * ZOOM,
      w: ZOOM,
      h: ZOOM,
      c: COLOR.MOTE,
      a: 0.3,
    }),
  );
}
