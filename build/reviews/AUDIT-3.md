HUSH-AUDIT: PASS (head=2055e5b22a468f6050fae0faf4022a7c4f593074 digest=aa2bbe57898bf9a1276731927a2c7a9722937ac6bd7df0a1ca1800b83c18f947 blockers=0 majors=0 minors=1)

Auditor, audit 3, Opus standing in for Fable, 2026-10-20 to 21. I probed only the new surface:
- the public repo and its history;
- the npm supply chain;
- the static page: what it loads, what it stores, its keys, its AudioContext, its runtime Strudel and how it flashes;
- the licence texts and the git identities;
- the deploy.

**Integrity of the audit**
- HEAD and the digest did not change from start to end (A3-head, A3-digest, A3-head-final, A3-digest-final, A3-head-close).
- I did not read or record the machine's process list. I ran no perf or av probe. X4 and X7 come from VERIFY's JSON records at this digest.
- Every check ran from the repo root as `node tools/evidence.mjs A3-<check> audit -- <cmd>`.
  - The session hook refuses inline interpreters, so the nine ad-hoc checks are scripts in the session scratchpad. Each one prints its own source into its record.
  - Some reads ran outside the tool, all read-only:
    - file reads;
    - git status, log, diff, tag and for-each-ref while orienting;
    - a count of tracked files by extension;
    - a read of the bundle around the string `SharedWorker`;
    - two listings of the system temp folder, for hush-audit* and hush-release*. The dry run had removed its release clone.
  - Every fact below is in a record, except the observations named where they are used.
- **One run produced no record.** My first visitor-page run was cut short by my own output pipe before evidence.mjs wrote its record. The rerun is A3-visitor-page.1. There are no void records.
- **Changes in the repo,** all under build/evidence/audit/:
  - 58 new A3-* records;
  - deploy/deploy.json and deploy/ship-gate.json, overwritten by the mandated `--out`. Audit 2's versions stay in history;
  - deploy-dirty/deploy.json, rewritten with the same bytes, so it is not in the diff.
- check-public is clean on the tree with all of these included (1,326 files; A3-check-public-tree-close). No other tracked file changed (A3-diff-final, A3-status-close).
- The probes rebuilt dist/, which is ignored. The asset index-BuxHFNVv.js is byte-identical to what the dry run's gh-pages received.
- **Outside the repo:**
  - a local bare remote, hush-audit3-remote.git, in the system temp folder;
  - the nine scratch scripts in the session scratchpad;
  - the deploy controls' throwaway folders in the system temp folder. They make temp copies and never remove them (tests/controls/control-copy.mjs:29, :54; tests/controls/deploy.test.mjs:17).
- Towards GitHub I only read: `git ls-remote`, `gh repo view` and `gh issue|pr|release list`.
- Nothing is BLOCKED. Every check ran on this machine.

**Severity rule** (the reviews' rule, applied to this surface as in audits 1 and 2)
- **BLOCKER:** private data or a secret in what becomes public; a publication that would go wrong at preview; or a red mandated check.
- **MAJOR:** a guard of the new surface whose core job has no runnable test, so a mutation of it survives every test that exists.
- **MINOR:** a gap with a bounded effect that touches nothing as it stands.
- **NOTE:** observed, with no action needed, or not reachable.

**In short**
- **Every mandated probe passes:**
  - every ref's history is public-safe, and GitHub holds exactly what was scanned;
  - no tracked file holds a secret or personal data;
  - every pin is exact, the lockfile is committed, and `npm audit --omit=dev` finds 0;
  - the only install script belongs to an expected package, and there is no template telemetry;
  - the page reaches only its own origin and stores nothing;
  - the flash probe passes;
  - LICENSE, the Source link, the notice and the calibration line are exactly as the Handoff spells them;
  - every commit and tag carries only the repo's noreply identity;
  - the dry run published in order from a clean clone, with X1 to X10 all green, and it refused a modified tracked file.
- **VERIFY-MINOR1, judged:** all 8 deploy controls pass at HEAD on this run, but two of them finish within 6 to 7% of their time limits. The fault is real and only that: MINOR 1.
- No BLOCKER and no MAJOR. One MINOR and five NOTEs follow.

## The mandate, item by item

### History and the remote
- `npm run check:public -- --history` is clean over every ref (A3-check-public-history):
  - 6 refs: main, origin/HEAD, origin/main, origin/gh-pages, hush-v1-rc1 and HEAD;
  - 140 commits, 713 trees and 1,734 blobs;
  - the owner's denylist (4 names) plus 1 machine name.
- **Local refs** (A3-refs):
  - main is at 2055e5b, origin/main at f2f032e and origin/gh-pages at a2994ab;
  - hush-v1-rc1 is an annotated tag (967ae55) pointing at c9ce724;
  - there is no other ref, stash or notes.
- **GitHub** holds exactly those objects (A3-ls-remote): main f2f032e, gh-pages a2994ab and hush-v1-rc1 967ae55. So the scan covered everything that is public.
  - f2f032e is an ancestor of HEAD (A3-ancestor), so the next push of main is a fast-forward.
  - published gh-pages is one parentless commit by the noreply identity, holding .nojekyll, THIRD-PARTY-NOTICES.txt, the rc1 asset and index.html. It has no CNAME (A3-origin-pages-tree, A3-origin-pages-log).
- **The GitHub repo** is public (A3-gh-repo, A3-gh-issues, A3-gh-prs, A3-gh-releases):
  - its licence is detected as AGPL-3.0;
  - the wiki is off, and issues and projects are on;
  - it has no issue, pull request or release.
- **My own scan of every object** (A3-history-scan, A3-history-hits):
  - 2,588 objects: 140 commits, 1 tag, 713 trees and 1,734 blobs. No body holds a NUL, so every one was read whole.
  - The noreply identity appears 681 times.
  - No user path and no private IPv4 address.
  - **Two email hits.** Both are the third-party addresses that public-patterns masks by hash (`THIRD_PARTY_EMAIL_HASHES`). They sit in rc1's gh-pages notices file and its bundle.
  - **Seven token-shaped hits.** Each is a 10- or 11-character literal prefix inside a pattern's source: three versions of tools/public-patterns.mjs, and audit 2's grep-secrets and history-scan records. These are false positives.

### Tracked files
- **1,270 files are tracked** (A3-ls-files): 1,064 .txt, 100 .mjs, 35 .ts, 31 .json, 20 .md and a few config files. There is no image, audio, archive or binary (A3-tracked-extensions).
- check-public's tree mode is clean (A3-check-public-tree, -final, -close).
- **My own greps over the tracked files:**
  - Secret-shaped strings: two hits, both audit 2's own grep pattern quoted in its records' command lines (A3-grep-secrets).
  - User paths: none (A3-grep-userpaths, exit 1).
  - Email addresses: only the noreply identity, 399 times (A3-grep-emails).
  - Sensitive file names: the only match is a record named for its search, A2-grep-secrets.1.txt (A3-sensitive-names).
- .npmrc holds four settings and no token: ignore-scripts, save-exact, engine-strict and fund=false (A3-lockfile).

### Supply chain
- **Pins** (A3-lockfile):
  - 4 dependencies and 7 dev dependencies, each pinned to an exact version, each equal to the lockfile's root entry and its locked version;
  - engines, .nvmrc and the node in use are all 24.18.0.
- **Lockfile** (A3-lockfile):
  - package-lock.json (lockfileVersion 3) is tracked and equals HEAD;
  - all 227 entries come from registry.npmjs.org with sha512 integrity. There is no link, git or file source.
  - The dry run's `npm ci` in a fresh clone succeeded.
- **Audit:** `npm audit --omit=dev` finds 0 vulnerabilities (A3-npm-audit).
- **Install scripts** (A3-lockfile):
  - The lockfile flags only fsevents: a dev-only, optional, macOS-only package.
  - No installed manifest has a preinstall, install or postinstall script. 15 packages carry `prepare`, which npm never runs for registry tarballs.
  - ignore-scripts=true is set, and probe-supply's allowlist is exactly fsevents.
- **Template telemetry** (A3-telemetry):
  - In node_modules and dist (8,054 files): no file named log.js and no "gryzor".
  - There is no root log.js, no npm script naming either, no tracked log.js, and index.html has one module script.
  - In history: no path named log.js. "gryzor" appears in 4 blobs, all the audits' own reports and records of this same search (AUDIT-1.md, AUDIT-2.md, A-supply-extra.1.txt, A2-telemetry.1.txt).
- **probe:supply** passes all 7 rows (A3-probe-supply). The notices row confirms that THIRD-PARTY-NOTICES.txt names the 62 runtime packages with their licences.

### The page: network, storage, Strudel, keys and the AudioContext
- **The playthrough** `node tools/probe-play.mjs --check console,play,text,network,storage` passes (A3-probe-play-network):
  - 3 requests, all to the page's own origin, and nothing stored;
  - zero console or page errors;
  - all 11 rooms cleared by witness;
  - the card's line "run 0:59 · deaths 0" shows with no page flag.
- **The built page as a visitor gets it,** with no ?probe, for about 45 s (A3-visitor-page). It used probe-lib's own server and collectors. I booted it, pressed Escape, then Space, left the calibration untouched until it handed over, then pressed 30 mapped keys.
  - **Network:** 3 requests: the page, its script and one blob: worker. All are on its own origin, and there were no network violations. Every hooked API was called zero times: fetch, XMLHttpRequest, sendBeacon, window.open, requestMIDIAccess, getUserMedia and enumerateDevices.
  - **Storage:** nothing at all: no cookie, nothing in either storage, IndexedDB, Cache Storage, a service worker or the private file system.
  - **AudioContext:** none at boot or after Escape. Exactly one, created on Space with transient user activation, and still only one after 30 more keys (src/main.ts:62-67, src/audio/engine.ts:93-97).
  - **No test API:** window.__hush stays undefined.
  - **Errors:** zero console, page, failed-request or ≥400 errors.
- **The bundle** (A3-bundle-scan):
  - dist holds index.html, assets/index-BuxHFNVv.js and THIRD-PARTY-NOTICES.txt.
  - The bundle names no WebSocket, EventSource, RTCPeerConnection, service-worker registration, sendBeacon, storage write, indexedDB.open, cookie write, WebTransport or `window.open(` call.
  - Its two `import(` strings are acorn and escodegen parser text.
- **Runtime Strudel loads nothing from the network:**
  - Strudel is bundled (src/audio/engine.ts:7).
  - The track is music/area1.strudel, bundled raw at build time, synth-only, with no samples call. It is transpiled and run inside a scope (src/audio/track.ts:35-38).
  - Sounds play through `S.superdough` on the engine's own transport (src/audio/engine.ts:64).
- **What changed since audit 2's head** (A3-surface-diff-since-audit2, A3-probe-lib-diff):
  - index.html gained the calibration line;
  - main.ts and keys.ts gained play again and the line's hiding;
  - probe/api.ts changed;
  - probe-lib changed only its text predicates, and probe-play's network and storage rows are unchanged;
  - deploy.mjs, check-public, public-patterns, identity, evidence, notices, probe-supply, the lockfile, .npmrc, LICENSE and the deploy controls are byte-identical to audit 2's head.

### Flashing
- `npm run probe:flash` passes (A3-probe-flash):
  - 10,419 frames over 174.0 s, with a median frame interval of 15.72 ms;
  - general flashes reach at most 6,803 canvas px and red flashes 0, against the 25,600 px limit.
- The three calibration runs:
  - **Untouched:** 22.5 s up, 24 clicks, 4 count-in fills and 24 rings; values 0 0; Escape ignored; 24 of 24 click starts on their marks.
  - **Tapped:** values 0.0 40.1, equal to the taps' own.
  - **Fallback:** values 0.0 34.5, equal to the taps' own.

### Licence, link, notice and line (the Handoff, section 18)
- LICENSE is the GNU AGPL v3 text: 34,523 bytes, sha256 0d96a4ff…, equal to probe-supply's AGPL_SHA256 (A3-license-page).
- package.json and the README both say AGPL-3.0-or-later.
- **Three copies of the page match the Handoff exactly:** index.html, dist/index.html and the dry run's gh-pages index.html (A3-license-page, A3-pages-index). In each:
  - the title is `The Hush`;
  - the footer items are exactly, in order:
    - `<span id="calibration">Press any key, then tap along with the beat to set your timing.</span>`;
    - `<a href="https://github.com/pretending2bejhon/hush">Source (AGPL-3.0)</a>`;
    - `<span>Music engine: Strudel, AGPL-3.0-or-later</span>`;
    - an empty `<output id="playtest" hidden>`;
  - #calibration is in #7fd6ff;
  - the body holds only div#game besides the footer.
- **In the browser** (A3-visitor-page):
  - At boot the line shows first, in rgb(127, 214, 255), beside the link and the notice.
  - Once the untouched calibration handed over, the line was hidden, and it stayed hidden through 30 more keys.
  - #game holds only the canvas and no text.
- probe-play's text check agrees from the hand-over through the card (A3-probe-play-network).

### Identities
- In the repo (A3-identities):
  - the local git config identity equals tools/identity.mjs's REPO_NAME and REPO_EMAIL, and it is a GitHub noreply address;
  - all 140 commits on every ref are authored and committed by it, with 0 mismatches;
  - hush-v1-rc1 is annotated, and its tagger matches;
  - there are no lightweight tags.
- On the dry run's bare remote: all 140 commits and the annotated fixture tag carry the same identity, with 0 mismatches (A3-identities-remote, A3-remote-tag, A3-remote-pages-commit).
- check-public's history mode, which checks every author, committer and tagger line, agrees.

### The deploy
- I read tools/deploy.mjs whole.
- **The dry run exited 0 in 17 min 30 s** (A3-deploy-dry-run). The command was `node tools/deploy.mjs --dry-run --candidate 2055e5b22a468f6050fae0faf4022a7c4f593074 --remote <a local bare remote in the system temp folder> --out build/evidence/audit/deploy/`.
  - It refuses any remote but an existing local bare repository (:124). It refuses a modified tracked file before it clones (:125-126).
  - It cloned the source with --no-checkout and --no-hardlinks, then checked out the candidate. It set and asserted the noreply identity in the clone (:139-146) and in the pages worktree (:176-177).
  - It ran npm ci and the build in the clone (:147-153). spec-content --tree and protect --check were green.
  - **X1 to X10 were recorded, every row green** (deploy/ship-gate.json, digest aa2bbe57):
    - X1, X2, X3, X5, X6, X8, X9 and X10 ran in the clone, X3 on seed 2854993495 (the digest's first 8 hex) with --kick;
    - X4 and X7 come from VERIFY's perf and av JSONs, held to this digest by PERF_OK and AV_OK (tools/ship-gate.mjs:250-260). X7 runs `npm run test:av` first (:279-282).
  - check-public --history was clean over main, the tag and gh-pages: 3 refs, 140 commits, 713 trees and 1,734 blobs (deploy/deploy.json).
- **The bare remote afterwards** (A3-remote-refs, A3-remote-tag, A3-remote-pages-commit, A3-remote-check):
  - It holds exactly three refs:
    - refs/heads/main, at the candidate;
    - refs/tags/hush-dryrun-2055e5b2, annotated, pointing at the candidate;
    - refs/heads/gh-pages, at f468ab3.
  - **Push order:** the ref files were written main first, then the tag 255 ms later, then gh-pages 607 ms after main. The remote uses files ref storage, with no packed-refs.
  - **Only dist was published:**
    - gh-pages is one parentless commit by the noreply identity;
    - its tree is index.html, assets/index-BuxHFNVv.js and THIRD-PARTY-NOTICES.txt, each byte-identical to the local build of the same commit, plus an empty .nojekyll;
    - there is no CNAME, and the build meta names the candidate.
- **A modified tracked file is refused.** After the dry run, its own two `--out` records were modified tracked files. A second dry run then stopped with "the source tree is dirty" before cloning, exit 1 (A3-deploy-dirty, deploy-dirty/deploy.json). The remote's refs were unchanged (A3-remote-refs-after-dirty).
- **Never a force push:**
  - the three pushes are plain refspecs, with no `+` and no --force (:195-196);
  - the new gh-pages commit must extend the remote's (:187).
- **D15's controls pass 8 of 8 at HEAD on this run:**
  - six cases together in 425 s (A3-deploy-controls-refusals): a modified tracked file; the CRLF room and README plus a private path in a commit body; a diverged remote main that is never forced; a non-bare or URL remote; an rc digest that differs from its HUSH-SHIP-GATE line; an untracked file or an older rc tag;
  - the email in an annotated tag's message, in 282 s against a 300 s limit (A3-deploy-control-tag-email);
  - publish in order and extend gh-pages without force, in 559 s against 600 s (A3-deploy-control-publish).

## Findings

### MINOR 1. The deploy controls' time limits leave almost no headroom (VERIFY-MINOR1, confirmed)
- **Where:** tests/controls/deploy.test.mjs:16 (`const T = 300000;`). It applies at :65 (`T * 2`) and :75, :91, :101, :118, :131, :146, :159.
- **Failing path:** `npx vitest run tests/controls/deploy.test.mjs`. Three cases run a full dry run with the X1 to X10 gate in the control copy (:31-65, :93-101, :103-118).
- **Triggering input:** a machine where one dry run of the control copy takes over 300 s, or two take over 600 s. VERIFY's run did: 1030 s, 518 s and 522 s (build/evidence/verify/deploy-controls.2.txt). vitest then reports a timeout although every assertion held, and the file exits 1.
- **On this run** the same cases passed in 282 s and 559 s, with 6% and 7% headroom. The verdict of D15's control depends on how fast the machine is that day.
- **Why it matters:** while the file is red by timeout, a mutation of deploy.mjs (gh-pages pushed first, a `+` refspec) changes only the failure's message, not the verdict.
- **Why it is not MAJOR:**
  - deploy.mjs and the control file are byte-identical to audit 2's head, where all 8 cases passed, and all 8 pass here (A3-surface-diff-since-audit2);
  - the mandated dry run shows the order, the identity, the dist-only publication and the dirty refusal directly.
- Spec section 15 also says each control file runs "under ten minutes". This one takes about 21 minutes in total.
- **Minimal fix:** raise T to cover a full gate run with margin, for example 1,800,000 ms per case with `T * 2` for the two-run case, and correct section 15's parenthetical for this file.
- **Kind:** mechanical.

### NOTE 1. The deploy reads its identity from git config only (carried from audits 1 and 2)
- **Where:** tools/deploy.mjs:68-78.
- GIT_AUTHOR_* or GIT_COMMITTER_* in the environment would override that identity on the gh-pages commit and on a tag.
- The pre-push scan (:191-193) checks every identity line and would refuse, so nothing would leak. In this run every pushed object carried the noreply identity.
- **Kind:** mechanical, optional: also refuse when any of those variables is set.

### NOTE 2. Dev-only advisories (carried, now wider)
- `npm audit` including dev dependencies reports two highs and exits 1 (A3-npm-audit-all):
  - source-map-js 1.2.1 (GHSA-68fv-2mgg-jv7q);
  - newly, vite 8.3.1 itself: three launch-editor advisories in the dev server's open-in-editor (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm), fixed in vite 8.3.4.
- Nothing from either ships:
  - `--omit=dev` finds 0;
  - package.json has no dev-server script;
  - the build makes no source map;
  - the probes and the deploy serve dist with their own server.
- **Kind:** mechanical, when convenient. Bump the exact vite pin and the lockfile in the next product cycle, since the change re-rolls the digest.

### NOTE 3. Mapped keys are prevented whatever the modifiers (carried)
- **Where:** src/input/keys.ts:29-30, as the spec specifies.
- While the page has focus, browser shortcuts on mapped codes are swallowed and also count as game input. Examples are Alt+ArrowLeft, Ctrl+D, Ctrl+S and Ctrl+A.
- Tab, F5 and Escape pass, so the Source link stays reachable by keyboard.
- No key data is stored or sent.
- **Kind:** design. This is the owner's call.

### NOTE 4. The bundle names code paths it never runs
- The bundle names 7 origins (A3-bundle-scan): phaser.io, w3.org, dollchan.net, raw.githubusercontent.com, localhost, shabda.ndre.gr and github.com.
- It also holds Strudel's MIDI, microphone, sample-fetch and SharedWorker-clock code.
- The visitor run counted zero calls of each hooked API, and every probe saw only the page's own origin.
- The SharedWorker sits in Strudel's own scheduler, which the engine does not use. This is an observation from a raw read of the bundle.
- R9's MINOR 10 (X10 cannot see a SharedWorker) already carries the probe-side gap.

### NOTE 5. The live site is still rc1's page
- origin/gh-pages (a2994ab) serves an index.html without the calibration line (A3-license-page). The Handoff gained that line by the owner's ruling N-F1 c, after rc1.
- The dry run's gh-pages carries the amended footer exactly. The next rc's deploy makes it live, and X12's `npm run probe:live` after that preview reads it.
- No action needed.

## Files
- **Evidence,** all in build/evidence/audit/, each at .1:
  - **integrity:** A3-head, A3-digest, A3-status, A3-head-final, A3-digest-final, A3-diff-final, A3-status-final, A3-check-public-tree-final, A3-head-close, A3-check-public-tree-close, A3-status-close, A3-surface-diff-since-audit2, A3-probe-lib-diff;
  - **history and remote:** A3-refs, A3-remote-v, A3-ls-remote, A3-ancestor, A3-check-public-history, A3-history-scan, A3-history-hits, A3-gh-repo, A3-gh-issues, A3-gh-prs, A3-gh-releases, A3-origin-pages-tree, A3-origin-pages-log;
  - **tracked files:** A3-ls-files, A3-check-public-tree, A3-grep-secrets, A3-grep-userpaths, A3-grep-emails, A3-sensitive-names, A3-tracked-extensions;
  - **supply chain:** A3-lockfile, A3-npm-audit, A3-npm-audit-all, A3-telemetry, A3-probe-supply;
  - **page:** A3-probe-play-network, A3-visitor-page, A3-bundle-scan, A3-probe-flash, A3-license-page;
  - **identities:** A3-identities, A3-identities-remote;
  - **deploy:** A3-bare-remote, A3-bare-remote-refs-before, A3-deploy-dry-run, A3-remote-refs, A3-remote-tag, A3-remote-pages-commit, A3-remote-check, A3-pages-index, A3-deploy-dirty, A3-remote-refs-after-dirty, A3-deploy-controls-refusals, A3-deploy-control-tag-email, A3-deploy-control-publish;
  - **records:**
    - deploy/deploy.json and deploy/ship-gate.json, written by the mandated `--out`;
    - deploy-dirty/deploy.json, the refusal's record, the same bytes as audit 2's.
- **Outside the repo:**
  - hush-audit3-remote.git in the system temp folder, which holds the dry run's main, fixture tag and gh-pages;
  - nine scripts in the session scratchpad: lockfile, telemetry, history-scan, hit-check, identities, visitor-page, license-page, bundle-scan and remote-check, each .mjs;
  - the controls' throwaway folders in the system temp folder.
