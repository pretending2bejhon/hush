// hush-gauntlet 1: the gauntlet's bar program and the grid generated from it (spec section 6.1), ported from
// tests/fixtures/oracle/world.mjs. Each base bar names the onsets of the track's kick, clap and hat layers that
// become obstacles (a 16-character mask, one character a sixteenth); each wave bar follows the arp's 16 scale
// degrees, the melody line.
import type { Room } from '../sim/types.ts';
import { CHAR_CODE, fail } from './codes.ts';

export interface Gauntlet {
  name: string;
  bars: number;
  melody: number[];
  program: { form: 'rest' | 'base' | 'wave'; masks: { kick?: number[]; clap?: number[]; hat?: number[] } }[];
}

export const GAUNTLET = Object.freeze({ LEAD: 4, TAIL: 28, H: 18, CEIL: 2, FLOOR: 15, SPAWN_COL: 4, CENTRE: 12 } as const);

type Bar = Gauntlet['program'][number];
type ObstacleLayer = 'kick' | 'clap' | 'hat';
const OBSTACLE_LAYERS: readonly ObstacleLayer[] = ['kick', 'clap', 'hat'];

export function parseGauntlet(fileName: string, text: string): Gauntlet {
  const name = fileName;
  if (text.includes('\r')) fail(name, 'CR found: LF only');
  if (!text.endsWith('\n')) fail(name, 'the file must end with a newline');
  const lines = text.slice(0, -1).split('\n');
  if (lines[0] !== 'hush-gauntlet 1') fail(name, 'the first line must be exactly "hush-gauntlet 1"');
  if (lines[1] !== 'name 11-gauntlet') fail(name, 'the second line must be "name 11-gauntlet"');
  if (lines[2] !== 'bars 32') fail(name, 'the third line must be "bars 32"');
  const bars = 32;
  const mp = /^melody((?: (?:0|[1-9][0-9]?)){16})$/.exec(lines[3] ?? '');
  if (!mp) fail(name, 'the fourth line must be "melody" and 16 scale degrees 0 to 99');
  const melody = (mp[1] ?? '').trim().split(' ').map(Number);
  const program: Bar[] = [];
  for (let k = 4; k < lines.length; k++) {
    const p = (lines[k] ?? '').split(' ');
    if (p[0] !== 'bar' || p[1] !== String(program.length)) fail(name, `line ${k + 1}: expected "bar ${program.length} ..."`);
    const form = p[2];
    if (form !== 'rest' && form !== 'base' && form !== 'wave') fail(name, `bar ${p[1]}: form must be rest, base or wave`);
    const masks: Bar['masks'] = {};
    for (const word of p.slice(3)) {
      const m = /^(kick|clap|hat)=([x.]{16})$/.exec(word);
      if (!m || form !== 'base') fail(name, `bar ${p[1]}: ${JSON.stringify(word)} (only base bars carry kick=, clap= or hat= masks of 16 x and .)`);
      const layer = m[1] as ObstacleLayer;
      if (masks[layer]) fail(name, `bar ${p[1]}: ${layer} twice`);
      masks[layer] = [...(m[2] ?? '')].map((ch, s) => (ch === 'x' ? s : -1)).filter((s) => s >= 0);
    }
    program.push({ form, masks });
  }
  if (program.length !== bars) fail(name, `the program must list bars 0 to ${bars - 1}`);
  return { name: '11-gauntlet', bars, melody, program };
}

// The generator (spec section 6.1): one column per sixteenth, 4 tiles per beat, the creature centred on
// column LEAD + n at gauntlet sixteenth n. Obstacle rules: clap, one floor spike; kick, two floor spikes
// side by side; hat, one spike hanging at row FLOOR - 4. A form change puts a portal column two columns
// before the bar starts. A wave bar is a corridor 5 tiles tall centred on row CENTRE - floor(degree / 2).
export function generateGauntlet(g: Gauntlet): { W: number; H: number; text: string; spawn: { col: number; row: number } } {
  const { LEAD, TAIL, H, CEIL, FLOOR, SPAWN_COL, CENTRE } = GAUNTLET;
  const W = LEAD + 16 * g.bars + TAIL;
  // Row-major, one character per tile.
  const grid: string[] = Array<string>(W * H).fill('.');
  for (let c = 0; c < W; c++) {
    for (let r = 0; r < CEIL; r++) grid[r * W + c] = '#';
    for (let r = FLOOR; r < H; r++) grid[r * W + c] = '#';
  }
  const col = (bar: number, s: number): number => LEAD + 16 * bar + s;
  let form: Bar['form'] = 'base';
  for (let b = 0; b < g.bars; b++) {
    const bar = g.program[b];
    if (!bar || bar.form === 'rest') continue;
    if (bar.form === 'wave') {
      for (let s = 0; s < 16; s++) {
        const centre = CENTRE - Math.floor((g.melody[s] ?? 0) / 2);
        const c = col(b, s);
        for (let r = CEIL; r < FLOOR; r++) if (r < centre - 2 || r > centre + 2) grid[r * W + c] = '#';
      }
    } else {
      for (const layer of OBSTACLE_LAYERS) {
        for (const s of bar.masks[layer] ?? []) {
          const c = col(b, s);
          if (layer === 'clap') grid[(FLOOR - 1) * W + c] = '^';
          else if (layer === 'kick') { grid[(FLOOR - 1) * W + c] = '^'; grid[(FLOOR - 1) * W + c + 1] = '^'; }
          else grid[(FLOOR - 4) * W + c] = 'v';
        }
      }
    }
    if (bar.form !== form) {
      const pc = col(b, 0) - 2;
      for (let r = CEIL; r < FLOOR; r++) grid[r * W + pc] = bar.form === 'wave' ? 'W' : 'B';
      form = bar.form;
    }
  }
  let text = '';
  for (let r = 0; r < H; r++) text += `${grid.slice(r * W, (r + 1) * W).join('')}\n`;
  return { W, H, text, spawn: { col: SPAWN_COL, row: FLOOR - 1 } };
}

export function compileGauntlet(fileName: string, text: string): Room & { grid: string; program: Gauntlet } {
  const g = parseGauntlet(fileName, text);
  const gen = generateGauntlet(g);
  const tiles = new Uint8Array(gen.W * gen.H);
  const rows = gen.text.slice(0, -1).split('\n');
  rows.forEach((row, r) => {
    for (let c = 0; c < gen.W; c++) tiles[r * gen.W + c] = CHAR_CODE[row.charAt(c)] ?? 0;
  });
  return { kind: 'gauntlet', name: g.name, W: gen.W, H: gen.H, spawn: gen.spawn, layer: 0, par: 0, tiles, entities: [], grid: gen.text, program: g };
}
