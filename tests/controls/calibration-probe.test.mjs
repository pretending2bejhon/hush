// PF-CONTROLS for the flash probe's --calibration check (HUSH-SPEC section 12, CAL2): on the control page, whose
// calibration scene is section 12 itself, an untouched run, a tapped run and (the owner's ruling N-F1 c, 2026-10-19) a
// fallback run must pass; the first key leaving the scene at once (the shortcut that stood in for the passes before
// CAL2), pass A without its clicks, pass B without its rings and pass A without its count-in must each fail, for its own
// reason, and so must (review R1, MAJOR 2) pass A's tap offsets with their sign flipped (the tapped run) and a count-in of
// 3 beats. Review R2: the tapped run is judged against the values its logged taps give, and its hand-over must start a
// run at room 1. Review R3: a scene that takes Escape as a key (MINOR 5) and one that counts taps during the count-in
// (MINOR 6) must each fail. Review R4 (MAJOR 1): every click of the clean page starts on its mark in all three runs, and a
// scene whose clicks are handed over 0.1 s late must fail on their starts. Review R5 (MAJOR 1): every frame of the clean
// page shows its pictures in their windows in all three runs, and a scene whose rings show 0.1 s late, whose count-in
// fills show 0.1 s late, or whose frameTimes sit 0.1 s after the frames that drew their rings must each fail on its
// frames alone. Review R5 (NOTE 2): calibration pages that log a console error, ask another origin and store something
// must each fail on X5 and X10. The owner's ruling N-F1 c: pass B after an accepted pass A, a repeated pass A, the waiting
// key never pressed, no row, a row filling late, the page line kept or missing and the two-pass rule for a lone pass must
// each fail; and with it the carried minors of review R8: taps timed by the handler (MINOR 9), key repeats taken as taps
// (MINOR 10) and attempts ended a beat early (MINOR 4).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildPage, REPO } from '../../tools/probe-lib.mjs';

const CP = path.join(REPO, 'tests', 'fixtures', 'control-page');
let dist;
beforeAll(async () => {
  dist = await buildPage({ root: CP, outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'hush-cp-')), sha: 'c'.repeat(40) });
}, 120000);

function flash(query) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'probe-flash.mjs'), '--dist', dist, '--rooms', path.join(CP, 'rooms'),
    '--replays', path.join(CP, 'replays'), '--calibration', '--tail-seconds', '1', '--query', query], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

const T = 300000;
const IN_RANGE = '(2[0-8])';
// The values of a correct scene: the tapped run's A1 median about 40, the fallback run's B1 median about 34.5.
const A_VALUES = '0\\.0 (3\\d|4\\d)\\.\\d';
const B_VALUES = '0\\.0 (2\\d|3\\d|4[0-4])\\.\\d';
const RUNS = ['calibration', 'tapped calibration', 'fallback calibration'];

describe('flash probe --calibration (section 12)', () => {
  it('passes the control page\'s untouched calibration, its tapped one and its fallback', () => {
    const r = flash('');
    expect(r.out).toMatch(new RegExp(`flash: calibration up \\d+(\\.\\d)? s: clicks ${IN_RANGE}, count-in fills [3-5], rings ${IN_RANGE}, values 0 0, Escape ignored`));
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration up (1[0-5])(\\.\\d)? s: values ${A_VALUES} \\(the taps' own ${A_VALUES};`));
    // The owner's ruling N-F1 c: pass A untapped and rejected, then pass B tapped and judged.
    expect(r.out).toMatch(new RegExp(`flash: fallback calibration up (19|2\\d|30)(\\.\\d)? s: values ${B_VALUES} \\(the taps' own ${B_VALUES};`));
    expect(r.out).not.toMatch(/no run at room 1/);
    expect(r.out).not.toMatch(/the tapper landed/);
    expect(r.out).not.toMatch(/the scene ran/);
    // Review R4 (MAJOR 1): A1 in each run, every click on its mark.
    for (const name of RUNS) expect(r.out).toMatch(new RegExp(`flash: ${name} up .*; click starts 24 of 24 on their marks`));
    // Review R5 (MAJOR 1): every frame of every attempt held to its windows, in all three runs; the waiting key watched
    // before the untouched run's first key.
    expect(r.out).toMatch(/flash: calibration up .*; frames \d{3,4} timed \(\d+ filled, \d+ with the ring, \d{3,4} with the row; \d+ of \d+ waiting frames pressed\)/);
    expect(r.out).toMatch(/flash: tapped calibration up .*; frames \d{3,4} timed \(\d+ filled, 0 with the ring, \d{3,4} with the row;/);
    expect(r.out).toMatch(/flash: fallback calibration up .*; frames \d{3,4} timed \(\d+ filled, \d+ with the ring, \d{3,4} with the row;/);
    expect(r.out).not.toMatch(/calibration frames:/);
    // Review R5 (NOTE 2) and the owner's ruling N-F1 c: no error, no other origin, nothing stored, the line right.
    expect(r.out).not.toMatch(/calibration page:/);
    expect(r.out).not.toMatch(/calibration line:/);
    expect(r.out).toMatch(/flash: PASS/);
    expect(r.code).toBe(0);
  }, T);

  // Review R5 (MAJOR 1): the reviewer's three product mutants, planted on the control page. Each fails on its frames, and
  // on nothing else: the values are still the taps' own, the clicks on their marks, the pulses counted.
  const ONLY_FRAMES = /flash: (tapped |fallback )?calibration (left after|clicks|fills|rings|values|click starts|line)/;

  it('fails a scene whose rings show 0.1 s after their windows while frameTimes keep them (review R5, MAJOR 1)', () => {
    const r = flash('calib=ringlate');
    expect(r.out).toMatch(/flash: calibration frames: B1: a frame \+\d+\.\d ms from ring 0's due time shows no ring \(want the ring for a sixteenth/);
    expect(r.out).toMatch(/flash: calibration frames: B1: a frame \+1\d\d\.\d ms from ring 0's due time shows the ring \(want it only for a sixteenth/);
    expect(r.out).toMatch(/flash: fallback calibration frames: B1: a frame/);
    expect(r.out).not.toMatch(/calibration frames: A\d/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene whose count-in fills show 0.1 s after their clicks (review R5, MAJOR 1)', () => {
    const r = flash('calib=filllate');
    expect(r.out).toMatch(/flash: calibration frames: A1: a frame heard \+\d+\.\d ms from count-in click 0 shows the key plain \(want it filled/);
    expect(r.out).toMatch(/flash: calibration frames: A1: a frame heard \+1\d\d\.\d ms from count-in click 0 shows the key filled \(want it filled only/);
    expect(r.out).toMatch(/flash: tapped calibration frames: A1: a frame heard/);
    expect(r.out).toMatch(/flash: fallback calibration frames: A1: a frame heard/);
    expect(r.out).not.toMatch(/calibration frames: B\d/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails calibration pages that log an error, ask another origin and store something (review R5, NOTE 2)', () => {
    const r = flash('store=session&cerr&fetch=http://127.0.0.2:9/x');
    for (const name of RUNS) {
      expect(r.out).toMatch(new RegExp(`flash: ${name} page: \\d+ console or page error\\(s\\): .*control page: planted console error`));
      expect(r.out).toMatch(new RegExp(`flash: ${name} page: requests to other origins: http://127\\.0\\.0\\.2:9`));
      expect(r.out).toMatch(new RegExp(`flash: ${name} page: something was stored: .*"sessionStorage":1`));
    }
    expect(r.out).not.toMatch(/calibration frames:/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene whose frameTimes sit 0.1 s after the frames that drew their rings (review R5, MAJOR 1)', () => {
    const r = flash('calib=frametime');
    expect(r.out).toMatch(/flash: calibration frames: B1: frameTimes\[0\] is \+1\d\d\.\d ms from its due time, but the first frame that drew ring 0 ran [+-]\d+\.\d ms to [+-]\d+\.\d ms from it/);
    expect(r.out).toMatch(/flash: fallback calibration frames: B1: frameTimes\[0\]/);
    expect(r.out).not.toMatch(/shows (no ring|the ring|the key)/);
    expect(r.out).not.toMatch(/flash: calibration (left after|clicks|fills|rings|values|click starts|line)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene whose clicks are handed over 0.1 s after their marks (review R4, MAJOR 1)', () => {
    const r = flash('calib=clicklate');
    expect(r.out).toMatch(/flash: calibration click starts: A1 has 0 of 24 clicks started on their marks and \d+ off them \(the first \+100\.0 ms from its mark\)/);
    expect(r.out).toMatch(/flash: tapped calibration click starts: A1 has 0 of 24/);
    expect(r.out).toMatch(/flash: fallback calibration click starts: A1 has 0 of 24/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a tapped run whose pass A offsets have their sign flipped', () => {
    const r = flash('calib=flip');
    // Review R2 (MINOR 3): judged against the values the logged taps give.
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration values 0\\.0 -(3\\d|4\\d)\\.\\d, the taps' own ${A_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).not.toMatch(/flash: (fallback )?calibration (left after|clicks|fills|rings|values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a count-in of three beats', () => {
    const r = flash('calib=count3');
    // The key plain in the fourth count-in sixteenth, and the row a beat ahead of its clicks.
    expect(r.out).toMatch(/flash: calibration frames: A1: a frame heard \+\d+\.\d ms from count-in click 3 shows the key plain \(want it filled/);
    expect(r.out).toMatch(/flash: calibration frames: A1: a frame heard [+-]\d+\.\d ms from click \d+ shows \d+ dots filled \(want \d+: a dot fills once its click has passed\)/);
    // A scene whose count-in is 3 beats also admits the tapper's tap on click 3 (review R3, MINOR 6), which may move the
    // tapped values off the taps' own by more than 0.5 ms: a second catch of the same fault. What would be another fault,
    // a run that never hands over in time, must not show.
    expect(r.out).not.toMatch(/flash: (tapped|fallback) calibration left after/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene the first key leaves at once', () => {
    const r = flash('calib=skip');
    expect(r.out).toMatch(/flash: calibration left after \d+\.\d s \(want at least 19\.7 s/);
    expect(r.out).toMatch(/flash: calibration clicks 0 \(want 20 to 28\)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails pass A without its clicks', () => {
    const r = flash('calib=silent');
    expect(r.out).toMatch(/flash: calibration clicks 0 \(want 20 to 28\)/);
    expect(r.out).not.toMatch(/flash: calibration left after/);
    expect(r.out).not.toMatch(/flash: calibration rings/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails pass B without its rings', () => {
    const r = flash('calib=noring');
    expect(r.out).toMatch(/flash: calibration rings 0 \(want 20 to 28\)/);
    expect(r.out).not.toMatch(/flash: calibration left after/);
    expect(r.out).not.toMatch(/flash: calibration clicks/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene that takes Escape as a key (review R3, MINOR 5)', () => {
    const r = flash('calib=escape');
    expect(r.out).toMatch(/flash: calibration: Escape started the audio or left the scene \(audio started/);
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration values -?\\d+\\.\\d -?\\d+\\.\\d, the taps' own ${A_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene that counts taps during the count-in (review R3, MINOR 6)', () => {
    const r = flash('calib=nowindow');
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration values -?\\d+\\.\\d -?\\d+\\.\\d, the taps' own ${A_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).not.toMatch(/flash: calibration(:| left after| clicks| fills| rings| values)/);
    expect(r.out).not.toMatch(/the tapper landed/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails pass A without its count-in', () => {
    const r = flash('calib=nofill');
    expect(r.out).toMatch(new RegExp(`flash: calibration fills ${IN_RANGE} \\(want 3 to 5\\)`));
    expect(r.out).toMatch(/flash: calibration rings 0 \(want 20 to 28\)/);
    expect(r.out).not.toMatch(/flash: calibration clicks/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  // The owner's ruling N-F1 c (2026-10-19): the course, the waiting key, the row, the line and the one-pass rule.
  it('fails a scene that runs pass B after an accepted pass A', () => {
    const r = flash('calib=bafter');
    expect(r.out).toMatch(/flash: tapped calibration left after 2\d\.\d s \(want 10 to 15 s: A1 accepted, and no pass B\)/);
    expect(r.out).toMatch(/flash: tapped calibration: the scene ran A, B with A1 accepted \(want A1 accepted, and no pass B: B only after a rejected A, no repeat\)/);
    expect(r.out).not.toMatch(/flash: (fallback )?calibration(:| left after| values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene that repeats a rejected pass A', () => {
    const r = flash('calib=arepeat');
    expect(r.out).toMatch(/flash: calibration: the scene ran A, A, B \(want A1, then B1 after its rejection, and no repeat\)/);
    expect(r.out).toMatch(/flash: calibration clicks 4\d \(want 20 to 28\)/);
    expect(r.out).toMatch(/flash: fallback calibration: the scene ran A, A, B with A1 rejected \(want A1 rejected untapped, then B1/);
    expect(r.out).toMatch(/flash: fallback calibration left after 3\d\.\d s \(want 19\.7 to 30 s/);
    expect(r.out).not.toMatch(/flash: tapped calibration(:| left after| values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene whose key is never pressed while it waits', () => {
    const r = flash('calib=nopress');
    expect(r.out).toMatch(/flash: calibration frames: a waiting frame [+-]\d+\.\d ms from a beat line shows the key plain \(want it pressed for a sixteenth from each beat line/);
    expect(r.out).toMatch(/flash: calibration frames: 0 waiting frames judged with the key pressed \(want at least 4\)/);
    expect(r.out).not.toMatch(/flash: calibration frames: [AB]1/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene that draws no row', () => {
    const r = flash('calib=norow');
    for (const name of RUNS) expect(r.out).toMatch(new RegExp(`flash: ${name} frames: A1: a frame shows 0 rows \\(want the row of 20 dots in every frame of an attempt\\)`));
    expect(r.out).toMatch(/flash: calibration frames: B1: a frame shows 0 rows/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a scene whose row fills 0.1 s after its clicks and rings', () => {
    const r = flash('calib=rowlate');
    for (const name of RUNS) expect(r.out).toMatch(new RegExp(`flash: ${name} frames: A1: a frame heard \\+\\d+\\.\\d ms from click \\d+ shows \\d+ dots filled \\(want \\d+: a dot fills once its click has passed\\)`));
    expect(r.out).toMatch(/flash: calibration frames: B1: a frame \+\d+\.\d ms from ring \d+ shows \d+ dots filled \(want \d+: a dot fills once its ring has passed\)/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  it('fails a page line kept after the hand-over, and a page with no line', () => {
    const kept = flash('calib=linekept');
    for (const name of RUNS) expect(kept.out).toMatch(new RegExp(`flash: ${name} line: after the hand-over: extra page text \\["Press any key, then tap along with the beat to set your timing\\."\\]`));
    expect(kept.out).not.toMatch(/line: before the first key/);
    expect(kept.out).not.toMatch(/calibration frames:/);
    expect(kept.code).toBe(1);
    const none = flash('calib=noline');
    for (const name of RUNS) expect(none.out).toMatch(new RegExp(`flash: ${name} line: before the first key: the calibration wants its one line "Press any key, then tap along with the beat to set your timing\\.", found \\[\\]`));
    expect(none.out).not.toMatch(/line: after the hand-over/);
    expect(none.code).toBe(1);
  }, 2 * T);

  it('fails a scene that takes a lone pass as the display shift (the two-pass rule)', () => {
    const r = flash('calib=twopass');
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration values (3\\d|4\\d)\\.\\d 0\\.0, the taps' own ${A_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).toMatch(new RegExp(`flash: fallback calibration values -(2\\d|3\\d|4[0-4])\\.\\d (2\\d|3\\d|4[0-4])\\.\\d, the taps' own ${B_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).not.toMatch(/flash: calibration (left after|clicks|fills|rings|values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  // Review R8 (MINOR 9, R7's MINOR 3): the tapper dispatches each key 8 ms after its time stamp, so a scene that reads its
  // handler's clock instead is that much late.
  it('fails a scene that times its taps by the handler instead of the event\'s time stamp', () => {
    const r = flash('calib=handlertime');
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration values 0\\.0 \\d+\\.\\d, the taps' own ${A_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).toMatch(new RegExp(`flash: fallback calibration values 0\\.0 \\d+\\.\\d, the taps' own ${B_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).not.toMatch(/flash: calibration (left after|clicks|fills|rings|values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  // Review R8 (MINOR 10, R6's MINOR 2): a held key's repeats are never taps.
  it('fails a scene that takes key repeats as taps', () => {
    const r = flash('calib=repeat');
    expect(r.out).toMatch(new RegExp(`flash: tapped calibration values 0\\.0 \\d+\\.\\d, the taps' own ${A_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).toMatch(new RegExp(`flash: fallback calibration values 0\\.0 \\d+\\.\\d, the taps' own ${B_VALUES} \\(want equal within 0\\.5 ms\\)`));
    expect(r.out).not.toMatch(/the tapper landed/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);

  // Review R8 (MINOR 4): each attempt held to its end.
  it('fails a scene whose attempts end a beat early', () => {
    const r = flash('calib=endearly');
    for (const name of RUNS) expect(r.out).toMatch(new RegExp(`flash: ${name} frames: A1: the attempt ended in a frame heard -\\d+\\.\\d ms from its end`));
    expect(r.out).toMatch(/flash: calibration frames: B1: the attempt ended in a frame -\d+\.\d ms from its end/);
    expect(r.out).not.toMatch(/flash: (tapped |fallback )?calibration (clicks|fills|rings|values|click starts|line)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, T);
});
