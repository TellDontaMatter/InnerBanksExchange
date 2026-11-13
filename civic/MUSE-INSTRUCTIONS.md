# Instruction for Muse (computer use, on the owner's PC)

Goal: add the civic search + ticker to the LIVE goibx.com site without breaking it, and get the live site's source into git.

Background: goibx.com is Firebase Hosting (project `thruket-site1`) serving the IBX Connect page. The live page is NEWER than `connect/` in the GitHub repo `TellDontaMatter/InnerBanksExchange`. The repo copy is stale. NEVER deploy the repo's `connect/` folder. Work only from the folder this PC actually deploys goibx.com from.

## Rules
- Engine, site and Firestore all stay in project `thruket-site1` (decided). Do not use Cloudflare/D1 for this. Do not touch the shop, Stripe, intake, existing listings, or any other hosting target. Deploy only what is named below.
- No secrets in git. Do not set or ask for any API key (summaries are deliberately off for now).
- Never use `--force`. Back up before overwriting. Do not send any email.
- If anything doesn't match what is written here, stop and report instead of guessing.

## Steps
1. **Build a staging copy mirrored from the LIVE site** (the way ads.txt was deployed on Nov 12). Do NOT use `~/workspace/ibx-source/ibxconnect/` or any other local copy: they are stale (they predate the live Data Centers section). Mirror https://goibx.com (site `ibxconnect`, project `thruket-site1`) into a fresh staging folder: `index.html`, `about.html`, `ads.txt`, `connect-theme.css`, `ibx.css`, `wire/`, `fonts/`, `img/`, favicon, og.png, and anything else the live pages or the live site's own `firebase.json` reference. Compare file lists and sizes against what live serves (e.g. live about.html is about 11.7 KB). Give the staging folder a `firebase.json` / `.firebaserc` for site `ibxconnect`.
2. **Verify the staging copy is the live version.** goibx.com and https://ibxconnect.web.app serve the same page (ETag `dbd038b2...cc6473`, 77,043 bytes as of Nov 13 00:02 ET); the staging `index.html` must match that byte for byte before any change. If it doesn't, stop and tell me.
3. **Back up** the staging folder (zip it, outside any repo).
4. **Get the new code.** `git clone https://github.com/TellDontaMatter/InnerBanksExchange.git` then `git checkout claude/confident-johnson-0gof95`. Read `civic/LAUNCH.md`.
5. **Add the civic pages.** Copy the repo's `connect/civic/` folder into the staging folder as `civic/` (next to `index.html`).
6. **Add the API rewrite.** In the live `firebase.json`, on the hosting entry that serves goibx.com, add:
   `"rewrites": [{ "source": "/api/**", "function": { "functionId": "civicApi", "region": "us-central1" } }]`
   (merge with any existing `rewrites`; keep all existing settings).
7. **Patch the live home page.** From the repo folder run:
   `python civic/live-patch/apply.py "<live folder>\index.html" "<live folder>\index.html.new"`
   Open `index.html.new` in a browser from a local file/server and confirm: the search box sits at the top of the "Today on the Inner Banks" panel, the board/weather/announcements still show, nothing else on the page changed. Then replace `index.html` with it (keep the backup).
   If `apply.py` says "panel markup not found", stop and report: the live page changed shape.
8. **Deploy the backend.** In the repo: `cd functions`, `npm install`, then `firebase deploy --only functions`. Expect two functions: `civicApi` and `civicTickerDaily`. (Project must be `thruket-site1`, on the Blaze plan.)
9. **Deploy the site.** From the staging folder only: `firebase deploy --only hosting:<the ibxconnect target>`.
10. **Verify live.**
    - https://goibx.com/civic/ loads (search page).
    - https://goibx.com/api/regions returns JSON listing inner-banks, hampton-roads, greenville.
    - On https://goibx.com the panel shows the search box on top. The ticker will be EMPTY for now (no feeds wired yet): that is expected, and the panel must still look normal (no dots, no error text).
    - Search "Edenton bridge repair": expect "We have no sourced reporting on this yet."
    - Search "Did John Smith steal money": expect "We're looking into this."
11. **Check the news feeds.** In the repo run `node functions/civic/scripts/check-sources.js` and send the full output to the owner (do not edit the config).
12. **Put the live source in git.** From the staging folder (now the verified live mirror plus the civic changes): create a new branch `live-sync` in `TellDontaMatter/InnerBanksExchange` containing the live site's files (exclude `node_modules`, `.firebase`, `.wrangler`, any `.env`/key/token files, and anything secret) and push it. Do not push to `main`.

## Report back
Folder path used, hosting target/site ID, what each step printed (especially the two deploys), results of the checks in step 10, the step 11 output, and the `live-sync` branch link. Stop and ask if any step fails.
