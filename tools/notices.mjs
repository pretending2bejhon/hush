// The third-party notices (audit 1, MINOR 3). The build writes THIRD-PARTY-NOTICES.txt into dist beside
// index.html: for every npm package in the runtime dependency tree (package.json's dependencies, followed
// through each package's own dependencies and installed optional dependencies, by Node's lookup), its name,
// version and licence id, and the licence text it ships (its LICENSE, LICENCE or COPYING files and any NOTICE
// file), read from node_modules at build time. Packages that ship the same text are listed together above one
// copy of it. A package that ships no licence file gets the standard text of its licence id when that id is MIT
// or ISC, the holder taken from its package.json author with any email or URL left out. The build fails on any
// other licence id with no file, on a dependency that is not installed, and on a module in the bundle whose
// package lies outside the tree. Nothing links the file: the page's text stays the Handoff's (section 18).
//   node tools/notices.mjs [--root <dir>]   print the file the build would write; exit 0, 1 when it cannot
//                                           be written (the reason on stderr), 2 on usage
// vite.config.ts runs it through thirdPartyNotices(), a Vite plugin. X10 (tools/probe-supply.mjs) holds the
// built file to the lockfile's runtime packages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_SLUG } from './identity.mjs';

export const NOTICES_FILE = 'THIRD-PARTY-NOTICES.txt';
const RULE = '='.repeat(80);
const LICENCE_FILE_RE = /^(?:licen[cs]e|copying)(?:[._-].*)?$/i;
const NOTICE_FILE_RE = /^notice(?:[._-].*)?$/i;

export class NoticeError extends Error {}

const STANDARD = {
  MIT: (holder) => [
    'MIT License',
    '',
    `Copyright (c) ${holder}`,
    '',
    'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:',
    '',
    'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
    '',
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
  ].join('\n'),
  ISC: (holder) => [
    'ISC License',
    '',
    `Copyright (c) ${holder}`,
    '',
    'Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.',
    '',
    'THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.',
  ].join('\n'),
};

function readPkg(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
}

// A package.json's licence id: the SPDX string, the old { type } object, or the old licenses array.
export function licenceOf(pkg) {
  if (typeof pkg.license === 'string' && pkg.license.trim()) return pkg.license.trim();
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses) && pkg.licenses.length) return pkg.licenses.map((l) => (typeof l === 'string' ? l : l && l.type)).join(' OR ');
  return 'UNKNOWN';
}

// The holder named by a package.json author ("Name <email> (url)", a bare name, or { name }), with every email
// and URL left out; null when nothing else is left.
export function holderOf(author) {
  let s = typeof author === 'string' ? author : author && typeof author.name === 'string' ? author.name : '';
  s = s.replace(/<[^>]*>/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\S+@\S+/g, ' ').replace(/\bhttps?:\/\/\S+/gi, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s || null;
}

// A text as it is compared and written: no BOM, LF line ends, no trailing blanks, no leading or trailing blank lines.
export function normalizeText(text) {
  return String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/^\n+/, '').replace(/\n+$/, '');
}

// Node's lookup of a dependency from a package folder: its own node_modules, then each ancestor's, up to root.
function lookup(root, from, name) {
  let dir = from;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', ...name.split('/'));
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (dir === root) return null;
    const up = path.dirname(dir);
    if (up === dir || !up.startsWith(root)) return null;
    dir = up;
  }
}

function compareVersions(a, b) {
  const pa = String(a).split(/[.+-]/);
  const pb = String(b).split(/[.+-]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? '';
    const y = pb[i] ?? '';
    if (x === y) continue;
    const nx = /^\d+$/.test(x) ? Number(x) : NaN;
    const ny = /^\d+$/.test(y) ? Number(y) : NaN;
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}

function comparePackages(a, b) {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return compareVersions(a.version, b.version);
}

// Every package of the runtime tree once by name@version, sorted: { name, version, license, dir, author }.
export function runtimePackages(root) {
  const top = path.resolve(root);
  const rootPkg = readPkg(top);
  const seen = new Map();
  const missing = [];
  const queue = [];
  const push = (from, pkg, by) => {
    const optional = new Set(Object.keys(pkg.optionalDependencies || {}));
    for (const name of Object.keys(pkg.dependencies || {})) if (!optional.has(name)) queue.push({ from, name, optional: false, by });
    for (const name of optional) queue.push({ from, name, optional: true, by });
  };
  push(top, { dependencies: rootPkg.dependencies, optionalDependencies: rootPkg.optionalDependencies }, 'package.json');
  while (queue.length) {
    const { from, name, optional, by } = queue.shift();
    const dir = lookup(top, from, name);
    if (!dir) {
      if (!optional) missing.push(`${name} (a dependency of ${by}) is not installed`);
      continue;
    }
    if (seen.has(dir)) continue;
    const pkg = readPkg(dir);
    const entry = { name: pkg.name || name, version: String(pkg.version), license: licenceOf(pkg), dir, author: pkg.author };
    seen.set(dir, entry);
    push(dir, pkg, `${entry.name}@${entry.version}`);
  }
  if (missing.length) throw new NoticeError(`the runtime tree is not installed: ${missing.join('; ')}`);
  const byId = new Map();
  for (const dir of [...seen.keys()].sort()) {
    const e = seen.get(dir);
    const id = `${e.name}@${e.version}`;
    if (!byId.has(id)) byId.set(id, e);
  }
  return [...byId.values()].sort(comparePackages);
}

// The text a package ships, or the standard text its licence id names when it ships none.
export function licenceText(p) {
  const files = fs.readdirSync(p.dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name).sort();
  const texts = [...files.filter((f) => LICENCE_FILE_RE.test(f)), ...files.filter((f) => NOTICE_FILE_RE.test(f))]
    .map((f) => normalizeText(fs.readFileSync(path.join(p.dir, f), 'utf8')))
    .filter(Boolean);
  if (texts.length) return texts.join('\n\n');
  const standard = STANDARD[p.license];
  if (!standard) return null;
  const holder = holderOf(p.author);
  return [
    `(${p.name}@${p.version} ships no licence file: this is the standard ${p.license} text, ${holder ? 'the holder from its package.json author' : 'its package.json naming no author by name'}.)`,
    '',
    standard(holder || `the authors of ${p.name}`),
  ].join('\n');
}

// The package folder a bundled module comes from, or null for a module outside node_modules (the game's own
// files, virtual modules).
export function packageDirOf(id) {
  const file = String(id).split('?')[0].replace(/\\/g, '/');
  if (file.startsWith('\0')) return null;
  const at = file.lastIndexOf('/node_modules/');
  if (at < 0) return null;
  const parts = file.slice(at + '/node_modules/'.length).split('/');
  const n = parts[0].startsWith('@') ? 2 : 1;
  if (parts.length <= n) return null;
  return file.slice(0, at + '/node_modules/'.length) + parts.slice(0, n).join('/');
}

// Every package with a module in the bundle must be in the runtime tree, or its notice would be missing.
export function bundleProblems(moduleIds, packages) {
  const inTree = new Set(packages.map((p) => `${p.name}@${p.version}`));
  const outside = new Set();
  for (const id of moduleIds) {
    const dir = packageDirOf(id);
    if (!dir) continue;
    let pkgId;
    try {
      const pkg = readPkg(dir);
      pkgId = `${pkg.name}@${pkg.version}`;
    } catch {
      pkgId = `${dir.slice(dir.lastIndexOf('/node_modules/') + '/node_modules/'.length)} (no package.json)`;
    }
    if (!inTree.has(pkgId)) outside.add(pkgId);
  }
  return [...outside].sort().map((id) => `${id} has a module in the bundle but is not in the runtime dependency tree`);
}

export function noticesText(root, packages = runtimePackages(root)) {
  const groups = new Map();
  const lacking = [];
  for (const p of packages) {
    const text = licenceText(p);
    if (!text) { lacking.push(`${p.name}@${p.version} (${p.license})`); continue; }
    if (!groups.has(text)) groups.set(text, []);
    groups.get(text).push(p);
  }
  if (lacking.length) throw new NoticeError(`no licence text for ${lacking.join(', ')}: the package ships no licence file and its licence id is not MIT or ISC`);
  const order = new Map(packages.map((p, i) => [p, i]));
  const ordered = [...groups].map(([text, pkgs]) => ({ text, pkgs })).sort((a, b) => {
    const la = a.pkgs[0].license;
    const lb = b.pkgs[0].license;
    if (la !== lb) return la < lb ? -1 : 1;
    return order.get(a.pkgs[0]) - order.get(b.pkgs[0]);
  });
  const out = [
    'Third-party notices for The Hush',
    '',
    'The built page may hold code from any of the npm packages below: the runtime dependency tree of package.json as installed, its dependencies followed through each package\'s own dependencies and installed optional dependencies. Each package is listed with its version and licence id above the licence text it ships, and packages that ship the same text share one copy. The build writes this file from node_modules (tools/notices.mjs).',
    '',
    `The Hush itself is free software under the GNU Affero General Public License, version 3 or later. Its source: https://github.com/${REPO_SLUG}`,
    '',
    `${packages.length} packages, ${ordered.length} licence texts.`,
  ];
  for (const g of ordered) {
    out.push('', RULE, '');
    for (const p of g.pkgs) out.push(`- ${p.name}@${p.version} (${p.license})`);
    out.push('', g.text);
  }
  return `${out.join('\n')}\n`;
}

// The Vite plugin: at generateBundle, check the bundle's packages against the runtime tree and emit the file.
export function thirdPartyNotices() {
  let root = process.cwd();
  return {
    name: 'hush-third-party-notices',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const packages = runtimePackages(root);
      const ids = [];
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') ids.push(...(item.moduleIds || Object.keys(item.modules || {})));
      }
      const problems = bundleProblems(ids, packages);
      if (problems.length) throw new NoticeError(problems.join('; '));
      this.emitFile({ type: 'asset', fileName: NOTICES_FILE, source: noticesText(root, packages) });
    },
  };
}

function main(argv) {
  let root = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) root = argv[++i];
    else { process.stderr.write('usage: notices.mjs [--root <dir>]\n'); return 2; }
  }
  try {
    process.stdout.write(noticesText(root));
    return 0;
  } catch (e) {
    process.stderr.write(`notices: ${e.message}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  process.exitCode = main(process.argv.slice(2));
}
