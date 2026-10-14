// PF-CONTROLS for tools/deploy.mjs (D15), each in a temp copy of the repo with the control page as index.html
// and a local bare remote: the dry run pushes main, the tag and gh-pages in that order with the noreply
// identity and records X1 to X10; a second run extends gh-pages without force; a modified tracked file is
// refused and an untracked one ignored; a CRLF room and README turn the release clone's checks red; a private
// path in a commit body and an email in an annotated tag's message each stop the push; a diverged remote main
// is never forced; --release refuses an rc tag whose digest differs from its HUSH-SHIP-GATE line's; and (audit 1,
// MINOR 4) a dry run refuses a remote that is not an existing local bare repository, so it never publishes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_EMAIL, REPO_NAME } from '../../tools/identity.mjs';
import { deploy, git, makeControlCopy } from './control-copy.mjs';

const T = 300000;
const outDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hush-out-'));
const record = (out) => JSON.parse(fs.readFileSync(path.join(out, 'deploy.json'), 'utf8'));
const refs = (bare) => git(bare, ['for-each-ref', '--format=%(refname)']).split('\n').filter(Boolean).sort();
const who = (repo, rev, fmt) => git(repo, ['log', '-1', `--format=${fmt}`, rev]);

// Commits a file with CRLF endings that survive checkout: the path is marked -text, so the clone gets the bytes.
function plantCrlf(dir, rel) {
  fs.appendFileSync(path.join(dir, '.gitattributes'), `${rel} -text\n`);
  const file = path.join(dir, ...rel.split('/'));
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r?\n/g, '\r\n'));
  git(dir, ['add', '--', '.gitattributes', rel]);
}

describe('deploy.mjs --dry-run', () => {
  it('publishes main, the tag and gh-pages in order, records X1 to X10, and extends gh-pages without force', () => {
    const { dir, bare } = makeControlCopy();
    fs.writeFileSync(path.join(dir, 'untracked-note.txt'), 'an untracked file is ignored by the dry run\n');
    const out = outDir();
    const r = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', bare, '--out', out]);
    expect(r.out).toMatch(/pushed main[\s\S]*pushed tag[\s\S]*pushed gh-pages/);
    expect(r.code).toBe(0);
    const rec = record(out);
    expect(rec.pushes).toEqual(['main', 'tag', 'gh-pages']);
    expect(rec.checks.content.ok).toBe(true);
    expect(rec.checks.protect.ok).toBe(true);
    const gate = JSON.parse(fs.readFileSync(path.join(out, 'ship-gate.json'), 'utf8'));
    expect(gate.rows.map((x) => x.id)).toEqual(['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10']);
    expect(gate.rows.find((x) => x.id === 'X1').ok).toBe(true);
    const head = git(dir, ['rev-parse', 'HEAD']);
    expect(refs(bare)).toEqual(['refs/heads/gh-pages', 'refs/heads/main', `refs/tags/hush-dryrun-${head.slice(0, 8)}`]);
    expect(git(bare, ['rev-parse', 'refs/heads/main'])).toBe(head);
    const files = git(bare, ['ls-tree', '-r', '--name-only', 'gh-pages']).split('\n');
    expect(files).toContain('index.html');
    expect(files).toContain('.nojekyll');
    expect(files.some((f) => f.startsWith('assets/'))).toBe(true);
    expect(files).not.toContain('CNAME');
    expect(files).not.toContain('untracked-note.txt');
    expect(who(bare, 'gh-pages', '%an <%ae> %cn <%ce>')).toBe(`${REPO_NAME} <${REPO_EMAIL}> ${REPO_NAME} <${REPO_EMAIL}>`);
    expect(git(bare, ['for-each-ref', '--format=%(taggername) %(taggeremail)', `refs/tags/hush-dryrun-${head.slice(0, 8)}`])).toBe(`${REPO_NAME} <${REPO_EMAIL}>`);
    const firstPages = git(bare, ['rev-parse', 'gh-pages']);
    fs.writeFileSync(path.join(dir, 'build', 'reviews', 'README.md'), `${fs.readFileSync(path.join(dir, 'build', 'reviews', 'README.md'), 'utf8')}\none more line\n`);
    git(dir, ['add', '--', 'build/reviews/README.md']);
    git(dir, ['commit', '-q', '-m', 'hush-spec: one more commit']);
    const r2 = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', bare, '--out', outDir()]);
    expect(r2.code).toBe(0);
    expect(git(bare, ['rev-parse', 'refs/heads/main'])).toBe(git(dir, ['rev-parse', 'HEAD']));
    expect(git(bare, ['rev-parse', 'gh-pages^'])).toBe(firstPages);
  }, T * 2);

  it('refuses a modified tracked file and pushes nothing', () => {
    const { dir, bare } = makeControlCopy();
    fs.appendFileSync(path.join(dir, 'README.md'), 'a local edit\n');
    const out = outDir();
    const r = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', bare, '--out', out]);
    expect(r.out).toMatch(/REFUSED: the source tree is dirty/);
    expect(r.code).toBe(1);
    expect(refs(bare)).toEqual([]);
  }, T);

  it('turns the clone checks red on a CRLF room and README, and stops a private path in a commit body', () => {
    const { dir, bare } = makeControlCopy();
    plantCrlf(dir, 'rooms/03-dash.txt');
    plantCrlf(dir, 'README.md');
    git(dir, ['commit', '-q', '-m', 'hush-spec: crlf', '-m', ['C:', 'Users', 'someone', 'notes.txt'].join('\\')]);
    expect(git(dir, ['status', '--porcelain', '--untracked-files=no'])).toBe('');
    const out = outDir();
    const r = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', bare, '--out', out]);
    const rec = record(out);
    expect(rec.checks.content.ok).toBe(false);
    expect(rec.checks.protect.ok).toBe(false);
    expect(r.out).toMatch(/REFUSED: check-public --history refuses the push/);
    expect(r.code).toBe(1);
    expect(refs(bare)).toEqual([]);
  }, T);

  it('stops an annotated tag whose message holds an email', () => {
    const { dir, bare } = makeControlCopy();
    git(dir, ['tag', '-a', 'hush-v1-rc9', '-m', `candidate, ask ${['someone', 'example.org'].join('@')}`]);
    const r = deploy(dir, ['--dry-run', '--candidate', 'hush-v1-rc9', '--remote', bare, '--out', outDir()]);
    expect(r.out).toMatch(/as hush-v1-rc9/);
    expect(r.out).toMatch(/REFUSED: check-public --history refuses the push: tag refs\/tags\/hush-v1-rc9 message/);
    expect(r.code).toBe(1);
    expect(refs(bare)).toEqual([]);
  }, T);

  it('never forces a diverged remote main', () => {
    const { dir, bare } = makeControlCopy();
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-other-'));
    git(other, ['init', '-q', '-b', 'main']);
    git(other, ['config', 'user.name', REPO_NAME]);
    git(other, ['config', 'user.email', REPO_EMAIL]);
    fs.writeFileSync(path.join(other, 'x.txt'), 'another history\n');
    git(other, ['add', '--', 'x.txt']);
    git(other, ['commit', '-q', '-m', 'hush-spec: elsewhere']);
    git(other, ['push', '-q', bare, 'main:refs/heads/main']);
    const before = git(bare, ['rev-parse', 'refs/heads/main']);
    const r = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', bare, '--out', outDir()]);
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/rejected|non-fast-forward|fetch first|failed to push/i);
    expect(git(bare, ['rev-parse', 'refs/heads/main'])).toBe(before);
  }, T);

  it('refuses a remote that is not an existing local bare repository, and pushes nothing', () => {
    const { dir } = makeControlCopy();
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-plain-'));
    git(plain, ['init', '-q', '-b', 'elsewhere']);
    const r = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', plain, '--out', outDir()]);
    expect(r.out).toMatch(/REFUSED: a dry run publishes only to an existing local bare repository/);
    expect(r.code).toBe(1);
    expect(refs(plain)).toEqual([]);
    const url = deploy(dir, ['--dry-run', '--candidate', 'HEAD', '--remote', 'https://example.invalid/hush.git', '--out', outDir()]);
    expect(url.out).toMatch(/REFUSED: a dry run publishes only to an existing local bare repository/);
    expect(url.code).toBe(1);
  }, T);
});

describe('deploy.mjs --release', () => {
  it('refuses an rc tag whose commit digest differs from its HUSH-SHIP-GATE line', () => {
    const { dir, bare } = makeControlCopy();
    const progress = path.join(dir, 'build', 'HUSH-PROGRESS.md');
    fs.appendFileSync(progress, `HUSH-SHIP-GATE: PASS (head=${'a'.repeat(40)} digest=${'b'.repeat(64)})\n`);
    git(dir, ['add', '--', 'build/HUSH-PROGRESS.md']);
    git(dir, ['commit', '-q', '-m', 'hush-audit: pass 1']);
    git(dir, ['tag', '-a', 'hush-v1-rc1', '-m', 'release candidate 1']);
    const r = deploy(dir, ['--release', '--remote', bare]);
    expect(r.out).toMatch(/REFUSED: hush-v1-rc1's commit digest [0-9a-f]{12} differs from its HUSH-SHIP-GATE line's bbbbbbbbbbbb/);
    expect(r.code).toBe(1);
    expect(refs(bare)).toEqual([]);
  }, T);

  it('refuses an untracked file before a release, and a tag that is not the newest', () => {
    const { dir, bare } = makeControlCopy();
    git(dir, ['tag', '-a', 'hush-v1-rc1', '-m', 'one']);
    git(dir, ['tag', '-a', 'hush-v1-rc2', '-m', 'two']);
    const old = deploy(dir, ['--release', '--tag', 'hush-v1-rc1', '--remote', bare]);
    expect(old.out).toMatch(/REFUSED: hush-v1-rc1 is not the newest rc tag \(hush-v1-rc2\)/);
    fs.writeFileSync(path.join(dir, 'stray.txt'), 'untracked\n');
    const dirty = deploy(dir, ['--release', '--remote', bare]);
    expect(dirty.out).toMatch(/REFUSED: the source tree is dirty/);
    expect(dirty.code).toBe(1);
    expect(refs(bare)).toEqual([]);
  }, T);
});
