// PF-CONTROLS for the product tests the items map: each test file passes on its reference (the oracle, the
// spec session's ports and reference modules, the producer's art reference) and fails on a copy of that
// reference with one planted fault, the mutation the reviewer's axis A applies per spec area. The product
// is never the module under test here.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REPO } from '../tools/fixture-repo.mjs';

const ORACLE = 'tests/fixtures/oracle';
const REF = 'tests/fixtures/reference';

// A temp copy of `files` (repo-relative) with one replacement in `target`; returns the copy's folder.
function mutate(files, target, from, to) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-mutant-'));
  for (const rel of files) {
    const text = fs.readFileSync(path.join(REPO, rel), 'utf8');
    const out = rel === target ? text.replace(from, to) : text;
    if (rel === target && out === text) throw new Error(`mutation not applied in ${rel}`);
    fs.writeFileSync(path.join(dir, path.basename(rel)), out);
  }
  return dir;
}
const oracleFiles = ['index.mjs', 'constants.mjs', 'world.mjs', 'sim.mjs'].map((f) => `${ORACLE}/${f}`);
const oracleMutant = (file, from, to) => path.join(mutate(oracleFiles, `${ORACLE}/${file}`, from, to), 'index.mjs');
// A reference that imports the oracle by relative path (art.mjs: FIELDS, for playFrame) keeps that import from its
// copy in the temp folder, so the copy loads and only the planted fault differs.
function refMutant(file, from, to) {
  const out = path.join(mutate([`${REF}/${file}`], `${REF}/${file}`, from, to), file);
  const text = fs.readFileSync(out, 'utf8');
  fs.writeFileSync(out, text.replaceAll("from '../oracle/", `from '${pathToFileURL(path.join(REPO, ORACLE)).href}/`));
  return out;
}
const clockMutant = (from, to) => path.join(mutate(['tests/fixtures/control-page/clock.js'], 'tests/fixtures/control-page/clock.js', from, to), 'clock.js');
// The reference run imports the oracle and the driver reference by relative path: its mutant sits beside them.
function runMutant(from, to) {
  const file = path.join(REPO, REF, 'run.mjs');
  const text = fs.readFileSync(file, 'utf8');
  const out = text.replace(from, to);
  if (out === text) throw new Error(`mutation not applied in ${REF}/run.mjs`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-mutant-'));
  fs.mkdirSync(path.join(dir, 'reference'));
  fs.writeFileSync(path.join(dir, 'reference', 'run.mjs'), out.replace("from '../oracle/index.mjs'", `from '${pathToFileURL(path.join(REPO, ORACLE, 'index.mjs')).href}'`).replace("from './driver.mjs'", `from '${pathToFileURL(path.join(REPO, REF, 'driver.mjs')).href}'`));
  return path.join(dir, 'reference', 'run.mjs');
}

function vitest(file, env) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs'), 'run', file], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ...env } });
  return r.status;
}

const oracleEnv = (mod) => ({ HUSH_SIM_MODULE: mod, HUSH_BEAT_MODULE: mod, HUSH_ROOMS_MODULE: mod, HUSH_AUDIO_MODULE: `${REF}/audio.mjs` });
const cases = [
  ['tests/sim/oracle-base.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('constants.mjs', 'GRAVITY: 8,', 'GRAVITY: 9,'))],
  ['tests/sim/oracle-dash.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('constants.mjs', 'DASH_STEPS: 40,', 'DASH_STEPS: 39,'))],
  ['tests/sim/oracle-beat.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('sim.mjs', '< e.on * C.TICKS_PER_SIXTEENTH', '<= e.on * C.TICKS_PER_SIXTEENTH'))],
  ['tests/sim/oracle-wave.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('constants.mjs', 'WAVE_SPEED: 160,', 'WAVE_SPEED: 168,'))],
  ['tests/sim/oracle-gauntlet.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('constants.mjs', 'RUN_DEN: 45,', 'RUN_DEN: 44,'))],
  ['tests/sim/progression.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('sim.mjs', 'return Math.ceil((unlockBar(step)', 'return Math.floor((unlockBar(step)'))],
  ['tests/rooms/compile.test.mjs', oracleEnv(`${ORACLE}/index.mjs`), () => oracleEnv(oracleMutant('world.mjs', " grid[FLOOR - 1][c + 1] = '^';", ''))],
  ['tests/clock/output-clock.test.mjs', { HUSH_CLOCK_MODULE: 'tests/fixtures/control-page/clock.js' }, () => ({ HUSH_CLOCK_MODULE: clockMutant('const settle = 150 + 1500', 'const settle = 100 + 1500') })],
  ['tests/clock/driver.test.mjs', { HUSH_DRIVER_MODULE: `${REF}/driver.mjs` }, () => ({ HUSH_DRIVER_MODULE: refMutant('driver.mjs', '* 240) + 1;', '* 240);') })],
  ['tests/input/keys.test.mjs', { HUSH_KEYS_MODULE: `${REF}/keys.mjs` }, () => ({ HUSH_KEYS_MODULE: refMutant('keys.mjs', 'e.preventDefault();', '') })],
  ['tests/audio/track.test.mjs', { HUSH_AUDIO_MODULE: `${REF}/audio.mjs` }, () => ({ HUSH_AUDIO_MODULE: refMutant('audio.mjs', "!key.startsWith('_') && ", '') })],
  ['tests/audio/scheduler.test.mjs', { HUSH_AUDIO_MODULE: `${REF}/audio.mjs` }, () => ({ HUSH_AUDIO_MODULE: refMutant('audio.mjs', 'export const LOOKAHEAD = 0.12;', 'export const LOOKAHEAD = 0.15;') })],
  ['tests/audio/gates.test.mjs', { HUSH_AUDIO_MODULE: `${REF}/audio.mjs` }, () => ({ HUSH_AUDIO_MODULE: refMutant('audio.mjs', 'param.setValueAtTime(0, t - 0.005);', 'param.setValueAtTime(0, t - 0.01);') })],
  ['tests/fx/flash-limiter.test.mjs', { HUSH_FX_MODULE: `${REF}/flash-limiter.mjs` }, () => ({ HUSH_FX_MODULE: refMutant('flash-limiter.mjs', 'if (full || sum', 'if (sum') })],
  // The art (amended 2026-10-12): each art test against the art reference, and against one planted fault.
  ['tests/render/room-art.test.mjs', { HUSH_ROOM_ART_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_ROOM_ART_MODULE: refMutant('art.mjs', 'if (codeAt(room, c, r - 1) !== CODE.SOLID)', 'if (codeAt(room, c, r - 1) === CODE.EMPTY)') })],
  ['tests/render/creature.test.mjs', { HUSH_CREATURE_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_CREATURE_MODULE: refMutant('art.mjs', 'export const SQUASH_STEPS = 6;', 'export const SQUASH_STEPS = 5;') })],
  ['tests/render/beat-art.test.mjs', { HUSH_BEAT_ART_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_BEAT_ART_MODULE: refMutant('art.mjs', 'export const WARN_ALPHA = [0.45, 0.25];', 'export const WARN_ALPHA = [0.5, 0.25];') })],
  ['tests/render/depth-art.test.mjs', { HUSH_DEPTH_ART_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_DEPTH_ART_MODULE: refMutant('art.mjs', 'Math.sqrt(dx * dx + dy * dy) - 0.85)', 'Math.sqrt(dx * dx + dy * dy) - 0.8)') })],
  ['tests/render/ending-art.test.mjs', { HUSH_ENDING_ART_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_ENDING_ART_MODULE: refMutant('art.mjs', 'export const RISE_S = 16 * BEAT_S;', 'export const RISE_S = 12 * BEAT_S;') })],
  // Review R1 (MINOR 2 and 3): the thresholds the first faults above left unpinned, one planted fault each.
  ['tests/clock/output-clock.test.mjs', { HUSH_CLOCK_MODULE: 'tests/fixtures/control-page/clock.js' }, () => ({ HUSH_CLOCK_MODULE: clockMutant('const CLOCK_JUMP = 0.004;', 'const CLOCK_JUMP = 0.008;') }), 'CLOCK_JUMP'],
  ['tests/clock/output-clock.test.mjs', { HUSH_CLOCK_MODULE: 'tests/fixtures/control-page/clock.js' }, () => ({ HUSH_CLOCK_MODULE: clockMutant('(4 * 128) / ctx.sampleRate', '(2 * 128) / ctx.sampleRate') }), 'trust'],
  ['tests/clock/output-clock.test.mjs', { HUSH_CLOCK_MODULE: 'tests/fixtures/control-page/clock.js' }, () => ({ HUSH_CLOCK_MODULE: clockMutant('low >= 3', 'low >= 2') }), 'resync'],
  ['tests/audio/scheduler.test.mjs', { HUSH_AUDIO_MODULE: `${REF}/audio.mjs` }, () => ({ HUSH_AUDIO_MODULE: refMutant('audio.mjs', 'note.time = now + 0.005;', 'note.time = now + 0.01;') }), 'shift'],
  // Review R1 (MAJOR 1): the run's wiring against the reference run, and against a layer returned a bar late, a
  // layer never returned and a gauntlet never re-mapped.
  ['tests/game/run.test.mjs', { HUSH_RUN_MODULE: `${REF}/run.mjs` }, () => ({ HUSH_RUN_MODULE: runMutant('engine.unlockAt(pending, unlockBar(step));', 'engine.unlockAt(pending, unlockBar(step) + 1);') }), 'late'],
  ['tests/game/run.test.mjs', { HUSH_RUN_MODULE: `${REF}/run.mjs` }, () => ({ HUSH_RUN_MODULE: runMutant('if (pending !== 0 && pending !== lastPending) engine.unlockAt(pending, unlockBar(step));', '') }), 'none'],
  ['tests/game/run.test.mjs', { HUSH_RUN_MODULE: `${REF}/run.mjs` }, () => ({ HUSH_RUN_MODULE: runMutant('engine.gauntlet(gBeat / 4);', '{}') }), 'gauntlet'],
  // Review R1 (MINOR 4): the run's origin lead back at 0.1 s.
  ['tests/game/run.test.mjs', { HUSH_RUN_MODULE: `${REF}/run.mjs` }, () => ({ HUSH_RUN_MODULE: runMutant('export const ORIGIN_LEAD = 0.25;', 'export const ORIGIN_LEAD = 0.1;') }), 'lead'],
  // Review R1 (MAJOR 3): the play scene's frame drawing the beat entities 24 steps (0.1 s) ahead of the sim.
  ['tests/render/play-frame.test.mjs', { HUSH_PLAY_FRAME_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_PLAY_FRAME_MODULE: refMutant('art.mjs', 'beatShapes(room, step, at(\'layers\'), camPx, levels, limiter)', 'beatShapes(room, step + 24, at(\'layers\'), camPx, levels, limiter)') }), 'beat step'],
  // Review R1 (MAJOR 4): the card's beat counted from the ending's first frame instead of the run's origin.
  ['tests/render/ending-art.test.mjs', { HUSH_ENDING_ART_MODULE: `${REF}/art.mjs` }, () => ({ HUSH_ENDING_ART_MODULE: refMutant('art.mjs', 'cardShapes(beatOfBar(heard, run.origin))', 'cardShapes(beatOfBar(heard, t0 + 0.2))') }), 'card beat'],
];

describe('product tests: green on the reference, red on one planted fault', () => {
  for (const [file, good, bad, label] of cases) {
    it(label ? `${file} (${label})` : file, () => {
      expect(vitest(file, good)).toBe(0);
      expect(vitest(file, bad())).toBe(1);
    }, 240000);
  }
});
