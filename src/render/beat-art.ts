// Beat entities, their warnings and the layer's return (spec sections 10.3, 10.4, 10.6 and 11), ported from
// tests/fixtures/reference/art.mjs: what an entity looks like at a step, one frame of them through the flash
// limiter, and the ring that follows a layer's return.
import type { createFlashLimiter } from '../fx/flash-limiter.ts';
import { C } from '../sim/constants.ts';
import type { Dir, Entity, Room } from '../sim/types.ts';
import { COLOR, GLOW_ALPHA, GLOW_PX, LINE_PX, TILE_PX, VIEW_W, ZOOM } from './art.ts';
import type { Shape } from './art.ts';
import type { Track } from './creature.ts';
import { spikeTris } from './room-art.ts';

export const BLOCK_ALPHA = 0.85;
export const OFF_ALPHA = 0.25;
export const WARN_ALPHA: readonly [number, number] = [0.45, 0.25];
export const SPIKE_AREA = 30 * 25;
export const RING_STEPS = (4 * C.TICKS_PER_BEAT) / 7;

export interface Look {
  look: 'on' | 'off' | 'warn';
  alpha: number;
}

// An entity's look at sim step `step`: 'on' (alpha 1), 'off' (its outline at OFF_ALPHA) or, in the beat before
// it turns on, 'warn' (its outline pulsing between WARN_ALPHA[0] and WARN_ALPHA[1] each sixteenth, the
// sixteenth just before it turns on at WARN_ALPHA[0]). A layer that is not back holds the rest look.
export function entityLook(e: Pick<Entity, 'layer' | 'period' | 'phase' | 'on' | 'rest'>, step: number, layers: number): Look {
  if (!(layers & (1 << e.layer))) return e.rest ? { look: 'on', alpha: 1 } : { look: 'off', alpha: OFF_ALPHA };
  const cycle = e.period * C.TICKS_PER_BEAT;
  const pos = (((step * 7 - e.phase * C.TICKS_PER_SIXTEENTH) % cycle) + cycle) % cycle;
  if (pos < e.on * C.TICKS_PER_SIXTEENTH) return { look: 'on', alpha: 1 };
  const until = cycle - pos;
  if (until <= C.TICKS_PER_BEAT) return { look: 'warn', alpha: Math.floor((until - 1) / C.TICKS_PER_SIXTEENTH) % 2 === 0 ? WARN_ALPHA[0] : WARN_ALPHA[1] };
  return { look: 'off', alpha: OFF_ALPHA };
}

function linear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// The relative luminance of an entity's fill at `level` (0 off to 1 on): the accent at BLOCK_ALPHA * level
// over the background, blended per sRGB channel as the canvas blends.
export function levelLum(level: number): number {
  const a = BLOCK_ALPHA * level;
  const ch = (shift: number): number => {
    const b = (COLOR.BG >> shift) & 255;
    return b + (((COLOR.ACCENT >> shift) & 255) - b) * a;
  };
  return 0.2126 * linear(ch(16)) + 0.7152 * linear(ch(8)) + 0.0722 * linear(ch(0));
}

// Inside one cell at (x, y), the strip along `side` (0 top, 1 bottom, 2 left, 3 right) `w` px deep, or with
// `centred` the strip centred on that side.
function strip(x: number, y: number, side: number, w: number, centred: boolean): { x: number; y: number; w: number; h: number } {
  const o = centred ? w / 2 : 0;
  if (side === 0) return { x, y: y - o, w: TILE_PX, h: w };
  if (side === 1) return { x, y: y + TILE_PX - w + o, w: TILE_PX, h: w };
  if (side === 2) return { x: x - o, y, w, h: TILE_PX };
  return { x: x + TILE_PX - w + o, y, w, h: TILE_PX };
}

const SIDES: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
// The flat bar a spike lies down as, inside its tile: x, y, width, height in canvas px.
const BAR: Readonly<Record<Dir, readonly [number, number, number, number]>> = {
  up: [5, 37.5, 30, 2.5],
  down: [5, 0, 30, 2.5],
  left: [37.5, 5, 2.5, 30],
  right: [0, 5, 2.5, 30],
};

type Limiter = Pick<ReturnType<typeof createFlashLimiter>, 'request'>;

// One frame of beat entities in screen canvas px. prev holds each entity's level drawn last frame (by index;
// absent the first frame of a room); a level that changes asks the flash limiter (section 11) with the entity's
// area and the luminance of both levels, and draws the part of the change it grants. Cells outside the view are
// skipped. Returns { shapes, levels }.
export function beatShapes(
  room: Pick<Room, 'entities'>,
  step: number,
  layers: number,
  camPx: number,
  prev: number[],
  limiter: Limiter,
): { shapes: Shape[]; levels: number[] } {
  const out: Shape[] = [];
  const levels: number[] = [];
  const first = Math.floor(camPx / TILE_PX) - 1;
  const last = first + VIEW_W / 16 + 2;
  for (const e of room.entities) {
    const look = entityLook(e, step, layers);
    const target = look.look === 'on' ? 1 : 0;
    const before = prev[e.index];
    const from = before === undefined ? target : before;
    let level = target;
    if (from !== target) {
      const lf = levelLum(from);
      const lt = levelLum(target);
      const got = limiter.request(e.cells.length * (e.kind === 'spike' ? SPIKE_AREA : TILE_PX * TILE_PX), lf, lt);
      level = from + ((target - from) * (got - lf)) / (lt - lf);
    }
    levels[e.index] = level;
    const lineAlpha = (1 - level) * (look.look === 'on' ? OFF_ALPHA : look.alpha);
    const mine = new Set(e.cells.map(([c, r]) => c * 64 + r));
    for (const [c, r] of e.cells) {
      if (c < first || c > last) continue;
      const x = c * TILE_PX - camPx;
      const y = r * TILE_PX;
      if (e.kind === 'spike') {
        const dir = e.dir;
        if (!dir) continue;
        if (level > 0) out.push(...spikeTris(x, y, dir, COLOR.ACCENT, level));
        if (lineAlpha > 0) {
          const [bx, by, bw, bh] = BAR[dir];
          out.push({ k: 'rect', x: x + bx, y: y + by, w: bw, h: bh, c: COLOR.ACCENT, a: lineAlpha });
        }
        continue;
      }
      if (level > 0) out.push({ k: 'rect', x, y, w: TILE_PX, h: TILE_PX, c: COLOR.ACCENT, a: BLOCK_ALPHA * level });
      SIDES.forEach(([dc, dr], side) => {
        if (mine.has((c + dc) * 64 + r + dr)) return;
        if (level > 0) out.push({ k: 'rect', ...strip(x, y, side, GLOW_PX, true), c: COLOR.ACCENT, a: GLOW_ALPHA * level });
        if (lineAlpha > 0) out.push({ k: 'rect', ...strip(x, y, side, LINE_PX, false), c: COLOR.ACCENT, a: lineAlpha });
      });
    }
  }
  return { shapes: out, levels };
}

// The layer's return: one ring from the creature's centre (screen canvas px) out to 120 world px over one bar,
// alpha falling from 0.2. Its brightest step from the background (0.045) is under LUM_STEP, so it never asks
// the limiter.
export function ringShapes(t: Pick<Track, 'ringAt'>, step: number, cx: number, cy: number): Shape[] {
  const k = step - t.ringAt;
  if (k < 0 || k >= RING_STEPS) return [];
  const u = k / RING_STEPS;
  return [{ k: 'ring', x: cx, y: cy, r: 120 * ZOOM * u, lw: LINE_PX, c: COLOR.ACCENT, a: 0.2 * (1 - u) }];
}
