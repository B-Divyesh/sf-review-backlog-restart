# Handoff — Review Backlog Restart

## What shipped

- A finished Vite + vanilla TypeScript PWA for the researched return-after-a-break job.
- Read-only CSV/TSV parsing with quoted-field support, delimiter detection, useful header aliases, validation, skipped-row warnings, and exclusion of not-yet-due cards.
- A transparent 0–100 prioritization heuristic using overdue time, relative delay, lapses, and young intervals. Every score includes plain-language reasons and is explicitly labeled as an estimate rather than recall probability or FSRS output.
- Three recovery simulations: Protect memory, Steady return, and Clear by date. All respect the learner’s time capacity; impossible dates show how many cards fit instead of silently exceeding the limit.
- Day-by-day schedule preview, highest-priority table, optional daily check-ins, tagged action-list CSV export, full-plan JSON export/restore, and confirmed deletion.
- IndexedDB persistence with no server upload, account, analytics, cookie, third-party script, or runtime CDN.
- Installable manifest, original 192/512/maskable icons, versioned precache service worker, offline fallback, cache cleanup, `clientsClaim`, controlled `skipWaiting`, update toast, and a visible offline state.
- Responsive 390 px layout, keyboard-operable native controls, skip link, semantic landmarks, one h1, bound/accessible form names, designed focus states, reduced-motion treatment, and legal pages at `/privacy/` and `/terms/`.
- The product-specific “night conservatory” visual thesis and an original generated hero. Source, exact prompt, model, date, license, and delivery assets are recorded under `.factory/design.md` and `assets/src/`; the generated-image disclosure appears in the footer.

## How to run and verify

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Build output is exactly `dist/`, with `dist/index.html` at its root. `npm run build` also emits `dist/sw.js` from the final hashed asset list.

Verified locally on 2026-08-27:

- `npm test`: 8/8 unit tests pass across CSV parsing, error handling, risk ordering, capacity bounds, action assignment, and impossible deadlines.
- `npm run test:e2e`: 1/1 Chromium journey passes—sample import, settings change, route selection, action-list download, persisted reload, then `context.setOffline(true)` and a successful offline reload with the saved plan and offline banner.
- Browser smoke test: empty and populated states load with one h1 and one main landmark; no console/page errors online; 390 px viewport has no horizontal body overflow.
- axe-core 4.13 scans: zero violations on empty state, populated planner, `/privacy/`, and `/terms/`.
- Lighthouse mobile, local production preview: Performance **99**, Accessibility **100**, Best Practices **100**, SEO **100**. FCP 1.2 s, LCP 2.0 s, CLS 0, total blocking time 0 ms.
- Production payload: initial app JS 28.79 KB / 10.95 KB gzip; CSS 19.68 KB / 5.50 KB gzip; mobile hero WebP 38.07 KB; largest hero WebP 148.43 KB. No font payload.

## Known gaps and honest boundaries

- Standard Anki “notes” exports often omit scheduling history. The planner therefore requires a CSV/TSV containing Due and Interval, offers a template, and treats Lapses/Reviews as optional. It does not connect to or inspect an Anki collection directly.
- Risk is a relative triage heuristic, not FSRS and not a retention guarantee. Actual time and recall will vary.
- Check-ins are manual and track progress against the imported snapshot; they do not reconcile later Anki activity.
- First-time offline use is impossible until the shell has been loaded once online, as stated on the fallback page.

## Suggested next steps

- Validate the import template against popular Anki statistics-export add-ons and document exact export recipes.
- Run a seven-day opt-in usability study against the success measure (100+ cards, 30% reduction) without adding behavioral tracking.
- If field testing supports it, add a local-only column-mapping screen for exports with unfamiliar header names.
