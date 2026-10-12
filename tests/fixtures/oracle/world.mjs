// Oracle room compiler and gauntlet generator: the spec's room format (section Rooms) as executable
// reference. src/rooms must compile every room file to the same structure; tests compare them.
import { C } from './constants.mjs';

export const CODE = Object.freeze({ EMPTY: 0, SOLID: 1, UP: 2, DOWN: 3, LEFT: 4, RIGHT: 5, WAVE: 6, BASE: 7, ENTITY: 8 });
const CHAR_CODE = { '.': 0, '#': 1, '^': 2, v: 3, '<': 4, '>': 5, W: 6, B: 7 };
const PERIODS = new Set([1, 2, 4, 8, 16]);
const DIRS = new Set(['up', 'down', 'left', 'right']);

export class RoomError extends Error {}

function fail(name, msg) {
  throw new RoomError(`${name}: ${msg}`);
}

function int(name, s, what) {
  if (!/^(0|[1-9][0-9]*)$/.test(s)) fail(name, `${what} must be a non-negative integer, got ${JSON.stringify(s)}`);
  return Number(s);
}

// hush-room 1: header lines in a fixed order, then `grid` and exactly H rows of W characters.
export function compileRoom(fileName, text) {
  const name = fileName;
  if (text.includes('\r')) fail(name, 'CR found: room files are LF only');
  if (!text.endsWith('\n')) fail(name, 'the file must end with a newline');
  const lines = text.slice(0, -1).split('\n');
  let i = 0;
  const next = () => (i < lines.length ? lines[i++] : fail(name, 'unexpected end of file'));
  if (next() !== 'hush-room 1') fail(name, 'the first line must be exactly "hush-room 1"');
  const kv = (key) => {
    const line = next();
    const parts = line.split(' ');
    if (parts[0] !== key) fail(name, `expected "${key} ...", got ${JSON.stringify(line)}`);
    return parts.slice(1);
  };
  const [slug, ...extra] = kv('name');
  if (!slug || extra.length || !/^(0[1-9]|10)-[a-z]+(-[a-z]+)*$/.test(slug)) fail(name, 'name must be NN-word[-word], NN 01 to 10');
  const size = kv('size');
  if (size.length !== 2) fail(name, 'size takes W H');
  const W = int(name, size[0], 'W');
  const H = int(name, size[1], 'H');
  if (W < 32 || W > 96 || H !== 18) fail(name, 'size must be W 32 to 96 by H 18');
  const sp = kv('spawn');
  if (sp.length !== 2) fail(name, 'spawn takes col row');
  const spawn = { col: int(name, sp[0], 'spawn col'), row: int(name, sp[1], 'spawn row') };
  const ly = kv('layer');
  if (ly.length !== 1) fail(name, 'layer takes one number');
  const layer = int(name, ly[0], 'layer');
  if (layer < 1 || layer > 10) fail(name, 'layer must be 1 to 10');
  const pr = kv('par');
  if (pr.length !== 1) fail(name, 'par takes seconds');
  const par = int(name, pr[0], 'par');
  const entities = [];
  const byLetter = new Map();
  for (;;) {
    const line = next();
    if (line === 'grid') break;
    const p = line.split(' ');
    if (p[0] !== 'entity') fail(name, `expected "entity ..." or "grid", got ${JSON.stringify(line)}`);
    const letter = p[1];
    if (!/^[a-z]$/.test(letter || '')) fail(name, 'entity letter must be one of a to z');
    if (byLetter.has(letter)) fail(name, `entity ${letter} defined twice`);
    const kind = p[2];
    let k = 3;
    let dir = null;
    if (kind === 'spike') {
      dir = p[k++];
      if (!DIRS.has(dir)) fail(name, `entity ${letter}: spike direction must be up, down, left or right`);
    } else if (kind !== 'block') fail(name, `entity ${letter}: kind must be spike or block`);
    const want = ['layer', 'period', 'phase', 'on', 'rest'];
    const vals = {};
    for (const key of want) {
      if (p[k] !== key) fail(name, `entity ${letter}: expected "${key}" at word ${k + 1}`);
      vals[key] = p[k + 1];
      k += 2;
    }
    if (k !== p.length) fail(name, `entity ${letter}: trailing words`);
    const e = {
      letter, kind, dir,
      layer: int(name, vals.layer, 'entity layer'),
      period: int(name, vals.period, 'period'),
      phase: int(name, vals.phase, 'phase'),
      on: int(name, vals.on, 'on'),
      rest: vals.rest === 'on' ? true : vals.rest === 'off' ? false : fail(name, `entity ${letter}: rest must be on or off`),
      cells: [],
    };
    if (e.layer < 1 || e.layer > 10) fail(name, `entity ${letter}: layer must be 1 to 10`);
    if (!PERIODS.has(e.period)) fail(name, `entity ${letter}: period must be 1, 2, 4, 8 or 16 beats`);
    if (e.phase > 4 * e.period - 1) fail(name, `entity ${letter}: phase must be 0 to ${4 * e.period - 1} sixteenths`);
    if (e.on < 1 || e.on > 4 * e.period - 1) fail(name, `entity ${letter}: on must be 1 to ${4 * e.period - 1} sixteenths`);
    e.index = entities.length;
    entities.push(e);
    byLetter.set(letter, e);
  }
  const rows = lines.slice(i);
  if (rows.length !== H) fail(name, `grid must have ${H} rows, found ${rows.length}`);
  const tiles = new Uint8Array(W * H);
  rows.forEach((row, r) => {
    if (row.length !== W) fail(name, `grid row ${r} must have ${W} characters, found ${row.length}`);
    for (let c = 0; c < W; c++) {
      const ch = row[c];
      if (Object.hasOwn(CHAR_CODE, ch)) tiles[r * W + c] = CHAR_CODE[ch];
      else if (byLetter.has(ch)) {
        const e = byLetter.get(ch);
        tiles[r * W + c] = CODE.ENTITY + e.index;
        e.cells.push([c, r]);
      } else fail(name, `grid row ${r} col ${c}: unknown character ${JSON.stringify(ch)}`);
    }
  });
  for (const e of entities) if (!e.cells.length) fail(name, `entity ${e.letter} is defined but never placed`);
  const at = (c, r) => tiles[r * W + c];
  if (spawn.col >= W || spawn.row >= H - 1) fail(name, 'spawn outside the room');
  if (at(spawn.col, spawn.row) !== CODE.EMPTY) fail(name, 'the spawn tile must be empty');
  if (at(spawn.col, spawn.row + 1) !== CODE.SOLID) fail(name, 'the tile under the spawn must be solid');
  let open = false;
  for (let r = 0; r < H; r++) if (at(W - 1, r) !== CODE.SOLID) open = true;
  if (!open) fail(name, 'the right column needs an opening: the exit');
  return { kind: 'room', name: slug, W, H, spawn, layer, par, tiles, entities };
}

// hush-gauntlet 1: the gauntlet's bar program; the grid is generated from it (section Gauntlet). Each base
// bar names the onsets of the track's kick, clap and hat layers that become obstacles (a 16-character
// mask, one character a sixteenth); each wave bar follows the arp's 16 scale degrees, the melody line.
export const GAUNTLET = Object.freeze({ LEAD: 4, TAIL: 28, H: 18, CEIL: 2, FLOOR: 15, SPAWN_COL: 4, CENTRE: 12 });
const OBSTACLE_LAYERS = ['kick', 'clap', 'hat'];

export function parseGauntlet(fileName, text) {
  const name = fileName;
  if (text.includes('\r')) fail(name, 'CR found: LF only');
  if (!text.endsWith('\n')) fail(name, 'the file must end with a newline');
  const lines = text.slice(0, -1).split('\n');
  if (lines[0] !== 'hush-gauntlet 1') fail(name, 'the first line must be exactly "hush-gauntlet 1"');
  if (lines[1] !== 'name 11-gauntlet') fail(name, 'the second line must be "name 11-gauntlet"');
  if (lines[2] !== 'bars 32') fail(name, 'the third line must be "bars 32"');
  const bars = 32;
  const mp = /^melody((?: (?:0|[1-9][0-9]?)){16})$/.exec(lines[3] || '');
  if (!mp) fail(name, 'the fourth line must be "melody" and 16 scale degrees 0 to 99');
  const melody = mp[1].trim().split(' ').map(Number);
  const program = [];
  for (let k = 4; k < lines.length; k++) {
    const p = lines[k].split(' ');
    if (p[0] !== 'bar' || p[1] !== String(program.length)) fail(name, `line ${k + 1}: expected "bar ${program.length} ..."`);
    const form = p[2];
    if (!['rest', 'base', 'wave'].includes(form)) fail(name, `bar ${p[1]}: form must be rest, base or wave`);
    const masks = {};
    for (const word of p.slice(3)) {
      const m = /^(kick|clap|hat)=([x.]{16})$/.exec(word);
      if (!m || form !== 'base') fail(name, `bar ${p[1]}: ${JSON.stringify(word)} (only base bars carry kick=, clap= or hat= masks of 16 x and .)`);
      if (masks[m[1]]) fail(name, `bar ${p[1]}: ${m[1]} twice`);
      masks[m[1]] = [...m[2]].map((ch, s) => (ch === 'x' ? s : -1)).filter((s) => s >= 0);
    }
    program.push({ form, masks });
  }
  if (program.length !== bars) fail(name, `the program must list bars 0 to ${bars - 1}`);
  return { name: '11-gauntlet', bars, melody, program };
}

// The generator (section Gauntlet): one column per sixteenth, 4 tiles per beat, the creature centred on
// column LEAD + n at gauntlet sixteenth n. Obstacle rules: clap, one floor spike; kick, two floor spikes
// side by side; hat, one spike hanging at row FLOOR - 4. A form change puts a portal column two columns
// before the bar starts. A wave bar is a corridor 5 tiles tall centred on row CENTRE - floor(degree / 2).
export function generateGauntlet(g) {
  const { LEAD, TAIL, H, CEIL, FLOOR, SPAWN_COL, CENTRE } = GAUNTLET;
  const W = LEAD + 16 * g.bars + TAIL;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let c = 0; c < W; c++) {
    for (let r = 0; r < CEIL; r++) grid[r][c] = '#';
    for (let r = FLOOR; r < H; r++) grid[r][c] = '#';
  }
  const col = (bar, s) => LEAD + 16 * bar + s;
  let form = 'base';
  for (let b = 0; b < g.bars; b++) {
    const bar = g.program[b];
    if (bar.form === 'rest') continue;
    if (bar.form === 'wave') {
      for (let s = 0; s < 16; s++) {
        const centre = CENTRE - Math.floor(g.melody[s] / 2);
        const c = col(b, s);
        for (let r = CEIL; r < FLOOR; r++) if (r < centre - 2 || r > centre + 2) grid[r][c] = '#';
      }
    } else {
      for (const layer of OBSTACLE_LAYERS) {
        for (const s of bar.masks[layer] || []) {
          const c = col(b, s);
          if (layer === 'clap') grid[FLOOR - 1][c] = '^';
          else if (layer === 'kick') { grid[FLOOR - 1][c] = '^'; grid[FLOOR - 1][c + 1] = '^'; }
          else grid[FLOOR - 4][c] = 'v';
        }
      }
    }
    if (bar.form !== form) {
      const pc = col(b, 0) - 2;
      for (let r = CEIL; r < FLOOR; r++) grid[r][pc] = bar.form === 'wave' ? 'W' : 'B';
      form = bar.form;
    }
  }
  const text = grid.map((row) => row.join('')).join('\n') + '\n';
  return { W, H, text, spawn: { col: SPAWN_COL, row: FLOOR - 1 } };
}

export function compileGauntlet(fileName, text) {
  const g = parseGauntlet(fileName, text);
  const gen = generateGauntlet(g);
  const tiles = new Uint8Array(gen.W * gen.H);
  const rows = gen.text.slice(0, -1).split('\n');
  rows.forEach((row, r) => { for (let c = 0; c < gen.W; c++) tiles[r * gen.W + c] = CHAR_CODE[row[c]]; });
  return { kind: 'gauntlet', name: g.name, W: gen.W, H: gen.H, spawn: gen.spawn, layer: 0, par: 0, tiles, entities: [], grid: gen.text, program: g };
}

// rooms/01-*.txt to rooms/10-*.txt and rooms/11-gauntlet.txt, sorted by file name.
export function compileWorld(files) {
  const sorted = [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const rooms = [];
  let gauntlet = null;
  for (const f of sorted) {
    if (/^11-gauntlet\.txt$/.test(f.name)) gauntlet = compileGauntlet(f.name, f.text);
    else if (/^(0[1-9]|10)-[a-z-]+\.txt$/.test(f.name)) rooms.push(compileRoom(f.name, f.text));
    else throw new RoomError(`${f.name}: not a room file name`);
  }
  rooms.forEach((r, i) => {
    if (r.name.slice(0, 2) !== String(i + 1).padStart(2, '0')) throw new RoomError(`room ${i + 1} is missing or out of order (found ${r.name})`);
  });
  return { rooms, gauntlet };
}

export { C };
