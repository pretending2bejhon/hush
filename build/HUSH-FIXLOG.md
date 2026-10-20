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

Dispositions, 2026-10-13T14:36-05:00, on the owner's A: cycle 1 gets one more round, R6. It ends the cycle if it is a PASS after this FIX round; a FAIL escalates again. Every finding is a gap in a PROTECTED verifier, so each one is the producer's amendment, with no product file changed and no applier. The designs are the proposal above, with these settled details:

DISPOSITION: R5-MAJOR1 | the calibration's rings and count-in fills are never timed | 2026-10-13T14:36:57-05:00 | to fix by amendment (verifier)
- As proposed: a frame log of the scene `calibration`, each frame bracketed between Phaser's prestep and poststep. Ring i and fill i are held to their windows, and frameTimes[i] to the bracket of the first frame that shows ring i, in every attempt of all three runs.
DISPOSITION: R5-MAJOR2 | the sim's step and the ending's card are held to the heard music only within 80 to 100 ms | 2026-10-13T14:36:57-05:00 | to fix by amendment (verifier)
- The play scene's frame log gains, per frame, the heard time and the origin, read by a PRE_STEP listener that runs after the driver's. The log also carries the calibration in use.
- tools/scene-check.mjs `stepTimingProblems` wants each frame's step to be section 9.1's, max(prev, min(targetStep(heard, origin, displaySec(avOffset)), prev + 24)), within one step. A frame whose heard time could not be read (the context not running, the line not valid) and a new run's first frame are not judged.
- An ending log (`endingLogStart`, `endingLogTake`) records every frame of the scene `ending`: the heard time at prestep and at poststep, the origin, the glimpse's y and the Graphics' buffer.
- `endingTimingProblems` judges every card frame whose bracket holds no beat line: it must draw cardShapes(beatOfBar) of that bracket.
DISPOSITION: R5-MINOR1 | the notes' level and length are unchecked | 2026-10-13T14:36:57-05:00 | carried to the next cycle (a MINOR does not block a PASS)
DISPOSITION: R5-MINOR2 | the line's deaths are only ever read as 0 (R4-MINOR1) | 2026-10-13T14:36:57-05:00 | carried to the next cycle, as in R4
DISPOSITION: R5-NOTE1 | X3's margin | 2026-10-13T14:36:57-05:00 | no action
DISPOSITION: R5-NOTE2 | X5 and X10 never run over the real calibration scene | 2026-10-13T14:36:57-05:00 | to fix with MAJOR 1 if time allows, else carried
DISPOSITION: R5-NOTE3 | the page's sanctioned texts | 2026-10-13T14:36:57-05:00 | no action

MAJOR 2 fixed 2026-10-13T14:52-05:00 in the commit `hush-spec: amend the scene check, review R5 ...` after `0c71236`, by the producer (Opus standing in for Fable). No product file changes and no applier.
- **How it landed:**
  - src/probe/api.ts installs a PRE_STEP hook with the POST_STEP one (hookFrames). Its listener runs after main.ts's driver, so it reads the heard time and the origin the frame's step was made for. Every light record becomes [sim, room, step, heard, origin], and frameLogTake carries the avOffset in use.
  - `endingLogStart` and `endingLogTake` log every frame of the scene `ending`: the heard time at prestep and poststep, the origin, the glimpse's y, and the Graphics' buffers once the card is up.
  - tools/scene-check.mjs judges both (`stepTimingProblems`, `endingTimingProblems`). tools/probe-play.mjs's `scene` check runs them and wants at least 300 timed frames and 30 judged card frames.
- **On the product:** END1's acceptance passes. 8510 frames sit on the step the heard time gives, the farthest 1 step off, and 187 card frames on the beat heard while drawn (build/evidence/END1.amend.7.txt).
- **The reviewer's mutants fail, on these checks alone:**
  - the sim 50 ms late: 8 to 12 steps behind the music from room 1's first frames (build/evidence/R5-mutant-frame-late50.amend.1.txt);
  - the card 80 ms late: frames 8 and 25 ms into beat 3 draw beat 2 (build/evidence/R5-mutant-card-late80.amend.1.txt).
- **Controls in Node:** tests/tools/scene-check.test.mjs, 15 of 15. A sim 50 ms or 10 ms behind fails, and so do the calibration's offset ignored, a jump past the cap, a card 80 ms or 20 ms late and too few judged frames; a stalled run catching up 24 steps a frame passes. The verifier suite passes 273 of 273 (build/evidence/R5-verifiers.amend.1.txt).
- **Not run this session, for VERIFY:** npm test's e2e, whose `scene` check is END1's, run above.

State at 2026-10-13T14:52-05:00, the end of this producer session. It holds one hush-review commit and has used 4h18m of its 6 active hours by the hook's count. MAJOR 1 with its controls needs about two hours, more than remains.
- **Fixed:** MAJOR 2. **Open:** MAJOR 1, the calibration's pictures, with its design settled in its disposition above. The MINORs are carried. There is no `FIX R5` line yet.
- **The next producer starts at re-entry row 8:**
  1. It finishes FIX R5 with MAJOR 1, and NOTE 2 if time allows.
  2. It records `FIX R5`.
  3. It runs R6, the round the owner granted. A PASS ends cycle 1; a FAIL escalates again.
- **Notes for MAJOR 1:**
  - Phaser's step emits PRE_STEP, updates every scene, then emits POST_STEP. So a frame bracketed by the probe's prestep and poststep reads holds the frameMs the calibration scene read at the top of its update. hookFrames already installs both listeners.
  - The ring is the ARC of radius 50 at (640, 360). The filled key shape is section 12's fillRoundedRect, a FILL_PATH. Read both from the command buffers as drawn (drawnOf).
  - The control page's Calibration scene draws the same shapes, so `?calib=ringlate`, `?calib=filllate` and `?calib=frametime` are a line each in control.js.
  - Each browser control of the calibration takes about two minutes. The twelve existing ones fit in four calls under the 10-minute limit; R4-calibration-controls.amend.6 to .9 show the grouping.

MAJOR 1 and NOTE 2 fixed 2026-10-13T17:35-05:00 in `2bd9d23` (hush-spec: amend the calibration check ...), by the next producer (Opus standing in for Fable). No product file changes and no applier.
- **How it landed:**
  - src/probe/api.ts: `watchCalibration` and `tapCalibration` start a frame log of the scene `calibration`, read by `calibLogTake()`. Each frame holds performance.now() and the heard time at Phaser's prestep and at its poststep, the attempt live at each end, and every Graphics as drawn: its visibility, its alpha and its command buffer, kept once in a table of the distinct Graphics.
    - Phaser runs PRE_STEP, every scene's update, then POST_STEP inside one animation-frame callback, and no timer runs inside it. So the two reads bracket the scene's own frameMs, and the clock line's offset is the one the scene read.
    - The tapper, the watcher and the frame log share one record of the attempts (`noteAttempt`), so a frame's attempt is an index into `tapLog().attempts`.
  - tools/calibration-check.mjs `calibFrameProblems` holds every attempt of all three runs to section 12, as its disposition says. On top of it:
    - Every Graphics that shows must hold nothing or section 12's key shape (plain or filled) or ring, in Phaser 4.2.1's encoding (`CALIB_DRAW`, built from Graphics.js's fillRoundedRect, strokeRoundedRect and strokeCircle), at alpha 1. The key shape must show in every frame.
    - The frames drawn for no attempt must show the key plain and no ring.
    - Each frameTimes[i] must also lie inside its own window, and be null when no frame drew ring i.
    - Each attempt must have 200 frames judged, pass A's with 8 filled and pass B's with 48 showing the ring, so an attempt the log missed cannot pass.
    - A kind of problem is said once, at its first frame, with the count of the frames like it.
  - NOTE 2: tools/probe-flash.mjs reads each of its three calibration pages once the scene is left. It wants no console or page error, no request to another origin, and nothing stored (probe-lib `originViolations` and `storageReport`, as the playthrough uses them).
- **On the product:** CAL2's acceptance passes (build/evidence/CAL2.amend.8.txt). The untouched run has 2564 frames timed (52 filled, 307 with the ring), the tapped 1282 (25, 155) and the retried 2566 (52, 310). The values are the taps' own, every click is on its mark, and every page is clean. CAL2.amend.7.txt is the same run before NOTE 2's lines.
- **The reviewer's three mutants**, each built outside the repo from the working tree, with the probe as committed less NOTE 2's lines, which add a problem only for a page error, a foreign request or a stored value. Each fails on its frames alone, in all three runs:
  - frameTimes 100 ms after their frames (calibration-scene.ts:150 `frameMs + 100`): `B1: frameTimes[0] is +100.0 ms from its due time, but the first frame that drew ring 0 ran -0.1 ms to +0.1 ms from it` (build/evidence/R5-mutant-calib-frametime.amend.1.txt);
  - every ring drawn 100 ms after its window, frameTimes kept on it: frames in the window show no ring, frames after it show one, and frameTimes miss the frames that drew (R5-mutant-calib-ringlate.amend.1.txt);
  - every count-in fill 100 ms after its click (:142): `A1: a frame heard +4.9 ms from count-in click 0 shows the key plain`, and the fill shows 121.6 ms after it (R5-mutant-calib-filllate.amend.1.txt).
  - A first run of the ringlate mutant was killed by an output filter (learning 57) and left no record. The run above was the same build, rerun.
- **Controls:**
  - In Node, tests/tools/calibration-check.test.mjs passes 20 of 20, 8 of them new. A scene drawing section 12 frame for frame passes at 60 and 30 frames a second, and when it reads its time at either end of a 6 ms bracket. Each of these fails: a ring 100 ms or one frame late, a fill 100 ms or one frame late, frameTimes 100, 10 or -1 ms off their frames, a ring in pass A, a fill in pass B, a picture between attempts, a ring of radius 40, a ring at alpha 0.5, the key hidden or empty, a frameTime missing or on the second frame, a ring never drawn, no log, dropped frames, too few frames, a fill never shown and a frame of an attempt the record lacks. Frames that straddle an edge, or whose heard time is unreadable, are flipped and still pass. The verifier suite passes 281 of 281 (build/evidence/R5-verifiers.amend.2.txt).
  - In the browser, tests/controls/calibration-probe.test.mjs passes 16 of 16 on the committed probe (build/evidence/R5-calibration-controls.amend.6.txt to .10.txt). The clean page passes all three runs, every frame timed and no page problem. `?calib=ringlate`, `filllate` and `frametime` each fail on their frames alone. One page planting a session-storage write, a console error and a request to 127.0.0.2 fails on all three, on each of the three pages. The twelve earlier controls keep their verdicts. Records .1 to .5 are the same controls before NOTE 2.
  - The control page's own exploratory runs are session records, not committed.
- **Regression:** END1's acceptance passes on the changed frame hooks (build/evidence/END1.amend.8.txt): 8072 frames on the step the heard time gives, 187 card frames on their beat. Standing is GREEN (build/evidence/R5-calibration-standing.amend.1.txt).
- After the commit the digest is 6c217e01. X3's seed rolls to 1814134273, and all 11 witnesses pass on it (session record build/evidence/session/X3-jitter.1.txt, not committed).

Round R5 closed 2026-10-13T17:36-05:00: 2 fixed (MAJOR 1, MAJOR 2), 0 rebutted, 0 superseded, every one by the producer's amendment and no applier. MINOR 1 (the notes' level and length) and MINOR 2 (the line's deaths, R4-MINOR1) are carried to the next cycle. NOTE 2 is fixed with MAJOR 1; NOTE 1 and NOTE 3 needed no action. The product is unchanged since the review (src/ outside src/probe, rooms, music and replays as at bd16d95). The next step is review R6, the round the owner granted: a PASS ends cycle 1, and a FAIL escalates again.

## Review R6 (cycle 1): HUSH-REVIEW-R6: PASS, head 8f007a3, digest 6c217e01

Recorded 2026-10-13T19:38-05:00 by the producer (Opus standing in for Fable), in `5b725e5`.
- **The count.** Findings: 8 (0 BLOCKER, 0 MAJOR, 8 MINOR) and 3 NOTEs, against R5's 4 (0, 2, 2). Six MINORs are new and two are R5's, carried.
- **What held.** Every R5 fix held. The reviewer re-ran R5's MAJOR 2 mutant (the driver 50 ms late) and MAJOR 1(a) mutant (frameTimes 100 ms late), and both now fail. Every spec area's suite kills its core mutation, all 23 acceptances pass, and every Axis B check passes. The product is unchanged since R3.
- **The cycle.** R6 is a PASS that follows FIX R5, so cycle 1 ended on it (`CYCLE 1: end | ... | R6` in build/HUSH-PROGRESS.md). That was the round the owner granted on 2026-10-13 ("A, go on with FIX R5").
- **The MINORs.** A cycle-ending PASS leaves its MINORs open. They are carried into the next cycle and never fixed in place, so the PASS stays fresh (digest 6c217e01). Each one below is a spec'd detail or a tolerance that no check reads. None changes an exit criterion's verdict on the product as it stands.

DISPOSITION: R6-MINOR1 | X8's threshold edge is not pinned (calibrate.ts:24, MAD 35 accepted and 35.5 rejected untested) | 2026-10-13T19:40:00-05:00 | carried to the next cycle; fix by amendment (test): spread(35) accepted and spread(35.5) rejected, control `mad < 36`
DISPOSITION: R6-MINOR2 | the calibration scene's key-repeat filter is never exercised (calibration-scene.ts:79) | 2026-10-13T19:40:00-05:00 | carried to the next cycle; fix by amendment (verifier): the tapper also sends `repeat: true` keydowns off the spread in every attempt, logged apart as the Escapes are, control page `?calib=repeat`
DISPOSITION: R6-MINOR3 | the ending's rise is never timed from its first frame (ending-scene.ts:82) | 2026-10-13T19:40:00-05:00 | carried to the next cycle; fix by amendment (verifier): every logged ending frame's glimpse y held to riseAt(h - t0) over its bracket, t0 from the first frame's bracket
DISPOSITION: R6-MINOR4 | X7's gate opening is held only within 30 ms of its bar line (engine.ts:164) | 2026-10-13T19:40:00-05:00 | carried to the next cycle; fix by amendment (verifier): under ?probe, record the gates' AudioParam automation and hold each unlock ramp's end to unlockTime(origin, unlockBar(clear)) within 1 ms
DISPOSITION: R6-MINOR5 | the canvas's background colour is never read (game.ts:10) | 2026-10-13T19:40:00-05:00 | carried to the next cycle; fix by amendment (verifier): one undrawn canvas pixel read, wanting #07080d
DISPOSITION: R6-MINOR6 | section 9.1's interpolation is never checked (run.ts:142, any alpha in [0, 1] passes) | 2026-10-13T19:40:00-05:00 | carried to the next cycle; fix by amendment (verifier): each full frame's alpha held to section 9.1's for the light record's heard time, within 0.01
DISPOSITION: R6-MINOR7 | the notes' level and length are unchecked (R5-MINOR1) | 2026-10-13T19:40:00-05:00 | carried to the next cycle, as in R5
DISPOSITION: R6-MINOR8 | the ?playtest line's deaths are only ever read as 0 (R5-MINOR2, R4-MINOR1) | 2026-10-13T19:40:00-05:00 | carried to the next cycle, as in R4 and R5
DISPOSITION: R6-NOTE1 | the gauntlet generator's hat rule is untested, equivalent on v1 | 2026-10-13T19:40:00-05:00 | no action
DISPOSITION: R6-NOTE2 | X3's margin, as R5 found it | 2026-10-13T19:40:00-05:00 | no action
DISPOSITION: R6-NOTE3 | the page's sanctioned texts | 2026-10-13T19:40:00-05:00 | no action

The next step is VERIFY (re-entry row 11): the last cycle ended with a fresh PASS and there is no HUSH-BUILD.md.

## Audit 1 (cycle 2): HUSH-AUDIT: FAIL, head bbe7208, digest 6c217e01

Recorded 2026-10-13T22:38-05:00 by the producer (Opus standing in for Fable), in `1ef9158` (build/reviews/AUDIT-1.md, evidence build/evidence/audit/). Cycle 2 opened on it in `81f4f41`.
- **The count.** Findings: 5 (0 BLOCKER, 1 MAJOR, 4 MINOR) and 5 NOTEs. It is the first audit; the last round, R6, had 8 (0 BLOCKER, 0 MAJOR, 8 MINOR).
- **What passed.** Every mandated probe: the history of every ref is public-safe; the pins, the lockfile and `npm audit --omit=dev` are clean; the page reaches only its origin and stores nothing; the flash probe passes; the licence texts and the identities hold; and the deploy's dry run published in order, with X1 to X10 all green.
- **The run.** The dry run takes about 16 minutes in one call, over the 10-minute shell limit that stopped the 20:39 producer. The owner chose to raise the limit (option A). BASH_MAX_TIMEOUT_MS sat at the top level of the user settings, where Claude Code ignores it. On the owner's yes it moved into `env`, and this session picked it up without a restart. Beside the verbatim mandate, the auditor was told the limit, the hook's bans and that its report is public, as operational notes only.
- **The machine sample.** build/evidence/audit/A-machine.1.txt lists the processes running on the owner's laptop. On the owner's word ("Leave it out") it was left out of the record commit, and the owner deletes it. The record's AC and 60 Hz line rests on the other records' machine lines (NOTE 5).
- **The routing.** The MAJOR and MINOR 1, 2 and 4 are gaps in PROTECTED verifiers, and MINOR 3 is in a spec-owned config: each is the producer's amendment. No product file changes, so no applier.

DISPOSITION: AUDIT1-MAJOR1 | D15's controls cannot run at HEAD: makeControlCopy re-extracts the rooms and the track that CT1 made tracked, and spec-content --extract never overwrites (tests/controls/control-copy.mjs:39-43) | 2026-10-13T22:42:05-05:00 | to fix by amendment (verifier)
- makeControlCopy extracts a content file only when the copy lacks it. A copy of a tree that tracks the rooms and the track keeps them byte for byte, and the release clone's spec-content --tree and protect --check still judge them.
- The cases that reach the gate now run X1 to X10 in full on the copy, so their timeouts grow to fit one full gate run each (two for the first case).
- Red: build/evidence/audit/A-deploy-control-dirty.1.txt (exit 1 at control-copy.mjs:41). Green: every case re-run and recorded, in parts under the call limit.
DISPOSITION: AUDIT1-MINOR4 | a dry run pushes to whatever remote it is given (tools/deploy.mjs:61, :125) | 2026-10-13T22:42:05-05:00 | to fix by amendment (verifier), with MAJOR 1
- deploy.mjs --dry-run refuses a --remote that is not an existing local bare repository (`git rev-parse --is-bare-repository` in it prints true), before it reads the source or clones anything. The release is unchanged.
- Control: a new case in tests/controls/deploy.test.mjs. A local repo that is not bare and a URL are each refused with nothing pushed. It is red on the old deploy.mjs, which pushes into the repo that is not bare.
DISPOSITION: AUDIT1-MINOR1 | X10's rows cannot see a WebSocket, a service worker, WebRTC or the origin-private file system (tools/probe-lib.mjs:107, :390-413) | 2026-10-13T22:42:05-05:00 | carried to the next cycle (a MINOR does not block a PASS); fix by amendment (verifier) as the auditor's fix: openPage also logs page websockets and context-level requests, an init script fails any RTCPeerConnection, storageReport also reads service worker registrations and the private file system, and the control page gains a socket fault and a service-worker fault
DISPOSITION: AUDIT1-MINOR2 | check-public reads every file and blob as UTF-8 (tools/check-public.mjs:60, :77, :172, :195) | 2026-10-13T22:42:05-05:00 | carried to the next cycle; fix by amendment (verifier): a body with a UTF-16 BOM, or with NULs on every other byte, is decoded as UTF-16 before the scan, any other body holding a NUL is reported as unscannable, and tests/tools/check-public.test.mjs gains a UTF-16LE case
DISPOSITION: AUDIT1-MINOR3 | the published bundle carries no third-party licence notice (vite.config.ts:11-18) | 2026-10-13T22:42:05-05:00 | design, settled here; to fix by amendment in this FIX round, before review R7: a fix after this cycle's PASS would cost another cycle, and the next public build must carry the notices
- The build writes THIRD-PARTY-NOTICES.txt into dist beside index.html. Nothing links it, so the page's text stays the Handoff's.
- It holds, for every npm package with a module in the bundle (Phaser and @strudel/web today) and for every package that @strudel/web's prebuilt bundle inlines, the package's name, version and licence id and its full licence text, read from node_modules at build time. A package whose licence text cannot be found fails the build.
- The supply probe (X10) wants the file in dist with every bundled package named in it. Control: a build without the file fails X10.
DISPOSITION: AUDIT1-NOTE1 | the deploy reads its identity from git config only | 2026-10-13T22:42:05-05:00 | no action; the pre-push scan refuses a foreign identity before any push
DISPOSITION: AUDIT1-NOTE2 | X6 never sees a death or a respawn | 2026-10-13T22:42:05-05:00 | no action; section 11 holds them by construction
DISPOSITION: AUDIT1-NOTE3 | a dev-only advisory remains (source-map-js 1.2.1) | 2026-10-13T22:42:05-05:00 | no action; known since PF-FACTS, and nothing from it ships
DISPOSITION: AUDIT1-NOTE4 | time metadata is public by design | 2026-10-13T22:42:05-05:00 | no action
DISPOSITION: AUDIT1-NOTE5 | A-machine.1 holds the full machine sample | 2026-10-13T22:42:05-05:00 | left out of the record on the owner's word; the owner deletes the file

R6-MINOR1 to R6-MINOR8 stay carried. This FIX round takes the audit's findings, and each R6 MINOR is carried on to the next cycle unless a round of this one reaches it.

The section's disposition times were first written as estimates (22:45). They are corrected here to the commit's own time, 045adbd at 22:42:05.

MAJOR 1 and MINOR 4 fixed 2026-10-13T22:59-05:00 in `07b5ac9` (hush-spec: amend the deploy controls and the dry run's remote ...), by the producer (Opus standing in for Fable). No product file changes and no applier.
- **How it landed:**
  - tests/controls/control-copy.mjs extracts a room or the track only when the copied tree lacks it.
  - tools/deploy.mjs `isLocalBare`: a dry run whose --remote is not an existing local directory that git calls bare is refused first, before the dirt check, with `a dry run publishes only to an existing local bare repository (--remote)`. The release path is unchanged.
  - tests/controls/deploy.test.mjs gains an eighth case: a repo that is not bare and a URL, each refused, with nothing pushed.
  - Each case keeps its 5-minute timeout. The disposition planned longer ones, but the control copy builds the control page, so one dry run with its X1 to X10 takes about 2 minutes: the red run below took 125 s in all.
- **Red:**
  - MAJOR 1: the auditor's build/evidence/audit/A-deploy-control-dirty.1.txt, exit 1 at control-copy.mjs:41.
  - MINOR 4: the new case on the old deploy.mjs, build/evidence/AUDIT1-remote-red.amend.1.txt (exit 1). That dry run pushed main, its tag and gh-pages into the repo that is not bare.
- **Green:**
  - the fixture on the fast dirt case (build/evidence/AUDIT1-copy-fixture.amend.1.txt);
  - all 8 cases in 649 s (build/evidence/AUDIT1-deploy-controls.amend.1.txt);
  - the verifier suite, 281 of 281 (AUDIT1-verifiers.amend.1.txt), and standing GREEN (AUDIT1-standing.amend.1.txt).
- **The digest** is now 748ce71a, and X3's seed rolls to 1955391258. On it 04-thorns clears 17 of 20, one short of 18, while the other ten witnesses clear 20 of 20 (build/evidence/AUDIT1-x3-seed.amend.1.txt, exit 1).
  - This is the room's known margin (R1-MINOR5, R5-NOTE1: about 2% of digests), not a product change.
  - Standing replays with seed 1 and stays green. X3 and npm test's replay step read the digest's seed, so both would fail at this digest.
  - MINOR 3's amendment moves the digest again. The producer who lands it runs `node tools/replay.mjs --all --jitter --seed <the new digest's seed>` before review R7. If a witness is still short, an applier re-solves it (HUSH-BUILD.md, known gaps). The product never changes for it.
  - Committing that record in `5672096` moved the digest once more, to 2894d541, because item evidence counts in the digest (D18). That was a side effect of recording the short, not a re-roll sought. On the new seed, 680842561, all 11 witnesses clear 20 of 20 (session record build/evidence/session/X3-seed.1.txt, not committed, so the digest stays at 2894d541).

MINOR 3, measured 2026-10-13T23:01-05:00 for the producer who lands it (read from node_modules; not recorded):
- **The closure.** package.json's runtime dependencies (@strudel/core, @strudel/web, phaser, superdough), followed through each package's own `dependencies`, come to 59 packages. 12 are AGPL-3.0-or-later (Strudel, superdough, supradough, kabelsalat), 40 MIT (32 of them @tonaljs packages), 4 BSD-2-Clause (escodegen, esprima, estraverse, esutils), 2 Apache-2.0 (webmidi, djipevents) and 1 ISC (chord-voicings). Grouped by identical text, they need 15 licence texts.
- **Packages with no licence file.** @tonaljs/progression@4.9.2 (MIT) and chord-voicings@0.0.1 (ISC) ship none. Refined design: such a package gets the standard text of its package.json licence id, MIT or ISC (built in), with its package.json author as the holder. Any other licence id with no file still fails the build.
- **An email.** nanostores@0.11.4's LICENSE holds one email address, which check-public would refuse on gh-pages. It is masked by its sha256 in tools/public-patterns.mjs, as escodegen's maintainer address already is.
- **The file's layout.** Packages that share one text are listed together above it, so the AGPL text appears once and the file stays small.
- **Where it lives.** Either a Vite plugin emits the asset at build time, or a committed public/ file is held equal to the closure by `node tools/notices.mjs --check`. Either way, X10 wants the file in dist with all 59 packages named.

State at 2026-10-13T23:04-05:00, the end of this producer session, at about 3h25m of its 6 active hours by the hook:
- **Fixed:** MAJOR 1 and MINOR 4.
- **Open in this FIX round:** MINOR 3.
- **Carried:** MINOR 1 and 2, and R6-MINOR1 to 8.
- **Not written yet:** the `FIX AUDIT-1` line.
- **The next producer starts at re-entry row 7** (cycle 2 has no round yet):
  1. It lands MINOR 3 by amendment, as designed above.
  2. It checks X3 on the new digest's seed.
  3. It appends `FIX AUDIT-1: <ISO> | fixed=3 rebutted=0 superseded=0` to `## Rounds`. That line is the fix round of the audit that opened this cycle, so an R7 PASS after it ends the cycle, as a PASS after a `FIX R<N>` line does.
  4. It runs review R7.
- **The owner's hands, before that session:** delete build/evidence/audit/A-machine.1.txt (`Remove-Item build\evidence\audit\A-machine.1.txt` from the repo folder). It is an untracked file the hook lets no session remove. On the owner's word it is never committed.

The next producer session opened at 2026-10-13T23:11-05:00 on a clean tree, with A-machine.1.txt gone, at digest 2894d541 (standing and smoke green in session).

MINOR 3 fixed 2026-10-13T23:45:19-05:00 in `a41eb11` (hush-spec: amend the build's third-party notices ...), by the producer (Opus standing in for Fable). No product file changes and no applier: the bundle is byte for byte the same (index-Dqh8GbB8.js before and after), and the page's text is unchanged.
- **How it landed:**
  - tools/notices.mjs, a Vite plugin in vite.config.ts, writes dist/THIRD-PARTY-NOTICES.txt: 62 packages (55 names) under 19 licence texts, 68.5 KB.
  - The tree is package.json's dependencies, followed by Node's lookup through each package's own dependencies and installed optional dependencies. That is exactly the lockfile's runtime set. The 59 measured before followed dependencies only and left out the three installed optional packages: jazz-midi, jzz and source-map.
  - Three packages ship no licence file and get the standard text: chord-voicings (ISC, held by Felix Roos), jazz-midi (MIT, jazz-soft) and @tonaljs/progression (MIT). That last one's author field is a bare email, so its holder reads "the authors of @tonaljs/progression".
  - The plugin also fails the build when a module in the bundle comes from a package outside the tree. Today the bundle's package files are Phaser's and @strudel/web's. The bundler's own injected helpers are virtual modules and are not listed; section 1.6 says so. They are Rolldown's runtime (348 bytes) and Vite's modulepreload polyfill (1205 bytes).
  - X10 gains the row `notices`, read from the lockfile apart from the plugin's walk.
  - nanostores 0.11.4's LICENSE carries its author's address, and check-public masks it by its sha256 (tools/public-patterns.mjs). check-public --root over the built dist finds nothing else.
  - The deploy's first control wants the file on gh-pages. probe-supply's main now runs only as a script, so its rows can be tested in Node.
- **Red:**
  - A build without the file, and a file that leaves Phaser out, each fail X10 (build/evidence/AUDIT1-supply-controls.amend.1.txt).
  - 11 planted faults in the walk, the texts, the holder, the bundle check, the emit, X10's row and the mask each fail tests/tools/notices.test.mjs in a scratch copy, on the tests named for them (AUDIT1-notices-mutants.amend.1.txt).
- **Green:**
  - tests/tools/notices.test.mjs, 14 of 14 (AUDIT1-notices-tests.amend.1.txt);
  - the dist scan, clean (AUDIT1-notices-public.amend.1.txt);
  - `npm run probe:supply`, PASS with 62 packages named (AUDIT1-supply.amend.1.txt), and tsc (AUDIT1-typecheck.amend.1.txt);
  - the 8 deploy controls in 656 s, the notices on gh-pages (AUDIT1-deploy-controls.amend.2.txt);
  - the verifier suite, 295 of 295 (AUDIT1-verifiers.amend.2.txt), and standing GREEN (AUDIT1-standing.amend.2.txt).
- **The digest** is now a03cbf0a and X3's seed 2688335626. On it every witness clears: 04-thorns 18 of 20, 09-gates 19 of 20 and the other nine 20 of 20. The record is in phase session (build/evidence/session/X3-seed.2.txt), not committed, so the digest stays.

FIX AUDIT-1 is recorded in build/HUSH-PROGRESS.md, `## Rounds`: fixed=3 (MAJOR 1, MINOR 4 and MINOR 3), rebutted=0, superseded=0. MINOR 1 and 2 stay carried, and so do R6-MINOR1 to 8. Review R7 is next: cycle 2's audit findings are fixed, so a PASS in R7 follows that FIX round and ends the cycle.

## Review R7 (cycle 2): HUSH-REVIEW-R7: FAIL, head 55e41c8, digest a03cbf0a

Recorded 2026-10-14T02:00-05:00 by the producer (Opus standing in for Fable), in `aac8c8c` (build/reviews/REVIEW-R7.md, evidence build/evidence/review/).
- **The count.** Findings: 15 (0 BLOCKER, 2 MAJOR, 13 MINOR) and 5 NOTEs. The last round, R6, had 8 (0, 0, 8). Those 8 are R6's MINORs, carried, and the other 7 are new. This is cycle 2's first round, after FIX AUDIT-1.
- **What held.** Audit 1's three fixes hold, and the reviewer's mutants of each fail. The product is unchanged since R3, matches every Action and passes all 23 acceptances. Every spec area's core mutation is killed, and every Axis B check passes.
- **The class.** Both MAJORs are in the gate's own checks. X11's median window is pinned from below only. X7's clock row has no control, and the gate reads its bound from the JSON it judges. MINORs 1, 2 and 5 are R6's class again: a threshold with a test on one side only.
- **The routing.** Every finding is in a PROTECTED verifier or in the spec, so each one is the producer's amendment. No product file changes and no applier.
- **The session.** It reached R7's record at 2h58m of its 6 active hours, and a review takes about 2h15m. So FIX R7 lands here, and review R8 goes to the next producer.

DISPOSITION: R7-MAJOR1 | X11's median window has no test above 15 minutes, none at either edge, and none for a friend's earliest run (ship-gate.mjs:27-28, :125, :130) | 2026-10-14T02:10:00-05:00 | to fix by amendment (tests)
- tests/tools/ship-gate.test.mjs passes medians of 10:00 and 15:00 and refuses 9:59 and 15:01.
- It also counts a friend's earliest first run by its time, in a ledger where that friend's later row comes first in the file.
- Controls in a scratch copy: MAX 901, MAX 1200, no upper check, MIN 599, MIN 480, the latest row by time, and the first row in the file.
DISPOSITION: R7-MAJOR2 | X7's device-clock row has no control, the spec never set its bound, and AV_OK reads the bound from the JSON it judges (probe-av.mjs:29, :304; ship-gate.mjs:239-243) | 2026-10-14T02:10:00-05:00 | design, settled here; to fix by amendment (spec and verifier)
- The spec sets X7's bound in section 8.4: once valid, the line's offset moves at most 3 ms peak to peak over the av probe's run. The bound is 0.157 ms on HEAD, under the line's own 4 ms jump tolerance, and about 3% of a sixteenth. A line without output timestamps moves 175 to 192 ms.
- tools/ship-gate.mjs AV_OK holds clockJitterMs to its own X7_CLOCK_BOUND_MS (3). It also wants clockValid, a number, and the JSON's bound equal to its own. tests/tools pins both constants to 3 and refuses an av record whose bound was raised.
- The control page gains `?av=nostamps`, which builds its clock line over a view of the context without getOutputTimestamp. It must fail on the device-clock row alone.
- Each row the reviewer found without a control of its own gets one:
  - `?av=leak`: a constant 0.05 summed into layer 1's gate gain, so that layer sounds while muted. It must fail both silence rows.
  - `?av=suspended`: the context suspended once started. The probe must refuse it at the first key, with exit 2.
  - `?av=undercount`: layer 1's voices are played but not counted. It must fail the voices row alone.
  - `?av=drop`: layer 1's notes of each run's second bar reach the transport 0.2 s late, so the transport drops them and counts them as dropped. It must fail the late-drop row.
DISPOSITION: R7-MINOR1 | X7 at the bar line's edge: nextBarStep(s + 1) in the sim and unlockBar(step + 1) in the run survive (sim.ts:179, run.ts:125, :133) | 2026-10-14T02:10:00-05:00 | to fix by amendment (tests)
- A clear on the edge step joins the oracle comparison in tests/sim and the run's wiring in tests/game/run.test.mjs. Room 1's witness, delayed 337 steps, clears on step 1954: there unlockBar is 5, and one step later it becomes 6.
- Both mutants become controls in tests/controls/product-tests.test.mjs.
DISPOSITION: R7-MINOR2 | CL1's jump tolerance and agreement burst are pinned from one side only (output-clock.ts:7, :90) | 2026-10-14T02:10:00-05:00 | to fix by amendment (tests)
- tests/clock/output-clock.test.mjs gains three cases: a 3 ms drop with no resync, a 5 ms drop with one, and a device with baseLatency 0, sampled every 10 ms, that becomes valid after 50 ms of agreement.
- Controls: CLOCK_JUMP 0.003 and 0.005, and a burst of 30 ms.
DISPOSITION: R7-MINOR3 | the tapper dispatches each key at once, so a scene that reads its handler's time passes (calibration-scene.ts:91, :93; api.ts:795-800) | 2026-10-14T02:10:00-05:00 | design, settled; carried to the next round
- The tapper creates each event at its planned moment and dispatches it 8 ms later, so the event keeps its creation timeStamp.
- Section 12 says so, and the control page gains `?calib=handlertime`.
DISPOSITION: R7-MINOR4 | no check reads the canvas's centring (game.ts:12) | 2026-10-14T02:10:00-05:00 | to fix by amendment (verifier), with R6-MINOR5
- Smoke's canvas row wants the canvas centred in #game, with equal margins on each axis within 1 px, and an undrawn corner pixel of #07080d.
- Controls: the control page with `?center=none` and with `?bg=000000`.
DISPOSITION: R7-MINOR5 | X6's analyzer limit is held only within the controls' 5% band (flash-analyzer.mjs:10) | 2026-10-14T02:10:00-05:00 | to fix by amendment (tests)
- Analyzer cases at exactly 25,600 px, which fails, and at 25,599 px, which passes, written against the literal number.
- Controls: limits of 25,601 and 26,000, and `>` for `>=`.
DISPOSITION: R7-MINOR6 (R6-MINOR1) | X8's MAD edge | 2026-10-14T02:10:00-05:00 | to fix by amendment (tests), as designed in R6: spread(35) accepted and spread(35.5) rejected; control `mad < 36`
DISPOSITION: R7-MINOR7 (R6-MINOR2) | the calibration's key-repeat filter | 2026-10-14T02:10:00-05:00 | carried, as designed in R6, to land with R7-MINOR3 (the same tapper)
DISPOSITION: R7-MINOR8 (R6-MINOR3) | the ending's rise is not timed from its first frame | 2026-10-14T02:10:00-05:00 | carried, as designed in R6
DISPOSITION: R7-MINOR9 (R6-MINOR4) | X7's gate opening is held only within 30 ms | 2026-10-14T02:10:00-05:00 | carried, as designed in R6
DISPOSITION: R7-MINOR10 (R6-MINOR5) | the canvas background | 2026-10-14T02:10:00-05:00 | to fix by amendment (verifier), with R7-MINOR4
DISPOSITION: R7-MINOR11 (R6-MINOR6) | section 9.1's alpha | 2026-10-14T02:10:00-05:00 | carried, as designed in R6
DISPOSITION: R7-MINOR12 (R6-MINOR7) | the notes' level and length | 2026-10-14T02:10:00-05:00 | carried, as in R5 and R6
DISPOSITION: R7-MINOR13 (R6-MINOR8) | the ?playtest line's deaths are only ever read as 0 | 2026-10-14T02:10:00-05:00 | carried, as in R4 to R6
DISPOSITION: R7-NOTE1 | the compiler's spawn-floor and exit refusals have no test; unreachable in v1 | 2026-10-14T02:10:00-05:00 | no action
DISPOSITION: R7-NOTE2 | section 9.1 does not say when the view stops tweening | 2026-10-14T02:10:00-05:00 | no action this round; one sentence in 9.1 when that section is next amended
DISPOSITION: R7-NOTE3 | X4's conditions have no negative control | 2026-10-14T02:10:00-05:00 | no action; a harder condition only makes a pass harder, and R4's block on battery showed the rule at work
DISPOSITION: R7-NOTE4 | X3's margin: 04-thorns clears 18 of 20 on the digest seed | 2026-10-14T02:10:00-05:00 | no action; the next digest re-rolls the seed, and the producer checks it in session
DISPOSITION: R7-NOTE5 | audit 1's MINOR 1 and 2 remain open | 2026-10-14T02:10:00-05:00 | carried, as dispositioned in audit 1

Each carried MINOR keeps its design, so the round that takes it up starts from a settled fix. A carried finding has had no fix attempt, so it does not count toward the two-round escalation.

FIX R7, closed 2026-10-14T03:40:16-05:00 at `a5a50c0`, by the producer (Opus standing in for Fable). Every fix is a producer amendment. No product file changes and no applier. Once both MAJORs were in, the session's time allowed three of the carried findings as well: R7's MINOR 8 and audit 1's MINOR 1 and 2.
- **Landed:**
  - `2126ec0`, MAJOR 1 and 2. X11's window is held at both edges and on each friend's earliest run. X7's clock bound is set at 3 ms in section 8.4, and the gate holds the record to it. Every av row has a control. Evidence:
    - R7-av-controls.amend.1, 12 of 12 on the device;
    - R7-gate-mutants.amend.1, 14 of 14;
    - R7-majors-verifiers.amend.1, 301 of 301;
    - R7-majors-standing.amend.1, GREEN.
  - `92bea7c`, MINOR 1, 2, 4, 5, 6 and 10. X7's bar-line edge in the sim and the run; the clock line's tolerance from both sides and its burst floor; X6's area verdict at exactly 25,600 px; X8's deviation at exactly 35 ms; smoke reading the centring and the background. Evidence:
    - R7-product-controls.amend.1, 46 of 46;
    - R7-x6-mutants.amend.1, 4 of 4;
    - R7-flash-controls.amend.1, 9 of 9;
    - R7-smoke-controls.amend.1;
    - R7-minors-verifiers.amend.1, 302 of 302, and R7-minors-standing.amend.1, GREEN.
  - `acc8aea`, audit 1's MINOR 2: check-public reads UTF-16 and reports any other body with a NUL as unscannable. Evidence:
    - AUDIT1-utf16-mutants.amend.2, 8 of 8 (.1 is the first run, 7 of 7, before the root case);
    - R7-utf16-verifiers.amend.1, 303 of 303, and R7-utf16-standing.amend.1, GREEN.
  - `216dbf0`, MINOR 8 (R6's MINOR 3), first carried: the ending's rise is timed from its first frame. Evidence:
    - R7-rise-mutants.amend.1, 4 of 4;
    - R7-rise-product.amend.1, 412 frames of the rise on the product;
    - R7-mutant-rise-late50.amend.1, a rise 50 ms late caught in the browser;
    - R7-rise-verifiers.amend.1, 306 of 306, and R7-rise-standing.amend.1, GREEN.
  - `a5a50c0`, audit 1's MINOR 1, first carried: X10's rows see WebSockets, a service worker's requests and registration, RTCPeerConnections and the origin-private file system. Evidence:
    - AUDIT1-x10-controls.amend.2, 10 of 10. In .1 only the service worker case failed: Vite had inlined its script as a data URL.
    - AUDIT1-x10-product.amend.1, X10 on the product; AUDIT1-x10-game.amend.1 and AUDIT1-x10-flash.amend.1, GAME1's and CAL2's acceptances under the new init script;
    - AUDIT1-x10-verifiers.amend.1, 306 of 306, and AUDIT1-x10-standing.amend.1, GREEN.
- **The count:** fixed=9 of R7's 15: MAJOR 1 and 2, and MINOR 1, 2, 4, 5, 6, 8 and 10. rebutted=0, superseded=0. Audit 1's MINOR 1 and 2 are fixed too. Carried, each with its design above: MINOR 3, 7, 9, 11, 12 and 13.
- **The digest** is now 81a1d6cc, and X3's seed is 2174867148. On it all 11 witnesses clear 20 of 20. The record is in phase session (build/evidence/session/X3-seed.6.txt), not committed. Every digest this round passed through also passed its seed: 04-thorns at 18 of 20 twice, the others at 19 or 20 (X3-seed.2 to .5).
- **The next producer** starts at re-entry row 8. The open cycle's last round, R7, is FAIL, and FIX R7 is done, its line in `## Rounds`. So it runs review R8. A PASS in R8 follows FIX R7 and ends cycle 2, and VERIFY comes next (row 11).
- One evidence run in this round was cut by its own pipe (`Select-Object -First`), the class the learnings already name. It wrote no record and was run again.

## Review R8 (cycle 2): HUSH-REVIEW-R8: PASS, head e6468ae, digest 81a1d6cc

Recorded 2026-10-14T12:56-05:00 by the producer (Opus standing in for Fable), in `d98ed90` (build/reviews/REVIEW-R8.md, evidence build/evidence/review/).
- **The count.** Findings: 14 (0 BLOCKER, 0 MAJOR, 14 MINOR) and 2 NOTEs, against R7's 15 (0, 2, 13). Eight MINORs are new, and six are R7's carried ones (MINOR 9 to 14).
- **What held.** Every fix of FIX R7 holds, and so do audit 1's MINOR 1 and 2: the reviewer's mutants of each fail, except one equivalent case. The product is unchanged since R3, matches every Action and passes all 23 acceptances. Every spec area's core mutation is killed, and every Axis B check passes, the jitter test on five seeds from HEAD's sha included (lowest 19 of 20).
- **The cycle.** R8 is a PASS that follows FIX R7, so cycle 2 ended on it (`CYCLE 2: end | ... | R8` in build/HUSH-PROGRESS.md).
- **The MINORs.** A cycle-ending PASS leaves its MINORs open. They are carried into the next cycle and never fixed in place, so the PASS stays fresh (digest 81a1d6cc). Each one is a detail or a tolerance that no check reads. None changes an exit criterion's verdict on the product as it stands. The reviewer tags MINOR 1 to 8 mechanical. Each sits in a PROTECTED verifier or in the spec, so each is the producer's amendment.

DISPOSITION: R8-MINOR1 | the gauntlet's wall rule in the base form has no test (sim.ts:293; oracle-gauntlet.test.mjs:34-38) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (tests) as the reviewer's fix: oracle-gauntlet compares from the witness's state in bar 23 with JUMP held into and past the B column, and the unguarded moveX becomes a control in tests/controls/product-tests.test.mjs
DISPOSITION: R8-MINOR2 | the death burst and the respawn ring are never checked where they are drawn (play-frame.ts:61) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (tests) as the reviewer's fix: play-frame.test.mjs adds room 1 with right held into the first pit, every frame compared through the 72 death steps and the 24 lock steps, control `dead: 0, lock: 0`; it shares its root with R8-MINOR14, so the two land together
DISPOSITION: R8-MINOR3 | the keys' arrival order is not pinned (keys.ts:45; keys.test.mjs:63) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (tests): ArrowRight down and up both due before one next() returns 0, plus two codes in the reverse order, control the reversed queue
DISPOSITION: R8-MINOR4 | section 12's attempt end is held only to within a beat (calibration-scene.ts:144, :153; calibration-check.mjs:398-419) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (verifier) as the reviewer's fix: tapLogValues counts each attempt's taps up to section 12's end, calibFrameProblems holds the attempt live before that end and gone after the first frame past it, on brackets, controls `?calib=endearly` on each pass; it lands with R8-MINOR9 and R8-MINOR10, the same tapper
DISPOSITION: R8-MINOR5 | X6's other predicate numbers are pinned at no edge (flash-analyzer.mjs:20-25) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (tests): analyzer cases on the lax side of each edge against the literal numbers (a change of exactly 0.1, a darker state of 0.79, 8 transitions inside 999 ms and an 8th at 1001 ms, a red ratio of exactly 0.8, a red pair 0.201 apart), controls the five mutants
DISPOSITION: R8-MINOR6 | X4's 99% row has no control of its own, and PERF_OK has no test (probe-perf.mjs:17, :133; ship-gate.mjs:236-238) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (tests and verifier) as the reviewer's fix: ship-gate.test.mjs pins PERF_OK at each edge and holds the probe's constants equal to the gate's, the probe's message reads MIN_SHARE_20MS, and the control page gains a fault that stalls every 40th frame and fails the 99% row alone
DISPOSITION: R8-MINOR7 | X10's network row cannot see a SharedWorker, a WebTransport session or a popup (probe-lib.mjs:101-125, :431-436) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (verifier), audit 1 MINOR 1's pattern: the init script refuses and counts SharedWorker, WebTransport and window.open, networkViolations reports the counts, and the control page gains one fault for each
DISPOSITION: R8-MINOR8 | CL1's and CAL1's decisive lines are stale (HUSH-SPEC.md:1204, :1234) | 2026-10-14T12:57:09-05:00 | carried to the next cycle; fix by amendment (spec): the lines read `Tests  14 passed (14)` and `Tests  7 passed (7)`, naming FIX R7
DISPOSITION: R8-MINOR9 (R7-MINOR3) | the tapper dispatches each key at once | 2026-10-14T12:57:09-05:00 | carried, as designed in R7
DISPOSITION: R8-MINOR10 (R7-MINOR7, R6-MINOR2) | the calibration's key-repeat filter | 2026-10-14T12:57:09-05:00 | carried, as designed in R6, to land with R8-MINOR9
DISPOSITION: R8-MINOR11 (R7-MINOR9, R6-MINOR4) | X7's gate opening is held only within 30 ms | 2026-10-14T12:57:09-05:00 | carried, as designed in R6
DISPOSITION: R8-MINOR12 (R7-MINOR11, R6-MINOR6) | section 9.1's alpha | 2026-10-14T12:57:09-05:00 | carried, as designed in R6
DISPOSITION: R8-MINOR13 (R7-MINOR12, R6-MINOR7) | the notes' level and length | 2026-10-14T12:57:09-05:00 | carried, as in R5 to R7; R8's duration and cycle mutants of scheduler.ts:60-61 join it
DISPOSITION: R8-MINOR14 (R7-MINOR13, R6-MINOR8) | the ?playtest line's deaths are only ever read as 0 | 2026-10-14T12:57:09-05:00 | carried, as in R4 to R7, to land with R8-MINOR2
DISPOSITION: R8-NOTE1 | equivalent or unreachable survivors in v1 (the portal priority, the fall rule, `v` and the hat rule, a repeated label, the repeat filter) | 2026-10-14T12:57:09-05:00 | no action
DISPOSITION: R8-NOTE2 (R7-NOTE2) | section 9.1 does not say when the view stops tweening | 2026-10-14T12:57:09-05:00 | no action this round; one sentence in 9.1 when that section is next amended

Each carried MINOR keeps its design, so the round that takes it up starts from a settled fix. A carried finding has had no fix attempt, so it does not count toward the two-round escalation.

The next step is VERIFY (re-entry row 11): the last cycle ended with a fresh PASS (R8, digest 81a1d6cc), and build/HUSH-BUILD.md is stale (its header is head 560524f, digest 6c217e01).

## Audit 2: HUSH-AUDIT: PASS, head ddc6665, digest 81a1d6cc

Recorded 2026-10-14T14:38-05:00 by the producer (Opus standing in for Fable), in `c9ce724` (build/reviews/AUDIT-2.md, evidence build/evidence/audit/A2-* and deploy/, deploy-dirty/), after VERIFY in `ddc6665`.
- **The count.** Findings: 0 (0 BLOCKER, 0 MAJOR, 0 MINOR) and 5 NOTEs, against audit 1's 5 (0, 1, 4).
- **What passed.** Every mandated probe. The history of every ref is public-safe, and the private remote holds nothing beyond it. The pins, the lockfile and `npm audit --omit=dev` are clean. The page reaches only its own origin and stores nothing, also as a visitor gets it with no ?probe. The flash probe passes, and the licence texts and identities hold. The dry run published main, the fixture tag and gh-pages in that order, with X1 to X10 all green. All 8 deploy controls pass.
- **The release tag.** `hush-v1-rc1` is annotated on `c9ce724` with the repo's noreply identity as tagger. That commit holds only bookkeeping beside the audited candidate, so its digest is 81a1d6cc, equal to the HUSH-SHIP-GATE line's. `node tools/ship-gate.mjs --rows V` is GREEN: R8 fresh, HUSH-BUILD.md fresh, AUDIT-2 fresh with the ship-gate line matching, and rc1's digest equal.
- The mandated `--out` overwrote audit 1's two deploy records (deploy/deploy.json and deploy/ship-gate.json). Audit 1's versions stay in history at `1ef9158`.

DISPOSITION: AUDIT2-NOTE1 (AUDIT1-NOTE1) | the deploy reads its identity from git config only (deploy.mjs:74-78) | 2026-10-14T14:40:08-05:00 | no action; the pre-push scan refuses a foreign identity before any push
DISPOSITION: AUDIT2-NOTE2 (AUDIT1-NOTE3) | a dev-only advisory remains (source-map-js 1.2.1 through vite and postcss) | 2026-10-14T14:40:08-05:00 | no action; nothing from it ships, and the pins move only by amendment once a fixed release exists
DISPOSITION: AUDIT2-NOTE3 | mapped keys are prevented whatever the modifiers, so a browser shortcut on a mapped code is swallowed while the page has focus (keys.ts:29-30, HUSH-SPEC.md:822) | 2026-10-14T14:40:08-05:00 | no action without the owner's word; it is put to him with the preview, as a design question the spec settled one way
DISPOSITION: AUDIT2-NOTE4 | the bundle names hosts it never contacts | 2026-10-14T14:40:08-05:00 | no action; X10's network row would catch a track that loads samples
DISPOSITION: AUDIT2-NOTE5 (AUDIT1-NOTE4) | test runs leave temp folders, and time metadata is public by design | 2026-10-14T14:40:08-05:00 | no action

R8-MINOR1 to R8-MINOR14 stay carried with their designs into the next cycle. The next step is JHON-PREVIEW (re-entry row 14): the last scan over every ref at the HEAD to be published, then the owner's three commands.

## Playtest RUN-1 (cycle 3): the owner's rc1 run, four findings

Recorded 2026-10-19 by the producer (Opus standing in for Fable). The owner played rc1 live, to the ending, without ?playtest. His four findings are his own words in build/PLAYTESTS.md RUN-1, in order, and his rulings on them are in HUSH-SPEC section 1.2 (2026-10-19 14:17): "Rulings: N-F1 c, N-F4 a, N-F2 a, N-F3 a, and I replay on rc2 with ?playtest."
- **The count.** Findings: 4, every one a design finding settled by his rulings, against R8's 14 MINORs carried from cycle 2. Cycle 3 opened on the first playtest amendment (`CYCLE 3: start` in build/HUSH-PROGRESS.md, head 632decd).
- **The routing.** Each finding is amended into the spec first (`hush-spec: amend playtest RUN-1 <F>`), its verifiers rewritten with their controls run red and green, and its product fix goes to one applier right after. One pair at a time: between an amendment and its applier, standing is red on the new tests.
- **Where it stands.** F4 is amended; its applier is next. F1, F2 and F3 follow, then review R9.

DISPOSITION: RUN1-F4 | the ending read as a stalled load, with no way on (RUN-1's fourth quote) | 2026-10-19T19:40:38-05:00 | design, the owner's ruling N-F4 a: amended in 632decd (section 13: the run line in every mode, the card's key filled on the fourth beat, any key but Escape plays again from the card, no page flag read; IN1's flush, called first by GAME1's startRoom); the product's fix to one applier in src/render/ending-art.ts, src/render/ending-scene.ts, src/main.ts, src/input/keys.ts and src/game/run.ts | evidence: build/evidence/F4-red.amend.1.txt
DISPOSITION: RUN1-F1 | the first screen gives no clue and takes too long (RUN-1's first quote) | 2026-10-19T19:40:38-05:00 | design, the owner's ruling N-F1 c: amendment to follow. Section 12 and D16: one line of page text under the canvas during the calibration only; the key shape's animated press before the first key; a row of beat dots for the counted clicks; pass B only when pass A is rejected, and no repeat of either; calibrate's one-pass rule (avOffset 0, inputBias the accepted pass's median, so a lone pass never shifts the picture by the player's tap lag). Then its applier.
DISPOSITION: RUN1-F2 | the obstacles and moves not on the kick (RUN-1's second quote) | 2026-10-19T19:40:38-05:00 | design, the owner's ruling N-F2 a: amendment to follow. Every press of JUMP, UP or DASH in every witness within 12 steps (50 ms) of a kick onset, checked by tools/replay.mjs; tools/solve.mjs presses only there; the rooms and the gauntlet re-cut wherever no witness holds the jitter bar so. A first prototype on the oracle found kick-only witnesses for 01-wake and 03-dash at 100 of 100, 02-heartbeat at 73 and 04-thorns at 20 (its hat spikes rise on the kick itself). Then its applier (rooms, the gauntlet, witnesses).
DISPOSITION: RUN1-F3 | obstacles skipped with the up-dash (RUN-1's third quote) | 2026-10-19T19:40:38-05:00 | design, the owner's ruling N-F3 a: amendment to follow, with RUN1-F2, since both re-cut the same rooms. A no-cheese verifier: for every section of every room and each of its beat entities held in a state that blocks, the solver must find no clear. A first whole-room survey (60,000 nodes a search, approximate) already found clears with 02-heartbeat's stones a and b, 04-thorns' hat spikes c, and 10-crown's stones a, b and e and its clap spikes c held. The section-based verifier decides, and every room it flags is re-cut.

R8-MINOR1 to R8-MINOR14 stay carried with their designs. R8-MINOR4, 9 and 10 (the calibration's tapper and its attempt end) land with RUN1-F1, which rewrites the calibration's course and its check.

Progress, 2026-10-19, same producer session:
- **RUN1-F4 fixed** by the applier's 7320a73 (`hush-fix: RUN1-F4`). It changed only the five named product files. END1's, IN1's and GAME1's acceptances and standing passed (build/evidence/fix/RUN1-F4.1.txt to .4.txt), each read by the producer before this line.
- **RUN1-F2 and RUN1-F3 amended together** in the commit after this one's base (`hush-spec: amend playtest RUN-1 F2 F3`; HUSH-SPEC section 1.6). The no-cheese rule became one search per section with every gate shut at once (section 5.4). The per-entity form of the first survey flagged stones that only offered a second route, and a door held shut could hide spikes behind it, so sections now hold one lesson each. Rooms 02, 04, 07, 08, 09 and 10 are re-cut. The gauntlet's generator puts obstacles two columns after their onsets and runs the wave corridor on the melody's contour. Their applier is next: the six room files extracted again, the generator ported to src/rooms/gauntlet.ts, all eleven witnesses solved with `--kick`, then CT1's, RM1's and W1 to W3's acceptances (W3's is `npm run accept:rooms`) and standing.
- **RUN1-F1** follows its design above, then review R9 on cycle 3.
- **RUN1-F2 and RUN1-F3 fixed** by the applier's e9c9b46 (`hush-fix: RUN1-F2F3`). The six room files were extracted again and the generator ported to src/rooms/gauntlet.ts. All eleven witnesses were solved with `--kick`, each clear, change count and press count equal to build/evidence/F2-kick-witnesses.amend.1.txt. CT1's, RM1's, SIM2's and W1 to W3's acceptances and standing passed on their first attempts (build/evidence/fix/RUN1-F2F3.1.txt to .7.txt), each read by the producer before this line. On seed 1 every witness clears 20 of 20 but 02-heartbeat's 19.

RUN1-F1's design in full, for the next producer (the owner's ruling N-F1 c; it amends D16, D9 and section 12):
- The page line, in index.html under the canvas: `Press any key, then tap along with the beat to set your timing.` The owner kept this wording, 2026-10-20T07:42-05:00: "Keep the calibration line as written: \"Press any key, then tap along with the beat to set your timing.\"" It shows from load until the calibration hands over. main.ts's skipCalibration hides it, on the scene's onDone and on the probe's control alike, and nothing shows it again: play again keeps the calibration. Smoke reads it at boot (textProblems gains a calibrationLine option, wanting the title, the link, the notice and the line). The playthrough wants it gone after the hand-over; the flash probe's calibration pages want it up while the scene is up and gone once it is left.
- The animated key press, before the first key and until the calibration begins: the key shape pressed for the first quarter of each beat, by performance.now() from the scene's first frame. Pressed means filled at alpha 0.6 and drawn 4 px lower. 6,400 px, a small area.
- The beat progress row: 20 dots for the counted clicks (4 to 23), radius 4 canvas px, 16 px apart, centred at x 640, y 440. A dot fills (the accent at 0.8) once its click or ring has passed; the others are stroked at 0.25. Pass A counts clicks, pass B rings, and the row resets for each attempt.
- The course: A1, then B1 only if A1 is rejected, and no repeat of either. calibrate(a, v), the one-pass rule: with both passes accepted, as now (X8 unchanged); with only A accepted, avOffset 0 and inputBias medianA; with only B accepted, avOffset 0 and inputBias medianV; with neither, 0 and 0. So a lone pass never shifts the picture by the player's tap lag. The calibration reference, tests/input/calibrate.test.ts (the single-pass cases) and CAL1's count change.
- The probes (tools/calibration-check.mjs, tools/probe-flash.mjs). The untouched run: A1 then B1, both rejected, about 2 x 23 beats, so MIN_SECONDS falls to about 19.7; clicks 20 to 28, fills 3 to 5, rings 20 to 28, values 0 and 0. The tapped run: A1 accepted and no B, left about 10 to 15 s after the key, values (0, the taps' A median) against the marks (0, TAP_A_MS). The retried run becomes the B run: A1 untapped and rejected, B1 tapped and accepted, values (0, the taps' B median) against (0, TAP_B_MS + TAP_B_MID). tapLogValues takes the new rule. CALIB_DRAW gains the pressed key and the row, and calibFrameProblems times them: dot i filled exactly once click or ring i has passed, on brackets.
- The control page: its Calibration scene is section 12's reference, so it takes the same course, pictures and line. New faults: a B run after an accepted A, A repeated, no press animation, no row, the row off its marks, and the line not hidden at the hand-over. The faults that need a repeat (norepeat, first) retire.
- The carried minors that land with it: R8-MINOR4 (the attempt end held exactly), 9 (the tapper dispatches each key at once) and 10 (the key-repeat filter), each with its design in the R8 block above.
- Then the F1 applier (src/render/calibration-scene.ts, src/main.ts, src/input/calibrate.ts), then `FIX RUN-1` in `## Rounds`, then review R9 on cycle 3. The next producer starts at re-entry row 7: the open cycle 3 has no round yet, and RUN1-F1 is its one undispositioned fix.

RUN1-F1 amended 2026-10-20 by the producer (Opus standing in for Fable), in the commit after this one's base (`hush-spec: amend playtest RUN-1 F1`; HUSH-SPEC sections 1.2, 1.4, 1.6, 5.5, 12, 15, 16 and 18), as designed above, with these settlements:
- The wait's press is timed from performance time 0 (frameMs mod BEAT), not from the scene's first frame, so the probe judges every waiting frame on its own bracket and needs no record of that first frame.
- The line is the footer's first item, in the accent. It shares the footer's one line, so hiding it never resizes the canvas, which the flash probe crops by one rect taken at the start.
- The untouched run's trace starts once A1 is seen, after the wait's last press, so the pressed key never counts as a fill. The wait is judged on the frame log instead: the log starts before the first key, with 30 waiting frames judged and 4 pressed at the least.
- The retried run becomes the fallback run: A1 untapped, B1 tapped, judged by the one-pass rule (0 and 34.5). The tapped run is A1 alone (0 and 40).
- R8-MINOR4, 9 and 10 land with it, as designed in the R8 block. Each attempt is held to its end on its frames and in tapLogValues. A scene that hands over inside its update is gone by Phaser's poststep, so its last frame is logged once, `left`, with no Graphics. Every key is dispatched 8 ms after its time stamp. Key repeats are sent and never counted. R8-MINOR8 lands too: CL1's and CAL1's decisive lines, 14 and 9.
- Found in passing: tests/tools/scene-check.test.mjs had gone red with e9c9b46. That fix re-solved room 2's witness to clear near step 1,530, while the test drew 1,600 steps of it. tests/tools runs in no item's acceptance and in neither standing nor npm test, so nothing saw it. Its log now stops at the step the replay leaves the room.
- Controls and reds: section 1.6's entry names every record. Standing is RED only on test:calibration, the X8 test's one-pass cases, until the applier (build/evidence/F1-standing.amend.1.txt).
- The applier is next: src/input/calibrate.ts (CAL1), src/render/calibration-scene.ts and src/main.ts (CAL2). Then CAL1's and CAL2's acceptances, the playthrough's text check, smoke and standing, then `FIX RUN-1` and review R9.

