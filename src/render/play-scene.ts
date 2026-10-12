import * as Phaser from 'phaser';
import { createFlashLimiter } from '../fx/flash-limiter.ts';
import type { Run } from '../game/run.ts';
import { FIELDS } from '../sim/sim.ts';
import type { Room, Sim } from '../sim/types.ts';
import { drawShapes, TILE_PX, ZOOM } from './art.ts';
import { beatShapes, ringShapes } from './beat-art.ts';
import { creatureShapes } from './creature.ts';
import { bakeChunks, cameraPx, roomShapes } from './room-art.ts';

const LAYERS = FIELDS.indexOf('layers');
const VY = FIELDS.indexOf('vy');
const FACING = FIELDS.indexOf('facing');
const FORM = FIELDS.indexOf('form');
const DEAD = FIELDS.indexOf('dead');
const LOCK = FIELDS.indexOf('lock');
const SUB = 256;
// The room's baked chunks sit at depth 5, the beat entities and the layer's ring at depth 6, the creature at depth 7.
const DEPTH_CHUNKS = 5;
const DEPTH_BEAT = 6;
const DEPTH_CREATURE = 7;

interface Chunk {
  key: string;
  col0: number;
  image: Phaser.GameObjects.Image;
}

// The play scene (spec sections 10.1 and 10.6). The room's static geometry is baked once on entering a room into
// DynamicTextures, one per chunk of 128 columns, and shown at the camera. Every frame the beat entities, with the
// ring of a layer's return, are drawn through the scene's flash limiter on one Graphics, and the creature on another,
// both from the reference art's shapes (beat-art.ts, creature.ts).
// The world view is 32 by 18 tiles at zoom 2.5; a wider room scrolls horizontally.
// When the run finishes it hands over to the scene `ending`.
export class PlayScene extends Phaser.Scene {
  private run: Run;
  private beat!: Phaser.GameObjects.Graphics;
  private creature!: Phaser.GameObjects.Graphics;
  private limiter = createFlashLimiter(1280, 720);
  private levels: number[] = [];
  private ended = false;
  private bakedRoom: Room | null = null;
  private bakedSim: Sim | null = null;
  private chunks: Chunk[] = [];

  constructor(run: Run) {
    super('play');
    this.run = run;
  }

  create(): void {
    this.beat = this.add.graphics().setDepth(DEPTH_BEAT);
    this.creature = this.add.graphics().setDepth(DEPTH_CREATURE);
    this.limiter = createFlashLimiter(1280, 720);
    this.levels = [];
    this.ended = false;
    this.bakedRoom = null;
    this.bakedSim = null;
    this.chunks = [];
    this.events.once('shutdown', () => this.unbake());
  }

  // Destroys the previous room's images and textures.
  private unbake(): void {
    for (const c of this.chunks) {
      c.image.destroy();
      this.textures.remove(c.key);
    }
    this.chunks = [];
    this.bakedRoom = null;
    this.bakedSim = null;
  }

  // Bakes each chunk of the room into its own DynamicTexture and shows it as one Image at depth 5.
  private bake(room: Room, number: number, sim: Sim): void {
    this.unbake();
    const nn = String(number).padStart(2, '0');
    bakeChunks(room).forEach((chunk, i) => {
      const key = `room-${nn}-${i}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      const texture = this.textures.addDynamicTexture(key, chunk.w, chunk.h);
      if (!texture) return;
      const graphics = this.make.graphics({}, false);
      drawShapes(graphics, roomShapes(room, chunk.col0, chunk.col1));
      texture.draw(graphics);
      texture.render();
      graphics.destroy();
      const image = this.add.image(chunk.col0 * TILE_PX, 0, key).setOrigin(0, 0).setDepth(DEPTH_CHUNKS);
      this.chunks.push({ key, col0: chunk.col0, image });
    });
    this.levels = [];
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
    if (!sim || !room || !view) return;
    const st = sim.status();
    // A new room, or a new run, bakes the room again.
    if (this.bakedRoom !== room || this.bakedSim !== sim) this.bake(room, st.room, sim);
    const saved = sim.save();
    const ix = view.prevX + (view.x - view.prevX) * view.alpha;
    const iy = view.prevY + (view.y - view.prevY) * view.alpha;
    const centreX = ix / SUB + 5;
    const camPx = cameraPx(room, centreX);
    for (const c of this.chunks) c.image.x = c.col0 * TILE_PX - camPx;

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

    if (run.finished() && !this.ended) {
      this.ended = true;
      this.scene.start('ending');
    }
  }
}
