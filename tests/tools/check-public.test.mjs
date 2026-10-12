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
