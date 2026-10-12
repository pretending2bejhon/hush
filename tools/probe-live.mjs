// The live probe (X12): after JHON-PREVIEW, the deployed page against the release tag.
//   node tools/probe-live.mjs [--url https://jhonalbert.com/hush/] [--tag hush-v1-rc<N> | --expect-sha <sha>]
//        [--repo .] [--no-fetch] [--json]          (no --tag and no --expect-sha: the newest rc tag)
// Records: the HTTP status of the page (200), its <meta name="hush-build"> against the tag's commit, that commit
// in the history of origin's main after `git fetch origin` (the public source matches the build; later
// bookkeeping commits may follow it), zero console and page errors in headless Chrome, and a boot to the
// calibration screen (the probe API's first scene) within 20 s. --no-fetch skips the fetch (the controls'
// scratch repos). Exit 0 every field green, 1 a field red, 2 usage or git error.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { emitJson, launch, openPage, parseOptions, REPO, withQuery } from './probe-lib.mjs';
import { SITE_URL } from './identity.mjs';

function git(repo, args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

async function main(argv) {
  const o = parseOptions(argv, { url: SITE_URL, tag: '', expectSha: '', repo: REPO, noFetch: false, json: false });
  const repo = path.resolve(o.repo);
  if (o.tag && o.expectSha) throw new Error('give one of --tag or --expect-sha');
  if (!o.tag && !o.expectSha) {
    const rcs = git(repo, ['tag', '-l', 'hush-v1-rc*']).split('\n').map((t) => /^hush-v1-rc([1-9][0-9]{0,3})$/.exec(t.trim())).filter(Boolean);
    if (!rcs.length) throw new Error('no hush-v1-rc tag: give --tag or --expect-sha');
    o.tag = `hush-v1-rc${Math.max(...rcs.map((m) => Number(m[1])))}`;
  }
  const expectedSha = o.expectSha || git(repo, ['rev-parse', `${o.tag}^{commit}`]);
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error(`not a full commit sha: ${expectedSha}`);
  const doc = { kind: 'live', url: o.url, tag: o.tag || null, expectedSha, status: null, buildMeta: null, onOriginMain: false, consoleErrors: null, pageErrors: null, bootToCalibration: false };
  const problems = [];
  try {
    const res = await fetch(o.url, { redirect: 'follow', cache: 'no-store' });
    doc.status = res.status;
    const meta = /<meta name="hush-build" content="([0-9a-f]{40})"\s*\/?>/.exec(await res.text());
    doc.buildMeta = meta ? meta[1] : null;
  } catch (e) {
    problems.push(`GET failed: ${e.message}`);
  }
  if (doc.status !== 200) problems.push(`HTTP ${doc.status}`);
  if (doc.buildMeta !== expectedSha) problems.push(`build ${doc.buildMeta || 'absent'} is not ${expectedSha.slice(0, 12)}`);
  if (!o.noFetch) {
    try { git(repo, ['fetch', '--quiet', 'origin']); } catch (e) { problems.push(`git fetch origin failed: ${String(e.message).split('\n')[0]}`); }
  }
  const anc = spawnSync('git', ['merge-base', '--is-ancestor', expectedSha, 'origin/main'], { cwd: repo, encoding: 'utf8' });
  doc.onOriginMain = anc.status === 0;
  if (!doc.onOriginMain) problems.push(`${expectedSha.slice(0, 12)} is not in the history of origin/main`);
  const browser = await launch({ channel: 'chrome' });
  try {
    const { page, log } = await openPage(browser);
    try {
      await page.goto(withQuery(o.url, 'probe'), { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => window.__hush && window.__hush.ready() && window.__hush.scenes().includes('calibration'), null, { timeout: 20000 });
      doc.bootToCalibration = true;
      await page.waitForTimeout(2000);
    } catch (e) {
      problems.push(`no boot to the calibration screen: ${String(e.message).split('\n')[0]}`);
    }
    doc.consoleErrors = log.consoleErrors.length;
    doc.pageErrors = log.pageErrors.length;
    if (doc.consoleErrors || doc.pageErrors) problems.push(`${doc.consoleErrors} console and ${doc.pageErrors} page errors: ${[...log.pageErrors, ...log.consoleErrors].slice(0, 3).join(' | ')}`);
  } finally {
    await browser.close();
  }
  doc.problems = problems;
  doc.pass = problems.length === 0;
  process.stdout.write(`live: ${o.url}: HTTP ${doc.status}, build ${doc.buildMeta ? doc.buildMeta.slice(0, 12) : 'absent'} (want ${expectedSha.slice(0, 12)}), on origin/main ${doc.onOriginMain ? 'yes' : 'no'}, errors ${doc.consoleErrors}+${doc.pageErrors}, boot ${doc.bootToCalibration ? 'yes' : 'no'}\n`);
  for (const p of problems) process.stdout.write(`live: ${p}\n`);
  process.stdout.write(`live: ${doc.pass ? 'PASS' : 'FAIL'}\n`);
  if (o.json) emitJson(doc);
  return doc.pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`live: ${e.message}\n`); process.exitCode = 2; });
