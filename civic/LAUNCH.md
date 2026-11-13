# Civic search + ticker: what's left before public launch

Status: built and tested locally on branch `claude/confident-johnson-0gof95`. Nothing deployed.

## READ FIRST: the repo's `connect/` folder is stale. Do not deploy it.
goibx.com is **Firebase Hosting** serving the IBX Connect page. The live page (checked Nov 13) is a newer, larger
codebase than `connect/` in this repo: it has `ibx.css`, `connect-theme.css`, `wire/`, `fonts/`, `img/`, extra
sections, and a different panel. `firebase deploy --only hosting:connect` from this repo would overwrite the live
site with the old version. Add the civic pieces to the folder you actually deploy goibx.com from.

## Deploy, in order (run on your machine; this sandbox can't sign in to Firebase)
1. **Backend.** From this repo: `cd functions && npm install`, then `firebase deploy --only functions`. Deploys `civicApi` and the daily `civicTickerDaily` (06:00 ET). No model key needed (see below).
2. **Add the civic pages to your live site folder.** Copy `connect/civic/` to `<your live folder>/civic/`.
3. **Add the rewrite** to the `firebase.json` that deploys goibx.com, on the hosting target for goibx.com:
   `"rewrites": [{ "source": "/api/**", "function": { "functionId": "civicApi", "region": "us-central1" } }]`
4. **Patch the panel** on the live home page (search box on top, prefilled from the ticker, fading pages):
   `curl -s https://goibx.com -o live-index.html && python3 civic/live-patch/apply.py live-index.html index.html`
   then put that `index.html` in your live folder. (Or compare `civic/live-patch/index.live-2026-11-13.html`, a snapshot of live as of Nov 13.)
5. `firebase deploy --only hosting:<your goibx.com target>`.
Until step 1 and 3 are done the new bits stay dormant: the ticker request 404s, the engine page never joins the rotation, and the search box just has no prefill.

## Blocking / needs you
1. **Model API key: deferred by choice.** Launching without it. Search lists matching sources (with confidence) and no written summary; the ticker shows headlines and links only. To switch summaries on later: `firebase functions:secrets:set ANTHROPIC_API_KEY`, then redeploy. No code change.
2. **Verify the ticker sources.** The build sandbox could not reach the publishers, so no feed is wired. From a normal machine run `node functions/civic/scripts/check-sources.js`, then paste each `feedUrl` into `functions/civic/config/regions.js`. Still need a URL for: Chowan Herald, Albemarle Observer, and which Hampton Roads city governments. The ticker is empty until feeds are set.
3. **Billing:** Blaze is on; set a budget alert before enabling the schedule.

## Should do before launch
- Fill `group` (ownership group) on sources so syndicated TV copy is not counted as independent. Affirmed = 3+ independent sources.
- Visitor cap is per browser id (falls back to IP). Clearing storage resets the personal cap; the site-wide 50/day cap still holds.
- Review the hold-for-review word list and name heuristic (`functions/civic/engine/review.js`) against real queries.
- Human workflow for the review queue (approve/reject + publish an answer). Today the admin page (`/civic/admin.html`) lists held queries only.
- Rate limiting / App Check on `civicApi`; CORS is open (`cors: true`), tighten to goibx.com.
- Privacy/terms line on the search page; retention period for `civicLog`.
- "Request this place" stores a request and never sends email.
- Spend data: plug an adapter into `functions/civic/engine/spend.js`. Paid line-level detail needs an entitlement check (Stripe, later).

## Run it
- Tests: `cd functions && npm test` (15 tests)
- Local preview with sample data: `node civic/dev-server.js` -> http://localhost:5055 (admin: `/admin.html?dev=1`)
