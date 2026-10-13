// window.__hush, the test API (D2; spec-owned, PROTECTED). installProbe() installs it only when the page
// URL carries ?probe; without it the function returns false and touches nothing. Product code calls
// installProbe(inspect) unconditionally and never reads ?probe itself. Everything the API returns is plain
// data, so a probe can read it through page.evaluate. It reads the game through the Inspect view and acts
// only through Inspect.control and the layer gain nodes (the solo test of X7).
import type { Inspect, ProbeCalibrationAttempt, ProbeGameObject, ProbeInputSource, ProbeRun, ProbeSim, ProbeSimStatus } from './inspect.ts';

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

export interface FrameLog {
  light: number[][];
  full: FullFrame[];
  dropped: number;
}

const FRAME_FULL_EVERY = 4;
const FRAME_FULL_PER_BAKE = 48;
const FRAME_LIGHT_MAX = 200000;
const FRAME_FULL_MAX = 2000;
// Phaser 4.2.1's Core.Events.POST_STEP.
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
// pressed, in the same form (review R3, MINOR 5); and every attempt it saw, with the marks the scene judged it against.
export interface TapLog {
  taps: { attempt: number; t: number; h: number }[];
  escapes: { attempt: number; t: number; h: number }[];
  attempts: { pass: 'A' | 'B'; t0: number | null; p0: number | null; frameTimes: (number | null)[] | null }[];
}

// The audio graph as the page builds it (review R3, MINOR 4), for the av probe to hold to section 8.4. Under ?probe
// only, installProbe wraps AudioNode.prototype.connect and disconnect before the first key, and every edge that ends
// at an AudioDestinationNode, an AnalyserNode, a DynamicsCompressorNode or a ChannelMergerNode, or starts at a
// DynamicsCompressorNode or a ChannelMergerNode, is kept here by its destination: the speakers' chain and superdough's
// own output (a merger into a gain into the speakers, which every patched orbit leaves unfed), nothing of a voice. The
// wrappers change nothing they pass on.
const graphInputs = new Map<AudioNode, Set<AudioNode>>();
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
    if (dst instanceof AudioNode && kept(this, dst)) {
      let ins = graphInputs.get(dst);
      if (!ins) graphInputs.set(dst, (ins = new Set()));
      ins.add(this);
    }
    return connect.apply(this, args);
  };
  proto.disconnect = function (this: AudioNode, ...args: unknown[]): unknown {
    const dst = args[0];
    if (dst instanceof AudioNode) graphInputs.get(dst)?.delete(this);
    else if (args.length === 0 || typeof dst === 'number') for (const ins of graphInputs.values()) ins.delete(this);
    return disconnect.apply(this, args);
  };
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
  const tapAttempts: ProbeCalibrationAttempt[] = [];
  const frameLight: number[][] = [];
  const frameFull: FullFrame[] = [];
  let frameLogOn = false;
  let frameHooked = false;
  let frameDropped = 0;
  let frameSim: ProbeSim | null = null;
  let frameSims = 0;
  let frameBake = '';
  let sinceBake = 0;
  let fullSinceBake = 0;

  // One frame of the play scene, after every scene's update (review R3, MAJOR 1 and MINOR 3).
  function onPostStep(): void {
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
    frameLight.push([frameSims, room, sim.step]);
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
      const g = inspect.game();
      if (g && !frameHooked) {
        frameHooked = true;
        g.events.on(POST_STEP, onPostStep);
      }
    },
    frameLogTake(): FrameLog {
      frameLogOn = false;
      return { light: frameLight.splice(0, frameLight.length), full: frameFull.splice(0, frameFull.length), dropped: frameDropped };
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
    // The tapper's record of the last tapped calibration (review R2, MINOR 3).
    tapLog(): TapLog {
      return {
        taps: tapTaps.map((t) => ({ ...t })),
        escapes: tapEscapes.map((t) => ({ ...t })),
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
    // ESCAPE_MS after clicks and rings ESCAPE_AT of every attempt, logged as escapes (MINOR 5). Review R4 (MAJOR 2): with
    // `untapFirst`, the first attempt of each pass gets no tap at all (its Escapes still), so that both are rejected
    // and the scene's repeats are the attempts it judges.
    tapCalibration(aMs: number, bMs: number, untapFirst = false): boolean {
      const g = inspect.game();
      const scene = g ? (g.scene.getScene('calibration') as unknown as { attempt?: ProbeCalibrationAttempt | null } | null) : null;
      if (!g || !scene) return false;
      tapTaps.length = 0;
      tapEscapes.length = 0;
      tapAttempts.length = 0;
      const begun = performance.now();
      const armed = new Set<string>();
      let current: ProbeCalibrationAttempt | null = null;
      let attempt = 0;
      const passSeen: Record<string, number> = { A: 0, B: 0 };
      let firstOfPass = false;
      const plan: { tag: string; code: string; i: number; aOff: number; bOff: number }[] = [];
      for (let i = 0; i < CAL_CLICKS; i++) plan.push({ tag: `${i}`, code: 'KeyQ', i, aOff: aMs + tapSpread(i), bOff: bMs + tapSpreadB(i) });
      for (const i of ESCAPE_AT) plan.push({ tag: `e${i}`, code: 'Escape', i, aOff: ESCAPE_MS, bOff: ESCAPE_MS });
      const press = (code: string): void => {
        const key = code === 'Escape' ? 'Escape' : 'q';
        const down = new KeyboardEvent('keydown', { code, key });
        const c = inspect.clock();
        const live = scene.attempt ?? null;
        (code === 'Escape' ? tapEscapes : tapTaps).push({ attempt: live ? tapAttempts.indexOf(live) : -1, t: down.timeStamp, h: down.timeStamp / 1000 + (c ? c.offset : 0) });
        window.dispatchEvent(down);
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key }));
      };
      const pressAt = (ms: number, code: string): void => {
        const fire = (): void => {
          while (performance.now() < ms) { /* the last few ms, so the event's timeStamp is the moment */ }
          press(code);
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
          tapAttempts.push(a);
          passSeen[a.pass] = (passSeen[a.pass] ?? 0) + 1;
          firstOfPass = passSeen[a.pass] === 1;
        }
        for (const p of plan) {
          if (!a || !c) break;
          const key = `${attempt}:${p.tag}`;
          if (armed.has(key)) continue;
          if (untapFirst && firstOfPass && p.code !== 'Escape') {
            armed.add(key);
            continue;
          }
          let ms: number | null = null;
          if (a.pass === 'A' && typeof a.t0 === 'number') ms = (a.t0 + p.i * CAL_BEAT + p.aOff / 1000 - c.offset) * 1000;
          else if (a.pass === 'B' && a.frameTimes && typeof a.frameTimes[p.i] === 'number') ms = (a.frameTimes[p.i] as number) + p.bOff;
          if (ms === null || ms - performance.now() > TAP_ARM_MS) continue;
          armed.add(key);
          pressAt(ms, p.code);
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
  (window as unknown as { __hush: HushProbe }).__hush = createProbe(inspect);
  return true;
}
