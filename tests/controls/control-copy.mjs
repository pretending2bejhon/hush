// A temp copy of the repo for the deploy controls (PF-CONTROLS), outside the repo: every file git would see,
// the control page committed as index.html, the rooms and the track transcribed from the spec where the tree
// does not track them yet (since CT1 it does, and the copy keeps them byte for byte: spec-content --extract
// never overwrites, so re-extracting them stopped every case; audit 1, MAJOR 1), both manifests regenerated,
// one commit with the repo's noreply identity, and a bare remote beside it.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_EMAIL, REPO_NAME } from '../../tools/identity.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT = ['01-wake', '02-heartbeat', '03-dash', '04-thorns', '05-doors', '06-wave', '07-current', '08-steps', '09-gates', '10-crown', '11-gauntlet'];

export function git(cwd, args, input) {
  return execFileSync('git', args, { cwd, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function identity(dir) {
  git(dir, ['config', 'user.name', REPO_NAME]);
  git(dir, ['config', 'user.email', REPO_EMAIL]);
  git(dir, ['config', 'core.autocrlf', 'false']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'tag.gpgsign', 'false']);
}

export function makeControlCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-copy-'));
  const files = git(REPO, ['ls-files', '-z', '-co', '--exclude-standard']).split('\0').filter(Boolean);
  for (const rel of files) {
    const from = path.join(REPO, rel);
    if (!fs.existsSync(from) || fs.statSync(from).isDirectory()) continue;
    const to = path.join(dir, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  const page = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'control-page', 'index.html'), 'utf8')
    .replace('src="./control.js"', 'src="/tests/fixtures/control-page/control.js"');
  fs.writeFileSync(path.join(dir, 'index.html'), page);
  for (const name of CONTENT) {
    const out = name === '11-gauntlet' ? 'rooms/11-gauntlet.txt' : `rooms/${name}.txt`;
    if (fs.existsSync(path.join(dir, out))) continue;
    execFileSync(process.execPath, [path.join(dir, 'tools', 'spec-content.mjs'), '--extract', name, path.join(dir, out)], { cwd: dir, stdio: 'pipe' });
  }
  if (!fs.existsSync(path.join(dir, 'music', 'area1.strudel'))) {
    execFileSync(process.execPath, [path.join(dir, 'tools', 'spec-content.mjs'), '--extract', 'area1', path.join(dir, 'music', 'area1.strudel')], { cwd: dir, stdio: 'pipe' });
  }
  git(dir, ['init', '-q', '-b', 'main']);
  identity(dir);
  execFileSync(process.execPath, [path.join(dir, 'tools', 'protect.mjs'), '--write'], { cwd: dir, stdio: 'pipe' });
  git(dir, ['add', '--all', '--', '.']);
  git(dir, ['commit', '-q', '-m', 'hush-spec: control copy']);
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-bare-'));
  git(bare, ['init', '-q', '--bare', '-b', 'main']);
  return { dir, bare };
}

// Runs the copy's own tools/deploy.mjs with the copy as the current directory: {code, out}.
export function deploy(dir, args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(dir, 'tools', 'deploy.mjs'), ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
}
