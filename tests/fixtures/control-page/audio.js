// The control page's audio engine (PF-CONTROLS fixture): HUSH-SPEC section 8 at small scale, on the same
// Strudel bundle the product uses (@strudel/web: one engine instance). Each layer's orbit plays into its own
// gate gain (0 until the layer is back), then one compressor, the master gain, the analyser and the speakers;
// the calibration click plays on orbit 11, straight into the compressor (section 8.3).
// Variants for the av probe's controls: master-off (the master never reaches the analyser), synth-throw
// (the synth registration throws), layer-off (one later layer's gate is never connected), master-low (the master gain at
// 0.4 instead of 0.8; review R3, MINOR 4), late (every note handed to superdough 0.1 s after its time) and swap (layers 1
// and 2 play through each other's gate) (review R4, MAJOR 1).
import * as S from '@strudel/web';
import { createOutputClock } from './clock.js';

export const BPM = 140;
export const SIXTEENTH = 60 / BPM / 4;
export const BAR = SIXTEENTH * 16;
const CPS = BPM / 60 / 4;
const LOOKAHEAD = 0.12;
const LATE = 0.05;
const CLICK_ORBIT = 11;

// Vault City's compileRoom capture (city-audio.js:330-349): every `label:` line is one layer, in file order.
export function compileTrack(code) {
  const names = [];
  const layers = [];
  const P = S.Pattern.prototype;
  const previous = P.p;
  let anonymous = 0;
  P.p = function capture(name) {
    const key = name === '$' ? `$${++anonymous}` : String(name);
    if (!key.startsWith('_') && !names.includes(key)) { names.push(key); layers.push(this); }
    return this;
  };
  try {
    const scope = { ...S, setcpm() {}, setcps() {}, hush() {}, evaluate() {} };
    const keys = Object.keys(scope).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !['eval', 'arguments', 'default'].includes(n));
    const { output } = S.transpiler(code, { addReturn: false, emitMiniLocations: false, emitWidgets: false });
    Function(...keys, `"use strict";${output}`)(...keys.map((k) => scope[k]));
  } finally {
    P.p = previous;
  }
  return { names, layers };
}

// The context as the clock line sees it, without getOutputTimestamp (?av=nostamps): the line then follows
// currentTime and the device's latency, which move by far more than X7's bound.
function withoutStamps(ctx) {
  return {
    get state() { return ctx.state; },
    get currentTime() { return ctx.currentTime; },
    get outputLatency() { return ctx.outputLatency; },
    get baseLatency() { return ctx.baseLatency; },
    get sampleRate() { return ctx.sampleRate; },
  };
}

export function createEngine(trackText, variant = '') {
  const status = { state: 'none', time: 0, origin: 0, scheduledVoices: 0, voiceErrors: 0, lateShifted: 0, lateDropped: 0, layerGains: [], gauntletBar: -1 };
  let ctx = null;
  let starting = null;
  let analyser = null;
  let track = null;
  let gates = [];
  let clock = null;
  let origin = 0;
  let nextStep = 0;
  let running = false;
  let startBar = -1;

  function cycleOf(bar) {
    return startBar >= 0 && bar >= startBar ? bar - startBar : bar;
  }

  function play(layer, value, time, seconds, cycle) {
    if (!value || typeof value !== 'object') return;
    let t = time;
    if (t < ctx.currentTime) {
      if (t < ctx.currentTime - LATE) { status.lateDropped += 1; return; }
      t = ctx.currentTime + 0.005;
      status.lateShifted += 1;
    }
    const orbit = variant === 'swap' && layer < 2 ? 2 - layer : layer + 1;
    S.superdough({ ...value, orbit }, t + (variant === 'late' ? 0.1 : 0), seconds, CPS, cycle).catch(() => { status.voiceErrors += 1; });
    // ?av=undercount (review R7, MAJOR 2): layer 1's voices play but are not counted.
    if (!(variant === 'undercount' && layer === 0)) status.scheduledVoices += 1;
  }

  function scheduleStep(step) {
    const bar = Math.floor(step / 16);
    const cycle = cycleOf(bar);
    const begin = cycle + (step % 16) / 16;
    track.layers.forEach((pattern, i) => {
      let haps;
      try { haps = pattern.queryArc(begin, begin + 1 / 16); } catch { status.voiceErrors += 1; return; }
      for (const hap of haps) {
        if (!hap.hasOnset()) continue;
        const onset = Number(hap.whole.begin);
        const length = Number(hap.whole.end) - onset;
        // ?av=drop (review R7, MAJOR 2): layer 1's notes of each run's second bar reach play() 0.2 s late, so they are
        // dropped and counted as the transport drops a note it gets too late.
        const late = variant === 'drop' && i === 0 && bar === 1 ? 0.2 : 0;
        play(i, hap.value, origin + (bar + onset - cycle) * BAR - late, length * BAR, onset);
      }
    });
  }

  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    clock.sample();
    if (!running) return;
    const now = ctx.currentTime;
    while (origin + nextStep * SIXTEENTH < now - LATE) nextStep += 1;
    while (origin + nextStep * SIXTEENTH < now + LOOKAHEAD) { scheduleStep(nextStep); nextStep += 1; }
  }

  return {
    status() {
      if (ctx) {
        status.state = ctx.state;
        status.time = ctx.currentTime;
        status.layerGains = gates.map((g) => g.gain.value);
      }
      return { ...status, layerGains: [...status.layerGains] };
    },
    analyser: () => analyser,
    layerGain: (layer) => gates[layer - 1] ?? null,
    clock: () => (clock ? { offset: clock.offset, valid: clock.valid, resyncs: clock.resyncs } : null),
    context: () => ctx,
    names: () => (track ? [...track.names] : []),
    // Inside the first keydown: create and resume the context in the same handler (CP V6). A second call
    // returns the first call's promise, as the product's engine does.
    start() {
      if (starting) return starting;
      // ?av=nostart (review R7, MAJOR 2): the first key starts no AudioContext.
      if (variant === 'nostart') { starting = Promise.resolve(); return starting; }
      ctx = new AudioContext({ latencyHint: 0.1 });
      const resumed = ctx.resume();
      S.setAudioContext(ctx);
      S.miniAllStrings();
      const controller = S.getSuperdoughAudioController();
      const createOrbit = controller.getOrbit.bind(controller);
      controller.getOrbit = (number, channels) => {
        if (controller.nodes[number] != null) return controller.nodes[number];
        const connect = controller.output.connectToDestination;
        controller.output.connectToDestination = () => {};
        let orbit;
        try { orbit = createOrbit(number, channels); } finally { controller.output.connectToDestination = connect; }
        const target = number === CLICK_ORBIT ? compressor : gates[number - 1];
        if (target) orbit.output.connect(target);
        return orbit;
      };
      const compressor = new DynamicsCompressorNode(ctx, { threshold: -10, knee: 6, ratio: 4, attack: 0.005, release: 0.12 });
      const master = new GainNode(ctx, { gain: variant === 'master-low' ? 0.4 : 0.8 });
      analyser = new AnalyserNode(ctx, { fftSize: 2048, smoothingTimeConstant: 0 });
      compressor.connect(master);
      if (variant !== 'master-off') master.connect(analyser);
      analyser.connect(ctx.destination);
      track = compileTrack(trackText);
      gates = track.layers.map((_, i) => {
        const g = new GainNode(ctx, { gain: 0 });
        if (!(variant === 'layer-off' && i === track.layers.length - 2)) g.connect(compressor);
        return g;
      });
      // ?av=leak (review R7, MAJOR 2): a constant 0.05 summed into layer 1's gate gain, so that layer sounds while muted.
      if (variant === 'leak') {
        const leak = new ConstantSourceNode(ctx, { offset: 0.05 });
        leak.connect(gates[0].gain);
        leak.start();
      }
      // ?av=nostamps (review R7, MAJOR 2): the line is built over a view of the context without getOutputTimestamp.
      clock = createOutputClock(variant === 'nostamps' ? withoutStamps(ctx) : ctx);
      window.setInterval(() => clock.sample(), 7);
      window.setInterval(tick, 25);
      const registered = (async () => {
        if (variant === 'synth-throw') throw new Error('control page: planted synth registration failure');
        await S.registerSynthSounds();
      })().catch(() => { status.voiceErrors += 1; });
      starting = Promise.all([resumed, registered]).then(() => undefined);
      return starting;
    },
    // Restart the transport at cycle 0, 0.1 s from now, with the layers of `mask` (bit k = layer k) back.
    restart(mask, gauntletStartBar = -1) {
      if (!ctx) return;
      const now = ctx.currentTime;
      origin = now + 0.1;
      nextStep = 0;
      startBar = gauntletStartBar;
      status.origin = origin;
      status.gauntletBar = startBar;
      gates.forEach((g, i) => {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(mask & (1 << (i + 1)) ? 1 : 0, now);
      });
      running = true;
    },
    // Layer `layer` comes back on bar `bar` of the current transport.
    unlockAt(layer, bar) {
      const g = gates[layer - 1];
      if (!ctx || !g) return;
      const t = origin + bar * BAR;
      g.gain.setValueAtTime(0, t - 0.005);
      g.gain.linearRampToValueAtTime(1, t);
    },
    // One calibration click at context time `time` (section 8.3).
    click(time) {
      if (!ctx) return;
      S.superdough({ s: 'sbd', decay: 0.08, gain: 0.8, orbit: CLICK_ORBIT }, time, SIXTEENTH, CPS, 0).catch(() => { status.voiceErrors += 1; });
    },
    origin: () => origin,
  };
}
