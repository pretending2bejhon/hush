// PF-CONTROLS for the flash probe's --calibration check (HUSH-SPEC section 12, CAL2): on the control page, whose
// calibration scene is section 12 itself, an untouched run must pass; the first key leaving the scene at once
// (the shortcut that stood in for the passes before CAL2), a rejected pass not repeated, pass A without its
// clicks, pass B without its rings and pass A without its count-in must each fail, for its own reason.
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
  it('passes the control page\'s untouched calibration', () => {
    const r = flash('');
    expect(r.out).toMatch(new RegExp(`flash: calibration up \\d+(\\.\\d)? s: clicks ${IN_RANGE}, count-in fills ([6-9]|10), rings ${IN_RANGE}, values 0 0`));
    expect(r.out).toMatch(/flash: PASS/);
    expect(r.code).toBe(0);
  }, 180000);

  it('fails a scene the first key leaves at once', () => {
    const r = flash('calib=skip');
    expect(r.out).toMatch(/flash: calibration left after \d+\.\d s \(want at least 39\.4 s/);
    expect(r.out).toMatch(/flash: calibration clicks 0 \(want 44 to 52\)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails a scene that does not repeat a rejected pass', () => {
    const r = flash('calib=norepeat');
    expect(r.out).toMatch(/flash: calibration left after (19|2\d)\.\d s/);
    expect(r.out).toMatch(/flash: calibration clicks 2[2-6] \(want 44 to 52\)/);
    expect(r.out).toMatch(/flash: calibration rings 2[2-6] \(want 44 to 52\)/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails pass A without its clicks', () => {
    const r = flash('calib=silent');
    expect(r.out).toMatch(/flash: calibration clicks 0 \(want 44 to 52\)/);
    expect(r.out).not.toMatch(/calibration left after/);
    expect(r.out).not.toMatch(/calibration rings/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails pass B without its rings', () => {
    const r = flash('calib=noring');
    expect(r.out).toMatch(/flash: calibration rings 0 \(want 44 to 52\)/);
    expect(r.out).not.toMatch(/calibration left after/);
    expect(r.out).not.toMatch(/calibration clicks/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails pass A without its count-in', () => {
    const r = flash('calib=nofill');
    expect(r.out).toMatch(new RegExp(`flash: calibration fills ${IN_RANGE} \\(want 6 to 10\\)`));
    expect(r.out).toMatch(/flash: calibration rings 0 \(want 44 to 52\)/);
    expect(r.out).not.toMatch(/calibration clicks/);
    expect(r.out).toMatch(/flash: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);
});
