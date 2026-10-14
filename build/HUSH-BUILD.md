# HUSH-BUILD: The Hush v1, VERIFY

VERIFY of head=560524fa19f920b5519167152fa451ebbcdbf065 digest=6c217e01ef418ee3d2664d310528567f0c56050f1b770e7d216da73486e414ac, 2026-10-13, by the phase-3 producer (Opus standing in for Fable).

Cycle 1 ended on review R6's PASS (0 BLOCKER, 0 MAJOR, 8 MINOR; build/reviews/REVIEW-R6.md), which followed FIX R5. Every command below ran this session through tools/evidence.mjs in phase `verify`. Each record sits in build/evidence/verify/ and carries this head; its digest is the one above. The laptop was on AC power with energy saver off and a 60 Hz display, with no heavy app (read by the perf probe itself).

## What shipped, per area

All 23 items pass (build/HUSH-PROGRESS.md, `HUSH-BUILD: COMPLETE (passed=23)`). The product has not changed since review R3: src outside src/probe, rooms, music and replays.

- **The sim and its physics** (SIM1, SIM2; section 4). The product's sim equals the oracle after every step, and npm test's unit suites hold it: 25 files, 135 tests (X2.1.txt).
- **Ten rooms and the gauntlet** (RM1, CT1, W1 to W3; sections 5 and 6). They are transcribed byte-exact and compiled. Each has a witness that clears it, and each witness clears 19 or 20 of 20 jittered runs on the digest's seed 1814134273 (X3.1.txt).
- **The clock line, the driver and the keys** (CL1, CL2, IN1; section 9). Held by the unit suites (X2.1.txt). In the browser, npm test's `keys` and `scene` checks hold real keys to the steps stepOf names, and every play-scene frame to the step the heard time gives (X2.1.txt).
- **The track, the transport and the layer gates** (AU1 to AU3, GAME1; sections 7 and 8). Ten layers return one per room, on the bar line after the clear: X7's unit half passes 40 of 40 (X7-test.1.txt), and npm test's `unlock` check passes in all ten rooms (X2.1.txt). On the real device, X7 passes (X7.1.txt, av-560524fa19f920b5519167152fa451ebbcdbf065.json):
  - 2162 voices for 2140 onsets, with 0 errors, 0 dropped and 0 shifted;
  - every layer soloed above the floor and silent when muted;
  - the clock line at 0.121 ms peak to peak;
  - the mix as section 8.4 builds it;
  - 2319 voice starts on their own layer's onsets, and 1907 of 1907 onsets started.
- **The calibration** (CAL1, CAL2; section 12). X8's arithmetic passes 6 of 6 (X8.1.txt). The scene passes all three runs of the flash probe (X6.1.txt):
  - untouched: 48 clicks, 8 fills, 48 rings, values 0 0, Escape ignored, and 2561 frames timed;
  - tapped: values 5.8 34.8, equal to the taps' own;
  - retried: values 6.6 34.5, equal to the taps' own;
  - in all three: every click started on its mark, every ring and fill in its window, and no page error, no foreign request and nothing stored.
- **The flash limiter** (FX1; section 11). Over the calibration, every room and the gauntlet, the general flashes peak at 9702 canvas px and the red at 0, against the 25,600 px limit (X6.1.txt).
- **The art and the frame** (RN1 to RN4; section 10). npm test's `scene` check passes (X2.1.txt):
  - every room's bake reads as its shapes (34,480 pixels);
  - 772 frames are drawn command for command as the reference.
- **Performance.** X4 holds on the real GPU, headed and maximized (X4.1.txt, perf-560524fa19f920b5519167152fa451ebbcdbf065.json): 60 fps mean, 100% of 3605 intervals at 20 ms or less, p99 16.8 ms, over 60.1 s.
- **The ending and the playtest line** (END1; section 13). In npm test's e2e (X2.1.txt):
  - the glimpse rises to rest by the card;
  - the ceiling and the card are drawn as the reference, the card on the beat heard while it was drawn;
  - the page shows the title, the link and the notice only.
  - The `?playtest` run line at the card, "run 0:59 · deaths 0" outside the canvas, was seen at this digest in review R6 (build/evidence/review/END1.6.txt).
- **The page and the supply chain** (S1; X1, X5, X9, X10):
  - the build loads under /hush/ and boots to the calibration (X1.1.txt);
  - zero console and page errors over every room and the gauntlet, in headless Chrome and in headed Edge (X5.1.txt);
  - the history is public-safe over 3 refs, 97 commits, 505 trees and 1064 blobs (X9.1.txt);
  - X10 holds (X10.1.txt): the lockfile tracked, every pin exact, no high or critical audit finding, AGPL-3.0, no unexpected install script, only the page's origin, and nothing stored.
- **The verifiers.** Their own suite passes 281 of 281 (verifiers.1.txt).

## Known gaps

- **Review R6's eight MINORs**, carried into the next cycle and never fixed in place, so this verdict stays fresh. Each is a spec'd detail or a tolerance that no check reads; none changes an exit criterion's verdict on the product as it stands. Dispositions are in build/HUSH-FIXLOG.md, Review R6.
  1. X8's MAD threshold edge (35 accepted, 35.5 rejected) has no test.
  2. The calibration's key-repeat filter is never exercised.
  3. The ending's rise is not timed from its first frame.
  4. A layer gate's opening is held only within 30 ms of its bar line.
  5. The canvas's background colour is never read.
  6. Section 9.1's interpolation alpha is never checked.
  7. The notes' level and length are unchecked.
  8. The `?playtest` line's deaths are only ever read as 0.
- **X3's margin.** About 2% of digests roll a seed on which one witness clears fewer than 18 of 20 (review R5, NOTE 1). The current seed passes, with 19 of 20 the lowest. A failing seed after a later change is fixed by re-solving that witness, not by changing the product.
- **What only the owner can check:**
  - that the music is heard on the speakers, at JHON-SHIP;
  - the Firefox smoke run (N7).

## Exit criteria (checked only against this VERIFY's evidence)

- [x] X1: `npm run smoke` passes under /hush/ (X1.1.txt).
- [x] X2: `npm test` passes: unit, replay and e2e (X2.1.txt).
- [x] X3: all 11 witnesses at 18 of 20 or more on the digest's seed 1814134273 (X3.1.txt).
- [x] X4: headed, real GPU, AC, 60 Hz, no heavy app: 60 fps mean, 100% at 20 ms or less over 60.1 s (perf-560524fa19f920b5519167152fa451ebbcdbf065.json).
- [x] X5: zero console and page errors in headless Chrome and headed Edge (X5.1.txt).
- [x] X6: general and red flashes under the area limit everywhere, the calibration included (X6.1.txt).
- [x] X7: the unit half 40 of 40 (X7-test.1.txt) and the real device's run green (av-560524fa19f920b5519167152fa451ebbcdbf065.json).
- [x] X8: `npm run test:calibration` 6 of 6 (X8.1.txt).
- [x] X9: `check-public --history` clean over the current refs (X9.1.txt). It runs again over every ref before the visibility change (the last scan, D14) and before every push.
- [x] X10: `npm run probe:supply` passes (X10.1.txt).
- [ ] X11: open, post-preview. It needs JHON-PREVIEW, the playtests of N6 and N7, and JHON-SHIP on the newest rc.
- [ ] X12: open, post-preview. It needs the live URL after JHON-PREVIEW (`npm run probe:live`).
