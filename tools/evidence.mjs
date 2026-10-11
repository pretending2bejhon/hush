// D12 evidence: runs one command without a shell and records it, redacted, as a proof file.
//   node tools/evidence.mjs <ID> <phase> -- <command> [args...]
//   node tools/evidence.mjs --json <kind> <ID> <phase> -- <command> [args...]
// The envelope holds the command, cwd, environment summary, start and end time, HEAD sha, exit code and
// the full interleaved output. The repo root and the home folder become <repo> and <home>; emails, tokens,
// the vault root name and every denylisted name become <redacted>; the finished text is scanned again
// before it is written. With --json, the command prints one JSON document between the lines
// HUSH-JSON-BEGIN and HUSH-JSON-END on stdout; it is redacted the same way and written as
// <folder>/<kind>-<HEAD sha>.json next to the text envelope.
// Phases session, review, fix, audit, verify and live write <folder>/<ID>.<attempt>.txt; proof writes
// build/evidence/<ID>.proof.<attempt>.txt; any other phase writes build/evidence/<ID>.<phase>.<attempt>.txt.
// Exit: the command's own code; 2 usage; 3 denylist missing or empty (nothing runs); 4 the record could
// not be made public-safe or written; 5 --json found no JSON document.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DenylistError, REPO_ROOT, makeContext, redactAndVerify } from './public-patterns.mjs';

const FOLDER_PHASES = new Set(['session', 'review', 'fix', 'audit', 'verify', 'live']);
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PHASE_RE = /^[a-z][a-z0-9-]{0,31}$/;
const KIND_RE = /^[a-z][a-z0-9-]{0,31}$/;
const OVERRIDES = ['HUSH_NAMES_FILE', 'HUSH_CAP_HOME', 'HUSH_REPO', 'HUSH_CAP_NOW'];

function iso(ms) {
  const d = new Date(ms);
  const off = -d.getTimezoneOffset();
  const p = (n) => String(n).padStart(2, '0');
  const a = Math.abs(off);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.floor(a / 60))}:${p(a % 60)}`;
}

function head() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
  } catch {
    return 'none';
  }
}

function npmCli(name) {
  const dir = path.dirname(process.execPath);
  const candidates = [
    path.join(dir, 'node_modules', 'npm', 'bin', `${name}-cli.js`),
    path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', `${name}-cli.js`),
  ];
  if (name === 'npm' && process.env.npm_execpath && /npm-cli\.js$/.test(process.env.npm_execpath)) candidates.unshift(process.env.npm_execpath);
  const hit = candidates.find((c) => fs.existsSync(c));
  if (!hit) throw new Error(`cannot find ${name}-cli.js next to node`);
  return hit;
}

function resolveCommand(cmd, args) {
  const name = cmd.toLowerCase();
  if (name === 'node' || name === 'node.exe') return [process.execPath, args];
  if (name === 'npm' || name === 'npx') return [process.execPath, [npmCli(name), ...args]];
  if (/\.(cmd|bat|ps1|sh)$/i.test(cmd)) throw new Error('evidence runs no .cmd, .bat, .ps1 or .sh file: there is no shell');
  return [cmd, args];
}

function quote(a) {
  return /[\s"']/.test(a) ? JSON.stringify(a) : a;
}

function target(id, phase, kind, sha) {
  const base = path.join(REPO_ROOT, 'build', 'evidence');
  const folder = FOLDER_PHASES.has(phase) ? path.join(base, phase) : base;
  fs.mkdirSync(folder, { recursive: true });
  let n = 1;
  const name = (k) => (FOLDER_PHASES.has(phase) ? `${id}.${k}.txt` : phase === 'proof' ? `${id}.proof.${k}.txt` : `${id}.${phase}.${k}.txt`);
  while (fs.existsSync(path.join(folder, name(n)))) n++;
  return {
    txt: path.join(folder, name(n)),
    json: kind ? path.join(folder, `${kind}-${sha}.json`) : null,
  };
}

function redactJson(value, ctx) {
  if (typeof value === 'string') return redactAndVerify(value, ctx).text;
  if (Array.isArray(value)) return value.map((v) => redactJson(v, ctx));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[redactAndVerify(k, ctx).text] = redactJson(v, ctx);
    return out;
  }
  return value;
}

function extractJson(stdout) {
  const lines = stdout.replace(/\r\n?/g, '\n').split('\n');
  const end = lines.lastIndexOf('HUSH-JSON-END');
  if (end < 0) return null;
  const begin = lines.lastIndexOf('HUSH-JSON-BEGIN', end);
  if (begin < 0) return null;
  try {
    return { value: JSON.parse(lines.slice(begin + 1, end).join('\n')) };
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  let kind = null;
  let rest = argv;
  if (rest[0] === '--json') {
    kind = rest[1];
    rest = rest.slice(2);
    if (!kind || !KIND_RE.test(kind)) return { error: '--json needs a lowercase kind such as perf, av or live' };
  }
  const sep = rest.indexOf('--');
  if (sep !== 2) return { error: 'usage: evidence.mjs [--json <kind>] <ID> <phase> -- <command> [args...]' };
  const [id, phase] = rest;
  if (!ID_RE.test(id)) return { error: `bad ID: ${id}` };
  if (!PHASE_RE.test(phase)) return { error: `bad phase: ${phase}` };
  if (kind && !FOLDER_PHASES.has(phase)) return { error: '--json writes only in the session, review, fix, audit, verify or live folders' };
  const command = rest.slice(3);
  if (!command.length) return { error: 'no command after --' };
  return { kind, id, phase, command };
}

async function main(argv) {
  const a = parseArgs(argv);
  if (a.error) {
    process.stderr.write(`evidence: ${a.error}\n`);
    return 2;
  }
  let ctx;
  try {
    ctx = makeContext();
  } catch (e) {
    if (e instanceof DenylistError) {
      process.stderr.write(`evidence: ${e.message}; nothing ran (fail closed)\n`);
      return 3;
    }
    throw e;
  }
  const [cmd, ...cmdArgs] = a.command;
  let file;
  let fileArgs;
  try {
    [file, fileArgs] = resolveCommand(cmd, cmdArgs);
  } catch (e) {
    process.stderr.write(`evidence: ${e.message}\n`);
    return 2;
  }
  const started = Date.now();
  const sha = head();
  const chunks = [];
  const stdoutChunks = [];
  const result = await new Promise((resolve) => {
    let child;
    try {
      child = spawn(file, fileArgs, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) {
      resolve({ code: 127, error: e.message });
      return;
    }
    child.stdout.on('data', (d) => { chunks.push(d); stdoutChunks.push(d); process.stdout.write(d); });
    child.stderr.on('data', (d) => { chunks.push(d); process.stderr.write(d); });
    child.on('error', (e) => resolve({ code: 127, error: e.message }));
    child.on('close', (code, signal) => resolve({ code: code ?? 128, signal }));
  });
  const ended = Date.now();
  const output = Buffer.concat(chunks).toString('utf8');
  const overrides = OVERRIDES.filter((k) => process.env[k]).join(', ') || 'none';
  const envelope = [
    'HUSH-EVIDENCE v1',
    `id: ${a.id}`,
    `phase: ${a.phase}`,
    `command: ${[cmd, ...cmdArgs].map(quote).join(' ')}`,
    `cwd: ${process.cwd()}`,
    `env: node ${process.version} | ${process.platform} ${process.arch} | overrides: ${overrides} | denylist: ${ctx.source}`,
    `time-start: ${iso(started)}`,
    `time-end: ${iso(ended)}`,
    `head: ${sha}`,
    `exit: ${result.code}${result.signal ? ` (signal ${result.signal})` : ''}${result.error ? ` (spawn error: ${result.error})` : ''}`,
    '--- output ---',
    output.replace(/\r\n?/g, '\n').replace(/\n$/, ''),
    '--- end ---',
    '',
  ].join('\n');
  const safe = redactAndVerify(envelope, ctx);
  if (!safe.clean) {
    process.stderr.write('evidence: the record still trips check-public after redaction; nothing written\n');
    return 4;
  }
  const out = target(a.id, a.phase, a.kind, sha);
  try {
    fs.writeFileSync(out.txt, safe.text, { flag: 'wx' });
  } catch (e) {
    process.stderr.write(`evidence: could not write the record: ${e.message}\n`);
    return 4;
  }
  process.stderr.write(`evidence: ${path.relative(REPO_ROOT, out.txt).split(path.sep).join('/')} (exit ${result.code})\n`);
  if (a.kind) {
    const doc = extractJson(Buffer.concat(stdoutChunks).toString('utf8'));
    if (!doc) {
      process.stderr.write('evidence: --json found no document between HUSH-JSON-BEGIN and HUSH-JSON-END\n');
      return 5;
    }
    const json = JSON.stringify(redactJson(doc.value, ctx), null, 2) + '\n';
    if (!redactAndVerify(json, ctx).clean) {
      process.stderr.write('evidence: the JSON still trips check-public after redaction; not written\n');
      return 4;
    }
    fs.writeFileSync(out.json, json);
    process.stderr.write(`evidence: ${path.relative(REPO_ROOT, out.json).split(path.sep).join('/')}\n`);
  }
  return result.code;
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (e) => { process.stderr.write(`evidence: ${e.stack || e.message}\n`); process.exitCode = 4; },
);
