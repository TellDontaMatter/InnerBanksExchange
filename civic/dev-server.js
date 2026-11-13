#!/usr/bin/env node
'use strict';
// Local preview only: serves civic/web and /api from an in-memory store seeded with SAMPLE items.
// No model key is used; the stub "summarizer" just stitches headlines so the UI can be checked.
const http = require('http'), fs = require('fs'), path = require('path');
const config = require('../functions/civic/config/regions');
const { MemoryStore } = require('../functions/civic/engine/store');
const { makeHandlers } = require('../functions/civic/handlers');
const { askHref } = require('../functions/civic/ticker/ticker');
const store = new MemoryStore();
const sample = (rid, n, pub, hl, sum, why) => ({ headline: hl, publisher: pub, sourceId: pub, date: `2026-11-1${n}T10:00:00Z`, url: `https://example.org/sample/${rid}/${n}`, askHref: askHref(rid, hl, config.anchor), summary: sum, why, automated: true });
const rows = [['Sample News A', 'Edenton bridge repair schedule announced', 'Crews will start work on the span in December.', 'Detours would affect Chowan County commuters.'],
  ['Sample News B', 'Edenton bridge repair delayed by weather', 'The start date slipped by two weeks.', 'Same crossing used by Chowan County traffic.'],
  ['Sample News C', 'Edenton bridge repair funding approved', 'The state approved the money this week.', 'Funding decides how soon Chowan County sees relief.']];
(async () => {
  await store.putTickerItems('inner-banks', Array.from({ length: 7 }, (_, i) => sample('inner-banks', i % 9, rows[i % 3][0], rows[i % 3][1] + (i > 2 ? ` (update ${i})` : ''), rows[i % 3][2], rows[i % 3][3])));
  await store.putTickerItems('hampton-roads', [sample('hampton-roads', 1, 'Sample News D', 'Port of Virginia sets cargo record', 'Volume rose year over year.', 'Port traffic reaches Chowan County trucking.')]);
  await store.putTickerItems('greenville', []);
  const stub = { available: true, async summarize({ evidence }) { return '[dev stub] ' + evidence.map((e) => e.headline).join('; ') + '.'; } };
  const h = makeHandlers({ config, store, summarizer: stub, isAdmin: async (r) => (r.headers.authorization || '') === 'Bearer dev' });
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'); const send = (c, b, t = 'application/json') => { res.writeHead(c, { 'content-type': t }); res.end(typeof b === 'string' || Buffer.isBuffer(b) ? b : JSON.stringify(b)); };
    if (u.pathname.startsWith('/api/')) {
      try {
        const p = u.pathname.slice(4); let body = '';
        for await (const c of req) body += c; body = body ? JSON.parse(body) : {};
        if (p === '/regions') return send(200, h.regions());
        if (p === '/ticker') return send(200, await h.ticker(u.searchParams.get('region')));
        if (p === '/query') return send(200, await h.query(body));
        if (p === '/request-place') return send(200, await h.requestPlace(body));
        if (p === '/admin') return send(200, await h.admin(req));
        return send(404, { error: 'not found' });
      } catch (e) { return send(e.status || 500, { error: e.message }); }
    }
    const rel = u.pathname.replace(/^\/civic\//, '/');
    const f = path.join(__dirname, '..', 'connect', 'civic', rel === '/' ? 'index.html' : rel);
    if (!f.startsWith(path.join(__dirname, '..', 'connect', 'civic')) || !fs.existsSync(f)) return send(404, 'nope', 'text/plain');
    send(200, fs.readFileSync(f), types[path.extname(f)] || 'text/plain');
  }).listen(process.env.PORT || 5055, () => console.log('civic dev server on http://localhost:' + (process.env.PORT || 5055)));
})();
