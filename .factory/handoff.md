# Review 1 handoff — Review Backlog Restart

## Status: **FAIL**

Independent review report: `.factory/review-1.md`

Implementation reviewed: `924dd8f2ffdb1258659ed9ca5f41da35cde276ee`

Documentation SHA reviewed: `91b644401556e2e5b88a9b4da847cc148c80d5db`

Live URL: <https://review-backlog-restart.sociobot.in/>

No product code was changed. The review found **9 grouped findings** and **14 untested public claim groups**, so the result is unambiguously FAIL.

The main planner is stable: clean install, 14/14 unit tests, production build, 8/8 browser tests, and 80/80 repeated browser tests passed. Live desktop and phone use, CSV export, JSON backup/restore, invalid import recovery, 500-card boundaries, persistence, reset, keyboard use, axe scans, reduced motion, same-origin privacy behavior, service-worker control, and offline reload were exercised. Fresh mobile Lighthouse scored 100 in Performance, Accessibility, Best Practices, and SEO.

The release still fails because the sample shares and can overwrite real IndexedDB state, no direct or labeled demo sandbox exists, the six-card sample produces misleading daily-load numbers, `.factory/claims.json` and all claim-tagged tests are absent, the first screen and headings violate the plain-words contract, a real 404 is missing, metadata/route structure are incomplete, several touch targets are under 44 px, and invalid JSON exposes a raw parser message. `.factory/demo.md` and `.factory/copy-audit.md` are also missing.

## Reproduce the clean gates

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
```

## Evidence

- Full findings and earlier-finding disposition: `.factory/review-1.md`
- Required copy: `/work/.evidence/qa-report.md`
- Machine result: `/work/.evidence/qa-result.json`
- Browser captures: `/work/.evidence/live-*-first-screen.png` and `/work/.evidence/live-*-sample.png`
- Runtime artifacts: `/work/.evidence/live-sample-export.csv`, `/work/.evidence/live-sample-backup.json`, `/work/.evidence/verify-url/verify.json`, and `/work/.evidence/lighthouse.json`

## Next steps

1. Separate demo and real storage, add `/demo`, persistent demo labeling, reset/start-for-real controls, and a realistic 100+ card sample.
2. Add `.factory/claims.json` and exactly tagged clean-demo tests for every retained public claim.
3. Rewrite the first screen, title, headings, README, and legal copy in task-naming plain words; add `.factory/copy-audit.md`.
4. Add the designed 404, metadata/social image, route titles/sitemap entries, consistent header/footer, and build id.
5. Enlarge all interactive targets to at least 44 px and replace the raw JSON parser error.
6. Re-run every gate and the live desktop/phone review. Do not declare PASS until findings and untested claims are both zero.
