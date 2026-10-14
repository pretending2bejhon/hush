// Controls for tools/notices.mjs (audit 1, MINOR 3) and X10's notices row (tools/probe-supply.mjs): the runtime
// tree is walked as Node resolves it, shared texts are written once, a package with no licence file gets the
// standard MIT or ISC text without any email, every other gap fails, the Vite plugin emits the file and refuses a
// bundled package outside the tree, X10 names every runtime package of the lockfile, and the file the repo ships
// passes check-public. Emails are assembled at run time, so this file trips nothing itself.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundleProblems, holderOf, NOTICES_FILE, noticesText, NoticeError, packageDirOf, runtimePackages, thirdPartyNotices,
} from '../../tools/notices.mjs';
import { lockRuntimePackages, noticesProblems, NOTICES_FILE as SUPPLY_NOTICES_FILE } from '../../tools/probe-supply.mjs';
import { put, REPO, tool } from './fixture-repo.mjs';

const EMAIL = ['someone', 'example.invalid'].join('@');
const MIT_A = 'MIT License\n\nCopyright (c) Fixture A\n\nPermission is hereby granted, for the fixture.\n';
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

function pkg(root, rel, json, files = {}) {
  put(root, `${rel}/package.json`, JSON.stringify(json, null, 2));
  for (const [name, text] of Object.entries(files)) put(root, `${rel}/${name}`, text);
}
const rm = (root, rel) => fs.rmSync(path.join(root, ...rel.split('/')));

// a and @s/b ship one text (b's with CRLF ends and trailing blanks); @s/b needs c@2, nested, with no licence file
// and an author carrying an email and a URL; the root needs c@1 itself; a's optional d is not installed, its
// optional e is, with a NOTICE; x is a devDependency.
function fixtureTree() {
  const root = tmp('hush-notices-');
  pkg(root, '.', { name: 'fixture', version: '0.0.0', dependencies: { a: '1.0.0', '@s/b': '1.0.0', c: '1.0.0' }, devDependencies: { x: '1.0.0' } });
  pkg(root, 'node_modules/a', { name: 'a', version: '1.0.0', license: 'MIT', type: 'module', main: 'index.js', optionalDependencies: { d: '1.0.0', e: '1.0.0' } }, { LICENSE: MIT_A, 'index.js': 'export const a = 1;\n' });
  pkg(root, 'node_modules/@s/b', { name: '@s/b', version: '1.0.0', license: 'MIT', dependencies: { c: '2.0.0' } }, { 'LICENSE.txt': `${MIT_A.replace(/\n/g, '  \r\n')}\r\n` });
  pkg(root, 'node_modules/@s/b/node_modules/c', { name: 'c', version: '2.0.0', license: 'ISC', author: `C Person <${EMAIL}> (https://c.example.invalid)` });
  pkg(root, 'node_modules/c', { name: 'c', version: '1.0.0', license: 'MIT' }, { 'LICENSE.md': 'Copyright (c) C One, the first c.\n' });
  pkg(root, 'node_modules/e', { name: 'e', version: '1.0.0', license: 'BSD-2-Clause' }, { 'LICENSE.BSD': 'BSD text of e.\n', NOTICE: 'Notice of e.\n' });
  // x has a side effect: Rolldown leaves a module whose only export it inlines out of the chunk's moduleIds.
  pkg(root, 'node_modules/x', { name: 'x', version: '1.0.0', license: 'MIT', type: 'module', main: 'index.js' }, { LICENSE: 'Copyright (c) X, dev only.\n', 'index.js': 'globalThis.xLoaded = true;\nexport const x = 2;\n' });
  return root;
}

describe('notices.mjs: the runtime tree', () => {
  it('walks dependencies and installed optional dependencies as Node resolves them, nested versions included', () => {
    const ids = runtimePackages(fixtureTree()).map((p) => `${p.name}@${p.version}`);
    expect(ids).toEqual(['@s/b@1.0.0', 'a@1.0.0', 'c@1.0.0', 'c@2.0.0', 'e@1.0.0']);
  });

  it('fails on a dependency that is not installed, naming it and who needs it', () => {
    const root = fixtureTree();
    pkg(root, 'node_modules/e', { name: 'e', version: '1.0.0', license: 'BSD-2-Clause', dependencies: { g: '1.0.0' } }, { 'LICENSE.BSD': 'BSD text of e.\n' });
    expect(() => runtimePackages(root)).toThrow(NoticeError);
    expect(() => runtimePackages(root)).toThrow(/g \(a dependency of e@1\.0\.0\) is not installed/);
  });
});

describe('notices.mjs: the file', () => {
  it('lists packages that ship one text above one copy of it, a NOTICE after its licence, and leaves out dev and missing optional packages', () => {
    const text = noticesText(fixtureTree());
    expect(text).toMatch(/^Third-party notices for The Hush\n/);
    expect(text).toMatch(/\n5 packages, 4 licence texts\.\n/);
    expect(text).toContain('- @s/b@1.0.0 (MIT)\n- a@1.0.0 (MIT)\n\nMIT License\n\nCopyright (c) Fixture A\n');
    expect(text.split('Copyright (c) Fixture A').length - 1).toBe(1);
    expect(text).toContain('- c@1.0.0 (MIT)\n\nCopyright (c) C One, the first c.\n');
    expect(text).toContain('- e@1.0.0 (BSD-2-Clause)\n\nBSD text of e.\n\nNotice of e.\n');
    expect(text).not.toMatch(/x@1\.0\.0|- d@/);
    expect(text).not.toMatch(/\r|[ \t]\n/);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('gives a package with no licence file the standard ISC or MIT text, its holder named without email or URL', () => {
    const text = noticesText(fixtureTree());
    expect(text).toContain('- c@2.0.0 (ISC)\n\n(c@2.0.0 ships no licence file: this is the standard ISC text, the holder from its package.json author.)\n\nISC License\n\nCopyright (c) C Person\n\nPermission to use, copy, modify, and/or distribute this software');
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain('c.example.invalid');
    const root = fixtureTree();
    pkg(root, 'node_modules/c', { name: 'c', version: '1.0.0', license: 'MIT', author: EMAIL });
    rm(root, 'node_modules/c/LICENSE.md');
    const bare = noticesText(root);
    expect(bare).toContain('(c@1.0.0 ships no licence file: this is the standard MIT text, its package.json naming no author by name.)\n\nMIT License\n\nCopyright (c) the authors of c\n\nPermission is hereby granted, free of charge');
    expect(bare).not.toContain(EMAIL);
  });

  it('fails on a package with no licence file whose licence id is neither MIT nor ISC', () => {
    const root = fixtureTree();
    pkg(root, 'node_modules/e', { name: 'e', version: '1.0.0', license: 'Apache-2.0' });
    rm(root, 'node_modules/e/LICENSE.BSD');
    rm(root, 'node_modules/e/NOTICE');
    expect(() => noticesText(root)).toThrow(/no licence text for e@1\.0\.0 \(Apache-2\.0\)/);
  });

  it('names the holder of an author string or object and nothing else', () => {
    expect(holderOf(EMAIL)).toBeNull();
    expect(holderOf(`Felix Example <${EMAIL}> (https://example.invalid)`)).toBe('Felix Example');
    expect(holderOf({ name: 'Org Name', email: EMAIL })).toBe('Org Name');
    expect(holderOf(undefined)).toBeNull();
  });
});

describe('notices.mjs: the bundle', () => {
  it('finds each module\'s package folder, the scoped and nested ones too, and ignores virtual and own modules', () => {
    expect(packageDirOf('C:/r/node_modules/@s/b/node_modules/c/x.js')).toBe('C:/r/node_modules/@s/b/node_modules/c');
    expect(packageDirOf('C:\\r\\node_modules\\a\\dist\\a.js?commonjs-es-import')).toBe('C:/r/node_modules/a');
    expect(packageDirOf('\0rolldown/runtime.js')).toBeNull();
    expect(packageDirOf('C:/r/src/main.ts')).toBeNull();
  });

  it('refuses a bundled module whose package lies outside the runtime tree', () => {
    const root = fixtureTree();
    const nm = (rel) => path.join(root, 'node_modules', rel);
    const ids = [nm('a/index.js'), '\0rolldown/runtime.js', path.join(root, 'main.js'), nm('@s/b/node_modules/c/i.js'), `${nm('x/index.js')}?v=1`];
    expect(bundleProblems(ids, runtimePackages(root))).toEqual(['x@1.0.0 has a module in the bundle but is not in the runtime dependency tree']);
    expect(bundleProblems(ids.slice(0, 4), runtimePackages(root))).toEqual([]);
  });

  it('the Vite plugin writes the file into dist, and fails the build on a bundled devDependency', async () => {
    const { build } = await import('vite');
    const root = fixtureTree();
    put(root, 'index.html', '<!doctype html>\n<script type="module" src="/main.js"></script>\n');
    const run = (main) => {
      put(root, 'main.js', main);
      const outDir = tmp('hush-notices-dist-');
      return build({ root, configFile: false, logLevel: 'silent', publicDir: false, build: { outDir, emptyOutDir: true }, plugins: [thirdPartyNotices()] }).then(() => outDir);
    };
    const outDir = await run("import { a } from 'a';\nconsole.log(a);\n");
    const file = path.join(outDir, NOTICES_FILE);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(noticesText(root));
    await expect(run("import { x } from 'x';\nconsole.log(x);\n")).rejects.toThrow(/x@1\.0\.0 has a module in the bundle but is not in the runtime dependency tree/);
  }, 120000);
});

describe('X10: the notices row (tools/probe-supply.mjs)', () => {
  const lock = {
    packages: {
      '': { dependencies: { a: '1.0.0' } },
      'node_modules/a': { version: '1.0.0', license: 'MIT' },
      'node_modules/a/node_modules/c': { version: '2.0.0', license: 'ISC' },
      'node_modules/o': { version: '1.0.0', license: 'MIT', optional: true },
      'node_modules/p': { version: '1.0.0', license: 'MIT', optional: true },
      'node_modules/v': { version: '1.0.0', license: 'MIT', dev: true },
      'node_modules/w': { version: '1.0.0', license: 'MIT', devOptional: true },
    },
  };
  const installed = (key) => key !== 'node_modules/p';
  const named = '- a@1.0.0 (MIT)\n- c@2.0.0 (ISC)\n- o@1.0.0 (MIT)\n';

  it('wants every runtime entry, nested ones and installed optional ones, but no dev entry', () => {
    expect([...lockRuntimePackages(lock, installed).keys()]).toEqual(['a@1.0.0', 'c@2.0.0', 'o@1.0.0']);
    expect(noticesProblems(lock, named, installed)).toEqual([]);
    expect(noticesProblems(lock, named.replace(/\n/g, '\r\n'), installed)).toEqual([]);
  });

  it('fails a build without the file, a file that leaves a package out, and a package under another licence id', () => {
    expect(noticesProblems(lock, null, installed)).toEqual(['THIRD-PARTY-NOTICES.txt is missing from the build']);
    expect(noticesProblems(lock, named.replace('- c@2.0.0 (ISC)\n', ''), installed)).toEqual(['THIRD-PARTY-NOTICES.txt does not name 1 runtime package(s) of the lockfile: c@2.0.0 (ISC)']);
    expect(noticesProblems(lock, named.replace('(ISC)', '(MIT)'), installed)).toEqual(['THIRD-PARTY-NOTICES.txt does not name 1 runtime package(s) of the lockfile: c@2.0.0 (ISC)']);
    expect(noticesProblems(lock, named, () => true)).toEqual(['THIRD-PARTY-NOTICES.txt does not name 1 runtime package(s) of the lockfile: p@1.0.0 (MIT)']);
  });

  it('names the file the plugin writes', () => {
    expect(SUPPLY_NOTICES_FILE).toBe(NOTICES_FILE);
  });
});

describe('the repo\'s own notices', () => {
  const repoText = () => noticesText(REPO);
  const names = () => {
    const f = path.join(tmp('hush-names-'), 'names.txt');
    fs.writeFileSync(f, `# fixture denylist\n${['Zebulon', 'Quartermaine'].join(' ')}\n`);
    return f;
  };

  it('name every runtime package of the lockfile with its licence', () => {
    const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
    const installed = (key) => fs.existsSync(path.join(REPO, key, 'package.json'));
    expect(noticesProblems(lock, repoText(), installed)).toEqual([]);
    expect(runtimePackages(REPO).length).toBe(lockRuntimePackages(lock, installed).size);
  });

  it('pass check-public: the one third-party address they carry is masked, and an address not listed is still found', () => {
    const dir = tmp('hush-notices-public-');
    fs.writeFileSync(path.join(dir, NOTICES_FILE), repoText());
    const clean = tool('check-public.mjs', ['--root', dir], { env: { HUSH_NAMES_FILE: names() } });
    expect(clean.out).toMatch(/check-public root \(1 files\): clean/);
    expect(clean.code).toBe(0);
    fs.appendFileSync(path.join(dir, NOTICES_FILE), `Copyright (c) Someone <${EMAIL}>\n`);
    const planted = tool('check-public.mjs', ['--root', dir], { env: { HUSH_NAMES_FILE: names() } });
    expect(planted.out).toMatch(/THIRD-PARTY-NOTICES\.txt:\d+: email/);
    expect(planted.code).toBe(1);
  });
});
