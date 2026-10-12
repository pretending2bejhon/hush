import * as Phaser from 'phaser';
import { createFlashLimiter } from '../fx/flash-limiter.ts';
import type { Run } from '../game/run.ts';
import { FIELDS } from '../sim/sim.ts';
import type { Room, Sim } from '../sim/types.ts';
import { drawShapes, TILE_PX, ZOOM } from './art.ts';
import type { Shape } from './art.ts';
import { beatShapes, ringShapes } from './beat-art.ts';
import { creatureShapes } from './creature.ts';
import { depthBands, fogShapes, moteField, moteShapes, vignetteShapes } from './depth-art.ts';
import type { Mote } from './depth-art.ts';
import { bakeChunks, cameraPx, roomShapes } from './room-art.ts';

const LAYERS = FIELDS.indexOf('layers');
const VY = FIELDS.indexOf('vy');
const FACING = FIELDS.indexOf('facing');
const FORM = FIELDS.indexOf('form');
const DEAD = FIELDS.indexOf('dead');
const LOCK = FIELDS.indexOf('lock');
const SUB = 256;
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
// on entering a room and shown at the camera. Every frame the beat entities, with the ring of a layer's return, are
// drawn through the scene's flash limiter on one Graphics, the creature on another and the dust on a third, all from
// the reference art's shapes (beat-art.ts, creature.ts, depth-art.ts).
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
    const st = sim.status();
    // A new room, or a new run, bakes the room again.
    if (this.bakedRoom !== room || this.bakedSim !== sim) this.bake(room, st.room, sim);
    const saved = sim.save();
    const ix = view.prevX + (view.x - view.prevX) * view.alpha;
    const iy = view.prevY + (view.y - view.prevY) * view.alpha;
    const centreX = ix / SUB + 5;
    const camPx = cameraPx(room, centreX);
    for (const b of this.baked) b.image.x = b.xAt(camPx);

    const beat = beatShapes(room, sim.step, saved[LAYERS] ?? 0, camPx, this.levels, this.limiter);
    this.levels = beat.levels;
    drawShapes(this.beat, beat.shapes);
    drawShapes(this.beat, ringShapes(run.track(), sim.step, centreX * ZOOM - camPx, (iy / SUB + 5) * ZOOM));

    const creature = {
      step: sim.step,
      x: ix / SUB,
      y: iy / SUB,
      form: saved[FORM] ?? 0,
      vy: saved[VY] ?? 0,
      facing: saved[FACING] ?? 0,
      dead: saved[DEAD] ?? 0,
      lock: saved[LOCK] ?? 0,
    };
    drawShapes(this.creature, creatureShapes(creature, run.track(), camPx));
    drawShapes(this.dust, moteShapes(this.field, sim.step));

    if (run.finished() && !this.ended) {
      this.ended = true;
      this.scene.start('ending');
    }
  }
}
