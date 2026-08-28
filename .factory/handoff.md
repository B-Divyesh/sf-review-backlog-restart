# Verification handoff — Review Backlog Restart

## Release status: **FAIL — live PWA service worker does not install**

Verification work order: `review-backlog-restart-verify-3`
Tested candidate: `cc4c0b3076de31a3b09fac99e2f7105f1cf89ffc`
Live URL: <https://review-backlog-restart.sociobot.in/>

The full independent evidence is in `.factory/verification-3.md`.

## What was verified

- Clean `npm ci`, `npm test` (12/12), exact `npm run build`, `npm run test:e2e` (5/5), and `npm run test:e2e:repeat` (50/50) pass locally.
- Normal, invalid-import/recovery, boundary-capacity, CSV/JSON export, desktop, 390px mobile, keyboard, reduced-motion, axe, privacy, bundle, live identity, and live response-policy checks pass.
- The deployed assets match the candidate build (with only the service-worker version token differing), and the prior header/cache/MIME policy findings are repaired in production.

## Release blocker

The generated service worker precaches `/staticwebapp.config.json`. Azure uses that file as deployment configuration and does not expose it as a public asset: the live URL returns HTTP 404. Because `cache.addAll` rejects, a fresh live Chromium profile has no service-worker registration or controller after eight seconds. Offline reload and the update flow therefore cannot work on deployment.

Fix the precache list to exclude deployment-only configuration files, rebuild/redeploy, and verify a clean live profile has an active controller before marking this release PASS. A minor copy defect also renders “1 cards / day” for the one-card case.

## How to verify after remediation

```bash
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
```

Then in a fresh browser profile at the live URL, verify `navigator.serviceWorker.controller` is true, reload offline after one controlled online load, and exercise the in-app update prompt. Recheck immutable asset caching, no-cache `sw.js`/manifest, manifest MIME type, CSP, Permissions-Policy, and frame protection.
