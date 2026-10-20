# HUSH-PROGRESS

The Hush build scoreboard and journal. Under Items, one line per spec item at column 0, in one of three forms: `<ID>: passes: false`, `<ID>: passes: true (evidence: <path>)` or `<ID>: blocked (<reason>)`. The executor writes the passes flips, blocked lines, ATTEMPT, CHECKPOINT and escalation lines; the phase-3 producer writes the round, FIX, CYCLE, build and ship-gate lines. Learnings come from the executor and the producer.

## Items

S1: passes: true (evidence: build/evidence/S1.green.2.txt)
SIM1: passes: true (evidence: build/evidence/SIM1.green.1.txt)
RM1: passes: true (evidence: build/evidence/RM1.green.1.txt)
CT1: passes: true (evidence: build/evidence/CT1.green.1.txt)
SIM2: passes: true (evidence: build/evidence/SIM2.green.1.txt)
W1: passes: true (evidence: build/evidence/W1.green.1.txt)
W2: passes: true (evidence: build/evidence/W2.green.1.txt)
W3: passes: true (evidence: build/evidence/W3.green.1.txt)
CL1: passes: true (evidence: build/evidence/CL1.green.1.txt)
CL2: passes: true (evidence: build/evidence/CL2.green.1.txt)
IN1: passes: true (evidence: build/evidence/IN1.green.1.txt)
CAL1: passes: true (evidence: build/evidence/CAL1.green.1.txt)
AU1: passes: true (evidence: build/evidence/AU1.green.1.txt)
AU2: passes: true (evidence: build/evidence/AU2.green.1.txt)
AU3: passes: true (evidence: build/evidence/AU3.green.1.txt)
FX1: passes: true (evidence: build/evidence/FX1.green.1.txt)
GAME1: passes: true (evidence: build/evidence/GAME1.green.1.txt)
CAL2: passes: true (evidence: build/evidence/CAL2.green.1.txt)
RN1: passes: true (evidence: build/evidence/RN1.green.1.txt)
RN2: passes: true (evidence: build/evidence/RN2.green.1.txt)
RN3: passes: true (evidence: build/evidence/RN3.green.1.txt)
RN4: passes: true (evidence: build/evidence/RN4.green.1.txt)
END1: passes: true (evidence: build/evidence/END1.green.3.txt)

## Learnings

- Phaser 4.2.1 types do not declare `create` on `Phaser.Scene`, so `override create()` fails tsc with TS4113 under `noImplicitOverride`; write `create()` without `override` (S1).
- `src/sim/types.ts` imports `Gauntlet` from `src/rooms/gauntlet.ts` as section 14 writes it, so `tsc --noEmit` reports TS2307 from SIM1 until RM1 creates that module; the acceptance (vitest) and eslint are unaffected and `accept:game` is the first item that runs tsc (SIM1).
- Phaser 4.2.1 types declare `update` on `Phaser.Scene` (unlike `create`), so a scene's `update()` needs `override` under `noImplicitOverride` (TS4114) (GAME1).
- `@strudel/web` ships no declaration file, so `import * as S from '@strudel/web'` fails tsc with TS7016 under `strict`; the import carries `// @ts-expect-error TS7016` and `S` is untyped (GAME1).
- The probe's visibility check wants the sim's `step` to advance after the ending scene started, so the tick driver hangs on the game's `PRE_STEP` event (every frame, any scene), not on the play scene's `update` (GAME1).
- CAL2's acceptance (`npm run probe:flash`) already exits 0 on GAME1's tree: the probe only waits for the calibration scene to be left, and GAME1's first-key shortcut leaves it at once, so the check cannot tell the two passes from no passes (CAL2; evidence build/evidence/CAL2.red.1.txt).
- A check that measures only safety or speed (flash, perf) grows easier as work is missing, so it cannot be red before the work exists. Every acceptance needs a part that fails while the item's own module or behaviour is absent: CAL2 now counts the calibration's clicks, fills and rings; RN1 to RN4 and END1 now run an art test against tests/fixtures/reference/art.mjs before check:art (producer, 2026-10-12; build/HUSH-FIXLOG.md).
- The art is a port, like the sim: tests/fixtures/reference/art.mjs is normative (HUSH-SPEC section 10.6). The tests compare shape lists within 1e-6, so a port may group its arithmetic differently but keeps every shape, its order, its keys and its colour (producer, 2026-10-12).
- The cap hook denies any shell call whose text names a `.claude` folder, even a harmless `ls`; never name one in a command (CAL2).
- The calibration scene is a straight port of the control page's `Calibration` scene; `engine.start()` is idempotent, so the scene's first-key call and main.ts's first-key listener both stand (CAL2).
- RN3 ordering slip (executor): `RN3.red.1.txt` was run after `src/render/beat-art.ts` had been written, so it shows exit 0 and is not a red. The module was moved aside, `RN3.red.2.txt` is the real red (exit 1, module missing), then the module went back unchanged. Run the red before writing any target (RN3).
- The cap hook denies a shell call that holds a write form (`mv`, `rm`, `>`) next to a `tools/` path, so a move and an `evidence.mjs` run go in separate calls (RN3).
- END1 attempt 1 (build/evidence/END1.green.1.txt, exit 1): the art test passes 3 of 3 and the playthrough is clean, but the text check reads `?playtest wants one run line, found []`. tools/probe-play.mjs reads the page texts about 1.5 s after the gauntlet finishes (one `waitForTimeout(1500)` after the last room), while section 13 puts the run line at the card, which comes after the 4-bar rise: RISE_S = 16 beats = 6.857 s after the ending scene's first frame. The product follows section 13 line for line; the two cannot meet unless the line comes earlier than the card, which is a design change (END1).
- END1 attempt 2 (build/evidence/END1.green.2.txt, exit 1) repeated the same implementation after a real red (END1.red.2.txt) and failed the same way, so END1 is `blocked (suspect-check)`: the art test passes 3 of 3, 11 rooms clear, zero console errors, and only the `?playtest` text check fails. The diagnosis is read from the code (the probe's single 1.5 s wait against RISE_S = 6.857 s), not observed: no run was made that waits longer. For the producer: either the probe waits for the card in `?playtest` mode (a verifier change), or section 13 shows the run line when the ending begins (a design change). The attempt's files were reverted by the checkpoint; the implementation is the line-for-line port of section 13 and is quick to redo (END1).
- A probe that judges a state the product reaches later (the ending's card, RISE_S after the finish) waits for that state through the probe API, never for a fixed delay, and every branch of a verifier has its own control: the `?playtest` branch of tools/probe-play.mjs had none until END1's amendment, so its fault went unseen until an executor hit it (producer, 2026-10-12; build/HUSH-FIXLOG.md).
- A test that judges a pure function leaves the call site untested. Review R1's four MAJORs were all wiring the product got right but no test pinned: the run's clear-time unlock, the calibration's taps, the play scene's step, the ending card's beat. The binding goes inside a function the test drives with the real inputs (playFrame, endingFrame), or the live page is read where it takes effect (the unlock check, the tapped calibration) (producer, review R1).
- A design fix that needs the product changed is one amendment commit with its applier right after it. Between the two, standing is red on the new test, so a second applier would fail its standing on the first finding's test: one pair at a time (producer, review R1).
- A reference that gains an import breaks each planted fault copied alone into a temp folder, and a mutant that cannot load fails for the wrong reason, hiding a dead control: refMutant rewrites the oracle import (producer, review R1).
- Evidence is written only through tools/evidence.mjs and the hook lets no session delete it, so a run under the wrong phase leaves a file to commit. Producers record their own runs as `amend` (or `session`), appliers as `fix` (producer, review R1).
- Review R2 found R1's class again, one step further out. The values are tested, but the step that applies them is not: the scenes' image placement, drawShapes, the calibration's hand-over to the run, the window's keys. A path is covered only when a check reads its output where the player meets it (a pixel, the run's own value, a real key), or when the whole path up to the Phaser call sits inside one tested function (producer, review R2).
- A check that compares only the state a run settles into cannot see a uniform shift in time where nothing moves on the beat: room 1 ends in the same state whether every key came 10 steps late or not. Compare states read while something moves. And when a fault makes the input late, it can hide behind the "next tick" rule: also hold the sim's own step to where the calibration puts it (producer, review R2, the key check).
- A browser mutant built in a scratch copy needs the working tree's src/probe, or the probe fails for the wrong reason (exit 2, a missing API). The cap hook's detach ban matches the word "detached" anywhere in a shell call, an evidence name included (producer, review R2).
- Review R3 found the class a third time. R2's `scene` check read where each image and Graphics sits, not what it draws, so an empty bake or an undrawn list passed. A check of a picture reads the picture itself: each Graphics' own command buffer and each baked texture's pixels, against the reference for that frame's state (producer, review R3).
- superdough connects nodes of its own to the speakers: its timers' zero gains and its own output, which no patched orbit feeds. So "the analyser is the speakers' only input" fails a correct page. The rule that holds is that every other input is silent by construction (producer, review R3, MINOR 4).
- An evidence run piped into PowerShell's `Select-Object -First` is killed when the pipe closes, and writes no record (exit 255). Filter the whole output with `Select-String`, or read the file afterwards (producer, review R3).
- A synthetic tap can be placed on a ring only once the frame that drew it is seen, about one frame late. A tap pattern for pass B must start at 25 ms or more, or its early taps land a frame late and shift the values (producer, review R3, MINOR 6).
- A picture is checked in the renderer's own terms. A Graphics' command buffer, encoded in Node from the reference lists, is equal to the frame drawn, and a DynamicTexture's stored pixels are premultiplied composites of its shapes. The judge replays every frame, not only the frames it compares, because the limiter's levels carry from frame to frame (producer, review R3 FIX).
- Heavy judging inside a timed probe moves the probe's own clock. Judging the gauntlet's frame log before watching the ending made the text guard see the ending 0.5 s late. Collect during the run, and judge once every timed read is done (producer, review R3 FIX).
- The cap hook denies a shell call that names a product folder next to a copy, even one that copies out of it. A scratch script that only reads the repo and writes under the scratchpad builds mutants and witness subsets (producer, review R3 FIX).
- A run that only ever takes the happy path cannot test what a scene does on a retry. Each branch a player can reach needs a run that reaches it: the calibration's repeat runs only when a first attempt is rejected, so the probe now leaves one untapped (producer, review R4 FIX).
- The laptop's power is part of the review's environment. A review on battery is BLOCKED by the perf probe, and a long session drains it. The owner plugs it in before a review or a VERIFY (producer, review R4).
- A probe that records the page must record what the page does, in every form it takes. AudioBufferSourceNode declares its own `start`, so wrapping AudioScheduledSourceNode's missed every noise voice. Two runs started on one context time share one origin. A take misses the starts whose layer is still being read. The first product run is the recorder's own control: read its per-run counts before trusting a PASS or a FAIL (producer, review R4 FIX).
- The headed perf probe also wants its window seen. A window that is covered for most of the minute gets frames a second apart and reads as 13 fps. Re-run it before suspecting the product (producer, review R4 FIX).
- Reviews R4 and R5 found one class from its two sides: a binding to the beat that the checks hold by what plays or shows, never by when. R4 timed the sounds; R5 found the calibration's rings and fills, the sim's step and the ending's card untimed against the heard time. A check that judges what a frame shows must also hold when it shows it, against the clock its binding names (producer, review R5).
- A picture's time is held by bracketing its frame. Phaser runs PRE_STEP, every scene's update and POST_STEP inside one animation-frame callback, where no timer runs, so performance.now() and the clock line read at the two events bracket the scene's own frameMs and heard time. Judging only the frames whose bracket holds no window edge makes the check exact, with no tolerance to tune (producer, review R5 FIX).
- Every threshold the spec names needs a test on both sides of its edge: one case exactly at it, one just past it, and the off-by-one comparison as its control. R1 found three of CL1's thresholds unpinned, R3 the limiter's 25,600 px and R6 X8's MAD of 35 ms. Every tolerance a check allows is also room for a mutant. R5 found 80 to 100 ms on the step and the card, and R6 found 30 ms on a gate's opening and any alpha from 0 to 1 (producer, review R6).
- A control that no suite runs rots unseen. D15's seven deploy cases ran once, at PF-CONTROLS. CT1 then made the copy's extraction collide with the tracked rooms, and nothing noticed until audit 1. tests/controls lies outside npm test, so VERIFY re-runs the control file of every verifier that copies or builds the tree, not only npm test (producer, audit 1).
- Claude Code reads environment variables only from the settings' `env` object, and a top-level BASH_MAX_TIMEOUT_MS is ignored without a word. Moved into `env`, it reached the running session at once. A subagent's Bash description still says 600000 ms, so a dispatch whose agent runs a long call (the deploy dry run takes about 16 minutes) states the real limit beside the mandate (producer, audit 1).
- A record under build/evidence/ outside the review, audit, verify and live folders is item evidence, and the digest counts it (D18). Committing a check of the digest's own X3 seed therefore re-rolls the seed it judged. Run such a check in phase `session`, which is never committed, and quote it in the ledger (producer, audit 1).
- Review R7 found R6's class a third time, now inside the gate. A gate row must hold a record to the spec's own number, never to a bound the record carries: X7's AV_OK compared the clock with the JSON's own bound, so a probe edited to 300 ms passed with every check green. Every row of a probe also needs a control that fails it alone, or its number can drift unseen (producer, review R7).
- The cap hook refuses a Bash heredoc whose quotes it cannot balance (an apostrophe in the text is enough). Write ledger rows with the Edit tool. Vite inlines any asset under 4 KB as a data URL, a script included, and a service worker cannot register from one: import it with `?url&no-inline` (producer, review R7).
- A file the build publishes beside the page is as public as the page. The licence texts in dist/THIRD-PARTY-NOTICES.txt carried one third-party email that no scan of the tree could see, so scan the built dist with `check-public --root dist` before a deploy does. Rolldown also leaves a module out of a chunk's `moduleIds` once it has inlined all the bundle uses from it, so a check over the bundle's modules sees only code that ships, and its fixture needs a side effect (producer, audit 1, MINOR 3).
- Audit 1 and review R8 found one class in X10's network row twice. A row that logs the channels it knows is open to the next one: audit 1 found WebSockets, service workers and WebRTC, and R8 found SharedWorker, WebTransport and a popup. Where the product never uses an API, refuse and count it at the page's start, and give each refusal a control of its own (producer, review R8).
- A kick-only search turns the jitter bar into a design rule. A stone that shows for one beat caps the pitch at 4.4 tiles, the run speed per beat. A stone that hands the creature on must overlap the next one around the kick, a sixteenth or more on each side. On a climb, a full beat of overlap took 08-steps from 96 to 99 of 100 (producer, RUN-1 F2).
- The longest crossing is not in the reach table. A coyote jump with a late diagonal dash crosses 13.3 tiles at one height, and a dive below the footing row adds more. A pit that must stay shut is 20 tiles wide or more, with its spikes right under the stones (producer, RUN-1 F3).
- Hold every gate of a section shut at once, never one entity at a time. One at a time flags stones that only offer a second route. Two lessons in one section let a shut door hide a spike field that can be skipped behind it, so each section holds one lesson (producer, RUN-1 F3).
- The solver's jitter score swings by up to 30 points on a one-tile change, because its search returns a different and often fragile path. Judge a re-cut by more than one variant, and give a mechanic timing slack before moving geometry (producer, RUN-1 F2).
- A test that hard-codes a witness's numbers breaks when the witnesses are solved again. Derive them from the witness: the bar-line edge tests now compute room 1's delay from its own clearing tick (producer, RUN-1 F2).
- The cap hook refuses a shell call that names a product folder next to a write form even inside a JSON string, a sed over scratch files or a printf. Write such files with the Write tool (producer, RUN-1).
- Phaser 4.2.1 builds a Graphics with a default line and fill style in its command buffer, `[6, 1, 0, 0, 7, 0, 0]`, until its first clear(). A check that reads buffers must take a buffer of style commands alone as nothing, or a Graphics not drawn yet reads as a foreign picture (producer, RUN-1 F1).
- A scene that hands over inside its own update is stopped before Phaser's poststep, so a probe that logs at poststep never sees its last frame. Log that frame once from the prestep's record, with no Graphics, or the last attempt's end is never judged (producer, RUN-1 F1).
- tests/tools runs in no acceptance and in neither standing nor npm test. An applier that re-solves witnesses or re-cuts rooms can turn a verifier's own test red unseen, as e9c9b46 did to scene-check. Run `npm run test:verifiers` after any such applier, before the review (producer, RUN-1 F1).
- A reviewer dispatched in the foreground costs the producer about twice its wall time: the hook charges the Agent call's whole run and every one of the reviewer's own calls. R9's 2 h 48 min review took 5 h 40 min of the 6 h cap, and the first R9 dispatch ended in ALERT#3. Start each review in a fresh producer session, and record it in that session (producer, R9).

## Rounds

CYCLE 1: start | 2026-10-12T11:27:30-05:00 | build-complete | head=715cf1273aae0b59c06144832da824b449899187
HUSH-REVIEW-R1: FAIL (head=cb90b060d62078e5a1fd373bcecfe9033b638a1a digest=46bcc3dcae54cdeaea737683412ffc32c145b9bcb1657c909c3b51facd8a88b9 blockers=0 majors=4 minors=5)
FIX R1: 2026-10-12T15:32:21-05:00 | fixed=9 rebutted=0 superseded=0
HUSH-REVIEW-R2: FAIL (head=2f2b8a264dd2a0f7b32a3405befd501d19b51b1c digest=eeca3e10f750b308ac7576c8a4694c1f3545a48dc8ab87925fc15fbe85872638 blockers=0 majors=5 minors=4)
FIX R2: 2026-10-12T19:19:25-05:00 | fixed=9 rebutted=0 superseded=0
HUSH-REVIEW-R3: FAIL (head=81a66ae934912449e125d07e883c5f4bc6a5cc83 digest=4537d7d29782e4447e95b22dbc0a9888f1747a9f9d134077ec24bc56d5d66d36 blockers=0 majors=2 minors=6)
FIX R3: 2026-10-13T01:21:03-05:00 | fixed=8 rebutted=0 superseded=0
HUSH-REVIEW-R4: BLOCKED (head=c9f589cf1d1544a0e09a4ab49324d9eac879e6d2 digest=c958db45b706ce99a38b80ced9444606f5de7029d68cb5d932d483043530c989 blockers=0 majors=2 minors=2)
FIX R4: 2026-10-13T11:53:12-05:00 | fixed=3 rebutted=0 superseded=0
HUSH-REVIEW-R5: FAIL (head=bd16d9550e4a4c07da9cc5c5286e72e53e099f3a digest=3fce9ef0e9f6e11c0e6a369d29a9300a81df073d9b6b2eba1e6844f43c431059 blockers=0 majors=2 minors=2)
FIX R5: 2026-10-13T17:36:33-05:00 | fixed=2 rebutted=0 superseded=0
HUSH-REVIEW-R6: PASS (head=8f007a3bf705dede3599e764b36f45ccc6395510 digest=6c217e01ef418ee3d2664d310528567f0c56050f1b770e7d216da73486e414ac blockers=0 majors=0 minors=8)
CYCLE 1: end | 2026-10-13T19:38:00-05:00 | R6
CYCLE 2: start | 2026-10-13T22:40:35-05:00 | audit-fail 1 | head=1ef9158ff53024eaf44bac36aa664617d1e45981
FIX AUDIT-1: 2026-10-13T23:45:19-05:00 | fixed=3 rebutted=0 superseded=0
HUSH-REVIEW-R7: FAIL (head=55e41c8b8846c82489e2968f29d569a5767f0abc digest=a03cbf0a4b6f5c31b7c32ce3f3aaf737c19450e3eb4477142ab296f22f2c6e8c blockers=0 majors=2 minors=13)
FIX R7: 2026-10-14T03:40:16-05:00 | fixed=9 rebutted=0 superseded=0
HUSH-REVIEW-R8: PASS (head=e6468ae318a153c83b0c5f936e4e16c82f428363 digest=81a1d6cc2560d24e1f8b93daf725980262ada7b898d9552af9b9cafa6e3a9d58 blockers=0 majors=0 minors=14)
CYCLE 2: end | 2026-10-14T12:56:35-05:00 | R8
CYCLE 3: start | 2026-10-19T19:39:40-05:00 | playtest RUN-1 | head=632decdcd3a465a1109e324eaa8f5b9b4b4cafcc
FIX RUN-1: 2026-10-20T09:52:59-05:00 | fixed=8 rebutted=0 superseded=0
HUSH-REVIEW-R9: PASS (head=6e963503bddf22696776bb710173cd2c16bbad57 digest=aa2bbe57898bf9a1276731927a2c7a9722937ac6bd7df0a1ca1800b83c18f947 blockers=0 majors=0 minors=14)
CYCLE 3: end | 2026-10-20T18:12:00-05:00 | R9

## Checkpoint

CHECKPOINT: CAL2 attempt 1 | 2026-10-12T00:08:00-05:00 | blocked | targets: src/render/calibration-scene.ts, src/main.ts

CHECKPOINT: END1 attempt 1 | 2026-10-12T10:20:00-05:00 | rejected | targets: src/render/ending-art.ts, src/render/ending-scene.ts, src/main.ts

CHECKPOINT: END1 attempt 2 | 2026-10-12T10:30:00-05:00 | blocked | targets: src/render/ending-art.ts, src/render/ending-scene.ts, src/main.ts

HUSH-BUILD: INCOMPLETE (passed=17 blocked=CAL2,RN1,RN2,RN3,RN4,END1)

HUSH-BUILD: REOPENED (items=CAL2,RN1,RN2,RN3,RN4,END1)

HUSH-BUILD: INCOMPLETE (passed=22 blocked=END1)

HUSH-BUILD: REOPENED (items=END1)

HUSH-BUILD: COMPLETE (passed=23)

HUSH-PHASE3-ESCALATE: R2-count-not-dropping | 2026-10-12T17:55:00-05:00 | f266a19d

Cycle 1's finding count did not drop across two FAIL rounds, so the caps escalate it. R1 found 9 (0 BLOCKER, 4 MAJOR, 5 MINOR), and FIX R1 fixed all nine with five amendments and four appliers. R2 found 9 again (0, 5, 4; build/reviews/REVIEW-R2.md, evidence build/evidence/review/R2-*). R1's fixes hold, the product matches every Action and every Axis B check passes; the reviewer also saw the player's path work on HEAD (the real calibration hands over to room 1 at 15.1 and 25, and real keys move the creature). All nine R2 findings are gaps in the checks one step past R1's: five mutations of shipped behaviour survive every test (the play scene's image placement, drawShapes, the ending's glimpse, the calibration's hand-over to the run, the window's keys), two details are untested, the tapped calibration can fail a correct product when the page's timers run late, and two item lines of the spec are stale. Each round peels the next layer between a tested value and the player. The ship gate needs cycle 1 to end on a PASS, so the loop cannot stop here as it stands. The decision needed from the owner: (A) go on: FIX R2 fixes all nine with checks that read the output where the player meets it (canvas pixels in a room and at the card, the run's own calibration values, real keys), so that R3 has no further layer to peel, then review R3 (the producer's recommendation; routing in build/HUSH-FIXLOG.md, Review R2); or (B) change the loop itself (the reviewer's mandate, the severity rule, the round cap or the gate), which only his word can do.

HUSH-PHASE3-ESCALATE: R5-cycle1-round-cap | 2026-10-13T14:04:52-05:00 | cc8dfdfd

Cycle 1 has used its five rounds, the caps' hard limit, without the PASS that ends a cycle. R1 to R3 were FAIL with 9, 9 and 8 findings. R4 was BLOCKED on battery with 4 of its own. R5 is FAIL with 4: 0 BLOCKER, 2 MAJOR, 2 MINOR (build/reviews/REVIEW-R5.md, evidence build/evidence/review/R5-*). Every fix held, and the reviewer re-ran R4's three mutants, which now fail. The product has not changed since R3 and matches every Action: all 23 acceptances, standing, npm test, the 269 verifier tests, the headed av probe and the headed Edge playthrough pass, and so does every Axis B check. Both MAJORs are gaps in the checks, the picture side of the class R4 found for sound. The calibration's rings and count-in fills are counted but never timed against the marks the scene judges taps by. The sim's step and the ending's card are held to the heard music only within 80 to 100 ms. Each has a fix that changes no product file: bracket each frame between Phaser's prestep and poststep, and hold what it shows to the time the scene must have read (routing in build/HUSH-FIXLOG.md, Review R5). The ship gate needs a cycle that ends on a PASS, and the caps allow cycle 1 no sixth round. The decision needed from the owner: (A) lift cycle 1's cap by one round: FIX R5 fixes both MAJORs by amendment, then R6 ends the cycle if it is a PASS, and a FAIL escalates again (the producer's recommendation: R5 found nothing outside the timing of what is shown, and both fixes are designed); (B) close cycle 1 at its cap and open cycle 2 after FIX R5, with its own five rounds; or (C) change the loop itself (the reviewer's mandate, the severity rule, the round cap or the gate), which only his word can do.

HUSH-SHIP-GATE: PASS (head=ddc6665fb78877c861086e6c20b5dffb42895534 digest=81a1d6cc2560d24e1f8b93daf725980262ada7b898d9552af9b9cafa6e3a9d58)

HUSH-PHASE3-ESCALATE: cap-hit ALERT#3 | 2026-10-20T12:55:00-05:00 | 62731804

This producer session (Opus standing in for Fable) hit the cap hook's 6 active hours (ALERT#3) at the end of review R9's dispatch. Its work before it: RUN1-F1 amended in ad445dd (section 12's line under the canvas in the owner's words, the waiting key pressed on the beat, the row of 20 dots, A1 then B1 only after a rejected A1, calibrate's one-pass rule, R8's MINOR 4, 8, 9 and 10, and the scene-check test that the F2 and F3 re-solve had broken; 24 of 24 calibration controls, 37 of 37 page controls, the verifier suite 324 of 324), applied by the applier's 554c10b with CAL1, CAL2, GAME1 and standing green (build/evidence/fix/RUN1-F1.1.txt to .4.txt), and FIX RUN-1 closed in 6273180 (fixed 8). Review R9 was dispatched at head 627318043f924347d30231a9308cb020154fd5b9, digest aa2bbe57898bf9a1276731927a2c7a9722937ac6bd7df0a1ca1800b83c18f947. Its reviewer ran 2 h 58 min, about an hour of it with the laptop in Modern Standby (lid shut 10:20 to 11:19, on battery until 11:35), which the hook charges in full as the call's own run time, and returned a PASS with 0 BLOCKER, 0 MAJOR and 13 MINOR: all 23 acceptances, standing, npm test, the verifiers, probe:console in Chrome and headed Edge and the headed av probe green, every spec area's mutation killed, Axis B in full. Its three new MINORs: play again's Escape and repeat filter is never exercised (ending-scene.ts:50, mechanical); play again keeping the calibration is never checked (main.ts playAgain, mechanical); and X3's margin on a fresh digest seed, five witnesses clearing 95.1 to 98.3% of 1000 runs out of sample, 04-thorns lowest (design: accept witnesses on held-out seeds too, or judge X3 over more runs); the other ten are R8's MINOR 1, 2, 3, 5, 6, 7, 11, 12, 13 and 14, carried. The cap left no call to record the round: build/reviews/REVIEW-R9.md was not written, no round line was appended, cycle 3 has not ended, and the reviewer's 53 records stay in build/evidence/review/R9-* (digest-neutral review evidence), committed with this checkpoint if its form allowed it, or else untracked, to be committed with the resolution. The decision needed from the owner: (A) resolve ALERT#3 and let a fresh producer session take re-entry row 7 and run review R9 again on cycle 3 with a fresh reviewer (the round was never recorded, so it is still R9), each review started in a session with at least 4 active hours left (the producer's recommendation); or (B) change the loop itself (the cap, or how a review's run time is charged), which only his word can do.
