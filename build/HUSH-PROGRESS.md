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
END1: passes: false

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

## Rounds

## Checkpoint

CHECKPOINT: CAL2 attempt 1 | 2026-10-12T00:08:00-05:00 | blocked | targets: src/render/calibration-scene.ts, src/main.ts

CHECKPOINT: END1 attempt 1 | 2026-10-12T10:20:00-05:00 | rejected | targets: src/render/ending-art.ts, src/render/ending-scene.ts, src/main.ts

HUSH-BUILD: INCOMPLETE (passed=17 blocked=CAL2,RN1,RN2,RN3,RN4,END1)

HUSH-BUILD: REOPENED (items=CAL2,RN1,RN2,RN3,RN4,END1)
