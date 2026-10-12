// PF-CONTROLS for the headless browser probes, on the control page (tests/fixtures/control-page) built under
// /hush/: the smoke probe (X1) against a wrong Vite base, the playthrough (X5, X10's browser rows, D3, D8, D16)
// against every planted fault, the supply probe (X10) against a loose pin, an audit finding and a planted
// write, and the live probe (X12) against a 404, a wrong build hash, a commit absent from origin's main, a
// console error and a page that never boots. Each probe must also pass the clean control page.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPage, REPO, serveDir } from '../../tools/probe-lib.mjs';

const CP = path.join(REPO, 'tests', 'fixtures', 'control-page');
const FIX = ['--rooms', path.join(CP, 'rooms'), '--replays', path.join(CP, 'replays')];
const T = 240000;
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function tool(name, args) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', name), ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

// For a probe that talks to a server running in this process: the event loop must keep serving meanwhile.
function toolAsync(name, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO, 'tools', name), ...args], { cwd: REPO });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}

let dist;
let wrongBase;
beforeAll(async () => {
  dist = await buildPage({ root: CP, outDir: tmp('hush-cp-'), sha: 'c'.repeat(40) });
  wrongBase = await buildPage({ root: CP, outDir: tmp('hush-cp-root-'), base: '/', sha: 'c'.repeat(40) });
}, 120000);

describe('smoke probe (X1)', () => {
  it('passes the control page and fails it built with a wrong base', () => {
    const ok = tool('probe-smoke.mjs', ['--dist', dist]);
    expect(ok.out).toMatch(/smoke: PASS/);
    expect(ok.code).toBe(0);
    const bad = tool('probe-smoke.mjs', ['--dist', wrongBase]);
    expect(bad.out).toMatch(/smoke: requests: FAIL: 404/);
    expect(bad.out).toMatch(/smoke: FAIL/);
    expect(bad.code).toBe(1);
  }, T);
});

describe('playthrough probe (X5, X10, D3, D8, D16)', () => {
  it('passes every check on the clean control page', () => {
    const r = tool('probe-play.mjs', ['--dist', dist, ...FIX]);
    expect(r.out).toMatch(/play: chrome headless: PASS \(console,play,text,network,storage\)/);
    expect(r.code).toBe(0);
  }, T);

  const faults = [
    ['throw', 'console', /console: FAIL: control page: planted page error/],
    ['cerr', 'console', /console: FAIL: control page: planted console error/],
    ['fetch=http://127.0.0.2:9/x', 'network', /network: FAIL: other origins: http:\/\/127\.0\.0\.2:9/],
    ['store=local', 'storage', /storage: FAIL: .*"localStorage":1/],
    ['store=session', 'storage', /storage: FAIL: .*"sessionStorage":1/],
    ['store=cookie', 'storage', /storage: FAIL: .*"cookies":1/],
    ['store=idb', 'storage', /storage: FAIL: .*"indexedDB":\["planted"\]/],
    ['text', 'text', /text: FAIL: text objects 1/],
    ['domtext', 'text', /text: FAIL: text over the canvas/],
  ];
  for (const [query, check, line] of faults) {
    it(`fails ?${query} on its ${check} check`, () => {
      const r = tool('probe-play.mjs', ['--dist', dist, ...FIX, '--query', query, '--check', check]);
      expect(r.out).toMatch(line);
      expect(r.code).toBe(1);
    }, T);
  }

  it('passes the visibility check on the clean control page and fails it with ?novis', () => {
    const ok = tool('probe-play.mjs', ['--dist', dist, ...FIX, '--check', 'visibility']);
    expect(ok.out).toMatch(/visibility: ok: hidden: audio suspended, sim frozen/);
    expect(ok.code).toBe(0);
    const bad = tool('probe-play.mjs', ['--dist', dist, ...FIX, '--query', 'novis', '--check', 'visibility']);
    expect(bad.out).toMatch(/visibility: FAIL: hidden: the audio is running, not suspended/);
    expect(bad.code).toBe(1);
  }, T);

  it('fails a witness that dies and a room without a witness', () => {
    const replays = tmp('hush-replays-');
    for (const f of fs.readdirSync(path.join(CP, 'replays'))) fs.copyFileSync(path.join(CP, 'replays', f), path.join(replays, f));
    const w = JSON.parse(fs.readFileSync(path.join(replays, '01-toy-a.json'), 'utf8'));
    fs.writeFileSync(path.join(replays, '01-toy-a.json'), JSON.stringify({ ...w, changes: [[0, 2]] }));
    const dies = tool('probe-play.mjs', ['--dist', dist, '--rooms', path.join(CP, 'rooms'), '--replays', replays, '--check', 'play']);
    expect(dies.out).toMatch(/play: FAIL: 01-toy-a: died/);
    expect(dies.code).toBe(1);
    const rooms = tmp('hush-rooms-');
    for (const f of fs.readdirSync(path.join(CP, 'rooms'))) fs.copyFileSync(path.join(CP, 'rooms', f), path.join(rooms, f));
    fs.writeFileSync(path.join(rooms, '06-toy-f.txt'), 'toy-room 1\nlength 30\n');
    const missing = tool('probe-play.mjs', ['--dist', dist, '--rooms', rooms, '--replays', path.join(CP, 'replays'), '--check', 'play']);
    expect(missing.out).toMatch(/play: FAIL: no witness for 06-toy-f\.txt/);
    expect(missing.code).toBe(1);
  }, T);
});

describe('supply probe (X10)', () => {
  it('passes the repo (static rows) and fails a loose pin and a high audit finding', () => {
    const ok = tool('probe-supply.mjs', ['--no-browser']);
    expect(ok.out).toMatch(/supply: PASS/);
    expect(ok.code).toBe(0);
    const root = tmp('hush-supply-');
    for (const f of ['package.json', 'package-lock.json', 'LICENSE', '.npmrc']) fs.copyFileSync(path.join(REPO, f), path.join(root, f));
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    pkg.dependencies.phaser = `^${pkg.dependencies.phaser}`;
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));
    const audit = path.join(root, 'audit.json');
    fs.writeFileSync(audit, JSON.stringify({ metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } } }));
    const bad = tool('probe-supply.mjs', ['--root', root, '--audit-json', audit, '--no-browser']);
    expect(bad.out).toMatch(/supply: pins: FAIL: phaser: "\^4\.2\.1" is not an exact version/);
    expect(bad.out).toMatch(/supply: audit: FAIL: 1 high and 0 critical/);
    expect(bad.out).toMatch(/supply: lockfile: FAIL/);
    expect(bad.code).toBe(1);
  }, T);

  it('fails a planted sessionStorage write through its browser row', () => {
    const r = tool('probe-supply.mjs', ['--dist', dist, ...FIX, '--query', 'store=session']);
    expect(r.out).toMatch(/supply: network-storage: FAIL/);
    expect(r.code).toBe(1);
  }, T);
});

describe('live probe parser (X12)', () => {
  let server;
  let repo;
  let onMain;
  let offMain;
  beforeAll(async () => {
    repo = tmp('hush-live-');
    git(repo, ['init', '-q', '-b', 'main']);
    git(repo, ['config', 'user.name', 'fixture']);
    git(repo, ['config', 'user.email', ['fixture', 'example.invalid'].join('@')]);
    git(repo, ['commit', '-q', '--allow-empty', '-m', 'one']);
    onMain = git(repo, ['rev-parse', 'HEAD']);
    git(repo, ['checkout', '-q', '-b', 'side']);
    git(repo, ['commit', '-q', '--allow-empty', '-m', 'side']);
    offMain = git(repo, ['rev-parse', 'HEAD']);
    git(repo, ['checkout', '-q', 'main']);
    const bare = tmp('hush-live-origin-');
    git(bare, ['init', '-q', '--bare', '-b', 'main']);
    git(repo, ['remote', 'add', 'origin', bare]);
    git(repo, ['push', '-q', 'origin', 'main']);
    const root = tmp('hush-live-site-');
    await buildPage({ root: CP, outDir: path.join(root, 'on'), base: '/hush/on/', sha: onMain });
    await buildPage({ root: CP, outDir: path.join(root, 'off'), base: '/hush/off/', sha: offMain });
    server = await serveDir(root, '/hush/');
  }, 120000);
  afterAll(async () => { if (server) await server.close(); });

  const live = (url, sha, extra = []) => toolAsync('probe-live.mjs', ['--url', url, '--expect-sha', sha, '--repo', repo, ...extra]);

  it('passes the deployed control page on main, and fails each planted fault', async () => {
    const ok = await live(`${server.url}on/`, onMain);
    expect(ok.out).toMatch(/live: PASS/);
    expect(ok.code).toBe(0);
    const missing = await live(`${server.url}nowhere/`, onMain);
    expect(missing.out).toMatch(/live: HTTP 404/);
    expect(missing.code).toBe(1);
    const wrong = await live(`${server.url}on/`, offMain);
    expect(wrong.out).toMatch(/live: build [0-9a-f]{40} is not [0-9a-f]{12}/);
    expect(wrong.code).toBe(1);
    const side = await live(`${server.url}off/`, offMain);
    expect(side.out).toMatch(/is not in the history of origin\/main/);
    expect(side.out).not.toMatch(/is not [0-9a-f]{12}\n/);
    expect(side.code).toBe(1);
    const cerr = await live(`${server.url}on/?cerr`, onMain);
    expect(cerr.out).toMatch(/live: 1 console and 0 page errors/);
    expect(cerr.code).toBe(1);
    const noboot = await live(`${server.url}on/?noboot`, onMain);
    expect(noboot.out).toMatch(/live: no boot to the calibration screen/);
    expect(noboot.code).toBe(1);
  }, T * 2);
});
