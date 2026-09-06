# Demo sandbox

## Open the demo

Use `/demo` or choose **Try it with sample data** on the landing page. The direct URL loads a 120-card mixed-subject return-to-study sample with overdue, short-interval, and lapsed cards.

## Isolation

Real plans use the IndexedDB database `review-backlog-restart`. Demo plans use `demo:review-backlog-restart`. The application selects one database for the whole session, so sample imports, route choices, check-ins, exports, restores, and resets never read or write the real plan.

## Controls

- **Reset demo** deletes the demo database and creates the shipped 120-card sample again.
- **Start for real** deletes the demo database and returns to `/`. It does not copy sample data into the real planner.
- The demo may export CSV or JSON so its outcome is fully testable. Leaving it still discards its stored sample state.

The service worker precaches `/demo/index.html` and its revisioned assets. Offline reloads of `/demo` use that cached shell and the demo database.
