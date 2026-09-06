# Review backlog restart verification — FAIL

**Verdict:** **FAIL — 4 findings, including 4 untested public claim groups.**

**Implementation reviewed:** `85938f1cabccf926916d63e109500fd98b6d69c0`  
**Documentation baseline reviewed:** `fdb59c5bab067345fd1ebae2542dcdfee306cea6`  
**Live URL:** <https://review-backlog-restart.sociobot.in/>  
**Verified:** 2026-09-06

The implementation is now deployed. Fresh live and local checks confirm the core planning job, demo isolation, recovery paths, PWA behavior, and deployment policy. Strict accessibility and claim audits found four remaining issues, so this cannot be declared a product PASS.

## Job, audience, and first action

Before scrolling, fresh desktop and 390 × 844 phone browsers state:

- Job: **Plan an overdue review backlog**.
- Audience: spaced-repetition learners returning after a break who need a safe daily study plan.
- First action: **Try it with sample data**.

The same screen gives the required private, offline, and free facts. The action is visible without scrolling in both viewports.

## Environment and build identity

Verification used a detached worktree at `/tmp/review-backlog-restart-verify5.ybYRuN`, Node 22.23.2, npm 10.9.8, Playwright/Chromium 1.58.2, axe-core 4.13, and Lighthouse 12.8.2. The product source was not changed.

Live and fresh-candidate files match byte-for-byte for the root, demo, privacy, terms, 404, manifest, main JS, main CSS, mobile hero, social image, and PWA icons. `sw.js` matches after normalizing only its generated version token. The live main bundle is `main-D-TpRHv8.js`; the stale `main-4C3LZ64L.js` deployment recorded in the prior handoff is gone.

## Quality gates

| Check | Result |
| --- | --- |
| `npm ci` | Pass; 59 packages added, 60 audited, no vulnerabilities. |
| `npm test` | Pass; 16/16. |
| `npm run build` | Pass; `dist/` emitted and 23 files precached. |
| `npm run test:e2e` | Pass; 10/10. |
| `npm run test:e2e:repeat` | Pass; 100/100 with one worker. |
| `npm run test:claims` | Pass; 16/16. |
| Every command in `.factory/claims.json` | Pass; 16/16 exact commands run separately. |
| Factory URL verifier, root and `/demo` | Pass for HTTPS, title, language, main, image alt text, and console errors. |
| Live WCAG A/AA axe scan | Pass; zero WCAG A/AA violations on root, populated demo, privacy, terms, and designed 404. |
| Full axe best-practice scan | **Fail**; see F1 and F3. |
| Lighthouse mobile `/demo` | Performance 98, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.2 s, TBT 170 ms, CLS 0. |

Build payloads are within budget: main JS 32.98 kB raw/12.18 kB gzip, CSS 22.28 kB raw/5.95 kB gzip, no webfonts, and the mobile hero is 38.07 kB.

## Live product evidence

- One click opens `/demo` with 120 realistic cards, three plans, risk reasons, seven-day output, and a persistent “Demo — sample data” banner.
- Tagged CSV export has one header plus 120 action rows and includes day/risk tags and original scheduling fields.
- Reset returns the demo to 25 minutes and **Steady return**. **Start for real** clears the demo record and preserves a two-card real plan unchanged.
- Malformed JSON gives a plain recovery instruction. A CSV missing `Interval` gives the expected field error, and a valid import immediately recovers.
- A 500-card boundary import at five minutes and 30 seconds per card keeps every route at or below ten cards/five minutes and reports “20 of 500 by date.” A one-minute setting is rejected with the minimum-value message.
- Route selection, settings, JSON backup/restore, real-plan deletion, and immediate export persistence pass the declared browser and claim suites.
- A live service worker controls a fresh context. Offline reload preserves the three demo plans and shows the offline status. A browser-isolated newer worker produces the update notice and **Update now** action.
- Normal use makes only same-origin requests and sets no cookies. There are no analytics or third-party runtime requests.
- At 390 px there is no horizontal overflow and all visible links/buttons/summary controls are at least 44 px. A 640 CSS-pixel reflow check, equivalent to 200% zoom from 1280 px, keeps the main content and export action available without horizontal overflow.
- The skip link is first, visibly focused with a 3 px ring, and moves focus to main. Space selects a plan. Dialog focus enters the close control and Escape closes it.
- Reduced motion computes to 0.01 ms transitions/animations and automatic scrolling.
- Root, demo, privacy, terms, `/404.html`, and an unknown route each have the expected title, `lang=en`, one `h1`, one `main`, ordered headings, and image alt text. The unknown route deliberately returns HTTP 404 with the designed page. All discovered links resolve or are explicit `mailto:`/fragment links.
- Live manifest MIME/caching, immutable hashed assets, no-cache worker, CSP, frame protection, Permissions-Policy, HSTS, referrer policy, and `nosniff` are correct.

This is a static local-first PWA, so backend tenant isolation, restart persistence, health, and 429/`Retry-After` checks do not apply. The deterministic recovery calculation does not need an AI feature.

## Declared claim commands

All registered claims passed both together and through their exact individual commands:

| Claim | Result |
| --- | --- |
| `csv-tsv-import` | Pass |
| `three-recovery-plans` | Pass |
| `time-box` | Pass |
| `risk-flags` | Pass |
| `csv-export` | Pass |
| `read-only-import` | Pass |
| `local-only` | Pass |
| `no-tracking` | Pass |
| `plan-persistence` | Pass |
| `json-backup` | Pass |
| `delete-plan` | Pass |
| `offline-reload` | Pass |
| `free-core` | Pass |
| `update-notice` | Pass |
| `demo-isolation` | Pass |
| `demo-reset` | Pass |

The registry has 16 entries, 16 unique tags, and exactly one test occurrence per tag. F2 records public behavior that is still outside that registry or incompletely asserted.

## Earlier finding disposition

| Earlier finding | Current disposition and fresh proof |
| --- | --- |
| Rapid route-selection/export race | Resolved; 10/10 normal and 100/100 repeated browser tests pass. |
| Hashed asset cache, manifest MIME, and missing security headers | Resolved in fresh live headers. |
| Worker precached deployment-only files and failed live installation | Resolved; live worker is active, excludes those files, and offline reload passes. |
| “1 cards / day” | Resolved; the one-card route says “1 card / day.” F4 is a separate singular bug in the daily record. |
| Sample overwrote a real plan | Resolved; real and demo records remain isolated in separate IndexedDB databases. |
| Direct demo, persistent label, reset, and start-real controls missing | Resolved and exercised live. |
| Sample too small and daily workload exceeded backlog | Resolved; 120 cards load and short-backlog unit coverage passes. |
| Claim registry missing | Partly resolved; all 16 declared claims pass, but F2 identifies four remaining untested public claim groups. |
| First-screen/plain-copy contract missing | Resolved on desktop and phone; the copy audit has no overlong or banned-word entries. |
| Designed 404, metadata, shared route structure, and touch targets missing | Resolved; live route, metadata, crawl, viewport, and touch checks pass. |
| Raw JSON parser error | Resolved; live recovery copy gives the file requirement and next action. |

## Findings

### F1 — P1 — Keyboard navigation enters clipped, invisible file controls

Tab traversal reaches `#card-file`, `#replace-file`, and `#restore-file` while each is clipped to 1 × 1 px. The focus outline exists but is clipped or off-screen, so a keyboard user loses visible focus. On the root, these occur at Tab steps 10, 15, and 16. Full axe also reports `#replace-file` and `#restore-file` outside any landmark.

Use the visible trigger as the only tab stop, or give the file input a visible focused state. Keep application controls inside a landmark.

### F2 — P2 — Four public claim groups lack a complete tagged claim test

The following public behavior is not independently enforced by exactly one matching `@claim:` test:

1. **Download a matching template** is an exposed action but has no registry entry.
2. The optional daily record promises record, reload persistence, local storage, and undo, but has no registry entry.
3. README and Privacy say **Start for real** discards demo data; `demo-isolation` verifies only that real data survives, so removal of the demo record could regress without failing it.
4. README promises UTF-8 CSV/TSV input, but `csv-tsv-import` uses ASCII-only fixtures and does not assert non-ASCII preservation.

Fresh manual checks found all four behaviors working, but the claims contract explicitly treats manual or unrelated coverage as insufficient. **Untested claim count: 4.**

### F3 — P3 — The demo banner uses an invalid ARIA role

Full axe reports `aria-allowed-role` on `<aside class="demo-banner" role="status">`: `status` is not permitted on `aside`. Use a compatible element for the live status or give the aside an allowed landmark role and put the status message in a nested live region.

### F4 — P3 — The daily record uses plural copy for one card

With a one-card backlog, recording the default count displays **“1 cards recorded in this browser.”** The workload label’s earlier singular fix does not cover this state. Use “1 card recorded.”

## Evidence

Evidence is under `/work/.evidence/verify-5/`, including desktop/phone first-screen and populated-demo screenshots, live functional JSON, update/isolation JSON, mobile/keyboard JSON, full and WCAG axe results, route/header/link results, exported CSV, and the Lighthouse report.

## Final decision

**FAIL. Finding count: 4. Untested claim count: 4.** The deployed core workflow is functional, but PASS requires zero findings at every severity and zero untested claims.
