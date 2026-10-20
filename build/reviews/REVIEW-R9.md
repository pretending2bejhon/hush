HUSH-REVIEW-R9: PASS (head=6e963503bddf22696776bb710173cd2c16bbad57 digest=aa2bbe57898bf9a1276731927a2c7a9722937ac6bd7df0a1ca1800b83c18f947 blockers=0 majors=0 minors=14)

Reviewer R9 (second dispatch, cycle 3), Opus standing in for Fable, 2026-10-20. All record names below are in build/evidence/review/.

**Integrity of the review**
- HEAD and the digest were the same at the start and at the end: R9-head.3 and .4, R9-digest.3 and .4.
- The only change in the repo is 52 untracked files under build/evidence/review/, all written by tools/evidence.mjs. No tracked file changed (R9-status.2). check-public is clean over the tree with them included: 1248 files (R9-check-public-tree.3).
- The machine was on AC power, energy saver off, display at 60 Hz, no heavy apps. The four headed perf runs inside RN1 to RN4 record this.
- Every mutation ran in a scratch clone of HEAD outside the repo, with node_modules linked in. Each was an exact find-and-replace that had to match once, and each file was restored with git checkout after its run. The clone is clean at HEAD.
- One mutant, `d-target` (targetStep without its +1), was already failing tests/clock/driver.test.mjs. But a synchronous loop elsewhere in the unit suite then spun for 37 minutes, so I stopped that vitest worker. That is why R9-mutations-unit.2 shows exit 4294967295 for it.
- This dispatch's records are the ones named below. The first dispatch's R9-*.1 records are not cited.

**Severity rule (R1 to R8's, kept)**
- **MAJOR:** a non-equivalent mutation survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent, or its effect cannot be reached.
- The mandate's rule holds too: every spec area's representative mutation is killed by that area's tests. That covers a physics constant, a beat binding, a room tile, the track, the generator, the clock, the keys, the art, the limiter, the calibration and the ending.

**In short**
- **The product.** Since R8, the product changed only in the three RUN-1 appliers: 7320a73, e9c9b46 and 554c10b. Their files are keys.ts, run.ts, calibrate.ts, calibration-scene.ts, main.ts, ending-art.ts, ending-scene.ts, gauntlet.ts, six rooms, eleven witnesses and index.html. Each matches its Action and its reference. All 23 acceptances pass, and standing is GREEN.
- **Suites.** npm test, the verifiers (324 of 324), the headed av probe and probe:console in headless Chrome and headed Edge all pass.
- **Axis B** passes in full.
- **Fixes since R8.**
  - R8's MINOR 4, 8, 9 and 10 are fixed: their mutants now fail.
  - R8's MINOR 1 is resolved by the F2 re-cut. The unguarded gauntlet wall now fails oracle-gauntlet's mid-run case.
- **The 14 MINORs.** Five are new: three gaps in play again's checks, the clear's edge, and X3's margin on fresh seeds. Nine are carried from R8.

## Axis A: spec conformance

### Acceptances re-run
Each ran as `node tools/evidence.mjs <ID> review -- <cmd>`.

| Record | Result |
|---|---|
| S1.9 | `smoke: PASS (/hush/)`. The canvas is 1220 by 686, centred (left 30.0, right 30.5). An undrawn pixel reads #07080d. The page shows the title, the link, the notice and the calibration line. |
| SIM1.9, RM1.9, CT1.9, SIM2.9 | 3/3; 5/5; `tree clean, 12 file(s)`; 5 files with 19 tests |
| W1.9, W2.9, W3.9 | `replay: PASS, 4/4/11 witness(es), every press on the kick`. Seed 1 gives 20/20, except 02-heartbeat at 19/20. Then `cheese: PASS, 24 section(s) in 7 room(s)...` |
| CL1.9, CL2.9, IN1.9, CAL1.9 | 14/14, 4/4, 6/6, 9/9. These match the spec's current lines. |
| AU1.9, AU2.9, AU3.9, FX1.9 | 2/2, 8/8, 5 files with 43 tests, 4/4 |
| GAME1.9 | `PASS (console,play,text,visibility,unlock,keys)` with 90 gauntlet reads; tsc and eslint clean |
| CAL2.10 | See below. |
| RN1.11, RN2.10, RN3.10, RN4.10 | 6/6, 14/14, 4/4, 7/7. Flash PASS (general max 6622, 6631, 6737 and 6574 px; red 0). Perf 60 fps with 100% of about 3605 intervals at 20 ms or less, p99 16.8 to 16.9 ms, headed on the Intel GPU. |
| END1.9 | See below. |
| standing.9 | GREEN (23 items, 22 mapped test files, 7 commands) |

CAL2.10:
- **Untouched run:** up 22.2 s; clicks 24, count-in fills 4, rings 24; values 0 0; Escape ignored; click starts 24 of 24. 1282 frames timed, and 29 of 129 waiting frames were pressed.
- **Tapped run:** up 11.5 s; values 0.0 40.1, equal to the taps' own.
- **Fallback run:** up 22.1 s; values 0.0 34.5, equal to the taps' own.
- **Flash:** `flash: PASS`, general max 5775 px, red 0.

END1.9:
- The art test passes 5/5, and the playthrough gives `PASS (console,play,text,scene,again)`.
- "run 0:59 · deaths 0" shows at the card.
- 33,740 bake pixels match their shapes, and 779 frames match command for command.
- 8688 frames sit on the step the heard time gives; the farthest is 1 step off.
- 190 card frames are on the beat, and 412 frames of the rise are timed from the ending's first frame.
- The again check: "a key half-way through the rise left the ending up (3504 ms in)…".

### Suites
- **npm test (R9-npm-test.2):** PASS.
  - Unit: 25 files, 145 tests.
  - Replay on the digest seed 2854993495: every witness at 20/20, except 02-heartbeat at 19/20.
  - Cheese PASS and smoke PASS.
  - Play: `PASS (console,play,text,network,storage,unlock,again,scene,keys)`. There were 3 requests, all to the page's origin, and nothing was stored.
- **test:verifiers (R9-verifiers.2):** 17 files, 324 of 324.
- **Headed av (R9-av-head.2):** PASS.
  - 2163 voices for 2140 onsets, with 0 errors, 0 dropped and 0 shifted.
  - Clock 0.11 ms peak to peak, 0 resyncs.
  - The mix as section 8.4 builds it: master gain 0.8, the compressor's five values, 10 of 10 gates in.
  - 2311 voice starts on their layer's onsets (+0.00 ms); 1909 of 1909 onsets started.
- **probe:console (R9-console.2):** PASS in headless Chrome and in headed Edge.

### Code against each item's Action
I read these against sections 9.2, 12, 13, 6.1 and the Actions of IN1, CAL1, GAME1, CAL2, RM1 and END1:
- the product diff since R8;
- calibration-scene.ts line by line against the control page's `Calibration` scene;
- main.ts, run.ts and play-scene.ts.

They conform:
- **Calibration hand-over.** skipCalibration hides `#calibration` first.
- **Course.** The course is A1, then B1 only after a rejected A1.
- **Calibrate.** It takes the one-pass rule.
- **Play again.** playAgain clears and hides the line, stops `ending`, starts `play` and calls startRoom(1).
- **Ending listener.** It ignores Escape, repeats and the rise.
- **startRoom.** It calls keys.flush() before the new origin.
- **Gauntlet.** gauntlet.ts generates the N-F2 a grid: its sha and the oracle tests pass.

The rest of src is unchanged since R8.

### Mutations
The records are R9-mutations-unit.2, -calib.3 and .4, -ending.2, -more.2 and .3 (.3 re-ran trk-anon after a harness fix) and -carried.1.

| § | Mutation | Result |
|---|---|---|
| 4.1 | GRAVITY 9; JUMP_VY -223; DASH_STEPS 39; WAVE_SPEED 161 | killed |
| 4.3 | crush rule removed | killed |
| 4.3 / 6.2 | the gauntlet's base form survives a wall (R8 MINOR 1) | killed (now resolved) |
| 4.3 | the clear at `>` the right edge | survives (MINOR 4) |
| 4.4 | `<=` for `<`; phase a sixteenth late; rest inverted | killed |
| 4.5 | layer back a step after the bar line; no gauntlet lead | killed |
| 5.1 | `^` read as down | killed |
| 5.3 | a one-tile bump on 01-wake's running row | killed (the replays) |
| 5.3 | one cell of 04-thorns' c field removed | killed (CT1's content sha); passes replays and cheese alone (NOTE 2) |
| 6.1 (N-F2 a) | LAG 1; corridor a row higher; WAVE_HALF 4; turning a sixteenth late | killed |
| 7 | the clap on the off-eighths | killed |
| 8.3 | LOOKAHEAD 0.2; the ramp from t - 30 ms; `$` labels numbered from 0 | killed |
| 8.3 | a note a sixteenth short | survives (R8 MINOR 13, carried) |
| 8.4 | unlockAt a bar late; ORIGIN_LEAD 0.3 | killed |
| 8.5 | CLOCK_JUMP 5 ms; CLOCK_STALE 5000 | killed |
| 9.1 | targetStep without +1; displaySec's sign flipped | killed |
| 9.1 | alpha held at 1 | survives (R8 MINOR 12, carried) |
| 3 / 9.2 | KeyZ mapped to DASH | killed |
| 9.2 (N-F4 a) | flush that drops the queue; flush newest first; no flush in startRoom | killed |
| 9.2 (N-F4 a) | flush that keeps the queue | survives the units and GAME1's keys and END1's again checks (MINOR 1) |
| 9.2 | next() newest first | survives (R8 MINOR 3, carried) |
| 10 | BLOCK_ALPHA 0.8; SQUASH_STEPS 5; MOTES 59; TRAIL 7; the near band at 0.8; ellipses at half size | killed |
| 10.1 / 10.2 | background #000000 | killed (smoke) |
| 10.6 | chunks 2 px off the camera | killed (scene) |
| 10.6 | playFrame with dead 0 and lock 0 | survives (R8 MINOR 2, carried) |
| 11 | the limiter's `>` for `>=` | killed |
| 12 (N-F1 c) | a lone A or a lone B as the display shift; MAD < 35 | killed (unit) |
| 12 (N-F1 c) | the waiting key pressed for two sixteenths; pass A's dots 20 ms late; B after an accepted A; the line never hidden | killed (CAL2) |
| 12 (R8 MINOR 10, 4 and 9) | repeats as taps; pass A or pass B a beat short; taps timed by the handler | killed (CAL2) |
| 13 (N-F4 a) | key filled on beat 2; key 60 px; BEAT_S 60/141 | killed (unit) |
| 13 (N-F4 a) | a key during the rise plays again | killed (again) |
| 13 (N-F4 a) | Escape plays again; a repeat plays again | survive (MINOR 2) |
| 13 (N-F4 a) | play again drops the calibration | survives (MINOR 3) |

## Axis B: the game against the concept (all pass)

- **Determinism (R9-axisb-sim.3).** Each of the 11 witnesses ran twice on the product sim. The end checksums are equal to each other and to the witness's. The product equals the oracle at all 32,128 steps.
- **The sim imports nothing from render, audio or the DOM.**
  - The closure is src/rooms/{codes,compile,gauntlet}.ts and src/sim/{beat,constants,headless,sim,types}.ts, with no packages.
  - No DOM, timer, clock, storage, audio or render global appears.
  - The Math calls are abs, ceil, floor, imul, max and min.
- **Layers, one per room on a bar line.**
  - Rooms 1 to 10 were run on past the clear with the input released. Each shows exactly one change of `layers`: bit k, on the first step of bar unlockBar(clear). That falls 1.01 to 4.96 beats after the clear, and matches section 4.5 computed independently.
  - The gauntlet's finish changes no layer.
  - In the page, the unlock check passes in all 10 rooms (GAME1.9, npm test).
- **The wave only through portals.** I checked 1,111 runs over 3,299,928 steps: each witness plus 20 jittered runs on each of the 5 HEAD sha words.
  - Base to wave happened 505 times, every one on a W cell.
  - Wave to base happened 505 times, every one on a B cell.
  - W cells are only in rooms 6, 7, 9, 10 and 11.
- **No text object.**
  - src outside src/probe has no Text, BitmapText, add.text, make.text or fillText.
  - textContent is written only at main.ts:45 (clearing the line) and ending-scene.ts:84.
  - The probe counts 0 text objects at every room's end and through 12 s of the ending, with `?probe` and with `?probe&playtest`.
- **Jitter test** through `tools/replay.mjs --all --jitter --seed <n> --kick`, on HEAD's sha words 1855337731, 3185517161, 1735834481, 24366380 and 381398359 (R9-jitter.6 to .10).
  - All 11 witnesses pass on every seed.
  - Three sit at exactly 18/20: 01-wake on 3185517161, 04-thorns on 24366380 and 10-crown on 381398359. See MINOR 5.
- **Branching on a flag.**
  - The product reads no page flag: no `location`, `URLSearchParams` or `import.meta.env` outside src/probe.
  - `?probe` is read only in the spec-owned src/probe/api.ts:1021.
  - The mandate's one sanctioned `?playtest` read no longer exists, by the owner's ruling N-F4 a.
- **The page and its text (R9-playtest-dom.2).**
  - **How I read "no text anywhere".** I read the mandate's "default build with no flag shows no text anywhere on the page" as the phase parameters order: the owner's rulings win. N4 puts the link and the notice on the page, N-F1 c the calibration line, and N-F4 a the run line at the card in every mode. The canvas stays wordless.
  - **Default build and `?playtest`.** The two are identical, 59 reads each:
    - boot reads at 1280×720, 800×450, 900×1200 and 1920×1080;
    - the untouched calibration read every 500 ms, the line hidden 22.2 s after the key;
    - room 1 under real keys.
  - Every one of those reads has:
    - only the title, the link, the notice and the line, and no line after the hand-over;
    - no text over the canvas, no generated content and no element over the canvas, by box or by a 9×9 elementFromPoint grid;
    - a canvas with no children, no probe API, and output#playtest hidden and empty.
  - **Section 12's "hiding it never resizes the canvas" holds.** At all four viewports, the canvas and the footer (34 px) are unchanged with the line hidden.
  - **`?probe&playtest` and `?probe`.** All 11 rooms cleared. The ending was read 104 times over 12 s.
    - "run 0:59 · deaths 0" appears only in output#playtest, outside the canvas, first seen 6881 and 6892 ms after the ending was seen (RISE_S 6857).
    - There are 0 text objects.
    - After play again, the scene is `play` and the line is hidden and empty.

## Findings

### MINOR 1. flush() emptying the queue is not pinned, so section 13's stale-key fault can return unseen
- **Where:**
  - src/input/keys.ts:61, `queue = [];` in flush.
  - tests/input/keys.test.mjs:73-87 flushes events stamped 9000 to 9005, then reads next() only up to step 3.
  - tests/game/run.test.mjs:256 reads only the first step after a start.
  - tools/probe-play.mjs:76: the again check presses KeyQ, which the keys never queue.
- **Failing path:** sections 9.2 ("flush() applies every queued event … and empties the queue") and 13 ("without it, a key pressed at the card is stamped with the finished run's steps and would wait for the new run to reach them"). This runs through IN1's, GAME1's and END1's acceptances and npm test.
- **Triggering input:** flush without `queue = [];` passes:
  - the 25 unit files (R9-mutations-unit.2, k-flushkeep);
  - the playthrough's keys and again checks (R9-mutations-ending.2, k-flushkeep-page).
- **What it does (R9-flushkeep-demo.1).** Space is pressed at the card, then released after the restart.
  - The product never holds it.
  - The mutant holds JUMP from new-run step 16,000 on, which is the finished run's step at the card.
- **Effect:**
  - A real first run of about 13 minutes puts the stale key about 13 minutes into the replay.
  - From then on JUMP or an arrow stays held until it is pressed again, so the next jump has no press edge and is swallowed.
  - It is bounded to a replay that began with a mapped key at the card.
- **Fix:**
  - keys.test.mjs adds `expect(keys.next(9010)).toBe(32)` after the ArrowRight keyup at step 3. That is past every flushed stamp, and the mutant gives 34.
  - Control: flush without `queue = []`, in tests/controls/product-tests.test.mjs.
- **Kind:** mechanical.

### MINOR 2. Play again's Escape and repeat filters are never exercised
- **Where:**
  - src/render/ending-scene.ts:50.
  - tools/probe-play.mjs:76 and againProblems (:321-347), which press KeyQ only.
- **Failing path:** section 13: "a keydown that is neither Escape nor a repeat starts a new run". This runs through END1's acceptance and npm test.
- **Triggering input:** dropping `e.code === 'Escape' ||` (eb-escape), or dropping `|| e.repeat` (eb-repeat), each passes the again check (R9-mutations-ending.2).
- **Effect:**
  - Escape at the card would restart the game.
  - A key held through the finish would restart it on its first auto-repeat once the card shows.
- **Fix:**
  - againProblems presses Escape at the card, and dispatches a keydown with `repeat` set as the calibration tapper does. It wants the ending still up 500 ms after each, before KeyQ.
  - Controls on the control page: `?ending=againescape` and `?ending=againrepeat`.
- **Kind:** mechanical.

### MINOR 3. Play again keeping the calibration is never checked
- **Where:** src/main.ts:42-51 (playAgain). The again check reads only scenes, room, origin and the step.
- **Failing path:** section 13 ("with the calibration in use kept") and section 9.2's stepOf in the replay. This runs through END1's acceptance.
- **Triggering input:** `run.setCalibration(0, 0);` before `run.startRoom(1)` in playAgain passes (R9-mutations-ending.2, eb-calib).
  - `__hush.calibration()` reads main.ts's own variable, which this mutant leaves as it was, so that read would not catch it either.
- **Effect:** every key of a replay is stamped without the player's input bias (up to 150 ms; the tapped run's 40 ms is about 10 steps), against a jitter bar of ±6 steps.
- **Fix:**
  - The again check hands over with non-zero values, such as the keys page's (100, -60).
  - After play again it presses real keys and holds them to the steps section 9.2 names under the kept values, as keyReplayProblems does.
  - Control: `?ending=againcalib`, which resets the run's calibration on play again.
- **Kind:** mechanical.

### MINOR 4. The clear's "at or past" edge has no test
- **Where:**
  - src/sim/sim.ts:220, `if (s.x + BW >= R.W * T) clearRoom();` (section 4.3, step 11).
  - No oracle test sequence clears with the creature's right edge exactly on the room's.
- **Failing path:** SIM2's acceptance and X3's replays.
- **Triggering input:** `>` for `>=` passes the 25 unit files, the jittered replays and the content check (R9-mutations-unit.2, s-clear).
- **It is reachable (R9-reach-clear.1):**
  - 254 of 21,754 jittered clears (1.2%) land exactly on the edge. One is 01-wake's witness jittered with replay.mjs runSeed(1855337731, 192), clearing on step 1621.
  - 20 more come from witness states in 02, 04 and 08, driven on with RIGHT alone.
- **Effect:**
  - Under the mutant, those clears come one step late.
  - A port that differs from the oracle there has no test to show it (R6's learning: every threshold needs a test on both sides).
- **Fix:**
  - oracle-base.test.mjs compares product and oracle at every step over that jittered run, through its clear.
  - Control: the `>` mutant in tests/controls/product-tests.test.mjs.
- **Kind:** mechanical.

### MINOR 5. X3's margin is thin on a fresh digest seed
- **Where:**
  - replays/04-thorns.json, and less so 01-wake, 10-crown and 02-heartbeat.
  - X3 needs 18 of 20 on the digest's seed (tools/ship-gate.mjs x3Seed, tools/test-all.mjs).
- **Triggering input (R9-jitter-rate.3 and .4):** 1000 runs on each of two HEAD sha seeds.
  - 04-thorns clears 945 and 950 of 1000.
  - 01-wake 973 and 977; 10-crown 978 and 986; 02-heartbeat 983 and 979; 08-steps 988 and 987.
  - The rest clear 997 to 1000.
  - On the five HEAD sha seeds of 20 runs, three witnesses sat at exactly 18/20 (R9-jitter.7, .9 and .10).
- **Effect:**
  - At p = 0.9475, a fresh 20-run seed falls under 18 about 8.5% of the time; over all witnesses, about 11%.
  - Every product commit toward rc2 re-rolls the seed.
  - X3 is green on this digest (npm test, seed 2854993495).
  - Section 5.4's "at least 98 of 100" holds only on its own seeds 1 to 5.
- **Fix (needs a decision):**
  - **Option 1:** re-solve 04-thorns and 01-wake for margin, with a witness acceptance on held-out seeds (for example at least 97% of 1000 runs on a seed outside 1 to 13).
  - **Option 2:** judge X3 over more runs at the same 90% bar (for example 180 of 200), by amendment.
- **Kind:** design.

### MINOR 6 to 14 (R8's MINOR 2, 3, 5, 6, 7, 11, 12, 13 and 14, carried)
Their files are unchanged since R8 or re-confirmed by mutant.
6. **The death burst and the respawn ring are never checked where they are drawn.** play-frame.ts:61. `dead: 0, lock: 0` still passes the unit files (pf-dead). Kind: mechanical, as designed.
7. **The keys' arrival order is not pinned.** keys.ts:45. next() newest first still passes (k-order). Kind: mechanical.
8. **X6's other predicate numbers are pinned at no edge.** flash-analyzer.mjs and its test are unchanged. Kind: mechanical.
9. **X4's 99% row has no control, and PERF_OK has no test.** probe-perf.mjs:17 and :133, unchanged; no test in tests/tools names PERF_OK. Kind: mechanical.
10. **X10 cannot see a SharedWorker, a WebTransport session or a popup.** probe-lib.mjs openPage still refuses only RTCPeerConnection. Kind: mechanical.
11. **X7's gate opening is held only within 30 ms.** probe-play.mjs:85, GATE_SKEW_S 0.03. Kind: mechanical.
12. **Section 9.1's alpha is never checked.** run.ts:142. Alpha held at 1 still passes (R9-mutations-carried.1). Kind: mechanical.
13. **The notes' level and length are unchecked.** scheduler.ts:60-61. A note a sixteenth short still passes (R9-mutations-carried.1). Kind: design.
14. **The run line's deaths are only ever read as 0.** ending-scene.ts:83. It is now the line in every mode, and it shares MINOR 6's root (no checked run dies). Kind: design.

Fixed since R8:
- MINOR 1 is resolved by the F2 re-cut, as noted above.
- MINOR 4, 9 and 10 are fixed: cb-endA, cb-endB, cb-handler and cb-repeat are killed.
- MINOR 8 is fixed: CL1 and CAL1 now read 14 and 9.

### NOTE 1. The mandate's page-text wording versus the owner's rulings
Axis B above reads the mandate's "no text anywhere" through N4, N-F1 c and N-F4 a, as the phase parameters order. The canvas holds no text in any mode. No action.

### NOTE 2. A hazard cell removed is caught only by the content sha
Removing one cell of 04-thorns' c field passes the replays and the cheese check (R9-mutations-unit.2, r-tile-behaviour). It fails CT1's sha, which is the room area's own check. No action.

### NOTE 3. A unit suite can hang instead of failing
Under `d-target`, the unit suite never returned: a synchronous loop in a test spun until I stopped it, after the driver test had already failed. npm test, and an evidence run around it, would hang rather than exit non-zero under such a fault. No action unless the producer wants a step cap in the looping test.

### NOTE 4. R8's NOTE 1 and NOTE 2, carried
The unreachable survivors and the teleport rule are unchanged: src/sim, track.ts and run.ts's TELEPORT have no diff.

## Files
- **Item records:** S1.9, SIM1.9, RM1.9, CT1.9, SIM2.9, W1.9 to W3.9, CL1.9, CL2.9, IN1.9, CAL1.9, AU1.9 to AU3.9, FX1.9, GAME1.9, CAL2.10, RN1.11, RN2.10, RN3.10, RN4.10, END1.9, standing.9.
- **Integrity:** R9-head.3 and .4, R9-digest.3 and .4, R9-status.2, R9-check-public-tree.2 and .3.
- **Suites:** R9-npm-test.2, R9-verifiers.2, R9-av-head.2, R9-console.2.
- **Axis B:** R9-axisb-sim.3, R9-jitter.6 to .10, R9-jitter-rate.3 and .4, R9-playtest-dom.2.
- **Mutations:** R9-mutations-unit.2, R9-mutations-calib.3 and .4, R9-mutations-ending.2, R9-mutations-more.2 and .3, R9-mutations-carried.1.
- **Reach and demonstrations:** R9-reach-clear.1, R9-flushkeep-demo.1.
- **Scratch (outside the repo):** <home>\AppData\Local\Temp\<redacted>\scratchpad\
  - clone\ is the scratch clone, at HEAD and clean.
  - mut.mjs is the harness, with batch-unit.mjs, batch-browser.mjs, batch-more.mjs and batch-carried.mjs.
  - axisb-sim.mjs, playtest-dom.mjs, reach-clear.mjs, flushkeep-demo.mjs and its flushkeep\ copies.
  - chain-node.sh and chain-browser.sh.
