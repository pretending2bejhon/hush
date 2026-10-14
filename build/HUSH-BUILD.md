# HUSH-BUILD: The Hush v1, VERIFY

VERIFY of head=55831ccf49d300802334db24b1cd8f52c1f2b596 digest=81a1d6cc2560d24e1f8b93daf725980262ada7b898d9552af9b9cafa6e3a9d58, 2026-10-14, by the phase-3 producer (Opus standing in for Fable).

Cycle 2 ended on review R8's PASS (0 BLOCKER, 0 MAJOR, 14 MINOR; build/reviews/REVIEW-R8.md), which followed FIX R7. Every command below ran this session through tools/evidence.mjs in phase `verify`. Each record sits in build/evidence/verify/ and carries this head; its digest is the one above. The laptop was on AC power with energy saver off and a 60 Hz display, with no heavy app (read by the perf probe itself).

The first headed perf and av runs (X4.2.txt, X7.2.txt) passed but were run without `--json` and wrote no JSON record. They were run again with it (X4.3.txt, X7.3.txt), and those are the records cited below.

## What shipped, per area

All 23 items pass (build/HUSH-PROGRESS.md, `HUSH-BUILD: COMPLETE (passed=23)`). The product has not changed since review R3: src outside src/probe, rooms, music and replays. Since the last VERIFY (head 560524f), only verifiers, the spec and the build's notices plugin have changed, through FIX AUDIT-1 and FIX R7.

- **The sim and its physics** (SIM1, SIM2; section 4). The product's sim equals the oracle after every step, and npm test's unit suites hold it: 25 files, 141 tests (X2.2.txt).
- **Ten rooms and the gauntlet** (RM1, CT1, W1 to W3; sections 5 and 6). They are transcribed byte-exact and compiled. Each has a witness that clears it, and each witness clears 20 of 20 jittered runs on the digest's seed 2174867148 (X3.2.txt).
- **The clock line, the driver and the keys** (CL1, CL2, IN1; section 9). Held by the unit suites (X2.2.txt). In the browser, npm test's `keys` and `scene` checks hold real keys to the steps stepOf names, and 8866 play-scene frames to the step the heard time gives, the farthest 1 step off (X2.2.txt).
- **The track, the transport and the layer gates** (AU1 to AU3, GAME1; sections 7 and 8). Ten layers return one per room, on the bar line after the clear: X7's unit half passes 42 of 42 (X7-test.2.txt), and npm test's `unlock` check passes in all ten rooms (X2.2.txt). On the real device, X7 passes (X7.3.txt, av-55831ccf49d300802334db24b1cd8f52c1f2b596.json):
  - 2169 voices for 2140 onsets, with 0 errors, 0 dropped and 0 shifted;
  - every layer soloed above the floor and silent when muted;
  - the clock line at 0.137 ms peak to peak, under section 8.4's 3 ms bound, with 0 resyncs;
  - the mix as section 8.4 builds it, 10 of 10 gates in;
  - 2317 voice starts on their own layer's onsets, and 1909 of 1909 onsets started.
- **The calibration** (CAL1, CAL2; section 12). X8's arithmetic passes 7 of 7, the MAD edge at exactly 35 ms included (X8.2.txt). The scene passes all three runs of the flash probe (X6.2.txt):
  - untouched: 48 clicks, 8 fills, 48 rings, values 0 0, Escape ignored, 48 of 48 click starts on their marks, and 2567 frames timed;
  - tapped: values 5.6 34.5, equal to the taps' own;
  - retried: values 5.6 34.5, equal to the taps' own.
- **The flash limiter** (FX1; section 11). Over the calibration, every room and the gauntlet, 11,778 frames over 196.6 s, the general flashes peak at 9547 canvas px and the red at 0, against the 25,600 px limit (X6.2.txt).
- **The art and the frame** (RN1 to RN4; section 10). npm test's `scene` check passes (X2.2.txt):
  - every room's bake reads as its shapes (34,480 pixels);
  - 772 frames are drawn command for command as the reference.
  - Smoke reads the canvas centred in its frame and an undrawn pixel of #07080d (X1.2.txt).
- **Performance.** X4 holds on the real GPU, headed and maximized (X4.3.txt, perf-55831ccf49d300802334db24b1cd8f52c1f2b596.json): 60 fps mean, 100% of 3606 intervals at 20 ms or less, p99 16.9 ms, over 60.1 s.
- **The ending and the playtest line** (END1; section 13). In npm test's e2e (X2.2.txt):
  - the glimpse rises to y 0 by the card, and 412 frames of the rise are timed from the ending's first frame;
  - the ceiling and the card are drawn as the reference, and 188 card frames sit on the beat heard while they were drawn;
  - the page shows the title, the link and the notice only.
  - The `?playtest` run line at the card, "run 0:59 · deaths 0" outside the canvas, was seen at this digest in review R8 (build/evidence/review/END1.8.txt).
- **The page and the supply chain** (S1; X1, X5, X9, X10):
  - the build loads under /hush/ and boots to the calibration (X1.2.txt);
  - zero console and page errors over every room and the gauntlet, in headless Chrome and in headed Edge (X5.2.txt);
  - the history is public-safe over 3 refs, 116 commits, 597 trees and 1372 blobs (X9.2.txt);
  - X10 holds (X10.2.txt): the lockfile tracked, every pin exact, no high or critical audit finding, AGPL-3.0, no unexpected install script, dist/THIRD-PARTY-NOTICES.txt naming the 62 runtime packages with their licences, only the page's origin, and nothing stored. Since audit 1 the network row also sees WebSockets and a service worker's requests and refuses any RTCPeerConnection, and the storage row reads service workers and the private file system.
- **The verifiers.** Their own suite passes 306 of 306 (verifiers.2.txt). The control files of the verifiers that copy or build the tree pass as well: the deploy's 8 of 8 in 708 s (deploy-controls.1.txt) and the page probes' 32 of 32 (page-controls.1.txt).

## Known gaps

- **Review R8's fourteen MINORs**, carried into the next cycle and never fixed in place, so this verdict stays fresh. Each is a detail or a tolerance that no check reads; none changes an exit criterion's verdict on the product as it stands. Dispositions and designs are in build/HUSH-FIXLOG.md, Review R8.
  1. The gauntlet's wall rule in the base form has no test.
  2. The death burst and the respawn ring are never checked where they are drawn.
  3. The keys' arrival order inside one frame is not pinned.
  4. The calibration's attempt end is held only to within a beat.
  5. X6's predicate numbers other than its area limit are pinned at no edge.
  6. X4's 99% row has no control of its own, and the gate's PERF_OK has no test.
  7. X10's network row cannot see a SharedWorker, a WebTransport session or a popup.
  8. CL1's and CAL1's decisive lines in the spec name the old test counts (11 and 6, now 14 and 7).
  9. The calibration's tapper cannot tell a tap's event time from its handler's time.
  10. The calibration's key-repeat filter is never exercised.
  11. A layer gate's opening is held only within 30 ms of its bar line.
  12. Section 9.1's interpolation alpha is never checked.
  13. The notes' level and length are unchecked.
  14. The `?playtest` line's deaths are only ever read as 0.
- **X3's margin.** About 2% of digests roll a seed on which one witness clears fewer than 18 of 20 (review R5, NOTE 1). The current seed passes, every witness at 20 of 20. A failing seed after a later change is fixed by re-solving that witness, not by changing the product.
- **What only the owner can check:**
  - that the music is heard on the speakers, at JHON-SHIP;
  - the Firefox smoke run (N7).

## Exit criteria (checked only against this VERIFY's evidence)

- [x] X1: `npm run smoke` passes under /hush/ (X1.2.txt).
- [x] X2: `npm test` passes: unit, replay and e2e (X2.2.txt).
- [x] X3: all 11 witnesses at 18 of 20 or more on the digest's seed 2174867148, each at 20 (X3.2.txt).
- [x] X4: headed, real GPU, AC, 60 Hz, no heavy app: 60 fps mean, 100% at 20 ms or less over 60.1 s (perf-55831ccf49d300802334db24b1cd8f52c1f2b596.json).
- [x] X5: zero console and page errors in headless Chrome and headed Edge (X5.2.txt).
- [x] X6: general and red flashes under the area limit everywhere, the calibration included (X6.2.txt).
- [x] X7: the unit half 42 of 42 (X7-test.2.txt) and the real device's run green, the clock at 0.137 ms against the 3 ms bound (av-55831ccf49d300802334db24b1cd8f52c1f2b596.json).
- [x] X8: `npm run test:calibration` 7 of 7 (X8.2.txt).
- [x] X9: `check-public --history` clean over the current refs (X9.2.txt). It runs again over every ref before the visibility change (the last scan, D14) and before every push.
- [x] X10: `npm run probe:supply` passes (X10.2.txt).
- [ ] X11: open, post-preview. It needs JHON-PREVIEW, the playtests of N6 and N7, and JHON-SHIP on the newest rc.
- [ ] X12: open, post-preview. It needs the live URL after JHON-PREVIEW (`npm run probe:live`).
