# Inner Banks Exchange

Flat-price shop + community board for NC's Inner Banks. Plain HTML, no build step.
Everything talks to one Firebase project: `thruket-site1` (Firestore + email/password auth).

## THE WORKFLOW (read this first)

Two URLs. That's the whole system.

| You want to... | Go to | Do |
|---|---|---|
| Add an item | https://ibx-intake.netlify.app | Log in → take photo → fill form → Save |
| Mark something sold | same | Unsold items → Mark Sold |
| Fix a bad photo | same | Unsold items → Fix photo |
| See the shop | https://ibxchange.web.app | nothing, it's live |

Photos: take them on the phone, pick from camera roll. If the photo isn't in the camera roll yet
(iCloud still syncing), wait for it. Nothing else to do; the shop updates on its own.

Login: the Firebase user YOU created (your own email). The old `thrktintk@gmail.com` login is dead.

### Working with Claude on this site
1. Open Claude Code **in this folder** (`inner-banks-exchange`). Not a blank session.
2. Say what you want in one line: "add a size filter to the shop", "change the intake title", etc.
3. Say "deploy" when you're happy. Netlify deploys need nothing from you. Firebase deploys need
   one Google login click, once.
4. Don't paste code from other AIs into Claude. Ask Claude to read the live site instead.
   Gemini's "deployed, verified" messages were never real; it cannot run anything.

### Things that look broken but aren't
- Grey "No photo yet" tile = the item has no working photo. Fix photo in intake.
- "Connecting to live inventory..." stuck = internet or Firebase hiccup. Refresh.
- Item missing from shop = it's marked sold, or it hasn't been added. Check intake.

## What's where

| Folder | What | Live URLs |
|---|---|---|
| `shop/` | Public shop (`index.html`) and community board (`community.html`) | https://ibxchange.web.app · https://ibxchange.netlify.app |
| `intake/` | Admin page: add items, fix photos, mark sold, moderate posts | https://ibx-intake.web.app · https://ibx-intake.netlify.app (identical) |
| `_old-2026-09-30/` | The previous version of the shop, kept for reference | — |

## How inventory works

- Intake writes one doc per item to Firestore collection `inventoryItems`
  (`brand, category, size, price, photo_url, payment_link, sold, created_at`).
- Shop reads `inventoryItems` where `sold == false`. No sync step; it shows on next page load.
- Photos are shrunk on-device and stored inside the item as a data URL.
  There is **no Firebase Storage bucket** on this project (needs the paid plan), so don't
  paste `firebasestorage.googleapis.com` links; they will 404.
- Stripe Buy links are still made by hand in Stripe and pasted into intake.

## Deploying

### Netlify (no Firebase login needed)
Ask Claude: "deploy shop to Netlify" or "deploy intake to Netlify". It runs the Netlify
connector from the matching folder. Site IDs:
- shop: `5b109330-ae0d-434d-a404-7d21fda43ab5`
- intake: `41640779-a51c-4fca-ae7f-63f24eab0ceb`

### Firebase Hosting (already logged in as philctellsit@gmail.com)
A portable Node 22 + Firebase CLI lives at `C:\Users\bonil\AppData\Local\Temp\ibx-fb`.
From this folder (or just tell Claude "deploy to firebase"):

```
C:\Users\bonil\AppData\Local\Temp\ibx-fb\node\node.exe C:\Users\bonil\AppData\Local\Temp\ibx-fb\node_modules\firebase-tools\lib\bin\firebase.js deploy --only hosting:shop,hosting:intake
```

(If that Temp folder is gone, install Node 22 LTS and `npm i -g firebase-tools`, then use plain `firebase`.)

## Admin login
Email `thrktintk@gmail.com` (Firebase Auth, email/password). Password is not stored anywhere in this repo.
