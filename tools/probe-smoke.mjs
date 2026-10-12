// The smoke probe (X1, the first item): the built page loads under /hush/ in headless Chrome.
//   node tools/probe-smoke.mjs [--dist dist] [--channel chrome] [--query <q>] [--json]
// Checks: the page answers 200 with a <meta name="hush-build"> of 40 hex; every request of the page is
// answered below 400 and none fails (a wrong Vite base 404s every asset); the probe API reports the first
// scene within 20 s; the canvas is not blank (two colours or more in its screenshot); no text object exists and
// the page shows exactly its title, link and notice, none over the canvas; zero console and page errors over
// the load and 3 s after it. Exit 0 PASS, 1 FAIL, 2 usage or a missing dist.
import { decodePng } from './png.mjs';
import { emitJson, launch, openGame, openPage, parseOptions, requireDist, serveDir, textProblems, withQuery } from './probe-lib.mjs';

async function main(argv) {
  const o = parseOptions(argv, { dist: 'dist', channel: 'chrome', query: '', json: false });
  const dist = requireDist(o.dist);
  const srv = await serveDir(dist);
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  let browser = null;
  try {
    const res = await fetch(srv.url);
    const html = await res.text();
    const meta = /<meta name="hush-build" content="([0-9a-f]{40})"\s*\/?>/.exec(html);
    add('page', res.status === 200, `GET ${new URL(srv.url).pathname} ${res.status}`);
    add('build-meta', Boolean(meta), meta ? `hush-build ${meta[1].slice(0, 12)}` : 'no <meta name="hush-build" content="<40 hex>">');
    browser = await launch({ channel: o.channel });
    const { page, log } = await openPage(browser);
    let booted = true;
    try {
      await openGame(page, srv.url, { query: o.query });
    } catch (e) {
      booted = false;
      add('boot', false, `the probe API never reported the first scene: ${String(e.message).split('\n')[0]}`);
    }
    if (booted) {
      add('boot', true, `scenes ${JSON.stringify(await page.evaluate(() => window.__hush.scenes()))}`);
      await page.waitForTimeout(3000);
      const shot = decodePng(await page.locator('canvas').first().screenshot());
      const colours = new Set();
      for (let i = 0; i < shot.data.length && colours.size < 2; i += 4) colours.add((shot.data[i] << 16) | (shot.data[i + 1] << 8) | shot.data[i + 2]);
      add('canvas', colours.size >= 2, colours.size >= 2 ? `not blank (${shot.width} by ${shot.height})` : 'blank canvas');
      const texts = await page.evaluate(() => window.__hush.pageTexts());
      const tp = textProblems(texts, { playtest: false });
      const objects = await page.evaluate(() => window.__hush.textObjects());
      add('text', tp.length === 0 && objects === 0, tp.length || objects !== 0 ? [...tp, `text objects ${objects}`].join('; ') : 'title, link and notice only; no text object');
    }
    add('requests', log.badStatus.length === 0 && log.failed.length === 0, log.badStatus.length || log.failed.length ? [...log.badStatus, ...log.failed].slice(0, 5).join(' | ') : 'every request answered below 400');
    add('console', log.consoleErrors.length === 0 && log.pageErrors.length === 0,
      log.consoleErrors.length || log.pageErrors.length ? [...log.pageErrors, ...log.consoleErrors].slice(0, 5).join(' | ') : 'zero console and page errors');
  } finally {
    if (browser) await browser.close();
    await srv.close();
  }
  for (const c of checks) process.stdout.write(`smoke: ${c.name}: ${c.ok ? 'ok' : 'FAIL'}: ${c.detail}\n`);
  const pass = checks.every((c) => c.ok);
  process.stdout.write(`smoke: ${pass ? 'PASS' : 'FAIL'} (${withQuery(new URL(srv.url).pathname, o.query)})\n`);
  if (o.json) emitJson({ kind: 'smoke', pass, checks });
  return pass ? 0 : 1;
}

main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`smoke: ${e.message}\n`); process.exitCode = 2; });
