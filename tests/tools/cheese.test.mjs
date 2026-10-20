// The owner's ruling N-F3 a (2026-10-19): tools/cheese.mjs on fixture rooms compiled by the oracle. A section crossed
// with its window shut is a cheese: a door a jump clears, a spike field with open air above it, stones over a pit a
// jump and a dash cross. A full-height door, a sealed spike tunnel and a pit wider than any crossing hold. A start that
// is no standing tile, a section no clear reaches, an entity no section names, an entity in a section's columns left
// out of its gates and a role that does not fit its entity are refused; a malformed sections file exits 2.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO, tool } from './fixture-repo.mjs';

const ORACLE = 'tests/fixtures/oracle/index.mjs';
const T = 240000;

// An 18-row grid W wide: solid row 0, col 0 and rows 16 and 17, the right column open (the exit); `paint` writes
// [r0, r1, c0, c1, ch] boxes over it.
function grid(W, paint) {
  const g = Array.from({ length: 18 }, (_, r) => Array.from({ length: W }, (_, c) => (r === 0 || r >= 16 || (c === 0 && r >= 1) ? '#' : '.')));
  for (const [r0, r1, c0, c1, ch] of paint) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch;
  return g.map((row) => row.join(''));
}

function roomText(name, W, entities, paint) {
  return [`hush-room 1`, `name ${name}`, `size ${W} 18`, 'spawn 2 15', `layer ${Number(name.slice(0, 2))}`, 'par 30',
    ...entities.map((e) => `entity ${e}`), 'grid', ...grid(W, paint)].join('\n') + '\n';
}

// A fixture world: an empty room 01, then room 02 (so layer 1 is back and its entities move), and its sections.
function check(W, entities, paint, sections, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-cheese-'));
  fs.mkdirSync(path.join(dir, 'rooms'));
  fs.writeFileSync(path.join(dir, 'rooms', '01-empty.txt'), roomText('01-empty', 32, [], []));
  fs.writeFileSync(path.join(dir, 'rooms', '02-fixture.txt'), roomText('02-fixture', W, entities, paint));
  fs.writeFileSync(path.join(dir, 'sections.json'), typeof sections === 'string' ? sections : JSON.stringify({ format: 'hush-sections-1', rooms: { '02-fixture': sections } }));
  return tool('cheese.mjs', ['--all', '--sim', ORACLE, '--rooms', path.join(dir, 'rooms'), '--sections', path.join(dir, 'sections.json'), ...extra], { cwd: REPO });
}

const DOOR = 'a block layer 1 period 2 phase 0 on 4 rest on';
const SPIKES = 'a spike up layer 1 period 2 phase 0 on 4 rest off';
const sec = (to, gates, from = [2, 15]) => [{ name: 'fixture', from, to, gates }];

describe('cheese.mjs: a window that can be skipped', () => {
  it('flags a door a jump clears: crossed with the wall held shut', () => {
    const r = check(32, [DOOR], [[13, 15, 15, 15, 'a']], sec(18, { a: 'wall' }));
    expect(r.out).toMatch(/02-fixture section 1 \(fixture\): free: clear .*shut \(a wall\): CLEAR in \d+ steps: CHEESE/);
    expect(r.out).toMatch(/cheese: problem: 02-fixture section 1 \(fixture\): crossed with its window shut \(a wall\)/);
    expect(r.code).toBe(1);
  }, T);

  it('flags a spike field with open air above it', () => {
    const r = check(32, [SPIKES], [[15, 15, 14, 16, 'a']], sec(19, { a: 'spike' }));
    expect(r.out).toMatch(/shut \(a spike\): CLEAR in \d+ steps: CHEESE/);
    expect(r.code).toBe(1);
  }, T);

  it('flags stones over a pit a jump and a dash cross without them', () => {
    const r = check(32, [DOOR], [[16, 16, 8, 17, '^'], [15, 15, 12, 13, 'a']], sec(19, { a: 'floor' }));
    expect(r.out).toMatch(/shut \(a floor\): CLEAR in \d+ steps: CHEESE/);
    expect(r.code).toBe(1);
  }, T);
});

describe('cheese.mjs: windows that hold', () => {
  it('passes a full-height door, a sealed spike tunnel and a pit wider than any crossing', () => {
    const door = check(32, [DOOR], [[1, 15, 15, 15, 'a']], sec(18, { a: 'wall' }));
    expect(door.out).toMatch(/shut \(a wall\): none .*: gated/);
    expect(door.out).toMatch(/cheese: PASS, 1 section\(s\) in 1 room\(s\)/);
    expect(door.code).toBe(0);
    const tunnel = check(32, [SPIKES], [[1, 14, 12, 18, '#'], [15, 15, 14, 16, 'a']], sec(20, { a: 'spike' }));
    expect(tunnel.out).toMatch(/shut \(a spike\): none .*: gated/);
    expect(tunnel.code).toBe(0);
    const stones = ['a block layer 1 period 4 phase 15 on 10 rest on', 'b block layer 1 period 4 phase 7 on 10 rest on'];
    const pit = check(48, stones, [[16, 16, 8, 31, '^'], [15, 15, 10, 13, 'a'], [15, 15, 16, 19, 'b'], [15, 15, 22, 25, 'a'], [15, 15, 28, 31, 'b']], sec(33, { a: 'floor', b: 'floor' }));
    expect(pit.out).toMatch(/free: clear .*shut \(a floor, b floor\): none .*: gated/);
    expect(pit.code).toBe(0);
  }, T);
});

describe('cheese.mjs: sections it refuses', () => {
  it('refuses a start that is no standing tile, and a section no clear reaches', () => {
    const start = check(32, [DOOR], [[1, 15, 15, 15, 'a']], sec(18, { a: 'wall' }, [2, 14]));
    expect(start.out).toMatch(/start \(2, 14\) is not an empty tile on a static solid one/);
    expect(start.code).toBe(1);
    const wall = check(32, [DOOR], [[1, 15, 15, 15, 'a'], [1, 15, 20, 20, '#']], sec(25, { a: 'wall', }), ['--nodes', '20000']);
    expect(wall.out).toMatch(/no clear with every entity free .*: the section is broken/);
    expect(wall.code).toBe(1);
  }, T);

  it('refuses an entity no section names, an entity in a section\'s columns left out, and a role that does not fit', () => {
    const two = [DOOR, 'b block layer 1 period 2 phase 4 on 4 rest on'];
    const unnamed = check(40, two, [[1, 15, 15, 15, 'a'], [1, 15, 30, 30, 'b']], sec(18, { a: 'wall' }));
    expect(unnamed.out).toMatch(/02-fixture: entity b is a gate of no section/);
    expect(unnamed.code).toBe(1);
    const inside = check(40, two, [[1, 15, 15, 15, 'a'], [1, 15, 25, 25, 'b']], sec(32, { a: 'wall' }));
    expect(inside.out).toMatch(/entity b has cells in its columns but is none of its gates/);
    expect(inside.code).toBe(1);
    const role = check(32, [SPIKES], [[15, 15, 14, 16, 'a']], sec(19, { a: 'wall' }));
    expect(role.out).toMatch(/gate a is a spike, so its role is spike, not wall/);
    expect(role.code).toBe(1);
  }, T);

  it('exits 2 on a malformed sections file', () => {
    const r = check(32, [DOOR], [[1, 15, 15, 15, 'a']], '{"format":"hush-sections-0","rooms":{}}');
    expect(r.out).toMatch(/format must be "hush-sections-1"/);
    expect(r.code).toBe(2);
  }, T);
});
