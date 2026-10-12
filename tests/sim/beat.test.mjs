// SIM1: the constants, input bits and spike boxes (src/sim/constants.ts) and the beat functions (src/sim/beat.ts)
// equal the oracle's (HUSH-SPEC sections 2 to 4).
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';
import * as O from '../fixtures/oracle/index.mjs';

const K = await load('HUSH_CONSTANTS_MODULE', new URL('../../src/sim/constants.ts', import.meta.url));
const B = await load('HUSH_BEAT_MODULE', new URL('../../src/sim/beat.ts', import.meta.url));

describe('SIM1 constants and beat functions', () => {
  it('has the oracle constants, bits and spike boxes', () => {
    expect({ ...K.C }).toEqual({ ...O.C });
    expect({ ...K.IN }).toEqual({ ...O.IN });
    expect(JSON.parse(JSON.stringify(K.SPIKE_BOX))).toEqual(JSON.parse(JSON.stringify(O.SPIKE_BOX)));
  });

  it('turns entities on and off as the oracle does, at rest while their layer is not back', () => {
    for (const period of [1, 2, 4, 8, 16]) {
      for (let phase = 0; phase < 4 * period; phase += Math.max(1, period)) {
        for (const on of [1, 2 * period, 4 * period - 1]) {
          for (const rest of [true, false]) {
            const e = { layer: 3, period, phase, on, rest };
            for (const layers of [0, 1 << 3, 0x7fe]) {
              for (let step = 0; step < 720 * period; step += 13) expect(B.entityOn(e, step, layers)).toBe(O.entityOn(e, step, layers));
            }
          }
        }
      }
    }
  });

  it('finds the bar lines as the oracle does', () => {
    for (let s = 0; s < 30000; s += 11) {
      expect(B.unlockBar(s)).toBe(O.unlockBar(s));
      expect(B.nextBarStep(s)).toBe(O.nextBarStep(s));
      expect(B.gauntletStartBeat(s)).toBe(O.gauntletStartBeat(s));
    }
  });
});
