HUSH-REVIEW-R4: BLOCKED (head=c9f589cf1d1544a0e09a4ab49324d9eac879e6d2 digest=c958db45b706ce99a38b80ced9444606f5de7029d68cb5d932d483043530c989 blockers=0 majors=2 minors=2)

Reviewer R4, Opus standing in for Fable, 2026-10-13.

**Why BLOCKED:** one check could not run. The laptop was on battery for the whole review: PowerLineStatus Offline, from 64% down to 32%, and nobody could plug it in.
- The failing commands are `npm run accept:rn1`, `accept:rn2`, `accept:rn3` and `accept:rn4` (build/evidence/review/RN1.4.txt, RN2.5.txt, RN3.4.txt, RN4.4.txt, each exit 1).
- In each, the art test and the flash probe passed. The headed perf probe measured 59.98 to 60 fps with 99.97 to 100% of intervals at 20 ms or less, then refused the run with `perf: power line battery`.
- X4 cannot be measured on battery. Every other check ran.
- **On the findings alone this round is a FAIL (2 MAJOR).** Re-running those four acceptances on AC unblocks it, but cannot turn it into a PASS.

**Integrity of the review:**
- HEAD and the digest (`node tools/ship-gate.mjs --digest`) were equal before and after.
- The only repo change is 51 untracked files under build/evidence/review/, all written through tools/evidence.mjs. `node tools/check-public.mjs` is clean on the tree with them (611 files).
- Every mutation ran in a scratch clone of HEAD outside the repo (node_modules as a junction). Each file was restored by `git checkout` after its run, and the clone's `git status` is clean.

**In short:**
- The product matches every Action. The 19 acceptances that could run are green.
- standing is GREEN, npm test passes, the verifiers pass 258 of 258, `probe:av --headed` passes, and the headed Edge playthrough passes.
- R3's fixes hold: the scene check now reads what is drawn, frame for frame and pixel for pixel.
- Every Axis B check passes.
- **The gap has moved to sound and to the calibration's repeat:**
  - Nothing checks when a sound actually plays. The music can play 100 ms behind the hazards, and the calibration clicks 100 ms after the marks the scene judges taps by, with every test green.
  - The calibration's repeated attempt never runs under a test, so a scene that keeps the first (rejected) attempt instead of the last passes everything.

**Severity rule (R1 to R3's, kept):**
- **MAJOR:** a non-equivalent mutation that survives every test of its area and breaks a beat binding, an exit criterion, a concept deliverable or a module's core job.
- **MINOR:** the area's core mutations are caught, and only a spec'd detail with a bounded effect gets through.
- **NOTE:** the mutation is equivalent, or its effect cannot be reached.

## Axis A: spec conformance

### Acceptances re-run (`node tools/evidence.mjs <ID> review -- <cmd>`, records build/evidence/review/<ID>.4.txt, plus CAL2.5 and RN2.5)

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
| FX1 | 4/4 |
| GAME1 | `PASS (console,play,text,visibility,unlock,keys)`, 74 gauntlet reads; tsc and eslint clean |
| CAL2 | Untouched: up 43.9 s, clicks 48, fills 8, rings 48, values 0 0, Escape ignored. Tapped: up 22 s, values 5.4 34.6 (the taps' own 5.4 34.6). `flash: PASS` |
| RN1 to RN4 | Art tests 6/6, 14/14, 4/4, 7/7; flash PASS each; perf refused on battery (BLOCKED above) |
| END1 | 5/5; `PASS (console,play,text,scene)`; `"run 0:59 · deaths 0"` at the card; 34,480 bake pixels; 758 frames compared command for command; 62 ceiling and 27 card reads; 235 glimpse pixels |

### Code against each item's Action

I read every product file against the oracle, the references, the control page's Calibration scene and sections 8 to 13. I found no deviation.
- src/sim and src/rooms are the oracle's code with types added (a normalised diff).
- The pure modules (clock line, driver, keys, calibration math, track, transport, gates, limiter) match their references line for line.
- engine.ts follows the start order of 8.2, the orbit patch and graph of 8.4, the 25 ms interval plus the worker, the 7 ms sampler, and restart, unlockAt, gauntlet and click.
- run.ts: canonical, the 0.25 s lead, the driver, stepOf, the unlock and gauntlet calls, and the track.
- calibration-scene.ts is the control page's scene without `?calib`.
- play-scene.ts makes one playFrame call per frame.
- ending-scene.ts follows section 13.
- The only page-flag read is `?playtest` at src/main.ts:42.

### Standing and suites

- `npm run standing`: GREEN, 23 items, 22 mapped files, 7 commands (standing.4).
- `npm test`: PASS (R4-npm-test.1). Unit is 25 files and 134 tests; replay ran on the digest seed 3378043717; the playthrough ran all eight checks.
- `npm run test:verifiers`: 258/258 (R4-verifiers.1).
- `probe:av --headed` on HEAD: PASS, 2162 voices for 2144 onsets, clock 0.17 ms peak to peak (R4-av-head.1).
- `probe-play --channel edge --headed --check console,play,text`: PASS (R4-edge-console.1).

### Mutations

**One per spec area, all killed** (R4-mutations-areas.1; unit, replay and content):

| Section | Mutation | Killed by |
|---|---|---|
| 2 | TICKS_PER_STEP 8 | unit, replay |
| 3 | KeyC as dash | unit |
| 4 | RUN_MAX 177 | unit, replay |
| 5 | a 05-doors floor tile | content |
| 6 | the clap spike one row up | unit |
| 7 | the clap pattern | unit, content |
| 8 | LOOKAHEAD 0.2 | unit |
| 8 | the gate mask bit off by one | unit |
| 9 | displaySec's sign | unit |
| 9 | the run's unlock one second late | unit |
| 10 | the warning alpha 0.3 | unit |
| 11 | the area limit 30000 | unit |
| 12 | the MAD threshold 45 | unit |
| 13 | the card's beat +1 | unit |

**Hunted, killed:** the transport's origin 0.1 s late (engine.ts:158). It fails `keys` and `scene` (R4-mutation-engine-origin-late.1), so the run and the transport share one origin.

**Hunted, survived:** MAJOR 1, MAJOR 2, MINOR 1 and MINOR 2 below.

## Axis B: the game against the concept (all pass)

- **Determinism:** each of the 11 witnesses ran twice on fresh product sims. Checksums and full save() were identical, equal to the witness, and equal to the oracle at all 32,448 steps (R4-axisb-sim.1).
- **The sim imports nothing from render, audio or the DOM.** src/sim imports only constants, beat, types and ../rooms. src/rooms imports only ../sim/types, codes and gauntlet. There is no DOM, timer, clock or random global; the Math calls are floor, ceil, abs, min, max and imul.
- **Layers, one per room on a bar line:** rooms 1 to 10, each played by its witness and run on.
  - Exactly one layer change per room: bit k on the tick of nextBarStep(clear), on the bar line, 1.12 to 4.79 beats after the clear.
  - In the page, the unlock check passes in all 10 rooms.
- **The wave only through portals:** 510 form changes over 561 runs (each witness plus 10 jittered runs on each of HEAD's five sha seeds). Every one was over a W or B cell of the right kind. W cells are in rooms 6, 7, 9, 10 and 11; the first is room 6.
- **No text object:** src has no Text, BitmapText, add.text or fillText, and the probe counts 0 in every scene, in both modes.
- **Jitter test** through `tools/replay.mjs --all --jitter --seed` on HEAD's sha words 3388312015, 487933088, 3768208052, 2468665834 and 3363432146, and on the digest seed 3378043717 (X3-jitter.18 to .23):
  - all 11 witnesses pass on every seed;
  - the lowest is 04-thorns at 19/20;
  - every other witness clears 20/20 on every seed.
- **Branching on a flag:** the product reads `?playtest` only (src/main.ts:42). `textContent` is written only at src/render/ending-scene.ts:72. `?probe` is read only in the spec-owned src/probe/api.ts. There is no env, storage, navigator, random or Date branch.
- **`?playtest` and the page** (R4-playtest-dom.1; 36 reads at 1280x720, 800x450 and 900x1200):
  - **The bare page** (no query): no probe API, only the link and the notice, output#playtest hidden and empty, no element or text node over the canvas, before and after the first key. Zero errors.
  - **`?probe`:** no text beyond the link and the notice through the card.
  - **`?probe&playtest`:** exactly `run 0:59 · deaths 0` in output#playtest, outside the canvas, from the card on.
  - In both modes, 0 Phaser text objects.

## Findings

**MAJOR 1. Nothing checks the time each sound is handed to superdough. The music can play off the sim's beat, and the calibration's clicks off the marks the scene judges taps by, with every test green.**
- **Where:**
  - src/audio/engine.ts:64: play passes `note.time` to `S.superdough(...)`.
  - src/audio/engine.ts:172: click passes `time` to `S.superdough(...)`.
- **What the checks read, and why none sees this:**
  - The transport's note times are unit-tested, but engine.ts is not.
  - tools/probe-av.mjs:101-125 judges RMS windows and solos, and voice counts the transport keeps itself.
  - The unlock and keys checks read gate values and the transport's origin.
  - The calibration check counts clicks (tools/calibration-check.mjs:67-74, :108). Its tapper taps from the scene's own t0 (src/probe/api.ts:511), so the tapped run never meets the click as it sounds.
- **Triggering inputs (each survives):**
  - **(a)** engine.ts:64 with `note.time + 0.1`: every note of the track plays 100 ms after the sim step it belongs to. It survives unit, replay, build, smoke, the playthrough with all nine checks, `probe:av --headed` (windows 0.39 to 0.41 RMS, as on HEAD) and END1's ?playtest playthrough (R4-mutation-engine-note-late.1 and .2). This breaks concept line 2: the hazards move to the sim's beat, and the music sounds a sixteenth later. The calibration cannot correct it, because the clicks take the other path.
  - **(b)** engine.ts:172 with `time + 0.1`: every calibration click sounds 100 ms after its mark. It survives unit, build, smoke and CAL2's `probe-flash --calibration`: clicks 45, fills 8, rings 48, values 0 0; tapped 6.4 35.0, equal to the taps' own (R4-mutation-engine-click-late100.1). A real player taps to the click as heard, so avOffset gains 100 ms. The display then sits 100 ms behind the music, and the input lag rises with it.
  - With `+0.05` the click count fell to 42 and the run failed, but only because of NOTE 1's counting artefact, not because of any timing check (R4-mutation-engine-click-late.1).
- **Minimal fix:** time the sounds against their schedule. For example, under ?probe, wrap `AudioScheduledSourceNode.prototype.start` before the first key, as api.ts already wraps `connect`, and record every start time.
  - The av probe holds the starts to the transport's note times (origin + (bar + onset - cycle) x BAR, within a few ms).
  - The calibration check holds each pass-A click to t0 + i x BEAT of its attempt.
  - Controls: the two mutants above fail; HEAD and the control page pass.
- **Kind:** design.

**MAJOR 2. The calibration's repeated attempt never runs under a test. A scene that keeps a pass's first (rejected) attempt instead of its last passes everything, and a player who needs the repeat gets wrong values.**
- **Where:**
  - src/render/calibration-scene.ts:175 (`this.results[a.pass] = result;`), :179 (the repeat) and :183 (`calibrate(...)`).
  - Section 12: "calibrate(a, v) takes the last attempt of each pass".
  - The untouched run rejects all four attempts, so 0 0 comes either way.
  - The tapped run requires both first attempts accepted: tools/calibration-check.mjs:161 (19 to 30 s) and :170.
- **Triggering input:** :175 changed to `this.results[a.pass] ??= result;`.
  - It survives unit, build, smoke and CAL2's `probe-flash --calibration`: untouched 48, 8, 48 and 0 0; tapped 6.6 35.5, equal to the taps' own (R4-mutation-calib-first-result.1).
  - Its effect, shown in the browser: R4-calib-retry-*.2 is a player who does not tap during A1 (the probe's tapper is started at A2's count-in). HEAD runs A1, A2 and B1 and uses 5.5 34.5, the taps' own values. The mutant uses −35.2 35.2 where section 12 gives 4.9 35.2: the whole pass-A median is lost, a 40 ms error, and up to the 150 ms clamp for a high-latency device.
  - On a wordless screen, a first attempt without taps is a likely path for a first-time player.
- **Minimal fix:**
  - Add a third calibration run to the `--calibration` mode: leave A1 and B1 untapped, tap A2 and B2, and want the scene left about 42 s after the key with values equal to tapLogValues of the log (which already takes the last attempt of each pass).
  - Control: the control page with a planted `?calib=first` that keeps the first attempt.
- **Kind:** mechanical.

**MINOR 1. The ?playtest line's death count is only ever read as 0.**
- **Where:** src/render/ending-scene.ts:71 and tools/probe-play.mjs:292-293. Every run the line is read from is a clean gauntlet witness started by startRoom(11).
- **Triggering input:** :71 changed to `const n = 0;` survives unit, build and END1's ?playtest playthrough (R4-mutation-ending-deaths-zero.1).
- **Effect:** the deaths column of PLAYTESTS rows only. X11 judges the time, not the deaths.
- **Fix:** read the line after a run that died, and want its count equal to the sim's nonzero deaths.
- **Kind:** design (the witness cannot simply be shifted after a gauntlet respawn).

**MINOR 2. The run's 24-step cap (section 9.1) is pinned only on driver.ts's own function.**
- **Where:** src/game/run.ts:124. tests/game/run.test.mjs never asks a frame for more than 24 steps (its `advance`, :65), and its calibration case checks only after 40 frames (:154).
- **Triggering input:** the loop count changed to the uncapped `max(target - step, 0)` survives unit, tsc, eslint and the playthrough with all nine checks (R4-mutation-run-no-step-cap.2 and .3).
- **Effect:** after a stall over 100 ms the sim jumps in one frame instead of catching up 24 steps a frame. Presentation only.
- **Fix:** in run.test, one frame whose heard time is 100 steps past the sim ticks exactly 24. Control: the reference run without the cap.
- **Kind:** mechanical.

**NOTE 1. The headless click count depends on where each click falls in Chrome's 100 ms render chunk.**
- In headless Chrome the context time advances in about 100 ms chunks. A meter read sees only the last 2048 samples (about 43 ms) of each, so a click that starts early in a chunk can decay before it is read.
- HEAD's phase gives 48 every time. +50 ms gives 42; +100 ms gives 45 (R4-calib-diag runs in the scratch folder, not recorded).
- MAJOR 1's fix should not time onsets with this counter.

**NOTE 2. How I read "the default build with no flag shows no text anywhere".** Rulings N3 and N4 and the Handoff sanction the title, the source link and the notice. I verified that nothing else ever shows.

**NOTE 3. The perf result on battery.** On battery the product measured 59.98 to 60 fps with 99.97 to 100% of intervals at 20 ms or less. This is for information only; it is not X4 evidence.

## Environment and void records (not findings)

- **R4-calib-retry-head.1 and -mutant.1:** random presses during A1. The mutant's A1 happened to be accepted, so that run never took the repeat path. The .2 records are the result.
- **R4-mutation-engine-click-late.1:** killed only by NOTE 1's artefact.
- **Not run (VERIFY's, or after preview):** probe:supply and probe:live.

## Files

- **Evidence**, all in build/evidence/review/:
  - the item records: S1, SIM1, RM1, CT1, SIM2, W1, W2, W3, CL1, CL2, IN1, CAL1, AU1, AU2, AU3, FX1, GAME1, RN1, RN3, RN4 and END1 at .4; CAL2.5 and RN2.5;
  - standing.4 and X3-jitter.18 to .23;
  - R4-npm-test.1, R4-verifiers.1, R4-av-head.1 and R4-edge-console.1;
  - R4-axisb-sim.1 and R4-playtest-dom.1;
  - R4-mutations-areas.1;
  - R4-mutation-engine-note-late.1 and .2, -engine-click-late.1, -engine-click-late100.1, -calib-first-result.1, -ending-deaths-zero.1, -run-no-step-cap.1 to .3 and -engine-origin-late.1;
  - R4-calib-retry-head.1 and .2, and R4-calib-retry-mutant.1 and .2.
- **Scratch:** <home>\AppData\Local\Temp\claude\C--Users-<redacted>-code-hush\ca2e7315-2780-4059-bee6-9155d9751f5a\scratchpad\r4\
  - mut\ is the clone of HEAD, restored and clean.
  - Scripts: run-accept.mjs, mutate.mjs (every mutant's find and replace), axisb-sim.mjs, playtest-dom.mjs, calib-retry2.mjs, calib-diag.mjs and calib-diag2.mjs.
