// The keyboard (spec sections 3 and 9.2): key codes to input bits, each event applied at the sim step it was
// heard at, the bits held being the OR of the keys down. Phaser's input stays off (D1); these are plain window
// listeners in the capture phase.
export interface InputSource {
  next(step: number): number;
}

export const KEY_BITS: Readonly<Record<string, number>> = Object.freeze({
  ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 4, KeyW: 4, ArrowDown: 8, KeyS: 8,
  Space: 16, KeyZ: 16, KeyC: 16, KeyX: 32, ShiftLeft: 32, ShiftRight: 32,
});

interface QueuedKey {
  code: string;
  down: boolean;
  step: number;
}

export function createKeys(opts: { target: EventTarget; stepOf: (eventTimeStampMs: number) => number }):
  InputSource & { attachSource(s: InputSource | null): void; held(): number; detach(): void } {
  const { target, stepOf } = opts;
  let queue: QueuedKey[] = [];
  const held = new Set<string>();
  let source: InputSource | null = null;
  // A code not in the table is ignored and not prevented; a mapped code never reaches the page (Space never
  // scrolls), and a repeat is then skipped.
  const onKey = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (!Object.hasOwn(KEY_BITS, e.code)) return;
    e.preventDefault();
    if (e.repeat) return;
    queue.push({ code: e.code, down: e.type === 'keydown', step: stepOf(e.timeStamp) });
  };
  target.addEventListener('keydown', onKey, true);
  target.addEventListener('keyup', onKey, true);
  const bits = (): number => {
    let b = 0;
    for (const c of held) b |= KEY_BITS[c] ?? 0;
    return b;
  };
  return {
    // Applies, in arrival order, every queued event whose step is at most `step` and keeps the rest.
    next(step: number): number {
      const later: QueuedKey[] = [];
      for (const q of queue) {
        if (q.step <= step) {
          if (q.down) held.add(q.code);
          else held.delete(q.code);
        } else later.push(q);
      }
      queue = later;
      return source ? source.next(step) : bits();
    },
    attachSource(s: InputSource | null): void {
      source = s;
    },
    held: bits,
    detach(): void {
      target.removeEventListener('keydown', onKey, true);
      target.removeEventListener('keyup', onKey, true);
    },
  };
}
