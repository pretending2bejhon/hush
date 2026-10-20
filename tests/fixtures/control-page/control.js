// The control page (PF-CONTROLS fixture): an almost empty Phaser scene with the product's canvas config and
// the product's probe API, on which every browser probe is proven before the product exists. A toy sim
// (tests/fixtures/toy-sim) plays five toy rooms; clearing toy room k brings back layer k of a four-layer
// track on the next bar line at least one beat later, as the product does. Planted failures, by query flag:
//   ?stress=<ms>  busy-waits that long every frame (X4)       ?throw  an uncaught error after boot (X5)
//   ?cerr         a console.error after boot (X5, X12)          ?noboot never leaves the boot scene (X12)
//   ?strobe       full-field white at 4 Hz (X6)                 ?strobe=red   isoluminant red/blue at 4 Hz
//   ?strobe=multi six 80x80 squares at 4 Hz, 38,400 px         ?strobe=below 190x128 at 4 Hz, 24,320 px
//   ?strobe=above 210x128 at 4 Hz, 26,880 px                   ?strobe=slow  full-field white at 2 Hz
//   ?scroll=<hex> a row of spikes in that colour scrolling at run speed (the art check of X6)
//   ?fetch=<url>  one request to that URL (X10)                ?store=local|session|cookie|idb|sw|opfs (X10; sw and
//                 opfs, a service worker and the origin-private file system: audit 1, MINOR 1)
//   ?ws=<url>     a WebSocket to that URL (X10)                ?rtc    one RTCPeerConnection (X10; audit 1, MINOR 1)
//   ?text         a Phaser Text object (D8)                    ?domtext a DOM text over the canvas (D16)
//   ?novis        no suspension when the page is hidden (D4)
//   ?center=none  the canvas left uncentred in #game (smoke's layout row; review R7, MINOR 4)
//   ?bg=<hex>     another background colour (smoke's background row; review R6, MINOR 5)
//   ?av=master-off|synth-throw|layer-off|master-low|late|swap|nostamps|leak|nostart|undercount|drop  the av probe's
//                 planted faults (X7; master-low, the mix of section 8.4; late, every note handed over 0.1 s after its
//                 time, and swap, layers 1 and 2 through each other's gate: review R4, MAJOR 1; and review R7, MAJOR 2,
//                 one for each row that had none: nostamps, the clock line built without output timestamps; leak, a
//                 constant 0.05 summed into layer 1's gate gain; nostart, no AudioContext at the first key; undercount,
//                 layer 1's voices played but not counted; drop, layer 1's notes of each run's second bar dropped late)
//   ?unlock=late|early|none  the playthrough's unlock check (X7's clear-time half): a cleared room's layer
//                 returns a bar late, a bar early, or never
//   ?calib=skip|silent|noring|nofill|flip|count3|escape|nowindow|clicklate|ringlate|filllate|frametime|bafter|arepeat|
//          nopress|norow|rowlate|linekept|noline|twopass|handlertime|repeat|endearly
//                 the calibration scene's planted faults
//                 (the flash probe's --calibration check): the first key leaves at once (the shortcut that stood in
//                 for the passes), pass A plays no click, pass B draws no ring, the count-in never fills the key, pass
//                 A's tap offsets have their sign flipped (the tapped run), the count-in is 3 beats, Escape is a key like
//                 any other (it starts the audio and taps; review R3, MINOR 5), taps during the count-in are counted
//                 (review R3, MINOR 6), every click is handed over 0.1 s after its mark (review R4, MAJOR 1), and (review
//                 R5, MAJOR 1) every ring drawn 0.1 s after its window while frameTimes keep the window, every count-in
//                 fill 0.1 s after its click, every frameTime 0.1 s after the frame that drew its ring; and (the owner's
//                 ruling N-F1 c, 2026-10-19) pass B run after an accepted pass A, a rejected pass A repeated once, the
//                 waiting key never pressed, no row, the row's dots filled 0.1 s after their clicks and rings, the page
//                 line left shown after the hand-over, no page line at all, the two-pass rule for a lone pass (avOffset
//                 medianA - medianV with the other median 0), taps timed by the handler's clock instead of the event's
//                 time stamp (review R7, MINOR 3), key repeats taken as taps (review R6, MINOR 2) and every attempt
//                 ended a beat early (review R8, MINOR 4). Before the ruling, `norepeat` (no repeat of a rejected
//                 pass) and `first` (a pass keeping its first result) were faults; section 12 now repeats nothing.
//   ?ending=none|never|early|late|mid|noagain|againearly|linekept  the ending's planted faults (the playthrough's
//                 text and again checks): the run never hands over to the scene `ending`; no run line at the card;
//                 the run line at once, before the card; the run line from the step at the card instead of the step
//                 kept at the finish; the run line at 60% of the rise, before the card; and (the owner's ruling N-F4 a,
//                 2026-10-19) no key ever plays again; a key during the rise plays again; play again leaves the run
//                 line shown
// Without ?calib the calibration scene is HUSH-SPEC section 12 itself, the reference the product follows.
// Clearing the last toy room finishes the run and starts the scene `ending`: section 13 at small scale (the
// rise, then the card with the run line in <output id="playtest"> in every mode, and from the card any key but
// Escape plays again: a new run at toy room 1 with the line hidden; the owner's ruling N-F4 a).
import * as Phaser from 'phaser';
import { installProbe } from '../../../src/probe/api.ts';
import { calibrate, judgePass } from '../calibration/reference.mjs';
import { compileWorld, createSim } from '../toy-sim/index.mjs';
import { createEngine } from './audio.js';
import { audibleSec } from './clock.js';
import trackText from './control.strudel?raw';
// Emitted as a file, never inlined: a service worker cannot be registered from a data URL (?store=sw; audit 1, MINOR 1).
import swUrl from './sw.js?url&no-inline';
import roomA from './rooms/01-toy-a.txt?raw';
import roomB from './rooms/02-toy-b.txt?raw';
import roomC from './rooms/03-toy-c.txt?raw';
import roomD from './rooms/04-toy-d.txt?raw';
import roomE from './rooms/05-toy-e.txt?raw';

const params = new URLSearchParams(window.location.search);
const world = compileWorld([
  { name: '01-toy-a.txt', text: roomA }, { name: '02-toy-b.txt', text: roomB }, { name: '03-toy-c.txt', text: roomC },
  { name: '04-toy-d.txt', text: roomD }, { name: '05-toy-e.txt', text: roomE },
]);
const engine = createEngine(trackText, params.get('av') || '');
const LAYERS = 4;
const unlockFault = params.get('unlock') || '';

let game = null;
let booted = false;
let sim = null;
let room = 0;
let unlocked = 0;
let source = null;
let calibration = null;

const canonicalLayers = (r) => (r <= 1 ? 0 : ((1 << Math.min(r, 11)) - 2) & 0x7fe);

function startRoom(r) {
  room = r;
  sim = createSim(world, { room: r, step: 0, layers: canonicalLayers(r) });
  unlocked = r;
  source = null;
  engine.restart(canonicalLayers(r));
}

function skipCalibration(avOffset, inputBias) {
  // The owner's ruling N-F1 c (2026-10-19): the page line goes with the calibration screen, and nothing shows it again.
  const line = document.getElementById('calibration');
  if (line && calibFault !== 'linekept') line.setAttribute('hidden', '');
  calibration = { avOffset, inputBias };
  if (game.scene.isActive('calibration')) game.scene.stop('calibration');
  if (!game.scene.isActive('play')) game.scene.start('play');
  startRoom(1);
}

// The tick driver: the sim follows the heard audio clock, at most 24 steps a frame.
function drive() {
  const ctx = engine.context();
  if (!ctx || !sim || ctx.state !== 'running') return;
  const c = engine.clock();
  if (!c || !c.valid) return;
  const heard = performance.now() / 1000 + c.offset;
  const target = Math.floor((heard - engine.origin()) * 240);
  for (let n = 0; n < 24 && sim.step < target; n++) {
    const step = sim.step;
    sim.tick(source ? source.next(step) : 0);
    const st = sim.status();
    if (st.cleared > 0 && unlocked === room && room <= LAYERS) {
      unlocked = room + 1;
      // The product's unlockBar of the step whose tick cleared the room (section 4.5); ?unlock moves it.
      const bar = Math.ceil((step * 7 + 720) / 2880);
      if (unlockFault !== 'none') engine.unlockAt(room, unlockFault === 'late' ? bar + 1 : unlockFault === 'early' ? bar - 1 : bar);
    }
  }
}

function busyWait(ms) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { /* the planted frame cost */ }
}

class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  create() { if (!params.has('noboot')) this.scene.start('calibration'); }
}

// HUSH-SPEC section 12 (amended for the owner's ruling N-F1 c, 2026-10-19): the key shape pressed for a sixteenth from
// each beat line while the scene waits, then pass A (24 clicks, a count-in of 4 fills of the key, taps heard against
// clicks 5 to 24) and, only when it is rejected, pass B (24 silent rings, taps against the frames that drew rings 5 to
// 24), neither repeated, each attempt with a row of 20 dots that fill as its counted clicks or rings pass; then
// calibrate() (its one-pass rule) and the run at room 1, the page line hidden. Every decision is taken in update() from
// one performance.now() read and the heard time through the device-clock line.
const calibFault = params.get('calib') || '';
const BEAT = 60 / 140;
const SIXTEENTH = BEAT / 4;
const LEAD = 0.5;
const CLICKS = 24;
const COUNT_IN = calibFault === 'count3' ? 3 : 4;
const TAIL = BEAT / 2;
const LOOKAHEAD = 0.12;
const ROW = 20;
const END_BEATS = calibFault === 'endearly' ? 22 : 23;
const ROW_LATE = calibFault === 'rowlate' ? 0.1 : 0;
if (calibFault === 'noline') document.getElementById('calibration')?.remove();

// A pass that never ran counts as rejected with no taps.
const NO_PASS = { median: 0, mad: 0, taps: 0, accepted: false };
// ?calib=twopass: the rule before the owner's ruling N-F1 c, which shifts the picture by a lone pass's median.
function calibrateTwoPass(a, v) {
  const medianA = a.accepted ? a.median : 0;
  const medianV = v.accepted ? v.median : 0;
  return { avOffset: medianA - medianV, inputBias: medianV };
}

// The nearest value of xs to v (ties to the earlier), skipping holes; null when there is none.
function nearest(xs, v) {
  let best = null;
  for (const x of xs) if (x !== undefined && (best === null || Math.abs(v - x) < Math.abs(v - best))) best = x;
  return best;
}

class Calibration extends Phaser.Scene {
  constructor() { super('calibration'); }
  create() {
    this.keyShape = this.add.graphics();
    this.ringShape = this.add.graphics();
    this.rowShape = this.add.graphics();
    this.drawKey('plain');
    this.keyed = false;
    this.ready = false;
    this.left = false;
    this.begun = false;
    this.attempt = null;
    this.queue = ['A'];
    this.results = { A: null, B: null };
    this.tries = { A: 0, B: 0 };
    const onKey = (e) => {
      if ((e.code === 'Escape' && calibFault !== 'escape') || (e.repeat && calibFault !== 'repeat')) return;
      const at = calibFault === 'handlertime' ? performance.now() : e.timeStamp;
      if (!this.keyed) {
        this.keyed = true;
        engine.start().then(() => {
          if (calibFault === 'skip') { if (!calibration) skipCalibration(0, 0); return; }
          this.ready = true;
        });
        return;
      }
      const a = this.attempt;
      if (!a) return;
      if (a.pass === 'A') {
        const c = engine.clock();
        const h = c ? audibleSec(c, at) : -Infinity;
        if (calibFault === 'nowindow' || h >= a.t0 + (COUNT_IN - 0.5) * BEAT) a.taps.push(h);
      } else if (calibFault === 'nowindow' || at >= a.p0 + (COUNT_IN - 0.5) * BEAT * 1000) a.taps.push(at);
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey, true);
      this.left = true;
      this.attempt = null;
    });
    booted = true;
    window.setTimeout(planted, 200);
  }

  // The key shape: plain, filled for a count-in sixteenth, or pressed (filled, 4 px lower) while the scene waits.
  drawKey(state) {
    const g = this.keyShape;
    const y = state === 'pressed' ? 324 : 320;
    g.clear();
    if (state !== 'plain') {
      g.fillStyle(0x7fd6ff, 0.6);
      g.fillRoundedRect(600, y, 80, 80, 14);
    }
    g.lineStyle(3, 0x7fd6ff, 0.8);
    g.strokeRoundedRect(600, y, 80, 80, 14);
  }

  // The row: dot j filled once click or ring COUNT_IN + j has passed (the first n), the others open; null draws none.
  drawRow(n) {
    const g = this.rowShape;
    g.clear();
    if (n === null || calibFault === 'norow') return;
    for (let j = 0; j < ROW; j++) {
      const x = 488 + 16 * j;
      if (j < n) {
        g.fillStyle(0x7fd6ff, 0.8);
        g.fillCircle(x, 440, 4);
      } else {
        g.lineStyle(2, 0x7fd6ff, 0.25);
        g.strokeCircle(x, 440, 4);
      }
    }
  }

  update() {
    const frameMs = performance.now();
    if (this.left) return;
    const ctx = engine.context();
    const clock = engine.clock();
    const live = this.ready && ctx && ctx.state === 'running' && clock && clock.valid;
    if (!this.begun && !live) {
      // Waiting for the first key, or for the audio it starts: the key pressed for a sixteenth from each beat line.
      this.drawKey(calibFault !== 'nopress' && frameMs % (BEAT * 1000) < SIXTEENTH * 1000 ? 'pressed' : 'plain');
      return;
    }
    if (!live) return;
    const heard = audibleSec(clock, frameMs);
    if (!this.attempt) {
      const pass = this.queue.shift();
      this.begun = true;
      this.tries[pass] += 1;
      this.attempt = pass === 'A'
        ? { pass, t0: ctx.currentTime + LEAD, sent: 0, taps: [] }
        : { pass, p0: frameMs + LEAD * 1000, frameTimes: [], taps: [] };
    }
    const a = this.attempt;
    let fill = false;
    let ring = false;
    let ended = false;
    let dots = 0;
    if (a.pass === 'A') {
      while (a.sent < CLICKS && a.t0 + a.sent * BEAT < ctx.currentTime + LOOKAHEAD) {
        if (calibFault !== 'silent') engine.click(a.t0 + a.sent * BEAT + (calibFault === 'clicklate' ? 0.1 : 0));
        a.sent += 1;
      }
      for (let i = 0; i < COUNT_IN; i++) {
        const t = a.t0 + i * BEAT + (calibFault === 'filllate' ? 0.1 : 0);
        if (heard >= t && heard < t + SIXTEENTH) fill = true;
      }
      for (let j = 0; j < ROW; j++) if (heard >= a.t0 + (COUNT_IN + j) * BEAT + ROW_LATE) dots = j + 1;
      ended = heard >= a.t0 + END_BEATS * BEAT + TAIL;
    } else {
      for (let i = 0; i < CLICKS; i++) {
        const d = a.p0 + i * BEAT * 1000;
        if (frameMs >= d && frameMs < d + SIXTEENTH * 1000) {
          if (calibFault !== 'ringlate') ring = true;
          if (a.frameTimes[i] === undefined) a.frameTimes[i] = frameMs + (calibFault === 'frametime' ? 100 : 0);
        }
        if (calibFault === 'ringlate' && frameMs >= d + 100 && frameMs < d + 100 + SIXTEENTH * 1000) ring = true;
      }
      for (let j = 0; j < ROW; j++) if (frameMs >= a.p0 + ((COUNT_IN + j) * BEAT + ROW_LATE) * 1000) dots = j + 1;
      ended = frameMs >= a.p0 + (END_BEATS * BEAT + TAIL) * 1000;
    }
    this.drawKey(fill && calibFault !== 'nofill' ? 'filled' : 'plain');
    this.ringShape.clear();
    if (ring && calibFault !== 'noring') {
      this.ringShape.lineStyle(3, 0x7fd6ff, 1);
      this.ringShape.strokeCircle(640, 360, 50);
    }
    this.drawRow(dots);
    if (!ended) return;
    let offsets;
    if (a.pass === 'A') {
      const clicks = [];
      for (let i = COUNT_IN; i < CLICKS; i++) clicks.push(a.t0 + i * BEAT);
      offsets = a.taps.map((h) => (calibFault === 'flip' ? nearest(clicks, h) - h : h - nearest(clicks, h)) * 1000);
    } else {
      const drawn = a.frameTimes.slice(COUNT_IN);
      offsets = a.taps.map((t) => ({ t, f: nearest(drawn, t) })).filter((x) => x.f !== null).map((x) => x.t - x.f);
    }
    const result = judgePass(offsets);
    this.results[a.pass] = result;
    this.attempt = null;
    this.drawKey('plain');
    this.ringShape.clear();
    this.drawRow(null);
    if (a.pass === 'A') {
      if (!result.accepted && calibFault === 'arepeat' && this.tries.A < 2) this.queue.push('A');
      else if (!result.accepted || calibFault === 'bafter') this.queue.push('B');
    }
    if (this.queue.length) return;
    this.left = true;
    const values = (calibFault === 'twopass' ? calibrateTwoPass : calibrate)(this.results.A ?? NO_PASS, this.results.B ?? NO_PASS);
    skipCalibration(values.avOffset, values.inputBias);
  }
}

// Every frame of the play and ending scenes, as the product's driver runs whatever scene is up: the driver,
// then the planted busy wait. drawFaults draws the planted strobes and spikes on the scene's own Graphics.
function frameStart() {
  drive();
  const stress = Number(params.get('stress') || 0);
  if (stress > 0) busyWait(stress);
}

function drawFaults(g, t) {
  g.clear();
  if (params.has('strobe')) strobe(g, params.get('strobe') || '', t);
  if (params.has('scroll')) spikes(g, parseInt(params.get('scroll') || 'c8d0e0', 16), t);
}

class Play extends Phaser.Scene {
  constructor() { super('play'); }
  create() {
    this.track = this.add.graphics();
    this.fx = this.add.graphics();
    this.ended = false;
    if (params.has('text')) this.add.text(40, 40, 'planted', { color: '#ffffff' });
  }
  update() {
    frameStart();
    const t = performance.now();
    this.track.clear();
    this.track.fillStyle(0x161b28, 1);
    this.track.fillRect(80, 420, 1120, 8);
    if (sim) {
      const st = sim.status();
      this.track.fillStyle(0xe8ecf4, 1);
      this.track.fillRect(84 + st.x * 18, 396, 24, 24);
    }
    drawFaults(this.fx, t);
    if (!this.ended && endingFault !== 'none' && sim && room === world.rooms.length && sim.status().cleared > 0) {
      this.ended = true;
      this.scene.start('ending');
    }
  }
}

// HUSH-SPEC section 13 at small scale. create() keeps the step at the finish; the first frame keeps the heard
// time; RISE_S of heard time later the card shows (three small dots, still) and the run line `run m:ss · deaths n`
// goes into <output id="playtest">, which loses its hidden attribute (in every mode: the owner's ruling N-F4 a). From
// the card on, a keydown that is neither Escape nor a repeat plays again: the line hidden, the scene `play` and a run
// at toy room 1.
const RISE_S = 16 * BEAT;
const endingFault = params.get('ending') || '';

function showRunLine(step) {
  const s = Math.floor(step / 240);
  const out = document.getElementById('playtest');
  out.textContent = `run ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · deaths ${sim ? sim.status().deaths : 0}`;
  out.hidden = false;
}

function hideRunLine() {
  const out = document.getElementById('playtest');
  out.textContent = '';
  out.hidden = true;
}

class Ending extends Phaser.Scene {
  constructor() { super('ending'); }
  create() {
    this.dots = this.add.graphics();
    this.fx = this.add.graphics();
    this.finishStep = sim ? sim.step : 0;
    this.t0 = null;
    this.card = false;
    this.mid = false;
    if (endingFault === 'early') showRunLine(this.finishStep);
    const onKey = (e) => {
      if (e.code === 'Escape' || e.repeat || endingFault === 'noagain') return;
      if (!this.card && endingFault !== 'againearly') return;
      window.removeEventListener('keydown', onKey, true);
      if (endingFault !== 'linekept') hideRunLine();
      this.scene.start('play');
      startRoom(1);
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once('shutdown', () => window.removeEventListener('keydown', onKey, true));
  }
  update() {
    frameStart();
    const frameMs = performance.now();
    drawFaults(this.fx, frameMs);
    const clock = engine.clock();
    if (this.card || !clock || !clock.valid) return;
    const heard = audibleSec(clock, frameMs);
    if (this.t0 === null) this.t0 = heard;
    if (endingFault === 'mid' && !this.mid && heard - this.t0 >= 0.6 * RISE_S) {
      this.mid = true;
      showRunLine(this.finishStep);
    }
    if (heard - this.t0 < RISE_S) return;
    this.card = true;
    this.dots.fillStyle(0x7fd6ff, 0.6);
    for (let i = -1; i <= 1; i++) this.dots.fillCircle(640 + i * 60, 360, 7.5);
    if (endingFault !== 'never' && endingFault !== 'early') showRunLine(endingFault === 'late' ? sim.step : this.finishStep);
  }
}

function strobe(g, mode, t) {
  const on = Math.floor(t / (mode === 'slow' ? 250 : 125)) % 2 === 1;
  if (mode === 'red') {
    g.fillStyle(on ? 0xff0000 : 0x007cff, 1);
    g.fillRect(0, 0, 1280, 720);
    return;
  }
  if (!on) return;
  g.fillStyle(0xffffff, 1);
  if (mode === 'multi') for (let i = 0; i < 6; i++) g.fillRect(80 + i * 190, 120, 80, 80);
  else if (mode === 'below') g.fillRect(400, 120, 190, 128);
  else if (mode === 'above') g.fillRect(400, 120, 210, 128);
  else g.fillRect(0, 0, 1280, 720);
}

// The product's spike tile at zoom 2.5: 40 px tiles, three triangles filling the box x 5..35, y 15..40,
// one row across the whole view, scrolling left at the run speed (165 world px/s, 412.5 canvas px/s).
function spikes(g, colour, t) {
  const shift = ((t / 1000) * 412.5) % 40;
  g.fillStyle(colour, 1);
  for (let tile = -1; tile <= 32; tile++) {
    const x0 = tile * 40 - shift;
    for (let k = 0; k < 3; k++) {
      const bx = x0 + 5 + k * 10;
      g.fillTriangle(bx, 640, bx + 10, 640, bx + 5, 615);
    }
  }
}

function planted() {
  if (params.has('throw')) window.setTimeout(() => { throw new Error('control page: planted page error'); }, 0);
  if (params.has('cerr')) console.error('control page: planted console error');
  if (params.has('fetch')) fetch(params.get('fetch')).catch(() => {});
  const store = params.get('store');
  if (store === 'local') window.localStorage.setItem('planted', '1');
  if (store === 'session') window.sessionStorage.setItem('planted', '1');
  if (store === 'cookie') document.cookie = 'planted=1; path=/';
  if (store === 'idb') window.indexedDB.open('planted', 1);
  // Audit 1, MINOR 1: what X10's rows could not see before. A service worker registered from an emitted asset, a file in
  // the origin-private file system, a WebSocket and an RTCPeerConnection (which the probe refuses and counts).
  if (store === 'sw' && navigator.serviceWorker) navigator.serviceWorker.register(swUrl).catch(() => {});
  if (store === 'opfs' && navigator.storage) navigator.storage.getDirectory().then((d) => d.getFileHandle('planted', { create: true })).catch(() => {});
  if (params.has('ws')) {
    try { new WebSocket(params.get('ws')); } catch { /* a malformed URL plants nothing */ }
  }
  if (params.has('rtc')) {
    try { new RTCPeerConnection(); } catch { /* the probe refuses it */ }
  }
  if (params.has('domtext')) {
    const div = document.createElement('div');
    div.textContent = 'planted';
    const r = game.canvas.getBoundingClientRect();
    div.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;color:#fff`;
    document.body.appendChild(div);
  }
}

// A hidden page suspends the audio, and with it the sim (the driver ticks only while the context runs).
if (!params.has('novis')) {
  document.addEventListener('visibilitychange', () => {
    const ctx = engine.context();
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend();
    else ctx.resume();
  });
}

function firstKey(e) {
  if (e.code === 'Escape' && calibFault !== 'escape') return;
  window.removeEventListener('keydown', firstKey, true);
  engine.start();
}
window.addEventListener('keydown', firstKey, true);

game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: 1280,
  height: 720,
  // ?bg=<hex> and ?center=none (review R7, MINOR 4; R6, MINOR 5): smoke's background and layout rows.
  backgroundColor: params.has('bg') ? `#${params.get('bg')}` : '#07080d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: params.get('center') === 'none' ? Phaser.Scale.NO_CENTER : Phaser.Scale.CENTER_BOTH },
  fps: { limit: 0 },
  audio: { noAudio: true },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false, windowEvents: false },
  banner: false,
  scene: [Boot, Calibration, Play, Ending],
});

installProbe({
  ready: () => booted,
  game: () => game,
  sim: () => sim,
  simFactory: () => (start) => createSim(world, start),
  audio: () => (engine.context() ? engine.status() : null),
  analyser: () => engine.analyser(),
  layerGain: (layer) => engine.layerGain(layer),
  clock: () => engine.clock(),
  calibration: () => calibration,
  control: { startRoom, skipCalibration, attachInput: (s) => { source = s; } },
});
