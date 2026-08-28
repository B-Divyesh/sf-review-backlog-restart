# Independent verification 4 — PASS

**Candidate:** `da22ff1b0aa0418395bef867597399eb8576e803`

**Live URL:** <https://review-backlog-restart.sociobot.in/>
**Verified:** 2026-08-28
**Verdict:** **PASS — candidate and deployment satisfy the reviewed acceptance contract.**

## Environment and scope

Verification used a fresh detached worktree at `/tmp/review-backlog-restart-qa`, Node 22.23.2, Playwright Chromium 1.58.2, and the exact production command. Product source was not changed. This report and the handoff are the only changes made in the repository.

## Quality gates

| Check | Result | Fresh evidence |
| --- | --- | --- |
| Clean install | Pass | `npm ci`: 59 packages added; 60 audited; 0 vulnerabilities. |
| Unit/configuration tests | Pass | `npm test`: 4 files, **14/14** tests passed. Includes CSV parsing, risk and workload bounds, action-tag assignment, and deployment response-policy/precache assertions. |
| Type check and production build | Pass | `npm run build` completed `tsc --noEmit`, Vite build, and service-worker creation. `dist/` was emitted with 18 precached public assets. |
| Browser integration | Pass | Exact `npm run test:e2e`: **8/8** Chromium tests passed in 23.3 s. |
| Stability | Pass | `npm run test:e2e:repeat`: **80/80** passed, single worker, 3.8 min. This repeatedly covers the formerly sensitive immediate route-selection/export sequence. |
| Available lint/type check | Pass / N/A | The repository has no lint script; the available TypeScript check is part of the passing build. |
| Build budget | Pass | Main JS 29.32 kB (11.15 kB gzip); main CSS 20.04 kB (5.59 kB gzip); no webfont payload; mobile hero 38.07 kB. All are within the supplied static-PWA budgets. |
| Lighthouse mobile | Pass | Fresh live rerun: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP 1.5 s, CLS 0, TBT 60 ms. |

## Product and boundary checks

- The normal job-to-be-done succeeds locally and live: sample/imported cards produce three recovery routes, an explicit time-boxed choice, high-risk ordering/reasons, a tagged CSV download, and durable route selection after reload.
- The exported action list contains the original scheduling fields plus `Action day`, `Action date`, `Suggested tags`, `Risk band`, `Risk score`, and reasons; generated tags include `rbr::day-01` and a risk tag. It is a download only and does not write to Anki.
- CSV/TSV parsing covers aliases, quoted commas/newlines, future-card exclusion warnings, malformed/missing headers, and recovery after a bad import. An independently exercised missing-`Interval` upload showed: “Missing Interval column. Use the template to match supported headers.” A valid replacement import then succeeds.
- Boundary coverage passes: the plan tests confirm all 100-card routes remain inside daily capacity; a 500-card, 5-minute, 30-second/card, two-day case is honestly shown as impossible (`10` cards/day and only `20` of `500` by date). Browser range validation rejects one daily minute with “Value must be greater than or equal to 5.”
- Projections are labelled estimates, the risk explanation explicitly says it is not FSRS/recall probability/retention guarantee, and the product avoids syncing or scheduling mutation.

## Browser, accessibility, privacy, and PWA checks

- Desktop and 390×844 mobile checks passed with no horizontal overflow. Keyboard-only use reaches the visible skip link first; Enter reaches main and Space selects a route. The authored 3 px sky focus treatment is present, and the focused skip link visibly enters the viewport.
- Reduced-motion emulation yields an effective `0.01ms` transition duration and automatic scrolling. No looping or flashing motion was found.
- axe-core 4.13 WCAG A/AA scans found **zero violations** (therefore zero serious/critical) locally on empty/populated/mobile planner and legal pages, and on the live populated planner.
- Normal local and live journeys had zero console errors and zero page errors. The live browser capture made only same-origin product requests; there are no analytics, third-party scripts/fonts, or cookies observed.
- Imported data, settings, selection, and check-ins are IndexedDB-local. JSON export/restore and CSV export exist; reset is confirmed with the exact local-data consequence. `/privacy/` and `/terms/` load with semantic main and h1 landmarks.
- PWA checks pass. Manifest has standalone display, themed versioned start URL, 192/512/maskable icons. A controlled saved plan reloads live while offline with “Offline · your saved plan still works”; three routes remain rendered. The test suite also verifies a newer worker produces the in-app update toast. The worker installs even when Azure’s deployment-only `staticwebapp.config.json` is 404 and precaches neither it nor `/_headers`.

## Live deployment identity and response policy

- SHA-256 of live and fresh-candidate `index.html`, `manifest.webmanifest`, and `assets/main-4C3LZ64L.js` matched exactly. `sw.js` matched after normalizing only its intentionally generated cache-version token.
- Live static responses have immutable hashed assets (`Cache-Control: public, max-age=31536000, immutable`), `no-cache` service worker and manifest, and manifest MIME `application/manifest+json; charset=utf-8`.
- Live HTTPS responses include HSTS, `nosniff`, `strict-origin-when-cross-origin`, CSP with `worker-src 'self'` and `frame-ancestors 'none'`, restrictive Permissions-Policy, and `X-Frame-Options: DENY`.
- Live document semantics: `lang=en`, one title, one h1, one main. The hero image has meaningful alt text.

## Defects by severity

None found. No known release-blocking, high, medium, or low defects from this verification.

## Release recommendation

**PASS.** Deploy/retain the tested candidate. The previously reported deployment-only worker/precache, caching, MIME, and response-policy failures are not reproducible on this commit or its live deployment.
