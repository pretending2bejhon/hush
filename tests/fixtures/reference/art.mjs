// The art of HUSH-SPEC sections 10 and 13 as pure data: the reference the render ports (amended 2026-10-12,
// section 1.6). Every function returns shapes in canvas px (the 1280 by 720 canvas); src/render/art.ts draws a
// list through one Phaser Graphics in list order, each kind by the one Graphics call section 10.3 names. The
// room, the creature, the beat entities, the depth layers and the ending are RN1, RN2, RN3, RN4 and END1;
// tests/render/*.test.mjs compare the product's functions with these, list for list.
//
// Shapes: { k: 'rect', x, y, w, h, c, a }, { k: 'tri', p: [x1, y1, x2, y2, x3, y3], c, a },
// { k: 'poly', p: [x, y, ...], c, a } (filled, closed), { k: 'ellipse', x, y, rx, ry, c, a } (filled),
// { k: 'ring', x, y, r, lw, c, a } (stroked circle), { k: 'frame', x, y, w, h, lw, c, a } (stroked rect),
// { k: 'line', p, lw, c, a } (open stroked path), { k: 'outline', p, lw, c, a } (closed stroked path).
// c is 0xRRGGBB, a the alpha, lw the line width; every number is a plain float.

export const ZOOM = 2.5;
export const TILE_PX = 40;
export const VIEW_W = 512;
export const VIEW_H = 288;
export const COLOR = Object.freeze({
  BG: 0x07080d, FAR: 0x1a2233, FAR2: 0x161d2c, MID: 0x121826, NEAR: 0x0b0e16, TILE: 0x161b28, EDGE: 0x2a3348,
  SPIKE: 0x4a556e, ACCENT: 0x7fd6ff, BODY: 0x10131c, SHELL: 0xe8ecf4, MOTE: 0xc8d0e0, GLIMPSE: 0x2b3a55, LIGHT: 0xffd27f,
});
export const LINE_PX = 2.5;
export const GLOW_PX = 7.5;
export const GLOW_ALPHA = 0.25;

// The sim's own values (src/rooms/codes.ts, src/sim/constants.ts), repeated so this file stands alone.
const CODE = { EMPTY: 0, SOLID: 1, UP: 2, DOWN: 3, LEFT: 4, RIGHT: 5, WAVE: 6, BASE: 7, ENTITY: 8 };
const SPIKE_BOX = { up: [512, 1536, 3584, 4096], down: [512, 0, 3584, 2560], left: [1536, 512, 4096, 3584], right: [0, 512, 2560, 3584] };
const DIR_OF = { 2: 'up', 3: 'down', 4: 'left', 5: 'right' };
const TICKS_PER_BEAT = 720;
const TICKS_PER_SIXTEENTH = 180;
const RESPAWN_STEPS = 72;
const LOCK_STEPS = 24;

// ------------------------------------------------------------------ RN1: the room, baked once

export const BAKE_COLS = 128;

// The DynamicTextures a room is baked into: BAKE_COLS columns each, the last one narrower.
export function bakeChunks(room) {
  const out = [];
  for (let col0 = 0; col0 < room.W; col0 += BAKE_COLS) {
    const col1 = Math.min(col0 + BAKE_COLS, room.W);
    out.push({ col0, col1, w: (col1 - col0) * TILE_PX, h: room.H * TILE_PX });
  }
  return out;
}

// A grid code, with the sim's outside: solid left of and above the room, empty right of and below it.
export function codeAt(room, c, r) {
  if (c < 0 || r < 0) return CODE.SOLID;
  if (c >= room.W || r >= room.H) return CODE.EMPTY;
  return room.tiles[r * room.W + c];
}

// A spike's three triangles in the tile whose top left is (x, y), filling its hazard box, tips toward `dir`.
export function spikeTris(x, y, dir, c, a) {
  const [x0, y0, x1, y1] = SPIKE_BOX[dir].map((v) => (v / 256) * ZOOM);
  const out = [];
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
export function roomShapes(room, col0, col1) {
  const out = [];
  const X = (c) => (c - col0) * TILE_PX;
  for (let r = 0; r < room.H; r++) {
    let c = col0;
    while (c < col1) {
      if (codeAt(room, c, r) !== CODE.SOLID) { c += 1; continue; }
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
      if (k !== CODE.WAVE && k !== CODE.BASE) { r += 1; continue; }
      const r0 = r;
      while (r < room.H && codeAt(room, c, r) === k) r += 1;
      const x = X(c);
      const y = r0 * TILE_PX;
      const h = (r - r0) * TILE_PX;
      const cx = x + TILE_PX / 2;
      const cy = y + h / 2;
      for (const [lw, a] of [[GLOW_PX, GLOW_ALPHA], [LINE_PX, 1]]) {
        out.push({ k: 'frame', x: x + LINE_PX / 2, y: y + LINE_PX / 2, w: TILE_PX - LINE_PX, h: h - LINE_PX, lw, c: COLOR.ACCENT, a });
        if (k === CODE.WAVE) out.push({ k: 'line', p: [cx - 6, cy - 10, cx + 6, cy, cx - 6, cy + 10], lw, c: COLOR.ACCENT, a });
        else out.push({ k: 'ring', x: cx, y: cy, r: 8, lw, c: COLOR.ACCENT, a });
      }
    }
  }
  return out;
}

// The camera's left edge in canvas px (section 10.1), from the creature's interpolated centre x in world px.
export function cameraPx(room, centreX) {
  const lead = room.kind === 'gauntlet' ? 160 : VIEW_W / 2;
  const camX = Math.min(Math.max(centreX - lead, 0), Math.max(room.W * 16 - VIEW_W, 0));
  return Math.round(camX * ZOOM);
}

// ------------------------------------------------------------------ RN2: the creature

export const SQUASH_STEPS = 6;
export const TRAIL = 8;

// The creature's history, advanced by the run once per sim step with the state after the tick, as numbers
// ({ step, x, y, form, grounded, dead, layers }, x and y in sub): the step it last landed, its wave trail (box
// positions in world px, newest first, one every 2 steps while it is the wave) and the step a layer last
// came back (read by RN3's ring).
export function createTrack() {
  return { landedAt: -1000, grounded: 1, trail: [], ringAt: -100000, layers: -1 };
}

export function trackStep(t, s) {
  const next = { landedAt: t.landedAt, grounded: s.grounded, trail: t.trail, ringAt: t.ringAt, layers: s.layers };
  if (s.dead === 0 && s.grounded === 1 && t.grounded === 0) next.landedAt = s.step;
  if (s.form === 1 && s.dead === 0) {
    if (s.step % 2 === 0) next.trail = [{ x: s.x / 256, y: s.y / 256 }, ...t.trail].slice(0, TRAIL);
  } else if (t.trail.length) next.trail = [];
  if (t.layers >= 0 && s.layers !== t.layers) next.ringAt = s.step;
  return next;
}

// The creature in screen canvas px: s is { step, x, y, form, vy, facing, dead, lock } with x and y the
// interpolated box position in world px, t its track, camPx the camera.
export function creatureShapes(s, t, camPx) {
  const out = [];
  const S = (xw) => xw * ZOOM - camPx;
  const cx = S(s.x + 5);
  if (s.dead > 0) {
    const u = (RESPAWN_STEPS - s.dead) / RESPAWN_STEPS;
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
    const L = (lx, ly) => [cx + lx * ZOOM * sx, cy + ly * ZOOM * sy];
    out.push({ k: 'ellipse', x: cx, y: cy, rx: R * sx, ry: R * sy, c: COLOR.BODY, a: 1 });
    const mask = [];
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
  if (s.lock > LOCK_STEPS - 12) {
    const u = (LOCK_STEPS - s.lock) / 12;
    out.push({ k: 'ring', x: cx, y: (s.y + 5) * ZOOM, r: (5 + 11 * (1 - u)) * ZOOM, lw: LINE_PX, c: COLOR.SHELL, a: 0.6 * (1 - u) });
  }
  return out;
}

// ------------------------------------------------------------------ RN3: beat entities and the layer's return

export const BLOCK_ALPHA = 0.85;
export const OFF_ALPHA = 0.25;
export const WARN_ALPHA = [0.45, 0.25];
export const SPIKE_AREA = 30 * 25;
export const RING_STEPS = (4 * TICKS_PER_BEAT) / 7;

// An entity's look at sim step `step`: 'on' (alpha 1), 'off' (its outline at OFF_ALPHA) or, in the beat before
// it turns on, 'warn' (its outline pulsing between WARN_ALPHA[0] and WARN_ALPHA[1] each sixteenth, the
// sixteenth just before it turns on at WARN_ALPHA[0]). A layer that is not back holds the rest look.
export function entityLook(e, step, layers) {
  if (!(layers & (1 << e.layer))) return e.rest ? { look: 'on', alpha: 1 } : { look: 'off', alpha: OFF_ALPHA };
  const cycle = e.period * TICKS_PER_BEAT;
  const pos = (((step * 7 - e.phase * TICKS_PER_SIXTEENTH) % cycle) + cycle) % cycle;
  if (pos < e.on * TICKS_PER_SIXTEENTH) return { look: 'on', alpha: 1 };
  const until = cycle - pos;
  if (until <= TICKS_PER_BEAT) return { look: 'warn', alpha: WARN_ALPHA[Math.floor((until - 1) / TICKS_PER_SIXTEENTH) % 2] };
  return { look: 'off', alpha: OFF_ALPHA };
}

function linear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// The relative luminance of an entity's fill at `level` (0 off to 1 on): the accent at BLOCK_ALPHA * level
// over the background, blended per sRGB channel as the canvas blends.
export function levelLum(level) {
  const a = BLOCK_ALPHA * level;
  const ch = (shift) => {
    const b = (COLOR.BG >> shift) & 255;
    return b + (((COLOR.ACCENT >> shift) & 255) - b) * a;
  };
  return 0.2126 * linear(ch(16)) + 0.7152 * linear(ch(8)) + 0.0722 * linear(ch(0));
}

// Inside one cell at (x, y), the strip along `side` (0 top, 1 bottom, 2 left, 3 right) `w` px deep, or with
// `centred` the strip centred on that side.
function strip(x, y, side, w, centred) {
  const o = centred ? w / 2 : 0;
  if (side === 0) return { x, y: y - o, w: TILE_PX, h: w };
  if (side === 1) return { x, y: y + TILE_PX - w + o, w: TILE_PX, h: w };
  if (side === 2) return { x: x - o, y, w, h: TILE_PX };
  return { x: x + TILE_PX - w + o, y, w, h: TILE_PX };
}

const SIDES = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const BAR = { up: [5, 37.5, 30, 2.5], down: [5, 0, 30, 2.5], left: [37.5, 5, 2.5, 30], right: [0, 5, 2.5, 30] };

// One frame of beat entities in screen canvas px. prev holds each entity's level drawn last frame (by
// index; absent the first frame of a room); a level that changes asks the flash limiter (section 11) with
// the entity's area and the luminance of both levels, and draws the part of the change it grants. Cells
// outside the view are skipped. Returns { shapes, levels }.
export function beatShapes(room, step, layers, camPx, prev, limiter) {
  const out = [];
  const levels = [];
  const first = Math.floor(camPx / TILE_PX) - 1;
  const last = first + VIEW_W / 16 + 2;
  for (const e of room.entities) {
    const look = entityLook(e, step, layers);
    const target = look.look === 'on' ? 1 : 0;
    const from = prev[e.index] === undefined ? target : prev[e.index];
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
        if (level > 0) out.push(...spikeTris(x, y, e.dir, COLOR.ACCENT, level));
        if (lineAlpha > 0) {
          const [bx, by, bw, bh] = BAR[e.dir];
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
export function ringShapes(t, step, cx, cy) {
  const k = step - t.ringAt;
  if (k < 0 || k >= RING_STEPS) return [];
  const u = k / RING_STEPS;
  return [{ k: 'ring', x: cx, y: cy, r: 120 * ZOOM * u, lw: LINE_PX, c: COLOR.ACCENT, a: 0.2 * (1 - u) }];
}

// ------------------------------------------------------------------ RN4: depth

export const BAND_FACTORS = [0.15, 0.35, 0.6, 0.85];
export const BAND_COLORS = [COLOR.FAR, COLOR.FAR2, COLOR.MID, COLOR.NEAR];
const BAND_SIZES = [
  { R: [40, 70], T: [8, 12], legs: [60, 120], PW: [10, 18], PH: [120, 200], RL: [20, 50], G: [10, 40] },
  { R: [30, 55], T: [7, 10], legs: [50, 100], PW: [9, 15], PH: [100, 170], RL: [30, 70], G: [12, 44] },
  { R: [25, 45], T: [6, 9], legs: [40, 80], PW: [8, 13], PH: [80, 140], RL: [40, 90], G: [14, 48] },
  { R: [20, 35], T: [5, 8], legs: [30, 60], PW: [7, 11], PH: [60, 110], RL: [50, 110], G: [16, 56] },
];
export const FOG_STRIPS = 24;
export const FOG_ALPHA = 0.35;
export const VIGNETTE_CELL = 20;
export const VIGNETTE_ALPHA = 0.45;
export const MOTES = 60;

export function xorshift32(x) {
  let s = x;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return s >>> 0;
}

// A PRNG over xorshift32: each call advances the state and returns it divided by 2^32.
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = xorshift32(s);
    return s / 4294967296;
  };
}

const between = (rng, [lo, hi]) => lo + (hi - lo) * rng();
export const roomNumber = (room) => parseInt(room.name, 10);

// A band's width in world px: the view plus its factor's share of the room's scroll.
export function bandWidth(room, b) {
  return Math.ceil(VIEW_W + BAND_FACTORS[b] * Math.max(room.W * 16 - VIEW_W, 0));
}

// The four bands, far to near, each in its own world px (x 0 to its width, y 0 to 288), drawn by one PRNG
// seeded with the room number: arches (draw under 0.4), pillars with a capital (under 0.75) and roots
// hanging from the top, left to right with gaps.
export function depthBands(room) {
  const rng = makeRng(roomNumber(room));
  return BAND_FACTORS.map((factor, b) => {
    const z = BAND_SIZES[b];
    const c = BAND_COLORS[b];
    const w = bandWidth(room, b);
    const shapes = [];
    let x = between(rng, [0, z.G[1]]);
    while (x < w) {
      const kind = rng();
      if (kind < 0.4) {
        const R = between(rng, z.R);
        const T = between(rng, z.T);
        const cy = VIEW_H - between(rng, z.legs);
        const cx = x + R;
        const p = [x, VIEW_H];
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
export function fogShapes() {
  const h = 720 / FOG_STRIPS;
  return Array.from({ length: FOG_STRIPS }, (_, i) => ({ k: 'rect', x: 0, y: i * h, w: 1280, h, c: COLOR.FAR, a: (FOG_ALPHA * (i + 0.5)) / FOG_STRIPS }));
}

// The vignette over everything: cells of VIGNETTE_CELL px darkened by a smoothstep of their distance from the
// centre (0 inside 0.85 of the half-axes, VIGNETTE_ALPHA in the corners); cells at 0 are left out.
export function vignetteShapes() {
  const out = [];
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

// The dust of a room: MOTES motes from a PRNG seeded with 1000 + the room number, each a start in the view
// (world px) and a drift in world px a second.
export function moteField(room) {
  const rng = makeRng(1000 + roomNumber(room));
  return Array.from({ length: MOTES }, () => ({ x: rng() * VIEW_W, y: rng() * VIEW_H, vx: between(rng, [-6, 6]), vy: between(rng, [-5, -1]) }));
}

// The motes at sim step `step`, screen-fixed and wrapping in the view: one world px each.
export function moteShapes(field, step) {
  const sec = step / 240;
  return field.map((m) => ({
    k: 'rect',
    x: ((((m.x + m.vx * sec) % VIEW_W) + VIEW_W) % VIEW_W) * ZOOM,
    y: ((((m.y + m.vy * sec) % VIEW_H) + VIEW_H) % VIEW_H) * ZOOM,
    w: ZOOM,
    h: ZOOM,
    c: COLOR.MOTE,
    a: 0.3,
  }));
}

// ------------------------------------------------------------------ END1: the ending

export const BEAT_S = 60 / 140;
export const RISE_S = 16 * BEAT_S;

// The glimpse of the next area, baked once, 1280 by 720: seven spires on a ground line from a PRNG seeded
// with 12, and one warm light in the tallest spire, with two soft halos.
export function glimpseShapes() {
  const rng = makeRng(12);
  const out = [];
  let tallest = null;
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
  const ly = 720 - tallest.h * 0.35;
  for (const [r, a] of [[24, 0.08], [12, 0.2], [5, 1]]) out.push({ k: 'ellipse', x: tallest.x, y: ly, rx: r, ry: r, c: COLOR.LIGHT, a });
  return out;
}

// The rise, `sec` seconds after the ending began (heard time): over RISE_S (4 bars) a smoothstep e carries
// the gauntlet's ceiling down and out of the view while the glimpse rises to rest at y 0.
export function riseAt(sec) {
  const u = Math.min(Math.max(sec / RISE_S, 0), 1);
  const e = u * u * (3 - 2 * u);
  return { u, ceilingY: -120 + 840 * e, glimpseY: 720 * (1 - e) };
}

// The gauntlet's ceiling as it passes: a band of tile 120 px tall with its edge along the bottom.
export function ceilingShapes(y) {
  return [
    { k: 'rect', x: 0, y, w: 1280, h: 120, c: COLOR.TILE, a: 1 },
    { k: 'rect', x: 0, y: y + 120 - LINE_PX, w: 1280, h: LINE_PX, c: COLOR.EDGE, a: 1 },
  ];
}

// The card: three dots 6 world px across, 24 world px apart, in the centre; dot i at full alpha on beat i
// of the bar (0 to 2), every dot at 0.3 otherwise (beat 3 rests all three).
export function cardShapes(beatOfBar) {
  return [0, 1, 2].map((i) => ({ k: 'ellipse', x: 640 + (i - 1) * 24 * ZOOM, y: 360, rx: 3 * ZOOM, ry: 3 * ZOOM, c: COLOR.SHELL, a: beatOfBar === i ? 1 : 0.3 }));
}

// The beat of the bar heard at context time `heard` (0 to 3): the music's bars begin on the run's origin, the
// context time of sim step 0, every 4 beats (amended for review R1, MAJOR 4).
export function beatOfBar(heard, origin) {
  return ((Math.floor((heard - origin) / BEAT_S) % 4) + 4) % 4;
}

// One frame of the scene `ending` at heard time `heard` (amended for review R1, MAJOR 4): t0 is the heard time of
// its first frame and run the run, whose origin carries the music's bars. Returns the glimpse image's y, the
// shapes its Graphics draws (the passing ceiling during the rise, then the card on the beat) and whether the card
// is up (the moment of the ?playtest line).
export function endingFrame(heard, t0, run) {
  const r = riseAt(heard - t0);
  if (r.u < 1) return { glimpseY: r.glimpseY, card: false, shapes: ceilingShapes(r.ceilingY) };
  return { glimpseY: r.glimpseY, card: true, shapes: cardShapes(beatOfBar(heard, run.origin)) };
}
