// The av probe's start check (review R4, MAJOR 1; tools/probe-av.mjs judgeStarts) on synthetic starts: every voice start
// on an onset of its own layer in the run that handed it over, within -1 to +6 ms, or the transport's late shift of one,
// and every onset past the first 0.3 s of its run given a voice start of its layer. The browser side is controlled in
// tests/controls/av-probe.test.mjs (the control page with ?av=late and ?av=swap).
import { describe, expect, it } from 'vitest';
import { judgeStarts, layerOnsets, START_SETTLE_S } from '../../tools/probe-av.mjs';

const BAR = (60 / 140) * 4;

// A layer with onsets at the given fractions of every cycle; with `odd`, other fractions on odd cycles.
const layer = (fractions, odd = null) => ({
  queryArc: (b, e) => (odd && b % 2 === 1 ? odd : fractions).map((f) => ({ hasOnset: () => true, whole: { begin: b + f } })).filter((h) => h.whole.begin < e),
});
const QUARTERS = layer([0, 0.25, 0.5, 0.75]);
const EIGHTHS = layer([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
const LAYERS = [QUARTERS, EIGHTHS];

// The starts a clean page records for one run: each onset of each layer as a voice start of that layer, handed over
// 0.11 s ahead, two for layer 1 (an oscillator and a noise, as the kick), beside a timer that is no voice.
function startsOf(seg, layers = LAYERS, { shiftMs = 0, gateOf = (k) => k } = {}) {
  const out = [];
  layerOnsets(layers, seg.origin, seg.end + 0.1, seg.startBar ?? -1).forEach((ts, i) => {
    for (const t of ts) {
      const when = t + shiftMs / 1000;
      const base = { when, at: t - 0.11, origin: seg.origin, layer: gateOf(i + 1) };
      out.push({ type: 'OscillatorNode', ...base });
      if (i === 0) out.push({ type: 'AudioBufferSourceNode', ...base });
      out.push({ type: 'ConstantSourceNode', when: t - 0.11, at: t - 0.11, origin: seg.origin, layer: -1 });
    }
  });
  return out;
}

const SEG = { room: 2, origin: 10, end: 10 + 3 * BAR, startBar: -1 };
const text = (r) => r.problems.join(' | ');

describe('the av probe\'s starts (review R4, MAJOR 1)', () => {
  it('walks each layer\'s onsets as countOnsets does, the gauntlet\'s mapping included', () => {
    const [q, e] = layerOnsets(LAYERS, 10, 10 + BAR);
    expect(q.map((t) => +(t - 10).toFixed(6))).toEqual([0, 0.25, 0.5, 0.75].map((f) => +(f * BAR).toFixed(6)));
    expect(e).toHaveLength(8);
    const alt = layer([0], [0.5]);
    expect(layerOnsets([alt], 0, 3 * BAR)[0].map((t) => +(t / BAR).toFixed(6))).toEqual([0, 1.5, 2]);
    expect(layerOnsets([alt], 0, 3 * BAR, 1)[0].map((t) => +(t / BAR).toFixed(6))).toEqual([0, 1, 2.5]);
  });

  it('passes a clean run and counts what it judged', () => {
    const r = judgeStarts(startsOf(SEG), [SEG], LAYERS);
    expect(r.problems).toEqual([]);
    expect(r.off).toBe(0);
    expect(r.covered).toBe(r.onsets);
    expect(r.onsets).toBeGreaterThan(30);
  });

  it('allows -1 to +6 ms and fails beyond, and fails every note handed over 0.1 s late (the reviewer\'s mutant)', () => {
    expect(judgeStarts(startsOf(SEG, LAYERS, { shiftMs: 5.9 }), [SEG], LAYERS).problems).toEqual([]);
    expect(judgeStarts(startsOf(SEG, LAYERS, { shiftMs: -0.9 }), [SEG], LAYERS).problems).toEqual([]);
    expect(text(judgeStarts(startsOf(SEG, LAYERS, { shiftMs: 6.5 }), [SEG], LAYERS))).toMatch(/off their layer's onsets \(want -1 to \+6 ms\), the first in room 2: layer 1 at \+6\.5 ms from its nearest onset/);
    expect(text(judgeStarts(startsOf(SEG, LAYERS, { shiftMs: -1.5 }), [SEG], LAYERS))).toMatch(/layer 1 at -1\.5 ms/);
    const late = text(judgeStarts(startsOf(SEG, LAYERS, { shiftMs: 100 }), [SEG], LAYERS));
    expect(late).toMatch(/starts: \d+ of \d+ voice start\(s\) off their layer's onsets/);
    expect(late).toMatch(/onset\(s\) without a voice start of their layer/);
  });

  it('fails two layers played through each other\'s gate', () => {
    const swapped = startsOf(SEG, LAYERS, { gateOf: (k) => (k === 1 ? 2 : 1) });
    const r = text(judgeStarts(swapped, [SEG], LAYERS));
    expect(r).toMatch(/off their layer's onsets.*layer 1 at/);
    expect(r).toMatch(/without a voice start of their layer, the first: layer 2/);
  });

  it('wants every onset past the run\'s first 0.3 s started, and none of the first 0.3 s', () => {
    const t = layerOnsets(LAYERS, SEG.origin, SEG.end)[0][5];
    const missing = startsOf(SEG).filter((s) => !(s.layer === 1 && Math.abs(s.when - t) < 1e-9));
    expect(text(judgeStarts(missing, [SEG], LAYERS))).toMatch(new RegExp(`starts: 1 of \\d+ onset\\(s\\) without a voice start of their layer, the first: layer 1 ${(t - SEG.origin).toFixed(3)} s into room 2`));
    const early = startsOf(SEG).filter((s) => !(s.when < SEG.origin + START_SETTLE_S - 0.001));
    expect(judgeStarts(early, [SEG], LAYERS).problems).toEqual([]);
    // A start that cannot sound (layer -1) is no voice of its layer.
    const mute = startsOf(SEG).map((s) => (s.layer === 1 && Math.abs(s.when - t) < 1e-9 ? { ...s, layer: -1 } : s));
    const m = judgeStarts(mute, [SEG], LAYERS);
    expect(m.silent).toBe(2);
    expect(text(m)).toMatch(/1 of \d+ onset\(s\) without a voice start/);
  });

  it('holds each start to the run whose origin it was handed over under, past that run\'s end by its lookahead', () => {
    const next = { room: 3, origin: SEG.end + 0.25, end: SEG.end + 0.25 + 2 * BAR, startBar: -1 };
    const both = [...startsOf(SEG), ...startsOf(next)];
    expect(judgeStarts(both, [SEG, next], LAYERS).problems).toEqual([]);
    // Every start of the second run filed under the first run's origin: off the first run's onsets.
    const misfiled = [...startsOf(SEG), ...startsOf(next).map((s) => ({ ...s, origin: SEG.origin }))];
    expect(text(judgeStarts(misfiled, [SEG, next], LAYERS))).toMatch(/off their layer's onsets/);
    expect(text(judgeStarts(startsOf(SEG), [{ ...SEG, origin: 11 }], LAYERS))).toMatch(/voice start\(s\) under a transport origin no run of the probe had/);
  });

  it('reads the gauntlet\'s mapping from its start bar', () => {
    const alt = [layer([0], [0.5])];
    const g = { room: 11, origin: 5, end: 5 + 4 * BAR, startBar: 1 };
    expect(judgeStarts(startsOf(g, alt), [g], alt).problems).toEqual([]);
    expect(text(judgeStarts(startsOf(g, alt), [{ ...g, startBar: -1 }], alt))).toMatch(/off their layer's onsets/);
  });

  it('takes the transport\'s late shift of a due onset, as many as it counted', () => {
    const ts = layerOnsets(LAYERS, SEG.origin, SEG.end);
    const t = ts[1][9];
    // Handed over 20 ms after the onset was due, to start 5 ms after the call.
    const shifted = startsOf(SEG).map((s) => (s.layer === 2 && Math.abs(s.when - t) < 1e-9 ? { ...s, at: t + 0.02, when: t + 0.025 } : s));
    const ok = judgeStarts(shifted, [SEG], LAYERS, 1);
    expect(ok.problems).toEqual([]);
    expect(ok.shifted).toBe(1);
    expect(text(judgeStarts(shifted, [SEG], LAYERS, 0))).toMatch(/starts: 1 voice start\(s\) read as late shifts, the transport shifted 0 note\(s\)/);
    // A start 25 ms late that was handed over ahead of its time is no shift.
    const ahead = startsOf(SEG).map((s) => (s.layer === 2 && Math.abs(s.when - t) < 1e-9 ? { ...s, when: t + 0.025 } : s));
    expect(text(judgeStarts(ahead, [SEG], LAYERS, 5))).toMatch(/layer 2 at \+25\.0 ms/);
  });

  it('names a voice with no gate, one with two ways out, one never read, and no voice at all', () => {
    const extra = (v) => [...startsOf(SEG), { type: 'OscillatorNode', when: SEG.origin + 1, at: SEG.origin + 0.9, origin: SEG.origin, ...v }];
    expect(text(judgeStarts(extra({ layer: 0 }), [SEG], LAYERS))).toMatch(/starts: 1 voice start\(s\) reach the speakers through no layer gate/);
    expect(text(judgeStarts(extra({ layer: -2 }), [SEG], LAYERS))).toMatch(/starts: 1 voice start\(s\) meet more than one way out/);
    expect(text(judgeStarts(extra({ layer: null }), [SEG], LAYERS))).toMatch(/starts: 1 voice start\(s\) whose layer was never read/);
    expect(text(judgeStarts([], [SEG], LAYERS))).toMatch(/starts: no voice start recorded/);
    expect(text(judgeStarts(startsOf(SEG).filter((s) => s.type === 'ConstantSourceNode'), [SEG], LAYERS))).toMatch(/starts: no voice start recorded/);
  });
});
