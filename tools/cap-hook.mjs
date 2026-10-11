// The Hush cap hook (CAPS, PF-HOOK). The owner registers it in the managed settings file for PreToolUse,
// PostToolUse and PostToolUseFailure on every tool, with onFailure "block"; the installed copy lives in
// C:\Program Files\ClaudeCode\hush\ and this repo copy is only its source.
// Hook mode (no arguments): one event on stdin; exit 0 allows, exit 2 denies with the reason on stderr.
// Any error inside the hook exits 2 (fail closed).
// Command line:
//   node tools/cap-hook.mjs --declare <executor|spec|producer>   the first call of every hush session
//   node tools/cap-hook.mjs --report [--session <id>]            counters, copies, registration, version
//   node tools/cap-hook.mjs --alerts                             every stop with its resolution status
//   node tools/cap-hook.mjs --crash-test arm                     one-shot startup failure for the live proof
// What it is and is not: it stops slips and casual forgery. Its program and registration are protected by the
// operating system; its counters, the repo's verifiers and the gate file are user-writable (CAPS, last bullet).
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const INSTALL_DIR = 'C:\\Program Files\\ClaudeCode\\hush';
export const MANAGED_SETTINGS = 'C:\\Program Files\\ClaudeCode\\managed-settings.json';
const MIN_CLAUDE_VERSION = [2, 1, 295];
const H = 3600e3;
const GAP_CAP_MS = 10 * 60e3;
const GRACE_MS = 10 * 60e3;
const GRACE_CALLS = 3;
const STALE_OPEN_MS = 6 * H;
const DEFAULT_SHELL_TIMEOUT_MS = 120000;

export const ROLES = {
  executor: { model: /sonnet/i, maxCalls: 600, maxActiveMs: 4 * H, maxSinceItem: 150, ledger: 'build/HUSH-PROGRESS.md', checkpoint: 'hush-build: checkpoint ' },
  spec: { model: /opus|fable/i, maxCalls: 1500, maxActiveMs: 6 * H, maxSinceItem: 0, ledger: 'build/SPEC-PROGRESS.md', checkpoint: 'hush-spec: checkpoint ' },
  producer: { model: /opus|fable/i, maxCalls: 1500, maxActiveMs: 6 * H, maxSinceItem: 0, ledger: 'build/HUSH-PROGRESS.md', checkpoint: 'hush-spec: checkpoint ' },
};

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const BACKGROUND_TOOLS = new Set(['Monitor', 'CronCreate', 'ScheduleWakeup', 'RemoteTrigger']);
const PATH_FIELDS = ['file_path', 'notebook_path', 'path', 'filePath', 'directory'];

const SELF = fileURLToPath(import.meta.url);
const IS_INSTALLED = normPath(SELF).startsWith(`${normPath(INSTALL_DIR)}/`);

// The installed copy ignores every override; the repo copy honours them so the tests can use fixtures.
function env(name) {
  return IS_INSTALLED ? undefined : process.env[name];
}
export function stateDir() {
  return path.resolve(env('HUSH_CAP_HOME') || path.join(os.homedir(), '.hush-cap'));
}
export function repoDir() {
  return path.resolve(env('HUSH_REPO') || path.join(os.homedir(), 'code', 'hush'));
}
function clock() {
  const v = env('HUSH_CAP_NOW');
  return v ? Number(v) : Date.now();
}
function installedHookPath() {
  return env('HUSH_CAP_INSTALLED_HOOK') || path.join(INSTALL_DIR, 'cap-hook.mjs');
}
function managedSettingsPath() {
  return env('HUSH_CAP_MANAGED_SETTINGS') || MANAGED_SETTINGS;
}

export function iso(ms) {
  const d = new Date(ms);
  const off = -d.getTimezoneOffset();
  const p = (n) => String(n).padStart(2, '0');
  const a = Math.abs(off);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.floor(a / 60))}:${p(a % 60)}`;
}

function normPath(p) {
  return String(p).replace(/[\\/]+/g, '/').replace(/\/$/, '').toLowerCase();
}

// One spelling for every path in shell text: forward slashes, lower case, home and Program Files expanded.
export function normText(s) {
  const home = normPath(os.homedir());
  let t = String(s).replace(/\\+/g, '/').toLowerCase();
  t = t.replace(/\$\{?env:userprofile\}?|%userprofile%|\$\{?home\}?(?=\/)/g, home);
  t = t.replace(/(^|[\s"'=(,;|&<>])~(?=\/)/g, `$1${home}`);
  t = t.replace(/\$\{?env:programfiles\}?|%programfiles%/g, 'c:/program files');
  t = t.replace(/progra~1/g, 'program files');
  t = t.replace(/(^|[\s"'=(,;|&<>])\/mnt\/([a-z])\//g, '$1$2:/');
  t = t.replace(/(^|[\s"'=(,;|&<>])\/([a-z])\/(?=users\/|program files)/g, '$1$2:/');
  t = t.replace(/file:\/+([a-z]:)/g, '$1');
  return t.replace(/\/{2,}/g, '/');
}

function containsPath(textN, pN) {
  let i = textN.indexOf(pN);
  while (i >= 0) {
    const after = textN[i + pN.length];
    if (after === undefined || !/[a-z0-9_.-]/.test(after)) return true;
    i = textN.indexOf(pN, i + 1);
  }
  return false;
}

function underDir(p, dir) {
  const a = normPath(p);
  const d = normPath(dir);
  return a === d || a.startsWith(`${d}/`);
}

function repoRel(p) {
  const a = normPath(p);
  const r = normPath(repoDir());
  if (a === r) return '';
  return a.startsWith(`${r}/`) ? a.slice(r.length + 1) : null;
}

// ---------------------------------------------------------------- shell parsing

// Splits a command into segments on && || ; | & and newlines, outside quotes. Tokens carry their
// unquoted value, whether any part was quoted, and whether they hold a substitution ($ or backtick).
export function tokenize(cmd) {
  const segs = [];
  let tokens = [];
  let tok = null;
  let error = null;
  const cur = () => (tok ??= { v: '', quoted: false, subst: false });
  const flushTok = () => { if (tok) { tokens.push(tok); tok = null; } };
  const flushSeg = (sep) => { flushTok(); segs.push({ tokens, sep }); tokens = []; };
  let i = 0;
  while (i < cmd.length) {
    const ch = cmd[i];
    const nx = cmd[i + 1];
    if (ch === "'") {
      const j = cmd.indexOf("'", i + 1);
      if (j < 0) { error = 'unbalanced single quote'; break; }
      const t = cur();
      t.v += cmd.slice(i + 1, j);
      t.quoted = true;
      i = j + 1;
      continue;
    }
    if (ch === '"') {
      const t = cur();
      t.quoted = true;
      let j = i + 1;
      for (; j < cmd.length && cmd[j] !== '"'; j++) {
        if (cmd[j] === '\\' && cmd[j + 1] === '"') { t.v += '"'; j++; continue; }
        if (cmd[j] === '$' || cmd[j] === '`') t.subst = true;
        t.v += cmd[j];
      }
      if (j >= cmd.length) { error = 'unbalanced double quote'; break; }
      i = j + 1;
      continue;
    }
    if (ch === '&' && nx === '&') { flushSeg('&&'); i += 2; continue; }
    if (ch === '|' && nx === '|') { flushSeg('||'); i += 2; continue; }
    if (ch === ';' || ch === '\n' || ch === '\r') { flushSeg(';'); i++; continue; }
    if (ch === '|') { flushSeg('|'); i++; continue; }
    if (ch === '>' || ch === '<' || (ch === '&' && nx === '>')) {
      flushTok();
      const m = /^(&>>?|>>?|<)(&\d?)?/.exec(cmd.slice(i));
      tokens.push({ v: m[0], op: true, quoted: false, subst: false });
      i += m[0].length;
      continue;
    }
    if (ch === '&') {
      if (tok || tokens.length) flushSeg('&');
      i++;
      continue;
    }
    if (ch === '(' || ch === ')' || ch === '{' || ch === '}') { flushSeg(ch); i++; continue; }
    if (/\s/.test(ch)) { flushTok(); i++; continue; }
    if (ch === '$' || ch === '`') cur().subst = true;
    cur().v += ch;
    i++;
  }
  flushSeg(null);
  for (let k = 0; k < segs.length; k++) segs[k].prev = k ? segs[k - 1].sep : null;
  return { segs, error };
}

function words(seg) {
  const w = seg.tokens.filter((t) => !t.op);
  let k = 0;
  while (k < w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[k].v) && !w[k].quoted) k++;
  return w.slice(k);
}

function base(name) {
  return String(name).replace(/\\/g, '/').split('/').pop().toLowerCase();
}

function parseGits(segs, cwd) {
  const out = [];
  for (const seg of segs) {
    const w = words(seg);
    if (!w.length || !['git', 'git.exe'].includes(base(w[0].v))) continue;
    let i = 1;
    let dir = null;
    while (i < w.length) {
      const v = w[i].v;
      if (v === '-C') { dir = w[i + 1] ? w[i + 1].v : null; i += 2; continue; }
      if (['-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'].includes(v)) { i += 2; continue; }
      if (v.startsWith('-')) { i++; continue; }
      break;
    }
    out.push({ sub: w[i] ? w[i].v : '', args: w.slice(i + 1), repo: path.resolve(cwd, dir || '.') });
  }
  return out;
}

const WRITE_CMDS = new Set([
  'rm', 'rmdir', 'rd', 'del', 'erase', 'mv', 'move', 'cp', 'copy', 'xcopy', 'robocopy', 'tee', 'ren', 'rename',
  'touch', 'truncate', 'dd', 'ln', 'mklink', 'install', 'sc', 'ac', 'ni', 'ri', 'mi', 'cpi', 'rni', 'clc',
  'shred', 'unlink', 'chmod', 'chown', 'icacls', 'attrib', 'takeown',
]);
const WRITE_TEXT = [
  /(^|[^a-z0-9_-])(set-content|add-content|out-file|clear-content|remove-item|move-item|copy-item|rename-item|new-item|tee-object|set-item|set-acl|expand-archive|compress-archive)([^a-z0-9_-]|$)/,
  /(^|[^a-z0-9_-])export-[a-z]+/,
  /writealltext|writeallbytes|writealllines|appendalltext|appendalllines|\.delete\(|\.moveto\(|\.copyto\(|\.openwrite\(|createtext\(/,
  /(^|[\s;&|(])sed\s+(-[a-z]*i|--in-place)/,
  /(^|[\s;&|(])perl\s+-[a-z]*i/,
  /(^|[^a-z0-9_-])git\s+(rm|mv|clean|restore)\b/,
  /(^|[^a-z0-9_-])git\s+checkout\s+(--|-f\b|\.)/,
];

function stripQuoted(cmd) {
  return cmd.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, (m) => m[0] + ' '.repeat(Math.max(0, m.length - 2)) + m[m.length - 1]);
}

function hasRedirect(cmd) {
  const s = stripQuoted(cmd);
  const re = /(\d|\*)?>>?/g;
  let m;
  while ((m = re.exec(s))) {
    const before = s[m.index - 1] || '';
    if (before === '-' || before === '=') continue;
    const after = s.slice(m.index + m[0].length);
    if (after.startsWith('=')) continue;
    const target = after.replace(/^\s+/, '');
    if (/^&\d/.test(target) || /^\$null\b/i.test(target) || /^\/dev\/null\b/.test(target) || /^nul\b/i.test(target)) continue;
    return true;
  }
  return false;
}

function hasWriteForm(cmd, segs) {
  if (hasRedirect(cmd)) return true;
  const t = cmd.toLowerCase();
  if (WRITE_TEXT.some((re) => re.test(t))) return true;
  return segs.some((seg) => {
    const w = words(seg);
    return w.length > 0 && WRITE_CMDS.has(base(w[0].v));
  });
}

function detachForm(cmd, segs) {
  const t = cmd.toLowerCase();
  const named = [
    [/(^|[^a-z0-9_-])start-process([^a-z0-9_-]|$)/, 'Start-Process'],
    [/(^|[^a-z0-9_-])start-(thread)?job([^a-z0-9_-]|$)/, 'Start-Job'],
    [/(^|[^a-z0-9_-])nohup([^a-z0-9_-]|$)/, 'nohup'],
    [/(^|[^a-z0-9_-])setsid([^a-z0-9_-]|$)/, 'setsid'],
    [/(^|[^a-z0-9_])detached([^a-z0-9_]|$)/, 'detached'],
    [/(^|[^a-z0-9_])unref([^a-z0-9_]|$)/, 'unref'],
    [/(^|[^a-z0-9_-])disown([^a-z0-9_-]|$)/, 'disown'],
    [/-asjob\b/, '-AsJob'],
    [/(^|[^a-z0-9_-])schtasks([^a-z0-9_-]|$)/, 'schtasks'],
    [/register-scheduled(task|job)/, 'Register-ScheduledTask'],
  ];
  for (const [re, name] of named) if (re.test(t)) return name;
  for (const seg of segs) {
    const w = words(seg);
    if (w.length && base(w[0].v) === 'start') return 'start';
    if (seg.sep === '&' && seg.tokens.length) return 'a trailing &';
  }
  return null;
}

function leadingFlags(w) {
  const out = [];
  for (const t of w) {
    if (!t.v.startsWith('-') && !t.v.startsWith('/')) break;
    out.push(t.v);
  }
  return out;
}

function inlineInterpreter(cmd, segs) {
  const t = cmd.toLowerCase();
  if (/(^|[^a-z0-9_-])(invoke-expression|iex)([^a-z0-9_-]|$)/.test(t)) return 'Invoke-Expression';
  if (/\[(system\.)?io\.file\]/.test(t)) return '[IO.File]';
  if (/\[scriptblock\]::create/.test(t) || /(^|[^a-z0-9_-])add-type([^a-z0-9_-]|$)/.test(t)) return 'inline code';
  for (const seg of segs) {
    const w = words(seg);
    if (!w.length) continue;
    const name = base(w[0].v).replace(/\.exe$/, '');
    const args = w.slice(1);
    const flags = leadingFlags(args);
    if (/^(python[0-9.]*|py|pythonw)$/.test(name) && (flags.some((f) => /^-[a-z]*c$/i.test(f)) || flags.includes('-'))) return `${name} -c`;
    if (/^(node|nodejs)$/.test(name) && flags.some((f) => /^(-e|--eval|-p|--print|-pe|-ep|-|--input-type(=.*)?)$/.test(f))) return 'node -e';
    if (name === 'deno' && args[0] && args[0].v === 'eval') return 'deno eval';
    if (['bun', 'ruby', 'perl'].includes(name) && flags.some((f) => /^(-e|--eval)$/.test(f))) return `${name} -e`;
    if (/^(powershell|pwsh|powershell_ise)$/.test(name)) {
      if (args.some((a) => /^[-/](c|co|com|comm|comma|comman|command|e|ec|en|enc|enco|encod|encode|encoded|encodedc|encodedco|encodedcom|encodedcomm|encodedcomma|encodedcomman|encodedcommand)$/i.test(a.v))) return `${name} -c`;
      if (args.length && !args.some((a) => /^[-/]f(ile)?$/i.test(a.v)) && args.some((a) => !a.v.startsWith('-') && !a.v.startsWith('/'))) return `${name} <command>`;
    }
    if (/^(bash|sh|zsh|dash|ksh)$/.test(name) && flags.some((f) => /^-[a-z]*c[a-z]*$/i.test(f))) return `${name} -c`;
    if (name === 'cmd' && args.some((a) => /^\/[ck]$/i.test(a.v))) return 'cmd /c';
    if (name === 'npx' && flags.some((f) => /^(-c|--call)$/.test(f))) return 'npx -c';
    if (name === 'npm' && args[0] && args[0].v === 'exec' && args.some((a) => /^(-c|--call)$/.test(a.v))) return 'npm exec -c';
    if (seg.prev === '|' && ['node', 'python', 'python3', 'py', 'bash', 'sh', 'pwsh', 'powershell', 'ruby', 'perl', 'iex', 'cmd'].includes(name)) return `a pipe into ${name}`;
  }
  return null;
}

function pathRegex(entry) {
  const pre = String.raw`(^|[\s"'=(,;|&<>:])(\./)?`;
  const post = String.raw`(?=[\s"';|&)<>,]|$)`;
  const e = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return entry.endsWith('/') ? new RegExp(`${pre}${e.slice(0, -1)}(/|${post})`) : new RegExp(`${pre}${e}${post}`);
}

const EXECUTOR_PROTECTED = [
  'tools/', 'tests/', 'src/probe/', 'build/reviews/', 'build/evidence/',
  'build/gates.md', 'build/gates.sha256', 'build/hush-spec.md', 'build/protected.sha256', 'build/spec-progress.md',
  'build/hush-fixlog.md', 'build/playtests.md', 'build/hush-build.md',
  'package.json', 'package-lock.json', '.npmrc', '.nvmrc', '.gitattributes', '.gitignore', 'index.html', 'license', 'readme.md',
];
const CONFIG_RE = /^(tsconfig[^/]*\.json|(vite|vitest|playwright|eslint)\.config\.[cm]?[jt]s)$/;
const CONFIG_TEXT_RE = /(^|[\s"'=(,;|&<>:])(\.\/)?(tsconfig[\w.-]*\.json|(vite|vitest|playwright|eslint)\.config\.[cm]?[jt]s)(?=[\s"';|&)<>,]|$)/;
const PRODUCT_TEXT = [
  /(^|[\s"'=(,;|&<>:])(\.\/)?src\/(?!probe(\/|$))/,
  /(^|[\s"'=(,;|&<>:])(\.\/)?src(?=[\s"';|&)<>,]|$)/,
  pathRegex('rooms/'), pathRegex('music/'), pathRegex('replays/'),
];
const EVIDENCE_TEXT = pathRegex('build/evidence/');

function manifestPaths() {
  const f = path.join(repoDir(), 'build', 'PROTECTED.sha256');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => /^[0-9a-f]{64}\s+\*?(.+)$/i.exec(l.trim())).filter(Boolean).map((m) => normPath(m[1]));
}

function executorProtected(rel) {
  return EXECUTOR_PROTECTED.some((e) => (e.endsWith('/') ? rel === e.slice(0, -1) || rel.startsWith(e) : rel === e))
    || CONFIG_RE.test(rel) || manifestPaths().includes(rel);
}

function isProduct(rel) {
  return (rel.startsWith('src/') && !rel.startsWith('src/probe/') && rel !== 'src/probe')
    || ['rooms/', 'music/', 'replays/'].some((d) => rel.startsWith(d));
}

function relativeText(textN) {
  const r = normPath(repoDir());
  return textN.split(`${r}/`).join(' ');
}

function mentionsExecutorProtected(textN) {
  const t = relativeText(textN);
  return EXECUTOR_PROTECTED.some((e) => pathRegex(e).test(t)) || CONFIG_TEXT_RE.test(t) || manifestPaths().some((p) => pathRegex(p).test(t));
}

function mentionsProduct(textN) {
  const t = relativeText(textN);
  return PRODUCT_TEXT.some((re) => re.test(t));
}

function namesInstalledOrManaged(s) {
  const t = normText(s);
  return /(^|[^a-z0-9_-])claudecode([^a-z0-9_-]|$)/.test(t) || t.includes('managed-settings');
}

function namesStateDirText(textN) {
  return textN.includes('.hush-cap') || containsPath(textN, normPath(stateDir()));
}

function namesRepoClaudeText(textN, cwdInRepo) {
  if (containsPath(textN, `${normPath(repoDir())}/.claude`)) return true;
  return cwdInRepo && /(^|[\s"'=(,;|&<>])(\.\/)?\.claude(\/|(?=[\s"';|&)<>,]|$))/.test(textN);
}

// ---------------------------------------------------------------- per-event context

function eventCtx(ev, { parse }) {
  const input = ev.tool_input && typeof ev.tool_input === 'object' ? ev.tool_input : {};
  const isShell = SHELL_TOOLS.has(ev.tool_name);
  const cmd = isShell ? String(input.command ?? '') : '';
  const cwd = ev.cwd ? path.resolve(String(ev.cwd)) : process.cwd();
  const cwdInRepo = Boolean(ev.cwd) && underDir(cwd, repoDir());
  const paths = [];
  for (const k of PATH_FIELDS) if (typeof input[k] === 'string' && input[k]) paths.push(path.resolve(cwd, input[k]));
  if (ev.tool_name === 'Glob' && typeof input.pattern === 'string' && /^([A-Za-z]:|[\\/]|~)/.test(input.pattern)) paths.push(input.pattern);
  const filePath = WRITE_TOOLS.has(ev.tool_name) ? paths[0] || null : null;
  const textN = isShell ? normText(cmd) : '';
  let segs = [];
  let parseError = null;
  if (isShell && parse) ({ segs, error: parseError } = tokenize(cmd));
  return { input, isShell, cmd, cwd, cwdInRepo, paths, filePath, textN, segs, parseError, gits: parse ? parseGits(segs, cwd) : [] };
}

function namesRepo(ctx) {
  const r = normPath(repoDir());
  return containsPath(ctx.textN, r) || ctx.paths.some((p) => underDir(p, repoDir()));
}

export function parseDeclare(cmd) {
  const m = /^node tools[\\/]cap-hook\.mjs --declare (executor|spec|producer)$/.exec(String(cmd).trim());
  return m ? m[1] : null;
}

// ---------------------------------------------------------------- state

function freshState(ev, role, now) {
  return {
    v: 1,
    session_id: ev.session_id,
    role,
    declaredAt: now,
    repo: repoDir(),
    transcript_path: ev.transcript_path || null,
    model: null,
    calls: 0,
    callsSinceItem: 0,
    items: 0,
    commits: { 'hush-spec': 0, 'hush-gate': 0, 'hush-review': 0 },
    activeMs: 0,
    lastEnd: null,
    open: {},
    pending: {},
    agents: {},
    cap: null,
    events: [],
  };
}

function load(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!s || s.v !== 1 || !ROLES[s.role]) throw new Error(`cap state unreadable: ${path.basename(file)}`);
  s.open ??= {};
  s.pending ??= {};
  s.agents ??= {};
  s.events ??= [];
  s.commits = { 'hush-spec': 0, 'hush-gate': 0, 'hush-review': 0, ...(s.commits || {}) };
  return s;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function save(file, s) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s));
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (e) {
      if (attempt >= 40) throw e;
      sleep(25);
    }
  }
}

function withLock(lockPath, fn) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + 10000;
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(lockPath, 'wx');
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > 15000) { fs.unlinkSync(lockPath); continue; }
      } catch { /* the holder just released it */ }
      if (Date.now() > deadline) throw new Error(`state lock busy: ${path.basename(lockPath)}`);
      sleep(20);
    }
  }
  try {
    return fn();
  } finally {
    fs.closeSync(fd);
    try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
  }
}

function record(s, now, ev, decision) {
  s.events.push({ t: iso(now), e: ev.hook_event_name, tool: ev.tool_name, agent: ev.agent_id || 'main', d: decision });
  if (s.events.length > 200) s.events.splice(0, s.events.length - 200);
}

function count(s, ev) {
  s.calls += 1;
  if (s.role === 'executor') s.callsSinceItem += 1;
  const key = ev.agent_id || 'main';
  s.agents[key] = (s.agents[key] || 0) + 1;
}

function chargeGap(s, now) {
  for (const [id, o] of Object.entries(s.open)) if (now - o.start > STALE_OPEN_MS) delete s.open[id];
  if (s.lastEnd != null && now > s.lastEnd) s.activeMs += Math.min(now - s.lastEnd, GAP_CAP_MS);
  s.lastEnd = Math.max(s.lastEnd ?? now, now);
}

// ---------------------------------------------------------------- transcripts

function readTail(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString('utf8').split('\n');
    if (start > 0) lines.shift();
    return { lines, whole: start === 0 };
  } finally {
    fs.closeSync(fd);
  }
}

function lastField(file, pick) {
  if (!file || !fs.existsSync(file)) return null;
  for (const bytes of [256 * 1024, 4 * 1024 * 1024, Number.MAX_SAFE_INTEGER]) {
    const { lines, whole } = readTail(file, bytes);
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i].trim();
      if (!l) continue;
      let o;
      try { o = JSON.parse(l); } catch { continue; }
      const v = pick(o);
      if (v) return v;
    }
    if (whole) return null;
  }
  return null;
}

export function readModel(file) {
  return lastField(file, (o) => (o && o.type === 'assistant' && !o.isSidechain && o.message && typeof o.message.model === 'string'
    && o.message.model && o.message.model !== '<synthetic>' ? o.message.model : null));
}

function readVersion(file) {
  return lastField(file, (o) => (o && typeof o.version === 'string' && /^\d+\.\d+\.\d+/.test(o.version) ? o.version : null));
}

// ---------------------------------------------------------------- gates and ledgers

export const GATE_SCOPES = {
  CONSENT: /^[a-z0-9][a-z0-9-]{0,63}$/,
  'JHON-GO': /^HUSH-SPEC@[0-9a-f]{8}$/,
  'JHON-CODEX': /^executor$/,
  'JHON-CAPS-RESIDUAL': /^all-sessions$/,
  'JHON-CAPS-ADVISORY': /^all-sessions$/,
  'JHON-PREVIEW': /^rc[1-9][0-9]{0,3}$/,
  'JHON-CARRY': /^rc[1-9][0-9]{0,3}:RUN-[1-9][0-9]{0,4}(?:,RUN-[1-9][0-9]{0,4})*$/,
  'JHON-SHIP': /^rc[1-9][0-9]{0,3}$/,
};
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const JSON_STRING_RE = /^"(?:[^"\\\u0000-\u001f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*"$/;
const GATE_LINE_START = /^(CONSENT|JHON-[A-Z-]+|REVOKED):/;
const NEGATION = /\b(?:not\s+yet|not\s+now|don'?t|do\s+not|wait|hold\s+(?:on|off)|no[\s-]?go|stop|cancel|reject(?:ed)?|later)\b/i;

// One gate line against the anchored grammar (PF-CONSENT). Returns {ok, ...} or {ok: false, error}.
export function parseGateLine(line) {
  const bad = (error) => ({ ok: false, error });
  let rest = line;
  const revoked = rest.startsWith('REVOKED: ');
  let m;
  if (revoked) {
    rest = rest.slice(9);
    m = /^([A-Z][A-Z-]*) (\S+) \| /.exec(rest);
    if (!m) return bad('a REVOKED line reads: REVOKED: <GATE> <scope> | <ISO> | "<words>" | redacted: yes|no');
  } else {
    m = /^([A-Z][A-Z-]*): (\S+) \| /.exec(rest);
    if (!m) return bad('a gate line reads: <GATE>: <scope> | <ISO> | "<words>" | redacted: yes|no');
  }
  const [, gate, scope] = m;
  rest = rest.slice(m[0].length);
  if (!Object.hasOwn(GATE_SCOPES, gate)) return bad(`unknown gate ${gate}`);
  if (!GATE_SCOPES[gate].test(scope)) return bad(`bad scope for ${gate}: ${scope}`);
  const t = /^(\S+) \| /.exec(rest);
  if (!t || !ISO_RE.test(t[1]) || Number.isNaN(Date.parse(t[1]))) return bad('bad ISO-8601 time (an offset is required)');
  rest = rest.slice(t[0].length);
  const tail = / \| redacted: (yes|no)$/.exec(rest);
  if (!tail) return bad('the line must end with | redacted: yes or | redacted: no');
  const quoted = rest.slice(0, rest.length - tail[0].length);
  if (!JSON_STRING_RE.test(quoted)) return bad('the words must be one JSON string (escape inner quotes and line breaks)');
  const words = JSON.parse(quoted);
  if (gate.startsWith('JHON-') && !revoked) {
    const prefix = `${gate}: ${scope.split('@')[0]}`;
    const next = words[prefix.length];
    if (!words.startsWith(prefix) || (next !== undefined && !/[\s.,;:!@]/.test(next))) return bad(`the quoted message must begin with "${prefix}"`);
    if (NEGATION.test(words.slice(prefix.length))) return bad('the quoted message does not give the go-ahead');
  }
  return { ok: true, gate, scope, time: t[1], words, redacted: tail[1] === 'yes', revoked };
}

export function parseGates(text) {
  const entries = [];
  const errors = [];
  String(text).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, i) => {
    if (!GATE_LINE_START.test(line)) return;
    const r = parseGateLine(line);
    if (r.ok) entries.push({ ...r, line: i + 1 });
    else errors.push({ line: i + 1, error: r.error });
  });
  return { entries, errors };
}

// The last line for a gate and scope is current; a later REVOKED line withdraws it.
export function gateStatus(entries, gate, scope) {
  let current = null;
  let revoked = false;
  for (const e of entries) {
    if (e.gate !== gate || e.scope !== scope) continue;
    if (e.revoked) { if (current) revoked = true; } else { current = e; revoked = false; }
  }
  return current && !revoked ? current : null;
}

function readRepoFile(rel) {
  const f = path.join(repoDir(), ...rel.split('/'));
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}

function unrevokedGo() {
  const { entries } = parseGates(readRepoFile('build/GATES.md'));
  const scopes = new Set(entries.filter((e) => e.gate === 'JHON-GO').map((e) => e.scope));
  return [...scopes].some((sc) => gateStatus(entries, 'JHON-GO', sc));
}

function hasBuildLine() {
  return /^HUSH-BUILD: /m.test(readRepoFile('build/HUSH-PROGRESS.md'));
}

const ESC_RE = /^HUSH-(?:SPEC|PHASE3|EXECUTE)-ESCALATE: .+ \| \S+ \| [0-9a-f]{8}$/;
const RESOLVED_RE = /^RESOLVED: (.+) \| (\S+) \| (evidence: \S+|"(?:[^"\\]|\\.)*") \| next: (spec|executor|producer)$/;
const ALERT_LINE_RE = /^(ALERT|BUDGET)#(\d+) \| (\S+) \| (\S+) \| (\S+) \| (\S+)$/;

// Every stop (ALERT, BUDGET, escalation line) with its resolution status, read from alerts.log and
// SPEC-PROGRESS, HUSH-PROGRESS and HUSH-FIXLOG.
export function computeStops() {
  const ledgers = ['build/SPEC-PROGRESS.md', 'build/HUSH-PROGRESS.md', 'build/HUSH-FIXLOG.md'].map(readRepoFile);
  const lines = ledgers.flatMap((t) => t.split(/\r?\n/));
  const targets = lines.map((l) => RESOLVED_RE.exec(l)).filter((m) => m && ISO_RE.test(m[2])).map((m) => m[1].trim());
  const escalations = lines.filter((l) => ESC_RE.test(l));
  const resolvedEsc = escalations.filter((l) => targets.includes(l.trim()));
  const out = [];
  const alertsFile = path.join(stateDir(), 'alerts.log');
  const alertText = fs.existsSync(alertsFile) ? fs.readFileSync(alertsFile, 'utf8') : '';
  for (const l of alertText.split(/\r?\n/)) {
    const m = ALERT_LINE_RE.exec(l.trim());
    if (!m) continue;
    const id = `${m[1]}#${m[2]}`;
    const idRe = new RegExp(`${id}(?!\\d)`);
    if (m[1] === 'BUDGET') { out.push({ line: l.trim(), id, status: 'normal end (no resolution needed)', unresolved: false }); continue; }
    const done = targets.includes(id) || resolvedEsc.some((e) => idRe.test(e));
    out.push({ line: l.trim(), id, status: done ? 'resolved' : 'UNRESOLVED', unresolved: !done });
  }
  for (const e of escalations) {
    const done = resolvedEsc.includes(e);
    out.push({ line: e.trim(), id: e.trim(), status: done ? 'resolved' : 'UNRESOLVED', unresolved: !done });
  }
  return out;
}

// ---------------------------------------------------------------- rules

const SELF_MSG = 'cap-hook: no call may name the installed hook or the managed settings file, in any spelling.';
const CLAUDE_MSG = 'cap-hook: the repo never holds a .claude folder, and no call may name one under it.';
const STATE_MSG = 'cap-hook: the cap state folder is read-only for sessions (reads are allowed, writes are not).';
const EVIDENCE_MSG = 'cap-hook: evidence files are written only by node tools/evidence.mjs.';

function subjectAllowed(role, child, subject) {
  if (role === 'executor') return !child && /^hush-build: \S/.test(subject);
  if (role === 'spec') return /^hush-(spec|gate): \S/.test(subject);
  if (/^hush-(review|verify|audit|gate): \S/.test(subject)) return true;
  if (/^hush-spec: (amend|adopt|resolve|cycle|reopen|escalate|fixlog|playtest)\b/.test(subject)) return true;
  return child && /^hush-fix: \S/.test(subject);
}

function commitRule(g, role, child) {
  let subject = null;
  let n = 0;
  for (let i = 0; i < g.args.length; i++) {
    const a = g.args[i];
    const v = a.v;
    if (v === '-m' || v === '--message') {
      const nx = g.args[i + 1];
      if (!nx || nx.subst) return 'cap-hook: a commit subject is one literal string (no substitution).';
      subject = nx.v;
      n++;
      i++;
      continue;
    }
    if (v.startsWith('--message=') || /^-m./s.test(v)) {
      if (a.subst) return 'cap-hook: a commit subject is one literal string (no substitution).';
      subject = v.startsWith('--message=') ? v.slice(10) : v.slice(2);
      n++;
      continue;
    }
    if (v === '--allow-empty' || v === '-q' || v === '--quiet') continue;
    return `cap-hook: commits take exactly the form git commit -m "<subject>" (found ${v}).`;
  }
  if (n !== 1) return 'cap-hook: a commit carries exactly one -m and no body.';
  if (/[\r\n]/.test(subject) || !subject.trim()) return 'cap-hook: a commit message is one subject line and nothing else.';
  if (!subjectAllowed(role, child, subject)) return `cap-hook: the ${role}${child ? ' subagent' : ''} may not commit "${subject}".`;
  return null;
}

function pushRule(g, role) {
  if (role === 'executor') return 'cap-hook: the executor never pushes.';
  for (const a of g.args) {
    const v = a.v;
    if (v.startsWith('--force') || ['--mirror', '--delete', '--prune'].includes(v) || (/^-[A-Za-z]+$/.test(v) && /[fd]/.test(v)) || v.startsWith('+') || v.startsWith(':')) {
      return 'cap-hook: no force, delete or mirror push, ever.';
    }
  }
  return null;
}

function addRule(g) {
  for (const a of g.args) {
    const v = a.v;
    if (['-A', '--all', '-u', '--update', '.', './', ':/', '-f', '--force', '-p', '--patch', '-i', '--interactive'].includes(v)
      || /[*?[]/.test(v) || (/^-[A-Za-z]+$/.test(v) && /[Aufpi]/.test(v))) {
      return 'cap-hook: git add takes explicit paths only (never -A, -u, ., a glob or -f).';
    }
  }
  return null;
}

function methodOf(w) {
  for (let i = 0; i < w.length; i++) {
    const v = w[i];
    if (v === '-X' || v === '--method') return (w[i + 1] || '').toUpperCase();
    if (/^-X./.test(v)) return v.slice(2).toUpperCase();
    if (v.startsWith('--method=')) return v.slice(9).toUpperCase();
  }
  return null;
}

function outwardRule(segs) {
  for (const seg of segs) {
    const w = words(seg).map((t) => t.v);
    if (!w.length) continue;
    const name = base(w[0]).replace(/\.(exe|cmd)$/, '');
    if (name === 'npm') {
      if (['publish', 'unpublish', 'deprecate'].includes(w[1])) return 'cap-hook: nothing is published to npm.';
      if (['run', 'run-script'].includes(w[1]) && w[2] === 'deploy') return 'cap-hook: npm run deploy is the owner\'s command alone.';
    }
    if (name === 'node') {
      const script = w.slice(1).find((x) => !x.startsWith('-'));
      if (script && /(^|[\\/])deploy\.mjs$/i.test(script) && !w.includes('--dry-run')) return 'cap-hook: a real deploy is the owner\'s command alone; agents run deploy.mjs --dry-run.';
    }
    if (name === 'gh') {
      if (w[1] === 'repo' && ['create', 'edit', 'delete', 'rename', 'archive', 'unarchive', 'transfer', 'fork'].includes(w[2])) return 'cap-hook: repository settings are the owner\'s.';
      if (w[1] === 'release' && w[2] && !['list', 'view', 'download'].includes(w[2])) return 'cap-hook: releases are the owner\'s.';
      if (w[1] === 'api') {
        const method = methodOf(w);
        if ((method && method !== 'GET') || w.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x) || /^--(field|raw-field|input)=/.test(x))) {
          return 'cap-hook: gh api is read-only for hush sessions.';
        }
      }
    }
  }
  return null;
}

function rules(ev, s, ctx) {
  const role = s.role;
  const child = Boolean(ev.agent_id);
  const tool = ev.tool_name;
  if (BACKGROUND_TOOLS.has(tool)) return `cap-hook: ${tool} starts background or scheduled work, which no hush session may do.`;
  if (ctx.isShell && ctx.input.run_in_background === true) return 'cap-hook: run_in_background is banned for hush sessions; run the command in the foreground.';
  for (const p of ctx.paths) {
    if (namesInstalledOrManaged(p)) return SELF_MSG;
    if (underDir(p, path.join(repoDir(), '.claude'))) return CLAUDE_MSG;
  }
  if (ctx.filePath) {
    if (underDir(ctx.filePath, stateDir())) return STATE_MSG;
    const rel = repoRel(ctx.filePath);
    if (rel !== null) {
      if (rel === 'build/evidence' || rel.startsWith('build/evidence/')) return EVIDENCE_MSG;
      if (role === 'executor' && executorProtected(rel)) return `cap-hook: the executor never writes ${rel} (writer table, D11).`;
      if ((role === 'spec' || (role === 'producer' && !child)) && isProduct(rel)) return `cap-hook: ${rel} is product code; the executor writes it (a producer's applier in phase 3).`;
    }
  }
  if (!ctx.isShell) return null;
  if (namesInstalledOrManaged(ctx.cmd)) return SELF_MSG;
  if (namesRepoClaudeText(ctx.textN, ctx.cwdInRepo)) return CLAUDE_MSG;
  if (ctx.parseError) return `cap-hook: this shell command could not be parsed (${ctx.parseError}); rephrase it.`;
  const write = hasWriteForm(ctx.cmd, ctx.segs);
  if (write && namesStateDirText(ctx.textN)) return STATE_MSG;
  const detach = detachForm(ctx.cmd, ctx.segs);
  if (detach) return `cap-hook: ${detach} would start a detached or background process; hush sessions run everything in the foreground.`;
  if (write && EVIDENCE_TEXT.test(relativeText(ctx.textN))) return EVIDENCE_MSG;
  let commits = 0;
  for (const g of ctx.gits) {
    let why = null;
    if (g.sub === 'push') why = pushRule(g, role);
    if (g.sub === 'commit') { commits++; why = commitRule(g, role, child); }
    if (g.sub === 'add') why = addRule(g);
    if (why) return why;
  }
  if (commits > 1) return 'cap-hook: one git commit per call.';
  const outward = outwardRule(ctx.segs);
  if (outward) return outward;
  if (role === 'executor') {
    const interp = inlineInterpreter(ctx.cmd, ctx.segs);
    if (interp) return `cap-hook: the executor runs no inline interpreter (${interp}).`;
    if (/protect\.mjs/i.test(ctx.cmd) && /--write\b/.test(ctx.cmd)) return 'cap-hook: the executor never runs node tools/protect.mjs --write.';
    if (write && mentionsExecutorProtected(ctx.textN)) return 'cap-hook: this shell call writes next to a path the executor never touches (tools/, tests/, a config, a ledger it does not own, or a PROTECTED path).';
  }
  if ((role === 'spec' || (role === 'producer' && !child)) && write && mentionsProduct(ctx.textN)) {
    return 'cap-hook: this shell call writes product code; the executor writes it (a producer\'s applier in phase 3).';
  }
  return null;
}

// ---------------------------------------------------------------- caps

function alertHit(s) {
  const r = ROLES[s.role];
  if (s.calls > r.maxCalls) return { cap: 'tool-calls', detail: `${r.maxCalls} tool calls` };
  if (s.activeMs >= r.maxActiveMs) return { cap: 'active-hours', detail: `${r.maxActiveMs / H} active hours` };
  if (r.maxSinceItem && s.callsSinceItem > r.maxSinceItem) return { cap: 'no-progress', detail: `${r.maxSinceItem} tool calls since the last item commit` };
  return null;
}

function budgetHit(s) {
  const c = s.commits;
  if (s.role === 'executor' && s.items >= 12) return { cap: 'item-commits', detail: '12 item commits' };
  if (s.role !== 'executor' && c['hush-gate'] >= 1) return { cap: 'gate-commit', detail: 'one hush-gate commit' };
  if (s.role === 'spec' && c['hush-spec'] >= 10) return { cap: 'spec-commits', detail: '10 hush-spec commits' };
  if (s.role === 'producer' && c['hush-review'] >= 2) return { cap: 'review-round', detail: 'one review round, reached at the second hush-review commit' };
  return null;
}

function appendAlert(kind, s, cap, now) {
  const dir = stateDir();
  return withLock(path.join(dir, 'alerts.lock'), () => {
    const file = path.join(dir, 'alerts.log');
    const seqFile = path.join(dir, 'alerts.seq');
    let max = 0;
    if (fs.existsSync(file)) for (const m of fs.readFileSync(file, 'utf8').matchAll(/^(?:ALERT|BUDGET)#(\d+) /gm)) max = Math.max(max, Number(m[1]));
    if (fs.existsSync(seqFile)) max = Math.max(max, Number(fs.readFileSync(seqFile, 'utf8').trim()) || 0);
    const n = max + 1;
    fs.appendFileSync(file, `${kind}#${n} | ${iso(now)} | ${s.session_id} | ${s.role} | ${cap}\n`);
    fs.writeFileSync(seqFile, String(n));
    return `${kind}#${n}`;
  });
}

function graceText(s) {
  const r = ROLES[s.role];
  return 'Grace: the next 3 calls, within 10 minutes, may only be these exact checkpoint forms, run through the Bash tool with nothing chained beyond what is shown: '
    + '(1) git restore --staged --worktree -- <paths>, optionally followed by && git clean -f -- <paths>; '
    + `(2) one Write or Edit of ${r.ledger}; `
    + `(3) git add <paths> && npm run check:public -- --staged && git commit -m "${r.checkpoint}<ID>". `
    + 'node tools/cap-hook.mjs --report counts as one of the three. Every other call is denied; then the session ends.';
}

function capMessage(s) {
  const c = s.cap;
  const head = c.kind === 'BUDGET'
    ? `cap-hook: ${c.id}: this ${s.role} session reached its budget (${c.cap}: ${c.detail}). This is the normal end.`
    : `cap-hook: ${c.id}: this ${s.role} session hit a safety cap (${c.cap}: ${c.detail}). Write your escalate line naming it (cap-hit ${c.id}) inside the checkpoint below, then end. Never retry with wider caps.`;
  return `${head} ${graceText(s)}`;
}

function hitCap(s, kind, cap, detail, now) {
  const id = appendAlert(kind, s, cap, now);
  s.cap = { kind, id, cap, detail, at: now, deadline: now + GRACE_MS, calls: 0, used: {} };
  return capMessage(s);
}

const PLAIN_PATH = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/;
const isPaths = (arr) => arr.length > 0 && arr.every((p) => PLAIN_PATH.test(p) && !p.split('/').includes('..'));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function graceForm(ev, s, ctx) {
  const r = ROLES[s.role];
  if (WRITE_TOOLS.has(ev.tool_name)) return ctx.filePath && normPath(ctx.filePath) === normPath(path.join(repoDir(), r.ledger)) ? 'ledger' : null;
  if (!ctx.isShell) return null;
  const parts = ctx.cmd.trim().split(/\s+&&\s+/);
  const P = [];
  for (const part of parts) {
    const { segs, error } = tokenize(part);
    const real = segs.filter((sg) => sg.tokens.length);
    if (error || real.length !== 1 || segs.some((sg) => sg.sep && sg.sep !== null)) return null;
    if (real[0].tokens.some((t) => t.op || t.subst)) return null;
    P.push(real[0].tokens.map((t) => t.v));
  }
  if ((P.length === 1 || P.length === 2) && same(P[0].slice(0, 5), ['git', 'restore', '--staged', '--worktree', '--']) && isPaths(P[0].slice(5))
    && (P.length === 1 || (same(P[1].slice(0, 4), ['git', 'clean', '-f', '--']) && isPaths(P[1].slice(4))))) return 'restore';
  if (P.length === 3 && same(P[0].slice(0, 2), ['git', 'add']) && isPaths(P[0].slice(2)) && same(P[1], ['npm', 'run', 'check:public', '--', '--staged'])
    && P[2].length === 4 && same(P[2].slice(0, 3), ['git', 'commit', '-m']) && P[2][3].startsWith(r.checkpoint)
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(P[2][3].slice(r.checkpoint.length))) return 'commit';
  if (P.length === 1 && same(P[0], ['node', 'tools/cap-hook.mjs', '--report'])) return 'report';
  return null;
}

function headOf(repo) {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '-q', 'HEAD'], { cwd: repo, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim() || null;
  } catch {
    return null;
  }
}

function gitText(repo, args) {
  return execFileSync('git', args, { cwd: repo, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
}

const ITEM_LINE = /^[A-Za-z][A-Za-z0-9-]{0,31}: (passes: (false|true \(evidence: [^)]+\))|blocked \(.+\))$/;

// Credit only a real commit: subject hush-build: <ID>, exactly one item line turned from false to true,
// and the evidence file it names added by that same commit.
function creditItem(repo, head, subject) {
  const m = /^hush-build: ([A-Za-z][A-Za-z0-9-]{0,31})$/.exec(subject);
  if (!m) return false;
  const id = m[1];
  let parent;
  try {
    parent = gitText(repo, ['rev-parse', '--verify', '-q', `${head}^`]).trim();
  } catch {
    return false;
  }
  const diff = gitText(repo, ['diff', '-U0', parent, head, '--', 'build/HUSH-PROGRESS.md']).split(/\r?\n/);
  const removed = diff.filter((l) => l.startsWith('-') && !l.startsWith('---') && ITEM_LINE.test(l.slice(1))).map((l) => l.slice(1));
  const added = diff.filter((l) => l.startsWith('+') && !l.startsWith('+++') && ITEM_LINE.test(l.slice(1))).map((l) => l.slice(1));
  if (removed.length !== 1 || added.length !== 1 || removed[0] !== `${id}: passes: false`) return false;
  const a = new RegExp(`^${id}: passes: true \\(evidence: (build/evidence/[^)\\s]+)\\)$`).exec(added[0]);
  if (!a) return false;
  const status = gitText(repo, ['diff', '--name-status', '--no-renames', parent, head]).split(/\r?\n/);
  return status.some((l) => l === `A\t${a[1]}`);
}

// ---------------------------------------------------------------- hook events

const out = (code, json) => ({ code, stdout: json ? JSON.stringify(json) : '', stderr: '' });
const deny = (msg) => ({ code: 2, stdout: '', stderr: msg });

function preUndeclared(ev, file) {
  const ctx = eventCtx(ev, { parse: false });
  if (!ctx.cwdInRepo && !namesRepo(ctx)) return out(0);
  const role = ctx.isShell ? parseDeclare(ctx.cmd) : null;
  if (role && ctx.cwdInRepo) return withLock(`${file}.lock`, () => (fs.existsSync(file) ? preDeclared(ev, file) : declareRole(ev, file, role)));
  return deny('cap-hook: this session has not declared a role and it is in, or naming, the hush repo. The first tool call must be exactly: node tools/cap-hook.mjs --declare <executor|spec|producer>');
}

function declareRole(ev, file, role) {
  if (role === 'spec' && unrevokedGo()) return deny('cap-hook: spec is closed: build/GATES.md holds an unrevoked JHON-GO line, so phase 1 is over. End this session.');
  if (role === 'producer' && !hasBuildLine() && !computeStops().some((x) => x.unresolved)) {
    return deny('cap-hook: producer is closed until build/HUSH-PROGRESS.md holds a HUSH-BUILD: line or --alerts lists an unresolved stop. End this session.');
  }
  const now = clock();
  const s = freshState(ev, role, now);
  count(s, ev);
  record(s, now, ev, 'declare');
  if (!ev.agent_id) {
    const model = readModel(ev.transcript_path);
    if (model) {
      s.model = model;
      if (!ROLES[role].model.test(model)) {
        const msg = hitCap(s, 'ALERT', 'model-mismatch', `the model ${model} cannot run the ${role} role`, now);
        s.lastEnd = now;
        save(file, s);
        return deny(msg);
      }
    }
  }
  s.open[ev.tool_use_id] = { start: now, tool: ev.tool_name };
  s.lastEnd = now;
  save(file, s);
  return out(0);
}

function grace(ev, s, file, now, ctx) {
  const c = s.cap;
  count(s, ev);
  const form = graceForm(ev, s, ctx);
  let why = null;
  if (now > c.deadline) why = `cap-hook: ${c.id}: the 10-minute grace is over. End the session.`;
  else if (c.calls >= GRACE_CALLS) why = `cap-hook: ${c.id}: the 3 grace calls are used. End the session.`;
  else if (!form) why = `cap-hook: ${c.id}: only the checkpoint forms are allowed now. ${graceText(s)}`;
  else if (c.used[form]) why = `cap-hook: ${c.id}: the ${form} form was already used. ${graceText(s)}`;
  if (why) {
    record(s, now, ev, 'deny');
    s.lastEnd = Math.max(s.lastEnd ?? now, now);
    save(file, s);
    return deny(why);
  }
  c.used[form] = true;
  c.calls += 1;
  if (form === 'commit') s.pending[ev.tool_use_id] = { repo: repoDir(), preHead: headOf(repoDir()) };
  s.open[ev.tool_use_id] = { start: now, tool: ev.tool_name };
  record(s, now, ev, `grace-${form}`);
  save(file, s);
  return out(0, { hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: `cap-hook notice: ${capMessage(s)} (${c.calls} of ${GRACE_CALLS} grace calls used)` } });
}

function preDeclared(ev, file) {
  const s = load(file);
  const now = clock();
  const ctx = eventCtx(ev, { parse: true });
  if (ev.transcript_path) s.transcript_path = ev.transcript_path;
  if (ctx.isShell && parseDeclare(ctx.cmd)) {
    count(s, ev);
    record(s, now, ev, 'deny');
    const msg = s.cap ? `cap-hook: ${s.cap.id}: this session already declared ${s.role}.` : hitCap(s, 'ALERT', 'second-declaration', 'a session declares exactly once', now);
    save(file, s);
    return deny(msg);
  }
  if (s.cap) return grace(ev, s, file, now, ctx);
  if (!ev.agent_id) {
    const model = readModel(ev.transcript_path || s.transcript_path);
    if (!model) return deny('cap-hook: model unreadable, call again (this denial is not counted).');
    s.model = model;
    if (!ROLES[s.role].model.test(model)) {
      count(s, ev);
      const msg = hitCap(s, 'ALERT', 'model-mismatch', `the model ${model} cannot run the ${s.role} role`, now);
      save(file, s);
      return deny(msg);
    }
  }
  count(s, ev);
  chargeGap(s, now);
  const a = alertHit(s);
  const b = a ? null : budgetHit(s);
  if (a || b) {
    const msg = hitCap(s, a ? 'ALERT' : 'BUDGET', (a || b).cap, (a || b).detail, now);
    record(s, now, ev, 'deny');
    save(file, s);
    return deny(msg);
  }
  let why = rules(ev, s, ctx);
  if (!why && ctx.isShell) {
    const remaining = ROLES[s.role].maxActiveMs - s.activeMs;
    const timeout = Number(ctx.input.timeout ?? DEFAULT_SHELL_TIMEOUT_MS);
    if (!(timeout <= remaining)) why = `cap-hook: this call's timeout (${timeout} ms) exceeds the session's remaining active budget (${Math.max(0, Math.floor(remaining))} ms). Checkpoint first.`;
  }
  if (why) {
    record(s, now, ev, 'deny');
    save(file, s);
    return deny(why);
  }
  const commit = ctx.gits.find((g) => g.sub === 'commit');
  if (commit) s.pending[ev.tool_use_id] = { repo: commit.repo, preHead: headOf(commit.repo) };
  s.open[ev.tool_use_id] = { start: now, tool: ev.tool_name };
  record(s, now, ev, 'allow');
  save(file, s);
  return out(0);
}

function postEvent(ev, file) {
  const s = load(file);
  const now = clock();
  const id = ev.tool_use_id;
  const o = s.open[id];
  if (o) {
    delete s.open[id];
    const wall = Math.max(0, now - o.start);
    const dur = Number.isFinite(ev.duration_ms) ? Math.max(0, ev.duration_ms) : null;
    s.activeMs += dur === null || dur >= wall ? wall : dur + Math.min(wall - dur, GAP_CAP_MS);
  }
  s.lastEnd = Math.max(s.lastEnd ?? now, now);
  const p = s.pending[id];
  if (p) {
    delete s.pending[id];
    const headNow = headOf(p.repo);
    if (headNow && headNow !== p.preHead && normPath(p.repo) === normPath(repoDir())) {
      const subject = gitText(p.repo, ['log', '-1', '--format=%s', headNow]).trim();
      const key = /^(hush-spec|hush-gate|hush-review):/.exec(subject);
      if (key) s.commits[key[1]] += 1;
      if (ev.hook_event_name === 'PostToolUse' && s.role === 'executor' && !ev.agent_id && creditItem(p.repo, headNow, subject)) {
        s.items += 1;
        s.callsSinceItem = 0;
      }
    }
  }
  record(s, now, ev, ev.hook_event_name === 'PostToolUse' ? 'done' : 'failed');
  save(file, s);
  return out(0);
}

export function runHook(raw) {
  const ev = JSON.parse(raw);
  if (!ev || typeof ev !== 'object') throw new Error('the event is not a JSON object');
  const sid = String(ev.session_id || '');
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(sid)) throw new Error('bad or missing session_id');
  const file = path.join(stateDir(), `${sid}.json`);
  const kind = ev.hook_event_name;
  if (kind === 'PreToolUse') {
    if (!fs.existsSync(file)) return preUndeclared(ev, file);
    return withLock(`${file}.lock`, () => preDeclared(ev, file));
  }
  if ((kind === 'PostToolUse' || kind === 'PostToolUseFailure') && fs.existsSync(file)) {
    return withLock(`${file}.lock`, () => postEvent(ev, file));
  }
  return out(0);
}

// A one-shot startup failure for the live proof, consumed by the arming session's next PreToolUse.
// It throws outside the hook's try, so only onFailure "block" can stop that call.
function crashTest(raw) {
  const marker = path.join(stateDir(), 'crash-test.armed');
  if (!fs.existsSync(marker)) return;
  let ev = null;
  try { ev = JSON.parse(raw); } catch { ev = null; }
  if (!ev || ev.hook_event_name !== 'PreToolUse') return;
  let armed = {};
  try { armed = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch { armed = {}; }
  if (armed.session && armed.session !== ev.session_id) return;
  fs.writeFileSync(path.join(stateDir(), 'crash-test.consumed'), JSON.stringify({ ...armed, consumedAt: iso(Date.now()), tool: ev.tool_name }));
  fs.unlinkSync(marker);
  throw new Error('cap-hook crash test: the armed one-shot startup failure (expected; onFailure "block" must stop this call)');
}

// ---------------------------------------------------------------- command line

function sha256File(f) {
  return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
}

const WRITE_MASK = 0x2 | 0x4 | 0x10 | 0x40 | 0x100 | 0x10000 | 0x40000 | 0x80000 | 0x10000000 | 0x40000000;
const ADMIN_SIDS = new Set(['S-1-5-32-544', 'S-1-5-18', 'S-1-3-0', 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464']);

function adminOnly(p) {
  if (process.platform !== 'win32') return 'no (not Windows)';
  if (!fs.existsSync(p)) return 'no (absent)';
  const lit = p.replace(/'/g, "''");
  // Rules are read as SIDs: an account name such as ALL APPLICATION PACKAGES does not translate back.
  const script = `$ErrorActionPreference='Stop'; (Get-Acl -LiteralPath '${lit}').GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object { $_.IdentityReference.Value + '|' + [long]$_.FileSystemRights + '|' + $_.AccessControlType }`;
  let text;
  try {
    text = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return `no (ACL unreadable: ${String(e.message).split('\n')[0]})`;
  }
  const writers = text.split(/\r?\n/).filter(Boolean).map((l) => l.trim().split('|')).filter(([sid, rights, type]) => type === 'Allow' && !ADMIN_SIDS.has(sid) && (Number(rights) & WRITE_MASK) !== 0);
  return writers.length ? `no (write access for ${writers.map((w) => w[0]).join(', ')})` : 'yes';
}

function managedRegistration() {
  const f = managedSettingsPath();
  if (!fs.existsSync(f)) return { ok: false, text: 'managed settings file absent' };
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); } catch { return { ok: false, text: 'managed settings file is not valid JSON' }; }
  const per = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure'].map((evName) => {
    const groups = (j.hooks && j.hooks[evName]) || [];
    const hit = groups.some((g) => (g.matcher === undefined || g.matcher === '' || g.matcher === '*')
      && (g.hooks || []).some((h) => h.type === 'command' && h.onFailure === 'block'
        && [h.command, ...(h.args || [])].some((x) => normPath(String(x)).endsWith('claudecode/hush/cap-hook.mjs'))));
    return `${evName}=${hit ? 'yes' : 'no'}`;
  });
  return { ok: per.every((p) => p.endsWith('=yes')), text: per.join(', ') };
}

function versionOk(v) {
  if (!v) return false;
  const p = v.split('.').map((x) => parseInt(x, 10));
  for (let i = 0; i < 3; i++) {
    if ((p[i] || 0) > MIN_CLAUDE_VERSION[i]) return true;
    if ((p[i] || 0) < MIN_CLAUDE_VERSION[i]) return false;
  }
  return true;
}

function argAfter(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function hm(ms) {
  const m = Math.floor(ms / 60e3);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
}

function cliReport(args) {
  const sid = argAfter(args, '--session') || process.env.CLAUDE_CODE_SESSION_ID || '';
  const lines = ['cap-hook report'];
  const file = /^[A-Za-z0-9_.-]{1,128}$/.test(sid) ? path.join(stateDir(), `${sid}.json`) : null;
  const s = file && fs.existsSync(file) ? load(file) : null;
  lines.push(`session: ${sid || '(unknown: no CLAUDE_CODE_SESSION_ID and no --session)'}`);
  let version = null;
  if (s) {
    const r = ROLES[s.role];
    version = readVersion(s.transcript_path);
    const agents = Object.entries(s.agents).map(([k, v]) => `${k}=${v}`).join(' ');
    lines.push(`role: ${s.role} (declared ${iso(s.declaredAt)})`);
    lines.push(`model: ${s.model || 'unread'}`);
    lines.push(`calls: ${s.calls} (cap ${r.maxCalls})${s.role === 'executor' ? `, since the last item commit: ${s.callsSinceItem} (cap ${r.maxSinceItem})` : ''}`);
    lines.push(`item commits credited: ${s.items}`);
    lines.push(`budget commits: hush-spec ${s.commits['hush-spec']}, hush-gate ${s.commits['hush-gate']}, hush-review ${s.commits['hush-review']}`);
    lines.push(`active time: ${hm(s.activeMs)} (cap ${hm(r.maxActiveMs)})`);
    lines.push(`events by agent: ${agents || 'none'}`);
    lines.push(`cap state: ${s.cap ? `${s.cap.id} ${s.cap.cap}, grace calls used ${s.cap.calls} of ${GRACE_CALLS}, deadline ${iso(s.cap.deadline)}` : 'none hit'}`);
  } else {
    lines.push('role: none (no hook state for this session: the hook has not seen it declare)');
  }
  const installed = installedHookPath();
  const instSha = fs.existsSync(installed) ? sha256File(installed) : null;
  const repoCopy = path.join(repoDir(), 'tools', 'cap-hook.mjs');
  const repoSha = fs.existsSync(repoCopy) ? sha256File(repoCopy) : null;
  const equal = Boolean(instSha && repoSha && instSha === repoSha);
  lines.push(`installed copy sha256: ${instSha || 'absent'}`);
  lines.push(`repo copy sha256:      ${repoSha || 'absent'}`);
  lines.push(`copies equal: ${equal ? 'yes' : 'no'}`);
  const admin = [path.dirname(installed), installed, managedSettingsPath()].map(adminOnly);
  const adminOk = admin.every((a) => a === 'yes');
  lines.push(`admin-only: ${adminOk ? 'yes' : 'no'} (folder ${admin[0]}; hook ${admin[1]}; managed settings ${admin[2]})`);
  const reg = managedRegistration();
  lines.push(`onFailure block registered: ${reg.ok ? 'yes' : 'no'} (${reg.text})`);
  lines.push(`claude code version: ${version || 'unread'} (needs ${MIN_CLAUDE_VERSION.join('.')} or later: ${versionOk(version) ? 'yes' : 'no'})`);
  const claudeDir = fs.existsSync(path.join(repoDir(), '.claude'));
  lines.push(`.claude folder in the repo: ${claudeDir ? 'YES (fails the report)' : 'no'}`);
  const armed = path.join(stateDir(), 'crash-test.armed');
  const consumed = path.join(stateDir(), 'crash-test.consumed');
  if (fs.existsSync(armed)) lines.push('crash-test: armed (not consumed yet)');
  else if (fs.existsSync(consumed)) {
    let c = {};
    try { c = JSON.parse(fs.readFileSync(consumed, 'utf8')); } catch { c = {}; }
    lines.push(`crash-test: consumed at ${c.consumedAt || '?'} by ${c.tool || '?'} (session ${c.session || 'any'})`);
  } else lines.push('crash-test: never armed');
  lines.push(`mode: ${IS_INSTALLED ? 'installed copy (overrides ignored)' : 'repo copy (test overrides honoured)'}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return s && equal && adminOk && reg.ok && versionOk(version) && !claudeDir ? 0 : 1;
}

function cliAlerts() {
  const stops = computeStops();
  const lines = ['cap-hook alerts: alerts.log plus SPEC-PROGRESS, HUSH-PROGRESS and HUSH-FIXLOG'];
  for (const x of stops) lines.push(`${x.line} -> ${x.status}`);
  const n = stops.filter((x) => x.unresolved).length;
  lines.push(`unresolved: ${n}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return n ? 1 : 0;
}

function cliDeclare(args) {
  const role = args[1];
  if (!ROLES[role]) {
    process.stderr.write('usage: cap-hook.mjs --declare <executor|spec|producer>\n');
    return 2;
  }
  const sid = process.env.CLAUDE_CODE_SESSION_ID || '';
  const file = /^[A-Za-z0-9_.-]{1,128}$/.test(sid) ? path.join(stateDir(), `${sid}.json`) : null;
  const s = file && fs.existsSync(file) ? load(file) : null;
  if (s && s.role === role) {
    process.stdout.write(`declared: ${role} (session ${sid}, recorded by the hook at PreToolUse)\n`);
    return 0;
  }
  if (s) {
    process.stdout.write(`declared: ${s.role}, not ${role}: the hook records one role per session\n`);
    return 1;
  }
  process.stdout.write('not declared: the hook holds no state for this session, so it is not active here. Stop and tell the owner.\n');
  return 1;
}

function cliCrashTest(args) {
  if (args[1] !== 'arm') {
    process.stderr.write('usage: cap-hook.mjs --crash-test arm\n');
    return 2;
  }
  const sid = argAfter(args, '--session') || process.env.CLAUDE_CODE_SESSION_ID || null;
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(path.join(stateDir(), 'crash-test.armed'), JSON.stringify({ session: sid, armedAt: iso(Date.now()) }));
  process.stdout.write(`crash-test: armed for session ${sid || 'any'}; its next PreToolUse fails once, outside the hook's try\n`);
  return 0;
}

function cli(args) {
  if (args[0] === '--declare') return cliDeclare(args);
  if (args[0] === '--report') return cliReport(args);
  if (args[0] === '--alerts') return cliAlerts();
  if (args[0] === '--crash-test') return cliCrashTest(args);
  process.stderr.write('usage: cap-hook.mjs [--declare <role> | --report [--session <id>] | --alerts | --crash-test arm]\n');
  return 2;
}

function hookMain() {
  const raw = fs.readFileSync(0, 'utf8');
  crashTest(raw);
  let res;
  try {
    res = runHook(raw);
  } catch (e) {
    res = deny(`cap-hook error (fail closed): ${e && e.message ? e.message : String(e)}`);
  }
  if (res.stdout) fs.writeSync(1, res.stdout);
  if (res.stderr) fs.writeSync(2, `${res.stderr}\n`);
  process.exitCode = res.code;
}

function isMain() {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]).toLowerCase() === SELF.toLowerCase();
}

if (isMain()) {
  const args = process.argv.slice(2);
  if (args.length) {
    try {
      process.exitCode = cli(args);
    } catch (e) {
      process.stderr.write(`cap-hook: ${e && e.message ? e.message : String(e)}\n`);
      process.exitCode = 2;
    }
  } else {
    hookMain();
  }
}
