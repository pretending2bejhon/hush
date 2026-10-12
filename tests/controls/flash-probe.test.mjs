// PF-CONTROLS for the flash probe (X6, D10) on the control page: a full-field general strobe, an isoluminant red
// strobe and several small areas over the limit together must fail; a 4 Hz area just below the limit and a
// 2 Hz full field must pass; and the art check: a full row of spikes in the spec's static spike colour,
// scrolling at run speed, must pass, while the same row in a pale colour must fail.
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
    '--replays', path.join(CP, 'replays'), '--min-seconds', '6', '--tail-seconds', '1', '--query', query], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

const cases = [
  ['', 0, null],
  ['strobe', 1, /general flashes over 921600 canvas px/],
  ['strobe=red', 1, /red flashes over 921600 canvas px/],
  ['strobe=multi', 1, /general flashes over 3[89]\d{3} canvas px/],
  ['strobe=above', 1, /general flashes over 2[67]\d{3} canvas px/],
  ['strobe=below', 0, /general max 2[34]\d{3} px/],
  ['strobe=slow', 0, null],
  ['scroll=4a556e', 0, /general max 0 px/],
  ['scroll=c8d0e0', 1, /general flashes over \d+ canvas px/],
];

describe('flash probe (X6)', () => {
  for (const [query, code, line] of cases) {
    it(`${code ? 'fails' : 'passes'} ${query ? `?${query}` : 'the clean control page'}`, () => {
      const r = flash(query);
      if (line) expect(r.out).toMatch(line);
      expect(r.out).toMatch(code ? /flash: FAIL/ : /flash: PASS/);
      expect(r.code).toBe(code);
    }, 120000);
  }
});
