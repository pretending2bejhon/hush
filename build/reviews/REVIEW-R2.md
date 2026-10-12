HUSH-REVIEW-R2: FAIL (head=2f2b8a264dd2a0f7b32a3405befd501d19b51b1c digest=eeca3e10f750b308ac7576c8a4694c1f3545a48dc8ab87925fc15fbe85872638 blockers=0 majors=5 minors=4)

Reviewer R2, Opus standing in for Fable, 2026-10-12.

I re-read the digest with `node tools/ship-gate.mjs --digest` before and after the review, and it was equal both times. HEAD did not change. The only change to the repo is 52 new untracked files under build/evidence/review/, all written through tools/evidence.mjs. `node tools/check-public.mjs` is clean on the tree with them included.

Every mutation ran in a scratch copy of HEAD outside the repo. Each mutated file was restored from a pristine copy, and the copy's `git status` is clean.

**In short:** R1's nine fixes hold.
- The product matches every Action.
- `npm run standing` is GREEN, and so are `npm test` (X2) and `npm run test:verifiers` (231/231).
- Every Axis B check passes.
- Every mutation in the areas R1 fixed is now caught: the clear-time unlock, the gauntlet mapping, the count-in, the frame's beat binding and the card's beat.

The FAIL comes from what R1's fixes did not reach: the step from the tested shape lists to the canvas, and the player's own path (the real calibration hand-over and the real keyboard). Five mutations that break the shipped game get past every test of their area: the unit tests, smoke, the full playthrough with all its checks, and the flash probe. The perf probe reads only frame intervals, so it cannot catch them either.

**Severity rule (R1's):**
- **MAJOR:** a surviving mutation that changes behaviour and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a detail the spec fixes, with a bounded effect, gets through.
- **NOTE:** the mutation changes nothing, or its effect cannot be reached.

## Axis A: spec conformance

### Acceptances re-run (`node tools/evidence.mjs <ID> review -- <cmd>`, records in build/evidence/review/<ID>.2.txt)

| Item | Result |
|---|---|
| S1 | `smoke: PASS (/hush/)` |
| SIM1 | 3/3 |
| RM1 | 5/5 |
| CT1 | `tree clean, 12 file(s)` |
| SIM2 | 5 files, 19 tests |
| W1, W2 | `replay: PASS, 4 witness(es)` |
| W3 | `replay: PASS, 11 witness(es)` |
| CL1 | 11/11 (the spec's decisive line still says 8, MINOR 4) |
| CL2 | 4/4 |
| IN1 | 5/5 |
| CAL1 | 5/5 |
| AU1 | 2/2 |
| AU2 | 8/8 |
| AU3 | 5 files, 36 tests |
| FX1 | 3/3 |
| GAME1 | `PASS (console,play,text,visibility,unlock)`, 83 gauntlet reads; tsc and eslint clean |
| CAL2 | **CAL2.2 exit 1**: `tapped calibration values 10.6 32.7` (MINOR 3). CAL2.3 exit 0: untouched run 48 clicks, 8 fills, 48 rings, values 0 0; tapped run 15.0 25.0 |
| RN1 | 3/3, flash PASS, perf PASS headed on AC (60 fps, 100%) |
| RN2 | 14/14, flash PASS, perf measured 60 fps / 100%, then **exit 1** on `heavy apps: chrome 18.2% CPU` (environment, see the end) |
| RN3 | 4/4, flash PASS, perf PASS on AC (60 fps, 100%) |
| RN4 | 6/6, flash PASS, then **exit 1** on `mean 53.2 fps` (environment, see the end) |
| END1 | 5/5, `PASS (console,play,text)`, `"run 0:59 · deaths 0"` once the card was up |

### Code against each item's Action

I read every product file against the oracle, the references and sections 8 to 13. There is no deviation.
- src/sim and src/rooms match the oracle function by function.
- The clock, driver, keys, calibration, track, transport, gates and limiter match their references.
- engine.ts, run.ts and main.ts follow sections 8.2 to 8.4, 9 and GAME1's Action, including R1's fixes:
  - the gauntletBar getter;
  - ORIGIN_LEAD 0.25;
  - the play scene drawing only playFrame's lists;
  - the ending scene drawing only endingFrame's.

### Mutations (R2-mutations-unit.1, R2-mutations-calib-unit.1, R2-mutations-engine-calib.1, R2-mutation-*.1)

**Caught (22):**
- sim: COYOTE 23; entityOn phase sign; unlockBar +1.
- Content and rooms: one 04-thorns tile (spec-content); rest on/off swapped; gauntlet corridor 6 tall.
- Audio: track layer order reversed; startBar `>=` to `>`; gate ramp 50 ms; engine unlockAt a bar late (the unlock check).
- Clock and input: clock window 500 ms; displaySec sign; KeyC bit.
- fx and run: limiter scale; run's gauntlet map +1; canonical mask.
- Art: room-art edge rule; SQUASH_STEPS 5; warning window `<`; mote speed; card beat +1.
- Calibration: COUNT_IN 3 (6 fills).

**Got past every test (12):** grouped into MAJOR 1 to 5 and MINOR 1 and 2 below.

### Standing and suites
- `npm run standing`: GREEN, 23 items, 21 mapped files and 107 tests, 7 commands (standing.2).
- `npm test`: PASS. Unit is 24 files and 125 tests, the replay ran on the digest seed 4006231568, then smoke, then the playthrough with all six checks (R2-npm-test.1).
- `npm run test:verifiers`: 231/231 (R2-verifiers.1).

## Axis B: the game against the concept (all pass)
- **Determinism.**
  - Each of the 11 witnesses was run twice on fresh product sims. Checksum and full save() are equal both times, equal to the oracle at every step, and equal to the witness checksum (R2-axisb-sim.1).
  - In the page, the in-page replays equal the witnesses (GAME1.2, R2-npm-test.1).
- **The sim imports nothing from render, audio or the DOM.**
  - src/sim imports only constants, beat, types and ../rooms.
  - src/rooms imports only ../sim/types and its own codes.
  - Neither uses a DOM, timer or clock global, and eslint is clean.
- **Layers come back one per room on bar lines.**
  - In the sim, for rooms 1 to 10, layer k's bit is added exactly on the tick of nextBarStep(clear), which is the line of unlockBar(clear). That is 1.12 to 4.79 beats after the clear, and one bit per room.
  - In the page, the unlock check passes in all 10 rooms.
- **The wave only through portals.**
  - 510 form changes over 11 witnesses × 51 runs (each witness plus 50 jittered runs), and none happened off a portal of the right kind.
  - W cells appear only in rooms 6, 7, 9, 10 and 11.
  - The only `form = 1` is at src/sim/sim.ts:216, behind portalTouch.
- **No text object.** There is no Text, BitmapText or fillText in src, and the probe counts 0 objects everywhere.
- **Jitter test on seeds from HEAD's sha** (791382566, 1305649399, 3005887493, 3204272157, 431299356) and on X3's digest seed 4006231568: all 11 witnesses pass on every seed. The lowest result is 18/20, for 04-thorns on seed 3204272157 (X3-jitter.6 to .11).
- **Branching on a test flag.**
  - The only page-flag read in product code is the sanctioned `?playtest` at src/main.ts:42.
  - `?probe` is read only by the spec-owned src/probe/api.ts:299.
  - There is no branch on env, storage, network or navigator.
- **`?playtest`.**
  - Checked in default and `?playtest` modes, at 1280x720, 800x450 and 900x1200, at six moments: calibration before and after the key, room 5, the gauntlet, mid-rise and the card.
  - Everywhere: 0 text objects, and no element or text node meeting the canvas box.
  - Default mode shows only the link and the notice; `#playtest` stays hidden and empty through the card.
  - `?playtest` shows exactly `run 0:59 · deaths 0` in `#playtest`, only at the card (R2-playtest-dom-default.1, R2-playtest-dom-playtest.1).
- **The player's path works on HEAD** (no probe drives it). The real calibration, with the tapper, hands over to room 1 with values 15.1 and 25. A real ArrowRight held 600 ms moves the creature 5.9 tiles, and Space reaches the sim (R2-keyboard.1).

## Findings

**MAJOR 1. The play scene places its baked images itself, and nothing tests it. The room's walls, floors, static spikes and portals can be drawn away from where the sim collides, with every test green.**
- **Where:** src/render/play-scene.ts.
  - :115: the chunk image's x is col0 × 40 − camPx.
  - :109: the band's x is −round(factor × camPx).
  - :108: the band's scale and depth.
  - :67-68 and :114: depths 4, 9 and 5.
  - :138: the per-frame placement.
- **Failing path:** R1-MAJOR3 moved the per-frame lists into playFrame, but section 10.6's baking and placement rules still live in the scene.
  - No test or tool references xAt, the bake or an image.
  - The probes read only text, flashes and frame intervals.
  - Static geometry stays under the flash step by design (section 10.2), so the flash probe cannot see it move.
- **Triggering input:** `xAt: (camPx) => chunk.col0 * TILE_PX - camPx` changed to `xAt: () => chunk.col0 * TILE_PX`, so the room never scrolls.
  - Passes tests/render 32/32, smoke, the playthrough (11 rooms and the ending) and the flash probe (R2-mutation-scene-chunk.1).
  - Screenshots at room 1, step 800: on HEAD the creature stands on the 3-tile ledge; on the mutant it floats over the entrance pit (scratch head-room1.png and mutant-room1.png).
- **Minimal fix:** put the placement under test. Any one of:
  - a pure layout function in the reference that gives every image's key, size, x, scale and depth for a room and camPx, ported and compared, with the scene setting its images only from it;
  - a Node test harness that runs PlayScene against a recording fake of the Phaser calls it makes;
  - a pixel check in the playthrough.
- **Kind:** design.

**MAJOR 2. drawShapes, the only path from the tested shape lists to the canvas, has no test. Spikes can vanish and the creature can shrink with every test green.**
- **Where:** src/render/art.ts:46-83. Each kind's Phaser call is fixed by section 10.6, and the function is used by every bake and every frame of the play and ending scenes.
- **Failing path:** no test or tool calls drawShapes. The art tests compare shape lists only.
- **Triggering inputs:**
  - **(a)** At art.ts:55, the triangle's third y is taken from the second point, so every triangle is flat. Every static and beat spike is invisible. This passes tests/render, smoke, the playthrough and the flash probe; the flash probe's largest general flash area even drops to 3781 px (R2-mutation-draw-tri.1).
  - **(b)** At art.ts:63, `fillEllipse(x, y, rx, ry)` draws at half size. The creature's body and eyes, the death dots, the trail and the card's dots all shrink, and every test stays green (R2-mutation-draw-ellipse.1).
- **Minimal fix:** a tests/render drawShapes test with a recording fake Graphics. Each kind must map to the call and arguments 10.6 names, offset by (dx, dy). Its control is a copy with one kind mis-mapped.
- **Kind:** mechanical (10.6 already fixes every call).

**MAJOR 3. The ending's glimpse of the next area (concept line 4, section 13) is untested. It can stay below the view for the whole ending with every test green.**
- **Where:** src/render/ending-scene.ts:84 sets the image's y from f.glimpseY; :40-41 bake it and set its origin and depth.
- **Failing path:** R1-MAJOR4 tested endingFrame, but the scene applies glimpseY to its image itself, and no test or probe reads that image.
- **Triggering input:** `this.glimpse.y = f.glimpseY` changed to `= 720`.
  - Passes tests/render, smoke, the playthrough under `?playtest` (run line 0:59 at the card) and the flash probe (R2-mutation-ending-glimpse.1).
  - Screenshots at the card: HEAD shows the spires and the warm light under the dots; the mutant shows the dots alone on black (head-card.png and mutant-card.png).
- **Minimal fix:** MAJOR 1's harness or layout function applied to EndingScene (the image's key, depth and its y every frame equal to endingFrame's), or a pixel check once the card is up (the light #ffd27f at its position).
- **Kind:** design.

**MAJOR 4. Nothing tests the calibration's hand-over to the run beyond Inspect.calibration (section 12's hand-over, D9, the purpose of X8). With every test green, the measured values can be dropped, or no run started after the calibration.**
- **Where:**
  - src/main.ts:31 (`run.setCalibration`) and :34 (`run.startRoom(1)`).
  - src/game/run.ts:123 (`displaySec(avOffset)`) and :148 (`inputLagSec(avOffset, inputBias)`).
- **Failing path:**
  - The tapped run reads `__hush.calibration()`, which is main.ts's own copy (:26, :30), not the run's.
  - Every other probe skips the calibration with (0, 0) and then starts its own room through play().
  - tests/game/run.test.mjs never calls setCalibration.
- **Triggering inputs:**
  - **(a)** Delete main.ts:31. tests/game, clock and input 38/38 pass. The flash probe with `--calibration` passes: the untouched run shows 0 0, and the tapped run shows 12.5 28.1 in use while the run keeps 0 and 0. The playthrough with console, play, text, visibility and unlock passes (R2-mutation-main-setcal.1).
  - **(b)** Delete main.ts:34. The same suite passes (R2-mutation-handover.1), but after a real calibration the play scene has no run.
  - **(c)** run.ts:123 `displaySec(0)` and run.ts:148 `inputLagSec(0, 0)` both pass the unit tests (R2-mutations-calib-unit.1). No probe ever uses a nonzero calibration.
- **Minimal fix:**
  - After the tapped run's hand-over, require a run at room 1 whose step advances, with the run's own values equal to the ones in use (Inspect.calibration reading the run's values).
  - In run.test, require that setCalibration(a, b) shifts targetStep by displaySec(a) and stepOf by inputLagSec(a, b).
  - One probe step can close both this finding and MAJOR 5.
- **Kind:** design.

**MAJOR 5. No test ever sends the keyboard to the game (concept: "Keyboard"; sections 3 and 9.2). It can be detached with every test green.**
- **Where:** src/main.ts:22 (createKeys on window, with stepOf through the run) and src/game/run.ts:145-149 (stepOf).
- **Failing path:**
  - Every probe drives the sim through attachInput and presses only KeyQ, which the game ignores.
  - tests/input/keys.test.mjs uses its own target and stepOf.
  - tests/game/run.test.mjs uses a fake keys object.
  - Nothing calls run.stepOf.
- **Triggering input:** `target: window` changed to `target: new EventTarget()`. tests/input, game and clock 38/38, smoke, and the playthrough with all seven checks all pass (R2-mutation-main-keys.1).
- **Minimal fix:**
  - After MAJOR 4's hand-over, with a nonzero calibration, press real game keys through page.keyboard. Require the sim's input bits to change on the step that run.stepOf gives for the key's time (or within a few steps of it).
  - Add a run.test case for stepOf.
- **Kind:** design.

**MINOR 1. CAL1's trim is untested.**
- **Where:** src/input/calibrate.ts:21 and tests/input/calibrate.test.ts:72-76.
- **Failing path:** the test's fixture is symmetric, and dropping the lowest and highest tap never changes a median anyway.
- **Triggering input:** `.slice(1, -1)` changed to `.slice(0)` passes 5/5 (R2-mutations-unit.1).
- **Effect:** only the MAD changes. For [-50, -10, -10, 0, 0, 0, 0, 10, 10, 50] it is 5 trimmed and 10 untrimmed. So a pass near 35 ms is judged on its stray taps; the values themselves are unaffected.
- **Fix:** assert the MAD on an asymmetric fixture like that one.
- **Kind:** mechanical.

**MINOR 2. The creature's track in the run and the ring's place in the frame are untested.**
- **Where:** src/game/run.ts:130 (`track = trackStep(...)`) and src/render/play-frame.ts:59 (the ring's centre).
- **Failing path:** play-frame.test builds its own track and stops each witness at its clear, so no layer returns and no ring is drawn. run.test never reads run.track().
- **Triggering inputs:**
  - Removing run.ts:130 (no landing squash, no wave trail, no ring) passes tests/game and tests/render.
  - Changing play-frame.ts:59 `+ 5` to `+ 4` passes tests/render.
- **Fix:**
  - run.test compares run.track() with the reference's trackStep over the same ticks.
  - play-frame.test plays one witness past its layer's return, with stopAtClear false.
- **Kind:** mechanical.

**MINOR 3. The tapped calibration can fail a product that is correct when the page's timers run late. This affects CAL2's acceptance and X6's `npm run probe:flash`.**
- **Where:** src/probe/api.ts:154-161 places the taps with a timer and a 6 ms spin. tools/calibration-check.mjs:19 and :96-104 judge the values against the intended 40 and 25 ms, within 5 ms.
- **Observed at HEAD:**
  - In the full probe: CAL2.2 failed at 10.6 32.7. CAL2.3 gave 15.0 25.0. Mutant runs with identical calibration code gave 12.5/28.1, 15.1/25.0 and 15.1/25.0.
  - The tapped run alone, on AC: 15/15 exact, with or without 10 busy threads (R2-tapped-bg.1, R2-tapped-load.1).
  - The tapped run alone, on battery: 5/6 within 5 ms but off by 2.4 to 5.5 ms, and one at 9.5/30.5 (R2-tapped-battery.1). The error comes from pass B's taps landing late.
- **Fix:** the tapper records each dispatched keydown's timeStamp (and pass A's heard time). The check then compares the values in use with judgePass and calibrate of the offsets actually tapped, within 1 ms, or refuses a run whose taps strayed from their marks.
- **Kind:** design.

**MINOR 4. Two item texts were not amended for R1's changes.**
- **Where:**
  - build/HUSH-SPEC.md:1059: CL1's decisive line is `Tests  8 passed (8)`, but the suite has 11 tests since R1-MINOR2.
  - build/HUSH-SPEC.md:1204: END1 still says "no page text in the first half of the rise", while the probe now guards up to RISE_MS − 400 ms (R1-MINOR1, section 1.6).
- **Fix:** amend both lines.
- **Kind:** mechanical.

## Environment (not counted as a finding)
- RN2.2 measured 60 fps and 100%, then was refused on `heavy apps: chrome 18.2% CPU`.
- RN4.2 measured 53.24 fps with 99.78% of intervals at 20 ms or less, which means a few gaps of about one second.
- A follow-up perf run (R2-perf.1, with perf-2f2b8a26….json in review/) measured 30.32 fps. Its busy window had 20 frames in 20 s, and the sim was frozen there. So the headed window was hidden or covered: the page's visibility handler suspends the audio, and the sim with it.
- From about 16:45 to at least 17:48 the laptop was on battery, so I could not re-run the perf half of these two acceptances.
- Their own parts are green: the art tests (14/14 and 6/6) and the flash probe. RN1 and RN3, which run the same check:art on the same build, passed headed on AC.
- **Commands that failed:**
  - `node tools/evidence.mjs RN2 review -- npm run accept:rn2`
  - `node tools/evidence.mjs RN4 review -- npm run accept:rn4`
- **Before VERIFY:** re-run both on AC with the window in front. The headed av probe was not run; it belongs to VERIFY.

## Files
- **Evidence:** build/evidence/review/.
  - The item records `<ID>.2.txt`, plus CAL2.3.
  - standing.2 and X3-jitter.6 to .11.
  - R2-npm-test.1, R2-verifiers.1 and R2-axisb-sim.1.
  - R2-playtest-dom-default.1 and R2-playtest-dom-playtest.1.
  - R2-keyboard.1.
  - R2-tapped-bg.1, R2-tapped-load.1 and R2-tapped-battery.1.
  - R2-mutations-unit.1, R2-mutations-calib-unit.1 and R2-mutations-engine-calib.1.
  - R2-mutation-scene-chunk.1, -draw-tri.1, -draw-ellipse.1, -ending-glimpse.1, -main-setcal.1, -handover.1 and -main-keys.1.
  - R2-perf.1 and perf-2f2b8a264dd2a0f7b32a3405befd501d19b51b1c.json.
- **Scratch:** <home>\AppData\Local\Temp\claude\<redacted>\cd23d447-7a3c-467e-8b40-3be49e2c4845\scratchpad\r2\
  - mut\ is a copy of HEAD, restored and clean; pristine\ is the untouched copy.
  - Scripts: mutate.mjs, axisb-sim.mjs, playtest-dom.mjs, tapped.mjs, keyboard.mjs and shot.mjs.
  - Screenshots: head-room1.png, mutant-room1.png, head-card.png and mutant-card.png.
