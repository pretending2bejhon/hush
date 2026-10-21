# HUSH-BUILD: The Hush v1, VERIFY

VERIFY of head=d1d8c2906ee066cdbbda554bfefadcff3fa39b08 digest=aa2bbe57898bf9a1276731927a2c7a9722937ac6bd7df0a1ca1800b83c18f947, 2026-10-20, by the phase-3 producer (Opus standing in for Fable).

Cycle 3 ended on review R9's PASS (0 BLOCKER, 0 MAJOR, 14 MINOR; build/reviews/REVIEW-R9.md), which followed FIX RUN-1. Every command below ran this session through tools/evidence.mjs in phase `verify`. Each record sits in build/evidence/verify/ and carries this head; its digest is the one above. For the headed runs the laptop was on AC power with energy saver off, a 60 Hz display, no heavy app and the screen awake (read by the perf probe itself, and by the owner).

The headed runs took three tries:
- The first perf run (X4.4.txt) failed with the display dark: brightness 0, frames a second apart, 13.6 fps. The owner woke the screen, and the run passed (X4.5.txt).
- X4.5.txt and the first av run (X7.4.txt) passed, but neither wrote a JSON record: evidence.mjs takes its own `--json <kind>` flag for that.
- Both ran again with it (X4.6.txt, X7.5.txt). Those, and their JSON, are the records cited below.

## What shipped, per area

All 23 items pass (build/HUSH-PROGRESS.md, `HUSH-BUILD: COMPLETE (passed=23)`). Since the last VERIFY (head 55831cc, digest 81a1d6cc), cycle 3 changed the product on the owner's rc1 run RUN-1 and his rulings:
- F4 in 7320a73: the ending's run line and play again.
- F2 and F3 in e9c9b46: every witness press on the kick, six rooms re-cut, and the gauntlet's obstacles after their onsets.
- F1 in 554c10b: the calibration's line, its waiting key, its row of dots and its course.

Their verifiers were amended first (build/HUSH-FIXLOG.md, Playtest RUN-1).

- **The sim and its physics** (SIM1, SIM2; section 4). The product's sim equals the oracle after every step, and npm test's unit suites hold it: 25 files, 145 tests (X2.3.txt).
- **Ten rooms and the gauntlet** (RM1, CT1, W1 to W3; sections 5 and 6). They are transcribed byte-exact and compiled (npm test's unit suites, X2.3.txt).
  - Each has a witness that clears it, every press within 12 steps of a kick (the owner's ruling N-F2 a).
  - On the digest's seed 2854993495, 02-heartbeat clears 19 of 20 jittered runs and the other ten clear 20 of 20 (X3.3.txt).
  - The no-cheese search finds no crossing with the window shut in any of the 24 sections of 7 rooms, within 100,000 nodes a search, and every section crosses free (npm test's cheese suite, X2.3.txt; a bounded search, so its "none" is within budget).
- **The clock line, the driver and the keys** (CL1, CL2, IN1; section 9). Held by the unit suites (X2.3.txt). In the browser, npm test's checks hold:
  - `keys`: real keys reach the sim on the steps stepOf names;
  - `scene`: 8620 play-scene frames sit on the step the heard time gives, the farthest 1 step off (X2.3.txt).
- **The track, the transport and the layer gates** (AU1 to AU3, GAME1; sections 7 and 8). Ten layers return one per room, on the bar line after the clear: X7's unit half passes 43 of 43 (X7-test.3.txt), and npm test's `unlock` check passes in all ten rooms with 84 reads (X2.3.txt). On the real device, X7 passes (X7.5.txt, av-d1d8c2906ee066cdbbda554bfefadcff3fa39b08.json):
  - 2160 voices for 2140 onsets, with 0 errors, 0 dropped and 0 shifted;
  - every layer soloed above the floor and silent when muted;
  - the clock line at 0.119 ms peak to peak, under section 8.4's 3 ms bound, with 0 resyncs;
  - the mix as section 8.4 builds it, 10 of 10 gates in;
  - 2317 voice starts on their own layer's onsets, and 1909 of 1909 onsets started.
- **The calibration** (CAL1, CAL2; section 12, as the owner's ruling N-F1 c amended it).
  - X8's arithmetic passes 9 of 9, the MAD edge at exactly 35 ms and the one-pass rule included (X8.3.txt).
  - The scene passes all three runs of the flash probe (X6.3.txt):
    - untouched, A1 then B1, both rejected: 22 s up, 24 clicks, 4 fills and 24 rings, values 0 0, and Escape ignored. 24 of 24 click starts sit on their marks, 1285 frames are timed, and 33 of 126 waiting frames are pressed;
    - tapped, A1 accepted alone: values 0.0 42.8, equal to the taps' own;
    - fallback, A1 untapped and B1 tapped: values 0.0 34.6, equal to the taps' own.
  - Smoke reads the calibration's line under the canvas at boot (X1.3.txt). The playthrough's text check reads it gone after the hand-over, in headless Chrome and in headed Edge (X2.3.txt, X5.3.txt).
- **The flash limiter** (FX1; section 11). Over the calibration, every room and the gauntlet, 10,413 frames over 174.1 s, the general flashes peak at 6737 canvas px and the red at 0, against the 25,600 px limit (X6.3.txt).
- **The art and the frame** (RN1 to RN4; section 10). npm test's `scene` check passes (X2.3.txt):
  - every room's bake reads as its shapes (33,740 pixels);
  - 814 frames are drawn command for command as the reference.
  - Smoke reads the canvas centred in its frame and an undrawn pixel of #07080d (X1.3.txt).
- **Performance.** X4 holds on the real GPU, headed and maximized (X4.6.txt, perf-d1d8c2906ee066cdbbda554bfefadcff3fa39b08.json):
  - 60 fps mean, 100% of 3604 intervals at 20 ms or less, p99 16.9 ms, over 60.1 s;
  - the gauntlet's busy window at 60 fps too.
- **The ending, the run line and play again** (END1; section 13, as the owner's ruling N-F4 a amended it).
  - The card shows the run line "run 0:59 · deaths 0" outside the canvas with no page flag, in headless Chrome and headed Edge (X5.3.txt).
  - npm test's `again` check (X2.3.txt): a key half-way through the rise left the ending up, and a key at the card started a new run at room 1 and hid the line.
  - The glimpse rises to y 0 by the card, with 412 frames of the rise timed from the ending's first frame and 191 card frames on the beat heard while they were drawn (X2.3.txt).
- **The page and the supply chain** (S1; X1, X5, X9, X10):
  - the build loads under /hush/ and boots to the calibration (X1.3.txt);
  - zero console and page errors over every room and the gauntlet, in headless Chrome and in headed Edge (X5.3.txt);
  - the history is public-safe over 6 refs, 139 commits, 709 trees and 1711 blobs (X9.3.txt);
  - X10 holds (X10.3.txt): the lockfile tracked, every pin exact, no high or critical audit finding, AGPL-3.0, no unexpected install script, dist/THIRD-PARTY-NOTICES.txt naming the 62 runtime packages with their licences, only the page's origin, and nothing stored.
- **The verifiers.** Their own suite passes 324 of 324 (verifiers.3.txt). The control files of the verifiers that copy or build the tree pass only in part, each for a fault in the control file, not in the verifier it controls (known gaps, VERIFY-MINOR1 and 2):
  - the deploy's: 5 of 8 (deploy-controls.2.txt);
  - the page probes': 36 of 37 (page-controls.2.txt, page-controls-domtext.1.txt).

## Known gaps

- **Review R9's fourteen MINORs**, carried into the next cycle and never fixed in place, so this verdict stays fresh. Dispositions and designs are in build/HUSH-FIXLOG.md, R9 and Review R8. None changes an exit criterion's verdict on the product as it stands.
  1. flush() emptying the queue is unpinned.
  2. Play again's Escape and repeat filters are never exercised.
  3. Play again keeping the calibration is never checked.
  4. The clear's at-or-past edge has no test.
  5. X3's margin on a fresh digest seed (below).
  6. The death burst and the respawn ring are never checked where they are drawn.
  7. The keys' arrival order inside one frame is not pinned.
  8. X6's predicate numbers other than its area limit are pinned at no edge.
  9. X4's 99% row has no control of its own, and the gate's PERF_OK has no test.
  10. X10's network row cannot see a SharedWorker, a WebTransport session or a popup.
  11. A layer gate's opening is held only within 30 ms of its bar line.
  12. Section 9.1's interpolation alpha is never checked.
  13. The notes' level and length are unchecked.
  14. The run line's deaths are only ever read as 0.
- **VERIFY's two control-file findings**, carried the same way (build/HUSH-FIXLOG.md, VERIFY):
  - **VERIFY-MINOR1, the deploy controls' limits.** tests/controls/deploy.test.mjs gives each case 300 s and the first 600 s, but a dry run now takes longer, since the cheese suite joined npm test. Three cases ran 1030 s, 518 s and 522 s and returned with every assertion held: vitest reports a sync test that throws by its own error and one that returns past its deadline as a timeout. The file exits 1 with 5 of 8.
  - **VERIFY-MINOR2, the `?domtext` control.** It wants the read right after the hand-over to see a text the control page plants 200 ms after boot, and the hand-over now comes first. The probe still fails the page, on the ending's reads, so only the control's expected line misses, twice in a row.
- **X3's margin** (R9-MINOR5). The current seed passes, 02-heartbeat at 19 of 20. Out of sample, five witnesses clear 95.1 to 98.3% of jittered runs, 04-thorns lowest. Every digest change re-rolls the seed, so the next cycle that changes product code or a verifier settles it first.
- **What only the owner can check:**
  - that the music is heard on the speakers, at JHON-SHIP;
  - the Firefox smoke run (N7);
  - his replay of the new build with ?playtest (his rulings of 2026-10-19).

## Exit criteria (checked only against this VERIFY's evidence)

- [x] X1: `npm run smoke` passes under /hush/ (X1.3.txt).
- [x] X2: `npm test` passes: unit, replay, cheese and e2e (X2.3.txt).
- [x] X3: all 11 witnesses at 18 of 20 or more on the digest's seed 2854993495, ten at 20 and 02-heartbeat at 19, every press on the kick (X3.3.txt).
- [x] X4: headed, real GPU, AC, 60 Hz, no heavy app, the screen awake: 60 fps mean, 100% at 20 ms or less over 60.1 s (perf-d1d8c2906ee066cdbbda554bfefadcff3fa39b08.json).
- [x] X5: zero console and page errors in headless Chrome and headed Edge (X5.3.txt).
- [x] X6: general and red flashes under the area limit everywhere, the calibration included (X6.3.txt).
- [x] X7: the unit half 43 of 43 (X7-test.3.txt) and the real device's run green, the clock at 0.119 ms against the 3 ms bound (av-d1d8c2906ee066cdbbda554bfefadcff3fa39b08.json).
- [x] X8: `npm run test:calibration` 9 of 9 (X8.3.txt).
- [x] X9: `check-public --history` clean over the current refs (X9.3.txt). It runs again over every ref before every push and before any visibility change.
- [x] X10: `npm run probe:supply` passes (X10.3.txt).
- [ ] X11: open, post-preview. It needs the next rc's JHON-PREVIEW, the playtests of N6 and N7 on it, and JHON-SHIP on the newest rc.
- [ ] X12: open, post-preview. rc1's live proof (3339d22) binds to rc1 only; the next rc needs `npm run probe:live` after its preview.
