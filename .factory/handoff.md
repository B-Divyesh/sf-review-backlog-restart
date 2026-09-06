# Repair 4 handoff — Review Backlog Restart

## Status

**Local acceptance: PASS. Live rollout: pending factory deployment.**

Implementation SHA: `85938f1cabccf926916d63e109500fd98b6d69c0`.

Documentation verification SHA: `f4ffc29c5c6722e9bdb09d073f2e3421ef68236a`.

The implementation commit was pushed to `main` on 2026-09-06. At the final cold-live check during this repair, HTTPS still served the previous `main-4C3LZ64L.js` build and the repository deployment endpoint had no record for the implementation SHA. This is a factory deployment-controller delay, not a code failure; no product-side deployment command is configured or authorized. Re-run the live checks below after the controller publishes `85938f1`.

## What changed

- Added `/demo` with a realistic 120-card sample, a persistent demo label, **Reset demo**, and **Start for real**.
- Separated demo IndexedDB (`demo:review-backlog-restart`) from real IndexedDB (`review-backlog-restart`). Entering, changing, exporting, restoring, resetting, and leaving demo cannot alter a real plan.
- Capped displayed daily work at the imported backlog size. Short imports no longer advertise impossible 83-card days.
- Added 16 declared public claims in `.factory/claims.json`, each with one outcome-based `@claim:` browser test from `/demo`.
- Rewrote first-screen and section copy in plain words. Added `.factory/copy-audit.md` and `.factory/demo.md`.
- Added direct demo metadata, canonical/OG/Twitter metadata, 1200×630 product social art, SVG favicon, 180px Apple touch icon, sitemap demo route, shared legal navigation/footer, and a designed static 404.
- Updated touch targets to 44px or larger, skip-link focus behavior, route focus announcements, and malformed-JSON recovery text.
- Fixed offline `/demo` reload: the worker now serves the direct demo shell and safely matches same-origin revisioned assets even when a static host adds `Vary: Origin`.

## How to verify

From a clean checkout with Node 20+:

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
npm run test:claims
```

Every individual command in `.factory/claims.json` was also run during this repair. Each passed from the direct `/demo` sandbox.

Recorded local results:

| Check | Result |
| --- | --- |
| `npm ci` | Pass, 59 packages, no vulnerabilities |
| `npm test` | Pass, 16/16 |
| `npm run build` | Pass, `dist/` with 23 precache assets |
| `npm run test:e2e` | Pass, 10/10 |
| `npm run test:e2e:repeat` | Pass, 100/100, one worker |
| `npm run test:claims` | Pass, 16/16 |
| Each declared claim command | Pass, 16/16 |
| `/opt/fleet/lib/verify-url.sh` on local `/demo` | Pass; no console errors, one h1/main, lang, and image alt text present |
| Playwright axe WCAG A/AA scans | Pass; zero violations on landing, demo, legal pages, and 404 |
| Lighthouse local mobile `/demo` | Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1s, LCP 2.0s, CLS 0, TBT 0ms |

Evidence is under `/work/.evidence/`, including `verify-local-repair-4/`, `lighthouse-local-repair-4-rerun.json`, and `catalog-description.txt`.

## Earlier and current review finding disposition

| Finding | Disposition |
| --- | --- |
| Fast route selection/export race | Kept fixed; normal and 100-repeat browser runs pass. |
| Static asset cache, MIME, CSP, and worker precache defects | Kept fixed; deployment-policy unit checks pass. |
| Sample overwrote real plan | Fixed with two IndexedDB namespaces and an isolation claim test. |
| Direct demo, label, reset, and start-real controls missing | Fixed at `/demo`; demo guide and tests added. |
| Six-card sample and misleading workload | Fixed with 120 cards and backlog-capped daily display. |
| Missing public claim contract | Fixed with 16 claim declarations and exact tagged tests. |
| Plain-words first screen and audit missing | Fixed with job/audience/action/facts and copy audit. |
| Designed 404, metadata, route skeleton, and touch targets missing | Fixed with real static 404 configuration, route-specific metadata, shared legal skeleton, and touch checks. |
| Raw invalid JSON parser text | Fixed with a plain recovery message and browser regression test. |

## Known gap and next step

No known product-code gap remains. The only outstanding step is external: wait for the factory static deployment controller to publish `85938f1`, then open fresh desktop and 390px phone contexts at the HTTPS origin, exercise `/demo`, confirm the real 404 returns HTTP 404, and rerun the cold HTTPS check.
