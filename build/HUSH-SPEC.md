# HUSH-SPEC: The Hush v1

The build specification for The Hush v1, cut by the spec session (Opus standing in for Fable) and read by the executor (phase 2) and the producer (phase 3). It makes every design decision; the executor makes none. Where this spec and a prompt disagree on a design value, this spec wins; where it is silent, the item is `blocked (needs-design)`.

STATUS: draft, not cut. The sections below are settled and verified where they say so; the items, the hand-walk and the handoff are not written yet. No executor may start: there is no `HUSH-SPEC: READY` line and no JHON-GO.

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
