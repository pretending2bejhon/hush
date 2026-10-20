// The no-cheese verifier (the owner's ruling N-F3 a, 2026-10-19; HUSH-SPEC section 5.5): no clear of a section may
// skip the beat-gated window it teaches.
//   node tools/cheese.mjs --all | <room-stem>... [--sections <file>] [--sim <module>] [--rooms <dir>] [--nodes <n>]
// A section (tests/data/sections.json) is a stretch of a room: the creature placed standing on tile (col, row) at step
// 0, with the layers of every earlier room back, and the room cut at column `to`, so reaching that column clears it.
// Its gates are the beat entities whose window it teaches, each with the role that says how its window shuts: a floor
// (a block the creature needs under it) shuts when absent, a wall (a block in its way) when present, a spike when up.
// For each section:
//   free  with every entity as authored, the solver finds a clear within FREE_NODES (else the section is broken);
//   shut  every gate is held shut and every other entity of the room held at rest, each bound to no layer, so nothing
//         moves: the solver must find no clear within the node budget. A clear here crosses the section with its
//         window shut: the window can be skipped, a cheese. With nothing moving the search keys no beat phase
//         (period 1), so it usually exhausts the reachable states.
// Every beat entity of a named room must be a gate of one of its sections, and every gate whose cells lie in a
// section's columns must be that section's (no lesson inside a section goes untested).
// The search is tools/solve.mjs's search() with node budgets its only bounds, so a verdict is the same on any machine;
// "none" means none within the budget, or none reachable (confidence: approximate when the budget ran out).
// Exit 0 no cheese and every section clears free; 1 otherwise; 2 usage, a malformed sections file, an unknown room or
// a sim that will not load.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModule, loadRoomFiles, roomNumber } from './replay.mjs';
import { search } from './solve.mjs';

export const CHEESE_NODES = 100000;
export const FREE_NODES = 1000000;
export const ROLES = Object.freeze({ floor: false, wall: true, spike: true });
// The searches' costs. The free search is guided as the solver's first stage is (few input changes, dashes dear), to
// find the section's clear; the shut search makes changes cheap and dashes as cheap as any input, since a cheese is
// any clear at all.
const FREE_COSTS = { interval: 12, changeCost: 48, dashCost: 160, clearCost: 0, hWeight: 1, seconds: 1e6 };
const SHUT_COSTS = { interval: 12, changeCost: 12, dashCost: 0, clearCost: 0, hWeight: 1, seconds: 1e6 };

export function readSections(file) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file}: not JSON (${e.message})`); }
  if (!doc || doc.format !== 'hush-sections-1' || typeof doc.rooms !== 'object' || doc.rooms === null) throw new Error(`${file}: format must be "hush-sections-1" with a rooms object`);
  return doc.rooms;
}

// The section's room: the tiles cut at column `to` and the spawn at its start. With `shut`, every entity is bound to
// no layer (layer 0, never back) at rest: a gate in its shut state, any other entity in its own rest state. The sim
// reads only W, H, tiles, spawn and the entities.
export function sectionRoom(room, sec, shut) {
  const W = sec.to;
  const tiles = new Uint8Array(W * room.H);
  for (let r = 0; r < room.H; r++) tiles.set(room.tiles.subarray(r * room.W, r * room.W + W), r * W);
  const entities = shut ? room.entities.map((e) => ({ ...e, layer: 0, rest: e.letter in sec.gates ? ROLES[sec.gates[e.letter]] : e.rest })) : room.entities;
  return { ...room, W, tiles, spawn: { col: sec.from[0], row: sec.from[1] }, entities };
}

// The problems of one room's section list against its compiled room (CODE values of src/rooms/codes.ts).
export function sectionProblems(room, list) {
  const problems = [];
  if (!Array.isArray(list) || !list.length) return [`${room.name}: no sections`];
  const at = (c, r) => room.tiles[r * room.W + c];
  const byLetter = new Map(room.entities.map((e) => [e.letter, e]));
  const named = new Set();
  list.forEach((sec, i) => {
    const label = `${room.name} section ${i + 1}${sec && sec.name ? ` (${sec.name})` : ''}`;
    const okInt = (v) => Number.isInteger(v) && v >= 0;
    if (!sec || !Array.isArray(sec.from) || sec.from.length !== 2 || !okInt(sec.from[0]) || !okInt(sec.from[1]) || !okInt(sec.to) || !sec.gates || typeof sec.gates !== 'object' || Array.isArray(sec.gates)) {
      problems.push(`${label}: wants from [col, row], to and gates { letter: role }`);
      return;
    }
    const [c, r] = sec.from;
    if (c >= room.W - 1 || r < 1 || r >= room.H - 1) problems.push(`${label}: start (${c}, ${r}) lies outside the room`);
    else if (at(c, r) !== 0 || at(c, r + 1) !== 1) problems.push(`${label}: start (${c}, ${r}) is not an empty tile on a static solid one`);
    if (sec.to <= c + 1 || sec.to > room.W) problems.push(`${label}: end column ${sec.to} is not past its start and inside the room`);
    const letters = Object.keys(sec.gates);
    if (!letters.length) problems.push(`${label}: no gates`);
    for (const g of letters) {
      const e = byLetter.get(g);
      const role = sec.gates[g];
      if (!e) { problems.push(`${label}: gate ${JSON.stringify(g)} is no entity of the room`); continue; }
      if (!(role in ROLES)) problems.push(`${label}: gate ${g} has role ${JSON.stringify(role)} (want floor, wall or spike)`);
      else if ((role === 'spike') !== (e.kind === 'spike')) problems.push(`${label}: gate ${g} is a ${e.kind}, so its role is ${e.kind === 'spike' ? 'spike' : 'floor or wall'}, not ${role}`);
      named.add(g);
    }
    for (const e of room.entities) {
      if (e.letter in sec.gates) continue;
      if (e.cells.some(([cc]) => cc >= c && cc < sec.to)) problems.push(`${label}: entity ${e.letter} has cells in its columns but is none of its gates`);
    }
  });
  for (const e of room.entities) if (!named.has(e.letter)) problems.push(`${room.name}: entity ${e.letter} is a gate of no section`);
  return problems;
}

function searchSection(mod, world, roomNo, room, sec, shut, nodes) {
  const cut = sectionRoom(room, sec, shut);
  const w = { ...world, rooms: world.rooms.map((r, i) => (i === roomNo - 1 ? cut : r)) };
  return search(mod, w, roomNo, { ...(shut ? SHUT_COSTS : FREE_COSTS), nodes, period: shut ? 1 : null });
}

// One room's verdicts: { lines, problems, sections }.
export function checkRoom(mod, world, roomNo, list, { nodes = CHEESE_NODES, freeNodes = FREE_NODES } = {}) {
  const room = world.rooms[roomNo - 1];
  const lines = [];
  const problems = sectionProblems(room, list);
  if (problems.length) return { lines, problems, sections: 0 };
  list.forEach((sec, i) => {
    const label = `${room.name} section ${i + 1}${sec.name ? ` (${sec.name})` : ''}`;
    const gates = Object.entries(sec.gates).map(([g, role]) => `${g} ${role}`).join(', ');
    const free = searchSection(mod, world, roomNo, room, sec, false, freeNodes);
    if (!free.found) {
      problems.push(`${label}: no clear with every entity free (${free.reason}, ${free.expanded} nodes): the section is broken`);
      lines.push(`${label}: free: NONE (${free.reason}, ${free.expanded} nodes)`);
      return;
    }
    const shut = searchSection(mod, world, roomNo, room, sec, true, nodes);
    const verdict = shut.found ? 'CHEESE' : 'gated';
    lines.push(`${label}: free: clear in ${free.path.length} steps (${free.expanded} nodes); shut (${gates}): ${shut.found ? `CLEAR in ${shut.path.length} steps` : `none (${shut.reason}, ${shut.expanded} nodes)`}: ${verdict}`);
    if (shut.found) problems.push(`${label}: crossed with its window shut (${gates}) in ${shut.path.length} steps: the window can be skipped`);
  });
  return { lines, problems, sections: list.length };
}

function parseArgs(argv) {
  const o = { stems: [], all: false, sections: 'tests/data/sections.json', sim: 'src/sim/headless.ts', rooms: 'rooms', nodes: CHEESE_NODES };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') o.all = true;
    else if (a === '--sections') o.sections = argv[++i];
    else if (a === '--sim') o.sim = argv[++i];
    else if (a === '--rooms') o.rooms = argv[++i];
    else if (a === '--nodes') o.nodes = Number(argv[++i]);
    else if (a.startsWith('--')) return { error: `unknown option ${a}` };
    else o.stems.push(a);
  }
  if (!Number.isInteger(o.nodes) || o.nodes < 1) return { error: '--nodes takes a positive integer' };
  if (!o.all && !o.stems.length) return { error: 'usage: cheese.mjs --all | <room-stem>... [--sections f] [--sim m] [--rooms d] [--nodes n]' };
  return o;
}

export async function main(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  const o = parseArgs(argv);
  if (o.error) { log(`cheese: ${o.error}`); return 2; }
  let mod; let world; let doc; let stems;
  try {
    mod = await loadModule(o.sim);
    world = mod.compileWorld(loadRoomFiles(path.resolve(o.rooms)));
    doc = readSections(path.resolve(o.sections));
    stems = o.all ? world.rooms.filter((r) => r.entities.length || doc[r.name]).map((r) => r.name) : o.stems;
    for (const s of stems) if (roomNumber(s) > 10 || !world.rooms[roomNumber(s) - 1] || world.rooms[roomNumber(s) - 1].name !== s) throw new Error(`no room ${s} with sections (rooms 01 to 10)`);
    for (const s of Object.keys(doc)) if (!world.rooms.some((r) => r.name === s)) throw new Error(`the sections file names ${s}, which is no room`);
  } catch (e) { log(`cheese: ${e.message}`); return 2; }
  const problems = [];
  let sections = 0;
  for (const stem of stems) {
    const r = checkRoom(mod, world, roomNumber(stem), doc[stem], { nodes: o.nodes, freeNodes: Math.max(FREE_NODES, o.nodes) });
    for (const l of r.lines) log(`cheese: ${l}`);
    problems.push(...r.problems);
    sections += r.sections;
  }
  for (const p of problems) log(`cheese: problem: ${p}`);
  log(problems.length
    ? `cheese: FAIL, ${problems.length} problem(s) in ${stems.length} room(s)`
    : `cheese: PASS, ${sections} section(s) in ${stems.length} room(s), none crossed with its window shut within ${o.nodes} nodes a search`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    process.stderr.write(`cheese: ${e.stack || e.message}\n`);
    process.exitCode = 2;
  });
}
