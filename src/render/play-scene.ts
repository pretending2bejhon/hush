import * as Phaser from 'phaser';
import type { Run } from '../game/run.ts';
import { entityOn } from '../sim/beat.ts';
import { SPIKE_BOX } from '../sim/constants.ts';
import { FIELDS } from '../sim/sim.ts';
import type { Room, Sim } from '../sim/types.ts';
import { drawShapes, TILE_PX, VIEW_W, ZOOM } from './art.ts';
import { creatureShapes } from './creature.ts';
import { bakeChunks, cameraPx, roomShapes } from './room-art.ts';

const LAYERS = FIELDS.indexOf('layers');
const VY = FIELDS.indexOf('vy');
const FACING = FIELDS.indexOf('facing');
const FORM = FIELDS.indexOf('form');
const DEAD = FIELDS.indexOf('dead');
const LOCK = FIELDS.indexOf('lock');
const SUB = 256;
const TILE = 16;
// The room's baked chunks sit at depth 5, the plain beat entities at depth 6 (until RN3), the creature at depth 7.
const DEPTH_CHUNKS = 5;
const DEPTH_PLAIN = 6;
const DEPTH_CREATURE = 7;

interface Chunk {
  key: string;
  col0: number;
  image: Phaser.GameObjects.Image;
}

// The play scene (spec sections 10.1 and 10.6). The room's static geometry is baked once on entering a room into
// DynamicTextures, one per chunk of 128 columns, and shown at the camera. The creature is drawn every frame from the
// reference art's shapes (creature.ts) on its own Graphics; the beat entities are still plain, drawn straight from the
// run on one Graphics, until RN3 replaces them.
// The world view is 32 by 18 tiles at zoom 2.5; a wider room scrolls horizontally.
// When the run finishes it hands over to the scene `ending`.
export class PlayScene extends Phaser.Scene {
  private run: Run;
  private g!: Phaser.GameObjects.Graphics;
  private creature!: Phaser.GameObjects.Graphics;
  private ended = false;
  private bakedRoom: Room | null = null;
  private bakedSim: Sim | null = null;
  private chunks: Chunk[] = [];

  constructor(run: Run) {
    super('play');
    this.run = run;
  }

  create(): void {
    this.g = this.add.graphics().setDepth(DEPTH_PLAIN);
    this.creature = this.add.graphics().setDepth(DEPTH_CREATURE);
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
    this.bakedRoom = room;
    this.bakedSim = sim;
  }

  override update(): void {
    const g = this.g;
    const run = this.run;
    const sim = run.sim;
    const room = run.currentRoom();
    const view = run.view();
    g.clear();
    this.creature.clear();
    if (!sim || !room || !view) return;
    const st = sim.status();
    // A new room, or a new run, bakes the room again.
    if (this.bakedRoom !== room || this.bakedSim !== sim) this.bake(room, st.room, sim);
    const saved = sim.save();
    const layers = saved[LAYERS] ?? 0;
    const ix = view.prevX + (view.x - view.prevX) * view.alpha;
    const iy = view.prevY + (view.y - view.prevY) * view.alpha;
    const camPx = cameraPx(room, ix / SUB + 5);
    for (const c of this.chunks) c.image.x = c.col0 * TILE_PX - camPx;
    const first = Math.max(Math.floor(camPx / TILE_PX) - 1, 0);
    const last = Math.min(first + VIEW_W / TILE + 2, room.W - 1);

    g.fillStyle(0x7fd6ff, 1);
    for (const e of room.entities) {
      if (!entityOn(e, sim.step, layers)) continue;
      for (const [c, r] of e.cells) {
        if (c < first || c > last) continue;
        const x = c * TILE_PX - camPx;
        const y = r * TILE_PX;
        if (e.kind === 'spike' && e.dir) {
          const box = SPIKE_BOX[e.dir];
          g.fillRect(x + (box[0] / SUB) * ZOOM, y + (box[1] / SUB) * ZOOM, ((box[2] - box[0]) / SUB) * ZOOM, ((box[3] - box[1]) / SUB) * ZOOM);
        } else {
          g.fillRect(x, y, TILE_PX, TILE_PX);
        }
      }
    }

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
