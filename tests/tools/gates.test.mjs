// PF-CONTROLS for tools/gates.mjs (D11): the anchored grammar, the affirmative-intent check, REVOKED,
// and JHON-GO bound to the current cut's spec digest.
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { commit, makeRepo, put, tool } from './fixture-repo.mjs';

const T = '2026-10-12T19:40:00-05:00';
const HEAD = '# GATES\n\nGate lines, one grammar.\n\n';

function repoWithCut(spec = '# spec v1\n') {
  const dir = makeRepo('hush-gates-');
  put(dir, 'build/HUSH-SPEC.md', spec);
  put(dir, 'build/GATES.md', HEAD);
  commit(dir, ['build'], 'hush-spec: cut (items=3)');
  const d8 = crypto.createHash('sha256').update(spec).digest('hex').slice(0, 8);
  return { dir, d8 };
}

function withGates(dir, lines) {
  put(dir, 'build/GATES.md', HEAD + lines.map((l) => `${l}\n`).join(''));
}

const check = (dir, gate, scope) => tool('gates.mjs', ['--check', gate, scope], { cwd: dir });

describe('gates.mjs --check', () => {
  it('accepts an approval bound to the current cut, under both scope spellings', () => {
    const { dir, d8 } = repoWithCut();
    withGates(dir, [`JHON-GO: HUSH-SPEC@${d8} | ${T} | "JHON-GO: HUSH-SPEC go ahead" | redacted: no`]);
    const a = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(a.out).toMatch(new RegExp(`ok: JHON-GO: HUSH-SPEC@${d8}`));
    expect(a.code).toBe(0);
    expect(check(dir, 'JHON-GO', `HUSH-SPEC@${d8}`).code).toBe(0);
  });

  it('accepts consent lines, including a redacted one, and the caps line', () => {
    const { dir } = repoWithCut();
    withGates(dir, [
      `CONSENT: repo-create | ${T} | "a, b and c approved. \\"quoted\\" bit" | redacted: no`,
      `CONSENT: npm-install | ${T} | "yes, install it in <home>" | redacted: yes`,
      `JHON-CAPS-RESIDUAL: all-sessions | ${T} | "JHON-CAPS-RESIDUAL: all-sessions I accept the residual." | redacted: no`,
    ]);
    expect(check(dir, 'CONSENT', 'npm-install').code).toBe(0);
    expect(check(dir, 'JHON-CAPS-RESIDUAL', 'all-sessions').code).toBe(0);
    expect(tool('gates.mjs', ['--lint'], { cwd: dir }).code).toBe(0);
  });

  it('rejects JHON-GO: HUSH-SPEC-REJECTED (not the anchored scope)', () => {
    const { dir } = repoWithCut();
    withGates(dir, [`JHON-GO: HUSH-SPEC-REJECTED | ${T} | "JHON-GO: HUSH-SPEC-REJECTED" | redacted: no`]);
    const r = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(r.out).toMatch(/bad scope for JHON-GO/);
    expect(r.code).toBe(1);
  });

  it('rejects a quote that says not to go yet', () => {
    const { dir, d8 } = repoWithCut();
    withGates(dir, [`JHON-GO: HUSH-SPEC@${d8} | ${T} | "JHON-GO: HUSH-SPEC not yet, fix room 4 first" | redacted: no`]);
    const r = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(r.out).toMatch(/does not give the go-ahead/);
    expect(r.code).toBe(1);
  });

  it('rejects a malformed time', () => {
    const { dir, d8 } = repoWithCut();
    withGates(dir, [`JHON-GO: HUSH-SPEC@${d8} | 2026-10-12 19:40 | "JHON-GO: HUSH-SPEC" | redacted: no`]);
    const r = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(r.out).toMatch(/bad ISO-8601 time/);
    expect(r.code).toBe(1);
  });

  it('rejects a time without an offset', () => {
    const { dir, d8 } = repoWithCut();
    withGates(dir, [`JHON-GO: HUSH-SPEC@${d8} | 2026-10-12T19:40:00 | "JHON-GO: HUSH-SPEC" | redacted: no`]);
    expect(check(dir, 'JHON-GO', 'HUSH-SPEC').code).toBe(1);
  });

  it('rejects an unescaped inner quote', () => {
    const { dir } = repoWithCut();
    withGates(dir, [`CONSENT: repo-create | ${T} | "he said "go" today" | redacted: no`]);
    const r = check(dir, 'CONSENT', 'repo-create');
    expect(r.out).toMatch(/one JSON string/);
    expect(r.code).toBe(1);
  });

  it('rejects a JHON quote that does not begin with its gate name and scope', () => {
    const { dir, d8 } = repoWithCut();
    withGates(dir, [`JHON-GO: HUSH-SPEC@${d8} | ${T} | "looks good, JHON-GO: HUSH-SPEC" | redacted: no`]);
    const r = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(r.out).toMatch(/must begin with "JHON-GO: HUSH-SPEC"/);
    expect(r.code).toBe(1);
  });

  it('rejects a message that only mentions the gate in passing (prefix glued to more text)', () => {
    const { dir } = repoWithCut();
    withGates(dir, [`JHON-SHIP: rc1 | ${T} | "JHON-SHIP: rc1x is what we will call it" | redacted: no`]);
    expect(check(dir, 'JHON-SHIP', 'rc1').code).toBe(1);
  });

  it('rejects a stale digest after a re-cut', () => {
    const { dir, d8 } = repoWithCut();
    put(dir, 'build/HUSH-SPEC.md', '# spec v2\n');
    commit(dir, ['build/HUSH-SPEC.md'], 'hush-spec: cut (items=4)');
    withGates(dir, [`JHON-GO: HUSH-SPEC@${d8} | ${T} | "JHON-GO: HUSH-SPEC" | redacted: no`]);
    const a = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(a.out).toMatch(/no JHON-GO: HUSH-SPEC@[0-9a-f]{8} line/);
    expect(a.code).toBe(1);
    const b = check(dir, 'JHON-GO', `HUSH-SPEC@${d8}`);
    expect(b.out).toMatch(/stale digest/);
    expect(b.code).toBe(1);
  });

  it('rejects a revoked line, and honours a later re-approval', () => {
    const { dir, d8 } = repoWithCut();
    const go = `JHON-GO: HUSH-SPEC@${d8} | ${T} | "JHON-GO: HUSH-SPEC" | redacted: no`;
    withGates(dir, [go, `REVOKED: JHON-GO HUSH-SPEC@${d8} | 2026-10-13T10:00:00-05:00 | "recut room 4" | redacted: no`]);
    const r = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(r.out).toMatch(/is revoked/);
    expect(r.code).toBe(1);
    withGates(dir, [go, `REVOKED: JHON-GO HUSH-SPEC@${d8} | 2026-10-13T10:00:00-05:00 | "recut room 4" | redacted: no`, go]);
    expect(check(dir, 'JHON-GO', 'HUSH-SPEC').code).toBe(0);
  });

  it('refuses every check while any gate line is malformed, and a missing line', () => {
    const { dir } = repoWithCut();
    withGates(dir, [
      `CONSENT: repo-create | ${T} | "yes" | redacted: no`,
      `JHON-SHIP: rc1 | ${T} | "JHON-SHIP: rc1" | redacted: maybe`,
    ]);
    expect(check(dir, 'CONSENT', 'repo-create').code).toBe(1);
    withGates(dir, [`CONSENT: repo-create | ${T} | "yes" | redacted: no`]);
    expect(check(dir, 'CONSENT', 'repo-create').code).toBe(0);
    const r = check(dir, 'JHON-PREVIEW', 'rc1');
    expect(r.out).toMatch(/no JHON-PREVIEW: rc1 line/);
    expect(r.code).toBe(1);
  });

  it('refuses JHON-GO before any cut exists', () => {
    const dir = makeRepo('hush-gates-');
    put(dir, 'build/GATES.md', HEAD);
    commit(dir, ['build'], 'hush-spec: scaffold');
    const r = check(dir, 'JHON-GO', 'HUSH-SPEC');
    expect(r.out).toMatch(/no hush-spec: cut commit/);
    expect(r.code).toBe(1);
  });
});
