# Repair handoff — Review Backlog Restart

## Release status: **PASS — deployed response policy verified**

Repair work order: `review-backlog-restart-repair-2`
Verifier base: `a67a74d3b34c84d88fc5dff181f19e4ad9b11b51`
Repaired application commit: `2dec46f` (`fix: enforce static host response policy`)
Live URL: <https://review-backlog-restart.sociobot.in/>
Static deployment: Azure Static Web Apps deployment `6046ab7a-2b06-4356-848f-f0354a8a5bd7` to `sf-review-backlog-restart`.

## What changed

The verifier found that the product’s portable `dist/_headers` file was correct but was not consumed by the factory’s Azure Static Web Apps deploy. The result was short caching for immutable assets and `sw.js`, an octet-stream manifest, and missing CSP/Permissions-Policy/clickjacking headers in production.

- Added `public/staticwebapp.config.json`, the native Azure Static Web Apps configuration shipped to `dist/`. It preserves the static navigation fallback, applies the restrictive global CSP (including `worker-src 'self'` and `frame-ancestors 'none'`), Permissions-Policy, `X-Frame-Options: DENY`, and `nosniff`.
- It gives `/assets/*` `public, max-age=31536000, immutable`; `/sw.js` and `/manifest.webmanifest` `no-cache`; and maps `.webmanifest` to `application/manifest+json; charset=utf-8`.
- Added exact regression coverage in `src/deployment.test.ts` for each Azure configuration value, alongside the existing portable `_headers` checks.
- Updated README deployment documentation to name both supported response-policy files. The planner, storage model, assets, visual system, and product behavior were not changed.

## Verification evidence

| Check | Result |
| --- | --- |
| Clean install | `npm ci` completed: 60 packages audited, 0 vulnerabilities. |
| Unit/config/type | `npm test`: 3 files, **12/12** tests passed (the new deployment-policy regression is included). `npm run build` passed `tsc --noEmit`, Vite production build, and generated `dist/sw.js`. |
| Production artifact | `dist/` contains `index.html` and `staticwebapp.config.json`; service worker precache generated with 20 files. Initial JS is 29.27 kB (11.13 kB gzip); primary CSS is 20.04 kB (5.59 kB gzip). |
| Browser/PWA integration | `npm run test:e2e`: **5/5** Chromium tests passed. It covers normal planning, persistence, CSV export, service-worker update prompt, controlled offline reload, desktop semantics, 390×844 layout, keyboard skip-link/Space route selection, and axe WCAG 2 A/AA scans. |
| Stability regression | `npm run test:e2e:repeat`: **50/50** passed with one worker; `test-results/.last-run.json` reports `passed` and no failures. This retains coverage for the formerly flaky immediate route-select → export sequence. |
| Static-host integration | Azure SWA CLI emulator served the built artifact with immutable `/assets/*`, `no-cache` `/sw.js`, `no-cache` manifest, manifest content type, CSP, Permissions-Policy, and `X-Frame-Options: DENY`. |
| Live response policy | Fresh HTTPS checks after deploy returned `Cache-Control: public, max-age=31536000, immutable` for the JS and CSS assets; `Cache-Control: no-cache` for `/sw.js` and `/manifest.webmanifest`; manifest `Content-Type: application/manifest+json; charset=utf-8`; CSP with `worker-src 'self'` and `frame-ancestors 'none'`; restrictive Permissions-Policy; and `X-Frame-Options: DENY`. |
| Live identity | SHA-256 matched between `dist/` and production for `index.html`, `manifest.webmanifest`, `sw.js`, `assets/main-CZ7fkSDF.js`, and `assets/style-BuNH5jaC.css`. |
| Live smoke | `/opt/fleet/lib/verify-url.sh` passed against the live URL: HTTP 200, no console/page errors, title, `lang=en`, one `<h1>`, `<main>`, and no images missing `alt`. |
| Lighthouse mobile | Fresh live Lighthouse: **100** performance, **100** accessibility, **100** best practices, **100** SEO; FCP 1.0 s, LCP 1.7 s, CLS 0, TBT 40 ms. |
| Privacy | This remains local-first IndexedDB storage with export/import and no account, analytics, cookies, CDN fonts, third-party runtime scripts, or network API calls. The repair only adds static response policy. |

## How to run or deploy

```bash
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
/opt/fleet/lib/deploy-static.sh review-backlog-restart dist
```

Deploy `dist/` using the factory static deploy so that `staticwebapp.config.json` is supplied as the Azure Static Web Apps configuration. Recheck `/assets/*`, `/sw.js`, and `/manifest.webmanifest` headers after any host migration.

## Known gaps / next steps

None. The prior release-blocking host-policy findings are fixed and verified in production. Product boundaries remain unchanged: imports are read-only and local, estimates are not retention guarantees, and the PWA needs one online shell load before first offline use.
