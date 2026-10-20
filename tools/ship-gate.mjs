// The ship gate (D18, X1 to X12). HIGHEST-SCRUTINY.
//   node tools/ship-gate.mjs --digest [--rev <rev>]   the verdict digest of HEAD (or <rev>)
//   node tools/ship-gate.mjs --playtests rc<N>         the playtest rule of X11, the one function for it
//   node tools/ship-gate.mjs [--rows <ids>] [--record <dir>] [--all]
//        runs the gate: preconditions (P), the fresh verdicts (V), then X1 to X12. --rows limits it
//        (comma list, e.g. X1,X2 or V,X11). By default it stops at the first red row; --all runs every
//        row. --record writes every row to <dir>/ship-gate.json and exits 0 whatever the rows say (the
//        deploy dry run records, it does not enforce).
// Exit: 0 every row green (or recorded); 1 a row red; 2 usage, git error, or a tree dirty beyond
// build/GATES.md, build/GATES.sha256 and build/evidence/session/ (commit first, judge second).
// The digest: sha256 over `git ls-tree -r -z --full-tree <rev>` without the bookkeeping paths, so a
// record commit (rounds, gates, playtests, reviews, review/audit/verify/live evidence, proofs) never
// changes it, and any product, verifier, spec, room, replay, music or item-evidence change does.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateStatus, parseGates } from './cap-hook.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const BOOK_PREFIX = ['build/reviews/', 'build/evidence/review/', 'build/evidence/audit/', 'build/evidence/verify/', 'build/evidence/live/'];
const BOOK_EXACT = new Set(['build/HUSH-PROGRESS.md', 'build/HUSH-FIXLOG.md', 'build/HUSH-BUILD.md', 'build/PLAYTESTS.md',
  'build/GATES.md', 'build/GATES.sha256', 'build/SPEC-PROGRESS.md']);
export const N6_FRIENDS = 3;
export const N7_FIREFOX = true;
const MIN_FIRST_RUN = 600;
const MAX_FIRST_RUN = 900;

export function isBookkeeping(rel) {
  if (BOOK_EXACT.has(rel)) return true;
  if (BOOK_PREFIX.some((p) => rel.startsWith(p))) return true;
  return /^build\/evidence\/[^/]+\.proof\.[^/]+$/.test(rel);
}

function git(top, args, opts = {}) {
  return execFileSync('git', args, { cwd: top, maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

export function toplevel(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
}

export function digest(top, rev = 'HEAD') {
  const raw = git(top, ['ls-tree', '-r', '-z', '--full-tree', rev]);
  const h = crypto.createHash('sha256');
  let kept = 0;
  for (const entry of raw.toString('utf8').split('\0')) {
    if (!entry) continue;
    const rel = entry.slice(entry.indexOf('\t') + 1);
    if (isBookkeeping(rel)) continue;
    h.update(`${entry}\0`);
    kept++;
  }
  return { digest: h.digest('hex'), kept };
}

export function dirtyBeyondGates(top) {
  const out = git(top, ['status', '--porcelain', '-z', '--untracked-files=all']).toString('utf8');
  const bad = [];
  const parts = out.split('\0').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const code = p.slice(0, 2);
    const rel = p.slice(3);
    if (code[0] === 'R' || code[0] === 'C') i++;
    if (rel === 'build/GATES.md' || rel === 'build/GATES.sha256' || rel.startsWith('build/evidence/session/')) continue;
    bad.push(rel);
  }
  return bad;
}

// ---------------------------------------------------------------- playtests (X11)

// A run whose line the page never showed (the owner's ruling A, 2026-10-19: his rc1 run, played without
// ?playtest) is logged with `-:--` for its time and `-` for its deaths, the two together, always first-run: no.
// X11 never counts it: not as a friend's first run, not as the owner's full run, not as his Firefox run.
const RUN_RE = /^RUN-([1-9][0-9]{0,4}) \| (P[1-9][0-9]{0,2}|JHON|JHON-FIREFOX) \| rc([1-9][0-9]{0,3}) \| (\S+) \| (?:([0-9]{1,3}):([0-5][0-9])|(-:--)) \| (0|[1-9][0-9]{0,4}|-) \| first-run: (yes|no) \| ("(?:[^"\\\u0000-\u001f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*") \| redacted: (yes|no)$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parsePlaytests(text) {
  const rows = [];
  const errors = [];
  const seen = new Set();
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (!line.startsWith('RUN-')) return;
    const m = RUN_RE.exec(line);
    if (!m || !ISO_RE.test(m[4]) || Number.isNaN(Date.parse(m[4]))) { errors.push(`PLAYTESTS line ${i + 1}: not the row grammar`); return; }
    const unshown = m[7] === '-:--';
    if (unshown !== (m[8] === '-') || (unshown && m[9] !== 'no')) {
      errors.push(`PLAYTESTS line ${i + 1}: a run with no line shown has -:-- and - together, and first-run: no`);
      return;
    }
    const id = `RUN-${m[1]}`;
    if (seen.has(id)) { errors.push(`PLAYTESTS line ${i + 1}: ${id} repeats`); return; }
    seen.add(id);
    rows.push({
      id, who: m[2], rc: Number(m[3]), time: m[4], shown: !unshown,
      seconds: unshown ? null : Number(m[5]) * 60 + Number(m[6]), deaths: unshown ? null : Number(m[8]),
      firstRun: m[9] === 'yes', line: i + 1,
    });
  });
  return { rows, errors };
}

export function carriedRuns(gatesText, rc) {
  const { entries } = parseGates(gatesText);
  const ids = new Set();
  const scopes = new Set(entries.filter((e) => e.gate === 'JHON-CARRY' && e.scope.startsWith(`rc${rc}:`)).map((e) => e.scope));
  for (const sc of scopes) if (gateStatus(entries, 'JHON-CARRY', sc)) for (const id of sc.split(':')[1].split(',')) ids.add(id);
  return ids;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Distinct friends with a first run on rc<N> (or carried to it), the median of one first run each
// (the earliest), and the owner's full run and Firefox smoke run bound to rc<N>.
export function playtestVerdict(top, rc) {
  const problems = [];
  const read = (rel) => (fs.existsSync(path.join(top, rel)) ? fs.readFileSync(path.join(top, rel), 'utf8') : null);
  const ptText = read('build/PLAYTESTS.md');
  if (ptText === null) return { ok: false, problems: ['build/PLAYTESTS.md is missing (the cut is incomplete)'] };
  const { rows, errors } = parsePlaytests(ptText);
  problems.push(...errors);
  const carried = carriedRuns(read('build/GATES.md') || '', rc);
  const bound = (r) => r.rc === rc || carried.has(r.id);
  const firsts = new Map();
  for (const r of rows) {
    if (!/^P\d+$/.test(r.who) || !r.firstRun || !bound(r)) continue;
    const prev = firsts.get(r.who);
    if (!prev || Date.parse(r.time) < Date.parse(prev.time)) firsts.set(r.who, r);
  }
  const friends = [...firsts.values()];
  if (friends.length < N6_FRIENDS) problems.push(`${friends.length} distinct friend(s) with a first run on rc${rc}, need ${N6_FRIENDS}`);
  const med = friends.length ? median(friends.map((r) => r.seconds)) : null;
  if (med === null || med < MIN_FIRST_RUN || med > MAX_FIRST_RUN) problems.push(`median first run ${med === null ? 'none' : mmss(med)} is outside 10:00 to 15:00`);
  // A friend's run with no line shown is first-run: no by the grammar; the owner's two runs count only when shown.
  const shown = rows.filter((r) => r.shown);
  if (!shown.some((r) => r.who === 'JHON' && bound(r))) problems.push(`no full run by the owner on rc${rc}`);
  if (N7_FIREFOX && !shown.some((r) => r.who === 'JHON-FIREFOX' && bound(r))) problems.push(`no Firefox smoke run by the owner on rc${rc}`);
  return { ok: problems.length === 0, problems, friends: friends.map((r) => r.who), median: med };
}

// ---------------------------------------------------------------- verdicts (V)

function newestRc(top) {
  const tags = git(top, ['tag', '-l', 'hush-v1-rc*']).toString('utf8').split('\n').map((t) => /^hush-v1-rc([1-9][0-9]{0,3})$/.exec(t.trim())).filter(Boolean);
  if (!tags.length) return null;
  return Math.max(...tags.map((m) => Number(m[1])));
}

const VERDICT_RE = (head) => new RegExp(`^${head}: (PASS|FAIL|BLOCKED) \\(head=([0-9a-f]{7,40}) digest=([0-9a-f]{64})(?: blockers=(\\d+) majors=(\\d+) minors=(\\d+))?\\)$`);

function verdictRows(top, current) {
  const rows = [];
  const read = (rel) => (fs.existsSync(path.join(top, rel)) ? fs.readFileSync(path.join(top, rel), 'utf8') : '');
  const progress = read('build/HUSH-PROGRESS.md').split(/\r?\n/);
  // The review: the last cycle has ended, on a fresh PASS round.
  {
    const starts = progress.map((l) => /^CYCLE (\d+): start \| /.exec(l)).filter(Boolean).map((m) => Number(m[1]));
    const ends = progress.map((l) => /^CYCLE (\d+): end \| (\S+) \| R(\d+)$/.exec(l)).filter(Boolean);
    const lastStart = starts.length ? Math.max(...starts) : null;
    const end = ends.find((m) => Number(m[1]) === lastStart);
    let ok = false;
    let detail = 'no review cycle has ended';
    if (lastStart !== null && end) {
      const round = progress.map((l) => VERDICT_RE(`HUSH-REVIEW-R${end[3]}`).exec(l)).filter(Boolean).pop();
      if (!round) detail = `cycle ${lastStart} ended on R${end[3]}, which has no round line`;
      else if (round[1] !== 'PASS' || Number(round[4]) || Number(round[5])) detail = `R${end[3]} is ${round[1]}, not a PASS with 0 blockers and 0 majors`;
      else if (round[3] !== current) detail = `R${end[3]} is stale: digest ${round[3].slice(0, 8)}, now ${current.slice(0, 8)}`;
      else { ok = true; detail = `cycle ${lastStart} ended on R${end[3]}: PASS, fresh`; }
    } else if (lastStart !== null) detail = `cycle ${lastStart} is still open`;
    rows.push({ id: 'V-review', ok, detail });
  }
  // VERIFY: HUSH-BUILD.md carries the current digest.
  {
    const m = /head=([0-9a-f]{7,40}) digest=([0-9a-f]{64})/.exec(read('build/HUSH-BUILD.md'));
    const ok = Boolean(m && m[2] === current);
    rows.push({ id: 'V-verify', ok, detail: !m ? 'build/HUSH-BUILD.md is missing or has no head= digest= header' : ok ? 'HUSH-BUILD.md fresh' : `HUSH-BUILD.md is stale: ${m[2].slice(0, 8)}` });
  }
  // AUDIT: the newest audit record is a fresh PASS, and the ship-gate line quotes it.
  {
    const dir = path.join(top, 'build', 'reviews');
    const audits = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => /^AUDIT-([1-9][0-9]*)\.md$/.exec(f)).filter(Boolean).map((m) => Number(m[1])) : [];
    let ok = false;
    let detail = 'no audit record';
    if (audits.length) {
      const n = Math.max(...audits);
      const first = fs.readFileSync(path.join(dir, `AUDIT-${n}.md`), 'utf8').split(/\r?\n/)[0];
      const m = VERDICT_RE('HUSH-AUDIT').exec(first);
      const sg = progress.map((l) => /^HUSH-SHIP-GATE: PASS \(head=([0-9a-f]{7,40}) digest=([0-9a-f]{64})\)$/.exec(l)).filter(Boolean).pop();
      if (!m) detail = `AUDIT-${n}.md: first line is not the verdict grammar`;
      else if (m[1] !== 'PASS' || Number(m[4]) || Number(m[5])) detail = `AUDIT-${n} is ${m[1]}`;
      else if (m[3] !== current) detail = `AUDIT-${n} is stale: ${m[3].slice(0, 8)}`;
      else if (!sg) detail = 'no HUSH-SHIP-GATE: PASS line';
      else if (sg[2] !== current || sg[1] !== m[2]) detail = 'the HUSH-SHIP-GATE line does not quote the audit\'s head and the current digest';
      else { ok = true; detail = `AUDIT-${n}: PASS, fresh, ship-gate line matches`; }
    }
    rows.push({ id: 'V-audit', ok, detail });
  }
  // The rc tag: on a hush-audit: pass commit whose digest is the current one.
  {
    const rc = newestRc(top);
    let ok = false;
    let detail = 'no hush-v1-rc tag';
    if (rc !== null) {
      const tag = `hush-v1-rc${rc}`;
      const type = git(top, ['cat-file', '-t', tag]).toString('utf8').trim();
      const commit = git(top, ['rev-parse', `${tag}^{commit}`]).toString('utf8').trim();
      const subject = git(top, ['log', '-1', '--format=%s', commit]).toString('utf8').trim();
      const d = digest(top, commit).digest;
      if (type !== 'tag') detail = `${tag} is not an annotated tag`;
      else if (!/^hush-audit: pass /.test(subject)) detail = `${tag} is on "${subject}", not a hush-audit: pass commit`;
      else if (d !== current) detail = `${tag}'s commit digest ${d.slice(0, 8)} is not the current ${current.slice(0, 8)}`;
      else { ok = true; detail = `${tag} on ${commit.slice(0, 8)}, digest equal`; }
    }
    rows.push({ id: 'V-rc', ok, detail, rc });
  }
  return rows;
}

// ---------------------------------------------------------------- the X rows

function runCmd(top, cmd, args) {
  const file = cmd === 'node' ? process.execPath : cmd;
  const real = cmd === 'npm' || cmd === 'npx' ? [process.execPath, [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', `${cmd}-cli.js`), ...args]] : [file, args];
  const r = spawnSync(real[0], real[1], { cwd: top, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  return { ok: r.status === 0, detail: `${[cmd, ...args].join(' ')} exit ${r.status}${r.status === 0 ? '' : `: ${out.trim().split('\n').slice(-3).join(' | ')}`}` };
}

function jsonEvidence(top, folder, kind, want) {
  const dir = path.join(top, 'build', 'evidence', folder);
  if (!fs.existsSync(dir)) return { ok: false, detail: `no build/evidence/${folder}/` };
  const files = fs.readdirSync(dir).filter((f) => new RegExp(`^${kind}-[0-9a-f]{40}\\.json$`).test(f));
  for (const f of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (want(j)) return { ok: true, detail: `build/evidence/${folder}/${f}` };
  }
  return { ok: false, detail: `no ${kind} evidence in build/evidence/${folder}/ that is fresh and green` };
}

export const PERF_OK = (current) => (j) => j.kind === 'perf' && j.digest === current && j.headed === true && j.swiftshader === false
  && j.power === 'ac' && j.powerSaver === false && j.refreshHz === 60 && Array.isArray(j.heavyApps) && j.heavyApps.length === 0
  && j.meanFps >= 58 && j.p20 >= 0.99 && j.durationSec >= 60 && j.pass === true;
// X7's device-clock bound (HUSH-SPEC section 8.4; review R7, MAJOR 2): once valid, the line's offset moves at most
// this many ms peak to peak over the av probe's run. The gate holds the record to its own number, never to the bound
// the record carries, and wants the probe to have judged with the same one.
export const X7_CLOCK_BOUND_MS = 3;
export const AV_OK = (current) => (j) => j.kind === 'av' && j.digest === current && j.headed === true && j.contextRunning === true
  && j.scheduledVoices >= j.expectedVoices && j.expectedVoices > 0 && j.voiceErrors === 0 && j.lateDropped === 0
  && j.masterSignalOk === true && j.masterSilenceOk === true && Array.isArray(j.layers) && j.layers.length >= 1
  && j.layers.every((l) => l.soloSignalOk === true && l.soloSilenceOk === true)
  && j.clockValid === true && typeof j.clockJitterMs === 'number' && j.clockJitterMs <= X7_CLOCK_BOUND_MS
  && j.clockJitterBoundMs === X7_CLOCK_BOUND_MS && j.durationSec >= 60 && j.pass === true;
export const LIVE_OK = (sha) => (j) => j.kind === 'live' && j.expectedSha === sha && j.status === 200 && j.buildMeta === sha
  && j.onOriginMain === true && j.consoleErrors === 0 && j.pageErrors === 0 && j.bootToCalibration === true && j.pass === true;

// X3's jitter seed: the first 8 hex of the verdict digest (review R1, MINOR 5), so a bookkeeping commit never
// re-rolls it and every verdict on one digest judges the witnesses on one seed.
export const x3Seed = (verdictDigest) => parseInt(verdictDigest.slice(0, 8), 16) >>> 0;

function xRows(top, current, ids, rc) {
  const seed = x3Seed(current);
  const defs = {
    X1: () => runCmd(top, 'npm', ['run', 'smoke']),
    X2: () => runCmd(top, 'npm', ['test']),
    X3: () => runCmd(top, 'node', [path.join(TOOLS, 'replay.mjs'), '--all', '--jitter', '--seed', String(seed), '--kick']),
    X4: () => jsonEvidence(top, 'verify', 'perf', PERF_OK(current)),
    X5: () => runCmd(top, 'npm', ['run', 'probe:console']),
    X6: () => runCmd(top, 'npm', ['run', 'probe:flash']),
    X7: () => {
      const t = runCmd(top, 'npm', ['run', 'test:av']);
      if (!t.ok) return t;
      return jsonEvidence(top, 'verify', 'av', AV_OK(current));
    },
    X8: () => runCmd(top, 'npm', ['run', 'test:calibration']),
    X9: () => runCmd(top, 'node', [path.join(TOOLS, 'check-public.mjs'), '--history']),
    X10: () => runCmd(top, 'npm', ['run', 'probe:supply']),
    X11: () => {
      if (rc === null) return { ok: false, detail: 'no rc tag' };
      const problems = [];
      for (const g of ['JHON-PREVIEW', 'JHON-SHIP']) {
        const r = runCmd(top, 'node', [path.join(TOOLS, 'gates.mjs'), '--check', g, `rc${rc}`]);
        if (!r.ok) problems.push(`${g} rc${rc} missing or revoked`);
      }
      const p = playtestVerdict(top, rc);
      if (!p.ok) problems.push(...p.problems);
      return { ok: problems.length === 0, detail: problems.length ? problems.join('; ') : `rc${rc}: preview and ship gates, ${p.friends.length} friends, median ${mmss(p.median)}` };
    },
    X12: () => {
      if (rc === null) return { ok: false, detail: 'no rc tag' };
      const sha = git(top, ['rev-parse', `hush-v1-rc${rc}^{commit}`]).toString('utf8').trim();
      return jsonEvidence(top, 'live', 'live', LIVE_OK(sha));
    },
  };
  return ids.map((id) => ({ id, ...defs[id]() }));
}

const ALL_X = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12'];

function parseRows(s) {
  const out = [];
  for (const part of s.split(',')) {
    const m = /^X(\d+)-X(\d+)$/.exec(part);
    if (m) { for (let i = Number(m[1]); i <= Number(m[2]); i++) out.push(`X${i}`); continue; }
    out.push(part);
  }
  return out;
}

export function runGate(top, { rows = null, all = false } = {}) {
  const want = rows || ['P', 'V', ...ALL_X];
  const results = [];
  const dirty = dirtyBeyondGates(top);
  if (dirty.length) return { refused: `the tree is dirty beyond GATES and session evidence: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ' ...' : ''}`, results };
  const current = digest(top).digest;
  const stop = () => !all && results.some((r) => !r.ok);
  if (want.includes('P')) {
    for (const [id, args] of [['P-protect', ['protect.mjs', '--check']], ['P-content', ['spec-content.mjs', '--check']]]) {
      results.push({ id, ...runCmd(top, 'node', [path.join(TOOLS, args[0]), ...args.slice(1)]) });
    }
  }
  let rc = newestRc(top);
  if (want.includes('V') && !stop()) {
    for (const r of verdictRows(top, current)) {
      results.push(r);
      if (r.id === 'V-rc') rc = r.rc ?? rc;
      if (stop()) break;
    }
  }
  for (const id of ALL_X) {
    if (!want.includes(id) || stop()) continue;
    results.push(...xRows(top, current, [id], rc));
  }
  return { current, results };
}

function main(argv) {
  const top = toplevel();
  const log = (s) => process.stdout.write(`${s}\n`);
  if (argv[0] === '--digest') {
    const rev = argv[1] === '--rev' ? argv[2] : 'HEAD';
    log(digest(top, rev).digest);
    return 0;
  }
  if (argv[0] === '--playtests' && argv.length === 2) {
    const m = /^rc([1-9][0-9]{0,3})$/.exec(argv[1]);
    if (!m) { log('ship-gate: --playtests takes rc<N>'); return 2; }
    const v = playtestVerdict(top, Number(m[1]));
    for (const p of v.problems) log(`playtests: ${p}`);
    log(v.ok ? `playtests: PASS rc${m[1]}: ${v.friends.join(', ')}, median ${mmss(v.median)}` : `playtests: FAIL rc${m[1]}`);
    return v.ok ? 0 : 1;
  }
  let rows = null;
  let record = null;
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--rows') rows = parseRows(argv[++i] || '');
    else if (argv[i] === '--record') record = argv[++i];
    else if (argv[i] === '--all') all = true;
    else { log('usage: ship-gate.mjs --digest [--rev r] | --playtests rc<N> | [--rows ids] [--record dir] [--all]'); return 2; }
  }
  const res = runGate(top, { rows, all: all || Boolean(record) });
  if (res.refused) { log(`ship-gate: refused: ${res.refused}`); return 2; }
  for (const r of res.results) log(`${r.id}: ${r.ok ? 'green' : 'RED'} | ${r.detail}`);
  const red = res.results.filter((r) => !r.ok).length;
  log(`ship-gate: ${red ? `RED, ${red} row(s)` : 'GREEN'} (digest ${res.current.slice(0, 12)})`);
  if (record) {
    fs.mkdirSync(record, { recursive: true });
    fs.writeFileSync(path.join(record, 'ship-gate.json'), `${JSON.stringify({ digest: res.current, rows: res.results }, null, 2)}\n`);
    return 0;
  }
  return red ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { process.stderr.write(`ship-gate: ${e.message}\n`); process.exitCode = 2; }
}
