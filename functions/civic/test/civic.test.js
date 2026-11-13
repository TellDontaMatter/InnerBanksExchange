'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const baseConfig = require('../config/regions');
const { MemoryStore } = require('../engine/store');
const { needsReview } = require('../engine/review');
const { makeHandlers } = require('../handlers');
const { runTicker } = require('../ticker/ticker');
const { parseFeed } = require('../ticker/rss');

const fakeModel = () => { const m = { available: true, calls: 0, async summarize() { m.calls++; return 'A short automated summary.'; },
  async summarizeItems({ items }) { m.calls++; return items.map((i) => ({ summary: 'Our words about it.', why: 'Matters to Chowan County.' })); } }; return m; };
const ev = (n, over = {}) => ({ headline: `Edenton bridge repair ${n}`, summary: 'Bridge work.', publisher: `Pub${n}`, sourceId: `s${n}`, url: `https://p${n}.example/a`, date: '2026-11-01', ...over });
const setup = async ({ config = baseConfig, evidence = [], model = fakeModel() } = {}) => {
  const store = new MemoryStore(); await store.putTickerItems('inner-banks', evidence);
  return { store, model, h: makeHandlers({ config, store, summarizer: model, now: () => new Date('2026-11-14T12:00:00Z') }) };
};
const ask = (h, q, extra = {}) => h.query({ region: 'inner-banks', type: 'claim', query: q, visitorId: 'v1', ...extra });

test('hold-for-review: accusations and private persons are held, queued, and not answered', async () => {
  const { h, store, model } = await setup({ evidence: [ev(1), ev(2), ev(3)] });
  for (const q of ['Did the county commissioner steal money from the bridge repair?', 'Is John Smith on Oak Street a crook', 'my neighbor bridge repair', 'Is the Edenton bridge repair corrupt?']) {
    const r = await ask(h, q);
    assert.equal(r.held, true, q); assert.equal(r.summary, "We're looking into this."); assert.deepEqual(r.sources, []);
  }
  assert.equal(store.reviews.length, 4); assert.equal(store.reviews[0].status, 'pending'); assert.equal(model.calls, 0);
});

test('hold rule does not fire on ordinary civic questions', () => {
  for (const q of ['Edenton bridge repair schedule', 'What is Chowan County Board of Commissioners doing about the Port of Virginia?', 'Hampton Roads Planning District Commission budget'])
    assert.equal(needsReview(q, baseConfig.regions['inner-banks']).hold, false, q);
});

test('caps: per-visitor limit then site-wide limit, both read from config', async () => {
  const cfg = { ...baseConfig, limits: { dailyTotal: 4, perVisitor: 2 } };
  const { h } = await setup({ config: cfg, evidence: [ev(1)] });
  assert.equal((await ask(h, 'Edenton bridge repair')).capped, undefined);
  assert.equal((await ask(h, 'Edenton bridge repair')).capped, undefined);
  assert.equal((await ask(h, 'Edenton bridge repair')).capped, 'visitor');
  await ask(h, 'Edenton bridge repair', { visitorId: 'v2' });
  await ask(h, 'Edenton bridge repair', { visitorId: 'v2' });
  assert.equal((await ask(h, 'Edenton bridge repair', { visitorId: 'v3' })).capped, 'site');
});

test('caps: default config is 50 / day and 5 / visitor; capped answers still show sources and make no model call', async () => {
  assert.equal(baseConfig.limits.dailyTotal, 50); assert.equal(baseConfig.limits.perVisitor, 5);
  const { h, model } = await setup({ config: { ...baseConfig, limits: { dailyTotal: 1, perVisitor: 5 } }, evidence: [ev(1)] });
  await ask(h, 'Edenton bridge repair');
  const r = await ask(h, 'Edenton bridge repair', { visitorId: 'v9' });
  assert.equal(r.capped, 'site'); assert.equal(r.sources.length, 1); assert.equal(model.calls, 1);
});

test('confidence: Affirmed needs 3+ independent sources; same ownership group counts once', async () => {
  let { h } = await setup({ evidence: [ev(1), ev(2), ev(3)] });
  assert.equal((await ask(h, 'Edenton bridge repair')).confidence, 'Affirmed');
  ({ h } = await setup({ evidence: [ev(1, { group: 'g' }), ev(2, { group: 'g' }), ev(3, { group: 'g' })] }));
  const r = await ask(h, 'Edenton bridge repair'); assert.equal(r.confidence, 'Inferred'); assert.equal(r.sources.length, 1);
  ({ h } = await setup({ evidence: [] }));
  const m = await ask(h, 'Edenton bridge repair'); assert.equal(m.confidence, 'Hypothesis'); assert.equal(m.miss, true);
});

test('spend with no data: not covered, request form, Records Kit link; no model call', async () => {
  const { h, model } = await setup();
  const r = await h.query({ region: 'inner-banks', type: 'spend', query: 'Edenton purchase card spending' });
  assert.equal(r.notCovered, true); assert.equal(r.summary, 'Not covered yet.');
  assert.equal(r.recordsKitUrl, 'https://dontamatterz.gumroad.com/l/crmbkw');
  assert.deepEqual(r.requestForm, { region: 'inner-banks', query: 'Edenton purchase card spending' }); assert.equal(model.calls, 0);
});

test('spend with an adapter: free = count + latest date, line detail is paid', async () => {
  const store = new MemoryStore();
  const h = makeHandlers({ config: baseConfig, store, spend: { async coverage() { return { count: 212, latestDate: '2026-10-31' }; }, async detail() { return [{ secret: 1 }]; } } });
  const r = await h.query({ region: 'inner-banks', type: 'spend', query: 'Edenton spending' });
  assert.deepEqual(r.spend, { recordCount: 212, latestDate: '2026-10-31', lineDetail: 'paid' });
  assert.equal(JSON.stringify(r).includes('secret'), false);
});

test('request-this-place stores the request; email only if volunteered; sends nothing', async () => {
  const { h, store } = await setup();
  await h.requestPlace({ region: 'inner-banks', place: 'Tyrrell County' });
  await h.requestPlace({ region: 'inner-banks', place: 'Gates County', email: 'a@b.co' });
  assert.equal(store.requests[0].email, undefined); assert.equal(store.requests[1].email, 'a@b.co');
});

test('log: every query saved with text/region/type/timestamp, no visitor identity', async () => {
  const { h, store } = await setup({ evidence: [ev(1)] });
  await ask(h, 'Edenton bridge repair'); await ask(h, 'steal');
  assert.equal(store.logs.length, 2);
  for (const l of store.logs) { assert.deepEqual(Object.keys(l).sort(), ['outcome', 'region', 'text', 'ts', 'type']); }
});

test('admin view: top queries, misses, review queue; non-admin refused', async () => {
  const store = new MemoryStore(); await store.putTickerItems('inner-banks', []);
  const h = makeHandlers({ config: baseConfig, store, summarizer: fakeModel(), isAdmin: async (r) => r.email === 'philctellsit@gmail.com' });
  await h.query({ region: 'inner-banks', type: 'claim', query: 'zzz unknown thing' }); await h.query({ region: 'inner-banks', type: 'claim', query: 'zzz unknown thing' });
  await h.query({ region: 'inner-banks', type: 'claim', query: 'is the mayor corrupt' });
  const a = await h.admin({ email: 'philctellsit@gmail.com' });
  assert.equal(a.top[0].n, 2); assert.equal(a.misses.length, 2); assert.equal(a.reviewQueue.length, 1);
  await assert.rejects(h.admin({ email: 'x@y.z' }), /forbidden/);
});

const RSS = (n) => `<rss><channel>${[1, 2].map((i) => `<item><title>Headline ${n}-${i}</title><link>https://src${n}.example/story-${i}</link><pubDate>Fri, 13 Nov 2026 0${i}:00:00 GMT</pubDate><description><![CDATA[<p>Full article body that must never be stored ${n}</p>]]></description></item>`).join('')}</channel></rss>`;
const withFeeds = (extra = {}) => { const c = JSON.parse(JSON.stringify(baseConfig)); let n = 0;
  for (const r of Object.values(c.regions)) r.sources.forEach((s, i) => { if (i < 2) s.feedUrl = `https://feed${++n}.example/rss`; }); Object.assign(c, extra); return c; };
const fakeFetch = async (url) => ({ ok: true, status: 200, text: async () => RSS(url.match(/feed(\d+)/)[1]) });

test('ticker: link-outs to the original, tap opens search pre-filled, own-words summary, no article text, labelled automated', async () => {
  const store = new MemoryStore(); const cfg = withFeeds();
  const rep = await runTicker({ config: cfg, store, summarizer: fakeModel(), fetchImpl: fakeFetch, now: () => new Date('2026-11-14T00:00:00Z') });
  assert.ok(rep.regions['inner-banks'] > 0);
  const items = await store.listTicker('inner-banks');
  for (const it of items) {
    assert.match(it.url, /^https:\/\/src\d+\.example\/story-\d$/);
    assert.match(it.askHref, /^results\.html\?r=inner-banks&type=claim&q=/);
    assert.ok(decodeURIComponent(it.askHref).includes(it.headline));
    assert.equal(it.automated, true); assert.equal(it.summary, 'Our words about it.'); assert.equal(it.why, 'Matters to Chowan County.');
    assert.equal(JSON.stringify(it).includes('Full article body'), false);
  }
});

test('ticker: sources without a verified feed are skipped and reported; one batched model call per region', async () => {
  const store = new MemoryStore(); const model = fakeModel();
  const rep = await runTicker({ config: withFeeds(), store, summarizer: model, fetchImpl: fakeFetch });
  assert.ok(rep.skippedSources.some((s) => s.includes('chowan-herald')) || rep.skippedSources.length > 0);
  assert.equal(model.calls, 3);
});

test('ticker: a failing source does not stop the run; no model key -> headlines only', async () => {
  const store = new MemoryStore(); const cfg = withFeeds();
  const flaky = async (u) => (u.includes('feed1.') ? { ok: false, status: 503, text: async () => '' } : fakeFetch(u));
  const { noModel } = require('../engine/summarizer');
  const rep = await runTicker({ config: cfg, store, summarizer: noModel, fetchImpl: flaky });
  assert.ok(rep.errors.some((e) => e.includes('503')));
  const items = await store.listTicker('hampton-roads'); assert.ok(items.length > 0); assert.equal(items[0].summary, null);
});

test('4th region by config only: no code changes', async () => {
  const cfg = JSON.parse(JSON.stringify(baseConfig));
  cfg.regions['outer-banks'] = { name: 'Outer Banks', places: ['Nags Head', 'Manteo'], colours: { ink: '#000', accent: '#036', marker: '#c30', paper: '#eee' },
    free: { spend: { recordCount: true, latestDate: true, lineDetail: false } }, sources: [{ id: 'ob-voice', name: 'OB Voice', site: null, feedUrl: 'https://feed99.example/rss' }] };
  const store = new MemoryStore(); const model = fakeModel();
  await runTicker({ config: cfg, store, summarizer: model, fetchImpl: fakeFetch });
  const h = makeHandlers({ config: cfg, store, summarizer: model });
  assert.ok((await h.regions()).some((r) => r.id === 'outer-banks'));
  const t = await h.ticker('outer-banks'); assert.equal(t.items.length, 2);
  const r = await h.query({ region: 'outer-banks', type: 'claim', query: 'Headline 99-1', visitorId: 'x' });
  assert.equal(r.confidence, 'Inferred'); assert.equal(r.sources.length, 1);
  assert.equal((await h.query({ region: 'outer-banks', type: 'spend', query: 'Manteo spending' })).notCovered, true);
});

test('rss parser reads RSS and Atom, drops items without http links', () => {
  assert.equal(parseFeed(RSS(1)).length, 2);
  assert.equal(parseFeed('<feed><entry><title>T</title><link href="https://a.example/x"/><updated>2026-11-01T00:00:00Z</updated></entry><entry><title>no link</title></entry></feed>').length, 1);
});

test('cross-listing: Hampton Roads city/port sources also appear in the Inner Banks ticker and search; local-only ones do not', async () => {
  const cfg = JSON.parse(JSON.stringify(baseConfig));
  const hr = cfg.regions['hampton-roads'].sources;
  hr.find((s) => s.id === 'city-suffolk').feedUrl = 'https://feed1.example/rss';   // alsoIn inner-banks
  hr.find((s) => s.id === 'wavy').feedUrl = 'https://feed2.example/rss';            // Hampton Roads only
  const store = new MemoryStore(); const model = fakeModel();
  await runTicker({ config: cfg, store, summarizer: model, fetchImpl: fakeFetch });
  const ib = await store.listTicker('inner-banks'); const hrItems = await store.listTicker('hampton-roads');
  assert.ok(ib.some((i) => i.sourceId === 'city-suffolk')); assert.ok(!ib.some((i) => i.sourceId === 'wavy'));
  assert.equal(hrItems.length, 4);
  assert.ok(ib.every((i) => i.askHref.startsWith('results.html?r=inner-banks')));
  const h = makeHandlers({ config: cfg, store, summarizer: model });
  const r = await h.query({ region: 'inner-banks', type: 'claim', query: 'Headline 1-1', visitorId: 'z' });
  assert.equal(r.sources.length, 1); assert.equal(r.sources[0].publisher, 'City of Suffolk');
});

test('the 4 impact cities are configured: Suffolk, Virginia Beach, Chesapeake in Hampton Roads (cross-listed), Elizabeth City in Inner Banks', () => {
  const ids = (r) => baseConfig.regions[r].sources.map((s) => s.id);
  for (const id of ['city-suffolk', 'city-virginia-beach', 'city-chesapeake', 'hii-nns', 'port-of-virginia']) {
    assert.ok(ids('hampton-roads').includes(id), id);
    assert.deepEqual(baseConfig.regions['hampton-roads'].sources.find((s) => s.id === id).alsoIn, ['inner-banks']);
  }
  assert.ok(ids('inner-banks').includes('city-elizabeth-city'));
});

test('audiences reach the ticker model prompt, with a "only when it clearly bears on them" guard', async () => {
  const { anthropicSummarizer } = require('../engine/summarizer');
  let body; const m = anthropicSummarizer({ apiKey: 'k', model: 'm', fetchImpl: async (u, o) => { body = JSON.parse(o.body); return { ok: true, json: async () => ({ content: [{ type: 'text', text: '[{"i":0,"summary":"s","why":"w"}]' }] }) }; } });
  await m.summarizeItems({ items: [{ publisher: 'P', headline: 'H' }], anchor: 'Chowan County', audiences: baseConfig.audiences });
  assert.match(body.system, /Newport News Shipbuilding workers and retirees/); assert.match(body.system, /truck drivers/); assert.match(body.system, /only when the item clearly bears on it/);
});

test('corridor geography (Virginia Beach to Chowan, north to south) is configured and reaches the ticker prompt', async () => {
  const order = baseConfig.corridor.order;
  assert.match(order[0], /Virginia Beach/); assert.match(order[order.length - 1], /Chowan/);
  assert.ok(order.indexOf('Currituck') < order.indexOf('Camden') && order.indexOf('Camden') < order.findIndex((x) => /Pasquotank/.test(x)) && order.findIndex((x) => /Pasquotank/.test(x)) < order.indexOf('Perquimans'));
  const { anthropicSummarizer } = require('../engine/summarizer');
  let body; const m = anthropicSummarizer({ apiKey: 'k', model: 'm', fetchImpl: async (u, o) => { body = JSON.parse(o.body); return { ok: true, json: async () => ({ content: [{ type: 'text', text: '[{"i":0,"summary":"s","why":"w"}]' }] }) }; } });
  await m.summarizeItems({ items: [{ publisher: 'P', headline: 'H' }], anchor: 'Chowan County', audiences: [], corridor: baseConfig.corridor });
  assert.match(body.system, /Virginia Beach \/ Chesapeake > Knotts Island/); assert.match(body.system, /southern end of this corridor/);
});

test('local observations: unconfirmed, labelled Hypothesis, never counted as sources or toward confidence', async () => {
  const { h } = await setup({ evidence: [] });
  const r = await ask(h, 'new businesses in Edenton');
  assert.equal(r.miss, true); assert.deepEqual(r.sources, []); assert.equal(r.confidence, 'Hypothesis');
  assert.ok(r.observations.length >= 1);
  for (const o of r.observations) { assert.equal(o.status, 'Hypothesis'); assert.match(o.basis, /not yet sourced/); assert.ok(o.confirmWith.length > 0); }
  assert.match(r.summary, /unconfirmed/);
  assert.ok(r.observations.some((o) => /Tractor Supply/.test(o.text)) && r.observations.some((o) => /Provalis/.test(o.text)));
});

test('local observations: matched by place and tag, per region, and only for queries that touch them', async () => {
  const { h } = await setup({ evidence: [] });
  assert.ok((await ask(h, 'is Sentara building something')).observations.some((o) => /Sentara/.test(o.text)));
  assert.ok((await ask(h, 'new shopping center Elizabeth City Walmart')).observations.some((o) => /shopping center/.test(o.text)));
  assert.ok((await ask(h, '7 Brew Suffolk')).observations.some((o) => /7 Brew/.test(o.text)));
  assert.equal((await ask(h, 'bridge closure schedule')).observations.length, 0);
  const hr = await h.query({ region: 'greenville', type: 'claim', query: '7 Brew Suffolk', visitorId: 'g' });
  assert.equal(hr.observations.length, 0);
});

test('local observations ride alongside sourced answers without changing confidence', async () => {
  const { h } = await setup({ evidence: [ev(1)] });
  const r = await ask(h, 'Edenton bridge repair new businesses');
  assert.equal(r.confidence, 'Inferred'); assert.equal(r.sources.length, 1); assert.ok(r.observations.length >= 1);
});

test('local observations never bypass the review hold', async () => {
  const { h } = await setup();
  const r = await ask(h, 'did the Tractor Supply owner in Edenton commit fraud');
  assert.equal(r.held, true); assert.equal(r.observations, undefined);
});
