// Strudel's pattern engine in Node, for the verifiers (no audio): compiles a track file to its labelled
// layers and lists each layer's note onsets. @strudel/core 1.2.6 imports @kabelsalat/web, whose package
// main is a non-module build in Node; a resolve hook points that one specifier at the package's ES module.
//   node tools/strudel-node.mjs <track.strudel> [--bars <n>]   prints each layer's onsets per bar as JSON
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = [
  'export async function resolve(specifier, context, next) {',
  "  if (specifier === '@kabelsalat/web') return next('@kabelsalat/web/dist/index.mjs', context);",
  '  return next(specifier, context);',
  '}',
].join('\n');
register(`data:text/javascript,${encodeURIComponent(HOOK)}`, import.meta.url);

let engine = null;
export async function loadStrudel() {
  if (engine) return engine;
  const [core, mini, tonal, transpilerMod] = await Promise.all([
    import('@strudel/core'), import('@strudel/mini'), import('@strudel/tonal'), import('@strudel/transpiler'),
  ]);
  if (typeof mini.miniAllStrings === 'function') mini.miniAllStrings();
  engine = { core, scope: { ...core, ...mini, ...tonal }, transpiler: transpilerMod.transpiler };
  return engine;
}

// The same capture Vault City's compileRoom uses: every `label:` line becomes one layer, in file order.
export async function compileTrack(code) {
  const { core, scope, transpiler } = await loadStrudel();
  const layers = new Map();
  const P = core.Pattern.prototype;
  const previous = P.p;
  let anonymous = 0;
  P.p = function capture(name) {
    const key = name === '$' ? `$${++anonymous}` : String(name);
    if (!key.startsWith('_')) layers.set(key, this);
    return this;
  };
  try {
    const full = { ...scope, setcpm() {}, setcps() {}, hush() {}, evaluate() {} };
    const names = Object.keys(full).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !['eval', 'arguments', 'default'].includes(n));
    const { output } = transpiler(code, { addReturn: false, emitMiniLocations: false, emitWidgets: false });
    Function(...names, `"use strict";${output}`)(...names.map((n) => full[n]));
  } finally {
    P.p = previous;
  }
  return layers;
}

// Onsets of one layer in one bar (one cycle): sixteenth index, the value, and the exact fraction.
export function barOnsets(pattern, bar) {
  return pattern.queryArc(bar, bar + 1).filter((h) => h.hasOnset()).map((h) => {
    const begin = Number(h.whole.begin) - bar;
    return { sixteenth: Math.round(begin * 16), exact: Number.isInteger(Math.round(begin * 16 * 1e9) / 1e9) && Math.abs(begin * 16 - Math.round(begin * 16)) < 1e-9, value: h.value };
  }).sort((a, b) => a.sixteenth - b.sixteenth);
}

async function main(argv) {
  const file = argv[0];
  if (!file) { process.stderr.write('usage: strudel-node.mjs <track.strudel> [--bars <n>]\n'); return 2; }
  const bars = argv[1] === '--bars' ? Number(argv[2]) : 4;
  const layers = await compileTrack(fs.readFileSync(file, 'utf8'));
  const out = {};
  for (const [name, pat] of layers) {
    out[name] = [];
    for (let b = 0; b < bars; b++) out[name].push(barOnsets(pat, b).map((o) => o.sixteenth));
  }
  process.stdout.write(`${JSON.stringify({ layers: [...layers.keys()], onsets: out })}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`strudel-node: ${e.stack || e.message}\n`); process.exitCode = 2; });
}
