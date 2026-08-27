# Verification handoff — Review Backlog Restart

## Release status: **FAIL**

Independent QA of candidate `8e9406ccf2001053037781a312d1cffaaeeec3f6` against <https://review-backlog-restart.sociobot.in/> is **not approved**. Full evidence is in [verification.md](verification.md).

- Clean install, 8/8 unit tests, type-checked production build, manual normal/boundary/error journeys, accessibility, mobile, privacy, PWA offline/update, and live candidate identity checks were completed.
- `npm run test:e2e` is intermittent. A repeat of the exact Playwright journey failed 1/10 times while awaiting the CSV download immediately after selecting a route. This is a release-blocking quality-gate failure.
- The live deployment matches the candidate artifacts (service-worker cache stamp aside), but sends fingerprinted assets with `max-age=30` rather than immutable caching. It also serves the manifest as `application/octet-stream`.

Before release: fix the action/persistence race, make the required e2e stable, configure immutable caching for hashed assets, correct the manifest MIME type, then rerun the verification matrix in `verification.md`.

To reproduce the local gates from a clean checkout:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npx playwright test --repeat-each=10
```
