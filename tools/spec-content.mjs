// The spec's byte-exact content (D7): the room files, the gauntlet file and the track, each a ```text block
// in build/HUSH-SPEC.md, hashed in tests/data/content.sha256.
//   node tools/spec-content.mjs --check                 every spec block hashes to its listed sha256, and the
//                                                      gauntlet grid generated from its block does too
//   node tools/spec-content.mjs --tree [names...]       the files in the working tree (rooms/*.txt,
//                                                      music/area1.strudel) match their sha256; names limit it
//   node tools/spec-content.mjs --extract <name> <out>  write one block as a file (LF endings, final LF);
//                                                      <name> is a room stem, 11-gauntlet or area1
// Exit 0 clean; 1 a mismatch, a missing block or a missing file; 2 usage.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileGauntlet } from '../tests/fixtures/oracle/world.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = path.join(REPO, 'build', 'HUSH-SPEC.md');
const LIST = path.join(REPO, 'tests', 'data', 'content.sha256');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

export function readList() {
  const out = new Map();
  for (const line of fs.readFileSync(LIST, 'utf8').split('\n')) {
    const m = /^([0-9a-f]{64}) {2}(\S+)$/.exec(line);
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

// Each ```text block is keyed by the heading above it: "#### NN-name" a room, "### 6.3 ..." the gauntlet
// file, "## 7. ..." the track.
export function specBlocks(text = fs.readFileSync(SPEC, 'utf8')) {
  const lines = text.split('\n');
  const blocks = new Map();
  let key = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const room = /^#### ((?:0[1-9]|10)-[a-z-]+)$/.exec(l);
    if (room) key = `rooms/${room[1]}.txt`;
    else if (/^### 6\.3 /.test(l)) key = 'rooms/11-gauntlet.txt';
    else if (/^## 7\. /.test(l)) key = 'music/area1.strudel';
    else if (/^#{2,4} /.test(l)) key = null;
    if (l === '```text' && key && !blocks.has(key)) {
      const body = [];
      let j = i + 1;
      while (j < lines.length && lines[j] !== '```') body.push(lines[j++]);
      blocks.set(key, `${body.join('\n')}\n`);
      i = j;
    }
  }
  return blocks;
}

function nameToKey(name) {
  if (name === 'area1') return 'music/area1.strudel';
  if (name === '11-gauntlet') return 'rooms/11-gauntlet.txt';
  if (/^(0[1-9]|10)-[a-z-]+$/.test(name)) return `rooms/${name}.txt`;
  return null;
}

export function checkSpec(log) {
  const list = readList();
  const blocks = specBlocks();
  let bad = 0;
  for (const [key, want] of list) {
    if (key === 'rooms/11-gauntlet.grid') {
      const g = blocks.get('rooms/11-gauntlet.txt');
      const got = g ? sha(compileGauntlet('11-gauntlet.txt', g).grid) : 'missing';
      if (got !== want) { bad++; log(`${key}: generated grid ${got.slice(0, 12)} is not ${want.slice(0, 12)}`); }
      continue;
    }
    const b = blocks.get(key);
    if (!b) { bad++; log(`${key}: no block in build/HUSH-SPEC.md`); continue; }
    if (sha(b) !== want) { bad++; log(`${key}: spec block ${sha(b).slice(0, 12)} is not ${want.slice(0, 12)}`); }
  }
  log(bad ? `spec-content: FAIL, ${bad} problem(s)` : `spec-content: spec clean, ${list.size} entries`);
  return bad ? 1 : 0;
}

export function checkTree(names, log) {
  const list = readList();
  let keys = [...list.keys()].filter((k) => !k.endsWith('.grid'));
  if (names.length) {
    keys = names.map(nameToKey);
    if (keys.some((k) => !k)) { log('spec-content: unknown name'); return 2; }
  }
  let bad = 0;
  for (const key of keys) {
    const file = path.join(REPO, ...key.split('/'));
    if (!fs.existsSync(file)) { bad++; log(`${key}: missing`); continue; }
    const got = sha(fs.readFileSync(file));
    if (got !== list.get(key)) { bad++; log(`${key}: ${got.slice(0, 12)} is not the spec's ${list.get(key).slice(0, 12)} (byte drift: line endings, spaces or tiles)`); }
    else log(`${key}: ok`);
  }
  log(bad ? `spec-content: FAIL, ${bad} file(s)` : `spec-content: tree clean, ${keys.length} file(s)`);
  return bad ? 1 : 0;
}

function main(argv, log = (s) => process.stdout.write(`${s}\n`)) {
  if (argv[0] === '--check' && argv.length === 1) return checkSpec(log);
  if (argv[0] === '--tree') return checkTree(argv.slice(1), log);
  if (argv[0] === '--extract' && argv.length === 3) {
    const key = nameToKey(argv[1]);
    const b = key && specBlocks().get(key);
    if (!b) { log(`spec-content: no block for ${argv[1]}`); return 1; }
    if (sha(b) !== readList().get(key)) { log(`spec-content: the spec block for ${argv[1]} does not match its sha256; not written`); return 1; }
    if (fs.existsSync(argv[2])) { log(`spec-content: ${argv[2]} exists; not overwritten`); return 1; }
    fs.mkdirSync(path.dirname(path.resolve(argv[2])), { recursive: true });
    fs.writeFileSync(argv[2], b);
    log(`spec-content: wrote ${argv[2]} (${sha(b).slice(0, 12)})`);
    return 0;
  }
  log('usage: spec-content.mjs --check | --tree [names...] | --extract <name> <out>');
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { process.stderr.write(`spec-content: ${e.message}\n`); process.exitCode = 2; }
}
