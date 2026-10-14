# HUSH-SPEC: The Hush v1

The build specification for The Hush v1, cut by the spec session (Opus standing in for Fable) and read by the executor (phase 2) and the producer (phase 3). It makes every design decision; the executor makes none. Where this spec and a prompt disagree on a design value, this spec wins; where it is silent, the item is `blocked (needs-design)`.

STATUS: sections 1 to 18 written; every verifier in section 15 exists and caught its planted failure (build/SPEC-PROGRESS.md, PF-CONTROLS). The spec is cut when its last line reads `HUSH-SPEC: READY (items=<N>)`, and no executor may start before the owner's JHON-GO binds that cut's digest in build/GATES.md. `node tools/spec-content.mjs --check` proves every byte-exact block against tests/data/content.sha256.

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

### 1.6 Amendments (phase 3, by the producer, Opus standing in for Fable; each one's disposition is in build/HUSH-FIXLOG.md)

- 2026-10-12, CAL2 (blocked green-before-edit): its acceptance passed on GAME1's tree before any edit (build/evidence/CAL2.red.1.txt), because the flash probe's `--calibration` run only waited for the scene `calibration` to be left and GAME1's first key leaves it at once. The probe now wants the calibration's course seen (section 12's check, tools/calibration-check.mjs), controlled on the control page, whose calibration scene became section 12's reference; section 12 now fixes the timeline, the shapes, the matching of taps and the hand-over, so that the port takes no decision.
- 2026-10-12, RN1 to RN4 and END1 (blocked by dep, amended before they ran): the art items' acceptance, `npm run check:art` (flash and perf), only grows easier as art is missing, so it would have passed before any edit as CAL2's did, and sections 10 and 13 left the shapes' numbers, the bake's size, the creature's track, the limiter's use and the ending's motion open, which the executor may not decide. The art is now the producer's reference, tests/fixtures/reference/art.mjs (section 10.6), which the items port; each acceptance first runs its item's art test (tests/render, red while the module is missing), then the flash and perf probes as before. The warning pulse became 0.45 and 0.25 (a step under LUM_STEP), the second band got its own colour, the glow moved into each accent shape, the dust and the ending's light are seeded, and END1's run line reads the step kept at the finish.
- 2026-10-12, review R1 (cycle 1; build/reviews/REVIEW-R1.md, dispositions in build/HUSH-FIXLOG.md), the verifier part. The product matched every Action, but mutations of shipped behaviour survived every test of their area.
  - X7's clear-time unlock in the run: the playthrough gains the check `unlock`. Rooms 1 to 10 are each cleared by their witness with no restart until that layer's bar line, and the gate must read 0 before it and 1 after it (control page: ?unlock=late, early, none). tests/game/run.test.mjs drives the run's wiring with a fake engine: unlockAt(k, unlockBar(s)) once per clear, and gauntlet(gBeat / 4) on the entry from room 10 and on every respawn there. It is controlled by tests/fixtures/reference/run.mjs and joins test:av.
  - The calibration's measurement: the flash probe's --calibration mode adds a tapped run. The probe's tapper presses 40 ms after each click of pass A and 25 ms after each ring of pass B, and the values in use must be 15 and 25 within 5 ms. The untouched run's count-in window is 7 to 9 fills (control page: ?calib=flip, ?calib=count3).
  - The ending's text guard runs to the end of the rise (control ?ending=mid).
  - Three thresholds of the clock line and the transport's shift amount are pinned.
  - X3's jitter seed comes from the verdict digest instead of HEAD's sha.
- 2026-10-12, review R1, AU2 and GAME1 (MAJOR 1, its third part): the transport reports its gauntlet mapping (`startBar`) and the engine's status carries it (`gauntletBar`), so the unlock check can see that the run maps the gauntlet's track from gBeat / 4 at its entry from room 10 and at a respawn. tests/audio/scheduler.test.mjs pins the getter (control: a getter stuck at -1), and the predicate's control is tests/tools/probe-lib.test.mjs.
- 2026-10-12, review R1, GAME1 (MINOR 4): a run started at the gauntlet lost its first sixteenth in the av probe, because the bake's 150 ms frame ran past the 0.1 s origin lead and the 50 ms late window. The lead becomes 0.25 s (section 8.4), pinned by tests/game/run.test.mjs (control: a lead of 0.1 s).
- 2026-10-12, review R1, RN4 (MAJOR 3): the play scene's beat binding had no test; play-scene.ts could draw the hazards 24 steps ahead of their collision with every check green. The scene's frame becomes the reference's pure `playFrame` (section 10.6, "The frame"). It reads the sim's step and fields itself, is ported into src/render/play-frame.ts and is compared frame by frame over every witness run (tests/render/play-frame.test.mjs; control: the beat entities 24 steps ahead).
- 2026-10-12, review R1, END1 (MAJOR 4): the card's beat binding had no test; ending-scene.ts could count the beat from its own first frame with every check green. The scene's frame becomes the reference's `endingFrame(heard, t0, run)`, with `beatOfBar(heard, run.origin)` inside it. It is ported into ending-art.ts and compared frame by frame (tests/render/ending-art.test.mjs; control: the beat counted from t0 + 0.2 s).
- 2026-10-12, review R2 (cycle 1; build/reviews/REVIEW-R2.md, dispositions in build/HUSH-FIXLOG.md), the tests part. The product matched every Action again, and R1's fixes held. The gaps had moved one step out: from the tested shape lists and values to the code that applies them. No product file changes.
  - drawShapes (section 10.6) is pinned call by call: tests/render/draw-shapes.test.mjs, a recording fake Graphics against tests/fixtures/reference/draw.mjs. It joins RN1's acceptance; the controls are an ellipse at half size and a flat triangle.
  - The run's calibration (section 9.1) is pinned in tests/game/run.test.mjs: setCalibration(a, b) moves the sim's target by displaySec(a) and an event's step (stepOf) by inputLagSec(a, b).
  - The creature's track (section 10.6) is pinned too: run.track() equals trackStep over every tick of a witness run. The reference run gains the calibration, stepOf and the track; the controls are displaySec(0), inputLagSec(0, 0) and no track step.
  - tests/render/play-frame.test.mjs plays rooms 1 and 6 on past their layer's return, so the ring is compared; the control is the ring one world px up.
  - CAL1's trim is seen on the spread: an asymmetric pass has MAD 5, not 10. The control is tests/fixtures/calibration/untrimmed.mjs.
  - Two item lines are brought up to date with R1's changes: CL1's test count and END1's text guard.
- 2026-10-12, review R2, the probes part. tools/probe-play.mjs gains two checks, each optional (the control page has no bake and no keys), named in GAME1's and END1's acceptances and in npm test. Their predicates are controlled in Node (tests/tools/probe-lib.test.mjs). Each one also failed the reviewer's own mutants, built in a scratch copy (build/evidence/R2-mutant-*.amend.*.txt).
  - `scene`: in every room, half-way through its witness, the play scene's display list against section 10.6 at the sim's creature's camera. Through the ending, the glimpse rising to rest at y 0 by the card.
  - `keys`: on a page of its own, the hand-over skipCalibration(100, -60) must start a run at room 1. Then real keys pressed through the browser must reach the sim on the steps stepOf names (section 9.2), with the sim standing where displaySec puts it.
  - The tapped calibration of section 12 is judged against the values its logged taps give, not against the tapper's intended offsets, so late page timers cannot fail a correct scene. After its hand-over, a run at room 1 must be running.
- 2026-10-12, review R3 (cycle 1; build/reviews/REVIEW-R3.md, dispositions in build/HUSH-FIXLOG.md), the tests part. The product matched every Action again, and R2's fixes held. No product file changes.
  - The clock line's stale-pair rule is reached: the scenario 'stale pairs after a resume' starts its device at 2000 ms, so its 900 ms old stamps are positive and meet the rule (tests/clock/output-clock.test.mjs; control: CLOCK_STALE 5000).
  - The limiter's edge is pinned: a change whose area is exactly 25,600 px is held, one of 25,599 px passes (tests/fx/flash-limiter.test.mjs, 4 tests; control: `>` for `>=`).
- 2026-10-12, review R3, the calibration part (MINOR 5 and 6). No product file changes.
  - The calibration check presses Escape before its first key and wants nothing started.
  - The tapper also taps the count-in, presses Escape three times in every attempt, and spreads its counted taps (section 12). A scene that admits a count-in tap or takes Escape as a tap then gives values off the taps' own.
  - The marks the taps' values are held to become the spread's medians, 5.5 and 34.5.
  - Controls on the control page: ?calib=escape and ?calib=nowindow.
- 2026-10-12, review R3, the mix part (MINOR 4). No product file changes.
  - The av probe reads the speakers' chain as the page built it (section 8.4): the analyser, the master gain at 0.8, the compressor's five values, the ten gates.
  - Every other input of the speakers must be silent by construction. The first run of the check found six such inputs on the product: superdough's timers at gain 0 and its unfed output. Hence that rule, instead of "one input".
  - Control: the control page with ?av=master-low.
- 2026-10-13, review R4 (cycle 1, BLOCKED on battery; build/reviews/REVIEW-R4.md, dispositions in build/HUSH-FIXLOG.md), the calibration's retry and the run's cap (MAJOR 2, MINOR 2). No product file changes.
  - The flash probe's `--calibration` mode gains a retried run (section 12): the tapper leaves each pass's first attempt untapped, so the scene must repeat both passes and use the repeats' values. A scene that keeps a pass's first result fails it (control page: `?calib=first`; the reviewer's product mutant fails it too).
  - tests/game/run.test.mjs pins the run's own 24-step cap (section 9.1): a frame heard 100 steps past the sim ticks exactly 24. The control is a reference run without the cap.
- 2026-10-13, review R4, the sound part (MAJOR 1). No product file changes.
  - Nothing checked when a sound is handed to superdough: every note of the track 0.1 s late, or every calibration click 0.1 s after its mark, passed every test. Now, under ?probe, src/probe/api.ts records every start of a source node with the layer gate it plays into (section 8.4, `starts()`).
  - The av probe holds every voice start to an onset of its own layer in the run that handed it over, within -1 to +6 ms, and wants every onset started (section 8.4). So a layer played through another layer's gate fails too.
  - The calibration check holds every click of every pass-A attempt to its mark within 1 ms, in all three runs (section 12).
  - Controls: the control page with `?av=late`, `?av=swap` and `?calib=clicklate`. The reviewer's two product mutants fail, and so does a third: the orbits into rotated gates.
- 2026-10-13, review R5 (cycle 1's sixth round granted by the owner; build/reviews/REVIEW-R5.md, dispositions in build/HUSH-FIXLOG.md), the frames' time (MAJOR 2). No product file changes.
  - The sim's step and the ending's card were held to the heard music only within 80 to 100 ms: a sim 50 ms behind the music, and a card 80 ms late, passed every test.
  - The play scene's frame log now carries each frame's heard time and the run's origin, read by a PRE_STEP listener that runs after the driver's. The scene check holds each frame's step to section 9.1's, within one step (tools/scene-check.mjs `stepTimingProblems`).
  - An ending log records every frame of the scene `ending` with the heard time at prestep and poststep. Every card frame whose bracket holds no beat line must draw that beat's card (`endingTimingProblems`).
  - Controls: in Node (tests/tools/scene-check.test.mjs), and the reviewer's two product mutants, which fail.
- 2026-10-13, review R5, the calibration's pictures (MAJOR 1) and its pages (NOTE 2). No product file changes.
  - The calibration's rings and count-in fills were counted in the screencast but never timed. frameTimes 100 ms after the frames that drew their rings, every ring drawn 100 ms late, and every count-in fill 100 ms late each passed CAL2's acceptance; the first two move every player's display offset by 100 ms.
  - Under ?probe, src/probe/api.ts now logs every frame of the scene `calibration` between Phaser's prestep and poststep: the performance and heard times at both ends, the attempt live at each end, and every Graphics as drawn (`calibLogTake`).
  - tools/calibration-check.mjs `calibFrameProblems` holds every attempt of all three runs to section 12. The key is filled exactly in the count-in's sixteenths, the ring shows exactly in each ring's sixteenth, each frameTimes[i] is the frameMs of the first frame that drew ring i, and the pictures are section 12's in Phaser 4.2.1's encoding.
  - The flash probe's three calibration pages also want no console or page error, no other origin and nothing stored (X5 and X10 over the real scene).
  - Controls: the control page with `?calib=ringlate`, `?calib=filllate` and `?calib=frametime`, and one page that plants a storage write, a console error and a foreign request. In Node, synthetic frame logs (tests/tools/calibration-check.test.mjs). The reviewer's three product mutants fail too.
- 2026-10-13, review R3, the scene part (MAJOR 1 and 2, MINOR 3). No product file changes.
  - The `scene` check read where each image and Graphics sits, never what it draws, so an empty bake or an undrawn list passed with every test green.
  - It now reads what is drawn (sections 10.6 and 13, tools/scene-check.mjs). Every frame of every room's run is replayed on the reference, and its full frames are compared command for command in Phaser 4.2.1's encoding: the beat entities through the limiter frame by frame (MINOR 3), the ring, the creature, the dust and the camera. Every bake's pixels are read against its shapes. Through the ending, the ceiling and the card on the music's beat are compared, and the glimpse's pixels are read.
  - The play scene's field `run` is pinned, as the calibration scene's `attempt` is, so the probe reads the view the frame drew from.
  - Controls: tests/tools/scene-check.test.mjs, and eleven browser mutants of the product, each failing for its own fault.
- 2026-10-12, END1 (blocked suspect-check, its first block of its own): the playthrough probe read the page texts 1.5 s after the gauntlet, while section 13 shows the run line when the card appears, RISE_S (6.857 s) into the ending, and no control had ever run the probe's `?playtest` branch, so the check could neither pass a conforming ending nor show that it catches a wrong one. The probe now waits for the scene `ending`, wants no page text in the first half of the rise, and reads the texts once the card is up: 3 s after the rise, and under `?playtest` as soon as the run line shows (at most 6 s after the rise), the line's time lying between the last room's clear step and the step seen when the ending began (section 13 keeps the step at the finish), its deaths the sim's. It also counts text objects at the end of every room, because the play scene's objects are destroyed when the ending starts. The control page gained section 13 at small scale with five planted faults: no hand-over, no line under `?playtest`, a line without it, a line before the card, a line from the card's step. Section 13 itself is unchanged.
- 2026-10-13, audit 1 (cycle 2; build/reviews/AUDIT-1.md, dispositions in build/HUSH-FIXLOG.md), the deploy's controls (MAJOR 1) and the dry run's remote (MINOR 4). No product file changes.
  - tests/controls/deploy.test.mjs could not run since CT1. Its copy re-extracted the rooms and the track that the tree now tracks, and spec-content --extract never overwrites, so every case stopped before deploy.mjs ran. The copy now extracts a content file only when the tree lacks it, and each case that reaches the gate has the time of a full X1 to X10 run on the copy.
  - A dry run publishes only to an existing local bare repository. Any other `--remote`, a URL or the origin included, is refused before anything runs. Control: a new case, red on the old deploy.mjs.
- 2026-10-13, audit 1 (cycle 2), the third-party notices (MINOR 3). No product file changes: the bundle is byte for byte the same and the page's text is unchanged.
  - The published bundle carried Phaser (MIT) and, inside @strudel/web's prebuilt bundle, code such as acorn and fraction.js (MIT) and escodegen (BSD-2-Clause), and no notice of any of them.
  - The build now writes THIRD-PARTY-NOTICES.txt into dist beside index.html (tools/notices.mjs, a Vite plugin in vite.config.ts; section 15). It covers every package of the runtime dependency tree as installed: package.json's dependencies, followed by Node's lookup through each package's own dependencies and installed optional dependencies. That is 62 packages today, 55 names. Each package's name, version and licence id stand above the licence text it ships: its LICENSE, LICENCE or COPYING files and any NOTICE file, read from node_modules at build time. Packages that ship the same text share one copy, 19 texts today. Nothing links the file.
  - A package that ships no licence file gets the standard text of its licence id when that id is MIT or ISC, the holder from its package.json author with any email or URL left out, or "the authors of <name>" when nothing else is left (today @tonaljs/progression, chord-voicings and jazz-midi). The build fails on any other licence id with no file, on a dependency that is not installed, and on a module in the bundle whose package lies outside the tree. Today the bundle's package files are Phaser's and @strudel/web's. The bundler's own injected helpers (Rolldown's runtime and Vite's modulepreload polyfill, about 1.5 KB) are virtual modules of the build tools, not packages of the tree, and are not listed.
  - X10 (tools/probe-supply.mjs) gains the row `notices`. The file in dist must name every runtime package of the lockfile as `- <name>@<version> (<licence>)`, with the lockfile's own licence id. Runtime means an entry that is neither dev nor devOptional and, when optional, installed. The row reads the lockfile apart from the plugin's walk of node_modules, so the two must agree.
  - The file carries one third-party email, in the copyright line of nanostores 0.11.4's LICENSE. check-public masks that one address by its sha256 (tools/public-patterns.mjs), as it masks escodegen's, and finds nothing else in the built dist.
  - Controls. tests/tools/notices.test.mjs runs 14 tests on fixture trees, on the Vite plugin in a fixture project and on the repo's own file, which must pass check-public while an address not listed is still found; each of 11 planted faults fails it in a scratch copy. In tests/controls/page-probes.test.mjs, a build without the file and a file that leaves Phaser out each fail X10. In tests/controls/deploy.test.mjs, the first case wants the file on gh-pages. [VL: build/evidence/AUDIT1-notices-*.amend.1.txt, AUDIT1-supply-controls.amend.1.txt and AUDIT1-deploy-controls.amend.2.txt]

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

## 8. Audio (D5; src/audio/)

### 8.1 One Strudel bundle

- Strudel comes from `@strudel/web` and from nothing else, as `import * as S from '@strudel/web'`. Its npm dist is one prebuilt bundle carrying its own copy of every Strudel package and of superdough; importing `superdough` or `@strudel/core` beside it makes a second engine that never sees the AudioContext [VL: the control page, tests/fixtures/control-page/audio.js, plays through `@strudel/web` alone]. From the bundle the product uses `Pattern`, `transpiler`, `miniAllStrings`, `setAudioContext`, `registerSynthSounds`, `superdough` and `getSuperdoughAudioController`. Never `initStrudel()`, `samples()`, `loadWorklets()` or a CDN.
- The bundle inlines escodegen's package.json, so every build carries one third-party email (escodegen's public maintainer contact) to gh-pages; check-public masks exactly that address by its sha256 (tools/public-patterns.mjs). Nothing else in the built page trips check-public [VL: the deploy dry runs of PF-CONTROLS]. Since audit 1 (MINOR 3) dist also carries THIRD-PARTY-NOTICES.txt, whose copy of nanostores 0.11.4's LICENSE holds its author's public address; check-public masks that one address by its sha256 too, and finds nothing else in the built dist [VL: build/evidence/AUDIT1-notices-public.amend.1.txt].

### 8.2 Start

- The first `keydown` that is not Escape (a window listener in the capture phase, removed after it fires) calls `engine.start()`, which creates `new AudioContext({ latencyHint: 0.1 })` and calls `ctx.resume()` inside that same handler (CP V6), then `S.setAudioContext(ctx)`, `S.miniAllStrings()`, the orbit patch, the graph of 8.4, `compileTrack(trackText, S)` and `S.registerSynthSounds()`. A rejection of the registration counts one voice error.
- The track text is `music/area1.strudel`, imported by Vite as text (`?raw`).

### 8.3 Modules

- **src/audio/track.ts** `compileTrack(code, S)`: the labelled-layer capture of Vault City's `compileRoom` (city-audio.js:330-349), with the Strudel namespace passed in. It replaces `S.Pattern.prototype.p` for the call with a capture: label `$` becomes `$1`, `$2` in order; a label starting with `_` is muted (not captured); a repeated label keeps its first pattern; every other label is captured once, in file order. The code is transpiled with `S.transpiler(code, { addReturn: false, emitMiniLocations: false, emitWidgets: false })` and run as `Function(...names, '"use strict";' + output)` over the namespace plus no-op `setcpm`, `setcps`, `hush` and `evaluate` (names: every key matching `^[A-Za-z_$][\w$]*$` except `eval`, `arguments` and `default`); `p` is restored in a `finally`. Returns `{ names, layers }`. The reference is tests/fixtures/reference/audio.mjs `compileTrack`.
- **src/audio/scheduler.ts** `createTransport(layers, play)`: the transport of city-audio.js:586-651 without bus logic. Constants `SIXTEENTH = 60 / 140 / 4`, `BAR = 16 * SIXTEENTH`, `CPS = 140 / 60 / 4`, `LOOKAHEAD = 0.12`, `LATE = 0.05`. State: `origin`, the next step `next`, the gauntlet start bar (`-1` none), counters `scheduledVoices`, `voiceErrors`, `lateShifted`, `lateDropped`. Step `n` is sixteenth `n % 16` of bar `floor(n / 16)`; its cycle is the bar, or `bar - startBar` from the start bar on. `tick(now)`: first, while `origin + next * SIXTEENTH < now - LATE`, every onset of that step is counted in `lateDropped` and `next` advances; then, while `origin + next * SIXTEENTH < now + LOOKAHEAD`, for each layer i (layer number i + 1) the haps of `queryArc(cycle + s/16, cycle + (s+1)/16)` with an onset become notes `{ layer, value, time: origin + (bar + whole.begin - cycle) * BAR, duration: (whole.end - whole.begin) * BAR, cycle: whole.begin }`; a value that is not an object is skipped; a note with `time < now` is dropped (`lateDropped`) when `time < now - LATE`, else moved to `now + 0.005` (`lateShifted`); every other note goes to `play(note)` and counts in `scheduledVoices`; a `queryArc` that throws counts one `voiceErrors` and that layer gives nothing for the step. `restart(origin, startBar = -1)` sets the origin, the step to 0 and the mapping; `gauntlet(startBar)` changes only the mapping; the getter `startBar` reads the mapping's start bar, -1 for none (amended for review R1, MAJOR 1); `voiceError()` counts one; `counters()` returns a copy. The reference is tests/fixtures/reference/audio.mjs `createTransport`.
- **src/audio/gates.ts**: `unlockTime(origin, bar) = origin + bar * BAR`; `openAt(param, t)`: `setValueAtTime(0, t - 0.005)` then `linearRampToValueAtTime(1, t)`; `setMask(params, mask, now)`: for gate i (layer i + 1) `cancelScheduledValues(now)` then `setValueAtTime(mask has bit i + 1 ? 1 : 0, now)`.
- **src/audio/engine.ts** `createAudioEngine(trackText)`: the browser wiring: the start of 8.2, the graph of 8.4, the orbit patch, one transport over the compiled layers whose `play` calls `S.superdough({ ...note.value, orbit: note.layer }, note.time, note.duration, CPS, note.cycle)` and counts a rejection through `voiceError()`; the transport ticks every 25 ms on `setInterval` and on the ticker Worker of city-audio.js:626-651 (a Blob Worker posting every 25 ms; the scheduler runs on its message only when the interval has been quiet for 60 ms); the device clock (section 9) is sampled every 7 ms and by the driver every frame. `click(time)` plays `{ s: 'sbd', decay: 0.08, gain: 0.8 }` on orbit 11, the calibration orbit, wired straight into the compressor.

### 8.4 Graph [VL: the control page, av probe green]

- Per layer k (1 to 10): superdough orbit k, patched to play into the layer's gate `GainNode` (gain 0 until layer k is back) instead of the speakers: the controller's `getOrbit(n, channels)` is wrapped so that, the first time orbit n is made, `controller.output.connectToDestination` is a no-op during the original call and the orbit's `output` is connected to gate n (orbit 11 to the compressor). Then one `DynamicsCompressorNode` (threshold -10, knee 6, ratio 4, attack 0.005, release 0.12), the master `GainNode` (0.8), one `AnalyserNode` (fftSize 2048, smoothingTimeConstant 0), `ctx.destination`. Nothing bypasses the analyser.
- The av probe reads this chain as the page built it (review R3, MINOR 4). Under ?probe, src/probe/api.ts wraps `AudioNode.prototype.connect` and `disconnect` before the first key and keeps the edges into the speakers, analysers, compressors and channel mergers, and out of compressors and mergers (`audioGraph()`).
  - The master analyser must feed the speakers, with fftSize 2048 and smoothing 0, fed by the master gain at 0.8, fed by the compressor with the values above.
  - Every layer gate must be an input of the compressor, with at most one other input (the calibration orbit).
  - Every other input of the speakers must be silent by construction. superdough connects two kinds there: its timers' zero gains, and its own output, a merger into a gain that no patched orbit feeds. Anything else would bypass the analyser.
- The av probe also times every sound (review R4, MAJOR 1). Under ?probe, src/probe/api.ts wraps the `start` of AudioScheduledSourceNode and of AudioBufferSourceNode (which declares its own) before the first key, and keeps every call it passes on (`starts()`).
  - Each record holds the node's type, its `when` (the context time at the call when the argument is 0, absent or past), the context time at the call, and the transport's origin then.
  - It also holds the layer the node plays into, read from every live edge between nodes once the voice is built (a 0 ms timer after the call). The layer is k when every path out of the node meets gate k first, 0 when it reaches the speakers through no gate (the calibration orbit), -1 when it reaches neither, and -2 for more than one way out.
  - A voice start is an OscillatorNode's or an AudioBufferSourceNode's start asked for ahead of the call (tools/probe-lib.mjs `isVoiceStart`). superdough's ConstantSourceNodes (its timers and DC offsets) and the nodes it starts at once (an FM modulator, the reverb's player) are not voices.
  - Every voice start from the probe's first run on (tools/probe-av.mjs `judgeStarts`) must belong to a layer gate. It must lie within [t - 1 ms, t + 6 ms] of an onset t of its own layer in the run whose origin was in force at the call, or be the transport's late shift of such an onset (section 8.3; at most twice the transport's `lateShifted` such starts).
  - Every onset of every layer from 0.3 s into its run until the run ended must have a voice start of its layer. A voice that cannot sound (layer -1) starts nothing.
  - On this laptop the product's voice starts lie exactly on their onsets [VL: build/evidence/R4-av-product.amend.1.txt].
- All ten layers are scheduled from the start, into their gates, so the graph is never idle: the device-clock line held within 0.2 ms peak to peak through silent rooms on this laptop, and with no note at all [VL]; it jumped about 100 ms only in faulted graphs.
- `origin`, the context time of sim step 0, is `ctx.currentTime + 0.25` when a run starts (`startRoom`; amended for review R1, MINOR 4, from 0.1: the room's bake in the frame after a start held the main thread up to 150 ms for the gauntlet, and the transport drops a sixteenth more than 50 ms late, so 0.1 s could lose the run's first notes). A gate opens with `openAt(gate.gain, unlockTime(origin, unlockBar(clearStep)))`, the bar line the sim's `nextBarStep` names (section 4.5), so the music and the hazards return together (X7).
- The gauntlet: when the sim's `gBeat` changes in room 11 (entry and every respawn), the engine calls `transport.gauntlet(gBeat / 4)`: the pattern starts again at cycle 0 on the run's start bar (section 6.2).

### 8.5 Ported from Vault City (read-only source; these functions and only these, CP §3)

| Vault City | The Hush | what it keeps |
|---|---|---|
| city-audio.js:93-167 `resetOutputClock`, `clockLine`, `sampleOutputClock` and the constants at 93 | src/clock/output-clock.ts | the device-clock line: 1 s of `getOutputTimestamp` pairs, the upper envelope, settling, stale pairs, trusted pairs, resync, the fallback after 3 s (D4); the spec's own port, tests/fixtures/control-page/clock.js, is the reference |
| beat.js:38-46 `audibleTime` | src/clock/output-clock.ts `audibleSec` | performance time to heard context time through the line |
| city-audio.js:203-210 `layerNames`, 330-349 `compileRoom` | src/audio/track.ts | the labelled-layer capture |
| city-audio.js:271-283 the orbit patch | src/audio/engine.ts | each orbit into its gate, never straight to the speakers |
| city-audio.js:399-412 `ensureLayer` (without the duck), 495-500 `lowTo` | src/audio/gates.ts | per-layer gate gains ramped on a bar line |
| city-audio.js:448-492 `play`, `scheduleBus` (without withhold phases, quiet signal bars and sustained re-entry), 586-651 `scheduler`, `startClock`, `stopClock` and the Worker ticker | src/audio/scheduler.ts, src/audio/engine.ts | the 25 ms transport, notes handed over 0.12 s ahead, late notes shifted within 0.05 s and dropped beyond it |

Not ported: the twelve rooms and their fx, timeline density, the bridge grammar, risers, cuts, withhold phases, the silent clock, reverb and delay sends, the hit ring.

### 8.6 Visibility

- `visibilitychange` to hidden: `ctx.suspend()`. The driver ticks only while `ctx.state === 'running'` and the line is valid (section 9.1), so the sim stops. Visible: `ctx.resume()`; the line starts again on its own (its reset on a context that runs again) and the run continues where it stopped. The playthrough probe's `visibility` check proves both [VL on the control page].

## 9. Clock and input (D4, D6)

### 9.1 The tick driver (src/clock/driver.ts)

- `MAX_STEPS_PER_FRAME = 24`; `stepsDue(simStep, target) = min(max(target - simStep, 0), 24)`; `targetStep(heardSec, origin, displaySec) = floor((heardSec - origin + displaySec) * 240) + 1`; `displaySec(avOffsetMs) = clamp(-avOffsetMs / 1000, -0.15, 0.15)`; `inputLagSec(avOffsetMs, inputBiasMs) = clamp((avOffsetMs + inputBiasMs) / 1000, 0, 0.15)`; `alpha(heardSec, origin, displaySec, simStep) = clamp((heardSec - origin + displaySec) * 240 - simStep + 1, 0, 1)`. The reference is tests/fixtures/reference/driver.mjs.
- Every animation frame, only while the context runs and the line is valid: `heard = audibleSec(clock, frameMs)`, then up to `stepsDue(sim.step, targetStep(heard, origin, displaySec))` ticks; before each tick at step s the input is `source ? source.next(s) : keys.next(s)`. The sim always ends one step past the heard time, and the render draws `prev + (curr - prev) * alpha` between the states before and after the last tick.

### 9.2 Keys (src/input/keys.ts)

- `KEY_BITS`: the table of section 3. `createKeys({ target, stepOf })` adds `keydown` and `keyup` listeners on `target` (the window) in the capture phase. A code not in the table is ignored and not prevented. A mapped code calls `preventDefault()` (so Space never scrolls); a repeat is then skipped; else `{ code, down, step: stepOf(event.timeStamp) }` is queued. `next(step)` applies, in arrival order, every queued event whose step is at most `step` (adding or removing its code from the held set) and keeps the rest; it returns the attached source's `next(step)` when one is attached, else the OR of the bits of the codes held. `attachSource(s)` attaches (`null` detaches); `held()` returns the bits held; `detach()` removes the listeners. The reference is tests/fixtures/reference/keys.mjs.
- The run's `stepOf(t) = floor((audibleSec(clock, t) - origin - inputLagSec) * 240)`.
- Phaser's input stays off (D1).
- The playthrough's check `keys` (review R2, MAJOR 4 and 5) proves the path from the window to the sim. It hands over with avOffset 100 and inputBias -60, so every key lands about 14 steps ahead of the sim and is applied on the very step stepOf names.
  - Each key, as the page saw it, carries its time stamp, the clock line's offset and the sim's step. When it arrives, the sim must stand at most at targetStep(its heard time, origin, displaySec(100)) and no more than 24 steps behind it.
  - Every state read while the keys are pressed and after must equal the oracle's replay from the state before, each key applied on max(stepOf, the sim's step when it arrived). The same replay without the keys must differ.
  - Room 1 has no beat entities, so a run that stamps every key with the same wrong lag ends in the same state once the creature stands still. Only the reads taken while it moves can show the lag.

## 10. Render and art (D8, D17; src/render/)

### 10.1 Canvas, scenes and camera

- Phaser 4.2.1, `type: Phaser.WEBGL`, `parent: 'game'`, 1280 by 720, `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`, `fps: { limit: 0 }`, `audio: { noAudio: true }`, `input: { keyboard: false, mouse: false, touch: false, gamepad: false, windowEvents: false }`, `banner: false`, `backgroundColor: '#07080d'`, no physics. Scenes by key: `calibration` (first), `play` (rooms and the gauntlet), `ending`.
- The world view is 32 by 18 tiles (512 by 288 world px), drawn at zoom 2.5. A room 32 tiles wide is framed whole; a wider room scrolls horizontally: camera x = clamp(creature centre - 256, 0, room width - 512) world px, from the interpolated creature position. The gauntlet frames the creature 160 world px from the left edge. No vertical scroll.
- No Phaser Text or BitmapText object ever exists; the probe counts them (D8).

### 10.2 Palette

| use | hex |
|---|---|
| background | #07080d |
| far fog band | #1a2233 |
| mid band | #121826 |
| near band | #0b0e16 |
| tile fill | #161b28 |
| tile edge | #2a3348 |
| static spikes | #4a556e |
| accent: the creature's wave form, portals, beat entities that are on | #7fd6ff |
| beat entity off (outline only) | #7fd6ff at alpha 0.25 |
| the one-beat warning outline | #7fd6ff at alpha 0.45 and 0.25, alternating each sixteenth (a luminance step of 0.077, under LUM_STEP, so the pulse is never a flash; amended 2026-10-12) |
| the second band from the back, between far and mid (amended 2026-10-12) | #161d2c |
| creature body | #10131c |
| creature shell | #e8ecf4 |
| dust motes | #c8d0e0 at alpha 0.3 |
| the ending's glimpse | #2b3a55 with a single warm light #ffd27f |

- Static spikes stay within 0.1 of the background in relative luminance (#4a556e: 0.091 against 0.0025), because a full-width row of pale spikes scrolling at run speed is a general flash over 25% of the field: 29,538 canvas px for #c8d0e0, 0 px for #4a556e, on the flash probe (the control page's `?scroll`, a control of tests/controls/flash-probe.test.mjs) [VL]. Spikes read by shape and by their place in the pits.
- No saturated red anywhere (D10's red-flash rule then cannot trip).

### 10.3 Shapes

- Static geometry (solid tiles, static spikes, portal frames) is baked once per room into one `DynamicTexture` on entry (CP §1: 5.9 ms once, then 0.4 ms a frame).
- Solid tiles: fill #161b28; every edge between a solid and an empty tile drawn 1 world px #2a3348.
- Spikes: three triangles per tile filling the hazard box (section 5.1), #4a556e.
- Beat blocks: on, filled #7fd6ff at alpha 0.85 with the glow stroke; off, outline at alpha 0.25; in the beat before turning on, the outline at alpha 0.5 pulses each sixteenth (the one-beat warning).
- Beat spikes: up (on), drawn as static spikes in #7fd6ff; down (off), a flat bar of the same width at alpha 0.25; the beat before rising, the bar pulses.
- Portals: a column of the portal's cells, outlined #7fd6ff, one chevron in its middle pointing right (wave portal) or one ring (base portal).
- The creature, base form: a body circle of radius 5 world px #10131c, a shell #e8ecf4 over its top half as a crescent with two short horns, two eye dots #07080d; it squashes 10% on landing for 6 steps. Wave form: an isosceles triangle 10 by 10 world px in #7fd6ff pointing along its motion (up-right or down-right), with a trail of its last 8 positions (every 2 steps) at alpha falling from 0.5 to 0.
- Death: the creature bursts into 8 dots that fade over the 72 respawn steps; the respawn is a ring shrinking onto the spawn over 12 steps.

### 10.4 Depth, fog and glow

- Four parallax bands behind the room, factors 0.15, 0.35, 0.6 and 0.85, each a procedural silhouette (arches, pillars and hanging roots from a seeded xorshift32 PRNG, seed = room number), baked once per room, in the band colours of 10.2; the far bands blend toward the fog colour.
- Fog: a vertical gradient over the bands (alpha 0.0 at the top, 0.35 at the bottom). A smoothstep vignette darkens the corners (baked once).
- 60 dust motes drift (seeded), 1 world px dots in #c8d0e0 at alpha 0.3.
- Glow is one cheap pass: accent shapes drawn twice, a 3 world px stroke at alpha 0.25 under the 1 px shape. Never the Glow or Bloom filter (D8, CP §1). Each accent shape carries its own glow in the reference (section 10.6): the portal frames (RN1), the wave (RN2), the beat blocks that are on (RN3).
- A layer's return: one ring expands from the creature over one bar to 120 world px, alpha at most 0.2.
- Every beat-driven change of brightness goes through the flash limiter (section 11): each change of a beat entity's fill level asks it (section 10.6); the warning pulse (0.077) and the layer's ring (at most 0.045 above the background) stay under LUM_STEP by construction and never ask.

### 10.5 Performance budget (D17)

The 1280 by 720 backing canvas, one baked texture per room, additive strokes and no filters keep a frame well inside 16.7 ms (CP §1: an empty scene 4.2 ms and 300 dynamic shapes 6.5 ms on this laptop). The control page holds 60 fps with every interval at 20 ms or less, headed on this laptop's GPU [VL: PF-CONTROLS-perf]. X4 is measured headed by the perf probe; every art item re-runs it (`npm run check:art`).

### 10.6 The art reference and the scene's assembly (amended 2026-10-12, section 1.6)

- Normative source: tests/fixtures/reference/art.mjs. Every shape of sections 10.1 to 10.4 and 13, with every number and every PRNG draw, is a pure function there that returns a list of shapes in canvas px. The product ports each function with the same name, arguments and result into src/render/room-art.ts (RN1), creature.ts (RN2), beat-art.ts (RN3), depth-art.ts (RN4) and ending-art.ts (END1), and tests/render/*.test.mjs compare product and reference list for list (rendered: the room, the creature, the doors, the wave, the gauntlet and the ending were drawn from the reference and looked at before this amendment). Where the prose of sections 10 and 13 and the reference differ, the reference wins.
- `src/render/art.ts` (RN1) holds the shared values (`ZOOM`, `TILE_PX`, `VIEW_W`, `VIEW_H`, `COLOR`, `LINE_PX`, `GLOW_PX`, `GLOW_ALPHA`), the `Shape` type (the union of the reference's shape kinds) and `drawShapes(g: Phaser.GameObjects.Graphics, shapes: Shape[], dx = 0, dy = 0)`, which draws a list in order, each shape by one call, offset by (dx, dy): rect `fillStyle(c, a)` then `fillRect(x, y, w, h)`; tri `fillStyle` then `fillTriangle` over the six numbers of `p`; poly `fillStyle` then `fillPoints(points, true)`; ellipse `fillStyle` then `fillEllipse(x, y, 2 * rx, 2 * ry)`; ring `lineStyle(lw, c, a)` then `strokeCircle(x, y, r)`; frame `lineStyle` then `strokeRect(x, y, w, h)`; line `lineStyle` then `strokePoints(points, false)`; outline `lineStyle` then `strokePoints(points, true)`; `points` being plain `{ x, y }` objects made from the pairs of `p` (cast to the Graphics' point type). The art modules import Phaser for types only (`import type`), so Node tests them. tests/render/draw-shapes.test.mjs records every call drawShapes makes on a fake Graphics and wants exactly these, in list order, with the offset (review R2, MAJOR 2; reference tests/fixtures/reference/draw.mjs).
- The play scene's layers, back to front, by Phaser depth: the four bands 0 to 3 (far to near), the fog 4, the room's chunks 5, the beat entities and the layer's ring 6, the creature 7, the dust 8, the vignette 9.
- Baking: `this.textures.addDynamicTexture(key, w, h)`, one Graphics made off the display list (`this.make.graphics({}, false)`) drawn through `drawShapes`, then the texture's `draw(graphics)` and `render()`, the Graphics destroyed, and one Image with origin (0, 0) showing the texture. On entering a room (the run's room differs from the one baked, or a run starts) the scene destroys the previous room's images and textures and bakes the new ones: each chunk of `bakeChunks(room)` from `roomShapes(room, col0, col1)` at its own size, key `room-<NN>-<i>`, shown at `(col0 * 40 - camPx, 0)` (RN1); each band of `depthBands(room)` at its world size (`w` by 288), key `band-<NN>-<b>`, shown at `(-Math.round(factor * camPx), 0)` with scale ZOOM (RN4). The fog (`fogShapes()`, key `fog`) and the vignette (`vignetteShapes()`, key `vignette`) are baked once, 1280 by 720, when the scene is created and shown at (0, 0) (RN4). `<NN>` is the room number with two digits, `<i>` and `<b>` the chunk and band index.
- Every frame: `camPx = cameraPx(room, centreX)`, `centreX` being the interpolated creature centre in world px (`ix / 256 + 5`, from the run's view); the chunk and band images take their x; three Graphics are cleared and redrawn: the beat entities with the ring (depth 6, RN3), the creature (depth 7, RN2), the dust (depth 8, `moteShapes(field, sim.step)` with the field of `moteField(room)` made on entering the room, RN4).
- The frame (amended for review R1, MAJOR 3). From RN4 on, everything of the paragraph above and of the two below is one call of the reference's pure `playFrame({ room, sim, view, track, field, levels, limiter })` (tests/fixtures/reference/art.mjs), ported into src/render/play-frame.ts.
  - Each frame the scene calls `limiter.beginFrame()`, then `f = playFrame({ room, sim: run.sim, view: run.view(), track: run.track(), field, levels, limiter })`.
  - It sets every chunk and band image's x from `f.camPx`, keeps `f.levels` for the next frame and draws `f.beat` (the beat entities, then the ring; depth 6), `f.creature` (7) and `f.dust` (8). It draws nothing else.
  - The sim's step and its fields (`layers`, `form`, `vy`, `facing`, `dead`, `lock`, by FIELDS name) are read inside playFrame, so every hazard is drawn at the step the sim collides on, and a test can see it (tests/render/play-frame.test.mjs).
- The creature's track (RN2): the run (src/game/run.ts) holds `createTrack()` from every `startRoom` on and, after every tick, sets it to `trackStep(track, state)`, the state being the sim's `save()` read by FIELDS name (`step`, `x`, `y`, `form`, `grounded`, `dead`, `layers`); `run.track()` returns it (pinned by tests/game/run.test.mjs over witness runs through a layer's return; review R2, MINOR 2). The creature is drawn from `creatureShapes({ step: sim.step, x: ix / 256, y: iy / 256, form, vy, facing, dead, lock }, run.track(), camPx)`, the last five read from `save()` by FIELDS name.
- The beat entities (RN3): one flash limiter for the scene (`createFlashLimiter(1280, 720)`, section 11) with `beginFrame()` at the top of every frame; `beatShapes(room, sim.step, layers, camPx, levels, limiter)` with the `levels` it returned the frame before (an empty list on entering a room), `layers` read from `save()`; then `ringShapes(run.track(), sim.step, cx, cy)`, (cx, cy) the creature's centre in canvas px (`centreX * 2.5 - camPx`, `(iy / 256 + 5) * 2.5`).
- Until RN2 and RN3 land, GAME1's plain drawing stands in for the creature and the beat entities on one Graphics at depth 6, drawn with `camPx`.
- The placement is checked where it takes effect (review R2, MAJOR 1). The playthrough's check `scene` reads the play scene's display list (src/probe/api.ts `layout`) with the sim's state in one page read, in every room half-way to its witness's clear (tools/probe-lib.mjs `playLayoutProblems`).
  - Every image must be one of this paragraph's bakes, each with its key, size (a texture may be one px over an odd size), origin (0, 0), y 0, scale and depth, visible and opaque, and none other.
  - The chunks and the bands must sit at the camera of the first chunk, and that camera must be cameraPx(room, the creature's centre) within 5 px, one step's motion.
  - The Graphics must sit at depths 6, 7 and 8, unmoved, with the creature's and the dust's holding commands.
- What the scene draws is checked too (review R3, MAJOR 1 and MINOR 3; tools/scene-check.mjs). The scene keeps the run it is constructed with in its field `run`, which the probe reads as it reads the calibration scene's `attempt` (section 12).
  - The frames. Under `?probe`, src/probe/api.ts logs every frame of the play scene at Phaser's `poststep`, once every scene's update has drawn it: the sim, its room and its step; and every fourth frame from a bake, up to 48 of them, the sim's state, the run's view as the frame read it, the first chunk's x and each Graphics' command buffer (numbers rounded to 1e-4). The playthrough starts the log in the same page call as each run's play(), follows a cleared room until its layer is back and its ring has been drawn for 300 ms, and takes the log before the next run starts (the last run's once the ending has been watched).
  - The judge replays the run from its start on the oracle (the witness's inputs until the room is left, then none), steps the reference track after every tick, and replays every logged frame in order through the reference's playFrame: the levels from [] at every bake and carried frame to frame, through the reference limiter begun every frame. On a full frame the live state must equal the replay, the view must hold the creature's box at this step and at the step before or this one, the first chunk must sit at -camPx, and the Graphics at depths 6, 7 and 8 must hold exactly the commands drawShapes leaves for `f.beat`, `f.creature` and `f.dust` in Phaser 4.2.1 (fillPoints and strokePoints closing with a LINE_TO, fillEllipse as 32 points, strokeCircle one ARC, strokeRect four two-point paths), within 1e-3. At least 10 full frames per run.
  - The bakes. In the half-way read the probe reads pixels of every bake of the room (each chunk and band, and once the fog and the vignette) through DynamicTexture.snapshotPixel, the bytes as stored (premultiplied alpha). The points: one per grid cell of a chunk (the centre of a solid, empty or entity cell, the centroid of a static spike's middle triangle, a portal's left frame stroke), a 40 px grid and a point inside each shape of a band, the fog's strips and the vignette's cells; a point is kept only a pixel or more from every shape's edge (strokes are judged only along their straight middle, rings never). Each must equal the bake's reference shapes composited there over transparent, within 3 levels a channel.
  - Controls: tests/tools/scene-check.test.mjs (every shape kind's encoding; a log drawn as the reference passes, while the beat entities undrawn, the creature 40 px down, the camera elsewhere, levels not kept, a limiter never begun again, a live state off the replay, a restart, an empty log, too few full frames, a blank or foreign bake and an unreadable texture each fail), and in the browser, pages built from the product with one planted fault each, while the product's own run passes: the reviewer's four (the beat entities undrawn, a blank chunk, the gauntlet's chunks drawn from column 0, the creature 40 px down), MINOR 3's two (no beginFrame, the levels not kept), the ring undrawn, a band and the fog baked empty [VL: build/evidence/R3-mutant-*.amend.2.txt; the product: build/evidence/END1.amend.6.txt].

## 11. The flash rule (D10; src/fx/flash-limiter.ts)

- Full-field changes happen at most once a beat: the layer-return ring and the death and respawn effects are the only large-area changes and none repeats faster than a beat.
- Anything faster stays small: the combined area of everything flashing more than three times a second stays under 25% of a 10-degree field, taken as 2.78% of the screen (WCAG's 341 by 256 at 1024 by 768): 25,600 canvas px at 1280 by 720.
- The limiter: `FLASH_AREA_LIMIT = 25600`, `LUM_STEP = 0.1`; `createFlashLimiter(canvasW, canvasH)` returns `beginFrame()` and `request(areaPx, fromLum, toLum)`. A change under 0.1 passes uncounted. A larger one adds `areaPx * (1280 * 720) / (canvasW * canvasH)` to the frame's sum and passes, unless the sum would reach the limit or a request of this frame already did: then it returns `fromLum + sign(toLum - fromLum) * 0.099` (a change under 0.1). `beginFrame()` starts a frame from zero. The reference is tests/fixtures/reference/flash-limiter.mjs. "Reach" includes equality: a change whose area alone is 25,600 px, as each of room 2's stones is, is held in every frame (pinned for review R3, MINOR 2).
- The flash probe measures general and red flashes separately over every room, the gauntlet, the calibration and the ending's first seconds (X6; tools/flash-analyzer.mjs states the predicate).

## 12. Calibration (D9; src/input/calibrate.ts and the calibration scene)

- Wordless, memory only (no storage of any kind). At most four attempts of about 10.6 s each: about 21 s when both first attempts are accepted, about 42 s when every attempt is rejected.
- The math: `judgePass(offsetsMs)`: with fewer than 10 taps, `{ median: 0, mad: 0, taps, accepted: false }`; else drop the lowest and the highest tap, `median` of the rest (the mean of the two middle values when even), `mad` the median of the absolute deviations from it, `accepted = mad <= 35`. `calibrate(a, v)`: `medianA = a.accepted ? a.median : 0`, `medianV = v.accepted ? v.median : 0`, `avOffset = medianA - medianV`, `inputBias = medianV` (CP §4). The reference is tests/fixtures/calibration/reference.mjs.
- The scene (amended 2026-10-12, section 1.6). Its reference is the `Calibration` scene of tests/fixtures/control-page/control.js without `?calib`: the product does what it does, with the product's engine, `judgePass` and `calibrate` (src/input/calibrate.ts) and `audibleSec` (src/clock/output-clock.ts).
  - Constants: `BEAT = 60 / 140` s, `SIXTEENTH = BEAT / 4`, `LEAD = 0.5` s, `CLICKS = 24`, `COUNT_IN = 4`, `TAIL = BEAT / 2`, `LOOKAHEAD = 0.12` s.
  - The key shape: a rounded rectangle of 80 by 80 canvas px at x 600, y 320 (centred on the 1280 by 720 canvas), radius 14, a 3 px stroke #7fd6ff at alpha 0.8, drawn from `create()` on and never removed while the scene is up. Filled, it is the same rectangle filled #7fd6ff at alpha 0.6 under the stroke.
  - The ring: a circle of radius 50 canvas px centred on (640, 360), a 3 px stroke #7fd6ff at alpha 1 (100 px across, a small area, section 11).
  - The scene's own window `keydown` listener (capture phase) ignores Escape and `event.repeat` and never calls `preventDefault`. The first key it sees calls `engine.start()`; every later key during an attempt is a tap (below). The scene removes the listener on `shutdown`, and from then on hands nothing more to the engine.
  - The calibration begins on the first frame after `engine.start()` has resolved at which the context's state is `running` and `engine.clock()` is valid. Every decision is taken in the scene's `update()`, from `frameMs = performance.now()` read once at its top and `heard = audibleSec(engine.clock(), frameMs)`.
  - An attempt of pass A (audio): on its first frame, `t0 = ctx.currentTime + LEAD`; click i (0 to 23) sounds at `t0 + i * BEAT` and is handed to `engine.click(t0 + i * BEAT)` in the first frame in which that time is earlier than `ctx.currentTime + LOOKAHEAD`, never sooner (a scene left early leaves at most one click behind). The key shape is filled in every frame with `t0 + i * BEAT <= heard < t0 + i * BEAT + SIXTEENTH` for some i below COUNT_IN, the count-in. A tap records `h = audibleSec(engine.clock(), event.timeStamp)` when `h >= t0 + (COUNT_IN - 0.5) * BEAT`. The attempt ends on the first frame with `heard >= t0 + 23 * BEAT + TAIL`: each recorded h is matched to the nearest of clicks 4 to 23 (ties to the earlier) and gives `(h - click) * 1000` ms, and the attempt's result is `judgePass` of those offsets.
  - An attempt of pass B (visual), silent: on its first frame, `p0 = frameMs + LEAD * 1000`; flash i (0 to 23) is due at `d_i = p0 + i * BEAT * 1000`. The ring is drawn in every frame with `d_i <= frameMs < d_i + SIXTEENTH * 1000` for some i, and the `frameMs` of the first frame that draws flash i is its `frameTime_i`. The key shape is never filled in pass B. A tap records `event.timeStamp` when it is at least `p0 + (COUNT_IN - 0.5) * BEAT * 1000`. The attempt ends on the first frame with `frameMs >= p0 + (23 * BEAT + TAIL) * 1000`: each recorded tap is matched to the nearest `frameTime_i` among flashes 4 to 23 that were drawn (ties to the earlier; a tap with none is dropped) and gives `tap - frameTime_i` ms, and the attempt's result is `judgePass` of those offsets.
  - The order: A1; A2 only if A1 was rejected; B1; B2 only if B1 was rejected. Each attempt begins on the frame after the previous one ended. `calibrate(a, v)` takes the last attempt of each pass, so a pass rejected twice counts 0. Then the scene hands over through `onDone(avOffset, inputBias)`, main.ts's `skipCalibration`: the values in use (`Inspect.calibration`), `run.setCalibration`, the scene `calibration` stopped, `play` started and `startRoom(1)`; `displaySec` and `inputLagSec` (section 9) follow from them.
- X8: synthetic taps at known offsets return both within 5 ms; a run with a deviation over 35 ms is rejected (tests/input/calibrate.test.ts). The trim shows on the spread: [-50, -10, -10, 0, 0, 0, 0, 10, 10, 50] has median 0 and MAD 5 (review R2, MINOR 1).
- The scene's check (CAL2's acceptance, VERIFY): `node tools/probe-flash.mjs --calibration` first presses Escape and wants, 1.5 s later, no audio started and the scene `calibration` still waiting (review R3, MINOR 5: Escape is never a key, sections 3 and 8.2). It then presses one key the game ignores and lets the calibration run untouched, so every attempt is rejected. It wants (tools/calibration-check.mjs) the scene up at least 39.4 s after that key (four attempts of 23 beats), 44 to 52 clicks on the master analyser (A1 and A2: 48), in the screencast's box around the key shape 7 to 9 large pulses (the 8 count-in fills; amended for review R1: a count-in of 3 or 5 cannot pass) and 44 to 52 small ones (the 48 rings of B1 and B2), and then the values 0 and 0 in use, before every room is played and measured as before.
- The tapped run (amended for review R1, MAJOR 2), on a page of its own after the rooms:
  - The probe presses one key, then `__hush.tapCalibration(40, 25)` (src/probe/api.ts) taps a key the game ignores. Each tap lands after a click of pass A in heard time and after a ring of pass B in performance time, for clicks and rings 4 to 23. Amended for review R3 (MINOR 5 and 6):
    - The taps spread in a fixed pattern: 21 to 59 ms after the clicks (every odd ms once, 40 at the median) and 25 to 44 ms after the rings (every 1 ms, 34.5 at the median; a ring's tap is placed only once the frame that drew it is seen, so never sooner than 25 ms).
    - The count-in's clicks and rings 0 to 3 are tapped too.
    - Escape is pressed 200 ms after clicks and rings 6, 10 and 14 of every attempt, logged apart from the taps (`tapLog().escapes`).
    - A scene that counts a count-in tap or takes Escape as a tap then moves a median by a step or more of the spread, and its values leave the taps' own.
    - The log must show 4 count-in taps and 3 Escapes in every attempt, so the check never passes a scene it did not put to the test.
  - Both first attempts are then accepted, so the scene must be left 19 to 30 s after the key. Amended for review R2 (MINOR 3): the values in use must equal, within 0.5 ms, the ones section 12 gives for the taps the tapper actually landed (tools/calibration-check.mjs `tapLogValues`).
    - The tapper logs each tap's time stamp, its heard time and the attempt that was up, and each attempt's t0, p0 and frameTimes (src/probe/api.ts `tapLog`).
    - Those taps must give values within 15 ms of 5.5 and 34.5 (the spread's medians; 15 and 25 before review R3), or the run is refused as strayed. So a page whose timers ran late judges a correct scene by its own taps.
    - After the hand-over, a run at room 1 must be running (MAJOR 4).
  - The tapper reads the scene's field `attempt`, which this section pins: null between attempts; for pass A `{ pass: 'A', t0, ... }` with t0 the context time of click 0; for pass B `{ pass: 'B', p0, frameTimes, ... }` with frameTimes[i] the frameTime_i above. The product and the control page already keep it so.
- The retried run (review R4, MAJOR 2), on a third page after the tapped one. The probe presses one key, then `__hush.tapCalibration(40, 25, true)`: the tapper leaves the first attempt of each pass untapped, its three Escapes still pressed, and taps the repeats as the tapped run does.
  - So A1 and B1 must be rejected, and the scene runs A1, A2, B1 and B2. It must be left 39.4 to 50 s after the key.
  - The values in use must equal, within 0.5 ms, those section 12 gives from the last attempt of each pass for the taps the tapper landed (tapLogValues), within 15 ms of 5.5 and 34.5.
  - The log must show no tap in each pass's first attempt, 4 count-in taps in the others, and 3 Escapes in every attempt. A run at room 1 must follow the hand-over.
  - A scene that keeps a pass's first result (0 and 0 here) cannot pass.
- The clicks' starts (review R4, MAJOR 1), in all three runs. The untouched run watches the scene's attempts without touching them (`__hush.watchCalibration()`, into `tapLog().attempts`); the tapped and retried runs take the tapper's log. The page records every start (section 8.4, `starts()`).
  - A click is a voice start that reaches the speakers through no layer gate (layer 0: the calibration orbit).
  - In every pass-A attempt, each click i (0 to 23) must have a click start within 1 ms of `t0 + i * BEAT`. Every click start from half a beat before t0 to half a beat after click 23 must sit on one of those marks (tools/calibration-check.mjs `clickStartProblems`).
  - So a click that sounds off the mark the scene judges taps by cannot pass. Starts are matched by time, never through the analyser's click count (review R4, NOTE 1).
- The pictures' time (review R5, MAJOR 1), in all three runs. `watchCalibration` and `tapCalibration` also start the scene's frame log, read by `__hush.calibLogTake()` (src/probe/api.ts). It holds every frame of the scene `calibration`: performance.now() and the heard time read at Phaser's prestep and at its poststep, between which the scene reads its own frameMs and heard time; the attempt live at each end, as its index in `tapLog().attempts`; and every Graphics as drawn (its visibility, alpha and command buffer).
  - A frame is drawn for the attempt live at its poststep. An attempt's last frame and the frames between attempts are drawn for none: they show the key plain and no ring.
  - Every Graphics that shows holds nothing, or one of this section's pictures in Phaser 4.2.1's encoding at alpha 1: the key shape plain or filled, or the ring (tools/calibration-check.mjs `CALIB_DRAW`). The key shape shows in every frame.
  - Pass A: the key is filled in a frame exactly when `t0 + i * BEAT <= heard < t0 + i * BEAT + SIXTEENTH` for some i below COUNT_IN, and no ring shows.
  - Pass B: the ring shows exactly when `d_i <= frameMs < d_i + SIXTEENTH * 1000` for some i, and the key stays plain. Each frameTimes[i] lies in its window and in the bracket of the first frame that drew ring i, or is null when no frame drew it.
  - A frame whose bracket holds a window's edge is not judged, nor one whose heard time could not be read at either end (the scene then decides nothing). Each attempt must have 200 frames judged, pass A's with 8 of them filled and pass B's with 48 showing the ring (`calibFrameProblems`).
  - So a ring, a fill or a frameTime off the time the scene judges taps by cannot pass.
- The pages (review R5, NOTE 2). Each of the three calibration pages is read once its scene is left. It must have logged no console or page error, asked no origin but its own, and stored nothing (X5 and X10 over the real scene, through tools/probe-lib.mjs `storageReport` and `originViolations`, as the playthrough reads them).
- Its controls are tests/controls/calibration-probe.test.mjs. The control page passes both runs. Each of these fails for its own reason: a scene the first key leaves at once, one that never repeats, pass A without clicks, pass B without rings, pass A without its count-in, pass A's tap offsets with their sign flipped (the tapped run), a count-in of 3 beats (the fills), and (review R3) Escape taken as a key (`?calib=escape`: the audio starts on it, and it counts as a tap) and taps counted during the count-in (`?calib=nowindow`), and (review R4) a pass that keeps its first result (`?calib=first`, on the retried run's values) and clicks handed over 0.1 s after their marks (`?calib=clicklate`, on their starts), and (review R5) rings drawn 0.1 s after their windows while frameTimes keep them (`?calib=ringlate`), count-in fills 0.1 s after their clicks (`?calib=filllate`) and frameTimes 0.1 s after the frames that drew their rings (`?calib=frametime`), each on its frames alone, and pages that log a console error, ask another origin and store something (`?store=session&cerr&fetch=...`, on all three pages) [VL: build/evidence/R1-calibration-controls.amend.1.txt and .2.txt, 8 of 8; review R2: build/evidence/R2-calibration-controls.amend.1.txt; review R3: build/evidence/R3-calibration-controls.amend.2.txt and .3.txt, 10 of 10; review R4: build/evidence/R4-calibration-controls.amend.*.txt, 12 of 12 in .6 to .9 for MAJOR 1; review R5: build/evidence/R5-calibration-controls.amend.6.txt to .10.txt, 16 of 16]. The tapped run's judging is controlled in Node too (tests/tools/calibration-check.test.mjs): late taps judged by their own values, flipped values, a stray, a rejected first attempt, no log and no run after the hand-over; and (review R4, MAJOR 1) clicks 1.5 ms or 100 ms off their marks, a click missing, one extra, one started at once, clicks through a layer gate, no starts and no pass-A attempt; and (review R5, MAJOR 1) on synthetic frame logs of a scene drawing this section at 60 and 30 frames a second, read anywhere in its bracket: a ring 100 ms or one frame late, a fill 100 ms or one frame late, frameTimes 100 ms, 10 ms or 1 ms off their frames, a ring in pass A, a fill in pass B, a picture between attempts, a ring of another size, at alpha 0.5 or none, the key hidden, a frameTime missing or on the second frame, a ring never drawn, no log, dropped frames, too few frames and a frame of an attempt the record lacks; straddling and unreadable frames are not judged. The reviewer's three product mutants fail on their frames alone (build/evidence/R5-mutant-calib-frametime.amend.1.txt, R5-mutant-calib-ringlate.amend.1.txt, R5-mutant-calib-filllate.amend.1.txt).

## 13. The ending (N2)

- The gauntlet's finish leaves the track playing in full and starts the scene `ending`. Over 4 bars the camera rises past the gauntlet's ceiling into a glimpse of the next area: a silhouette of spires and one warm light (#2b3a55, #ffd27f), baked once.
- Then the card: three dots in the centre, 6 world px across, 24 apart; dot i brightens on beat i of each bar (beats 1 to 3), all rest on beat 4; it stays, on the music, until the tab closes. No text.
- With `?playtest` (D16), when the card appears the element `<output id="playtest">` outside the canvas gets the text `run m:ss · deaths n` (m:ss the sim steps from room 1's first step to the gauntlet's finish, divided by 240, minutes unpadded, seconds two digits; n the run's deaths) and loses its `hidden` attribute. Nothing else changes on the page. This read of `?playtest` is the one sanctioned exception to "product code never branches on a flag" (D16).
- The scene (amended 2026-10-12, section 1.6). Its shapes are the reference's `glimpseShapes`, `riseAt`, `ceilingShapes` and `cardShapes` (tests/fixtures/reference/art.mjs, section 10.6), ported into src/render/ending-art.ts with `BEAT_S` and `RISE_S`, and (amended for review R1, MAJOR 4) its frame is the reference's `endingFrame(heard, t0, run)` with `beatOfBar(heard, origin)`, ported there too: the scene draws only what endingFrame returns, so the card's beat is the music's, read from the run's origin inside the tested function. `class EndingScene extends Phaser.Scene` (key `ending`, src/render/ending-scene.ts) takes `constructor(opts: { engine: AudioEngine; run: Run; playtest: boolean })`. `create()` keeps `finishStep = run.sim.step` (the sim still counts steps after the finish), bakes the glimpse into a 1280 by 720 DynamicTexture (key `glimpse`, section 10.6's baking) shown by one Image with origin (0, 0) at depth 0, and makes one Graphics at depth 1. Every frame: `heard = audibleSec(engine.clock(), performance.now())`; the first frame keeps it as `t0`; `f = endingFrame(heard, t0, run)`; the image moves to y `f.glimpseY`; the Graphics is cleared and draws `f.shapes` (the reference: `ceilingShapes(r.ceilingY)` while `r.u < 1` for `r = riseAt(heard - t0)`, else `cardShapes(beatOfBar(heard, run.origin))`, `beatOfBar = ((Math.floor((heard - origin) / BEAT_S) % 4) + 4) % 4`). On the first frame with `f.card` (that is `r.u >= 1`), when `playtest` holds, `document.getElementById('playtest')` gets `textContent` `run ${m}:${ss} · deaths ${n}` (`s = Math.floor(finishStep / 240)`, `m = Math.floor(s / 60)`, `ss = String(s % 60).padStart(2, '0')`, `n = run.sim.status().deaths`) and loses its `hidden` attribute. src/main.ts creates the scene with `playtest: new URLSearchParams(window.location.search).has('playtest')`, the one sanctioned read of a page flag.
- The glimpse is checked where it takes effect (review R2, MAJOR 3). The playthrough's check `scene` reads the ending's display list with every text read (tools/probe-lib.mjs `endingLayoutProblems`).
  - It wants one image, `glimpse`, 1280 by 720, at x 0, origin (0, 0), scale 1 and depth 0, and one Graphics at depth 1.
  - The glimpse's y must never move back down, must be at 360 or more in a read surely inside the rise's first half, and must be 0 once the card is up.
- What the ending draws is checked too (review R3, MAJOR 2; tools/scene-check.mjs). Every read also takes the Graphics' commands and the heard time with the run's origin (src/probe/api.ts `drawn` and `heard`).
  - While the glimpse is above y 0, the Graphics must hold exactly ceilingShapes(-120 + 840 e), e being 1 - glimpseY / 720 of the same frame. Once it rests at 0 (the card), exactly cardShapes(b), b the beat of the bar heard at the read, counted from the run's origin, or the beat before within 0.1 s after a beat line. Both within 1e-3, as section 10.6's frames.
  - Once the card is up, the glimpse texture's pixels are read as the bakes' are, against glimpseShapes().
  - Controls: in Node, the card undrawn, a card off the beat, a ceiling elsewhere and a missing Graphics; in the browser, the card undrawn and a blank glimpse [VL: build/evidence/R3-mutant-card-undrawn.amend.2.txt and R3-mutant-glimpse-blank.amend.2.txt].

## 14. Interfaces (TypeScript; D2)

Erasable syntax only (no enums, namespaces or parameter properties: Node strips the types for the tools), imports with explicit `.ts` extensions; tsconfig sets `allowImportingTsExtensions` and `erasableSyntaxOnly`. The pure modules mirror their references: the oracle (sim and rooms), tests/fixtures/control-page/clock.js (clock), tests/fixtures/reference/*.mjs (driver, keys, audio, flash limiter), tests/fixtures/calibration/reference.mjs (calibration).

```ts
// src/sim/types.ts
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Entity { letter: string; kind: 'spike' | 'block'; dir: Dir | null; layer: number; period: number;
  phase: number; on: number; rest: boolean; cells: [number, number][]; index: number }
export interface Room { kind: 'room' | 'gauntlet'; name: string; W: number; H: number; spawn: { col: number; row: number };
  layer: number; par: number; tiles: Uint8Array; entities: Entity[] }
export interface World { rooms: Room[]; gauntlet: (Room & { grid: string; program: Gauntlet }) | null }
export interface StartState { room: number; step: number; layers: number; stopAtClear?: boolean }
export interface SimStatus { room: number; cleared: number; dead: boolean; deaths: number; finished: boolean; x: number; y: number; form: number }
export interface Sim { readonly step: number; tick(input: number): void; status(): SimStatus; checksum(): string;
  save(): Int32Array; load(state: Int32Array): void; key(period: number): string }

// src/sim/constants.ts: C, IN, SPIKE_BOX, equal to tests/fixtures/oracle/constants.mjs
// src/sim/beat.ts
export function entityOn(e: Pick<Entity, 'layer' | 'period' | 'phase' | 'on' | 'rest'>, step: number, layers: number): boolean;
export function unlockBar(step: number): number;
export function nextBarStep(step: number): number;
export function gauntletStartBeat(step: number): number;
// src/sim/sim.ts
export const FIELDS: readonly string[];            // the oracle's FIELDS, same order
export function createSim(world: World, start: StartState): Sim;
// src/sim/headless.ts: the tools' entry (replay, solve, reach)
export { compileWorld } from '../rooms/compile.ts';
export { createSim, FIELDS } from './sim.ts';

// src/rooms/codes.ts
export const CODE: Readonly<{ EMPTY: 0; SOLID: 1; UP: 2; DOWN: 3; LEFT: 4; RIGHT: 5; WAVE: 6; BASE: 7; ENTITY: 8 }>;
export class RoomError extends Error {}
// src/rooms/compile.ts
export { CODE, RoomError } from './codes.ts';
export function compileRoom(fileName: string, text: string): Room;
export function compileWorld(files: { name: string; text: string }[]): World;
// src/rooms/gauntlet.ts
export interface Gauntlet { name: string; bars: number; melody: number[];
  program: { form: 'rest' | 'base' | 'wave'; masks: { kick?: number[]; clap?: number[]; hat?: number[] } }[] }
export const GAUNTLET: Readonly<{ LEAD: 4; TAIL: 28; H: 18; CEIL: 2; FLOOR: 15; SPAWN_COL: 4; CENTRE: 12 }>;
export function parseGauntlet(fileName: string, text: string): Gauntlet;
export function generateGauntlet(g: Gauntlet): { W: number; H: number; text: string; spawn: { col: number; row: number } };
export function compileGauntlet(fileName: string, text: string): Room & { grid: string; program: Gauntlet };

// src/clock/output-clock.ts
export interface OutputClockContext { readonly state: string; readonly currentTime: number; readonly sampleRate: number;
  readonly baseLatency?: number; readonly outputLatency?: number; getOutputTimestamp?(): { contextTime?: number; performanceTime?: number } }
export interface OutputClock { offset: number; valid: boolean; resyncs: number; sample(nowMs?: number): OutputClock }
export function createOutputClock(ctx: OutputClockContext): OutputClock;
export function audibleSec(clock: OutputClock, nowMs: number): number;   // nowMs / 1000 + clock.offset
// src/clock/driver.ts: MAX_STEPS_PER_FRAME, stepsDue, targetStep, displaySec, inputLagSec, alpha (section 9.1)

// src/input/keys.ts
export interface InputSource { next(step: number): number }
export const KEY_BITS: Readonly<Record<string, number>>;
export function createKeys(opts: { target: EventTarget; stepOf: (eventTimeStampMs: number) => number }):
  InputSource & { attachSource(s: InputSource | null): void; held(): number; detach(): void };
// src/input/calibrate.ts
export interface PassResult { median: number; mad: number; taps: number; accepted: boolean }
export function judgePass(offsetsMs: number[]): PassResult;
export function calibrate(a: PassResult, v: PassResult): { avOffset: number; inputBias: number };

// src/audio/track.ts
export function compileTrack(code: string, S: Record<string, unknown>): { names: string[]; layers: Pattern[] };
// src/audio/scheduler.ts
export const SIXTEENTH: number; export const BAR: number; export const CPS: number; export const LOOKAHEAD: 0.12; export const LATE: 0.05;
export interface Note { layer: number; value: Record<string, unknown>; time: number; duration: number; cycle: number }
export interface TransportCounters { scheduledVoices: number; voiceErrors: number; lateShifted: number; lateDropped: number }
export function createTransport(layers: Pattern[], play: (note: Note) => void): { readonly origin: number; readonly startBar: number; tick(now: number): void;
  restart(origin: number, gauntletStartBar?: number): void; gauntlet(startBar: number): void; voiceError(): void; counters(): TransportCounters };
// src/audio/gates.ts
export function unlockTime(origin: number, bar: number): number;
export function openAt(param: AudioParam, t: number): void;
export function setMask(params: AudioParam[], mask: number, now: number): void;
// src/audio/engine.ts
export interface AudioStatus { state: AudioContextState | 'none'; time: number; origin: number; scheduledVoices: number; voiceErrors: number;
  lateShifted: number; lateDropped: number; layerGains: number[]; gauntletBar: number }   // gauntletBar: review R1
export interface AudioEngine { start(): Promise<void>; context(): AudioContext | null; status(): AudioStatus; analyser(): AnalyserNode | null;
  layerGain(layer: number): GainNode | null; clock(): OutputClock | null; restart(origin: number, layers: number, gauntletStartBar: number): void;
  unlockAt(layer: number, bar: number): void; gauntlet(startBar: number): void; click(time: number): void }
export function createAudioEngine(trackText: string): AudioEngine;

// src/fx/flash-limiter.ts
export const FLASH_AREA_LIMIT: 25600; export const LUM_STEP: 0.1;
export function createFlashLimiter(canvasW: number, canvasH: number): { beginFrame(): void; request(areaPx: number, fromLum: number, toLum: number): number };

// The art (amended 2026-10-12, section 10.6): each module exports the reference's functions and values of its
// item with the same names, arguments and results (tests/fixtures/reference/art.mjs), plus:
// src/render/art.ts (RN1): ZOOM, TILE_PX, VIEW_W, VIEW_H, COLOR, LINE_PX, GLOW_PX, GLOW_ALPHA,
export type Shape = { k: 'rect'; x: number; y: number; w: number; h: number; c: number; a: number }
  | { k: 'tri' | 'poly'; p: number[]; c: number; a: number } | { k: 'ellipse'; x: number; y: number; rx: number; ry: number; c: number; a: number }
  | { k: 'ring'; x: number; y: number; r: number; lw: number; c: number; a: number }
  | { k: 'frame'; x: number; y: number; w: number; h: number; lw: number; c: number; a: number }
  | { k: 'line' | 'outline'; p: number[]; lw: number; c: number; a: number };
export function drawShapes(g: Phaser.GameObjects.Graphics, shapes: Shape[], dx?: number, dy?: number): void;
// src/render/room-art.ts (RN1): BAKE_COLS, bakeChunks, codeAt, spikeTris, roomShapes, cameraPx
// src/render/creature.ts (RN2): SQUASH_STEPS, TRAIL, createTrack, trackStep, creatureShapes; src/game/run.ts: Run gains track()
// src/render/beat-art.ts (RN3): BLOCK_ALPHA, OFF_ALPHA, WARN_ALPHA, SPIKE_AREA, RING_STEPS, entityLook, levelLum, beatShapes, ringShapes
// src/render/depth-art.ts (RN4): BAND_FACTORS, BAND_COLORS, FOG_STRIPS, FOG_ALPHA, VIGNETTE_CELL, VIGNETTE_ALPHA, MOTES,
//   xorshift32, makeRng, roomNumber, bandWidth, depthBands, fogShapes, vignetteShapes, moteField, moteShapes
// src/render/play-frame.ts (RN4, review R1): playFrame(o: { room: Room; sim: { readonly step: number; save(): Int32Array };
//   view: RunView; track: Track; field: Mote[]; levels: number[]; limiter: { request(areaPx: number, fromLum: number, toLum: number): number } }):
//   { camPx: number; levels: number[]; beat: Shape[]; creature: Shape[]; dust: Shape[] }   (FIELDS from src/sim/sim.ts)
// src/render/ending-art.ts (END1): BEAT_S, RISE_S, glimpseShapes, riseAt, ceilingShapes, cardShapes, and (review R1)
//   beatOfBar(heard: number, origin: number): number,
//   endingFrame(heard: number, t0: number, run: { readonly origin: number }): { glimpseY: number; card: boolean; shapes: Shape[] }
```

`Pattern` is the type of a Strudel pattern (`{ queryArc(begin: number, end: number): Hap[] }` is all the transport needs). `src/main.ts` builds the probe's view (src/probe/inspect.ts, spec-owned, the `Inspect` interface written there) and passes it to `installProbe` (src/probe/api.ts), which installs `window.__hush` only under `?probe`. Product code never reads `?probe`.

## 15. Verifiers (D11, D13; all spec-owned and PROTECTED)

| verifier | command | proves | its control (PF-CONTROLS) |
|---|---|---|---|
| tools/probe-smoke.mjs | `npm run smoke` | X1: built under /hush/, every request below 400, the first scene, a non-blank canvas, title, link and notice only, zero errors | a build with base / fails |
| tools/probe-play.mjs | `npm run probe:console`, inside `npm test` and `npm run probe:supply` | X5, D3 in the browser, D8, D16 through the ending's card (section 13), X10's network and storage rows; the check `unlock` (in the default set, and in GAME1's acceptance): X7's clear-time half in the live run, each layer's gate closed until the bar line of its room's clear and open after it, and after the clear that enters the gauntlet the engine's `gauntletBar` equal to the sim's gBeat / 4 at its entry and its respawn (review R1; that predicate is controlled in tests/tools/probe-lib.test.mjs, the control page having no gauntlet); `--check visibility` D4; `--check scene` (in END1's acceptance and npm test; review R2) the play scene's baked images and Graphics where section 10.6 puts them at the sim's creature's camera, and the ending's glimpse rising to y 0 by the card; and (review R3) what they draw: every frame of every room's run replayed on the reference and its full frames compared command for command, every bake's pixels against its shapes, the ending's ceiling and card on the music's beat and the glimpse's pixels (tools/scene-check.mjs); `--check keys` (in GAME1's acceptance and npm test; review R2) the hand-over starting a run at room 1 and real keys reaching the sim on the steps stepOf names (section 9.2) | ?throw, ?cerr, an extra origin, four storage writes, a text object, a DOM text over the canvas, a dying and a missing witness, ?novis, the ending's ?ending=none, ?playtest&ending=never, ?ending=always, ?playtest&ending=early, ?playtest&ending=late and ?playtest&ending=mid (a line at 60% of the rise; review R1), and ?unlock=late, early and none: each fails; the clean control page passes with and without ?playtest (amended 2026-10-12) [VL: build/evidence/END1-controls.amend.2.txt, 18 of 18; build/evidence/R1-page-controls.amend.1.txt and .2.txt, 15 of 15; review R2: build/evidence/R2-page-controls.amend.1.txt]; the scene and keys predicates are controlled in Node (tests/tools/probe-lib.test.mjs: the room at another camera, a chunk apart, a band at the wrong factor, a wrong depth, scale, origin, size or visibility, a missing, doubled or foreign image, a misplaced or empty Graphics, a glimpse that stays down, never rises or moves back; keys never applied, applied on other steps, a sim standing elsewhere), and failed the reviewer's mutants in the browser (build/evidence/R2-mutant-*.amend.*.txt: the chunks unscrolled with the glimpse kept down, the keys on a detached target, the calibration dropped, no run after the hand-over, the input lag lost); review R3: the content predicates in Node (tests/tools/scene-check.test.mjs) and eleven browser mutants of the product, each failing for its own fault (build/evidence/R3-mutant-*.amend.2.txt: the beat entities undrawn, a blank chunk, the gauntlet's chunks from column 0, the creature 40 px down, no beginFrame, the levels not kept, the card undrawn, a blank glimpse, the ring undrawn, a band and the fog baked empty), while the page controls keep their verdicts (build/evidence/R3-page-controls.amend.1.txt and .2.txt, 26 of 26); review R5 (MAJOR 2): `scene` also holds every play-scene frame's step to the heard time (section 9.1) and every card frame to the beat heard while it was drawn, its predicates in Node (tests/tools/scene-check.test.mjs: a sim 50 ms or 10 ms behind, the calibration's offset ignored, a jump past the cap, a card 80 ms or 20 ms late, too few judged frames), and the reviewer's two product mutants fail (build/evidence/R5-mutant-frame-late50.amend.1.txt, R5-mutant-card-late80.amend.1.txt) |
| tools/probe-flash.mjs, tools/flash-analyzer.mjs, tools/calibration-check.mjs | `npm run probe:flash` | X6, D10, and with `--calibration` the untouched calibration of section 12 and its tapped run (review R1), the tapped run judged against its logged taps' own values and followed by a run at room 1 (review R2), and (review R4, MAJOR 1) every click of every pass-A attempt started within 1 ms of its mark, and (review R5, MAJOR 1) every frame of every attempt's pictures in section 12's windows and each frameTime the frameMs of the first frame that drew its ring, and (review R5, NOTE 2) no console or page error, no other origin and nothing stored on the three calibration pages | full-field, red and multi-area strobes and 26,880 px fail; 24,320 px and 2 Hz pass; the scrolling spike row in #c8d0e0 fails, in #4a556e passes; with `--calibration` (tests/controls/calibration-probe.test.mjs) the control page's calibration passes untouched and tapped, and an at-once hand-over, no repeat, no click, no ring, no count-in, flipped tap offsets, a count-in of 3, and (review R3) Escape taken as a key and count-in taps counted each fail [VL: build/evidence/R2-calibration-controls.amend.1.txt and .2.txt; build/evidence/R3-calibration-controls.amend.2.txt and .3.txt]; the tapped verdict in Node (tests/tools/calibration-check.test.mjs), with the Escape reading and the tapper's own count-in taps and Escapes (review R3); review R4 (MAJOR 2): the retried run (each pass's first attempt untapped) passes on the control page and the product, and a pass that keeps its first result fails (`?calib=first`; the reviewer's mutant in the product: build/evidence/R4-mutant-calib-first.amend.1.txt), its verdict in Node too; review R4 (MAJOR 1): clicks handed over 0.1 s late fail on their starts (`?calib=clicklate`; the reviewer's product mutant: build/evidence/R4-mutant-click-late.amend.1.txt), their verdict in Node too; review R5 (MAJOR 1): rings drawn 0.1 s late, count-in fills 0.1 s late and frameTimes 0.1 s after their frames fail on their frames alone (`?calib=ringlate`, `filllate`, `frametime`; the reviewer's three product mutants: build/evidence/R5-mutant-calib-*.amend.1.txt), the predicate in Node on synthetic frame logs (tests/tools/calibration-check.test.mjs); review R5 (NOTE 2): pages that log a console error, ask another origin and store something fail on all three runs [VL: build/evidence/R5-calibration-controls.amend.6.txt to .10.txt, 16 of 16] |
| tools/probe-perf.mjs, tools/machine-state.ps1 | `npm run probe:perf -- --headed` | X4 and its conditions (AC, no power saver, 60 Hz, nothing heavy, not SwiftShader, maximized) | ?stress=20 fails; the clean page passes |
| tools/probe-av.mjs | `npm run probe:av -- --headed` | X7 on the real device: running context, voices for the track's onsets, no errors or drops, silence, unlock windows, solos, the clock line; and (review R3, MINOR 4) the mix, section 8.4's chain read as the page built it, with nothing that could sound bypassing the analyser; and (review R4, MAJOR 1) the starts: every voice on an onset of its own layer, every onset started (section 8.4) | master cut, synth registration throwing, a later layer cut: each fails; the master gain at 0.4 fails on the mix alone [VL: build/evidence/R3-av-controls.amend.1.txt, 5 of 5]; the predicate in Node (tests/tools/probe-lib.test.mjs); review R4 (MAJOR 1): every note 0.1 s late (`?av=late`) and layers 1 and 2 through each other's gate (`?av=swap`) fail on the starts alone, while the other five controls keep their verdicts [VL: build/evidence/R4-av-controls.amend.1.txt and .2.txt, 7 of 7]; the reviewer's product mutant (every note 0.1 s late) and the orbits into rotated gates fail (build/evidence/R4-mutant-note-late.amend.1.txt, R4-mutant-gate-rotate.amend.1.txt); the predicate in Node (tests/tools/av-starts.test.mjs) |
| tools/probe-live.mjs | `npm run probe:live` | X12 | a 404, a wrong build hash, a commit off main, a console error, no boot: each fails |
| tools/probe-supply.mjs | `npm run probe:supply` | X10; and (audit 1, MINOR 3) the row `notices`: the build's THIRD-PARTY-NOTICES.txt names every runtime package of the lockfile with the lockfile's licence id | a loose pin, a high audit finding, an untracked lockfile, a planted write: each fails; (audit 1, MINOR 3) a build without the notices file and notices that leave Phaser out each fail, and the repo's build passes [VL: build/evidence/AUDIT1-supply-controls.amend.1.txt]; the row's predicate in Node (tests/tools/notices.test.mjs) |
| tools/notices.mjs (in vite.config.ts) | `npm run build` | audit 1, MINOR 3: dist/THIRD-PARTY-NOTICES.txt, the licence notices of the runtime dependency tree (section 1.6); the build fails on a package with no licence text, a dependency not installed, or a bundled package outside the tree | tests/tools/notices.test.mjs, 14 tests: fixture trees (nested versions, optional dependencies, shared and CRLF texts, NOTICE files, the standard MIT and ISC texts without an email), the Vite plugin in a fixture project, and the repo's own file against the lockfile and check-public; red on 11 planted faults in a scratch copy, each caught by the tests named for it [VL: build/evidence/AUDIT1-notices-tests.amend.1.txt, AUDIT1-notices-mutants.amend.1.txt] |
| tools/test-all.mjs | `npm test` | X2: unit (tests/game included), replay and e2e suites | a planted failing suite reaches npm test and the gate |
| tools/replay.mjs, tools/solve.mjs | `node tools/replay.mjs --all --jitter --seed <n>` | X3, its seed the first 8 hex of the verdict digest in the gate and in npm test (tools/ship-gate.mjs `x3Seed`; review R1), so a record commit never re-rolls it | the toy rooms (tests/tools/solve-replay.test.mjs); the seed kept across a record commit (tests/tools/ship-gate.test.mjs) |
| tests/input/calibrate.test.ts | `npm run test:calibration` | X8 | a biased, a never-rejecting and an untrimmed calibrator fail (the last: review R2, MINOR 1) [VL: build/evidence/R2-calibrator-controls.amend.1.txt] |
| tests/audio, tests/sim/progression.test.mjs, tests/game/run.test.mjs | `npm run test:av` | X7 in the sim, the transport and the run's wiring: the run calls engine.unlockAt(k, unlockBar(s)) once for the clear of room k on step s, and engine.gauntlet(gBeat / 4) on every new gBeat in room 11 (review R1); and (review R2) the run's calibration moves the sim's target by displaySec(avOffset) and an event's step by inputLagSec(avOffset, inputBias), and its track follows trackStep over every tick; and (review R4) a frame far behind the heard time ticks at most 24 steps | mutation controls (tests/controls/product-tests.test.mjs; the run's against tests/fixtures/reference/run.mjs: a layer a bar late, none, no gauntlet mapping, and (review R2) displaySec(0), inputLagSec(0, 0), no track step, and (review R4) no cap) [VL: build/evidence/R2-product-controls.amend.1.txt, 36 of 36; build/evidence/R4-run-controls.amend.1.txt, 8 of 8] |
| tests/sim, tests/rooms, tests/clock, tests/input, tests/fx | the items' acceptances | the product equals the oracle and the references | each green on its reference, red on one planted fault; the clock line also on its jump tolerance, its trust rule and its resync rule, and the transport on its 5 ms shift (review R1) [VL: build/evidence/fix/R1-product-controls.1.txt, 26 of 26]; and (review R3) the clock line on its stale-pair rule (CLOCK_STALE 5000) and the limiter on its edge (`>` for `>=`) [VL: build/evidence/R3-product-controls.amend.1.txt] |
| tests/render (amended 2026-10-12) | the acceptances of RN1 to RN4 and END1 (`npm run accept:rn1` to `accept:rn4`, `accept:ending`) | the art equals tests/fixtures/reference/art.mjs list for list; the ending's every frame too, its card on the beat counted from the run's origin, and the play scene's every frame, read from the sim it is given (review R1), the layer's ring included past a room's clear; and drawShapes makes the calls of section 10.6 (review R2) | each green on the reference, red on one planted fault (tests/controls/product-tests.test.mjs; review R2: an ellipse at half size, a flat triangle, the ring 1 px up) [VL: build/evidence/ART-controls.amend.1.txt, 19 of 19; build/evidence/R1-END1-controls.amend.1.txt; build/evidence/R1-RN4-controls.amend.1.txt, 7 of 7; build/evidence/R2-product-controls.amend.1.txt, 36 of 36] |
| tools/check-public.mjs, tools/public-patterns.mjs | `npm run check:public` | X9, D14 | every class in tree, index and history; no denylist exits 3; (audit 1, MINOR 3) the repo's THIRD-PARTY-NOTICES.txt passes with its one third-party address masked by hash, and an address not listed is still found (tests/tools/notices.test.mjs; dropping the mask fails it) |
| tools/evidence.mjs | every acceptance | D12 | the redaction of every class; no denylist runs nothing |
| tools/deploy.mjs | `npm run deploy` (the owner), `--dry-run` (the auditor, its `--remote` an existing local bare repository; audit 1) | D15, and a dry run never publishes | tests/controls/deploy.test.mjs, 8 cases: the 7 of PF-CONTROLS, runnable again since audit 1 (the copy keeps the tracked rooms and track), and a dry run refused on a remote that is not a local bare repository, a URL included [VL: build/evidence/AUDIT1-deploy-controls.amend.*.txt]; the first case also wants THIRD-PARTY-NOTICES.txt on gh-pages (audit 1, MINOR 3) |
| tools/standing.mjs | `npm run standing` | D13 | the selector reads the spec and the scoreboard |
| tools/ship-gate.mjs, tools/gates.mjs, tools/protect.mjs, tools/cap-hook.mjs | the gate | D18, D11, the caps | their tests in tests/tools |

The control page (tests/fixtures/control-page) is the product's shape at small scale: the probe API, the canvas config, a toy sim, a four-layer Strudel engine on @strudel/web, the ending of section 13 after the last toy room, and every planted fault behind a query flag. `npm run test:verifiers` runs tests/tools; the browser, deploy and mutation controls are tests/controls, run one file at a time (each under ten minutes).

HIGHEST-SCRUTINY: tools/deploy.mjs, tools/check-public.mjs, tools/public-patterns.mjs, tools/notices.mjs (what dist publishes beside the page; audit 1), the network allowlist and the storage probe (tools/probe-play.mjs, tools/probe-lib.mjs), tools/probe-supply.mjs, tools/cap-hook.mjs, tools/evidence.mjs, tools/gates.mjs, tools/ship-gate.mjs, tools/protect.mjs; and the items that touch index.html or the audio start: GAME1.

## 16. Items

Strictly in this order; an item starts only when every item it names under Pending-dep passes. Each acceptance runs as `node tools/evidence.mjs <ID> accept -- <command>` and must exit 0 with the decisive line; its record is `build/evidence/<ID>.accept.<attempt>.txt`, committed with the item. Every acceptance was run red at the cut with the product absent: `build/evidence/<ID>.cut-red.1.txt`, each failing because its module or file is missing. The executor writes only `src/` (never `src/probe/`), `rooms/`, `music/` and `replays/`; it never edits a verifier, a config, package.json, index.html or a ledger it does not own.

#### S1 Smoke: the page boots into the calibration scene

- **Module:** render (src/render/), the entry (src/main.ts) · **Interface change:** yes (new)
- **Targets:** `src/main.ts` (new), `src/render/game.ts` (new), `src/render/calibration-scene.ts` (new)
- **Action:** `src/render/game.ts` exports `createGame(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Game` with exactly the config of section 10.1. `src/render/calibration-scene.ts` exports `class CalibrationScene extends Phaser.Scene` with key `calibration`, whose `create()` draws the key shape of section 12 (a `Graphics` rounded rectangle centred on the 1280 by 720 canvas: 80 by 80, radius 14, a 3 px stroke #7fd6ff at alpha 0.8) and sets a module flag `booted`. `src/main.ts` calls `createGame([CalibrationScene])` and `installProbe(inspect)` (src/probe/api.ts), where `inspect` implements `Inspect` (src/probe/inspect.ts): `ready()` returns `booted`, `game()` the game, every other member `null`, and the three controls do nothing. Import Phaser as `import * as Phaser from 'phaser'`.
- **Acceptance:** `npm run smoke` → exit 0, last line `smoke: PASS (/hush/)`
- **Tests mapped:** `npm run smoke`
- **Out of scope:** audio, the sim, input, the calibration passes.

#### SIM1 Constants, types and beat functions

- **Module:** sim · **Interface change:** yes (new)
- **Pending-dep:** S1
- **Targets:** `src/sim/constants.ts` (new), `src/sim/types.ts` (new), `src/sim/beat.ts` (new)
- **Action:** transcribe tests/fixtures/oracle/constants.mjs into `src/sim/constants.ts` (`C`, `IN`, `SPIKE_BOX`, frozen, same values); write the types of section 14 into `src/sim/types.ts`; port `entityOn`, `unlockBar`, `nextBarStep` and `gauntletStartBeat` from tests/fixtures/oracle/sim.mjs into `src/sim/beat.ts`, integer math only (section 2).
- **Acceptance:** `npx vitest run tests/sim/beat.test.mjs` → exit 0, `Tests  3 passed (3)`
- **Tests mapped:** `tests/sim/beat.test.mjs`
- **Out of scope:** the step function.

#### RM1 Room compiler and gauntlet generator

- **Module:** rooms · **Interface change:** yes (new)
- **Pending-dep:** SIM1
- **Targets:** `src/rooms/codes.ts` (new), `src/rooms/compile.ts` (new), `src/rooms/gauntlet.ts` (new)
- **Action:** port tests/fixtures/oracle/world.mjs: `CODE`, the character table and `class RoomError extends Error` into `codes.ts`; `compileRoom` and `compileWorld` into `compile.ts` (re-exporting `CODE` and `RoomError`; `compileWorld` calls `compileGauntlet` for `11-gauntlet.txt`); `GAUNTLET`, `parseGauntlet`, `generateGauntlet` and `compileGauntlet` into `gauntlet.ts`. Same checks, same messages' meaning, same structures (`toEqual` the oracle's); every refusal throws `RoomError`.
- **Acceptance:** `npx vitest run tests/rooms/compile.test.mjs` → exit 0, `Tests  5 passed (5)`
- **Tests mapped:** `tests/rooms/compile.test.mjs`
- **Out of scope:** the room files themselves.

#### CT1 Rooms, gauntlet and track transcribed byte-exact

- **Module:** content (rooms/, music/) · **Interface change:** no
- **Pending-dep:** RM1
- **Targets:** `rooms/01-wake.txt`, `rooms/02-heartbeat.txt`, `rooms/03-dash.txt`, `rooms/04-thorns.txt`, `rooms/05-doors.txt`, `rooms/06-wave.txt`, `rooms/07-current.txt`, `rooms/08-steps.txt`, `rooms/09-gates.txt`, `rooms/10-crown.txt`, `rooms/11-gauntlet.txt`, `music/area1.strudel` (all new)
- **Action:** write each file from its block in sections 5.3, 6.3 and 7 with `node tools/spec-content.mjs --extract <name> <path>` (names `01-wake` to `10-crown`, `11-gauntlet`, `area1`); the tool refuses a block whose sha256 differs and never overwrites a file. Do not open the files in an editor that rewrites line endings.
- **Acceptance:** `node tools/spec-content.mjs --tree` → exit 0, `spec-content: tree clean, 12 file(s)`
- **Tests mapped:** `node tools/spec-content.mjs --tree`, `tests/rooms/gauntlet-pattern.test.mjs`
- **Out of scope:** any edit of a room or of the track (a design change is the producer's amendment).

#### SIM2 The sim: the step function, equal to the oracle

- **Module:** sim · **Interface change:** yes (new)
- **Pending-dep:** CT1
- **Targets:** `src/sim/sim.ts` (new), `src/sim/headless.ts` (new)
- **Action:** port tests/fixtures/oracle/sim.mjs into `src/sim/sim.ts` whole: `FIELDS` (same order), `createSim(world, start)` with `tick`, `status`, `checksum`, `save` (an `Int32Array` in `FIELDS` order), `load`, `key` and the `step` getter; the base form, the dash, beat entities, the crush, spikes, the fall, death, respawn and lock, portals and the wave, the gauntlet's auto-run, the clear and progression (sections 4.3 to 4.5). Integer math only; the eslint rules of src/sim apply. `src/sim/headless.ts` re-exports `compileWorld` (src/rooms/compile.ts), `createSim` and `FIELDS`. After every step of every test sequence the product's `save()` must equal the oracle's.
- **Acceptance:** `npx vitest run tests/sim/oracle-base.test.mjs tests/sim/oracle-dash.test.mjs tests/sim/oracle-beat.test.mjs tests/sim/oracle-wave.test.mjs tests/sim/oracle-gauntlet.test.mjs` → exit 0, `Test Files  5 passed (5)`
- **Tests mapped:** `tests/sim/oracle-base.test.mjs`, `tests/sim/oracle-dash.test.mjs`, `tests/sim/oracle-beat.test.mjs`, `tests/sim/oracle-wave.test.mjs`, `tests/sim/oracle-gauntlet.test.mjs`
- **Out of scope:** any change of a physics value (the oracle wins; a disagreement is a spec bug for the producer).

#### W1 Witnesses for rooms 01 to 04

- **Module:** replays · **Interface change:** no
- **Pending-dep:** SIM2
- **Targets:** `replays/01-wake.json`, `replays/02-heartbeat.json`, `replays/03-dash.json`, `replays/04-thorns.json` (new)
- **Action:** for each room run `node tools/solve.mjs <stem>` (one solve per call; it writes `replays/<stem>.json` and prints `solve: FOUND`). A room that exits 3 is `blocked (needs-design)`; a witness short of 18 of 20 on the acceptance seed is `blocked (needs-design)`. Never hand-edit a witness.
- **Acceptance:** `node tools/replay.mjs replays/01-wake.json replays/02-heartbeat.json replays/03-dash.json replays/04-thorns.json --jitter --seed 1` → exit 0, `replay: PASS, 4 witness(es)`
- **Tests mapped:** `node tools/replay.mjs replays/01-wake.json replays/02-heartbeat.json replays/03-dash.json replays/04-thorns.json --jitter --seed 1`
- **Out of scope:** room edits.

#### W2 Witnesses for rooms 05 to 08

- **Module:** replays · **Interface change:** no
- **Pending-dep:** W1
- **Targets:** `replays/05-doors.json`, `replays/06-wave.json`, `replays/07-current.json`, `replays/08-steps.json` (new)
- **Action:** as W1, for these rooms.
- **Acceptance:** `node tools/replay.mjs replays/05-doors.json replays/06-wave.json replays/07-current.json replays/08-steps.json --jitter --seed 1` → exit 0, `replay: PASS, 4 witness(es)`
- **Tests mapped:** `node tools/replay.mjs replays/05-doors.json replays/06-wave.json replays/07-current.json replays/08-steps.json --jitter --seed 1`
- **Out of scope:** room edits.

#### W3 Witnesses for rooms 09, 10 and the gauntlet

- **Module:** replays · **Interface change:** no
- **Pending-dep:** W2
- **Targets:** `replays/09-gates.json`, `replays/10-crown.json`, `replays/11-gauntlet.json` (new)
- **Action:** as W1, for these rooms. Then every room has its witness (X3).
- **Acceptance:** `node tools/replay.mjs --all --jitter --seed 1` → exit 0, `replay: PASS, 11 witness(es)`
- **Tests mapped:** `node tools/replay.mjs --all --jitter --seed 1`
- **Out of scope:** room edits.

#### CL1 The device-clock line

- **Module:** clock · **Interface change:** yes (new)
- **Pending-dep:** S1
- **Targets:** `src/clock/output-clock.ts` (new)
- **Action:** port Vault City's viewer/city-audio.js:93-167 and viewer/beat.js:38-46 (read-only source in the owner's Vault City repo, never changed) into `createOutputClock(ctx)` and `audibleSec(clock, nowMs)` with the interface of section 14, exactly as the spec's own port tests/fixtures/control-page/clock.js does: the same constants, the same branches, the same order of reads.
- **Acceptance:** `npx vitest run tests/clock/output-clock.test.mjs` → exit 0, `Tests  11 passed (11)` (8 at the cut; review R1, MINOR 2 pinned three thresholds; review R2, MINOR 4)
- **Tests mapped:** `tests/clock/output-clock.test.mjs`
- **Out of scope:** the 7 ms timer and the per-frame sample (GAME1).

#### CL2 The driver's arithmetic

- **Module:** clock · **Interface change:** yes (new)
- **Pending-dep:** CL1
- **Targets:** `src/clock/driver.ts` (new)
- **Action:** the six exports of section 9.1.
- **Acceptance:** `npx vitest run tests/clock/driver.test.mjs` → exit 0, `Tests  4 passed (4)`
- **Tests mapped:** `tests/clock/driver.test.mjs`
- **Out of scope:** the frame loop (GAME1).

#### IN1 Keys

- **Module:** input · **Interface change:** yes (new)
- **Pending-dep:** CL2
- **Targets:** `src/input/keys.ts` (new)
- **Action:** `KEY_BITS` and `createKeys` of section 9.2.
- **Acceptance:** `npx vitest run tests/input/keys.test.mjs` → exit 0, `Tests  5 passed (5)`
- **Tests mapped:** `tests/input/keys.test.mjs`
- **Out of scope:** calibration taps.

#### CAL1 The calibration math

- **Module:** input · **Interface change:** yes (new)
- **Pending-dep:** IN1
- **Targets:** `src/input/calibrate.ts` (new)
- **Action:** `judgePass` and `calibrate` of section 12, the types of section 14.
- **Acceptance:** `npm run test:calibration` → exit 0, `Tests  6 passed (6)` (amended for review R2, MINOR 1: the trim seen on the spread)
- **Tests mapped:** `npm run test:calibration`
- **Out of scope:** the calibration scene (CAL2).

#### AU1 The track's layers

- **Module:** audio · **Interface change:** yes (new)
- **Pending-dep:** CAL1
- **Targets:** `src/audio/track.ts` (new)
- **Action:** `compileTrack(code, S)` of section 8.3. It imports nothing from `@strudel/web` itself (the namespace comes in), so Node can test it.
- **Acceptance:** `npx vitest run tests/audio/track.test.mjs` → exit 0, `Tests  2 passed (2)`
- **Tests mapped:** `tests/audio/track.test.mjs`
- **Out of scope:** playing notes.

#### AU2 The transport

- **Module:** audio · **Interface change:** yes (new)
- **Pending-dep:** AU1
- **Targets:** `src/audio/scheduler.ts` (new)
- **Action:** the constants and `createTransport` of section 8.3, with no timer of its own (`tick(now)` is called from outside).
- **Acceptance:** `npx vitest run tests/audio/scheduler.test.mjs` → exit 0, `Tests  8 passed (8)` (amended for review R1: the getter `startBar`)
- **Tests mapped:** `tests/audio/scheduler.test.mjs`
- **Out of scope:** superdough, the AudioContext.

#### AU3 Gates, and the layer's return on the bar line

- **Module:** audio · **Interface change:** yes (new)
- **Pending-dep:** AU2
- **Targets:** `src/audio/gates.ts` (new)
- **Action:** `unlockTime`, `openAt` and `setMask` of section 8.3. The sim side of X7 already holds (SIM1, SIM2); this item closes it.
- **Acceptance:** `npm run test:av` → exit 0, `Test Files  5 passed (5)` (amended for review R1: test:av also runs tests/game/run.test.mjs, GAME1's run, which exists once GAME1 passes; before it, 4 of 5)
- **Tests mapped:** `npm run test:av`
- **Out of scope:** the engine.

#### FX1 The flash limiter

- **Module:** fx · **Interface change:** yes (new)
- **Pending-dep:** AU3
- **Targets:** `src/fx/flash-limiter.ts` (new)
- **Action:** section 11's limiter.
- **Acceptance:** `npx vitest run tests/fx/flash-limiter.test.mjs` → exit 0, `Tests  4 passed (4)` (amended for review R3, MINOR 2: a change whose area is exactly the limit is held)
- **Tests mapped:** `tests/fx/flash-limiter.test.mjs`
- **Out of scope:** drawing.

#### GAME1 The game: the audio engine, the run, a plain play scene and the probe's view

- **Module:** audio, game, render, the entry · **Interface change:** yes. HIGHEST-SCRUTINY (the audio start).
- **Pending-dep:** FX1, W3
- **Targets:** `src/audio/engine.ts` (new), `src/game/run.ts` (new), `src/render/play-scene.ts` (new), `src/main.ts`, `src/render/calibration-scene.ts`
- **Action:**
  - `src/audio/engine.ts`: `createAudioEngine(trackText)` of sections 8.2 to 8.4 and 14. `restart(origin, layers, startBar)` does `transport.restart(origin, startBar)` and `setMask(gates, layers, ctx.currentTime)`; `unlockAt(layer, bar)` does `openAt(gate.gain, unlockTime(origin, bar))`; `status()` reads the counters, `ctx.state`, `ctx.currentTime`, the origin, every gate's current gain value and `gauntletBar`, the transport's `startBar` (-1 before a start; amended for review R1, MAJOR 1, so the playthrough's unlock check can read the gauntlet's mapping).
  - `src/game/run.ts`: `createRun({ world, engine, keys })` holding the sim and the input source. `startRoom(room)`: `origin = ctx.currentTime + 0.25` (amended for review R1, MINOR 4; section 8.4); a new sim `createSim(world, { room, step: 0, layers: canonical(room) })` (`canonical(r)` = the layers of rooms 1 to r - 1: `r <= 1 ? 0 : ((1 << min(r, 11)) - 2) & 0x7fe`), `stopAtClear` false; `engine.restart(origin, canonical(room), room === 11 ? gauntletStartBeat(0) / 4 : -1)`; the attached source detached. `frame(frameMs)`: the driver of section 9.1, keys' `stepOf` of section 9.2; after each tick it compares the sim's `pendingLayer` and `gBeat` (by `FIELDS` index in `save()`) with their values before the tick: a new pending layer k cleared on step s calls `engine.unlockAt(k, unlockBar(s))`; a new `gBeat` in room 11 calls `engine.gauntlet(gBeat / 4)`. It exposes the sim, the origin, the deaths and the finish.
  - `src/render/play-scene.ts`: scene `play`, redrawn every frame from the run: each solid tile a filled rect #161b28, each static spike tile a rect #4a556e over its hazard box, each beat entity cell that is on a rect #7fd6ff, each portal cell an outlined rect #7fd6ff, the creature a 10 by 10 world px square #e8ecf4 at its interpolated position, with the camera of section 10.1. It is plain on purpose: RN1 to RN4 replace it. When the run finishes it starts the scene `ending` (an empty scene with key `ending` until END1).
  - `src/render/calibration-scene.ts`: until CAL2, the first key starts the run directly: `skipCalibration`'s path with avOffset and inputBias 0.
  - `src/main.ts`: compiles the world from the eleven room files imported as text (`?raw`), creates the engine, the keys (on `window`) and the run, registers the first-key listener of section 8.2 and the visibility handler of section 8.6, creates the game with the three scenes, and installs the probe with the full `Inspect`: `ready` (the calibration scene created), `game`, `sim` (the run's live sim), `simFactory` (`(start) => createSim(world, start)`), `audio` (`engine.status()` once started), `analyser`, `layerGain`, `clock`, `calibration` (the values in use, or null), and the controls `startRoom` (the run's), `skipCalibration(a, b)` (sets the values, leaves the scene `calibration` for `play` and calls `startRoom(1)`) and `attachInput` (the run's source).
- **Acceptance:** `npm run accept:game` → exit 0, line `play: chrome headless: PASS (console,play,text,visibility,unlock,keys)` and `tsc` and `eslint src` clean after it (amended for review R1: the check `unlock`, X7's clear-time half; amended for review R2: the check `keys`, section 9.2's path from the window to the sim after the hand-over) [VL: build/evidence/GAME1.amend.3.txt]
- **Tests mapped:** `npm run smoke`, `tests/game/run.test.mjs` (the standing check stays fast; the playthrough runs again in END1 and at VERIFY)
- **Out of scope:** art (RN1 to RN4), the calibration passes (CAL2), the ending (END1).

#### CAL2 The calibration scene

- **Module:** render, input · **Interface change:** no (amended 2026-10-12, section 1.6)
- **Pending-dep:** GAME1
- **Targets:** `src/render/calibration-scene.ts`, `src/main.ts`
- **Action:** the scene of section 12, ported from its reference (the `Calibration` scene of tests/fixtures/control-page/control.js without `?calib`) into `class CalibrationScene extends Phaser.Scene` (key `calibration`) with the constructor `constructor(opts: { engine: AudioEngine; onDone: (avOffset: number, inputBias: number) => void })`: the key shape, the scene's own keydown listener (the first key calls `engine.start()`), pass A and pass B with their repeats, `judgePass` and `calibrate` from src/input/calibrate.ts, `audibleSec` from src/clock/output-clock.ts, then `onDone(avOffset, inputBias)`. It keeps the module flag `booted`, set in `create()`. `src/main.ts` creates it as `new CalibrationScene({ engine, onDone: skipCalibration })` and drops GAME1's first-key shortcut (the callback that called `skipCalibration(0, 0)` once the audio ran); everything else in main.ts stays (the first-key audio start of section 8.2, the visibility handler, the driver, the probe's `Inspect`, `skipCalibration` itself).
- **Acceptance:** `npm run probe:flash` → exit 0, the line `flash: calibration up <s> s: clicks <n>, count-in fills <n>, rings <n>, values 0 0, Escape ignored` within the ranges of section 12 (no `flash: calibration` problem line; `Escape ignored` amended for review R3, MINOR 5), the line `flash: tapped calibration up <s> s: values <a> <b> (the taps' own <a'> <b'>; ...)` with a and b equal to the taps' own within 0.5 and those within 15 of 5.5 and 34.5, a run at room 1 after the hand-over (no `flash: tapped calibration` problem line; amended for review R1; the taps' own values and the run after the hand-over amended for review R2, MINOR 3 and MAJOR 4; the spread, the count-in taps and the Escapes for review R3, MINOR 5 and 6), the line `flash: retried calibration up <s> s: values <a> <b> (the taps' own <a'> <b'>; ...)` with s from 39.4 to 50, a and b equal to the taps' own within 0.5 and those within 15 of 5.5 and 34.5 (no `flash: retried calibration` problem line; amended for review R4, MAJOR 2), each of the three lines ending `frames <n> timed (<f> filled, <r> with the ring)` with no `calibration frames:` and no `calibration page:` problem line for any of the three runs (amended for review R5, MAJOR 1 and NOTE 2), and `flash: PASS` [VL: build/evidence/CAL2.amend.8.txt]. Red before the edit: GAME1's first key leaves the scene at once, `flash: calibration left after 0.2 s (want at least 39.4 s: ...)` with no click and no ring (build/evidence/CAL2.amend.1.txt, exit 1).
- **Tests mapped:** `npm run smoke` (the flash probe runs again in every art item and at VERIFY)
- **Out of scope:** storage of any kind; the probe's own `skipCalibration` path (unchanged).

#### RN1 Room art, the bake and the camera

- **Module:** render · **Interface change:** yes (new: src/render/art.ts, src/render/room-art.ts; amended 2026-10-12, section 1.6)
- **Pending-dep:** CAL2
- **Targets:** `src/render/art.ts` (new), `src/render/room-art.ts` (new), `src/render/play-scene.ts`
- **Action:** port tests/fixtures/reference/art.mjs's shared values and RN1 functions (section 10.6): `src/render/art.ts` with `ZOOM`, `TILE_PX`, `VIEW_W`, `VIEW_H`, `COLOR`, `LINE_PX`, `GLOW_PX`, `GLOW_ALPHA`, the `Shape` type and `drawShapes`; `src/render/room-art.ts` with `BAKE_COLS`, `bakeChunks`, `codeAt`, `spikeTris`, `roomShapes` and `cameraPx`, same names, arguments and results (the room is src/sim/types.ts's `Room`; `CODE` from src/rooms/codes.ts, `SPIKE_BOX` from src/sim/constants.ts). In `src/render/play-scene.ts`: the room's chunks baked on entering a room and shown at depth 5, the camera `cameraPx` from the interpolated centre (section 10.6), GAME1's plain tiles, spikes and portals removed; GAME1's plain beat entities and creature stay on one Graphics at depth 6, drawn with `camPx`, until RN2 and RN3.
- **Acceptance:** `npm run accept:rn1` → exit 0, `Test Files  2 passed (2)` and `Tests  6 passed (6)` (tests/render/room-art.test.mjs and, amended for review R2, MAJOR 2, tests/render/draw-shapes.test.mjs), then `flash: PASS` and `perf: PASS` (headed, on this laptop, on AC). Red before the edit: the test cannot load src/render/room-art.ts (build/evidence/RN1.amend.1.txt).
- **Tests mapped:** `tests/render/room-art.test.mjs`, `tests/render/draw-shapes.test.mjs`, `npm run smoke` (each later art item re-runs check:art; VERIFY runs every probe)
- **Out of scope:** the creature, the beat entities and the depth layers (RN2 to RN4).

#### RN2 The creature and its effects

- **Module:** render, game · **Interface change:** yes (new: src/render/creature.ts; `Run.track()`)
- **Pending-dep:** RN1
- **Targets:** `src/render/creature.ts` (new), `src/game/run.ts`, `src/render/play-scene.ts`
- **Action:** port `SQUASH_STEPS`, `TRAIL`, `createTrack`, `trackStep` and `creatureShapes` into `src/render/creature.ts`; in `src/game/run.ts` the track of section 10.6 (`createTrack()` on every `startRoom`, `trackStep` after every tick, `track()` on the `Run` interface); in the play scene the creature drawn every frame from `creatureShapes` on its own Graphics at depth 7, GAME1's plain square removed.
- **Acceptance:** `npm run accept:rn2` → exit 0, `Tests  14 passed (14)` (tests/render/creature.test.mjs), then `flash: PASS` and `perf: PASS`. Red before the edit: the test cannot load src/render/creature.ts (build/evidence/RN2.amend.1.txt).
- **Tests mapped:** `tests/render/creature.test.mjs`, `npm run smoke`
- **Out of scope:** the beat entities.

#### RN3 Beat entities, warnings and the layer's return

- **Module:** render, fx · **Interface change:** yes (new: src/render/beat-art.ts)
- **Pending-dep:** RN2
- **Targets:** `src/render/beat-art.ts` (new), `src/render/play-scene.ts`
- **Action:** port `BLOCK_ALPHA`, `OFF_ALPHA`, `WARN_ALPHA`, `SPIKE_AREA`, `RING_STEPS`, `entityLook`, `levelLum`, `beatShapes` and `ringShapes` into `src/render/beat-art.ts` (`spikeTris` from src/render/room-art.ts); in the play scene the scene's flash limiter and the beat entities with the ring on the Graphics at depth 6 (section 10.6), GAME1's plain beat entities removed.
- **Acceptance:** `npm run accept:rn3` → exit 0, `Tests  4 passed (4)` (tests/render/beat-art.test.mjs), then `flash: PASS` and `perf: PASS`. Red before the edit: the test cannot load src/render/beat-art.ts (build/evidence/RN3.amend.1.txt).
- **Tests mapped:** `tests/render/beat-art.test.mjs`, `npm run smoke`
- **Out of scope:** the depth layers.

#### RN4 Depth: bands, fog, vignette and dust, and the play scene's frame

- **Module:** render · **Interface change:** yes (new: src/render/depth-art.ts; amended for review R1: src/render/play-frame.ts)
- **Pending-dep:** RN3
- **Targets:** `src/render/depth-art.ts` (new), `src/render/play-frame.ts` (new, review R1), `src/render/play-scene.ts`
- **Action:** port `BAND_FACTORS`, `BAND_COLORS`, `FOG_STRIPS`, `FOG_ALPHA`, `VIGNETTE_CELL`, `VIGNETTE_ALPHA`, `MOTES`, `xorshift32`, `makeRng`, `roomNumber`, `bandWidth`, `depthBands`, `fogShapes`, `vignetteShapes`, `moteField` and `moteShapes` into `src/render/depth-art.ts`; in the play scene the bands baked on entering a room (depths 0 to 3), the fog (4) and the vignette (9) baked once, and the dust every frame (8) (section 10.6). The glow is already part of the accent shapes (section 10.4). Amended for review R1 (MAJOR 3): port `playFrame` into `src/render/play-frame.ts` (section 14's signature, FIELDS from src/sim/sim.ts), and make the play scene's every frame the one call of section 10.6's paragraph "The frame": the scene draws only the lists playFrame returns and keeps no per-frame arithmetic of its own.
- **Acceptance:** `npm run accept:rn4` → exit 0, `Test Files  2 passed (2)` and `Tests  7 passed (7)` (tests/render/depth-art.test.mjs, tests/render/play-frame.test.mjs; 6 before review R2's ring case), then `flash: PASS` and `perf: PASS`. Red before the edit: the test cannot load src/render/depth-art.ts (build/evidence/RN4.amend.1.txt); amended for review R1, red before the port: the test cannot load src/render/play-frame.ts (build/evidence/RN4.amend.2.txt).
- **Tests mapped:** `tests/render/depth-art.test.mjs`, `tests/render/play-frame.test.mjs`, `npm run smoke`
- **Out of scope:** the ending.

#### END1 The ending and the playtest line

- **Module:** render, the entry · **Interface change:** yes (new: src/render/ending-art.ts, the `EndingScene` constructor)
- **Pending-dep:** RN4
- **Targets:** `src/render/ending-art.ts` (new), `src/render/ending-scene.ts` (new), `src/main.ts`
- **Action:** port `BEAT_S`, `RISE_S`, `glimpseShapes`, `riseAt`, `ceilingShapes`, `cardShapes`, `beatOfBar` and `endingFrame` into `src/render/ending-art.ts`; the scene of section 13 in `src/render/ending-scene.ts`, every frame drawn from `endingFrame(heard, t0, run)` alone (amended for review R1, MAJOR 4); `src/main.ts` creates it with `{ engine, run, playtest }` in place of GAME1's empty `ending` scene.
- **Acceptance:** `npm run accept:ending` → exit 0, `Tests  5 passed (5)` (tests/render/ending-art.test.mjs; amended for review R1: 3 before beatOfBar and endingFrame, red on the tree before their port, build/evidence/END1.amend.3.txt), then the line `play: chrome headless: PASS (console,play,text,scene)` (amended for review R2, MAJOR 1 and 3: the check `scene`, every room's bakes at the creature's camera and the glimpse risen by the card; build/evidence/END1.amend.4.txt; amended for review R3, MAJOR 1 and 2: and what every run and the ending draw, build/evidence/END1.amend.6.txt), its text line reading `title, link and notice only, and once the card is up "run m:ss · deaths 0"` (amended 2026-10-12: with `?playtest` the text check watches the ending, the hand-over to the scene `ending`, no page text until 400 ms before the rise ends (the probe's polling skew; review R1, MINOR 1, the text amended for review R2, MINOR 4), then exactly one run line once the card is up, its time and deaths those of the run the probe played). Red before the edit: the test cannot load src/render/ending-art.ts (build/evidence/END1.amend.2.txt); on GAME1's tree the text check alone reads `?playtest wants one run line, found []` (build/evidence/END1-text.amend.1.txt).
- **Tests mapped:** `tests/render/ending-art.test.mjs`, `npm run smoke` (VERIFY runs the playthrough in both browsers)
- **Out of scope:** any other text anywhere.

## 17. Writer table

Every value a prompt says to write has one writer. Values derived from git are preferred over stored ones (the cut commit is `git log --grep "^hush-spec: cut"`).

| Value | Writer |
|---|---|
| `HUSH-SPEC: READY`, the scoreboard lines at the cut, build/PROTECTED.sha256, build/GATES.sha256, every build/GATES.md line (CONSENT, JHON-GO, JHON-CODEX, JHON-CAPS-RESIDUAL, JHON-CAPS-ADVISORY, JHON-PREVIEW, JHON-CARRY, JHON-SHIP, REVOKED), index.html, every verifier (tools/, tests/, src/probe/, package.json and its lockfile, the configs) | the spec session or the producer |
| rooms/*.txt and music/area1.strudel (extracted byte-exact from this spec), replays/*.json (found by tools/solve.mjs), src/ except src/probe/ | the executor (a producer's applier in phase 3) |
| `passes:` flips and `blocked (...)` lines | the executor; resets of dispositioned items to `passes: false` and adoption flips (`hush-spec: adopt <ID>`) are the producer's |
| evidence files | whoever runs the command, through tools/evidence.mjs only |
| build/reviews/REVIEW-R<N>.md and AUDIT-<n>.md, round, `FIX R<N>` and `CYCLE` lines, HUSH-FIXLOG rows (`RESOLVED:`, `ADOPTED:`, dispositions), build/HUSH-BUILD.md, the `HUSH-SHIP-GATE` line, the release tag, PLAYTESTS rows, verify and live evidence | the phase-3 producer |
| `ATTEMPT:`, `CHECKPOINT:` and `HUSH-EXECUTE-ESCALATE` lines | the executor |
| `RESOLVED:` rows in SPEC-PROGRESS, `APPROVAL:`, the Handoff section, the page text outside the canvas | the spec session |
| `BUDGET#<n>` and `ALERT#<n>` lines | the cap hook |
| the installed hook, the managed settings entry, names.txt, the Claude Code update | the owner, from an elevated prompt |
| Learnings | the executor and the producer |

## 18. Handoff

The executor quotes this section verbatim at completion.

- The reviewer reads first: section 15 (every verifier, its command and its control), section 16 (the items in order), then tests/fixtures/oracle/ (the physics and the room format, normative), tests/fixtures/control-page/ (the product's shape at small scale, every planted fault) and tests/fixtures/reference/ (the pure modules' references).
- Waivers: none. Every item's acceptance ran red at the cut with the product absent, failing for its missing module or file (build/evidence/<ID>.cut-red.1.txt).
- The page text outside the canvas, exactly (index.html, written by the spec session):
  - the page title: `The Hush`
  - the link: `Source (AGPL-3.0)`, to `https://github.com/pretending2bejhon/hush`
  - the notice: `Music engine: Strudel, AGPL-3.0-or-later` (the loop's own choice of words: the licence requires the source offer, not this sentence)
  - and, only with `?playtest` once the ending card is up, `run m:ss · deaths n` in `<output id="playtest">` (section 13). Nothing else, and nothing over the canvas.

HUSH-SPEC: READY (items=23)
