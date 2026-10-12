import type { Inspect } from './probe/inspect.ts';
import { installProbe } from './probe/api.ts';
import { booted, CalibrationScene } from './render/calibration-scene.ts';
import { createGame } from './render/game.ts';

const game = createGame([CalibrationScene]);

const inspect: Inspect = {
  ready: () => booted,
  game: () => game,
  sim: () => null,
  simFactory: () => null,
  audio: () => null,
  analyser: () => null,
  layerGain: () => null,
  clock: () => null,
  calibration: () => null,
  control: {
    startRoom: () => {},
    skipCalibration: () => {},
    attachInput: () => {},
  },
};

installProbe(inspect);
