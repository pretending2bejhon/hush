import * as Phaser from 'phaser';
import trackText from '../music/area1.strudel?raw';
import { createAudioEngine } from './audio/engine.ts';
import { createRun } from './game/run.ts';
import type { Run } from './game/run.ts';
import { createKeys } from './input/keys.ts';
import type { Inspect } from './probe/inspect.ts';
import { installProbe } from './probe/api.ts';
import { booted, CalibrationScene } from './render/calibration-scene.ts';
import { createGame } from './render/game.ts';
import { PlayScene } from './render/play-scene.ts';
import { compileWorld } from './rooms/compile.ts';
import { createSim } from './sim/sim.ts';

// The eleven room files, as text: rooms/01-wake.txt to rooms/11-gauntlet.txt.
const files = import.meta.glob('../rooms/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const world = compileWorld(Object.entries(files).map(([path, text]) => ({ name: path.slice(path.lastIndexOf('/') + 1), text })));

const engine = createAudioEngine(trackText);
let run: Run;
const keys = createKeys({ target: window, stepOf: (t) => run.stepOf(t) });
run = createRun({ world, engine, keys });

// The values in use once the calibration screen is left, or null while it is up.
let calibration: { avOffset: number; inputBias: number } | null = null;

// Leaves the calibration screen with these values and starts the run at room 1.
function skipCalibration(avOffset: number, inputBias: number): void {
  calibration = { avOffset, inputBias };
  run.setCalibration(avOffset, inputBias);
  if (game.scene.isActive('calibration')) game.scene.stop('calibration');
  if (!game.scene.isActive('play')) game.scene.start('play');
  run.startRoom(1);
}

// The scene `ending` is empty until the ending is built.
class EndingScene extends Phaser.Scene {
  constructor() {
    super('ending');
  }
}

// The calibration scene hands its two values over through skipCalibration once its passes are done.
const game = createGame([
  new CalibrationScene({ engine, onDone: skipCalibration }),
  new PlayScene(run),
  new EndingScene(),
]);

// The first keydown that is not Escape starts the audio, inside that handler (a user gesture, CP V6).
function onFirstKey(e: KeyboardEvent): void {
  if (e.code === 'Escape') return;
  window.removeEventListener('keydown', onFirstKey, true);
  void engine.start();
}
window.addEventListener('keydown', onFirstKey, true);

// A hidden page suspends the audio, and with it the sim (the driver ticks only while the context runs).
document.addEventListener('visibilitychange', () => {
  const ctx = engine.context();
  if (!ctx) return;
  if (document.visibilityState === 'hidden') void ctx.suspend();
  else void ctx.resume();
});

// The driver runs on every frame of the game loop, whatever scene is up.
game.events.on(Phaser.Core.Events.PRE_STEP, () => run.frame(performance.now()));

const inspect: Inspect = {
  ready: () => booted,
  game: () => game,
  sim: () => run.sim,
  simFactory: () => (start) => createSim(world, start),
  audio: () => (engine.context() ? engine.status() : null),
  analyser: () => engine.analyser(),
  layerGain: (layer) => engine.layerGain(layer),
  clock: () => engine.clock(),
  calibration: () => calibration,
  control: {
    startRoom: (room) => run.startRoom(room),
    skipCalibration,
    attachInput: (source) => run.attachInput(source),
  },
};

installProbe(inspect);
