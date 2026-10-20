// Reference for tests/input/keys.test.mjs (PF-CONTROLS): HUSH-SPEC sections 3 and 9.2.
export const KEY_BITS = Object.freeze({
  ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 4, KeyW: 4, ArrowDown: 8, KeyS: 8,
  Space: 16, KeyZ: 16, KeyC: 16, KeyX: 32, ShiftLeft: 32, ShiftRight: 32,
});

export function createKeys({ target, stepOf }) {
  let queue = [];
  const held = new Set();
  let source = null;
  const onKey = (e) => {
    const bit = KEY_BITS[e.code];
    if (bit === undefined) return;
    e.preventDefault();
    if (e.repeat) return;
    queue.push({ code: e.code, down: e.type === 'keydown', step: stepOf(e.timeStamp) });
  };
  target.addEventListener('keydown', onKey, true);
  target.addEventListener('keyup', onKey, true);
  const bits = () => { let b = 0; for (const c of held) b |= KEY_BITS[c]; return b; };
  return {
    next(step) {
      const later = [];
      for (const ev of queue) {
        if (ev.step <= step) { if (ev.down) held.add(ev.code); else held.delete(ev.code); } else later.push(ev);
      }
      queue = later;
      return source ? source.next(step) : bits();
    },
    // Applies every queued event in arrival order, whatever its step, and empties the queue (the owner's ruling
    // N-F4 a: a run started again holds exactly the keys that are down, never an event stamped by the run before).
    flush() {
      for (const ev of queue) { if (ev.down) held.add(ev.code); else held.delete(ev.code); }
      queue = [];
    },
    attachSource(s) { source = s; },
    held: bits,
    detach() {
      target.removeEventListener('keydown', onKey, true);
      target.removeEventListener('keyup', onKey, true);
    },
  };
}
