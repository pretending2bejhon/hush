// PF-CONTROLS for tools/solve.mjs and tools/replay.mjs on the toy sim: a witness for a clearable room and
// for a room whose only route waits on a 4-beat door, exit 3 on an unclearable room, a 17-of-20 witness
// reported short, a broken witness refused, and determinism.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO, tool } from './fixture-repo.mjs';

const TOY = 'tests/fixtures/toy-sim/index.mjs';

function toyDir(rooms) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-toy-'));
  fs.mkdirSync(path.join(dir, 'rooms'));
  fs.mkdirSync(path.join(dir, 'replays'));
  for (const [name, text] of Object.entries(rooms)) fs.writeFileSync(path.join(dir, 'rooms', name), text);
  return dir;
}

const solve = (dir, stem, extra = []) => tool('solve.mjs', [stem, '--sim', TOY, '--rooms', path.join(dir, 'rooms'),
  '--out', path.join(dir, 'replays', `${stem}.json`), '--seconds', '60', ...extra], { cwd: REPO });
const replay = (dir, files, extra = []) => tool('replay.mjs', [...files.map((f) => path.join(dir, 'replays', f)), '--sim', TOY,
  '--rooms', path.join(dir, 'rooms'), ...extra], { cwd: REPO });

describe('solve.mjs and replay.mjs on the toy sim', () => {
  it('finds a witness for the clearable room, and the runner clears it under jitter', () => {
    const dir = toyDir({ '01-toy-walk.txt': 'toy-room 1\nlength 40\ngap 20 22\n' });
    const s = solve(dir, '01-toy-walk');
    expect(s.out).toMatch(/solve: FOUND 01-toy-walk/);
    expect(s.code).toBe(0);
    const r = replay(dir, ['01-toy-walk.json'], ['--jitter', '--seed', '7']);
    expect(r.out).toMatch(/jitter seed 7: (1[89]|20)\/20 clear \(need 18\) .* PASS/);
    expect(r.code).toBe(0);
  });

  it('finds the route that waits on a 4-beat door: step 0 and step 720 are not the same state', () => {
    const dir = toyDir({ '01-toy-door.txt': 'toy-room 1\nlength 40\ndoor 30\n' });
    const s = solve(dir, '01-toy-door');
    expect(s.code).toBe(0);
    const w = JSON.parse(fs.readFileSync(path.join(dir, 'replays', '01-toy-door.json'), 'utf8'));
    const r = replay(dir, ['01-toy-door.json']);
    const step = Number(/clear at step (\d+)/.exec(r.out)[1]);
    // The door is closed from step 103 to step 411; walking straight reaches it at step 120.
    expect(step).toBeGreaterThan(411);
    expect(w.changes.length).toBeGreaterThan(1);
    expect(r.code).toBe(0);
  });

  it('exits 3 with confidence: approximate on the unclearable room', () => {
    const dir = toyDir({ '01-toy-wall.txt': 'toy-room 1\nlength 40\ngap 10 30\n' });
    const s = solve(dir, '01-toy-wall');
    expect(s.out).toMatch(/solve: NONE for 01-toy-wall within budget .*confidence: approximate/);
    expect(s.code).toBe(3);
    expect(fs.existsSync(path.join(dir, 'replays', '01-toy-wall.json'))).toBe(false);
  });

  it('reports a witness that clears exactly 17 of 20 jittered runs as short', () => {
    const dir = toyDir({ '01-toy-gap.txt': 'toy-room 1\nlength 40\ngap 20 24\n' });
    fs.writeFileSync(path.join(dir, 'replays', '01-toy-gap.json'), JSON.stringify({
      format: 'hush-replay-1', room: '01-toy-gap', changes: [[0, 2], [73, 18], [113, 2]], end: 400, checksum: '4b0ad19f',
    }));
    const r = replay(dir, ['01-toy-gap.json'], ['--jitter', '--seed', '2']);
    expect(r.out).toMatch(/CLEAR clear at step 160, checksum 4b0ad19f \(witness 4b0ad19f\) OK/);
    expect(r.out).toMatch(/jitter seed 2: 17\/20 clear \(need 18\) .* SHORT/);
    expect(r.code).toBe(1);
  });

  it('refuses a broken witness: one that dies, and one whose checksum does not match', () => {
    const dir = toyDir({ '01-toy-gap.txt': 'toy-room 1\nlength 40\ngap 20 24\n' });
    fs.writeFileSync(path.join(dir, 'replays', 'dies.json'), JSON.stringify({
      format: 'hush-replay-1', room: '01-toy-gap', changes: [[0, 2]], end: 400, checksum: '4b0ad19f',
    }));
    fs.writeFileSync(path.join(dir, 'replays', 'drift.json'), JSON.stringify({
      format: 'hush-replay-1', room: '01-toy-gap', changes: [[0, 2], [73, 18], [113, 2]], end: 400, checksum: '00000000',
    }));
    const a = replay(dir, ['dies.json']);
    expect(a.out).toMatch(/FAIL died at step/);
    expect(a.code).toBe(1);
    const b = replay(dir, ['drift.json']);
    expect(b.out).toMatch(/MISMATCH/);
    expect(b.code).toBe(1);
  });

  it('refuses a malformed witness with exit 2', () => {
    const dir = toyDir({ '01-toy-gap.txt': 'toy-room 1\nlength 40\ngap 20 24\n' });
    fs.writeFileSync(path.join(dir, 'replays', 'bad.json'), JSON.stringify({
      format: 'hush-replay-1', room: '01-toy-gap', changes: [[5, 2], [3, 0]], end: 400, checksum: '4b0ad19f',
    }));
    expect(replay(dir, ['bad.json']).code).toBe(2);
  });

  it('is deterministic: the same witness gives the same checksum twice', () => {
    const dir = toyDir({ '01-toy-walk.txt': 'toy-room 1\nlength 40\ngap 20 22\n' });
    expect(solve(dir, '01-toy-walk').code).toBe(0);
    const a = replay(dir, ['01-toy-walk.json']).out;
    const b = replay(dir, ['01-toy-walk.json']).out;
    expect(a).toBe(b);
  });

  it('--all fails when a room has no witness', () => {
    const dir = toyDir({ '01-toy-walk.txt': 'toy-room 1\nlength 40\ngap 20 22\n', '02-toy-gap.txt': 'toy-room 1\nlength 40\n' });
    expect(solve(dir, '01-toy-walk').code).toBe(0);
    const r = tool('replay.mjs', ['--all', '--sim', TOY, '--rooms', path.join(dir, 'rooms'), '--replays', path.join(dir, 'replays')], { cwd: REPO });
    expect(r.out).toMatch(/MISSING witness for 02-toy-gap\.txt/);
    expect(r.code).toBe(1);
  });
});
