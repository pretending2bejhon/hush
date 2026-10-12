// RN1 (review R2, MAJOR 2): drawShapes (src/render/art.ts), the one path from every tested shape list to the canvas:
// every bake of the play and ending scenes and every frame of both goes through it. A recording Graphics takes every
// call it makes, whatever its name, so each shape kind must make exactly the two calls section 10.6 names, in list
// order, with the numbers of the shape offset by (dx, dy) and nothing else.
// HUSH_DRAW_MODULE points the test at another module (the controls: the reference passes, a broken copy fails).
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';

const A = await load('HUSH_DRAW_MODULE', new URL('../../src/render/art.ts', import.meta.url));

// A Graphics that records every method call as [name, ...arguments], points as plain { x, y }.
function recorder() {
  const calls = [];
  const plain = (v) => (Array.isArray(v) ? v.map((p) => ({ x: p.x, y: p.y })) : v);
  const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push([String(name), ...args.map(plain)]); return g; } });
  return { g, calls };
}

const SHAPES = [
  { k: 'rect', x: 10, y: 20, w: 30, h: 40, c: 0x161b28, a: 1 },
  { k: 'tri', p: [1, 2, 3, 4, 5, 6], c: 0x4a556e, a: 0.5 },
  { k: 'poly', p: [0, 0, 10, 0, 10, 10, 0, 10], c: 0x1a2233, a: 1 },
  { k: 'ellipse', x: 100, y: 50, rx: 7.5, ry: 5, c: 0xe8ecf4, a: 0.3 },
  { k: 'ring', x: 640, y: 360, r: 120, lw: 2.5, c: 0x7fd6ff, a: 0.2 },
  { k: 'frame', x: 1.25, y: 1.25, w: 37.5, h: 77.5, lw: 7.5, c: 0x7fd6ff, a: 0.25 },
  { k: 'line', p: [14, 10, 26, 20, 14, 30], lw: 2.5, c: 0x7fd6ff, a: 1 },
  { k: 'outline', p: [0, 0, 10, 0, 5, 8], lw: 2.5, c: 0x7fd6ff, a: 0.5 },
];

describe('RN1 drawShapes, section 10.6', () => {
  it('draws each shape kind by its style call and its draw call, offset by (dx, dy)', () => {
    const { g, calls } = recorder();
    A.drawShapes(g, SHAPES, 3, -2);
    expect(calls).toEqual([
      ['fillStyle', 0x161b28, 1], ['fillRect', 13, 18, 30, 40],
      ['fillStyle', 0x4a556e, 0.5], ['fillTriangle', 4, 0, 6, 2, 8, 4],
      ['fillStyle', 0x1a2233, 1], ['fillPoints', [{ x: 3, y: -2 }, { x: 13, y: -2 }, { x: 13, y: 8 }, { x: 3, y: 8 }], true],
      ['fillStyle', 0xe8ecf4, 0.3], ['fillEllipse', 103, 48, 15, 10],
      ['lineStyle', 2.5, 0x7fd6ff, 0.2], ['strokeCircle', 643, 358, 120],
      ['lineStyle', 7.5, 0x7fd6ff, 0.25], ['strokeRect', 4.25, -0.75, 37.5, 77.5],
      ['lineStyle', 2.5, 0x7fd6ff, 1], ['strokePoints', [{ x: 17, y: 8 }, { x: 29, y: 18 }, { x: 17, y: 28 }], false],
      ['lineStyle', 2.5, 0x7fd6ff, 0.5], ['strokePoints', [{ x: 3, y: -2 }, { x: 13, y: -2 }, { x: 8, y: 6 }], true],
    ]);
  });

  it('draws at the shapes\' own place without an offset, in list order', () => {
    const { g, calls } = recorder();
    A.drawShapes(g, [SHAPES[3], SHAPES[0], SHAPES[1]]);
    expect(calls).toEqual([
      ['fillStyle', 0xe8ecf4, 0.3], ['fillEllipse', 100, 50, 15, 10],
      ['fillStyle', 0x161b28, 1], ['fillRect', 10, 20, 30, 40],
      ['fillStyle', 0x4a556e, 0.5], ['fillTriangle', 1, 2, 3, 4, 5, 6],
    ]);
  });

  it('makes no call for an empty list', () => {
    const { g, calls } = recorder();
    A.drawShapes(g, []);
    expect(calls).toEqual([]);
  });
});
