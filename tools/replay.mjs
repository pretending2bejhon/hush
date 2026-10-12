// The headless replay runner (D3, X3): drives a sim from a room's entrance with a witness's input changes.
//   node tools/replay.mjs <replay.json>... [--jitter --seed <n>] [--runs 20] [--need 18] [--sim <module>] [--rooms <dir>]
//   node tools/replay.mjs --all [--jitter --seed <n>]   every room file under rooms/ needs replays/<stem>.json
// A run passes when the start room is cleared before `end` with zero deaths, and (unjittered) the clear-state
// checksum equals the witness's. The jitter test shifts every input-change time by its own seeded uniform
// offset of -6 to +6 steps (25 ms at 240 steps/s), keeps the order, and needs `need` of `runs` clears.
// Exit 0 all pass; 1 a run failed; 2 usage, a malformed witness or a sim that will not load.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const JITTER = 6;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runSeed(seed, run) {
  return ((seed >>> 0) ^ Math.imul(run + 1, 0x9e3779b1)) >>> 0;
}

// Each change time moves by its own offset in [-JITTER, JITTER]; times stay non-decreasing and >= 0.
export function jitterChanges(changes, seed) {
  const rng = mulberry32(seed);
  const out = [];
  let prev = 0;
  for (const [t, bits] of changes) {
    const off = Math.floor(rng() * (2 * JITTER + 1)) - JITTER;
    const nt = Math.max(prev, t + off, 0);
    out.push([nt, bits]);
    prev = nt;
  }
  return out;
}

export function roomNumber(stem) {
  const m = /^(0[1-9]|1[01])-[a-z-]+$/.exec(stem);
  if (!m) throw new Error(`bad room name ${stem}`);
  return Number(m[1]);
}

// Layers back when a room is entered on the canonical path: every earlier room's layer.
export function canonicalLayers(room) {
  return room <= 1 ? 0 : ((1 << Math.min(room, 11)) - 2) & 0x7fe;
}

export function readWitness(file) {
  let w;
  try { w = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file}: not JSON (${e.message})`); }
  const bad = (msg) => { throw new Error(`${file}: ${msg}`); };
  if (!w || w.format !== 'hush-replay-1') bad('format must be "hush-replay-1"');
  roomNumber(String(w.room));
  if (!Array.isArray(w.changes) || !w.changes.length) bad('changes must be a non-empty list');
  let prev = -1;
  for (const c of w.changes) {
    if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1]) || c[1] < 0 || c[1] > 63) bad('each change is [step, bits 0..63]');
    if (c[0] <= prev) bad('change steps must strictly increase');
    prev = c[0];
  }
  if (w.changes[0][0] !== 0) bad('the first change is at step 0');
  if (!Number.isInteger(w.end) || w.end <= prev || w.end > 240 * 600) bad('end must be an integer after the last change, at most 600 s');
  if (!/^[0-9a-f]{8}$/.test(String(w.checksum))) bad('checksum must be 8 hex digits');
  return w;
}

export function loadRoomFiles(dir) {
  return fs.readdirSync(dir).filter((f) => /^\d\d-[a-z-]+\.txt$/.test(f)).sort()
    .map((f) => ({ name: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

// One run: {ok, why, step, checksum, deaths}.
export function runOnce(mod, world, room, changes, end) {
  const sim = mod.createSim(world, { room, step: 0, layers: canonicalLayers(room), stopAtClear: true });
  let k = 0;
  let bits = 0;
  for (let i = 0; i < end; i++) {
    while (k < changes.length && changes[k][0] === i) { bits = changes[k][1]; k++; }
    sim.tick(bits);
    const st = sim.status();
    if (st.deaths > 0) return { ok: false, why: `died at step ${i + 1}`, step: i + 1, checksum: sim.checksum(), deaths: st.deaths };
    if (st.cleared > 0 || st.finished) return { ok: true, why: `clear at step ${i + 1}`, step: i + 1, checksum: sim.checksum(), deaths: 0 };
  }
  return { ok: false, why: `no clear by step ${end}`, step: end, checksum: sim.checksum(), deaths: 0 };
}

export async function loadModule(modPath) {
  const mod = await import(pathToFileURL(path.resolve(REPO, modPath)).href);
  if (typeof mod.compileWorld !== 'function' || typeof mod.createSim !== 'function') throw new Error(`${modPath} must export compileWorld and createSim`);
  return mod;
}

function parseArgs(argv) {
  const o = { files: [], all: false, jitter: false, seed: null, runs: 20, need: 18, sim: 'src/sim/headless.ts', rooms: 'rooms', replays: 'replays' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') o.all = true;
    else if (a === '--jitter') o.jitter = true;
    else if (a === '--seed') o.seed = Number(argv[++i]);
    else if (a === '--runs') o.runs = Number(argv[++i]);
    else if (a === '--need') o.need = Number(argv[++i]);
    else if (a === '--sim') o.sim = argv[++i];
    else if (a === '--rooms') o.rooms = argv[++i];
    else if (a === '--replays') o.replays = argv[++i];
    else if (a.startsWith('--')) return { error: `unknown option ${a}` };
    else o.files.push(a);
  }
  if (o.jitter && !Number.isInteger(o.seed)) return { error: '--jitter needs --seed <integer>' };
  if (!Number.isInteger(o.runs) || o.runs < 1 || !Number.isInteger(o.need) || o.need < 1 || o.need > o.runs) return { error: 'bad --runs or --need' };
  if (!o.all && !o.files.length) return { error: 'usage: replay.mjs <replay.json>... | --all  [--jitter --seed <n>]' };
  return o;
}

export async function main(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  const o = parseArgs(argv);
  if (o.error) { log(`replay: ${o.error}`); return 2; }
  let mod;
  let world;
  let files = o.files;
  try {
    mod = await loadModule(o.sim);
    const roomFiles = loadRoomFiles(path.resolve(o.rooms));
    world = mod.compileWorld(roomFiles);
    if (o.all) {
      files = [];
      for (const rf of roomFiles) {
        const f = path.join(o.replays, rf.name.replace(/\.txt$/, '.json'));
        if (!fs.existsSync(f)) { log(`${f.split(path.sep).join('/')}: MISSING witness for ${rf.name}`); return 1; }
        files.push(f);
      }
      if (!files.length) { log('replay: no room files'); return 1; }
    }
  } catch (e) {
    log(`replay: ${e.message}`);
    return 2;
  }
  let failed = 0;
  for (const f of files) {
    const label = f.split(path.sep).join('/');
    let w;
    try { w = readWitness(f); } catch (e) { log(`replay: ${e.message}`); return 2; }
    const room = roomNumber(w.room);
    const base = runOnce(mod, world, room, w.changes, w.end);
    const sumOk = base.checksum === w.checksum;
    const ok = base.ok && sumOk;
    log(`${label}: ${base.ok ? 'CLEAR' : 'FAIL'} ${base.why}, checksum ${base.checksum} (witness ${w.checksum}) ${ok ? 'OK' : 'MISMATCH'}`);
    if (!ok) { failed++; continue; }
    if (o.jitter) {
      let wins = 0;
      const marks = [];
      for (let r = 0; r < o.runs; r++) {
        const res = runOnce(mod, world, room, jitterChanges(w.changes, runSeed(o.seed, r)), w.end);
        if (res.ok) wins++;
        marks.push(res.ok ? '+' : '-');
      }
      const pass = wins >= o.need;
      log(`${label}: jitter seed ${o.seed}: ${wins}/${o.runs} clear (need ${o.need}) [${marks.join('')}] ${pass ? 'PASS' : 'SHORT'}`);
      if (!pass) failed++;
    }
  }
  log(failed ? `replay: FAIL, ${failed} witness(es) short` : `replay: PASS, ${files.length} witness(es)`);
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    process.stderr.write(`replay: ${e.stack || e.message}\n`);
    process.exitCode = 2;
  });
}
