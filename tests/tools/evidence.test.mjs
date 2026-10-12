// PF-CONTROLS for tools/evidence.mjs (D12): the record of a command that prints the repo path, the home path in
// three spellings, an email, a token shape, the vault root name and a denylisted name holds none of them; a JSON
// document is redacted the same way and named after the commit it measured; no denylist, nothing runs.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO } from './fixture-repo.mjs';

const NAME = ['Zebulon', 'Quartermaine'].join(' ');

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-evidence-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  for (const f of ['evidence.mjs', 'public-patterns.mjs', 'identity.mjs']) fs.copyFileSync(path.join(REPO, 'tools', f), path.join(dir, 'tools', f));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  const list = path.join(dir, 'names.txt');
  fs.writeFileSync(list, `${NAME}\n`);
  return { dir, list };
}

function run(dir, list, args, extraEnv = {}) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools', 'evidence.mjs'), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, HUSH_NAMES_FILE: list, ...extraEnv } });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

describe('evidence.mjs', () => {
  it('records a command redacted, with its exit code', () => {
    const { dir, list } = sandbox();
    const home = os.homedir();
    const secrets = [dir, home, home.replace(/\\/g, '/'), home.replace(/\\/g, '\\\\'), ['someone', 'example.org'].join('@'),
      ['gh', 'p_', 'a'.repeat(36)].join(''), ['The', 'System'].join(''), NAME];
    fs.writeFileSync(path.join(dir, 'print.mjs'), `for (const s of ${JSON.stringify(secrets)}) console.log('value: ' + s);\nprocess.exitCode = 3;\n`);
    const r = run(dir, list, ['T1', 'accept', '--', 'node', 'print.mjs']);
    expect(r.code).toBe(3);
    const rec = fs.readFileSync(path.join(dir, 'build', 'evidence', 'T1.accept.1.txt'), 'utf8');
    expect(rec).toMatch(/^HUSH-EVIDENCE v1\nid: T1\nphase: accept\n/);
    expect(rec).toMatch(/\nexit: 3\n/);
    for (const s of secrets) expect(rec.toLowerCase()).not.toContain(s.toLowerCase());
    expect(rec).toContain('value: <repo>');
    expect(rec).toContain('value: <home>');
    expect(rec).toContain('value: <redacted>');
    const again = run(dir, list, ['T1', 'accept', '--', 'node', 'print.mjs']);
    expect(again.code).toBe(3);
    expect(fs.existsSync(path.join(dir, 'build', 'evidence', 'T1.accept.2.txt'))).toBe(true);
  });

  it('writes a JSON document redacted, named after the commit it names', () => {
    const { dir, list } = sandbox();
    const sha = 'e'.repeat(40);
    fs.writeFileSync(path.join(dir, 'doc.mjs'), `console.log('HUSH-JSON-BEGIN'); console.log(JSON.stringify({ kind: 'live', expectedSha: '${sha}', where: ${JSON.stringify(dir)} })); console.log('HUSH-JSON-END');\n`);
    const r = run(dir, list, ['--json', 'live', 'L1', 'live', '--', 'node', 'doc.mjs']);
    expect(r.code).toBe(0);
    const doc = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'evidence', 'live', `live-${sha}.json`), 'utf8'));
    expect(doc.where).toBe('<repo>');
  });

  it('runs nothing without a denylist', () => {
    const { dir } = sandbox();
    fs.writeFileSync(path.join(dir, 'touch.mjs'), "require('node:fs').writeFileSync('ran.txt', 'x');\n");
    const r = run(dir, path.join(dir, 'missing-names.txt'), ['T2', 'accept', '--', 'node', 'touch.mjs']);
    expect(r.code).toBe(3);
    expect(fs.existsSync(path.join(dir, 'ran.txt'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'build'))).toBe(false);
  });
});
