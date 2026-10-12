// The toy sim (PF-CONTROLS): a few dozen lines with the product's headless interface, so the replay
// runner and the solver are proven before the product exists. A 1-D corridor: holding RIGHT moves one
// cell every 4 steps, a JUMP press keeps the creature airborne for 32 steps, a gap kills a grounded
// creature (back to cell 0), and a door opens only on the first beat of every 4-beat bar
// (step*7 mod 2880 < 720), so the only route through a door waits on the bar, not on the beat.
// Room file: "toy-room 1", "length <n>", then "gap <from> <to>" and "door <cell>" lines.
const FIELDS = ['step', 'room', 'x', 'sub', 'air', 'deaths', 'cleared', 'prevIn'];

export function compileWorld(files) {
  const rooms = [...files].sort((a, b) => (a.name < b.name ? -1 : 1)).map((f) => {
    const lines = f.text.trim().split('\n');
    if (lines[0] !== 'toy-room 1') throw new Error(`${f.name}: not a toy room`);
    const room = { name: f.name.replace(/\.txt$/, ''), length: 0, gaps: [], doors: [], entities: [] };
    for (const l of lines.slice(1)) {
      const [k, a, b] = l.split(' ');
      if (k === 'length') room.length = Number(a);
      else if (k === 'gap') room.gaps.push([Number(a), Number(b)]);
      else if (k === 'door') { room.doors.push(Number(a)); room.entities.push({ period: 4 }); }
    }
    return room;
  });
  return { rooms, gauntlet: null };
}

export function createSim(world, start) {
  const s = { step: start.step | 0, room: start.room, x: 0, sub: 0, air: 0, deaths: 0, cleared: 0, prevIn: 0 };
  const R = () => world.rooms[s.room - 1];
  const open = () => (s.step * 7) % 2880 < 720;
  return {
    get step() { return s.step; },
    tick(input) {
      const press = input & ~s.prevIn;
      s.prevIn = input;
      if (!s.cleared) {
        if ((press & 16) && s.air === 0) s.air = 32;
        if (input & 2) {
          if (s.sub < 3) s.sub += 1;
          else if (!(R().doors.includes(s.x + 1) && !open())) { s.sub = 0; s.x += 1; }
        }
        if (s.air > 0) s.air -= 1;
        else if (R().gaps.some(([a, b]) => s.x >= a && s.x <= b)) { s.deaths += 1; s.x = 0; s.sub = 0; }
        if (s.x >= R().length) s.cleared = 1;
      }
      s.step += 1;
    },
    status() { return { room: s.room, cleared: s.cleared, dead: false, deaths: s.deaths, finished: false, x: s.x, y: 0, form: 0 }; },
    checksum() {
      let h = 0x811c9dc5;
      for (const f of FIELDS) for (let k = 0; k < 4; k++) { h ^= (s[f] >>> (8 * k)) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; }
      return h.toString(16).padStart(8, '0');
    },
    save() { return Int32Array.from(FIELDS, (f) => s[f]); },
    load(buf) { FIELDS.forEach((f, i) => { s[f] = buf[i]; }); },
    key(period) { return [s.room, s.x, s.sub, s.air, s.cleared, ((s.step % period) + period) % period].join(','); },
  };
}
