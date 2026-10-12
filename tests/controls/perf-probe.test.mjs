// PF-CONTROLS for the perf probe (X4): headed Chrome on this laptop's GPU, window maximized. The clean control
// page must pass and the same page with ?stress=20 (a 20 ms busy wait every frame, over the 16.7 ms budget
// on its own) must fail. These runs need this laptop on AC power at 60 Hz with nothing heavy running; the
// probe records all three, and a run that misses one fails for that reason.
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

function perf(query) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'probe-perf.mjs'), '--headed', '--dist', dist, '--rooms', path.join(CP, 'rooms'),
    '--replays', path.join(CP, 'replays'), '--query', query], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

describe('perf probe (X4)', () => {
  it('passes the clean control page', () => {
    const r = perf('');
    expect(r.out).toMatch(/perf: machine: power ac, saver off/);
    expect(r.out).toMatch(/perf: PASS/);
    expect(r.code).toBe(0);
  }, 180000);

  it('fails ?stress=20', () => {
    const r = perf('stress=20');
    expect(r.out).toMatch(/perf: mean [\d.]+ fps, under 58/);
    expect(r.out).toMatch(/perf: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);
});
