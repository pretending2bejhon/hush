// The transport (spec section 8.3, Vault City's scheduler without bus logic): every onset of every layer handed
// over once, at origin + (bar + onset) x BAR, at most LOOKAHEAD ahead; a note up to LATE behind is moved to just
// after now, an older one is dropped and counted. It has no timer: `tick(now)` is called from outside.
import type { Pattern } from './track.ts';

const BPM = 140;
export const SIXTEENTH = 60 / BPM / 4;
export const BAR = 16 * SIXTEENTH;
export const CPS = BPM / 60 / 4;
export const LOOKAHEAD = 0.12;
export const LATE = 0.05;

export interface Note {
  layer: number;
  value: Record<string, unknown>;
  time: number;
  duration: number;
  cycle: number;
}
export interface TransportCounters {
  scheduledVoices: number;
  voiceErrors: number;
  lateShifted: number;
  lateDropped: number;
}

export function createTransport(layers: Pattern[], play: (note: Note) => void): {
  readonly origin: number;
  readonly startBar: number;
  tick(now: number): void;
  restart(origin: number, gauntletStartBar?: number): void;
  gauntlet(startBar: number): void;
  voiceError(): void;
  counters(): TransportCounters;
} {
  const c: TransportCounters = { scheduledVoices: 0, voiceErrors: 0, lateShifted: 0, lateDropped: 0 };
  let origin = 0;
  let next = 0;
  let startBar = -1;
  let running = false;
  // Step n is sixteenth n % 16 of bar floor(n / 16); its cycle is the bar, or bar - startBar from the start bar on.
  const cycleOf = (bar: number): number => (startBar >= 0 && bar >= startBar ? bar - startBar : bar);
  function haps(step: number, layer: number, pattern: Pattern): Note[] {
    const bar = Math.floor(step / 16);
    const cycle = cycleOf(bar);
    const begin = cycle + (step % 16) / 16;
    let hs;
    try {
      hs = pattern.queryArc(begin, begin + 1 / 16);
    } catch {
      c.voiceErrors += 1;
      return [];
    }
    return hs.filter((h) => h.hasOnset()).map((h) => {
      const onset = Number(h.whole.begin);
      return {
        layer,
        value: h.value as Record<string, unknown>,
        time: origin + (bar + onset - cycle) * BAR,
        duration: (Number(h.whole.end) - onset) * BAR,
        cycle: onset,
      };
    });
  }
  return {
    get origin(): number {
      return origin;
    },
    // The bar from which the gauntlet's track starts again at cycle 0, -1 for none (review R1, MAJOR 1).
    get startBar(): number {
      return startBar;
    },
    restart(o: number, gauntletStartBar: number = -1): void {
      origin = o;
      next = 0;
      startBar = gauntletStartBar;
      running = true;
    },
    gauntlet(bar: number): void {
      startBar = bar;
    },
    tick(now: number): void {
      if (!running) return;
      while (origin + next * SIXTEENTH < now - LATE) {
        layers.forEach((p, i) => {
          c.lateDropped += haps(next, i + 1, p).length;
        });
        next += 1;
      }
      while (origin + next * SIXTEENTH < now + LOOKAHEAD) {
        layers.forEach((p, i) => {
          for (const note of haps(next, i + 1, p)) {
            if (!note.value || typeof note.value !== 'object') continue;
            if (note.time < now) {
              if (note.time < now - LATE) {
                c.lateDropped += 1;
                continue;
              }
              note.time = now + 0.005;
              c.lateShifted += 1;
            }
            c.scheduledVoices += 1;
            play(note);
          }
        });
        next += 1;
      }
    },
    voiceError(): void {
      c.voiceErrors += 1;
    },
    counters(): TransportCounters {
      return { ...c };
    },
  };
}
