# Review Backlog Restart

Review Backlog Restart is a private, offline-capable planning companion for spaced-repetition learners returning after a break. Import a read-only CSV/TSV copy of overdue Anki cards, set a real daily time limit and target date, compare three recovery routes, then export a day-tagged action list. It does not sync with Anki, replace FSRS, modify scheduling data, or promise retention.

Live: <https://review-backlog-restart.sociobot.in>

## The workflow

1. Import a UTF-8 CSV or TSV with `Front`, `Due`, and `Interval` headers. Optional `Deck`, `Back`, `Lapses`, `Reviews`, `Ease`, and `Tags` fields improve the output. A matching template and sample deck are available in the app.
2. Set daily minutes, a target date, and typical seconds per review.
3. Compare risk-first, balanced, and deadline-first routes. Every route stays inside the stated time box and calls out an impossible deadline.
4. Export a CSV containing suggested `rbr::day-NN` and `rbr::risk-*` tags alongside the original fields.
5. Optionally record a daily reviewed count. Export or restore the entire local plan as JSON.

Risk is a transparent triage estimate based on lateness, delay relative to interval, past lapses, and young material. It is not a recall probability.

## Local development

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Test and build

```sh
npm test
npm run build
```

The production build command is exactly `npm run build`. It type-checks, builds all pages, and creates a versioned service worker. Static output lands in `dist/`, with `dist/index.html` at its root.

The real-browser test covers persistence, CSV download, and an offline reload:

```sh
npm run test:e2e
npm run test:e2e:repeat
```

Preview the production build with `npm run preview`. Deploy the contents of `dist/` to a static host that serves `/privacy/` and `/terms/` directory indexes and permits the root-scoped `/sw.js` service worker. The build includes both `_headers` and `staticwebapp.config.json`: the latter is the production Azure Static Web Apps configuration used by the factory deploy. Both declare the CSP and clickjacking protection, a manifest MIME type, an update-safe service-worker policy, and immutable caching for `/assets/*`.

## Privacy and offline behavior

Imported cards, settings, route choice, and check-ins are stored only in this browser’s IndexedDB. There is no account, analytics, third-party runtime script, CDN font, or deck upload. The app shell is precached after the first visit and the saved plan remains usable offline. Use “Export data” for a portable JSON backup or “Start over” to delete local plan data.

See [the product brief](.factory/brief.json), [visual system](.factory/design.md), [privacy policy](privacy/index.html), and [terms](terms/index.html).

## License

MIT © 2026 Sociobot (Param Factory).
