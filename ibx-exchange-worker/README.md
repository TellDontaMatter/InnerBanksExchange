# IBX Exchange (Cloudflare)

One Cloudflare Worker + D1 database. No Firebase.

| Page | What it is |
|---|---|
| `/` | Landing page, 3 hero cards (Community, List an item, How it works) |
| `/intake/` | Intake form: name, price, category, status, up to 6 photos |
| `/item/<id>` | Public shareable card for one item (photo gallery + Facebook/X/WhatsApp/Copy link, rich social previews) |
| `/shop/` | Shop back end, password protected: see items + photos, change status, delete |

API: `POST /api/items` (public), `GET /api/items/:id/photos/:n` (public), `GET /api/items`, `PATCH /api/items/:id`, `DELETE /api/items/:id` (admin password required).

## Deploy from your phone (Cloudflare dashboard, no computer)

1. The D1 database `ibx-exchange-db` is already created and its tables exist (ID is in `wrangler.toml`).
2. (nothing to do)
3. Dashboard → **Workers & Pages → Create → Import a repository** → pick this repo and branch.
   - Build/deploy command: `npx wrangler d1 migrations apply ibx-exchange-db --remote && npx wrangler deploy`
4. After the first deploy: Worker → **Settings → Variables and Secrets → Add** a **secret** named `ADMIN_TOKEN` (the shop back-end password).
5. Every push to the branch redeploys automatically.

## Deploy from a computer

    npm install
    npx wrangler d1 create ibx-exchange-db          # paste database_id into wrangler.toml
    npx wrangler d1 migrations apply ibx-exchange-db --remote
    npx wrangler secret put ADMIN_TOKEN
    npx wrangler deploy

## Test locally

    npm install && npm run migrate:local && npm test

Security notes: anyone can submit items on `/intake/` (inputs are validated; photos must be small JPEGs). The shop list and all edits require `ADMIN_TOKEN`; if it isn't set, admin routes stay closed.
