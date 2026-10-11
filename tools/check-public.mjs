// check:public (D14): nothing private may enter the public repo or its history.
//   node tools/check-public.mjs                   working tree: tracked and untracked files git would see
//   node tools/check-public.mjs --staged          the index about to be committed
//   node tools/check-public.mjs --history [refs]  every reachable commit, tree, blob, pathname, message and
//                                                 annotated tag on the given refs (default: every ref)
//   node tools/check-public.mjs --root <dir>      every file under a directory (fixtures, scratch copies)
// Exit 0 clean, 1 findings, 2 usage or git error, 3 denylist missing or empty (fail closed).
// Findings name the place and the class, never the matched text.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_EMAIL, REPO_NAME } from './identity.mjs';
import { DenylistError, makeContext, scanText } from './public-patterns.mjs';

const MAX = 1024 * 1024 * 1024;

function git(cwd, args, input) {
  return execFileSync('git', args, { cwd, input, maxBuffer: MAX, stdio: ['pipe', 'pipe', 'pipe'] });
}

function readBlobs(cwd, shas) {
  const out = new Map();
  if (!shas.length) return out;
  const buf = git(cwd, ['cat-file', '--batch'], shas.join('\n') + '\n');
  let pos = 0;
  while (pos < buf.length) {
    const nl = buf.indexOf(10, pos);
    const header = buf.subarray(pos, nl).toString('utf8');
    const [sha, type, sizeText] = header.split(' ');
    if (type === 'missing') { pos = nl + 1; continue; }
    const size = Number(sizeText);
    out.set(sha, { type, body: buf.subarray(nl + 1, nl + 1 + size) });
    pos = nl + 1 + size + 1;
  }
  return out;
}

function report(findings, ctx, scope) {
  for (const f of findings) process.stdout.write(`${f.where}: ${f.cls}\n`);
  process.stdout.write(`check-public ${scope}: ${findings.length ? `FAIL, ${findings.length} finding(s)` : 'clean'} (${ctx.source}, ${ctx.count} names + ${ctx.implicitCount} machine names)\n`);
  return findings.length ? 1 : 0;
}

function scanInto(findings, where, text, ctx) {
  for (const h of scanText(text, ctx)) findings.push({ where: `${where}:${h.line}`, cls: h.cls });
}

function scanName(findings, where, name, ctx) {
  for (const h of scanText(name, ctx)) findings.push({ where, cls: `${h.cls} (pathname)` });
}

function treeMode(cwd, ctx) {
  const top = git(cwd, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  const files = git(top, ['ls-files', '-z', '-co', '--exclude-standard']).toString('utf8').split('\0').filter(Boolean);
  const findings = [];
  for (const rel of files) {
    scanName(findings, rel, rel, ctx);
    const abs = path.join(top, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    scanInto(findings, rel, fs.readFileSync(abs).toString('utf8'), ctx);
  }
  return report(findings, ctx, `tree (${files.length} files)`);
}

function stagedMode(cwd, ctx) {
  const top = git(cwd, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  const entries = git(top, ['ls-files', '-z', '-s']).toString('utf8').split('\0').filter(Boolean).map((l) => {
    const tab = l.indexOf('\t');
    const [mode, sha] = l.slice(0, tab).split(' ');
    return { mode, sha, rel: l.slice(tab + 1) };
  });
  const blobs = readBlobs(top, [...new Set(entries.filter((e) => e.mode !== '160000').map((e) => e.sha))]);
  const findings = [];
  for (const e of entries) {
    scanName(findings, `index:${e.rel}`, e.rel, ctx);
    const b = blobs.get(e.sha);
    if (b) scanInto(findings, `index:${e.rel}`, b.body.toString('utf8'), ctx);
  }
  return report(findings, ctx, `staged (${entries.length} entries)`);
}

function parseIdentity(line) {
  const m = /^(?:author|committer|tagger) (.*) <([^>]*)> \d+ [+-]\d{4}$/.exec(line);
  return m ? { name: m[1], email: m[2] } : null;
}

function headerAndMessage(body) {
  const text = body.toString('utf8');
  const cut = text.indexOf('\n\n');
  return { header: cut < 0 ? text : text.slice(0, cut), message: cut < 0 ? '' : text.slice(cut + 2) };
}

function checkIdentityLines(findings, where, header) {
  for (const line of header.split('\n')) {
    if (!/^(author|committer|tagger) /.test(line)) continue;
    const id = parseIdentity(line);
    if (!id || id.name !== REPO_NAME || id.email !== REPO_EMAIL) findings.push({ where, cls: `identity (${line.split(' ')[0]})` });
  }
}

function checkMessage(findings, where, message, ctx) {
  const body = message.replace(/\n+$/, '');
  if (body.includes('\n')) findings.push({ where, cls: 'commit-body (subject only, one -m)' });
  scanInto(findings, `${where} message`, body, ctx);
}

function treeNames(body) {
  const names = [];
  let pos = 0;
  while (pos < body.length) {
    const sp = body.indexOf(32, pos);
    const nul = body.indexOf(0, sp);
    names.push(body.subarray(sp + 1, nul).toString('utf8'));
    pos = nul + 21;
  }
  return names;
}

function historyMode(cwd, refsArg, ctx) {
  const top = git(cwd, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  let refs = refsArg;
  if (!refs.length) {
    refs = git(top, ['for-each-ref', '--format=%(refname)']).toString('utf8').split('\n').filter(Boolean);
    try { git(top, ['rev-parse', '--verify', '-q', 'HEAD']); refs.push('HEAD'); } catch { /* unborn HEAD */ }
  }
  const findings = [];
  if (!refs.length) return report(findings, ctx, 'history (no refs)');
  const tips = [];
  for (const r of refs) {
    let sha;
    try { sha = git(top, ['rev-parse', '--verify', '-q', r]).toString('utf8').trim(); } catch { throw new Error(`ref not found: ${r}`); }
    tips.push({ ref: r, sha });
  }
  // Annotated tags (and tags of tags) are objects of their own: tagger and message are public metadata.
  const commitTips = [];
  for (const t of tips) {
    let sha = t.sha;
    for (let depth = 0; depth < 16; depth++) {
      const type = git(top, ['cat-file', '-t', sha]).toString('utf8').trim();
      if (type !== 'tag') { commitTips.push(sha); break; }
      const body = readBlobs(top, [sha]).get(sha).body;
      const { header, message } = headerAndMessage(body);
      checkIdentityLines(findings, `tag ${t.ref}`, header);
      scanInto(findings, `tag ${t.ref} message`, message, ctx);
      const nameLine = header.split('\n').find((l) => l.startsWith('tag '));
      if (nameLine) scanName(findings, `tag ${t.ref} name`, nameLine.slice(4), ctx);
      sha = header.split('\n').find((l) => l.startsWith('object ')).slice(7).trim();
    }
  }
  for (const t of tips) scanName(findings, `ref ${t.ref}`, t.ref, ctx);
  const listing = git(top, ['rev-list', '--objects', ...new Set(commitTips)]).toString('utf8').split('\n').filter(Boolean);
  const shas = [...new Set(listing.map((l) => l.slice(0, 40)))];
  const paths = new Map(listing.map((l) => [l.slice(0, 40), l.slice(41)]));
  const objects = readBlobs(top, shas);
  let commits = 0;
  let blobs = 0;
  let trees = 0;
  for (const sha of shas) {
    const o = objects.get(sha);
    if (!o) continue;
    const short = sha.slice(0, 8);
    if (o.type === 'commit') {
      commits++;
      const { header, message } = headerAndMessage(o.body);
      checkIdentityLines(findings, `commit ${short}`, header);
      checkMessage(findings, `commit ${short}`, message, ctx);
    } else if (o.type === 'tree') {
      trees++;
      for (const name of treeNames(o.body)) scanName(findings, `tree ${short} entry`, name, ctx);
    } else if (o.type === 'blob') {
      blobs++;
      scanInto(findings, `blob ${short} (${paths.get(sha) || '?'})`, o.body.toString('utf8'), ctx);
    }
  }
  return report(findings, ctx, `history (${tips.length} refs, ${commits} commits, ${trees} trees, ${blobs} blobs)`);
}

function walk(dir, base, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules') continue;
    const abs = path.join(dir, ent.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (ent.isDirectory()) walk(abs, base, out);
    else out.push(rel);
  }
  return out;
}

function rootMode(dir, ctx) {
  const base = path.resolve(dir);
  const files = walk(base, base, []);
  const findings = [];
  for (const rel of files) {
    scanName(findings, rel, rel, ctx);
    scanInto(findings, rel, fs.readFileSync(path.join(base, rel)).toString('utf8'), ctx);
  }
  return report(findings, ctx, `root (${files.length} files)`);
}

function main(argv) {
  let ctx;
  try {
    ctx = makeContext();
  } catch (e) {
    if (e instanceof DenylistError) {
      process.stderr.write(`check-public: ${e.message}; refusing to judge (fail closed)\n`);
      return 3;
    }
    throw e;
  }
  const cwd = process.cwd();
  const [mode, ...rest] = argv;
  if (!mode) return treeMode(cwd, ctx);
  if (mode === '--staged' && !rest.length) return stagedMode(cwd, ctx);
  if (mode === '--history') return historyMode(cwd, rest, ctx);
  if (mode === '--root' && rest.length === 1) return rootMode(rest[0], ctx);
  process.stderr.write('usage: check-public.mjs [--staged | --history [refs...] | --root <dir>]\n');
  return 2;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`check-public: ${e.message}\n`);
  process.exitCode = 2;
}
