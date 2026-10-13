// The scene check's content half (review R3, MAJOR 1 and 2, MINOR 3): what the play scene and the ending draw, judged
// against the art reference (tests/fixtures/reference/art.mjs, HUSH-SPEC section 10.6) in Phaser 4.2.1's own terms.
// - encodeShapes: the command buffer drawShapes (section 10.6) leaves in a cleared Graphics for a list of shapes.
// - frameLogProblems: the play scene's logged frames (src/probe/api.ts frameLog) against the reference's playFrame,
//   replayed from the run's own start on the oracle: the levels carried frame to frame through the reference limiter
//   begun every frame, the creature's track stepped after every tick as the run steps it, and the view as the frame
//   read it.
// - bakeProbe and pixelProblems: the pixels of a baked texture at points a pixel or more from every edge, against the
//   bake's reference shapes composited there over transparent, as a DynamicTexture stores them (premultiplied).
// - endingDrawnProblems: the ending's Graphics through the rise and at the card, read beside the glimpse's place.
// - stepTimingProblems and endingTimingProblems (review R5, MAJOR 2): when the frames are drawn. Each play-scene frame's
//   step against the heard time the driver ran on (section 9.1), and each card frame's lit dot against the beat heard
//   while the scene drew it (section 13).
import { createSim, FIELDS } from '../tests/fixtures/oracle/index.mjs';
import * as ART from '../tests/fixtures/reference/art.mjs';
import { displaySec, MAX_STEPS_PER_FRAME, targetStep } from '../tests/fixtures/reference/driver.mjs';
import { createFlashLimiter } from '../tests/fixtures/reference/flash-limiter.mjs';
import { canonicalLayers } from './replay.mjs';

// Phaser 4.2.1's Graphics commands (src/gameobjects/graphics/Commands.js) that drawShapes's calls push.
export const CMD = Object.freeze({ ARC: 0, BEGIN_PATH: 1, CLOSE_PATH: 2, FILL_RECT: 3, LINE_TO: 4, MOVE_TO: 5, LINE_STYLE: 6, FILL_STYLE: 7, FILL_PATH: 8, STROKE_PATH: 9, FILL_TRIANGLE: 10 });
const TAU = Math.PI * 2;
// Graphics.fillEllipse's default smoothness: the ellipse is filled as this many points (Geom.Ellipse.GetPoints).
export const ELLIPSE_POINTS = 32;
// A logged number is rounded to 1e-4 in the page; a port may group its arithmetic differently.
export const DRAW_TOLERANCE = 1e-3;
// A stored channel may differ from the composite by this many levels (8-bit rounding of each blend).
export const PIXEL_TOLERANCE = 3;
// A point read in a bake lies at least this far (texture px) from every edge, so that no rasterisation rule decides it.
export const PIXEL_MARGIN = 1;
// Strokes are judged only along their straight middle: near a segment's ends (caps, joins) and anywhere near a ring
// (its tessellation) a point is left out.
const RING_SLACK = 1.5;
// The fewest full frames a run must be compared on.
export const MIN_FULL_FRAMES = 10;

const at = (state, name) => state[FIELDS.indexOf(name)];
export const roomOf = (world, n) => (n === 11 ? world.gauntlet : world.rooms[n - 1]);

// ------------------------------------------------------------------ the Graphics, as drawShapes leaves them

// What drawShapes(g, shapes, dx, dy) pushes into a Graphics cleared with no default style: each shape's style command,
// then its draw call as Phaser 4.2.1's Graphics methods expand it (fillPoints and strokePoints with closeShape close with
// a LINE_TO back to the first point; fillEllipse fills ELLIPSE_POINTS points; strokeCircle is one ARC; strokeRect is four
// two-point paths, the top and bottom ones reaching half the line width past each side).
export function encodeShapes(shapes, dx = 0, dy = 0) {
  const out = [];
  const pointsOf = (p) => {
    const q = [];
    for (let i = 0; i + 1 < p.length; i += 2) q.push([p[i] + dx, p[i + 1] + dy]);
    return q;
  };
  const path = (q, close, end) => {
    out.push(CMD.BEGIN_PATH, CMD.MOVE_TO, q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) out.push(CMD.LINE_TO, q[i][0], q[i][1]);
    if (close) out.push(CMD.LINE_TO, q[0][0], q[0][1]);
    out.push(end);
  };
  for (const s of shapes) {
    switch (s.k) {
      case 'rect':
        out.push(CMD.FILL_STYLE, s.c, s.a, CMD.FILL_RECT, s.x + dx, s.y + dy, s.w, s.h);
        break;
      case 'tri':
        out.push(CMD.FILL_STYLE, s.c, s.a, CMD.FILL_TRIANGLE, s.p[0] + dx, s.p[1] + dy, s.p[2] + dx, s.p[3] + dy, s.p[4] + dx, s.p[5] + dy);
        break;
      case 'poly':
        out.push(CMD.FILL_STYLE, s.c, s.a);
        path(pointsOf(s.p), true, CMD.FILL_PATH);
        break;
      case 'ellipse': {
        out.push(CMD.FILL_STYLE, s.c, s.a);
        path(ellipsePoints(s.x + dx, s.y + dy, 2 * s.rx, 2 * s.ry), true, CMD.FILL_PATH);
        break;
      }
      case 'ring':
        out.push(CMD.LINE_STYLE, s.lw, s.c, s.a, CMD.BEGIN_PATH, CMD.ARC, s.x + dx, s.y + dy, s.r, 0, TAU, false, 0, CMD.STROKE_PATH);
        break;
      case 'frame': {
        out.push(CMD.LINE_STYLE, s.lw, s.c, s.a);
        for (const [a, b] of frameSegments(s.x + dx, s.y + dy, s.w, s.h, s.lw)) out.push(CMD.BEGIN_PATH, CMD.MOVE_TO, a[0], a[1], CMD.LINE_TO, b[0], b[1], CMD.STROKE_PATH);
        break;
      }
      case 'line':
        out.push(CMD.LINE_STYLE, s.lw, s.c, s.a);
        path(pointsOf(s.p), false, CMD.STROKE_PATH);
        break;
      case 'outline':
        out.push(CMD.LINE_STYLE, s.lw, s.c, s.a);
        path(pointsOf(s.p), true, CMD.STROKE_PATH);
        break;
      default:
        throw new Error(`unknown shape kind ${s.k}`);
    }
  }
  return out;
}

// Geom.Ellipse(x, y, w, h).getPoints(ELLIPSE_POINTS): angle (TAU - 0) * (i / n) + 0, x + (w / 2) cos, y + (h / 2) sin.
function ellipsePoints(x, y, w, h) {
  const q = [];
  for (let i = 0; i < ELLIPSE_POINTS; i++) {
    const angle = TAU * (i / ELLIPSE_POINTS) + 0;
    q.push([x + (w / 2) * Math.cos(angle), y + (h / 2) * Math.sin(angle)]);
  }
  return q;
}

// Graphics.strokeRect's four paths: x down, x + w down, then the top and the bottom from x - lw/2 to (x + lw/2) + w.
function frameSegments(x, y, w, h, lw) {
  const half = lw / 2;
  const minx = x - half;
  const maxx = x + half;
  return [[[x, y], [x, y + h]], [[x + w, y], [x + w, y + h]], [[minx, y], [maxx + w, y]], [[minx, y + h], [maxx + w, y + h]]];
}

// The first difference between a logged buffer and the encoded one, as a phrase, or null when they agree.
export function bufferDifference(got, want, tol = DRAW_TOLERANCE) {
  if (!Array.isArray(got)) return 'could not be read';
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) {
    const g = got[i];
    const w = want[i];
    const same = typeof w === 'boolean' ? g === w : typeof g === 'number' && Math.abs(g - w) <= tol;
    if (!same) {
      const show = (a) => JSON.stringify(a.slice(Math.max(0, i - 3), i + 4).map((v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
      return `differs at entry ${i} of ${want.length}: ${show(got)}, want ${show(want)}`;
    }
  }
  if (got.length !== want.length) return `holds ${got.length} entries, want ${want.length}`;
  return null;
}

// ------------------------------------------------------------------ the play scene's frames

// The run of `room` from its own start, as the live run plays it after the probe's play(): a fresh sim at the entrance
// with the layers of every earlier room back, fed the witness's input changes while the room is still being played
// (not cleared, not left, not finished), then nothing (the play() source, and after it the idle keyboard). Gives the
// state after every step up to `last` and the creature's track after it (section 10.6: trackStep after every tick).
export function replayRun(world, room, changes, last) {
  const sim = createSim(world, { room, step: 0, layers: canonicalLayers(room) });
  const states = [Array.from(sim.save())];
  let track = ART.createTrack();
  const tracks = [track];
  let k = 0;
  let bits = 0;
  while (sim.step < last) {
    const step = sim.step;
    const st = sim.status();
    let input = 0;
    if (st.room === room && st.cleared === 0 && !st.finished) {
      while (k < changes.length && changes[k][0] <= step) {
        bits = changes[k][1];
        k += 1;
      }
      input = bits;
    }
    sim.tick(input);
    const s = Array.from(sim.save());
    states.push(s);
    track = ART.trackStep(track, { step: at(s, 'step'), x: at(s, 'x'), y: at(s, 'y'), form: at(s, 'form'), grounded: at(s, 'grounded'), dead: at(s, 'dead'), layers: at(s, 'layers') });
    tracks.push(track);
  }
  return { states, tracks };
}

const DRAWN = [[6, 'beat entities and ring', 'beat'], [7, 'creature', 'creature'], [8, 'dust', 'dust']];

// The play scene's frame log of one run (src/probe/api.ts frameLog: every frame from the run's bake, a full record
// every few), against the reference. Every frame is replayed in order: a bake (the first frame, and every new room)
// starts the levels from [], each frame begins the reference limiter and asks it through beatShapes. On a full frame the
// logged sim must equal the replay, the run's view must hold the creature's box at this step and at the step before or
// this one, the room's first chunk must sit at -camPx, and the three Graphics (depths 6, 7 and 8) must hold exactly the
// encoded playFrame lists. Returns { problems, compared, held, rings }: held counts the full frames drawn while a beat
// entity was between its two levels (a change the limiter held), rings those that drew a layer's ring.
export function frameLogProblems({ world, room, changes, log, label = `room ${room}` }) {
  const problems = [];
  if (!log || !Array.isArray(log.light) || !log.light.length) return { problems: [`${label}: no frame of the play scene was logged`], compared: 0, held: 0, rings: 0 };
  if (log.dropped) problems.push(`${label}: ${log.dropped} frames dropped from the log`);
  const sims = new Set(log.light.map((r) => r[0]));
  if (sims.size !== 1) return { problems: [`${label}: the run restarted while its frames were logged (${sims.size} sims)`], compared: 0, held: 0, rings: 0 };
  const last = Math.max(...log.light.map((r) => r[2]));
  const { states, tracks } = replayRun(world, room, changes, last);
  const fullAt = new Map((log.full || []).map((f) => [f.index, f]));
  const fields = new Map();
  const limiter = createFlashLimiter(1280, 720);
  let levels = [];
  let baked = null;
  let prevStep = -1;
  let compared = 0;
  let held = 0;
  let rings = 0;
  for (let i = 0; i < log.light.length && problems.length < 4; i++) {
    const [, rn, step] = log.light[i];
    if (step < prevStep) { problems.push(`${label}: the sim went back from step ${prevStep} to ${step}`); break; }
    prevStep = step;
    const r = roomOf(world, rn);
    const state = states[step];
    if (!r || !state || at(state, 'room') !== rn) { problems.push(`${label}: a frame at step ${step} in room ${rn}, where the run's replay is in room ${state ? at(state, 'room') : 'none'}`); break; }
    if (baked !== rn) {
      baked = rn;
      levels = [];
    }
    limiter.beginFrame();
    const full = fullAt.get(i);
    if (!full) {
      levels = ART.beatShapes(r, step, at(state, 'layers'), 0, levels, limiter).levels;
      continue;
    }
    const where = `${label} at step ${step}${rn !== room ? ` (room ${rn}, after the clear)` : ''}`;
    const k = full.state ? full.state.findIndex((v, j) => v !== state[j]) : 0;
    if (k >= 0) { problems.push(`${where}: the live sim differs from the run's replay (${FIELDS[k] ?? 'state'} ${full.state ? full.state[k] : 'unread'}, replay ${state[k]})`); break; }
    if (!Array.isArray(full.view) || full.view.length !== 5) { problems.push(`${where}: the run's view could not be read`); break; }
    const [prevX, prevY, x, y, alpha] = full.view;
    const before = states[step - 1] ?? state;
    const tweened = prevX === at(before, 'x') && prevY === at(before, 'y');
    const placed = prevX === x && prevY === y;
    if (x !== at(state, 'x') || y !== at(state, 'y') || !(tweened || placed) || !(alpha >= 0 && alpha <= 1)) {
      problems.push(`${where}: the run's view ${JSON.stringify(full.view)} is not the creature's box at this step and the one before (${at(state, 'x')}, ${at(state, 'y')}; ${at(before, 'x')}, ${at(before, 'y')})`);
      break;
    }
    if (!fields.has(rn)) fields.set(rn, ART.moteField(r));
    const f = ART.playFrame({ room: r, sim: { step, save: () => state }, view: { prevX, prevY, x, y, alpha }, track: tracks[step], field: fields.get(rn), levels, limiter });
    levels = f.levels;
    if (f.levels.some((v) => v > 0 && v < 1)) held += 1;
    if (f.beat.some((s) => s.k === 'ring')) rings += 1;
    if (typeof full.x0 !== 'number' || Math.abs(full.x0 + f.camPx) > 1e-6) problems.push(`${where}: the room's first chunk at x ${full.x0}, want ${-f.camPx} (the camera of the view)`);
    for (const [depth, name, list] of DRAWN) {
      const g = (full.graphics || []).filter((d) => d.depth === depth);
      if (g.length !== 1) { problems.push(`${where}: ${g.length} Graphics at depth ${depth}, want one (the ${name})`); continue; }
      const d = bufferDifference(g[0].buffer, encodeShapes(f[list]));
      if (d) problems.push(`${where}: the ${name} (depth ${depth}) ${d}`);
    }
    compared += 1;
  }
  if (!problems.length && compared < MIN_FULL_FRAMES) problems.push(`${label}: ${compared} full frames compared, want at least ${MIN_FULL_FRAMES}`);
  return { problems, compared, held, rings };
}

// ------------------------------------------------------------------ the bakes' pixels

function pointInPolygon(q, x, y) {
  let inside = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const [xi, yi] = q[i];
    const [xj, yj] = q[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segmentDistance(ax, ay, bx, by, x, y) {
  const dx = bx - ax;
  const dy = by - ay;
  const L2 = dx * dx + dy * dy;
  const t = L2 > 0 ? Math.min(Math.max(((x - ax) * dx + (y - ay) * dy) / L2, 0), 1) : 0;
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

const pairs = (p) => {
  const q = [];
  for (let i = 0; i + 1 < p.length; i += 2) q.push([p[i], p[i + 1]]);
  return q;
};

// A filled polygon: 'in' or 'out' a margin clear of its boundary, else 'edge'.
function fillClass(q, x, y) {
  let d = Infinity;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) d = Math.min(d, segmentDistance(q[j][0], q[j][1], q[i][0], q[i][1], x, y));
  if (d < PIXEL_MARGIN) return 'edge';
  return pointInPolygon(q, x, y) ? 'in' : 'out';
}

// A stroked straight segment of half width hw, its ends (caps and joins) left uncertain.
function segmentClass(a, b, hw, x, y) {
  if (Math.hypot(x - a[0], y - a[1]) <= hw + PIXEL_MARGIN || Math.hypot(x - b[0], y - b[1]) <= hw + PIXEL_MARGIN) return 'edge';
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  if (L === 0) return 'out';
  const t = ((x - a[0]) * dx + (y - a[1]) * dy) / L;
  const perp = Math.abs((x - a[0]) * dy - (y - a[1]) * dx) / L;
  if (t > 0 && t < L && perp <= hw - PIXEL_MARGIN) return 'in';
  if (t <= 0 || t >= L || perp >= hw + PIXEL_MARGIN) return 'out';
  return 'edge';
}

// Each shape as the regions it is drawn in, one composite layer per draw call: a fill is one polygon; a frame four
// separate segments; a line or an outline one path of segments (a point two of its segments cover is left out); a
// ring only ever an uncertain band.
function drawRegions(s) {
  const fill = (q) => [{ c: s.c, a: s.a, bbox: bboxOf(q, 0), cls: (x, y) => fillClass(q, x, y) }];
  switch (s.k) {
    case 'rect': return fill([[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]]);
    case 'tri': case 'poly': return fill(pairs(s.p));
    case 'ellipse': return fill(ellipsePoints(s.x, s.y, 2 * s.rx, 2 * s.ry));
    case 'frame': return frameSegments(s.x, s.y, s.w, s.h, s.lw).map(([a, b]) => ({ c: s.c, a: s.a, bbox: bboxOf([a, b], s.lw), cls: (x, y) => segmentClass(a, b, s.lw / 2, x, y) }));
    case 'line': case 'outline': {
      const q = pairs(s.p);
      if (s.k === 'outline') q.push(q[0]);
      const segs = q.slice(1).map((b, i) => [q[i], b]);
      return [{
        c: s.c, a: s.a, bbox: bboxOf(q, s.lw),
        cls: (x, y) => {
          const cs = segs.map(([a, b]) => segmentClass(a, b, s.lw / 2, x, y));
          if (cs.includes('edge')) return 'edge';
          const n = cs.filter((c) => c === 'in').length;
          return n > 1 ? 'edge' : n === 1 ? 'in' : 'out';
        },
      }];
    }
    case 'ring': {
      const reach = s.r + s.lw / 2 + RING_SLACK;
      return [{ c: s.c, a: s.a, bbox: [s.x - reach, s.y - reach, s.x + reach, s.y + reach], cls: (x, y) => (Math.abs(Math.hypot(x - s.x, y - s.y) - s.r) <= s.lw / 2 + RING_SLACK ? 'edge' : 'out') }];
    }
    default: throw new Error(`unknown shape kind ${s.k}`);
  }
}

function bboxOf(q, lw) {
  const pad = lw / 2 + PIXEL_MARGIN + 1;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

// Premultiplied "over" from transparent, in list order, as 8-bit bytes.
export function composite(layers) {
  let r = 0; let g = 0; let b = 0; let a = 0;
  for (const l of layers) {
    const k = l.a;
    r = (((l.c >> 16) & 255) / 255) * k + r * (1 - k);
    g = (((l.c >> 8) & 255) / 255) * k + g * (1 - k);
    b = ((l.c & 255) / 255) * k + b * (1 - k);
    a = k + a * (1 - k);
  }
  return [r, g, b, a].map((v) => Math.round(v * 255));
}

// The points of a w by h bake of `shapes` that the check reads: each candidate pixel [px, py] (its centre at +0.5)
// that lies a margin clear of every shape's edge and inside the texture, with the bytes the bake must hold there.
export function bakeProbe(shapes, w, h, candidates) {
  const regions = shapes.flatMap(drawRegions);
  const seen = new Set();
  const out = [];
  for (const [px, py] of candidates) {
    if (!(px >= 0 && py >= 0 && px < w && py < h)) continue;
    const key = `${px},${py}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const x = px + 0.5;
    const y = py + 0.5;
    const layers = [];
    let ok = true;
    for (const rg of regions) {
      const [x0, y0, x1, y1] = rg.bbox;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const c = rg.cls(x, y);
      if (c === 'edge') { ok = false; break; }
      if (c === 'in') layers.push(rg);
    }
    if (ok) out.push({ x: px, y: py, want: composite(layers) });
  }
  return out;
}

// The candidates of a room chunk: one pixel per cell of columns col0 to col1 - 1, where the cell's art is: its centre
// for a solid, empty or entity cell, the middle triangle's centroid for a static spike, the left stroke of its frame
// for a portal.
export function chunkCandidates(room, col0, col1) {
  const out = [];
  const DIR = { 2: 'up', 3: 'down', 4: 'left', 5: 'right' };
  for (let c = col0; c < col1; c++) {
    for (let r = 0; r < room.H; r++) {
      const x = (c - col0) * ART.TILE_PX;
      const y = r * ART.TILE_PX;
      const code = ART.codeAt(room, c, r);
      if (DIR[code]) {
        const p = ART.spikeTris(x, y, DIR[code], 0, 1)[1].p;
        out.push([Math.floor((p[0] + p[2] + p[4]) / 3), Math.floor((p[1] + p[3] + p[5]) / 3)]);
      } else if (code === 6 || code === 7) out.push([x + 1, y + 20]);
      else out.push([x + 20, y + 20]);
    }
  }
  return out;
}

// The candidates of a band, the fog, the vignette or the glimpse: a grid every `step` px, and a point inside each shape
// (a rect's centre, a triangle's centroid, an ellipse's centre, an arch's left leg).
export function shapeCandidates(shapes, w, h, step) {
  const out = [];
  for (let y = Math.floor(step / 2); y < h; y += step) for (let x = Math.floor(step / 2); x < w; x += step) out.push([x, y]);
  for (const s of shapes) {
    if (s.k === 'rect') out.push([Math.floor(s.x + s.w / 2), Math.floor(s.y + s.h / 2)]);
    else if (s.k === 'tri') out.push([Math.floor((s.p[0] + s.p[2] + s.p[4]) / 3), Math.floor((s.p[1] + s.p[3] + s.p[5]) / 3)]);
    else if (s.k === 'ellipse') out.push([Math.floor(s.x), Math.floor(s.y)]);
    else if (s.k === 'poly' && s.p.length >= 6) {
      // The arch's left leg: its first point is the left foot, its last the inner foot.
      const n = s.p.length;
      out.push([Math.floor((s.p[0] + s.p[n - 2]) / 2), Math.floor(s.p[1] - 4)]);
    }
  }
  return out;
}

// Every bake of a room as { key, w, h, probe }: its chunks (RN1) and bands (RN4), and with `fixed` the fog and the
// vignette (baked once per play scene).
export function roomBakes(room, number, { fixed = false } = {}) {
  const nn = String(number).padStart(2, '0');
  const out = [];
  for (const [i, c] of ART.bakeChunks(room).entries()) {
    const shapes = ART.roomShapes(room, c.col0, c.col1);
    out.push({ key: `room-${nn}-${i}`, w: c.w, h: c.h, probe: bakeProbe(shapes, c.w, c.h, chunkCandidates(room, c.col0, c.col1)) });
  }
  for (const [b, band] of ART.depthBands(room).entries()) out.push({ key: `band-${nn}-${b}`, w: band.w, h: band.h, probe: bakeProbe(band.shapes, band.w, band.h, shapeCandidates(band.shapes, band.w, band.h, 40)) });
  if (fixed) {
    // The fog's strips (30 px tall) at their middles, the vignette's cells (20 px) at their centres.
    const strips = [];
    for (let y = 15; y < 720; y += 30) for (const x of [15, 640, 1265]) strips.push([x, y]);
    out.push({ key: 'fog', w: 1280, h: 720, probe: bakeProbe(ART.fogShapes(), 1280, 720, strips) });
    const cells = [];
    for (let y = 10; y < 720; y += 60) for (let x = 10; x < 1280; x += 60) cells.push([x, y]);
    out.push({ key: 'vignette', w: 1280, h: 720, probe: bakeProbe(ART.vignetteShapes(), 1280, 720, cells) });
  }
  return out;
}

export function glimpseBake() {
  const shapes = ART.glimpseShapes();
  return { key: 'glimpse', w: 1280, h: 720, probe: bakeProbe(shapes, 1280, 720, shapeCandidates(shapes, 1280, 720, 64)) };
}

// The pixels read at a bake's points (null: the texture could not be read) against what each must hold. Returns its
// problems, the first few points that differ named.
export function pixelProblems(bake, pixels, label) {
  if (!Array.isArray(pixels)) return [`${label}: the texture ${bake.key} could not be read`];
  if (pixels.length !== bake.probe.length) return [`${label}: ${pixels.length} pixels of ${bake.key} read, want ${bake.probe.length}`];
  const bad = [];
  bake.probe.forEach((p, i) => {
    const got = pixels[i];
    if (!Array.isArray(got) || got.some((v, k) => !(Math.abs(v - p.want[k]) <= PIXEL_TOLERANCE))) bad.push({ p, got });
  });
  if (!bad.length) return [];
  const show = bad.slice(0, 3).map(({ p, got }) => `(${p.x}, ${p.y}) ${JSON.stringify(got)} want ${JSON.stringify(p.want)}`).join(', ');
  return [`${label}: ${bad.length} of ${bake.probe.length} pixels of ${bake.key} differ from its reference shapes (${show})`];
}

// ------------------------------------------------------------------ the ending

// Window of heard time after a beat line in which a read may still see the frame drawn before it.
export const CARD_BEAT_SLACK_S = 0.1;

// The ending's reads ({ layout, drawn, heard, final }, in time order; heard is { heard, origin } at the read) through the
// rise and at the card. The glimpse's y names the frame's place in the rise (section 13: glimpseY = 720 (1 - e)): while
// it is above 0 the Graphics must hold exactly ceilingShapes(-120 + 840 e); at 0 the card is up and it must hold
// cardShapes(b), b the beat of the bar heard at the read (beatOfBar from the run's origin), or the beat before when a beat
// line passed within CARD_BEAT_SLACK_S. Returns { problems, rise, card }: how many reads were judged in each part.
export function endingDrawnProblems(reads, { label = 'ending' } = {}) {
  const problems = [];
  let rise = 0;
  let card = 0;
  for (const r of reads) {
    if (problems.length >= 3) break;
    const glimpse = Array.isArray(r.layout) ? r.layout.find((o) => o.type === 'Image' && o.key === 'glimpse') : null;
    const g = Array.isArray(r.drawn) ? r.drawn.filter((d) => d.depth === 1) : [];
    if (!glimpse || g.length !== 1) { problems.push(`${label}: a read without the glimpse and one Graphics at depth 1`); break; }
    if (glimpse.y > 0) {
      const e = 1 - glimpse.y / 720;
      const d = bufferDifference(g[0].buffer, encodeShapes(ART.ceilingShapes(-120 + 840 * e)));
      if (d) problems.push(`${label}: the ceiling with the glimpse at y ${Math.round(glimpse.y * 10) / 10} ${d}`);
      rise += 1;
    } else {
      if (!r.heard || typeof r.heard.heard !== 'number') { problems.push(`${label}: the heard time could not be read at the card`); break; }
      const beats = new Set([ART.beatOfBar(r.heard.heard, r.heard.origin), ART.beatOfBar(r.heard.heard - CARD_BEAT_SLACK_S, r.heard.origin)]);
      const diffs = [...beats].map((b) => bufferDifference(g[0].buffer, encodeShapes(ART.cardShapes(b))));
      if (!diffs.includes(null)) problems.push(`${label}: the card ${diffs[0]} (beat ${[...beats].join(' or ')} of the bar)`);
      card += 1;
    }
  }
  if (!problems.length && !rise) problems.push(`${label}: no read in the rise`);
  if (!problems.length && !card) problems.push(`${label}: no read of the card`);
  return { problems, rise, card };
}

// ------------------------------------------------------------------ the frames' time (review R5, MAJOR 2)

// The steps a frame's sim may stand from the driver's for the probe's heard time: the probe reads it microseconds after the
// driver, so a step line can fall between the two reads.
export const STEP_SLACK = 1;
export const MIN_CARD_FRAMES = 30;

// The play scene's frames held to the heard time. The probe reads the heard time and the run's origin in a PRE_STEP
// listener that runs after the driver's (src/probe/api.ts), so the step a frame records must be the driver's for that time,
// section 9.1: max(prev, min(targetStep(heard, origin, displaySec(avOffset)), prev + MAX_STEPS_PER_FRAME)), prev the step of
// the frame before, within STEP_SLACK. A frame whose heard time could not be read (the context not running, the clock line
// not valid) and the first frame of each run are not judged. Light records are [sim, room, step, heard, origin]. Returns
// { problems, judged, worst }: worst is the largest distance, in steps, positive when the sim stood behind.
export function stepTimingProblems(light, { avOffset = 0, label = 'run' } = {}) {
  const problems = [];
  let judged = 0;
  let worst = 0;
  const display = displaySec(avOffset ?? 0);
  for (let i = 1; i < (light || []).length; i++) {
    const [sim, room, step, heard, origin] = light[i];
    const prev = light[i - 1];
    if (prev[0] !== sim || typeof heard !== 'number' || typeof origin !== 'number') continue;
    const want = Math.max(prev[2], Math.min(targetStep(heard, origin, display), prev[2] + MAX_STEPS_PER_FRAME));
    const d = want - step;
    judged += 1;
    if (Math.abs(d) > Math.abs(worst)) worst = d;
    if (Math.abs(d) > STEP_SLACK && problems.length < 3) {
      problems.push(`${label}: a frame in room ${room} at step ${step}, where the heard time gives step ${want} (section 9.1: ${d > 0 ? `${d} steps behind the music` : `${-d} steps ahead of it`})`);
    }
  }
  return { problems, judged, worst };
}

// The ending's card held to the heard beat. The probe logs every frame of the scene `ending` with the heard time at prestep
// and at poststep, between which the scene read its own (src/probe/api.ts endingLog). Once the card is up (the glimpse at
// y 0), a frame whose two times fall in one beat of the bar must draw exactly cardShapes(beatOfBar) of that beat; a frame
// whose bracket holds a beat line is not judged. Returns { problems, judged }.
export function endingTimingProblems(frames, { label = 'ending' } = {}) {
  const problems = [];
  let judged = 0;
  for (const f of frames || []) {
    if (problems.length >= 3) break;
    if (f.y !== 0 || typeof f.pre !== 'number' || typeof f.post !== 'number' || typeof f.origin !== 'number') continue;
    const b = ART.beatOfBar(f.pre, f.origin);
    if (ART.beatOfBar(f.post, f.origin) !== b) continue;
    const g = (f.graphics || []).filter((d) => d.depth === 1);
    if (g.length !== 1) { problems.push(`${label}: a card frame without one Graphics at depth 1`); break; }
    judged += 1;
    const d = bufferDifference(g[0].buffer, encodeShapes(ART.cardShapes(b)));
    if (d) {
      const drawn = [0, 1, 2, 3].find((k) => !bufferDifference(g[0].buffer, encodeShapes(ART.cardShapes(k))));
      const into = ((f.pre - f.origin) / ART.BEAT_S) % 1;
      problems.push(`${label}: a card frame heard ${Math.round(into * ART.BEAT_S * 1000)} ms into beat ${b} of its bar draws ${drawn === undefined ? 'no card' : `beat ${drawn}`} (${d})`);
    }
  }
  if (!problems.length && judged < MIN_CARD_FRAMES) problems.push(`${label}: ${judged} card frames judged against the heard beat, want at least ${MIN_CARD_FRAMES}`);
  return { problems, judged };
}
