// The run (spec sections 4.5, 8.4 and 9.1): the sim, the input source and the tick driver. The sim follows the heard
// audio clock, one step past it, at most 24 steps a frame; when it clears a room the audio returns that layer on the
// same bar line, and in the gauntlet the track starts again on every run start.
import type { AudioEngine } from '../audio/engine.ts';
import { alpha, displaySec, inputLagSec, stepsDue, targetStep } from '../clock/driver.ts';
import { audibleSec } from '../clock/output-clock.ts';
import type { createKeys, InputSource } from '../input/keys.ts';
import { gauntletStartBeat, unlockBar } from '../sim/beat.ts';
import { createSim, FIELDS } from '../sim/sim.ts';
import type { Room, Sim, World } from '../sim/types.ts';

type Keys = ReturnType<typeof createKeys>;

const PENDING = FIELDS.indexOf('pendingLayer');
const GBEAT = FIELDS.indexOf('gBeat');
const ROOM = FIELDS.indexOf('room');
// A creature that moves further than a tile between two steps was placed (a respawn, a new room): no tween.
const TELEPORT = 4096;

// The layers of rooms 1 to r - 1, as the bit mask the sim and the gates take.
export const canonical = (r: number): number => (r <= 1 ? 0 : ((1 << Math.min(r, 11)) - 2) & 0x7fe);

// The creature's position in sub, at the last two steps, and how far the heard time is between them.
export interface RunView {
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  alpha: number;
}

export interface Run {
  readonly sim: Sim | null;
  readonly origin: number;
  deaths(): number;
  finished(): boolean;
  currentRoom(): Room | null;
  view(): RunView | null;
  startRoom(room: number): void;
  frame(frameMs: number): void;
  stepOf(eventTimeStampMs: number): number;
  setCalibration(avOffsetMs: number, inputBiasMs: number): void;
  attachInput(source: InputSource | null): void;
}

export function createRun(opts: { world: World; engine: AudioEngine; keys: Keys }): Run {
  const { world, engine, keys } = opts;
  let sim: Sim | null = null;
  let origin = 0;
  let avOffset = 0;
  let inputBias = 0;
  let lastPending = 0;
  let lastGBeat = 0;
  let view: RunView | null = null;

  const roomOf = (n: number): Room | null => (n === 11 ? world.gauntlet : (world.rooms[n - 1] ?? null));

  return {
    get sim(): Sim | null {
      return sim;
    },
    get origin(): number {
      return origin;
    },
    deaths: () => (sim ? sim.status().deaths : 0),
    finished: () => (sim ? sim.status().finished : false),
    currentRoom: () => (sim ? roomOf(sim.status().room) : null),
    view: () => view,
    // A new sim at the room's entrance, the layers of every earlier room back, the track from cycle 0 on a fresh origin.
    startRoom(room: number): void {
      const ctx = engine.context();
      if (!ctx) return;
      origin = ctx.currentTime + 0.1;
      sim = createSim(world, { room, step: 0, layers: canonical(room) });
      keys.attachSource(null);
      engine.restart(origin, canonical(room), room === 11 ? gauntletStartBeat(0) / 4 : -1);
      const state = sim.save();
      lastPending = state[PENDING] ?? 0;
      lastGBeat = state[GBEAT] ?? 0;
      const st = sim.status();
      view = { prevX: st.x, prevY: st.y, x: st.x, y: st.y, alpha: 1 };
    },
    // Every animation frame, only while the context runs and the device-clock line is valid.
    frame(frameMs: number): void {
      const ctx = engine.context();
      const clock = engine.clock();
      if (!sim || !ctx || !clock || ctx.state !== 'running') return;
      clock.sample();
      if (!clock.valid) return;
      const heard = audibleSec(clock, frameMs);
      const display = displaySec(avOffset);
      for (let n = stepsDue(sim.step, targetStep(heard, origin, display)); n > 0; n--) {
        const step = sim.step;
        const before = sim.status();
        sim.tick(keys.next(step));
        const after = sim.status();
        const state = sim.save();
        const pending = state[PENDING] ?? 0;
        // A room cleared on this step: its layer comes back on the bar line the sim names.
        if (pending !== 0 && pending !== lastPending) engine.unlockAt(pending, unlockBar(step));
        lastPending = pending;
        // The gauntlet's run (re)starts on a bar line: the pattern starts again there.
        const gBeat = state[GBEAT] ?? 0;
        if (state[ROOM] === 11 && gBeat !== lastGBeat) engine.gauntlet(gBeat / 4);
        lastGBeat = gBeat;
        const moved = Math.abs(after.x - before.x) > TELEPORT || Math.abs(after.y - before.y) > TELEPORT;
        view = moved ? { prevX: after.x, prevY: after.y, x: after.x, y: after.y, alpha: 1 } : { prevX: before.x, prevY: before.y, x: after.x, y: after.y, alpha: 1 };
      }
      if (view) view.alpha = alpha(heard, origin, display, sim.step);
    },
    // The sim step an input event was heard at: its time through the clock line, less the player's input lag.
    stepOf(eventTimeStampMs: number): number {
      const clock = engine.clock();
      if (!sim || !clock) return -1;
      return Math.floor((audibleSec(clock, eventTimeStampMs) - origin - inputLagSec(avOffset, inputBias)) * 240);
    },
    setCalibration(avOffsetMs: number, inputBiasMs: number): void {
      avOffset = avOffsetMs;
      inputBias = inputBiasMs;
    },
    attachInput(source: InputSource | null): void {
      keys.attachSource(source);
    },
  };
}
