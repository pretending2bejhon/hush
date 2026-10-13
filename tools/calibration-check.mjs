// What an untouched calibration screen must show (HUSH-SPEC section 12), read by the flash probe's --calibration
// run. With no tap every attempt is rejected, so the scene runs A1, A2, B1 and B2 before the run starts with
// 0 and 0: the scene stays up at least four times 23 beats, the master analyser hears the 48 clicks of A1 and
// A2, and the screencast's centre box shows the 8 count-in fills of A1 and A2 (large pulses, 7 to 9 allowed for
// one pulse the screencast may split or merge, so a count-in of 3 or 5 cannot pass) and the 48 rings of B1 and
// B2 (small pulses). A scene that hands over at once, skips a repeat, plays no click, draws no ring or no
// count-in cannot pass.
// And what a tapped calibration must give (review R1, MAJOR 2): the probe's tapper (src/probe/api.ts
// tapCalibration) presses TAP_A_MS after each click of pass A and TAP_B_MS after each ring of pass B, so both
// first attempts are accepted and the scene is left after those two attempts. Review R2 (MINOR 3): the values in
// use are judged against the taps the tapper actually landed (its log: each tap's time stamp, its heard time and the
// attempt it fell in, each attempt's t0, p0 and frameTimes), matched, judged and calibrated as section 12 does
// (tapLogValues, through tests/fixtures/calibration/reference.mjs): equal within TAP_EXACT_MS. A run whose taps
// strayed more than TAP_STRAY_MS from their marks is refused, so a page whose timers ran late cannot fail a correct
// scene, nor pass one by luck. And (MAJOR 4) once the scene is left, a run at room 1 must be running.
import { calibrate, judgePass } from '../tests/fixtures/calibration/reference.mjs';
import { luminance } from './flash-analyzer.mjs';

export const BEAT_S = 60 / 140;
export const MIN_SECONDS = 39.4;
export const WANT = Object.freeze({ clicks: [44, 52], fills: [7, 9], rings: [44, 52] });
export const TAP_A_MS = 40;
export const TAP_B_MS = 25;
export const TAP_EXACT_MS = 0.5;
export const TAP_STRAY_MS = 15;
export const TAPPED_SECONDS = Object.freeze([19, 30]);
const COUNT_IN = 4;
const CLICKS = 24;
// A click starts when the analyser's peak reaches CLICK_ON from below CLICK_OFF.
export const CLICK_ON = 0.05;
export const CLICK_OFF = 0.02;
// The box around the key shape and the ring, in canvas px; a pulse is a run of frames whose luminance in the
// box stands PULSE_ON canvas px or more above its resting level (the median frame: the stimuli are up about a
// seventh of the time, and the frames of the next scene that the window may catch sit below it); a pulse
// whose peak reaches FILL_SHARE of the largest pulse is a fill, any other a ring.
export const CENTRE_BOX = Object.freeze({ x0: 570, y0: 290, x1: 710, y1: 430 });
export const PULSE_ON = 100;
export const FILL_SHARE = 0.6;

// The summed luminance of the centre box in one frame, in canvas px: `rgba` is a crop of the canvas of w by h
// pixels standing for the whole 1280 by 720 canvas.
export function centreSum(rgba, w, h) {
  const sx = w / 1280;
  const sy = h / 720;
  const x0 = Math.max(0, Math.floor(CENTRE_BOX.x0 * sx));
  const x1 = Math.min(w, Math.ceil(CENTRE_BOX.x1 * sx));
  const y0 = Math.max(0, Math.floor(CENTRE_BOX.y0 * sy));
  const y1 = Math.min(h, Math.ceil(CENTRE_BOX.y1 * sy));
  let sum = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0, o = (y * w + x0) * 4; x < x1; x++, o += 4) sum += luminance(rgba[o], rgba[o + 1], rgba[o + 2]);
  }
  return sum * ((1280 * 720) / (w * h));
}

// Clicks in a series of analyser samples ({ peak }), counted on their rising edge with hysteresis.
export function countClicks(samples) {
  let on = false;
  let n = 0;
  for (const s of samples) {
    if (!on && s.peak >= CLICK_ON) { on = true; n += 1; } else if (on && s.peak < CLICK_OFF) on = false;
  }
  return n;
}

// Pulses in a series of centre sums ({ t, s }, in time order), above the series' resting level (its median).
export function countPulses(trace) {
  if (!trace.length) return { fills: 0, rings: 0, peaks: [], rest: 0 };
  const sorted = trace.map((p) => p.s).sort((a, b) => a - b);
  const rest = sorted[Math.floor(sorted.length / 2)];
  const peaks = [];
  let cur = -1;
  for (const p of trace) {
    const d = p.s - rest;
    if (d >= PULSE_ON) cur = Math.max(cur, d);
    else if (cur >= 0) { peaks.push(cur); cur = -1; }
  }
  if (cur >= 0) peaks.push(cur);
  const top = peaks.length ? Math.max(...peaks) : 0;
  const fills = peaks.filter((d) => d >= FILL_SHARE * top).length;
  return { fills, rings: peaks.length - fills, peaks: peaks.map((d) => Math.round(d)), rest: Math.round(rest) };
}

// The verdict on one untouched calibration: seconds the scene stayed up after the first key, the analyser
// samples and the centre trace taken while it was up, and the values in use once it was left.
export function judgeCalibration({ seconds, samples, trace, values }) {
  const clicks = countClicks(samples);
  const { fills, rings, peaks, rest } = countPulses(trace);
  const problems = [];
  if (!(seconds >= MIN_SECONDS)) problems.push(`calibration left after ${seconds.toFixed(1)} s (want at least ${MIN_SECONDS} s: two attempts of each pass, 23 beats apiece)`);
  const range = (name, n) => {
    const [lo, hi] = WANT[name];
    if (n < lo || n > hi) problems.push(`calibration ${name} ${n} (want ${lo} to ${hi})`);
  };
  range('clicks', clicks);
  range('fills', fills);
  range('rings', rings);
  if (!values || values.avOffset !== 0 || values.inputBias !== 0) problems.push(`calibration values ${JSON.stringify(values)} (want avOffset 0 and inputBias 0 after an untouched run)`);
  return { seconds: Math.round(seconds * 10) / 10, clicks, fills, rings, values, frames: trace.length, samples: samples.length, rest, peaks: peaks.slice(0, 80), problems };
}

// The nearest value of xs to v (ties to the earlier), skipping holes; null when there is none (section 12).
function nearest(xs, v) {
  let best = null;
  for (const x of xs) if (x !== undefined && x !== null && (best === null || Math.abs(v - x) < Math.abs(v - best))) best = x;
  return best;
}

// The values section 12 gives for the taps of a tapper's log: each attempt's taps (those that landed while it was
// up) matched to its clicks 4 to 23 in heard time (pass A) or to its drawn rings 4 to 23 in performance time (pass
// B), past the count-in, then judgePass per attempt and calibrate of each pass's last attempt.
export function tapLogValues(log) {
  const passes = { A: [], B: [] };
  log.attempts.forEach((a, k) => {
    const taps = log.taps.filter((t) => t.attempt === k);
    const offsets = [];
    if (a.pass === 'A') {
      const clicks = [];
      for (let i = COUNT_IN; i < CLICKS; i++) clicks.push(a.t0 + i * BEAT_S);
      for (const t of taps) if (t.h >= a.t0 + (COUNT_IN - 0.5) * BEAT_S) offsets.push((t.h - (nearest(clicks, t.h) ?? t.h)) * 1000);
    } else {
      const drawn = (a.frameTimes || []).slice(COUNT_IN);
      for (const t of taps) {
        if (!(t.t >= a.p0 + (COUNT_IN - 0.5) * BEAT_S * 1000)) continue;
        const f = nearest(drawn, t.t);
        if (f !== null) offsets.push(t.t - f);
      }
    }
    passes[a.pass].push(judgePass(offsets));
  });
  const last = (p) => passes[p][passes[p].length - 1] || judgePass([]);
  return { values: calibrate(last('A'), last('B')), passes };
}

// The verdict on one tapped calibration: seconds the scene stayed up after the first key, the values in use once
// it was left, the tapper's log, and the run read twice after the hand-over ({ scenes, room, from, to }).
export function judgeTapped({ seconds, values, log, handover }) {
  const marks = { avOffset: TAP_A_MS - TAP_B_MS, inputBias: TAP_B_MS };
  const problems = [];
  const [lo, hi] = TAPPED_SECONDS;
  if (!(seconds >= lo && seconds <= hi)) problems.push(`tapped calibration left after ${seconds.toFixed(1)} s (want ${lo} to ${hi} s: both passes accepted at their first attempt)`);
  const fmt = (v) => (v && Number.isFinite(v.avOffset) && Number.isFinite(v.inputBias) ? `${v.avOffset.toFixed(1)} ${v.inputBias.toFixed(1)}` : 'none');
  let own = null;
  if (!log || !log.attempts || !log.attempts.length) problems.push('tapped calibration: the tapper logged no attempt');
  else {
    const r = tapLogValues(log);
    own = r.values;
    const first = (p) => r.passes[p][0];
    if (!first('A') || !first('A').accepted || !first('B') || !first('B').accepted) {
      problems.push(`tapped calibration: the taps strayed, the first attempts judge ${['A', 'B'].map((p) => (first(p) ? `${p} MAD ${first(p).mad.toFixed(1)} on ${first(p).taps} taps` : `${p} none`)).join(', ')}`);
    } else if (!(Math.abs(own.avOffset - marks.avOffset) <= TAP_STRAY_MS && Math.abs(own.inputBias - marks.inputBias) <= TAP_STRAY_MS)) {
      problems.push(`tapped calibration: the taps strayed from their marks, they give ${fmt(own)} (want within ${TAP_STRAY_MS} ms of ${marks.avOffset} ${marks.inputBias})`);
    }
    const off = (k) => (values && Number.isFinite(values[k]) ? Math.abs(values[k] - own[k]) : Infinity);
    if (!(off('avOffset') <= TAP_EXACT_MS && off('inputBias') <= TAP_EXACT_MS)) problems.push(`tapped calibration values ${fmt(values)}, the taps' own ${fmt(own)} (want equal within ${TAP_EXACT_MS} ms)`);
  }
  if (!handover || !handover.scenes.includes('play') || handover.room !== 1 || !(handover.to > handover.from)) {
    problems.push(`tapped calibration: no run at room 1 after the hand-over (${handover ? `scenes ${JSON.stringify(handover.scenes)}, room ${handover.room}, step ${handover.from} then ${handover.to}` : 'not read'})`);
  }
  return { seconds: Math.round(seconds * 10) / 10, values, own, marks, problems };
}
