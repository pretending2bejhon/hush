HUSH-REVIEW-R8: PASS (head=e6468ae318a153c83b0c5f936e4e16c82f428363 digest=81a1d6cc2560d24e1f8b93daf725980262ada7b898d9552af9b9cafa6e3a9d58 blockers=0 majors=0 minors=14)

Reviewer R8, Opus standing in for Fable, 2026-10-14. This is cycle 2's second review, after FIX R7.

**Integrity of the review**
- HEAD and the digest were the same before and after the review (R8-head.1 and .2, R8-digest.1 and .2).
- The laptop was on AC power, with energy saver off and a 60 Hz display. I read this in the shell before the first headed run and did not record it, per the owner's rule.
- The only change in `<repo>` is 59 untracked files under build/evidence/review/, all written through tools/evidence.mjs (R8-status.1). No tracked file changed. check-public is clean over the tree with them included, 1013 files (R8-check-public-tree.1).
- Every mutation ran in a scratch clone of HEAD outside the repo, with node_modules linked in. Each was an exact find-and-replace that had to match once, and each was restored with git checkout after its run. The clone is clean at HEAD.

**Severity rule (R1 to R7's, kept)**
- **MAJOR:** a non-equivalent mutation that survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent, or its effect cannot be reached.
- The mandate's own rule also held: every spec area's representative mutation (a physics constant, a beat binding, a room tile, the track and so on) is killed by that area's tests. So no suite survived its area's mutation.

**In short**
- **The product.** src outside src/probe, rooms, music and replays is unchanged since R7 (`git diff 55e41c8..HEAD` over them is empty). It matches every Action, and all 23 acceptances pass.
- **Suites.**
  - standing is GREEN, npm test passes, and the verifiers pass 306 of 306.
  - The headed av probe, the headed Edge playthrough, probe:supply and check-public over the history and over dist all pass.
  - The controls pass at HEAD: av 12 of 12 on the real device, product 46 of 46, flash 9 of 9.
- **The fixes hold.** R7's MAJOR 1 and 2 and its MINOR 1, 2, 4, 5, 6, 8 and 10 hold, and so do audit 1's MINOR 1 and 2. Every mutant of those fixes fails, except one equivalent case (AV_OK reading the record's own bound, which must now equal 3).
- **Axis B passes in full.**
- **The MINORs.** There are eight new ones and R7's six carried ones. Each new one is a mechanical gap in the checks:
  - one sim rule no test reaches;
  - the death effect;
  - the keys' arrival order;
  - the calibration's attempt end;
  - X6's predicate numbers;
  - X4's 99% row;
  - X10's network row;
  - two stale decisive lines.

## Axis A: spec conformance

### Acceptances re-run
Each ran as `node tools/evidence.mjs <ID> review -- <cmd>`.

| Item | Result |
|---|---|
| S1.8 | `smoke: PASS (/hush/)`. Canvas 1220 by 686, centred (left 30.0, right 30.5), and an undrawn pixel reads #07080d. |
| SIM1.8, RM1.8, CT1.8 | 3/3; 5/5; `tree clean, 12 file(s)` |
| SIM2.8 | 5 files, 19 tests |
| W1.8, W2.8, W3.8 | 4, 4 and 11 witnesses, each 20/20 on seed 1 |
| CL1.8, CL2.8, IN1.8, CAL1.8 | 14/14 (the spec's line says 11, see MINOR 8), 4/4, 5/5, 7/7 (the line says 6, see MINOR 8) |
| AU1.8, AU2.8, AU3.8, FX1.8 | 2/2, 8/8, 5 files with 42 tests, 4/4 |
| GAME1.8 | `PASS (console,play,text,visibility,unlock,keys)` with 83 gauntlet reads; tsc and eslint clean |
| CAL2.9 | see below |
| RN1.10, RN2.9, RN3.9, RN4.9 | 6/6, 14/14, 4/4, 7/7. Flash PASS (general max 9750, 9578, 9592 and 9592 px). Perf 60, 59.98, 60 and 59.98 fps, with 99.97 to 100% of intervals at 20 ms or less; heavy apps none. |
| END1.8 | see below |
| standing.8 | GREEN (23 items, 22 mapped test files, 7 commands) |

CAL2.9, all three runs:
- **Untouched:** up 43.9 s; 48 clicks, 8 fills, 48 rings; values 0 0; Escape ignored; click starts 48 of 48; 2563 frames timed.
- **Tapped:** up 22.1 s; values 5.6 34.5, equal to the taps' own.
- **Retried:** up 43.5 s; values 5.6 34.5, equal to the taps' own.
- Flash: general max 9653 px, red 0.

END1.8:
- The art test passes 5/5, and the playthrough `PASS (console,play,text,scene)`.
- The run line "run 0:59 · deaths 0" shows at the card.
- 34,480 bake pixels match their shapes, and 759 frames match command for command.
- 8767 frames sit on the step the heard time gives.
- 189 card frames are on the beat heard while they were drawn, and 412 frames of the rise are timed from the ending's first frame.

### Suites
- **npm test (R8-npm-test.1):** PASS.
  - Unit: 25 files, 141 tests.
  - Replay on the digest seed 2174867148: all 11 witnesses 20/20.
  - e2e: all eight checks pass. The network row shows 3 requests, all to the page's origin, and nothing is stored.
- **test:verifiers (R8-verifiers.1):** 16 files, 306 of 306.
- **Headed av (R8-av-head.1):** PASS.
  - 2173 voices for 2142 onsets, with 0 errors, 0 dropped and 0 shifted.
  - Clock 0.106 ms peak to peak, 0 resyncs.
  - The mix as section 8.4 builds it, 10 of 10 gates in.
  - 2324 voice starts on their own layer's onsets; 1912 of 1912 onsets started.
- **probe:console (R8-console.1):** PASS in headless Chrome and in headed Edge.
- **probe:supply (R8-supply.1):** every row ok; the notices name 62 runtime packages.
- **check-public:** the history is clean over 3 refs, 114 commits, 590 trees and 1310 blobs (R8-check-public-history.1). dist is clean (R8-check-public-dist.1).
- **Controls:** tests/controls/av-probe.test.mjs 12/12 (R8-av-controls.1), product-tests 46/46 (R8-product-controls.1), flash-probe 9/9 (R8-flash-controls.1).

### Code against each item's Action
I read these files against sections 4 to 14 and the items' Actions: main.ts, run.ts, engine.ts, scheduler.ts, gates.ts, track.ts, driver.ts, keys.ts, calibrate.ts, flash-limiter.ts, output-clock.ts, sim.ts, beat.ts, constants.ts, codes.ts, compile.ts, gauntlet.ts, headless.ts, play-frame.ts, creature.ts, ending-art.ts, game.ts and the three scenes. They conform. The art ports are held to the reference by the passing suites and by the art mutants below.

### Mutations
The records are R8-mutations-unit.1, -verifiers.1, -x6.1, -x6-browser.1, -browser.1, -calib.1, -keys.1 and -track.1, plus R8-reach.1 and .2. Unit-level mutants faced the 25 unit files and the jittered replays, and the area's own command where one is named.

| § | Mutation | Result |
|---|---|---|
| 4.1 | COYOTE 23, BUFFER 21, DASH_COOLDOWN 47, LOCK_STEPS 23, RESPAWN_STEPS 71, DASH_EXIT_DIAG 159, RUN_REDUCE 3, APEX 81, AIR_DECEL 6, WAVE_SPEED 160 to 161, RUN_DEN 46 | all killed |
| 4.3 | crush rule removed; the wave survives a wall; the dash given back mid-dash; the wave portal keeps the facing | killed |
| 4.3 | a base portal cell wins over a wave cell; falling below the room no longer kills | survive, unreachable in v1 (NOTE 1) |
| 4.3 / 6.2 | the gauntlet's base form survives a wall | survives the units and the replays, and is reachable (MINOR 1) |
| 4.4 | an entity on for one beat-tick longer; rest inverted | killed |
| 4.5 | nextBarStep(s + 1) in the sim (R7 MINOR 1); no beat of lead before the bar; GAUNTLET_LEAD_TICKS 0 | killed |
| 5.1 | rest parsed inverted; phase parsed as 0; the up spike box from 1792 | killed |
| 5.1 | `v` read as an up spike | survives, unreachable (NOTE 1) |
| 5.3 | one spike of 01-wake removed (a room tile) | killed (content sha) |
| 6.1 | a kick as one spike; the corridor a row lower | killed |
| 6.1 | the hat row | survives, unreachable (NOTE 1) |
| 7 | the clap moved to the off-eighths | killed (the gauntlet's pattern test and the content sha) |
| 8.3 | LOOKAHEAD 0.2; LATE 0.08; the gate's ramp from t - 30 ms or to t + 20 ms; setMask without cancel | killed |
| 8.3 | a repeated label keeps its last pattern | survives, unreachable (NOTE 1) |
| 8.3 | a note's duration a sixteenth short; its cycle floored | survive (MINOR 13, carried) |
| 8.4 / GAME1 | origin lead 0.3 s; the gauntlet mapped a bar late; unlockBar(step + 1) in the run (R7 MINOR 1) | killed |
| 9 / 8.5 | CLOCK_JUMP 3 or 5 ms and the burst at 30 ms (R7 MINOR 2); trust at 3 quanta; resync after 2 low pairs | killed |
| 9.1 | alpha a step behind; displaySec at ±0.2 s; inputLagSec below 0; a cap of 25 steps | killed |
| 9.1 | no teleport rule in the view | survives (NOTE 2) |
| 3 / 9.2 | Escape mapped to JUMP | killed |
| 3 / 9.2 | the key queue applied newest first | survives (MINOR 3) |
| 3 / 9.2 | repeats not skipped | survives, near-equivalent (NOTE 1) |
| 10.1 / 10.2 | NO_CENTER; background #000000 (R7 MINOR 4 and 10) | killed (smoke) |
| 10.1 to 10.6 | the gauntlet framed at 150 px; BLOCK_ALPHA 0.8; MOTES 59; SQUASH_STEPS 5; vy 0 in the frame | killed |
| 10.3 / 10.6 | playFrame passes dead 0 and lock 0 | survives the units and END1 (MINOR 2) |
| 11 | a held change comes back as 0.1; later changes pass once one is held | killed |
| 12 | MAD < 36 or < 35 (R7 MINOR 6); an even median's lower middle; 9 taps judged | killed |
| 12 | both passes two beats short | killed (click starts 46 of 48) |
| 12 | pass A a beat short | survives CAL2 (MINOR 4) |
| 13 | BEAT_S 60 / 141 | killed |
| 15 X11 | MAX 901 or 1200; MIN 599 or 480; no upper check; the latest or the first row counted; N6 2; no Firefox row (R7 MAJOR 1) | killed |
| 15 X7 | the gate's bound 300; clockValid dropped; the record's bound not held equal; the probe's bound 300 (R7 MAJOR 2) | killed |
| 15 X7 | AV_OK reading the record's own bound | equivalent (that bound must equal 3) |
| 15 X6 | limit 25,601 or 26,000; `>` for `>=`, general and red (R7 MINOR 5); transitions 7 or 10 | killed |
| 15 X6 | transitions 9; window 900 ms; luminance step 0.2; darker state 0.6; red 0.25 apart | survive the analyzer's tests and all 9 browser controls (MINOR 5) |
| 15 X4 | the probe's 99% row at 50% | survives both perf controls (MINOR 6) |
| 15 X4 | PERF_OK at 50 fps or 90%; no power row; no heavy-app row | survive tests/tools (MINOR 6) |
| 15 X9 | no UTF-16BE branch; no BOM-less LE; a binary body read as UTF-8 (audit 1 MINOR 2) | killed |
| 15 X10 | no private-file-system row; no WebSocket log (audit 1 MINOR 1) | killed by their controls |
| 15 scene | rise slack 3 px; 1 frame wanted; timed from the second frame (R7 MINOR 8) | killed |

## Axis B: the game against the concept (all pass)
- **Determinism (R8-axisb-sim.1).**
  - Each of the 11 witnesses ran twice. save() was equal at every step, and both end checksums equal the witness's.
  - The product equals the oracle at all 32,448 steps.
- **The sim imports nothing from render, audio or the DOM.**
  - The import closure is src/rooms/{codes,compile,gauntlet}.ts and src/sim/{beat,constants,headless,sim,types}.ts.
  - No DOM, timer, clock, storage, audio or render global appears.
  - The Math calls are abs, ceil, floor, imul, max and min.
- **Layers, one per room on a bar line.**
  - In each of rooms 1 to 10 there is exactly one layer change: bit k, on the first step of bar unlockBar(clear), 1.13 to 4.79 beats after the clear.
  - The gauntlet's clear finishes the run with no layer change.
  - In the page, the unlock check passes in all 10 rooms (GAME1.8, npm test).
- **The wave only through portals.** I checked 1,111 runs over 3,274,795 steps: each witness, plus 20 jittered runs on each of HEAD's sha words.
  - Base to wave happened 504 times, every one on a W cell.
  - Wave to base happened 504 times, every one on a B cell.
  - W cells are in rooms 6, 7, 9, 10 and 11; the first is room 6.
- **No text object.**
  - src has no Text, BitmapText, add.text, make.text or fillText.
  - The probe counts 0 at every room's end and over 12 s of the ending, in both probe modes.
- **Jitter test** through `tools/replay.mjs --all --jitter --seed`, on HEAD's sha words 3863382755, 413225928, 990666643, 1850611400 and 792888163 (R8-jitter.1 to .5).
  - All 11 witnesses pass on every seed.
  - The lowest is 19/20: 04-thorns on the first seed and 10-crown on the second.
- **Branching on a flag.**
  - Product code reads only `?playtest` (src/main.ts:42).
  - textContent is written only at src/render/ending-scene.ts:72.
  - `?probe` is read only in the spec-owned src/probe/api.ts:989.
- **`?playtest` and the page (R8-playtest-dom.1).** I read the mandate's "no text anywhere" as the Handoff's page text only: the title, the link and the notice.
  - **Default build:** 109 reads, all clean. No probe API; only the title, the link and the notice; output#playtest hidden and empty; no generated content; one canvas with no child; no element of any kind over the canvas. The reads were taken:
    - at boot, at 1280 by 720, 800 by 450, 900 by 1200 and 1920 by 1080;
    - 2 s after a key;
    - over 47 s of the untouched calibration;
    - in room 1 under real keys.
  - **`?playtest` alone:** the same, 109 reads.
  - **`?probe&playtest`:** all 11 rooms, then 166 reads over 12 s of the ending, with 0 text objects and nothing over the canvas. "run 0:59 · deaths 0" appears only in output#playtest, outside the canvas. It was first seen 6.90 s after the ending was seen; the last read without it was at 6.83 s, and RISE_S is 6.857 s.
  - **`?probe` alone:** output#playtest stays hidden and empty.

## Findings

### MINOR 1. The gauntlet's wall rule in the base form has no test
- **Where:**
  - src/sim/sim.ts:293, `if (moveX(dx)) { die(); return; }` in gauntletStep.
  - tests/sim/oracle-gauntlet.test.mjs:34-38 places the creature on the floor at steps 9800 and 10300.
    - At 9800 the floor rows of a wave bar are corridor wall, so the creature is crushed at once.
    - From 10300 on, the base bars hold no wall.
- **Failing path:** sections 4.3 (step 8) and 6.2 ("a horizontal collision kills"), through SIM2's acceptance and X3's replays.
- **Triggering input:** `moveX(dx);` in place of the guarded call passes:
  - all 25 unit files;
  - the 11 jittered replays (R8-mutations-unit.1).
- **It is reachable.** From the witness's own state at step 10060 (the gauntlet's bar 23, the last wave bar), hold JUMP:
  - 181 steps on, the oracle dies at column 386, the B portal column, in the base form at row 6.33, against the wall of the corridor's last sixteenth;
  - the mutant lives (R8-reach.2).
- **Effect:**
  - This is the only place where the base form can meet a wall in the gauntlet.
  - A port that let the creature through there would leave the oracle with no test to see it.
- **Fix:**
  - oracle-gauntlet.test.mjs compares from the witness's state in bar 23, with JUMP held into and past the B column.
  - Control: the mutant above, in tests/controls/product-tests.test.mjs.
- **Kind:** mechanical.

### MINOR 2. The death burst and the respawn ring are never checked where they are drawn
- **Where:**
  - src/render/play-frame.ts:61 passes `dead` and `lock` from save() to creatureShapes.
  - tests/render/creature.test.mjs tests creatureShapes alone, with those fields set.
  - tests/render/play-frame.test.mjs and the browser scene check replay only witness runs, and no witness run dies.
- **Failing path:** section 10.3: "the creature bursts into 8 dots that fade over the 72 respawn steps; the respawn is a ring shrinking onto the spawn over 12 steps". This runs through section 10.6's frame, RN2's and RN4's acceptances and npm test's scene check.
- **Triggering input:** `dead: 0, lock: 0` in playFrame passes:
  - the 25 unit files (R8-mutations-unit.1);
  - END1's whole acceptance, the scene check included (R8-mutations-browser.1).
- **Effect:**
  - On every death, the creature would stay drawn whole where it died for 0.3 s, then appear at the spawn with no ring.
  - The pacing model of section 5.5 counts 2 to 10 deaths a room.
- **Fix:**
  - play-frame.test.mjs adds a run that dies and respawns: room 1 with right held into the first pit. It compares every frame through the 72 death steps and the 24 lock steps.
  - Control: the mutant above.
  - Same root as MINOR 14: no checked run ever dies.
- **Kind:** mechanical.

### MINOR 3. The keys' arrival order is not pinned
- **Where:**
  - src/input/keys.ts:45 applies the due events in arrival order (section 9.2, as in tests/fixtures/reference/keys.mjs).
  - tests/input/keys.test.mjs:63 ("in arrival order") queues one event only.
- **Failing path:** section 9.2, IN1's acceptance and GAME1's keys check.
- **Triggering input:** `for (const q of [...queue].reverse())` passes:
  - the 25 unit files (R8-mutations-unit.1);
  - the playthrough's keys check (R8-mutations-keys.1).
- **When it matters:** when a key's keydown and keyup fall due in the same next() call. Under that mutant, the key would stay held until its next press, instead of being dropped as the spec drops it. This happens:
  - for a tap shorter than one frame;
  - for any tap during a long frame (a room's bake can take up to 150 ms on the main thread);
  - under a typical calibration (input lag about 30 ms, display shift near 0), where every event of a frame is already due at the next frame's first tick.
- **Fix:**
  - A case with ArrowRight down and up both due before one next(), which must return 0, and two codes in the reverse order.
  - Control: the reversed queue.
- **Kind:** mechanical.

### MINOR 4. Section 12's attempt end is held only to within a beat
- **Where:**
  - src/render/calibration-scene.ts:144 and :153 end an attempt at t0 + 23 BEAT + TAIL and p0 + (23 BEAT + TAIL) x 1000.
  - tools/calibration-check.mjs:398-419 (tapLogValues) counts the taps that landed while the scene's own attempt was up, so the judge ends each attempt where the scene does.
  - calibFrameProblems judges the pictures inside the attempts the scene reports.
  - Nothing holds the attempt's end frame itself.
- **Triggering input:** pass A ending a beat early (`22 * BEAT`) passes CAL2's whole acceptance (R8-mutations-calib.1):
  - **untouched:** up 43.0 s; 48 clicks (click 23 is still handed over inside the lookahead), 8 fills, 48 rings; values 0 0;
  - **tapped:** values 4.5 34.5, equal to the taps' own (HEAD gives 5.6 34.5);
  - **retried:** values 4.6 34.5.
  - Both passes two beats early is caught, because clicks 22 and 23 never start (46 of 48).
- **Effect:**
  - Click 23's tap is never counted, so each pass A judges 19 taps instead of 20, and the values move by about 1 ms.
  - By inspection, pass B is held only by the ring count's floor of 44 and the 39.4 s floor, so it could end two beats early.
- **Fix:**
  - tapLogValues takes each attempt's taps up to section 12's end, not the scene's.
  - calibFrameProblems wants the attempt live at the poststep of every frame before that end and gone after the first frame past it, judged on brackets as the windows are.
  - Controls: `?calib=endearly` on each pass.
- **Kind:** mechanical.

### MINOR 5. X6: the predicate's other numbers are pinned at no edge
- **Where:**
  - tools/flash-analyzer.mjs:20-25: LUM_STEP 0.1, DARK_LIMIT 0.8, RED_RATIO 0.8, RED_DUV 0.2, TRANSITIONS_OVER 8 and WINDOW_MS 1000.
  - tests/tools/flash-analyzer.test.mjs:33-47 tests:
    - a full-field flash at 4 Hz and at 3 Hz;
    - a change under 0.1;
    - a darker state of 0.8 or more.
  - The browser controls are all full-contrast at 4 Hz (tests/fixtures/control-page/control.js:7-9).
- **Failing path:** X6 ("applies WCAG 2.3.1's predicate"), the acceptances of CAL2 and RN1 to RN4, and VERIFY's probe:flash.
- **Triggering input:**
  - Each of these passes the analyzer's tests and all 9 browser controls (R8-mutations-verifiers.1, R8-mutations-x6.1, R8-mutations-x6-browser.1):
    - TRANSITIONS_OVER 9;
    - WINDOW_MS 900;
    - LUM_STEP 0.2;
    - DARK_LIMIT 0.6;
    - RED_DUV 0.25.
  - LUM_STEP 0.12 and RED_RATIO 0.9 pass the analyzer's tests too.
- **Effect:**
  - Under such a predicate, a 4 Hz full-field flash of 0.15 in luminance, or one whose darker state is 0.7, would pass X6.
  - No verdict on the product changes: its own limiter's LUM_STEP is pinned on both sides (R3 MINOR 2), and its peak is 9,653 px general and 0 red.
  - This is R7 MINOR 5's class, carried past the area to the rest of the predicate.
- **Fix:** analyzer cases on the lax side of each edge, written against the literal numbers:
  - a change of exactly 0.1 counts;
  - a darker state of 0.79 counts;
  - 8 transitions inside 999 ms count, and an 8th at 1001 ms does not;
  - a red ratio of exactly 0.8 counts;
  - a red pair 0.201 apart counts.
  - Controls: the five mutants above.
- **Kind:** mechanical.

### MINOR 6. X4: the 99% row has no control of its own, and PERF_OK has no test
- **Where:**
  - tools/probe-perf.mjs:17 sets MIN_SHARE_20MS 0.99, and :133's message hard-codes "under 99%".
  - tests/controls/perf-probe.test.mjs has the clean page and ?stress=20. ?stress=20 also fails the fps row, and the test only matches "under 58".
  - tools/ship-gate.mjs:236-238, PERF_OK, has no test: nothing in tests/tools names it.
- **Triggering input:**
  - MIN_SHARE_20MS 0.5 passes both perf controls (R8-mutations-browser.1).
  - PERF_OK at 50 fps, at 90%, with no power row or with no heavy-app row each passes tests/tools/ship-gate.test.mjs (R8-mutations-verifiers.1).
- **Effect:**
  - At the ship gate each copy backs the other (PERF_OK wants j.pass and its own 0.99), so one drift alone is caught there.
  - But the art items' check:art reads the probe alone.
  - A drift in both copies passes X4 with every check green.
  - R7 fixed this class for X7 (MAJOR 2), and X4 kept it. R7 NOTE 3 was the conditions' half of it.
- **Fix:**
  - ship-gate.test.mjs pins PERF_OK at its edges: 58 and 57.99 fps, 0.99 and 0.989, battery, saver, 59 Hz, a heavy app, SwiftShader, 59.9 s.
  - The same test holds the probe's constants equal to the gate's.
  - The probe's message reads MIN_SHARE_20MS.
  - A control-page fault that stalls every 40th frame (about 58.5 fps, 97.5% within 20 ms) fails the 99% row alone.
- **Kind:** mechanical.

### MINOR 7. X10: the network row cannot see a SharedWorker, a WebTransport session or a popup
- **Where:**
  - tools/probe-lib.mjs:101-125 (openPage) logs page requests, WebSockets and service-worker requests, and refuses RTCPeerConnection.
  - :431-436 (networkViolations) reads that log.
- **Failing path:** X10's network row: npm test's network check, probe:supply and the calibration pages.
- **Triggering input:** a page served from 127.0.0.1 that reaches localhost (R8-x10-reach.2).
  - **Seen:** fetch, a dedicated Worker's fetch, sendBeacon, EventSource and an iframe.
  - **Not seen:** a SharedWorker's fetch, `new WebTransport(...)`, and `window.open(...)` after the first key (which every probe presses).
- **Effect:**
  - A dependency could reach another host through any of these three with X10 green.
  - The bundle today names SharedWorker twice (Strudel's synced scheduler, which the product never reaches), and never names WebTransport or window.open.
- **Fix:** audit 1 MINOR 1's pattern.
  - openPage's init script refuses and counts SharedWorker, WebTransport and window.open (the product uses none of them), and networkViolations reports the counts.
  - The control page gains one fault for each, and each must fail the network row alone.
- **Kind:** mechanical.

### MINOR 8. CL1's and CAL1's decisive lines are stale
- **Where:** build/HUSH-SPEC.md:1204 wants `Tests  11 passed (11)` for CL1, and :1234 wants `Tests  6 passed (6)` for CAL1. FIX R7 added three clock tests (R7 MINOR 2) and one X8 edge test (R7 MINOR 6).
- **Triggering input:** CL1.8 prints `Tests  14 passed (14)`, and CAL1.8 prints `Tests  7 passed (7)`.
- **Effect:** as written, neither acceptance matches its decisive line any more. Standing does not read these lines. Review R2's MINOR 4 found the same for CL1.
- **Fix:** set the lines to 14 and 7, naming the amendment.
- **Kind:** mechanical.

### MINOR 9 to 14 (R7's MINOR 3, 7, 9, 11, 12 and 13, carried)
Their files are unchanged since R7. src, tools/calibration-check.mjs and src/probe/api.ts have no diff, and probe-play.mjs's GATE_SKEW_S at :77 is unchanged.
9. **The tapper cannot tell a tap's event time from its handler's time.** calibration-scene.ts:91 and :93; api.ts:795-800. Kind: design, settled in the fixlog.
10. **The calibration's key-repeat filter is never exercised.** calibration-scene.ts:79. Kind: mechanical, as designed in the fixlog.
11. **X7's gate opening is held only within 30 ms.** engine.ts:164; probe-play.mjs:77. Kind: mechanical, as designed.
12. **Section 9.1's alpha is never checked.** run.ts:142. Kind: mechanical, as designed.
13. **The notes' level and length are unchecked.** R8's duration and cycle mutants of scheduler.ts:60-61 also survive the 25 unit files. Kind: design.
14. **The `?playtest` line's deaths are only ever read as 0.** ending-scene.ts:71. It shares MINOR 2's root. Kind: design.

### NOTE 1. Equivalent or unreachable survivors in v1
- **The portal priority (sim.ts:166).** No box touches a W and a B cell at once: 1,111 checked runs, and 1,000 widely jittered ones in rooms 6, 7, 9, 10 and 11 (R8-reach.1).
- **The fall rule (sim.ts:213).** Every room's bottom row is solid.
- **`v` and the hat rule (codes.ts:6, gauntlet.ts:83).** v1 has no hanging spike.
- **A repeated label (track.ts:28).** The track repeats none.
- **keys.ts:31's repeat filter.** A repeat only adds a key that is already held again. This matters only if the clock line moves back between a repeat and its keyup.

### NOTE 2. R7 NOTE 2, carried
- run.ts:29: with no teleport rule (TELEPORT 1e12), the run passes the unit files. The spec is still silent on when the view stops tweening.

## Files
- **Evidence**, all in build/evidence/review/:
  - **item records:** S1.8, SIM1.8, RM1.8, CT1.8, SIM2.8, W1.8 to W3.8, CL1.8, CL2.8, IN1.8, CAL1.8, AU1.8 to AU3.8, FX1.8, GAME1.8, CAL2.9, RN1.10, RN2.9, RN3.9, RN4.9, END1.8, standing.8;
  - **integrity:** R8-head.1 and .2, R8-digest.1 and .2, R8-status.1, R8-check-public-tree.1;
  - **suites:** R8-npm-test.1, R8-verifiers.1, R8-av-head.1, R8-console.1, R8-supply.1, R8-check-public-history.1, R8-check-public-dist.1, R8-av-controls.1, R8-product-controls.1, R8-flash-controls.1;
  - **Axis B:** R8-axisb-sim.1, R8-jitter.1 to .5, R8-playtest-dom.1;
  - **mutations:** R8-mutations-unit.1, -verifiers.1, -x6.1, -x6-browser.1, -browser.1, -calib.1, -keys.1, -track.1; R8-reach.1 (wide jitter and portals) and .2 (the search that reaches MINOR 1); R8-x10-reach.1 and .2 (.2 adds the iframe and the popup).
- **Scratch:** a scratch clone outside the repo, at HEAD and clean, with these scripts beside it:
  - mut.mjs and the batch-*.mjs files (every mutant's find and replace);
  - axisb-sim.mjs, playtest-dom.mjs, reach-diverge.mjs, reach-search.mjs, x10-reach.mjs and its page.
  - The control-page builds of tests/controls may have left hush-cp-* folders in the system temp folder.
