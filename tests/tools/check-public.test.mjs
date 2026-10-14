// PF-CONTROLS for tools/check-public.mjs (D14): every class it guards, in the working tree, the index and the
// history, and the fail-closed denylist. The private strings are assembled at run time, so this file trips
// nothing itself.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commit, git, makeRepo, put, tool } from './fixture-repo.mjs';

const NAME = ['Zebulon', 'Quartermaine'].join(' ');
const names = (text = `# fixture denylist\n${NAME}\n`) => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hush-names-')), 'names.txt');
  fs.writeFileSync(f, text);
  return f;
};
const EMAIL = ['someone', 'example.org'].join('@');
const WIN = ['C:', 'Users', 'fixtureuser', 'notes.txt'].join('\\');
const WIN2 = ['C:', 'Users', 'fixtureuser', 'notes.txt'].join('\\\\');
const SLASH = ['C:', 'Users', 'fixtureuser', 'notes.txt'].join('/');
const VAULT = ['The', 'System'].join('');
const check = (cwd, args, file = names()) => tool('check-public.mjs', args, { cwd, env: { HUSH_NAMES_FILE: file } });

describe('check-public', () => {
  it('passes a clean tree and finds every class in a planted one', () => {
    const dir = makeRepo();
    put(dir, 'clean.md', 'nothing private here\n');
    commit(dir, ['clean.md'], 'clean');
    expect(check(dir, []).code).toBe(0);
    put(dir, 'a.txt', `path ${WIN}\n`);
    put(dir, 'b.txt', `escaped ${WIN2}\n`);
    put(dir, 'c.txt', `slashed ${SLASH}\n`);
    put(dir, 'd.txt', `mail ${EMAIL}\n`);
    put(dir, 'e.txt', `vault ${VAULT} root\n`);
    put(dir, 'f.txt', `hello ${NAME}\n`);
    const r = check(dir, []);
    for (const [f, cls] of [['a.txt', 'user-path'], ['b.txt', 'user-path'], ['c.txt', 'user-path'], ['d.txt', 'email'], ['e.txt', 'vault-root'], ['f.txt', 'name']]) {
      expect(r.out).toContain(`${f}:1: ${cls}`);
    }
    expect(r.out).not.toContain(EMAIL);
    expect(r.code).toBe(1);
  });

  // Audit 1, MINOR 2: the same two planted lines in UTF-16, the form Windows PowerShell 5.1 writes with `>` and Out-File,
  // are found in the tree, the index and the history; a body with a NUL that is not UTF-16 text is reported unscannable.
  it('reads UTF-16 bodies in every mode, and reports a binary body as unscannable', () => {
    const dir = makeRepo();
    put(dir, 'clean.md', 'nothing private here\n');
    commit(dir, ['clean.md'], 'clean');
    const text = `mail ${EMAIL}\npath ${WIN}\n`;
    const le = Buffer.from(text, 'utf16le');
    fs.writeFileSync(path.join(dir, 'le-bom.txt'), Buffer.concat([Buffer.from([0xff, 0xfe]), le]));
    fs.writeFileSync(path.join(dir, 'le.txt'), le);
    fs.writeFileSync(path.join(dir, 'be-bom.txt'), Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(le).swap16()]));
    fs.writeFileSync(path.join(dir, 'be.txt'), Buffer.from(le).swap16());
    // Mostly text with no NUL byte (CJK), so only the BOM tells UTF-16: the pair test alone would call it binary.
    const wide = Buffer.from(`${'中文'.repeat(40)}\n${text}`, 'utf16le');
    fs.writeFileSync(path.join(dir, 'le-wide.txt'), Buffer.concat([Buffer.from([0xff, 0xfe]), wide]));
    fs.writeFileSync(path.join(dir, 'be-wide.txt'), Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(wide).swap16()]));
    const tree = check(dir, []);
    for (const f of ['le-wide.txt', 'be-wide.txt']) {
      expect(tree.out).toContain(`${f}:2: email`);
      expect(tree.out).toContain(`${f}:3: user-path`);
    }
    for (const f of ['le-bom.txt', 'le.txt', 'be-bom.txt', 'be.txt']) {
      expect(tree.out).toContain(`${f}:1: email`);
      expect(tree.out).toContain(`${f}:2: user-path`);
    }
    expect(tree.out).not.toContain(EMAIL);
    expect(tree.code).toBe(1);
    const root = check(dir, ['--root', dir]);
    expect(root.out).toContain('le.txt:1: email');
    expect(root.out).toContain('be.txt:2: user-path');
    expect(root.code).toBe(1);
    git(dir, ['add', '--', 'le.txt']);
    const staged = check(dir, ['--staged']);
    expect(staged.out).toContain('index:le.txt:1: email');
    expect(staged.code).toBe(1);
    git(dir, ['commit', '-q', '-m', 'utf16']);
    const history = check(dir, ['--history']);
    expect(history.out).toMatch(/blob [0-9a-f]{8} \(le\.txt\):1: email/);
    expect(history.code).toBe(1);
    const bin = makeRepo();
    put(bin, 'clean.md', 'nothing private here\n');
    commit(bin, ['clean.md'], 'clean');
    fs.writeFileSync(path.join(bin, 'data.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]));
    const b = check(bin, []);
    expect(b.out).toContain('data.bin: unscannable (a NUL outside UTF-16 text)');
    expect(b.code).toBe(1);
  });

  it('refuses a planted index, and an index that holds a copy of the denylist', () => {
    const dir = makeRepo();
    put(dir, 'ok.md', 'fine\n');
    commit(dir, ['ok.md'], 'ok');
    put(dir, 'staged.txt', `mail ${EMAIL}\n`);
    git(dir, ['add', '--', 'staged.txt']);
    const a = check(dir, ['--staged']);
    expect(a.out).toContain('index:staged.txt:1: email');
    expect(a.code).toBe(1);
    git(dir, ['rm', '-q', '--cached', '--', 'staged.txt']);
    const list = names(`${NAME}\nAnother Person\n`);
    put(dir, 'copy.txt', fs.readFileSync(list, 'utf8'));
    git(dir, ['add', '--', 'copy.txt']);
    const b = check(dir, ['--staged'], list);
    expect(b.out).toContain('index:copy.txt:1: denylist-copy');
    expect(b.code).toBe(1);
  });

  it('walks the history: a commit body, a tag message, a deleted file and a pathname', () => {
    const dir = makeRepo();
    put(dir, 'x.md', 'one\n');
    commit(dir, ['x.md'], 'one');
    expect(check(dir, ['--history']).out).toMatch(/identity \(author\)/);
    const id = (d) => { git(d, ['config', 'user.name', 'pretending2bejhon']); git(d, ['config', 'user.email', '135627942+pretending2bejhon@users.noreply.github.com']); };
    const clean = makeRepo();
    id(clean);
    put(clean, 'x.md', 'one\n');
    commit(clean, ['x.md'], 'one');
    expect(check(clean, ['--history']).code).toBe(0);
    git(clean, ['commit', '-q', '--allow-empty', '-m', 'subject', '-m', `body ${WIN}`]);
    put(clean, 'gone.txt', `mail ${EMAIL}\n`);
    commit(clean, ['gone.txt'], 'add');
    git(clean, ['rm', '-q', '--', 'gone.txt']);
    git(clean, ['commit', '-q', '-m', 'remove']);
    put(clean, `${NAME}.txt`, 'innocent\n');
    commit(clean, [`${NAME}.txt`], 'named');
    git(clean, ['tag', '-a', 'v0', '-m', `ask ${EMAIL}`]);
    const r = check(clean, ['--history']);
    expect(r.out).toMatch(/commit [0-9a-f]{8}: commit-body/);
    expect(r.out).toMatch(/commit [0-9a-f]{8} message:[0-9]+: user-path/);
    expect(r.out).toMatch(/blob [0-9a-f]{8} \(gone\.txt\):1: email/);
    expect(r.out).toMatch(/name \(pathname\)/);
    expect(r.out).toMatch(/tag refs\/tags\/v0 message:1: email/);
    expect(r.code).toBe(1);
  });

  it('fails closed without a denylist or with an empty one', () => {
    const dir = makeRepo();
    put(dir, 'x.md', 'one\n');
    commit(dir, ['x.md'], 'one');
    expect(check(dir, [], path.join(os.tmpdir(), 'hush-no-such-names.txt')).code).toBe(3);
    expect(check(dir, [], names('# only a comment\n\n')).code).toBe(3);
  });
});
