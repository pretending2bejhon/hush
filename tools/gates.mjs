// D11 gate reader: the only reader of build/GATES.md. Nobody greps GATES for a prefix.
//   node tools/gates.mjs --check <GATE> <scope>   exit 0 only when the whole file parses against the anchored
//                                                grammar and the current line for that gate and scope exists
//                                                and is not revoked; exit 1 otherwise, with the reason
//   node tools/gates.mjs --lint                   exit 0 when every gate line in the file parses
//   node tools/gates.mjs --spec-digest            print the digest8 that binds JHON-GO: the first 8 hex of the
//                                                sha256 of build/HUSH-SPEC.md at the newest hush-spec: cut commit
// JHON-GO is checked as HUSH-SPEC or HUSH-SPEC@<digest8>; either way only a line bound to the current cut's
// digest counts, so an approval of an older cut is stale. The grammar is the cap hook's (one grammar).
// The repo is the git toplevel of the current directory.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATE_SCOPES, gateStatus, parseGates } from './cap-hook.mjs';

const GATES_FILE = 'build/GATES.md';

function git(top, args, encoding = 'utf8') {
  return execFileSync('git', args, { cwd: top, encoding, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function readGates(top) {
  const file = path.join(top, GATES_FILE);
  if (!fs.existsSync(file)) return { missing: true, entries: [], errors: [] };
  return { missing: false, ...parseGates(fs.readFileSync(file, 'utf8')) };
}

export function cutCommit(top) {
  return git(top, ['log', '--format=%H', '-1', '--extended-regexp', '--grep=^hush-spec: cut']).trim() || null;
}

export function specDigest8(top) {
  const cut = cutCommit(top);
  if (!cut) return { cut: null, d8: null };
  let body;
  try { body = git(top, ['show', `${cut}:build/HUSH-SPEC.md`], 'buffer'); } catch { return { cut, d8: null }; }
  return { cut, d8: crypto.createHash('sha256').update(body).digest('hex').slice(0, 8) };
}

// Returns {ok, reason, entry}.
export function checkGate(top, gate, scope) {
  const g = readGates(top);
  if (g.missing) return { ok: false, reason: `${GATES_FILE} is missing (the cut is incomplete)` };
  if (g.errors.length) return { ok: false, reason: g.errors.map((e) => `${GATES_FILE}:${e.line}: ${e.error}`).join('\n') };
  if (!Object.hasOwn(GATE_SCOPES, gate)) return { ok: false, reason: `unknown gate ${gate}` };
  let want = scope;
  if (gate === 'JHON-GO') {
    const m = /^HUSH-SPEC(?:@([0-9a-f]{8}))?$/.exec(scope);
    if (!m) return { ok: false, reason: `JHON-GO is checked as HUSH-SPEC or HUSH-SPEC@<digest8>, not ${scope}` };
    const { cut, d8 } = specDigest8(top);
    if (!cut) return { ok: false, reason: 'no hush-spec: cut commit yet, so nothing can be approved' };
    if (!d8) return { ok: false, reason: `the cut commit ${cut.slice(0, 8)} holds no build/HUSH-SPEC.md` };
    if (m[1] && m[1] !== d8) return { ok: false, reason: `stale digest: ${m[1]} is not the current cut's ${d8}` };
    want = `HUSH-SPEC@${d8}`;
  } else if (!GATE_SCOPES[gate].test(scope)) return { ok: false, reason: `bad scope for ${gate}: ${scope}` };
  const entry = gateStatus(g.entries, gate, want);
  if (!entry) {
    const any = g.entries.some((e) => e.gate === gate && e.scope === want);
    return { ok: false, reason: any ? `${gate}: ${want} is revoked` : `no ${gate}: ${want} line` };
  }
  return { ok: true, reason: `${gate}: ${want} | ${entry.time} (line ${entry.line})`, entry };
}

function main(argv) {
  const top = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  if (argv[0] === '--check' && argv.length === 3) {
    const r = checkGate(top, argv[1], argv[2]);
    process.stdout.write(`gates: ${r.ok ? 'ok' : 'FAIL'}: ${r.reason}\n`);
    return r.ok ? 0 : 1;
  }
  if (argv[0] === '--lint' && argv.length === 1) {
    const g = readGates(top);
    if (g.missing) { process.stdout.write(`gates: FAIL: ${GATES_FILE} is missing\n`); return 1; }
    for (const e of g.errors) process.stdout.write(`${GATES_FILE}:${e.line}: ${e.error}\n`);
    process.stdout.write(g.errors.length ? `gates: FAIL, ${g.errors.length} malformed line(s)\n` : `gates: ok, ${g.entries.length} line(s)\n`);
    return g.errors.length ? 1 : 0;
  }
  if (argv[0] === '--spec-digest' && argv.length === 1) {
    const { cut, d8 } = specDigest8(top);
    if (!d8) { process.stdout.write('gates: no hush-spec: cut commit with build/HUSH-SPEC.md\n'); return 1; }
    process.stdout.write(`${d8} (cut ${cut.slice(0, 8)})\n`);
    return 0;
  }
  process.stderr.write('usage: gates.mjs --check <GATE> <scope> | --lint | --spec-digest\n');
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`gates: ${e.message}\n`);
    process.exitCode = 2;
  }
}
