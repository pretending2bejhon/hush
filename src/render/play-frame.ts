// The play scene's frame (spec section 10.6, "The frame"; review R1, MAJOR 3), ported from
// tests/fixtures/reference/art.mjs: everything the play scene draws over its baked images in one frame, read from the
// run as it stands, so that every hazard is drawn at the step the sim collides on.
import type { RunView } from '../game/run.ts';
import { FIELDS } from '../sim/sim.ts';
import type { Room } from '../sim/types.ts';
import { ZOOM } from './art.ts';
import type { Shape } from './art.ts';
import { beatShapes, ringShapes } from './beat-art.ts';
import { creatureShapes } from './creature.ts';
import type { Track } from './creature.ts';
import { moteShapes } from './depth-art.ts';
import type { Mote } from './depth-art.ts';
import { cameraPx } from './room-art.ts';

const SUB = 256;
// The sim's fields the frame reads from save(), by FIELDS name.
const AT = {
  layers: FIELDS.indexOf('layers'),
  form: FIELDS.indexOf('form'),
  vy: FIELDS.indexOf('vy'),
  facing: FIELDS.indexOf('facing'),
  dead: FIELDS.indexOf('dead'),
  lock: FIELDS.indexOf('lock'),
};

export interface PlayFrameInput {
  room: Room;
  sim: { readonly step: number; save(): Int32Array };
  view: RunView;
  track: Track;
  field: Mote[];
  levels: number[];
  limiter: { request(areaPx: number, fromLum: number, toLum: number): number };
}

export interface PlayFrame {
  camPx: number;
  levels: number[];
  beat: Shape[];
  creature: Shape[];
  dust: Shape[];
}

// One frame: sim is the run's live sim (its step, and its save() read by FIELDS name), view the creature's box
// position in sub at the last two steps with the heard time's alpha between them, track the creature's track, field
// the room's dust, levels the beat entities' levels of the frame before ([] on entering a room) and limiter the
// scene's flash limiter, its frame begun. Returns the camera in canvas px, the shapes by depth (beat: the beat
// entities, then the layer's ring, depth 6; creature, 7; dust, 8) and the levels to keep.
export function playFrame({ room, sim, view, track, field, levels, limiter }: PlayFrameInput): PlayFrame {
  const saved = sim.save();
  const at = (k: number): number => saved[k] ?? 0;
  const step = sim.step;
  const ix = view.prevX + (view.x - view.prevX) * view.alpha;
  const iy = view.prevY + (view.y - view.prevY) * view.alpha;
  const centreX = ix / SUB + 5;
  const camPx = cameraPx(room, centreX);
  const beat = beatShapes(room, step, at(AT.layers), camPx, levels, limiter);
  const ring = ringShapes(track, step, centreX * ZOOM - camPx, (iy / SUB + 5) * ZOOM);
  const creature = creatureShapes(
    { step, x: ix / SUB, y: iy / SUB, form: at(AT.form), vy: at(AT.vy), facing: at(AT.facing), dead: at(AT.dead), lock: at(AT.lock) },
    track,
    camPx,
  );
  return { camPx, levels: beat.levels, beat: [...beat.shapes, ...ring], creature, dust: moteShapes(field, step) };
}
