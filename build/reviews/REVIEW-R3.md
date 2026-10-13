HUSH-REVIEW-R3: FAIL (head=81a66ae934912449e125d07e883c5f4bc6a5cc83 digest=4537d7d29782e4447e95b22dbc0a9888f1747a9f9d134077ec24bc56d5d66d36 blockers=0 majors=2 minors=6)

Reviewer R3, Opus standing in for Fable, 2026-10-12.

I read the digest with `node tools/ship-gate.mjs --digest` before and after the review. It was equal both times, and HEAD did not change. The only change to the repo is 56 new untracked files under build/evidence/review/, all written through tools/evidence.mjs. `node tools/check-public.mjs` is clean on the tree with them included (510 files). Every mutation ran in a scratch clone of HEAD outside the repo. Each touched file was restored from a pristine clone and compared byte for byte, and the clone's `git status` is clean.

**In short:** R2's nine fixes hold.
- The product matches every Action, and all 23 acceptances re-ran green.
- standing, npm test and the verifier suite are green.
- Every Axis B check passes.
- R2's four browser mutants now fail.

The FAIL is one layer further out again. The new `scene` check reads where the scenes put their images and Graphics, never what they draw. Six mutations that remove or misplace what the player sees get past every test:
- the beat entities;
- the room's geometry;
- the gauntlet's obstacles past column 128;
- the creature's place;
- the ending card's dots;
- the glimpse.

**Severity rule (R1's and R2's, kept):**
- **MAJOR:** a non-equivalent mutation that survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent or its effect cannot be reached.

## Axis A: spec conformance

### Acceptances re-run (`node tools/evidence.mjs <ID> review -- <cmd>`, records build/evidence/review/<ID>.3.txt, plus CAL2.4 and RN2.4)

All runs were on AC power, energy saver off, display at 60 Hz.

| Item | Result |
|---|---|
| S1 | `smoke: PASS (/hush/)` |
| SIM1, RM1 | 3/3, 5/5 |
| CT1 | `tree clean, 12 file(s)` |
| SIM2 | 5 files, 19 tests |
| W1, W2 | `replay: PASS, 4 witness(es)` |
| W3 | `replay: PASS, 11 witness(es)` |
| CL1, CL2, IN1, CAL1 | 11/11, 4/4, 5/5, 6/6 |
| AU1, AU2 | 2/2, 8/8 |
| AU3 | 5 files, 39 tests |
| FX1 | 3/3 |
| GAME1 | `PASS (console,play,text,visibility,unlock,keys)`, 73 gauntlet reads; tsc and eslint clean |
| CAL2 | Untouched run: up 43.9 s, clicks 48, fills 8, rings 48, values 0 0. Tapped run: up 22 s, values 15.1 25.0 (the taps' own 15.1 25.0). `flash: PASS` |
| RN1 | 6/6; flash PASS; perf PASS headed: 59.98 fps, 99.97% |
| RN2 | 14/14; flash PASS. RN2.3 measured 59.95 fps, then was refused on `heavy apps: chrome 15.6% CPU, chrome 14.7% CPU` (the owner's own Chrome). RN2.4 PASS: 60 fps, 100% |
| RN3 | 4/4; flash PASS; perf PASS: 60 fps, 100% |
| RN4 | 7/7; flash PASS; perf PASS: 59.98 fps, 99.94% |
| END1 | 5/5; `PASS (console,play,text,scene)`; `"run 0:59 · deaths 0"` once the card was up; 87 ending reads |

### Code against each item's Action

I read every product file against the oracle, the references, the control page's calibration scene and sections 8 to 13. No deviation.
- **src/sim and src/rooms** match the oracle function by function.
- **The pure modules** (clock line, driver, keys, calibration math, track, transport, gates, limiter) match their references.
- **engine.ts:**
  - the start order of 8.2 and the orbit patch;
  - the graph values of 8.4;
  - the 25 ms interval plus the Blob worker, and the 7 ms clock sample;
  - restart, unlockAt, gauntlet and click;
  - status with gauntletBar.
- **run.ts:**
  - canonical and ORIGIN_LEAD 0.25;
  - the driver and stepOf;
  - the unlock and the gauntlet mapping;
  - the track and setCalibration.
- **main.ts:**
  - the first-key listener: Escape excluded, capture phase, removed after it fires;
  - visibility and the PRE_STEP driver;
  - onDone = skipCalibration, and Inspect;
  - `?playtest` is the only page-flag read (src/main.ts:42).
- **calibration-scene.ts** is the control page's scene without ?calib.
- **play-scene.ts** has the bakes, keys, depths and placement of 10.6, with one playFrame call each frame.
- **ending-scene.ts** follows section 13 line for line.
- The only addition outside the spec's text is NOTE 1.

### Standing and suites

- `npm run standing`: GREEN, 23 items, 22 mapped files, 7 commands (standing.3).
- `npm test`: PASS (R3-npm-test.1).
  - Unit: 25 files, 133 tests.
  - Replay on the digest seed 1161287634.
  - Build, smoke, and the playthrough with all eight checks.
- `npm run test:verifiers`: 243/243 (R3-verifiers.1).
- `probe:av --headed` on HEAD, on the real device: PASS. 2157 voices for 2135 onsets, 0 errors, 0 dropped, clock 0.153 ms peak to peak (R3-av-head-and-gain.1).

### Mutations (R3-mutations-unit-a/b/c/d, R3-mutations-r2-scene/-r2-keys, R3-mutations-calibration.2, R3-mutation-*)

**Caught (43):** at least one core mutation in every area.
- **sim:** GRAVITY 9; JUMP_VY -223; entityOn `<=`; unlockBar's lead cut to a sixteenth; the clear at `>`.
- **Rooms and content:** a 04-thorns tile (spec-content); `^` and `v` swapped; a gauntlet corridor 6 tall; the 04-thorns witness with its dash removed (replay).
- **clock:** CLOCK_JUMP 0.008; targetStep without its +1; inputLagSec clamped at -0.15.
- **input:** keys applied on `<`; the trim removed; the MAD threshold at 40.
- **audio:**
  - layer order reversed; late shift 0.01; LATE 0.08; gate ramp 50 ms.
  - Orbit k wired into gate k+1. Only probe:av catches it: room 2's window and layer 1's solo are silent. The unlock check, which reads gate values, passes it.
- **fx:** area scale 1.
- **run:** unlock a bar late; gauntlet map +1; lead 0.1; displaySec(0); inputLagSec(0, 0); no track step.
- **art:** drawShapes' ellipse at half size; the edge rule; a gauntlet camera lead of 150; SQUASH_STEPS 5; warning alpha 0.5; limiter area per cell; band seed; frame step +24; ring 1 px up; card beat +1; rise 15 beats.
- **calibration:** COUNT_IN 3 (6 fills).
- **R2's browser mutants:**
  - chunks unscrolled: `scene` FAIL;
  - glimpse kept at y 720: `scene` FAIL;
  - keys on an unwired target: `keys` FAIL;
  - setCalibration dropped: `keys` FAIL.

**Survived (13):** grouped below as MAJOR 1 and 2 and MINOR 1 to 6. Three more were equivalent (NOTE 2).

## Axis B: the game against the concept (all pass)

- **Determinism.**
  - Each of the 11 witnesses was run twice on fresh product sims. Checksum and full save() are identical both times, equal to the witness, and equal to the oracle at every step (R3-axisb-sim.1).
  - In the page, the in-page replays equal the witnesses (GAME1.3, END1.3, R3-npm-test.1).
- **The sim imports nothing from render, audio or the DOM.**
  - src/sim imports only constants, beat, types and ../rooms.
  - src/rooms imports only ../sim/types, codes and gauntlet.
  - Neither uses a DOM, timer, clock or random global. The only Math calls are floor, ceil, abs, min, max and imul.
- **Layers come back one per room on bar lines.**
  - Rooms 1 to 10 were each played from the entrance and run on. Layer k's bit is added exactly on the tick of nextBarStep(clear), on a bar line 1.13 to 4.79 beats after the clear, with no other mask change.
  - In the page, the unlock check passes in all 10 rooms.
- **The wave only through portals.**
  - 506 form changes over 11 witnesses × 51 runs (each witness plus 50 jittered runs on HEAD-sha seeds), and none happened off a portal cell of the right kind.
  - W cells appear only in rooms 6, 7, 9, 10 and 11; the first is in room 6.
  - The only `form = 1` is at src/sim/sim.ts:216.
- **No text object.** There is no Text, BitmapText, fillText or add.text in src, and the probe counts 0 everywhere in both modes.
- **Jitter test through `tools/replay.mjs --seed`** on HEAD's five sha words (2175167209, 881927241, 3777351806, 2285657931, 3332754563) and on X3's digest seed 1161287634.
  - All 11 witnesses pass on every seed (X3-jitter.12 to .17).
  - The lowest is 04-thorns at 18/20 on X3's own seed. That is exactly the threshold, R1-MINOR5's known property. Any amendment that changes the digest re-rolls this seed.
- **Branching on a flag.**
  - The only page-flag read in product code is `?playtest` (src/main.ts:42).
  - `?probe` is read only by the spec-owned src/probe/api.ts:405.
  - There is no env, storage, network, navigator or random branch.
- **`?playtest`** (R3-playtest-dom.1).
  - **The bare page, with no query:** no window.__hush; only the title, the link and the notice; #playtest hidden and empty; nothing meets the canvas; zero errors.
  - **Default and `?playtest` modes**, checked at 6 moments × 3 viewports (1280x720, 800x450, 900x1200): 0 text objects, and no text node or element meets the canvas box.
  - **Default mode** shows only the link and the notice through the card.
  - **`?playtest`** shows exactly `run 0:59 · deaths 0` in output#playtest, outside the canvas, only at the card.

## Findings

**MAJOR 1. The scene check reads where the play scene's images and Graphics sit, never what they draw. Every beat entity, the room's walls, floors, spikes and portals, the gauntlet's obstacles past column 128, and the creature's place can be wrong with every test green.**
- **Where:**
  - src/render/play-scene.ts:140-142 draws playFrame's lists: `drawShapes(this.beat, f.beat)`, `drawShapes(this.creature, f.creature)`, `drawShapes(this.dust, f.dust)`.
  - :113 bakes the chunks (`roomShapes(room, chunk.col0, chunk.col1)`); :107 bakes the bands.
  - The check is tools/probe-lib.mjs:206-252 `playLayoutProblems`, over src/probe/api.ts:180-200 `layout`. It reads each object's key, size, place, depth, scale and command count. It wants commands only at depths 7 and 8 (probe-lib.mjs:250) and never reads a texture or a command's content.
  - Section 10.6 (HUSH-SPEC.md:811-814) asks no more.
- **Failing path:**
  - What is tested: the lists (playFrame, roomShapes, drawShapes on a fake) and the images' placement.
  - What is not: the scene's own calls between them, that is which list goes to which Graphics at which offset, and which shapes go into which bake.
  - The other probes cannot see it: flash only bounds flashes, perf reads frame intervals, and smoke reads the calibration screen.
- **Triggering inputs.** Each passes the unit suite (25 files, 133 tests), build, smoke, npm test's playthrough with all eight checks (scene and keys included) and the flash probe:
  - **(a)** :140 → `drawShapes(this.beat, f.beat.filter((s) => s.k === 'ring'))`. No beat stone, door or beat spike is drawn in any room. The flash max drops from about 9.7k to 3,163 px (R3-mutation-scene-beat-undrawn.1).
  - **(b)** :113 → `this.bakeShapes(key, chunk.w, chunk.h, [])`. No wall, floor, static spike or portal is drawn (R3-mutation-scene-room-blank.1).
  - **(c)** :113 → `roomShapes(room, 0, chunk.col1 - chunk.col0)`. Rooms 1 to 10 are a single chunk, so they are unchanged. In the gauntlet, chunks 1 to 4 show columns 0 to 127 again. The pattern-built obstacles (the melody corridor of bars 16 to 23) are drawn where nothing collides, and the walls that kill are invisible (R3-mutation-scene-gauntlet-chunk0.1).
  - **(d)** :141 → `drawShapes(this.creature, f.creature, 0, 40)`. The creature is drawn one tile below its box (R3-mutation-scene-creature-offset.1).
  - Screenshots of HEAD beside each mutant are in the scratch shots\ folder: head-room-2-700, head-room-1-800, head-room-11-7400 and each scene-*.png.
- **Minimal fix:** read the output where the player meets it. Either:
  - in the scene check's half-way read of each room, read pixels in the same frame as the sim read (for example through Phaser's renderer snapshot inside the probe), and compare them with what 10.6 puts there for that state: a solid tile and an empty cell, a beat entity cell on and one off, the creature's shell at its box, and gauntlet columns past 128. The four mutants above are its controls, plus MINOR 3's two.
  - or move the scene's assembly (each Graphics' list and offset, each bake's shapes) into a tested pure function, with the scene a loop over it.
- **Kind:** design.

**MAJOR 2. The ending's check reads where the glimpse and the card's Graphics sit, never what they show. The card's three dots (ruling N2) and the glimpse of the next area (concept line 4) can vanish with every test green.**
- **Where:**
  - src/render/ending-scene.ts:86 (`drawShapes(this.graphics, f.shapes)`) and :40 (`this.bakeShapes(KEY_GLIMPSE, 1280, 720, glimpseShapes())`).
  - The check is tools/probe-lib.mjs:260-290 `endingLayoutProblems`. It reads the image's key, size, place and y, and that one Graphics sits at depth 1 (:274).
  - Section 13 (HUSH-SPEC.md:853-855) asks no more.
- **Triggering inputs.** Each passes the unit suite, build, smoke, END1's `probe-play --query playtest --check console,play,text,scene` (run line 0:59 at the card, 92 ending reads) and the flash probe:
  - **(a)** :86 → `drawShapes(this.graphics, f.card ? [] : f.shapes)`. There is never a card (R3-mutation-ending-card-undrawn.1; ending-card-undrawn-card.png beside head-card.png).
  - **(b)** :40 → `this.bakeShapes(KEY_GLIMPSE, 1280, 720, [])`. A blank glimpse rises, and the dots pulse on black (R3-mutation-ending-glimpse-blank.1).
- **Minimal fix:** once the card is up, read pixels:
  - the current beat's dot at full #e8ecf4 and the other two at 0.3 (this also pins the dots to the music's beat on the canvas);
  - #ffd27f at the light's baked place;
  - during the rise, the ceiling's edge where riseAt puts it.

  Its controls are the two mutants. Alternatively, apply MAJOR 1's mechanism to the ending.
- **Kind:** design.

**MINOR 1. CL1's stale-pair rule is never reached by its test.**
- **Where:**
  - src/clock/output-clock.ts:9 (`CLOCK_STALE = 500`) and :81.
  - tests/clock/output-clock.test.mjs:28 and :62: the scenario 'stale pairs after a resume' stamps its stale pairs with now − 900, which is negative for now ≤ 600 ms. So output-clock.ts:70 (`stampPerformance > 0`) drops them before the stale rule runs.
- **Triggering input:**
  - CLOCK_STALE 5000 passes tests/clock 15/15 (R3-mutations-unit-a.1).
  - On the same device with its clocks starting at 2 s, 500 and 5000 differ by up to 940 ms of line offset (R3-clock-stale.2).
- **Effect:** bounded to output timestamps that go stale, which the hide-and-resume of 8.6 can produce.
- **Fix:** start that scenario's clocks at 2000 ms; the control is CLOCK_STALE 5000.
- **Kind:** mechanical.

**MINOR 2. FX1's test never asks for a sum exactly at the limit, and room 2's stones sit on it.**
- **Where:**
  - src/fx/flash-limiter.ts:23 (`sum + area >= FLASH_AREA_LIMIT`).
  - tests/fx/flash-limiter.test.mjs:19-21 and :28 ask for sums of 26,000 and 25,000.
  - tests/render uses the reference limiter on both sides (beat-art.test.mjs:8, play-frame.test.mjs:11).
- **Triggering input:**
  - `>` in place of `>=` passes the unit suite and the flash probe (R3-mutations-unit-b.1, R3-mutation-fx-limit-edge.1).
  - Room 2's entities a and b are 16 cells each: 25,600 px, exactly the limit. Section 11 holds each of their changes under 0.1; the mutant lets them through unheld.
- **Effect:** the stones' look only; X6 holds either way.
- **Fix:** a request of exactly 25,600 px in a fresh frame must come back under 0.1, and 25,599 must pass.
- **Kind:** mechanical.

**MINOR 3. The play scene's use of the limiter is untested.**
- **Where:** src/render/play-scene.ts:126 (`this.limiter.beginFrame()`) and :139 (`this.levels = f.levels`); section 10.4 (HUSH-SPEC.md:791). play-frame.test makes its own fresh limiter and passes the levels itself.
- **Triggering inputs.** Each passes unit, build, smoke, the full playthrough and the flash probe:
  - **(a)** Remove :126. The limiter latches full at room 2's first stone change and then holds every entity change of the run under 0.1 a frame, so entities fade over frames instead of switching on their step (R3-mutation-scene-limiter-frame.1).
  - **(b)** Remove :139. No change ever asks the limiter. The flash max is 10,161 px, still under the limit with this content (R3-mutation-fx-limit-edge.1, second entry).
- **Effect:** bounded to fade versus cut; X6 holds.
- **Fix:** a scene-level read of an entity's fill across its change, for example with MAJOR 1's mechanism. The two mutants are its controls.
- **Kind:** design.

**MINOR 4. The engine's mix values (8.4) are unpinned.**
- **Where:** src/audio/engine.ts:118 (the compressor: -10, 6, 4, 0.005, 0.12) and :120 (master 0.8). tools/probe-av.mjs:24-25 judges only the floors.
- **Triggering input:** master gain 0.4 passes probe:av --headed (R3-av-head-and-gain.1, which also holds HEAD's run).
  - Every window and solo halves: the windows go from 0.41 to 0.21 RMS, and the quietest solo from 0.0066 to 0.0033.
  - Both stay above the 0.002 floor.
- **Effect:** loudness and mix only.
- **Fix:** the av probe compares the levels with those of the spec's graph within a tolerance, or reads the node parameters through the probe.
- **Kind:** design.

**MINOR 5. No test presses Escape (sections 3, 8.2 and 12).**
- **Where:** src/main.ts:47 and src/render/calibration-scene.ts:79. The only verifier that sends Escape is tests/input/keys.test.mjs:56, and it tests the keys table only.
- **Triggering input:** both Escape checks removed passes smoke and probe-flash --calibration (48/8/48 and 0 0; tapped 15.0 25.0) (R3-mutation-escape-starts.1).
- **Effect:** Escape would start the audio and the calibration, and during an attempt it would count as a stray tap.
- **Fix:** the calibration check presses Escape before its first key and wants no AudioContext and the scene still waiting. It presses Escape once during an attempt and wants the values unchanged.
- **Kind:** mechanical.

**MINOR 6. Section 12's count-in tap window is untested.**
- **Where:** src/render/calibration-scene.ts:92 (pass A) and :93 (pass B). The tapper only taps clicks and rings 4 to 23 (src/probe/api.ts:277).
- **Triggering input:** removing pass A's window passes probe-flash --calibration (tapped 15.0 25.0) (R3-mutations-calibration.2).
- **Effect:** a player who taps along the count-in adds offsets of about −1.7 to −0.4 s, all matched to click 4. Over 200 simulated players with a ±20 ms spread (a scratch calculation on src/input/calibrate.ts), the values move by up to 14.3 ms and no pass is rejected.
- **Fix:** the tapped run also taps the count-in, and tapLogValues drops those taps as section 12 does.
- **Kind:** mechanical.

**NOTE 1. The run's view is unpinned, with one rule the spec does not state.**
- The interpolation the play scene draws from (src/game/run.ts:139-142) has no reference; tests/fixtures/reference/run.mjs leaves the view out.
- The scene check's 5 px camera slack (tools/probe-lib.mjs:203) is more than one step at run speed (1.7 px), so any error stays within one step.
- run.ts also skips the tween when the creature moves more than a tile in one step (a respawn or a new room; :29, :139-140). Section 9.1's text does not say so. It is harmless.

**NOTE 2. Three mutations were equivalent.**
- The portal kind at src/sim/sim.ts:166: no pinned room has the box over both W and B.
- Two hand-edits of the 04-thorns witness left its clear state unchanged: a jump press moved 12 steps, inside the 20-step buffer, and a JUMP bit dropped at a step where it changes nothing.

## Environment and void records (not findings)
- **RN2.3** was refused on the machine state; RN2.4 passed.
- **R3-mutations-calibration.1:**
  - Its cal-countin-taps entry is void. The probe hung for 1719 s after the tool call passed 10 minutes. The clean re-run is .2.
  - Its cal-count-in-3 entry is valid (KILLED).
- **R3-clock-stale.1** is a script syntax error; .2 is the record.
- **Not run, as VERIFY's:** probe:console's headed Edge pass, probe:supply and probe:live.

## Files
- **Evidence:** build/evidence/review/.
  - The item records: <ID>.3.txt, plus CAL2.4, RN2.3 and RN2.4.
  - standing.3 and X3-jitter.12 to .17.
  - R3-npm-test.1, R3-verifiers.1, R3-axisb-sim.1 and R3-playtest-dom.1.
  - R3-av-head-and-gain.1 and R3-clock-stale.1 and .2.
  - R3-mutations-unit-a.1, -unit-b.1, -unit-c.1 and -unit-d.1; R3-mutations-r2-scene.1 and -r2-keys.1; R3-mutations-calibration.1 and .2.
  - R3-mutation-scene-beat-undrawn.1, -scene-room-blank.1, -scene-gauntlet-chunk0.1, -scene-creature-offset.1, -ending-card-undrawn.1, -ending-glimpse-blank.1, -scene-limiter-frame.1, -fx-limit-edge.1, -escape-starts.1 and -engine-gate-off-by-one.1.
- **Scratch:** <home>\AppData\Local\Temp\claude\<redacted>\6c41ac2e-6cfb-4835-9360-ac452d6251aa\scratchpad\r3\
  - mut\ is a clone of HEAD, restored and clean; pristine\ is the untouched clone.
  - Scripts: mutate.mjs, axisb-sim.mjs, playtest-dom.mjs, stale-clock.mjs and shot.mjs.
  - Screenshots in shots\: head-room-1-800, head-room-2-700, head-room-11-7400, head-card, and one per survivor of MAJOR 1 and 2.
