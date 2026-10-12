// npm run standing (D13): the standing check, the regression set run at every orientation and after every item.
//   check-public on the tree and on every commit reachable from HEAD; protect --check (both manifests, commit
//   subjects since the cut); gates --lint; spec-content --check; then the tests mapped to every item whose
//   scoreboard line in build/HUSH-PROGRESS.md reads `passes: true`, as the item's "Tests mapped" line in
//   build/HUSH-SPEC.md names them: test files run in one vitest call, commands (npm run <script>, node tools/...)
//   once each. On zero passed items it is the first five steps alone. The full suite is npm test, at VERIFY.
// Exit 0 GREEN, 1 RED, 2 a spec or scoreboard it cannot read.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ITEM_HEAD = /^#### ([A-Z][A-Z0-9]*-?[0-9]+[a-z]?) /;
const PASSED = /^([A-Z][A-Z0-9]*-?[0-9]+[a-z]?): passes: true \(evidence: [^)]+\)$/;

// Item id -> its mapped tests, from the spec's item blocks.
export function mappedTests(specText) {
  const map = new Map();
  let id = null;
  for (const line of specText.split('\n')) {
    const h = ITEM_HEAD.exec(line);
    if (h) { id = h[1]; continue; }
    if (/^#{1,4} /.test(line)) { id = null; continue; }
    const m = /^- \*\*Tests mapped:\*\* (.*)$/.exec(line);
    if (id && m) map.set(id, [...m[1].matchAll(/`([^`]+)`/g)].map((x) => x[1]));
  }
  return map;
}

export function passedItems(progressText) {
  return progressText.split('\n').map((l) => PASSED.exec(l.trim())).filter(Boolean).map((m) => m[1]);
}

function run(label, file, args) {
  process.stdout.write(`standing: ${label}: ${[path.basename(file) === path.basename(process.execPath) ? 'node' : file, ...args].join(' ')}\n`);
  const r = spawnSync(file, args, { cwd: REPO, stdio: 'inherit', shell: false });
  const ok = r.status === 0;
  process.stdout.write(`standing: ${label}: ${ok ? 'ok' : `FAIL (exit ${r.status})`}\n`);
  return ok;
}

const node = (label, script, args) => run(label, process.execPath, [path.join(REPO, ...script.split('/')), ...args]);
const npmCli = () => path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

function main() {
  const spec = fs.readFileSync(path.join(REPO, 'build', 'HUSH-SPEC.md'), 'utf8');
  const progress = fs.readFileSync(path.join(REPO, 'build', 'HUSH-PROGRESS.md'), 'utf8');
  const results = [];
  results.push(['public-tree', node('public-tree', 'tools/check-public.mjs', [])]);
  results.push(['public-history', node('public-history', 'tools/check-public.mjs', ['--history', 'HEAD'])]);
  results.push(['protect', node('protect', 'tools/protect.mjs', ['--check'])]);
  results.push(['gates', node('gates', 'tools/gates.mjs', ['--lint'])]);
  results.push(['spec-content', node('spec-content', 'tools/spec-content.mjs', ['--check'])]);
  const map = mappedTests(spec);
  const passed = passedItems(progress);
  const unknown = passed.filter((id) => !map.has(id));
  if (unknown.length) {
    process.stdout.write(`standing: items passed but unknown to the spec: ${unknown.join(', ')}\n`);
    results.push(['items', false]);
  }
  const files = new Set();
  const commands = new Set();
  for (const id of passed) for (const t of map.get(id) || []) (/^tests\/.+\.test\.(ts|mjs)$/.test(t) ? files : commands).add(t);
  if (files.size) results.push(['mapped-tests', run('mapped-tests', process.execPath, [path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...files])]);
  for (const c of commands) {
    const w = c.split(' ');
    if (w[0] === 'npm' && w[1] === 'run') results.push([c, run(c, process.execPath, [npmCli(), ...w.slice(1)])]);
    else if (w[0] === 'node' && /^tools\/[a-z-]+\.mjs$/.test(w[1])) results.push([c, node(c, w[1], w.slice(2))]);
    else { process.stdout.write(`standing: cannot run mapped command "${c}"\n`); results.push([c, false]); }
  }
  const red = results.filter(([, ok]) => !ok).map(([n]) => n);
  process.stdout.write(`standing: ${red.length ? `RED (${red.join(', ')})` : `GREEN (${passed.length} item(s) passed, ${files.size} mapped test file(s), ${commands.size} command(s))`}\n`);
  return red.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try { process.exitCode = main(); } catch (e) { process.stderr.write(`standing: ${e.message}\n`); process.exitCode = 2; }
}
