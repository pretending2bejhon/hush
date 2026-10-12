// RN1: the room's static art (src/render/room-art.ts, HUSH-SPEC sections 10.1 to 10.3) equals the reference
// (tests/fixtures/reference/art.mjs) for every room and the gauntlet, chunk by chunk, and the camera follows
// the creature as section 10.1 says, in whole canvas px.
import { describe, expect, it } from 'vitest';
import * as REF from '../fixtures/reference/art.mjs';
import { load } from '../helpers/load.mjs';
import { ALL_ROOMS, roomOf, sameShapes, world } from './same.mjs';

const P = await load('HUSH_ROOM_ART_MODULE', new URL('../../src/render/room-art.ts', import.meta.url));
const W = world();
const rooms = ALL_ROOMS.map((_, i) => roomOf(W, i + 1));

describe('RN1 room art', () => {
  it('bakes each room in chunks of 128 columns', () => {
    for (const room of rooms) expect(P.bakeChunks(room), room.name).toEqual(REF.bakeChunks(room));
    expect(REF.bakeChunks(roomOf(W, 11)).map((c) => c.w)).toEqual([5120, 5120, 5120, 5120, 1280]);
  });

  it('draws every chunk of every room with the reference shapes', () => {
    for (const room of rooms) {
      for (const ch of REF.bakeChunks(room)) {
        sameShapes(P.roomShapes(room, ch.col0, ch.col1), REF.roomShapes(room, ch.col0, ch.col1), `${room.name} ${ch.col0}`);
      }
    }
  });

  it('frames the view on the creature, clamped to the room, in whole canvas px', () => {
    for (const room of rooms) {
      for (let cx = -40; cx <= room.W * 16 + 40; cx += 3.3) expect(P.cameraPx(room, cx), `${room.name} ${cx}`).toBe(REF.cameraPx(room, cx));
    }
  });
});
