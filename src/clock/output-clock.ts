// The device-clock line (spec sections 8.5 and 9): Vault City's sampleOutputClock (city-audio.js:93-167) and
// audibleTime (beat.js:38-46), ported whole into a factory like tests/fixtures/control-page/clock.js, the same
// constants, branches and order of reads.
// Every correct getOutputTimestamp() pair lies on one line of slope 1; the line is the upper envelope of the
// trusted pairs of the last second, with settling, stale pairs, resync and the 3 s fallback.
const CLOCK_WINDOW = 1000;
const CLOCK_JUMP = 0.004;
const CLOCK_RING = 512;
const CLOCK_STALE = 500;
const CLOCK_FALLBACK = 3000;

export interface OutputClockContext {
  readonly state: string;
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly baseLatency?: number;
  readonly outputLatency?: number;
  getOutputTimestamp?(): { contextTime?: number; performanceTime?: number };
}

export interface OutputClock {
  offset: number;
  valid: boolean;
  resyncs: number;
  sample(nowMs?: number): OutputClock;
}

// The line's own counters, kept as the reference port keeps them.
interface Clock extends OutputClock {
  starts: number;
  samples: number;
  kept: number;
  trusted: number;
  rawErrorMs: number;
}

export function createOutputClock(ctx: OutputClockContext): OutputClock {
  const clock: Clock = { offset: 0, valid: false, resyncs: 0, starts: 0, samples: 0, kept: 0, trusted: 0, rawErrorMs: 0, sample };
  const at = new Float64Array(CLOCK_RING);
  const offsets = new Float64Array(CLOCK_RING);
  const atOf = (i: number): number => at[i] ?? 0;
  const offsetOf = (i: number): number => offsets[i] ?? 0;
  let head = 0;
  let count = 0;
  let running = false;
  let since = 0;
  let low = 0;
  let lowAt = 0;
  let agreeAt = 0;
  let agreeOffset = 0;
  let lastContext = -1;
  let lastPerformance = -1;

  function reset(now: number): void {
    head = 0; count = 0; low = 0; agreeAt = 0; since = now; clock.valid = false; clock.starts += 1;
    lastContext = -1; lastPerformance = -1;
  }
  function line(): number {
    let l = -Infinity;
    for (let i = 0, j = head; i < count; i++, j = (j + 1) % CLOCK_RING) if (offsetOf(j) > l) l = offsetOf(j);
    return l;
  }
  function sample(now: number = performance.now()): Clock {
    if (ctx.state !== 'running') { running = false; return clock; }
    if (!running) { running = true; reset(now); }
    const rendered = ctx.currentTime;
    const stamp = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
    const stampContext = stamp ? stamp.contextTime : undefined;
    const stampPerformance = stamp ? stamp.performanceTime : undefined;
    const timestamp = stampContext !== undefined && stampPerformance !== undefined && stampPerformance > 0 && Number.isFinite(stampContext);
    const latency = Number(ctx.outputLatency) || Number(ctx.baseLatency) || 0;
    const contextTime = timestamp ? stampContext : ctx.currentTime - latency;
    const performanceTime = timestamp ? stampPerformance : now;
    const offset = contextTime - performanceTime / 1000;
    clock.samples += 1;
    if (!stamp) { clock.offset = offset; clock.valid = true; clock.rawErrorMs = 0; return clock; }
    if (!timestamp) return clock;
    if (contextTime === lastContext && performanceTime === lastPerformance) return clock;
    lastContext = contextTime; lastPerformance = performanceTime;
    const settle = 150 + 1500 * (Number(ctx.baseLatency) || 0);
    if (now - since < settle || performanceTime < now - CLOCK_STALE) {
      if (count) clock.rawErrorMs = (offset - clock.offset) * 1000;
      return clock;
    }
    while (count && atOf(head) < now - CLOCK_WINDOW) { head = (head + 1) % CLOCK_RING; count -= 1; }
    if (count === CLOCK_RING) { head = (head + 1) % CLOCK_RING; count -= 1; }
    const slot = (head + count) % CLOCK_RING;
    at[slot] = now; offsets[slot] = offset; count += 1; clock.kept += 1;
    let l = line();
    const burst = Math.max(50, 1500 * (Number(ctx.baseLatency) || 0));
    const trusted = rendered - contextTime >= (4 * 128) / ctx.sampleRate;
    if (trusted) clock.trusted += 1;
    if (trusted && !clock.valid) {
      if (offset < l - CLOCK_JUMP) {
        head = (head + count - 1) % CLOCK_RING; count = 1; l = offset; agreeAt = now;
      } else if (!agreeAt || offset > agreeOffset + CLOCK_JUMP) agreeAt = now;
      else if (now - agreeAt >= burst) clock.valid = true;
      if (agreeAt === now) agreeOffset = offset;
    } else if (trusted) {
      if (offset >= l - CLOCK_JUMP) low = 0;
      else if (!low++) lowAt = now;
      else if (low >= 3 && now - lowAt >= burst) {
        while (count && atOf(head) < lowAt) { head = (head + 1) % CLOCK_RING; count -= 1; }
        l = line(); low = 0; clock.resyncs += 1;
      }
    } else if (!clock.valid && !agreeAt && now - since > settle + CLOCK_FALLBACK) clock.valid = true;
    clock.offset = l; clock.rawErrorMs = (offset - l) * 1000;
    return clock;
  }
  return clock;
}

// Performance time (ms) to the context time it is heard at, through the line (Vault City beat.js:38-46).
export function audibleSec(clock: OutputClock, nowMs: number): number {
  return nowMs / 1000 + clock.offset;
}
