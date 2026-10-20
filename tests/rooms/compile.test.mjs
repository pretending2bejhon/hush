// RM1 and RM2: the room compiler and the gauntlet generator (src/rooms) against the oracle's (HUSH-SPEC section
// 5.1 and 6.1): every room block of the spec compiles to the same structure, the gauntlet to the same grid and
// program, and every malformed room is refused. HUSH_ROOMS_MODULE points the tests at another module that
// exports the same functions (the controls).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as O from '../fixtures/oracle/index.mjs';
import { readList, specBlocks } from '../../tools/spec-content.mjs';
import { openRoomText } from '../../tools/reach.mjs';
import crypto from 'node:crypto';

const override = process.env.HUSH_ROOMS_MODULE;
const P = override
  ? await import(pathToFileURL(path.resolve(override)).href)
  : { ...(await import('../../src/rooms/compile.ts')), ...(await import('../../src/rooms/gauntlet.ts')) };
const blocks = specBlocks();
const ROOMS = [...blocks.keys()].filter((k) => /^rooms\/(0[1-9]|10)-/.test(k));

describe('RM1 room compiler', () => {
  it('compiles every room of the spec to the oracle structure', () => {
    expect(ROOMS).toHaveLength(10);
    for (const key of ROOMS) {
      const name = key.slice('rooms/'.length);
      expect(P.compileRoom(name, blocks.get(key))).toEqual(O.compileRoom(name, blocks.get(key)));
    }
    expect(P.CODE).toEqual(O.CODE);
  });

  it('refuses every malformed room the format forbids', () => {
    const good = openRoomText('01-open');
    const bad = [
      good.replace('hush-room 1', 'hush-room 2'),
      good.replace('size 96 18', 'size 96 17'),
      good.replace('size 96 18', 'size 31 18'),
      good.replace('spawn 4 15', 'spawn 4 16'),
      good.replace('spawn 4 15', 'spawn 0 15'),
      good.replace('layer 1', 'layer 11'),
      good.replace('layer 1', 'layer 0'),
      `${good.slice(0, -1)}\r\n`,
      good.slice(0, -1),
      good.replace('grid\n#', 'grid\nQ'),
      good.replace('par 1\n', 'par 1\nentity a block layer 1 period 3 phase 0 on 1 rest on\n'),
      good.replace('par 1\n', 'par 1\nentity a block layer 1 period 2 phase 8 on 1 rest on\n'),
      good.replace('par 1\n', 'par 1\nentity a block layer 1 period 2 phase 0 on 8 rest on\n'),
      good.replace('par 1\n', 'par 1\nentity a spike sideways layer 1 period 2 phase 0 on 1 rest on\n'),
      good.replace('par 1\n', 'par 1\nentity a block layer 1 period 2 phase 0 on 1 rest maybe\n'),
      good.replace('par 1\n', 'par 1\nentity a block layer 1 period 2 phase 0 on 1 rest on\n'),
      good.replace(/\n#\.{95}\n/, '\n'),
    ];
    for (const text of bad) {
      expect(() => O.compileRoom('01-open.txt', text)).toThrow();
      expect(() => P.compileRoom('01-open.txt', text)).toThrow(P.RoomError);
    }
    expect(() => P.compileRoom('01-open.txt', good)).not.toThrow();
  });

  it('compiles the world in file order and refuses a gap', () => {
    const files = [...ROOMS.map((k) => ({ name: k.slice(6), text: blocks.get(k) })), { name: '11-gauntlet.txt', text: blocks.get('rooms/11-gauntlet.txt') }];
    const shuffled = [...files].reverse();
    expect(P.compileWorld(shuffled)).toEqual(O.compileWorld(shuffled));
    expect(() => P.compileWorld(files.filter((f) => !f.name.startsWith('03-')))).toThrow(P.RoomError);
    expect(() => P.compileWorld([...files, { name: 'notes.txt', text: 'x\n' }])).toThrow(P.RoomError);
  });
});

describe('RM2 gauntlet generator', () => {
  const text = blocks.get('rooms/11-gauntlet.txt');
  it('parses the program and generates the oracle grid, byte for byte', () => {
    expect(P.parseGauntlet('11-gauntlet.txt', text)).toEqual(O.parseGauntlet('11-gauntlet.txt', text));
    const g = P.generateGauntlet(P.parseGauntlet('11-gauntlet.txt', text));
    expect(g).toEqual(O.generateGauntlet(O.parseGauntlet('11-gauntlet.txt', text)));
    expect(crypto.createHash('sha256').update(g.text).digest('hex')).toBe(readList().get('rooms/11-gauntlet.grid'));
    expect(P.compileGauntlet('11-gauntlet.txt', text)).toEqual(O.compileGauntlet('11-gauntlet.txt', text));
    expect(P.GAUNTLET).toEqual({ LEAD: 4, TAIL: 28, H: 18, CEIL: 2, FLOOR: 15, SPAWN_COL: 4, LAG: 2, WAVE_HALF: 3 });
  });

  it('refuses a malformed program', () => {
    const bad = [
      text.replace('hush-gauntlet 1', 'hush-gauntlet 2'),
      text.replace('bars 32', 'bars 31'),
      text.replace('bar 5 base', 'bar 6 base'),
      text.replace('bar 16 wave', 'bar 16 wave clap=....x.......x...'),
      text.replace('bar 1 base clap=....x.......x...', 'bar 1 base clap=....x.......x..'),
      text.replace('melody 0 2 4 7', 'melody 0 2 4'),
      text.replace(/bar 31 base kick=x.......x.......\n$/, ''),
    ];
    for (const t of bad) expect(() => P.parseGauntlet('11-gauntlet.txt', t)).toThrow(P.RoomError);
  });
});
