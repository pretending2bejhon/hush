// The supply probe (X10). HIGHEST-SCRUTINY.
//   node tools/probe-supply.mjs [--root .] [--audit-json <file>] [--no-browser] [--dist dist] [--rooms rooms]
//        [--replays replays] [--query <q>] [--json]
// Rows: the lockfile is tracked; every pin in package.json is an exact version and equals the lockfile's root
// entry and installed version; `npm audit --omit=dev` (or the --audit-json fixture) reports no high or
// critical finding; LICENSE is the AGPL-3.0 text and package.json says AGPL-3.0-or-later; no package in the
// lockfile has an install script except the allowlisted ones, and .npmrc keeps ignore-scripts; unless
// --no-browser, the e2e playthrough in headless Chrome (tools/probe-play.mjs --check network,storage) shows
// only the page's own origin and leaves nothing stored. Exit 0 every row green, 1 a row red, 2 usage.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// sha256 of the GNU AGPL v3 text as committed at PF-REPO (LF endings).
export const AGPL_SHA256 = '0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0';
export const LICENSE_ID = 'AGPL-3.0-or-later';
// Packages allowed to carry an install script: fsevents is optional, macOS-only and never installed here.
export const INSTALL_SCRIPT_ALLOW = new Set(['node_modules/fsevents']);
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function opts(argv) {
  const o = { root: REPO, auditJson: null, browser: true, dist: 'dist', rooms: 'rooms', replays: 'replays', query: '', json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = path.resolve(argv[++i]);
    else if (a === '--audit-json') o.auditJson = path.resolve(argv[++i]);
    else if (a === '--no-browser') o.browser = false;
    else if (a === '--dist') o.dist = argv[++i];
    else if (a === '--rooms') o.rooms = argv[++i];
    else if (a === '--replays') o.replays = argv[++i];
    else if (a === '--query') o.query = argv[++i];
    else if (a === '--json') o.json = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

export function pinProblems(pkg, lock) {
  const problems = [];
  const root = (lock.packages && lock.packages['']) || {};
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(pkg[field] || {})) {
      if (!EXACT.test(spec)) { problems.push(`${name}: "${spec}" is not an exact version`); continue; }
      if ((root[field] || {})[name] !== spec) problems.push(`${name}: the lockfile root says ${(root[field] || {})[name] ?? 'nothing'}`);
      const installed = (lock.packages[`node_modules/${name}`] || {}).version;
      if (installed !== spec) problems.push(`${name}: the lockfile installs ${installed ?? 'nothing'}`);
    }
  }
  return problems;
}

export function auditProblems(report) {
  const v = (report && report.metadata && report.metadata.vulnerabilities) || null;
  if (!v) return ['the audit report has no metadata.vulnerabilities'];
  const bad = (v.high || 0) + (v.critical || 0);
  return bad ? [`${v.high || 0} high and ${v.critical || 0} critical`] : [];
}

function npm(root, args) {
  const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

async function main(argv) {
  const o = opts(argv);
  const rows = [];
  const row = (id, problems, ok) => rows.push({ id, ok: problems.length === 0, detail: problems.length ? problems.join('; ') : ok });
  const read = (rel) => fs.readFileSync(path.join(o.root, rel), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  let tracked = [];
  try { execFileSync('git', ['ls-files', '--error-unmatch', 'package-lock.json'], { cwd: o.root, stdio: 'ignore' }); } catch { tracked = ['package-lock.json is not tracked by git']; }
  row('lockfile', tracked, 'package-lock.json tracked');
  row('pins', pinProblems(pkg, lock), 'every pin exact and equal to the lockfile');
  let audit;
  if (o.auditJson) audit = JSON.parse(fs.readFileSync(o.auditJson, 'utf8'));
  else {
    const r = npm(o.root, ['audit', '--omit=dev', '--json']);
    try { audit = JSON.parse(r.stdout); } catch { audit = null; }
  }
  row('audit', audit ? auditProblems(audit) : ['npm audit gave no JSON (offline?)'], `no high or critical finding (${o.auditJson ? 'fixture' : 'npm audit --omit=dev'})`);
  const licence = [];
  const text = fs.existsSync(path.join(o.root, 'LICENSE')) ? fs.readFileSync(path.join(o.root, 'LICENSE')) : null;
  if (!text) licence.push('LICENSE missing');
  else if (crypto.createHash('sha256').update(text).digest('hex') !== AGPL_SHA256) licence.push('LICENSE is not the AGPL-3.0 text');
  if (pkg.license !== LICENSE_ID) licence.push(`package.json license is ${pkg.license}`);
  row('license', licence, 'AGPL-3.0 text, package.json AGPL-3.0-or-later');
  const scripts = Object.entries(lock.packages || {}).filter(([k, v]) => k && v.hasInstallScript && !INSTALL_SCRIPT_ALLOW.has(k)).map(([k]) => `${k} has an install script`);
  const npmrc = fs.existsSync(path.join(o.root, '.npmrc')) ? read('.npmrc') : '';
  if (!/^ignore-scripts=true$/m.test(npmrc)) scripts.push('.npmrc does not keep ignore-scripts=true');
  row('install-scripts', scripts, 'no unexpected install script; ignore-scripts=true');
  if (o.browser) {
    const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'probe-play.mjs'), '--dist', o.dist, '--rooms', o.rooms, '--replays', o.replays, '--check', 'network,storage', ...(o.query ? ['--query', o.query] : [])], { cwd: REPO, encoding: 'utf8' });
    const lines = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter((l) => /network|storage|PASS|FAIL|never booted/.test(l));
    row('network-storage', r.status === 0 ? [] : [`probe-play exit ${r.status}: ${lines.slice(-3).join(' | ')}`], 'only the page origin; nothing stored');
  }
  for (const r of rows) process.stdout.write(`supply: ${r.id}: ${r.ok ? 'ok' : 'FAIL'}: ${r.detail}\n`);
  const pass = rows.every((r) => r.ok);
  process.stdout.write(`supply: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) process.stdout.write(`HUSH-JSON-BEGIN\n${JSON.stringify({ kind: 'supply', pass, rows }, null, 2)}\nHUSH-JSON-END\n`);
  return pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`supply: ${e.message}\n`); process.exitCode = 2; });
