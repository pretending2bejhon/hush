// window.__hush, the test API (D2; spec-owned, PROTECTED). installProbe() installs it only when the page
// URL carries ?probe; without it the function returns false and touches nothing. Product code calls
// installProbe(inspect) unconditionally and never reads ?probe itself. Everything the API returns is plain
// data, so a probe can read it through page.evaluate. It reads the game through the Inspect view and acts
// only through Inspect.control and the layer gain nodes (the solo test of X7).
import type { Inspect, ProbeCalibrationAttempt, ProbeGameObject, ProbeInputSource, ProbeSimStatus } from './inspect.ts';

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

// The tapper's own record of a tapped calibration (review R2, MINOR 3): every tap it landed, with its time stamp,
// its heard time through the clock line and the attempt that was up when it landed (-1 for none); and every attempt
// it saw, with the marks the scene judged it against.
export interface TapLog {
  taps: { attempt: number; t: number; h: number }[];
  attempts: { pass: 'A' | 'B'; t0: number | null; p0: number | null; frameTimes: (number | null)[] | null }[];
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
  const tapAttempts: ProbeCalibrationAttempt[] = [];

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
    // after each click of pass A from COUNT_IN on, timed in heard time through the device-clock line, and bMs after
    // each ring of pass B from COUNT_IN on, timed from the frame that first drew it. It reads the scene's attempt
    // (ProbeCalibrationAttempt) every animation frame until the scene is gone. Returns false without the scene.
    // Every tap it lands and every attempt it sees go into its record (tapLog; review R2, MINOR 3): a tap's time
    // stamp and its heard time are read just before the keydown is dispatched, through the same clock line the
    // scene's listener reads inside that dispatch.
    tapCalibration(aMs: number, bMs: number): boolean {
      const g = inspect.game();
      const scene = g ? (g.scene.getScene('calibration') as unknown as { attempt?: ProbeCalibrationAttempt | null } | null) : null;
      if (!g || !scene) return false;
      tapTaps.length = 0;
      tapAttempts.length = 0;
      const begun = performance.now();
      const armed = new Set<string>();
      let current: ProbeCalibrationAttempt | null = null;
      let attempt = 0;
      const press = (): void => {
        const down = new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q' });
        const c = inspect.clock();
        const live = scene.attempt ?? null;
        tapTaps.push({ attempt: live ? tapAttempts.indexOf(live) : -1, t: down.timeStamp, h: down.timeStamp / 1000 + (c ? c.offset : 0) });
        window.dispatchEvent(down);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ', key: 'q' }));
      };
      const pressAt = (ms: number): void => {
        const fire = (): void => {
          while (performance.now() < ms) { /* the last few ms, so the event's timeStamp is the moment */ }
          press();
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
        }
        for (let i = CAL_COUNT_IN; a && c && i < CAL_CLICKS; i++) {
          const key = `${attempt}:${i}`;
          if (armed.has(key)) continue;
          let ms: number | null = null;
          if (a.pass === 'A' && typeof a.t0 === 'number') ms = (a.t0 + i * CAL_BEAT + aMs / 1000 - c.offset) * 1000;
          else if (a.pass === 'B' && a.frameTimes && typeof a.frameTimes[i] === 'number') ms = (a.frameTimes[i] as number) + bMs;
          if (ms === null || ms - performance.now() > TAP_ARM_MS) continue;
          armed.add(key);
          pressAt(ms);
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
  (window as unknown as { __hush: HushProbe }).__hush = createProbe(inspect);
  return true;
}
