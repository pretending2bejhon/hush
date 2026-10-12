// The creature and its effects (spec section 10.3, 10.6), ported from tests/fixtures/reference/art.mjs: the history
// the run keeps for it and the shapes it is drawn from, in canvas px.
import { C } from '../sim/constants.ts';
import { COLOR, GLOW_PX, GLOW_ALPHA, LINE_PX, ZOOM } from './art.ts';
import type { Shape } from './art.ts';

export const SQUASH_STEPS = 6;
export const TRAIL = 8;

// The creature's history: the step it last landed, the sim's grounded flag, its wave trail (box positions in world
// px, newest first, one every 2 steps while it is the wave), the step a layer last came back (read by RN3's ring)
// and the layers back as of the last step (-1 before the first).
export interface Track {
  landedAt: number;
  grounded: number;
  trail: { x: number; y: number }[];
  ringAt: number;
  layers: number;
}

// The sim's state after a tick, by field name (x and y in sub).
export interface TrackState {
  step: number;
  x: number;
  y: number;
  form: number;
  grounded: number;
  dead: number;
  layers: number;
}

// The creature as drawn: the interpolated box position in world px and the fields the shapes read.
export interface CreatureState {
  step: number;
  x: number;
  y: number;
  form: number;
  vy: number;
  facing: number;
  dead: number;
  lock: number;
}

export function createTrack(): Track {
  return { landedAt: -1000, grounded: 1, trail: [], ringAt: -100000, layers: -1 };
}

// Advanced by the run once per sim step with the state after the tick.
export function trackStep(t: Track, s: TrackState): Track {
  const next: Track = { landedAt: t.landedAt, grounded: s.grounded, trail: t.trail, ringAt: t.ringAt, layers: s.layers };
  if (s.dead === 0 && s.grounded === 1 && t.grounded === 0) next.landedAt = s.step;
  if (s.form === 1 && s.dead === 0) {
    if (s.step % 2 === 0) next.trail = [{ x: s.x / 256, y: s.y / 256 }, ...t.trail].slice(0, TRAIL);
  } else if (t.trail.length) next.trail = [];
  if (t.layers >= 0 && s.layers !== t.layers) next.ringAt = s.step;
  return next;
}

// The creature in screen canvas px: s holds the interpolated box position in world px, t is its track, camPx the camera.
export function creatureShapes(s: CreatureState, t: Track, camPx: number): Shape[] {
  const out: Shape[] = [];
  const S = (xw: number): number => xw * ZOOM - camPx;
  const cx = S(s.x + 5);
  if (s.dead > 0) {
    const u = (C.RESPAWN_STEPS - s.dead) / C.RESPAWN_STEPS;
    const cy = (s.y + 5) * ZOOM;
    const d = (4 + 20 * u) * ZOOM;
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      out.push({ k: 'ellipse', x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d, rx: ZOOM, ry: ZOOM, c: COLOR.SHELL, a: 0.8 * (1 - u) });
    }
    return out;
  }
  if (s.form === 1) {
    t.trail.forEach((p, j) => {
      out.push({ k: 'ellipse', x: S(p.x + 5), y: (p.y + 5) * ZOOM, rx: 2 * ZOOM, ry: 2 * ZOOM, c: COLOR.ACCENT, a: (0.5 * (TRAIL - j)) / TRAIL });
    });
    const dy = s.vy < 0 ? -1 : s.vy > 0 ? 1 : 0;
    const n = dy === 0 ? 1 : Math.SQRT1_2;
    const ux = n;
    const uy = dy * n;
    const cy = (s.y + 5) * ZOOM;
    const h = 5 * ZOOM;
    const p = [cx + ux * h, cy + uy * h, cx - ux * h - uy * h, cy - uy * h + ux * h, cx - ux * h + uy * h, cy - uy * h - ux * h];
    out.push({ k: 'outline', p, lw: GLOW_PX, c: COLOR.ACCENT, a: GLOW_ALPHA });
    out.push({ k: 'tri', p, c: COLOR.ACCENT, a: 1 });
  } else {
    const squash = s.step - t.landedAt < SQUASH_STEPS;
    const sx = squash ? 1.1 : 1;
    const sy = squash ? 0.9 : 1;
    const R = 5 * ZOOM;
    const cy = (s.y + 10) * ZOOM - R * sy;
    const L = (lx: number, ly: number): [number, number] => [cx + lx * ZOOM * sx, cy + ly * ZOOM * sy];
    out.push({ k: 'ellipse', x: cx, y: cy, rx: R * sx, ry: R * sy, c: COLOR.BODY, a: 1 });
    const mask: number[] = [];
    for (let i = 0; i <= 16; i++) {
      const ang = Math.PI + (i * Math.PI) / 16;
      mask.push(...L(5 * Math.cos(ang), 5 * Math.sin(ang)));
    }
    out.push({ k: 'poly', p: mask, c: COLOR.SHELL, a: 1 });
    out.push({ k: 'tri', p: [...L(-3.4, -3.6), ...L(-1.6, -4.7), ...L(-4.6, -8.4)], c: COLOR.SHELL, a: 1 });
    out.push({ k: 'tri', p: [...L(3.4, -3.6), ...L(1.6, -4.7), ...L(4.6, -8.4)], c: COLOR.SHELL, a: 1 });
    const ex = s.facing < 0 ? -0.6 : 0.6;
    for (const side of [-1.8, 1.8]) {
      const [x, y] = L(side + ex, -1.4);
      out.push({ k: 'ellipse', x, y, rx: 0.9 * ZOOM * sx, ry: 1.3 * ZOOM * sy, c: COLOR.BG, a: 1 });
    }
  }
  if (s.lock > C.LOCK_STEPS - 12) {
    const u = (C.LOCK_STEPS - s.lock) / 12;
    out.push({ k: 'ring', x: cx, y: (s.y + 5) * ZOOM, r: (5 + 11 * (1 - u)) * ZOOM, lw: LINE_PX, c: COLOR.SHELL, a: 0.6 * (1 - u) });
  }
  return out;
}
