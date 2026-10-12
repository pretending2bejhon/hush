// npm test (X2): every unit, replay and e2e suite of the product, in that order, each run even when an earlier
// one fails; exit non-zero when any fails.
//   unit    vitest on tests/sim, tests/rooms, tests/audio, tests/clock, tests/input, tests/fx, tests/render
//   replay  node tools/replay.mjs --all --jitter --seed <first 8 hex of HEAD> (the X3 seed rule)
//   e2e     vite build, then tools/probe-smoke.mjs and tools/probe-play.mjs (every check, headless Chrome)
// The verifiers' own tests are not here: npm run test:verifiers.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const UNIT_DIRS = ['tests/sim', 'tests/rooms', 'tests/audio', 'tests/clock', 'tests/input', 'tests/fx', 'tests/render'];

function bin(name) {
  return path.join(REPO, 'node_modules', name === 'vitest' ? 'vitest/vitest.mjs' : 'vite/bin/vite.js');
}

export function seedOf(sha) {
  return parseInt(sha.slice(0, 8), 16) >>> 0;
}

function step(label, args) {
  process.stdout.write(`test: ${label}: ${args.map((a) => path.relative(REPO, a) || a).join(' ')}\n`);
  const r = spawnSync(process.execPath, args, { cwd: REPO, stdio: 'inherit' });
  process.stdout.write(`test: ${label}: exit ${r.status}\n`);
  return r.status === 0;
}

function main() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
  const dirs = UNIT_DIRS.filter((d) => fs.existsSync(path.join(REPO, d)));
  const results = [
    ['unit', dirs.length ? step('unit', [bin('vitest'), 'run', ...dirs]) : (process.stdout.write('test: unit: no unit test folder\n'), false)],
    ['replay', step('replay', [path.join(REPO, 'tools', 'replay.mjs'), '--all', '--jitter', '--seed', String(seedOf(head))])],
    ['build', step('build', [bin('vite'), 'build'])],
  ];
  const built = results[2][1];
  results.push(['smoke', built && step('smoke', [path.join(REPO, 'tools', 'probe-smoke.mjs')])]);
  results.push(['play', built && step('play', [path.join(REPO, 'tools', 'probe-play.mjs')])]);
  const failed = results.filter(([, ok]) => !ok).map(([n]) => n);
  process.stdout.write(`test: ${failed.length ? `FAIL (${failed.join(', ')})` : 'PASS (unit, replay, e2e)'}\n`);
  return failed.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try { process.exitCode = main(); } catch (e) { process.stderr.write(`test: ${e.message}\n`); process.exitCode = 2; }
}
