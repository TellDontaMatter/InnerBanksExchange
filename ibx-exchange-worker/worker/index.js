// IBX Exchange on Cloudflare: one Worker serves the pages (public/) and the API (/api/*), data lives in D1.
//   POST   /api/items                 public   intake form submits here (up to 6 photos)
//   GET    /api/items/:id/photos/:n   public   one photo (0 = cover); ids are random UUIDs
//   GET    /item/:id                  public   shareable card page with social preview tags
//   GET    /api/items                 admin    shop back end list
//   PATCH  /api/items/:id             admin    change status
//   DELETE /api/items/:id             admin    remove item and its photos
// Admin = header "Authorization: Bearer <ADMIN_TOKEN>". If ADMIN_TOKEN is not set, admin routes are closed.

const STATUSES = ['Available', 'Pending', 'Reserved'];
const MAX_PHOTOS = 6;
const MAX_PHOTO = 200000;            // characters of one photo data URL
const MAX_BODY = 1500 * 1024;
const JPEG_PREFIX = 'data:image/jpeg;base64,';

const json = (body, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

async function sha256(s) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const m = (request.headers.get('Authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return false;
  const [a, b] = await Promise.all([sha256(m[1]), sha256(env.ADMIN_TOKEN)]);
  return crypto.subtle.timingSafeEqual(a, b);
}
async function requireAdmin(request, env) {
  if (!(await isAdmin(request, env))) throw new HttpError(401, env.ADMIN_TOKEN ? 'Admin token required' : 'Admin access is not set up yet (ADMIN_TOKEN is missing)');
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'Request too large');
  try { return JSON.parse(text || 'null'); } catch { throw new HttpError(400, 'Invalid JSON'); }
}

function validateItem(body) {
  const fields = {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Body must be a JSON object');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) fields.name = 'Name is required';
  else if (name.length > 200) fields.name = 'Name must be 200 characters or fewer';

  const price = Number(body.price);
  if (body.price === '' || body.price == null || !Number.isFinite(price) || price < 0) fields.price = 'Enter a price, 0 or more';

  const category = (typeof body.category === 'string' ? body.category.trim() : '') || 'General';
  if (category.length > 100) fields.category = 'Category must be 100 characters or fewer';

  const status = body.status == null || body.status === '' ? 'Available' : body.status;
  if (!STATUSES.includes(status)) fields.status = 'Status must be one of: ' + STATUSES.join(', ');

  // `photos` is the list; a single `photo` string is still accepted.
  let list = [];
  if (Array.isArray(body.photos)) list = body.photos;
  else if (typeof body.photo === 'string' && body.photo) list = [body.photo];
  const photos = [];
  if (list.length > MAX_PHOTOS) fields.photos = `At most ${MAX_PHOTOS} photos`;
  else for (const p of list) {
    if (typeof p !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p)) { fields.photos = 'Photos must be JPEGs'; break; }
    if (p.length > MAX_PHOTO) { fields.photos = 'A photo is too large'; break; }
    photos.push(p);
  }
  if (Object.keys(fields).length) throw new HttpError(422, 'Validation failed', fields);
  return { name, price: Math.round(price * 100) / 100, category, status, photos };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function photoResponse(db, id, n) {
  const row = await db.prepare('SELECT data FROM item_photos WHERE itemId = ?1 AND position = ?2').bind(id, n).first();
  if (!row) throw new HttpError(404, 'No photo');
  const bin = atob(row.data.slice(JPEG_PREFIX.length));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
}

async function handleApi(request, env, url) {
  const m = url.pathname.match(/^\/api\/items(?:\/([\w-]+)(?:\/(photos?)(?:\/(\d+))?)?)?$/);
  if (!m) throw new HttpError(404, 'Not found');
  const [, id, photoWord, photoN] = m;
  const db = env.DB;
  const method = request.method;

  if (method === 'POST' && !id) {
    const v = validateItem(await readJson(request));
    const item = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...v };
    await db.batch([
      db.prepare('INSERT INTO items (id, name, price, category, status, photo, createdAt) VALUES (?1,?2,?3,?4,?5,NULL,?6)')
        .bind(item.id, item.name, item.price, item.category, item.status, item.createdAt),
      ...item.photos.map((p, i) => db.prepare('INSERT INTO item_photos (id, itemId, position, data) VALUES (?1,?2,?3,?4)').bind(crypto.randomUUID(), item.id, i, p)),
    ]);
    return json({ id: item.id, name: item.name, price: item.price, category: item.category, status: item.status, photoCount: item.photos.length, createdAt: item.createdAt, shareUrl: `${url.origin}/item/${item.id}` }, 201);
  }

  if (method === 'GET' && id && photoWord) return photoResponse(db, id, photoN ? Number(photoN) : 0);

  if (method === 'GET' && !id) {
    await requireAdmin(request, env);
    const { results } = await db.prepare(
      'SELECT id, name, price, category, status, createdAt, (SELECT COUNT(*) FROM item_photos p WHERE p.itemId = items.id) AS photoCount FROM items ORDER BY createdAt DESC LIMIT 200'
    ).all();
    return json(results);
  }

  if (method === 'PATCH' && id && !photoWord) {
    await requireAdmin(request, env);
    const body = await readJson(request);
    if (!body || !STATUSES.includes(body.status)) throw new HttpError(422, 'Validation failed', { status: 'Status must be one of: ' + STATUSES.join(', ') });
    const r = await db.prepare('UPDATE items SET status = ?2 WHERE id = ?1').bind(id, body.status).run();
    if (!r.meta.changes) throw new HttpError(404, 'Item not found');
    return json({ id, status: body.status });
  }

  if (method === 'DELETE' && id && !photoWord) {
    await requireAdmin(request, env);
    const [r] = await db.batch([
      db.prepare('DELETE FROM items WHERE id = ?1').bind(id),
      db.prepare('DELETE FROM item_photos WHERE itemId = ?1').bind(id),
    ]);
    if (!r.meta.changes) throw new HttpError(404, 'Item not found');
    return json(null, 204);
  }

  throw new HttpError(405, 'Method not allowed');
}

// Public shareable card. The <meta> tags make Facebook, X, WhatsApp, iMessage etc. show a rich preview with the cover photo.
async function itemPage(env, url, id) {
  const it = await env.DB.prepare(
    'SELECT id, name, price, category, status, (SELECT COUNT(*) FROM item_photos p WHERE p.itemId = items.id) AS photoCount FROM items WHERE id = ?1'
  ).bind(id).first();
  if (!it) {
    return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><body style="font-family:system-ui;background:#0b0b0f;color:#f0f0f5;padding:40px"><h1>Item not found</h1><p><a style="color:#00ffcc" href="/">Back to Inner Banks Exchange</a></p>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const page = `${url.origin}/item/${it.id}`;
  const price = '$' + Number(it.price).toFixed(2);
  const desc = `${price} · ${it.category} · ${it.status}`;
  const cover = it.photoCount > 0 ? `${url.origin}/api/items/${it.id}/photos/0` : '';
  const photos = Array.from({ length: it.photoCount }, (_, i) => `<img src="/api/items/${it.id}/photos/${i}" alt="${esc(it.name)} photo ${i + 1}" loading="${i ? 'lazy' : 'eager'}">`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(it.name)} — Inner Banks Exchange</title>
<meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="Inner Banks Exchange">
<meta property="og:title" content="${esc(it.name)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(page)}">
${cover ? `<meta property="og:image" content="${esc(cover)}"><meta property="og:image:type" content="image/jpeg">` : ''}
<meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(it.name)}"><meta name="twitter:description" content="${esc(desc)}">${cover ? `<meta name="twitter:image" content="${esc(cover)}">` : ''}
<style>
:root{--bg:#0b0b0f;--card:#14141c;--accent:#00ffcc;--fg:#f0f0f5;--muted:#9a9aae;--border:#2a2a3c;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:20px}
main{max-width:560px;margin:0 auto}.eyebrow{color:var(--accent);font:600 12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;text-decoration:none}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-top:12px}
.gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:2px;background:#000}.gallery img{flex:0 0 100%;width:100%;max-height:70vh;object-fit:contain;scroll-snap-align:center;background:#000}
.body{padding:20px}h1{margin:0 0 4px;font-size:1.6rem;overflow-wrap:anywhere}.price{font:700 1.5rem ui-monospace,monospace;color:var(--accent)}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;color:var(--muted);font-size:.9rem}.chip{border:1px solid var(--border);border-radius:99px;padding:2px 12px}
.share{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.share a,.share button{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:8px;border:1px solid var(--border);background:#1e1e28;color:var(--fg);font:600 15px system-ui;text-decoration:none;cursor:pointer;touch-action:manipulation}
.share .native{grid-column:1/-1;background:var(--accent);color:#00130f;border-color:var(--accent)}a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.note{color:var(--muted);font-size:.85rem;text-align:center;margin-top:16px;min-height:1.2em}
</style></head><body><main>
<a class="eyebrow" href="/">Inner Banks Exchange</a>
<article class="card">
${photos ? `<div class="gallery" aria-label="Photos">${photos}</div>` : ''}
<div class="body"><h1>${esc(it.name)}</h1><div class="price">${esc(price)}</div>
<div class="meta"><span class="chip">${esc(it.category)}</span><span class="chip">${esc(it.status)}</span>${it.photoCount > 1 ? `<span class="chip">${it.photoCount} photos</span>` : ''}</div>
<div class="share" id="share">
<button class="native" id="native" hidden>Share…</button>
<a data-net="facebook" target="_blank" rel="noopener">Facebook</a><a data-net="x" target="_blank" rel="noopener">X</a>
<a data-net="whatsapp" target="_blank" rel="noopener">WhatsApp</a><button id="copy" type="button">Copy link</button></div>
<div class="note" id="note" role="status"></div></div></article></main>
<script>
(function(){var u=location.href,t=${JSON.stringify(`${it.name} — ${desc}`).replace(/</g, '\\u003c')},e=encodeURIComponent;
var l={facebook:'https://www.facebook.com/sharer/sharer.php?u='+e(u),x:'https://twitter.com/intent/tweet?text='+e(t)+'&url='+e(u),whatsapp:'https://wa.me/?text='+e(t+' '+u)};
document.querySelectorAll('[data-net]').forEach(function(a){a.href=l[a.dataset.net]});
var n=document.getElementById('native');if(navigator.share){n.hidden=false;n.onclick=function(){navigator.share({title:${JSON.stringify(it.name).replace(/</g, '\\u003c')},text:t,url:u}).catch(function(){})}}
document.getElementById('copy').onclick=function(){var s=document.getElementById('note');(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){s.textContent='Link copied'},function(){s.textContent='Copy this link: '+u})}})();
</script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const im = url.pathname.match(/^\/item\/([\w-]+)\/?$/);
      if (im && request.method === 'GET') return await itemPage(env, url, im[1]);
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      return await handleApi(request, env, url);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...(e.fields ? { fields: e.fields } : {}) }, e.status);
      console.error(e);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};
