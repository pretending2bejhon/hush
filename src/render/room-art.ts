// The room's static art, baked once per room (spec sections 10.1 to 10.3, 10.6), ported from
// tests/fixtures/reference/art.mjs: the chunks a room is baked into, the shapes of each chunk and the camera.
import { CODE } from '../rooms/codes.ts';
import { SPIKE_BOX } from '../sim/constants.ts';
import type { Dir, Room } from '../sim/types.ts';
import { COLOR, GLOW_ALPHA, GLOW_PX, LINE_PX, TILE_PX, VIEW_W, ZOOM } from './art.ts';
import type { Shape } from './art.ts';

export const BAKE_COLS = 128;

const DIR_OF: Readonly<Record<number, Dir>> = { 2: 'up', 3: 'down', 4: 'left', 5: 'right' };
// An accent stroke is drawn twice: the glow under the 1 px shape.
const ACCENT_PASSES = [
  [GLOW_PX, GLOW_ALPHA],
  [LINE_PX, 1],
] as const;

export interface BakeChunk {
  col0: number;
  col1: number;
  w: number;
  h: number;
}

// The DynamicTextures a room is baked into: BAKE_COLS columns each, the last one narrower.
export function bakeChunks(room: Pick<Room, 'W' | 'H'>): BakeChunk[] {
  const out: BakeChunk[] = [];
  for (let col0 = 0; col0 < room.W; col0 += BAKE_COLS) {
    const col1 = Math.min(col0 + BAKE_COLS, room.W);
    out.push({ col0, col1, w: (col1 - col0) * TILE_PX, h: room.H * TILE_PX });
  }
  return out;
}

// A grid code, with the sim's outside: solid left of and above the room, empty right of and below it.
export function codeAt(room: Pick<Room, 'W' | 'H' | 'tiles'>, c: number, r: number): number {
  if (c < 0 || r < 0) return CODE.SOLID;
  if (c >= room.W || r >= room.H) return CODE.EMPTY;
  return room.tiles[r * room.W + c] ?? CODE.EMPTY;
}

// A spike's three triangles in the tile whose top left is (x, y), filling its hazard box, tips toward `dir`.
export function spikeTris(x: number, y: number, dir: Dir, c: number, a: number): Shape[] {
  const box = SPIKE_BOX[dir];
  const x0 = (box[0] / 256) * ZOOM;
  const y0 = (box[1] / 256) * ZOOM;
  const x1 = (box[2] / 256) * ZOOM;
  const y1 = (box[3] / 256) * ZOOM;
  const out: Shape[] = [];
  for (let i = 0; i < 3; i++) {
    if (dir === 'up' || dir === 'down') {
      const w = (x1 - x0) / 3;
      const l = x + x0 + i * w;
      const base = dir === 'up' ? y + y1 : y + y0;
      const tip = dir === 'up' ? y + y0 : y + y1;
      out.push({ k: 'tri', p: [l, base, l + w, base, l + w / 2, tip], c, a });
    } else {
      const h = (y1 - y0) / 3;
      const t = y + y0 + i * h;
      const base = dir === 'left' ? x + x1 : x + x0;
      const tip = dir === 'left' ? x + x0 : x + x1;
      out.push({ k: 'tri', p: [base, t, base, t + h, tip, t + h / 2], c, a });
    }
  }
  return out;
}

// The static geometry of columns col0 to col1 - 1 in the chunk's own canvas px (x = (col - col0) * 40): solid
// runs, edges, static spikes, then portal frames with their marks, each accent stroke over its glow.
export function roomShapes(room: Pick<Room, 'W' | 'H' | 'tiles'>, col0: number, col1: number): Shape[] {
  const out: Shape[] = [];
  const X = (c: number): number => (c - col0) * TILE_PX;
  for (let r = 0; r < room.H; r++) {
    let c = col0;
    while (c < col1) {
      if (codeAt(room, c, r) !== CODE.SOLID) {
        c += 1;
        continue;
      }
      const start = c;
      while (c < col1 && codeAt(room, c, r) === CODE.SOLID) c += 1;
      out.push({ k: 'rect', x: X(start), y: r * TILE_PX, w: (c - start) * TILE_PX, h: TILE_PX, c: COLOR.TILE, a: 1 });
    }
  }
  for (let r = 0; r < room.H; r++) {
    for (let c = col0; c < col1; c++) {
      if (codeAt(room, c, r) !== CODE.SOLID) continue;
      const x = X(c);
      const y = r * TILE_PX;
      if (codeAt(room, c, r - 1) !== CODE.SOLID) out.push({ k: 'rect', x, y, w: TILE_PX, h: LINE_PX, c: COLOR.EDGE, a: 1 });
      if (codeAt(room, c, r + 1) !== CODE.SOLID) out.push({ k: 'rect', x, y: y + TILE_PX - LINE_PX, w: TILE_PX, h: LINE_PX, c: COLOR.EDGE, a: 1 });
      if (codeAt(room, c - 1, r) !== CODE.SOLID) out.push({ k: 'rect', x, y, w: LINE_PX, h: TILE_PX, c: COLOR.EDGE, a: 1 });
      if (codeAt(room, c + 1, r) !== CODE.SOLID) out.push({ k: 'rect', x: x + TILE_PX - LINE_PX, y, w: LINE_PX, h: TILE_PX, c: COLOR.EDGE, a: 1 });
    }
  }
  for (let r = 0; r < room.H; r++) {
    for (let c = col0; c < col1; c++) {
      const dir = DIR_OF[codeAt(room, c, r)];
      if (dir) out.push(...spikeTris(X(c), r * TILE_PX, dir, COLOR.SPIKE, 1));
    }
  }
  for (let c = col0; c < col1; c++) {
    let r = 0;
    while (r < room.H) {
      const k = codeAt(room, c, r);
      if (k !== CODE.WAVE && k !== CODE.BASE) {
        r += 1;
        continue;
      }
      const r0 = r;
      while (r < room.H && codeAt(room, c, r) === k) r += 1;
      const x = X(c);
      const y = r0 * TILE_PX;
      const h = (r - r0) * TILE_PX;
      const cx = x + TILE_PX / 2;
      const cy = y + h / 2;
      for (const [lw, a] of ACCENT_PASSES) {
        out.push({ k: 'frame', x: x + LINE_PX / 2, y: y + LINE_PX / 2, w: TILE_PX - LINE_PX, h: h - LINE_PX, lw, c: COLOR.ACCENT, a });
        if (k === CODE.WAVE) out.push({ k: 'line', p: [cx - 6, cy - 10, cx + 6, cy, cx - 6, cy + 10], lw, c: COLOR.ACCENT, a });
        else out.push({ k: 'ring', x: cx, y: cy, r: 8, lw, c: COLOR.ACCENT, a });
      }
    }
  }
  return out;
}

// The camera's left edge in canvas px (section 10.1), from the creature's interpolated centre x in world px.
export function cameraPx(room: Pick<Room, 'kind' | 'W'>, centreX: number): number {
  const lead = room.kind === 'gauntlet' ? 160 : VIEW_W / 2;
  const camX = Math.min(Math.max(centreX - lead, 0), Math.max(room.W * 16 - VIEW_W, 0));
  return Math.round(camX * ZOOM);
}
