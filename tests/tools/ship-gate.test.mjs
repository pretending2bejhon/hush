// PF-CONTROLS for tools/ship-gate.mjs (D18, X11): a stale PASS is refused three ways, a missing gate
// line, a playtest on an older rc and a JHON-SHIP for an older rc are refused, one friend playing three
// times counts once, the digest survives record commits, and a dirty tree is not judged.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commit, git, makeRepo, put, tool } from './fixture-repo.mjs';

const T = '2026-11-02T20:00:00-05:00';
const gate = (dir, args) => tool('ship-gate.mjs', args, { cwd: dir });
const digestOf = (dir) => gate(dir, ['--digest']).out.trim();

// A repo whose review, verify and audit verdicts are fresh and whose rc tag sits on the audit pass commit.
function greenRepo() {
  const dir = makeRepo('hush-shipgate-');
  put(dir, 'src/main.ts', 'export {};\n');
  put(dir, 'build/HUSH-SPEC.md', '# spec\n');
  put(dir, 'build/evidence/I3.green.1.txt', 'HUSH-EVIDENCE v1\nexit: 0\n');
  put(dir, 'build/GATES.md', '# GATES\n');
  commit(dir, ['src', 'build'], 'hush-build: I3');
  const head = git(dir, ['rev-parse', 'HEAD']).trim();
  const d = digestOf(dir);
  put(dir, 'build/HUSH-PROGRESS.md', [
    '# HUSH-PROGRESS', '', '## Rounds', '',
    `CYCLE 1: start | ${T} | build-complete | head=${head}`,
    `HUSH-REVIEW-R1: PASS (head=${head} digest=${d} blockers=0 majors=0 minors=1)`,
    `HUSH-REVIEW-R2: PASS (head=${head} digest=${d} blockers=0 majors=0 minors=1)`,
    `CYCLE 1: end | ${T} | R2`,
    `HUSH-SHIP-GATE: PASS (head=${head} digest=${d})`, '',
  ].join('\n'));
  put(dir, 'build/HUSH-BUILD.md', `# HUSH-BUILD\n\nhead=${head} digest=${d}\n`);
  put(dir, 'build/reviews/AUDIT-1.md', `HUSH-AUDIT: PASS (head=${head} digest=${d} blockers=0 majors=0 minors=0)\n\nbody\n`);
  put(dir, 'build/evidence/verify/verify.1.txt', 'HUSH-EVIDENCE v1\n');
  commit(dir, ['build'], 'hush-audit: pass 1');
  git(dir, ['tag', '-a', 'hush-v1-rc1', '-m', 'rc1']);
  return { dir, head, d };
}

describe('ship-gate.mjs verdicts', () => {
  it('is green on fresh verdicts and an rc tag on the audit pass commit', () => {
    const { dir } = greenRepo();
    const r = gate(dir, ['--rows', 'V', '--all']);
    expect(r.out).toMatch(/V-review: green/);
    expect(r.out).toMatch(/V-verify: green/);
    expect(r.out).toMatch(/V-audit: green/);
    expect(r.out).toMatch(/V-rc: green/);
    expect(r.code).toBe(0);
  });

  it('keeps the digest across a gate commit and a VERIFY evidence commit', () => {
    const { dir, d } = greenRepo();
    put(dir, 'build/GATES.md', `# GATES\n\nJHON-SHIP: rc1 | ${T} | "JHON-SHIP: rc1" | redacted: no\n`);
    put(dir, 'build/GATES.sha256', `${'0'.repeat(64)}  build/GATES.md\n`);
    commit(dir, ['build/GATES.md', 'build/GATES.sha256'], 'hush-gate: ship');
    expect(digestOf(dir)).toBe(d);
    put(dir, 'build/evidence/verify/perf-0123456789012345678901234567890123456789.json', '{}\n');
    put(dir, 'build/evidence/hook-live.proof.9.txt', 'proof\n');
    commit(dir, ['build/evidence'], 'hush-verify: 0123456');
    expect(digestOf(dir)).toBe(d);
  });

  for (const [what, rel, text] of [
    ['a change outside build/', 'src/main.ts', 'export const x = 1;\n'],
    ['a spec-only amendment', 'build/HUSH-SPEC.md', '# spec, amended\n'],
    ['a replaced item evidence file', 'build/evidence/I3.green.1.txt', 'HUSH-EVIDENCE v1\nexit: 0\nforged\n'],
  ]) {
    it(`refuses a PASS made stale by ${what}`, () => {
      const { dir, d } = greenRepo();
      put(dir, rel, text);
      commit(dir, [rel], 'hush-spec: amend I3');
      expect(digestOf(dir)).not.toBe(d);
      const r = gate(dir, ['--rows', 'V', '--all']);
      expect(r.out).toMatch(/V-review: RED \| R2 is stale/);
      expect(r.out).toMatch(/V-audit: RED/);
      expect(r.out).toMatch(/V-rc: RED .*digest/);
      expect(r.code).toBe(1);
    });
  }

  it('refuses an rc tag that is not on a hush-audit: pass commit', () => {
    const { dir } = greenRepo();
    git(dir, ['tag', '-d', 'hush-v1-rc1']);
    git(dir, ['tag', '-a', 'hush-v1-rc1', '-m', 'rc1', 'HEAD~1']);
    const r = gate(dir, ['--rows', 'V', '--all']);
    expect(r.out).toMatch(/V-rc: RED .*not a hush-audit: pass commit/);
    expect(r.code).toBe(1);
  });

  it('does not judge a dirty tree', () => {
    const { dir } = greenRepo();
    put(dir, 'src/main.ts', 'export const dirty = 1;\n');
    const r = gate(dir, ['--rows', 'V']);
    expect(r.out).toMatch(/refused: the tree is dirty .*src\/main\.ts/);
    expect(r.code).toBe(2);
  });
});

function playRows(lines) {
  return `# PLAYTESTS\n\n${lines.join('\n')}\n`;
}
const row = (k, who, rc, mmss, first) => `RUN-${k} | ${who} | rc${rc} | ${T} | ${mmss} | 4 | first-run: ${first} | "fun" | redacted: no`;

describe('ship-gate.mjs X11 and --playtests', () => {
  it('passes three distinct friends with a median inside 10 to 15 minutes, and the owner\'s two runs', () => {
    const { dir } = greenRepo();
    put(dir, 'build/PLAYTESTS.md', playRows([row(1, 'P1', 1, '11:30', 'yes'), row(2, 'P2', 1, '12:10', 'yes'), row(3, 'P3', 1, '14:00', 'yes'), row(4, 'JHON', 1, '9:00', 'no'), row(5, 'JHON-FIREFOX', 1, '3:00', 'no')]));
    commit(dir, ['build/PLAYTESTS.md'], 'hush-spec: playtest RUN-5');
    const r = gate(dir, ['--playtests', 'rc1']);
    expect(r.out).toMatch(/playtests: PASS rc1: P1, P2, P3, median 12:10/);
    expect(r.code).toBe(0);
  });

  it('counts one friend who played three times as one friend', () => {
    const { dir } = greenRepo();
    put(dir, 'build/PLAYTESTS.md', playRows([row(1, 'P1', 1, '11:30', 'yes'), row(2, 'P1', 1, '12:10', 'yes'), row(3, 'P1', 1, '14:00', 'yes'), row(4, 'JHON', 1, '9:00', 'no'), row(5, 'JHON-FIREFOX', 1, '3:00', 'no')]));
    const r = gate(dir, ['--playtests', 'rc1']);
    expect(r.out).toMatch(/1 distinct friend\(s\) with a first run on rc1, need 3/);
    expect(r.code).toBe(1);
  });

  it('does not count a run bound to an older rc unless the owner carries it', () => {
    const { dir } = greenRepo();
    put(dir, 'build/PLAYTESTS.md', playRows([row(1, 'P1', 1, '11:30', 'yes'), row(2, 'P2', 2, '12:10', 'yes'), row(3, 'P3', 2, '14:00', 'yes'), row(4, 'JHON', 2, '9:00', 'no'), row(5, 'JHON-FIREFOX', 2, '3:00', 'no')]));
    const a = gate(dir, ['--playtests', 'rc2']);
    expect(a.out).toMatch(/2 distinct friend\(s\)/);
    expect(a.code).toBe(1);
    put(dir, 'build/GATES.md', `# GATES\n\nJHON-CARRY: rc2:RUN-1 | ${T} | "JHON-CARRY: rc2:RUN-1 still valid" | redacted: no\n`);
    expect(gate(dir, ['--playtests', 'rc2']).code).toBe(0);
  });

  it('refuses a median outside 10 to 15 minutes, and a missing Firefox run', () => {
    const { dir } = greenRepo();
    put(dir, 'build/PLAYTESTS.md', playRows([row(1, 'P1', 1, '6:30', 'yes'), row(2, 'P2', 1, '7:10', 'yes'), row(3, 'P3', 1, '14:00', 'yes'), row(4, 'JHON', 1, '9:00', 'no')]));
    const r = gate(dir, ['--playtests', 'rc1']);
    expect(r.out).toMatch(/median first run 7:10 is outside/);
    expect(r.out).toMatch(/no Firefox smoke run/);
    expect(r.code).toBe(1);
  });

  it('X11 refuses a missing gate line, and a JHON-SHIP for an rc that is not the newest', () => {
    const { dir } = greenRepo();
    put(dir, 'build/PLAYTESTS.md', playRows([row(1, 'P1', 2, '11:30', 'yes'), row(2, 'P2', 2, '12:10', 'yes'), row(3, 'P3', 2, '14:00', 'yes'), row(4, 'JHON', 2, '9:00', 'no'), row(5, 'JHON-FIREFOX', 2, '3:00', 'no')]));
    put(dir, 'build/GATES.md', `# GATES\n\nJHON-PREVIEW: rc1 | ${T} | "JHON-PREVIEW: rc1" | redacted: no\nJHON-SHIP: rc1 | ${T} | "JHON-SHIP: rc1" | redacted: no\nJHON-PREVIEW: rc2 | ${T} | "JHON-PREVIEW: rc2" | redacted: no\n`);
    commit(dir, ['build/PLAYTESTS.md', 'build/GATES.md'], 'hush-spec: playtest RUN-5');
    git(dir, ['tag', '-a', 'hush-v1-rc2', '-m', 'rc2', 'hush-v1-rc1^{commit}']);
    const r = gate(dir, ['--rows', 'X11']);
    expect(r.out).toMatch(/X11: RED \| JHON-SHIP rc2 missing or revoked/);
    expect(r.code).toBe(1);
    fs.appendFileSync(path.join(dir, 'build', 'GATES.md'), `JHON-SHIP: rc2 | ${T} | "JHON-SHIP: rc2 ship it" | redacted: no\n`);
    const ok = gate(dir, ['--rows', 'X11']);
    expect(ok.out).toMatch(/X11: green \| rc2: preview and ship gates, 3 friends, median 12:10/);
    expect(ok.code).toBe(0);
  });
});
