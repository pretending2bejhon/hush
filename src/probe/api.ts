// window.__hush, the test API (D2; spec-owned, PROTECTED). installProbe() installs it only when the page
// URL carries ?probe; without it the function returns false and touches nothing. Product code calls
// installProbe(inspect) unconditionally and never reads ?probe itself. Everything the API returns is plain
// data, so a probe can read it through page.evaluate. It reads the game through the Inspect view and acts
// only through Inspect.control and the layer gain nodes (the solo test of X7).
import type { Inspect, ProbeCalibrationAttempt, ProbeGameObject, ProbeInputSource, ProbeRun, ProbeScene, ProbeSim, ProbeSimStatus } from './inspect.ts';

export const PROBE_VERSION = 1;
const TEXT_TYPES = new Set(['Text', 'BitmapText', 'DynamicBitmapText']);
// The calibration's clock and its tapped marks (section 12): taps go on clicks and rings COUNT_IN to CLICKS - 1.
const CAL_BEAT = 60 / 140;
const CAL_COUNT_IN = 4;
const CAL_CLICKS = 24;
// A tap is armed this close to its moment (so the clock line it is timed through is fresh), set off by a timer
// a few ms early and placed on its moment by a busy wait, so the keydown's timeStamp lands on it.
const TAP_ARM_MS = 40;
const TAP_SPIN_MS = 6;
const TAP_GIVE_UP_MS = 90000;
// Review R3 (MINOR 6): the count-in is tapped too (clicks and rings 0 to COUNT_IN - 1), and the taps that count
// spread in a fixed pattern, so that a tap a scene wrongly admits moves the median: pass A's over aMs - 19 to aMs + 19
// (every odd ms once over taps COUNT_IN to CLICKS - 1), pass B's over bMs to bMs + 19 (every ms and a half), never
// sooner than bMs, because a ring's tap is placed only once the frame that drew it is seen. Review R3 (MINOR 5):
// Escape is pressed ESCAPE_MS after clicks and rings ESCAPE_AT of every attempt, and logged apart from the taps.
const tapSpread = (i: number): number => (i < CAL_COUNT_IN ? 0 : (((i - CAL_COUNT_IN) * 7) % 20) * 2 - 19);
const tapSpreadB = (i: number): number => (tapSpread(i) + 19) / 2;
const ESCAPE_AT = [6, 10, 14];
const ESCAPE_MS = 200;
// Review R6 (MINOR 2), carried as R8's MINOR 10: a held key's repeats are never taps. The tapper also sends a keydown with
// `repeat` set REPEAT_MS after clicks and rings REPEAT_AT of every attempt, logged apart from the taps.
const REPEAT_AT = [8, 12, 16];
const REPEAT_MS = 200;
// Review R7 (MINOR 3), carried as R8's MINOR 9: each keydown is created on its moment and dispatched DISPATCH_MS later, so
// the event keeps the time stamp of its creation and a scene that times a tap by its handler's clock is that much late.
const DISPATCH_MS = 8;

export interface MeterSample {
  t: number;
  rms: number;
  peak: number;
  offset: number;
  valid: boolean;
  resyncs: number;
}

export interface ReplayResult {
  ok: boolean;
  why: string;
  step: number;
  checksum: string;
  deaths: number;
}

export interface PageText {
  text: string;
  inside: boolean;
}

// One object of a scene's display list as the layout check reads it (review R2, MAJOR 1 and 3).
export interface LayoutObject {
  type: string;
  key: string | null;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  originX: number;
  originY: number;
  depth: number;
  visible: boolean;
  alpha: number;
  w: number | null;
  h: number | null;
  commands: number | null;
}

// A keydown or keyup as it reached the page (review R2, MAJOR 5): its time stamp, the device-clock line's offset
// and the sim's step at that moment, the inputs of the step the game stamps it with.
export interface KeyRecord {
  type: string;
  code: string;
  repeat: boolean;
  t: number;
  offset: number | null;
  step: number | null;
}

// A Graphics' command buffer as drawn (review R3, MAJOR 1 and 2): Phaser 4.2.1's numbers, each rounded to 1e-4, and the
// one boolean an arc carries.
export type DrawnBuffer = (number | boolean | null)[];

export interface DrawnGraphics {
  depth: number;
  buffer: DrawnBuffer;
}

// The play scene's frames (review R3, MAJOR 1 and MINOR 3), read at the game's `poststep`, once every scene's update has
// drawn the frame and before the next one ticks the sim. Every frame gives a light record [sim, room, step], `sim`
// counting the sim objects seen since frameLogStart (1 for the first). Every FRAME_FULL_EVERY-th frame from a bake (a
// new sim or a new room), up to FRAME_FULL_PER_BAKE of them, also gives a full one: the sim's state, the run's view as
// the frame read it, the x of the room's first chunk (the camera), and every Graphics' buffer.
export interface FullFrame {
  index: number;
  sim: number;
  room: number;
  step: number;
  state: number[];
  view: number[] | null;
  x0: number | null;
  graphics: DrawnGraphics[];
}

// Review R5 (MAJOR 2): every light record also carries the heard time and the run's origin, read by a PRE_STEP listener
// that runs after the driver's, so the step it records is the one the driver gave for that time: [sim, room, step, heard,
// origin], heard null while the context is not running or the clock line not valid. The log carries the avOffset in use.
export interface FrameLog {
  light: (number | null)[][];
  full: FullFrame[];
  dropped: number;
  avOffset: number | null;
}

// Review R5 (MAJOR 2): one frame of the scene `ending`: the heard time at Phaser's prestep and at its poststep (the scene's
// own read lies between them), the run's origin, the glimpse's y and every Graphics' buffer as drawn.
export interface EndingFrame {
  pre: number | null;
  post: number | null;
  origin: number | null;
  y: number | null;
  graphics: DrawnGraphics[];
}

// Review R5 (MAJOR 1): one frame of the scene `calibration`, bracketed between Phaser's prestep and poststep, between
// which the scene read its own frameMs and heard time (section 12): performance.now() at both ends, the heard time at both
// ends through the same clock line (null while the context is not running or the line not valid, when the scene decides
// nothing), the attempt live at each end (its index in tapLog().attempts, -1 for none: an attempt's first frame has none
// at its prestep, its last none at its poststep), and every Graphics of the scene as drawn, each an index into the log's
// table of distinct Graphics.
export interface CalibrationFrame {
  pre: number;
  post: number;
  hPre: number | null;
  hPost: number | null;
  aPre: number;
  aPost: number;
  g: number[];
  // Review R8 (MINOR 4): the scene's last frame, in which it handed over and was stopped, so that its Graphics are gone by
  // the poststep: logged with its times and the attempt live at its prestep, and no Graphics.
  left?: boolean;
}

// One Graphics of the scene `calibration` as a frame drew it: its depth, whether it shows (visible, alpha) and its
// command buffer (review R5, MAJOR 1).
export interface CalibrationGraphics {
  depth: number;
  visible: boolean;
  alpha: number;
  buffer: DrawnBuffer;
}

export interface CalibrationLog {
  frames: CalibrationFrame[];
  graphics: CalibrationGraphics[];
  dropped: number;
}

const FRAME_FULL_EVERY = 4;
const FRAME_FULL_PER_BAKE = 48;
const FRAME_LIGHT_MAX = 200000;
const FRAME_FULL_MAX = 2000;
const ENDING_MAX = 4000;
const CALIB_MAX = 12000;
// Phaser 4.2.1's Core.Events.PRE_STEP and POST_STEP.
const PRE_STEP = 'prestep';
const POST_STEP = 'poststep';

const rounded = (v: unknown): number | boolean | null => {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.round(v * 1e4) / 1e4;
};

function drawnOf(list: ProbeGameObject[]): DrawnGraphics[] {
  const out: DrawnGraphics[] = [];
  for (const o of list) if (o.type === 'Graphics' && Array.isArray(o.commandBuffer)) out.push({ depth: o.depth ?? 0, buffer: o.commandBuffer.map(rounded) });
  return out;
}

// The tapper's own record of a tapped calibration (review R2, MINOR 3): every tap it landed, with its time stamp,
// its heard time through the clock line and the attempt that was up when it landed (-1 for none); every Escape it
// pressed, in the same form (review R3, MINOR 5), and every key repeat (review R6, MINOR 2); and every attempt it saw,
// with the marks the scene judged it against.
export interface TapLog {
  taps: { attempt: number; t: number; h: number }[];
  escapes: { attempt: number; t: number; h: number }[];
  repeats: { attempt: number; t: number; h: number }[];
  attempts: { pass: 'A' | 'B'; t0: number | null; p0: number | null; frameTimes: (number | null)[] | null }[];
}

// The audio graph as the page builds it (review R3, MINOR 4), for the av probe to hold to section 8.4. Under ?probe
// only, installProbe wraps AudioNode.prototype.connect and disconnect before the first key, and every edge that ends
// at an AudioDestinationNode, an AnalyserNode, a DynamicsCompressorNode or a ChannelMergerNode, or starts at a
// DynamicsCompressorNode or a ChannelMergerNode, is kept here by its destination: the speakers' chain and superdough's
// own output (a merger into a gain into the speakers, which every patched orbit leaves unfed), nothing of a voice. The
// wrappers change nothing they pass on.
const graphInputs = new Map<AudioNode, Set<AudioNode>>();
// Review R4 (MAJOR 1): every live edge between two nodes, by its source, so that a started source can be followed to the
// layer gate it plays into. An edge leaves the map when its source disconnects it (superdough disconnects every node of a
// voice when it releases the voice), so the map holds what the graph holds.
const graphOutputs = new Map<AudioNode, Set<AudioNode>>();
let graphRecording = false;

function recordAudioGraph(): void {
  if (graphRecording || typeof AudioNode === 'undefined') return;
  graphRecording = true;
  const proto = AudioNode.prototype as unknown as { connect: (...args: unknown[]) => unknown; disconnect: (...args: unknown[]) => unknown };
  const connect = proto.connect;
  const disconnect = proto.disconnect;
  const kept = (src: AudioNode, dst: AudioNode): boolean =>
    dst instanceof AudioDestinationNode || dst instanceof AnalyserNode || dst instanceof DynamicsCompressorNode || dst instanceof ChannelMergerNode ||
    src instanceof DynamicsCompressorNode || src instanceof ChannelMergerNode;
  proto.connect = function (this: AudioNode, ...args: unknown[]): unknown {
    const dst = args[0];
    if (dst instanceof AudioNode) {
      if (kept(this, dst)) {
        let ins = graphInputs.get(dst);
        if (!ins) graphInputs.set(dst, (ins = new Set()));
        ins.add(this);
      }
      let outs = graphOutputs.get(this);
      if (!outs) graphOutputs.set(this, (outs = new Set()));
      outs.add(dst);
    }
    return connect.apply(this, args);
  };
  proto.disconnect = function (this: AudioNode, ...args: unknown[]): unknown {
    const dst = args[0];
    if (dst instanceof AudioNode) {
      graphInputs.get(dst)?.delete(this);
      graphOutputs.get(this)?.delete(dst);
    } else if (args.length === 0 || typeof dst === 'number') {
      for (const ins of graphInputs.values()) ins.delete(this);
      graphOutputs.delete(this);
    }
    return disconnect.apply(this, args);
  };
}

// Review R4 (MAJOR 1): when each sound is handed to the speakers. Under ?probe only, installProbe wraps
// AudioScheduledSourceNode.prototype.start before the first key, and every call it passes on is kept: the node's type,
// its `when` (the context time at the call when the argument is 0, absent or past), the context time at the call, the
// transport's origin at the call (the run that handed the note over; 0 before any run, null before the audio), and the
// layer it plays into, read once the voice is built (a timer of 0 ms after the call: superdough builds a voice's chain in
// the same task, after its sources are started). The layer: k (1 to N) when every path out of the node meets layer gate
// k first; 0 when the node reaches the speakers through no gate (the calibration orbit); -1 when it reaches neither (it
// cannot sound); -2 when its paths meet more than one way out. The wrapper changes nothing it passes on.
export interface StartRecord {
  type: string;
  when: number;
  at: number;
  origin: number | null;
  layer: number | null;
}

const START_MAX = 60000;
const startLog: StartRecord[] = [];
let startRecording = false;

function layerOf(inspect: Inspect, node: AudioNode): number {
  const n = inspect.audio()?.layerGains.length ?? 0;
  const gates = new Map<AudioNode, number>();
  for (let k = 1; k <= n; k++) {
    const g = inspect.layerGain(k);
    if (g) gates.set(g, k);
  }
  const hit = new Set<number>();
  let bare = false;
  const seen = new Set<AudioNode>([node]);
  const queue: AudioNode[] = [node];
  while (queue.length && seen.size < 512) {
    const m = queue.shift() as AudioNode;
    const k = gates.get(m);
    if (k !== undefined) {
      hit.add(k);
      continue;
    }
    if (m instanceof AudioDestinationNode) {
      bare = true;
      continue;
    }
    for (const o of graphOutputs.get(m) ?? []) {
      if (seen.has(o)) continue;
      seen.add(o);
      queue.push(o);
    }
  }
  if (hit.size === 1 && !bare) return hit.values().next().value as number;
  if (hit.size === 0) return bare ? 0 : -1;
  return -2;
}

// AudioBufferSourceNode declares a start of its own (when, offset, duration), so both prototypes are wrapped.
function recordStarts(inspect: Inspect): void {
  if (startRecording || typeof AudioScheduledSourceNode === 'undefined') return;
  startRecording = true;
  const protos: unknown[] = [AudioScheduledSourceNode.prototype];
  if (typeof AudioBufferSourceNode !== 'undefined' && Object.prototype.hasOwnProperty.call(AudioBufferSourceNode.prototype, 'start')) protos.push(AudioBufferSourceNode.prototype);
  for (const p of protos) {
    const proto = p as { start: (...args: unknown[]) => unknown };
    const start = proto.start;
    proto.start = function (this: AudioScheduledSourceNode, ...args: unknown[]): unknown {
      const at = this.context.currentTime;
      const asked = args[0];
      const audio = inspect.audio();
      const rec: StartRecord = {
        type: this.constructor.name,
        when: typeof asked === 'number' && asked > at ? asked : at,
        at,
        origin: audio ? audio.origin : null,
        layer: null,
      };
      if (startLog.length < START_MAX) startLog.push(rec);
      const node = this;
      window.setTimeout(() => {
        rec.layer = layerOf(inspect, node);
      }, 0);
      return start.apply(this, args);
    };
  }
}

// One node of that graph as plain data: its kind and the parameters section 8.4 fixes.
export interface GraphNode {
  type: string;
  gain?: number;
  fftSize?: number;
  smoothing?: number;
  threshold?: number;
  knee?: number;
  ratio?: number;
  attack?: number;
  release?: number;
}

function graphNode(n: AudioNode): GraphNode {
  if (n instanceof AnalyserNode) return { type: 'AnalyserNode', fftSize: n.fftSize, smoothing: n.smoothingTimeConstant };
  if (n instanceof GainNode) return { type: 'GainNode', gain: n.gain.value };
  if (n instanceof DynamicsCompressorNode) return { type: 'DynamicsCompressorNode', threshold: n.threshold.value, knee: n.knee.value, ratio: n.ratio.value, attack: n.attack.value, release: n.release.value };
  return { type: n.constructor.name };
}

function countText(list: ProbeGameObject[]): number {
  let n = 0;
  for (const o of list) {
    if (TEXT_TYPES.has(o.type)) n += 1;
    if (Array.isArray(o.list)) n += countText(o.list);
  }
  return n;
}

export function createProbe(inspect: Inspect) {
  const samples: MeterSample[] = [];
  let meterTimer = 0;
  let buffer: Float32Array<ArrayBuffer> | null = null;
  const frames: number[] = [];
  let framesOn = false;
  let lastFrame = -1;
  const keyLog: KeyRecord[] = [];
  let keyLogOn = false;
  const tapTaps: TapLog['taps'] = [];
  const tapEscapes: TapLog['escapes'] = [];
  const tapRepeats: TapLog['repeats'] = [];
  const tapAttempts: ProbeCalibrationAttempt[] = [];
  const frameLight: (number | null)[][] = [];
  const frameFull: FullFrame[] = [];
  let frameLogOn = false;
  let frameHooked = false;
  let frameDropped = 0;
  let frameSim: ProbeSim | null = null;
  let frameSims = 0;
  let frameBake = '';
  let sinceBake = 0;
  let fullSinceBake = 0;
  let preHeard: number | null = null;
  let preOrigin: number | null = null;
  const endingFrames: EndingFrame[] = [];
  let endingLogOn = false;
  const calibFrames: CalibrationFrame[] = [];
  const calibGraphics: CalibrationGraphics[] = [];
  const calibGraphicsIds = new Map<string, number>();
  let calibLogOn = false;
  let calibWasUp = false;
  let calibDropped = 0;
  let preMs = 0;
  let preAttempt: ProbeCalibrationAttempt | null = null;

  // The heard time at performance time `ms`, through the clock line, while the context runs and the line is valid; null
  // otherwise.
  function heardAt(ms: number): number | null {
    const c = inspect.clock();
    const a = inspect.audio();
    return c && c.valid && a && a.state === 'running' ? ms / 1000 + c.offset : null;
  }

  function heardNow(): number | null {
    return heardAt(performance.now());
  }

  // The scene `calibration` while it is up, null otherwise.
  function calibrationScene(): (ProbeScene & { attempt?: ProbeCalibrationAttempt | null }) | null {
    const g = inspect.game();
    if (!g || !g.scene.getScenes(true).some((s) => s.sys.settings.key === 'calibration')) return null;
    return g.scene.getScene('calibration') as unknown as (ProbeScene & { attempt?: ProbeCalibrationAttempt | null }) | null;
  }

  // An attempt's index in the tapper's record, which the tapper, the watcher and the calibration's frame log share: the
  // attempt is added the first time any of them sees it, so every index names one attempt in the scene's order.
  function noteAttempt(a: ProbeCalibrationAttempt): number {
    let k = tapAttempts.indexOf(a);
    if (k < 0) {
      tapAttempts.push(a);
      k = tapAttempts.length - 1;
    }
    return k;
  }

  // Review R5 (MAJOR 2): every frame's prestep, after the driver's listener (main.ts installs it before installProbe runs).
  // Review R5 (MAJOR 1): and, for the calibration's frame log, the performance time and the attempt live before the scene's
  // update, which reads its frameMs after this.
  function onPreStep(): void {
    if (!frameLogOn && !endingLogOn && !calibLogOn) return;
    preMs = performance.now();
    preHeard = heardAt(preMs);
    const a = inspect.audio();
    preOrigin = a ? a.origin : null;
    if (calibLogOn) preAttempt = calibrationScene()?.attempt ?? null;
  }

  // Review R5 (MAJOR 1): one frame of the scene `calibration`, after its update drew it. Review R8 (MINOR 4): the frame in
  // which the scene handed over is gone by its poststep; it is logged once, `left`, with no Graphics.
  function logCalibration(): void {
    const post = performance.now();
    const scene = calibrationScene();
    if (!scene) {
      if (calibWasUp && calibFrames.length < CALIB_MAX) {
        calibFrames.push({ pre: preMs, post, hPre: preHeard, hPost: heardAt(post), aPre: preAttempt ? noteAttempt(preAttempt) : -1, aPost: -1, g: [], left: true });
      }
      calibWasUp = false;
      return;
    }
    calibWasUp = true;
    if (calibFrames.length >= CALIB_MAX) {
      calibDropped += 1;
      return;
    }
    const ids: number[] = [];
    for (const o of scene.children.list) {
      if (o.type !== 'Graphics' || !Array.isArray(o.commandBuffer)) continue;
      const entry: CalibrationGraphics = { depth: o.depth ?? 0, visible: o.visible ?? true, alpha: o.alpha ?? 1, buffer: o.commandBuffer.map(rounded) };
      const key = JSON.stringify(entry);
      let id = calibGraphicsIds.get(key);
      if (id === undefined) {
        id = calibGraphics.length;
        calibGraphics.push(entry);
        calibGraphicsIds.set(key, id);
      }
      ids.push(id);
    }
    const live = scene.attempt ?? null;
    calibFrames.push({ pre: preMs, post, hPre: preHeard, hPost: heardAt(post), aPre: preAttempt ? noteAttempt(preAttempt) : -1, aPost: live ? noteAttempt(live) : -1, g: ids });
  }

  // Starts the calibration's frame log afresh, with the tapper's record (watchCalibration and tapCalibration).
  function calibLogStart(): void {
    calibFrames.length = 0;
    calibGraphics.length = 0;
    calibGraphicsIds.clear();
    calibDropped = 0;
    preAttempt = null;
    calibWasUp = false;
    calibLogOn = true;
    hookFrames();
  }

  // Review R5 (MAJOR 2): one frame of the scene `ending`, after its update drew it.
  function logEnding(): void {
    const g = inspect.game();
    if (!g || !g.scene.getScenes(true).some((s) => s.sys.settings.key === 'ending')) return;
    const scene = g.scene.getScene('ending');
    if (!scene || endingFrames.length >= ENDING_MAX) return;
    const glimpse = scene.children.list.find((o) => o.type === 'Image' && o.texture && o.texture.key === 'glimpse');
    endingFrames.push({ pre: preHeard, post: heardNow(), origin: preOrigin, y: glimpse ? (glimpse.y ?? 0) : null, graphics: drawnOf(scene.children.list) });
  }

  // One frame of the play scene, after every scene's update (review R3, MAJOR 1 and MINOR 3).
  function onPostStep(): void {
    if (calibLogOn) logCalibration();
    if (endingLogOn) logEnding();
    if (!frameLogOn) return;
    const g = inspect.game();
    if (!g || !g.scene.getScenes(true).some((s) => s.sys.settings.key === 'play')) return;
    const scene = g.scene.getScene('play');
    const sim = inspect.sim();
    if (!scene || !sim) return;
    if (sim !== frameSim) {
      frameSim = sim;
      frameSims += 1;
    }
    const room = sim.status().room;
    const bake = `${frameSims}:${room}`;
    if (bake !== frameBake) {
      frameBake = bake;
      sinceBake = 0;
      fullSinceBake = 0;
    }
    if (frameLight.length >= FRAME_LIGHT_MAX) {
      frameDropped += 1;
      return;
    }
    frameLight.push([frameSims, room, sim.step, preHeard, preOrigin]);
    if (sinceBake % FRAME_FULL_EVERY === 0 && fullSinceBake < FRAME_FULL_PER_BAKE && frameFull.length < FRAME_FULL_MAX) {
      const run = (scene as unknown as { run?: ProbeRun }).run;
      const view = run && typeof run.view === 'function' ? run.view() : null;
      const first = new RegExp(`^room-${String(room).padStart(2, '0')}-0$`);
      const chunk = scene.children.list.find((o) => o.type === 'Image' && o.texture && first.test(o.texture.key));
      frameFull.push({
        index: frameLight.length - 1,
        sim: frameSims,
        room,
        step: sim.step,
        state: Array.from(sim.save()),
        view: view ? [view.prevX, view.prevY, view.x, view.y, view.alpha] : null,
        x0: chunk ? (chunk.x ?? 0) : null,
        graphics: drawnOf(scene.children.list),
      });
      fullSinceBake += 1;
    }
    sinceBake += 1;
  }

  // The frame hooks, installed once: the prestep listener after the driver's, the poststep one after every scene's update.
  function hookFrames(): void {
    const g = inspect.game();
    if (!g || frameHooked) return;
    frameHooked = true;
    g.events.on(PRE_STEP, onPreStep);
    g.events.on(POST_STEP, onPostStep);
  }

  // Runs in the capture phase on window after the game's own key listeners, inside the same dispatch, so the clock
  // line's offset it reads is the one the game's stepOf read.
  function onKeyLog(e: KeyboardEvent): void {
    if (!keyLogOn) return;
    const c = inspect.clock();
    const s = inspect.sim();
    keyLog.push({ type: e.type, code: e.code, repeat: e.repeat, t: e.timeStamp, offset: c ? c.offset : null, step: s ? s.step : null });
  }

  function onFrame(t: number): void {
    if (!framesOn) return;
    if (lastFrame >= 0) frames.push(t - lastFrame);
    lastFrame = t;
    window.requestAnimationFrame(onFrame);
  }

  function meterSample(): void {
    const a = inspect.analyser();
    const c = inspect.clock();
    const s = inspect.audio();
    let rms = 0;
    let peak = 0;
    if (a) {
      if (!buffer || buffer.length !== a.fftSize) buffer = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = buffer[i] ?? 0;
        sum += v * v;
        const m = v < 0 ? -v : v;
        if (m > peak) peak = m;
      }
      rms = Math.sqrt(sum / buffer.length);
    }
    samples.push({ t: s ? s.time : 0, rms, peak, offset: c ? c.offset : 0, valid: c ? c.valid : false, resyncs: c ? c.resyncs : 0 });
    if (samples.length > 20000) samples.splice(0, samples.length - 20000);
  }

  return {
    version: PROBE_VERSION,
    ready(): boolean {
      return inspect.ready();
    },
    scenes(): string[] {
      const g = inspect.game();
      return g ? g.scene.getScenes(true).map((s) => s.sys.settings.key) : [];
    },
    textObjects(): number {
      const g = inspect.game();
      if (!g) return -1;
      let n = 0;
      for (const s of g.scene.getScenes(false)) n += countText(s.children.list);
      return n;
    },
    // Every visible text node of the page, and whether it overlaps the canvas (D16: none may).
    pageTexts(): { title: string; texts: PageText[] } {
      const canvas = inspect.game()?.canvas ?? document.querySelector('canvas');
      const cr = canvas ? canvas.getBoundingClientRect() : null;
      const texts: PageText[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? '').trim();
        const el = n.parentElement;
        if (!text || !el || el.closest('script, style, noscript, template')) continue;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.opacity === '0') continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
        if (!rects.length) continue;
        const inside = cr ? rects.some((r) => r.right > cr.left && r.left < cr.right && r.bottom > cr.top && r.top < cr.bottom) : false;
        texts.push({ text, inside });
      }
      return { title: document.title, texts };
    },
    sim(): { step: number; status: ProbeSimStatus; checksum: string; state: number[] } | null {
      const s = inspect.sim();
      return s ? { step: s.step, status: s.status(), checksum: s.checksum(), state: Array.from(s.save()) } : null;
    },
    // The display list of the scene `key` (review R2, MAJOR 1 and 3), as plain data; null without the scene.
    layout(key: string): LayoutObject[] | null {
      const g = inspect.game();
      const scene = g ? g.scene.getScene(key) : null;
      if (!scene) return null;
      return scene.children.list.map((o) => ({
        type: o.type,
        key: o.texture ? o.texture.key : null,
        x: o.x ?? 0,
        y: o.y ?? 0,
        scaleX: o.scaleX ?? 1,
        scaleY: o.scaleY ?? 1,
        originX: o.originX ?? 0,
        originY: o.originY ?? 0,
        depth: o.depth ?? 0,
        visible: o.visible ?? true,
        alpha: o.alpha ?? 1,
        w: o.frame ? o.frame.width : null,
        h: o.frame ? o.frame.height : null,
        commands: Array.isArray(o.commandBuffer) ? o.commandBuffer.length : null,
      }));
    },
    // Every Graphics of the scene `key` with its depth and its command buffer as its last update drew it (review R3,
    // MAJOR 1 and 2); null without the scene.
    drawn(key: string): DrawnGraphics[] | null {
      const g = inspect.game();
      const scene = g ? g.scene.getScene(key) : null;
      return scene ? drawnOf(scene.children.list) : null;
    },
    // The heard time now, through the device-clock line (section 9.1's audibleSec), and the run's origin: the ending's
    // card is read against the beat they give (review R3, MAJOR 2). Null before the audio starts.
    heard(): { heard: number; origin: number } | null {
      const c = inspect.clock();
      const a = inspect.audio();
      return c && a ? { heard: performance.now() / 1000 + c.offset, origin: a.origin } : null;
    },
    // Starts the play scene's frame log afresh (review R3, MAJOR 1 and MINOR 3): every frame from the next one on, until
    // frameLogTake. A probe calls it in the same page call as play(), so the first frame logged is the new run's bake.
    frameLogStart(): void {
      frameLight.length = 0;
      frameFull.length = 0;
      frameDropped = 0;
      frameSim = null;
      frameSims = 0;
      frameBake = '';
      frameLogOn = true;
      hookFrames();
    },
    frameLogTake(): FrameLog {
      frameLogOn = false;
      const cal = inspect.calibration();
      return { light: frameLight.splice(0, frameLight.length), full: frameFull.splice(0, frameFull.length), dropped: frameDropped, avOffset: cal ? cal.avOffset : null };
    },
    // Review R5 (MAJOR 2): logs every frame of the scene `ending` from now on, until endingLogTake.
    endingLogStart(): void {
      endingFrames.length = 0;
      endingLogOn = true;
      hookFrames();
    },
    endingLogTake(): EndingFrame[] {
      endingLogOn = false;
      return endingFrames.splice(0, endingFrames.length);
    },
    // The pixels of the texture `key` at the given pixels (x right, y down from the top left), as stored: a baked
    // DynamicTexture holds premultiplied bytes (review R3, MAJOR 1 and 2). Null for a missing texture or one that is not
    // a DynamicTexture.
    texturePixels(key: string, points: [number, number][]): number[][] | null {
      const g = inspect.game();
      if (!g || !g.textures.exists(key)) return null;
      const t = g.textures.get(key);
      if (!t || typeof t.snapshotPixel !== 'function') return null;
      const out: number[][] = [];
      for (const [x, y] of points) {
        let px: number[] = [-1, -1, -1, -1];
        t.snapshotPixel(x, y, (c) => {
          px = [c.r, c.g, c.b, c.a];
        });
        out.push(px);
      }
      return out;
    },
    // Records every keydown and keyup from now on (review R2, MAJOR 5), for a probe to replay the keys on the steps
    // the game must give them.
    keyLogStart(): void {
      keyLog.length = 0;
      if (keyLogOn) return;
      keyLogOn = true;
      window.addEventListener('keydown', onKeyLog, true);
      window.addEventListener('keyup', onKeyLog, true);
    },
    keyLogTake(): KeyRecord[] {
      return keyLog.splice(0, keyLog.length);
    },
    // Every start since the last call whose layer has been read (review R4, MAJOR 1), taken 50 ms after the call, with the
    // context time of the take. The layers are read in the order of the starts, so the ones not read yet are the latest;
    // they stay for the next call.
    starts(): Promise<{ time: number | null; starts: StartRecord[] }> {
      return new Promise((resolve) => {
        window.setTimeout(() => {
          const cut = startLog.findIndex((s) => s.layer === null);
          const taken = startLog.splice(0, cut < 0 ? startLog.length : cut).map((s) => ({ ...s }));
          resolve({ time: inspect.audio()?.time ?? null, starts: taken });
        }, 50);
      });
    },
    // Watches the calibration without touching it (review R4, MAJOR 1): every attempt the scene runs goes into the
    // tapper's record (tapLog().attempts), with no tap and no Escape, so that the untouched run's clicks can be held to
    // the marks of its attempts. Review R5 (MAJOR 1): it also starts the calibration's frame log (calibLogTake), from
    // before the first key when called then (the owner's ruling N-F1 c: the waiting key). Returns false without the scene.
    watchCalibration(): boolean {
      const g = inspect.game();
      const scene = g ? (g.scene.getScene('calibration') as unknown as { attempt?: ProbeCalibrationAttempt | null } | null) : null;
      if (!g || !scene) return false;
      tapTaps.length = 0;
      tapEscapes.length = 0;
      tapRepeats.length = 0;
      tapAttempts.length = 0;
      calibLogStart();
      const begun = performance.now();
      let current: ProbeCalibrationAttempt | null = null;
      const up = (): boolean => g.scene.getScenes(true).some((s) => s.sys.settings.key === 'calibration');
      const frame = (): void => {
        const a = scene.attempt ?? null;
        if (a && a !== current) {
          current = a;
          noteAttempt(a);
        }
        if (up() && performance.now() - begun < TAP_GIVE_UP_MS) window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
      return true;
    },
    // Review R5 (MAJOR 1): the calibration's frame log since watchCalibration or tapCalibration, every frame of the scene
    // `calibration` between Phaser's prestep and poststep (CalibrationFrame), its attempts indexing tapLog().attempts.
    calibLogTake(): CalibrationLog {
      calibLogOn = false;
      const graphics = calibGraphics.splice(0, calibGraphics.length);
      calibGraphicsIds.clear();
      return { frames: calibFrames.splice(0, calibFrames.length), graphics, dropped: calibDropped };
    },
    // The tapper's record of the last tapped calibration (review R2, MINOR 3).
    tapLog(): TapLog {
      return {
        taps: tapTaps.map((t) => ({ ...t })),
        escapes: tapEscapes.map((t) => ({ ...t })),
        repeats: tapRepeats.map((t) => ({ ...t })),
        attempts: tapAttempts.map((a) => ({
          pass: a.pass,
          t0: typeof a.t0 === 'number' ? a.t0 : null,
          p0: typeof a.p0 === 'number' ? a.p0 : null,
          frameTimes: a.frameTimes ? Array.from(a.frameTimes, (v) => (typeof v === 'number' ? v : null)) : null,
        })),
      };
    },
    audio() {
      return inspect.audio();
    },
    clock() {
      return inspect.clock();
    },
    calibration() {
      return inspect.calibration();
    },
    // Taps the calibration as a steady player would (review R1, MAJOR 2): a keydown the game ignores (KeyQ), aMs
    // after each click of pass A, timed in heard time through the device-clock line, and bMs after each ring of pass
    // B, timed from the frame that first drew it. It reads the scene's attempt (ProbeCalibrationAttempt) every
    // animation frame until the scene is gone. Returns false without the scene. Every tap it lands and every attempt
    // it sees go into its record (tapLog; review R2, MINOR 3): a tap's time stamp and its heard time are read just
    // before the keydown is dispatched, through the same clock line the scene's listener reads inside that dispatch.
    // Review R3: it taps the count-in too, spreads the taps that count by tapSpread (MINOR 6), and presses Escape
    // ESCAPE_MS after clicks and rings ESCAPE_AT of every attempt, logged as escapes (MINOR 5). Review R6 (MINOR 2): and
    // sends a key repeat REPEAT_MS after clicks and rings REPEAT_AT, logged as repeats. Review R7 (MINOR 3): every keydown
    // is created on its moment and dispatched DISPATCH_MS later; its record takes the clock line's offset and the attempt
    // live at the dispatch, as the scene's listener reads them inside it. The owner's ruling N-F1 c (2026-10-19; review
    // R4's untapped first attempts before it): with `untapA`, pass A gets no tap at all (its Escapes and repeats still), so
    // that A1 is rejected and the scene falls back to pass B, which is tapped. Review R5 (MAJOR 1): it also starts the
    // calibration's frame log.
    tapCalibration(aMs: number, bMs: number, untapA = false): boolean {
      const g = inspect.game();
      const scene = g ? (g.scene.getScene('calibration') as unknown as { attempt?: ProbeCalibrationAttempt | null } | null) : null;
      if (!g || !scene) return false;
      tapTaps.length = 0;
      tapEscapes.length = 0;
      tapRepeats.length = 0;
      tapAttempts.length = 0;
      calibLogStart();
      const begun = performance.now();
      const armed = new Set<string>();
      let current: ProbeCalibrationAttempt | null = null;
      let attempt = 0;
      type Kind = 'tap' | 'escape' | 'repeat';
      const plan: { tag: string; kind: Kind; i: number; aOff: number; bOff: number }[] = [];
      for (let i = 0; i < CAL_CLICKS; i++) plan.push({ tag: `${i}`, kind: 'tap', i, aOff: aMs + tapSpread(i), bOff: bMs + tapSpreadB(i) });
      for (const i of ESCAPE_AT) plan.push({ tag: `e${i}`, kind: 'escape', i, aOff: ESCAPE_MS, bOff: ESCAPE_MS });
      for (const i of REPEAT_AT) plan.push({ tag: `r${i}`, kind: 'repeat', i, aOff: REPEAT_MS, bOff: REPEAT_MS });
      const press = (kind: Kind): void => {
        const code = kind === 'escape' ? 'Escape' : 'KeyQ';
        const key = kind === 'escape' ? 'Escape' : 'q';
        const down = new KeyboardEvent('keydown', { code, key, repeat: kind === 'repeat' });
        window.setTimeout(() => {
          const c = inspect.clock();
          const live = scene.attempt ?? null;
          const record = { attempt: live ? tapAttempts.indexOf(live) : -1, t: down.timeStamp, h: down.timeStamp / 1000 + (c ? c.offset : 0) };
          (kind === 'escape' ? tapEscapes : kind === 'repeat' ? tapRepeats : tapTaps).push(record);
          window.dispatchEvent(down);
          window.dispatchEvent(new KeyboardEvent('keyup', { code, key }));
        }, DISPATCH_MS);
      };
      const pressAt = (ms: number, kind: Kind): void => {
        const fire = (): void => {
          while (performance.now() < ms) { /* the last few ms, so the event's timeStamp is the moment */ }
          press(kind);
        };
        const wait = ms - performance.now() - TAP_SPIN_MS;
        if (wait > 0) window.setTimeout(fire, wait);
        else fire();
      };
      const up = (): boolean => g.scene.getScenes(true).some((s) => s.sys.settings.key === 'calibration');
      const frame = (): void => {
        const a = scene.attempt ?? null;
        const c = inspect.clock();
        if (a && a !== current) {
          current = a;
          attempt += 1;
          noteAttempt(a);
        }
        for (const p of plan) {
          if (!a || !c) break;
          const key = `${attempt}:${p.tag}`;
          if (armed.has(key)) continue;
          if (untapA && a.pass === 'A' && p.kind === 'tap') {
            armed.add(key);
            continue;
          }
          let ms: number | null = null;
          if (a.pass === 'A' && typeof a.t0 === 'number') ms = (a.t0 + p.i * CAL_BEAT + p.aOff / 1000 - c.offset) * 1000;
          else if (a.pass === 'B' && a.frameTimes && typeof a.frameTimes[p.i] === 'number') ms = (a.frameTimes[p.i] as number) + p.bOff;
          if (ms === null || ms - performance.now() > TAP_ARM_MS) continue;
          armed.add(key);
          pressAt(ms, p.kind);
        }
        if (up() && performance.now() - begun < TAP_GIVE_UP_MS) window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
      return true;
    },
    startRoom(room: number): void {
      inspect.control.startRoom(room);
    },
    skipCalibration(avOffset: number, inputBias: number): void {
      inspect.control.skipCalibration(avOffset, inputBias);
    },
    stopInput(): void {
      inspect.control.attachInput(null);
    },
    // Restart the run at `room` and play a witness's input changes from its step 0. The source gives 0 as
    // soon as the room is left (cleared, or the run finished), so nothing leaks into the next room.
    play(room: number, changes: [number, number][]): void {
      inspect.control.startRoom(room);
      let k = 0;
      let bits = 0;
      const source: ProbeInputSource = {
        next(step: number): number {
          const s = inspect.sim();
          if (!s) return 0;
          const st = s.status();
          if (st.room !== room || st.cleared > 0 || st.finished) return 0;
          while (k < changes.length) {
            const c = changes[k];
            if (!c || c[0] > step) break;
            bits = c[1];
            k += 1;
          }
          return bits;
        },
      };
      inspect.control.attachInput(source);
    },
    // The witness run of tools/replay.mjs, on a fresh headless sim in this page.
    replay(room: number, changes: [number, number][], end: number, layers: number): ReplayResult | null {
      const make = inspect.simFactory();
      if (!make) return null;
      const sim = make({ room, step: 0, layers, stopAtClear: true });
      let k = 0;
      let bits = 0;
      for (let i = 0; i < end; i++) {
        while (k < changes.length) {
          const c = changes[k];
          if (!c || c[0] !== i) break;
          bits = c[1];
          k += 1;
        }
        sim.tick(bits);
        const st = sim.status();
        if (st.deaths > 0) return { ok: false, why: `died at step ${i + 1}`, step: i + 1, checksum: sim.checksum(), deaths: st.deaths };
        if (st.cleared > 0 || st.finished) return { ok: true, why: `clear at step ${i + 1}`, step: i + 1, checksum: sim.checksum(), deaths: 0 };
      }
      return { ok: false, why: `no clear by step ${end}`, step: end, checksum: sim.checksum(), deaths: 0 };
    },
    layerCount(): number {
      const s = inspect.audio();
      return s ? s.layerGains.length : 0;
    },
    // Sets one layer's gate gain now, through the real node (X7's solo test).
    setLayerGain(layer: number, value: number): boolean {
      const g = inspect.layerGain(layer);
      if (!g) return false;
      const t = g.context.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(value, t);
      return true;
    },
    layerGainValue(layer: number): number | null {
      const g = inspect.layerGain(layer);
      return g ? g.gain.value : null;
    },
    // The speakers' chain as built (review R3, MINOR 4), walked back from the destination of the master analyser's
    // context: whether the master analyser feeds the speakers, every other input of the speakers and whether it is
    // silent by construction (a gain of 0, as superdough's timers are, or a gain fed only by mergers that nothing
    // feeds, as superdough's own output is once every orbit is patched into its gate); then, while a level has
    // exactly one input, that input and its own inputs, and which layer gates feed the compressor. Null before the
    // audio starts.
    audioGraph(): { analyserAtSpeakers: boolean; others: (GraphNode & { silent: boolean })[]; analyser: GraphNode | null; master: GraphNode | null; compressor: GraphNode | null; compressorInputs: number; gatesIn: boolean[] } | null {
      const a = inspect.analyser();
      if (!a) return null;
      const ins = (n: AudioNode): AudioNode[] => Array.from(graphInputs.get(n) ?? []);
      const d = ins(a.context.destination);
      const silent = (n: AudioNode): boolean => n instanceof GainNode && (n.gain.value === 0 || (ins(n).length > 0 && ins(n).every((m) => m instanceof ChannelMergerNode && ins(m).length === 0)));
      const analyser = d.includes(a) ? a : null;
      const m = analyser ? ins(analyser) : [];
      const master = m.length === 1 ? (m[0] ?? null) : null;
      const c = master ? ins(master) : [];
      const compressor = c.length === 1 ? (c[0] ?? null) : null;
      const ci = compressor ? ins(compressor) : [];
      const gatesIn: boolean[] = [];
      const layers = inspect.audio()?.layerGains.length ?? 0;
      for (let k = 1; k <= layers; k++) {
        const g = inspect.layerGain(k);
        gatesIn.push(Boolean(g && ci.includes(g)));
      }
      return {
        analyserAtSpeakers: analyser !== null,
        others: d.filter((n) => n !== a).map((n) => ({ ...graphNode(n), silent: silent(n) })),
        analyser: analyser ? graphNode(analyser) : null,
        master: master ? graphNode(master) : null,
        compressor: compressor ? graphNode(compressor) : null,
        compressorInputs: ci.length,
        gatesIn,
      };
    },
    // The master analyser and the device clock, sampled in the page every `ms` milliseconds.
    meterStart(ms = 20): void {
      if (meterTimer) window.clearInterval(meterTimer);
      samples.length = 0;
      meterTimer = window.setInterval(meterSample, ms);
    },
    meterTake(): MeterSample[] {
      return samples.splice(0, samples.length);
    },
    meterStop(): void {
      if (meterTimer) window.clearInterval(meterTimer);
      meterTimer = 0;
    },
    // Animation-frame intervals in milliseconds, for the perf probe.
    framesStart(): void {
      frames.length = 0;
      lastFrame = -1;
      if (!framesOn) {
        framesOn = true;
        window.requestAnimationFrame(onFrame);
      }
    },
    framesTake(): number[] {
      return frames.splice(0, frames.length);
    },
    framesStop(): void {
      framesOn = false;
    },
    webgl(): { renderer: string; vendor: string } {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return { renderer: 'none', vendor: 'none' };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      };
    },
  };
}

export type HushProbe = ReturnType<typeof createProbe>;

export function installProbe(inspect: Inspect, search: string = window.location.search): boolean {
  if (!new URLSearchParams(search).has('probe')) return false;
  recordAudioGraph();
  recordStarts(inspect);
  (window as unknown as { __hush: HushProbe }).__hush = createProbe(inspect);
  return true;
}
