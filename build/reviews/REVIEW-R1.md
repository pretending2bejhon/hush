HUSH-REVIEW-R1: FAIL (head=cb90b060d62078e5a1fd373bcecfe9033b638a1a digest=46bcc3dcae54cdeaea737683412ffc32c145b9bcb1657c909c3b51facd8a88b9 blockers=0 majors=4 minors=5)

Reviewer R1, Opus standing in for Fable, 2026-10-12. I re-read the digest with `node tools/ship-gate.mjs --digest` and it is equal. The repo is unchanged except for 37 new, untracked evidence files under build/evidence/review/. Every mutation ran in a scratch copy of HEAD outside the repo; each mutated file was restored and the copy was compared file by file against HEAD afterwards.

**In short:** The product follows the spec. Every item's code matches its Action, 21 of 23 acceptances re-ran green (RN3 and RN4 were refused only on the battery condition), `npm run standing` is GREEN and every Axis B check passes. The FAIL comes from the tests. Four mutations of behaviour the shipped game depends on survive every test of their area:
- the run's X7 unlock wiring;
- the calibration scene's measurement of taps;
- the play scene's beat binding;
- the ending card's beat binding.

Severity rule I applied: a non-equivalent mutation that survives every test of its area is MAJOR when it breaks a beat binding, an exit criterion or the core job of a module. It is MINOR when the area's core mutations are killed and only a spec'd detail with a bounded effect slips through. A mutation that is equivalent or unreachable with the sha-pinned content is a NOTE.

## Axis A: spec conformance

### Acceptances re-run (`node tools/evidence.mjs <ID> review -- <cmd>`, records in build/evidence/review/<ID>.1.txt)

| Item | Result |
|---|---|
| S1 | `smoke: PASS (/hush/)` |
| SIM1 | 3/3 |
| RM1 | 5/5 |
| CT1 | `tree clean, 12 file(s)` |
| SIM2 | 5 files, 19 tests |
| W1, W2 | `replay: PASS, 4 witness(es)` |
| W3 | `replay: PASS, 11 witness(es)` |
| CL1 | 8/8 |
| CL2 | 4/4 |
| IN1 | 5/5 |
| CAL1 | 5/5 |
| AU1 | 2/2 |
| AU2 | 7/7 |
| AU3 | 4 files, 22 tests |
| FX1 | 3/3 |
| GAME1 | `play: chrome headless: PASS (console,play,text,visibility)`, then tsc and eslint clean |
| CAL2 | `flash: calibration up 43.9 s: clicks 48, count-in fills 8, rings 48, values 0 0`, `flash: PASS` |
| RN1 | 3/3, flash PASS, perf PASS headed on AC (60 fps, 100% of intervals at 20 ms or less) |
| RN2 | 14/14, flash PASS, perf PASS on AC (59.88 fps, 99.86%) |
| RN3 | 4/4 and flash PASS, but **exit 1**: perf measured 60 fps / 100%, then refused with `perf: power line battery` |
| RN4 | 4/4 and flash PASS, but **exit 1**: perf measured 59.93 fps / 99.92%, then refused with `perf: power line battery` |
| END1 | 3/3, `PASS (console,play,text)`, text check read `"run 0:59 · deaths 0"` once the card was up |

**Environment, not counted as a finding:** the laptop left AC at about 11:50 and was still on battery at the last check (13:50). RN3's and RN4's own parts are green: their art tests and the flash probe. `npm run check:art` is the same command and the same HEAD build for RN1 to RN4, and it passed headed on AC in RN1.1 and RN2.1. RN3 and RN4 need re-running on AC. The command that failed was `node tools/evidence.mjs RN3 review -- npm run accept:rn3`, which ended with `perf: power line battery`.

### Code against each item's Action
I read every product file against the oracle, the references and sections 8 to 13. No deviation found.
- **src/sim and src/rooms** match tests/fixtures/oracle function by function. The only additions are `?? CODE.EMPTY` guards and keeping the current room when `load()` names no room.
- **output-clock.ts** matches control-page/clock.js. Driver, keys, calibrate, track, scheduler, gates and flash-limiter match their references.
- **engine.ts** matches sections 8.2 to 8.4: context created and resumed inside the keydown, the orbit patch, compressor/master/analyser values, the 25 ms interval plus the Blob Worker ticker, the 7 ms clock sample, and restart/unlockAt/gauntlet/click.
- **run.ts** matches GAME1: `canonical`, origin = now + 0.1, unlock on a new pending layer, gauntlet re-mapping on a new gBeat in room 11, the track for RN2.
- **main.ts** wires the first key, visibility, the PRE_STEP driver and the full Inspect, and reads only `?playtest`.
- **calibration-scene.ts** is the control page's Calibration scene without `?calib`.
- **The art modules** port tests/fixtures/reference/art.mjs.
- **play-scene.ts** keeps the depths 0 to 9, the bake keys and positions, and the per-frame redraw of section 10.6.
- **ending-scene.ts** follows section 13.

### Standing
`npm run standing` is GREEN: public tree and history, protect, gates, spec-content, 19 mapped test files, 7 commands, 23 items (build/evidence/review/standing.1.txt).

### One mutation or more per spec area
Records: R1-mutations-unit.1.txt, R1-mutations-unit2.1.txt and R1-B1-unlock-mutation.1.txt. The browser mutations' logs are in the scratch folder.

**Killed (the area's tests fail):**
- Physics constant: RUN_MAX 176 to 177.
- Respawn steps minus 1.
- Beat binding in `entityOn`: `<` to `<=`.
- `unlockBar`: lead of one beat changed to one sixteenth.
- Room tile: one step tile in 01-wake (caught by spec-content).
- Compiler: `^` and `v` codes swapped.
- Gauntlet: the kick's second spike placed on the wrong side.
- Track binding: clap moved off 4 and 12.
- AU2: the gauntlet's cycle mapping shifted.
- AU3: mask bit off by one.
- CL1: settle, fallback, window and burst changes.
- CL2: target step without its +1.
- IN1: event step `<=` to `<`, and `preventDefault` removed.
- CAL1: inputBias taken from pass A.
- FX1: refusal latch removed.
- RN1 to RN4 and END1 art: camera lead, trail cadence, warning alpha, band seed, rise length.
- END1: run line shown at 50% of the rise. Caught by 1 ms only.

**Survived:** listed below as MAJOR 1 to 4, MINOR 1 to 3 and NOTE 1.

## Axis B: the game against the concept (all pass)
- **Determinism.** Each witness run twice on fresh sims gives the same checksum and the same full `save()` at the clear, equal to the witness (R1-determinism-jitter.1.txt). In the page, the in-page replays equal the witnesses (GAME1.1, END1.1).
- **The sim imports nothing from render, audio or the DOM.**
  - src/sim imports only constants, beat, types and ../rooms (codes, the gauntlet type, and the compiler in headless.ts).
  - src/rooms imports only the sim's types and its own codes.
  - Neither touches a DOM or clock global, and the eslint gate is clean.
- **Layers come back one per room on bar lines.**
  - In one continuous sim, rooms 1 to 10: layer k comes back at nextBarStep(clear), on the bar unlockBar(clear), 0.53 to 2.1 s after the clear, and the mask grows 0x0 to 0x7fe one bit per room (R1-axisb-sim.1.txt).
  - In the built page, gate k reads 0 just before origin + bar × BAR and 1 just after, and the sim's layer bit flips at pendingAt, in all 10 rooms (R1-x7-inpage.1.txt).
- **The wave only through portals.**
  - 2,006 form changes over every witness plus 200 jittered runs of each, all on a W cell (into the wave) or a B cell (out of it).
  - The wave never appears in rooms 1 to 5, and rooms 01 to 05 hold no W.
  - The only `form = 1` in the code is src/sim/sim.ts:216, behind `portalTouch`.
- **No text object.** Nothing in src creates one. The probe counts 0 at every room's end, at the card, and in both modes.
- **Jitter test with seeds from HEAD's sha** (its five 8-hex words: 3415257184, 3592452325, 2717726523, 3469732099, 996379162). All 11 witnesses pass on every seed (X3-jitter.1 to .5). The lowest is 18/20, 09-gates on seed 996379162.
- **Branching on a test flag.** The only page-flag read in product code is the sanctioned `?playtest` at src/main.ts:42. Only the spec-owned src/probe/api.ts reads `?probe`. There is no `import.meta.env`, navigator, storage or CDN branch.
- **`?playtest`.** I checked in both modes, at four points (calibration, the gauntlet, halfway through the rise, the card) and at viewports 1280x720, 800x450, 1920x1080 and 900x1200.
  - No DOM element meets the canvas box, and there are 0 text objects.
  - Default mode shows only the link and the notice; `#playtest` stays hidden and empty through the card.
  - `?playtest` adds exactly `run 0:59 · deaths 0` in `#playtest`, below the canvas, only once the card is up (R1-playtest-dom.1.txt).

## Findings

**MAJOR 1. X7's audio side of a clear is never exercised: the run's unlock wiring can be shifted or removed with every test green.**
- **Where:** src/game/run.ts:129 (`engine.unlockAt(pending, unlockBar(step))`). By reading, the gauntlet re-mapping at :133 is equally unexercised.
- **Why no test sees it:**
  - tools/probe-av.mjs:73 and :99-100 start every window with startRoom(k) for 2 bars and never clear a room.
  - tools/probe-play.mjs has no audio check.
  - tests/sim/progression.test.mjs and tests/audio/gates.test.mjs test pure functions only.
  - Nothing in tests/ or tools/ reads pendingAt or a gate value at a clear.
- **Failing path:** a player's run calls startRoom(1) once, at the calibration hand-over. From then on every layer comes back only through run.frame calling engine.unlockAt. Every probe restarts the run per room, and restart's setMask cancels the scheduled ramp and sets the canonical mask, so the clear-time unlock is never observed.
- **Triggering input:**
  - B1 `unlockBar(step) + 1` (the music comes back a bar after the hazards) passed test:av 22/22, smoke, probe-play with all six checks, and probe-av --headed (PASS: windows, solos and silence green, 0 dropped).
  - B1b, with no unlock at all (the music would never return in real play), passed test:av and probe-av --headed (PASS).
  - In the recorded re-run (R1-B1-unlock-mutation.1.txt) av failed only on "18 late-dropped notes" (see MINOR 4). Every window and solo passed there too.
  - My in-page check fails both mutants (gate k still 0 one bar after the clear, rooms 1 to 10) and passes on HEAD.
- **Minimal fix:** an X7 check that lets each room's witness clear it in the live run, with no startRoom until the bar has passed.
  - Take the bar from the sim state: floor(pendingAt × 7 / 2880).
  - Require gate k to read 0 before origin + bar × BAR and 1 after, with the sim bit flipping at pendingAt.
  - Add a control-page fault (late or missing unlock).
  - scratch x7-browser.mjs is a working sketch.
- **Kind:** design.

**MAJOR 2. The calibration scene's measurement is never tested: CAL2's check runs untouched, so no tap ever reaches the scene. X8 covers only the math.**
- **Where:**
  - src/render/calibration-scene.ts:89-93 (tap capture), :162-173 (matching), :183-184 (calibrate and hand-over).
  - The check: tools/probe-flash.mjs:29 presses one key and taps nothing; tools/calibration-check.mjs:81 wants values 0 0.
- **Failing path:** a player's taps should become heard times, be matched to clicks 5 to 24 and rings 5 to 24, and set avOffset and inputBias, which drive displaySec and inputLagSec.
- **Triggering input:**
  - B2, pass A's offset sign flipped, passed test:calibration 5/5 and the CAL2 check (`calibration up 43.9 s: clicks 48, count-in fills 8, rings 48, values 0 0`, flash PASS).
  - A three-beat count-in (COUNT_IN = 3) also passes, because 6 fills is inside the 6 to 10 window.
  - With no tap, every attempt is rejected and the values are 0 0 by construction, so wrong matching, the wrong clock, or ignoring the results would all pass.
- **Minimal fix:** a tapped run in the check.
  - Press a key at a known offset after each heard click (pass A) and each drawn ring (pass B).
  - Require `__hush.calibration()` within a tolerance of the injected values.
  - Control it with a sign-flipped scene on the control page.
  - Tighten the fill window to 8.
- **Kind:** design.

**MAJOR 3. The play scene's beat binding is untested: hazards can be drawn out of step with their collision.**
- **Where:** src/render/play-scene.ts:151 (`beatShapes(room, sim.step, ...)`).
- **Why no test sees it:** RN3's art test checks beatShapes as a pure function. check:art measures only flash area and frame intervals.
- **Triggering input:** B4, beatShapes given `sim.step + 24` (art 0.1 s ahead of the hazards), passed tests/render/beat-art.test.mjs 4/4 and probe-flash (PASS, general max 6689 px). probe-perf reads only rAF intervals.
- **Minimal fix:** check the scene's assembly against the sim. Either sample entity cells in the flash probe's screencast against entityOn at the heard step, or make the per-frame argument builder a pure function the art test drives with a sim.
- **Kind:** design.

**MAJOR 4. The ending card's beat binding is untested: the dots can pulse off the music's beat (ruling N2, section 13).**
- **Where:** src/render/ending-scene.ts:88 (`beatOfBar` from `heard - run.origin`).
- **Why no test sees it:** the art test covers only `cardShapes(beatOfBar)`, and probe-play reads page text only.
- **Triggering input:** B3b, `beatOfBar` counted from the ending's first frame plus 0.2 s, passed ending-art 3/3 and END1's acceptance (`PASS (console,play,text)`, run line 0:59).
- **Minimal fix:** read the lit dot from the screencast against the heard beat, or a pure `beatOfBar(heard, origin)` in ending-art.ts compared to a reference.
- **Kind:** design.

**MINOR 1. END1's text check guards only the first half of the rise. Section 13 shows the run line when the card appears.**
- **Where:** tools/probe-play.mjs:82 (`now - seen < RISE_MS / 2`).
- **Triggering input:**
  - A line at 50% of the rise was caught by 1 ms: "3428 ms into the ending (want none in its first 3429 ms)".
  - A line at 60% of the rise, 2.7 s before the card, passes.
- **Fix:** guard up to RISE_MS minus a small skew margin, and add a control at 60%.
- **Kind:** mechanical.

**MINOR 2. CL1's suite leaves three thresholds that CL1's Action pins unverified.**
- **Where:** src/clock/output-clock.ts:7 (CLOCK_JUMP 0.004), :91 (trusted at 4 render quanta), :102 (resync after 3 low pairs).
- **Triggering input:** changing them to 0.008, 2 quanta and 2 pairs each passes tests/clock/output-clock.test.mjs 8/8. The settle, fallback, window and burst mutations fail it. The test's scenarios use a 20 ms glitch, 28 ms settling, and leads of 30 ms or 0, so they never land between the old and new values.
- **Fix:** add a 6 ms downward glitch, a 3-quanta lead, and a blip of exactly two low pairs.
- **Kind:** mechanical.

**MINOR 3. AU2's late shift amount is unpinned.**
- **Where:** src/audio/scheduler.ts:94 (`now + 0.005`).
- **Triggering input:** changing it to `now + 0.01` passes scheduler.test.mjs 7/7, because :67 only checks that a shifted note is not before its tick.
- **Fix:** require each shifted note to equal its tick time + 0.005.
- **Kind:** mechanical.

**MINOR 4. Starting a run at the gauntlet stalls the main thread about 150 ms, so the av probe's last window can drop notes. X7 wants zero late-dropped notes.**
- **Where:** src/render/play-scene.ts:110-129 and :143 (the gauntlet's bake: 5 chunks of 5120×720 plus 4 bands about 7.4k world px wide, drawn in the frame after startRoom), src/game/run.ts:100 (origin = now + 0.1), tools/probe-av.mjs:99-100.
- **Failing path:** startRoom(11), then a ~150 ms bake frame, then the transport's first tick finds sixteenth 0 more than 50 ms late and drops its 9 onsets.
- **Observed (all on battery):**
  - startRoom(11) gave a frame of 149.9 to 150.1 ms in 3 of 3 stall-probe runs, with 9 notes dropped in 2 of them (R1-room-entry-stalls.1.txt, scratch stall-probe.txt).
  - The headed av probe dropped 0, 0 and 18 notes in 3 runs.
  - Walking into the gauntlet from room 10, as a player does, costs 50 to 67 ms and no late note.
- **Fix:** start counting the av window after the bake, or bake before the run's origin. Both values are spec'd, so it is the producer's decision.
- **Kind:** design.

**MINOR 5. X3's margin is thin, so about one HEAD in 40 fails X2/X3 by chance.**
- **Where:** replays/04-thorns.json and replays/10-crown.json, seeded from HEAD at tools/ship-gate.mjs:249 and tools/test-all.mjs:19.
- **Measured over 400 random seeds (R1-determinism-jitter.1.txt):**
  - 04-thorns clears 97.53% of 8,000 jittered runs; 9 seeds (2.3%) fall under 18/20, the worst at 16/20.
  - 10-crown: 1 seed under 18/20, the worst at 17/20.
  - HEAD's own seeds pass.
- **Fix:** re-solve or re-author 04-thorns for more timing margin, or seed X3 from the release commit so bookkeeping commits don't re-roll it.
- **Kind:** design.

**NOTE 1. Surviving mutations with no reachable effect.**
- AU1 keeping a repeated label twice (src/audio/track.ts:28): the sha-pinned track has no repeated label.
- The gauntlet's hat row (src/rooms/gauntlet.ts:83): the pinned gauntlet file has no hat masks.
- IN1 without its repeat skip (src/input/keys.ts:31): observable only if stepOf runs backwards across a clock resync. A repeat could then re-press a released key.
- scheduler.ts:90's per-note drop is unreachable, because an onset always lies inside its own step.

## Files
- **Evidence:** build/evidence/review/. The 23 item records `<ID>.1.txt`, plus standing.1, X3-jitter.1 to .5, R1-mutations-unit.1, R1-mutations-unit2.1, R1-B1-unlock-mutation.1, R1-axisb-sim.1, R1-determinism-jitter.1, R1-x7-inpage.1, R1-playtest-dom.1 and R1-room-entry-stalls.1.
- **Scratch:** <home>\AppData\Local\Temp\claude\<redacted>\01eccd82-1fb5-45e1-8358-527afef3a363\scratchpad\r1\
  - Copies: mut\hush (a copy of HEAD, now equal to it) and pristine\.
  - Scripts: mutate.mjs, mutate2.mjs, mutate-browser.mjs, flip.mjs, x7-browser.mjs, playtest-dom.mjs, wave-portals.mjs, jitter-margin.mjs, stall-probe.mjs.
  - Logs: mut-B1.txt, mut-B1b.txt, b2-flash.log, b2b-flash.log, b3a-play.log, b3a2-play.log, b3b-play.log, b4-flash.log, stall-probe.txt, x7-head.txt.
