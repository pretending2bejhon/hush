// The Hush physics and timing constants (spec section 4.1), equal to tests/fixtures/oracle/constants.mjs.
// Integer units only (D3): 1 world px = 256 sub, 1 tile = 16 px = 4096 sub, 240 steps per second,
// 720 beat-ticks per beat, and 7 beat-ticks per step (140 BPM: one beat is 720/7 steps).
export const C = Object.freeze({
  SUB: 256,
  TILE: 4096,
  BOX_W: 2560,
  BOX_H: 2560,
  STEPS_PER_SECOND: 240,
  TICKS_PER_BEAT: 720,
  TICKS_PER_STEP: 7,
  TICKS_PER_SIXTEENTH: 180,
  TICKS_PER_BAR: 2880,

  RUN_MAX: 176,
  RUN_ACCEL: 12,
  RUN_DECEL: 16,
  AIR_ACCEL: 8,
  AIR_DECEL: 5,
  RUN_REDUCE: 4,

  GRAVITY: 8,
  GRAVITY_APEX: 4,
  APEX: 80,
  MAX_FALL: 352,
  JUMP_VY: -224,
  VAR_JUMP: 48,
  COYOTE: 24,
  BUFFER: 20,

  DASH_SPEED: 448,
  DASH_DIAG: 317,
  DASH_STEPS: 40,
  DASH_EXIT: 224,
  DASH_EXIT_DIAG: 158,
  DASH_COOLDOWN: 48,

  WAVE_SPEED: 160,

  RESPAWN_STEPS: 72,
  LOCK_STEPS: 24,

  // Gauntlet auto-run: 4 tiles per beat exactly, x advances floor(g * 1024 / 45) sub after g beat-ticks.
  RUN_NUM: 1024,
  RUN_DEN: 45,
  GAUNTLET_LEAD_TICKS: 720,
});

// Input bits (section 3; src/input maps keys to these, replays store them).
export const IN = Object.freeze({ LEFT: 1, RIGHT: 2, UP: 4, DOWN: 8, JUMP: 16, DASH: 32 });

// Spike hazard boxes inside their tile, in sub: [x0, y0, x1, y1] (exclusive ends).
export const SPIKE_BOX = Object.freeze({
  up: [512, 1536, 3584, 4096],
  down: [512, 0, 3584, 2560],
  left: [1536, 512, 4096, 3584],
  right: [0, 512, 2560, 3584],
} as const);
