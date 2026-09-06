# Review Backlog Restart

Plan an overdue Anki review backlog with a daily time limit, risk order, and tagged action list.

It is for spaced-repetition learners returning after a break. Import a read-only CSV or TSV copy, compare three recovery plans, then export what to study first. It does not sync with Anki or predict retention.

Live site: <https://review-backlog-restart.sociobot.in>

## Start with the sample

Open <https://review-backlog-restart.sociobot.in/demo> or choose **Try it with sample data** on the first screen. The demo loads a 120-card sample in the `demo:review-backlog-restart` IndexedDB database. It never reads or writes the real-plan database. **Reset demo** restores the sample. **Start for real** discards demo data and returns to the real planner.

## Use the planner

1. Import a UTF-8 CSV or TSV with `Front`, `Due`, and `Interval` headers.
2. Set daily minutes, a target finish date, and your usual seconds per card.
3. Compare risk-first, steady, and deadline plans.
4. Export a CSV with day and risk tags beside the original fields.
5. Export JSON before deleting a real local plan if you want a backup.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173` for the planner or `http://localhost:5173/demo` for the sample.

## Test and build

```sh
npm test
npm run build
npm run test:e2e
npm run test:e2e:repeat
npm run test:claims
```

`npm run build` type-checks the app and writes the static PWA to `dist/`. The browser suite checks keyboard use, phone layout, route metadata, JSON recovery, PWA updates, and offline use. The claim suite runs every public claim in `.factory/claims.json` from `/demo`.

To run one declared claim command, copy its `test` command from `.factory/claims.json`. Each command builds from a clean checkout before opening the demo sandbox.

## Privacy and offline use

Imported card data, settings, plans, and daily records stay in IndexedDB in this browser. The app has no account, analytics, third-party runtime scripts, CDN fonts, or cookies. After the first visit, the service worker caches the app shell for offline reloads. The sample and the real planner use separate local databases.

## Static deployment

Deploy the contents of `dist/` to the factory static host. Keep `staticwebapp.config.json` and `_headers` with the files. They provide the designed 404 response, security headers, manifest MIME type, service-worker update policy, and immutable caching for hashed assets.

See [the product brief](.factory/brief.json), [the visual system](.factory/design.md), [the demo guide](.factory/demo.md), [privacy](privacy/index.html), and [terms](terms/index.html).

## License

MIT © 2026 Sociobot (Param Factory).
