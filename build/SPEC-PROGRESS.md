# SPEC-PROGRESS

The Hush spec session ledger (phase 1). One line per pre-flight gate and per spec area, each `done` or `open`, with a one-line sanitized summary (exit code or decisive line, ISO time) and its evidence path. A `build/evidence/session/` path is ephemeral and gitignored: the summary on the line is the durable record. Results from before PF-REPO live in the private genesis log, which never enters this repo. Phase-1 escalation lines and their `RESOLVED:` rows go at column 0 under Escalations. The last line is the approval line.

Spec sessions run on claude-opus-5-5, Opus standing in for Fable.

## Pre-flight

PF-MODEL: done | 2026-10-11T14:31:00-05:00 | claude-opus-5-5, Opus standing in for Fable | evidence: genesis log (private)
PF-INPUTS: done | 2026-10-11T14:33:12-05:00 | all six inputs exist and are tracked; the canon prompts were used, byte-equal to the drafts | evidence: genesis log (private)
PF-RULINGS: done | 2026-10-11T14:34:00-05:00 | N1 to N10 and N8b answered, none pending; block copied under Rulings | evidence: genesis log (private)
PF-CONSENT: done | 2026-10-11T14:40:07-05:00 | repo folder, private GitHub repo and pinned npm install consented in one message | evidence: build/GATES.md, three CONSENT lines
PF-ENV: done | 2026-10-11T14:40:25-05:00 | node v24.18.0, npm 11.16.0, git 2.54.0, gh logged in as pretending2bejhon, Chrome 154 and Edge 155 installed, 79.9 GB free | evidence: genesis log (private)
PF-FACTS: done | 2026-10-11T14:50:00-05:00 | exact pins by the 14-day rule (install with --before=2026-09-27), no GitHub advisory on any pin (control: vite@6.0.0 returned 13) | evidence: genesis log (private); pins in package.json
PF-REPO: done | 2026-10-11T15:12:31-05:00 | git init -b main with the noreply identity and eol=lf; LICENSE is the AGPL-3.0 text (sha256 0d96a4ff...abcb0); every ledger created empty; npm install exit 0, 202 packages, every direct pin exact, no install script ran (ignore-scripts); check-public tree clean (exit 0, 23 files; planted control caught every class, missing or empty denylist exit 3); first commit 198c7ba; private remote created, visibility PRIVATE, history clean, main pushed | evidence: build/evidence/session/PF-REPO-tree.1.txt
PF-HOOK: done | 2026-10-11T15:31:24-05:00 | tools/cap-hook.mjs and tests/tools/cap-hook.test.mjs written; red before the hook existed (150 of 150 failed, MODULE_NOT_FOUND), then green on the final hook file (150 of 150 passed, hook sha256 49f74193...c82e); each denial checked for its own reason; install and uninstall scripts written, their merge logic proven on a temp file under Windows PowerShell 5.1; install steps handed to the owner | evidence: build/evidence/session/PF-HOOK-red.1.txt, build/evidence/session/PF-HOOK-green.2.txt
PF-HOOK-LIVE: done | 2026-10-11T15:59:08-05:00 | session 2: the first report read the managed settings ACL as unreadable (Get-Acl translated each rule to an account name and fails on ALL APPLICATION PACKAGES), fixed in 909b31ec to read rules by SID, hook test red then green (151 of 151); the armed crash test blocked one Bash call with a hook error and was consumed, that call uncounted; the three-call Sonnet subagent showed 4 events under one agent id (Read, Read, Glob, SubagentHandback), escalated and accepted by the owner as the three instructed calls plus one hand-back (proof.1 to proof.5); after the owner reinstalled 909b31ec's hook: two reports one call apart, both exit 0, calls 45 then 46, copies equal (87e5342a), admin-only yes (folder, hook, managed settings), onFailure block yes on all three events, version 2.1.295, no .claude folder | evidence: build/evidence/hook-live.proof.1.txt to build/evidence/hook-live.proof.7.txt
PF-CONTROLS: open
PF-CAP: open | the owner's words received 2026-10-11T16:00:10-05:00, whole message: "JHON-CAPS-RESIDUAL: all-sessions I accept the residual." | the GATES line is written by this session's last commit (hush-gate ends a spec session)

## Spec areas

physics: done | 2026-10-11T19:14:54-05:00 | the oracle tests/fixtures/oracle/ (constants, room format, step function) is the normative physics; reach table measured on it by tools/reach.mjs: full jump 3.442 tiles, running jump 6.703, dash 4.375, jump and dash 11.143, up dash 5.113, jump and up dash 8.635, run 10.313 tiles/s, wave 9.375 tiles/s; pinned by tests/tools/oracle.test.mjs (5 of 5) | evidence: build/evidence/session/PF-CONTROLS-sim-tools.1.txt
rooms: done | 2026-10-11T19:15:20-05:00 | ten rooms, each in two sections (introduce, develop), 72 to 96 tiles wide; every room solved on the oracle by tools/solve.mjs with a witness clearing 97 to 100 of 100 jittered runs on seeds 1 to 5, and 19 or 20 of 20 on unseen seeds 6 to 13; clean witness clears 5.9 to 10.0 s; sha256 in tests/data/content.sha256; the texts enter HUSH-SPEC section 5 next | evidence: build/evidence/session/PF-ROOMS-witnesses.1.txt (replay: PASS, 11 witnesses, seed 9)
gauntlet: done | 2026-10-11T19:15:20-05:00 | 32 bars, 4 tiles a beat, clap and kick obstacles on real onsets of the track, two wave phrases following the arp; generated grid 544 by 18; witness 100 of 100 on seeds 1 to 5, clear at step 14278 (59.5 s) | evidence: as rooms
track: done | 2026-10-11T19:18:30-05:00 | ten labelled layers in unlock order (kick, pad, hat, bass, clap, arp, perc, lead, ohat, sub), synth-only, compiled in Node by tools/strudel-node.mjs, onsets kick 0 4 8 12, clap 4 12, arp all 16; byte-exact in HUSH-SPEC section 7; rooms (section 5) and the gauntlet (section 6) byte-exact too, all 13 content entries proven by tools/spec-content.mjs --check (exit 0), its controls 4 of 4 | evidence: build/evidence/session/PF-CONTROLS-spec-content.1.txt
art: open
calibration: open
ending: open
interfaces: open
verifiers: open | written and controlled so far: tools/protect.mjs (both manifests, unlisted verifiers, CRLF drift, commit subjects since the cut), tools/gates.mjs (anchored grammar from the hook, JHON-GO bound to the cut digest), tools/replay.mjs (witness runner, seeded jitter test), tools/solve.mjs (staged bounded search, centring, 98-of-100 acceptance), tools/reach.mjs, tools/strudel-node.mjs, the oracle and the toy sim; controls: the toy's clearable room and 4-beat-door room solved, the unclearable room exit 3, a 17-of-20 witness reported short, a broken and a malformed witness refused; 38 of 38 green 2026-10-11T19:14:54-05:00 | evidence: build/evidence/session/PF-CONTROLS-sim-tools.1.txt
items: open
scoreboard: open
hand-walk: open
handoff: open
cut: open

## Rulings

Copied from the genesis log; every answer is the owner's own words.

N1 rooms: plain-text rooms in the repo, not LDtk | "defaults, canon yes" | 2026-10-10T22:12-05:00
N2 ending: a wordless card (three dots pulsing on the beat), not the words "to be continued" | "defaults, canon yes" | 2026-10-10T22:12-05:00
N3 title: the canvas stays wordless; the title lives only in the page title and the HTML around the canvas | "defaults, canon yes" | 2026-10-10T22:12-05:00
N4 source link: a small "Source (AGPL-3.0)" link in the page, outside the canvas | "defaults, canon yes" | 2026-10-10T22:12-05:00
N5 sound: synth-only Strudel, no samples | "defaults, canon yes" | 2026-10-10T22:12-05:00
N6 playtest: 3 friends, through the live URL before any announcement | "defaults, canon yes" | 2026-10-10T22:12-05:00
N7 browsers: Chrome and Edge tested automatically, Firefox smoke-played by the owner | "defaults, canon yes" | 2026-10-10T22:12-05:00
N8 caps: register the cap hook (superseded in place by N8b) | "defaults, canon yes" | 2026-10-10T22:12-05:00
N9 Codex: may run the executor only under a JHON-CODEX line accepting advisory caps | "defaults, canon yes" | 2026-10-10T22:12-05:00
N10 backup: pretending2bejhon/hush created PRIVATE at the start, pushed after each phase, visibility checked before every push | "defaults, canon yes" | 2026-10-10T22:12-05:00
N8b caps on this runtime: (a) the hook under managed settings with Administrators-only files, Claude Code 2.1.295 or later for onFailure block, and a JHON-CAPS-RESIDUAL line | "let's go with A, and no more codex review. I will launch the spec session" | 2026-10-11T14:29-05:00

## Learnings

- check-public fails closed without the owner's denylist, so the denylist has to exist before the first commit, not at the hook install.
- npm install --before=<date> applies the 14-day pin rule to the whole tree. One dev-only advisory remains: source-map-js 1.2.1 under vite and postcss (GHSA-68fv-2mgg-jv7q, fixed in 1.2.2, published after the cutoff); npm audit --omit=dev is clean.
- typescript-eslint 8.x peers typescript below 6.1, so typescript is pinned at 6.0.3, not the native 7.x line.
- Claude Code tool shells carry CLAUDE_CODE_SESSION_ID; the hook's command line uses it to find its own session.
- Windows PowerShell 5.1 ConvertTo-Json keeps nested single-element arrays as arrays when they are built with @() and +=.
- Get-Acl's .Access translates every rule to an account name and throws on ALL APPLICATION PACKAGES (S-1-15-2-1), which every file inheriting from Program Files carries; GetAccessRules($true, $true, [SecurityIdentifier]) reads the SIDs without translating.
- Every subagent returns through a SubagentHandback tool call, which the hook sees and counts under the subagent's agent id: a subagent told to make n calls shows n + 1.

## Escalations

HUSH-SPEC-ESCALATE: subagent-calls-uncounted | 2026-10-11T15:56:37-05:00 | 909b31ec
What was tried: PF-HOOK-LIVE step 4 dispatched one read-only Sonnet subagent ordered to make exactly three tool calls (Read, Read, Glob) and return; it did, and reported "three calls made". The evidence: --report lists 4 events under one non-empty agent id beside the parent's own calls (build/evidence/hook-live.proof.5.txt), and the hook's event log for that id holds Read, Read, Glob and SubagentHandback, the harness tool through which every subagent hands its report back. No subagent call went uncounted; one call more than the criterion's "exactly three" was counted, and it is the hand-back every subagent makes. The decision needed from the owner: accept step 4 as "the instructed calls plus exactly one SubagentHandback, all under one non-empty agent id" (recommended: the hand-back is a real tool call and the caps should count it), or rule otherwise. Separately, the copies differ until the owner reinstalls the fixed hook.
RESOLVED: HUSH-SPEC-ESCALATE: subagent-calls-uncounted | 2026-10-11T15:56:37-05:00 | 909b31ec | 2026-10-11T15:58:40-05:00 | "accept, reinstalled" | next: spec

APPROVAL: open
