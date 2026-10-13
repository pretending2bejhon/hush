// The playthrough's predicates that the control page cannot exercise. The unlock check's gauntlet half (review R1,
// MAJOR 1): reads of the sim's gBeat beside the engine's gauntletBar (tools/probe-lib.mjs gauntletMapProblems); the
// control page has no gauntlet. The scene check (review R2, MAJOR 1 and 3): the play scene's layout against section
// 10.6 at the creature's camera, and the ending's glimpse (playLayoutProblems, endingLayoutProblems); the control page
// has no bake. The key check (review R2, MAJOR 5): real keys replayed on the steps stepOf names (keyReplayProblems);
// the control page has no keys. Each predicate passes the layout or the run the spec describes, and fails every way
// the product could leave it.
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileWorld, createSim, FIELDS } from '../fixtures/oracle/index.mjs';
import { bakeChunks, cameraPx, depthBands, riseAt } from '../fixtures/reference/art.mjs';
import { audioGraphProblems, CAMERA_SLACK_PX, endingLayoutProblems, gauntletMapProblems, keyReplayProblems, playLayoutProblems, REPO } from '../../tools/probe-lib.mjs';
import { loadRoomFiles } from '../../tools/replay.mjs';

describe('the unlock check\'s gauntlet half', () => {
  it('passes reads that map every run start from gBeat / 4', () => {
    expect(gauntletMapProblems([{ gBeat: 28, bar: 7 }, { gBeat: 28, bar: 7 }, { gBeat: 44, bar: 11 }])).toEqual([]);
  });

  it('fails a mapping left at the restart, one bar late, or not moved by a respawn, and too few run starts', () => {
    expect(gauntletMapProblems([{ gBeat: 28, bar: -1 }, { gBeat: 44, bar: -1 }]).join(' | ')).toMatch(/mapped from bar -1 while its run starts on bar 7/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: undefined }, { gBeat: 44, bar: undefined }]).join(' | ')).toMatch(/mapped from bar undefined while its run starts on bar 7/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: 8 }, { gBeat: 44, bar: 12 }]).join(' | ')).toMatch(/mapped from bar 8 while its run starts on bar 7/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: 7 }, { gBeat: 44, bar: 7 }]).join(' | ')).toMatch(/mapped from bar 7 while its run starts on bar 11/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: 7 }]).join(' | ')).toMatch(/read for 1 run start\(s\), want the entry and a respawn/);
    expect(gauntletMapProblems([])).toHaveLength(1);
  });
});

const world = compileWorld(loadRoomFiles(path.join(REPO, 'rooms')));
const X = FIELDS.indexOf('x');

// Room 1 (72 columns: it scrolls) with the creature's box at column 30.
const room = world.rooms[0];
const state = new Array(FIELDS.length).fill(0);
state[X] = 30 * 4096 + 768;
const camera = cameraPx(room, state[X] / 256 + 5);

const image = (key, x, depth, scale, w, h, more = {}) => ({ type: 'Image', key, x, y: 0, scaleX: scale, scaleY: scale, originX: 0, originY: 0, depth, visible: true, alpha: 1, w, h, commands: null, ...more });
const graphics = (depth, commands, more = {}) => ({ type: 'Graphics', key: null, x: 0, y: 0, scaleX: 1, scaleY: 1, originX: 0, originY: 0, depth, visible: true, alpha: 1, w: null, h: null, commands, ...more });

// Section 10.6's layout of room 1 at camera `cam`, with `edit` applied to it.
function layout(cam = camera, edit = (l) => l) {
  return edit([
    ...depthBands(room).map((b, i) => image(`band-01-${i}`, -Math.round(b.factor * cam), i, 2.5, b.w, b.h)),
    image('fog', 0, 4, 1, 1280, 720),
    ...bakeChunks(room).map((c, i) => image(`room-01-${i}`, c.col0 * 40 - cam, 5, 1, c.w, c.h)),
    graphics(6, 0),
    graphics(7, 42),
    graphics(8, 120),
    image('vignette', 0, 9, 1, 1280, 720),
  ]);
}
const judge = (l) => playLayoutProblems(l, { room, number: 1, state, label: 'room 01-wake' }).join(' | ');

describe('the scene check, the play scene (review R2, MAJOR 1)', () => {
  it('passes section 10.6\'s layout at the creature\'s camera, within one step\'s motion and a texture px', () => {
    expect(camera).toBeGreaterThan(400);
    expect(judge(layout())).toBe('');
    expect(judge(layout(camera + CAMERA_SLACK_PX))).toBe('');
    expect(judge(layout(camera, (l) => l.map((o) => (o.key === 'band-01-0' ? { ...o, w: o.w + 1 } : o))))).toBe('');
  });

  it('fails a room drawn away from the creature\'s camera, however it is placed', () => {
    // The reviewer's mutant: the chunks never scroll while the bands do.
    expect(judge(layout(camera, (l) => l.map((o) => (o.key && o.key.startsWith('room-') ? { ...o, x: o.x + camera } : o))))).toMatch(/the room is drawn at camera 0 px, the creature's camera is \d+ px/);
    expect(judge(layout(0))).toMatch(/the room is drawn at camera 0 px/);
    expect(judge(layout(camera + CAMERA_SLACK_PX + 1))).toMatch(/the room is drawn at camera/);
    expect(judge(layout(camera, (l) => l.map((o) => (o.key === 'band-01-2' ? { ...o, x: Math.round(-0.5 * camera) } : o))))).toMatch(/band-01-2 at x -?\d+, want -\d+ \(factor 0\.6/);
  });

  it('fails a chunk of a wide room drawn apart from the others (the gauntlet: five chunks)', () => {
    const g = world.gauntlet;
    const s = new Array(FIELDS.length).fill(0);
    s[X] = 300 * 4096 + 768;
    const cam = cameraPx(g, s[X] / 256 + 5);
    const gl = (edit = (l) => l) => edit([
      ...depthBands(g).map((b, i) => image(`band-11-${i}`, -Math.round(b.factor * cam), i, 2.5, b.w, b.h)),
      image('fog', 0, 4, 1, 1280, 720),
      ...bakeChunks(g).map((c, i) => image(`room-11-${i}`, c.col0 * 40 - cam, 5, 1, c.w, c.h)),
      graphics(6, 30), graphics(7, 42), graphics(8, 120),
      image('vignette', 0, 9, 1, 1280, 720),
    ]);
    const judgeG = (l) => playLayoutProblems(l, { room: g, number: 11, state: s, label: 'room 11-gauntlet' }).join(' | ');
    expect(bakeChunks(g)).toHaveLength(5);
    expect(judgeG(gl())).toBe('');
    expect(judgeG(gl((l) => l.map((o) => (o.key === 'room-11-3' ? { ...o, x: o.x + 40 } : o))))).toMatch(/room-11-3 at x -?\d+, want -?\d+ \(column 384 at the camera \d+ of the first chunk\)/);
  });

  it('fails a baked image at the wrong depth, scale, origin, size or visibility, missing, doubled or foreign', () => {
    const at = (key, more) => layout(camera, (l) => l.map((o) => (o.key === key ? { ...o, ...more } : o)));
    expect(judge(at('room-01-0', { depth: 3 }))).toMatch(/room-01-0 at depth 3, want 5/);
    expect(judge(at('band-01-1', { scaleX: 1, scaleY: 1 }))).toMatch(/band-01-1 at scale 1 by 1, want 2\.5/);
    expect(judge(at('fog', { originX: 0.5 }))).toMatch(/fog has origin \(0\.5, 0\)/);
    expect(judge(at('vignette', { y: 4 }))).toMatch(/vignette at y 4, want 0/);
    expect(judge(at('room-01-0', { w: 2560 }))).toMatch(/room-01-0 is 2560 by 720/);
    expect(judge(at('room-01-0', { visible: false }))).toMatch(/room-01-0 hidden or faded/);
    expect(judge(at('fog', { x: 10 }))).toMatch(/fog at x 10, want 0/);
    expect(judge(layout(camera, (l) => l.filter((o) => o.key !== 'vignette')))).toMatch(/the image vignette is missing/);
    expect(judge(layout(camera, (l) => [...l, image('room-01-0', -camera, 5, 1, 2880, 720)]))).toMatch(/room-01-0 shown twice/);
    expect(judge(layout(camera, (l) => [...l, image('room-02-0', 0, 5, 1, 1280, 720)]))).toMatch(/an image "room-02-0" that the room does not bake/);
  });

  it('fails the Graphics of the beat entities, the creature or the dust out of place or empty', () => {
    expect(judge(layout(camera, (l) => l.map((o) => (o.type === 'Graphics' && o.depth === 7 ? { ...o, depth: 3 } : o))))).toMatch(/Graphics at depths \[3,6,8\]/);
    expect(judge(layout(camera, (l) => l.map((o) => (o.type === 'Graphics' && o.depth === 7 ? { ...o, commands: 0 } : o))))).toMatch(/depth 7 draws nothing \(want the creature\)/);
    expect(judge(layout(camera, (l) => l.map((o) => (o.type === 'Graphics' && o.depth === 6 ? { ...o, x: 12 } : o))))).toMatch(/depth 6 is moved, scaled, hidden or faded/);
    expect(judge(null)).toMatch(/could not be read/);
  });
});

// Reads of the ending through the rise at `us` (fractions of the rise), the last one once the card is up.
function endingReads(us = [0.02, 0.1, 0.25, 0.4, 0.6, 0.8, 1, 1], edit = (r) => r) {
  return us.map((u, i) => edit({
    layout: [image('glimpse', 0, 0, 1, 1280, 720, { y: riseAt(u * (16 * 60 / 140)).glimpseY }), graphics(1, 4)],
    early: u < 0.5,
    final: i === us.length - 1,
  }, i));
}

describe('the scene check, the ending (review R2, MAJOR 3)', () => {
  it('passes a glimpse that rises from below the view to rest at y 0 by the card', () => {
    expect(endingLayoutProblems(endingReads())).toEqual([]);
  });

  it('fails a glimpse that stays down, never rises, moves back down or sits out of place', () => {
    const y = (f) => (r, i) => ({ ...r, layout: r.layout.map((o) => (o.key === 'glimpse' ? { ...o, y: f(o.y, i) } : o)) });
    expect(endingLayoutProblems(endingReads(undefined, y(() => 720))).join(' | ')).toMatch(/the glimpse at y 720 once the card is up, want 0/);
    expect(endingLayoutProblems(endingReads(undefined, y(() => 0))).join(' | ')).toMatch(/never below the view's middle in the rise's first half/);
    expect(endingLayoutProblems(endingReads(undefined, y((v, i) => (i === 4 ? v + 400 : v)))).join(' | ')).toMatch(/moved back down/);
    expect(endingLayoutProblems(endingReads(undefined, (r) => ({ ...r, layout: r.layout.map((o) => (o.key === 'glimpse' ? { ...o, depth: 2 } : o)) }))).join(' | ')).toMatch(/the glimpse at x 0, origin \(0, 0\), scale 1, depth 2/);
    expect(endingLayoutProblems(endingReads([0.1, 0.3, 0.6]).map((r) => ({ ...r, final: false }))).join(' | ')).toMatch(/no read once the card was up/);
    expect(endingLayoutProblems(endingReads(undefined, (r) => ({ ...r, layout: r.layout.filter((o) => o.type === 'Image') }))).join(' | ')).toMatch(/want one at depth 1/);
  });
});

// The key check's runs, room 1 with origin 0 and the clock line at offset 0. Handed over with (100, -60): a key meant
// for step a is stamped half a step past the time stepOf maps to a, and arrives while the sim stands 15 steps behind
// it. Handed over with (0, 0): a key arrives with the sim already one step past its stamp, so it goes in on the next
// tick.
const timeOf = (a, lag) => ((a + 0.5) / 240 + lag) * 1000;
const event = (type, code, a, more = {}) => ({ type, code, repeat: false, t: timeOf(a, 0.04), offset: 0, step: a - 15, ...more });

// The oracle run from the state before, the keys held over [down, up) of each [code, down, up], read every 10 steps
// up to `end`.
function run(before, end, holds) {
  const sim = createSim(world, { room: 1, step: 0, layers: 0 });
  sim.load(Int32Array.from(before.state));
  const bits = { ArrowRight: 2, Space: 16 };
  const reads = [];
  while (sim.step < end) {
    let b = 0;
    for (const [code, down, up] of holds) if (sim.step >= down && sim.step < up) b |= bits[code];
    sim.tick(b);
    if (sim.step % 10 === 0) reads.push({ step: sim.step, state: Array.from(sim.save()) });
  }
  return reads;
}

describe('the key check (review R2, MAJOR 5)', () => {
  const start = createSim(world, { room: 1, step: 0, layers: 0 });
  for (let i = 0; i < 80; i++) start.tick(0);
  const before = { step: start.step, state: Array.from(start.save()) };
  const holds = [['ArrowRight', 100, 140], ['Space', 200, 236]];
  const events = [event('keydown', 'ArrowRight', 100), event('keydown', 'KeyQ', 120), event('keyup', 'ArrowRight', 140), event('keydown', 'Space', 200), event('keyup', 'Space', 236)];
  const judgeKeys = (reads, evs = events, [av, bias] = [100, -60]) => keyReplayProblems({ world, before, reads, events: evs, origin: 0, avOffset: av, inputBias: bias }).join(' | ');

  it('passes keys that reached the sim on the steps stepOf names, and late keys on the next tick', () => {
    expect(judgeKeys(run(before, 420, holds))).toBe('');
    const late = [['keydown', 'ArrowRight', 100], ['keyup', 'ArrowRight', 140]].map(([type, code, a]) => ({ type, code, repeat: false, t: timeOf(a, 0), offset: 0, step: a + 1 }));
    expect(judgeKeys(run(before, 420, [['ArrowRight', 101, 141]]), late, [0, 0])).toBe('');
  });

  it('fails keys that never reached the sim, reached it on other steps, or a sim that stood elsewhere', () => {
    expect(judgeKeys(run(before, 420, []))).toMatch(/differ from their replay on the steps stepOf names .*\| keys: the run went on as if no key had been pressed/);
    // The input lag lost: every key 10 steps later. The creature stands still again by the end, so only the reads
    // taken while it moved can show it.
    const shifted = run(before, 420, [['ArrowRight', 110, 150], ['Space', 210, 246]]);
    expect(shifted[shifted.length - 1].state).toEqual(run(before, 420, holds).pop().state);
    expect(judgeKeys(shifted)).toMatch(/differ from their replay on the steps stepOf names \(at step 1[0-9]0 /);
    // The display offset lost: the sim stands at the heard time, 24 steps further on.
    expect(judgeKeys(run(before, 420, holds), events.map((e) => ({ ...e, step: e.step + 30 })))).toMatch(/the sim stood at step \d+ when ArrowRight went down, where the heard time less the display offset names step \d+/);
    expect(judgeKeys(run(before, 420, holds), events.filter((e) => e.code === 'KeyQ'))).toMatch(/no game key reached the page/);
    expect(keyReplayProblems({ world, before: null, reads: [], events, origin: 0, avOffset: 100, inputBias: -60 }).join('')).toMatch(/could not be read/);
  });
});

// Review R3 (MINOR 4): the speakers' chain as the page built it (src/probe/api.ts audioGraph), against section 8.4.
// The parameters come back as float32.
describe('the av probe\'s mix check (review R3, MINOR 4)', () => {
  const f32 = (v) => Math.fround(v);
  const good = () => ({
    analyserAtSpeakers: true,
    // superdough's own output (unfed) and two of its timers (gain 0).
    others: [{ type: 'GainNode', gain: 1, silent: true }, { type: 'GainNode', gain: 0, silent: true }, { type: 'GainNode', gain: 0, silent: true }],
    analyser: { type: 'AnalyserNode', fftSize: 2048, smoothing: 0 },
    master: { type: 'GainNode', gain: f32(0.8) },
    compressor: { type: 'DynamicsCompressorNode', threshold: -10, knee: 6, ratio: 4, attack: f32(0.005), release: f32(0.12) },
    compressorInputs: 11,
    gatesIn: Array(10).fill(true),
  });
  const judge = (edit) => { const g = good(); edit(g); return audioGraphProblems(g, 10).join(' | '); };

  it('passes the graph of section 8.4, with or without the calibration orbit', () => {
    expect(audioGraphProblems(good(), 10)).toEqual([]);
    expect(judge((g) => { g.compressorInputs = 10; })).toBe('');
  });

  it('names every departure from it', () => {
    expect(audioGraphProblems(null, 10)).toEqual(['the audio graph could not be read']);
    expect(judge((g) => { g.master.gain = f32(0.4); })).toMatch(/the analyser is fed by GainNode at gain 0\.4\d*, want the master gain at 0\.8/);
    expect(judge((g) => { g.compressor.ratio = 8; })).toMatch(/the master gain is fed by DynamicsCompressorNode threshold -10, knee 6, ratio 8/);
    expect(judge((g) => { g.compressor.attack = f32(0.003); })).toMatch(/want the compressor of section 8\.4/);
    expect(judge((g) => { g.compressor = null; })).toMatch(/the master gain is fed by no single node/);
    expect(judge((g) => { g.others.push({ type: 'GainNode', gain: 1, silent: false }); })).toMatch(/the speakers have 1 input\(s\) besides the analyser that are not silent by construction \(GainNode at gain 1\): something bypasses the analyser/);
    expect(judge((g) => { g.analyserAtSpeakers = false; })).toMatch(/the master analyser does not feed the speakers/);
    expect(judge((g) => { g.analyser.fftSize = 1024; })).toMatch(/the analyser has fftSize 1024/);
    expect(judge((g) => { g.gatesIn[2] = false; })).toMatch(/the compressor's inputs miss layer gate\(s\) 3/);
    expect(judge((g) => { g.gatesIn = g.gatesIn.slice(0, 9); })).toMatch(/\(9 of 10 read\)/);
    expect(judge((g) => { g.compressorInputs = 12; })).toMatch(/the compressor has 12 inputs/);
  });
});
