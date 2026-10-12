// Tile codes, the grid character table and the room error (spec section 5.1), ported from
// tests/fixtures/oracle/world.mjs.
export const CODE = Object.freeze({ EMPTY: 0, SOLID: 1, UP: 2, DOWN: 3, LEFT: 4, RIGHT: 5, WAVE: 6, BASE: 7, ENTITY: 8 } as const);

// The grid characters that stand for themselves; a to z are the cells of a defined entity.
export const CHAR_CODE: Readonly<Record<string, number>> = { '.': 0, '#': 1, '^': 2, v: 3, '<': 4, '>': 5, W: 6, B: 7 };

export class RoomError extends Error {}

export function fail(name: string, msg: string): never {
  throw new RoomError(`${name}: ${msg}`);
}
