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
DISPOSITION: R1-MAJOR4 | the ending card's beat binding (src/render/ending-scene.ts:88) is untested | 2026-10-12T14:18:00-05:00 | to fix by amendment and one applier
- `endingFrame` (the rise, then the card) and `beatOfBar`, read from the run's origin, move into ending-art.ts (END1 amended).
- They are compared with the reference in tests/render/ending-art.test.mjs. The scene draws only what endingFrame returns.
- Amended 2026-10-12T15:00-05:00 in the commit `hush-spec: amend END1 ...` after `020b7a7`.
  - The test passes 5 of 5 on the reference and is red on the tree before the port: endingFrame is missing (build/evidence/END1.amend.3.txt).
  - The beat counted from t0 + 0.2 s fails (build/evidence/R1-END1-controls.amend.1.txt).
  - The applier follows.
DISPOSITION: R1-MINOR1 | the ending's text guard covers only the first half of the rise | 2026-10-12T14:18:00-05:00 | to fix (verifier): the guard runs to RISE_MS - 400 ms; control ?ending=mid (a line at 60% of the rise)
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit: ?playtest&ending=mid fails, and the clean page and the other ending faults keep their verdicts (build/evidence/R1-page-controls.amend.1.txt and .2.txt).
DISPOSITION: R1-MINOR2 | three of CL1's thresholds are unpinned | 2026-10-12T14:18:00-05:00 | to fix (test): a 6 ms downward glitch, a lead of 3 render quanta, a blip of exactly two low pairs
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit. A blip of two low pairs needs a 15 ms lead, so that only each burst's fresh pair is trusted. CLOCK_JUMP 0.008, 2 quanta and 2 low pairs each fail (build/evidence/fix/R1-product-controls.1.txt), and the product passes 11 of 11.
DISPOSITION: R1-MINOR3 | AU2's late shift amount is unpinned | 2026-10-12T14:18:00-05:00 | to fix (test): a shifted note's time is its tick's time + 0.005
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit: a 10 ms shift fails (build/evidence/fix/R1-product-controls.1.txt), and the product passes 7 of 7.
DISPOSITION: R1-MINOR4 | a run started at the gauntlet stalls about 150 ms on its bake and can drop the first sixteenth | 2026-10-12T14:18:00-05:00 | to fix by amendment and one applier
- The run's origin lead goes from 0.1 s to 0.25 s (GAME1, section 8.4), so a room's bake ends before its first sixteenth falls due.
- A player walking in from room 10 never restarts the origin; only the calibration hand-over and the probes do.
DISPOSITION: R1-MINOR5 | X3's jitter test re-rolls its seed on every commit, and about 1 HEAD in 40 fails it | 2026-10-12T14:18:00-05:00 | to fix by amendment (verifier)
- X3's seed comes from the verdict digest instead of HEAD's sha (tools/ship-gate.mjs X3, and the replay step of tools/test-all.mjs for X2). A bookkeeping commit never re-rolls it, and every verdict on one digest sees one seed, judged first at VERIFY.
- 04-thorns' margin is the room's own, as proven at the cut (97 of 100 on the oracle). It is kept as a known property.
- Fixed 2026-10-12T14:55-05:00 in the same amendment commit: tools/ship-gate.mjs `x3Seed(digest)`, used by X3 and by npm test's replay step. tests/tools/ship-gate.test.mjs shows the seed kept across a record commit, and the verifier suite passes 229 of 229 (build/evidence/R1-verifiers.amend.1.txt).
DISPOSITION: R1-NOTE1 | four surviving mutations with no effect reachable on the sha-pinned content | 2026-10-12T14:18:00-05:00 | no action

