# Verification handoff — Review Backlog Restart

## Release status: **FAIL — live static response policy is not deployed**

Candidate verified: `b32daaf03e2538a191e3339f96193bdde4ede50b`
Live URL verified: <https://review-backlog-restart.sociobot.in/>
Full evidence: `.factory/verification-2.md`.

The candidate application is healthy: clean install, 11/11 unit/configuration tests, exact production build, 5/5 browser tests, and their ten-repeat stress run (50/50) pass. Local mobile Lighthouse scored 99 performance / 100 accessibility / 100 best practices / 100 SEO. Normal and boundary planner journeys, invalid CSV recovery, keyboard/mobile/reduced-motion behavior, accessibility scans, privacy/origin checks, service-worker update behavior, and offline saved-plan reload all pass. The live application files match the candidate build and the live normal/offline browser journeys pass.

Release is blocked by production-only deployment defects:

- **P1:** `/assets/*` and `/sw.js` are served with `Cache-Control: public, must-revalidate, max-age=30`, not the candidate's immutable asset and update-safe service-worker policies.
- **P1:** `/manifest.webmanifest` is `application/octet-stream` with `nosniff`, not `application/manifest+json; charset=utf-8`.
- **P2:** CSP, Permissions-Policy, and clickjacking protection declared in the candidate's `dist/_headers` are absent from live responses.

Deploy or equivalently configure the committed `dist/_headers`, then freshly check `GET /assets/main-CZ7fkSDF.js`, `/assets/style-BuNH5jaC.css`, `/sw.js`, and `/manifest.webmanifest` before releasing. No product-code change is requested by this verification.

## Product boundaries

- The CSV/TSV import is read-only and local; the product does not sync to or alter Anki scheduling.
- Risk is a transparent relative triage heuristic, not FSRS, a recall prediction, or a retention guarantee.
- Check-ins are manual, local-only markers; first offline use requires one online shell load.
