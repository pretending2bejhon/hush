// Reference for tests/audio/*.test.mjs (PF-CONTROLS): the pure parts of HUSH-SPEC section 8 (the labelled-layer
// capture, the transport, the gates), taking the Strudel namespace as an argument so Node can run them.
export const BPM = 140;
export const SIXTEENTH = 60 / BPM / 4;
export const BAR = SIXTEENTH * 16;
export const CPS = BPM / 60 / 4;
export const LOOKAHEAD = 0.12;
export const LATE = 0.05;

export function compileTrack(code, S) {
  const names = [];
  const layers = [];
  const P = S.Pattern.prototype;
  const previous = P.p;
  let anonymous = 0;
  P.p = function capture(name) {
    const key = name === '$' ? `$${++anonymous}` : String(name);
    if (!key.startsWith('_') && !names.includes(key)) { names.push(key); layers.push(this); }
    return this;
  };
  try {
    const scope = { ...S, setcpm() {}, setcps() {}, hush() {}, evaluate() {} };
    const keys = Object.keys(scope).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !['eval', 'arguments', 'default'].includes(n));
    const { output } = S.transpiler(code, { addReturn: false, emitMiniLocations: false, emitWidgets: false });
    Function(...keys, `"use strict";${output}`)(...keys.map((k) => scope[k]));
  } finally {
    P.p = previous;
  }
  return { names, layers };
}

export function createTransport(layers, play) {
  const c = { scheduledVoices: 0, voiceErrors: 0, lateShifted: 0, lateDropped: 0 };
  let origin = 0;
  let next = 0;
  let startBar = -1;
  let running = false;
  const cycleOf = (bar) => (startBar >= 0 && bar >= startBar ? bar - startBar : bar);
  function haps(step, layer, pattern) {
    const bar = Math.floor(step / 16);
    const cycle = cycleOf(bar);
    const begin = cycle + (step % 16) / 16;
    let hs;
    try { hs = pattern.queryArc(begin, begin + 1 / 16); } catch { c.voiceErrors += 1; return []; }
    return hs.filter((h) => h.hasOnset()).map((h) => {
      const onset = Number(h.whole.begin);
      return { layer, value: h.value, time: origin + (bar + onset - cycle) * BAR, duration: (Number(h.whole.end) - onset) * BAR, cycle: onset };
    });
  }
  return {
    get origin() { return origin; },
    restart(o, gauntletStartBar = -1) { origin = o; next = 0; startBar = gauntletStartBar; running = true; },
    tick(now) {
      if (!running) return;
      while (origin + next * SIXTEENTH < now - LATE) {
        layers.forEach((p, i) => { c.lateDropped += haps(next, i + 1, p).length; });
        next += 1;
      }
      while (origin + next * SIXTEENTH < now + LOOKAHEAD) {
        layers.forEach((p, i) => {
          for (const note of haps(next, i + 1, p)) {
            if (!note.value || typeof note.value !== 'object') continue;
            if (note.time < now) {
              if (note.time < now - LATE) { c.lateDropped += 1; continue; }
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
    voiceError() { c.voiceErrors += 1; },
    counters() { return { ...c }; },
  };
}

export const unlockTime = (origin, bar) => origin + bar * BAR;

export function openAt(param, t) {
  param.setValueAtTime(0, t - 0.005);
  param.linearRampToValueAtTime(1, t);
}

export function setMask(params, mask, now) {
  params.forEach((g, i) => {
    g.cancelScheduledValues(now);
    g.setValueAtTime(mask & (1 << (i + 1)) ? 1 : 0, now);
  });
}
