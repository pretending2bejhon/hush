// The deploy (D15). HIGHEST-SCRUTINY. One code path, two entries:
//   node tools/deploy.mjs --release [--tag hush-v1-rc<N>] [--remote <url-or-path>]      npm run deploy (the owner)
//   node tools/deploy.mjs --dry-run --candidate <rev> --remote <bare-path> --out <dir>   the auditor and the controls
// Both: refuse a dirty source (the release: anything tracked or untracked outside .gitignore; the dry run: a
// modified tracked file only); clone the source into a temp folder at the commit; set and assert the repo's
// noreply identity there and in the publication worktree before any commit or tag; npm ci and build in the
// clone; run the room and track sha256 checks (spec-content --tree), protect --check and the ship-gate rows X1
// to X10 there; replace gh-pages' tree with dist on top of the remote's gh-pages (or start it); scan main, the
// tag and the new gh-pages commit with check-public --history; then push main, the tag and gh-pages, in that
// order, never forced. The release enforces every check and publishes the newest rc tag only, and only when the
// tag commit's digest equals its HUSH-SHIP-GATE line's (D18). The dry run tags hush-dryrun-<sha8> in its clone,
// records every check in --out instead of enforcing it (a red check-public still refuses the push) and writes
// nothing into the source tree. A dry run publishes only to an existing local bare repository: any other
// --remote, a URL or the origin included, is refused before anything runs (audit 1, MINOR 4). Never a CNAME,
// never a force push.
// Exit 0 published (or recorded); 1 refused; 2 usage or a tool failure.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_EMAIL, REPO_NAME } from './identity.mjs';
import { makeContext, redactAndVerify } from './public-patterns.mjs';
import { digest } from './ship-gate.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const RC_RE = /^hush-v1-rc([1-9][0-9]{0,3})$/;
const SHIP_GATE_RE = /^HUSH-SHIP-GATE: PASS \(head=([0-9a-f]{7,40}) digest=([0-9a-f]{64})\)$/gm;

class Refusal extends Error {}

function git(cwd, args, input) {
  return execFileSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function gitOk(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' }).status === 0;
}
function npmCli() {
  return path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
}
function run(cwd, file, args) {
  const r = spawnSync(file, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: process.env });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const node = (cwd, script, args) => run(cwd, process.execPath, [script, ...args]);
const npm = (cwd, args) => run(cwd, process.execPath, [npmCli(), ...args]);
const tail = (s, n = 4) => s.trim().split('\n').slice(-n).join(' | ');

function parse(argv) {
  const o = { release: false, dryRun: false, tag: null, candidate: null, remote: null, out: null, keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--release') o.release = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--tag') o.tag = argv[++i];
    else if (a === '--candidate') o.candidate = argv[++i];
    else if (a === '--remote') o.remote = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--keep') o.keep = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (o.release === o.dryRun) throw new Error('usage: deploy.mjs --release [--tag t] [--remote r] | --dry-run --candidate <rev> --remote <bare> --out <dir>');
  if (o.dryRun && (!o.candidate || !o.remote || !o.out)) throw new Error('--dry-run needs --candidate, --remote and --out');
  if (o.release && (o.candidate || o.out)) throw new Error('--release takes no --candidate or --out');
  return o;
}

function setIdentity(dir) {
  git(dir, ['config', 'user.name', REPO_NAME]);
  git(dir, ['config', 'user.email', REPO_EMAIL]);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'tag.gpgsign', 'false']);
}
function assertIdentity(dir) {
  const name = git(dir, ['config', 'user.name']);
  const email = git(dir, ['config', 'user.email']);
  if (name !== REPO_NAME || email !== REPO_EMAIL) throw new Refusal(`the identity in ${path.basename(dir)} is not the repo's noreply identity`);
}

export function newestRcTag(src) {
  const tags = git(src, ['tag', '-l', 'hush-v1-rc*']).split('\n').map((t) => RC_RE.exec(t.trim())).filter(Boolean);
  if (!tags.length) return null;
  return `hush-v1-rc${Math.max(...tags.map((m) => Number(m[1])))}`;
}

// The release's target: the newest annotated rc tag, on main, whose commit digest equals its ship-gate line's.
export function releaseTarget(src, tagArg) {
  const newest = newestRcTag(src);
  if (!newest) throw new Refusal('no hush-v1-rc tag');
  const tag = tagArg || newest;
  if (tag !== newest) throw new Refusal(`${tag} is not the newest rc tag (${newest})`);
  if (git(src, ['cat-file', '-t', tag]) !== 'tag') throw new Refusal(`${tag} is not an annotated tag`);
  const commit = git(src, ['rev-parse', `${tag}^{commit}`]);
  let progress = '';
  try { progress = git(src, ['show', `${commit}:build/HUSH-PROGRESS.md`]); } catch { progress = ''; }
  const lines = [...progress.matchAll(SHIP_GATE_RE)];
  if (!lines.length) throw new Refusal(`${tag}'s commit carries no HUSH-SHIP-GATE: PASS line`);
  const want = lines[lines.length - 1][2];
  const have = digest(src, commit).digest;
  if (have !== want) throw new Refusal(`${tag}'s commit digest ${have.slice(0, 12)} differs from its HUSH-SHIP-GATE line's ${want.slice(0, 12)}`);
  const main = git(src, ['rev-parse', 'refs/heads/main']);
  if (!gitOk(src, ['merge-base', '--is-ancestor', commit, main])) throw new Refusal(`${tag}'s commit is not on main`);
  return { tag, commit, main };
}

// A dry run's remote: an existing local directory that git calls a bare repository.
function isLocalBare(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  const r = spawnSync('git', ['rev-parse', '--is-bare-repository'], { cwd: dir, encoding: 'utf8' });
  return r.status === 0 && String(r.stdout).trim() === 'true';
}

function emptyDir(dir) {
  for (const e of fs.readdirSync(dir)) if (e !== '.git') fs.rmSync(path.join(dir, e), { recursive: true, force: true });
}

async function main(argv) {
  const o = parse(argv);
  const src = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  const record = { mode: o.dryRun ? 'dry-run' : 'release', steps: [], checks: {}, pushes: [] };
  const say = (s) => { record.steps.push(s); process.stdout.write(`deploy: ${s}\n`); };
  let work = null;
  try {
    if (o.dryRun && !isLocalBare(o.remote)) throw new Refusal('a dry run publishes only to an existing local bare repository (--remote)');
    const dirt = git(src, ['status', '--porcelain', o.dryRun ? '--untracked-files=no' : '--untracked-files=all']);
    if (dirt) throw new Refusal(`the source tree is dirty (${dirt.split('\n').slice(0, 3).map((l) => l.trim()).join(', ')})`);
    let target;
    if (o.dryRun) {
      const commit = git(src, ['rev-parse', '--verify', `${o.candidate}^{commit}`]);
      // A candidate that names an annotated tag is published as that tag (its tagger and message are scanned).
      const own = gitOk(src, ['rev-parse', '--verify', '-q', `refs/tags/${o.candidate}`]) && git(src, ['cat-file', '-t', `refs/tags/${o.candidate}`]) === 'tag';
      target = { tag: own ? o.candidate : `hush-dryrun-${commit.slice(0, 8)}`, commit, main: commit, ownTag: own };
    } else target = releaseTarget(src, o.tag);
    record.target = target;
    const remote = o.remote ? (fs.existsSync(o.remote) ? path.resolve(o.remote) : o.remote) : git(src, ['remote', 'get-url', 'origin']);
    say(`${record.mode} of ${target.commit.slice(0, 12)} as ${target.tag}, main at ${target.main.slice(0, 12)}`);
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-release-'));
    const clone = path.join(work, 'release');
    git(work, ['clone', '--quiet', '--no-checkout', '--no-hardlinks', src, clone]);
    git(clone, ['config', 'core.autocrlf', 'false']);
    setIdentity(clone);
    assertIdentity(clone);
    git(clone, ['checkout', '--quiet', '--detach', target.commit]);
    if (o.dryRun && !target.ownTag) git(clone, ['tag', '-a', target.tag, '-m', `deploy dry run of ${target.commit.slice(0, 12)}`, target.commit]);
    else if (git(clone, ['rev-parse', `${target.tag}^{commit}`]) !== target.commit) throw new Refusal('the clone does not carry the tag');
    say(`release clone at ${target.commit.slice(0, 12)}, identity ${REPO_NAME}`);
    const ci = npm(clone, ['ci', '--prefer-offline', '--no-audit', '--no-fund']);
    if (ci.code !== 0) throw new Error(`npm ci failed in the clone: ${tail(ci.out)}`);
    const build = npm(clone, ['run', 'build']);
    if (build.code !== 0) throw new Error(`npm run build failed in the clone: ${tail(build.out)}`);
    const dist = path.join(clone, 'dist');
    if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('the build wrote no dist/index.html');
    say('npm ci and build in the clone');
    const content = node(clone, path.join(clone, 'tools', 'spec-content.mjs'), ['--tree']);
    const protect = node(clone, path.join(clone, 'tools', 'protect.mjs'), ['--check']);
    record.checks.content = { ok: content.code === 0, detail: tail(content.out, 2) };
    record.checks.protect = { ok: protect.code === 0, detail: tail(protect.out, 2) };
    const gateArgs = ['--rows', 'X1-X10', '--all'];
    if (o.dryRun) gateArgs.push('--record', path.resolve(o.out));
    const gate = node(clone, path.join(clone, 'tools', 'ship-gate.mjs'), gateArgs);
    record.checks.gate = { ok: gate.code === 0, detail: tail(gate.out, 12) };
    say(`checks: content ${record.checks.content.ok ? 'green' : 'RED'}, protect ${record.checks.protect.ok ? 'green' : 'RED'}, X1-X10 ${o.dryRun ? 'recorded' : record.checks.gate.ok ? 'green' : 'RED'}`);
    if (!o.dryRun) {
      for (const [k, c] of Object.entries(record.checks)) if (!c.ok) throw new Refusal(`${k} is red in the release clone: ${c.detail}`);
    }
    git(clone, ['remote', 'add', 'publish', remote]);
    const pages = path.join(work, 'pages');
    const remotePages = git(clone, ['ls-remote', 'publish', 'refs/heads/gh-pages']);
    if (remotePages) {
      git(clone, ['fetch', '--quiet', 'publish', '+refs/heads/gh-pages:refs/remotes/publish/gh-pages']);
      git(clone, ['worktree', 'add', '--quiet', '--detach', pages, 'refs/remotes/publish/gh-pages']);
    } else {
      git(clone, ['worktree', 'add', '--quiet', '--detach', pages, target.commit]);
      git(pages, ['checkout', '--quiet', '--orphan', 'pages-new']);
    }
    setIdentity(pages);
    assertIdentity(pages);
    if (gitOk(pages, ['rev-parse', '--verify', '-q', 'HEAD']) || git(pages, ['ls-files'])) git(pages, ['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', '.']);
    emptyDir(pages);
    fs.cpSync(dist, pages, { recursive: true });
    fs.writeFileSync(path.join(pages, '.nojekyll'), '');
    if (fs.existsSync(path.join(pages, 'CNAME'))) throw new Refusal('dist holds a CNAME: the user site serves /hush/');
    git(pages, ['add', '--all', '--', '.']);
    const changed = !gitOk(pages, ['diff', '--cached', '--quiet']) || !gitOk(pages, ['rev-parse', '--verify', '-q', 'HEAD']);
    if (changed) git(pages, ['commit', '-q', '-m', `pages: ${target.tag} at ${target.commit.slice(0, 12)}`]);
    const pagesSha = git(pages, ['rev-parse', 'HEAD']);
    if (remotePages && !gitOk(clone, ['merge-base', '--is-ancestor', 'refs/remotes/publish/gh-pages', pagesSha])) throw new Refusal('the new gh-pages commit does not extend the remote gh-pages');
    say(`gh-pages ${changed ? 'commit' : 'unchanged at'} ${pagesSha.slice(0, 12)}${remotePages ? ' on top of the remote gh-pages' : ' (first publication)'}`);
    git(clone, ['update-ref', 'refs/deploy/main', target.main]);
    git(clone, ['update-ref', 'refs/deploy/pages', pagesSha]);
    const scan = node(clone, path.join(clone, 'tools', 'check-public.mjs'), ['--history', 'refs/deploy/main', `refs/tags/${target.tag}`, 'refs/deploy/pages']);
    record.checks.history = { ok: scan.code === 0, detail: tail(scan.out, 3) };
    if (scan.code !== 0) throw new Refusal(`check-public --history refuses the push: ${tail(scan.out, 3)}`);
    say('check-public --history clean over main, the tag and gh-pages');
    for (const [label, refspec] of [['main', `${target.main}:refs/heads/main`], ['tag', `refs/tags/${target.tag}:refs/tags/${target.tag}`], ['gh-pages', `${pagesSha}:refs/heads/gh-pages`]]) {
      git(clone, ['push', '--quiet', 'publish', refspec]);
      record.pushes.push(label);
      say(`pushed ${label}`);
    }
    record.result = 'published';
    return 0;
  } catch (e) {
    record.result = e instanceof Refusal ? 'refused' : 'error';
    record.error = e.message;
    process.stdout.write(`deploy: ${record.result.toUpperCase()}: ${e.message}\n`);
    return e instanceof Refusal ? 1 : 2;
  } finally {
    if (o.out) {
      // The records may be committed (the auditor's build/evidence/audit/deploy/): redacted like any evidence.
      const outDir = path.resolve(o.out);
      fs.mkdirSync(outDir, { recursive: true });
      const ctx = makeContext();
      const write = (name, text) => {
        const safe = redactAndVerify(text, ctx);
        fs.writeFileSync(path.join(outDir, name), safe.clean ? safe.text : `${JSON.stringify({ error: 'the record could not be made public-safe' })}\n`);
      };
      write('deploy.json', `${JSON.stringify(record, null, 2)}\n`);
      const gateFile = path.join(outDir, 'ship-gate.json');
      if (fs.existsSync(gateFile)) write('ship-gate.json', fs.readFileSync(gateFile, 'utf8'));
    }
    if (work && !o.keep) {
      try { git(path.join(work, 'release'), ['worktree', 'remove', '--force', path.join(work, 'pages')]); } catch { /* no worktree */ }
      try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { process.stdout.write(`deploy: left ${path.basename(work)} in the temp folder\n`); }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`deploy: ${e.message}\n`); process.exitCode = 2; });
}
