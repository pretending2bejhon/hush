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
  // The bar from which the transport plays the gauntlet's track from cycle 0, -1 for none (review R1, MAJOR 1).
  gauntletBar?: number;
}

export interface ProbeClock {
  offset: number;
  valid: boolean;
  resyncs: number;
}

export interface ProbeInputSource {
  next(step: number): number;
}

// The parts of a Phaser.Game the probe walks to count text objects and read the active scene keys, and (review
// R2, MAJOR 1 and 3) to read a scene's layout: where each image and Graphics sits, at what scale and depth, its
// texture and size, and how many commands a Graphics holds. Every layout field is optional: a game object that
// lacks one reads as its default.
export interface ProbeGameObject {
  type: string;
  list?: ProbeGameObject[];
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
  depth?: number;
  visible?: boolean;
  alpha?: number;
  texture?: { key: string };
  frame?: { width: number; height: number };
  commandBuffer?: unknown[];
}
export interface ProbeScene {
  sys: { settings: { key: string } };
  children: { list: ProbeGameObject[] };
}
export interface ProbeGame {
  canvas: HTMLCanvasElement;
  scene: { getScenes(active: boolean): ProbeScene[]; getScene(key: string): ProbeScene | null };
}

// The calibration scene's current attempt (HUSH-SPEC section 12, review R1 MAJOR 2), which the probe's tapper reads
// off the scene `calibration` as its field `attempt`: pass A carries t0 (the context time of click 0), pass B p0 (the
// performance time flash 0 is due) and frameTimes (the frame that first drew each ring); null between attempts.
export interface ProbeCalibrationAttempt {
  pass: 'A' | 'B';
  t0?: number;
  p0?: number;
  frameTimes?: (number | undefined)[];
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
