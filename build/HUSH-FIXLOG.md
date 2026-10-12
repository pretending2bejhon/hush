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

