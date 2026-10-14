// CL1: the device-clock line (src/clock/output-clock.ts), Vault City's sampleOutputClock ported whole, against
// the spec session's own port (tests/fixtures/control-page/clock.js, proven live by the av probe): fed the same
// AudioContext readings, both give the same offset, validity and resync count after every sample.
import { describe, expect, it } from 'vitest';
import * as ref from '../fixtures/control-page/clock.js';

const product = await import(process.env.HUSH_CLOCK_MODULE ? new URL(process.env.HUSH_CLOCK_MODULE, `file:///${process.cwd().replace(/\\/g, '/')}/`).href : '../../src/clock/output-clock.ts');

// A scripted context. The device renders in bursts of `burst` seconds: at each burst currentTime jumps `lead`
// ahead of the heard time and a fresh pair lies on the line (trusted when the lead is four render quanta or
// more); through the burst the pair runs ahead with performance time until its context time is clamped to
// currentTime, from where it sits below the line, untrusted. Settling pairs come `settleHigh` above the line
// for the first 400 ms; a glitch moves the line by `glitch` from `glitchAt` ms on; stale pairs carry an old
// performance time until `staleUntil` ms; `stamps: false` is an engine without getOutputTimestamp. A glitch with
// `glitchUntil` ends there (a blip). `start` is the performance time of the first sample (review R3, MINOR 1: a
// stale stamp 900 ms old must be positive to reach the stale rule, so the stale scenario starts at 2000 ms).
function device({ offset = -1.2, burst = 0.1, lead = 0.03, settleHigh = 0, glitchAt = Infinity, glitchUntil = Infinity, glitch = 0, stamps = true, staleUntil = -1, baseLatency = 0.01, start = 0 }) {
  const ctx = { state: 'running', sampleRate: 48000, baseLatency, outputLatency: 0.02, currentTime: 0, now: start };
  let lastBurst = -1;
  let fresh = null;
  let pair = null;
  ctx.advance = (ms) => {
    ctx.now += ms;
    const truth = ctx.now / 1000 + offset + (ctx.now >= glitchAt && ctx.now < glitchUntil ? glitch : 0);
    const b = Math.floor(ctx.now / (burst * 1000));
    if (b !== lastBurst) {
      lastBurst = b;
      ctx.currentTime = truth + lead;
      fresh = { contextTime: truth + (ctx.now < 400 ? settleHigh : 0), performanceTime: ctx.now <= staleUntil ? ctx.now - 900 : ctx.now };
      pair = { ...fresh };
    } else if (fresh) {
      pair = { contextTime: Math.min(fresh.contextTime + (ctx.now - fresh.performanceTime) / 1000, ctx.currentTime), performanceTime: ctx.now };
    }
  };
  if (stamps) ctx.getOutputTimestamp = () => (pair ? { ...pair } : { contextTime: 0, performanceTime: 0 });
  return ctx;
}

function both(ctxA, ctxB, steps, stepMs, hook = () => {}) {
  const a = product.createOutputClock(ctxA);
  const b = ref.createOutputClock(ctxB);
  for (let i = 0; i < steps; i++) {
    hook(i, ctxA, ctxB);
    ctxA.advance(stepMs);
    ctxB.advance(stepMs);
    const ra = a.sample(ctxA.now);
    const rb = b.sample(ctxB.now);
    expect([i, ra.offset, ra.valid, ra.resyncs]).toEqual([i, rb.offset, rb.valid, rb.resyncs]);
  }
  return { a, b };
}

describe('CL1 device-clock line against the reference port', () => {
  // [the device, whether the reference resyncs: 'yes', 'no' or null for either]. The last three pin a threshold
  // each (review R1, MINOR 2): CLOCK_JUMP (a 6 ms drop is a move of the line, 4 ms the tolerance), the resync rule
  // (a blip of exactly two low trusted pairs leaves the line alone, three move it: with a 15 ms lead only each
  // burst's fresh pair is trusted, so a blip over two bursts is two low pairs 100 ms apart) and the trust rule (a
  // lead of three render quanta is not trusted, four are, so only the fallback validates that device).
  const scenarios = {
    steady: [{}, null],
    'settling pairs 28 ms high': [{ settleHigh: 0.028 }, null],
    'a glitch moves the line down 20 ms': [{ glitchAt: 4000, glitch: -0.02 }, 'yes'],
    'stale pairs after a resume': [{ start: 2000, staleUntil: 2600 }, null],
    'a large output buffer': [{ baseLatency: 0.09, burst: 0.2 }, null],
    'a glitch moves the line down 6 ms': [{ glitchAt: 4000, glitch: -0.006 }, 'yes'],
    // Review R7 (MINOR 2): CLOCK_JUMP from both sides. A 3.5 ms drop is inside the 4 ms tolerance and a 4.5 ms drop is past it.
    'a glitch moves the line down 3.5 ms': [{ glitchAt: 4000, glitch: -0.0035 }, 'no'],
    'a glitch moves the line down 4.5 ms': [{ glitchAt: 4000, glitch: -0.0045 }, 'yes'],
    'a blip of exactly two low pairs': [{ lead: 0.015, glitchAt: 4000, glitchUntil: 4200, glitch: -0.02 }, 'no'],
    'a lead of three render quanta': [{ lead: (3 * 128) / 48000 }, null],
  };
  for (const [name, [opts, resync]] of Object.entries(scenarios)) {
    it(`agrees: ${name}`, () => {
      const { a, b } = both(device(opts), device(opts), 1200, 7);
      expect(a.valid).toBe(true);
      if (resync === 'yes') expect(b.resyncs).toBeGreaterThanOrEqual(1);
      if (resync === 'no') expect(b.resyncs).toBe(0);
    });
  }

  it('agrees on an engine without output timestamps, and on one that never trusts a pair', () => {
    both(device({ stamps: false }), device({ stamps: false }), 300, 7);
    const { a } = both(device({ lead: 0 }), device({ lead: 0 }), 900, 7);
    expect(a.valid).toBe(true);
  });

  // Review R7 (MINOR 2): the agreement burst's 50 ms floor. Every pair of this device is trusted (a fresh pair each
  // 20 ms, 30 ms ahead), its baseLatency is 0 and it is sampled every 10 ms, so the line is valid exactly 50 ms after
  // the first trusted pair past settling: at 210 ms, the 21st sample. A floor of 30 ms would make it valid at 190 ms.
  it('agrees: the agreement burst on a device with baseLatency 0, sampled every 10 ms', () => {
    const { a } = both(device({ burst: 0.02, baseLatency: 0 }), device({ burst: 0.02, baseLatency: 0 }), 60, 10);
    expect(a.valid).toBe(true);
    const d = device({ burst: 0.02, baseLatency: 0 });
    const line = ref.createOutputClock(d);
    let firstValid = -1;
    for (let i = 0; i < 60 && firstValid < 0; i++) {
      d.advance(10);
      if (line.sample(d.now).valid) firstValid = d.now;
    }
    expect(firstValid).toBe(210);
  });

  it('agrees across a suspension: no sample while suspended, the line starts again on resume', () => {
    both(device({}), device({}), 1500, 7, (i, x, y) => {
      if (i === 500) { x.state = 'suspended'; y.state = 'suspended'; }
      if (i === 700) { x.state = 'running'; y.state = 'running'; }
    });
  });

  it('maps a performance time to the heard context time through the line', () => {
    const c = { offset: -1.25, valid: true, resyncs: 0, sample() { return c; } };
    expect(product.audibleSec(c, 2500)).toBeCloseTo(1.25, 12);
  });
});
