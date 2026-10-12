import * as Phaser from 'phaser';
import { createFlashLimiter } from '../fx/flash-limiter.ts';
import type { Run } from '../game/run.ts';
import type { Room, Sim } from '../sim/types.ts';
import { drawShapes, TILE_PX, ZOOM } from './art.ts';
import type { Shape } from './art.ts';
import { depthBands, fogShapes, moteField, vignetteShapes } from './depth-art.ts';
import type { Mote } from './depth-art.ts';
import { playFrame } from './play-frame.ts';
import { bakeChunks, roomShapes } from './room-art.ts';

// Back to front: the four bands 0 to 3 (far to near), the fog 4, the room's chunks 5, the beat entities and the
// layer's ring 6, the creature 7, the dust 8, the vignette 9.
const DEPTH_FOG = 4;
const DEPTH_CHUNKS = 5;
const DEPTH_BEAT = 6;
const DEPTH_CREATURE = 7;
const DEPTH_DUST = 8;
const DEPTH_VIGNETTE = 9;
const KEY_FOG = 'fog';
const KEY_VIGNETTE = 'vignette';

// A baked image of the current room and where it sits for a camera.
interface Baked {
  key: string;
  image: Phaser.GameObjects.Image;
  xAt: (camPx: number) => number;
}

// The play scene (spec sections 10.1 and 10.6). The fog and the vignette are baked once when the scene is created;
// the room's four parallax bands and its static geometry, one DynamicTexture per chunk of 128 columns, are baked once
// on entering a room and shown at the camera. Every frame is one call of playFrame (play-frame.ts), read from the run's
// sim: the scene sets its images' x from the camera it returns and draws its lists, the beat entities with the ring
// of a layer's return (through the scene's flash limiter) on one Graphics, the creature on another and the dust on a
// third, and nothing else.
// The world view is 32 by 18 tiles at zoom 2.5; a wider room scrolls horizontally.
// When the run finishes it hands over to the scene `ending`.
export class PlayScene extends Phaser.Scene {
  private run: Run;
  private beat!: Phaser.GameObjects.Graphics;
  private creature!: Phaser.GameObjects.Graphics;
  private dust!: Phaser.GameObjects.Graphics;
  private limiter = createFlashLimiter(1280, 720);
  private levels: number[] = [];
  private field: Mote[] = [];
  private ended = false;
  private bakedRoom: Room | null = null;
  private bakedSim: Sim | null = null;
  private baked: Baked[] = [];

  constructor(run: Run) {
    super('play');
    this.run = run;
  }

  create(): void {
    this.beat = this.add.graphics().setDepth(DEPTH_BEAT);
    this.creature = this.add.graphics().setDepth(DEPTH_CREATURE);
    this.dust = this.add.graphics().setDepth(DEPTH_DUST);
    this.limiter = createFlashLimiter(1280, 720);
    this.levels = [];
    this.field = [];
    this.ended = false;
    this.bakedRoom = null;
    this.bakedSim = null;
    this.baked = [];
    if (this.bakeShapes(KEY_FOG, 1280, 720, fogShapes())) this.add.image(0, 0, KEY_FOG).setOrigin(0, 0).setDepth(DEPTH_FOG);
    if (this.bakeShapes(KEY_VIGNETTE, 1280, 720, vignetteShapes())) this.add.image(0, 0, KEY_VIGNETTE).setOrigin(0, 0).setDepth(DEPTH_VIGNETTE);
    this.events.once('shutdown', () => {
      this.unbake();
      this.textures.remove(KEY_FOG);
      this.textures.remove(KEY_VIGNETTE);
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

  // Destroys the previous room's images and textures.
  private unbake(): void {
    for (const b of this.baked) {
      b.image.destroy();
      this.textures.remove(b.key);
    }
    this.baked = [];
    this.bakedRoom = null;
    this.bakedSim = null;
  }

  // Bakes the room: each parallax band (depth 0 to 3, at zoom) and each chunk of the static geometry (depth 5) into
  // its own DynamicTexture, shown as one Image; and makes the room's dust.
  private bake(room: Room, number: number, sim: Sim): void {
    this.unbake();
    const nn = String(number).padStart(2, '0');
    depthBands(room).forEach((band, b) => {
      const key = `band-${nn}-${b}`;
      if (!this.bakeShapes(key, band.w, band.h, band.shapes)) return;
      const image = this.add.image(0, 0, key).setOrigin(0, 0).setScale(ZOOM).setDepth(b);
      this.baked.push({ key, image, xAt: (camPx) => -Math.round(band.factor * camPx) });
    });
    bakeChunks(room).forEach((chunk, i) => {
      const key = `room-${nn}-${i}`;
      if (!this.bakeShapes(key, chunk.w, chunk.h, roomShapes(room, chunk.col0, chunk.col1))) return;
      const image = this.add.image(chunk.col0 * TILE_PX, 0, key).setOrigin(0, 0).setDepth(DEPTH_CHUNKS);
      this.baked.push({ key, image, xAt: (camPx) => chunk.col0 * TILE_PX - camPx });
    });
    this.levels = [];
    this.field = moteField(room);
    this.bakedRoom = room;
    this.bakedSim = sim;
  }

  // Every frame is playFrame's alone (section 10.6, "The frame"): the scene begins its limiter's frame, sets its
  // images' x from the camera playFrame returns, keeps the levels for the next frame and draws the three lists.
  override update(): void {
    this.limiter.beginFrame();
    const run = this.run;
    const sim = run.sim;
    const room = run.currentRoom();
    const view = run.view();
    this.beat.clear();
    this.creature.clear();
    this.dust.clear();
    if (!sim || !room || !view) return;
    // A new room, or a new run, bakes the room again.
    if (this.bakedRoom !== room || this.bakedSim !== sim) this.bake(room, sim.status().room, sim);
    const f = playFrame({ room, sim, view, track: run.track(), field: this.field, levels: this.levels, limiter: this.limiter });
    for (const b of this.baked) b.image.x = b.xAt(f.camPx);
    this.levels = f.levels;
    drawShapes(this.beat, f.beat);
    drawShapes(this.creature, f.creature);
    drawShapes(this.dust, f.dust);

    if (run.finished() && !this.ended) {
      this.ended = true;
      this.scene.start('ending');
    }
  }
}
