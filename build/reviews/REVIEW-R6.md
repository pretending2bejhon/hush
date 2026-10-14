HUSH-REVIEW-R6: PASS (head=8f007a3bf705dede3599e764b36f45ccc6395510 digest=6c217e01ef418ee3d2664d310528567f0c56050f1b770e7d216da73486e414ac blockers=0 majors=0 minors=8)

Reviewer R6, Opus standing in for Fable, 2026-10-13. This is the round the owner granted after R5.

**Integrity of the review**
- HEAD and the digest (`node tools/ship-gate.mjs --digest`) were the same before and after the review.
- The laptop was on AC power, with energy saver off and a 60 Hz display (tools/machine-state.ps1, read before the first run).
- The only change in the repo is 50 untracked files under build/evidence/review/. All were written through tools/evidence.mjs. `node tools/check-public.mjs` is clean on the tree with them included (769 files).
- Every mutation ran in a scratch clone of HEAD outside the repo, with node_modules as a junction. Each mutation was one find-and-replace that had to match exactly once. Each file was restored with `git checkout` after its run, and the clone's status is clean.

**Severity rule (R1 to R5's, kept)**
- **MAJOR:** a non-equivalent mutation that survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent, or its effect cannot be reached.

**In short**
- **The product:** it still matches every Action, and it has not changed since R3: src (outside src/probe), rooms, music and replays are byte-equal to 81a66ae. All 23 acceptances pass on HEAD.
- **The suites:** standing is GREEN. npm test passes, and so do the verifiers (281 of 281), the headed av probe and the headed Edge playthrough.
- **R5's fixes hold.** R5's MAJOR 2 mutant (the driver on performance.now() − 50) and its MAJOR 1(a) mutant (frameTimes +100 ms) both fail now. The calibration pages are now read for errors, foreign requests and storage (NOTE 2's fix).
- **Every spec area's suite kills its core mutation.**
- **Every Axis B check passes.**
- **The findings:** six new MINORs and the two MINORs R5 carried. Each new one is a spec'd detail or tolerance that no check reads.

## Axis A: spec conformance

### Acceptances re-run
Each ran as `node tools/evidence.mjs <ID> review -- <cmd>`. The records are in build/evidence/review/.

| Item | Result |
|---|---|
| S1 (.6) | `smoke: PASS (/hush/)` |
| SIM1, RM1, CT1 (.6) | 3/3; 5/5; `tree clean, 12 file(s)` |
| SIM2 (.6) | 5 files, 19 tests |
| W1, W2, W3 (.6) | 4, 4 and 11 witnesses, every one 20/20 on seed 1 |
| CL1, CL2, IN1, CAL1 (.6) | 11/11, 4/4, 5/5, 6/6 |
| AU1, AU2, FX1 (.6) | 2/2, 8/8, 4/4 |
| AU3 (.6) | 5 files, 40 tests |
| GAME1 (.6) | `PASS (console,play,text,visibility,unlock,keys)`, 83 gauntlet reads; tsc and eslint clean (the chain exits 0) |
| CAL2 (.7) | see below |
| RN1 (.8) | 6/6, flash PASS, perf 60 fps with 100% of 3605 intervals at 20 ms or less (p99 16.9 ms), heavy apps none |
| RN2 (.7), RN3 (.7), RN4 (.6) | 14/14, 4/4, 7/7; each flash PASS and perf 60 fps, 100% |
| END1 (.6) | see below |

CAL2 (.7), all three runs:
- **Untouched:** up 43.9 s; 48 clicks, 8 fills, 48 rings; values 0 0; Escape ignored; click starts 48 of 48; 2565 frames timed (52 filled, 304 with the ring).
- **Tapped:** up 22.1 s; values 5.5 34.5, equal to the taps' own; starts 24 of 24; 1284 frames timed.
- **Retried:** up 43.5 s; values 5.5 34.6, equal to the taps' own; starts 48 of 48; 2566 frames timed.
- Flash: general max 9627 px, red 0. `flash: PASS`.

END1 (.6):
- Art test 5/5, and `PASS (console,play,text,scene)`.
- The run line "run 0:59 · deaths 0" at the card.
- 34,480 bake pixels as their shapes.
- 759 frames compared command for command.
- 8154 frames on the step the heard time gives (the farthest 1 step off).
- 63 ceiling reads and 29 card reads; 189 card frames on the beat heard while drawn; 235 glimpse pixels.

### Suites
- **`npm run standing`:** GREEN, with 23 items, 22 mapped files and 7 commands (standing.6).
- **`npm test`:** PASS (R6-npm-test.1).
  - Unit: 25 files, 135 tests.
  - Replay: on the digest seed 1814134273.
  - e2e: all eight checks pass; 772 frames compared and 8644 timed.
- **`npm run test:verifiers`:** 281/281 (R6-verifiers.1).
- **`npm run probe:av -- --headed`:** PASS (R6-av-head.1).
  - 2167 voices for 2140 onsets; 0 errors, 0 dropped.
  - Clock jitter 0.13 ms peak to peak.
  - All 2315 voice starts on their own layer's onsets (+0.00 ms); 1909 of 1909 onsets started.
  - The mix matches section 8.4.
- **Headed Edge** (`probe-play --channel edge --headed --check console,play,text`): PASS (R6-edge-console.1).

### Code against each item's Action
- I read these files against sections 8 to 14: main.ts, run.ts, engine.ts, gates.ts, keys.ts, driver.ts, output-clock.ts, calibrate.ts, game.ts, play-frame.ts and the three scenes. They conform.
  - The calibration scene follows section 12 line for line: the windows, the matching of taps, the order of attempts and the hand-over.
  - The run conforms: canonical(), the 0.25 s lead, unlockAt(k, unlockBar(s)) and gauntlet(gBeat / 4).
- The pure ports are held to their references by passing unit suites. They are unchanged since R3, when the ports were last diffed by hand.

### Mutations
**One per spec area** (R6-mutations-areas.1 and .2, and R6-mutation-browser-*.1). Every row except the last three is killed.

| § | Mutation | Killed by |
|---|---|---|
| 2 / 4.5 | unlockBar a sixteenth (not a beat) after the clear | sim, run |
| 3 | KeyC dashes | keys |
| 4.1 | COYOTE 20 | sim |
| 5.3 | a floor spike of 05-doors removed | content sha |
| 6.1 | the second kick spike left of its column | rooms, gauntlet oracle |
| 7 | clap gain .38 | content sha |
| 8.3 | LATE 0.08 | scheduler |
| 8.3 | openAt's ramp from t − 0.05 | gates |
| 8.4 | compressor ratio 3 | av (mix) |
| 9.1 | inputLagSec clamp 0.2 | driver, run |
| 9.2 | main.ts stamps keys 2 steps late | keys check |
| 10.3 | SQUASH_STEPS 7 | render |
| 10.6 | dust drawn 1 px down | scene check |
| 11 | FLASH_AREA_LIMIT 25,700 | limiter |
| 12 | avOffset sign flipped | calibrate |
| 12 | a rejected pass keeps its median | calibrate |
| 13 | card dots 25 px apart | ending art |
| 6.1 | the hat obstacle one row higher | survives (NOTE 1) |
| 12 | the MAD threshold's edge | survives (MINOR 1) |
| 12 | repeats taken as taps | survives (MINOR 2) |

**R5 re-run:**
- `run.frame(performance.now() - 50)` fails scene: room 1 "8 steps behind the music" (R6-mutation-r5-frame.1).
- `frameTimes[i] = frameMs + 100` fails all three calibration runs on its frames (R6-mutation-r5-calib.1).

**Hunted and survived:** MINORs 3 to 6 below.

## Axis B: the game against the concept (all pass)
- **Determinism** (R6-axisb-sim.1). Each of the 11 witnesses ran twice on fresh product sims. Checksums and full save() were identical and equal to the witness. The product equals the oracle at all 32,448 steps.
- **The sim imports nothing from render, audio or the DOM.**
  - src/sim and src/rooms import only each other's constants, types, beat, codes, compile and gauntlet.
  - There is no window, document, performance, Date, timer, random or console.
  - The Math calls are floor, ceil, min, max, imul and abs.
- **Layers, one per room on a bar line.** Each of rooms 1 to 10 was cleared by its witness and run on with no input.
  - There is exactly one layer change: bit k, on the first step of bar unlockBar(clear), 1.12 to 4.79 beats after the clear.
  - The gauntlet's clear finishes the run with no layer change.
  - In the page, the unlock check passes in all 10 rooms.
- **The wave only through portals.** 1,111 runs: each witness, plus 20 jittered runs on each of HEAD's five sha seeds.
  - Base to wave happened 505 times, every one on a W cell; wave to base 505 times, every one on a B cell. Nothing else changed the form.
  - W cells are in rooms 6, 7, 9, 10 and 11; the first is room 6.
- **No text object.** src has no Text, BitmapText, add.text, make.text or fillText. The probe counts 0 at every read.
- **Jitter test** through `tools/replay.mjs --all --jitter --seed` on HEAD's sha words 2399173179, 4144357086, 899278692, 3010414028 and 3325646096 (X3-jitter.29 to .33).
  - All 11 witnesses pass on every seed.
  - The lowest is 18/20: 09-gates on 3010414028.
- **Branching on a flag.**
  - Product code reads only `?playtest` (src/main.ts:42).
  - `textContent` is written only at src/render/ending-scene.ts:72.
  - `?probe` is read only in the spec-owned src/probe/api.ts:989.
  - Strudel comes only from `@strudel/web`, with no remote load.
- **`?playtest` and the page** (R6-playtest-dom.2).
  - **Default build:** no probe API. Only the title, the link and the notice. output#playtest hidden and empty. No element of any kind over the canvas.
    - This held at boot at 1280x720, 800x450 and 900x1200.
    - It held 2 s after a key, and 48 s after it, once the untouched calibration had handed over to room 1.
  - **`?playtest` without `?probe`:** the same.
  - **`?probe&playtest`:** 255 reads over 12 s of the ending.
    - 0 text objects and nothing over the canvas.
    - "run 0:59 · deaths 0" only in output#playtest, outside the canvas, first seen 6.852 to 6.897 s after the ending's first frame (the card is at 6.857 s).
  - **`?probe`:** output#playtest stays hidden and empty.

## Findings

### MINOR 1. X8's threshold edge is not pinned
- **Where:** src/input/calibrate.ts:24 (`accepted: mad <= 35`). tests/input/calibrate.test.ts:55-64 tests only MAD 36 (rejected) and MAD 34 (accepted).
- **Triggering input:** each of these passes tests/input 11/11 (R6-mutations-areas.1):
  - `mad < 36`: accepts MAD 35.5, which X8 rejects;
  - `mad < 35`: rejects MAD exactly 35, which section 12 accepts.
- **Effect:** inside a 1 ms band of MAD, X8's "rejects a run with MAD above 35 ms" fails. The section's core mutations are caught (R6-mutations-areas.2).
- **Fix:** test spread(35) accepted and spread(35.5) rejected, with `mad < 36` as the control. This is FX1's edge again (R3 MINOR 2).
- **Kind:** mechanical.

### MINOR 2. The calibration scene's key-repeat filter is never exercised
- **Where:** src/render/calibration-scene.ts:79. The tapper (src/probe/api.ts:793-801) and probe-flash's key presses never send `repeat`. No unit test loads the scene.
- **Triggering input:** removing `|| e.repeat` passes CAL2's whole acceptance (R6-mutation-browser-calib.1):
  - untouched 48, 8, 48 and values 0 0;
  - tapped 5.5 34.5 and retried 5.6 34.5, both equal to the taps' own;
  - every frame timed.
- **Effect:** while a player holds a key, every auto-repeat counts as a tap. That attempt is then rejected and rerun, or its median moves. Section 12 says the scene ignores repeats.
- **Fix:** the tapper also sends `repeat: true` keydowns off the spread in every attempt, logged apart as the Escapes are. Add a control-page `?calib=repeat`.
- **Kind:** design (the tapper's protocol is spec text).

### MINOR 3. The ending's rise is never timed from its first frame
- **Where:** src/render/ending-scene.ts:82 (t0).
  - tools/scene-check.mjs:522-542 (endingTimingProblems) judges only card frames.
  - tools/probe-lib.mjs:301-325 wants y ≥ 360 in the rise's first half and 0 at the last read.
  - The text check allows the run line up to RISE_MS + 6 s.
- **Triggering input:** `t0 = heard + 1.5` passes tests/render 36/36 and END1's `--query playtest` playthrough with scene, card frames on the beat (R6-mutation-hunt-ending.1).
- **Effect:** the glimpse and the card arrive 1.5 s late. About 3 s still passes npm test, and about 6 s the playtest wait. The card stays on the beat.
- **Fix:** hold every logged ending frame's glimpse y to riseAt(h − t0), for h in its [pre, post] bracket and t0 in the first frame's bracket. The ending log already holds both.
- **Kind:** mechanical.

### MINOR 4. X7's gate opening is held only within 30 ms of its bar line
- **Where:** src/audio/engine.ts:164. The unlock check allows GATE_SKEW_S = 0.03 (tools/probe-play.mjs:77, :82-103). engine.ts has no unit test, and probe:av never clears a room inside its windows.
- **Triggering input:** `unlockTime(...) + 0.025` passes tests/audio and tests/game 29/29 and the unlock check (R6-mutation-hunt-unlock.1). The −0.025 twin is caught.
- **Effect:** each returning layer's gate stays shut for the first 20 ms of its bar line, so the first onset there loses its attack. For the hat (decay .03) and the perc (decay .035) that is nearly the whole hit. The hazards still return on the line.
- **Fix:** under ?probe, record the gates' AudioParam automation (wrapped as start() is). Hold each unlock ramp to end at unlockTime(origin, unlockBar(clear)) within 1 ms.
- **Kind:** design.

### MINOR 5. The canvas's background colour is never read
- **Where:** src/render/game.ts:10 (section 10.1; S1's "exactly the config"). probe-smoke wants only two colours (tools/probe-smoke.mjs:39), and no test imports game.ts.
- **Triggering input:** `'#232a3d'` passes smoke, flash and probe-play `console,play,text,scene` (R6-mutation-hunt-bg.1).
- **Effect:**
  - A lighter slate shows behind the bands, the calibration and the ending, inside the page's own #07080d.
  - The palette of section 10.2, and the background levelLum assumes, no longer match the screen.
- **Fix:** read one undrawn canvas pixel, for example the calibration scene's corner, and want #07080d.
- **Kind:** mechanical.

### MINOR 6. Section 9.1's interpolation is never checked
- **Where:** src/game/run.ts:142 (view.alpha). tools/scene-check.mjs:218 accepts any alpha in [0, 1], and the reference run leaves the view out.
- **Triggering input:** `view.alpha = 1` passes tests/game, tests/render and tests/clock 68/68 and the scene check (R6-mutation-hunt-alpha.1).
- **Effect:** the creature and the camera are drawn up to one step (4.2 ms) ahead of the heard time: 1.7 canvas px at run speed and 4.4 px in a dash. The beat entities are unaffected.
- **Fix:** hold each full frame's alpha to alpha(heard, origin, displaySec, step), using the light record's heard time, within 0.01.
- **Kind:** mechanical.

### MINOR 7 (R5 MINOR 1, carried). The notes' level and length are unchecked
- **Where:** src/audio/engine.ts:64.
- Still open by inspection: tools/probe-av.mjs is unchanged since R5.
- **Kind:** design.

### MINOR 8 (R5 MINOR 2 = R4 MINOR 1, carried). The `?playtest` line's deaths are only ever read as 0
- **Where:** src/render/ending-scene.ts:71. The probe reads the line only after a clean gauntlet witness (tools/probe-play.mjs:295-296).
- Still open by inspection.
- **Kind:** design.

### NOTE 1. The gauntlet generator's hat rule is untested
- **Where:** src/rooms/gauntlet.ts:83.
- The hat obstacle moved one row up survives tests/rooms and the gauntlet oracle test.
- It is equivalent on v1: no bar of rooms/11-gauntlet.txt has a hat mask, so the grid's sha is unchanged.

### NOTE 2. X3's margin is as R5 found it
- The lowest witness is 18/20 (09-gates on seed 3010414028).
- On the digest seed 1814134273, 10-crown is 19/20.

### NOTE 3. How I read "the default build shows no text anywhere"
- The title, the source link and the notice are sanctioned by N3, N4 and the Handoff. I checked that nothing else ever shows.

## Void records (environment, not findings)
- **RN1.6 and RN1.7:** both refused by the perf probe's heavy-app rule. RN1.6 saw tiworker (Windows Update) at 12.2% CPU, and RN1.7 a Chrome at 17.9% CPU, sampled before the probe's own browser. They measured 59.98 and 58.1 fps. RN1.8 passed with no change.
- **R6-playtest-dom.1:** my script timed the run line from its own first poll. .2 times it from the ending's first frame, and passes.

## Files
- **Evidence**, all in build/evidence/review/:
  - item records: S1, SIM1, RM1, CT1, SIM2, W1, W2, W3, CL1, CL2, IN1, CAL1, AU1, AU2, AU3, FX1, GAME1 and END1 at .6; RN4.6; CAL2.7; RN2.7; RN3.7; RN1.6, .7 and .8;
  - standing.6 and X3-jitter.29 to .33;
  - R6-npm-test.1, R6-verifiers.1, R6-av-head.1 and R6-edge-console.1;
  - R6-axisb-sim.1, and R6-playtest-dom.1 and .2;
  - R6-mutations-areas.1 and .2;
  - R6-mutation-browser-av.1, -browser-scene.1, -browser-keys.1 and -browser-calib.1;
  - R6-mutation-r5-frame.1 and -r5-calib.1;
  - R6-mutation-hunt-ending.1, -hunt-unlock.1, -hunt-bg.1 and -hunt-alpha.1.
- **Scratch:** <home>\AppData\Local\Temp\claude\C--Users-<redacted>-code-hush\47a9b914-d0f9-4fd2-8e74-e3cb28e5ef2c\scratchpad\r6\
  - clone\ is HEAD, restored and clean.
  - Scripts: run-accept.mjs, mut.mjs, mutants.mjs (every mutant's find and replace), axisb-sim.mjs and playtest-dom.mjs.
