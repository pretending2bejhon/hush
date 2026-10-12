// AU2: the transport (src/audio/scheduler.ts; Vault City's scheduler at 25 ms, HUSH-SPEC section 8): every onset
// of every layer handed over once, at origin + (bar + onset) x BAR, no more than 0.12 s ahead; a note up to
// 0.05 s late shifted to now + 5 ms, an older one dropped and counted; a restart from cycle 0 at a new origin; the
// gauntlet's cycle mapping (bar - startBar from the start bar on); a pattern that throws counted as a voice error.
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';
import { barOnsets, loadStrudel } from '../../tools/strudel-node.mjs';
import { specBlocks } from '../../tools/spec-content.mjs';
import { compileTrack } from '../fixtures/reference/audio.mjs';

const T = await load('HUSH_AUDIO_MODULE', new URL('../../src/audio/scheduler.ts', import.meta.url));
const { scope, transpiler } = await loadStrudel();
const { layers } = compileTrack(specBlocks().get('music/area1.strudel'), { ...scope, transpiler });
const BAR = (60 / 140) * 4;

function expected(origin, from, to, startBar = -1) {
  const out = [];
  for (let b = 0; origin + b * BAR < to; b++) {
    const cycle = startBar >= 0 && b >= startBar ? b - startBar : b;
    layers.forEach((p, i) => {
      for (const o of barOnsets(p, cycle)) {
        const t = origin + (b + o.sixteenth / 16) * BAR;
        if (t >= from && t < to) out.push([i + 1, Math.round(t * 1e6)]);
      }
    });
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function run(origin, until, { startBar = -1, stallFrom = Infinity, stallTo = Infinity } = {}) {
  const notes = [];
  const t = T.createTransport(layers, (n) => notes.push({ ...n, at: now }));
  let now = origin - 0.2;
  t.restart(origin, startBar);
  for (; now < until; now += 0.025) if (now < stallFrom || now >= stallTo) t.tick(now);
  return { t, notes };
}

describe('AU2 transport', () => {
  it('has the constants of section 8', () => {
    expect(T.LOOKAHEAD).toBe(0.12);
    expect(T.LATE).toBe(0.05);
    expect(T.BAR).toBeCloseTo(BAR, 12);
    expect(T.SIXTEENTH).toBeCloseTo(BAR / 16, 12);
  });

  it('hands every onset over once, on time, at most 0.12 s ahead', () => {
    const { t, notes } = run(2, 12);
    const got = notes.map((n) => [n.layer, Math.round(n.time * 1e6)]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const want = expected(2, 2, 12 + 0.12);
    expect(got.length).toBe(want.length);
    expect(got).toEqual(want);
    for (const n of notes) {
      expect(n.time - n.at).toBeLessThanOrEqual(0.12 + 1e-9);
      expect(n.time - n.at).toBeGreaterThanOrEqual(0);
    }
    expect(t.counters()).toEqual({ scheduledVoices: want.length, voiceErrors: 0, lateShifted: 0, lateDropped: 0 });
  });

  it('shifts a note up to 50 ms late and drops one later than that, counting both', () => {
    // Ticks run at 1.8 + 0.025k. The arp onset at 2 + 11 x SIXTEENTH = 3.1786 s is not handed over by the tick at
    // 3.05; resuming at 3.2 finds it 21 ms late (shifted); resuming at 3.4 finds it more than 50 ms late (dropped).
    const shortStall = run(2, 6, { stallFrom: 3.06, stallTo: 3.19 });
    const c1 = shortStall.t.counters();
    expect(c1.lateDropped).toBe(0);
    expect(c1.lateShifted).toBeGreaterThan(0);
    for (const n of shortStall.notes) expect(n.time).toBeGreaterThanOrEqual(n.at);
    const longStall = run(2, 6, { stallFrom: 3.06, stallTo: 3.39 });
    const c2 = longStall.t.counters();
    expect(c2.lateDropped).toBeGreaterThan(0);
    expect(c2.scheduledVoices + c2.lateDropped).toBe(expected(2, 2, 6 + 0.12).length);
  });

  it('restarts from cycle 0 at a new origin', () => {
    const notes = [];
    let now = 0.8;
    const t = T.createTransport(layers, (n) => notes.push(n));
    t.restart(1);
    for (; now < 4; now += 0.025) t.tick(now);
    notes.length = 0;
    t.restart(4.3);
    for (; now < 8; now += 0.025) t.tick(now);
    const got = notes.map((n) => [n.layer, Math.round(n.time * 1e6)]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    expect(got).toEqual(expected(4.3, 4.3, 8 + 0.12));
  });

  it('maps the gauntlet: from the start bar the pattern starts again at cycle 0', () => {
    const { notes } = run(2, 2 + 6 * BAR, { startBar: 1 });
    const got = notes.map((n) => [n.layer, Math.round(n.time * 1e6)]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    expect(got).toEqual(expected(2, 2, 2 + 6 * BAR + 0.12, 1));
    const pad = (bar) => notes.filter((n) => n.layer === 2 && Math.abs(n.time - (2 + bar * BAR)) < 1e-6).map((n) => n.value.note).sort();
    expect(pad(1)).toEqual(pad(0));
    expect(pad(2)).not.toEqual(pad(1));
  });

  it('moves the gauntlet mapping mid-run: from the new start bar the pattern starts again at cycle 0', () => {
    const notes = [];
    const t = T.createTransport(layers, (n) => notes.push(n));
    t.restart(2);
    let now = 1.9;
    for (; now < 2 + 2 * BAR; now += 0.025) t.tick(now);
    t.gauntlet(4);
    for (; now < 2 + 7 * BAR; now += 0.025) t.tick(now);
    const pad = (bar) => notes.filter((n) => n.layer === 2 && Math.abs(n.time - (2 + bar * BAR)) < 1e-6).map((n) => n.value.note).sort();
    expect(pad(4)).toEqual(pad(0));
    expect(pad(5)).toEqual(pad(1));
    expect(pad(3)).not.toEqual(pad(0));
  });

  it('counts a layer that throws as voice errors and keeps the others', () => {
    const bad = { queryArc() { throw new Error('broken layer'); } };
    const notes = [];
    const t = T.createTransport([layers[0], bad], (n) => notes.push(n));
    t.restart(1);
    for (let now = 0.9; now < 3; now += 0.025) t.tick(now);
    expect(t.counters().voiceErrors).toBeGreaterThan(0);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.layer === 1)).toBe(true);
  });
});
