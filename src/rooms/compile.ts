// hush-room 1: the room compiler (spec section 5.1), ported from tests/fixtures/oracle/world.mjs. Every refusal
// throws RoomError.
import type { Dir, Entity, Room, World } from '../sim/types.ts';
import { CHAR_CODE, CODE, fail, RoomError } from './codes.ts';
import { compileGauntlet } from './gauntlet.ts';

export { CODE, RoomError } from './codes.ts';

const PERIODS = new Set([1, 2, 4, 8, 16]);
const DIRS = new Set<string>(['up', 'down', 'left', 'right']);

function int(name: string, s: string | undefined, what: string): number {
  if (s === undefined || !/^(0|[1-9][0-9]*)$/.test(s)) fail(name, `${what} must be a non-negative integer, got ${JSON.stringify(s)}`);
  return Number(s);
}

// hush-room 1: header lines in a fixed order, then `grid` and exactly H rows of W characters.
export function compileRoom(fileName: string, text: string): Room {
  const name = fileName;
  if (text.includes('\r')) fail(name, 'CR found: room files are LF only');
  if (!text.endsWith('\n')) fail(name, 'the file must end with a newline');
  const lines = text.slice(0, -1).split('\n');
  let i = 0;
  const next = (): string => {
    const line = lines[i];
    if (line === undefined) fail(name, 'unexpected end of file');
    i += 1;
    return line;
  };
  if (next() !== 'hush-room 1') fail(name, 'the first line must be exactly "hush-room 1"');
  const kv = (key: string): string[] => {
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
  const entities: Entity[] = [];
  const byLetter = new Map<string, Entity>();
  for (;;) {
    const line = next();
    if (line === 'grid') break;
    const p = line.split(' ');
    if (p[0] !== 'entity') fail(name, `expected "entity ..." or "grid", got ${JSON.stringify(line)}`);
    const letter = p[1];
    if (letter === undefined || !/^[a-z]$/.test(letter)) fail(name, 'entity letter must be one of a to z');
    if (byLetter.has(letter)) fail(name, `entity ${letter} defined twice`);
    const kind = p[2];
    let k = 3;
    let dir: Dir | null = null;
    if (kind === 'spike') {
      const d = p[k++];
      if (d === undefined || !DIRS.has(d)) fail(name, `entity ${letter}: spike direction must be up, down, left or right`);
      dir = d as Dir;
    } else if (kind !== 'block') fail(name, `entity ${letter}: kind must be spike or block`);
    const vals: Record<string, string | undefined> = {};
    for (const key of ['layer', 'period', 'phase', 'on', 'rest']) {
      if (p[k] !== key) fail(name, `entity ${letter}: expected "${key}" at word ${k + 1}`);
      vals[key] = p[k + 1];
      k += 2;
    }
    if (k !== p.length) fail(name, `entity ${letter}: trailing words`);
    const e: Entity = {
      letter, kind, dir,
      layer: int(name, vals.layer, 'entity layer'),
      period: int(name, vals.period, 'period'),
      phase: int(name, vals.phase, 'phase'),
      on: int(name, vals.on, 'on'),
      rest: vals.rest === 'on' ? true : vals.rest === 'off' ? false : fail(name, `entity ${letter}: rest must be on or off`),
      cells: [],
      index: entities.length,
    };
    if (e.layer < 1 || e.layer > 10) fail(name, `entity ${letter}: layer must be 1 to 10`);
    if (!PERIODS.has(e.period)) fail(name, `entity ${letter}: period must be 1, 2, 4, 8 or 16 beats`);
    if (e.phase > 4 * e.period - 1) fail(name, `entity ${letter}: phase must be 0 to ${4 * e.period - 1} sixteenths`);
    if (e.on < 1 || e.on > 4 * e.period - 1) fail(name, `entity ${letter}: on must be 1 to ${4 * e.period - 1} sixteenths`);
    entities.push(e);
    byLetter.set(letter, e);
  }
  const rows = lines.slice(i);
  if (rows.length !== H) fail(name, `grid must have ${H} rows, found ${rows.length}`);
  const tiles = new Uint8Array(W * H);
  rows.forEach((row, r) => {
    if (row.length !== W) fail(name, `grid row ${r} must have ${W} characters, found ${row.length}`);
    for (let c = 0; c < W; c++) {
      const ch = row.charAt(c);
      const code = Object.hasOwn(CHAR_CODE, ch) ? CHAR_CODE[ch] : undefined;
      const e = byLetter.get(ch);
      if (code !== undefined) tiles[r * W + c] = code;
      else if (e) {
        tiles[r * W + c] = CODE.ENTITY + e.index;
        e.cells.push([c, r]);
      } else fail(name, `grid row ${r} col ${c}: unknown character ${JSON.stringify(ch)}`);
    }
  });
  for (const e of entities) if (!e.cells.length) fail(name, `entity ${e.letter} is defined but never placed`);
  const at = (c: number, r: number): number => tiles[r * W + c] ?? CODE.EMPTY;
  if (spawn.col >= W || spawn.row >= H - 1) fail(name, 'spawn outside the room');
  if (at(spawn.col, spawn.row) !== CODE.EMPTY) fail(name, 'the spawn tile must be empty');
  if (at(spawn.col, spawn.row + 1) !== CODE.SOLID) fail(name, 'the tile under the spawn must be solid');
  let open = false;
  for (let r = 0; r < H; r++) if (at(W - 1, r) !== CODE.SOLID) open = true;
  if (!open) fail(name, 'the right column needs an opening: the exit');
  return { kind: 'room', name: slug, W, H, spawn, layer, par, tiles, entities };
}

// rooms/01-*.txt to rooms/10-*.txt and rooms/11-gauntlet.txt, sorted by file name.
export function compileWorld(files: { name: string; text: string }[]): World {
  const sorted = [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const rooms: Room[] = [];
  let gauntlet: World['gauntlet'] = null;
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
