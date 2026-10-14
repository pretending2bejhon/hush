HUSH-AUDIT: PASS (head=ddc6665fb78877c861086e6c20b5dffb42895534 digest=81a1d6cc2560d24e1f8b93daf725980262ada7b898d9552af9b9cafa6e3a9d58 blockers=0 majors=0 minors=0)

Auditor, audit 2, Opus standing in for Fable, 2026-10-14. I probed only the new surface:
- the public repo and its history;
- the npm supply chain;
- the static page: what it loads, what it stores, its keys and AudioContext, and how it flashes;
- the licence texts and the git identities;
- the deploy.

**Integrity of the audit**
- HEAD and the digest were the same at the start, after the probes and at the end (A2-head, A2-digest, A2-head-after, A2-digest-after, A2-head-final, A2-digest-final).
- I did not read or record the machine's process sample. I ran no perf or av probe: X4 and X7 come from VERIFY's records.
- Every command ran from the repo root as `node tools/evidence.mjs <check> audit -- <cmd>`. Some reads ran outside the tool, all read-only:
  - file reads, plus git status, diff and config while orienting;
  - a raw git grep;
  - a look at the bundle around two strings it counts;
  - a listing of the system temp folder.

  Every fact used below is in a record, except two observations named where they are used.
- The only change in the repo is under build/evidence/audit/:
  - 60 new A2-* records and deploy-dirty/deploy.json;
  - deploy/deploy.json and deploy/ship-gate.json, which the mandated `--out` overwrote. These were audit 1's tracked records, and audit 1's versions stay in history.

  check-public is clean on the tree with all of them included (1,093 files; A2-check-public-tree-final). No other tracked file changed (A2-status-final).
- The mandated `npm run probe:*` scripts rebuilt dist/ (ignored) with the same bytes. The asset is still index-Dqh8GbB8.js, the same file gh-pages received.
- Outside the repo there are only two things: a local bare remote under the system temp folder (A2-bare-remote), and one scratch script (visitor-page.mjs) in the session scratchpad.
- Towards GitHub I only read: `git ls-remote`, `gh repo view` and `gh issue|pr|release list`.
- Nothing is BLOCKED: every check ran on this machine.

**Severity rule** (the reviews' rule, applied to this surface)
- **BLOCKER:** private data or a secret in what becomes public; a publication that would go wrong at preview; or a red mandated check.
- **MAJOR:** a guard of the new surface whose core job has no runnable test, so a mutation of it survives every test that exists.
- **MINOR:** a gap with a bounded effect that touches nothing as it stands.
- **NOTE:** observed, with no action needed, or not reachable.

**In short**
- **Every mandated probe passes:**
  - the history of every ref is public-safe, and GitHub holds nothing beyond it;
  - no tracked file holds a secret or personal data;
  - the pins, the committed lockfile and `npm audit --omit=dev` are clean;
  - the only install script comes from an expected package, and there is no template telemetry;
  - the page reaches only its own origin and stores nothing;
  - the flash probe passes;
  - LICENSE, the link and the notice are as the Handoff spells them;
  - every commit and tag carries only the repo's noreply identity;
  - the dry run published as D15 says, with X1 to X10 all green.
- **Audit 1's findings held at HEAD.** All 8 D15 controls now run and pass (audit 1's MAJOR 1), and the fixes for its four MINORs are in place.
- No BLOCKER, MAJOR or MINOR. Five NOTEs follow.

## The mandate, item by item

### History and the remote
- `npm run check:public -- --history` is clean over every ref (A2-check-public-history):
  - refs: main, origin/main and HEAD;
  - 117 commits, 601 trees and 1,391 blobs;
  - the owner's denylist (4 names) plus 1 machine name.
- The repo has no other ref: no tag, stash or notes (A2-refs).
- GitHub holds only main, at f477989, which is an ancestor of HEAD. There is no tag and no other branch (A2-remote-v, A2-ls-remote, A2-ancestor).
- The GitHub repo is still private. It has no issue, pull request or release, and its wiki is off (A2-gh-repo, A2-gh-issues, A2-gh-prs, A2-gh-releases).
- I also scanned all 2,109 history objects myself (A2-history-scan):
  - no body holds a NUL, so every one was read whole as text;
  - the only email address is the repo's noreply identity;
  - there is no Windows or Unix user path and no private IPv4 address;
  - there are three token-pattern hits. All three are the literal prefix in tools/public-patterns.mjs's own token regex, in three versions of that file: a false positive.

### Tracked files
- 1,033 files are tracked (A2-ls-files). check-public's tree mode is clean (A2-check-public-tree).
- I grepped every tracked file myself:
  - no secret-shaped token or auth setting (A2-grep-secrets, exit 1: no match);
  - no raw drive-letter or Unix user path (A2-grep-userpaths, exit 1: no match);
  - the only email address is the repo's noreply identity, 198 times (A2-grep-emails).
- .npmrc holds four settings and no token: ignore-scripts, save-exact, engine-strict and fund=false.

### Supply chain
- **Pins:** package.json pins 4 dependencies and 7 dev dependencies, each to an exact version. Each equals both the lockfile's root entry and its locked version (A2-lockfile).
- **Lockfile:** package-lock.json (lockfileVersion 3) is tracked. Its 227 entries all come from registry.npmjs.org with integrity, with no link, git or file source (A2-lockfile).
  - The deploy's `npm ci` in a fresh clone succeeded, which shows the lockfile agrees with package.json (A2-deploy-dry-run).
- **Audit:** `npm audit --omit=dev` finds 0 vulnerabilities (A2-npm-audit).
- **Install scripts:** the lockfile flags only fsevents, which is dev-only, optional and for macOS. .npmrc keeps ignore-scripts=true, and probe-supply's install-scripts row agrees (A2-lockfile, A2-probe-supply).
- **Template telemetry** (A2-telemetry, A2-telemetry-blobs, A2-telemetry-blobs2):
  - there is no root log.js, no file named log.js in node_modules or dist (8,054 files read), and no npm script names log.js;
  - "gryzor" appears in no file of node_modules or dist;
  - in history it appears in exactly two blobs, both audit 1's own report of the same search (build/reviews/AUDIT-1.md and A-supply-extra.1.txt).
- **Notices:** THIRD-PARTY-NOTICES.txt names all 76 runtime entries of the lockfile (A2-notices-coverage), and probe-supply's notices row passes.

### The page: network, storage, Strudel, keys and the AudioContext
- `npm run probe:supply` passes on all 7 rows (A2-probe-supply). Its rows are lockfile, pins, audit, licence, install scripts, notices, and network and storage.
- `node tools/probe-play.mjs --check console,play,text,network,storage` passes (A2-probe-play-network):
  - 3 requests, all to the page's own origin, and nothing stored;
  - zero console or page errors;
  - all 11 rooms cleared by witness, and the ending's texts read.
- The rows now see what audit 1's MINOR 1 said they missed (tools/probe-lib.mjs):
  - WebSocket URLs and service-worker requests are logged (:120-121);
  - every RTCPeerConnection is refused and counted (:103-113, :431-436);
  - service-worker registrations and the private file system are read as storage (:411-425).
- I also ran the built page as a visitor gets it, with no ?probe, for about 40 s: boot, Escape, then Space, then 30 more presses (A2-visitor-page). It used probe-lib's own server and collectors.
  - **Network:** the only requests were the page, its script and one blob: URL, all on its own origin. No fetch, XMLHttpRequest, sendBeacon, window.open, MIDI, getUserMedia or enumerateDevices call was made.
  - **Storage:** nothing was stored: no cookie, nothing in either storage, IndexedDB, Cache Storage, a service worker or the private file system.
  - **AudioContext:** none existed at boot or after Escape. Exactly one was created, inside the Space keydown handler, with transient user activation (src/main.ts:46-51, src/audio/engine.ts:95-97).
  - **No test API:** nothing from the probe was installed on window.
  - **Errors:** there were zero console or page errors.
- **The bundle** (A2-bundle-scan):
  - It names no WebSocket, EventSource, RTCPeerConnection, service-worker registration, sendBeacon, requestMIDIAccess, localStorage write, indexedDB.open or cookie write.
  - It names 7 absolute origins as strings, which the page never contacts (see NOTE 4).
  - Its two `import(` strings are parser text from acorn and escodegen, not dynamic imports. This is an observation from a raw read of the bundle.
- The product itself has not changed since audit 1's head: src, index.html, music, package.json, the lockfile, .npmrc and LICENSE are all the same (A2-product-diff-since-audit1).

### Flashing
- `npm run probe:flash` passes (A2-probe-flash):
  - 11,782 frames over 196.8 s, with a median frame interval of 15.75 ms;
  - general flashes reach at most 9,671 canvas px, and red flashes 0, against the 25,600 px limit.
- The three calibration runs:
  - **Untouched:** 48 clicks, 8 count-in fills and 48 rings; values 0 0; Escape ignored.
  - **Tapped:** values 5.5 34.5, equal to the taps' own.
  - **Retried:** values 5.6 34.5, equal to the taps' own.
  - Every click started on its mark: 48 of 48, 24 of 24 and 48 of 48.

### Licence, link and notice (the Handoff)
- LICENSE is the GNU AGPL v3 text: 34,523 bytes, with the sha256 that probe-supply checks (A2-license-page).
- package.json and the README both say AGPL-3.0-or-later.
- index.html, and the index.html that gh-pages received, both carry exactly what the Handoff spells (A2-license-page, A2-pages-index):
  - the title `The Hush`;
  - the link `Source (AGPL-3.0)`, to the repo URL the Handoff names;
  - the notice `Music engine: Strudel, AGPL-3.0-or-later`;
  - an empty `<output id="playtest" hidden>`.
- **In the browser without ?probe** (A2-visitor-page):
  - the body holds only div#game and the footer;
  - the three footer items are exactly those above;
  - #game holds the canvas and no text.
- probe-play's text row agrees through the ending (A2-probe-play-network).

### Identities
- I checked every ref against `git config user.email` and user.name in the repo's local config (A2-identities):
  - tools/identity.mjs's REPO_NAME and REPO_EMAIL equal that config identity;
  - the email is a GitHub noreply address;
  - all 117 commits on every ref are authored and committed by it, with 0 mismatches;
  - the repo has no tag, annotated or lightweight.
- On the dry run's bare remote, all 118 commits and the one annotated tag (the fixture tag) carry the same identity, with 0 mismatches (A2-identities-remote, A2-remote-tag).
- check-public's history mode, which checks every author, committer and tagger line, agrees.

### The deploy
- I read tools/deploy.mjs whole.
- **The dry run exited 0 in 15 min 42 s** (A2-deploy-dry-run). The command was `node tools/deploy.mjs --dry-run --candidate ddc6665fb78877c861086e6c20b5dffb42895534 --remote <a local bare remote under the system temp folder> --out build/evidence/audit/deploy/`.
  - It refused any remote but an existing local bare repository, before anything ran (:124).
  - It cloned the source with --no-checkout and checked out the candidate. It set and asserted the noreply identity in the clone (:137-146), then ran npm ci and the build there (:147-153).
  - spec-content --tree and protect --check were green.
  - **X1 to X10 were recorded, every row green** (deploy/ship-gate.json, digest 81a1d6cc):
    - X1, X2, X3, X5, X6, X8, X9 and X10 ran in the clone, X3 on seed 2174867148 (the digest's first 8 hex);
    - X4 and X7 were read from VERIFY's perf and av JSONs at this digest, and X7 also ran `npm run test:av` in the clone.
  - check-public --history was clean over main, the tag and gh-pages: 3 refs, 118 commits, 603 trees and 1,395 blobs.
  - It then pushed main, the tag and gh-pages.
- **The bare remote afterwards** (A2-remote-refs, A2-remote-tag, A2-remote-pages-commit, A2-pages-ls-tree, A2-pages-parents, A2-local-dist-hashes, A2-push-order, A2-pages-index):
  - It holds exactly refs/heads/main (the candidate), refs/tags/hush-dryrun-ddc6665f (annotated, pointing at the candidate) and refs/heads/gh-pages.
  - **Push order:** the ref files were written main first, then the tag 384 ms later, then gh-pages 748 ms after main.
  - **gh-pages** is a single parentless commit by the noreply identity. Its tree is index.html, THIRD-PARTY-NOTICES.txt and assets/index-Dqh8GbB8.js, each byte-identical to the local build of HEAD, plus an empty .nojekyll. There is no CNAME, and the build meta names the candidate.
- **A modified tracked file is refused.** After the dry run, its own two `--out` records were modified tracked files. A second dry run then stopped with "the source tree is dirty" before cloning, exit 1, nothing pushed (A2-deploy-dirty, deploy-dirty/deploy.json).
- **Never a force push:**
  - the three pushes are plain refspecs, with no `+` and no --force (:195-196);
  - the new gh-pages commit must extend the remote's (:187).
- **D15's controls, all 8, pass at HEAD:**
  - the four refusals, in 32.7 s (A2-deploy-controls-refusals): a modified tracked file; a non-bare or URL remote; an rc digest that differs from its HUSH-SHIP-GATE line; an untracked file or an older rc tag before a release;
  - a diverged remote main, in 129 s (A2-deploy-control-no-force): the push is rejected and the remote main is unchanged;
  - the other three, in 514 s (A2-deploy-controls-publish): publishing in order with a second run that extends gh-pages without force; the CRLF room and README plus a private path in a commit body; an email in an annotated tag's message.
- The dry run wrote nothing into the source tree except its `--out` records (A2-status-final).

## Findings
None at BLOCKER, MAJOR or MINOR.

### NOTE 1. The deploy reads its identity from git config only (carried from audit 1)
- **Where:** tools/deploy.mjs:74-78.
- GIT_AUTHOR_* or GIT_COMMITTER_* in the environment would override that identity on the gh-pages commit and on a tag.
- The pre-push scan (:191-193) checks every identity line on main, the tag and gh-pages, and would refuse. Nothing would leak.
- In this run every pushed object carried the noreply identity.
- **Kind:** mechanical, optional: also refuse when any of those variables is set.

### NOTE 2. A dev-only advisory remains (carried from audit 1)
- `npm audit` including dev dependencies reports one high: source-map-js 1.2.1, reached through vite 8.3.1 and postcss 8.5.28 (GHSA-68fv-2mgg-jv7q, a denial of service on crafted source maps). The audit exits 1 (A2-npm-audit-all, A2-npm-ls-source-map-js).
- It is dev-only. The build makes no source map, and nothing from it ships.
- **Kind:** mechanical, when convenient: bump the exact pins once a vite or postcss release carries a fixed source-map-js.

### NOTE 3. Mapped keys are prevented whatever the modifiers
- **Where:** src/input/keys.ts:29-30, as the spec specifies (HUSH-SPEC.md:822).
- By reading, not tested in a browser: while the page has focus, browser shortcuts on mapped codes are swallowed and also count as game input. Examples are Alt+ArrowLeft (back), Ctrl+D, Ctrl+S, Ctrl+A, Ctrl+C and Ctrl+X.
- Tab, F5 and Escape are unmapped, so they pass, and the Source link stays reachable by keyboard.
- No key data is stored or sent.
- **Kind:** design, spec-owned. This is the owner's call.

### NOTE 4. The bundle names hosts it never contacts
- The 7 origins named as strings (A2-bundle-scan):
  - Phaser's banner URL and w3.org namespaces;
  - Strudel's sample-loader hosts, raw.githubusercontent.com and shabda.ndre.gr;
  - a localhost default, dollchan.net and github.com.
- The track uses only built-in synths, and every probe saw only the page's own origin.
- A track change that loads samples would reach another origin, and X10's network row would catch it.

### NOTE 5. Test runs leave temp folders
- The D15 controls and the test suites leave throwaway hush-* folders in the system temp folder, control copies of the repo among them.
- This is an observation from a listing, outside the tool. Nothing lands in the repo.
- Time metadata (UTC offsets and hours worked) stays public by design in commits, tags and records (carried from audit 1).

## Void records
- **A2-grep-paths.1:** superseded by A2-grep-userpaths.1. Its pattern also matched the `<home>` placeholder that the evidence tool itself writes into committed records, so its hits are redaction tokens, not paths.

## Files
- **Evidence**, all in build/evidence/audit/, each at .1:
  - **integrity:** A2-head, A2-digest, A2-status, A2-head-after, A2-digest-after, A2-status-after, A2-check-public-tree-after, A2-head-final, A2-digest-final, A2-status-final, A2-check-public-tree-final;
  - **history and remote:** A2-refs, A2-remote-v, A2-ls-remote, A2-ancestor, A2-check-public-history, A2-history-scan, A2-gh-repo, A2-gh-issues, A2-gh-prs, A2-gh-releases;
  - **tracked files:** A2-ls-files, A2-check-public-tree, A2-grep-secrets, A2-grep-paths (void), A2-grep-userpaths, A2-grep-emails;
  - **supply chain:** A2-lockfile, A2-npm-audit, A2-npm-audit-all, A2-npm-ls-source-map-js, A2-telemetry, A2-telemetry-blobs, A2-telemetry-blobs2, A2-notices-coverage, A2-probe-supply;
  - **page:** A2-probe-play-network, A2-visitor-page, A2-bundle-scan, A2-product-diff-since-audit1, A2-probe-flash, A2-license-page;
  - **identities:** A2-identities, A2-identities-remote;
  - **deploy:** A2-bare-remote, A2-deploy-dry-run, A2-remote-refs, A2-remote-tag, A2-remote-pages-commit, A2-remote-pages-tree, A2-remote-config, A2-push-order, A2-pages-index, A2-pages-ls-tree, A2-local-dist-hashes, A2-pages-parents, A2-deploy-dirty, A2-deploy-controls-refusals, A2-deploy-control-no-force, A2-deploy-controls-publish;
  - **records:** deploy/deploy.json and deploy/ship-gate.json (the mandated `--out`), and deploy-dirty/deploy.json (the refusal's record).
- **Outside the repo:**
  - a local bare remote under the system temp folder, which holds the dry run's main, fixture tag and gh-pages;
  - visitor-page.mjs in the session scratchpad;
  - the controls' throwaway folders in the system temp folder.
