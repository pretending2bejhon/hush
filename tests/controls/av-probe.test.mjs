// PF-CONTROLS for the av probe (X7): headed Chrome on this laptop's real audio device (unmuted). The clean
// control page must pass; with the master output disconnected, with a synth registration that throws, and
// with one later layer's gate disconnected while the earlier layers play, it must fail, each for its reason; and
// (review R3, MINOR 4) with the master gain at 0.4, whose signal stays above the floors, on the mix check alone; and
// (review R4, MAJOR 1) with every note handed over 0.1 s late, and with layers 1 and 2 through each other's gate, on
// the start check alone; and (review R7, MAJOR 2) one control for each row that had none: a clock line without
// output timestamps on the device-clock row alone, a gate leaking while muted on both silence rows, no AudioContext
// at the first key (refused, exit 2), voices played but not counted on the voices row alone, and notes dropped late.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildPage, REPO } from '../../tools/probe-lib.mjs';

const CP = path.join(REPO, 'tests', 'fixtures', 'control-page');
let dist;
beforeAll(async () => {
  dist = await buildPage({ root: CP, outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'hush-cp-')), sha: 'c'.repeat(40) });
}, 120000);

function av(query) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'probe-av.mjs'), '--headed', '--dist', dist, '--replays', path.join(CP, 'replays'),
    '--track', path.join(CP, 'control.strudel'), '--gauntlet-room', '0', '--query', query], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

describe('av probe (X7)', () => {
  it('passes the clean control page', () => {
    const r = av('');
    expect(r.out).toMatch(/av: \d+ voices scheduled for \d+ onsets, 0 errors, 0 dropped/);
    // Review R3 (MINOR 4): the speakers' chain of section 8.4, read as the page built it.
    expect(r.out).toMatch(/av: mix speakers <- AnalyserNode and (\d+) other\(s\), \1 silent by construction; master gain 0\.8\d*; compressor -10 6 4 0\.00\d+ 0\.1\d+; 4 of 4 gates in, [45] inputs/);
    // Review R4 (MAJOR 1): every voice on an onset of its own layer, every onset started.
    expect(r.out).toMatch(/av: starts (\d+) voice start\(s\) of \d+ recorded: \1 on their layer's onsets \(\S+ to \S+ ms\), 0 late-shifted, \d+ unable to sound, 0 off; (\d+) of \2 onsets started/);
    expect(r.out).toMatch(/av: PASS/);
    expect(r.code).toBe(0);
  }, 180000);

  it('fails every note handed over 0.1 s late, on the starts alone (review R4, MAJOR 1)', () => {
    const r = av('av=late');
    expect(r.out).toMatch(/av: starts: \d+ of \d+ voice start\(s\) off their layer's onsets \(want -1 to \+6 ms\)/);
    expect(r.out).toMatch(/av: starts: \d+ of \d+ onset\(s\) without a voice start of their layer/);
    expect(r.out).not.toMatch(/av: (no master signal|no silence|layer \d+ (soloed|muted)|scheduled \d+ voices|\d+ voice errors|\d+ late-dropped|the analyser|device clock)/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails layers 1 and 2 played through each other\'s gate, on the starts alone (review R4, MAJOR 1)', () => {
    const r = av('av=swap');
    expect(r.out).toMatch(/av: starts: \d+ of \d+ voice start\(s\) off their layer's onsets.*layer 1 at/);
    expect(r.out).toMatch(/av: starts: \d+ of \d+ onset\(s\) without a voice start of their layer, the first: layer 2/);
    expect(r.out).not.toMatch(/av: (no master signal|no silence|layer \d+ (soloed|muted)|scheduled \d+ voices|\d+ voice errors|\d+ late-dropped|the analyser|device clock)/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails with the master output disconnected', () => {
    const r = av('av=master-off');
    expect(r.out).toMatch(/av: no master signal in room 2/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails with a synth registration that throws', () => {
    const r = av('av=synth-throw');
    expect(r.out).toMatch(/av: \d+ voice errors/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails with the master gain at half its value (review R3, MINOR 4)', () => {
    const r = av('av=master-low');
    expect(r.out).toMatch(/av: the analyser is fed by GainNode at gain 0\.4\d*, want the master gain at 0\.8/);
    expect(r.out).not.toMatch(/av: no master signal/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails with one later layer disconnected while the earlier ones play', () => {
    const r = av('av=layer-off');
    expect(r.out).toMatch(/av: layer 3 soloed: no signal/);
    expect(r.out).not.toMatch(/av: no master signal/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  // Review R7, MAJOR 2: every row of X7 has a control of its own.
  const otherRows = (except) => new RegExp(`av: (${['no master signal', 'no silence', 'layer \\d+ (soloed|muted)', 'scheduled \\d+ voices', '\\d+ voice errors', '\\d+ late-dropped',
    'the analyser', 'the master', 'the speakers', 'the compressor', 'device clock', 'the device clock never', 'starts:', '\\d+ death'].filter((p) => !except.includes(p)).join('|')})`);

  it('fails a clock line built without output timestamps, on the device-clock row alone (section 8.4: 3 ms)', () => {
    const r = av('av=nostamps');
    expect(r.out).toMatch(/av: device clock offset moved \d+(\.\d+)? ms peak to peak \(bound 3\)/);
    expect(r.out).not.toMatch(otherRows(['device clock']));
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails a gate that leaks while muted, on both silence rows', () => {
    const r = av('av=leak');
    expect(r.out).toMatch(/av: no silence with every layer muted/);
    expect(r.out).toMatch(/av: layer \d+ muted alone: not silent/);
    expect(r.out).not.toMatch(otherRows(['no silence', 'layer \\d+ (soloed|muted)']));
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('refuses a page whose first key leaves no running AudioContext', () => {
    const r = av('av=nostart');
    expect(r.out).toMatch(/av: the page never booted to a running AudioContext/);
    expect(r.code).toBe(2);
  }, 180000);

  it('fails voices played but not counted, on the voices row alone', () => {
    const r = av('av=undercount');
    expect(r.out).toMatch(/av: scheduled \d+ voices, the track has \d+ onsets in the time played/);
    expect(r.out).not.toMatch(otherRows(['scheduled \\d+ voices']));
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);

  it('fails notes the transport drops as late, on the late-drop row', () => {
    const r = av('av=drop');
    expect(r.out).toMatch(/av: \d+ late-dropped notes/);
    expect(r.out).toMatch(/av: FAIL/);
    expect(r.code).toBe(1);
  }, 180000);
});
