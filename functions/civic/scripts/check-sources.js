#!/usr/bin/env node
'use strict';
/**
 * Confirms each configured source still publishes and has a usable feed.
 * Run where the network can reach the publishers:  node civic/scripts/check-sources.js
 * For each source with a `site`, it tries <link rel=alternate> discovery, then common feed paths,
 * and prints the feedUrl to paste into civic/config/regions.js (or marks it NO FEED).
 */
const config = require('../config/regions');
const { parseFeed } = require('../ticker/rss');
const COMMON = ['/feed', '/feed/', '/rss', '/rss.xml', '/feed.xml', '/arc/outboundfeeds/rss/?outputType=xml', '/index.rss', '/news/rss', '/RSSFeed.aspx'];
async function get(url) { const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'goibx-civic-check/1.0' } }); return { ok: r.ok, status: r.status, text: await r.text() }; }
async function tryFeed(url) { try { const r = await get(url); if (!r.ok) return null; const items = parseFeed(r.text); return items.length ? { url, items: items.length, newest: items.map((i) => i.date).filter(Boolean).sort().pop() } : null; } catch { return null; } }
(async () => {
  for (const [rid, region] of Object.entries(config.regions)) for (const s of region.sources) {
    const tag = `${rid}/${s.id}`;
    if (!s.site) { console.log(`${tag}: NEEDS SITE URL (not configured)`); continue; }
    let found = null; const cands = [];
    try { const h = await get(s.site); const m = h.text.match(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/gi) || []; for (const l of m) { const href = (l.match(/href="([^"]+)"/i) || [])[1]; if (href) cands.push(new URL(href, s.site).href); } }
    catch (e) { console.log(`${tag}: SITE UNREACHABLE (${e.message})`); continue; }
    for (const p of COMMON) cands.push(new URL(p, s.site).href);
    for (const c of cands) { found = await tryFeed(c); if (found) break; }
    console.log(found ? `${tag}: OK feedUrl=${found.url} items=${found.items} newest=${found.newest || '?'}` : `${tag}: NO USABLE FEED (site is up; needs manual look)`);
  }
})();
