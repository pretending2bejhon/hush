// The reach table (spec section Physics), measured by driving a headless sim in an open test room.
//   node tools/reach.mjs [--sim <headless module>] [--json]
// The default module is the product's src/sim/headless.ts; the spec's numbers come from the oracle
// (tests/fixtures/oracle/index.mjs). Exit 0 with the table; 2 on usage or a sim that will not load.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = 1; const R = 2; const U = 4; const J = 16; const D = 32;
const TILE = 4096;

// An open room 96 tiles wide: walls at both ends except the exit, a floor at row 16, nothing else.
export function openRoomText(name = '01-open') {
  const W = 96; const H = 18;
  const rows = [];
  for (let r = 0; r < H; r++) {
    let row = '';
    for (let c = 0; c < W; c++) {
      if (r >= 16) row += '#';
      else if (r === 0) row += '#';
      else if (c === 0) row += '#';
      else row += '.';
    }
    rows.push(row);
  }
  return `hush-room 1\nname ${name}\nsize ${W} ${H}\nspawn 4 15\nlayer 1\npar 1\ngrid\n${rows.join('\n')}\n`;
}

export async function loadSim(modPath) {
  const mod = await import(pathToFileURL(path.resolve(REPO, modPath)).href);
  if (typeof mod.compileWorld !== 'function' || typeof mod.createSim !== 'function') {
    throw new Error(`${modPath} must export compileWorld and createSim`);
  }
  return mod;
}

function fresh(mod) {
  const world = mod.compileWorld([{ name: '01-open.txt', text: openRoomText() }]);
  return mod.createSim(world, { room: 1, step: 0, layers: 0, stopAtClear: true });
}

// Runs `script(i) -> input` until `until(status, i)` or `max` steps; returns the status trace.
function drive(sim, script, until, max = 4000) {
  const trace = [];
  for (let i = 0; i < max; i++) {
    sim.tick(script(i));
    const st = sim.status();
    trace.push(st);
    if (until(st, i)) break;
  }
  return trace;
}

const tiles = (sub) => Math.round((sub / TILE) * 1000) / 1000;

export function measure(mod) {
  const base = fresh(mod).status();
  const floorY = base.y;
  const out = {};

  // Standing full jump: hold jump until the creature is back on the floor.
  {
    const sim = fresh(mod);
    const t = drive(sim, () => J, (st, i) => i > 4 && st.y >= floorY);
    out.jumpHeight = tiles(floorY - Math.min(...t.map((s) => s.y)));
    out.jumpAirSteps = t.length;
  }
  // Shortest hop: jump pressed for one step.
  {
    const sim = fresh(mod);
    const t = drive(sim, (i) => (i === 0 ? J : 0), (st, i) => i > 4 && st.y >= floorY);
    out.hopHeight = tiles(floorY - Math.min(...t.map((s) => s.y)));
  }
  // Running jump: 80 steps of run, then jump held with right held, measured takeoff to landing.
  {
    const sim = fresh(mod);
    drive(sim, () => R, (st, i) => i >= 79);
    const x0 = sim.status().x;
    const t = drive(sim, () => R | J, (st, i) => i > 4 && st.y >= floorY);
    out.runJumpDistance = tiles(t[t.length - 1].x - x0);
    out.runJumpHeight = tiles(floorY - Math.min(...t.map((s) => s.y)));
  }
  // Ground dash right from standing.
  {
    const sim = fresh(mod);
    const x0 = sim.status().x;
    drive(sim, (i) => (i === 0 ? R | D : R), (st, i) => i >= 39);
    out.dashDistance = tiles(sim.status().x - x0);
  }
  // Running jump with a right dash at the apex: furthest landing at floor height.
  {
    const sim = fresh(mod);
    drive(sim, () => R, (st, i) => i >= 79);
    const x0 = sim.status().x;
    let apex = -1;
    let prevY = Infinity;
    const t = drive(sim, (i) => {
      if (apex < 0) return R | J;
      return i === apex ? R | J | D : R | J;
    }, (st, i) => {
      if (apex < 0 && st.y >= prevY && i > 4) apex = i + 1;
      prevY = st.y;
      return i > 4 && st.y >= floorY;
    });
    out.jumpDashDistance = tiles(t[t.length - 1].x - x0);
  }
  // Up dash from the ground.
  {
    const sim = fresh(mod);
    const t = drive(sim, (i) => (i === 0 ? U | D : U), (st, i) => i > 4 && st.y >= floorY);
    out.upDashHeight = tiles(floorY - Math.min(...t.map((s) => s.y)));
  }
  // Full jump, then an up dash at the apex: the highest reach.
  {
    const sim = fresh(mod);
    let apex = -1;
    let prevY = Infinity;
    const t = drive(sim, (i) => {
      if (apex < 0) return J;
      return i === apex ? U | D | J : U | J;
    }, (st, i) => {
      if (apex < 0 && st.y >= prevY && i > 4) apex = i + 1;
      prevY = st.y;
      return i > 4 && st.y >= floorY;
    });
    out.jumpUpDashHeight = tiles(floorY - Math.min(...t.map((s) => s.y)));
  }
  // Run speed and the wave: tiles per second at 240 steps.
  {
    const sim = fresh(mod);
    drive(sim, () => R, (st, i) => i >= 120);
    const x0 = sim.status().x;
    drive(sim, () => R, (st, i) => i >= 239);
    out.runTilesPerSecond = tiles(sim.status().x - x0);
  }
  out.waveTilesPerSecond = tiles(160 * 240);
  out.waveSlope = 1;
  out.gauntletTilesPerBeat = 4;
  return out;
}

function main(argv) {
  let simPath = 'src/sim/headless.ts';
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sim') simPath = argv[++i];
    else if (argv[i] === '--json') json = true;
    else { process.stderr.write('usage: reach.mjs [--sim <module>] [--json]\n'); return Promise.resolve(2); }
  }
  return loadSim(simPath).then((mod) => {
    const r = measure(mod);
    if (json) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
    else for (const [k, v] of Object.entries(r)) process.stdout.write(`${k.padEnd(22)} ${v}\n`);
    return 0;
  });
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    process.stderr.write(`reach: ${e.message}\n`);
    process.exitCode = 2;
  });
}
