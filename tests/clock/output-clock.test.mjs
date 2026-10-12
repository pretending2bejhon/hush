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
// performance time until `staleUntil` ms; `stamps: false` is an engine without getOutputTimestamp.
function device({ offset = -1.2, burst = 0.1, lead = 0.03, settleHigh = 0, glitchAt = Infinity, glitch = 0, stamps = true, staleUntil = -1, baseLatency = 0.01 }) {
  const ctx = { state: 'running', sampleRate: 48000, baseLatency, outputLatency: 0.02, currentTime: 0, now: 0 };
  let lastBurst = -1;
  let fresh = null;
  let pair = null;
  ctx.advance = (ms) => {
    ctx.now += ms;
    const truth = ctx.now / 1000 + offset + (ctx.now >= glitchAt ? glitch : 0);
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
  const scenarios = {
    steady: {},
    'settling pairs 28 ms high': { settleHigh: 0.028 },
    'a glitch moves the line down 20 ms': { glitchAt: 4000, glitch: -0.02 },
    'stale pairs after a resume': { staleUntil: 600 },
    'a large output buffer': { baseLatency: 0.09, burst: 0.2 },
  };
  for (const [name, opts] of Object.entries(scenarios)) {
    it(`agrees: ${name}`, () => {
      const { a, b } = both(device(opts), device(opts), 1200, 7);
      expect(a.valid).toBe(true);
      if (opts.glitch) expect(b.resyncs).toBeGreaterThanOrEqual(1);
    });
  }

  it('agrees on an engine without output timestamps, and on one that never trusts a pair', () => {
    both(device({ stamps: false }), device({ stamps: false }), 300, 7);
    const { a } = both(device({ lead: 0 }), device({ lead: 0 }), 900, 7);
    expect(a.valid).toBe(true);
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
