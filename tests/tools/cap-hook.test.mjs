// The cap hook's proof (PF-HOOK): fixture stdin, fixture state, fixture repos, a fake clock.
// Every case spawns tools/cap-hook.mjs exactly as Claude Code does: JSON on stdin, exit 0 allows,
// exit 2 denies with the reason on stderr.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HOOK = fileURLToPath(new URL('../../tools/cap-hook.mjs', import.meta.url));
const H = 3600e3;
const MIN = 60e3;
const T0 = Date.UTC(2026, 9, 12, 15, 0, 0);
const MODELS = { executor: 'claude-sonnet-5-5', spec: 'claude-opus-5-5', producer: 'claude-opus-5-5' };
const LEDGER = { executor: 'build/HUSH-PROGRESS.md', spec: 'build/SPEC-PROGRESS.md', producer: 'build/HUSH-PROGRESS.md' };
const CHECKPOINT = { executor: 'hush-build: checkpoint', spec: 'hush-spec: checkpoint', producer: 'hush-spec: checkpoint' };
const PROGRESS_BUILT = '# HUSH-PROGRESS\n\n## Items\n\nI1: passes: true (evidence: build/evidence/I1.acceptance.1.txt)\n\n## Rounds\n\nHUSH-BUILD: COMPLETE (items=1)\n';
const GO_LINE = 'JHON-GO: HUSH-SPEC@1a2b3c4d | 2026-10-12T19:40:00-05:00 | "JHON-GO: HUSH-SPEC" | redacted: no';
const BS = '\\';
let seq = 0;

function gitIn(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function writeTranscript(file, model) {
  const lines = [{ type: 'user', message: { role: 'user', content: 'go' } }];
  if (model) lines.push({ type: 'assistant', version: '2.1.296', message: { role: 'assistant', model, content: [] } });
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
}

function makeCtx({ model, gates, progress, specProgress, fixlog, alerts, protectedList, git = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-hook-'));
  const home = path.join(root, 'state');
  const repo = path.join(root, 'repo');
  const outside = path.join(root, 'elsewhere');
  for (const d of [home, path.join(repo, 'build'), outside]) fs.mkdirSync(d, { recursive: true });
  if (gates) fs.writeFileSync(path.join(repo, 'build', 'GATES.md'), gates);
  if (progress) fs.writeFileSync(path.join(repo, 'build', 'HUSH-PROGRESS.md'), progress);
  if (specProgress) fs.writeFileSync(path.join(repo, 'build', 'SPEC-PROGRESS.md'), specProgress);
  if (fixlog) fs.writeFileSync(path.join(repo, 'build', 'HUSH-FIXLOG.md'), fixlog);
  if (alerts) fs.writeFileSync(path.join(home, 'alerts.log'), alerts);
  if (protectedList) fs.writeFileSync(path.join(repo, 'build', 'PROTECTED.sha256'), protectedList);
  if (git) {
    gitIn(repo, ['init', '-q', '-b', 'main']);
    gitIn(repo, ['config', 'user.name', 'fixture']);
    gitIn(repo, ['config', 'user.email', ['fixture', 'example.invalid'].join('@')]);
    gitIn(repo, ['config', 'core.autocrlf', 'false']);
    fs.writeFileSync(path.join(repo, 'README.md'), 'fixture\n');
    gitIn(repo, ['add', '-A']);
    gitIn(repo, ['commit', '-q', '-m', 'fixture: init']);
  }
  const transcript = path.join(root, 'transcript.jsonl');
  writeTranscript(transcript, model);
  return { root, home, repo, outside, transcript, sid: `sess-${crypto.randomUUID()}`, now: T0 };
}

function hook(ctx, ev, { now = ctx.now, cwd = ctx.repo, agent, env = {} } = {}) {
  const payload = {
    session_id: ctx.sid,
    transcript_path: ctx.transcript,
    cwd,
    hook_event_name: 'PreToolUse',
    tool_use_id: `toolu_${++seq}`,
    ...ev,
  };
  if (agent) payload.agent_id = agent;
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, HUSH_CAP_HOME: ctx.home, HUSH_REPO: ctx.repo, HUSH_CAP_NOW: String(now), ...env },
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '', id: payload.tool_use_id };
}

const pre = (ctx, tool_name, tool_input, o) => hook(ctx, { hook_event_name: 'PreToolUse', tool_name, tool_input }, o);
const bash = (ctx, command, o, extra = {}) => pre(ctx, 'Bash', { command, ...extra }, o);
const pwsh = (ctx, command, o) => pre(ctx, 'PowerShell', { command }, o);
const post = (ctx, id, tool_name, tool_input, o, extra = {}) => hook(ctx, { hook_event_name: 'PostToolUse', tool_name, tool_input, tool_use_id: id, ...extra }, o);
const failed = (ctx, id, tool_name, tool_input, o) => hook(ctx, { hook_event_name: 'PostToolUseFailure', tool_name, tool_input, tool_use_id: id, error: 'Exit code 1' }, o);
const declare = (ctx, role, o) => bash(ctx, `node tools/cap-hook.mjs --declare ${role}`, o);
const readCall = (ctx, o) => pre(ctx, 'Read', { file_path: path.join(ctx.repo, 'README.md') }, o);
const stateFile = (ctx) => path.join(ctx.home, `${ctx.sid}.json`);
const state = (ctx) => JSON.parse(fs.readFileSync(stateFile(ctx), 'utf8'));
const alertLines = (ctx) => {
  const f = path.join(ctx.home, 'alerts.log');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean) : [];
};

function seed(ctx, patch) {
  const s = state(ctx);
  for (const [k, v] of Object.entries(patch)) s[k] = v && typeof v === 'object' && !Array.isArray(v) && s[k] && typeof s[k] === 'object' ? { ...s[k], ...v } : v;
  fs.writeFileSync(stateFile(ctx), JSON.stringify(s));
}

function declared(role, opts = {}) {
  const ctx = makeCtx({ model: MODELS[role], progress: role === 'producer' ? PROGRESS_BUILT : undefined, ...opts });
  const r = declare(ctx, role);
  expect(r.code, r.stderr).toBe(0);
  post(ctx, r.id, 'Bash', { command: `node tools/cap-hook.mjs --declare ${role}` });
  return ctx;
}

function cli(ctx, args, env = {}) {
  const r = spawnSync(process.execPath, [HOOK, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HUSH_CAP_HOME: ctx.home, HUSH_REPO: ctx.repo, HUSH_CAP_NOW: String(ctx.now), CLAUDE_CODE_SESSION_ID: ctx.sid, ...env },
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function context(r) {
  return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
}

describe('declaration, binding and the model gate', () => {
  it('denies the first and second productive calls of an undeclared session in the repo', () => {
    const ctx = makeCtx({ model: MODELS.spec });
    expect(readCall(ctx).code).toBe(2);
    const r = bash(ctx, 'git status');
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/--declare/);
  });

  it('ignores an undeclared session outside the repo and records nothing', () => {
    const ctx = makeCtx({ model: MODELS.spec });
    const r = bash(ctx, 'git status', { cwd: ctx.outside });
    expect(r.code).toBe(0);
    expect(fs.existsSync(stateFile(ctx))).toBe(false);
  });

  it('denies an undeclared session outside the repo that names the repo path, in every spelling', () => {
    const ctx = makeCtx({ model: MODELS.spec });
    const plain = ctx.repo;
    const escaped = ctx.repo.split(BS).join(BS + BS);
    const forward = ctx.repo.split(BS).join('/');
    for (const p of [plain, escaped, forward]) {
      expect(bash(ctx, `git -C "${p}" status`, { cwd: ctx.outside }).code, p).toBe(2);
    }
    expect(pre(ctx, 'Read', { file_path: path.join(ctx.repo, 'README.md') }, { cwd: ctx.outside }).code).toBe(2);
    expect(fs.existsSync(stateFile(ctx))).toBe(false);
  });

  it('keeps enforcing a declared session after it leaves the repo folder', () => {
    const ctx = declared('executor');
    const r = bash(ctx, `git -C "${ctx.repo}" push origin main`, { cwd: ctx.root });
    expect(r.code).toBe(2);
    expect(state(ctx).calls).toBe(2);
  });

  it('denies a second declaration and raises an ALERT', () => {
    const ctx = declared('spec');
    const r = declare(ctx, 'spec');
    expect(r.code).toBe(2);
    const lines = alertLines(ctx);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^ALERT#1 \| \S+ \| sess-\S+ \| spec \| second-declaration$/);
  });

  it('allows the declaration but denies, without counting, every productive call while the model is unreadable', () => {
    const ctx = makeCtx({ model: null });
    const d = declare(ctx, 'spec');
    expect(d.code, d.stderr).toBe(0);
    post(ctx, d.id, 'Bash', { command: 'node tools/cap-hook.mjs --declare spec' });
    const before = state(ctx).calls;
    for (let i = 0; i < 2; i++) {
      const r = readCall(ctx);
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/model unreadable, call again/);
    }
    expect(state(ctx).calls).toBe(before);
    writeTranscript(ctx.transcript, MODELS.spec);
    expect(readCall(ctx).code).toBe(0);
  });

  it('raises an ALERT when the model and the role disagree', () => {
    const exec = makeCtx({ model: 'claude-opus-5-5' });
    expect(declare(exec, 'executor').code).toBe(2);
    expect(alertLines(exec)[0]).toMatch(/\| executor \| model-mismatch$/);
    const spec = makeCtx({ model: 'claude-sonnet-5-5' });
    expect(declare(spec, 'spec').code).toBe(2);
    expect(alertLines(spec)[0]).toMatch(/\| spec \| model-mismatch$/);
  });

  it('closes spec while an unrevoked JHON-GO line exists, without an ALERT', () => {
    const ctx = makeCtx({ model: MODELS.spec, gates: `# GATES\n\n${GO_LINE}\n` });
    const r = declare(ctx, 'spec');
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/JHON-GO/);
    expect(alertLines(ctx)).toHaveLength(0);
    const revoked = makeCtx({ model: MODELS.spec, gates: `# GATES\n\n${GO_LINE}\nREVOKED: JHON-GO HUSH-SPEC@1a2b3c4d | 2026-10-13T10:00:00-05:00 | "recut the rooms" | redacted: no\n` });
    expect(declare(revoked, 'spec').code).toBe(0);
  });

  it('opens producer only after a HUSH-BUILD line or an unresolved stop', () => {
    const none = makeCtx({ model: MODELS.producer, progress: '# HUSH-PROGRESS\n\n## Items\n\nI1: passes: false\n' });
    expect(declare(none, 'producer').code).toBe(2);
    expect(alertLines(none)).toHaveLength(0);
    const built = makeCtx({ model: MODELS.producer, progress: PROGRESS_BUILT });
    expect(declare(built, 'producer').code).toBe(0);
    const stopped = makeCtx({ model: MODELS.producer, alerts: 'ALERT#4 | 2026-10-12T10:00:00-05:00 | sess-other | executor | no-progress\n' });
    expect(declare(stopped, 'producer').code).toBe(0);
  });

  it('exits 2 on any error inside the hook', () => {
    const ctx = makeCtx({ model: MODELS.spec });
    const r = spawnSync(process.execPath, [HOOK], { input: '{not json', encoding: 'utf8', env: { ...process.env, HUSH_CAP_HOME: ctx.home, HUSH_REPO: ctx.repo } });
    expect(r.status).toBe(2);
    const d = declared('spec');
    fs.writeFileSync(stateFile(d), '{broken');
    expect(readCall(d).code).toBe(2);
  });
});

const CAPS = [
  { role: 'executor', kind: 'BUDGET', cap: 'item-commits', below: { items: 11 }, at: { items: 12 } },
  { role: 'executor', kind: 'ALERT', cap: 'tool-calls', below: { calls: 599 }, at: { calls: 600 } },
  { role: 'executor', kind: 'ALERT', cap: 'active-hours', below: { activeMs: 4 * H - MIN }, at: { activeMs: 4 * H } },
  { role: 'executor', kind: 'ALERT', cap: 'no-progress', below: { callsSinceItem: 149 }, at: { callsSinceItem: 150 } },
  { role: 'spec', kind: 'BUDGET', cap: 'spec-commits', below: { commits: { 'hush-spec': 9 } }, at: { commits: { 'hush-spec': 10 } } },
  { role: 'spec', kind: 'BUDGET', cap: 'gate-commit', below: { commits: { 'hush-gate': 0 } }, at: { commits: { 'hush-gate': 1 } } },
  { role: 'spec', kind: 'ALERT', cap: 'tool-calls', below: { calls: 1499 }, at: { calls: 1500 } },
  { role: 'spec', kind: 'ALERT', cap: 'active-hours', below: { activeMs: 6 * H - MIN }, at: { activeMs: 6 * H } },
  { role: 'producer', kind: 'BUDGET', cap: 'review-round', below: { commits: { 'hush-review': 1 } }, at: { commits: { 'hush-review': 2 } } },
  { role: 'producer', kind: 'BUDGET', cap: 'gate-commit', below: { commits: { 'hush-gate': 0 } }, at: { commits: { 'hush-gate': 1 } } },
  { role: 'producer', kind: 'ALERT', cap: 'tool-calls', below: { calls: 1499 }, at: { calls: 1500 } },
  { role: 'producer', kind: 'ALERT', cap: 'active-hours', below: { activeMs: 6 * H - MIN }, at: { activeMs: 6 * H } },
];

function hitCap(c) {
  const ctx = declared(c.role);
  seed(ctx, { ...c.at, lastEnd: ctx.now });
  const r = readCall(ctx);
  return { ctx, r };
}

const restoreForm = 'git restore --staged --worktree -- src/sim/a.ts && git clean -f -- src/sim/b.ts';
const commitForm = (role) => `git add ${LEDGER[role]} && npm run check:public -- --staged && git commit -m "${CHECKPOINT[role]} I3"`;
const ledgerWrite = (ctx, role) => pre(ctx, 'Write', { file_path: path.join(ctx.repo, ...LEDGER[role].split('/')), content: 'x' });

describe.each(CAPS)('cap $role $cap ($kind)', (c) => {
  it('allows the call one below the cap', () => {
    const ctx = declared(c.role);
    seed(ctx, { ...c.below, lastEnd: ctx.now });
    const r = readCall(ctx);
    expect(r.code, r.stderr).toBe(0);
    expect(alertLines(ctx)).toHaveLength(0);
  });

  it('denies the first call past the cap with one log line naming the cap, the id and the grace', () => {
    const { ctx, r } = hitCap(c);
    expect(r.code).toBe(2);
    const lines = alertLines(ctx);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(new RegExp(`^${c.kind}#1 \\| \\S+ \\| ${ctx.sid} \\| ${c.role} \\| ${c.cap}$`));
    expect(r.stderr).toContain(`${c.kind}#1`);
    expect(r.stderr).toContain(c.cap);
    expect(r.stderr).toMatch(/grace/i);
  });

  it('allows the three checkpoint forms, each carrying the notice as additionalContext', () => {
    const { ctx } = hitCap(c);
    for (const r of [bash(ctx, restoreForm), ledgerWrite(ctx, c.role), bash(ctx, commitForm(c.role))]) {
      expect(r.code, r.stderr).toBe(0);
      expect(context(r)).toContain(`${c.kind}#1`);
    }
    expect(bash(ctx, 'node tools/cap-hook.mjs --report').code).toBe(2);
  });

  it('counts --report as one of the three grace calls', () => {
    const { ctx } = hitCap(c);
    expect(bash(ctx, 'node tools/cap-hook.mjs --report').code).toBe(0);
    expect(bash(ctx, restoreForm).code).toBe(0);
    expect(ledgerWrite(ctx, c.role).code).toBe(0);
    expect(bash(ctx, commitForm(c.role)).code).toBe(2);
  });

  it('denies a grace shell call with a semicolon', () => {
    const { ctx } = hitCap(c);
    expect(bash(ctx, 'git restore --staged --worktree -- src/sim/a.ts; git clean -f -- src/sim/b.ts').code).toBe(2);
  });

  it('denies a grace commit with an item subject', () => {
    const { ctx } = hitCap(c);
    const prefix = c.role === 'executor' ? 'hush-build:' : 'hush-spec:';
    expect(bash(ctx, `git add ${LEDGER[c.role]} && npm run check:public -- --staged && git commit -m "${prefix} I3"`).code).toBe(2);
  });

  it('denies a productive call during the grace', () => {
    const { ctx } = hitCap(c);
    expect(readCall(ctx).code).toBe(2);
  });

  it('denies a grace call after 10 minutes', () => {
    const { ctx } = hitCap(c);
    expect(bash(ctx, restoreForm, { now: ctx.now + 10 * MIN + 1000 }).code).toBe(2);
  });
});

describe('active time', () => {
  it('charges a 30-minute idle gap after a tool ends as 10 minutes', () => {
    const ctx = declared('spec');
    seed(ctx, { activeMs: 0, lastEnd: ctx.now });
    expect(readCall(ctx, { now: ctx.now + 30 * MIN }).code).toBe(0);
    expect(state(ctx).activeMs).toBe(10 * MIN);
  });

  it('charges a 30-minute tool run in full', () => {
    const ctx = declared('spec');
    seed(ctx, { activeMs: 0, lastEnd: ctx.now });
    const r = bash(ctx, 'npm test');
    post(ctx, r.id, 'Bash', { command: 'npm test' }, { now: ctx.now + 30 * MIN });
    expect(state(ctx).activeMs).toBe(30 * MIN);
  });

  it('closes a failed tool interval through PostToolUseFailure', () => {
    const ctx = declared('spec');
    seed(ctx, { activeMs: 0, lastEnd: ctx.now });
    const r = bash(ctx, 'npm test');
    failed(ctx, r.id, 'Bash', { command: 'npm test' }, { now: ctx.now + 5 * MIN });
    const s = state(ctx);
    expect(s.open[r.id]).toBeUndefined();
    expect(s.activeMs).toBe(5 * MIN);
  });

  it('denies a shell call whose timeout exceeds the remaining active budget', () => {
    const ctx = declared('spec');
    seed(ctx, { activeMs: 6 * H - MIN, lastEnd: ctx.now });
    const r = bash(ctx, 'npm test', {}, { timeout: 120000 });
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/timeout/);
    expect(bash(ctx, 'npm test', {}, { timeout: 30000 }).code).toBe(0);
  });
});

describe('executor progress credit', () => {
  const PROGRESS0 = '# HUSH-PROGRESS\n\n## Items\n\nI3: passes: false\nI4: passes: false\n';
  const flip = (ctx) => {
    fs.writeFileSync(path.join(ctx.repo, 'build', 'HUSH-PROGRESS.md'), PROGRESS0.replace('I3: passes: false', 'I3: passes: true (evidence: build/evidence/I3.acceptance.1.txt)'));
    fs.mkdirSync(path.join(ctx.repo, 'build', 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(ctx.repo, 'build', 'evidence', 'I3.acceptance.1.txt'), 'evidence\n');
  };
  const files = ['build/HUSH-PROGRESS.md', 'build/evidence/I3.acceptance.1.txt'];

  it('credits a hush-build commit that flips its item and adds the evidence', () => {
    const ctx = declared('executor', { git: true, progress: PROGRESS0 });
    seed(ctx, { callsSinceItem: 40 });
    flip(ctx);
    const cmd = `git add ${files.join(' ')} && git commit -m "hush-build: I3"`;
    const r = bash(ctx, cmd);
    expect(r.code, r.stderr).toBe(0);
    gitIn(ctx.repo, ['add', ...files]);
    gitIn(ctx.repo, ['commit', '-q', '-m', 'hush-build: I3']);
    post(ctx, r.id, 'Bash', { command: cmd });
    expect(state(ctx).items).toBe(1);
    expect(state(ctx).callsSinceItem).toBe(0);
  });

  it('credits nothing for a failed commit', () => {
    const ctx = declared('executor', { git: true, progress: PROGRESS0 });
    const cmd = 'git commit -m "hush-build: I3"';
    const r = bash(ctx, cmd);
    failed(ctx, r.id, 'Bash', { command: cmd });
    const p = post(ctx, bash(ctx, cmd).id, 'Bash', { command: cmd });
    expect(p.code).toBe(0);
    expect(state(ctx).items).toBe(0);
  });

  it('credits nothing for an empty commit', () => {
    const ctx = declared('executor', { git: true, progress: PROGRESS0 });
    const cmd = 'git commit --allow-empty -m "hush-build: I3"';
    const r = bash(ctx, cmd);
    expect(r.code, r.stderr).toBe(0);
    gitIn(ctx.repo, ['commit', '-q', '--allow-empty', '-m', 'hush-build: I3']);
    post(ctx, r.id, 'Bash', { command: cmd });
    expect(state(ctx).items).toBe(0);
  });

  it('credits nothing for a checkpoint commit, even one that flips the item', () => {
    const ctx = declared('executor', { git: true, progress: PROGRESS0 });
    flip(ctx);
    const cmd = `git add ${files.join(' ')} && git commit -m "hush-build: checkpoint I3"`;
    const r = bash(ctx, cmd);
    expect(r.code, r.stderr).toBe(0);
    gitIn(ctx.repo, ['add', ...files]);
    gitIn(ctx.repo, ['commit', '-q', '-m', 'hush-build: checkpoint I3']);
    post(ctx, r.id, 'Bash', { command: cmd });
    expect(state(ctx).items).toBe(0);
  });
});

describe('executor writer table and bans', () => {
  const opts = { protectedList: `${'0'.repeat(64)}  src/probe/api.ts\n` };
  const denied = [
    ['an Edit of build/GATES.md', (ctx) => pre(ctx, 'Edit', { file_path: path.join(ctx.repo, 'build', 'GATES.md'), old_string: 'a', new_string: 'b' })],
    ['a Write on a PROTECTED path', (ctx) => pre(ctx, 'Write', { file_path: path.join(ctx.repo, 'src', 'probe', 'api.ts'), content: 'x' })],
    ['a shell redirect into tools/', (ctx) => bash(ctx, 'echo x > tools/extra.mjs')],
    ['node tools/protect.mjs --write', (ctx) => bash(ctx, 'node tools/protect.mjs --write')],
    ['python -c', (ctx) => bash(ctx, 'python -c "print(1)"')],
    ['node -e', (ctx) => bash(ctx, 'node -e "process.exit(0)"')],
    ['pwsh -c', (ctx) => bash(ctx, 'pwsh -c "Get-Date"')],
    ['a commit with a spec subject', (ctx) => bash(ctx, 'git commit -m "hush-spec: x"')],
    ['a commit with two -m', (ctx) => bash(ctx, 'git commit -m a -m b')],
    ['a commit from a file', (ctx) => bash(ctx, 'git commit -F msg.txt')],
    ['git push', (ctx) => bash(ctx, 'git push origin main')],
    ['run_in_background', (ctx) => bash(ctx, 'npm test', {}, { run_in_background: true })],
    ['Start-Process', (ctx) => pwsh(ctx, 'Start-Process notepad')],
    ['a child process with unref', (ctx) => bash(ctx, 'node tools/launch.mjs --then-unref')],
  ];
  for (const [name, call] of denied) {
    it(`denies ${name}`, () => {
      const ctx = declared('executor', opts);
      const r = call(ctx);
      expect(r.code, r.stderr).toBe(2);
    });
  }

  it('allows the executor its own paths and forms', () => {
    const ctx = declared('executor', opts);
    expect(pre(ctx, 'Write', { file_path: path.join(ctx.repo, 'src', 'sim', 'a.ts'), content: 'x' }).code).toBe(0);
    expect(pre(ctx, 'Edit', { file_path: path.join(ctx.repo, 'build', 'HUSH-PROGRESS.md'), old_string: 'a', new_string: 'b' }).code).toBe(0);
    expect(bash(ctx, 'node tools/evidence.mjs I3 acceptance -- npm test').code).toBe(0);
    expect(bash(ctx, 'git add src/sim/a.ts && git commit -m "hush-build: I3"').code).toBe(0);
  });

  it('denies any commit by an executor subagent', () => {
    const ctx = declared('executor', opts);
    expect(bash(ctx, 'git commit -m "hush-build: I3"', { agent: 'agent-1' }).code).toBe(2);
  });
});

describe.each(['executor', 'spec', 'producer'])('every role: %s', (role) => {
  it('denies a force push', () => {
    const ctx = declared(role);
    expect(bash(ctx, 'git push --force origin main').code).toBe(2);
    expect(bash(ctx, 'git push -f origin main').code).toBe(2);
  });

  it('denies any call naming a .claude folder under the repo', () => {
    const ctx = declared(role);
    expect(pre(ctx, 'Write', { file_path: path.join(ctx.repo, '.claude', 'settings.json'), content: '{}' }).code).toBe(2);
    expect(bash(ctx, 'cat .claude/settings.json').code).toBe(2);
    expect(bash(ctx, `type "${path.join(ctx.repo, '.claude', 'settings.local.json')}"`).code).toBe(2);
  });

  it('denies a write naming the cap state folder, in every spelling', () => {
    const ctx = declared(role);
    const plain = path.join(ctx.home, 'x.json');
    const escaped = plain.split(BS).join(BS + BS);
    const forward = plain.split(BS).join('/');
    expect(pre(ctx, 'Write', { file_path: plain, content: '{}' }).code).toBe(2);
    expect(bash(ctx, 'echo {} > ~/.hush-cap/x.json').code).toBe(2);
    for (const p of [plain, escaped, forward]) expect(pwsh(ctx, `Remove-Item "${p}"`).code, p).toBe(2);
  });

  it('denies any call naming the installed hook or the managed settings file, in every spelling', () => {
    const ctx = declared(role);
    const cmds = [
      'type "C:\\Program Files\\ClaudeCode\\hush\\cap-hook.mjs"',
      'type "C:\\\\Program Files\\\\ClaudeCode\\\\managed-settings.json"',
      'cat "C:/Program Files/ClaudeCode/hush/cap-hook.mjs"',
    ];
    for (const c of cmds) expect(bash(ctx, c).code, c).toBe(2);
    expect(pre(ctx, 'Read', { file_path: 'C:\\Program Files\\ClaudeCode\\managed-settings.json' }).code).toBe(2);
  });

  it('allows a read of alerts.log', () => {
    const ctx = declared(role);
    fs.writeFileSync(path.join(ctx.home, 'alerts.log'), '');
    expect(pre(ctx, 'Read', { file_path: path.join(ctx.home, 'alerts.log') }).code).toBe(0);
    expect(pwsh(ctx, `Get-Content "${path.join(ctx.home, 'alerts.log')}"`).code).toBe(0);
  });
});

describe('writer table for spec and producer', () => {
  it('keeps spec and the producer out of product code; a producer applier may write it and commit hush-fix', () => {
    const spec = declared('spec');
    expect(pre(spec, 'Write', { file_path: path.join(spec.repo, 'src', 'sim', 'a.ts'), content: 'x' }).code).toBe(2);
    expect(pre(spec, 'Write', { file_path: path.join(spec.repo, 'src', 'probe', 'api.ts'), content: 'x' }).code).toBe(0);
    const prod = declared('producer');
    expect(pre(prod, 'Write', { file_path: path.join(prod.repo, 'src', 'sim', 'a.ts'), content: 'x' }).code).toBe(2);
    expect(pre(prod, 'Write', { file_path: path.join(prod.repo, 'src', 'sim', 'a.ts'), content: 'x' }, { agent: 'applier-1' }).code).toBe(0);
    expect(bash(prod, 'git commit -m "hush-fix: R1-F2"', { agent: 'applier-1' }).code).toBe(0);
    expect(bash(prod, 'git commit -m "hush-fix: R1-F2"').code).toBe(2);
    expect(bash(prod, 'git commit -m "hush-review: R1"').code).toBe(0);
  });
});

describe('command line', () => {
  it('--alerts lists every stop with its resolution status from both ledgers', () => {
    const esc = 'HUSH-EXECUTE-ESCALATE: cap-hit ALERT#2 | 2026-10-12T11:00:00-05:00 | 1a2b3c4d';
    const ctx = makeCtx({
      model: MODELS.spec,
      alerts: [
        'ALERT#1 | 2026-10-12T10:00:00-05:00 | sess-a | executor | no-progress',
        'ALERT#2 | 2026-10-12T10:30:00-05:00 | sess-b | executor | active-hours',
        'BUDGET#3 | 2026-10-12T12:00:00-05:00 | sess-c | executor | item-commits',
      ].join('\n') + '\n',
      progress: `# HUSH-PROGRESS\n\n## Checkpoint\n\n${esc}\n`,
      fixlog: `# HUSH-FIXLOG\n\nRESOLVED: ${esc} | 2026-10-12T12:30:00-05:00 | "carry on" | next: executor\n`,
    });
    const r = cli(ctx, ['--alerts']);
    expect(r.out).toMatch(/ALERT#1 .*UNRESOLVED/);
    expect(r.out).toMatch(/ALERT#2 .*resolved/);
    expect(r.out).toMatch(/BUDGET#3 .*normal end/);
    expect(r.out).toMatch(/HUSH-EXECUTE-ESCALATE.*resolved/);
    expect(r.code).toBe(1);
  });

  it('--report prints the role and the counters of the calling session', () => {
    const ctx = declared('spec');
    readCall(ctx);
    const r = cli(ctx, ['--report']);
    expect(r.out).toMatch(/role: spec/);
    expect(r.out).toMatch(/calls: 2\b/);
    expect(r.out).toMatch(/main=2/);
  });

  it('--declare reports the role the hook recorded', () => {
    const ctx = declared('spec');
    const r = cli(ctx, ['--declare', 'spec']);
    expect(r.out).toMatch(/declared: spec/);
    expect(r.code).toBe(0);
  });

  it('--crash-test arm fails the next PreToolUse of that session once, outside the try', () => {
    const ctx = declared('spec');
    expect(cli(ctx, ['--crash-test', 'arm']).code).toBe(0);
    const other = { ...ctx, sid: `sess-${crypto.randomUUID()}` };
    expect(bash(other, 'git status', { cwd: ctx.outside }).code).toBe(0);
    const crashed = readCall(ctx);
    expect(crashed.code).not.toBe(0);
    expect(crashed.code).not.toBe(2);
    expect(readCall(ctx).code).toBe(0);
    expect(cli(ctx, ['--report']).out).toMatch(/crash-test: consumed/);
  });
});
