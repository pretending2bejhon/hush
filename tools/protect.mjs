// D11 verifier manifest.
//   node tools/protect.mjs --write   regenerate build/PROTECTED.sha256 (every verifier) and build/GATES.sha256 (GATES only)
//   node tools/protect.mjs --check   read-only: exit 0 when every listed file in both manifests matches, no
//                                    verifier is missing from the manifest, and every commit since the cut that
//                                    touched a protected path carries a hush-spec: or hush-gate: subject;
//                                    exit 1 listing each drifted path or commit; exit 2 on usage or git error.
//   node tools/protect.mjs --list    print the paths the rules select, one per line
// The repo is the git toplevel of the current directory, so a release clone or a fixture repo checks itself.
// Hashes are of the bytes on disk; with eol=lf a CRLF checkout drifts on purpose.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROTECTED_MANIFEST = 'build/PROTECTED.sha256';
export const GATES_MANIFEST = 'build/GATES.sha256';
export const GATES_FILE = 'build/GATES.md';

// Every verifier the spec session writes (D11): tests, tools, the probe API, the spec, the configs and the
// page around the canvas. GATES.md has its own manifest so a gate commit never touches this one (D18).
const PROTECTED_DIRS = ['tools/', 'tests/', 'src/probe/'];
const PROTECTED_FILES = new Set([
  'build/HUSH-SPEC.md',
  'package.json', 'package-lock.json', '.npmrc', '.nvmrc', '.gitattributes', '.gitignore',
  'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'eslint.config.mjs',
  'index.html', 'LICENSE', 'README.md',
]);
// Paths that only the spec session or the producer may commit: the verifiers, both manifests and GATES.
const SPEC_ONLY_EXTRA = new Set([PROTECTED_MANIFEST, GATES_MANIFEST, GATES_FILE]);
const ALLOWED_SUBJECT = /^hush-(spec|gate): \S/;
const CUT_SUBJECT = '^hush-spec: cut';

export function isProtected(rel) {
  return PROTECTED_DIRS.some((d) => rel.startsWith(d)) || PROTECTED_FILES.has(rel);
}

export function isSpecOnly(rel) {
  return isProtected(rel) || SPEC_ONLY_EXTRA.has(rel);
}

function git(top, args) {
  return execFileSync('git', args, { cwd: top, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function toplevel(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']).trim();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Tracked files plus untracked files git would add, so a new verifier is listed in the commit that adds it.
export function selectProtected(top) {
  const files = git(top, ['ls-files', '-z', '-co', '--exclude-standard']).split('\0').filter(Boolean);
  return [...new Set(files)].filter((rel) => isProtected(rel) && fs.existsSync(path.join(top, rel))).sort();
}

function manifestText(top, rels) {
  return rels.map((rel) => `${sha256(path.join(top, rel))}  ${rel}\n`).join('');
}

export function parseManifest(text) {
  const out = new Map();
  const bad = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const m = /^([0-9a-f]{64}) {2}(\S(?:.*\S)?)$/.exec(line);
    if (!m) bad.push(i + 1);
    else out.set(m[2], m[1]);
  });
  return { entries: out, bad };
}

function readManifest(top, rel, problems) {
  const file = path.join(top, rel);
  if (!fs.existsSync(file)) {
    problems.push(`${rel}: missing (run node tools/protect.mjs --write in a spec or gate commit)`);
    return new Map();
  }
  const { entries, bad } = parseManifest(fs.readFileSync(file, 'utf8'));
  for (const n of bad) problems.push(`${rel}:${n}: malformed manifest line`);
  return entries;
}

function cutCommit(top) {
  const out = git(top, ['log', '--format=%H', '-1', '--extended-regexp', `--grep=${CUT_SUBJECT}`]).trim();
  return out || null;
}

// Every commit since the cut (or every commit before there is one) that touched a spec-only path must
// carry a hush-spec: or hush-gate: subject.
export function subjectProblems(top) {
  let head;
  try { head = git(top, ['rev-parse', '--verify', '-q', 'HEAD']).trim(); } catch { return []; }
  if (!head) return [];
  const cut = cutCommit(top);
  const range = cut ? `${cut}..HEAD` : 'HEAD';
  const log = git(top, ['log', '--no-renames', '--format=%x01%H%x02%s', '--name-only', range]);
  const problems = [];
  for (const chunk of log.split('\x01').filter(Boolean)) {
    const [headLine, ...rest] = chunk.split('\n');
    const [sha, subject] = headLine.split('\x02');
    const touched = rest.map((l) => l.trim()).filter(Boolean).filter(isSpecOnly);
    if (touched.length && !ALLOWED_SUBJECT.test(subject)) {
      problems.push(`commit ${sha.slice(0, 8)} "${subject}" touched ${touched.join(', ')} without a hush-spec: or hush-gate: subject`);
    }
  }
  return problems;
}

export function check(top) {
  const problems = [];
  const listed = readManifest(top, PROTECTED_MANIFEST, problems);
  for (const [rel, want] of listed) {
    const file = path.join(top, rel);
    if (!fs.existsSync(file)) problems.push(`${rel}: listed but missing`);
    else if (sha256(file) !== want) problems.push(`${rel}: drifted from ${PROTECTED_MANIFEST}`);
  }
  if (listed.size) {
    for (const rel of selectProtected(top)) if (!listed.has(rel)) problems.push(`${rel}: a verifier path not listed in ${PROTECTED_MANIFEST}`);
  }
  if (fs.existsSync(path.join(top, GATES_MANIFEST))) {
    const gates = readManifest(top, GATES_MANIFEST, problems);
    if (gates.size !== 1 || !gates.has(GATES_FILE)) problems.push(`${GATES_MANIFEST}: must list exactly ${GATES_FILE}`);
    else if (!fs.existsSync(path.join(top, GATES_FILE))) problems.push(`${GATES_FILE}: listed but missing`);
    else if (sha256(path.join(top, GATES_FILE)) !== gates.get(GATES_FILE)) problems.push(`${GATES_FILE}: drifted from ${GATES_MANIFEST}`);
  } else problems.push(`${GATES_MANIFEST}: missing (run node tools/protect.mjs --write in a spec or gate commit)`);
  problems.push(...subjectProblems(top));
  return problems;
}

export function write(top) {
  const rels = selectProtected(top);
  fs.mkdirSync(path.join(top, 'build'), { recursive: true });
  fs.writeFileSync(path.join(top, PROTECTED_MANIFEST), manifestText(top, rels));
  if (!fs.existsSync(path.join(top, GATES_FILE))) throw new Error(`${GATES_FILE} is missing: the cut is incomplete`);
  fs.writeFileSync(path.join(top, GATES_MANIFEST), manifestText(top, [GATES_FILE]));
  return rels.length;
}

function main(argv) {
  const top = toplevel();
  if (argv.length === 1 && argv[0] === '--write') {
    const n = write(top);
    process.stdout.write(`protect: wrote ${PROTECTED_MANIFEST} (${n} paths) and ${GATES_MANIFEST} (1 path)\n`);
    return 0;
  }
  if (argv.length === 1 && argv[0] === '--check') {
    const problems = check(top);
    for (const p of problems) process.stdout.write(`${p}\n`);
    process.stdout.write(problems.length ? `protect: FAIL, ${problems.length} problem(s)\n` : 'protect: clean\n');
    return problems.length ? 1 : 0;
  }
  if (argv.length === 1 && argv[0] === '--list') {
    for (const rel of selectProtected(top)) process.stdout.write(`${rel}\n`);
    return 0;
  }
  process.stderr.write('usage: protect.mjs --write | --check | --list\n');
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`protect: ${e.message}\n`);
    process.exitCode = 2;
  }
}
