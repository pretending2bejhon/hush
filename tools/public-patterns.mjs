// The pattern set shared by check-public (D14) and evidence (D12): what may never enter the
// public repo, how to find it and how to redact it. Only generic patterns live here. The private
// names live in the owner's denylist outside the repo, and the vault root folder name is held
// only as a hash, so this file names nothing it guards.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_EMAIL, REPO_NAME } from './identity.mjs';

export class DenylistError extends Error {}

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Length and sha256 of each lowercased vault root folder name.
const VAULT_ROOT_HASHES = new Map([
  [9, new Set(['aecd89bf0078a5075c85eea68cd57dd24d13c3a4f56238de9b577b5b98c42c90'])],
]);

// sha256 of each lowercased third-party email a pinned dependency ships inside the built bundle, as public npm
// metadata: escodegen's maintainer contact, inlined by @strudel/web 1.3.0's prebuilt bundle (found by the deploy
// dry run of PF-CONTROLS, the only email in the built page). Held as hashes so this file names nothing.
const THIRD_PARTY_EMAIL_HASHES = new Set([
  '6a6e0568bbcd7e8b0e458a545ad4b34078198bdb54b31ba03a21e6d12c1aee9c',
]);
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

// Public by design: masked before any name or email is matched.
const PUBLIC_FORMS = [
  new RegExp(escapeRe(REPO_EMAIL), 'gi'),
  /\bgit@github\.com\b/gi,
  new RegExp(escapeRe(REPO_NAME), 'gi'),
  /jhonalbert\.com/gi,
  /\bJHON\b/g,
];

const SEP = String.raw`(?:\\+|/+)`;
const SEG_END = String.raw`[^\\/\s"'\x60<>|:*?]+`;
const LEAD = String.raw`(?:^|[\s"'\x60(=:,\[/])`;

export const PATTERNS = [
  { cls: 'user-path', re: new RegExp(String.raw`\b[A-Za-z]:${SEP}Users${SEP}${SEG_END}`, 'gi') },
  { cls: 'user-path', re: new RegExp(String.raw`${LEAD}(?:/mnt)?/[A-Za-z]/Users/${SEG_END}`, 'gim') },
  { cls: 'user-path', re: new RegExp(String.raw`${LEAD}/(?:home|Users)/${SEG_END}`, 'gim') },
  { cls: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  { cls: 'token', re: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g },
  { cls: 'token', re: /\bgithub_pat_[A-Za-z0-9_]{60,255}\b/g },
  { cls: 'token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { cls: 'token', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { cls: 'token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { cls: 'token', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { cls: 'token', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g },
  { cls: 'token', re: /\bAIza[0-9A-Za-z_-]{35}/g },
  { cls: 'token', re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { cls: 'token', re: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { cls: 'token', re: /\bhf_[A-Za-z0-9]{30,}/g },
  { cls: 'token', re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { cls: 'token', re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g },
  { cls: 'token', re: /\b[Bb]earer\s+[A-Za-z0-9._~+/-]{20,}=*/g },
  { cls: 'token', re: /\bAccountKey=[A-Za-z0-9+/=]{40,}/g },
];

const GENERIC_USERS = new Set(['admin', 'administrator', 'user', 'owner', 'guest', 'root', 'default', 'public', 'runner']);

export function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function normalizeNl(s) {
  return String(s).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

export function denylistPath() {
  return process.env.HUSH_NAMES_FILE || path.join(os.homedir(), '.hush-cap', 'names.txt');
}

// Fail closed: a missing or empty denylist is an error, never an empty list.
export function loadDenylist() {
  const file = denylistPath();
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    throw new DenylistError('denylist missing (the owner writes <home>/.hush-cap/names.txt; tests set HUSH_NAMES_FILE)');
  }
  const names = normalizeNl(raw).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (!names.length) throw new DenylistError('denylist empty');
  return { fixture: Boolean(process.env.HUSH_NAMES_FILE), names, raw };
}

// The machine's own identifiers count as names too, unless generic or public.
function machineNames() {
  const out = [];
  let user = '';
  try { user = os.userInfo().username; } catch { user = ''; }
  for (const n of [user, os.hostname()]) {
    if (!n || n.length < 4 || GENERIC_USERS.has(n.toLowerCase())) continue;
    if (PUBLIC_FORMS.some((re) => { re.lastIndex = 0; return re.test(n); })) continue;
    out.push(n);
  }
  return out;
}

function nameRegex(name) {
  const body = name.split(/\s+/).map(escapeRe).join(String.raw`\s+`);
  return new RegExp(String.raw`(?<![\p{L}\p{N}])${body}(?![\p{L}\p{N}])`, 'giu');
}

export function makeContext({ repoRoot = REPO_ROOT } = {}) {
  const deny = loadDenylist();
  const implicit = machineNames().filter((n) => !deny.names.some((d) => d.toLowerCase() === n.toLowerCase()));
  const names = [...deny.names, ...implicit];
  return {
    repoRoot: path.resolve(repoRoot),
    home: os.homedir(),
    nameRes: names.map(nameRegex),
    denyRaw: normalizeNl(deny.raw).trim(),
    source: deny.fixture ? 'fixture denylist (HUSH_NAMES_FILE)' : 'owner denylist',
    count: deny.names.length,
    implicitCount: implicit.length,
  };
}

export function mask(text) {
  let t = text;
  for (const re of PUBLIC_FORMS) {
    re.lastIndex = 0;
    t = t.replace(re, (m) => ' '.repeat(m.length));
  }
  EMAIL_RE.lastIndex = 0;
  return t.replace(EMAIL_RE, (m) => (THIRD_PARTY_EMAIL_HASHES.has(sha256(m.toLowerCase())) ? ' '.repeat(m.length) : m));
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// Returns [{cls, line}] for every hit. Never returns the matched text itself.
export function scanText(text, ctx) {
  const src = normalizeNl(text);
  const masked = mask(src);
  const hits = [];
  const add = (cls, index) => hits.push({ cls, line: lineOf(src, index) });
  for (const { cls, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(masked))) {
      add(cls, m.index);
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  for (const re of ctx.nameRes) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(masked))) add('name', m.index);
  }
  const run = /[A-Za-z0-9]+/g;
  let m;
  while ((m = run.exec(src))) {
    const set = VAULT_ROOT_HASHES.get(m[0].length);
    if (set && set.has(sha256(m[0].toLowerCase()))) add('vault-root', m.index);
  }
  if (ctx.denyRaw && src.includes(ctx.denyRaw)) add('denylist-copy', src.indexOf(ctx.denyRaw));
  return hits;
}

// Every spelling of one absolute path: plain, doubled backslashes, forward slashes, Git Bash,
// WSL and file URLs, case-insensitive, ending at a path boundary.
export function pathSpellingsRe(p) {
  const abs = path.resolve(p);
  const drive = /^([A-Za-z]):[\\/]*(.*)$/.exec(abs);
  const head = drive ? `(?:file:/+)?(?:${drive[1]}:|/${drive[1]}|/mnt/${drive[1]})` : '(?:file:/+)?';
  const rest = drive ? drive[2] : abs;
  const segs = rest.split(/[\\/]+/).filter(Boolean).map(escapeRe);
  const body = segs.map((s) => SEP + s).join('');
  return new RegExp(`${head}${body}(?![A-Za-z0-9_.-])`, 'gi');
}

export function redactText(text, ctx) {
  let t = normalizeNl(text);
  t = t.replace(pathSpellingsRe(ctx.repoRoot), '<repo>');
  t = t.replace(pathSpellingsRe(ctx.home), '<home>');
  const masked = mask(t);
  const spans = [];
  const collect = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(masked))) {
      let start = m.index;
      const lead = m[0].search(/[A-Za-z0-9/<\\-]/);
      if (lead > 0) start += lead;
      spans.push([start, m.index + m[0].length]);
      if (m[0].length === 0) re.lastIndex++;
    }
  };
  for (const { re } of PATTERNS) collect(re);
  for (const re of ctx.nameRes) collect(re);
  const run = /[A-Za-z0-9]+/g;
  let m;
  while ((m = run.exec(t))) {
    const set = VAULT_ROOT_HASHES.get(m[0].length);
    if (set && set.has(sha256(m[0].toLowerCase()))) spans.push([m.index, m.index + m[0].length]);
  }
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let out = '';
  let pos = 0;
  for (const [s, e] of spans) {
    if (e <= pos) continue;
    out += t.slice(pos, Math.max(pos, s)) + '<redacted>';
    pos = e;
  }
  return out + t.slice(pos);
}

// Redact, then rescan; a line that still trips the scan is dropped whole.
export function redactAndVerify(text, ctx) {
  let t = redactText(text, ctx);
  const bad = new Set(scanText(t, ctx).map((h) => h.line));
  if (bad.size) {
    t = t.split('\n').map((l, i) => (bad.has(i + 1) ? '<redacted line>' : l)).join('\n');
  }
  const still = scanText(t, ctx);
  return { text: t, clean: still.length === 0 };
}
