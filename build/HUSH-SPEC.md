# HUSH-SPEC: The Hush v1

The build specification for The Hush v1, cut by the spec session (Opus standing in for Fable) and read by the executor (phase 2) and the producer (phase 3). It makes every design decision; the executor makes none. Where this spec and a prompt disagree on a design value, this spec wins; where it is silent, the item is `blocked (needs-design)`.

STATUS: draft, not cut. Sections 1 to 7 (scope, units, input, physics, rooms, gauntlet, track) are settled and verified where they say so; audio, clock, render and art, flash, calibration, ending, interfaces, verifiers, items, the writer table and the handoff are not written yet. No executor may start: there is no `HUSH-SPEC: READY` line and no JHON-GO. `node tools/spec-content.mjs --check` proves every byte-exact block against tests/data/content.sha256.

Labels: [VL] verified live in this repo (a command run, its evidence named), [P] primary source, unvoted, [I] inferred or designed here. The challenge pass is cited as CP Vn or CP §n.

## 1. Concept, rulings and scope

### 1.1 Concept (shared 2026-10-10 19:38, verbatim)

The Hush is a free-movement vector metroidvania with Hollow Knight's mood. Traversal only: no combat, no text. Keyboard, desktop-first, English, at jhonalbert.com/hush (public repo, AGPL-3.0, GitHub Pages). A small creature wakes in a silent kingdom. Each cleared room brings back one layer of a 140 BPM Strudel track, and spikes, platforms and doors only start moving to the beat as the music returns. It moves with jump and dash, and around room 6 it evolves into the wave, used through GD-style portals. You respawn instantly at the room entrance. No save, no map. v1 is one area of about 10 rooms plus one gauntlet that auto-scrolls on the full track, with obstacles built from the pattern. It ends on the full song, a glimpse of the next area, and "to be continued". 10 to 15 minutes.

### 1.2 Rulings applied (the owner's words are in build/SPEC-PROGRESS.md, section Rulings)

| N | Ruling | What it changes in the concept |
|---|---|---|
| N1 | plain-text rooms in the repo, not LDtk | replaces "LDtk": rooms are `rooms/NN-name.txt` in the `hush-room 1` format (section 5) |
| N2 | a wordless ending card, three dots pulsing on the beat | replaces the words "to be continued" (section 13) |
| N3 | the canvas stays wordless; the title lives in the page title and the HTML around the canvas | the canvas never holds text (D8, D16) |
| N4 | a small "Source (AGPL-3.0)" link outside the canvas | the page text (Handoff) |
| N5 | synth-only Strudel, no samples | the track uses superdough's built-in synths only (section 7) |
| N6 | 3 friends through the live URL before any announcement | X11 counts 3 distinct friends |
| N7 | Chrome and Edge automatic, Firefox smoke-played by the owner | X5 and X11 |
| N8, N8b | the cap hook under managed settings, Administrators-only files, Claude Code 2.1.295 or later, and a JHON-CAPS-RESIDUAL line | caps (section 1.5) |
| N9 | Codex only under a JHON-CODEX line accepting advisory caps | executor model |
| N10 | pretending2bejhon/hush private from the start, pushed after each phase, visibility checked before every push | backups |

### 1.3 Build scope

The v1 slice of the concept: one area of ten rooms and one gauntlet; jump, dash and the wave through portals, with the wave first met in room 6; one Strudel track whose ten layers return room by room, with beat-bound hazards; the gauntlet auto-scrolling on the full track, its obstacles generated from the pattern; a wordless calibration screen, a flash limiter and the ending; procedural vector art in the Hollow Knight mood; the staged deploy to jhonalbert.com/hush.

### 1.4 Out of scope (from the phase parameters; an item touching any of these is cut as an amendment only on the owner's word)

- Combat, dialogue or any in-game words.
- Save, map screen, settings menu.
- Gamepad, touch, mobile layout.
- A second area or a second evolution form.
- Player level editor, URL-shared levels, leaderboards, analytics or telemetry.
- Accounts, monetization.
- Any change to Vault City.
- itch.io or Steam release, localization, a live-coding UI.

### 1.5 Caps

N8b (a) holds: the cap hook is installed under managed settings with Administrators-only files and `onFailure: block`, Claude Code is 2.1.295, and the live proof passed (build/evidence/hook-live.proof.1.txt to proof.7.txt: two reports one call apart exiting 0, the crash test blocking one call, a subagent's calls counted under its own id). The owner's acceptance of the residual is the `JHON-CAPS-RESIDUAL: all-sessions` line in build/GATES.md.

## 2. Units and time (D3)

- The sim runs 240 steps per second with an integer step counter `step`.
- One beat is 720 beat-ticks and one step is 7 beat-ticks, so beat-ticks = `7 * step` and the beat phase is a pure function of the step: `beatFloat = step * 7 / 720` (140 BPM). A sixteenth is 180 beat-ticks, a bar (4 beats) 2880.
- Lengths are integers in sub: 1 world pixel = 256 sub, 1 tile = 16 px = 4096 sub. The view is 32 by 18 tiles (512 by 288 world px).
- The sim uses only `+ - * /`, `Math.floor`, `Math.ceil`, `Math.abs`, `Math.min`, `Math.max`, `Math.sqrt`, `Math.imul` and integer bit operations (the eslint rule in eslint.config.mjs enforces the restricted set). Every state field is an integer.
- A replay is a list of input changes `[step, bits]`; the same replay gives the same end-state checksum in Node and in the browser.

## 3. Input bits

| bit | value | keys (src/input) |
|---|---|---|
| LEFT | 1 | ArrowLeft, KeyA |
| RIGHT | 2 | ArrowRight, KeyD |
| UP | 4 | ArrowUp, KeyW |
| DOWN | 8 | ArrowDown, KeyS |
| JUMP | 16 | Space, KeyZ, KeyC |
| DASH | 32 | KeyX, ShiftLeft, ShiftRight |

Every other key is ignored by the game (Escape included). A key's bit is held from its keydown to its keyup; `event.repeat` keydowns are skipped.

## 4. Physics (normative source: tests/fixtures/oracle/)

The oracle in `tests/fixtures/oracle/` (constants.mjs, world.mjs, sim.mjs) is this section in executable form, written by the spec session and PROTECTED. `src/sim` and `src/rooms` reproduce it exactly: after every step of every test sequence, `save()` of the product sim equals `save()` of the oracle, field for field (tests/sim/oracle.test.ts). Where the prose below and the oracle differ, the oracle wins and the prose is a spec bug.

### 4.1 Constants (sub, steps; constants.mjs)

| name | value | meaning |
|---|---|---|
| BOX_W, BOX_H | 2560, 2560 | the creature's box, 10 by 10 px, both forms |
| RUN_MAX | 176 | run speed, 165 px/s, 10.3 tiles/s |
| RUN_ACCEL, RUN_DECEL | 12, 16 | ground acceleration toward the held direction, and toward 0 |
| AIR_ACCEL, AIR_DECEL | 8, 5 | the same in the air |
| RUN_REDUCE | 4 | the slow-down when faster than RUN_MAX in the held direction (after a dash) |
| GRAVITY, GRAVITY_APEX, APEX | 8, 4, 80 | gravity; half gravity while abs(vy) < APEX and JUMP is held |
| MAX_FALL | 352 | fall speed cap |
| JUMP_VY, VAR_JUMP | -224, 48 | jump speed; vy is held at JUMP_VY for up to 48 steps while JUMP is held |
| COYOTE, BUFFER | 24, 20 | late-jump grace after leaving ground; early-press grace before landing |
| DASH_SPEED, DASH_DIAG, DASH_STEPS | 448, 317, 40 | dash speed (diagonal per axis), 40 steps: 4.375 tiles straight |
| DASH_EXIT, DASH_EXIT_DIAG, DASH_COOLDOWN | 224, 158, 48 | speed left at the dash's end; steps before the next dash |
| WAVE_SPEED | 160 | the wave's speed on each axis: slope 1 (dx = dy), 9.375 tiles/s |
| RESPAWN_STEPS, LOCK_STEPS | 72, 24 | death to respawn 0.3 s; input ignored 0.1 s after a respawn |
| RUN_NUM / RUN_DEN | 1024 / 45 | gauntlet auto-run: x advances floor(g * 1024 / 45) sub after g beat-ticks, 4 tiles a beat exactly |

### 4.2 Reach table (measured on the oracle by tools/reach.mjs) [VL]

| move | reach |
|---|---|
| full jump, held to the apex | 3.442 tiles high, 156 steps (0.65 s) in the air |
| shortest hop (JUMP for one step) | 0.793 tiles high |
| running jump at RUN_MAX, same height | 6.703 tiles long |
| ground dash | 4.375 tiles |
| running jump with a dash at the apex | 11.143 tiles long |
| up dash from the ground | 5.113 tiles high |
| full jump, then an up dash at the apex | 8.635 tiles high |
| run | 10.313 tiles/s |
| wave | 9.375 tiles/s, slope 1 |
| gauntlet auto-run | 4 tiles a beat (9.333 tiles/s) |

Rooms are authored inside this table with a margin: no required jump is higher than 3 tiles or longer than 5.5 tiles at the same height; no required jump-and-dash is longer than 9 tiles; no required climb is higher than 4 tiles with a dash. Every room is also proven by its witness under the jitter test (section 5.4).

### 4.3 The step (sim.mjs `tick`)

One `tick(input)` advances one step, in this order:

1. A finished run, or a replay run (`stopAtClear`) whose start room is cleared, only counts the step.
2. A pending layer whose step has come is added to `layers`.
3. Presses are the input bits that were up on the previous step (`prevIn`); `prevIn` takes the raw input.
4. While dead, the death countdown runs; at 0 the creature respawns at its room's spawn and input is ignored for LOCK_STEPS.
5. While locked, input and presses read as 0.
6. A creature inside a solid (a beat block that came on over it) dies: the crush rule.
7. A JUMP press sets the jump buffer; otherwise the buffer counts down.
8. The form's movement: the base form (run, gravity, jump, variable jump, dash, move and collide), the wave (vy = -WAVE_SPEED while JUMP or UP is held, else +WAVE_SPEED; vx = WAVE_SPEED; a horizontal collision kills, a vertical one slides) or the gauntlet's auto-run.
9. Spikes (static, and beat spikes that are on) and falling below the room kill.
10. A wave portal cell turns the base form into the wave; a base portal cell turns the wave back.
11. The creature's right edge at or past the room's right edge clears the room.
12. The step counter advances.

Collision moves x, then y, against solid tiles and the beat blocks that are on, tile by tile, stopping flush against the first blocking tile. Columns left of the room and rows above it are solid; columns right of it and rows below it are empty (the exit and the fall).

### 4.4 Beat entities

A beat entity (a set of grid cells under one letter) is `spike` (a hazard with a direction) or `block` (a solid). It is bound to a layer L. While layer L is not back, it holds its `rest` state. Once L is back it is on when `(7 * step - phase * 180) mod (period * 720) < on * 180`: on for `on` sixteenths, starting `phase` sixteenths into each `period`-beat cycle. Periods are 1, 2, 4, 8 or 16 beats, so an entity's state repeats every `720 * period` steps (D3: gcd(7, 720p) = 1).

### 4.5 Progression

- Clearing room k (1 to 10) schedules layer k: it comes back on the first bar line at least one beat after the clear (`unlockBar`, `nextBarStep`), the same bar on which the audio unmutes it (X7).
- The creature then enters room k + 1 at its spawn; after room 10 it enters the gauntlet; after the gauntlet the run is finished and the ending plays.
- Death: the creature disappears for RESPAWN_STEPS and respawns at its room's spawn with input locked for LOCK_STEPS. The beat does not stop.
- The gauntlet: the run starts on the first bar line at least one beat after the creature enters or respawns (`gauntletStartBeat`); until then it stands on the start ledge. While running, x is set from the beat-ticks since the start (4 tiles a beat), so the creature reaches column LEAD + n exactly at gauntlet sixteenth n; JUMP jumps (no dash, no steering); any horizontal collision kills.

## 5. Rooms (N1: plain text, `hush-room 1`)

### 5.1 Format (normative source: tests/fixtures/oracle/world.mjs, `compileRoom`)

- LF only, ending with one LF. Line 1 `hush-room 1`; then `name NN-word[-word]`, `size W 18` (W 32 to 96), `spawn <col> <row>` (an empty tile with a solid tile under it), `layer <k>` (clearing the room returns layer k), `par <seconds>` (the first-run par, read by nothing in the sim); then zero or more `entity` lines; then `grid` and exactly 18 rows of W characters.
- `entity <a-z> spike <up|down|left|right> layer <L> period <p> phase <f> on <d> rest <on|off>` or `entity <a-z> block layer <L> period <p> phase <f> on <d> rest <on|off>`, with L 1 to 10, p one of 1, 2, 4, 8, 16 beats, f 0 to 4p - 1 sixteenths, d 1 to 4p - 1 sixteenths (section 4.4).
- Grid characters: `.` empty, `#` solid, `^ v < >` static spikes (pointing up, down, left, right), `W` wave portal, `B` base portal, `a` to `z` the cells of a defined entity. Every defined entity has a cell; the right column has an opening (the exit).
- Spike hazard boxes inside their tile, in sub, x0 y0 x1 y1: up 512 1536 3584 4096; down 512 0 3584 2560; left 1536 512 4096 3584; right 0 512 2560 3584 (constants.mjs `SPIKE_BOX`).
- The creature is placed with its box centred on the spawn tile and resting on the tile below: x = col * 4096 + 768, y = (row + 1) * 4096 - 2560.

### 5.2 The room graph

One area, a line: 01-wake, 02-heartbeat, 03-dash, 04-thorns, 05-doors, 06-wave, 07-current, 08-steps, 09-gates, 10-crown, then 11-gauntlet, then the ending. Each room is entered at its spawn and left through its right edge; the exit rows of one room meet the entrance rows of the next (a visual seam only: the sim starts each room at its spawn). Clearing room k returns layer k of the track, so room k is played with layers 1 to k - 1 back, and hazards bound to a layer that is not back hold their rest state.

### 5.3 The rooms, byte-exact

Each room file is the fenced block below it, every line ending with LF (the file ends with the LF after the last grid row). The executor transcribes each into `rooms/<name>.txt`; its sha256 must equal the one given here and in tests/data/content.sha256. Witness numbers are the spec session's own solve on the oracle (section 5.4); the executor's solve on the product sim must find a witness of its own.

#### 01-wake

- Teaches: run, jump, and the full jump held to the apex. Returns layer 1. Width 72 tiles. First-run par 30 s.
- Beat entities: none (no layer is back yet: the room is still).
- Intended solution: hold right; jump each spiked pit from its edge; hold jump to the apex for the 3-tile ledge; then the two pits in a row and the 2-tile step.
- Oracle witness: clear at step 1618 (6.7 s), 11 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `365143b5dd4fede44bd66eb9526b475080f546c766105e638893657a7f5f2abf`

```text
hush-room 1
name 01-wake
size 72 18
spawn 2 15
layer 1
par 30
grid
########################################################################
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#.......................................................................
#.......................................................................
#..............................###############..........................
#..............................###############...................#######
...............................###############...................#######
.............######....##############################....####....#######
###################^^^^##############################^^^^####^^^^#######
########################################################################
```

#### 02-heartbeat

- Teaches: platforms come and go on the beat. Returns layer 2. Width 80 tiles. First-run par 50 s.
- Beat entities: a and b: blocks on layer 1 (kick), period 2 beats, on 6 of 8 sixteenths, phases 0 and 4, rest on.
- Intended solution: wait on a stone until the next one is there, then hop; the second section climbs.
- Oracle witness: clear at step 1684 (7.0 s), 21 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `07c9ad95a4bafdabd1e028ac3c0fe1b0a1d721933d2800b7579729e57e7bb35a`

```text
hush-room 1
name 02-heartbeat
size 80 18
spawn 2 15
layer 2
par 50
entity a block layer 1 period 2 phase 0 on 6 rest on
entity b block layer 1 period 2 phase 4 on 6 rest on
grid
################################################################################
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
..............................................................aaaa..............
................................................................................
........................................................bbbb........bbbb........
#...........................................................................####
#...........aaaa..bbbb..aaaa..bbbb................aaaa......................####
#...........................................................................####
##########^^^^^^^^^^^^^^^^^^^^^^^^^^^^##########^^^^^^^^^^^^^^^^^^^^^^^^^^^^####
################################################################################
```

#### 03-dash

- Teaches: the dash: a gap a jump cannot cross, a wall a jump cannot climb. Returns layer 3. Width 80 tiles. First-run par 45 s.
- Beat entities: none (static).
- Intended solution: run, jump, dash right at the apex over each spiked gap; jump then dash up at the wall.
- Oracle witness: clear at step 1588 (6.6 s), 22 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `41346b87980073b0e78029f3805f8bbec1abfa3b18d826f164a9229b260f46c4`

```text
hush-room 1
name 03-dash
size 80 18
spawn 2 15
layer 3
par 45
grid
################################################################################
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#..............................................................................#
#...............................................................................
#...............................................................................
#...............................................................................
#......................................................................#########
.......................................................................#########
.......................................................................#########
..................................##############........######.........#########
#.................................##############........######.........#########
#.................................##############........######.........#########
#.................................##############........######.........#########
############^^^^^^^^^###########################^^^^^^^^######^^^^^^^^^#########
################################################################################
```

#### 04-thorns

- Teaches: spikes that rise on the beat. Returns layer 4. Width 72 tiles. First-run par 50 s.
- Beat entities: a and b: floor spikes on layer 1 (kick), period 2, on 2 of 8, phases 0 and 4, rest off; c: spikes on layer 3 (hat), period 1, on 1 of 4, rest off.
- Intended solution: in the low tunnel, wait beside each patch and cross it while its spikes are down; then hop the pillars between hat pricks.
- Oracle witness: clear at step 1408 (5.9 s), 25 input changes, 97 of 100 jittered runs on seeds 1 to 5.
- sha256 `cef55f078e4ecf5e36911d4c23326c1c10b0e46e9a0e22b6d2ac029f7d3f2ce0`

```text
hush-room 1
name 04-thorns
size 72 18
spawn 2 8
layer 4
par 50
entity a spike up layer 1 period 2 phase 0 on 2 rest off
entity b spike up layer 1 period 2 phase 4 on 2 rest off
entity c spike up layer 3 period 1 phase 0 on 1 rest off
grid
########################################################################
#.......#################################..............................#
#.......#################################..............................#
#.......#################################..............................#
#.......#################################..............................#
#.......#################################..............................#
........#################################..............................#
........#################################..............................#
........#################################..............................#
######..#################################..............................#
######..#################################................ccc...........#
######..#################################................###...........#
######..#################################.........ccc....###....ccc.....
######..#################################.........###....###....###.....
######..#################################.........###....###....###.....
######.....aaa.....bbb.....aaa.....bbb............###....###....###.....
########################################################################
########################################################################
```

#### 05-doors

- Teaches: doors that open on the beat, and waiting for them. Returns layer 5. Width 80 tiles. First-run par 65 s.
- Beat entities: a and b: doors on layer 2 (pad), period 8, on 16 of 32, phases 0 and 16, rest on; c: doors on layer 1 (kick), period 2, on 4 of 8, rest on.
- Intended solution: wait at each door, run through as it opens, jump the pits between.
- Oracle witness: clear at step 2222 (9.3 s), 30 input changes, 99 of 100 jittered runs on seeds 1 to 5.
- sha256 `135d5c5fb5700a6f8bc47d0c2d3c52cd8292dd2f31eb1ff37a78bd2f580f07ee`

```text
hush-room 1
name 05-doors
size 80 18
spawn 2 15
layer 5
par 65
entity a block layer 2 period 8 phase 0 on 16 rest on
entity b block layer 2 period 8 phase 16 on 16 rest on
entity c block layer 1 period 2 phase 0 on 4 rest on
grid
################################################################################
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
#.............a...........b.............a...............c.............c........#
..............a...........b.............a...............c.............c.........
..............a...........b.............a...............c.............c.........
..............a...........b.............a...............c.............c.........
..............a...........b.............a...............c.............c.........
##################^^^^^#######^^^^^#############^^^^^#######^^^^^###############
################################################################################
```

#### 06-wave

- Teaches: the evolution: the wave portal, rising while jump is held and falling when it is not. Returns layer 6. Width 80 tiles. First-run par 50 s.
- Beat entities: none (static).
- Intended solution: run into the portal; hold to rise over each floor pillar, release to dive under each ceiling pillar; the base portal returns the creature before the exit.
- Oracle witness: clear at step 1920 (8.0 s), 12 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `4e8f3bb7b662f3b87edfe97a6bcb0cda83843c2ad5ccf322cade83affefc642f`

```text
hush-room 1
name 06-wave
size 80 18
spawn 2 15
layer 6
par 50
grid
################################################################################
################################################################################
#......................##............##..........##..........##.......B........#
#......................##............##..........##..........##.......B........#
#......................##............##..........##..........##.......B........#
#......................##............##..........##..........##.......B........#
#......................##............##..........##..........##.......B........#
#................................................##..........##.......B........#
#.....................................................................B........#
#.....................................................................B........#
#.........W................................##..........##.............B........#
#.........W.....##............##...........##..........##.............B........#
..........W.....##............##...........##..........##.............B.........
..........W.....##............##...........##..........##.............B.........
..........W.....##............##...........##..........##.............B.........
..........W.....##............##...........##..........##.............B.........
################################################################################
################################################################################
```

#### 07-current

- Teaches: the wave against walls that close on the beat. Returns layer 7. Width 80 tiles. First-run par 60 s.
- Beat entities: a: floor spikes on layer 5 (clap), period 2, on 3 of 8, phase 4, rest off; b: walls on layer 4 (bass), period 4, on 8 of 16, rest on; c: wall on layer 6 (arp), period 2, on 4 of 8, phase 4, rest on.
- Intended solution: cross the clap spikes while they are down; enter the portal on the beat that brings each wall down as the wave reaches it.
- Oracle witness: clear at step 1943 (8.1 s), 10 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `a5144f3788c192e1deb474d14b10e43fdbbc62b31ba7960c7566dd3859625851`

```text
hush-room 1
name 07-current
size 80 18
spawn 2 15
layer 7
par 60
entity a spike up layer 5 period 2 phase 4 on 3 rest off
entity b block layer 4 period 4 phase 0 on 8 rest on
entity c block layer 6 period 2 phase 4 on 4 rest on
grid
################################################################################
################################################################################
#........................##.....b............##.....c...........b......B.......#
#........................##.....b............##.....c...........b......B.......#
#........................##.....b............##.....c...........b......B.......#
#........................##.....b............##.....c...........b......B.......#
#........................##.....b............##.....c...........b......B.......#
#...............................b............##.....c...........b......B.......#
#...............................b...................c...........b......B.......#
#...............................b...................c...........b......B.......#
#...........W...................b...................c...........b......B.......#
#...........W...................b...................c.....##....b......B.......#
............W.....##............b.....##............c.....##....b......B........
............W.....##............b.....##............c.....##....b......B........
............W.....##............b.....##............c.....##....b......B........
.....aaa....W.....##............b.....##............c.....##....b......B........
################################################################################
################################################################################
```

#### 08-steps

- Teaches: climbing on platforms that blink to two layers. Returns layer 8. Width 72 tiles. First-run par 50 s.
- Beat entities: a: blocks on layer 4 (bass), period 2, on 6 of 8, rest on; b: blocks on layer 7 (perc), period 4, on 10 of 16, phase 8, rest on.
- Intended solution: climb the stones as each appears, dashing up where the step is too high; descend the second set over the spikes.
- Oracle witness: clear at step 1494 (6.2 s), 22 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `c0c2d604394178ca965304cca592424856dfd1b0541056901ea84c37ba33cae6`

```text
hush-room 1
name 08-steps
size 72 18
spawn 2 15
layer 8
par 50
entity a block layer 4 period 2 phase 0 on 6 rest on
entity b block layer 7 period 4 phase 8 on 10 rest on
grid
########################################################################
#......................................................................#
#......................................................................#
#......................................................................#
#......................................................................#
#.......................................########.......................#
#.......................................########.......................#
#..................................aaa..########.......................#
#.......................aaa.............########..bbb..................#
#.......................................########........................
#.......................................########........aaa.............
#.................bbb.........bbb.......########........................
........................................########..............bbb...####
............aaa.........................########....................####
........................................########....................####
........................................########....................####
##########^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^########^^^^^^^^^^^^^^^^^^^^^^^^
########################################################################
```

#### 09-gates

- Teaches: gates, spikes and the wave in one room. Returns layer 9. Width 80 tiles. First-run par 65 s.
- Beat entities: a: gates on layer 7 (perc), period 4, on 8 of 16, rest on; b: floor spikes on layer 8 (lead), period 2, on 3 of 8, rest off.
- Intended solution: pass the gate when it opens and the spikes while they are down; wave through the pillars; then gates and spikes again.
- Oracle witness: clear at step 1905 (7.9 s), 9 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `a69c4e3e341d485d2157c086905e076786d005d50a4f988d631fe575878604b3`

```text
hush-room 1
name 09-gates
size 80 18
spawn 2 11
layer 9
par 65
entity a block layer 7 period 4 phase 0 on 8 rest on
entity b spike up layer 8 period 2 phase 0 on 3 rest off
grid
################################################################################
#.............................##..........##....B..............................#
#.............................##..........##....B..............................#
#.............................##..........##....B..............................#
#.............................##..........##....B..............................#
#.............a...............##..........##....B.........a........a...........#
#.............a...............##..........##....B.........a........a...........#
#.............a...............##..........##....B.........a........a...........#
#.............a...........................##....B.........a........a...........#
..............a.........W.......................B.........a........a...........#
..............a.........W...........##..........B.........a........a...........#
..............a.........W...........##..........B.........a........a...........#
########......a.........W...........##..........B.........a........a............
########......a.........W...........##..........B.........a........a............
########......a.........W...........##..........B.........a........a............
########......a..bbbb...W...........##..........B...bbbb..a..bbbb..a............
################################################################################
################################################################################
```

#### 10-crown

- Teaches: everything once more, the last room before the gauntlet. Returns layer 10. Width 96 tiles. First-run par 90 s.
- Beat entities: a and b: blocks on layer 1 (kick), period 2, on 6 of 8, phases 0 and 4; c: floor spikes on layer 5 (clap), period 2, on 3 of 8, phase 4, rest off; d: doors on layer 9 (open hat), period 4, on 8 of 16, phase 8, rest on; e: blocks on layer 10 (sub), period 4, on 8 of 16, rest on, so solid throughout this room (layer 10 returns only when it is cleared).
- Intended solution: stones over spikes, clap spikes, the door, the wave through pillars, then the stone over the last pit, the clap spikes on the ledge and the last door.
- Oracle witness: clear at step 2388 (9.9 s), 18 input changes, 100 of 100 jittered runs on seeds 1 to 5.
- sha256 `27fe4dce39213e763eac7ce67bed587d69d25d23a57fcec2d41fbe0dc7c1bfdc`

```text
hush-room 1
name 10-crown
size 96 18
spawn 2 15
layer 10
par 90
entity a block layer 1 period 2 phase 0 on 6 rest on
entity b block layer 1 period 2 phase 4 on 6 rest on
entity c spike up layer 5 period 2 phase 4 on 3 rest off
entity d block layer 9 period 4 phase 8 on 8 rest on
entity e block layer 10 period 4 phase 0 on 8 rest on
grid
################################################################################################
################################################################################################
#...............................d..............##........B...........................d.........#
#...............................d..............##........B...........................d.........#
#...............................d..............##........B...........................d.........#
#...............................d..............##........B...........................d.........#
#...............................d..............##........B...........................d.........#
#...............................d........................B...........................d.........#
#...............................d........................B...........................d.........#
#...............................d........................B...........................d.........#
#...............................d...W....................B...........................d.........#
#...............................d...W...............##...B...........................d..........
................................d...W....##.........##...B...................cccc....d..........
................................d...W....##.........##...B........eee....######################.
............aaaa..bbbb..........d...W....##.........##...B...............######################.
.........................cccc...d...W....##.........##...#######.........#######################
##########^^^^^^^^^^^^^^########################################^^^^^^^^^#######################
################################################################################################
```

### 5.4 How the rooms were proven [VL]

Every room was solved on the oracle by `node tools/solve.mjs <name> --sim tests/fixtures/oracle/index.mjs`, and every witness was replayed by `node tools/replay.mjs` with the jitter test on seeds 1 to 13: each cleared at least 97 of 100 runs on seeds 1 to 5 and at least 19 of 20 on each of seeds 6 to 13 (build/evidence/session/PF-ROOMS-witnesses.1.txt records seed 9). Authoring rules held: the entrance of every room is safe ground from which the player can wait for the beat; every beat hazard is shown one beat ahead by the art (section 10).

### 5.5 Pacing [I]

First-run time per room is modelled as: clean clear time + deaths x (half the clean clear + 0.3 s respawn + 1.5 s reorientation) + a look-and-learn pause (15 s in rooms that introduce a mechanic, 2 to 6; 10 s elsewhere). With deaths 2, 5, 5, 6, 6, 5, 7, 7, 8 and 10 in rooms 1 to 10:

| room | clean clear | deaths | first run |
|---|---|---|---|
| 01-wake | 6.7 s | 2 | 27.1 s |
| 02-heartbeat | 7.0 s | 5 | 48.6 s |
| 03-dash | 6.6 s | 5 | 47.2 s |
| 04-thorns | 5.9 s | 6 | 49.3 s |
| 05-doors | 9.3 s | 6 | 62.8 s |
| 06-wave | 8.0 s | 5 | 52.0 s |
| 07-current | 8.1 s | 7 | 59.0 s |
| 08-steps | 6.2 s | 7 | 50.6 s |
| 09-gates | 7.9 s | 8 | 64.1 s |
| 10-crown | 9.9 s | 10 | 87.7 s |

Rooms: 548 s. The gauntlet: one clean pass is 59.5 s; five failed attempts dying halfway on average, each with up to 1.8 s to the restart bar, then one clean pass: 217 s. Calibration about 25 s and the ending to its card about 20 s. Total about 13.5 minutes, inside 10 to 15. The par lines in the room files sum to 555 s. X11 measures the real number on the friends' first runs.

## 6. The gauntlet (`hush-gauntlet 1`)

### 6.1 Format and generator (normative source: world.mjs `parseGauntlet`, `generateGauntlet`)

- Line 1 `hush-gauntlet 1`, line 2 `name 11-gauntlet`, line 3 `bars 32`, line 4 `melody` and 16 scale degrees (the arp layer's `n` values), then one line per bar, `bar <b> <rest|base|wave>`, b counting up from 0 to 31. A base bar may carry `kick=`, `clap=` and `hat=` masks of 16 characters (`x` an obstacle on that sixteenth, `.` none).
- The grid is 4 + 16 x 32 + 28 = 544 columns by 18 rows: rows 0 and 1 and rows 15 to 17 solid, column 4 + 16b + s for sixteenth s of bar b. Obstacles: clap, one floor spike `^` at row 14; kick, two floor spikes side by side at row 14; hat, one hanging spike `v` at row 11. A wave bar is a corridor 5 rows tall centred on row 12 - floor(degree / 2) for each sixteenth, solid above and below between rows 2 and 14. When a bar's form differs from the previous non-rest bar, a portal column (`W` into a wave bar, `B` out of it) fills rows 2 to 14 two columns before the bar starts. The spawn is column 4, row 14.
- Every mask bit is an onset of its layer in the track, and the melody is the arp layer's degree sequence: tests/rooms/gauntlet-pattern.test.mjs proves both on music/area1.strudel through tools/strudel-node.mjs, so the obstacles are built from the pattern.

### 6.2 Run rules

- The run starts on the first bar line at least one beat after the creature enters or respawns; the track restarts its pattern at cycle 0 on that bar line (the audio maps cycle = bar - start bar while the gauntlet runs), so obstacle n meets the music's sixteenth n.
- The creature auto-runs 4 tiles a beat; JUMP jumps (base form) or rises (wave); there is no dash and no steering; a horizontal collision kills. At the right edge the run is finished and the ending begins.

### 6.3 The file, byte-exact

- sha256 of the file `a36b5857995fd76a18753c5f5f7cb6b68b00a668c6e506c728b9d778b831db49`; sha256 of the generated grid (the 18 rows joined by LF with a final LF) `47afe44931b2d2d5efe21e68b380edaffda62807e02aecea9da858f29aeb5944`.
- Oracle witness: clear at step 14278 (59.5 s), 125 input changes, 100 of 100 jittered runs on seeds 1 to 5.

```text
hush-gauntlet 1
name 11-gauntlet
bars 32
melody 0 2 4 7 9 7 4 2 0 2 4 7 11 9 7 4
bar 0 rest
bar 1 base clap=....x.......x...
bar 2 base clap=....x.......x...
bar 3 base clap=....x.......x...
bar 4 base clap=....x.......x...
bar 5 base clap=....x.......x...
bar 6 base clap=....x.......x...
bar 7 base clap=....x.......x...
bar 8 base kick=x.......x.......
bar 9 base kick=x.......x.......
bar 10 base kick=x.......x.......
bar 11 base kick=x.......x.......
bar 12 base kick=x.......x.......
bar 13 base kick=x.......x.......
bar 14 base kick=x.......x.......
bar 15 base kick=x.......x.......
bar 16 wave
bar 17 wave
bar 18 wave
bar 19 wave
bar 20 wave
bar 21 wave
bar 22 wave
bar 23 wave
bar 24 base clap=....x.......x...
bar 25 base clap=....x.......x...
bar 26 base clap=....x.......x...
bar 27 base clap=....x.......x...
bar 28 base kick=x.......x.......
bar 29 base kick=x.......x.......
bar 30 base kick=x.......x.......
bar 31 base kick=x.......x.......
```

## 7. The track (music/area1.strudel, N5 synth-only)

The track is improvised here (grill B5: the owner rules the music after he walks the world). 140 BPM (`setcpm(140/4)`, one cycle a bar), C minor, ten labelled lines in unlock order; layer k is the k-th label. Synths only: superdough's `sbd`, `triangle`, `square`, `sawtooth`, `sine`, `white` and `pink`; no samples, no worklet synths (`supersaw` and `pulse` are not used).

| layer | label | sound | onsets in a bar (sixteenths) | returns after |
|---|---|---|---|---|
| 1 | kick | sbd | 0 4 8 12 | 01-wake |
| 2 | pad | triangle chords, 4-bar cycle | 0 | 02-heartbeat |
| 3 | hat | white noise | 0 2 4 6 8 10 12 14 | 03-dash |
| 4 | bass | sawtooth, low-passed | 1 3 5 6 9 11 13 15 | 04-thorns |
| 5 | clap | pink noise | 4 12 | 05-doors |
| 6 | arp | triangle, C minor degrees | all 16 | 06-wave |
| 7 | perc | square, euclid (5,8) | 0 4 6 10 12 | 07-current |
| 8 | lead | sawtooth stabs, 4-bar cycle | 0 6 12 | 08-steps |
| 9 | ohat | white noise, off-beat | 2 6 10 14 | 09-gates |
| 10 | sub | sine, 4-bar cycle | 0 | 10-crown |

Every beat-bound hazard names its layer in its room file (section 5.3); the hazards move on their layer's own grid (period and phase in beats and sixteenths), so a clap-bound spike rises on the clap.

- sha256 `73b130603622a06546f66e16138893e37b902ea9fb9c3c9d3e757447ec569d72` (tests/data/content.sha256).

```text
// The Hush - area 1 - ten layers in C minor, one back with every room
setcpm(140/4)

kick: s("sbd*4").decay(.3).gain(.85)
pad: note("<[c3,eb3,g3] [ab2,c3,eb3] [f2,ab2,c3] [g2,b2,d3]>").s("triangle").attack(.5).release(1.2).lpf(1600).gain(.14)
hat: s("white*8").decay(.03).hpf(8000).gain(.16)
bass: note("<c2 ab1 f1 g1>").struct("~ x ~ x ~ x x ~ ~ x ~ x ~ x ~ x").s("sawtooth").lpf(480).decay(.16).sustain(0).gain(.32)
clap: s("~ pink ~ pink").decay(.08).hpf(1500).gain(.28)
arp: n("0 2 4 7 9 7 4 2 0 2 4 7 11 9 7 4").scale("C4:minor").s("triangle").decay(.1).sustain(0).gain(.18)
perc: note("c5(5,8)").s("square").decay(.035).hpf(2000).gain(.1)
lead: note("<g4 eb4 f4 d4>").struct("x ~ ~ x ~ ~ x ~").s("sawtooth").lpf(2400).decay(.22).sustain(0).gain(.1)
ohat: s("~ white ~ white ~ white ~ white").decay(.12).hpf(6000).gain(.1)
sub: note("<c1 ab0 f0 g0>").s("sine").attack(.04).release(.5).gain(.28)
```

