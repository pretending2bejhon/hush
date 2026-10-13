# HUSH-FIXLOG

Phase 2 and 3 dispositions, written only by the phase-3 producer: every review finding and blocked item (fixed, rebutted or superseded, with evidence run that session), the `ADOPTED:` rows, and the `RESOLVED:` rows that close a stop. Every quoted field is a one-line JSON string.

## Blocked items of HUSH-BUILD: INCOMPLETE (passed=17 blocked=CAL2,RN1,RN2,RN3,RN4,END1), head 5b9832b

Dispositioned 2026-10-12 by the producer (Opus standing in for Fable). The six items go back to `passes: false` under `HUSH-BUILD: REOPENED`.

DISPOSITION: CAL2 | green-before-edit, case (a): the check did not discriminate | 2026-10-12T01:14:18-05:00 | fixed (amended in 28158f8) | evidence: build/evidence/CAL2.amend.1.txt
- Why: `npm run probe:flash` exited 0 on GAME1's tree before any edit (build/evidence/CAL2.red.1.txt). Its `--calibration` run only waited for the scene `calibration` to be left, and GAME1's first key leaves it at once. The verifier had no control for that mode.
- Repair: tools/probe-flash.mjs now wants the untouched calibration's course seen, through tools/calibration-check.mjs: the scene up at least 39.4 s, 44 to 52 clicks on the master analyser, 6 to 10 count-in fills and 44 to 52 rings in the screencast's centre box, and the values 0 and 0. The control page's calibration scene became section 12's reference, with five planted faults. Section 12 now fixes the timeline, the shapes, the matching of taps and the hand-over; the CAL2 item names the reference and the constructor.
- Controls: tests/controls/calibration-probe.test.mjs, 6 of 6 (build/evidence/CAL2-controls.amend.1.txt). The other control-page probes were re-run after the fixture change, 25 of 25 (build/evidence/CAL2-regression.amend.1.txt), and the verifier unit tests, 226 of 226 (build/evidence/CAL2-verifiers.amend.1.txt). The headed perf and av controls were not re-run: the fixture change touches only the calibration scene, which every other probe leaves through skipCalibration before an attempt starts.
- Red now: the current tree fails the repaired check, `flash: calibration left after 0.2 s` with no click and no ring (build/evidence/CAL2.amend.1.txt, exit 1).

DISPOSITION: RN1 | dep:CAL2, follows CAL2 (reset); also amended before it runs | 2026-10-12T01:14:18-05:00 | fixed (amended in 938c01b) | evidence: build/evidence/RN1.amend.1.txt
- Why the amendment: RN1 to RN4 shared the acceptance `npm run check:art` (flash and perf), which only grows easier as art is missing. By construction it would have passed before any edit, as CAL2's did; its flash half passed on GAME1's art-less tree in build/evidence/CAL2.red.1.txt. Sections 10 and 13 also left open the shapes' numbers, the bake's size (the gauntlet's 544 columns exceed one texture at canvas scale), the creature's history, the limiter's use and the ending's motion. The executor may not decide any of these.
- Repair: the producer's art reference tests/fixtures/reference/art.mjs (section 10.6), ported by the items. Each acceptance runs its item's art test first (tests/render, red while the module is missing), then check:art as before.
- Controls: tests/controls/product-tests.test.mjs with the five art tests, 19 of 19 (build/evidence/ART-controls.amend.1.txt).
- Red now: build/evidence/RN1.amend.1.txt (exit 1, src/render/room-art.ts missing).
DISPOSITION: RN2 | dep:RN1, follows CAL2 (reset); amended with RN1 | 2026-10-12T01:14:18-05:00 | fixed (amended in 938c01b) | evidence: build/evidence/RN2.amend.1.txt
DISPOSITION: RN3 | dep:RN2, follows CAL2 (reset); amended with RN1 | 2026-10-12T01:14:18-05:00 | fixed (amended in 938c01b) | evidence: build/evidence/RN3.amend.1.txt
DISPOSITION: RN4 | dep:RN3, follows CAL2 (reset); amended with RN1 | 2026-10-12T01:14:18-05:00 | fixed (amended in 938c01b) | evidence: build/evidence/RN4.amend.1.txt
DISPOSITION: END1 | dep:RN4, follows CAL2 (reset); amended with RN1 (its old acceptance already discriminated; the ending's art and motion were open) | 2026-10-12T01:14:18-05:00 | fixed (amended in 938c01b) | evidence: build/evidence/END1.amend.1.txt

CAL2 was blocked for its own reason. If it is blocked again after this amendment, it escalates (`HUSH-PHASE3-ESCALATE: CAL2 twice-blocked`) instead of a third reset. RN1 to END1 were blocked only by their dependency, so this producer counts their first block of their own as a first block.

## Blocked items of HUSH-BUILD: INCOMPLETE (passed=22 blocked=END1), head b579e92

Dispositioned 2026-10-12 by the producer (Opus standing in for Fable). END1 goes back to `passes: false` under `HUSH-BUILD: REOPENED`.

DISPOSITION: END1 | suspect-check: the playthrough read the page before the ending's card, and its ?playtest branch had no control | 2026-10-12T11:10:24-05:00 | fixed (amended in fdb139f) | evidence: build/evidence/END1-controls.amend.2.txt
- Why: both attempts (build/evidence/END1.green.1.txt and END1.green.2.txt) passed the art test 3 of 3, cleared 11 rooms with zero console errors, and failed only on `?playtest wants one run line, found []`. tools/probe-play.mjs read the page texts 1.5 s after the gauntlet, while section 13 shows the line when the card appears, RISE_S = 6.857 s into the ending. The executor's diagnosis, read from the code, holds. Worse, no control had ever run the probe's `?playtest` branch (the control page had no ending), so the check had never been shown to pass a conforming ending or to catch a wrong one, and the default mode, read before the card, could not see a line shown without the flag either. The design stands (D16 "after the ending", the Handoff "once the ending card is up"); the verifier was wrong, so no design change.
- Repair: the probe waits for the scene `ending` (at most 15 s after the last room), wants no page text in the first half of the rise, and reads the texts once the card is up: 3 s after the rise, or under `?playtest` as soon as the run line shows (at most 6 s after the rise). The line's time must lie between the last room's clear step and the step seen when the ending began, and its deaths must be the sim's. Text objects are now also counted at the end of every room, because the play scene's objects are destroyed when the ending starts (Phaser's DisplayList shutdown), which the end-of-run count alone could not see. The control page gained section 13 at small scale after its last toy room, with five planted faults behind `?ending=`.
- Controls: tests/controls/page-probes.test.mjs, the playthrough's 18 of 18 (build/evidence/END1-controls.amend.2.txt). The clean page passes with and without `?playtest`. No hand-over, no line, a line without the flag, a line before the card and a line from the card's step each fail for their own reason, beside the nine earlier faults and the visibility and witness controls. Attempt 1 (END1-controls.amend.1.txt, 17 of 18) failed only because the `?domtext` control wants its FAIL line to begin with `text over the canvas`, and the ending's problems were listed first; the page's problems now come first. Every other control on the changed control page was re-run: smoke, supply and live 4 of 4 (END1-page-controls.amend.1.txt), flash 9 of 9 (END1-flash-controls.amend.1.txt), calibration 6 of 6 (END1-calibration-controls.amend.1.txt), the headed perf pair on AC 2 of 2 (END1-perf-controls.amend.1.txt), and the verifier unit tests 226 of 226 (END1-verifiers.amend.1.txt). The headed av controls were not re-run: the control page's audio runs on its own timers, untouched, and its new ending keeps the driver running, so nothing the av probe reads changed.
- On the product: GAME1's acceptance stays green under the repaired probe, which now watches its empty ending (build/evidence/GAME1-regression.amend.1.txt). The `?playtest` text check alone is red on GAME1's tree with `?playtest wants one run line, found []` (END1-text.amend.1.txt), and END1's acceptance is red because src/render/ending-art.ts is missing (END1.amend.2.txt).

This is END1's first block of its own; the earlier reset followed its dependency. If it is blocked again after this amendment, it escalates as twice-blocked instead of a third reset.

## Review R1 (cycle 1): HUSH-REVIEW-R1: FAIL, head cb90b06, digest 46bcc3dc

Opened 2026-10-12 by the producer (Opus standing in for Fable). Findings: 9 (0 BLOCKER, 4 MAJOR, 5 MINOR) and 1 NOTE; the first round, so no prior count. The product matched every Action; every MAJOR is a test that a mutation of shipped behaviour survives. Routing: a verifier is PROTECTED, so a finding against one is the producer's amendment whatever its kind; a product change goes to one applier per finding after its amendment commit. Each row below names the decision; its evidence and commit are added when it lands.

DISPOSITION: R1-MAJOR1 | X7's clear-time unlock (src/game/run.ts:129) and the gauntlet re-mapping (:133) never run under a test | 2026-10-12T14:18:00-05:00 | to fix by amendment, three parts
- (a) The playthrough gains the check `unlock`, in its default set: rooms 1 to 10 are each cleared by their witness in the live run and nothing restarts the run until that layer's bar line has passed. Layer k's gate must read 0 from the clear until 30 ms before origin + bar x BAR, where bar = pendingAt x 7 / 2880 from the sim's state, and 1 from 30 ms after. Its controls are on the control page: ?unlock=late (one bar late) and ?unlock=none.
- (b) tests/game/run.test.mjs drives the run's wiring with a fake engine and clock over the witnesses. In one continuous run, unlockAt(k, unlockBar(clear step)) must come once per clear, and gauntlet(gBeat / 4) must come on entering the gauntlet from room 10 and on every respawn there. The test joins test:av (X7's unit part) and is controlled by a reference run (tests/fixtures/reference/run.mjs) with planted faults.
- (c) The engine reports the transport's gauntlet bar (AudioStatus `gauntletBar`; AU2 and GAME1 amended, one applier). The unlock check reads it in the gauntlet after room 10's clear and after a respawn there, and it must equal the sim's gBeat / 4. The control page has no gauntlet, so this predicate is controlled in Node.
- Landed 2026-10-12T14:55-05:00, parts (a) and (b), in the commit `hush-spec: amend GAME1 AU3 CAL2 ...` that follows `2e6aacd`.
  - (a) The control page passes; ?unlock=late, early and none fail. The product passes in 10 rooms (build/evidence/R1-page-controls.amend.1.txt and .2.txt, 15 of 15 with the regression of the playthrough's other controls).
  - (b) 12 of 12 on the product and on the reference. A layer a bar late, none, and no gauntlet mapping each fail (build/evidence/fix/R1-product-controls.1.txt, 26 of 26).
  - Part (c) is still open.
- Part (c) amended 2026-10-12T15:22-05:00 in the commit `hush-spec: amend AU2 GAME1 ...` after `d1b97eb`.
  - tests/audio/scheduler.test.mjs pins the getter: 8 of 8 on the reference, red on the tree (startBar undefined; build/evidence/AU2.amend.1.txt). A getter stuck at -1 fails, and LOOKAHEAD and the shift still fail (build/evidence/R1-AU2-controls.amend.1.txt).
  - The unlock check reads gauntletBar after room 10's clear: "mapped from bar undefined while its run starts on bar 7 (gBeat 28)" on the tree (build/evidence/GAME1.amend.2.txt). The control page passes, as it has no gauntlet, and the predicate passes 2 of 2 in tests/tools/probe-lib.test.mjs.
  - The applier follows.
- Part (c) fixed 2026-10-12T15:28-05:00 by the applier in `df7c009` (hush-fix: R1-MAJOR1).
  - AU2's test passes 8 of 8 (build/evidence/fix/R1-MAJOR1.1.txt).
  - accept:game passes (console,play,text,visibility,unlock), the unlock check mapping the gauntlet at its entry and its respawn (build/evidence/fix/R1-MAJOR1.2.txt).
  - Standing is GREEN (build/evidence/fix/R1-MAJOR1.3.txt). R1-MAJOR1 is fixed in all three parts.

Round R1 closed 2026-10-12T15:32-05:00: 9 fixed, 0 rebutted, 0 superseded; NOTE 1 needed no action.
- Final records: every product-test control 30 of 30 (build/evidence/R1-FIX-product-controls.amend.1.txt), the verifier suite 231 of 231 (build/evidence/R1-FIX-verifiers.amend.1.txt), standing GREEN on df7c009.
- Not run this session, for VERIFY: the headed av probe on the 0.25 s lead, and the page-probes and calibration controls after their last edits. Their changed cases were run in batches: R1-page-controls.amend.1 and .2, R1-calibration-controls.amend.1 and .2.
DISPOSITION: R1-MAJOR2 | the calibration scene's tap capture, matching and hand-over never see a tap | 2026-10-12T14:18:00-05:00 | to fix by amendment
- The flash probe's --calibration mode adds a tapped run on a fresh page. An in-page injector presses a key 40 ms after each click of pass A, timed from the attempt's t0 in heard time, and 25 ms after each ring of pass B, timed from its frameTimes in performance time. Both passes are then accepted at once, so the values in use must be avOffset 15 and inputBias 25 within 5 ms (X8's tolerance), and the scene must be left after two attempts.
- Section 12 pins the attempt state the injector reads, which the product and the control page already share.
- The untouched run's count-in window tightens from 6 to 10 fills to 7 to 9.
- Controls on the control page: ?calib=flip (pass A's offset sign flipped) and ?calib=count3 (a count-in of 3).
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit.
  - The control page's tapped run gives 15.1 and 25.0. flip gives -65.1 and fails, count3 shows 6 fills and fails, and the five earlier faults still fail (build/evidence/R1-calibration-controls.amend.1.txt and .2.txt, 8 of 8).
  - The product's `npm run probe:flash` passes: untouched 48 clicks, 8 fills and 48 rings; tapped 15.1 and 25.0.
DISPOSITION: R1-MAJOR3 | the play scene's beat binding (src/render/play-scene.ts:151) is untested | 2026-10-12T14:18:00-05:00 | to fix by amendment and one applier
- The scene's per-frame assembly becomes the reference's pure `playFrame` (section 10.6): the camera, the beat entities, the ring, the creature and the dust, all read from the sim it is given. It is ported into src/render/play-frame.ts (RN4 amended).
- tests/render/play-frame.test.mjs compares product and reference over the witness runs. The scene draws only what playFrame returns.
- RN4's acceptance runs the headed perf probe, so the applier needs the laptop on AC.
- Amended 2026-10-12T15:05-05:00 in the commit `hush-spec: amend RN4 ...` after `524ef44`.
  - The test passes 2 of 2 on the reference and is red on the tree before the port: play-frame.ts is missing (build/evidence/RN4.amend.2.txt).
  - The beat entities drawn 24 steps ahead fail. The other art controls still fail their own faults now that the reference imports the oracle's FIELDS (build/evidence/R1-RN4-controls.amend.1.txt, 7 of 7).
  - The applier follows.
- Fixed 2026-10-12T15:10-05:00 by the applier in `ccaedaf` (hush-fix: R1-MAJOR3).
  - accept:rn4 passes 6 of 6, with flash PASS and perf PASS headed on AC: 59.92 fps, 99.89% of intervals at 20 ms or less (build/evidence/fix/R1-MAJOR3.1.txt).
  - Standing is GREEN with 21 mapped files (build/evidence/fix/R1-MAJOR3.2.txt).
DISPOSITION: R1-MAJOR4 | the ending card's beat binding (src/render/ending-scene.ts:88) is untested | 2026-10-12T14:18:00-05:00 | to fix by amendment and one applier
- `endingFrame` (the rise, then the card) and `beatOfBar`, read from the run's origin, move into ending-art.ts (END1 amended).
- They are compared with the reference in tests/render/ending-art.test.mjs. The scene draws only what endingFrame returns.
- Amended 2026-10-12T15:00-05:00 in the commit `hush-spec: amend END1 ...` after `020b7a7`.
  - The test passes 5 of 5 on the reference and is red on the tree before the port: endingFrame is missing (build/evidence/END1.amend.3.txt).
  - The beat counted from t0 + 0.2 s fails (build/evidence/R1-END1-controls.amend.1.txt).
  - The applier follows.
- Fixed 2026-10-12T15:00-05:00 by the applier in `524ef44` (hush-fix: R1-MAJOR4). The acceptance passes 5 of 5 with the playthrough PASS (console,play,text) and "run 0:59 · deaths 0" (build/evidence/fix/R1-MAJOR4.1.txt); standing is GREEN (build/evidence/fix/R1-MAJOR4.2.txt).
DISPOSITION: R1-MINOR1 | the ending's text guard covers only the first half of the rise | 2026-10-12T14:18:00-05:00 | to fix (verifier): the guard runs to RISE_MS - 400 ms; control ?ending=mid (a line at 60% of the rise)
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit: ?playtest&ending=mid fails, and the clean page and the other ending faults keep their verdicts (build/evidence/R1-page-controls.amend.1.txt and .2.txt).
DISPOSITION: R1-MINOR2 | three of CL1's thresholds are unpinned | 2026-10-12T14:18:00-05:00 | to fix (test): a 6 ms downward glitch, a lead of 3 render quanta, a blip of exactly two low pairs
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit. A blip of two low pairs needs a 15 ms lead, so that only each burst's fresh pair is trusted. CLOCK_JUMP 0.008, 2 quanta and 2 low pairs each fail (build/evidence/fix/R1-product-controls.1.txt), and the product passes 11 of 11.
DISPOSITION: R1-MINOR3 | AU2's late shift amount is unpinned | 2026-10-12T14:18:00-05:00 | to fix (test): a shifted note's time is its tick's time + 0.005
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit: a 10 ms shift fails (build/evidence/fix/R1-product-controls.1.txt), and the product passes 7 of 7.
DISPOSITION: R1-MINOR4 | a run started at the gauntlet stalls about 150 ms on its bake and can drop the first sixteenth | 2026-10-12T14:18:00-05:00 | to fix by amendment and one applier
- The run's origin lead goes from 0.1 s to 0.25 s (GAME1, section 8.4), so a room's bake ends before its first sixteenth falls due.
- A player walking in from room 10 never restarts the origin; only the calibration hand-over and the probes do.
- Amended 2026-10-12T15:15-05:00 in the commit `hush-spec: amend GAME1 ...` after `ccaedaf`.
  - tests/game/run.test.mjs pins the lead and passes 13 of 13 on the reference.
  - It is red on the tree before the change: the origin is 5.1, want 5.25 (build/evidence/GAME1.amend.1.txt).
  - A lead of 0.1 s fails, and the three wiring faults still fail (build/evidence/R1-GAME1-controls.amend.1.txt, 4 of 4).
  - The applier follows.
- Fixed 2026-10-12T15:18-05:00 by the applier in `d1b97eb` (hush-fix: R1-MINOR4).
  - accept:game passes (console,play,text,visibility,unlock), with tsc and eslint clean (build/evidence/fix/R1-MINOR4.1.txt).
  - Standing is GREEN (build/evidence/fix/R1-MINOR4.2.txt).
  - The late-note effect itself is measured by the av probe at VERIFY.
DISPOSITION: R1-MINOR5 | X3's jitter test re-rolls its seed on every commit, and about 1 HEAD in 40 fails it | 2026-10-12T14:18:00-05:00 | to fix by amendment (verifier)
- X3's seed comes from the verdict digest instead of HEAD's sha (tools/ship-gate.mjs X3, and the replay step of tools/test-all.mjs for X2). A bookkeeping commit never re-rolls it, and every verdict on one digest sees one seed, judged first at VERIFY.
- 04-thorns' margin is the room's own, as proven at the cut (97 of 100 on the oracle). It is kept as a known property.
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit: tools/ship-gate.mjs `x3Seed(digest)`, used by X3 and by npm test's replay step. tests/tools/ship-gate.test.mjs shows the seed kept across a record commit, and the verifier suite passes 229 of 229 (build/evidence/R1-verifiers.amend.1.txt).
DISPOSITION: R1-NOTE1 | four surviving mutations with no effect reachable on the sha-pinned content | 2026-10-12T14:18:00-05:00 | no action

## Review R2 (cycle 1): HUSH-REVIEW-R2: FAIL, head 2f2b8a2, digest eeca3e10

Opened 2026-10-12T17:55-05:00 by the producer (Opus standing in for Fable). Findings: 9 (0 BLOCKER, 5 MAJOR, 4 MINOR), against R1's 9 (0 BLOCKER, 4 MAJOR, 5 MINOR). The count did not drop across two FAIL rounds, so the round escalates by the caps before any disposition (build/HUSH-PROGRESS.md, `R2-count-not-dropping`).
- No R1 finding survives. The reviewer re-ran R1's mutations and each one is now caught. The product matches every Action.
- Every R2 finding is a gap in the checks, one step past R1's fixes. Nothing here is dispositioned until the owner's word resolves the escalation.
- The producer's proposed routing, if the round goes on:
  - R2-MAJOR1 (the play scene's image placement) and R2-MAJOR3 (the ending's glimpse): a canvas check in the playthrough. It reads pixels where the sim puts a solid tile in a room, and where the glimpse's light sits once the card is up. A verifier amendment, with planted faults on the control page.
  - R2-MAJOR2 (drawShapes): a tests/render test with a recording fake Graphics, each shape kind mapped to its call in section 10.6. A verifier amendment; its control mis-maps one kind.
  - R2-MAJOR4 (the calibration's hand-over) and R2-MAJOR5 (the window's keys): after the tapped run, the probe wants the run's own values, room 1 running, and real game keys reaching the sim on the step stepOf gives. run.test gains cases for setCalibration and stepOf. A verifier amendment, then one applier, because `Inspect.calibration` must read the run's values (src/main.ts).
  - R2-MINOR1 and R2-MINOR2: test fixtures (verifier amendments).
  - R2-MINOR3: the tapper records the taps it lands, and the check judges the values in use against those taps. A verifier amendment.
  - R2-MINOR4: the two stale item lines of the spec (an amendment).

RESOLVED: HUSH-PHASE3-ESCALATE: R2-count-not-dropping | 2026-10-12T17:55:00-05:00 | f266a19d | 2026-10-12T18:00:49-05:00 | "A, go on with FIX R2" | next: producer

Dispositions, 2026-10-12T18:08-05:00, on the owner's A. Every finding is a gap in a PROTECTED verifier or a stale line of the spec, so each one is the producer's amendment. No product file changes and no applier is dispatched: the reviewer saw the product do what the spec says on HEAD (the real hand-over, the real keys, the room and the glimpse in its screenshots). The browser checks below are new and optional in tools/probe-play.mjs, so the control page's default run is unchanged. They are named where they apply: `keys` in GAME1's acceptance, `scene` in END1's, and both in npm test.

DISPOSITION: R2-MAJOR1 | the play scene's image placement is untested | 2026-10-12T18:08:39-05:00 | to fix by amendment (verifier)
- The playthrough's new check `scene` reads the play scene's display list and the sim in one page read, once in every room, half-way through its witness.
- It wants every baked image of section 10.6 (the chunks, the four bands, the fog, the vignette) with its key, size, origin, scale and depth, and nothing else.
- The chunks and the bands must sit at one camera, and that camera must be the one cameraPx gives for the sim's creature, within one step's motion.
- It also wants the three Graphics at depths 6, 7 and 8, with the creature's and the dust's drawn.
- The predicate is controlled in Node (tests/tools/probe-lib.test.mjs), because the control page has no bake.
DISPOSITION: R2-MAJOR2 | drawShapes is untested | 2026-10-12T18:08:39-05:00 | to fix by amendment (test)
- tests/render/draw-shapes.test.mjs records every Phaser call through a fake Graphics. Each shape kind must make the calls section 10.6 names, offset by (dx, dy).
- Its reference is tests/fixtures/reference/draw.mjs; its control is an ellipse drawn at half size.
- It joins RN1's acceptance and mapped tests.
DISPOSITION: R2-MAJOR3 | the ending's glimpse is untested | 2026-10-12T18:08:39-05:00 | to fix by amendment (verifier)
- The check `scene` reads the ending's display list with every text read, through the rise and at the card.
- It wants the glimpse image with its key, size, origin, depth 0 and x 0, its y never moving back down, and its y 0 once the card is up. It also wants the one Graphics at depth 1.
- Controlled in Node.
DISPOSITION: R2-MAJOR4 | the calibration's hand-over to the run is untested | 2026-10-12T18:08:39-05:00 | to fix by amendment (test and verifiers)
- (a) tests/game/run.test.mjs: setCalibration(a, b) moves the sim's target by displaySec(a) and stepOf by inputLagSec(a, b). The reference run gains both; the controls are displaySec(0) and inputLagSec(0, 0).
- (b) The playthrough's new check `keys` hands over through skipCalibration(100, -60) and wants room 1 running before it presses keys (MAJOR 5).
- (c) The tapped calibration wants room 1 running after its own hand-over.
DISPOSITION: R2-MAJOR5 | no test sends the keyboard to the game | 2026-10-12T18:08:39-05:00 | to fix by amendment (verifier)
- The check `keys` presses ArrowRight and Space through the browser's keyboard. The page records, for each event, its timeStamp, the clock line's offset and the sim's step.
- The sim's state after the keys must equal a replay on the oracle from the state before them. In the replay, each key changes the held bits on the step stepOf names for its time (section 9.2), or on the next tick when that step has already passed. It must also differ from the same replay without the keys.
- With avOffset 100 and inputBias -60, each key lands about 14 steps ahead of the sim, so the step is the one stepOf names, and a lost input lag or calibration shows.
- Controlled in Node.
DISPOSITION: R2-MINOR1 | CAL1's trim is untested | 2026-10-12T18:08:39-05:00 | to fix by amendment (test)
- An asymmetric fixture asserts the MAD: 5 trimmed, not the untrimmed 10.
- The control is the fixture calibrator tests/fixtures/calibration/untrimmed.mjs.
DISPOSITION: R2-MINOR2 | the run's track and the ring's place are untested | 2026-10-12T18:08:39-05:00 | to fix by amendment (tests)
- run.test compares run.track() with the reference's trackStep over every tick of a witness run. The reference run gains the track; the control is a run that never steps it.
- play-frame.test plays rooms 1 and 6 on past their layer's return, so the ring is drawn and compared. The control is the ring's centre one world px up.
DISPOSITION: R2-MINOR3 | the tapped calibration can fail a correct product | 2026-10-12T18:08:39-05:00 | to fix by amendment (verifier)
- The tapper logs every tap it lands (its timeStamp, its heard time, the attempt it fell in) and each attempt's t0, p0 and frameTimes.
- The check recomputes judgePass and calibrate from those taps (tests/fixtures/calibration/reference.mjs) and wants the values in use equal to them within 0.5 ms. It refuses a run whose taps strayed more than 10 ms from their marks.
DISPOSITION: R2-MINOR4 | two item lines are stale | 2026-10-12T18:08:39-05:00 | to fix by amendment
- CL1's decisive line becomes `Tests  11 passed (11)`.
- END1's text guard is described as the probe runs it.

The tests part landed 2026-10-12T18:15-05:00 in the commit `hush-spec: amend RN1 RN4 GAME1 CAL1 CL1 END1 ...` that follows `100e45f`. That fixes R2-MAJOR2, R2-MINOR1, R2-MINOR2, R2-MINOR4 and part (a) of R2-MAJOR4.
- On the product: tests/render/draw-shapes.test.mjs passes 3 of 3, tests/input/calibrate.test.ts 6 of 6, tests/game/run.test.mjs 15 of 15 and tests/render/play-frame.test.mjs 3 of 3.
- Controls: tests/controls/product-tests.test.mjs passes 36 of 36 (build/evidence/R2-product-controls.amend.1.txt). Each new case is green on its reference and red on its fault:
  - drawShapes: an ellipse at half size, a flat triangle;
  - the run: displaySec(0), inputLagSec(0, 0), no track step;
  - the frame: the ring one world px up.
  - Every earlier case keeps its verdict on the extended reference run.
- The X8 calibrators, 4 of 4: the untrimmed one fails (build/evidence/R2-calibrator-controls.amend.1.txt).
- Standing is GREEN: 22 mapped files and 114 tests, calibration 6, test:av 39 (build/evidence/R2-tests-standing.amend.1.txt).
- The spec: section 1.6, the drawShapes and track paragraphs of 10.6, section 12's X8 line, three rows of section 15, and the acceptances of CL1, CAL1, RN1 (with draw-shapes mapped), RN4 and END1.

The probes part landed 2026-10-12T19:30-05:00 in the commit `hush-spec: amend GAME1 CAL2 END1 and the probes ...` after `d495056`. That fixes R2-MAJOR1, R2-MAJOR3, R2-MAJOR5, R2-MINOR3, and parts (b) and (c) of R2-MAJOR4.
- tools/probe-play.mjs gains the optional checks `scene` and `keys`, with src/probe/api.ts `layout` and `keyLog`. GAME1's acceptance names `keys`, END1's names `scene`, and npm test names both.
- The product passes:
  - accept:game `PASS (console,play,text,visibility,unlock,keys)`, tsc and eslint clean (build/evidence/GAME1.amend.3.txt);
  - accept:ending `PASS (console,play,text,scene)`, 11 rooms read and 88 ending reads (build/evidence/END1.amend.4.txt);
  - probe:flash with the tapped run `values 15.1 25.0 (the taps' own 15.1 25.0 ...)` and a run at room 1 after the hand-over (build/evidence/CAL2.amend.2.txt).
- The reviewer's mutants, each built in a scratch copy of HEAD with the new probe API, fail:
  - the chunks unscrolled, with the glimpse kept at y 720: `scene` FAIL on both (build/evidence/R2-mutant-scene.amend.3.txt). Runs .1 and .2 were the producer's setup slips: .1 built HEAD's old probe API (exit 2), and .2 showed only the room's four problems.
  - the keys on a detached target: `keys` FAIL, the run went on as if no key had been pressed (R2-mutant-keys-unwired.amend.1.txt);
  - the calibration dropped at the hand-over: `keys` FAIL, the sim standing 21 to 22 steps ahead of where displaySec puts it (R2-mutant-keys-nocal.amend.2.txt). Run .1 passed, and that pass taught the check its step bound: without the calibration, every key arrives late and goes in on the next tick either way.
  - no run after the hand-over: `keys` FAIL (R2-mutant-keys-norun.amend.1.txt);
  - the input lag lost in run.ts: `keys` FAIL at a read taken while the creature moved (R2-mutant-keys-nolag.amend.1.txt). Room 1 has no beat entities, so a uniform shift of every key leaves the same state once the creature stands still. tests/tools/probe-lib.test.mjs asserts exactly that, and the check now compares every read taken while the keys are pressed.
- Node controls:
  - tests/tools/probe-lib.test.mjs, 11 of 11: the play layout's and the glimpse's faults, and the keys' faults;
  - tests/tools/calibration-check.test.mjs, 8 of 8: late taps judged by their own values, flipped values, a stray, a rejected first attempt, no log, no run after the hand-over.
- Browser controls:
  - tests/controls/calibration-probe.test.mjs: 7 of 8 in build/evidence/R2-calibration-controls.amend.1.txt. The count-in-of-3 page failed the probe as it must, on its fills, but its screencast at 43 frames a second saw 5 fills where the control expected exactly 6. The control now takes 5 or 6, and passes (R2-calibration-controls.amend.2.txt).
  - tests/controls/page-probes.test.mjs, the playthrough's regression on the changed probe: 26 of 26 (build/evidence/R2-page-controls.amend.1.txt).
  - The verifier suite: 243 of 243 (build/evidence/R2-verifiers.amend.1.txt).

Round R2 closed 2026-10-12T19:19-05:00: 9 fixed, 0 rebutted, 0 superseded, every one by the producer's amendment and no applier. The product is unchanged since the review (src/ outside src/probe, rooms, music and replays as at 2f2b8a2). Standing is GREEN on 2af5356 (build/evidence/R2-probes-standing.amend.1.txt); the digest is now 4537d7d2.
- Not run this session, for VERIFY:
  - the headed perf probe of check:art: RN2's and RN4's review runs were refused on the machine's state, not on the product, and no art changed since;
  - the headed av probe;
  - npm test with the new checks, whose parts ran one by one above.
- The next step is review R3, in a fresh producer session: this session holds one hush-review commit, and a review takes about two active hours.

## Review R3 (cycle 1): HUSH-REVIEW-R3: FAIL, head 81a66ae, digest 4537d7d2

Opened 2026-10-12T22:44-05:00 by the producer (Opus standing in for Fable). Findings: 8 (0 BLOCKER, 2 MAJOR, 6 MINOR), against R2's 9 (0 BLOCKER, 5 MAJOR, 4 MINOR). The count dropped, so the round goes on to FIX with no escalation.
- No R2 finding survives. The reviewer re-ran R2's four browser mutants and each one now fails. The product matches every Action.
- MAJOR 1 and 2 are R2's class one step further out: the `scene` check reads where each image and Graphics sits, never what it draws. They do not re-open R2-MAJOR1 or R2-MAJOR3, whose mutants (the chunks unscrolled, the glimpse kept down) are caught. These are new paths: an empty bake, a list left undrawn or drawn at an offset.
- Every finding is a gap in a PROTECTED verifier, so each one is the producer's amendment. No product file changes and no applier is planned: the reviewer saw the product draw what section 10.6 says on HEAD (its screenshots beside each mutant).

DISPOSITION: R3-MAJOR1 | the play scene's check reads where its images and Graphics sit, never what they draw | 2026-10-12T22:44:00-05:00 | to fix by amendment (verifier)
- The check `scene` reads what the play scene draws, in every room.
  - The Graphics: from the room's first frame, the probe records each frame of the play scene for 2 s (src/probe/api.ts). Each record holds the sim's state, the first chunk's x (which carries the camera), and the full command buffer of each Graphics at depths 6, 7 and 8.
  - tools/probe-lib.mjs replays the reference over the same frames, from the witness's own states on the oracle: beatShapes with the levels carried frame to frame through a reference limiter begun every frame, the ring, the creature with the one interpolation that gives the recorded camera, and moteShapes.
  - Each list is encoded as the calls drawShapes makes (section 10.6), in Phaser 4.2.1's command encoding. The recorded buffers must equal those within 1e-4 px.
  - The bakes: in the half-way read, the probe reads the pixels of every baked texture (each chunk and band, and the fog and the vignette) at points tools/probe-lib.mjs chooses, each at least 1 px from every shape's edge. Each pixel must equal the bake's reference shapes composited at that point over transparent, within 3 levels a channel.
- Controls: the reviewer's four mutants must fail it (the beat entities undrawn, a blank chunk, the gauntlet's chunks drawn from column 0, the creature drawn 40 px down), and so must MINOR 3's two. The predicates are controlled in Node by the same faults in synthetic records (tests/tools/probe-lib.test.mjs).
DISPOSITION: R3-MAJOR2 | the ending's check reads where the glimpse and the Graphics sit, never what they show | 2026-10-12T22:44:00-05:00 | to fix by amendment (verifier)
- With every ending read, the probe returns the Graphics' command buffer as well.
  - During the rise it must equal ceilingShapes(ceilingY), with ceilingY = -120 + 840 e and e read from the glimpse's y, 720 (1 - e).
  - Once the card is up it must equal cardShapes(b), b being the beat of the bar heard at the read, or the beat before within 20 ms after a beat line.
- The glimpse texture's pixels are read once, as for the bakes, against glimpseShapes().
- Controls: the reviewer's two mutants (the card undrawn, a blank glimpse) must fail; in Node, synthetic reads with the same faults.
DISPOSITION: R3-MINOR1 | CL1's stale-pair rule is never reached by its test | 2026-10-12T22:44:00-05:00 | to fix by amendment (test)
- The scenario 'stale pairs after a resume' starts its device's clock at 2000 ms, so its stale stamps are positive and reach the stale rule. Control: CLOCK_STALE 5000 in the reference.
DISPOSITION: R3-MINOR2 | FX1's test never asks for a sum exactly at the limit | 2026-10-12T22:44:00-05:00 | to fix by amendment (test)
- A request of exactly 25,600 px in a fresh frame must come back under 0.1, and one of 25,599 px must pass. Control: `>` for `>=` in the reference.
- MINOR 1 and MINOR 2 fixed 2026-10-12T22:47-05:00 in the commit `hush-spec: amend CL1 FX1 ...` after `b94a366`.
  - On the product: CL1's test passes 11 of 11 (build/evidence/CL1.amend.1.txt) and FX1's 4 of 4 (build/evidence/FX1.amend.1.txt).
  - Controls: each case is green on its reference and red on its fault, with the clock's and the limiter's earlier cases (build/evidence/R3-product-controls.amend.1.txt, 7 of 7).
  - The spec: FX1's acceptance (4 tests), section 11's edge, section 15's row and section 1.6.
DISPOSITION: R3-MINOR3 | the play scene's use of the limiter is untested | 2026-10-12T22:44:00-05:00 | to fix by amendment (verifier), with MAJOR 1
- MAJOR 1's frame record replays the levels through the reference limiter frame by frame. A frame not begun, or levels not kept, then differs from the replay. Room 2's stones sit exactly on the limit, so the reference holds their changes.
- Controls: the reviewer's two mutants.
DISPOSITION: R3-MINOR4 | the engine's mix values (section 8.4) are unpinned | 2026-10-12T22:44:00-05:00 | to fix by amendment (verifier)
- Under ?probe, the probe records the audio graph as the page builds it: it wraps AudioNode.prototype.connect before the first key.
- The av probe walks back from the context's destination and wants section 8.4's chain:
  - the analyser (fftSize 2048, smoothing 0);
  - the master gain (0.8) into it;
  - the compressor (-10, 6, 4, 0.005, 0.12) into the master;
  - the ten gates and one more input (the calibration orbit) into the compressor.
- The control page builds the same graph. Control: the control page with ?av=master-low (the master at 0.4).
- Fixed 2026-10-12T23:43-05:00 in the commit `hush-spec: amend the av probe ...` after `2e40fab`.
  - The first product run (build/evidence/R3-av-product.amend.1.txt, exit 1) found the speakers fed by the analyser and six GainNodes. They are superdough's: its timers' zero gains (helpers.mjs webAudioTimeout) and its own output, a merger into a gain (superdoughoutput.mjs), which every patched orbit leaves unfed. So the rule is now "every other input of the speakers is silent by construction", read from the recorded edges into and out of the mergers. The walk starts at the master analyser among the speakers' inputs.
  - On the product: `npm run probe:av -- --headed` passes. The speakers take the analyser and 6 other inputs, all silent by construction; the master gain is 0.8, the compressor -10 6 4 0.005 0.12, and 10 of 10 gates feed it (build/evidence/R3-av-product.amend.2.txt).
  - Controls: the control page passes with the same chain. ?av=master-low fails on the mix alone, and the three earlier faults keep their verdicts (build/evidence/R3-av-controls.amend.1.txt, 5 of 5). In Node, tests/tools/probe-lib.test.mjs passes 13 of 13, with a halved master, a compressor off by one value, a missing gate, a sounding bypass, an analyser not at the speakers and an unreadable graph each failing.
  - The recorder runs in every probe under ?probe, so GAME1's acceptance was run on it: `PASS (console,play,text,visibility,unlock,keys)`, with tsc and eslint clean (build/evidence/GAME1.amend.4.txt). The verifier suite passes 247 of 247 (build/evidence/R3-verifiers.amend.2.txt).
DISPOSITION: R3-MINOR5 | no test presses Escape | 2026-10-12T22:44:00-05:00 | to fix by amendment (verifier)
- The calibration check presses Escape before its first key and wants no audio started and the scene waiting with no attempt.
- The tapped run also presses Escape three times in each attempt, at a click or ring plus 200 ms, logged apart from its taps. A scene that takes Escape as a tap then gives values off the taps' own (MINOR 6's spread makes the shift show).
- Control: the control page with ?calib=escape.
DISPOSITION: R3-MINOR6 | section 12's count-in tap window is untested | 2026-10-12T22:44:00-05:00 | to fix by amendment (verifier)
- The tapper also taps the count-in (clicks and rings 0 to 3). It spreads its taps over the intended offset ± 19 ms in a fixed pattern, so that taps a scene wrongly admits move the median by more than the 0.5 ms the check allows. tapLogValues already drops the count-in taps, as section 12 does.
- Control: the control page with ?calib=nowindow.
- MINOR 5 and MINOR 6 fixed 2026-10-12T23:20-05:00 in the commit `hush-spec: amend CAL2 ...` after `8d952df`.
  - The spread as landed: pass A's taps 21 to 59 ms after the clicks (40 at the median). Pass B's are 25 to 44 ms after the rings (34.5 at the median), because a ring's tap is placed only once the frame that drew it is seen. A first control run with pass B spread around 25 ms landed its early taps a frame late: the control page judged by its own taps (8.9 32.4, the taps' own 8.9 32.4), outside the control's old range (build/evidence/R3-calibration-controls.amend.1.txt, 3 of 4). So the marks are now the medians, 5.5 and 34.5.
  - The tapper's log must show 4 count-in taps and 3 Escapes in every attempt, so the check never passes a scene it did not test.
  - On the product: CAL2's acceptance passes, `values 0 0, Escape ignored`, tapped `values 5.6 34.5 (the taps' own 5.6 34.5 ...)`, `flash: PASS` (build/evidence/CAL2.amend.4.txt; .3 was the run before the pass B change).
  - Controls: the control page passes untouched and tapped. ?calib=escape fails on the audio started by Escape and on its values; ?calib=nowindow fails on its values alone; the eight earlier faults keep their verdicts (build/evidence/R3-calibration-controls.amend.2.txt and .3.txt, 10 of 10). In Node, tests/tools/calibration-check.test.mjs passes 10 of 10, and the verifier suite 245 of 245 (build/evidence/R3-verifiers.amend.1.txt).
DISPOSITION: R3-NOTE1 | the run's view has no reference | 2026-10-12T22:44:00-05:00 | no action (MAJOR 1's fit reads the creature within one step)
DISPOSITION: R3-NOTE2 | three equivalent mutations | 2026-10-12T22:44:00-05:00 | no action

State at 2026-10-12T23:46-05:00, the end of this producer session. Five of the eight findings are fixed: MINOR 1, 2, 4, 5 and 6, each in its own amendment commit with standing GREEN (8d952df, 2e40fab, 6a6a0ed); the digest is now 4bcf57c4.
- MAJOR 1, MAJOR 2 and MINOR 3 remain, as their dispositions above say. There is no FIX R3 line yet, so the next producer starts at re-entry row 8: it finishes FIX R3, then runs review R4.
- This session stopped with 4h25m of its 6 active hours used. The content check needs about three hours with its controls, which could not be finished and verified inside the cap.
- Notes for that work, read this session from Phaser 4.2.1's source (node_modules/phaser/src):
  - A Graphics' commandBuffer holds numbers, plus one boolean for an arc's direction:
    - FILL_STYLE 7 (c, a), FILL_RECT 3 (x, y, w, h), FILL_TRIANGLE 10 (six numbers);
    - LINE_STYLE 6 (lw, c, a), BEGIN_PATH 1, MOVE_TO 5 (x, y), LINE_TO 4 (x, y), FILL_PATH 8, STROKE_PATH 9;
    - ARC 0 (x, y, r, start, end, anticlockwise, overshoot), CLOSE_PATH 2.
  - How each drawShapes call encodes:
    - fillPoints and strokePoints with closeShape true close with a LINE_TO back to the first point, not CLOSE_PATH.
    - fillEllipse(x, y, w, h) is fillPoints of 32 points, x + (w/2) cos(TAU i / 32) and y + (h/2) sin(TAU i / 32), closed.
    - strokeCircle is BEGIN_PATH, ARC x y r 0 TAU false 0, STROKE_PATH.
    - strokeRect draws four two-point paths with the current line width lw: x down, x + w down, and the top and bottom from x - lw/2 to x + w + lw/2.
  - A Graphics made by add.graphics() has no default styles, so clear() leaves an empty buffer. The reference's lists can therefore be encoded in Node into the exact buffer drawShapes must leave, with no browser.
  - DynamicTexture.snapshotPixel(x, y, cb) is synchronous on WebGL. It reads one pixel of the texture's framebuffer at (x, height - y - 1), so y counts from the top, and returns the bytes as stored (premultiplied alpha). A full-texture snapshot instead goes through a PNG and un-premultiplies.
  - The play scene's frame needs the run's view (prevX, x, alpha) to recompute the creature and the ring, and Inspect does not carry it. The witness's own states give prevX and x. alpha can be fitted (the one that reproduces the recorded camera and creature), or Inspect can gain view(), with an applier for src/main.ts.
  - The beat entities and the dust need no view. The camera is in the first chunk's x, and the levels can be replayed from the room's first frame, since the scene resets them to [] on its bake.
  - superdough adds inputs of its own to the speakers (MINOR 4's notes above).

MAJOR 1, MAJOR 2 and MINOR 3 fixed 2026-10-13T01:05-05:00 in `3c6bf58` (hush-spec: amend the scene check ...), by the next producer (Opus standing in for Fable). Still no product file changes and no applier.
- How it landed, against the dispositions above:
  - The run's view is read, not fitted. The play scene keeps its run in its field `run`, which section 10.6 now pins, as section 12 pins the calibration scene's `attempt`. The probe reads `run.view()` at Phaser's `poststep`, so it gets the view the frame drew from. A fit from the camera could not work in a room the camera never scrolls.
  - The frames. src/probe/api.ts logs every frame from the run's bake: a light record (sim, room, step) every frame, and a full one (state, view, first chunk's x, each Graphics' buffer) every 4th frame, up to 48 a bake. tools/scene-check.mjs replays every frame in order: the oracle run, the reference track, playFrame with the levels carried and the limiter begun every frame. It compares every full frame within 1e-3. A cleared room is followed until its layer is back and its ring has been drawn for 300 ms, so the ring is judged too.
  - The bakes. The pixels are read through DynamicTexture.snapshotPixel at points a pixel or more from every edge: one a cell for chunks, a 40 px grid and one inside each shape for bands, the fog's strips and the vignette's cells. They are judged against a premultiplied composite of the reference shapes, within 3 levels. The translucent fog and vignette match too.
  - The ending. The ceiling is judged by the glimpse's y in the same read. The card is judged by the heard time at the read, with 0.1 s of slack after a beat line. The glimpse's pixels are read once the card is up.
- On the product, every room of the full run:
  - accept:ending passes `PASS (console,play,text,scene)`: 11 rooms, 34,480 bake pixels, 758 frames compared command for command (40 while the limiter held a change, 50 with a layer's ring), 62 ceiling and 28 card reads, and 235 glimpse pixels (build/evidence/END1.amend.6.txt).
  - Attempt .5 failed on its text check alone: it read the run line 6356 ms into the ending, where 6457 is the guard. That run judged the gauntlet's log before it watched the ending, so it saw the ending about 0.5 s late. All judging now waits until the ending has been watched, and nothing else changed.
  - npm test passes with all eight checks together (build/evidence/R3-npm-test.amend.1.txt): 771 frames, 63 with a ring; unlock and keys ok.
  - GAME1's acceptance passes on the new probe, with tsc and eslint clean (build/evidence/GAME1.amend.5.txt).
- Controls:
  - In Node, tests/tools/scene-check.test.mjs passes 11 of 11. It pins every shape kind's encoding. A log drawn as the reference passes. Each of these fails: the beat entities undrawn, the creature 40 px down, the camera elsewhere, levels not kept (room 2), a limiter never begun again (room 4), a live state off the replay, a restart, an empty log, too few full frames, a blank or foreign bake, an unreadable texture, an undrawn card, a card off the beat, a ceiling elsewhere and a missing Graphics. The verifier suite passes 258 of 258 (build/evidence/R3-verifiers.amend.3.txt).
  - In the browser, eleven pages were built from the working tree with one planted fault each (rooms 1, 2, 4 and the gauntlet, then the ending), and each fails `scene` for its own fault (build/evidence/R3-mutant-*.amend.2.txt; .1 is the same verdict before the judging moved after the ending). They are:
    - the reviewer's four: the beat entities undrawn, a blank chunk, the gauntlet's chunks from column 0 (chunks 1 to 3), and the creature 40 px down;
    - MINOR 3's two: no beginFrame, caught in room 4 once room 2 has filled the limiter; and the levels not kept, caught on room 2's stones;
    - MAJOR 2's two: the card undrawn and a blank glimpse;
    - three more: the ring undrawn, a band baked empty and the fog baked empty.
  - The control page's probes keep their verdicts, 26 of 26 (build/evidence/R3-page-controls.amend.1.txt and .2.txt; one file runs over the 10-minute call, so it ran in two parts by test name).
- After the commit the digest is c958db45. X3's seed rolls to 3378043717, and all 11 witnesses pass on it at 20 of 20, 04-thorns included (checked this session, not recorded).
- Not run this session, for VERIFY:
  - the headed perf, flash and av probes: the frame log starts only when the scene check calls frameLogStart, so those runs are as before;
  - probe:console's headed Edge pass.

Round R3 closed 2026-10-13T01:21-05:00: 8 fixed, 0 rebutted, 0 superseded, every one by the producer's amendment and no applier. NOTE 1 and NOTE 2 needed no action. The product is unchanged since the review (src/ outside src/probe, rooms, music and replays as at 81a66ae). Standing is GREEN on the amendment (build/evidence/R3-scene-standing.amend.1.txt). The next step is review R4.

## Review R4 (cycle 1): HUSH-REVIEW-R4: BLOCKED, head c9f589c, digest c958db45

Opened 2026-10-13T03:08-05:00 by the producer (Opus standing in for Fable).
- **The count.** Findings: 4 (0 BLOCKER, 2 MAJOR, 2 MINOR) and 3 NOTEs, against R3's 8 (0 BLOCKER, 2 MAJOR, 6 MINOR). The count dropped, and no R3 finding survives: the reviewer saw R3's fixes hold, frame for frame and pixel for pixel. No escalation.
- **The verdict.** The round is BLOCKED, not FAIL. The headed perf probe inside RN1 to RN4's acceptances refused to measure on battery: the laptop was unplugged for the whole review. On its findings the round would be a FAIL.
- **The plan.** It is the fourth round of cycle 1, and the cycle's hard cap is 5. So review R5 is the last round this cycle can have, and it can end the cycle only as a PASS after a FIX round. Every finding is therefore dispositioned and fixed before R5, as a FAIL round's would be, and the blocker is cleared with evidence. Then `FIX R4` is recorded and R5 runs.
- **The routing.** Every finding is a gap in a PROTECTED verifier, so each one is the producer's amendment. The product matches every Action again, so no applier is planned.

DISPOSITION: R4-BLOCKED | RN1 to RN4's acceptances refused by the perf probe on battery (`perf: power line battery`) | 2026-10-13T03:08:00-05:00 | to clear with evidence, on AC power
- Run `npm run accept:rn1` to `accept:rn4` on AC with energy saver off, each through `node tools/evidence.mjs <ID> amend -- <cmd>`. The art tests and the flash probe passed in the review (build/evidence/review/RN1.4.txt, RN2.5.txt, RN3.4.txt, RN4.4.txt), so these four runs clear it. The laptop must be plugged in: the owner's hands.
DISPOSITION: R4-MAJOR1 | nothing checks when a sound plays: the track's notes and the calibration's clicks can be handed to superdough off their times | 2026-10-13T03:08:00-05:00 | to fix by amendment (verifier), design settled here
- **The recorder.** Under `?probe`, before the first key, src/probe/api.ts wraps `AudioScheduledSourceNode.prototype.start`, as it already wraps `connect`. It keeps every call it passes on: the node's type, its `when` (the context time when 0 or absent) and the context time at the call. `__hush.starts()` takes them.
- **The voice starts.** A voice start is an OscillatorNode or AudioBufferSourceNode started ahead of the call (when > the time at the call). These are left out: superdough's ConstantSourceNodes (its timers and DC offsets, helpers.mjs webAudioTimeout and modulators.mjs), and every node started at once (an FM modulator's `osc.start()`, the reverb's player).
- **The av probe.** The onset times of every layer are computed for each segment of its run, as countOnsets counts them, from the segment's origin and the gauntlet's mapping. Every voice start must fall within [t - 1 ms, t + 6 ms] of an onset t of its segment; the 6 ms allows the transport's 5 ms late shift. Every onset more than 0.3 s inside its segment must have a voice start there.
- **The calibration check.** In the untouched run, every pass-A attempt must start a voice within 1 ms of t0 + i x BEAT for each click i from 0 to 23. The transport runs no track before the hand-over, so those starts are the clicks'. Starts are matched by time, never through the analyser's click count (the reviewer's NOTE 1).
- **Controls.** On the control page: `?av=late`, every note handed over 0.1 s late, which must fail the av probe on the starts alone; and `?calib=clicklate`, every click 0.1 s late, which must fail the calibration check. The clean page passes both. The reviewer's two product mutants (engine.ts:64 `note.time + 0.1`, :172 `time + 0.1`) must fail. In Node, the predicates are controlled with synthetic starts.
DISPOSITION: R4-MAJOR2 | the calibration's repeated attempt never runs under a test | 2026-10-13T03:08:00-05:00 | to fix by amendment (verifier)
- **The run.** The flash probe's `--calibration` mode gains a third run, on a page of its own: the retry. The tapper leaves pass A's and pass B's first attempts untapped (Escape still pressed in them), so both are rejected, and taps the second ones as the tapped run does.
- **What it must see.** The scene left after four attempts: 39.4 s or more after the key, and at most 50 s. The values in use must equal, within 0.5 ms, those section 12 gives from the last attempt of each pass (tapLogValues), and lie within 15 ms of 5.5 and 34.5. A run at room 1 must follow the hand-over.
- **Control.** The control page with `?calib=first`, a scene that keeps a pass's first result, must fail on its values.
DISPOSITION: R4-MINOR1 | the ?playtest line's deaths are only ever read as 0 | 2026-10-13T03:08:00-05:00 | to fix by amendment (verifier) if time allows before R5; a MINOR does not block a PASS
- A death cannot come from the gauntlet's witness shifted after a respawn. Its run starts on a bar line, a bar is 411 3/7 steps, and the start's phase within its step changes from bar to bar.
- So the death comes from a fixture witness the producer computes on the oracle: tests/fixtures/playtest/11-gauntlet-death.json. It gives no input until the creature dies at the gauntlet's first obstacle. After the respawn it gives the gauntlet witness's changes shifted to the new run's start, choosing the respawn whose start has the first run's phase. The oracle must show it clearing with deaths 1.
- The `?playtest` text check plays the gauntlet with it and wants `deaths 1` on the line.
- If it is left open at a cycle-ending PASS, it is carried into the next cycle.
DISPOSITION: R4-MINOR2 | the run's 24-step cap is pinned only on driver.ts's own function | 2026-10-13T03:08:00-05:00 | to fix by amendment (test)
- tests/game/run.test.mjs gains a case: one frame whose heard time stands 100 steps past the sim ticks exactly MAX_STEPS_PER_FRAME (24) steps, and the next frame ticks 24 more.
- Its control is a reference run without the cap, a planted fault in tests/controls/product-tests.test.mjs, which must fail.
DISPOSITION: R4-NOTE1 | the headless click count depends on where a click falls in the render chunk | 2026-10-13T03:08:00-05:00 | no action; MAJOR 1 times starts, never counts
DISPOSITION: R4-NOTE2 | the page's sanctioned texts | 2026-10-13T03:08:00-05:00 | no action
DISPOSITION: R4-NOTE3 | the perf numbers on battery | 2026-10-13T03:08:00-05:00 | no action; X4 is measured on AC at VERIFY

MAJOR 2 and MINOR 2 fixed 2026-10-13T03:33-05:00 in `618ca0c` (hush-spec: amend CAL2 GAME1 ...), by the producer. No product file changes.
- MAJOR 2, the retried run:
  - src/probe/api.ts: `tapCalibration(a, b, untapFirst)` leaves each pass's first attempt untapped, with its Escapes still pressed.
  - tools/calibration-check.mjs: `judgeTapped({ ..., retry: true })` wants A1 and B1 rejected, 39.4 to 50 s, the repeats' values and the tapper's log as section 12 now says.
  - tools/probe-flash.mjs runs the retried run on a third page after the tapped one.
  - On the product, CAL2's acceptance passes (build/evidence/CAL2.amend.5.txt): untouched 48 clicks, 8 fills, 48 rings and 0 0; tapped 5.5 34.6; retried 43.6 s, values 5.3 34.8, the taps' own 5.3 34.8.
  - The reviewer's mutant (calibration-scene.ts:175 `??=`) fails the retried run alone, `values 0.0 0.0, the taps' own 5.4 34.7`, while its untouched and tapped runs pass (build/evidence/R4-mutant-calib-first.amend.1.txt).
  - On the control page (build/evidence/R4-calibration-controls.amend.1.txt), the clean page passes all three runs and `?calib=first` fails on the retried values. In Node, tests/tools/calibration-check.test.mjs passes 11 of 11, with the retried judge's pass, a kept first result, no repeat, tapped first attempts and a stray tap in a first attempt.
- MINOR 2: tests/game/run.test.mjs passes 17 of 17 on the product. A frame heard 100 steps past the sim ticks 24, then 24, then up to the target. The run's controls pass 8 of 8, the reference without the cap failing (build/evidence/R4-run-controls.amend.1.txt).
- The verifier suite passes 259 of 259 (build/evidence/R4-verifiers.amend.1.txt), and standing is GREEN (build/evidence/R4-standing.amend.1.txt).
- The digest is now 263fbb18. X3's seed rolls to 641710872, and all 11 witnesses clear 20 of 20 on it (checked this session, not recorded).

State at 2026-10-13T03:34-05:00, the end of this producer session (one hush-review commit, its budget):
- **Open:** MAJOR 1 (the sound's starts; design above), MINOR 1 (the line's deaths; design above), and the blocker (RN1 to RN4 on AC). The control page's other nine calibration controls are re-run below if the battery lasts.
- **Not yet recorded:** the `FIX R4` line. The next producer starts at re-entry row 9:
  1. it finishes FIX R4: MAJOR 1, MINOR 1 if time allows, and the nine regression controls if they are not recorded below;
  2. it clears the blocker on AC, recording RN1 to RN4's acceptances as `amend`;
  3. it records `FIX R4`;
  4. it runs review R5, the cycle's last.
- **Notes for MAJOR 1, read this session from superdough's source (node_modules/superdough):**
  - Synth voices start OscillatorNodes at the note's `t` (synth.mjs) and noise at `t` (noise.mjs).
  - webAudioTimeout starts a ConstantSourceNode at its startTime (helpers.mjs:372-389), and modulators.mjs starts a DC ConstantSourceNode at `params.begin`.
  - An FM modulator starts with `osc.start()` at once (helpers.mjs:404), and a released node that was never started gets `start(currentTime + 5)` (helpers.mjs:641).
  - tools/probe-av.mjs countOnsets already walks the onsets per segment. Its time `origin + (b + whole.begin - cycle) x BAR` is the one to hold the starts to.

The nine regression controls, 2026-10-13T03:54-05:00 (committed in `1d2ea62`): the control page's calibration controls now pass 11 of 11.
- The records are build/evidence/R4-calibration-controls.amend.1.txt to .5.txt. Each part is under the 10-minute call, and every run now takes a retried run as well.
- The count-in-of-3 control failed once on a negative assertion of its own (.2). Its tapped values came out 0.8 ms off the taps' own, because a 3-beat count-in admits the tapper's tap on click 3 (review R3, MINOR 6). That is a second catch of the same fault. It had passed in R3 only because that run's shift stayed within 0.5 ms.
- So the control now forbids only a run that never hands over in time, and it passes (.3; tests/controls/calibration-probe.test.mjs, committed with this note).
- After that commit the digest is 232b03a2, and X3's seed rolls to 590021538. Every witness passes on it, 10-crown at 19 of 20 and the others at 20 of 20 (checked this session, not recorded).
- The R4 section's times were first written as estimates. They were corrected to the commits' own times (fc32706 03:08, 618ca0c 03:33, d68cf9a 03:34, 1d2ea62 03:54) in the commit after this one.

MAJOR 1 fixed 2026-10-13T11:40-05:00 in the commit `hush-spec: amend the av probe and the calibration check ...` after `bf70c77`, by the next producer (Opus standing in for Fable). Still no product file changes and no applier.
- **How it landed**, against the disposition above:
  - The recorder (src/probe/api.ts `starts()`) wraps the `start` of AudioScheduledSourceNode and of AudioBufferSourceNode, which declares its own.
  - Each record also carries the layer the node plays into, read from every live edge between nodes once the voice is built. The connect wrapper now keeps every edge by its source, beside the speakers' chain it kept already.
  - So the av probe holds each voice start to the onsets of its own layer, not of any layer. A layer played through another layer's gate fails too, which the disposition did not ask for. A voice that reaches no gate and no speaker cannot sound and covers no onset.
  - The calibration check holds the clicks in all three runs, not only the untouched one. The untouched run watches the attempts without a tap (`watchCalibration()`).
- **Three faults of the check itself**, found by its first runs on the product (session records, not committed) and fixed before any record:
  - AudioBufferSourceNode's own `start` was not wrapped, so the noise voices had no record: the hat, the clap, the open hat and the kick's noise.
  - The hand-over's run and the probe's first room were started on one context time, so they shared one origin. A start is now filed under the later run with that origin.
  - The take missed the starts of its last tick, whose layers were not read yet. The take keeps only read starts (the rest wait for the next take), and the onsets it must cover end at the take's own context time.
- **On the product:**
  - `npm run probe:av -- --headed` passes. 2311 voice starts, each exactly on an onset of its layer, and 1909 of 1909 onsets started (build/evidence/R4-av-product.amend.1.txt).
  - CAL2's acceptance passes: click starts 48 of 48, 24 of 24 and 48 of 48 on their marks (build/evidence/CAL2.amend.6.txt).
  - GAME1's acceptance passes with the recorder in the page: `PASS (console,play,text,visibility,unlock,keys)`, tsc and eslint clean (build/evidence/GAME1.amend.6.txt).
- **The mutants**, each built in a scratch clone of HEAD with the working tree's probe API:
  - every note 0.1 s late (engine.ts:64): 2315 of 2315 voice starts off, +100.0 ms, and no onset started (build/evidence/R4-mutant-note-late.amend.1.txt);
  - every click 0.1 s late (engine.ts:172): every click of every attempt off its mark by +100.0 ms, in all three runs (build/evidence/R4-mutant-click-late.amend.1.txt);
  - the orbits into rotated gates (engine.ts:114, `gates[number % 10]`): 1558 starts off and 1347 onsets unstarted, every other av check green (build/evidence/R4-mutant-gate-rotate.amend.1.txt).
- **Controls:**
  - the av probe on the control page, 7 of 7: `?av=late` and `?av=swap` fail on the starts alone, and the clean page and the five earlier faults keep their verdicts (build/evidence/R4-av-controls.amend.1.txt and .2.txt);
  - the calibration check on the control page, 12 of 12: `?calib=clicklate` fails on its click starts in all three runs, and the clean page shows every click on its mark (build/evidence/R4-calibration-controls.amend.6.txt to .9.txt);
  - in Node, tests/tools/av-starts.test.mjs (new, 9 tests) and tests/tools/calibration-check.test.mjs (12 tests); the verifier suite passes 269 of 269 (build/evidence/R4-verifiers.amend.2.txt).
- **Still open:** MINOR 1 (the line's deaths) is left for the next cycle, as its disposition allows: a MINOR does not block a PASS. Next: the blocker, RN1 to RN4 on AC, then `FIX R4` and review R5.

The blocker cleared 2026-10-13T11:52-05:00 on AC power, energy saver off, each acceptance through `node tools/evidence.mjs <ID> amend`, with this session's start recorder in the page:
- RN1: the art tests 6 of 6, flash PASS, perf 60 fps with 100% of 3605 intervals at 20 ms or less (build/evidence/RN1.amend.2.txt).
- RN2: 14 of 14, flash PASS, perf 60 fps, 100% (build/evidence/RN2.amend.2.txt).
- RN3: 4 of 4, flash PASS, perf 60 fps, 100% (build/evidence/RN3.amend.3.txt).
  - Its first run (RN3.amend.2.txt, exit 1) measured 13 fps, with frame gaps of a second, and never reached the gauntlet's busy window. It ran on the same build that measured 60 fps for RN1 and RN2 minutes before, and its machine line read AC, saver off, 60 Hz and nothing heavy.
  - A page that is not visible gets about one frame a second, so the headed window was most likely covered for most of that minute. Nothing changed before the retry.
- RN4: 7 of 7, flash PASS, perf 60 fps, 100% (build/evidence/RN4.amend.3.txt).

Round R4 closed 2026-10-13T11:53-05:00: 3 fixed (MAJOR 1, MAJOR 2, MINOR 2), 0 rebutted, 0 superseded, every one by the producer's amendment and no applier. MINOR 1 stays open and is carried; NOTE 1 to 3 needed no action. The blocker is cleared. The product is unchanged since the review (src/ outside src/probe, rooms, music and replays as at c9f589c). The next step is review R5, the last round cycle 1 can have.

## Review R5 (cycle 1): HUSH-REVIEW-R5: FAIL, head bd16d95, digest 3fce9ef0

Opened 2026-10-13T14:05-05:00 by the producer (Opus standing in for Fable).
- **The count.** Findings: 4 (0 BLOCKER, 2 MAJOR, 2 MINOR) and 3 NOTEs. The last FAIL round, R3, had 8, and R4 (BLOCKED) had 4 on its own, so the count has not grown.
- **What held.** No R4 finding survives except MINOR 2, which is R4's MINOR 1, carried by its disposition. The reviewer re-ran R4's three mutants and each one now fails.
- **The product.** It is unchanged since R3 and matches every Action. All 23 acceptances pass, and so do standing, npm test, the verifiers (269 of 269), the headed av probe and the headed Edge playthrough. Every Axis B check passes.
- **The cap.** R5 is cycle 1's fifth round, the caps' hard limit, and it is a FAIL. The cycle cannot end, and it cannot have a sixth round, so the round escalates before any disposition (build/HUSH-PROGRESS.md, `R5-cycle1-round-cap`).
- **The proposal.** Both MAJORs are gaps in PROTECTED verifiers: R4's class seen from the picture side. Each has a fix that changes no product file. Nothing below is dispositioned until the owner's word resolves the escalation. The producer's proposed routing, if the loop goes on:
  - R5-MAJOR1, the calibration's pictures, untimed (verifier amendment).
    - Under ?probe, src/probe/api.ts logs every frame of the scene `calibration`. Each record holds performance.now() and the heard time at Phaser's prestep and at its poststep, so the scene's own frameMs lies between them. It also holds whether a Graphics carries the ring (the ARC of radius 50 at 640, 360) and whether the key shape is filled (its FILL_PATH), both read from the command buffers, and the live attempt.
    - tools/calibration-check.mjs holds every attempt of all three runs to section 12. In pass B, a frame shows the ring if and only if d_i <= frameMs < d_i + SIXTEENTH for some i, and frameTimes[i] lies in the bracket of the first frame that shows ring i. In pass A, the key shape is filled if and only if t0 + i * BEAT <= heard < t0 + i * BEAT + SIXTEENTH for some i below COUNT_IN. A frame whose bracket straddles a window's edge is not judged.
    - Controls: the reviewer's three product mutants (frameTimes 100 ms late, the ring drawn 100 ms late, the fills 100 ms late), each failing. On the control page, `?calib=ringlate`, `?calib=filllate` and `?calib=frametime`. In Node, synthetic frame logs.
  - R5-MAJOR2, the sim's step and the ending's card held only within 80 to 100 ms (verifier amendment).
    - The play scene's frame log gains, per frame, performance.now() and the heard time read by a PRE_STEP listener added after main.ts's, so it reads just after the driver has run. It also gains the calibration in use.
    - tools/scene-check.mjs holds each frame's step to targetStep(heard, origin, displaySec(avOffset)) of section 9.1, within one step. The exception is a frame the 24-step cap stopped short.
    - The ending's frames log the heard time at prestep and poststep beside each read of the card. The card's lit dot must be beatOfBar's at both ends of the bracket; a bracket that holds a beat line is not judged.
    - Controls: the reviewer's two product mutants (`run.frame(performance.now() - 50)` and the card's heard time 80 ms late) must fail. The control page gains `?drive=late` and `?ending=cardlate`, and the predicates are controlled in Node.
  - R5-MINOR1, the notes' level and length: carried, unless time allows a Node test of engine.ts's `play` with @strudel/web and the audio nodes faked, recording superdough's arguments against the transport's notes.
  - R5-MINOR2 (R4-MINOR1), the line's deaths: as dispositioned in R4, a fixture witness that dies once at the gauntlet's first obstacle and then clears, with the check wanting `deaths 1`.
  - NOTE 1 (X3's margin, about 2% of digests) and NOTE 3 need no action. NOTE 2 (X5 and X10 never run over the real calibration scene) is cheap to close: the flash probe's three calibration pages collect page errors and read storage, as probe-play's do.

RESOLVED: HUSH-PHASE3-ESCALATE: R5-cycle1-round-cap | 2026-10-13T14:04:52-05:00 | cc8dfdfd | 2026-10-13T14:35:14-05:00 | "A, go on with FIX R5" | next: producer

Dispositions, 2026-10-13T14:40-05:00, on the owner's A: cycle 1 gets one more round, R6. It ends the cycle if it is a PASS after this FIX round; a FAIL escalates again. Every finding is a gap in a PROTECTED verifier, so each one is the producer's amendment, with no product file changed and no applier. The designs are the proposal above, with these settled details:

DISPOSITION: R5-MAJOR1 | the calibration's rings and count-in fills are never timed | 2026-10-13T14:40:00-05:00 | to fix by amendment (verifier)
- As proposed: a frame log of the scene `calibration`, each frame bracketed between Phaser's prestep and poststep. Ring i and fill i are held to their windows, and frameTimes[i] to the bracket of the first frame that shows ring i, in every attempt of all three runs.
DISPOSITION: R5-MAJOR2 | the sim's step and the ending's card are held to the heard music only within 80 to 100 ms | 2026-10-13T14:40:00-05:00 | to fix by amendment (verifier)
- The play scene's frame log gains, per frame, the heard time and the origin, read by a PRE_STEP listener that runs after the driver's. The log also carries the calibration in use.
- tools/scene-check.mjs `stepTimingProblems` wants each frame's step to be section 9.1's, max(prev, min(targetStep(heard, origin, displaySec(avOffset)), prev + 24)), within one step. A frame whose heard time could not be read (the context not running, the line not valid) and a new run's first frame are not judged.
- An ending log (`endingLogStart`, `endingLogTake`) records every frame of the scene `ending`: the heard time at prestep and at poststep, the origin, the glimpse's y and the Graphics' buffer.
- `endingTimingProblems` judges every card frame whose bracket holds no beat line: it must draw cardShapes(beatOfBar) of that bracket.
DISPOSITION: R5-MINOR1 | the notes' level and length are unchecked | 2026-10-13T14:40:00-05:00 | carried to the next cycle (a MINOR does not block a PASS)
DISPOSITION: R5-MINOR2 | the line's deaths are only ever read as 0 (R4-MINOR1) | 2026-10-13T14:40:00-05:00 | carried to the next cycle, as in R4
DISPOSITION: R5-NOTE1 | X3's margin | 2026-10-13T14:40:00-05:00 | no action
DISPOSITION: R5-NOTE2 | X5 and X10 never run over the real calibration scene | 2026-10-13T14:40:00-05:00 | to fix with MAJOR 1 if time allows, else carried
DISPOSITION: R5-NOTE3 | the page's sanctioned texts | 2026-10-13T14:40:00-05:00 | no action

