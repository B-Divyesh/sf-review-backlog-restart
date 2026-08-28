# Independent verification 2 — FAIL

**Candidate:** `b32daaf03e2538a191e3339f96193bdde4ede50b`  
**Verified URL:** <https://review-backlog-restart.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL — do not release until the static deployment applies the shipped response policy.**

## Scope and environment

Verified from a clean, unchanged checkout at the candidate commit with Node 22.23.2, npm 10.9.8, Playwright/Chromium 1.58.2, and a production `vite preview` build. Product source was not changed. This report and the handoff are the only intended repository changes.

## Local quality gates

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | Pass | `npm ci`: 60 packages audited, 0 vulnerabilities. |
| Unit/configuration tests | Pass | `npm test`: 3 files, **11/11** tests passed. |
| Type check + exact production build | Pass | `npm run build` passed `tsc --noEmit`, Vite production build, and service-worker generation; `dist/` exists. |
| Repository lint/type checks | Pass / N/A | No lint script is defined. The available TypeScript check is part of `npm run build` and passed. |
| Browser integration/PWA suite | Pass | `npm run test:e2e`: **5/5** Chromium tests passed. `npm run test:e2e:repeat`: all five tests repeated ten times with one worker; Playwright's final `.last-run.json` is `passed` with no failed tests (**50/50**). This includes the formerly flaky immediate route-select → export sequence. |
| Bundle budgets | Pass | Initial JS `29.27 kB` (`11.13 kB` gzip); primary CSS `20.04 kB` (`5.59 kB` gzip); no shipped font files; 640px hero WebP `38.07 kB`. All meet the stated static/PWA budgets. |
| Lighthouse, production preview, mobile | Pass | Performance **99**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **1.1 s**, LCP **2.0 s**, CLS **0**, TBT **90 ms**. |

## Functional and product-contract evidence

- Normal local and live journeys pass: sample Anki-style CSV import produces all three routes, selecting **Protect memory** persists, and CSV export produces `Suggested tags` including `rbr::day-01` and `rbr::risk-*`. Reload retains the route and changed daily limit.
- Invalid-import recovery passes: a CSV missing `Interval` announces “Missing Interval column”; a subsequent valid CSV imports and produces three routes.
- Boundary test passes: 101 overdue cards, 5 minutes/day, 180 seconds/card, and a next-day target results in **1 card/day** and **2 of 101 by date** for Clear by date. The application does not exceed the stated capacity and says the deadline is not met.
- Browser native invalid-range handling rejects a 1-minute daily setting with a validation message. Estimates, risk scoring, and no-retention-guarantee language are present; the export is a new tagged list and does not mutate the import.
- Desktop and 390×844 mobile passed without horizontal overflow. Keyboard checks reach the skip link first, activate it, and select a route with Space. The focus outline is visible at 3px. Reduced motion computes to a `0.01s` transition duration.
- `axe-core` WCAG 2 A/AA scans, exercised by the passing browser suite on empty/populated planner, mobile planner, privacy, and terms, found no violations (therefore no serious or critical findings). Local and live normal journeys recorded no console errors or page errors.
- Local and live PWA checks pass: a controlled saved plan reloads offline and displays the offline status; the browser suite also passes the in-app service-worker update-toast flow.

## Privacy, origin, and build identity

- Request capture during local and live planner journeys observed only the application origin. There are no analytics, cookies, account calls, third-party runtime scripts, or CDN font requests. Imports/settings/check-ins are IndexedDB-only; JSON/CSV export and local deletion are exposed. `/privacy/`, `/terms/`, README, MIT license, manifest, icons, offline page, and service-worker update path are present.
- Live `index.html`, manifest, offline/legal pages, tested JS/CSS assets, hero asset, and icon are byte-identical to the fresh candidate build. The live service worker differs only in its generated version/cache token; its normalized executable content is identical. The live deployment therefore contains the candidate application build.

## Release-blocking deployment defects

The candidate ships the correct `public/_headers` file (also present byte-identically as `dist/_headers`), but the live host does not honor it.

### P1 — Required static caching and response policy are not deployed

**Fresh live evidence (2026-08-28):** `GET /assets/main-CZ7fkSDF.js`, `/assets/style-BuNH5jaC.css`, and `/assets/recovery-conservatory-640.webp` return `Cache-Control: public, must-revalidate, max-age=30`, instead of the shipped `/assets/*` policy `public, max-age=31536000, immutable`. `GET /sw.js` is likewise `max-age=30`, not the shipped `no-cache` policy.

**Impact:** fingerprinted assets revalidate unnecessarily and the service worker lacks the explicitly required update-safe cache policy. This fails the PWA performance/caching acceptance contract despite the app itself being correct.

**Required remediation:** configure the static deployment to honor the committed `dist/_headers`, or provision equivalent host rules. Recheck the exact URLs above after rollout.

### P1 — Manifest is served with an incompatible generic MIME type

**Fresh live evidence:** `GET /manifest.webmanifest` returns `Content-Type: application/octet-stream` together with `X-Content-Type-Options: nosniff`; the candidate requires `application/manifest+json; charset=utf-8`.

**Impact:** this can prevent reliable PWA manifest processing/installability and contradicts the product's shipped deployment contract.

**Required remediation:** serve the manifest as `application/manifest+json; charset=utf-8` (or a browser-supported manifest JSON type) and retain `nosniff`.

### P2 — Required defensive browser policies are absent in production

**Fresh live evidence:** responses include HSTS, `Referrer-Policy`, and `X-Content-Type-Options`, but have no `Content-Security-Policy`, `Permissions-Policy`, or `X-Frame-Options`/frame-ancestors protection. The candidate's `dist/_headers` explicitly declares all of these.

**Impact:** the deployed response policy is weaker than the verified candidate and the product README's deployment requirements.

**Required remediation:** deploy the candidate header configuration (CSP including `worker-src 'self'` and `frame-ancestors 'none'`, restrictive Permissions-Policy, and `X-Frame-Options: DENY`).

## Release recommendation

**FAIL.** The candidate source and all local/browser quality gates are ready; the live application also matches that source and functions end to end. Do not mark the release passed until the static host applies the committed headers and the three fresh live-header checks above pass.
