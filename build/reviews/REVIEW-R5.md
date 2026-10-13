HUSH-REVIEW-R5: FAIL (head=bd16d9550e4a4c07da9cc5c5286e72e53e099f3a digest=3fce9ef0e9f6e11c0e6a369d29a9300a81df073d9b6b2eba1e6844f43c431059 blockers=0 majors=2 minors=2)

Reviewer R5, Opus standing in for Fable, 2026-10-13. This is the cycle's last round.

**Integrity of the review**
- HEAD and the digest (`node tools/ship-gate.mjs --digest`) were the same before and after the review.
- The laptop was on AC power, with energy saver off and a 60 Hz display (read with tools/machine-state.ps1 before the first run).
- The only change in the repo is 53 untracked files under build/evidence/review/, all written through tools/evidence.mjs. `node tools/check-public.mjs` is clean on the tree with them included (695 files).
- Every mutation ran in a scratch clone of HEAD outside the repo, with node_modules as a junction. Each mutation was one find-and-replace that had to match exactly once, and each file was restored with `git checkout` after its run. The clone's status is clean.

**In short**
- The product still matches every Action. It has not changed since R3: the only src change since R4 is the spec-owned src/probe/api.ts. All 23 acceptances pass on HEAD.
- standing is GREEN, npm test passes, the verifiers pass 269 of 269, `probe:av --headed` passes, and the headed Edge playthrough passes.
- R4's fixes hold: all three R4 mutants now fail.
- Every Axis B check passes.
- **What is left is the picture side of the audio-visual binding.** R4 timed the sounds. Two things on the visual side are still untimed:
  - **MAJOR 1:** calibration pass B's rings, and pass A's count-in fills, are never checked against the frame times and marks the scene judges taps by.
  - **MAJOR 2:** the sim, which is the clock of every hazard, and the ending's card are held to the heard music only within about 80 to 100 ms.

**Severity rule (R1 to R4's, kept)**
- **MAJOR:** a non-equivalent mutation that survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent, or its effect cannot be reached.

## Axis A: spec conformance

### Acceptances re-run
Each ran as `node tools/evidence.mjs <ID> review -- <cmd>`. The records are build/evidence/review/<ID>.5.txt unless a row names another.

| Item | Result |
|---|---|
| S1 | `smoke: PASS (/hush/)` |
| SIM1 | 3/3 |
| RM1 | 5/5 |
| CT1 | `tree clean, 12 file(s)` |
| SIM2 | 5 files, 19 tests |
| W1, W2 | `replay: PASS, 4 witness(es)` |
| W3 | `replay: PASS, 11 witness(es)`, all 20/20 |
| CL1, CL2, IN1, CAL1 | 11/11, 4/4, 5/5, 6/6 |
| AU1, AU2 | 2/2, 8/8 |
| AU3 | 5 files, 40 tests |
| FX1 | 4/4 |
| GAME1 | `PASS (console,play,text,visibility,unlock,keys)`, 83 gauntlet reads; tsc and eslint clean (the chain exits 0) |
| CAL2 (CAL2.6) | Untouched: up 43.8 s, clicks 48, fills 8, rings 48, values 0 0, Escape ignored, click starts 48/48 on their marks. Tapped: up 22.2 s, 5.5 34.5, equal to the taps' own, starts 24/24. Retried: up 43.5 s, 5.6 34.5, equal to the taps' own, starts 48/48. Flash general max 9702 px, red 0. `flash: PASS` |
| RN1 | 6/6, flash PASS, perf 60 fps with 100% of 3601 intervals at 20 ms or less, p99 16.9 ms; AC, saver off, 60 Hz, no heavy app |
| RN2 (RN2.6) | 14/14, flash PASS, perf 60 fps, 100% |
| RN3 (RN3.6) | 4/4, flash PASS, perf 60 fps, 100% (RN3.5 is void; see the environment section) |
| RN4 | 7/7, flash PASS, perf 60 fps, 100% |
| END1 | 5/5; `PASS (console,play,text,scene)`; "run 0:59 · deaths 0" at the card; 34,480 bake pixels; 758 frames compared command for command; 63 ceiling reads and 29 card reads; 235 glimpse pixels |

### Suites
- **`npm run standing`:** GREEN. 23 items; 22 mapped files with 116 tests; 7 commands (standing.5).
- **`npm test`:** PASS (R5-npm-test.1).
  - Unit: 25 files, 135 tests.
  - Replay: on the digest seed 1070505712.
  - e2e: all eight checks pass; 771 frames compared.
- **`npm run test:verifiers`:** 269/269 (R5-verifiers.1).
- **`npm run probe:av -- --headed`:** PASS (R5-av-head.1).
  - 2171 voices for 2140 onsets; 0 errors, 0 dropped, 0 shifted.
  - Clock jitter 0.131 ms peak to peak.
  - All 2322 voice starts sit on their own layer's onsets (+0.00 ms), and 1909 of 1909 onsets were started.
  - The mix matches section 8.4.
- **Headed Edge:** `probe-play --channel edge --headed --check console,play,text` passes (R5-edge-console.1).

### Code against each item's Action
- **Diffs against the references.** I stripped the types and diffed each port against its reference. The only differences are types, null guards and layout. No deviation.
  - src/sim against oracle sim.mjs and constants.mjs.
  - src/rooms against world.mjs.
  - output-clock, driver, keys, calibrate, flash-limiter, track and scheduler against their references.
- **Read against the spec.** I read engine.ts, run.ts, main.ts, the three scenes, play-frame.ts and drawShapes against sections 8 to 13. The render modules export section 14's lists, are held list for list by tests/render, and are held command for command by the scene check.
- The only page-flag read in product code is `?playtest`, at src/main.ts:42.

### Mutations

**One per spec area, all killed** (R5-mutations-areas.1 and R5-mutations-areas-browser.1):

| § | Mutation | Killed by |
|---|---|---|
| 2 | TICKS_PER_SIXTEENTH 181 | unit |
| 3 | KeyS as UP | unit |
| 4 | DASH_COOLDOWN 47 | unit, replay |
| 5 | a floor tile of 09-gates opened | content |
| 5 | 09-gates' spikes bound to layer 7, not 8 | content |
| 6 | the wave corridor one row taller | unit |
| 7 | one arp degree changed from 11 to 10 | content, unit |
| 8 | a muted `_` label captured as a layer | unit |
| 8.4 | the master gain at 0.6 | av (mix) |
| 9 | the clock line's jump tolerance at 8 ms | unit |
| 9.2 | stepOf rounds instead of flooring | unit |
| 10.4 | the mid band's factor at 0.62 | unit |
| 10.6 | the bands at reversed depths | play (scene) |
| 11 | LUM_STEP 0.15 | unit |
| 12 | inputBias taken from pass A | unit |
| 13 | the rise over 3 bars | unit |

**R4's findings re-run, all killed** (R5-r4-fixes-hold.1):
- Every note 0.1 s late (engine.ts:64) fails av on its starts: 2317 voices off by +100.0 ms, and 1907 onsets unstarted.
- `??=` at calibration-scene.ts:175 fails the retried run: values 0.0 0.0 against the taps' own 5.5 34.5.
- The run without its step cap fails run.test.

**Hunted and killed:**
- Every note played as a sine: the av solos for layers 3, 5, 7 and 9 go silent (R5-mutation-engine-all-sine.1).
- The sim 90 ms behind the heard time: caught by the keys check (R5-mutation-main-frame-late90.1).
- run.ts driving the sim from `ctx.currentTime`: run.test's `advance()` never returns, so the unit suite cannot pass. I stopped that run and restored the clone; it is not recorded.

**Hunted and survived:** MAJOR 1, MAJOR 2, MINOR 1 and MINOR 2 below.

## Axis B: the game against the concept (all pass)

- **Determinism** (R5-axisb-sim.1). Each of the 11 witnesses ran twice on fresh product sims. Checksums and full `save()` were identical and equal to the witness. The product equals the oracle at all 32,448 steps.
- **The sim imports nothing from render, audio or the DOM.**
  - src/sim imports only constants, beat, types and ../rooms/codes; headless re-exports ../rooms/compile.
  - src/rooms imports only the types of ../sim/types, plus its own codes and gauntlet.
  - There is no window, document, performance, Date, timer, random or console. The Math calls are floor, ceil, abs, min, max and imul.
- **Layers, one per room on a bar line.** Each of rooms 1 to 10 was cleared by its witness and run on.
  - There is exactly one layer change: bit k, on the tick of nextBarStep(clear step). That is bars 4 to 7, between 1.13 and 4.79 beats after the clear.
  - The gauntlet's clear finishes the run with no layer change.
  - In the page, the unlock check passes in all 10 rooms.
- **The wave only through portals.** 1,111 runs: each witness, plus 20 jittered runs on each of HEAD's five sha seeds.
  - Base to wave happened 501 times, every one over a W cell.
  - Wave to base happened 501 times, every one over a B cell. Nothing else changed the form.
  - W cells are in rooms 6, 7, 9, 10 and 11; the first is room 6.
- **No text object.** src has no Text, BitmapText, add.text, make.text or fillText. The probe counts 0 in every scene at every read, with and without `?playtest`.
- **Jitter test** through `tools/replay.mjs --all --jitter --seed` on HEAD's sha words 3172391253, 239750151, 3667707333, 678327013 and 1040817978 (X3-jitter.24 to .28), and on the digest seed 1070505712 (in npm test).
  - All 11 witnesses pass on every seed.
  - The lowest is 18/20: 04-thorns on 239750151, and 10-crown on 1040817978. See NOTE 1.
- **Branching on a flag.**
  - Product code reads only `?playtest` (src/main.ts:42).
  - `textContent` is written only at src/render/ending-scene.ts:72.
  - `?probe` is read only in the spec-owned src/probe/api.ts:812.
- **`?playtest` and the page** (R5-playtest-dom-bare.1 and R5-playtest-dom.2; sizes 1280x720, 800x450 and 900x1200):
  - **Bare page:** no probe API; only the link and the notice; output#playtest hidden and empty; no element of any kind over the canvas. This held at boot, after a key, and at 1280x720 52 s on, after the untouched calibration had handed over to room 1. Zero errors.
  - **`?playtest` without `?probe`:** the same.
  - **`?probe&playtest`:** 0 Phaser text objects and nothing over the canvas at every read. The line `run 0:59 · deaths 0` appears only in output#playtest, outside the canvas, 6879 to 6913 ms into the ending; the card comes at 6857 ms.
  - **`?probe`:** output#playtest stays hidden and empty 12 s into the ending.

## Findings

### MAJOR 1. The calibration's pictures are never timed against the marks the scene judges taps by. A ring shown 100 ms off its frame time moves every player's display offset by 100 ms, with every test green.

**Where**
- src/render/calibration-scene.ts:146-152: each ring's frames and `frameTimes[i]`. Lines 155-160 draw the ring; lines 167-172 match taps to frameTimes.
- src/render/calibration-scene.ts:140-143: pass A's count-in fill.

**Why no check sees it**
- tools/calibration-check.mjs:85-100 (countPulses) only counts rings and fills in the screencast. It never times them.
- The tapper places pass-B taps from the scene's own `frameTimes` (src/probe/api.ts:655), not from the frames that drew a ring.
- tapLogValues (calibration-check.mjs:184) judges against those same frameTimes.
- R4's fix timed only pass A's clicks.

**Triggering inputs (each survives CAL2's full `probe-flash --calibration`, `flash: PASS`)**
- **(a)** Line 150 changed to `a.frameTimes[i] = frameMs + 100`. Also survives the unit suite (135 tests). Tapped 8.6 34.5 and retried 9.9 34.5, both equal to the taps' own (R5-mutation-calib-frametime-late.1).
- **(b)** Lines 148-151 changed so frameTimes are still recorded on the window d_i, but the ring is drawn on d_i + 100 ms. Tapped 5.9 34.5 and retried 5.6 34.5, both equal to the taps' own (R5-mutation-calib-ring-late.1).
- **(c)** The same gap in pass A: line 142 changed to `heard >= t + 0.1 && heard < t + 0.1 + SIXTEENTH`, so each count-in fill comes 100 ms after its click. The check still counts 8 fills (R5-mutation-calib-fill-late.1).

**Effect.** Take a player who taps 40 ms after the clicks and 60 ms after a ring appears.
- HEAD gives avOffset -20 and inputBias 60, so displaySec is +0.02 s.
- Under (a): avOffset 80, inputBias -40, so displaySec is -0.08 s.
- Under (b): avOffset -120, inputBias 160, so displaySec is +0.12 s.
- In both cases every hazard is drawn 100 ms off the music for the whole run (inputLagSec stays 0.04 s). This breaks the beat binding the calibration exists to set, for every player. It is the pass-B twin of R4 MAJOR 1(b).

**Minimal fix**
- Under `?probe`, at Phaser's poststep, record per calibration frame: the time, whether the ring Graphics holds its circle, whether the key shape is filled, and the live attempt.
- calibration-check then holds ring i of every pass-B attempt to exactly the frames with d_i <= frameMs < d_i + SIXTEENTH, with frameTimes[i] the first of them (within the read's skew).
- It also holds each fill of every pass-A attempt to the frames whose heard time is within [t0 + i·BEAT, +SIXTEENTH), for i < 4.
- Controls: (a), (b), (c), plus a control-page `?calib=ringlate`.

**Kind:** design.

### MAJOR 2. The sim, and the ending's card, are held to the heard music only within about 80 to 100 ms. A sim 50 ms behind the music, and so every hazard, its collision and the creature, passes every test.

**Where**
- src/main.ts:62, `run.frame(performance.now())`: the time the driver runs on.
- src/render/ending-scene.ts:81: the ending's heard time.

**Why no check sees it**
- The keys check (tools/probe-lib.mjs:337-346) lets the sim stand up to KEY_SIM_SLACK = 24 steps (100 ms) behind the heard time.
- The frame log (src/probe/api.ts:89-114, read at poststep) records step, state, view and graphics, but no heard time. So tools/scene-check.mjs never holds a frame's step to section 9.1's "one step past the heard time".
- The card is judged at the probe's read with CARD_BEAT_SLACK_S = 0.1 (tools/scene-check.mjs:447).
- main.ts is in no unit test. run.test pins `frame(frameMs)` for a given frameMs, not which time main.ts passes in.

**Triggering inputs**
- **(a)** main.ts:62 changed to `run.frame(performance.now() - 50)`: the sim runs 12 steps behind the music. It survives build and npm test's e2e with all eight checks: console, play, text, network, storage, unlock, scene and keys (R5-mutation-main-frame-late50.1). probe:av times the sound against the transport, never against the sim.
- At 90 ms the keys check catches it ("sim stood at step 123 … names step 148"). So lags up to about 80 ms pass.
- **(b)** ending-scene.ts:81 changed to `audibleSec(clock, performance.now() - 80)`: the card pulses 80 ms after the beat. It survives END1's acceptance (R5-mutation-ending-card-late80.1).

**Effect.** playFrame draws every hazard from `sim.step`. A 50 to 80 ms lag puts the picture half to three quarters of a sixteenth behind the music for the whole run. That undoes concept line 2's binding and the calibration's 5 ms display offset (X8).

**Minimal fix**
- Under `?probe`, with each play-scene frame, log the heard time read after the driver has run (a PRE_STEP listener installed after main.ts's, or the poststep read) and the calibration in use.
- Hold each frame's step to targetStep(heard, origin, displaySec(avOffset)) within one step, except just after a capped frame.
- Log the ending's heard time with each card frame, and hold the drawn beat to beatOfBar at that time, within a few ms of a beat line.
- Controls: (a) and (b).

**Kind:** design.

### MINOR 1. Nothing checks the level and length of each note handed to superdough.

**Where**
- src/audio/engine.ts:64 (`{ ...note.value, orbit }, note.time, note.duration, …`).
- tools/probe-av.mjs:27 holds every solo to a single floor of 0.002 RMS, and (since R4) every start to its time and gate. No check reads a note's gain or duration, and engine.ts is in no unit test.

**Triggering inputs (each survives `probe-av --headed`: 0 errors, every start on its onset)**
- Duration ×4: the pad's solo goes from 0.064 to 0.121 RMS, the sub's from 0.089 to 0.236 (R5-mutation-engine-duration.1).
- Duration fixed at one SIXTEENTH: the pad, with its 0.5 s attack, drops to 0.0103 RMS, a sixth of HEAD's. Layer 2's return after room 2 is barely heard (R5-mutation-engine-sixteenth-length.1).
- Every note at gain 1: the hat goes from 0.014 to 0.093 and the perc from 0.0066 to 0.066, so section 7's mix is flattened (R5-mutation-engine-gain-one.1).

**Effect.** The track's balance and note lengths. Onsets, gates, routing and the mix chain are all held, and no exit criterion changes.

**Fix.** Either a Node test of engine.ts's `play` with @strudel/web mocked (vi.mock) that records superdough's arguments, or per-layer solo bands in probe:av around HEAD's measured RMS.

**Kind:** design.

### MINOR 2 (R4 MINOR 1, carried). The `?playtest` line's death count is only ever read as 0.

**Where.** src/render/ending-scene.ts:71. tools/probe-play.mjs reads the line only after a clean gauntlet witness.

**Triggering input.** Line 71 changed to `const n = 0;` survives build and END1's `?playtest` playthrough (R5-mutation-ending-deaths-zero.1).

**Effect.** Only the deaths column of PLAYTESTS rows; X11 judges the time.

**Fix.** As dispositioned in R4: a fixture witness that dies once at the gauntlet's first obstacle and then clears, with the check wanting `deaths 1`.

**Kind:** design.

### NOTE 1. X3's seed rolls with the digest, and a few witnesses sit near the 18/20 threshold.
- Over seeds 1 to 300, 6 (2.0%) would fail X3 on at least one witness (R5-x3-margin.1):
  - 04-thorns on 2 seeds (17/20);
  - 09-gates on 1 seed (16/20);
  - 10-crown on 3 seeds (16 or 17/20).
- HEAD's digest seed and sha seeds all pass.
- So a commit that changes the digest has about a 2% chance of failing the X3 gate with no product change. If that happens, the remedy is a re-solved witness, not a product fix.

### NOTE 2. The X5 and X10 rows never run over the real calibration scene.
- probe-play boots through skipCalibration (tools/probe-lib.mjs:125-130).
- probe-flash's three calibration runs keep no page-error log and read no storage (probe-flash.mjs:70 and :112).
- src has no storage, network or console code, so no mutation of existing code reaches this. But a "remember my calibration" write would pass every check, against section 12's "memory only".

### NOTE 3. How I read "the default build with no flag shows no text anywhere".
The page title, the source link and the notice are sanctioned by N3, N4 and the Handoff. I checked that nothing else ever shows (as in R4).

## Environment and void records (not findings)
- **RN3.5 (exit 1):** the perf probe refused on `heavy apps: chrome 16.4% CPU`. That was sampled before the probe's own browser launched; the owner's Chrome was open, and the flash probe's Chrome had just closed. The run itself measured 60 fps with 100% of intervals at 20 ms or less. RN3.6, re-run unchanged, passes.
- **R5-playtest-dom.1 (exit 1):** my script polled for the ending once a second, so it saw the ending late and judged the line early. R5-playtest-dom.2 polls every 40 ms and passes.
- **Not run (these belong to VERIFY or come after preview):** probe:supply, probe:live and check:public --history beyond standing's.

## Files
- **Evidence**, all in build/evidence/review/:
  - item records: S1, SIM1, RM1, CT1, SIM2, W1, W2, W3, CL1, CL2, IN1, CAL1, AU1, AU2, AU3, FX1, GAME1, END1, RN1 and RN4 at .5; CAL2.6; RN2.6; RN3.5 and RN3.6;
  - standing.5 and X3-jitter.24 to .28;
  - R5-npm-test.1, R5-verifiers.1, R5-av-head.1 and R5-edge-console.1;
  - R5-axisb-sim.1, R5-playtest-dom-bare.1, R5-playtest-dom.1 and .2, and R5-x3-margin.1;
  - R5-mutations-areas.1, R5-mutations-areas-browser.1 and R5-r4-fixes-hold.1;
  - R5-mutation-calib-frametime-late.1, -calib-ring-late.1 and -calib-fill-late.1;
  - R5-mutation-main-frame-late50.1, -main-frame-late90.1 and -ending-card-late80.1;
  - R5-mutation-engine-duration.1, -engine-sixteenth-length.1, -engine-gain-one.1 and -engine-all-sine.1;
  - R5-mutation-ending-deaths-zero.1.
- **Scratch:** <home>\AppData\Local\Temp\claude\C--Users-<redacted>-code-hush\95d5d167-b43c-4c9c-b2a4-e90801cc293a\scratchpad\r5\
  - clone\ is HEAD, restored and clean.
  - Scripts: run-accept.mjs, mut.mjs, mutants.mjs (every mutant's find and replace), mut-batch.mjs, norm.mjs, axisb-sim.mjs, x3-margin.mjs and playtest-dom.mjs.
