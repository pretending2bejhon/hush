// The WCAG 2.3.1 predicate of tools/flash-analyzer.mjs on synthetic frames (fast; the browser controls are in
// tests/controls/flash-probe.test.mjs): rates, areas, the darker-state rule and red flashes counted apart.
import { describe, expect, it } from 'vitest';
import { AREA_LIMIT, chroma, createFlashAnalyzer, flashProblems, luminance } from '../../tools/flash-analyzer.mjs';

const W = 128;
const H = 72;
const PX = (1280 * 720) / (W * H);

// Frames at 60 fps for `seconds`; paint(frameIndex, tMs) returns [r, g, b] for a pixel (x, y).
function runFrames(seconds, paint) {
  const a = createFlashAnalyzer({ width: W, height: H, pxArea: PX });
  const buf = new Uint8Array(W * H * 4);
  for (let f = 0; f < seconds * 60; f++) {
    const t = (f * 1000) / 60;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const [r, g, b] = paint(f, t, x, y);
        const o = (y * W + x) * 4;
        buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255;
      }
    }
    a.push(buf, t);
  }
  return a.result();
}

const strobe = (hz, on, off, inside = () => true) => (f, t, x, y) => (inside(x, y) && Math.floor((t * hz * 2) / 1000) % 2 === 1 ? on : off);
const BLACK = [7, 8, 13];
const WHITE = [255, 255, 255];

describe('flash analyzer', () => {
  it('fails a full-field general flash at 4 Hz and passes one at 3 Hz', () => {
    expect(runFrames(3, strobe(4, WHITE, BLACK)).maxGeneralArea).toBeGreaterThanOrEqual(AREA_LIMIT);
    expect(runFrames(3, strobe(3, WHITE, BLACK)).maxGeneralArea).toBe(0);
  });

  it('ignores a change of less than 0.1 in relative luminance, and one whose darker state is 0.80 or more', () => {
    const dim = [Math.round(255 * 0.3), Math.round(255 * 0.3), Math.round(255 * 0.3)];
    const dimmer = [Math.round(255 * 0.27), Math.round(255 * 0.27), Math.round(255 * 0.27)];
    expect(luminance(...dim) - luminance(...dimmer)).toBeLessThan(0.1);
    expect(runFrames(2, strobe(6, dim, dimmer)).maxGeneralArea).toBe(0);
    const bright = [250, 250, 250];
    const lessBright = [235, 235, 235];
    expect(luminance(...lessBright)).toBeGreaterThanOrEqual(0.8);
    expect(runFrames(2, strobe(6, bright, lessBright)).maxGeneralArea).toBe(0);
  });

  it('measures the area: just below the limit passes, just above fails', () => {
    const side = (k) => Math.round(Math.sqrt((AREA_LIMIT * k) / PX));
    const below = side(0.9);
    const above = side(1.1);
    const box = (n) => (x, y) => x < n && y < n;
    const rb = runFrames(2, strobe(5, WHITE, BLACK, box(below)));
    const ra = runFrames(2, strobe(5, WHITE, BLACK, box(above)));
    expect(rb.maxGeneralArea).toBeLessThan(AREA_LIMIT);
    expect(rb.maxGeneralArea).toBeGreaterThan(0);
    expect(ra.maxGeneralArea).toBeGreaterThanOrEqual(AREA_LIMIT);
  });

  // Review R7, MINOR 5: the edge itself, against section 11's literal 25,600 canvas px (25% of a 10 degree field) and not
  // the module's own constant. 160 by 160 analysis pixels of 1 canvas px each strobe at 4 Hz: all of them is exactly
  // 25,600 px and fails, all but one is 25,599 px and passes, for general flashes and for red ones.
  it('fails a flashing area of exactly 25,600 canvas px and passes 25,599, general and red alike', () => {
    expect(AREA_LIMIT).toBe(25600);
    const side = 160;
    const run = (still, on, off) => {
      const a = createFlashAnalyzer({ width: side, height: side, pxArea: 1 });
      const buf = new Uint8Array(side * side * 4);
      for (let f = 0; f < 120; f++) {
        const t = (f * 1000) / 60;
        const lit = Math.floor((t * 4 * 2) / 1000) % 2 === 1;
        for (let i = 0; i < side * side; i++) {
          const [r, g, b] = lit && i >= still ? on : off;
          buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255;
        }
        a.push(buf, t);
      }
      return a.result();
    };
    const general = run(0, WHITE, BLACK);
    expect(general.maxGeneralArea).toBe(25600);
    expect(flashProblems(general)).toEqual([expect.stringMatching(/^general flashes over 25600 canvas px/)]);
    const generalUnder = run(1, WHITE, BLACK);
    expect(generalUnder.maxGeneralArea).toBe(25599);
    expect(flashProblems(generalUnder)).toEqual([]);
    const red = run(0, [255, 0, 0], [0, 124, 255]);
    expect(red.maxRedArea).toBe(25600);
    expect(flashProblems(red)).toEqual([expect.stringMatching(/^red flashes over 25600 canvas px/)]);
    const redUnder = run(1, [255, 0, 0], [0, 124, 255]);
    expect(redUnder.maxRedArea).toBe(25599);
    expect(flashProblems(redUnder)).toEqual([]);
  });

  it('counts isoluminant red to blue as red flashes, never as general ones', () => {
    const red = [255, 0, 0];
    const blue = [0, 124, 255];
    expect(Math.abs(luminance(...red) - luminance(...blue))).toBeLessThan(0.01);
    expect(chroma(...red).ratio).toBeGreaterThanOrEqual(0.8);
    const r = runFrames(2, strobe(4, red, blue));
    expect(r.maxGeneralArea).toBe(0);
    expect(r.maxRedArea).toBeGreaterThanOrEqual(AREA_LIMIT);
    expect(runFrames(2, strobe(4, [0, 200, 255], [0, 60, 120])).maxRedArea).toBe(0);
  });

  it('sums small separate areas flashing together', () => {
    const side = Math.round(Math.sqrt((AREA_LIMIT * 0.3) / PX));
    const four = (x, y) => (x % 32) < side && (y % 36) < side;
    const r = runFrames(2, strobe(4, WHITE, BLACK, four));
    expect(r.maxGeneralArea).toBeGreaterThanOrEqual(AREA_LIMIT);
  });
});
