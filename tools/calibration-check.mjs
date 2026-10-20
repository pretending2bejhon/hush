// What a calibration screen must show and give (HUSH-SPEC section 12), read by the flash probe's --calibration runs.
// The owner's ruling N-F1 c (2026-10-19) set its course: the key shape pressed on the beat while the scene waits for its
// first key; then A1, and B1 only when A1 is rejected, with no repeat of either, each attempt showing a row of 20 dots
// that fill as its counted clicks or rings pass; calibrate's one-pass rule (a lone accepted pass gives the input bias
// alone); and one line of page text under the canvas until the hand-over.
// The untouched run: with no tap A1 and B1 are rejected, so the scene stays up at least two times 23 beats, the master
// analyser hears A1's 24 clicks, and the screencast's centre box, from A1's first frame on, shows A1's 4 count-in fills
// (large pulses, 3 to 5 allowed for one pulse the screencast may split or merge) and B1's 24 rings (small pulses), then
// the values 0 and 0. A scene that hands over at once, repeats a pass, plays no click, draws no ring or no count-in
// cannot pass.
// The tapped run (review R1, MAJOR 2): the probe's tapper (src/probe/api.ts tapCalibration) presses around TAP_A_MS
// after each click, so A1 is accepted and the scene is left after it, with avOffset 0 and inputBias the taps' median.
// The fallback run (the owner's ruling N-F1 c; review R4's retried run before it): the tapper leaves pass A untapped and
// presses around TAP_B_MS + TAP_B_MID after each ring, so A1 is rejected, B1 accepted, and the scene is left after both
// with avOffset 0 and inputBias B1's median. Review R2 (MINOR 3): the values in use are judged against the taps the
// tapper actually landed (its log: each tap's time stamp, its heard time and the attempt it fell in, each attempt's t0,
// p0 and frameTimes), matched, judged and calibrated as section 12 does (tapLogValues, through
// tests/fixtures/calibration/reference.mjs): equal within TAP_EXACT_MS. A run whose taps strayed more than TAP_STRAY_MS
// from their marks is refused, so a page whose timers ran late cannot fail a correct scene, nor pass one by luck. And
// (MAJOR 4) once the scene is left, a run at room 1 must be running.
// Review R3: Escape is never a key of the calibration (sections 3, 8.2 and 12). The untouched run presses it before
// its first key and wants no audio started (MINOR 5). The tapper also taps every count-in click and ring, presses Escape
// three times in each attempt and spreads its counted taps, so a scene that admits a count-in tap (MINOR 6) or takes
// Escape as a tap gives values off the taps' own; and its log must show that it did. Review R6 (MINOR 2, carried as R8's
// MINOR 10): it also sends three key repeats in each attempt, which no scene may count.
// Review R4 (MAJOR 1): every click of pass A, in each of the three runs, must start on the mark the scene judges taps by
// (clickStartProblems), read from the starts the page records, so a click that sounds off its mark cannot pass.
// Review R5 (MAJOR 1): every picture, in each of the three runs, must show when section 12 says, held to the same marks
// (calibFrameProblems): each frame of the scene is logged between Phaser's prestep and poststep, so the scene's own
// frameMs and heard time lie in a known bracket. The waiting key's presses, pass A's count-in fills, pass B's rings and
// frameTimes, and each attempt's row are held to their windows, and (review R8, MINOR 4) each attempt to its end, so a
// picture shown off the time the scene judges taps by cannot pass.
import { calibrate, judgePass } from '../tests/fixtures/calibration/reference.mjs';
import { luminance } from './flash-analyzer.mjs';
import { isVoiceStart, textProblems } from './probe-lib.mjs';
import { bufferDifference, CMD, encodeShapes } from './scene-check.mjs';

export const BEAT_S = 60 / 140;
// The untouched run's two attempts of 23 beats (A1 and B1), the least time the scene stays up after its first key.
export const MIN_SECONDS = 19.7;
export const WANT = Object.freeze({ clicks: [20, 28], fills: [3, 5], rings: [20, 28] });
export const TAP_A_MS = 40;
export const TAP_B_MS = 25;
// Review R3 (MINOR 6): the tapper spreads pass A's taps evenly around TAP_A_MS and pass B's from TAP_B_MS to
// TAP_B_MS + 19 (src/probe/api.ts), so the marks the taps' values are held to are the medians, TAP_A_MS and
// TAP_B_MS + TAP_B_MID.
export const TAP_B_MID = 9.5;
export const TAP_EXACT_MS = 0.5;
export const TAP_STRAY_MS = 15;
// The tapped run is left after A1 alone, the fallback run after A1 and B1.
export const TAPPED_SECONDS = Object.freeze([10, 15]);
export const FALLBACK_SECONDS = Object.freeze([MIN_SECONDS, 30]);
// What the tapper must have done in each attempt it tapped (review R3, MINOR 5 and 6; review R6, MINOR 2).
export const TAPPER_WANTS = Object.freeze({ countIn: 4, escapes: 3, repeats: 3 });
const COUNT_IN = 4;
const CLICKS = 24;
// The row: one dot for each counted click or ring, COUNT_IN to CLICKS - 1.
export const ROW_DOTS = CLICKS - COUNT_IN;
// A click starts when the analyser's peak reaches CLICK_ON from below CLICK_OFF.
export const CLICK_ON = 0.05;
export const CLICK_OFF = 0.02;
// The box around the key shape and the ring, in canvas px; a pulse is a run of frames whose luminance in the
// box stands PULSE_ON canvas px or more above its resting level (the median frame: the stimuli are up about a
// seventh of the time, and the frames of the next scene that the window may catch sit below it); a pulse
// whose peak reaches FILL_SHARE of the largest pulse is a fill, any other a ring. The row lies below the box.
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

// Review R4 (MAJOR 1): when each click is handed over. A click is a voice start (probe-lib isVoiceStart) that reaches the
// speakers through no layer gate (layer 0: the calibration orbit, wired straight into the compressor, section 8.3). In
// every pass-A attempt the probe saw, each click i (0 to 23) must have a click start within CLICK_START_MS of
// t0 + i x BEAT, and every click start from half a beat before t0 to half a beat after click 23 must sit on one of those
// marks. Starts are matched by time, never through the analyser's click count (review R4, NOTE 1).
export const CLICK_START_MS = 1;
export function clickStartProblems(starts, attempts, name) {
  if (!Array.isArray(starts)) return { problems: [`${name} click starts: the probe recorded no start`], clicks: 0, marks: 0 };
  const clicks = starts.filter((s) => isVoiceStart(s) && s.layer === 0);
  const passA = (attempts || []).filter((a) => a && a.pass === 'A' && typeof a.t0 === 'number');
  if (!passA.length) return { problems: [`${name} click starts: no pass-A attempt to hold the clicks to`], clicks: 0, marks: 0 };
  const tol = CLICK_START_MS / 1000;
  const problems = [];
  let on = 0;
  passA.forEach((a, n) => {
    const marks = Array.from({ length: CLICKS }, (_, i) => a.t0 + i * BEAT_S);
    const mine = clicks.filter((s) => s.when >= a.t0 - BEAT_S / 2 && s.when < a.t0 + (CLICKS - 0.5) * BEAT_S);
    const offMarks = mine.filter((s) => !marks.some((m) => Math.abs(s.when - m) <= tol));
    const started = marks.filter((m) => mine.some((s) => Math.abs(s.when - m) <= tol)).length;
    on += started;
    if (offMarks.length || started < CLICKS) {
      const first = offMarks[0];
      const from = first ? (first.when - marks.reduce((b, m) => (Math.abs(first.when - m) < Math.abs(first.when - b) ? m : b))) * 1000 : null;
      problems.push(`${name} click starts: A${n + 1} has ${started} of ${CLICKS} clicks started on their marks and ${offMarks.length} off them${from === null ? '' : ` (the first ${from >= 0 ? '+' : ''}${from.toFixed(1)} ms from its mark)`} (want each click started within ${CLICK_START_MS} ms of t0 + i x BEAT)`);
    }
  });
  return { problems, clicks: on, marks: passA.length * CLICKS };
}

// Review R5 (MAJOR 1): when each picture shows. The probe logs every frame of the scene `calibration` (src/probe/api.ts
// calibLogTake): performance.now() and the heard time at Phaser's prestep and at its poststep, between which the scene read
// its frameMs and its heard time (no timer runs inside the frame, so both ends use the clock line the scene used), the
// attempt live at each end, and each Graphics as drawn. A frame is drawn for the attempt live at its poststep. Frames
// before the first attempt are the waiting frames; an attempt's last frame and the frames between attempts are drawn for
// none; the scene's very last frame, in which it hands over, is logged without its Graphics (`left`) and judged for its
// attempt's end alone. Every Graphics that shows must hold one of section 12's pictures as Phaser 4.2.1 encodes them
// (CALIB_DRAW and rowDraw), or nothing (no command but styles), and the key shape must show in every frame. Then:
// - waiting (the owner's ruling N-F1 c): the key pressed if and only if frameMs mod BEAT < SIXTEENTH, no ring, no row;
// - pass A: the key filled if and only if t0 + i x BEAT <= heard < t0 + i x BEAT + SIXTEENTH for some i below COUNT_IN,
//   never pressed, no ring, and the row with as many dots filled as counted clicks have passed (heard >= t0 + (COUNT_IN +
//   j) x BEAT for dot j);
// - pass B: the ring if and only if d_i <= frameMs < d_i + SIXTEENTH for some i, the key plain, the row with as many dots
//   filled as counted rings are due (frameMs >= p0 + (COUNT_IN + j) x BEAT for dot j), and each frameTimes[i] in its
//   window and in the bracket of the first frame that drew ring i (absent when none did);
// - for no attempt after the first: the key plain, no ring and no row;
// - (review R8, MINOR 4) each attempt live in every frame read before its end (heard >= t0 + 23 x BEAT + TAIL in pass A,
//   frameMs >= p0 + (23 x BEAT + TAIL) in pass B) and ended in the first frame read at or past it.
// A picture whose window's edge lies inside a frame's bracket is not judged in that frame, nor a frame of an attempt whose
// heard time could not be read at either end (the scene then decides nothing). Each attempt must have CALIB_MIN_FRAMES
// frames judged, its row judged as often, pass A's CALIB_MIN_FILL_FRAMES of them filled and pass B's
// CALIB_MIN_RING_FRAMES with the ring; with `waiting` (the untouched run, whose log starts before its first key)
// CALIB_MIN_WAIT_FRAMES waiting frames judged and CALIB_MIN_PRESS_FRAMES of them pressed, so the check never passes
// what it did not watch.
const SIXTEENTH_S = BEAT_S / 4;
const TAIL_S = BEAT_S / 2;
export const CALIB_MIN_FRAMES = 200;
export const CALIB_MIN_FILL_FRAMES = 8;
export const CALIB_MIN_RING_FRAMES = 48;
export const CALIB_MIN_WAIT_FRAMES = 30;
export const CALIB_MIN_PRESS_FRAMES = 4;
const CAL_COLOUR = 0x7fd6ff;
const TAU = Math.PI * 2;
const KEY_BOX = Object.freeze({ x: 600, y: 320, w: 80, h: 80, r: 14 });
// The pressed key: the key shape drawn 4 px lower, filled (the owner's ruling N-F1 c).
const KEY_PRESSED = Object.freeze({ ...KEY_BOX, y: KEY_BOX.y + 4 });
const PI_2 = Math.PI / 2;
// The row: dot j at (ROW_X0 + j x ROW_DX, ROW_Y), radius ROW_R; filled at alpha 0.8, open a 2 px stroke at alpha 0.25.
export const ROW = Object.freeze({ x0: 488, dx: 16, y: 440, r: 4, fillAlpha: 0.8, lineWidth: 2, lineAlpha: 0.25 });

// Graphics.fillRoundedRect(x, y, w, h, r) of Phaser 4.2.1 (src/gameobjects/graphics/Graphics.js) with one positive radius:
// one path from the top edge round the four corners, each corner an ARC, filled.
function fillRoundedRect({ x, y, w, h, r }) {
  const arc = (cx, cy, a0, a1) => [CMD.ARC, cx, cy, r, a0, a1, false, 0];
  return [CMD.BEGIN_PATH, CMD.MOVE_TO, x + r, y, CMD.LINE_TO, x + w - r, y, ...arc(x + w - r, y + r, -PI_2, 0),
    CMD.LINE_TO, x + w, y + h - r, ...arc(x + w - r, y + h - r, 0, PI_2), CMD.LINE_TO, x + r, y + h, ...arc(x + r, y + h - r, PI_2, Math.PI),
    CMD.LINE_TO, x, y + r, ...arc(x + r, y + r, -Math.PI, -PI_2), CMD.FILL_PATH];
}

// Graphics.strokeRoundedRect: the same outline with a MOVE_TO after every LINE_TO and the radius at most half the shorter
// side, stroked.
function strokeRoundedRect({ x, y, w, h, r: radius }) {
  const r = Math.min(radius, Math.min(w, h) / 2);
  const arc = (cx, cy, a0, a1) => [CMD.ARC, cx, cy, r, a0, a1, false, 0];
  const side = (px, py) => [CMD.LINE_TO, px, py, CMD.MOVE_TO, px, py];
  return [CMD.BEGIN_PATH, CMD.MOVE_TO, x + r, y, ...side(x + w - r, y), ...arc(x + w - r, y + r, -PI_2, 0),
    ...side(x + w, y + h - r), ...arc(x + w - r, y + h - r, 0, PI_2), ...side(x + r, y + h), ...arc(x + r, y + h - r, PI_2, Math.PI),
    ...side(x, y + r), ...arc(x + r, y + r, -Math.PI, -PI_2), CMD.STROKE_PATH];
}

// Section 12's pictures as a Graphics cleared with no default style holds them: the key shape plain (its 3 px stroke at
// alpha 0.8), filled (the fill at alpha 0.6 under the stroke) or pressed (filled, 4 px lower), and the ring (a 3 px stroke
// at alpha 1, strokeCircle).
const keyDraw = (box, filled) => [...(filled ? [CMD.FILL_STYLE, CAL_COLOUR, 0.6, ...fillRoundedRect(box)] : []), CMD.LINE_STYLE, 3, CAL_COLOUR, 0.8, ...strokeRoundedRect(box)];
export const CALIB_DRAW = Object.freeze({
  keyPlain: Object.freeze(keyDraw(KEY_BOX, false)),
  keyFilled: Object.freeze(keyDraw(KEY_BOX, true)),
  keyPressed: Object.freeze(keyDraw(KEY_PRESSED, true)),
  ring: Object.freeze(encodeShapes([{ k: 'ring', x: 640, y: 360, r: 50, lw: 3, c: CAL_COLOUR, a: 1 }])),
});

// The row with its first n dots filled, as one Graphics draws it: for j from 0 to ROW_DOTS - 1 in order, fillStyle then
// fillCircle for a filled dot, lineStyle then strokeCircle for an open one.
export function rowDraw(n) {
  const out = [];
  for (let j = 0; j < ROW_DOTS; j++) {
    const x = ROW.x0 + j * ROW.dx;
    if (j < n) out.push(CMD.FILL_STYLE, CAL_COLOUR, ROW.fillAlpha, CMD.BEGIN_PATH, CMD.ARC, x, ROW.y, ROW.r, 0, TAU, false, 0, CMD.FILL_PATH);
    else out.push(CMD.LINE_STYLE, ROW.lineWidth, CAL_COLOUR, ROW.lineAlpha, CMD.BEGIN_PATH, CMD.ARC, x, ROW.y, ROW.r, 0, TAU, false, 0, CMD.STROKE_PATH);
  }
  return out;
}
const ROW_BUFFERS = Object.freeze(Array.from({ length: ROW_DOTS + 1 }, (_, n) => Object.freeze(rowDraw(n))));

// A buffer of style commands alone draws nothing. Phaser 4.2.1 builds a Graphics with a default line and fill style in its
// buffer ([LINE_STYLE, 1, 0, 0, FILL_STYLE, 0, 0]) until its first clear(), so a Graphics the scene has not drawn yet holds
// exactly that.
function stylesOnly(buffer) {
  for (let i = 0; i < buffer.length;) {
    if (buffer[i] === CMD.LINE_STYLE) i += 4;
    else if (buffer[i] === CMD.FILL_STYLE) i += 3;
    else return false;
  }
  return true;
}

// What one logged Graphics shows: 'hidden', 'empty', one of CALIB_DRAW's names, `row:<n>`, or a phrase naming what it
// shows instead.
function drawnKind(e) {
  if (!e || !Array.isArray(e.buffer)) return 'a Graphics whose commands could not be read';
  if (e.visible === false || !(e.alpha > 0)) return 'hidden';
  if (stylesOnly(e.buffer)) return 'empty';
  let k = Object.keys(CALIB_DRAW).find((n) => !bufferDifference(e.buffer, CALIB_DRAW[n]));
  if (!k) {
    const n = ROW_BUFFERS.findIndex((b) => !bufferDifference(e.buffer, b));
    if (n >= 0) k = `row:${n}`;
  }
  if (!k) return `a Graphics drawing what section 12 does not draw (${e.buffer.length} entries)`;
  if (e.alpha !== 1) return `the ${k === 'ring' ? 'ring' : k.startsWith('row') ? 'row' : 'key shape'} at alpha ${e.alpha}`;
  return k;
}

// What a frame shows, from its Graphics: the key shape's state (keyPlain, keyFilled or keyPressed), how many key shapes,
// rings and rows, the row's filled dots, and anything else that shows. Frames share a few Graphics, so each set is
// classified once.
function framePictures(graphics) {
  const kinds = graphics.map(drawnKind);
  const seen = new Map();
  return (f) => {
    const id = (f.g || []).join(',');
    let s = seen.get(id);
    if (!s) {
      s = { key: null, keys: 0, rings: 0, rows: 0, dots: null, odd: null };
      for (const n of f.g || []) {
        const k = kinds[n];
        if (k === 'hidden' || k === 'empty') continue;
        if (k === 'keyPlain' || k === 'keyFilled' || k === 'keyPressed') { s.keys += 1; s.key = k; }
        else if (k === 'ring') s.rings += 1;
        else if (typeof k === 'string' && k.startsWith('row:')) { s.rows += 1; s.dots = Number(k.slice(4)); }
        else if (!s.odd) s.odd = k === undefined ? `a Graphics the log does not hold (${n})` : k;
      }
      seen.set(id, s);
    }
    return s;
  };
}

// The window of section 12 holding a time: pass A's count-in fill i (heard seconds from t0), pass B's ring i (performance
// ms from p0); -1 for none. The waiting key's press: a sixteenth from each beat line of performance time.
function fillWindow(t0, h) {
  for (let i = 0; i < COUNT_IN; i++) if (h >= t0 + i * BEAT_S && h < t0 + i * BEAT_S + SIXTEENTH_S) return i;
  return -1;
}
function ringWindow(p0, ms) {
  for (let i = 0; i < CLICKS; i++) if (ms >= p0 + i * BEAT_S * 1000 && ms < p0 + (i * BEAT_S + SIXTEENTH_S) * 1000) return i;
  return -1;
}
const BEAT_MS = BEAT_S * 1000;
const phaseMs = (ms) => ((ms % BEAT_MS) + BEAT_MS) % BEAT_MS;
const pressWindow = (ms) => phaseMs(ms) < SIXTEENTH_S * 1000;
// The dots filled at a time: pass A's from t0 in heard seconds, pass B's from p0 in performance ms.
function dotsAt(from, t, scale) {
  let n = 0;
  for (let j = 0; j < ROW_DOTS; j++) if (t >= from + (COUNT_IN + j) * BEAT_S * scale) n = j + 1;
  return n;
}
// The nearest mark of an attempt to a time, as [i, offset in ms].
function nearestMark(h, t0, n, scale) {
  const i = Math.max(0, Math.min(n - 1, Math.round((h - t0) / (BEAT_S * scale))));
  return [i, ((h - t0) / scale - i * BEAT_S) * 1000];
}
const signed = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} ms`;

// Each kind of problem is said once, at its first frame, with the count of the frames that repeat it.
export const CALIB_FRAME_PROBLEMS_MAX = 8;

export function calibFrameProblems(log, attempts, name, { waiting = false } = {}) {
  const problems = [];
  const out = { problems, judged: 0, fills: 0, rings: 0, rows: 0, waited: 0, pressed: 0 };
  const seen = new Map();
  const note = (kind, s) => {
    const p = seen.get(kind);
    if (p) p.n += 1;
    else seen.set(kind, { s, n: 1 });
  };
  const finish = () => {
    for (const { s, n } of seen.values()) {
      if (problems.length >= CALIB_FRAME_PROBLEMS_MAX) break;
      problems.push(`${name} frames: ${s}${n > 1 ? ` (and ${n - 1} more like it)` : ''}`);
    }
    return out;
  };
  if (!log || !Array.isArray(log.frames) || !log.frames.length || !Array.isArray(log.graphics)) {
    problems.push(`${name} frames: the probe logged no frame of the scene calibration`);
    return out;
  }
  const list = Array.isArray(attempts) ? attempts : [];
  if (!list.length) {
    note('attempts', 'no attempt to hold the frames to');
    return finish();
  }
  if (log.dropped) note('dropped', `the log dropped ${log.dropped} frames`);
  const counts = {};
  const labels = list.map((a) => `${a.pass}${(counts[a.pass] = (counts[a.pass] || 0) + 1)}`);
  const pictures = framePictures(log.graphics);
  const per = list.map(() => ({ judged: 0, fills: 0, rings: 0, rows: 0, ended: false }));
  const timed = (f) => typeof f.pre === 'number' && typeof f.post === 'number';
  const heardBoth = (f) => typeof f.hPre === 'number' && typeof f.hPost === 'number';
  // The row of an attempt's frame, judged where the count of dots is the same at both ends of the bracket.
  const judgeRow = (k, label, s, lo, hi, from, scale, unit) => {
    const n = dotsAt(from, lo, scale);
    if (n !== dotsAt(from, hi, scale)) return;
    per[k].rows += 1;
    out.rows += 1;
    if (s.rows !== 1) note(`${label} row`, `${label}: a frame shows ${s.rows} rows (want the row of ${ROW_DOTS} dots in every frame of an attempt)`);
    else if (s.dots !== n) {
      const [i, off] = nearestMark(lo, from, CLICKS, scale);
      note(`${label} dots`, `${label}: a frame ${unit}${signed(off)} from ${label.startsWith('A') ? 'click' : 'ring'} ${i} shows ${s.dots} dots filled (want ${n}: a dot fills once its ${label.startsWith('A') ? 'click' : 'ring'} has passed)`);
    }
  };
  let begun = false;
  for (const f of log.frames) {
    const k = typeof f.aPost === 'number' ? f.aPost : -1;
    const kPre = typeof f.aPre === 'number' ? f.aPre : -1;
    const wasWaiting = !begun && k < 0 && kPre < 0;
    if (k >= 0 || kPre >= 0) begun = true;
    const lacking = [k, kPre].find((n) => n >= 0 && !list[n]);
    if (lacking !== undefined) { note('record', `a frame names attempt ${lacking}, which the record lacks`); continue; }
    const a = k >= 0 ? list[k] : null;
    // Review R8 (MINOR 4): the attempt live before its end and ended by the first frame read at or past it.
    if (kPre >= 0) {
      const b = list[kPre];
      const end = b.pass === 'A' ? (typeof b.t0 === 'number' ? b.t0 + 23 * BEAT_S + TAIL_S : null) : (typeof b.p0 === 'number' ? b.p0 + (23 * BEAT_S + TAIL_S) * 1000 : null);
      const lo = b.pass === 'A' ? f.hPre : f.pre;
      const hi = b.pass === 'A' ? f.hPost : f.post;
      if (end !== null && typeof lo === 'number' && typeof hi === 'number') {
        const unit = b.pass === 'A' ? 1000 : 1;
        if (k === kPre && lo >= end) note(`${labels[kPre]} late end`, `${labels[kPre]}: the attempt is still up in a frame ${b.pass === 'A' ? 'heard ' : ''}${signed((lo - end) * unit)} past its end (want it ended on the first frame at or past t0 + 23 x BEAT + TAIL)`);
        if (k !== kPre && hi < end) note(`${labels[kPre]} early end`, `${labels[kPre]}: the attempt ended in a frame ${b.pass === 'A' ? 'heard ' : ''}${signed((hi - end) * unit)} from its end (want it up until 23 beats and a half past its first click)`);
      }
      if (k !== kPre) per[kPre].ended = true;
    }
    // The scene's last frame: it handed over inside its update, so the log holds the frame's times and attempts, its
    // Graphics already gone with the scene (src/probe/api.ts, `left`).
    if (f.left) continue;
    if (!timed(f)) continue;
    const s = pictures(f);
    if (s.odd) { note('odd', `a frame shows ${s.odd}`); continue; }
    if (s.keys !== 1) { note('keys', `a frame shows ${s.keys} key shapes (want the key shape in every frame, section 12)`); continue; }
    const filled = s.key === 'keyFilled';
    const pressed = s.key === 'keyPressed';
    const ring = s.rings > 0;
    if (!a) {
      if (wasWaiting) {
        // The owner's ruling N-F1 c: the waiting key, pressed for a sixteenth from each beat line of performance time.
        const w = pressWindow(f.pre);
        if (w !== pressWindow(f.post)) continue;
        out.waited += 1;
        if (pressed) out.pressed += 1;
        if (pressed !== w) {
          const ph = phaseMs(f.pre);
          const off = ph > BEAT_MS / 2 ? ph - BEAT_MS : ph;
          note(w ? 'waiting plain' : 'waiting pressed', `a waiting frame ${signed(off)} from a beat line shows the key ${s.key === 'keyPlain' ? 'plain' : s.key === 'keyFilled' ? 'filled' : 'pressed'} (want it pressed for a sixteenth from each beat line, and plain otherwise, until the first attempt)`);
        }
        if (ring || s.rows) note('waiting picture', `a waiting frame shows ${ring ? 'the ring' : 'the row'} (want the key alone until the first attempt)`);
        continue;
      }
      out.judged += 1;
      if (filled || pressed || ring || s.rows) note('none', `a frame drawn for no attempt shows ${filled ? 'the key filled' : pressed ? 'the key pressed' : ring ? 'the ring' : 'the row'} (want the key plain, no ring and no row between attempts and on an attempt's last frame)`);
      continue;
    }
    const label = labels[k];
    if (pressed) note(`${label} pressed`, `${label}: a frame shows the key pressed (want it pressed only while the scene waits for its first attempt)`);
    if (a.pass === 'A') {
      if (typeof a.t0 !== 'number') { note(`${label} t0`, `${label} has no t0`); continue; }
      if (!heardBoth(f)) continue;
      if (ring) note(`${label} ring`, `${label}: a frame shows the ring (want no ring in pass A)`);
      judgeRow(k, label, s, f.hPre, f.hPost, a.t0, 1, 'heard ');
      const w = fillWindow(a.t0, f.hPre);
      if (w !== fillWindow(a.t0, f.hPost)) continue;
      out.judged += 1;
      per[k].judged += 1;
      if (filled) { out.fills += 1; per[k].fills += 1; }
      if (filled !== (w >= 0)) {
        const [i, off] = nearestMark(f.hPre, a.t0, COUNT_IN, 1);
        if (w >= 0) note(`${label} plain`, `${label}: a frame heard ${signed(off)} from count-in click ${i} shows the key ${pressed ? 'pressed' : 'plain'} (want it filled for a sixteenth from each count-in click)`);
        else note(`${label} filled`, `${label}: a frame heard ${signed(off)} from count-in click ${i} shows the key filled (want it filled only for a sixteenth from each count-in click)`);
      }
    } else {
      if (typeof a.p0 !== 'number') { note(`${label} p0`, `${label} has no p0`); continue; }
      if (!heardBoth(f)) continue;
      if (filled) note(`${label} filled`, `${label}: a frame shows the key filled (want it plain in pass B)`);
      if (s.rings > 1) note(`${label} rings`, `${label}: a frame shows ${s.rings} rings`);
      judgeRow(k, label, s, f.pre, f.post, a.p0, 1000, '');
      const w = ringWindow(a.p0, f.pre);
      if (w !== ringWindow(a.p0, f.post)) continue;
      out.judged += 1;
      per[k].judged += 1;
      if (ring) { out.rings += 1; per[k].rings += 1; }
      if (ring !== (w >= 0)) {
        const [i, off] = nearestMark(f.pre / 1000, a.p0 / 1000, CLICKS, 1);
        if (w >= 0) note(`${label} no ring`, `${label}: a frame ${signed(off)} from ring ${i}'s due time shows no ring (want the ring for a sixteenth from each due time)`);
        else note(`${label} ring`, `${label}: a frame ${signed(off)} from ring ${i}'s due time shows the ring (want it only for a sixteenth from each due time)`);
      }
    }
  }
  // frameTimes: each the frameMs of the first frame that drew its ring, inside its window.
  list.forEach((a, k) => {
    if (a.pass !== 'B' || typeof a.p0 !== 'number') return;
    const times = Array.isArray(a.frameTimes) ? a.frameTimes : [];
    for (let i = 0; i < CLICKS; i++) {
      const d = a.p0 + i * BEAT_S * 1000;
      const end = d + SIXTEENTH_S * 1000;
      const first = log.frames.find((f) => f.aPost === k && heardBoth(f) && timed(f) && f.post >= d && f.pre < end && pictures(f).rings > 0);
      const t = typeof times[i] === 'number' ? times[i] : null;
      if (!first) {
        if (t !== null) note(`${labels[k]} undrawn`, `${labels[k]}: frameTimes[${i}] is ${signed(t - d)} from its due time, but no frame drew ring ${i}`);
      } else if (t === null || t < first.pre || t > first.post || t < d || t >= end) {
        note(`${labels[k]} frameTimes`, `${labels[k]}: frameTimes[${i}] is ${t === null ? 'missing' : `${signed(t - d)} from its due time`}, but the first frame that drew ring ${i} ran ${signed(first.pre - d)} to ${signed(first.post - d)} from it (want that frame's frameMs)`);
      }
    }
  });
  list.forEach((a, k) => {
    const p = per[k];
    if (p.judged < CALIB_MIN_FRAMES) note(`${labels[k]} few`, `${labels[k]}: ${p.judged} frames judged (want at least ${CALIB_MIN_FRAMES})`);
    else if (a.pass === 'A' && p.fills < CALIB_MIN_FILL_FRAMES) note(`${labels[k]} few`, `${labels[k]}: ${p.fills} frames judged with the key filled (want at least ${CALIB_MIN_FILL_FRAMES})`);
    else if (a.pass === 'B' && p.rings < CALIB_MIN_RING_FRAMES) note(`${labels[k]} few`, `${labels[k]}: ${p.rings} frames judged with the ring (want at least ${CALIB_MIN_RING_FRAMES})`);
    else if (p.rows < CALIB_MIN_FRAMES) note(`${labels[k]} few`, `${labels[k]}: ${p.rows} frames with the row judged (want at least ${CALIB_MIN_FRAMES})`);
    if (!p.ended) note(`${labels[k]} unended`, `${labels[k]}: no logged frame ends the attempt`);
  });
  if (waiting) {
    if (out.waited < CALIB_MIN_WAIT_FRAMES) note('waiting few', `${out.waited} waiting frames judged (want at least ${CALIB_MIN_WAIT_FRAMES} before the first attempt)`);
    else if (out.pressed < CALIB_MIN_PRESS_FRAMES) note('waiting few', `${out.pressed} waiting frames judged with the key pressed (want at least ${CALIB_MIN_PRESS_FRAMES})`);
  }
  return finish();
}

// The owner's ruling N-F1 c (2026-10-19): the page line under the canvas while the calibration is up, and gone once the
// scene is left. `lines` holds the page's texts (src/probe/api.ts pageTexts) read before the first key and after the
// hand-over.
export function lineProblems(lines, name) {
  if (!lines || !lines.before || !lines.after) return [`${name} line: the page texts were not read before the first key and after the hand-over`];
  const before = textProblems(lines.before, { calibrationLine: true });
  const after = textProblems(lines.after);
  return [
    ...before.map((p) => `${name} line: before the first key: ${p}`),
    ...after.map((p) => `${name} line: after the hand-over: ${p}`),
  ];
}

// The verdict on one untouched calibration: seconds the scene stayed up after the first key, the analyser samples and the
// centre trace taken from its first attempt until it was left, the values in use once it was left, (review R3, MINOR 5)
// what the page showed after Escape was pressed before the first key ({ started, scenes }: whether the audio ran),
// (review R4, MAJOR 1) the starts the page recorded and the attempts the probe watched, (review R5, MAJOR 1) the scene's
// frame log, from before its first key, and (the owner's ruling N-F1 c) the page texts before the key and after the
// hand-over.
export function judgeCalibration({ seconds, samples, trace, values, escape, starts, attempts, frames, lines }) {
  const clicks = countClicks(samples);
  const { fills, rings, peaks, rest } = countPulses(trace);
  const problems = [];
  if (!escape) problems.push('calibration: Escape was not pressed before the first key');
  else if (escape.started || !escape.scenes.includes('calibration')) problems.push(`calibration: Escape started the audio or left the scene (audio ${escape.started ? 'started' : 'not started'}, scenes ${JSON.stringify(escape.scenes)}; want the scene waiting for its first key)`);
  if (!(seconds >= MIN_SECONDS)) problems.push(`calibration left after ${seconds.toFixed(1)} s (want at least ${MIN_SECONDS} s: A1 and B1, 23 beats apiece)`);
  const range = (name, n) => {
    const [lo, hi] = WANT[name];
    if (n < lo || n > hi) problems.push(`calibration ${name} ${n} (want ${lo} to ${hi})`);
  };
  range('clicks', clicks);
  range('fills', fills);
  range('rings', rings);
  if (!values || values.avOffset !== 0 || values.inputBias !== 0) problems.push(`calibration values ${JSON.stringify(values)} (want avOffset 0 and inputBias 0 after an untouched run)`);
  const ran = (attempts || []).map((a) => a.pass).join(', ');
  if (ran !== 'A, B') problems.push(`calibration: the scene ran ${ran || 'no attempt'} (want A1, then B1 after its rejection, and no repeat)`);
  const cs = clickStartProblems(starts, attempts, 'calibration');
  problems.push(...cs.problems);
  const cf = calibFrameProblems(frames, attempts, 'calibration', { waiting: true });
  problems.push(...cf.problems);
  problems.push(...lineProblems(lines, 'calibration'));
  return { seconds: Math.round(seconds * 10) / 10, clicks, fills, rings, values, escape: escape ? !escape.started : null, frames: trace.length, samples: samples.length, rest, peaks: peaks.slice(0, 80), clickStarts: cs.clicks, clickMarks: cs.marks, ...timedOf(cf), problems };
}

// The frame counts a verdict reports (the flash probe's `frames ... timed` line).
function timedOf(cf) {
  return { timed: cf.judged, timedFills: cf.fills, timedRings: cf.rings, timedRows: cf.rows, timedWaiting: cf.waited, timedPressed: cf.pressed };
}

// What the tapper did in attempt k of its log (review R3, MINOR 5 and 6; review R6, MINOR 2): its taps before the
// count-in's end, which a scene must not count, all its taps, its Escapes and its key repeats.
function tapperDid(log, k) {
  const a = log.attempts[k];
  const before = (t) => (a.pass === 'A' ? t.h < a.t0 + (COUNT_IN - 0.5) * BEAT_S : t.t < a.p0 + (COUNT_IN - 0.5) * BEAT_S * 1000);
  const mine = log.taps.filter((t) => t.attempt === k);
  const count = (xs) => (xs || []).filter((t) => t.attempt === k).length;
  return { countIn: mine.filter(before).length, taps: mine.length, escapes: count(log.escapes), repeats: count(log.repeats) };
}

// The nearest value of xs to v (ties to the earlier), skipping holes; null when there is none (section 12).
function nearest(xs, v) {
  let best = null;
  for (const x of xs) if (x !== undefined && x !== null && (best === null || Math.abs(v - x) < Math.abs(v - best))) best = x;
  return best;
}

// The values section 12 gives for the taps of a tapper's log: each attempt's taps (those that landed while it was up,
// past the count-in and, review R8's MINOR 4, before its end) matched to its clicks 4 to 23 in heard time (pass A) or to
// its drawn rings 4 to 23 in performance time (pass B), then judgePass per attempt and calibrate (its one-pass rule) of
// the first attempt of each pass, the only one section 12 runs.
export function tapLogValues(log) {
  const passes = { A: [], B: [] };
  log.attempts.forEach((a, k) => {
    const taps = log.taps.filter((t) => t.attempt === k);
    const offsets = [];
    if (a.pass === 'A') {
      const clicks = [];
      for (let i = COUNT_IN; i < CLICKS; i++) clicks.push(a.t0 + i * BEAT_S);
      const end = a.t0 + 23 * BEAT_S + TAIL_S;
      for (const t of taps) if (t.h >= a.t0 + (COUNT_IN - 0.5) * BEAT_S && t.h < end) offsets.push((t.h - (nearest(clicks, t.h) ?? t.h)) * 1000);
    } else {
      const drawn = (a.frameTimes || []).slice(COUNT_IN);
      const end = a.p0 + (23 * BEAT_S + TAIL_S) * 1000;
      for (const t of taps) {
        if (!(t.t >= a.p0 + (COUNT_IN - 0.5) * BEAT_S * 1000 && t.t < end)) continue;
        const f = nearest(drawn, t.t);
        if (f !== null) offsets.push(t.t - f);
      }
    }
    passes[a.pass].push(judgePass(offsets));
  });
  const first = (p) => passes[p][0] || judgePass([]);
  return { values: calibrate(first('A'), first('B')), passes };
}

// The verdict on one tapped calibration: seconds the scene stayed up after the first key, the values in use once it was
// left, the tapper's log, the run read twice after the hand-over ({ scenes, room, from, to }), and the page texts before
// the key and after the hand-over. The tapped run taps pass A, so A1 must be accepted and the scene left after it; with
// `fallback` (the owner's ruling N-F1 c) the tapper left pass A untapped, so A1 must be rejected, B1 run and accepted. And
// (review R4, MAJOR 1) the starts the page recorded: every pass-A attempt of the log must have its clicks on their marks;
// and (review R5, MAJOR 1) the scene's frame log: every attempt of the log must show its pictures in their windows.
export function judgeTapped({ seconds, values, log, handover, fallback = false, starts, frames, lines }) {
  const name = fallback ? 'fallback calibration' : 'tapped calibration';
  const marks = { avOffset: 0, inputBias: fallback ? TAP_B_MS + TAP_B_MID : TAP_A_MS };
  const problems = [];
  const [lo, hi] = fallback ? FALLBACK_SECONDS : TAPPED_SECONDS;
  if (!(seconds >= lo && seconds <= hi)) problems.push(`${name} left after ${seconds.toFixed(1)} s (want ${lo} to ${hi} s: ${fallback ? 'A1 rejected, then B1 accepted' : 'A1 accepted, and no pass B'})`);
  const fmt = (v) => (v && Number.isFinite(v.avOffset) && Number.isFinite(v.inputBias) ? `${v.avOffset.toFixed(1)} ${v.inputBias.toFixed(1)}` : 'none');
  let own = null;
  if (!log || !log.attempts || !log.attempts.length) problems.push(`${name}: the tapper logged no attempt`);
  else {
    const r = tapLogValues(log);
    own = r.values;
    const ran = log.attempts.map((a) => a.pass).join(', ');
    const judged = r.passes[fallback ? 'B' : 'A'][0];
    const a1 = r.passes.A[0];
    const course = fallback ? ran === 'A, B' && a1 && !a1.accepted : ran === 'A' && a1 && a1.accepted;
    if (!course) problems.push(`${name}: the scene ran ${ran} with A1 ${a1 ? (a1.accepted ? 'accepted' : 'rejected') : 'missing'} (want ${fallback ? 'A1 rejected untapped, then B1' : 'A1 accepted, and no pass B'}: B only after a rejected A, no repeat)`);
    if (!judged || !judged.accepted) {
      problems.push(`${name}: the taps strayed, ${fallback ? 'B1' : 'A1'} judges ${judged ? `MAD ${judged.mad.toFixed(1)} on ${judged.taps} taps` : 'none'}`);
    } else if (!(Math.abs(own.avOffset - marks.avOffset) <= TAP_STRAY_MS && Math.abs(own.inputBias - marks.inputBias) <= TAP_STRAY_MS)) {
      problems.push(`${name}: the taps strayed from their marks, they give ${fmt(own)} (want within ${TAP_STRAY_MS} ms of ${marks.avOffset} ${marks.inputBias})`);
    }
    const off = (k) => (values && Number.isFinite(values[k]) ? Math.abs(values[k] - own[k]) : Infinity);
    if (!(off('avOffset') <= TAP_EXACT_MS && off('inputBias') <= TAP_EXACT_MS)) problems.push(`${name} values ${fmt(values)}, the taps' own ${fmt(own)} (want equal within ${TAP_EXACT_MS} ms)`);
    const did = log.attempts.map((_, k) => tapperDid(log, k));
    const untapped = log.attempts.map((a) => fallback && a.pass === 'A');
    if (!did.every((d, k) => (untapped[k] ? d.taps === 0 : d.countIn >= TAPPER_WANTS.countIn) && d.escapes >= TAPPER_WANTS.escapes && d.repeats >= TAPPER_WANTS.repeats)) {
      const show = (d) => `${d.taps} taps (${d.countIn} in the count-in), ${d.escapes} Escapes and ${d.repeats} repeats`;
      const want = fallback ? `no tap in A1, ${TAPPER_WANTS.countIn} count-in taps in B1, and ${TAPPER_WANTS.escapes} Escapes and ${TAPPER_WANTS.repeats} repeats in every attempt` : `${TAPPER_WANTS.countIn} count-in taps, ${TAPPER_WANTS.escapes} Escapes and ${TAPPER_WANTS.repeats} repeats in every attempt`;
      problems.push(`${name}: the tapper landed ${did.map(show).join('; ')} (want ${want})`);
    }
  }
  if (!handover || !handover.scenes.includes('play') || handover.room !== 1 || !(handover.to > handover.from)) {
    problems.push(`${name}: no run at room 1 after the hand-over (${handover ? `scenes ${JSON.stringify(handover.scenes)}, room ${handover.room}, step ${handover.from} then ${handover.to}` : 'not read'})`);
  }
  const cs = clickStartProblems(starts, log && log.attempts, name);
  problems.push(...cs.problems);
  const cf = calibFrameProblems(frames, log && log.attempts, name);
  problems.push(...cf.problems);
  problems.push(...lineProblems(lines, name));
  return { seconds: Math.round(seconds * 10) / 10, values, own, marks, clickStarts: cs.clicks, clickMarks: cs.marks, ...timedOf(cf), problems };
}
