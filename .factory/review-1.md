# Review 1 — Review Backlog Restart

**Verdict: FAIL**

**Findings:** 9 grouped findings (5 P1, 4 P2)

**Untested public claim groups:** 14

**Implementation reviewed:** `924dd8f2ffdb1258659ed9ca5f41da35cde276ee`

**Documentation SHA reviewed:** `91b644401556e2e5b88a9b4da847cc148c80d5db`

**Live URL:** <https://review-backlog-restart.sociobot.in/>

**Review date:** 2026-09-06

The live build matches the implementation candidate, and its main planning workflow works. It does not meet the current strict product contract. The sample can overwrite a real saved plan, there is no isolated demo, 14 public claim groups have no declared claim tests, the first screen does not state the job and audience in plain words, and required site and accessibility details are missing.

## Job, audience, and first action before scrolling

- Job: turn an overdue spaced-repetition export into a time-boxed recovery plan and tagged action list.
- Audience: spaced-repetition users returning after a break, especially people facing a backlog of 100 or more cards.
- First action shown: the primary action is **Bring in your cards**. **Try the sample deck** is a secondary action beside it.

The page does not state that job and audience directly. Its title is “Review Backlog Restart — a humane return to your cards”; its h1 is “Your backlog is not a moral emergency”; and its supporting sentence does not name returning spaced-repetition or Anki users. The phone first screen also omits the desktop privacy note. Its three short facts are file format, read-only behavior, and local processing rather than the required privacy, offline, and price facts.

## Scope and build identity

`924dd8f` is the last product implementation commit. `da22ff1` and `91b6444` are report-only commits, so a new product image is not required for them. A clean build at documentation SHA `91b6444` produced the same implementation assets as `924dd8f`.

Fresh SHA-256 comparisons matched live and local `index.html`, `manifest.webmanifest`, main JS, main CSS, privacy, and terms byte-for-byte. The service worker also matched after normalizing its generated cache token.

## Clean-checkout commands

Run in a detached clean worktree with Node 22.23.2, npm 10.9.8, and Playwright 1.58.2:

| Command | Result |
| --- | --- |
| `npm ci` | Pass; 59 packages added, 60 audited, 0 vulnerabilities. |
| `npm test` | Pass; 14/14 tests. |
| `npm run build` | Pass; `dist/index.html` emitted and 18 files precached. |
| `npm run test:e2e` | Pass; 8/8 browser tests. |
| `npm run test:e2e:repeat` | Pass; 80/80 in 3.1 minutes. |
| `/opt/fleet/lib/verify-url.sh ...` | Pass after creating its required evidence directory; no console errors, one h1, one main, `lang=en`, and no missing image alt. |
| Playwright axe-core 4.13 WCAG A/AA scans | Pass; zero violations on empty and populated desktop/phone states, privacy, terms, and the unknown route response. |
| Lighthouse 12.8.2, fresh mobile run | Pass; Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.5 s, CLS 0, TBT 40 ms. |

There is no `.factory/claims.json`, so there are no declared claim commands to run. There are also no `@claim:*` tests. Broad unit and browser tests do not satisfy the required one-test-per-public-claim contract.

Build payloads remain inside the supplied budgets: main JS 29.32 kB (11.15 kB gzip), main CSS 20.04 kB (5.59 kB gzip), no webfonts, and the 640 px hero is 38.07 kB.

## Live workflow evidence

### Normal and recovery paths

- Fresh desktop and 390 × 844 phone contexts loaded with no console or page errors and no horizontal overflow.
- One click on **Try the sample deck** produced three routes, risk reasons, the seven-day view, and an export action.
- CSV export downloaded seven lines: one header plus six cards. It included day and risk tags and retained the original card fields.
- Route choice and settings survived reload. The repeated immediate route-select/export path passed 80/80.
- JSON backup downloaded, deletion completed, malformed JSON was rejected, and the valid backup restored all six cards and three routes.
- A missing-`Interval` CSV announced “Missing Interval column. Use the template to match supported headers.” A valid import then recovered to three routes.
- A 500-card boundary import at 5 minutes/day and 30 seconds/card produced 10 cards/day, 50 projected days, and “20 of 500 by date.” A 1-minute value was rejected with the browser's minimum-value message.
- **Start over** opened a specific confirmation, returned focus after Escape, and removed the IndexedDB record after confirmation.

### PWA, privacy, keyboard, and response policy

- A fresh live service worker became active and controlled the page. After going offline, reload kept all three routes and showed “Offline · your saved plan still works.”
- Reduced motion computed to effectively instant transitions and automatic scrolling.
- Keyboard order starts with the skip link. The authored focus ring is 3 px sky blue. Enter, Space, radio selection, dialog focus, Escape, and focus return worked.
- Normal application use made only same-origin requests. No analytics, third-party scripts/fonts, application API calls, or cookies were observed.
- Hashed assets are immutable; the worker and manifest are `no-cache`; the manifest has the correct MIME type. CSP, `frame-ancestors 'none'`, Permissions-Policy, HSTS, `nosniff`, Referrer-Policy, and `X-Frame-Options: DENY` are live.

Evidence includes `/work/.evidence/live-desktop-first-screen.png`, `/work/.evidence/live-phone-first-screen.png`, `/work/.evidence/live-desktop-sample.png`, `/work/.evidence/live-phone-sample.png`, `/work/.evidence/live-sample-export.csv`, `/work/.evidence/live-sample-backup.json`, `/work/.evidence/verify-url/verify.json`, and `/work/.evidence/lighthouse.json`.

## Public claim audit

Every row below is **UNTESTED under the claims contract** because the repository has neither `.factory/claims.json` nor an exactly tagged `@claim:<id>` test. “Observed” is supporting evidence, not a substitute for the missing claim test.

| # | Public claim group | Independent observation |
| --- | --- | --- |
| 1 | Imports supported CSV/TSV card exports | CSV normal and invalid recovery passed; TSV has unit coverage. |
| 2 | Produces three recovery routes | Observed locally and live. |
| 3 | Every route stays inside the daily time box and calls out impossible deadlines | 500-card boundary passed. |
| 4 | Flags high-risk cards from lateness, interval, lapses, and young material | Formula has unit coverage and reasons were visible. |
| 5 | Exports a tagged action-list CSV | Live download passed. |
| 6 | Retains original fields and does not modify or sync Anki data | Export retained fields; the static app exposed no Anki connection. |
| 7 | Keeps imported deck and plan data on the device | Same-origin request capture and IndexedDB inspection supported it. |
| 8 | Has no analytics, trackers, external fonts/scripts, cookies, or account | Observed in the live browser and response inspection. |
| 9 | Persists settings and route choice in IndexedDB | Reload passed. |
| 10 | Exports and restores a JSON backup | Live backup/recovery passed. |
| 11 | Deletes local plan data with Start over | Live deletion and IndexedDB inspection passed. |
| 12 | Works offline after the first visit | Fresh live offline reload passed. |
| 13 | Is free | No payment or paid gate is present. |
| 14 | Offers an in-app update when a new service worker is available | The clean local browser test passed; live code matched that build. |

**Untested claim count: 14.**

## Earlier finding disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| Rapid route selection/export race | Resolved | `npm run test:e2e` 8/8 and repeat run 80/80; immediate export test passed. |
| Hashed assets lacked immutable caching | Resolved | Live main JS/CSS return `public, max-age=31536000, immutable`. |
| Manifest MIME was generic | Resolved | Live manifest is `application/manifest+json; charset=utf-8`. |
| CSP, Permissions-Policy, and frame protection absent | Resolved | All are present in fresh live headers. |
| Service worker installation failed on deployment-only precache entries | Resolved | Worker controls a fresh live page; offline reload works; live worker omits `staticwebapp.config.json` and `/_headers`. |
| “1 cards / day” grammar | Resolved | Live boundary output says “1 card / day”; dedicated test passes. |

## Findings

### F1 — P1 — The sample action can overwrite a real saved plan without warning

The sample is not isolated. A fresh test imported `my-real-plan.csv`, set 15 minutes/day, and then clicked **Try the sample deck**. Without a dialog, the same IndexedDB key changed to `Sample return deck.csv`, six cards, and the default 25 minutes/day. Reload retained the sample, proving the real local plan had been replaced.

This violates the requirement that sample use never reads or writes real data and creates avoidable local data loss. Use a separate demo namespace and never expose an action that silently replaces a real plan.

### F2 — P1 — There is no compliant demo sandbox

`/demo` and `?demo=1` both return the normal empty landing page with zero plans and the ordinary title. After clicking the sample, there is no persistent “Demo — sample data, nothing is saved” label, **Reset demo**, or **Start for real**. The UI instead says the sample “is stored locally.” `.factory/demo.md` is missing.

Create a direct demo entry, separate storage namespace, persistent label and controls, and discard demo state when leaving it.

### F3 — P1 — The sample is too small and its displayed workload is misleading

The sample contains six cards although the core audience has 100+ card backlogs. Its populated output says there are six due cards while the recommended route says “83 cards / day ≈ 25 min” and the risk-first route says “64 cards / day ≈ 20 min.” The first scheduled day correctly contains only six cards. The headline workload therefore exceeds the entire backlog and does not represent a real recovery decision.

Ship a realistic backlog-sized sample and cap displayed daily work and minutes at the cards actually available that day.

### F4 — P1 — Fourteen public claim groups have no declared tests

`.factory/claims.json` is missing and no test contains an `@claim:*` tag. The 14 claim groups listed above are therefore untested under the required clean-demo sandbox, even where broader tests or manual checks support them. Add the registry and exactly one observable demo-based test per claim, or remove the claim.

### F5 — P1 — The first screen and page copy violate the plain-words contract

The h1 does not name the job, the supporting sentence does not name the returning spaced-repetition audience, and the first screen omits the required offline and price facts. The title uses “humane return” rather than plainly naming the planning job. Copy throughout relies on metaphor or mood headings, including “A field guide back to your deck,” “See what you're carrying,” “Three honest ways through,” “A small bridge, day by day,” and “A plan, not a promise.” `.factory/copy-audit.md` is missing.

Replace these with task-naming headings and complete the required sentence/word-count audit for the landing page, legal pages, and README.

### F6 — P2 — Unknown URLs do not return or render a designed 404

`/not-a-real-route` and `/404.html` both return HTTP 200 and render the ordinary planner. There is no styled not-found page or way back because the app never identifies the error. Add the required product-specific 404 response and design.

### F7 — P2 — Required metadata and shared route skeleton are incomplete

The root has no canonical link, Open Graph metadata, Twitter card, or apple-touch icon link. There is no 1200 × 630 product social image. `/demo` has no demo title and is absent from the sitemap. Privacy and terms have no header navigation and no footer links, product one-liner, build/version, or the required “Built by Param Factory” handoff text. The root footer also has no build/version.

### F8 — P2 — Several touch targets are smaller than 44 px

Measured phone targets include the 42 × 42 brand link, 29 px-high template and scoring-note buttons, a 26 px-high JSON restore button, a 24 px-high replace button, and 19–20 px-high legal/footer links. Axe reports zero WCAG A/AA violations, but these fail the supplied 44 px touch-target baseline.

### F9 — P2 — Invalid JSON recovery exposes a parser error without a next step

Restoring malformed JSON shows “Expected property name or '}' in JSON at position 1 (line 1 column 2).” This is implementation jargon and gives no recovery action. Replace it with a plain message that says the file is not a valid Backlog Restart backup and asks the user to choose an exported JSON backup.

## Final decision

**FAIL.** The implementation is stable and the earlier defects are resolved, but this review has nine grouped findings and 14 untested public claim groups. A PASS requires zero of both.
