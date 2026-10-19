# PLAYTESTS

One row per reported run, at column 0, written only by the phase-3 producer: `RUN-<k> | P<n> | rc<N> | <ISO> | <m:ss> | <deaths> | first-run: yes|no | "<words>" | redacted: yes|no`. A run whose line the page never showed is logged with `-:--` and `-` for its time and deaths, always first-run: no, and X11 never counts it (the owner's ruling A, 2026-10-19). Friends appear only as P1, P2 and so on; the owner's own runs use the labels JHON and JHON-FIREFOX. Run ids never repeat. `node tools/ship-gate.mjs --playtests rc<N>` is the only reader.

