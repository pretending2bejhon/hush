// PF-CONTROLS for the flash probe's --calibration check (HUSH-SPEC section 12, CAL2): on the control page, whose
// calibration scene is section 12 itself, an untouched run and a tapped run must pass; the first key leaving the
// scene at once (the shortcut that stood in for the passes before CAL2), a rejected pass not repeated, pass A
// without its clicks, pass B without its rings and pass A without its count-in must each fail, for its own
// reason, and so must (review R1, MAJOR 2) pass A's tap offsets with their sign flipped (the tapped run) and a
// count-in of 3 beats (the untouched run's fills). Review R2: the tapped run is judged against the values its logged
// taps give, and its hand-over must start a run at room 1. Review R3: a scene that takes Escape as a key (MINOR 5)
// and one that counts taps during the count-in (MINOR 6) must each fail. Review R4 (MAJOR 2): the retried run must pass,
// and a scene that keeps a pass's first result instead of its last must fail it. Review R4 (MAJOR 1): every click of the
// clean page starts on its mark in all three runs, and a scene whose clicks are handed over 0.1 s late must fail on
// their starts. Review R5 (MAJOR 1): every frame of the clean page shows its pictures in their windows in all three runs,
// and a scene whose rings show 0.1 s late, whose count-in fills show 0.1 s late, or whose frameTimes sit 0.1 s after the
// frames that drew their rings must each fail on its frames alone. Review R5 (NOTE 2): calibration pages that log a
// console error, ask another origin and store something must each fail on X5 and X10.
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

const IN_RANGE = '(4[4-9]|5[0-2])';

describe('flash probe --calibration (section 12)', () => {
  it('passes the control page\'s untouched calibration and its tapped one', () => {
    const r = flash('');
    expect(r.out).toMatch(new RegExp(`flash: calibration up \\d+(\\.\\d)? s: clicks ${IN_RANGE}, count-in fills [7-9], rings ${IN_RANGE}, values 0 0, Escape ignored`));
    expect(r.out).toMatch(/flash: tapped calibration up (19|2\d|30)(\.\d)? s: values ([0-9]|10)\.\d (29|3\d)\.\d \(the taps' own ([0-9]|10)\.\d (29|3\d)\.\d;/);
    // Review R4 (MAJOR 2): each pass's first attempt untapped and rejected, the repeats tapped.
    expect(r.out).toMatch(/flash: retried calibration up (39|4\d|50)(\.\d)? s: values ([0-9]|10)\.\d (29|3\d)\.\d \(the taps' own ([0-9]|10)\.\d (29|3\d)\.\d;/);
    expect(r.out).not.toMatch(/no run at room 1/);
    expect(r.out).not.toMatch(/the tapper landed/);
    // Review R4 (MAJOR 1): A1 and A2, A1, then A1 and A2 again, every click on its mark.
    expect(r.out).toMatch(/flash: calibration up .*; click starts 48 of 48 on their marks/);
    expect(r.out).toMatch(/flash: tapped calibration up .*; click starts 24 of 24 on their marks/);
    expect(r.out).toMatch(/flash: retried calibration up .*; click starts 48 of 48 on their marks/);
    // Review R5 (MAJOR 1): every frame of every attempt held to its windows, in all three runs.
    expect(r.out).toMatch(/flash: calibration up .*; frames \d{4} timed \(\d+ filled, \d+ with the ring\)/);
    expect(r.out).toMatch(/flash: tapped calibration up .*; frames \d{3,4} timed \(\d+ filled, \d+ with the ring\)/);
    expect(r.out).toMatch(/flash: retried calibration up .*; frames \d{4} timed \(\d+ filled, \d+ with the ring\)/);
    expect(r.out).not.toMatch(/calibration frames:/);
    // Review R5 (NOTE 2): no error, no other origin and nothing stored on any of the three pages.
    expect(r.out).not.toMatch(/calibration page:/);
    expect(r.out).toMatch(/flash: PASS/);
    expect(r.code).toBe(0);
  }, 240000);

  // Review R5 (MAJOR 1): the reviewer's three product mutants, planted on the control page. Each fails on its frames, in all
  // three runs, and on nothing else: the values are still the taps' own, the clicks on their marks, the pulses counted.
  const ONLY_FRAMES = /flash: (tapped |retried )?calibration (left after|clicks|fills|rings|values|click starts)/;

  it('fails a scene whose rings show 0.1 s after their windows while frameTimes keep them (review R5, MAJOR 1)', () => {
    const r = flash('calib=ringlate');
    expect(r.out).toMatch(/flash: calibration frames: B1: a frame \+\d+\.\d ms from ring 0's due time shows no ring \(want the ring for a sixteenth/);
    expect(r.out).toMatch(/flash: calibration frames: B1: a frame \+1\d\d\.\d ms from ring 0's due time shows the ring \(want it only for a sixteenth/);
    expect(r.out).toMatch(/flash: tapped calibration frames: B1: a frame/);
    expect(r.out).toMatch(/flash: retried calibration frames: B1: a frame/);
    expect(r.out).not.toMatch(/calibration frames: A\d/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene whose count-in fills show 0.1 s after their clicks (review R5, MAJOR 1)', () => {
    const r = flash('calib=filllate');
    expect(r.out).toMatch(/flash: calibration frames: A1: a frame heard \+\d+\.\d ms from count-in click 0 shows the key plain \(want it filled/);
    expect(r.out).toMatch(/flash: calibration frames: A1: a frame heard \+1\d\d\.\d ms from count-in click 0 shows the key filled \(want it filled only/);
    expect(r.out).toMatch(/flash: tapped calibration frames: A1: a frame heard/);
    expect(r.out).toMatch(/flash: retried calibration frames: A1: a frame heard/);
    expect(r.out).not.toMatch(/calibration frames: B\d/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails calibration pages that log an error, ask another origin and store something (review R5, NOTE 2)', () => {
    const r = flash('store=session&cerr&fetch=http://127.0.0.2:9/x');
    for (const name of ['calibration', 'tapped calibration', 'retried calibration']) {
      expect(r.out).toMatch(new RegExp(`flash: ${name} page: \\d+ console or page error\\(s\\): .*control page: planted console error`));
      expect(r.out).toMatch(new RegExp(`flash: ${name} page: requests to other origins: http://127\\.0\\.0\\.2:9`));
      expect(r.out).toMatch(new RegExp(`flash: ${name} page: something was stored: .*"sessionStorage":1`));
    }
    expect(r.out).not.toMatch(/calibration frames:/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene whose frameTimes sit 0.1 s after the frames that drew their rings (review R5, MAJOR 1)', () => {
    const r = flash('calib=frametime');
    expect(r.out).toMatch(/flash: calibration frames: B1: frameTimes\[0\] is \+1\d\d\.\d ms from its due time, but the first frame that drew ring 0 ran [+-]\d+\.\d ms to [+-]\d+\.\d ms from it/);
    expect(r.out).toMatch(/flash: tapped calibration frames: B1: frameTimes\[0\]/);
    expect(r.out).toMatch(/flash: retried calibration frames: B1: frameTimes\[0\]/);
    expect(r.out).not.toMatch(/shows (no ring|the ring|the key)/);
    expect(r.out).not.toMatch(ONLY_FRAMES);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene whose clicks are handed over 0.1 s after their marks (review R4, MAJOR 1)', () => {
    const r = flash('calib=clicklate');
    expect(r.out).toMatch(/flash: calibration click starts: A1 has 0 of 24 clicks started on their marks and \d+ off them \(the first \+100\.0 ms from its mark\)/);
    expect(r.out).toMatch(/flash: tapped calibration click starts: A1 has 0 of 24/);
    expect(r.out).toMatch(/flash: retried calibration click starts: A2 has 0 of 24/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene that keeps a pass\'s first result instead of its last (review R4, MAJOR 2)', () => {
    const r = flash('calib=first');
    expect(r.out).toMatch(/flash: retried calibration values 0\.0 0\.0, the taps' own ([0-9]|10)\.\d (29|3\d)\.\d \(want equal within 0\.5 ms\)/);
    expect(r.out).not.toMatch(/flash: tapped calibration (values|left after)/);
    expect(r.out).not.toMatch(/flash: calibration (left after|clicks|fills|rings|values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a tapped run whose pass A offsets have their sign flipped', () => {
    const r = flash('calib=flip');
    // Review R2 (MINOR 3): judged against the values the logged taps give.
    expect(r.out).toMatch(/flash: tapped calibration values -7\d\.\d (29|3\d)\.\d, the taps' own ([0-9]|10)\.\d (29|3\d)\.\d \(want equal within 0\.5 ms\)/);
    expect(r.out).not.toMatch(/flash: calibration (left after|clicks|fills|rings|values)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a count-in of three beats', () => {
    const r = flash('calib=count3');
    // Six fills, or five when the screencast misses one pulse (review R2: a run at 43 frames a second saw 5).
    expect(r.out).toMatch(/flash: calibration fills [56] \(want 7 to 9\)/);
    // Review R4: a scene whose count-in is 3 beats also admits the tapper's tap on click 3 (review R3, MINOR 6), which may
    // move the tapped or retried values off the taps' own by more than 0.5 ms: a second catch of the same fault. What
    // would be another fault, a run that never hands over in time, must not show.
    expect(r.out).not.toMatch(/flash: (tapped|retried) calibration left after/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene the first key leaves at once', () => {
    const r = flash('calib=skip');
    expect(r.out).toMatch(/flash: calibration left after \d+\.\d s \(want at least 39\.4 s/);
    expect(r.out).toMatch(/flash: calibration clicks 0 \(want 44 to 52\)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene that does not repeat a rejected pass', () => {
    const r = flash('calib=norepeat');
    expect(r.out).toMatch(/flash: calibration left after (19|2\d)\.\d s/);
    expect(r.out).toMatch(/flash: calibration clicks 2[2-6] \(want 44 to 52\)/);
    expect(r.out).toMatch(/flash: calibration rings 2[2-6] \(want 44 to 52\)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails pass A without its clicks', () => {
    const r = flash('calib=silent');
    expect(r.out).toMatch(/flash: calibration clicks 0 \(want 44 to 52\)/);
    expect(r.out).not.toMatch(/flash: calibration left after/);
    expect(r.out).not.toMatch(/flash: calibration rings/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails pass B without its rings', () => {
    const r = flash('calib=noring');
    expect(r.out).toMatch(/flash: calibration rings 0 \(want 44 to 52\)/);
    expect(r.out).not.toMatch(/flash: calibration left after/);
    expect(r.out).not.toMatch(/flash: calibration clicks/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene that takes Escape as a key (review R3, MINOR 5)', () => {
    const r = flash('calib=escape');
    expect(r.out).toMatch(/flash: calibration: Escape started the audio or left the scene \(audio started/);
    expect(r.out).toMatch(/flash: tapped calibration values -?\d+\.\d -?\d+\.\d, the taps' own ([0-9]|10)\.\d (29|3\d)\.\d \(want equal within 0\.5 ms\)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails a scene that counts taps during the count-in (review R3, MINOR 6)', () => {
    const r = flash('calib=nowindow');
    expect(r.out).toMatch(/flash: tapped calibration values -?\d+\.\d -?\d+\.\d, the taps' own ([0-9]|10)\.\d (29|3\d)\.\d \(want equal within 0\.5 ms\)/);
    expect(r.out).not.toMatch(/flash: calibration(:| left after| clicks| fills| rings| values)/);
    expect(r.out).not.toMatch(/the tapper landed/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);

  it('fails pass A without its count-in', () => {
    const r = flash('calib=nofill');
    expect(r.out).toMatch(new RegExp(`flash: calibration fills ${IN_RANGE} \\(want 7 to 9\\)`));
    expect(r.out).toMatch(/flash: calibration rings 0 \(want 44 to 52\)/);
    expect(r.out).not.toMatch(/flash: calibration clicks/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 240000);
});
