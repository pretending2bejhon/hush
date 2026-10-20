// IN1: the keys (src/input/keys.ts, HUSH-SPEC sections 3 and 9.2): the code-to-bit table, repeats skipped,
// unmapped keys untouched, mapped keys kept from the page (preventDefault), each event applied at its own step
// (or the current one when late), bits held as the OR of the keys down, an attached source replacing them, and
// (the owner's ruling N-F4 a) the queue flushed whatever its steps when a run starts again.
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';

const K = await load('HUSH_KEYS_MODULE', new URL('../../src/input/keys.ts', import.meta.url));

class Key extends Event {
  constructor(type, code, t, repeat = false) {
    super(type, { cancelable: true });
    Object.defineProperties(this, { code: { value: code }, repeat: { value: repeat }, timeStamp: { value: t } });
  }
}

function setup() {
  const target = new EventTarget();
  const keys = K.createKeys({ target, stepOf: (ms) => Math.floor(ms / 10) });
  const send = (type, code, t, repeat) => { const e = new Key(type, code, t, repeat); target.dispatchEvent(e); return e; };
  return { keys, send };
}

describe('IN1 keys', () => {
  it('maps the codes of section 3', () => {
    expect({ ...K.KEY_BITS }).toEqual({
      ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 4, KeyW: 4, ArrowDown: 8, KeyS: 8,
      Space: 16, KeyZ: 16, KeyC: 16, KeyX: 32, ShiftLeft: 32, ShiftRight: 32,
    });
  });

  it('applies each event at its step, holds the OR of the keys down, keeps mapped keys from the page', () => {
    const { keys, send } = setup();
    const down = send('keydown', 'ArrowRight', 240);
    expect(down.defaultPrevented).toBe(true);
    expect(keys.next(23)).toBe(0);
    expect(keys.next(24)).toBe(2);
    send('keydown', 'Space', 300);
    send('keydown', 'KeyD', 310);
    expect(keys.next(30)).toBe(18);
    send('keyup', 'ArrowRight', 400);
    expect(keys.next(40)).toBe(18);
    send('keyup', 'KeyD', 410);
    send('keyup', 'Space', 420);
    expect(keys.next(41)).toBe(16);
    expect(keys.next(42)).toBe(0);
  });

  it('skips repeats and leaves unmapped keys alone', () => {
    const { keys, send } = setup();
    send('keydown', 'KeyX', 100);
    const rep = send('keydown', 'KeyX', 120, true);
    expect(rep.defaultPrevented).toBe(true);
    send('keyup', 'KeyX', 150);
    expect(keys.next(10)).toBe(32);
    expect(keys.next(15)).toBe(0);
    for (const code of ['KeyQ', 'Escape', 'Enter', 'Tab']) {
      const e = send('keydown', code, 200);
      expect(e.defaultPrevented).toBe(false);
    }
    expect(keys.next(30)).toBe(0);
  });

  it('applies a late event at the current step, in arrival order', () => {
    const { keys, send } = setup();
    expect(keys.next(50)).toBe(0);
    send('keydown', 'KeyA', 100);
    expect(keys.next(51)).toBe(1);
  });

  // The owner's ruling N-F4 a (2026-10-19): a run that starts again flushes the queue, so an event stamped by the run
  // before never waits for a step the new run reaches only much later.
  it('flushes every queued event in arrival order, whatever its step, and queues later events as before', () => {
    const { keys, send } = setup();
    send('keydown', 'ArrowRight', 90000);
    send('keydown', 'Space', 90010);
    send('keyup', 'Space', 90020);
    send('keydown', 'KeyX', 90030);
    send('keyup', 'KeyX', 90040);
    send('keydown', 'KeyX', 90050);
    keys.flush();
    expect(keys.held()).toBe(34);
    expect(keys.next(0)).toBe(34);
    send('keyup', 'ArrowRight', 30);
    expect(keys.next(2)).toBe(34);
    expect(keys.next(3)).toBe(32);
  });

  it('gives an attached source the last word, and the keys back when detached', () => {
    const { keys, send } = setup();
    send('keydown', 'ArrowUp', 0);
    keys.attachSource({ next: (step) => (step % 2 ? 16 : 32) });
    expect(keys.next(1)).toBe(16);
    expect(keys.next(2)).toBe(32);
    keys.attachSource(null);
    expect(keys.next(3)).toBe(4);
  });
});
