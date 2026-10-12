// The step function (spec sections 4.3 to 4.5), ported whole from tests/fixtures/oracle/sim.mjs: after every step
// of every test sequence, save() equals the oracle's, field for field. Integer math only (D3); no DOM, timer or
// engine-dependent function (the eslint rules of src/sim).
import { CODE } from '../rooms/codes.ts';
import type { Room, Sim, SimStatus, StartState, World } from './types.ts';
import { gauntletStartBeat, entityOn, nextBarStep } from './beat.ts';
import { C, IN, SPIKE_BOX } from './constants.ts';

const T = C.TILE;
const BW = C.BOX_W;
const BH = C.BOX_H;

const fdiv = (a: number, b: number): number => Math.floor(a / b);
const mod = (a: number, b: number): number => ((a % b) + b) % b;
const approach = (v: number, target: number, a: number): number => (v < target ? Math.min(v + a, target) : Math.max(v - a, target));

const FIELD_NAMES = [
  'step', 'room', 'x', 'y', 'vx', 'vy', 'facing', 'form', 'grounded', 'coyote', 'buffer', 'varJump',
  'dashes', 'dashTimer', 'dashCooldown', 'dashDX', 'dashDY', 'dead', 'lock', 'layers', 'pendingLayer',
  'pendingAt', 'deaths', 'cleared', 'prevIn', 'gRun', 'gBeat', 'finished',
] as const;
type Field = (typeof FIELD_NAMES)[number];
type State = Record<Field, number>;

// The state's field order: save() lists the fields in it and load() takes them back in it.
export const FIELDS: readonly string[] = FIELD_NAMES;

function checksumOf(s: State): string {
  let h = 0x811c9dc5;
  for (const f of FIELD_NAMES) {
    const v = s[f] | 0;
    for (let k = 0; k < 4; k++) {
      h ^= (v >>> (8 * k)) & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}

export function createSim(world: World, start: StartState): Sim {
  const rooms = world.rooms;
  const roomOf = (n: number): Room | null | undefined => (n === 11 ? world.gauntlet : rooms[n - 1]);
  const first = roomOf(start.room);
  if (!first) throw new Error(`no room ${start.room} in this world`);
  const s: State = {
    step: start.step | 0, room: start.room, x: 0, y: 0, vx: 0, vy: 0, facing: 1, form: 0, grounded: 0,
    coyote: 0, buffer: 0, varJump: 0, dashes: 1, dashTimer: 0, dashCooldown: 0, dashDX: 0, dashDY: 0,
    dead: 0, lock: 0, layers: start.layers | 0, pendingLayer: 0, pendingAt: 0, deaths: 0, cleared: 0,
    prevIn: 0, gRun: 0, gBeat: 0, finished: 0,
  };
  const stopAtClear = Boolean(start.stopAtClear);
  let R: Room = first;

  function place(): void {
    s.x = R.spawn.col * T + (T - BW) / 2;
    s.y = (R.spawn.row + 1) * T - BH;
    s.vx = 0; s.vy = 0; s.facing = 1; s.form = 0; s.grounded = 1; s.coyote = 0; s.buffer = 0; s.varJump = 0;
    s.dashes = 1; s.dashTimer = 0; s.dashCooldown = 0; s.dashDX = 0; s.dashDY = 0;
    if (s.room === 11) { s.gRun = 0; s.gBeat = gauntletStartBeat(s.step); }
  }
  place();

  function cell(c: number, r: number): number {
    if (c < 0 || r < 0) return CODE.SOLID;
    if (c >= R.W || r >= R.H) return CODE.EMPTY;
    return R.tiles[r * R.W + c] ?? CODE.EMPTY;
  }
  function solid(c: number, r: number): boolean {
    const k = cell(c, r);
    if (k === CODE.SOLID) return true;
    if (k >= CODE.ENTITY) {
      const e = R.entities[k - CODE.ENTITY];
      return e !== undefined && e.kind === 'block' && entityOn(e, s.step, s.layers);
    }
    return false;
  }
  function rowsSpan(): [number, number] { return [fdiv(s.y, T), fdiv(s.y + BH - 1, T)]; }
  function colsSpan(): [number, number] { return [fdiv(s.x, T), fdiv(s.x + BW - 1, T)]; }

  // Moves along x; returns true when a solid stopped the move.
  function moveX(dx: number): boolean {
    if (dx === 0) return false;
    const [r0, r1] = rowsSpan();
    if (dx > 0) {
      const c0 = fdiv(s.x + BW - 1, T) + 1;
      const c1 = fdiv(s.x + dx + BW - 1, T);
      for (let c = c0; c <= c1; c++) {
        for (let r = r0; r <= r1; r++) if (solid(c, r)) { s.x = c * T - BW; return true; }
      }
    } else {
      const c0 = fdiv(s.x, T) - 1;
      const c1 = fdiv(s.x + dx, T);
      for (let c = c0; c >= c1; c--) {
        for (let r = r0; r <= r1; r++) if (solid(c, r)) { s.x = (c + 1) * T; return true; }
      }
    }
    s.x += dx;
    return false;
  }
  function moveY(dy: number): boolean {
    if (dy === 0) return false;
    const [c0, c1] = colsSpan();
    if (dy > 0) {
      const r0 = fdiv(s.y + BH - 1, T) + 1;
      const r1 = fdiv(s.y + dy + BH - 1, T);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) if (solid(c, r)) { s.y = r * T - BH; return true; }
      }
    } else {
      const r0 = fdiv(s.y, T) - 1;
      const r1 = fdiv(s.y + dy, T);
      for (let r = r0; r >= r1; r--) {
        for (let c = c0; c <= c1; c++) if (solid(c, r)) { s.y = (r + 1) * T; return true; }
      }
    }
    s.y += dy;
    return false;
  }
  function onGround(): boolean {
    if (mod(s.y + BH, T) !== 0) return false;
    const r = fdiv(s.y + BH, T);
    const [c0, c1] = colsSpan();
    for (let c = c0; c <= c1; c++) if (solid(c, r)) return true;
    return false;
  }
  function overlapsSolid(): boolean {
    const [c0, c1] = colsSpan();
    const [r0, r1] = rowsSpan();
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) return true;
    return false;
  }
  function spikeHit(): boolean {
    const [c0, c1] = colsSpan();
    const [r0, r1] = rowsSpan();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = cell(c, r);
        let dir: 'up' | 'down' | 'left' | 'right' | null = null;
        if (k === CODE.UP) dir = 'up';
        else if (k === CODE.DOWN) dir = 'down';
        else if (k === CODE.LEFT) dir = 'left';
        else if (k === CODE.RIGHT) dir = 'right';
        else if (k >= CODE.ENTITY) {
          const e = R.entities[k - CODE.ENTITY];
          if (e !== undefined && e.kind === 'spike' && entityOn(e, s.step, s.layers)) dir = e.dir;
        }
        if (!dir) continue;
        const b = SPIKE_BOX[dir];
        const hx0 = c * T + b[0];
        const hy0 = r * T + b[1];
        const hx1 = c * T + b[2];
        const hy1 = r * T + b[3];
        if (s.x < hx1 && s.x + BW > hx0 && s.y < hy1 && s.y + BH > hy0) return true;
      }
    }
    return false;
  }
  function portalTouch(): number {
    const [c0, c1] = colsSpan();
    const [r0, r1] = rowsSpan();
    let found = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = cell(c, r);
        if (k === CODE.WAVE) found = 1;
        else if (k === CODE.BASE && found === 0) found = 2;
      }
    }
    return found;
  }
  function die(): void {
    s.dead = C.RESPAWN_STEPS; s.deaths += 1; s.vx = 0; s.vy = 0; s.dashTimer = 0; s.varJump = 0;
  }
  function clearRoom(): void {
    s.cleared += 1;
    if (s.room === 11) { s.finished = 1; return; }
    if (s.pendingLayer) s.layers |= 1 << s.pendingLayer;
    s.pendingLayer = R.layer;
    s.pendingAt = nextBarStep(s.step);
    if (stopAtClear) return;
    s.room += 1;
    const next = roomOf(s.room);
    if (!next) { s.finished = 1; return; }
    R = next;
    place();
  }

  function tick(raw: number): void {
    const input = raw & 63;
    if (s.finished || (stopAtClear && s.cleared)) { s.step += 1; return; }
    if (s.pendingLayer && s.step >= s.pendingAt) { s.layers |= 1 << s.pendingLayer; s.pendingLayer = 0; s.pendingAt = 0; }
    const pressed = input & ~s.prevIn;
    s.prevIn = input;
    if (s.dead > 0) {
      s.dead -= 1;
      if (s.dead === 0) { place(); s.lock = C.LOCK_STEPS; }
      s.step += 1;
      return;
    }
    let held = input;
    let press = pressed;
    if (s.lock > 0) { s.lock -= 1; held = 0; press = 0; }
    if (overlapsSolid()) { die(); s.step += 1; return; }

    if (press & IN.JUMP) s.buffer = C.BUFFER;
    else if (s.buffer > 0) s.buffer -= 1;

    if (s.room === 11) gauntletStep(held);
    else if (s.form === 1) waveStep(held, 0);
    else baseStep(held, press);
    if (s.dead) { s.step += 1; return; }

    if (spikeHit() || s.y >= R.H * T) { die(); s.step += 1; return; }
    const portal = portalTouch();
    if (portal === 1 && s.form === 0) {
      s.form = 1; s.facing = 1; s.vx = C.WAVE_SPEED; s.vy = 0; s.dashTimer = 0; s.varJump = 0; s.buffer = 0;
    } else if (portal === 2 && s.form === 1) {
      s.form = 0; s.vx = s.room === 11 ? 0 : C.RUN_MAX; s.vy = 0; s.dashes = 1;
    }
    if (s.x + BW >= R.W * T) clearRoom();
    s.step += 1;
  }

  function baseStep(held: number, press: number): void {
    const h = ((held & IN.RIGHT) ? 1 : 0) - ((held & IN.LEFT) ? 1 : 0);
    const v = ((held & IN.DOWN) ? 1 : 0) - ((held & IN.UP) ? 1 : 0);
    if ((press & IN.DASH) && s.dashes > 0 && s.dashCooldown === 0 && s.dashTimer === 0) {
      let dx = h;
      const dy = v;
      if (dx === 0 && dy === 0) dx = s.facing;
      if (dx !== 0) s.facing = dx;
      const sp = dx !== 0 && dy !== 0 ? C.DASH_DIAG : C.DASH_SPEED;
      s.vx = dx * sp; s.vy = dy * sp;
      s.dashDX = dx; s.dashDY = dy; s.dashes = 0; s.dashTimer = C.DASH_STEPS; s.dashCooldown = C.DASH_COOLDOWN; s.varJump = 0;
    }
    if (s.dashTimer === 0) {
      if (h !== 0) s.facing = h;
      if (h !== 0 && s.vx * h > C.RUN_MAX) s.vx = approach(s.vx, h * C.RUN_MAX, C.RUN_REDUCE);
      else if (h !== 0) s.vx = approach(s.vx, h * C.RUN_MAX, s.grounded ? C.RUN_ACCEL : C.AIR_ACCEL);
      else s.vx = approach(s.vx, 0, s.grounded ? C.RUN_DECEL : C.AIR_DECEL);
      const g = Math.abs(s.vy) < C.APEX && (held & IN.JUMP) ? C.GRAVITY_APEX : C.GRAVITY;
      s.vy = Math.min(s.vy + g, C.MAX_FALL);
      if (s.buffer > 0 && (s.grounded || s.coyote > 0)) {
        s.vy = C.JUMP_VY; s.varJump = C.VAR_JUMP; s.buffer = 0; s.coyote = 0; s.grounded = 0;
      }
      if (s.varJump > 0) {
        if (held & IN.JUMP) { s.vy = Math.min(s.vy, C.JUMP_VY); s.varJump -= 1; } else s.varJump = 0;
      }
    }
    if (moveX(s.vx)) s.vx = 0;
    if (moveY(s.vy)) { if (s.vy < 0) s.varJump = 0; s.vy = 0; }
    if (s.dashTimer > 0) {
      s.dashTimer -= 1;
      if (s.dashTimer === 0) {
        const ex = s.dashDX !== 0 && s.dashDY !== 0 ? C.DASH_EXIT_DIAG : C.DASH_EXIT;
        s.vx = s.dashDX * ex; s.vy = s.dashDY * ex;
      }
    }
    s.grounded = onGround() ? 1 : 0;
    if (s.grounded) { s.coyote = C.COYOTE; if (s.dashTimer === 0) s.dashes = 1; } else if (s.coyote > 0) s.coyote -= 1;
    if (s.dashCooldown > 0) s.dashCooldown -= 1;
  }

  // dxForced: the gauntlet's auto-run displacement, or 0 to use the wave's own speed.
  function waveStep(held: number, dxForced: number): void {
    s.vy = (held & (IN.JUMP | IN.UP)) ? -C.WAVE_SPEED : C.WAVE_SPEED;
    const dx = s.room === 11 ? dxForced : C.WAVE_SPEED * s.facing;
    s.vx = dx;
    if (moveX(dx)) { die(); return; }
    if (moveY(s.vy)) s.vy = 0;
    s.grounded = onGround() ? 1 : 0;
  }

  function gauntletStep(held: number): void {
    const ticks = s.step * C.TICKS_PER_STEP - s.gBeat * C.TICKS_PER_BEAT;
    if (!s.gRun) {
      if (ticks < 0) { s.grounded = onGround() ? 1 : 0; return; }
      s.gRun = 1;
    }
    const startX = R.spawn.col * T + (T - BW) / 2;
    const targetX = startX + fdiv(ticks * C.RUN_NUM, C.RUN_DEN);
    const dx = targetX - s.x;
    if (s.form === 1) { waveStep(held, dx); return; }
    const g = Math.abs(s.vy) < C.APEX && (held & IN.JUMP) ? C.GRAVITY_APEX : C.GRAVITY;
    s.vy = Math.min(s.vy + g, C.MAX_FALL);
    if (s.buffer > 0 && (s.grounded || s.coyote > 0)) {
      s.vy = C.JUMP_VY; s.varJump = C.VAR_JUMP; s.buffer = 0; s.coyote = 0; s.grounded = 0;
    }
    if (s.varJump > 0) {
      if (held & IN.JUMP) { s.vy = Math.min(s.vy, C.JUMP_VY); s.varJump -= 1; } else s.varJump = 0;
    }
    s.vx = dx;
    if (moveX(dx)) { die(); return; }
    if (moveY(s.vy)) { if (s.vy < 0) s.varJump = 0; s.vy = 0; }
    s.grounded = onGround() ? 1 : 0;
    if (s.grounded) s.coyote = C.COYOTE; else if (s.coyote > 0) s.coyote -= 1;
  }

  const status = (): SimStatus => ({
    room: s.room, cleared: s.cleared, dead: s.dead > 0, deaths: s.deaths, finished: Boolean(s.finished), x: s.x, y: s.y, form: s.form,
  });

  return {
    get step(): number { return s.step; },
    tick,
    status,
    checksum(): string { return checksumOf(s); },
    // The whole state as integers in FIELDS order; load() takes the same array back.
    save(): Int32Array { return Int32Array.from(FIELD_NAMES, (f) => s[f]); },
    load(buf: Int32Array): void {
      FIELD_NAMES.forEach((f, i) => { s[f] = buf[i] ?? 0; });
      const loaded = roomOf(s.room);
      if (loaded) R = loaded;
    },
    // Solver key: quantised position and speed, dash and form state, progression flags and the phase of
    // every hazard period in the room (step mod P).
    key(period: number): string {
      return [s.room, s.x >> 9, s.y >> 9, s.vx >> 5, s.vy >> 5, s.facing, s.dashes, s.dashTimer >> 3,
        s.dashCooldown > 0 ? 1 : 0, s.form, s.grounded, s.coyote > 0 ? 1 : 0, s.varJump >> 3, s.buffer > 0 ? 1 : 0,
        s.layers, s.pendingLayer, s.gRun, s.dead > 0 ? 1 : 0, mod(s.step, period)].join(',');
    },
  };
}
