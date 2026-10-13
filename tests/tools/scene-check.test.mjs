// The scene check's content half (review R3, MAJOR 1 and 2, MINOR 3; tools/scene-check.mjs), controlled in Node. The
// encoder is pinned to Phaser 4.2.1's Graphics, as read from its source (src/gameobjects/graphics/Graphics.js); the
// frame log's judge passes a log drawn as the reference draws and fails each way a scene could draw otherwise; the
// pixel judge passes the bytes its reference composite gives and fails a blank or foreign bake; the ending's judge
// passes the ceiling and the card on the beat and fails an undrawn card, a card off the beat and a ceiling elsewhere.
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileWorld, FIELDS } from '../fixtures/oracle/index.mjs';
import * as ART from '../fixtures/reference/art.mjs';
import { createFlashLimiter } from '../fixtures/reference/flash-limiter.mjs';
import { REPO } from '../../tools/probe-lib.mjs';
import { readWitness, loadRoomFiles } from '../../tools/replay.mjs';
import { bakeProbe, CMD, composite, encodeShapes, endingDrawnProblems, endingTimingProblems, frameLogProblems, pixelProblems, replayRun, roomBakes, stepTimingProblems } from '../../tools/scene-check.mjs';
import * as DRIVER from '../fixtures/reference/driver.mjs';

const world = compileWorld(loadRoomFiles(path.join(REPO, 'rooms')));

describe('encodeShapes: drawShapes in Phaser 4.2.1\'s command buffer', () => {
  it('pushes each shape\'s style, then its draw call as Graphics expands it', () => {
    expect(encodeShapes([{ k: 'rect', x: 1, y: 2, w: 3, h: 4, c: 0x161b28, a: 1 }])).toEqual([CMD.FILL_STYLE, 0x161b28, 1, CMD.FILL_RECT, 1, 2, 3, 4]);
    expect(encodeShapes([{ k: 'tri', p: [1, 2, 3, 4, 5, 6], c: 9, a: 0.5 }], 10, 20)).toEqual([7, 9, 0.5, 10, 11, 22, 13, 24, 15, 26]);
    // fillPoints(points, true): a path closed by a LINE_TO back to the first point, then FILL_PATH.
    expect(encodeShapes([{ k: 'poly', p: [0, 0, 10, 0, 10, 10], c: 9, a: 1 }])).toEqual([7, 9, 1, 1, 5, 0, 0, 4, 10, 0, 4, 10, 10, 4, 0, 0, 8]);
    // strokeCircle: one ARC from 0 to TAU, clockwise, no overshoot.
    expect(encodeShapes([{ k: 'ring', x: 5, y: 6, r: 7, lw: 2.5, c: 9, a: 0.2 }])).toEqual([6, 2.5, 9, 0.2, 1, 0, 5, 6, 7, 0, Math.PI * 2, false, 0, 9]);
    // strokeRect: four two-point paths, the top and the bottom reaching lw / 2 past each side.
    expect(encodeShapes([{ k: 'frame', x: 10, y: 20, w: 30, h: 40, lw: 4, c: 9, a: 1 }])).toEqual([
      6, 4, 9, 1,
      1, 5, 10, 20, 4, 10, 60, 9,
      1, 5, 40, 20, 4, 40, 60, 9,
      1, 5, 8, 20, 4, 42, 20, 9,
      1, 5, 8, 60, 4, 42, 60, 9,
    ]);
    expect(encodeShapes([{ k: 'line', p: [0, 0, 1, 1, 2, 0], lw: 2, c: 9, a: 1 }])).toEqual([6, 2, 9, 1, 1, 5, 0, 0, 4, 1, 1, 4, 2, 0, 9]);
    expect(encodeShapes([{ k: 'outline', p: [0, 0, 1, 1, 2, 0], lw: 2, c: 9, a: 1 }])).toEqual([6, 2, 9, 1, 1, 5, 0, 0, 4, 1, 1, 4, 2, 0, 4, 0, 0, 9]);
  });

  it('fills an ellipse as 32 points around its centre, closed', () => {
    const b = encodeShapes([{ k: 'ellipse', x: 100, y: 50, rx: 4, ry: 2, c: 9, a: 1 }]);
    expect(b.slice(0, 7)).toEqual([7, 9, 1, 1, 5, 104, 50]);
    expect(b.length).toBe(3 + 1 + 3 + 31 * 3 + 3 + 1);
    expect(b[b.length - 1]).toBe(CMD.FILL_PATH);
    // The ninth point is a quarter of the way round: straight below the centre (y down).
    expect(b[4 + 3 + 7 * 3 + 1]).toBeCloseTo(100, 9);
    expect(b[4 + 3 + 7 * 3 + 2]).toBeCloseTo(52, 9);
  });
});

// A frame log of room 2's run (two stones on layer 1, each at the limiter's edge) drawn by a scene that does what
// section 10.6 says, or with `fault`: frames every 4 steps, a full record every 4th frame, the view tweened at alpha 0.5.
function drawnLog(room, frames, fault = {}) {
  const w = readWitness(path.join(REPO, 'replays', `${String(room).padStart(2, '0')}-${room === 2 ? 'heartbeat' : 'thorns'}.json`));
  const { states, tracks } = replayRun(world, room, w.changes, frames * 4);
  const limiter = createFlashLimiter(1280, 720);
  const r = world.rooms[room - 1];
  const field = ART.moteField(r);
  let levels = [];
  const light = [];
  const full = [];
  for (let i = 0; i < frames; i++) {
    const step = i * 4;
    const state = states[step];
    if (!fault.noBeginFrame || i === 0) limiter.beginFrame();
    const before = states[Math.max(step - 1, 0)];
    const view = { prevX: before[FIELDS.indexOf('x')], prevY: before[FIELDS.indexOf('y')], x: state[FIELDS.indexOf('x')], y: state[FIELDS.indexOf('y')], alpha: 0.5 };
    const f = ART.playFrame({ room: r, sim: { step, save: () => state }, view, track: tracks[step], field, levels: fault.levelsUnkept ? [] : levels, limiter });
    levels = f.levels;
    light.push([1, room, step]);
    if (i % 4 === 0) {
      const beat = fault.beatUndrawn ? f.beat.filter((s) => s.k === 'ring') : f.beat;
      full.push({
        index: i, sim: 1, room, step,
        state: fault.state && i === 8 ? state.map((v, k) => (k === FIELDS.indexOf('vx') ? v + 1 : v)) : state,
        view: [view.prevX, view.prevY, view.x, view.y, view.alpha],
        x0: -f.camPx + (fault.x0 || 0),
        graphics: [
          { depth: 6, buffer: encodeShapes(beat) },
          { depth: 7, buffer: encodeShapes(f.creature, 0, fault.creatureDy || 0) },
          { depth: 8, buffer: encodeShapes(f.dust) },
        ],
      });
    }
  }
  return { log: { light, full, dropped: 0 }, changes: w.changes };
}
const judgeLog = (room, frames, fault) => {
  const { log, changes } = drawnLog(room, frames, fault);
  return frameLogProblems({ world, room, changes, log, label: `room ${room}` });
};

describe('frameLogProblems: the play scene\'s frames against the reference', () => {
  it('passes a run drawn as section 10.6 draws it, its held changes included', () => {
    const r = judgeLog(2, 400);
    expect(r.problems).toEqual([]);
    expect(r.compared).toBe(100);
    expect(r.held).toBeGreaterThan(0);
  });

  it('fails the reviewer\'s faults: the beat entities undrawn, the creature drawn 40 px down, the camera elsewhere', () => {
    expect(judgeLog(2, 120, { beatUndrawn: true }).problems.join(' | ')).toMatch(/the beat entities and ring \(depth 6\) holds 0 entries, want \d+/);
    expect(judgeLog(2, 120, { creatureDy: 40 }).problems.join(' | ')).toMatch(/the creature \(depth 7\) differs at entry \d+/);
    expect(judgeLog(2, 120, { x0: 7 }).problems.join(' | ')).toMatch(/the room's first chunk at x 7, want 0/);
  });

  it('fails MINOR 3\'s faults: a limiter never begun again, levels not kept from frame to frame', () => {
    // Room 2's stones are each held at the limiter's edge, so without the levels kept they switch at once.
    expect(judgeLog(2, 400, { levelsUnkept: true }).problems.join(' | ')).toMatch(/the beat entities and ring \(depth 6\) differs at entry \d+/);
    // Room 4's spikes are small: a limiter left full holds what the reference lets through.
    expect(judgeLog(4, 400, { noBeginFrame: true }).problems.join(' | ')).toMatch(/the beat entities and ring \(depth 6\) differs at entry \d+/);
  });

  it('fails a live sim off the replay, a restarted run, an empty log and too few full frames', () => {
    expect(judgeLog(2, 120, { state: true }).problems.join(' | ')).toMatch(/the live sim differs from the run's replay \(vx/);
    const { log, changes } = drawnLog(2, 120);
    log.light[50] = [2, 2, log.light[50][2]];
    expect(frameLogProblems({ world, room: 2, changes, log }).problems.join(' | ')).toMatch(/the run restarted while its frames were logged/);
    expect(frameLogProblems({ world, room: 2, changes, log: { light: [], full: [], dropped: 0 } }).problems.join(' | ')).toMatch(/no frame of the play scene was logged/);
    expect(judgeLog(2, 30).problems.join(' | ')).toMatch(/8 full frames compared, want at least 10/);
  });
});

describe('the bakes\' pixels', () => {
  const room = world.rooms[0];
  const bakes = roomBakes(room, 1, { fixed: true });
  const chunk = bakes.find((b) => b.key === 'room-01-0');

  it('reads a solid tile, an empty cell and the fog\'s strips as their shapes composite there', () => {
    expect(chunk.probe.some((p) => p.want.join() === '22,27,40,255')).toBe(true);
    expect(chunk.probe.some((p) => p.want.join() === '0,0,0,0')).toBe(true);
    expect(composite([{ c: 0x7fd6ff, a: 0.25 }, { c: 0x7fd6ff, a: 1 }])).toEqual([127, 214, 255, 255]);
    expect(composite([{ c: 0x1a2233, a: 0.5 }])).toEqual([13, 17, 26, 128]);
    for (const b of bakes) expect(pixelProblems(b, b.probe.map((p) => p.want), 'room 01')).toEqual([]);
  });

  it('leaves out a point within a pixel of an edge', () => {
    const rect = [{ k: 'rect', x: 10, y: 10, w: 20, h: 20, c: 0xffffff, a: 1 }];
    expect(bakeProbe(rect, 64, 64, [[20, 20], [10, 20], [9, 20], [5, 20]]).map((p) => [p.x, p.y, p.want[3]])).toEqual([[20, 20, 255], [5, 20, 0]]);
  });

  it('fails a blank bake, another room\'s geometry, and an unreadable texture', () => {
    expect(pixelProblems(chunk, chunk.probe.map(() => [0, 0, 0, 0]), 'room 01').join('')).toMatch(/\d+ of \d+ pixels of room-01-0 differ from its reference shapes/);
    const other = roomBakes(world.rooms[2], 3).find((b) => b.key === 'room-03-0');
    const foreign = chunk.probe.map((p) => (other.probe.find((q) => q.x === p.x && q.y === p.y) || p).want);
    expect(pixelProblems(chunk, foreign, 'room 01').join('')).toMatch(/pixels of room-01-0 differ/);
    expect(pixelProblems(chunk, null, 'room 01')).toEqual(['room 01: the texture room-01-0 could not be read']);
  });
});

// Ending reads at fractions u of the rise, then three reads of the card at heard times `cards` after the origin.
function endingReads(cards = [1.0, 1.5, 2.2], edit = (r) => r) {
  const rise = [0.05, 0.3, 0.6, 0.95].map((u) => {
    const r = ART.riseAt(u * ART.RISE_S);
    return { layout: [{ type: 'Image', key: 'glimpse', y: r.glimpseY }], drawn: [{ depth: 1, buffer: encodeShapes(ART.ceilingShapes(r.ceilingY)) }], heard: { heard: 0, origin: 0 } };
  });
  const card = cards.map((h) => ({ layout: [{ type: 'Image', key: 'glimpse', y: 0 }], drawn: [{ depth: 1, buffer: encodeShapes(ART.cardShapes(ART.beatOfBar(h, 0))) }], heard: { heard: h, origin: 0 } }));
  return [...rise, ...card].map(edit);
}

describe('endingDrawnProblems: the ceiling through the rise, the card on the beat', () => {
  it('passes the reference\'s rise and card, and a card read just after a beat line', () => {
    const r = endingDrawnProblems(endingReads());
    expect(r).toEqual({ problems: [], rise: 4, card: 3 });
    const late = endingReads().map((x) => (x.heard.heard === 1.5 ? { ...x, heard: { heard: ART.BEAT_S * 4 + 0.05, origin: 0 } } : x));
    expect(endingDrawnProblems(late).problems).toEqual([]);
  });

  it('fails the card undrawn, the card off the beat, the ceiling elsewhere and a missing Graphics', () => {
    const at = (fn) => endingDrawnProblems(endingReads(undefined, fn)).problems.join(' | ');
    expect(at((r) => (r.layout[0].y === 0 ? { ...r, drawn: [{ depth: 1, buffer: [] }] } : r))).toMatch(/the card holds 0 entries, want \d+/);
    expect(at((r) => (r.layout[0].y === 0 ? { ...r, heard: { ...r.heard, origin: r.heard.origin + ART.BEAT_S / 2 } } : r))).toMatch(/the card differs at entry \d+/);
    expect(at((r) => (r.layout[0].y > 0 ? { ...r, drawn: [{ depth: 1, buffer: encodeShapes(ART.ceilingShapes(0)) }] } : r))).toMatch(/the ceiling with the glimpse at y [\d.]+ differs at entry/);
    expect(at((r) => ({ ...r, drawn: [] }))).toMatch(/a read without the glimpse and one Graphics at depth 1/);
    expect(endingDrawnProblems(endingReads([])).problems.join('')).toMatch(/no read of the card/);
  });
});

describe('the frames\' time (review R5, MAJOR 2)', () => {
  // A run's light records [sim, room, step, heard, origin] as the driver of section 9.1 gives them: the heard time from
  // 0.3 s past the origin by frameMs a frame (one frame `stallMs` longer at index `stallAt`), the step the driver's for the
  // heard time less `lagMs` (a sim behind the music), at most 24 steps a frame.
  function lights({ frames = 120, frameMs = 16.7, lagMs = 0, avOffset = 0, origin = 5, sim = 1, room = 1, stallAt = -1, stallMs = 0 } = {}) {
    const out = [];
    let step = 0;
    let heard = origin + 0.3;
    for (let i = 0; i < frames; i++) {
      heard += (frameMs + (i === stallAt ? stallMs : 0)) / 1000;
      const target = DRIVER.targetStep(heard - lagMs / 1000, origin, DRIVER.displaySec(avOffset));
      step = Math.max(step, Math.min(target, step + DRIVER.MAX_STEPS_PER_FRAME));
      out.push([sim, room, step, heard, origin]);
    }
    return out;
  }

  it('passes frames on the driver\'s step and fails a sim 50 ms behind the music (the reviewer\'s mutant)', () => {
    const ok = stepTimingProblems(lights());
    expect(ok.problems).toEqual([]);
    expect(ok.judged).toBe(119);
    const late = stepTimingProblems(lights({ lagMs: 50 }), { label: 'room 01-wake' });
    expect(late.problems.join(' | ')).toMatch(/room 01-wake: a frame in room 1 at step \d+, where the heard time gives step \d+ \(section 9\.1: 1[12] steps behind the music\)/);
    expect(late.worst).toBeGreaterThanOrEqual(11);
    // One step (4 ms) is the slack between the driver's read and the probe's; 10 ms is not.
    expect(stepTimingProblems(lights({ lagMs: 4 })).problems).toEqual([]);
    expect(stepTimingProblems(lights({ lagMs: 10 })).problems.length).toBeGreaterThan(0);
  });

  it('reads the step through the calibration in use', () => {
    const shifted = lights({ avOffset: -100 });
    expect(stepTimingProblems(shifted, { avOffset: -100 }).problems).toEqual([]);
    expect(stepTimingProblems(shifted, { avOffset: 0 }).problems.join(' | ')).toMatch(/steps ahead of it/);
  });

  it('lets a stalled run catch up 24 steps a frame, and skips unread times and each run\'s first frame', () => {
    const stalled = lights({ stallAt: 40, stallMs: 300 });
    expect(stalled[41][2] - stalled[40][2]).toBe(24);
    expect(stepTimingProblems(stalled).problems).toEqual([]);
    // A sim that jumps the whole stall in one frame, past the cap.
    const jumped = stalled.map((r, i) => (i === 41 ? [r[0], r[1], r[2] + 30, r[3], r[4]] : r));
    expect(stepTimingProblems(jumped).problems.join(' | ')).toMatch(/steps ahead of it/);
    const unread = lights().map((r, i) => (i % 3 === 0 ? [r[0], r[1], r[2], null, r[4]] : r));
    expect(stepTimingProblems(unread).problems).toEqual([]);
    expect(stepTimingProblems(unread).judged).toBe(80);
    const two = [...lights(), ...lights({ sim: 2, origin: 9 })];
    expect(stepTimingProblems(two).problems).toEqual([]);
    expect(stepTimingProblems(two).judged).toBe(238);
  });

  // Card frames as the ending draws them: the heard time from 20 s by frameMs a frame, bracketed by its prestep and its
  // poststep 1 ms apart, the card drawn on the beat the scene heard between them, less `lagMs`.
  function cardFrames({ frames = 150, frameMs = 16.7, lagMs = 0, origin = 3 } = {}) {
    const out = [];
    for (let i = 0; i < frames; i++) {
      const pre = 20 + (i * frameMs) / 1000;
      const seen = pre + 0.0005 - lagMs / 1000;
      out.push({ pre, post: pre + 0.001, origin, y: 0, graphics: [{ depth: 1, buffer: encodeShapes(ART.cardShapes(ART.beatOfBar(seen, origin))) }] });
    }
    return out;
  }

  it('holds the card to the beat heard while it was drawn, and fails a card 80 ms late (the reviewer\'s mutant)', () => {
    const ok = endingTimingProblems(cardFrames());
    expect(ok.problems).toEqual([]);
    expect(ok.judged).toBeGreaterThan(140);
    expect(endingTimingProblems(cardFrames({ lagMs: 80 })).problems.join(' | ')).toMatch(/ending: a card frame heard \d+ ms into beat \d of its bar draws beat \d/);
    expect(endingTimingProblems(cardFrames({ lagMs: 20 })).problems.length).toBeGreaterThan(0);
    // A frame whose bracket holds a beat line is not judged; neither is a frame of the rise.
    const wide = cardFrames().map((f) => ({ ...f, post: f.pre + 0.5 }));
    expect(endingTimingProblems(wide).judged).toBe(0);
    expect(endingTimingProblems(cardFrames().map((f) => ({ ...f, y: 5 }))).problems.join(' | ')).toMatch(/ending: 0 card frames judged against the heard beat, want at least 30/);
    expect(endingTimingProblems([{ ...cardFrames()[0], graphics: [] }]).problems.join(' | ')).toMatch(/a card frame without one Graphics at depth 1/);
    expect(endingTimingProblems(null).problems.join(' | ')).toMatch(/0 card frames judged/);
  });
});
