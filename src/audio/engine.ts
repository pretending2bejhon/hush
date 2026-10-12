// The audio engine (spec sections 8.2 to 8.4): one Strudel bundle (@strudel/web) on one AudioContext. Each of the
// ten layers plays on its own superdough orbit into its gate (gain 0 until the layer is back), then one
// compressor, the master gain, the analyser and the speakers; nothing bypasses the analyser. The transport hands
// notes over from a 25 ms interval and from a worker ticker, the device clock is sampled every 7 ms.
// @strudel/web ships no types: the namespace is used untyped.
// @ts-expect-error TS7016
import * as S from '@strudel/web';
import { createOutputClock } from '../clock/output-clock.ts';
import type { OutputClock } from '../clock/output-clock.ts';
import { openAt, setMask, unlockTime } from './gates.ts';
import { CPS, createTransport, SIXTEENTH } from './scheduler.ts';
import { compileTrack } from './track.ts';

export interface AudioStatus {
  state: AudioContextState | 'none';
  time: number;
  origin: number;
  scheduledVoices: number;
  voiceErrors: number;
  lateShifted: number;
  lateDropped: number;
  layerGains: number[];
}

export interface AudioEngine {
  start(): Promise<void>;
  context(): AudioContext | null;
  status(): AudioStatus;
  analyser(): AnalyserNode | null;
  layerGain(layer: number): GainNode | null;
  clock(): OutputClock | null;
  restart(origin: number, layers: number, gauntletStartBar: number): void;
  unlockAt(layer: number, bar: number): void;
  gauntlet(startBar: number): void;
  click(time: number): void;
}

// The calibration clicks play on their own orbit, straight into the compressor.
const CLICK_ORBIT = 11;
// A Blob worker posts every 25 ms; the page runs the transport on its message only when the interval has gone
// quiet for 60 ms (a background tab throttles page timers, not a worker's messages).
const TICKER = 'let id=0;onmessage=e=>{clearInterval(id);id=e.data>0?setInterval(()=>postMessage(0),e.data):0;};';

export function createAudioEngine(trackText: string): AudioEngine {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let clock: OutputClock | null = null;
  let gates: GainNode[] = [];
  let transport: ReturnType<typeof createTransport> | null = null;
  let starting: Promise<void> | null = null;
  let lastTick = 0;

  function tick(): void {
    if (!ctx || ctx.state !== 'running' || !transport || !clock) return;
    lastTick = performance.now();
    clock.sample();
    transport.tick(ctx.currentTime);
  }

  function play(note: { layer: number; value: Record<string, unknown>; time: number; duration: number; cycle: number }): void {
    try {
      Promise.resolve(S.superdough({ ...note.value, orbit: note.layer }, note.time, note.duration, CPS, note.cycle)).catch(() => transport?.voiceError());
    } catch {
      transport?.voiceError();
    }
  }

  function startTimers(): void {
    window.setInterval(tick, 25);
    window.setInterval(() => clock?.sample(), 7);
    try {
      const url = URL.createObjectURL(new Blob([TICKER], { type: 'text/javascript' }));
      const ticker = new Worker(url);
      let revoked = false;
      ticker.onmessage = () => {
        if (!revoked) {
          revoked = true;
          URL.revokeObjectURL(url);
        }
        if (performance.now() - lastTick > 60) tick();
      };
      ticker.onerror = () => ticker.terminate();
      ticker.postMessage(25);
    } catch {
      // No worker: the interval alone runs the transport.
    }
  }

  return {
    // Inside the first keydown: the context is created and resumed in that same handler (CP V6).
    start(): Promise<void> {
      if (starting) return starting;
      const context = new AudioContext({ latencyHint: 0.1 });
      ctx = context;
      const resumed = context.resume();
      S.setAudioContext(context);
      S.miniAllStrings();
      // An orbit plays into its layer's gate, never straight to the speakers (Vault City city-audio.js:271-283).
      const controller = S.getSuperdoughAudioController();
      const createOrbit = controller.getOrbit.bind(controller);
      let compressor: DynamicsCompressorNode | null = null;
      controller.getOrbit = (number: number, channels: unknown) => {
        if (controller.nodes[number] != null) return controller.nodes[number];
        const connect = controller.output.connectToDestination;
        controller.output.connectToDestination = () => {};
        let orbit: { output: AudioNode };
        try {
          orbit = createOrbit(number, channels);
        } finally {
          controller.output.connectToDestination = connect;
        }
        const target = number === CLICK_ORBIT ? compressor : gates[number - 1];
        if (target) orbit.output.connect(target);
        return orbit;
      };
      const bus = new DynamicsCompressorNode(context, { threshold: -10, knee: 6, ratio: 4, attack: 0.005, release: 0.12 });
      compressor = bus;
      const master = new GainNode(context, { gain: 0.8 });
      analyser = new AnalyserNode(context, { fftSize: 2048, smoothingTimeConstant: 0 });
      bus.connect(master);
      master.connect(analyser);
      analyser.connect(context.destination);
      const track = compileTrack(trackText, S);
      gates = track.layers.map(() => {
        const gate = new GainNode(context, { gain: 0 });
        gate.connect(bus);
        return gate;
      });
      transport = createTransport(track.layers, play);
      clock = createOutputClock(context);
      startTimers();
      const registered = Promise.resolve()
        .then(() => S.registerSynthSounds())
        .catch(() => transport?.voiceError());
      starting = Promise.all([resumed, registered]).then(() => undefined);
      return starting;
    },
    context: () => ctx,
    status(): AudioStatus {
      const c = transport ? transport.counters() : { scheduledVoices: 0, voiceErrors: 0, lateShifted: 0, lateDropped: 0 };
      return {
        state: ctx ? ctx.state : 'none',
        time: ctx ? ctx.currentTime : 0,
        origin: transport ? transport.origin : 0,
        ...c,
        layerGains: gates.map((g) => g.gain.value),
      };
    },
    analyser: () => analyser,
    layerGain: (layer: number) => gates[layer - 1] ?? null,
    clock: () => clock,
    // The transport starts again at cycle 0 on `origin` and every gate takes the mask of the layers back.
    restart(origin: number, layers: number, gauntletStartBar: number): void {
      if (!ctx || !transport) return;
      transport.restart(origin, gauntletStartBar);
      setMask(gates.map((g) => g.gain), layers, ctx.currentTime);
    },
    unlockAt(layer: number, bar: number): void {
      const gate = gates[layer - 1];
      if (!ctx || !transport || !gate) return;
      openAt(gate.gain, unlockTime(transport.origin, bar));
    },
    gauntlet(startBar: number): void {
      transport?.gauntlet(startBar);
    },
    click(time: number): void {
      if (!ctx) return;
      try {
        Promise.resolve(S.superdough({ s: 'sbd', decay: 0.08, gain: 0.8, orbit: CLICK_ORBIT }, time, SIXTEENTH, CPS, 0)).catch(() => transport?.voiceError());
      } catch {
        transport?.voiceError();
      }
    },
  };
}
