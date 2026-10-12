// The probe's read-only view of the running game (D2; spec-owned, PROTECTED). src/main.ts builds one
// object of this shape and hands it to installProbe (src/probe/api.ts), which installs window.__hush only
// under ?probe. The shapes are structural on purpose: the probe imports nothing from the product, and the
// product's own types (src/sim/types.ts, src/audio/engine.ts, src/input/keys.ts) satisfy them as they are.

export interface ProbeSimStatus {
  room: number;
  cleared: number;
  dead: boolean;
  deaths: number;
  finished: boolean;
  x: number;
  y: number;
  form: number;
}

// The live sim, read only: the probe never calls tick() or load() on it.
export interface ProbeSim {
  readonly step: number;
  status(): ProbeSimStatus;
  save(): Int32Array;
  checksum(): string;
}

// A fresh headless sim on the world the page loaded, for the probe's own replays (D3: the same witness gives
// the same checksum in Node and in the browser).
export interface ProbeSimRunner {
  readonly step: number;
  tick(input: number): void;
  status(): ProbeSimStatus;
  checksum(): string;
}

export interface ProbeStart {
  room: number;
  step: number;
  layers: number;
  stopAtClear?: boolean;
}

export interface ProbeAudioStatus {
  state: string;
  time: number;
  origin: number;
  scheduledVoices: number;
  voiceErrors: number;
  lateShifted: number;
  lateDropped: number;
  layerGains: number[];
}

export interface ProbeClock {
  offset: number;
  valid: boolean;
  resyncs: number;
}

export interface ProbeInputSource {
  next(step: number): number;
}

// The parts of a Phaser.Game the probe walks to count text objects and read the active scene keys.
export interface ProbeGameObject {
  type: string;
  list?: ProbeGameObject[];
}
export interface ProbeScene {
  sys: { settings: { key: string } };
  children: { list: ProbeGameObject[] };
}
export interface ProbeGame {
  canvas: HTMLCanvasElement;
  scene: { getScenes(active: boolean): ProbeScene[] };
}

export interface Inspect {
  // True once the first scene is up and the page waits for its first key.
  ready(): boolean;
  game(): ProbeGame | null;
  sim(): ProbeSim | null;
  simFactory(): ((start: ProbeStart) => ProbeSimRunner) | null;
  audio(): ProbeAudioStatus | null;
  analyser(): AnalyserNode | null;
  layerGain(layer: number): GainNode | null;
  clock(): ProbeClock | null;
  calibration(): { avOffset: number; inputBias: number } | null;
  control: {
    // Restart the run at a room: step 0, the layers of every earlier room back, the track from cycle 0.
    startRoom(room: number): void;
    // Leave the calibration screen with these values, as if the player had calibrated.
    skipCalibration(avOffset: number, inputBias: number): void;
    // Replace the keyboard with another input source (null gives the keys back).
    attachInput(source: ProbeInputSource | null): void;
  };
}
