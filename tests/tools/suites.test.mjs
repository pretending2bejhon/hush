// PF-CONTROLS for the suite runners: the X8 test passes the reference calibrator and fails a biased one and one
// that never rejects (tests/fixtures/calibration); npm test's runner (tools/test-all.mjs) carries a planted
// failing suite's status to its own exit and to the ship gate's X2 row; the standing check reads the items'
// mapped tests from the spec and the passed items from the scoreboard.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mappedTests, passedItems } from '../../tools/standing.mjs';
import { REPO } from './fixture-repo.mjs';

const vitest = (args, env = {}) => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...args], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
};

describe('the X8 test against fixture calibrators', () => {
  for (const [m, code] of [['reference', 0], ['biased', 1], ['never-reject', 1]]) {
    it(`${code ? 'fails' : 'passes'} the ${m} calibrator`, () => {
      const r = vitest(['tests/input/calibrate.test.ts'], { HUSH_CALIBRATE_MODULE: `tests/fixtures/calibration/${m}.mjs` });
      expect(r.code).toBe(code);
    }, 120000);
  }
});

describe('npm test and the ship gate carry a failing suite (X2)', () => {
  it('a planted failing unit test fails the unit step, npm test and X2', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-x2-'));
    for (const rel of ['package.json', '.gitignore', '.gitattributes', 'vitest.config.ts', 'tools/test-all.mjs', 'tools/ship-gate.mjs', 'tools/cap-hook.mjs', 'tools/replay.mjs']) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.copyFileSync(path.join(REPO, rel), path.join(dir, rel));
    }
    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
    fs.mkdirSync(path.join(dir, 'tests', 'sim'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests', 'sim', 'ok.test.mjs'), "import { it, expect } from 'vitest';\nit('passes', () => expect(1).toBe(1));\n");
    const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init', '-q', '-b', 'main']);
    git(['config', 'user.name', 'fixture']);
    git(['config', 'user.email', ['fixture', 'example.invalid'].join('@')]);
    git(['add', '--all', '--', '.']);
    git(['commit', '-q', '-m', 'x2 fixture']);
    const testAll = () => spawnSync(process.execPath, [path.join(dir, 'tools', 'test-all.mjs')], { cwd: dir, encoding: 'utf8' });
    const green = testAll();
    expect(green.stdout).toMatch(/test: unit: exit 0/);
    fs.writeFileSync(path.join(dir, 'tests', 'sim', 'planted.test.mjs'), "import { it, expect } from 'vitest';\nit('fails', () => expect(1).toBe(2));\n");
    git(['add', '--', 'tests/sim/planted.test.mjs']);
    git(['commit', '-q', '-m', 'planted failing suite']);
    const red = testAll();
    expect(red.stdout).toMatch(/test: unit: exit 1/);
    expect(red.stdout).toMatch(/test: FAIL \(unit/);
    expect(red.status).toBe(1);
    const gate = spawnSync(process.execPath, [path.join(dir, 'tools', 'ship-gate.mjs'), '--rows', 'X2'], { cwd: dir, encoding: 'utf8' });
    expect(gate.stdout).toMatch(/X2: RED \| npm test exit 1/);
    expect(gate.status).toBe(1);
  }, 300000);
});

describe('standing selector', () => {
  it('maps items to their tests from the spec and reads the passed items', () => {
    const spec = [
      '## 15. Items', '', '#### S1 Smoke', '- **Module:** render', '- **Tests mapped:** `npm run smoke`', '',
      '#### SIM-2 Base form', '- **Tests mapped:** `tests/sim/oracle.test.ts`, `tests/sim/base.test.ts`', '', '## 16. Writers', '- **Tests mapped:** `ignored`',
    ].join('\n');
    const map = mappedTests(spec);
    expect([...map.keys()]).toEqual(['S1', 'SIM-2']);
    expect(map.get('SIM-2')).toEqual(['tests/sim/oracle.test.ts', 'tests/sim/base.test.ts']);
    const progress = ['## Items', 'S1: passes: true (evidence: build/evidence/S1.accept.1.txt)', 'SIM-2: passes: false', 'R3: blocked (needs-design)'].join('\n');
    expect(passedItems(progress)).toEqual(['S1']);
  });
});
