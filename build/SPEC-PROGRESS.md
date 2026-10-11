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
PF-REPO: open
PF-HOOK: open
PF-HOOK-LIVE: open
PF-CONTROLS: open
PF-CAP: open

## Spec areas

physics: open
rooms: open
gauntlet: open
track: open
art: open
calibration: open
ending: open
interfaces: open
verifiers: open
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

## Escalations

APPROVAL: open
