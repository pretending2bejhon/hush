// The art's shared values and its one drawing function (spec sections 10.1 to 10.6), ported from
// tests/fixtures/reference/art.mjs. Phaser is imported for types only, so Node tests the art modules.
import type * as Phaser from 'phaser';

export const ZOOM = 2.5;
export const TILE_PX = 40;
export const VIEW_W = 512;
export const VIEW_H = 288;
export const COLOR = Object.freeze({
  BG: 0x07080d,
  FAR: 0x1a2233,
  FAR2: 0x161d2c,
  MID: 0x121826,
  NEAR: 0x0b0e16,
  TILE: 0x161b28,
  EDGE: 0x2a3348,
  SPIKE: 0x4a556e,
  ACCENT: 0x7fd6ff,
  BODY: 0x10131c,
  SHELL: 0xe8ecf4,
  MOTE: 0xc8d0e0,
  GLIMPSE: 0x2b3a55,
  LIGHT: 0xffd27f,
});
export const LINE_PX = 2.5;
export const GLOW_PX = 7.5;
export const GLOW_ALPHA = 0.25;

// A shape in canvas px (the 1280 by 720 canvas); c is 0xRRGGBB, a the alpha, lw the line width.
export type Shape =
  | { k: 'rect'; x: number; y: number; w: number; h: number; c: number; a: number }
  | { k: 'tri' | 'poly'; p: number[]; c: number; a: number }
  | { k: 'ellipse'; x: number; y: number; rx: number; ry: number; c: number; a: number }
  | { k: 'ring'; x: number; y: number; r: number; lw: number; c: number; a: number }
  | { k: 'frame'; x: number; y: number; w: number; h: number; lw: number; c: number; a: number }
  | { k: 'line' | 'outline'; p: number[]; lw: number; c: number; a: number };

// The pairs of `p` as plain { x, y } points, offset by (dx, dy), in the Graphics' point type.
function pointsOf(p: number[], dx: number, dy: number): Phaser.Math.Vector2[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push({ x: (p[i] ?? 0) + dx, y: (p[i + 1] ?? 0) + dy });
  return out as Phaser.Math.Vector2[];
}

// Draws a list in order through one Graphics, each shape by one call, offset by (dx, dy).
export function drawShapes(g: Phaser.GameObjects.Graphics, shapes: Shape[], dx = 0, dy = 0): void {
  for (const s of shapes) {
    switch (s.k) {
      case 'rect':
        g.fillStyle(s.c, s.a);
        g.fillRect(s.x + dx, s.y + dy, s.w, s.h);
        break;
      case 'tri':
        g.fillStyle(s.c, s.a);
        g.fillTriangle((s.p[0] ?? 0) + dx, (s.p[1] ?? 0) + dy, (s.p[2] ?? 0) + dx, (s.p[3] ?? 0) + dy, (s.p[4] ?? 0) + dx, (s.p[5] ?? 0) + dy);
        break;
      case 'poly':
        g.fillStyle(s.c, s.a);
        g.fillPoints(pointsOf(s.p, dx, dy), true);
        break;
      case 'ellipse':
        g.fillStyle(s.c, s.a);
        g.fillEllipse(s.x + dx, s.y + dy, 2 * s.rx, 2 * s.ry);
        break;
      case 'ring':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokeCircle(s.x + dx, s.y + dy, s.r);
        break;
      case 'frame':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokeRect(s.x + dx, s.y + dy, s.w, s.h);
        break;
      case 'line':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokePoints(pointsOf(s.p, dx, dy), false);
        break;
      case 'outline':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokePoints(pointsOf(s.p, dx, dy), true);
        break;
    }
  }
}
