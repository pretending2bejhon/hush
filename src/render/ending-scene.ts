import * as Phaser from 'phaser';
import type { AudioEngine } from '../audio/engine.ts';
import { audibleSec } from '../clock/output-clock.ts';
import type { Run } from '../game/run.ts';
import { drawShapes } from './art.ts';
import type { Shape } from './art.ts';
import { BEAT_S, cardShapes, ceilingShapes, glimpseShapes, riseAt } from './ending-art.ts';

const KEY_GLIMPSE = 'glimpse';
const DEPTH_GLIMPSE = 0;
const DEPTH_GRAPHICS = 1;

// The scene `ending` (spec section 13). The gauntlet's finish leaves the track playing in full. Over 4 bars the
// gauntlet's ceiling passes and the glimpse of the next area rises into the view; then the card: three dots on the
// beat, until the tab closes. No text on the canvas. With `?playtest`, once the card is up, the run's time and deaths
// go into the page's <output id="playtest"> outside the canvas.
export class EndingScene extends Phaser.Scene {
  private engine: AudioEngine;
  private run: Run;
  private playtest: boolean;
  private glimpse: Phaser.GameObjects.Image | null = null;
  private graphics!: Phaser.GameObjects.Graphics;
  private finishStep = 0;
  private t0: number | null = null;
  private lineShown = false;

  constructor(opts: { engine: AudioEngine; run: Run; playtest: boolean }) {
    super('ending');
    this.engine = opts.engine;
    this.run = opts.run;
    this.playtest = opts.playtest;
  }

  create(): void {
    // The sim still counts steps after the finish: this is the step the ending began on.
    this.finishStep = this.run.sim ? this.run.sim.step : 0;
    this.t0 = null;
    this.lineShown = false;
    this.glimpse = null;
    if (this.bakeShapes(KEY_GLIMPSE, 1280, 720, glimpseShapes())) {
      this.glimpse = this.add.image(0, riseAt(0).glimpseY, KEY_GLIMPSE).setOrigin(0, 0).setDepth(DEPTH_GLIMPSE);
    }
    this.graphics = this.add.graphics().setDepth(DEPTH_GRAPHICS);
    this.events.once('shutdown', () => {
      this.glimpse?.destroy();
      this.glimpse = null;
      this.textures.remove(KEY_GLIMPSE);
    });
  }

  // Draws a list of shapes once into a DynamicTexture of this key and size.
  private bakeShapes(key: string, w: number, h: number, shapes: Shape[]): boolean {
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.addDynamicTexture(key, w, h);
    if (!texture) return false;
    const graphics = this.make.graphics({}, false);
    drawShapes(graphics, shapes);
    texture.draw(graphics);
    texture.render();
    graphics.destroy();
    return true;
  }

  // The run's line: its time from room 1's first step to the finish, and its deaths.
  private showRunLine(): void {
    const el = document.getElementById('playtest');
    if (!el) return;
    const s = Math.floor(this.finishStep / 240);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    const n = this.run.sim ? this.run.sim.status().deaths : 0;
    el.textContent = `run ${m}:${ss} · deaths ${n}`;
    el.removeAttribute('hidden');
  }

  override update(): void {
    const clock = this.engine.clock();
    if (!clock) return;
    const heard = audibleSec(clock, performance.now());
    if (this.t0 === null) this.t0 = heard;
    const r = riseAt(heard - this.t0);
    if (this.glimpse) this.glimpse.y = r.glimpseY;
    this.graphics.clear();
    if (r.u < 1) {
      drawShapes(this.graphics, ceilingShapes(r.ceilingY));
      return;
    }
    const beatOfBar = ((Math.floor((heard - this.run.origin) / BEAT_S) % 4) + 4) % 4;
    drawShapes(this.graphics, cardShapes(beatOfBar));
    if (this.playtest && !this.lineShown) {
      this.lineShown = true;
      this.showRunLine();
    }
  }
}
