// PF-CONTROLS for tools/spec-content.mjs (D7): a changed tile in the spec, a CRLF or a missing transcription
// are each caught; an extracted block transcribes byte-exact.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO } from './fixture-repo.mjs';

// A copy of the parts the tool reads, laid out like the repo.
function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-content-'));
  for (const rel of ['tools/spec-content.mjs', 'tests/fixtures/oracle/world.mjs', 'tests/fixtures/oracle/constants.mjs', 'tests/data/content.sha256', 'build/HUSH-SPEC.md']) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(dir, rel));
  }
  return dir;
}

function run(dir, args) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools', 'spec-content.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: r.stdout || '' };
}

describe('spec-content.mjs', () => {
  it('finds every block of the real spec byte-exact', () => {
    const r = run(copyRepo(), ['--check']);
    expect(r.out).toMatch(/spec-content: spec clean, 13 entries/);
    expect(r.code).toBe(0);
  });

  it('catches one changed tile in a room block', () => {
    const dir = copyRepo();
    const spec = path.join(dir, 'build', 'HUSH-SPEC.md');
    const text = fs.readFileSync(spec, 'utf8');
    const at = text.indexOf('#### 03-dash');
    const grid = text.indexOf('\ngrid\n', at) + 6;
    const row = text.indexOf('\n', grid) + 1;
    fs.writeFileSync(spec, text.slice(0, row + 5) + (text[row + 5] === '.' ? '#' : '.') + text.slice(row + 6));
    const r = run(dir, ['--check']);
    expect(r.out).toMatch(/rooms\/03-dash\.txt: spec block .* is not/);
    expect(r.code).toBe(1);
  });

  it('extracts a block that transcribes byte-exact, and catches CRLF and a missing file', () => {
    const dir = copyRepo();
    const out = path.join(dir, 'rooms', '03-dash.txt');
    expect(run(dir, ['--extract', '03-dash', out]).code).toBe(0);
    const ok = run(dir, ['--tree', '03-dash']);
    expect(ok.out).toMatch(/rooms\/03-dash\.txt: ok/);
    expect(ok.code).toBe(0);
    fs.writeFileSync(out, fs.readFileSync(out, 'utf8').replace(/\n/g, '\r\n'));
    const crlf = run(dir, ['--tree', '03-dash']);
    expect(crlf.out).toMatch(/byte drift/);
    expect(crlf.code).toBe(1);
    const missing = run(dir, ['--tree', '05-doors']);
    expect(missing.out).toMatch(/rooms\/05-doors\.txt: missing/);
    expect(missing.code).toBe(1);
  });

  it('refuses to overwrite an existing file', () => {
    const dir = copyRepo();
    const out = path.join(dir, 'rooms', '01-wake.txt');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, 'mine\n');
    expect(run(dir, ['--extract', '01-wake', out]).code).toBe(1);
    expect(fs.readFileSync(out, 'utf8')).toBe('mine\n');
  });
});
