import * as Phaser from 'phaser';
import type { AudioEngine } from '../audio/engine.ts';
import { audibleSec } from '../clock/output-clock.ts';
import { calibrate, judgePass } from '../input/calibrate.ts';
import type { PassResult } from '../input/calibrate.ts';

// True once the calibration scene has been created: the page then waits for its first key (the probe's ready()).
export let booted = false;

// The calibration screen (spec section 12, amended for the owner's ruling N-F1 c): wordless on the canvas, memory only.
// While the scene waits for its first key and for the audio that key starts, the key shape in the centre of the canvas
// is pressed for a sixteenth from each beat line of performance time. Then pass A (24 clicks, a count-in of 4 fills of
// the key, taps heard against clicks 5 to 24) and, only when it is rejected, pass B (24 silent rings, taps against the
// frames that drew rings 5 to 24), neither repeated, each attempt with a row of 20 dots that fill as its counted clicks
// or rings pass; then calibrate() (its one-pass rule) and the hand-over. Every decision is taken in update(), from one
// performance.now() read and the heard time through the device-clock line.
const BEAT = 60 / 140;
const SIXTEENTH = BEAT / 4;
const LEAD = 0.5;
const CLICKS = 24;
const COUNT_IN = 4;
const TAIL = BEAT / 2;
const LOOKAHEAD = 0.12;
// The row: one dot for each counted click or ring, COUNT_IN to CLICKS - 1.
const ROW = 20;

type Pass = 'A' | 'B';
type KeyState = 'plain' | 'filled' | 'pressed';
interface AttemptA {
  pass: 'A';
  t0: number;
  sent: number;
  taps: number[];
}
interface AttemptB {
  pass: 'B';
  p0: number;
  frameTimes: (number | undefined)[];
  taps: number[];
}
type Attempt = AttemptA | AttemptB;

// A pass that never ran counts as rejected with no taps.
const NO_PASS: PassResult = { median: 0, mad: 0, taps: 0, accepted: false };

// The nearest value of xs to v (ties to the earlier), skipping holes; null when there is none.
function nearest(xs: (number | undefined)[], v: number): number | null {
  let best: number | null = null;
  for (const x of xs) if (x !== undefined && (best === null || Math.abs(v - x) < Math.abs(v - best))) best = x;
  return best;
}

export class CalibrationScene extends Phaser.Scene {
  private engine: AudioEngine;
  private onDone: (avOffset: number, inputBias: number) => void;
  private keyShape!: Phaser.GameObjects.Graphics;
  private ringShape!: Phaser.GameObjects.Graphics;
  private rowShape!: Phaser.GameObjects.Graphics;
  private keyed = false;
  private ready = false;
  private left = false;
  private begun = false;
  private attempt: Attempt | null = null;
  private queue: Pass[] = ['A'];
  private results: Record<Pass, PassResult | null> = { A: null, B: null };

  constructor(opts: { engine: AudioEngine; onDone: (avOffset: number, inputBias: number) => void }) {
    super('calibration');
    this.engine = opts.engine;
    this.onDone = opts.onDone;
  }

  create(): void {
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
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape' || e.repeat) return;
      if (!this.keyed) {
        this.keyed = true;
        void this.engine.start().then(() => {
          this.ready = true;
        });
        return;
      }
      const a = this.attempt;
      if (!a) return;
      if (a.pass === 'A') {
        const c = this.engine.clock();
        const h = c ? audibleSec(c, e.timeStamp) : -Infinity;
        if (h >= a.t0 + (COUNT_IN - 0.5) * BEAT) a.taps.push(h);
      } else if (e.timeStamp >= a.p0 + (COUNT_IN - 0.5) * BEAT * 1000) a.taps.push(e.timeStamp);
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey, true);
      this.left = true;
      this.attempt = null;
    });
    booted = true;
  }

  // The key shape: plain, filled for a count-in sixteenth, or pressed (filled, 4 px lower) while the scene waits.
  private drawKey(state: KeyState): void {
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
  private drawRow(n: number | null): void {
    const g = this.rowShape;
    g.clear();
    if (n === null) return;
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

  override update(): void {
    const frameMs = performance.now();
    if (this.left) return;
    const ctx = this.engine.context();
    const clock = this.engine.clock();
    if (!this.ready || !ctx || ctx.state !== 'running' || !clock || !clock.valid) {
      // The calibration cannot begin yet. Before it begins (the first key, and the audio it starts), the wait: the key
      // pressed for a sixteenth from each beat line. Once begun, nothing: the Graphics are kept.
      if (!this.begun) this.drawKey(frameMs % (BEAT * 1000) < SIXTEENTH * 1000 ? 'pressed' : 'plain');
      return;
    }
    const heard = audibleSec(clock, frameMs);
    if (!this.attempt) {
      const pass = this.queue.shift() ?? 'A';
      this.begun = true;
      this.attempt =
        pass === 'A'
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
        this.engine.click(a.t0 + a.sent * BEAT);
        a.sent += 1;
      }
      for (let i = 0; i < COUNT_IN; i++) {
        const t = a.t0 + i * BEAT;
        if (heard >= t && heard < t + SIXTEENTH) fill = true;
      }
      for (let j = 0; j < ROW; j++) if (heard >= a.t0 + (COUNT_IN + j) * BEAT) dots = j + 1;
      ended = heard >= a.t0 + 23 * BEAT + TAIL;
    } else {
      for (let i = 0; i < CLICKS; i++) {
        const d = a.p0 + i * BEAT * 1000;
        if (frameMs >= d && frameMs < d + SIXTEENTH * 1000) {
          ring = true;
          if (a.frameTimes[i] === undefined) a.frameTimes[i] = frameMs;
        }
      }
      for (let j = 0; j < ROW; j++) if (frameMs >= a.p0 + (COUNT_IN + j) * BEAT * 1000) dots = j + 1;
      ended = frameMs >= a.p0 + (23 * BEAT + TAIL) * 1000;
    }
    this.drawKey(fill ? 'filled' : 'plain');
    this.ringShape.clear();
    if (ring) {
      this.ringShape.lineStyle(3, 0x7fd6ff, 1);
      this.ringShape.strokeCircle(640, 360, 50);
    }
    this.drawRow(dots);
    if (!ended) return;
    const offsets: number[] = [];
    if (a.pass === 'A') {
      const clicks: number[] = [];
      for (let i = COUNT_IN; i < CLICKS; i++) clicks.push(a.t0 + i * BEAT);
      for (const h of a.taps) offsets.push((h - (nearest(clicks, h) ?? h)) * 1000);
    } else {
      const drawn = a.frameTimes.slice(COUNT_IN);
      for (const t of a.taps) {
        const f = nearest(drawn, t);
        if (f !== null) offsets.push(t - f);
      }
    }
    const result = judgePass(offsets);
    this.results[a.pass] = result;
    this.attempt = null;
    this.drawKey('plain');
    this.ringShape.clear();
    this.drawRow(null);
    // The course: A1, then B1 only when A1 was rejected, and no repeat of either.
    if (a.pass === 'A' && !result.accepted) this.queue.push('B');
    if (this.queue.length) return;
    this.left = true;
    const values = calibrate(this.results.A ?? NO_PASS, this.results.B ?? NO_PASS);
    this.onDone(values.avOffset, values.inputBias);
  }
}
