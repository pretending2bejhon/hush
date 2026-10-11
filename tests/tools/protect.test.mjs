// PF-CONTROLS for tools/protect.mjs (D11): drift, unlisted verifiers, GATES drift, CRLF checkouts and
// commit subjects are each caught; a gate commit leaves the product manifest byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commit, makeRepo, put, tool } from './fixture-repo.mjs';

const GATES = '# GATES\n\nheader\n';

function seeded() {
  const dir = makeRepo('hush-protect-');
  put(dir, 'tools/a.mjs', 'export const a = 1;\n');
  put(dir, 'tests/a.test.mjs', 'it.todo("a");\n');
  put(dir, 'src/probe/api.ts', 'export {};\n');
  put(dir, 'src/sim/world.ts', 'export {};\n');
  put(dir, 'build/HUSH-SPEC.md', '# spec\n');
  put(dir, 'build/GATES.md', GATES);
  put(dir, 'package.json', '{}\n');
  put(dir, 'index.html', '<!doctype html>\n');
  const w = tool('protect.mjs', ['--write'], { cwd: dir });
  expect(w.code, w.err).toBe(0);
  commit(dir, ['tools', 'tests', 'src', 'build', 'package.json', 'index.html'], 'hush-spec: fixture');
  return dir;
}

describe('protect.mjs', () => {
  it('lists tools, tests, src/probe, the spec, configs and index.html, but not product code or GATES', () => {
    const dir = seeded();
    const list = tool('protect.mjs', ['--list'], { cwd: dir }).out.split('\n').filter(Boolean);
    expect(list).toEqual(['build/HUSH-SPEC.md', 'index.html', 'package.json', 'src/probe/api.ts', 'tests/a.test.mjs', 'tools/a.mjs']);
    const gates = fs.readFileSync(path.join(dir, 'build/GATES.sha256'), 'utf8');
    expect(gates.trim().split('\n')).toHaveLength(1);
    expect(gates).toMatch(/^[0-9a-f]{64} {2}build\/GATES\.md\n$/);
  });

  it('is clean on a fresh manifest', () => {
    const r = tool('protect.mjs', ['--check'], { cwd: seeded() });
    expect(r.out).toMatch(/protect: clean/);
    expect(r.code).toBe(0);
  });

  it('catches an edited verifier', () => {
    const dir = seeded();
    put(dir, 'tests/a.test.mjs', 'it.todo("weakened");\n');
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/tests\/a\.test\.mjs: drifted/);
    expect(r.code).toBe(1);
  });

  it('catches a verifier the manifest does not list', () => {
    const dir = seeded();
    put(dir, 'tests/b.test.mjs', 'it.todo("b");\n');
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/tests\/b\.test\.mjs: a verifier path not listed/);
    expect(r.code).toBe(1);
  });

  it('catches a deleted verifier', () => {
    const dir = seeded();
    fs.rmSync(path.join(dir, 'tools/a.mjs'));
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/tools\/a\.mjs: listed but missing/);
    expect(r.code).toBe(1);
  });

  it('catches a forged gate line', () => {
    const dir = seeded();
    put(dir, 'build/GATES.md', `${GATES}JHON-GO: HUSH-SPEC@00000000 | 2026-10-12T10:00:00-05:00 | "JHON-GO: HUSH-SPEC" | redacted: no\n`);
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/build\/GATES\.md: drifted from build\/GATES\.sha256/);
    expect(r.code).toBe(1);
  });

  it('catches a CRLF checkout of a verifier', () => {
    const dir = seeded();
    const file = path.join(dir, 'tools/a.mjs');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/tools\/a\.mjs: drifted/);
    expect(r.code).toBe(1);
  });

  it('fails when a missing manifest makes the check meaningless', () => {
    const dir = seeded();
    fs.rmSync(path.join(dir, 'build/PROTECTED.sha256'));
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/build\/PROTECTED\.sha256: missing/);
    expect(r.code).toBe(1);
  });

  it('fails on a commit that touched a verifier under another role\'s subject', () => {
    const dir = seeded();
    put(dir, 'tests/a.test.mjs', 'it.todo("edited by the executor");\n');
    expect(tool('protect.mjs', ['--write'], { cwd: dir }).code).toBe(0);
    commit(dir, ['tests/a.test.mjs', 'build/PROTECTED.sha256'], 'hush-build: I3');
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/"hush-build: I3" touched build\/PROTECTED\.sha256, tests\/a\.test\.mjs/);
    expect(r.code).toBe(1);
  });

  it('passes the same change under a spec subject, and judges only commits since the cut', () => {
    const dir = seeded();
    put(dir, 'tests/a.test.mjs', 'it.todo("amended");\n');
    tool('protect.mjs', ['--write'], { cwd: dir });
    commit(dir, ['tests/a.test.mjs', 'build/PROTECTED.sha256'], 'hush-spec: amend I3');
    expect(tool('protect.mjs', ['--check'], { cwd: dir }).code).toBe(0);
    put(dir, 'tools/a.mjs', 'export const a = 2;\n');
    tool('protect.mjs', ['--write'], { cwd: dir });
    commit(dir, ['tools/a.mjs', 'build/PROTECTED.sha256'], 'hush-fix: R1-F1');
    expect(tool('protect.mjs', ['--check'], { cwd: dir }).code).toBe(1);
    commit(dir, [], 'hush-spec: cut (items=0)');
    expect(tool('protect.mjs', ['--check'], { cwd: dir }).code).toBe(0);
  });

  it('lets product commits through: the executor writes src/ outside src/probe', () => {
    const dir = seeded();
    put(dir, 'src/sim/world.ts', 'export const w = 1;\n');
    commit(dir, ['src/sim/world.ts'], 'hush-build: I2');
    const r = tool('protect.mjs', ['--check'], { cwd: dir });
    expect(r.out).toMatch(/protect: clean/);
    expect(r.code).toBe(0);
  });

  it('a gate commit changes GATES.sha256 and leaves PROTECTED.sha256 byte-identical', () => {
    const dir = seeded();
    const before = fs.readFileSync(path.join(dir, 'build/PROTECTED.sha256'));
    put(dir, 'build/GATES.md', `${GATES}CONSENT: x | 2026-10-12T10:00:00-05:00 | "yes" | redacted: no\n`);
    expect(tool('protect.mjs', ['--write'], { cwd: dir }).code).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'build/PROTECTED.sha256')).equals(before)).toBe(true);
    commit(dir, ['build/GATES.md', 'build/GATES.sha256'], 'hush-gate: consent');
    expect(tool('protect.mjs', ['--check'], { cwd: dir }).code).toBe(0);
  });
});
