# Independent verification 3 — FAIL

**Candidate:** `cc4c0b3076de31a3b09fac99e2f7105f1cf89ffc`  
**Verified URL:** <https://review-backlog-restart.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL — do not release as the required offline PWA.**

## Scope and environment

Verified from a clean checkout at the stated candidate using Node 22.23.2, npm 10.9.8, Playwright/Chromium 1.58.2, and the exact production build. Product source was not changed. This report and the handoff are the only intended repository changes.

## Quality gates

| Check | Result | Fresh evidence |
| --- | --- | --- |
| Clean install | Pass | `npm ci`: 60 packages audited, 0 vulnerabilities. |
| Unit/configuration tests | Pass | `npm test`: 3 files, 12/12 tests passed. |
| Type check and exact production build | Pass | `npm run build` passed `tsc --noEmit`, Vite production build, and generated `dist/sw.js` with 20 precache entries. |
| Lint/type checks available | Pass / N/A | No lint script exists; the available TypeScript check is included in `npm run build`. |
| Browser integration/PWA suite | Pass locally | `npm run test:e2e`: 5/5 passed. `npm run test:e2e:repeat`: five tests repeated ten times, one worker; Playwright `test-results/.last-run.json` is `passed` with no failures (50/50). |
| Bundle budgets | Pass | Initial JS 29.27 kB (11.13 kB gzip), primary CSS 20.04 kB (5.59 kB gzip), no font payload, and mobile hero WebP 38.07 kB. |

## Product and usability checks

- Normal live journey passed: sample import produces three routes; selecting **Protect memory** persists; tagged CSV export succeeds; JSON backup succeeds. The CSV begins `Action day, Action date, Suggested tags, Risk band, Risk score` and preserves original scheduling fields.
- Invalid import recovery passed: a CSV missing `Interval` announced “Missing Interval column. Use the template to match supported headers.” A valid sample could then be imported.
- Boundary scenario passed after durable recalculation: a 101-card overdue CSV, 5 minutes/day, 180 seconds/card, and a next-day date resulted in **1 card/day** and **2 of 101 by date** for Clear by date, rather than exceeding capacity. A 1-minute limit is rejected by native validation (“Value must be greater than or equal to 5.”).
- Desktop and 390×844 mobile work without horizontal overflow. Fresh keyboard focus lands on the visible skip link, whose computed outline is `rgb(154, 198, 197) solid 3px`. Reduced-motion computed transition duration is `1e-05s`.
- Fresh axe-core 4.13 WCAG A/AA scans on the planner, `/privacy/`, and `/terms/` found zero violations (therefore zero serious or critical findings). Normal live journeys recorded no console errors or page errors.
- Request capture during normal live use observed only `https://review-backlog-restart.sociobot.in`. There are no observed analytics, cookies, third-party scripts/fonts, or application API requests. Imported data is IndexedDB-local; CSV/JSON export, deletion, privacy policy, terms, README, and MIT license are present.

## Live identity and response policy

- Candidate build and live deployment match byte-for-byte for `index.html`, manifest, offline/legal pages, tested JS/CSS, hero asset, and all PWA icons. `sw.js` differs only in its generated cache-version token; normalized executable content matches.
- The prior response-policy failure is repaired in production: hashed JS/CSS have `Cache-Control: public, max-age=31536000, immutable`; `/sw.js` and `/manifest.webmanifest` have `Cache-Control: no-cache`; manifest is `application/manifest+json; charset=utf-8`; CSP includes `worker-src 'self'` and `frame-ancestors 'none'`; restrictive Permissions-Policy, HSTS, `nosniff`, Referrer-Policy, and `X-Frame-Options: DENY` are present.

## Release-blocking defect

### P1 — Live service worker cannot install, so offline reload and update flow are unavailable

**Reproduction, fresh Chromium profile:**

1. Load the live URL and wait eight seconds.
2. Inspect `navigator.serviceWorker.getRegistration('/')` and `navigator.serviceWorker.controller`.
3. Both are absent/false: `{ "controller": false, "registration": false, "active": false, "installing": false, "waiting": false }`.

The generated, live-matching `sw.js` calls `cache.addAll(ASSETS)` and its asset list includes `/staticwebapp.config.json`. The Azure Static Web Apps host correctly consumes that file as deployment configuration rather than publishing it, so `GET https://review-backlog-restart.sociobot.in/staticwebapp.config.json` is **404**. `cache.addAll` rejects on that response, aborting the install. A Playwright context observed the worker script start but no registration remained after installation.

**Impact:** a clean live browser has no service-worker controller. It cannot satisfy the required first-load precache, offline reload, or in-app update path. Local preview passes because Vite serves `dist/staticwebapp.config.json`, which masks the deployment-only failure.

**Required remediation:** exclude deployment-only files such as `staticwebapp.config.json` (and preferably `_headers`) from the service-worker precache input, rebuild, redeploy, and verify in a clean live profile that the registration is active/controller is true before repeating an offline reload and update-toast check.

### P2 — Singular workload label is grammatically incorrect

In the boundary plan, the UI renders **“1 cards / day”**. This is a minor copy defect; use singular wording for one card.

## Release recommendation

**FAIL.** The planner, privacy posture, quality gates, deployed identity, and repaired response policies are otherwise strong, but the live PWA contract is not met. Fix the precache/deployment mismatch, then re-run clean install, all test commands, clean-profile live service-worker activation, offline reload, update prompt, and live header checks.
