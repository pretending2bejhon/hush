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
//   ?fetch=<url>  one request to that URL (X10)                ?store=local|session|cookie|idb (X10)
//   ?text         a Phaser Text object (D8)                    ?domtext a DOM text over the canvas (D16)
//   ?av=master-off|synth-throw|layer-off  the av probe's planted faults (X7)
import * as Phaser from 'phaser';
import { installProbe } from '../../../src/probe/api.ts';
import { compileWorld, createSim } from '../toy-sim/index.mjs';
import { createEngine } from './audio.js';
import trackText from './control.strudel?raw';
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
  calibration = { avOffset, inputBias };
  if (game.scene.isActive('calibration')) game.scene.stop('calibration');
  if (!game.scene.isActive('play')) game.scene.start('play');
  startRoom(1);
}

// The tick driver: the sim follows the heard audio clock, at most 24 steps a frame.
function drive() {
  const ctx = engine.context();
  if (!ctx || !sim) return;
  const c = engine.clock();
  const heard = c && c.valid ? performance.now() / 1000 + c.offset : ctx.currentTime;
  const target = Math.floor((heard - engine.origin()) * 240);
  for (let n = 0; n < 24 && sim.step < target; n++) {
    sim.tick(source ? source.next(sim.step) : 0);
    const st = sim.status();
    if (st.cleared > 0 && unlocked === room && room <= LAYERS) {
      unlocked = room + 1;
      engine.unlockAt(room, Math.ceil((sim.step * 7 + 720) / 2880));
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

class Calibration extends Phaser.Scene {
  constructor() { super('calibration'); }
  create() {
    const g = this.add.graphics();
    g.lineStyle(3, 0x7fd6ff, 0.8);
    g.strokeRoundedRect(600, 320, 80, 80, 14);
    booted = true;
    window.setTimeout(planted, 200);
  }
}

class Play extends Phaser.Scene {
  constructor() { super('play'); }
  create() {
    this.track = this.add.graphics();
    this.fx = this.add.graphics();
    if (params.has('text')) this.add.text(40, 40, 'planted', { color: '#ffffff' });
  }
  update() {
    drive();
    const stress = Number(params.get('stress') || 0);
    if (stress > 0) busyWait(stress);
    const t = performance.now();
    this.track.clear();
    this.track.fillStyle(0x161b28, 1);
    this.track.fillRect(80, 420, 1120, 8);
    if (sim) {
      const st = sim.status();
      this.track.fillStyle(0xe8ecf4, 1);
      this.track.fillRect(84 + st.x * 18, 396, 24, 24);
    }
    this.fx.clear();
    if (params.has('strobe')) strobe(this.fx, params.get('strobe') || '', t);
    if (params.has('scroll')) spikes(this.fx, parseInt(params.get('scroll') || 'c8d0e0', 16), t);
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
  if (params.has('domtext')) {
    const div = document.createElement('div');
    div.textContent = 'planted';
    const r = game.canvas.getBoundingClientRect();
    div.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;color:#fff`;
    document.body.appendChild(div);
  }
}

function firstKey(e) {
  if (e.code === 'Escape') return;
  window.removeEventListener('keydown', firstKey, true);
  engine.start();
}
window.addEventListener('keydown', firstKey, true);

game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#07080d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { limit: 0 },
  audio: { noAudio: true },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false, windowEvents: false },
  banner: false,
  scene: [Boot, Calibration, Play],
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
