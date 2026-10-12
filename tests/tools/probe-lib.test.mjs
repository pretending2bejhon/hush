// The playthrough's unlock check, its gauntlet half (review R1, MAJOR 1): the predicate over reads of the sim's gBeat
// beside the engine's gauntletBar (tools/probe-lib.mjs gauntletMapProblems). The control page has no gauntlet, so
// this branch of the browser check is controlled here: every way the run or the engine could leave the mapping
// behind fails, and reads that follow every run start pass.
import { describe, expect, it } from 'vitest';
import { gauntletMapProblems } from '../../tools/probe-lib.mjs';

describe('the unlock check\'s gauntlet half', () => {
  it('passes reads that map every run start from gBeat / 4', () => {
    expect(gauntletMapProblems([{ gBeat: 28, bar: 7 }, { gBeat: 28, bar: 7 }, { gBeat: 44, bar: 11 }])).toEqual([]);
  });

  it('fails a mapping left at the restart, one bar late, or not moved by a respawn, and too few run starts', () => {
    expect(gauntletMapProblems([{ gBeat: 28, bar: -1 }, { gBeat: 44, bar: -1 }]).join(' | ')).toMatch(/mapped from bar -1 while its run starts on bar 7/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: undefined }, { gBeat: 44, bar: undefined }]).join(' | ')).toMatch(/mapped from bar undefined while its run starts on bar 7/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: 8 }, { gBeat: 44, bar: 12 }]).join(' | ')).toMatch(/mapped from bar 8 while its run starts on bar 7/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: 7 }, { gBeat: 44, bar: 7 }]).join(' | ')).toMatch(/mapped from bar 7 while its run starts on bar 11/);
    expect(gauntletMapProblems([{ gBeat: 28, bar: 7 }]).join(' | ')).toMatch(/read for 1 run start\(s\), want the entry and a respawn/);
    expect(gauntletMapProblems([])).toHaveLength(1);
  });
});
