HUSH-REVIEW-R7: FAIL (head=55e41c8b8846c82489e2968f29d569a5767f0abc digest=a03cbf0a4b6f5c31b7c32ce3f3aaf737c19450e3eb4477142ab296f22f2c6e8c blockers=0 majors=2 minors=13)

Reviewer R7, Opus standing in for Fable, 2026-10-14. This is cycle 2's first review, after FIX AUDIT-1.

**Integrity of the review**
- HEAD and the digest were the same before and after the review (R7-head.1 and .2, R7-digest.1 and .2).
- The laptop was on AC power, with energy saver off and a 60 Hz display. I read this in the shell before the first headed run and did not record it, per the owner's rule.
- The only change in the repo is 70 untracked files under build/evidence/review/, all written through tools/evidence.mjs. check-public is clean over the tree with them included (925 files; R7-check-public-tree.1). No tracked file changed.
- Every mutation ran in a scratch clone of HEAD outside the repo, with node_modules as a junction.
  - Each mutation was an exact find-and-replace that had to match once.
  - Each edit was restored with git checkout after its run. The clone is clean at HEAD.

**Severity rule (R1 to R6's, kept)**
- **MAJOR:** a non-equivalent mutation that survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent, or its effect cannot be reached.
- For section 15's verifiers, I applied the mandate's own test: I mutated the verifier and ran its own tests and controls against it.

**In short**
- **The product** is unchanged since R3: src outside src/probe, rooms, music and replays. It matches every Action, and all 23 acceptances pass (RN4 on its second run).
- **Suites:**
  - standing is GREEN; npm test passes; the verifiers pass 295 of 295.
  - The headed av probe, the headed Edge playthrough and probe:supply pass. The notices name 62 packages.
  - check-public is clean over the history and over dist.
- **Audit 1's three fixes hold.** The deploy guard's mutant fails its new control case. Three notices and supply mutants fail tests/tools/notices.test.mjs. The deploy controls run again.
- **Every spec area's core mutation is killed.** Every Axis B check passes.
- **The two MAJORs** are both in the gate's own checks of exit criteria:
  - X11's median window has no test above 15 minutes;
  - X7's real-device clock row has no control, and it is the only check that can see the A/V line.
- **The MINORs:** five new ones and R6's eight, carried.

## Axis A: spec conformance

### Acceptances re-run
Each ran as `node tools/evidence.mjs <ID> review -- <cmd>`.

| Item | Result |
|---|---|
| S1.7 | `smoke: PASS (/hush/)`, canvas 1220 by 686 |
| SIM1.7, RM1.7, CT1.7 | 3/3; 5/5; `tree clean, 12 file(s)` |
| SIM2.7 | 5 files, 19 tests |
| W1.7, W2.7, W3.7 | 4, 4 and 11 witnesses, each 20/20 on seed 1 |
| CL1.7, CL2.7, IN1.7, CAL1.7 | 11/11, 4/4, 5/5, 6/6 |
| AU1.7, AU2.7, AU3.7, FX1.7 | 2/2, 8/8, 5 files with 40 tests, 4/4 |
| GAME1.7 | `PASS (console,play,text,visibility,unlock,keys)` with 84 gauntlet reads; tsc and eslint clean |
| CAL2.8 | see below |
| RN1.9, RN2.8, RN3.8 | 6/6, 14/14, 4/4; flash PASS; perf 59.98 / 60 / 60 fps with 99.97 to 100% of intervals at 20 ms or less; heavy apps none |
| RN4.8 | 7/7, flash PASS, perf 59.98 fps (RN4.7 is void, see below) |
| END1.7 | see below |

CAL2.8, all three runs:
- **Untouched:** up 43.9 s; 48 clicks, 8 fills, 48 rings; values 0 0; Escape ignored; click starts 48 of 48; 2563 frames timed.
- **Tapped:** values 5.6 34.5, equal to the taps' own.
- **Retried:** values 5.6 34.5, equal to the taps' own.
- Flash: general max 9755 px, red 0.

END1.7:
- The art test passes 5/5, and the playthrough `PASS (console,play,text,scene)`.
- The run line "run 0:59 · deaths 0" shows at the card.
- 34,480 bake pixels match their shapes, and 758 frames match command for command.
- 8795 frames sit on the step the heard time gives.
- 187 card frames are on the beat heard while they were drawn.

### Suites
- **standing.7:** GREEN (23 items, 22 mapped test files, 7 commands).
- **npm test (R7-npm-test.1):** PASS.
  - Unit: 25 files, 135 tests.
  - Replay on the digest seed 2688335626: 04-thorns 18/20, 09-gates 19/20, every other witness 20/20.
  - e2e: all eight checks pass.
- **test:verifiers (R7-verifiers.1):** 295 of 295.
- **Headed av (R7-av-head.1):** PASS.
  - 2173 voices for 2151 onsets, with 0 errors and 0 dropped.
  - Clock 0.157 ms peak to peak.
  - 10 of 10 gates in.
  - 2322 voice starts on their own layer's onsets; 1909 of 1909 onsets started.
- **Headed Edge (R7-edge-console.1):** PASS.
- **probe:supply (R7-supply.1):** every row ok.
- **check-public --history (R7-check-public-history.1):** clean over 3 refs and 106 commits.
- **check-public --root dist (R7-check-public-dist.1):** clean.

### Code against each item's Action
- I read these files against sections 8 to 14: main.ts, run.ts, engine.ts, scheduler.ts, gates.ts, track.ts, driver.ts, keys.ts, calibrate.ts, flash-limiter.ts, output-clock.ts (equal to its reference, tests/fixtures/control-page/clock.js), sim.ts, beat.ts, the gauntlet generator, play-frame.ts, ending-art.ts, beat-art.ts and the three scenes. They conform.
- The art ports are held to the reference by the passing suites and by the art mutants below.

### Audit 1's amendments against section 1.6
- **control-copy:** extracts a room or the track only when the copy lacks it.
- **deploy.mjs:** the bare-remote refusal is the first statement of a dry run, and the release path is unchanged.
- **The notices:**
  - dist/THIRD-PARTY-NOTICES.txt holds 62 packages and 19 texts.
  - Every licence-like file of the 62 packages is taken; the three that ship none get the standard text.
  - Neither index.html nor the bundle names the file.
  - check-public over dist is clean. The mask is one added hash.

### Mutations
Unit-level mutants faced all 25 unit files; area-specific commands are named. The records are R7-mutations-unit.1, -clock.1 and .2, -compile.1, -edge.2, -notices.1, -x11.1 and .3, -x6.1, and R7-mutation-*.1.

| § | Mutation | Result |
|---|---|---|
| 2 / 4.4 | an entity's phase counted forward | killed |
| 3 / 9.2 | keys queued one step late | killed |
| 4.1 | MAX_FALL 320 | killed |
| 4.3 | a head bump no longer ends the variable jump | killed |
| 4.3 | presses pass through the respawn lock | killed |
| 4.5 | layer back one step after its bar line | killed |
| 4.5 / GAME1 | nextBarStep(s + 1) in the sim; unlockBar(step + 1) in the run | survive the units, the replays and the page's unlock check (MINOR 1) |
| 5.1 | the compiler's spawn-floor and exit refusals removed | survive (NOTE 1) |
| 5.3 | a clap spike of 07-current removed | killed (content sha) |
| 6.1 | portal column three columns early | killed |
| 6.2 | auto-run slower | killed |
| 7 | perc (3,8) | killed (content sha) |
| 8.3 | gauntlet track from cycle 1 | killed |
| 8.3 | setMask on bit i | killed |
| 8.3 | `_` labels captured | killed |
| 8.4 | gates into the master past the compressor | killed (av mix) |
| 8.4 | origin lead 0.2 s | killed |
| 8.5 / 9 | clock window 1.5 s, fallback 2 s, settling 100 ms | killed |
| 8.5 / 9 | CLOCK_JUMP 1, 3, 5.5 or 6 ms; burst floor 30 ms | survive (MINOR 2) |
| 8.6 | hidden page not suspended | killed (visibility) |
| 9.1 | target two steps past the heard time | killed |
| 10.1 | scale mode NONE | killed (smoke text) |
| 10.1 | autoCenter NO_CENTER | survives (MINOR 4) |
| 10.2 / 10.3 / 10.4 / 10.6 | edge colour, trail 7, warning two beats ahead, near band 0.8, frame centre 1 px off | all killed |
| 11 | beginFrame keeps the held state | killed |
| 12 | judgePass keeps the lowest tap | killed |
| 12 | taps stamped with the handler's time | survives all three calibration runs (MINOR 3) |
| 13 | rise over 3 bars; card beat rounded; run line read at the card (66 s) | all killed |
| 15 notices | an email left in a holder; no licence texts; X10 wanting devOptional entries | all killed |
| 15 deploy | a dry run takes any local repository | killed by its case |
| 15 X11 | MAX 1200; no upper check; MIN 480; a friend's latest row | survive ship-gate's tests (MAJOR 1) |
| 15 X7 | clock bound 300 ms | survives tests/tools and all 7 av controls (MAJOR 2) |
| 15 X6 | analyzer limit 25,601 or 26,000 | survives its tests; 26,000 also survives the browser controls (MINOR 5) |

## Axis B: the game against the concept (all pass)
- **Determinism (R7-axisb-sim.1).** Each of the 11 witnesses ran twice. Checksums and full save() were equal between the runs and to the witness. The product equals the oracle at all 32,448 steps.
- **The sim imports nothing from render, audio or the DOM.**
  - The import closure is src/rooms/{codes,compile,gauntlet}.ts and src/sim/{beat,constants,headless,sim,types}.ts.
  - No DOM, timer, clock, storage, audio or render global appears.
  - The Math calls are abs, ceil, floor, imul, max and min.
- **Layers, one per room on a bar line.**
  - In each of rooms 1 to 10 there is exactly one layer change: bit k, on the first step of bar unlockBar(clear), 1.12 to 4.79 beats after the clear.
  - The gauntlet's clear finishes the run with no layer change.
  - In the page, the unlock check passes in all 10 rooms (GAME1.7 and npm test).
- **The wave only through portals.** I checked 1,111 runs: each witness, plus 20 jittered runs on each of HEAD's sha words.
  - Base to wave happened 505 times, every one on a W cell.
  - Wave to base happened 505 times, every one on a B cell.
  - W cells are in rooms 6, 7, 9, 10 and 11; the first is room 6.
- **No text object.** src has no Text, BitmapText, add.text, make.text or fillText. The probe counts 0 at every room's end and through the ending.
- **Jitter test** through `tools/replay.mjs --all --jitter --seed`, on HEAD's sha words 1441012875, 2286340132, 2313328271, 701852069 and 1988037308 (R7-jitter.1 to .5).
  - All 11 witnesses pass on every seed.
  - The lowest is 18/20: 04-thorns on 2286340132.
- **Branching on a flag.**
  - Product code reads only `?playtest` (src/main.ts:42).
  - textContent is written only at src/render/ending-scene.ts:72.
  - `?probe` is read only in the spec-owned src/probe/api.ts:989.
- **`?playtest` and the page (R7-playtest-dom.1).**
  - **Default build:** no probe API; only the title, the link and the notice; output#playtest hidden and empty; no element of any kind over the canvas. This held:
    - at boot, at 1280 by 720, 800 by 450 and 900 by 1200;
    - 2 s after a key;
    - over 98 reads of the untouched calibration;
    - in room 1 under real keys.
  - **`?playtest` alone:** the same.
  - **`?probe&playtest`:** 11/11 rooms, then 193 reads over 12 s of the ending: 0 text objects and nothing over the canvas. "run 0:59 · deaths 0" appears only in output#playtest, first seen 6.913 s after the ending's first frame (RISE_S is 6.857 s; the last read without it was at 6.849 s).
  - **`?probe` alone:** output#playtest stays hidden and empty.

## Findings

### MAJOR 1. X11's median window is pinned only from below: no test refuses a median above 15 minutes
- **Where:**
  - tools/ship-gate.mjs:27-28 (MIN_FIRST_RUN 600, MAX_FIRST_RUN 900), :130 (the window check), :125 (a friend's earliest first-run row counts).
  - Its only tests are tests/tools/ship-gate.test.mjs:115-121 (a 12:10 median passes) and :142-149 (a 7:10 median is refused). Nothing else calls playtestVerdict.
- **Failing path:** X11's `node tools/ship-gate.mjs --playtests rc<N>`, and the gate's X11 row, both go through playtestVerdict to :130.
- **Triggering input:** each of these passes tests/tools/ship-gate.test.mjs (R7-mutations-x11.1):
  - MAX_FIRST_RUN raised to 1200;
  - the `med > MAX_FIRST_RUN` check removed;
  - MIN_FIRST_RUN lowered to 480;
  - a friend's latest row counted instead of the earliest.
- **Proof of effect:** HEAD gives all six of my fixture ledgers the right verdict (R7-x11-check.2). Against the mutants (R7-mutations-x11.3):
  - both upper-bound mutants pass medians of 15:01 and 16:00;
  - the MIN 480 mutant passes 9:59;
  - the latest-row mutant refuses a ledger whose earliest rows give 11:00.
- **Effect:** X11's "the median of those first runs is 10 to 15 minutes", which is the concept's 10 to 15 minute first run, is held above 15 minutes by code no test pins. The same function judges the re-entry table.
- **Fix:** tests/tools/ship-gate.test.mjs gains:
  - medians of 10:00 and 15:00, which pass;
  - medians of 9:59 and 15:01, which are refused;
  - a friend with two first-run rows at different times, where the earliest counts.
  - Controls: MAX 901, MIN 599 and the latest-row rule each fail one of these cases.
- **Kind:** mechanical.

### MAJOR 2. X7's real-device clock row has no control, and it is the only check that sees the A/V line
- **Where:**
  - tools/probe-av.mjs:29 sets `CLOCK_JITTER_BOUND_MS = 3`, and :304 is the row. The JSON carries the bound at :288.
  - tools/ship-gate.mjs:239-243: AV_OK compares clockJitterMs with the bound that the JSON itself carries.
  - None of the 7 cases in tests/controls/av-probe.test.mjs fails on the device-clock row. The late and swap cases only assert that it stays quiet (:42, :51).
  - The spec never sets the number. X7 says "under the bound the spec sets", but sections 8.4 and 15 give only observations: 0.2 ms on this laptop, and about 100 ms in faulted graphs.
- **Failing path:** `npm run probe:av -- --headed`, then the clock row, then AV_OK at VERIFY.
- **Triggering input:**
  - **The bound raised to 300 ms** passes tests/tools (16 files) and all 7 av controls (R7-mutation-av-clock-bound.1).
  - **A product mutant:** src/audio/engine.ts:132 builds the clock line over a view of the context without getOutputTimestamp (R7-mutation-clock-no-stamps.1).
    - It passes the 25 unit files and the page's unlock, scene and keys checks.
    - Only the clock row catches it: "device clock offset moved 191.633 ms peak to peak (bound 3)". HEAD's line moves 0.157 ms.
  - **Both together:** the av probe passes with the line moving 175.4 ms peak to peak (R7-mutation-clock-no-stamps-bound.1).
- **Effect:** the heard time sets every frame's step and stamps every key (section 9).
  - A line that wanders by about 0.2 s puts the hazards and the inputs that far off the music.
  - The scene and keys checks read that same line, so they cannot see it.
  - The one check that can see it is held by a number no test pins and no spec line sets.
- **Fix:**
  1. The spec names X7's bound. Today only the probe's 3 ms exists.
  2. A control-page fault builds the clock line without output timestamps. It must fail on the device-clock row alone, and it must pass with the bound raised.
  3. AV_OK compares against the spec's bound, not the JSON's own.
  - By inspection, these rows have no control of their own either: silence with every layer muted, silence with one layer muted alone, the context running after the first key, scheduled voices against onsets, and late-dropped notes. The mix and starts rows cover their faults, so they weigh less, but the same kind of control fixes them.
- **Kind:** design. The spec never set the bound.

### MINOR 1. X7 at the bar line's edge: an off-by-one in the clearing step survives
- **Where:** src/sim/sim.ts:179 (`pendingAt = nextBarStep(s.step)`), and src/game/run.ts:125 with :133 (`unlockAt(pending, unlockBar(step))`, where step is read before the tick).
- **Triggering input:** `nextBarStep(s.step + 1)` in the sim and `unlockBar(step + 1)` in the run each pass:
  - all 25 unit files and the witness replays (R7-mutations-unit.1);
  - the page's unlock check, for the run's mutant (R7-mutation-unlock-edge-page.1).
- **Why the tests miss it:** unlockBar(s) and unlockBar(s + 1) differ only on the one step per bar whose tick falls one beat (to the step) before a bar line. That is 1 step in 411, and no witness clears on such a step.
- **Effect:** on those clears, a returning layer's hazards start one bar (1.71 s) before or after its music. With ten clears a run, that is about 1 run in 41.
- **Fix:** tests/sim (the oracle comparison) and tests/game/run.test.mjs add a clear on that step. Room 1's witness, delayed by 337 steps, clears on step 1954, where unlockBar is 5 and becomes 6 one step later.
  - My scratch check passes on HEAD (R7-edge-check.1) and fails both mutants (R7-mutations-edge.2): the sim leaves the oracle at step 1954, and the run asks for bar 6 while the sim returns the layer on bar 5.
- **Kind:** mechanical.

### MINOR 2. CL1: the clock line's jump tolerance and its agreement burst are pinned from one side only
- **Where:**
  - src/clock/output-clock.ts:7 (`CLOCK_JUMP 0.004`) and :90 (the burst floor of 50 ms).
  - tests/clock/output-clock.test.mjs:59-67 pins the tolerance only by a 6 ms drop that must move the line, and its control is CLOCK_JUMP 0.008 (tests/controls/product-tests.test.mjs:82).
- **Triggering input:** CLOCK_JUMP at 1, 3, 5.5 or 6 ms, and the burst floor at 30 ms, each pass all 25 unit files.
- **Effect:**
  - Within that 1 to 6 ms band, the tolerance sets how fast the line follows a small device-clock drop (about 150 ms, or waiting out the 1 s window) and how often it resyncs on a jittery device.
  - The burst sets when the line first becomes valid.
  - The cost is a few ms of heard time, for under a second.
- **Fix:** add scenarios for:
  - a 3 ms drop, with no resync;
  - a 5 ms drop, with a resync;
  - a device with baseLatency 0, sampled every 10 ms, which becomes valid after 50 ms.
  - Controls: CLOCK_JUMP 0.003 and 0.005, and a burst of 30 ms.
- **Kind:** mechanical.

### MINOR 3. Section 12: the tapper cannot tell a tap's event time from its handler's time
- **Where:** src/render/calibration-scene.ts:91 and :93 read event.timeStamp, as section 12 says. The tapper (src/probe/api.ts:795-800) creates each KeyboardEvent and dispatches it at once, so its timeStamp is the moment of dispatch.
- **Triggering input:** the scene reading performance.now() in its handler, in both passes, passes CAL2's whole acceptance (R7-mutation-calib-handler-time.1).
  - Untouched run: 48, 8, 48, values 0 0.
  - Tapped run: 6.3 34.5; retried run: 5.9 34.8. Each equals the taps' own values.
  - Every frame is timed.
- **Effect:** with real keys, the handler runs a few ms after the event, longer while a frame renders.
  - That delay would bias inputBias.
  - In play, keys are stamped by event time (pinned by tests/input/keys.test.mjs), so every key would land that many ms early.
- **Fix:**
  - The tapper creates each event at its planned moment and dispatches it a fixed few ms later. The event keeps its creation timeStamp, so a scene that reads the handler's time lands off its taps' own values.
  - Add a control page `?calib=handlertime`.
- **Kind:** design. The tapper's protocol is section 12's text.

### MINOR 4. Section 10.1: no check reads the canvas's centring (beside R6 MINOR 5's background)
- **Where:** src/render/game.ts:12 (`autoCenter: CENTER_BOTH`), next to :11. tools/probe-smoke.mjs:37-38 reads only that the canvas is not blank.
- **Triggering input:**
  - `NO_CENTER` passes smoke and the playthrough's console, play, text and scene checks (R7-mutation-no-center.1).
  - Scale mode NONE is caught, by smoke's text row (R7-mutation-no-fit.1).
- **Effect:** the game sits against the left edge of its box in any window that is not 16:9: 30 px off at 1280 by 720, and more on a wide screen. S1's Action is "exactly the config of section 10.1".
- **Fix:** smoke's canvas row also reads the canvas's box inside #game (equal left and right margins), together with R6 MINOR 5's undrawn pixel.
- **Kind:** mechanical.

### MINOR 5. X6: the flash analyzer's area limit is held only within the controls' ±5% band
- **Where:**
  - tools/flash-analyzer.mjs:10 (`AREA_LIMIT 25600`; a run fails when either sum reaches it).
  - tests/tools/flash-analyzer.test.mjs:49-59 builds its boxes from the module's own AREA_LIMIT (0.9 and 1.1 of it), so its fixtures move with any change of the limit.
  - The browser controls use fixed areas of about 24,320 and 26,880 px.
- **Triggering input:**
  - A limit of 25,601 or 26,000 passes the analyzer's tests (R7-mutations-x6.1).
  - 26,000 also passes tests/controls/flash-probe.test.mjs (R7-mutation-x6-controls.1).
- **Effect:**
  - A combined flashing area up to about 5% over WCAG's limit could pass X6.
  - The product's own limiter is pinned at exactly 25,600 (R3 MINOR 2), and the measured peak is 9,755 px.
- **Fix:**
  - Add analyzer cases at exactly 25,600 px, which must fail, and at 25,599 px, which must pass, written against the literal number.
  - Control: `>` in place of `>=`.
- **Kind:** mechanical.

### MINOR 6 to 13 (R6 MINOR 1 to 8, carried)
These are still open. Their files are unchanged since R6's head: `git diff 8f007a3..HEAD` over src, the probes, calibration-check, scene-check and their tests is empty.
1. X8's MAD edge.
2. The calibration's key-repeat filter.
3. The ending's rise is not timed from its first frame.
4. X7's gate opening is held only within 30 ms.
5. The canvas background.
6. Section 9.1's alpha.
7. The notes' level and length.
8. The `?playtest` line's deaths are only ever read as 0.

### NOTE 1. Two of the compiler's refusals have no test
- Removing src/rooms/compile.ts:116 (the solid tile under the spawn) or :119 (the exit opening) passes all 25 unit files (R7-mutations-compile.1).
- This is unreachable in v1: the rooms are sha-pinned.

### NOTE 2. Section 9.1 does not say when the view stops tweening
- src/game/run.ts:29 and :139-140 place the view when the creature moves more than a tile in a step.
- Section 10.6's judge accepts that ("the step before or this one"), so the product is within the spec.
- One sentence in 9.1 would keep the next port from smearing the camera at a respawn or a room's entry.

### NOTE 3. X4's conditions have no negative control
- tests/controls/perf-probe.test.mjs runs only the clean page and ?stress=20. Nothing tests a battery, power-saver, non-60 Hz, heavy-app, SwiftShader or unmaximized reading (tools/probe-perf.mjs:23-43 and :122-131), and PERF_OK reads the same fields.
- A pass under a harder condition still implies one under the named condition, so the risk of a false PASS is low. R4's block on battery showed the rule working.

### NOTE 4. X3's margin (R6 NOTE 2, carried)
- On the digest seed 2688335626, 04-thorns clears exactly 18/20 (R7-x3-digest-seed.1).

### NOTE 5. Audit 1's MINOR 1 and 2 remain open
- Their files (tools/probe-lib.mjs, tools/check-public.mjs) are unchanged.
- They are carried in the fixlog and not counted here.

## Void records (environment, not findings)
- **RN4.7:** 40.25 fps over 2,426 intervals, and "11-gauntlet: never reached the busy window". That is the covered-window pattern. RN4.8 passed with no change.
- **R7-mutations-edge.1:** the same runs as .2, without each mutant's effect printed.
- **R7-mutations-x11.2 and R7-x11-check.1:** their two-row fixture could not tell the earliest row from the latest. R7-mutations-x11.3 and R7-x11-check.2 replace them.

## Files
- **Evidence**, all in build/evidence/review/:
  - **item records:** S1.7, SIM1.7, RM1.7, CT1.7, SIM2.7, W1.7 to W3.7, CL1.7, CL2.7, IN1.7, CAL1.7, AU1.7 to AU3.7, FX1.7, GAME1.7, CAL2.8, RN1.9, RN2.8, RN3.8, RN4.7, RN4.8, END1.7, standing.7;
  - **integrity:** R7-head.1 and .2, R7-digest.1 and .2, R7-status.1, R7-check-public-tree.1;
  - **suites:** R7-npm-test.1, R7-verifiers.1, R7-av-head.1, R7-edge-console.1, R7-supply.1, R7-check-public-history.1, R7-check-public-dist.1, R7-x3-digest-seed.1;
  - **Axis B:** R7-axisb-sim.1, R7-jitter.1 to .5, R7-playtest-dom.1;
  - **mutations:** R7-mutations-unit.1, -clock.1 and .2, -compile.1, -edge.1 and .2, -notices.1, -x11.1 to .3, -x6.1, R7-edge-check.1, R7-x11-check.1 and .2, and R7-mutation-{unlock-edge-page, visibility, no-center, no-fit, line-at-card, graph-bypass, calib-handler-time, deploy, av-clock-bound, clock-no-stamps, clock-no-stamps-bound, x6-controls}.1.
- **Scratch:** the session scratchpad under the system temp folder, in r7/:
  - clone/ (HEAD, clean);
  - mut.mjs, batch.mjs, and mutants.mjs (every mutant's find and replace);
  - axisb-sim.mjs, playtest-dom.mjs, edge-check.mjs, x11-check.mjs, licfiles.mjs;
  - out/.
  - The deploy control's mutant run may also have left a hush-copy-* folder in the system temp folder.
