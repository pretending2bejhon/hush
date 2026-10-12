// PF-CONTROLS for the av probe (X7): headed Chrome on this laptop's real audio device (unmuted). The clean
// control page must pass; with the master output disconnected, with a synth registration that throws, and
// with one later layer's gate disconnected while the earlier layers play, it must fail, each for its reason.
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

function av(query) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'probe-av.mjs'), '--headed', '--dist', dist, '--replays', path.join(CP, 'replays'),
    '--track', path.join(CP, 'control.strudel'), '--gauntlet-room', '0', '--query', query], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

describe('av probe (X7)', () => {
  it('passes the clean control page', () => {
    const r = av('');
    expect(r.out).toMatch(/av: \d+ voices scheduled for \d+ onsets, 0 errors, 0 dropped/);
    expect(r.out).toMatch(/av: PASS/);
    expect(r.code).toBe(0);
  }, 180000);

  it('fails with the master output disconnected', () => {
    const r = av('av=master-off');
    expect(r.out).toMatch(/av: no master signal in room 2/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails with a synth registration that throws', () => {
    const r = av('av=synth-throw');
    expect(r.out).toMatch(/av: \d+ voice errors/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails with one later layer disconnected while the earlier ones play', () => {
    const r = av('av=layer-off');
    expect(r.out).toMatch(/av: layer 3 soloed: no signal/);
    expect(r.out).not.toMatch(/av: no master signal/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);
});
