// The bounded witness solver (D3): a best-first search over the sim interface for a room's witness.
//   node tools/solve.mjs <room-stem> [--out <file>] [--force] [--sim <module>] [--rooms <dir>]
//                        [--nodes <n>] [--seconds <s>] [--interval <steps>]
// Macro-actions hold one input for `interval` steps (default 12, 50 ms), plus two 48-step holds for
// waiting on a beat. States are keyed by the sim's key(P): quantised position and speed, dash, form, the
// progression flags and step mod P, where P is the least common multiple of the 4-beat bar (2880 steps)
// and every authored hazard period (720 * p steps for p beats). The priority is steps so far, plus a
// weighted tile-distance-to-exit estimate (36 steps a tile), plus costs per input change, per dash and per
// near-miss cell along the path; seven cost stages run in order, each with the node budget, inside one
// time budget. Every clearing path is turned into input changes, each change is moved to the middle of
// the window (+-48 steps) in which the room still clears (two passes), and scored by the jitter test on
// seeds 1, 2 and 3; the first witness that clears 19 of 20 on all three wins, else the best one found.
// Exit 0: a candidate witness written (its worst jitter score printed). Exit 3: none within the node or
// time budget (confidence: approximate). Exit 2: usage, an unknown room, or a sim that will not load.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalLayers, jitterChanges, loadModule, loadRoomFiles, roomNumber, runOnce, runSeed } from './replay.mjs';

const L = 1; const R = 2; const U = 4; const D = 8; const J = 16; const DASH = 32;
// Each input change and each dash add this many steps of priority, so held inputs and few dashes win:
// a witness a human could play. The stages run in order, each with its share of the budget, until one
// yields a witness that clears 19 of 20 jittered runs on each of three seeds.
const STAGES = [
  { changeCost: 48, dashCost: 160, clearCost: 0 },
  { changeCost: 48, dashCost: 160, clearCost: 24 },
  { changeCost: 24, dashCost: 32, clearCost: 0 },
  { changeCost: 24, dashCost: 32, clearCost: 12 },
  { changeCost: 12, dashCost: 0, clearCost: 0 },
  { changeCost: 48, dashCost: 160, clearCost: 0, hWeight: 4 },
  { changeCost: 24, dashCost: 32, clearCost: 12, hWeight: 4 },
];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

export function hazardPeriod(room) {
  let P = 2880;
  for (const e of room.entities || []) P = lcm(P, 720 * e.period);
  return P;
}

// Tile distance to the exit column over cells that are not static solid (8-connected), for grid rooms.
function distanceMap(room) {
  const { W, H, tiles } = room;
  const dist = new Int32Array(W * H).fill(-1);
  const q = [];
  for (let r = 0; r < H; r++) if (tiles[r * W + W - 1] !== 1) { dist[r * W + W - 1] = 0; q.push(r * W + W - 1); }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    const c = i % W; const r = (i - c) / W;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nc = c + dc; const nr = r + dr;
      if ((!dr && !dc) || nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
      const j = nr * W + nc;
      if (dist[j] >= 0 || tiles[j] === 1) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  return dist;
}

function heuristic(room) {
  if (room.tiles) {
    const dist = distanceMap(room);
    return (st) => {
      const c = Math.min(room.W - 1, Math.max(0, Math.floor((st.x + 1280) / 4096)));
      const r = Math.min(room.H - 1, Math.max(0, Math.floor((st.y + 1280) / 4096)));
      const d = dist[r * room.W + c];
      return d < 0 ? 1e6 : d;
    };
  }
  return (st) => Math.max(0, (room.length || 0) - st.x) / 6;
}

// Cells near the creature that can kill or stop it: solids, spikes and beat entities (in any state) inside
// its box grown by 8 px, leaving out the row it rests on and the row it slides under. Summed along a path,
// so witnesses keep their distance from corners and spikes and survive the jitter test.
function tightness(room) {
  if (!room.tiles) return () => 0;
  const { W, H, tiles } = room;
  const T = 4096; const BOX = 2560; const M = 2048;
  const at = (c, r) => (c < 0 || r < 0 ? 1 : c >= W || r >= H ? 0 : tiles[r * W + c]);
  const risky = (k) => k === 1 || (k >= 2 && k <= 5) || k >= 8;
  return (st) => {
    const c0 = Math.floor((st.x - M) / T); const c1 = Math.floor((st.x + BOX + M - 1) / T);
    const r0 = Math.floor((st.y - M) / T); const r1 = Math.floor((st.y + BOX + M - 1) / T);
    const bc0 = Math.floor(st.x / T); const bc1 = Math.floor((st.x + BOX - 1) / T);
    const below = (st.y + BOX) % T === 0 ? (st.y + BOX) / T : -1;
    const above = st.y % T === 0 ? st.y / T - 1 : -1;
    let n = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = at(c, r);
        if (!risky(k)) continue;
        if (k === 1 && c >= bc0 && c <= bc1 && (r === below || r === above)) continue;
        n++;
      }
    }
    return n;
  };
}

// An action is [first-step input, input for the remaining steps, steps (0 = the interval)]. The two long
// holds let the search wait for a beat in a few nodes instead of dozens.
function actionsFor(st, room) {
  if (st.room === 11 || st.form === 1) return [[J, J, 0], [0, 0, 0], [0, 0, 48]];
  const acts = [];
  for (const h of [0, L, R]) for (const j of [0, J]) acts.push([h | j, h | j, 0]);
  for (const h of [0, L, R]) for (const v of [0, U, D]) acts.push([h | v | DASH, h | v, 0]);
  acts.push([0, 0, 48], [R, R, 48]);
  return acts;
}

class Heap {
  constructor() { this.a = []; }
  push(p, v) {
    const a = this.a; a.push([p, v]);
    let i = a.length - 1;
    while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1; const r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

// `accept(path)` judges each clearing path: {done, path, score} to stop, or {done: false, best} to go on.
// Without it the first clearing path is returned. After `maxCandidates` paths the best one is returned.
export function search(mod, world, roomNo, { nodes = 400000, seconds = 120, interval = 12, accept = null, maxCandidates = 4, changeCost = 48, dashCost = 160, clearCost = 24, hWeight = 1 } = {}) {
  let candidates = 0;
  const room = roomNo === 11 ? world.gauntlet : world.rooms[roomNo - 1];
  if (!room) throw new Error(`no room ${roomNo}`);
  const P = hazardPeriod(room);
  const h = heuristic(room);
  const tight = tightness(room);
  const sim = mod.createSim(world, { room: roomNo, step: 0, layers: canonicalLayers(roomNo), stopAtClear: true });
  const seen = new Set([sim.key(P)]);
  const nodesArr = [{ state: sim.save(), parent: -1, inputs: null, g: 0, last: 0, changes: 0, dashes: 0, risk: 0 }];
  const heap = new Heap();
  heap.push(0, 0);
  const deadline = Date.now() + seconds * 1000;
  let expanded = 0;
  while (heap.size) {
    if (expanded >= nodes || Date.now() > deadline) {
      if (accept && candidates) { const b = accept(null); return { found: true, expanded, path: b.best.path, score: b.best.score }; }
      return { found: false, expanded, reason: expanded >= nodes ? 'node budget' : 'time budget' };
    }
    const [, idx] = heap.pop();
    const node = nodesArr[idx];
    expanded++;
    sim.load(node.state);
    for (const act of actionsFor(sim.status(), room)) {
      sim.load(node.state);
      const inputs = [];
      let died = false;
      let clear = false;
      const steps = act[2] || interval;
      for (let k = 0; k < steps; k++) {
        const bits = k === 0 ? act[0] : act[1];
        inputs.push(bits);
        sim.tick(bits);
        const st = sim.status();
        if (st.deaths > 0 || st.dead) { died = true; break; }
        if (st.cleared > 0 || st.finished) { clear = true; break; }
      }
      if (died) continue;
      const g = node.g + inputs.length;
      let changes = node.changes;
      let last = node.last;
      for (const bits of inputs) if (bits !== last) { changes++; last = bits; }
      const dashes = node.dashes + ((act[0] & DASH) ? 1 : 0);
      const risk = node.risk + tight(sim.status());
      if (clear) {
        nodesArr.push({ state: null, parent: idx, inputs, g, last, changes, dashes, risk });
        const path = unwind(nodesArr, nodesArr.length - 1);
        if (!accept) return { found: true, expanded, path };
        const verdict = accept(path);
        if (verdict.done) return { found: true, expanded, path: verdict.path, score: verdict.score };
        candidates++;
        if (candidates >= maxCandidates || Date.now() > deadline) return { found: true, expanded, path: verdict.best.path, score: verdict.best.score };
        continue;
      }
      const key = sim.key(P);
      if (seen.has(key)) continue;
      seen.add(key);
      nodesArr.push({ state: sim.save(), parent: idx, inputs, g, last, changes, dashes, risk });
      heap.push(g + 36 * hWeight * h(sim.status()) + changeCost * changes + dashCost * dashes + clearCost * risk, nodesArr.length - 1);
    }
  }
  if (accept && candidates) { const b = accept(null); return { found: true, expanded, path: b.best.path, score: b.best.score }; }
  return { found: false, expanded, reason: 'search space exhausted' };
}

// Jitter score of a change list: clears out of 100 runs, 20 for each of the seeds 1 to 5.
export const SCORE_SEEDS = [1, 2, 3, 4, 5];
export const ACCEPT_SCORE = 98;
export function jitterScore(mod, world, roomNo, changes, end) {
  let wins = 0;
  for (const seed of SCORE_SEEDS) {
    for (let r = 0; r < 20; r++) if (runOnce(mod, world, roomNo, jitterChanges(changes, runSeed(seed, r)), end).ok) wins++;
  }
  return wins;
}

// The acceptance used by the command line: centre the changes, keep the best-scoring candidate, stop at
// a witness that clears at least 98 of the 100 jittered runs.
export function robustAccept(mod, world, roomNo) {
  let best = null;
  return (path) => {
    if (path === null) return { done: false, best };
    const end = path.length + 2400;
    // Inputs after the clear change nothing: the witness ends with the clearing step.
    const changes = centre(mod, world, roomNo, toChanges(path).filter((c) => c[0] < path.length), end);
    const score = runOnce(mod, world, roomNo, changes, end).ok ? jitterScore(mod, world, roomNo, changes, end) : -1;
    const cand = { path: changes, score };
    if (!best || score > best.score) best = cand;
    return score >= ACCEPT_SCORE ? { done: true, path: changes, score } : { done: false, best };
  };
}

function unwind(nodesArr, i) {
  const chunks = [];
  for (let n = nodesArr[i]; n && n.inputs; n = nodesArr[n.parent]) chunks.push(n.inputs);
  return chunks.reverse().flat();
}

export function toChanges(perStep) {
  const out = [];
  let prev = -1;
  perStep.forEach((bits, i) => { if (bits !== prev) { out.push([i, bits]); prev = bits; } });
  return out;
}

// The baseline run of a change list, with the state saved before every step (for incremental trials).
function baseline(mod, world, roomNo, changes, end) {
  const sim = mod.createSim(world, { room: roomNo, step: 0, layers: canonicalLayers(roomNo), stopAtClear: true });
  const states = [];
  let k = 0; let bits = 0;
  for (let i = 0; i < end; i++) {
    states.push(sim.save());
    while (k < changes.length && changes[k][0] === i) { bits = changes[k][1]; k++; }
    sim.tick(bits);
    const st = sim.status();
    if (st.deaths > 0) return { ok: false, states };
    if (st.cleared > 0 || st.finished) return { ok: true, states, clearStep: i + 1 };
  }
  return { ok: false, states };
}

const sameState = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// One change moved to step t: replays from the baseline state just before the earlier of the two times,
// and succeeds as soon as the trial's state equals the baseline's again (same inputs from there on, so
// the same future), or the room clears; fails on a death or at `end`.
function trialOk(mod, world, roomNo, cur, i, t, base, end) {
  const from = Math.min(cur[i][0], t);
  if (from >= base.states.length) return true;
  const trial = cur.map((c, k) => (k === i ? [t, c[1]] : c));
  const sim = mod.createSim(world, { room: roomNo, step: 0, layers: canonicalLayers(roomNo), stopAtClear: true });
  sim.load(base.states[from]);
  let bits = 0;
  let k = 0;
  while (k < trial.length && trial[k][0] < from) { bits = trial[k][1]; k++; }
  const settle = Math.max(cur[i][0], t);
  for (let s = from; s < end; s++) {
    while (k < trial.length && trial[k][0] === s) { bits = trial[k][1]; k++; }
    sim.tick(bits);
    const st = sim.status();
    if (st.deaths > 0) return false;
    if (st.cleared > 0 || st.finished) return true;
    if (s + 1 > settle && s + 1 < base.states.length && sameState(sim.save(), base.states[s + 1])) return true;
  }
  return false;
}

// Moves each change to the middle of the shift window (+-48 steps) in which the room still clears: the
// interval around 0, scanned outward one step at a time until the first shift that fails on each side.
export function centre(mod, world, roomNo, changes, end) {
  let cur = changes.map((c) => [...c]);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < cur.length; i++) {
      const base = baseline(mod, world, roomNo, cur, end);
      if (!base.ok) return cur;
      const okAt = (d) => {
        const t = cur[i][0] + d;
        if (t <= cur[i - 1][0] || (i + 1 < cur.length && t >= cur[i + 1][0])) return false;
        return d === 0 || trialOk(mod, world, roomNo, cur, i, t, base, end);
      };
      const edge = (sign) => {
        let good = 0;
        while (good < 48 && okAt(sign * (good + 1))) good++;
        return good;
      };
      const hi = edge(1);
      const lo = -edge(-1);
      const mid = Math.trunc((lo + hi) / 2);
      if (mid) cur = cur.map((c, k) => (k === i ? [c[0] + mid, c[1]] : c));
    }
  }
  return cur;
}

function parseArgs(argv) {
  const o = { stem: null, out: null, force: false, sim: 'src/sim/headless.ts', rooms: 'rooms', nodes: 300000, seconds: 480, interval: 12 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--force') o.force = true;
    else if (a === '--sim') o.sim = argv[++i];
    else if (a === '--rooms') o.rooms = argv[++i];
    else if (a === '--nodes') o.nodes = Number(argv[++i]);
    else if (a === '--seconds') o.seconds = Number(argv[++i]);
    else if (a === '--interval') o.interval = Number(argv[++i]);
    else if (a.startsWith('--') || o.stem) return { error: 'usage: solve.mjs <room-stem> [--out <file>] [--force] [--sim <m>] [--rooms <dir>] [--nodes n] [--seconds s] [--interval k]' };
    else o.stem = a;
  }
  if (!o.stem) return { error: 'usage: solve.mjs <room-stem> ...' };
  o.out ??= path.join('replays', `${o.stem}.json`);
  return o;
}

export async function main(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  const o = parseArgs(argv);
  if (o.error) { log(`solve: ${o.error}`); return 2; }
  let mod; let world; let roomNo;
  try {
    roomNo = roomNumber(o.stem.replace(/^.*[\\/]/, '').replace(/\.txt$/, ''));
    mod = await loadModule(o.sim);
    world = mod.compileWorld(loadRoomFiles(path.resolve(o.rooms)));
  } catch (e) { log(`solve: ${e.message}`); return 2; }
  if (fs.existsSync(o.out) && !o.force) { log(`solve: ${o.out} exists (use --force to replace it)`); return 2; }
  const started = Date.now();
  let res = null;
  let expanded = 0;
  let reason = '';
  for (const stage of STAGES) {
    const r = search(mod, world, roomNo, {
      ...o, ...stage, seconds: Math.max(1, o.seconds - (Date.now() - started) / 1000), accept: robustAccept(mod, world, roomNo),
    });
    expanded += r.expanded;
    reason = r.reason || reason;
    if (r.found && (!res || r.score > res.score)) res = r;
    process.stderr.write(`solve: stage ${JSON.stringify(stage)}: ${r.found ? `score ${r.score}/100` : r.reason}, ${r.expanded} nodes\n`);
    if (res && res.score >= ACCEPT_SCORE) break;
    if ((Date.now() - started) / 1000 >= o.seconds) break;
  }
  if (!res) {
    log(`solve: NONE for ${o.stem} within budget (${reason}, ${expanded} nodes, ${Math.round((Date.now() - started) / 1000)} s); confidence: approximate`);
    return 3;
  }
  res.expanded = expanded;
  const changes = res.path;
  const run = runOnce(mod, world, roomNo, changes, changes[changes.length - 1][0] + 24000);
  if (!run.ok) { log(`solve: NONE for ${o.stem}: no candidate survived centring (${run.why}); confidence: approximate`); return 3; }
  const witness = { format: 'hush-replay-1', room: o.stem, changes, end: run.step + 2400, checksum: run.checksum };
  fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
  fs.writeFileSync(o.out, `${JSON.stringify(witness)}\n`);
  log(`solve: FOUND ${o.stem}: clear at step ${run.step}, ${changes.length} changes, ${res.expanded} nodes, jitter seeds 1-5: ${res.score}/100 ->${o.out.split(path.sep).join('/')}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    process.stderr.write(`solve: ${e.stack || e.message}\n`);
    process.exitCode = 2;
  });
}
