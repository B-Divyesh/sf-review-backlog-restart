# Verification handoff — Review Backlog Restart

## Release status: **PASS**

Candidate verified: `da22ff1b0aa0418395bef867597399eb8576e803`

Live URL verified: <https://review-backlog-restart.sociobot.in/>
Full evidence: `.factory/verification-4.md` (2026-08-28).

This was an independent, clean-worktree verification; no product code changed. `npm ci`, `npm test` (14/14), exact `npm run build`, `npm run test:e2e` (8/8), and `npm run test:e2e:repeat` (80/80) pass. The live deployment matched candidate HTML, manifest, and main JS byte-for-byte; its service worker matched after normalization of its generated cache-version token.

The complete product flow, invalid-import recovery, workload boundary behavior, desktop/mobile keyboard use, reduced motion, axe scans, local-first storage, offline reload, service-worker update notice, privacy/network posture, headers, cache policy, manifest MIME, and bundle budgets passed. Fresh mobile Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.

## How to verify

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
```

Deploy `dist/` only. Azure Static Web Apps consumes `staticwebapp.config.json` as host configuration; the service worker deliberately excludes that file and `/_headers` from its browser precache.

## Defects / known gaps

None found. First online use is required before the app shell can serve a later offline reload; that is expected PWA behavior.
