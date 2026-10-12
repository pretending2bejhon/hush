// AU3 (X7, the audio side): a layer's gate opens on its unlock bar with a 5 ms ramp from 0 to 1, at origin +
// bar x BAR; a restart sets every gate at once to the mask of the layers back.
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';

const G = await load('HUSH_AUDIO_MODULE', new URL('../../src/audio/gates.ts', import.meta.url));
const BAR = (60 / 140) * 4;

function param() {
  const calls = [];
  return { calls, value: 0, setValueAtTime: (v, t) => calls.push(['set', v, t]), linearRampToValueAtTime: (v, t) => calls.push(['ramp', v, t]), cancelScheduledValues: (t) => calls.push(['cancel', t]) };
}

describe('AU3 layer gates', () => {
  it('opens a gate on its bar line with a 5 ms ramp', () => {
    const p = param();
    const t = G.unlockTime(10, 3);
    expect(t).toBeCloseTo(10 + 3 * BAR, 12);
    G.openAt(p, t);
    expect(p.calls).toEqual([['set', 0, t - 0.005], ['ramp', 1, t]]);
  });

  it('sets every gate to the mask of the layers back on a restart', () => {
    const ps = Array.from({ length: 10 }, param);
    G.setMask(ps, 0b0000001010, 7);
    ps.forEach((p, i) => expect(p.calls).toEqual([['cancel', 7], ['set', i === 0 || i === 2 ? 1 : 0, 7]]));
  });
});
