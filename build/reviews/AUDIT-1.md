HUSH-AUDIT: FAIL (head=bbe7208cbf92131618d1296286078a9b897b0122 digest=6c217e01ef418ee3d2664d310528567f0c56050f1b770e7d216da73486e414ac blockers=0 majors=1 minors=4)

Auditor, audit 1, Opus standing in for Fable, 2026-10-13. I probed only the new surface:
- the public repo and its history;
- the npm supply chain;
- the static page: what it loads, what it stores and how it flashes;
- the licence texts and the git identities;
- the deploy.

**Integrity of the audit**
- HEAD and the digest were the same before and after the audit (A-head, A-digest, A-head-after, A-digest-after).
- The laptop was on AC power with energy saver off, on a 60 Hz display, with nothing heavy running (A-machine, read before the browser probes).
- Every command ran from the repo root as `node tools/evidence.mjs <check> audit -- <cmd>`. One exception: while I was orienting, before the first record, a few read-only shell reads ran outside the tool (HEAD, a status count, file listings, cat and grep of tracked files). Every fact used below was taken again through the tool.
- The only change in the repo is 51 untracked files under build/evidence/audit/, including the dry run's deploy/deploy.json and deploy/ship-gate.json.
  - check-public is clean on the tree with them included (834 files; A-check-public-tree-final).
  - No tracked file changed (A-status-final).
  - The mandated `npm run probe:*` scripts rebuilt dist/ (ignored) with the same bytes: the asset hash did not move.
- Outside the repo, everything sits in the session scratchpad under the system temp folder: the scripts, the bare remote the dry run pushed to, and four throwaway folders. The failed D15 control also left one hush-copy-* folder in the temp folder.
- Towards GitHub I only read: `git ls-remote`, `gh repo view` and `gh issue|pr|release list`.
- Nothing is BLOCKED: every check ran on this machine.

**Severity rule** (the reviews' rule, applied to this surface)
- **BLOCKER:** private data or a secret in what becomes public; a publication that would go wrong at preview; or a mandated check that is red.
- **MAJOR:** a guard of the new surface whose core job has no runnable test, so a mutation of it survives every test that exists.
- **MINOR:** a gap with a bounded effect that touches nothing as it stands.
- **NOTE:** observed, with no action needed, or not reachable.

**In short**
- **Every mandated probe passes:**
  - the history of every ref is public-safe, and GitHub holds nothing beyond it;
  - no tracked file holds a secret or personal data;
  - the pins, the lockfile and `npm audit --omit=dev` are clean;
  - no install script from an unexpected package, and no template telemetry;
  - the page reaches only its own origin and stores nothing;
  - the flash probe passes;
  - LICENSE, the link and the notice are as the Handoff spells them;
  - every commit carries the noreply identity;
  - the dry run published as D15 says, with X1 to X10 all green.
- **The MAJOR:** D15's own controls (tests/controls/deploy.test.mjs) cannot run at HEAD. Their fixture has failed at its first step since CT1 tracked the rooms. So nothing tests the deploy's refusals, and the release's refusals least of all.
- **Four MINORs.** None touches the product as it stands:
  1. X10's rows are blind to WebSockets, service workers, WebRTC and the origin-private file system.
  2. check-public cannot read UTF-16.
  3. The published bundle drops its packages' licence notices.
  4. A dry run will push to any remote it is given.

## The mandate, item by item

### History and the remote
- `npm run check:public -- --history` is clean over every ref (A-check-public-history):
  - refs: main, origin/main and HEAD;
  - 98 commits, 509 trees and 1079 blobs;
  - the owner's denylist (4 names) plus 1 machine name.
- GitHub holds only main, at f477989, which is an ancestor of HEAD. There is no tag and no other branch (A-ls-remote, A-ancestor).
- The remote-tracking reflog records six pushes. Every pushed tip is an ancestor of HEAD and none was forced, so no rewritten commit is waiting on GitHub (A-reflog, A-history-extra).
- The repo is still private. It has no issue, pull request or release, and its wiki is off (A-gh-repo, A-gh-issues, A-gh-prs, A-gh-releases).

### Tracked files
- 785 files are tracked (A-ls-files), and check-public's tree mode is clean (A-check-public-tree).
- I also ran my own scan of every blob in history and every tracked file (A-history-extra):
  - every one is UTF-8, so check-public read each of them whole (see MINOR 2);
  - no Windows account SID, private IPv4 address, MAC address, secret-looking assignment, or drive path outside the user folder;
  - the only sensitive file name is .npmrc, which holds four settings and no token.
- No spaced, dotted or hyphenated spelling of the hashed vault-root name appears in any tracked file (A-spaced-names).

### Supply chain
- **Pins:** package.json pins 4 dependencies and 7 dev dependencies. Each is exact, and each equals both the lockfile's root entry and the installed version (A-supply-extra, A-probe-supply).
- **Lockfile:** package-lock.json (lockfileVersion 3) is tracked. Its 227 entries all come from registry.npmjs.org with sha512 integrity, with no link, git or file source.
- **Installed tree:** node_modules matches the lockfile exactly: 202 packages, none mismatched, missing or extraneous.
- **Audit:** `npm audit --omit=dev` finds 0 vulnerabilities (A-npm-audit). `npm audit signatures` verifies registry signatures on 202 packages, 51 of them with attestations (A-npm-audit-signatures).
- **Install scripts:** the lockfile flags only fsevents 2.3.3, which is dev-only, optional, macOS-only and not installed here. .npmrc keeps ignore-scripts=true. Fifteen installed packages carry a `prepare` script, which npm never runs for a registry package (A-supply-extra).
- **Template telemetry:** there is no root log.js. `gryzor` appears nowhere: not in package.json, not in the 8045 files of node_modules, not in dist, and not in any blob, tree or message of the history (A-supply-extra, A-history-extra).

### The page: network, storage, Strudel and keys
- `npm run probe:supply` passes on every row (A-probe-supply).
- `node tools/probe-play.mjs --check console,play,text,network,storage` passes (A-probe-play-network):
  - 3 requests, all to the page's own origin;
  - nothing stored;
  - zero console or page errors through every room, the gauntlet and the ending.
- The rows still catch their planted faults at HEAD, 7 of 7 (A-x10-controls):
  - the clean control page passes;
  - a foreign fetch fails the network row;
  - local, session, cookie and IndexedDB writes each fail the storage row;
  - the supply probe's planted session write fails its browser row.
- My own collectors on the page as a visitor gets it (no ?probe), over about a minute: the untouched calibration, then real keys in room 1 (A-default-page):
  - The only origins were the page's own, blob: and data: (3 requests through Playwright, 8 through CDP).
  - There was no WebSocket and no service worker.
  - The page made no call of fetch, sendBeacon or XMLHttpRequest, and none that writes to a storage, IndexedDB or Cache Storage.
  - It made no call that opens a window, asks for MIDI or the microphone, or enumerates devices.
  - Escape created no AudioContext. The first other key created one inside its own keydown handler, and it was running.
  - Nothing persisted: no cookie, nothing in either storage, IndexedDB, Cache Storage, a service worker, the private file system or window.name; storage usage was 0.
  - There were zero errors.
- Strudel at runtime:
  - The track uses only built-in synths (music/area1.strudel).
  - superdough's worklets load from data: URLs.
  - The bundle names no WebSocket, EventSource, RTCPeerConnection or service worker. Its sample loaders are present but never called.
- URL flags and code paths:
  - Product code reads only `?playtest` (src/main.ts:42).
  - `?probe` is read only in the spec-owned src/probe/api.ts:989. On the live site it would install the test API for the visitor's own console only.
  - Nothing turns input into markup or code. Text is written through textContent (src/render/ending-scene.ts:72), and Function() runs only the bundled track (src/audio/track.ts:38).

### Flashing
- `npm run probe:flash` passes (A-probe-flash):
  - 11,772 frames over 196.5 s, with a median frame interval of 15.73 ms;
  - general flashes reach at most 9,609 canvas px, and red flashes 0, against the 25,600 px limit.
- The three calibration runs:
  - **Untouched:** up 43.5 s; 48 clicks, 8 count-in fills, 48 rings; values 0 0; Escape ignored; 2561 frames timed.
  - **Tapped:** values 5.6 34.5, equal to the taps' own.
  - **Retried:** values 6.8 34.5, equal to the taps' own.
  - In all three, every click started on its mark, and no page logged an error, asked another origin or stored anything.

### Licence, link and notice (the Handoff)
- LICENSE is the GNU AGPL v3 text: probe-supply's licence row checks its sha256. package.json and the README both say AGPL-3.0-or-later.
- index.html and the built dist/index.html both carry:
  - the title `The Hush`;
  - the link `Source (AGPL-3.0)`, to the repo URL the Handoff names;
  - the notice `Music engine: Strudel, AGPL-3.0-or-later`;
  - `<output id="playtest" hidden>`.
- In the browser without ?probe (A-default-page):
  - both texts sit in the footer, and nothing else shows;
  - no text sits over the canvas, and the canvas is uncovered at its four corners and its centre;
  - output#playtest is hidden and empty;
  - this holds at boot, in play, and with ?playtest at boot.
- probe-play's text row agrees through the ending.

### Identities
- All 98 commits on every ref are authored and committed by the repo's noreply identity (tools/identity.mjs), and none is signed (A-identities, A-history-extra). check-public's history mode agrees.
- No annotated tag exists, in the repo or on GitHub (A-tags, A-ls-remote). The only tag made, the dry run's fixture tag, carries that identity as its tagger (A-inspect-remote).

### The deploy
- I read tools/deploy.mjs whole.
- The dry run exited 0 in 15 min 43 s (A-deploy-dry-run). Its remote was a bare repo I created in the scratchpad (A-bare-remote), and its records went to `--out build/evidence/audit/deploy/`.
  - It cloned the candidate, set and asserted the noreply identity there, and ran npm ci and the build in the clone.
  - spec-content --tree and protect --check were green.
  - X1 to X10 were recorded, every row green (deploy/ship-gate.json). X1, X2, X3, X5, X6, X8, X9 and X10 ran in the clone; X4 and X7 were read from VERIFY's perf and av JSONs at this digest.
  - check-public --history was clean over main, the tag and gh-pages (99 commits).
  - It then pushed main, the tag and gh-pages.
- I read the bare remote afterwards (A-inspect-remote), together with the remote's own pre-receive log. I first tried that hook on a throwaway repo (A-hook-test).
  - The remote received main, then the fixture tag hush-dryrun-bbe7208c, then gh-pages: one push each, each one creating its ref.
  - main is the candidate. The tag is annotated and points at the candidate.
  - gh-pages is a single parentless commit by the noreply identity. Its tree is exactly the local build of HEAD, byte for byte, plus an empty .nojekyll. There is no CNAME, and the build meta names the candidate.
- **A modified tracked file is refused.** In a scratch clone of HEAD, an unstaged edit, a staged edit and a deleted file each stopped deploy.mjs with "the source tree is dirty": exit 1, nothing pushed (A-deploy-dirty).
- **Never a force push:**
  - the three pushes are plain refspecs, with no `+` and no --force (deploy.mjs:185-186);
  - the new gh-pages commit must extend the remote's (:177);
  - the remote logged no forced update.
- The dry run wrote nothing into the source tree except its --out records (A-status-final).

## Findings

### MAJOR 1. D15's controls cannot run at HEAD
- **Where:** tests/controls/control-copy.mjs:39-43, which collides with tools/spec-content.mjs:107.
  - This is the control §15 names for tools/deploy.mjs (HUSH-SPEC.md:1065).
  - Every case in tests/controls/deploy.test.mjs starts with makeControlCopy(): lines 30, 65, 75, 91, 101, 120 and 133.
- **Failing path:**
  1. makeControlCopy copies every file git sees (:28-35). Since CT1, that includes rooms/*.txt and music/area1.strudel.
  2. It then extracts those same files again with `spec-content.mjs --extract`, which never overwrites an existing file.
  3. The first extraction exits 1, so every case fails before deploy.mjs runs.
- **Triggering input:** any run at HEAD, on any machine. This is not an environment failure.
  - `npx vitest run tests/controls/deploy.test.mjs -t "refuses a modified tracked file"` fails at control-copy.mjs:41 (A-deploy-control-dirty, exit 1).
  - The file's only recorded run is PF-CONTROLS's, before CT1 (SPEC-PROGRESS.md:18).
- **Effect:** the deploy has no runnable test, so mutations of its core job survive every test that exists:
  - dropping the dirt refusal (deploy.mjs:115-116);
  - pushing with force (:185-186);
  - skipping the pre-push scan (:181-183);
  - letting the release stop enforcing its checks (:153-155).

  The auditor's dry run cannot catch any of them either: it runs on a clean tree, against a fresh remote, and only records. The release-only refusals have had no live check since CT1. They guard the owner's own command at PREVIEW:
  - the newest annotated rc tag only;
  - its digest equal to its HUSH-SHIP-GATE line;
  - its commit on main;
  - every check enforced;
  - no untracked file.
- **What holds today:** deploy.mjs and everything it calls are unchanged since dfdd44c, after which the 7 controls passed; the one exception is tools/ship-gate.mjs (A-deploy-deps-changes). Every probe of the deploy in this audit passed.
- **Fix:**
  1. In makeControlCopy, extract a content file only when the copy lacks it. Or drop the extraction and check the copied files with `spec-content --tree` instead.
  2. Re-run the 7 cases and record them.
  3. Plan those runs around the session's call limit. Each case that reaches the gate runs X1 to X10 in full on the copy, and this audit's dry run of the product took 15 min 43 s.
- **Kind:** mechanical.

### MINOR 1. X10's rows cannot see a WebSocket, a service worker, WebRTC or the private file system
- **Where:** tools/probe-lib.mjs:107 collects only page 'request' events; storageReport (:390-401) reads only cookies, the two storages, IndexedDB and Cache Storage; originViolations is at :404-413. These rows are used by tools/probe-play.mjs:423-424, tools/probe-flash.mjs:47-49 and tools/probe-supply.mjs:96.
- **Triggering input:** scratch pages read with the real openPage, originViolations and storageReport, exactly as the playthrough reads the game (A-x10-blind.2). Each of these passes both rows:
  - a WebSocket attempt to another origin (the attempt was made);
  - a service worker that registers and runs, and fetches another origin;
  - a WebRTC peer pointed at a STUN host;
  - a file written into the origin-private file system ("planted").

  By contrast, a page fetch and a dedicated-worker fetch to the same foreign host both fail the network row.
- **Effect:** X10's "only the page's origin, nothing stored" holds only for HTTP requests made by a page or its dedicated workers, and only for those four storage kinds. The product uses none of the unseen kinds today (see A-default-page and the bundle search above). A future dependency, such as a Strudel OSC socket or a service worker, would pass unseen.
- **Fix:**
  - In openPage, also log page 'websocket' URLs and context-level 'request' events.
  - Fail any RTCPeerConnection, caught through an init script.
  - Make storageReport also read service worker registrations and the private file system.
  - Add a control-page fault for a socket and one for a service worker.
- **Kind:** mechanical.

### MINOR 2. check-public reads every file and blob as UTF-8
- **Where:** tools/check-public.mjs:60 (tree), :77 (staged), :172 (history) and :195 (root).
- **Triggering input:** the same two planted lines, an email and a user path (the controls' placeholders), written once as UTF-8 and once as UTF-16LE, then judged by the real tool. The UTF-8 file draws 2 findings; the UTF-16LE copy draws 0 (A-utf16-gap).
- **Effect:** D14's scan cannot see private data in a UTF-16 file in any of its modes. That includes the deploy's pre-push scan, so the deploy would publish such a file. Windows PowerShell 5.1 writes UTF-16 by default for `>` and Out-File. No such file exists today: every blob and tracked file is UTF-8, and my decoded scan found nothing (A-history-extra).
- **Fix:**
  - Decode a body with a UTF-16 BOM, or with NULs on every other byte, as UTF-16 before scanning.
  - Report any other body that holds a NUL as a class of its own: unscannable.
  - Add a UTF-16 case to tests/tools/check-public.test.mjs.
- **Kind:** mechanical.

### MINOR 3. The published bundle carries no third-party licence notice
- **Where:** vite.config.ts:11-18, and dist/ as the dry run published it: index.html and one script, nothing else.
- **Triggering input:** the build of HEAD.
- **Effect:**
  - The bundle carries Phaser 4.2.1 (MIT). Through @strudel/web 1.3.0's prebuilt bundle it also carries code such as acorn and fraction.js (MIT) and escodegen (BSD-2-Clause, whose package.json is inlined).
  - The minified file keeps none of their notices: 0 legal comments, 0 "Copyright" and 0 "@license". The site ships no licence file either (A-bundle-licenses).
  - MIT requires its notice in all copies. BSD-2-Clause requires it in the materials of a binary distribution.
  - The game's own AGPL notice and its source offer are in place.
- **Fix:** emit the bundled packages' notices with the build, without adding page text (the Handoff says "Nothing else"). Either ship a third-party licence file in dist, published on gh-pages, or keep the legal comments.
- **Kind:** design. vite.config.ts and the page are spec-owned, so this needs the producer's amendment.

### MINOR 4. A dry run pushes to whatever remote it is given
- **Where:**
  - tools/deploy.mjs:61 requires --remote but never checks it;
  - :125 accepts any string;
  - :156 and :185-186 push to it;
  - tools/cap-hook.mjs:758 lets agents run any deploy.mjs call that includes --dry-run.
- **Triggering input:** `node tools/deploy.mjs --dry-run --candidate HEAD --remote <the origin's URL> --out <dir>`. I did not run this.
- **Effect:**
  - A "dry run" would push main (fast-forward only), a hush-dryrun tag and gh-pages to the real remote.
  - X1 to X10 would only be recorded, not enforced; check-public would still refuse private data.
  - This is a publication outside the owner's release, through the one deploy form the hook leaves to agents.
  - The effect is bounded: agents may already push without force, and nothing private gets through.
- **Fix:** in --dry-run, refuse any remote that is not an existing local bare repository (`git -C <remote> rev-parse --is-bare-repository` must be true). Then neither a URL nor the origin can be named.
- **Kind:** mechanical.

### NOTE 1. The deploy reads its identity from git config only
- assertIdentity checks git config alone (deploy.mjs:72-76).
- GIT_AUTHOR_* or GIT_COMMITTER_* in the environment would override that identity on the gh-pages commit and on a dry-run tag.
- The pre-push scan (:181-183) would then refuse, but only after the whole run. Nothing would leak.
- In this run every pushed object carried the noreply identity.

### NOTE 2. X6 never sees a death or a respawn
- The witnesses never die, so the flash probe never measures either.
- §11 rests on construction here:
  - the burst is 8 dots of radius 2.5 px (tests/fixtures/reference/art.mjs:169-177);
  - the respawn ring is small;
  - a respawn's camera cut can recur at most once per 84 steps (about 2.9 times a second), under the three-a-second rule.

### NOTE 3. A dev-only advisory remains
- `npm audit` including dev dependencies reports one high: source-map-js 1.2.1 (GHSA-68fv-2mgg-jv7q), a denial of service on crafted source maps.
- It is dev-only and known since PF-FACTS. The build makes no source map, and nothing from it ships (A-npm-audit-all).

### NOTE 4. Time metadata is public by design
- Every commit, the dry run's tag and every evidence record carry the local UTC offset and the hours worked.
- check-public does not hide them, by design.

### NOTE 5. A-machine.1 holds the full machine sample
- It lists the sampled process names, two messaging apps among them. Earlier rounds committed only the perf probe's verdict ("heavy apps none").
- The verdict depends on that record only for AC power and 60 Hz. The producer may leave it uncommitted.

## Void records
- **A-x10-blind.1:** superseded by A-x10-blind.2, which also reads, beside each row, what really happened: the socket attempted, the service worker registered, the file written.

## Files
- **Evidence**, all in build/evidence/audit/, each at .1 unless noted:
  - **integrity:** A-head, A-digest, A-status, A-machine, A-head-after, A-digest-after, A-status-after, A-check-public-tree-after, A-check-public-tree-final, A-status-final;
  - **history and remote:** A-refs, A-remote, A-branches, A-ls-remote, A-ancestor, A-reflog, A-check-public-history, A-history-extra, A-gh-repo, A-gh-issues, A-gh-prs, A-gh-releases;
  - **tracked files:** A-ls-files, A-check-public-tree, A-spaced-names, A-utf16-gap;
  - **supply chain:** A-supply-extra, A-npm-audit, A-npm-audit-signatures, A-npm-ls-prod, A-npm-audit-all, A-probe-supply, A-bundle-licenses;
  - **page:** A-probe-play-network, A-x10-controls, A-default-page, A-x10-blind.1 and .2, A-probe-flash;
  - **identities:** A-identities, A-tags;
  - **deploy:** A-deploy-log, A-deploy-deps-changes, A-deploy-control-dirty, A-deploy-dirty, A-bare-remote, A-hook-test, A-deploy-dry-run, A-inspect-remote, and deploy/deploy.json and deploy/ship-gate.json.
- **Scratch**, in the session scratchpad under the system temp folder:
  - audit/: history-extra.mjs, spaced-names.mjs, supply-extra.mjs, default-page.mjs, deploy-dirty.mjs, hook-test.mjs, inspect-remote.mjs, utf16-gap.mjs and x10-blind.mjs;
  - audit-remote.git: the dry run's bare remote, with its pre-receive hook and push log;
  - the throwaway folders dirty-run, hook-try, utf16-try, x10-try and x10-try2;
  - plus one hush-copy-* folder in the temp folder, left by the failed D15 control.
