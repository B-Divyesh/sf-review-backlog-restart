# Repair handoff — Review Backlog Restart

## Release status: repaired locally; deployment verification pending push

This repair addresses every release-blocking finding in the independent verification report for candidate `8e9406ccf2001053037781a312d1cffaaeeec3f6` (`78b13fa4e0d0543382fa79b4a4a8ef44fdb41662`). The researched brief, visual thesis, local-first model, and all previously passing planner behavior are preserved.

## What changed

- **P0: route selection/export persistence race:** choosing a route now immediately enters an explicit local-save state. Route controls and the tagged CSV export are disabled until the selected route has committed to IndexedDB and the route UI has rerendered. A storage failure restores the prior route and reports an actionable error, so no transient action list can be exported.
- **P1: immutable static assets:** `public/_headers` sets `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`, while HTML is revalidated and `sw.js` is `no-cache` for update checks.
- **P2: manifest MIME type:** `_headers` explicitly serves `/manifest.webmanifest` as `application/manifest+json; charset=utf-8`; the manifest link also declares that type.
- **P3: defensive browser policy:** `_headers` adds a static-site CSP (`worker-src 'self'`, no object/embed sources, same-origin script/style/connect/image sources, `frame-ancestors 'none'`), restrictive Permissions-Policy, X-Frame-Options, Referrer-Policy, and nosniff.
- The offline fallback stylesheet is now a first-party built CSS asset rather than an inline `<style>`, and the risk display uses native `<progress>` rather than an inline style attribute. This allows the CSP to remain free of `unsafe-inline` without changing the product’s visual system.
- Playwright is pinned to `1.58.2`, matching the provided browser runtime.

## Regression coverage and verification

Performed on 2026-08-28 from a clean install:

```sh
npm ci
npm test
npm run build
npm run test:e2e
npx playwright test tests/app.spec.ts --repeat-each=10 --workers=1
```

- `npm ci`: completed with 0 vulnerabilities.
- `npm test`: **11/11** passed. New configuration tests lock the asset cache policy, service-worker update policy, manifest MIME type, CSP/frame policy, and no-inline-style requirement.
- `npm run build`: passed type check and Vite build; `dist/index.html` is present. Initial app JS is **29.27 KB** (**11.13 KB gzip**) and app CSS **20.04 KB** (**5.59 KB gzip**), within static/PWA budgets.
- `npm run test:e2e`: **5/5** Chromium tests passed. This covers normal import/settings/export/reload, the P0 no-delay route-select → durable state → download path, offline saved-plan reload, service-worker update toast, desktop semantics, 390×844 mobile layout, keyboard skip-link/Space route selection, and axe WCAG A/AA scans on empty/populated planner plus privacy and terms pages.
- Repeated P0 stress: the two app journeys ran ten times each (**20/20 passed**) with one worker and no settle delay.
- Lighthouse local production preview: Performance **96**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **2.0 s**, LCP **2.5 s**, CLS **0**, TBT **0 ms**.
- Privacy: no application analytics, account, upload, third-party runtime scripts, CDN fonts, or cookies were introduced. Imported data remains IndexedDB-only and export/delete controls remain available.

## Deployment notes

Static deployment configuration is shipped as `dist/_headers` through Vite’s public-file copy. The deployment target must honor standard `_headers` rules; after the repair commit is pushed, verify the live `/assets/*`, `/manifest.webmanifest`, and `/sw.js` responses before release approval.

## Known product boundaries

- The import remains a read-only CSV/TSV companion. It does not connect to Anki or alter collection scheduling.
- Risk is a relative triage heuristic, not FSRS, a recall prediction, or a retention guarantee.
- Check-ins are manual and intentionally do not reconcile later Anki activity.
- First-time offline use still requires one initial online shell load, as described on the fallback page.
