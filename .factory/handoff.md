# Repair handoff — Review Backlog Restart

## Release status: **PASS — offline PWA repair deployed and verified**

Repair work order: `review-backlog-restart-repair-3`
Verifier base/report: `a50471cad8c8609da12190a6a62ce984022d64f1` / `.factory/verification-3.md`
Repaired application commit: `924dd8f2ffdb1258659ed9ca5f41da35cde276ee` (`fix: exclude deployment config from PWA precache`)
Live URL: <https://review-backlog-restart.sociobot.in/>
Static deployment: Azure Static Web Apps deployment `db4d3def-652d-4887-8d55-9c650d9332f8` to `sf-review-backlog-restart`.

## What changed

- Fixed the release-blocking deployment mismatch. The service-worker build now excludes `/_headers` and `/staticwebapp.config.json`: Azure consumes both as deployment configuration and serves neither to browser clients. The emitted worker precaches 18 public app-shell assets instead of attempting a failing `cache.addAll` request.
- Added regression coverage at three levels: selection unit tests, production-worker content checks, and a fresh-browser test that forces `staticwebapp.config.json` to return 404 and still requires an active worker/controller. The existing offline reload and update-toast coverage remains intact.
- Repaired the verifier’s copy finding: one-card routes render `1 card / day`, with a unit and browser regression.
- Preserved the static/PWA deployment class, local IndexedDB model, visual system, response policy, and all previously passing planner behavior.

## Verification evidence

| Check | Result |
| --- | --- |
| Clean install | `npm ci` completed: 60 packages audited, 0 vulnerabilities. |
| Unit/configuration | `npm test`: 4 files, **14/14** passed, including host-only precache and singular-label regressions. |
| Type/build | `npm run build` passed `tsc --noEmit`, Vite, and worker generation. `dist/` has root `index.html`; worker output reports **18** precached assets and contains neither deployment-only file. |
| Browser/integration | `npm run test:e2e`: **8/8** Chromium tests passed. It covers normal planning, durable route/export, worker installation with host configuration 404, emitted worker contents, singular copy, offline reload, update toast, desktop semantics, axe, keyboard, and 390×844 layout. |
| Stability | `npm run test:e2e:repeat`: **80/80** passed (`--repeat-each=10 --workers=1`); `test-results/.last-run.json` is `passed` with no failures. |
| Bundle budget | Initial JS 29.32 kB (11.15 kB gzip); primary CSS 20.04 kB (5.59 kB gzip); mobile hero 40 kB; no webfont payload. All meet the static-PWA budgets. |
| Live service worker | Fresh Chromium profile: `{ controller: true, active: true, waiting: false }`. It reloaded offline with “Your backlog is not a moral emergency.” and no console/page errors. `/staticwebapp.config.json` correctly returns 404 while live `sw.js` contains neither it nor `/_headers`. |
| Live response policy | Hashed JS: `public, max-age=31536000, immutable`; `sw.js` and manifest: `no-cache`; manifest: `application/manifest+json; charset=utf-8`. CSP includes `worker-src 'self'` and `frame-ancestors 'none'`; Permissions-Policy, HSTS, nosniff, Referrer-Policy, and `X-Frame-Options: DENY` are present. |
| Live identity | SHA-256 matched local and live `index.html`, `manifest.webmanifest`, and `assets/main-4C3LZ64L.js`; normalized service-worker contents matched aside from the generated version token. |
| Live product/privacy | Sample import produced three plans; Protect memory exported `backlog-action-list-2026-08-28.csv`. Browser capture observed only the product origin, zero cookies, and zero console/page errors. Data remains IndexedDB-local with JSON/CSV ownership controls. |
| Accessibility and responsive | Live axe WCAG 2 A/AA: **0 violations**. At 390×844 there is no horizontal overflow; Tab reaches the skip link. Local suite confirms Space selects a route and reduced-motion behavior. |
| Lighthouse mobile | Live `lighthouse` command exited 0: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP 1.5 s, CLS 0, TBT 20 ms. |

## How to run and deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
/opt/fleet/lib/deploy-static.sh review-backlog-restart dist
```

The static deployment must use `dist/` so `staticwebapp.config.json` is supplied to Azure as host configuration, not treated as a public PWA asset.

## Known gaps / next steps

None. The product remains intentionally local-first: a first online visit installs the app shell before an offline reload is available.
