// The oracle (tests/fixtures/oracle/) is the spec's physics and room format in executable form. These
// checks pin it to the spec: the reach table, determinism, save/load, and the room format's refusals.
import { describe, expect, it } from 'vitest';
import * as O from '../fixtures/oracle/index.mjs';
import { measure, openRoomText } from '../../tools/reach.mjs';

describe('oracle', () => {
  it('reproduces the reach table in HUSH-SPEC section 4.2', () => {
    expect(measure(O)).toEqual({
      jumpHeight: 3.442, jumpAirSteps: 156, hopHeight: 0.793, runJumpDistance: 6.703, runJumpHeight: 3.442,
      dashDistance: 4.375, jumpDashDistance: 11.143, upDashHeight: 5.113, jumpUpDashHeight: 8.635,
      runTilesPerSecond: 10.313, waveTilesPerSecond: 9.375, waveSlope: 1, gauntletTilesPerBeat: 4,
    });
  });

  it('is deterministic, and save() then load() restores the whole state', () => {
    const world = O.compileWorld([{ name: '01-open.txt', text: openRoomText() }]);
    const run = () => {
      const sim = O.createSim(world, { room: 1, step: 0, layers: 0, stopAtClear: true });
      for (let i = 0; i < 900; i++) sim.tick(i % 97 < 40 ? 18 : (i % 61 === 0 ? 34 : 2));
      return sim;
    };
    const a = run();
    const b = run();
    expect(a.checksum()).toBe(b.checksum());
    const saved = a.save();
    expect(saved).toHaveLength(O.FIELDS.length);
    const c = O.createSim(world, { room: 1, step: 0, layers: 0, stopAtClear: true });
    c.load(saved);
    expect(c.checksum()).toBe(a.checksum());
    for (let i = 0; i < 50; i++) { a.tick(2); c.tick(2); }
    expect(c.checksum()).toBe(a.checksum());
  });

  it('turns beat entities on by the formula of section 4.4', () => {
    const e = { layer: 3, period: 2, phase: 4, on: 2, rest: true };
    expect(O.entityOn(e, 0, 0)).toBe(true);
    const layers = 1 << 3;
    const states = [];
    for (let s = 0; s < 1440; s += 1) states.push(O.entityOn(e, s, layers));
    // A 2-beat period repeats every 1440 steps; on for 2 of its 8 sixteenths is a quarter of them.
    expect(states.filter(Boolean).length).toBe(360);
    expect(O.entityOn(e, 0, layers)).toBe(false);
    expect(O.entityOn(e, Math.ceil((4 * 180) / 7), layers)).toBe(true);
  });

  it('brings a layer back on the first bar line at least a beat after the clear', () => {
    expect(O.unlockBar(0)).toBe(1);
    expect(O.nextBarStep(0)).toBe(412);
    expect(O.unlockBar(330)).toBe(2);
    expect(O.gauntletStartBeat(0)).toBe(4);
  });

  it('refuses malformed rooms', () => {
    const good = openRoomText('01-open');
    const bad = [
      good.replace('hush-room 1', 'hush-room 2'),
      good.replace('size 96 18', 'size 96 17'),
      good.replace('spawn 4 15', 'spawn 4 16'),
      good.replace('layer 1', 'layer 11'),
      `${good.slice(0, -1)}\r\n`,
      good.replace('grid\n#', 'grid\nQ'),
      good.replace('par 1\n', 'par 1\nentity a block layer 1 period 3 phase 0 on 1 rest on\n'),
    ];
    for (const text of bad) expect(() => O.compileRoom('01-open.txt', text)).toThrow(O.RoomError);
    expect(() => O.compileRoom('01-open.txt', good)).not.toThrow();
  });
});
