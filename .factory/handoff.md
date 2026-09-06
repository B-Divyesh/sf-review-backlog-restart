# Verification 5 handoff — Review Backlog Restart

## Status

**Independent QA: FAIL — 4 findings and 4 untested public claim groups.**

Implementation reviewed: `85938f1cabccf926916d63e109500fd98b6d69c0`.

Documentation baseline reviewed: `fdb59c5bab067345fd1ebae2542dcdfee306cea6`.

The factory deployment completed during this verification. HTTPS now serves `main-D-TpRHv8.js`, and the live root, routes, assets, manifest, and normalized service worker match the candidate build.

## What was verified

- Clean `npm ci`, 16/16 unit tests, production build, 10/10 browser tests, 100/100 repeated browser tests, and 16/16 consolidated claim tests pass.
- All 16 exact claim commands in `.factory/claims.json` pass separately.
- Fresh desktop and 390 × 844 phone browsers clearly state the planning job, returning-learner audience, sample action, and private/offline/free facts before scrolling.
- The one-click 120-card demo, persistent label, three plans, risk output, tagged 121-line CSV, reset, start-real flow, and real/demo isolation work live.
- Normal, invalid CSV, malformed JSON, 500-card boundary, native range validation, persistence, deletion, keyboard, dialog, reduced-motion, offline reload, and update-notice paths were exercised.
- Live requests are same-origin and cookie-free. Legal pages, route titles, metadata, manifest/icons, headers, links, and the designed HTTP 404 pass.
- Fresh Lighthouse mobile `/demo`: 98 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 1.2 s, TBT 170 ms, CLS 0.
- WCAG A/AA axe scans report zero violations, but a full best-practice scan found the issues below.

## Remaining findings

1. **P1:** Keyboard traversal lands on three clipped 1 × 1 px file inputs with no visible focus; two also sit outside landmarks.
2. **P2:** Four public claim groups lack complete one-to-one tagged coverage: template download, daily-record persistence/undo, demo-state discard on exit, and UTF-8 content preservation.
3. **P3:** `<aside class="demo-banner" role="status">` uses a role that axe reports as invalid for that element.
4. **P3:** A one-card daily record says “1 cards recorded in this browser.”

Product code was not modified during verification. Full evidence and reproduction details are in `.factory/verification-5.md` and `/work/.evidence/verify-5/`.

## How to rerun

From a clean checkout with Node 20+:

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
npm run test:claims
```

Also run every `test` value in `.factory/claims.json` separately. After repair, repeat full axe without limiting it to WCAG tags, traverse the whole page by Tab, exercise one-card daily recording, and confirm every public action or promise has one complete tagged claim test.

## Next step

Repair F1–F4, add or strengthen the four tagged claim tests, then repeat clean local and fresh live verification. Do not declare PASS until both finding and untested-claim counts are zero.
