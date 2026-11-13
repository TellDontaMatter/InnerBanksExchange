# Civic search + ticker: what's left before public launch

Status: built and tested locally on branch `claude/confident-johnson-0gof95`. Nothing deployed.

## Blocking (needs you)
1. **Model API key: deferred by choice.** Launching without it. Search lists matching sources (with confidence) and no written summary; the ticker shows headlines and links only. To switch summaries on later: `firebase functions:secrets:set ANTHROPIC_API_KEY`, then redeploy. No code change.
2. **Verify the ticker sources.** The build sandbox cannot reach any news or government site (403), so no feed could be confirmed. From a normal machine run `node functions/civic/scripts/check-sources.js`, then paste each `feedUrl` into `functions/civic/config/regions.js`. Sources with no `site` yet need a URL from you: Chowan Herald, Albemarle Observer, and the Hampton Roads city governments (which cities?). Sources with no feed (common for town/county sites) need a different approach or get dropped.
3. **Hosting: goibx.com is on CloudBase; the API is a Firebase function.** The engine deploys as the Firebase function `civicApi` (CORS open), so it works from any host. After the first functions deploy, copy the function URL and set it in three places (each marked `SET AFTER DEPLOY`): `index.html` (`var API`), `connect/index.html` (`var API`), `civic/web/config.js` (`api`). Until set, the new bits stay dormant and nothing breaks. On CloudBase upload: the root `index.html` (goibx.com) and the folder `civic/web/` as `/civic/` next to it. The home widget links to `/civic/results.html` and `/civic/region.html`; the Connect page links to `https://goibx.com/civic/...` (`SITE`). No Firebase Hosting rewrite is needed.
4. **Deploy approval** (functions, scheduler, hosting). `firebase deploy` is not run. Confirm Blaze billing alerts/budget are set.

## Should do before launch
- Fill `group` (ownership group) on sources so syndicated TV copy is not counted as independent. Affirmed = 3+ independent sources.
- Visitor cap is per browser id (falls back to IP). Clearing storage resets the personal cap; the site-wide 50/day cap still holds. Consider also keying on IP.
- Review the hold-for-review word list and name heuristic (`functions/civic/engine/review.js`) against real queries from the log; it errs toward holding.
- Add a human workflow for the review queue (approve/reject + publish an answer). Today the admin view lists held queries only.
- Firestore: civic collections (`civicLog`, `civicReview`, `civicRequests`, `civicCounters`, `civicTicker`) are written by the function only; with no matching rules they are client-denied. Confirm no rule change is wanted.
- Rate limiting / abuse protection on `civicApi` (App Check or similar) and a CORS allowlist instead of `cors: true`.
- Privacy/terms line on the search page; retention period for `civicLog`.
- The "request this place" form stores a request and never sends email. Any follow-up email needs your OK.
- Spend data: plug an adapter into `functions/civic/engine/spend.js` (`coverage`, `detail`). Paid line-level detail needs a payment/entitlement check (Stripe, later).
- Set `ANTHROPIC` model id/cost check in config `model.id`; confirm daily cost at 50 summaries + 3 ticker calls/day.

## Run it
- Tests: `cd functions && npm test` (15 tests)
- Local preview with sample data: `node civic/dev-server.js` -> http://localhost:5055 (admin: `/admin.html?dev=1`)
