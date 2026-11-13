'use strict';
const { parseFeed } = require('./rss');
const { reserve } = require('../engine/caps');

/** Deep link: tapping a ticker item opens search with the question pre-filled. */
function askHref(regionId, headline, anchor) {
  const q = `What does "${headline}" mean for ${anchor}?`;
  return `results.html?r=${encodeURIComponent(regionId)}&type=claim&q=${encodeURIComponent(q)}`;
}

async function fetchWithTimeout(fetchImpl, url, ms = 15000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetchImpl(url, { signal: c.signal, headers: { 'user-agent': 'goibx-civic-ticker/1.0' } }); }
  finally { clearTimeout(t); }
}

/**
 * Daily job. For each region: read each source with a feedUrl, build items, ONE batched model
 * call per region for our-own-words summaries (counts once against the daily cap), store.
 * Never stores article text. Failures per source are collected, not fatal.
 */
async function runTicker({ config, store, summarizer, fetchImpl = fetch, now = () => new Date() }) {
  const report = { regions: {}, skippedSources: [], errors: [] };
  // Pass 1: read every source once; an item lands in its own region and in any region named in `alsoIn`.
  const byRegion = Object.fromEntries(Object.keys(config.regions).map((r) => [r, []]));
  for (const [rid, region] of Object.entries(config.regions)) {
    for (const src of region.sources) {
      if (!src.feedUrl) { report.skippedSources.push(`${rid}/${src.id}: no verified feed`); continue; }
      try {
        const res = await fetchWithTimeout(fetchImpl, src.feedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parseFeed(await res.text()).slice(0, config.ticker.itemsPerSource);
        for (const target of [rid, ...(src.alsoIn || [])]) {
          if (!byRegion[target]) continue;
          for (const p of parsed) byRegion[target].push({ sourceId: src.id, group: src.group, publisher: src.name, headline: p.headline, url: p.link, date: p.date, snippet: p.snippet });
        }
      } catch (e) { report.errors.push(`${rid}/${src.id}: ${e.message}`); }
    }
  }
  // Pass 2: per region, dedupe, summarize in one batched call, store.
  for (const rid of Object.keys(config.regions)) {
    const items = byRegion[rid];
    const seen = new Set();
    const uniq = items.filter((i) => (seen.has(i.url) ? false : seen.add(i.url)))
      .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, config.ticker.maxItemsPerRegion);

    let ai = uniq.map(() => null);
    if (uniq.length && summarizer.available) {
      const q = await reserve(store, { visitorId: null, limits: config.limits, now: now() });
      if (q.ok) { try { ai = await summarizer.summarizeItems({ items: uniq, anchor: config.anchor, audiences: config.audiences, corridor: config.corridor }); } catch (e) { report.errors.push(`${rid}: summarize ${e.message}`); } }
      else report.errors.push(`${rid}: daily cap reached, headlines only`);
    }
    const out = uniq.map((it, i) => ({
      headline: it.headline, publisher: it.publisher, sourceId: it.sourceId, group: it.group, date: it.date,
      url: it.url,                                        // link to the original
      askHref: askHref(rid, it.headline, config.anchor),  // tap -> search pre-filled
      summary: ai[i] ? ai[i].summary : null,              // our own words
      why: ai[i] ? ai[i].why : null,
      automated: true,
    }));
    await store.putTickerItems(rid, out);
    report.regions[rid] = out.length;
  }
  return report;
}
module.exports = { runTicker, askHref };
