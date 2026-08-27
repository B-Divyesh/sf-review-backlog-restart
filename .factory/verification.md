# Independent verification — FAIL

**Candidate:** `8e9406ccf2001053037781a312d1cffaaeeec3f6`  
**Verified URL:** <https://review-backlog-restart.sociobot.in/>  
**Date:** 2026-08-27  
**Verdict:** **FAIL — do not release this candidate.**

## Scope and environment

Verification was run from a fresh detached clone at the candidate commit (`/tmp/review-backlog-restart-qa.REVACj`), using Node 22.23.2 and Chromium supplied by Playwright. The product source was not modified. This report and the handoff are the only repository changes.

## Quality-gate results

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | Pass | `npm ci`: 60 packages audited, 0 vulnerabilities. |
| Unit tests | Pass | `npm test`: 2 files, 8/8 tests passed. |
| Type check + production build | Pass | `npm run build` completed `tsc --noEmit`, Vite build, and service-worker generation; `dist/` emitted. |
| Repository lint/type checks | Pass / N/A | There is no lint script; `build` is the available type check and passed. |
| Required browser e2e | **Fail (flaky)** | First clean `npm run test:e2e` failed on reload; a rerun passed, but `npx playwright test --repeat-each=10` finished failed with one failing repeat (repeat 6). It timed out waiting for the action-list download immediately after selecting a route. A required test that intermittently fails does not pass the quality gate. |
| Build budgets | Pass | Initial JS 28.79 KB (10.95 KB gzip); CSS 19.68 KB (5.50 KB gzip); no fonts; largest hero WebP 148.43 KB. All are within the supplied budgets. |
| Lighthouse mobile preview | Evidence collected | Report scores: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 2.0 s, CLS 0, TBT 70 ms. Lighthouse produced the report but its CLI ended non-zero after an "unexpectedly crashed" tab message, so this is not a clean command pass. |

## Functional and product-contract checks

- Normal journey passed when actions were allowed to settle: sample CSV import; change daily limit to 5 minutes; choose Protect memory; tagged CSV export; reload with the saved route and limit retained.
- The exported CSV begins with action-day, action-date, suggested-tag, risk-band, risk-score, and original card fields. The application keeps the original import read-only.
- Invalid import recovery works: a CSV without `Interval` reports “Missing Interval column. Use the template to match supported headers.” A subsequent valid import succeeds.
- Boundary check: a 101-card overdue CSV with 5 minutes/day, 180 seconds/card, and a next-day deadline yields Clear by date = **1 card/day** and **2 of 101 by date**, rather than exceeding the stated time ceiling.
- Native invalid range handling works: 1 minute is invalid with the browser message “Value must be greater than or equal to 5.”
- Estimates are explicitly labeled and risk explanation does not claim FSRS/retention prediction.

## Browser, accessibility, privacy, and PWA checks

- Desktop and 390×844 mobile production-preview checks passed; the mobile document/body had no horizontal overflow.
- axe-core 4.13 WCAG A/AA scans found **0 serious or critical violations** (in fact 0 violations) on empty planner, populated planner, mobile populated planner, privacy, and terms.
- Keyboard-only smoke passed: first Tab reaches the visible Skip to planner link with a 3 px focus outline; Enter follows it; Space on the route radio selects Protect memory. Reduced-motion emulation reports instant (`0.01ms`) transitions and `scroll-behavior: auto`.
- Local normal journey showed no console or page errors. The only console error in an intentional offline reload was the expected `ERR_INTERNET_DISCONNECTED` for the connectivity probe.
- Privacy inspection and live browser requests found no analytics, cookies, third-party scripts/fonts, or outbound application requests. Imported data is stored in IndexedDB; export/delete controls and `/privacy/`, `/terms/` are present.
- PWA checks passed in production preview: manifest has 192/512/maskable icons, standalone display, versioned start URL; a service-worker-controlled saved plan reloads offline; and a deliberately newer service-worker response produced the in-app “An updated field guide is ready. Update now” toast.

## Live deployment and response policy

- Live HTML, manifest, app JS, CSS, hero asset, legal pages, offline page, and icons match the candidate build byte-for-byte. `sw.js` differs only in its generated cache-version token (`mtbzze7r` live vs the fresh local build timestamp), with identical executable/service-worker content otherwise.
- Live normal browser journey works: one `h1`, one `main`, `lang=en`, sample import, three plans, export button, and no console/page errors. All observed runtime requests are same-origin.
- Live headers: HTTPS/HSTS (`max-age=10886400; includeSubDomains; preload`), `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff` are present. There was no CSP, Permissions-Policy, or frame-ancestors/X-Frame-Options header observed.
- **Deployment caching defect:** fingerprinted `/assets/main-C1PNtO1K.js` and `/assets/style-5HAK1uKG.css` are served as `Cache-Control: public, must-revalidate, max-age=30`, not long-lived immutable assets. This violates the supplied PWA performance/caching policy. `/manifest.webmanifest` is additionally served as `application/octet-stream` rather than `application/manifest+json`.

## Defects

### P0 — Required e2e gate is flaky; rapid route-selection/export can lose the download

**Reproduction:** run `npx playwright test --repeat-each=10` after the production build. One of ten exact journeys failed (repeat 6) at `page.waitForEvent('download')` after:

1. import sample deck;
2. recalculate;
3. select `Protect memory`;
4. immediately click `Export tagged action list`.

The failure snapshot shows the selected Protect memory route and an active export button, but no download is emitted before the 30-second test timeout. The earlier clean e2e run also failed after the same interaction during the following reload. The path succeeds if a short settle period is added, demonstrating an asynchronous action/render race rather than a bad test fixture.

**Impact:** the release violates its mandatory `npm run test:e2e` quality gate and a fast real user can fail to receive the requested action list at a critical moment.

**Needed fix:** serialize/disable actions while `selectPlan` persists and rerenders, or preserve the clicked export operation across the render; then make the e2e wait on the durable UI state rather than timing. Re-run the exact e2e command and repeated journey until stable.

### P1 — Hashed static assets are not immutably cached in production

**Evidence:** live JS/CSS responses have `Cache-Control: public, must-revalidate, max-age=30`.

**Impact:** unnecessary revalidation/refetches undermine the required PWA caching and performance policy.

**Needed fix:** deployment configuration should send long-lived `public, max-age=31536000, immutable` for fingerprinted `/assets/*` files, while retaining short/no-cache policy for HTML and `sw.js`.

### P2 — Manifest MIME type is generic

**Evidence:** `GET /manifest.webmanifest` returns `Content-Type: application/octet-stream` with `nosniff`.

**Needed fix:** serve it as `application/manifest+json` (or a browser-supported JSON manifest type) and retest installability.

### P3 — Missing defensive browser policies

**Evidence:** live headers do not include CSP, Permissions-Policy, or clickjacking protection.

**Needed fix:** add a static-site-appropriate CSP (including `worker-src 'self'`), a restrictive Permissions-Policy, and `frame-ancestors 'none'`/equivalent frame protection.

## Release recommendation

**FAIL.** Fix P0 and P1 at minimum, then rerun clean install, all tests, production build, repeated e2e, and live header verification before approval.
