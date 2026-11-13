// End-to-end: runs the real Worker locally (local D1), then drives the intake form in a phone-sized browser.
// Run: npm run migrate:local && npm test   (needs Playwright's Chromium)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const PORT = 8787, BASE = `http://localhost:${PORT}`, TOKEN = 'test-admin-token';
fs.writeFileSync('.dev.vars', `ADMIN_TOKEN=${TOKEN}\n`);
const wr = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(PORT)], { stdio: 'ignore' });
const cleanup = () => { wr.kill('SIGTERM'); try { fs.unlinkSync('.dev.vars'); } catch {} };
process.on('exit', cleanup);

for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/'); break; } catch { await new Promise(r => setTimeout(r, 1000)); } }
const call = (m, p, body, auth) => fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
let n = 0; const ok = (msg) => console.log(`ok ${++n} - ${msg}`);

// --- API ---
let r = await call('POST', '/api/items', { name: '', price: -1, status: 'Nope' });
assert.equal(r.status, 422); const fe = (await r.json()).fields; assert.ok(fe.name && fe.price && fe.status); ok('rejects bad input with field errors');
r = await call('POST', '/api/items', { name: 'x', price: 1, photos: ['data:text/html;base64,AAAA'] }); assert.equal(r.status, 422); ok('rejects non-JPEG photo');
const tiny = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
r = await call('POST', '/api/items', { name: 'x', price: 1, photos: Array(7).fill(tiny) }); assert.equal(r.status, 422); ok('rejects more than 6 photos');
r = await fetch(BASE + '/api/items', { method: 'POST', body: '{bad' }); assert.equal(r.status, 400); ok('rejects malformed JSON');
r = await call('GET', '/api/items'); assert.equal(r.status, 401); ok('list is closed without the admin token');
r = await call('GET', '/api/items', undefined, 'wrong'); assert.equal(r.status, 401); ok('list is closed with a wrong token');
r = await call('DELETE', '/api/items/abc', undefined); assert.equal(r.status, 401); ok('delete is closed without the admin token');

// --- Browser: real intake form on a phone ---
const b = await chromium.launch(); const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/intake/');
await p.tap('#submit-btn');
assert.match(await p.textContent('#e-name'), /required/); ok('intake form shows errors when empty');
await p.fill('#item-name', 'Core Rig Asset #4'); await p.fill('#item-price', '49.99'); await p.fill('#item-category', 'Hardware');
// pick 3 big photos in one batch, then 4 more in a second batch (7 total; only 6 are kept)
const pick = (count, tag) => p.evaluate(async ([count, tag]) => {
  const dt = new DataTransfer();
  for (let n = 0; n < count; n++) {
    const cv = document.createElement('canvas'); cv.width = 3000; cv.height = 2000; const x = cv.getContext('2d');
    for (let i = 0; i < 300; i++) { x.fillStyle = `hsl(${(i * 7 + n * 40) % 360},70%,50%)`; x.fillRect(Math.random() * 3000, Math.random() * 2000, 300, 300); }
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.95));
    dt.items.add(new File([blob], `${tag}${n}.jpg`, { type: 'image/jpeg' }));
  }
  const input = document.getElementById('item-photo'); input.files = dt.files; input.dispatchEvent(new Event('change'));
}, [count, tag]);
await pick(3, 'a'); assert.equal(await p.locator('.thumb').count(), 3);
await pick(4, 'b'); assert.equal(await p.locator('.thumb').count(), 6); ok('intake accepts photos in batches, capped at 6');
await p.tap('.thumb button'); assert.equal(await p.locator('.thumb').count(), 5); ok('a photo can be removed before submitting');
await p.tap('#submit-btn'); await p.waitForFunction(() => /Saved|✖/.test(document.getElementById('status-msg').textContent));
assert.match(await p.textContent('#status-msg'), /Saved/); ok('intake form submits an item with a photo');

// --- Back end sees it ---
r = await call('GET', '/api/items', undefined, TOKEN); assert.equal(r.status, 200);
const items = await r.json(); assert.equal(items.length, 1);
assert.equal(items[0].name, 'Core Rig Asset #4'); assert.equal(items[0].price, 49.99); assert.equal(items[0].photoCount, 5); ok('admin list returns the item with 5 photos');
for (let n = 0; n < 5; n++) { const ph = await fetch(`${BASE}/api/items/${items[0].id}/photos/${n}`); assert.equal(ph.headers.get('content-type'), 'image/jpeg'); assert.ok((await ph.arrayBuffer()).byteLength > 1000); }
assert.equal((await fetch(`${BASE}/api/items/${items[0].id}/photos/5`)).status, 404); ok('all 5 photos are served as real JPEGs');

// shareable card page: public, with social preview tags
const card = await fetch(`${BASE}/item/${items[0].id}`); const html = await card.text();
assert.equal(card.status, 200);
assert.match(html, /property="og:title" content="Core Rig Asset #4"/); assert.match(html, new RegExp(`property="og:image" content="${BASE}/api/items/${items[0].id}/photos/0"`));
assert.match(html, /twitter:card" content="summary_large_image"/); assert.equal((html.match(/class="gallery"[\s\S]*?<\/div>/)[0].match(/<img /g) || []).length, 5);
ok('share card page has social preview tags and all photos');
assert.equal((await fetch(`${BASE}/item/does-not-exist`)).status, 404); ok('unknown share card returns 404');
// a hostile name must not inject script into the card page
r = await call('POST', '/api/items', { name: '<script>alert(1)</script>"><img src=x onerror=alert(2)>', price: 1 }); const evil = await r.json();
const evilHtml = await (await fetch(`${BASE}/item/${evil.id}`)).text();
assert.ok(!evilHtml.includes('<script>alert(1)') && !evilHtml.includes('<img src=x onerror'));  ok('card page escapes hostile item names');
await call('DELETE', `/api/items/${evil.id}`, undefined, TOKEN);

// shop page: unlock, see it, change status, delete
const shop = await ctx.newPage(); await shop.goto(BASE + '/shop/');
await shop.fill('#token', 'wrong'); await shop.tap('#login button'); await shop.waitForFunction(() => document.getElementById('login-err').textContent);
ok('shop page rejects a wrong password');
await shop.fill('#token', TOKEN); await shop.tap('#login button'); await shop.waitForSelector('.item');
assert.equal(await shop.locator('img.thumb').count(), 1); assert.match(await shop.textContent('.badge span'), /5 photos/); assert.equal(await shop.locator('.controls button', { hasText: 'Share' }).count(), 1); ok('shop page shows cover photo, photo count and a Share button');
await shop.selectOption('.item select', 'Reserved'); await new Promise(r => setTimeout(r, 500));
assert.equal((await (await call('GET', '/api/items', undefined, TOKEN)).json())[0].status, 'Reserved'); ok('status change is saved');
await shop.tap('.item .danger'); await shop.tap('.item .danger'); await new Promise(r => setTimeout(r, 500));
assert.equal((await (await call('GET', '/api/items', undefined, TOKEN)).json()).length, 0); ok('delete works (two taps)');

// --- Landing ---
const land = await ctx.newPage(); await land.goto(BASE + '/');
assert.equal(await land.locator('.card').count(), 3);
assert.equal(await land.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); ok('landing page: 3 cards, no sideways scroll on phone');
assert.deepEqual(errs, []); ok('no page errors');
await b.close(); cleanup(); process.exit(0);
