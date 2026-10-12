// What an untouched calibration screen must show (HUSH-SPEC section 12), read by the flash probe's --calibration
// run. With no tap every attempt is rejected, so the scene runs A1, A2, B1 and B2 before the run starts with
// 0 and 0: the scene stays up at least four times 23 beats, the master analyser hears the 48 clicks of A1 and
// A2, and the screencast's centre box shows the 8 count-in fills of A1 and A2 (large pulses, 7 to 9 allowed for
// one pulse the screencast may split or merge, so a count-in of 3 or 5 cannot pass) and the 48 rings of B1 and
// B2 (small pulses). A scene that hands over at once, skips a repeat, plays no click, draws no ring or no
// count-in cannot pass.
// And what a tapped calibration must give (review R1, MAJOR 2): the probe's tapper (src/probe/api.ts
// tapCalibration) presses TAP_A_MS after each click of pass A and TAP_B_MS after each ring of pass B, so both
// first attempts are accepted and the values in use are avOffset TAP_A_MS - TAP_B_MS and inputBias TAP_B_MS
// within TAP_TOLERANCE_MS (X8's tolerance), the scene left after those two attempts.
import { luminance } from './flash-analyzer.mjs';

export const BEAT_S = 60 / 140;
export const MIN_SECONDS = 39.4;
export const WANT = Object.freeze({ clicks: [44, 52], fills: [7, 9], rings: [44, 52] });
export const TAP_A_MS = 40;
export const TAP_B_MS = 25;
export const TAP_TOLERANCE_MS = 5;
export const TAPPED_SECONDS = Object.freeze([19, 30]);
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

// The verdict on one tapped calibration: seconds the scene stayed up after the first key and the values in use
// once it was left.
export function judgeTapped({ seconds, values }) {
  const want = { avOffset: TAP_A_MS - TAP_B_MS, inputBias: TAP_B_MS };
  const problems = [];
  const [lo, hi] = TAPPED_SECONDS;
  if (!(seconds >= lo && seconds <= hi)) problems.push(`tapped calibration left after ${seconds.toFixed(1)} s (want ${lo} to ${hi} s: both passes accepted at their first attempt)`);
  const off = (k) => (values && Number.isFinite(values[k]) ? Math.abs(values[k] - want[k]) : Infinity);
  if (!(off('avOffset') <= TAP_TOLERANCE_MS && off('inputBias') <= TAP_TOLERANCE_MS)) {
    problems.push(`tapped calibration values ${values ? `${values.avOffset} ${values.inputBias}` : 'none'} (want avOffset ${want.avOffset} and inputBias ${want.inputBias} within ${TAP_TOLERANCE_MS} ms)`);
  }
  return { seconds: Math.round(seconds * 10) / 10, values, want, problems };
}
