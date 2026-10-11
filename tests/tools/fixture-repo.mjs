// Fixture git repos for the tool tests: a temp folder outside the repo, a fixture identity, LF only.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TOOLS = path.join(REPO, 'tools');

export function git(cwd, args, input) {
  return execFileSync('git', args, { cwd, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

export function makeRepo(prefix = 'hush-fixture-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 'fixture']);
  git(dir, ['config', 'user.email', ['fixture', 'example.invalid'].join('@')]);
  git(dir, ['config', 'core.autocrlf', 'false']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'tag.gpgsign', 'false']);
  return dir;
}

export function put(dir, rel, text) {
  const file = path.join(dir, ...rel.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

export function commit(dir, paths, subject) {
  if (paths.length) git(dir, ['add', '--', ...paths]);
  git(dir, ['commit', '-q', '--allow-empty', '-m', subject]);
  return git(dir, ['rev-parse', 'HEAD']).trim();
}

// Runs a repo tool with the fixture as the current directory, as the tool would run in a clone.
export function tool(name, args, { cwd, env = {} } = {}) {
  const r = spawnSync(process.execPath, [path.join(TOOLS, name), ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}
