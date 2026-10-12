import * as Phaser from 'phaser';
import type { Run } from '../game/run.ts';
import { CODE } from '../rooms/codes.ts';
import { entityOn } from '../sim/beat.ts';
import { SPIKE_BOX } from '../sim/constants.ts';
import { FIELDS } from '../sim/sim.ts';

const LAYERS = FIELDS.indexOf('layers');
const ZOOM = 2.5;
const TILE = 16;
const SUB = 256;
const VIEW_W = 512;
const GAUNTLET_LEAD = 160;
const DIRS = [null, null, 'up', 'down', 'left', 'right'] as const;

// The play scene (spec section 10.1), plain on purpose: every frame the visible tiles, spikes, beat entities, portals and the
// creature are drawn straight from the run. The world view is 32 by 18 tiles at zoom 2.5; a wider room scrolls horizontally.
// When the run finishes it hands over to the scene `ending`.
export class PlayScene extends Phaser.Scene {
  private run: Run;
  private g!: Phaser.GameObjects.Graphics;
  private ended = false;

  constructor(run: Run) {
    super('play');
    this.run = run;
  }

  create(): void {
    this.g = this.add.graphics();
    this.ended = false;
  }

  override update(): void {
    const g = this.g;
    const run = this.run;
    const sim = run.sim;
    const room = run.currentRoom();
    const view = run.view();
    g.clear();
    if (!sim || !room || !view) return;
    const st = sim.status();
    const layers = sim.save()[LAYERS] ?? 0;
    const ix = view.prevX + (view.x - view.prevX) * view.alpha;
    const iy = view.prevY + (view.y - view.prevY) * view.alpha;
    const cx = ix / SUB + 5;
    const lead = room.kind === 'gauntlet' ? GAUNTLET_LEAD : VIEW_W / 2;
    const camX = Math.min(Math.max(cx - lead, 0), Math.max(room.W * TILE - VIEW_W, 0));
    const tile = TILE * ZOOM;
    const first = Math.max(Math.floor(camX / TILE) - 1, 0);
    const last = Math.min(first + VIEW_W / TILE + 2, room.W - 1);

    for (let c = first; c <= last; c++) {
      for (let r = 0; r < room.H; r++) {
        const code = room.tiles[r * room.W + c] ?? CODE.EMPTY;
        const x = (c * TILE - camX) * ZOOM;
        const y = r * tile;
        if (code === CODE.SOLID) {
          g.fillStyle(0x161b28, 1);
          g.fillRect(x, y, tile, tile);
        } else if (code >= CODE.UP && code <= CODE.RIGHT) {
          const box = SPIKE_BOX[DIRS[code] as 'up' | 'down' | 'left' | 'right'];
          g.fillStyle(0x4a556e, 1);
          g.fillRect(x + (box[0] / SUB) * ZOOM, y + (box[1] / SUB) * ZOOM, ((box[2] - box[0]) / SUB) * ZOOM, ((box[3] - box[1]) / SUB) * ZOOM);
        } else if (code === CODE.WAVE || code === CODE.BASE) {
          g.lineStyle(2, 0x7fd6ff, 1);
          g.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
        }
      }
    }

    g.fillStyle(0x7fd6ff, 1);
    for (const e of room.entities) {
      if (!entityOn(e, sim.step, layers)) continue;
      for (const [c, r] of e.cells) {
        if (c < first || c > last) continue;
        const x = (c * TILE - camX) * ZOOM;
        const y = r * tile;
        if (e.kind === 'spike' && e.dir) {
          const box = SPIKE_BOX[e.dir];
          g.fillRect(x + (box[0] / SUB) * ZOOM, y + (box[1] / SUB) * ZOOM, ((box[2] - box[0]) / SUB) * ZOOM, ((box[3] - box[1]) / SUB) * ZOOM);
        } else {
          g.fillRect(x, y, tile, tile);
        }
      }
    }

    if (!st.dead) {
      g.fillStyle(0xe8ecf4, 1);
      g.fillRect((ix / SUB - camX) * ZOOM, (iy / SUB) * ZOOM, 10 * ZOOM, 10 * ZOOM);
    }

    if (run.finished() && !this.ended) {
      this.ended = true;
      this.scene.start('ending');
    }
  }
}
