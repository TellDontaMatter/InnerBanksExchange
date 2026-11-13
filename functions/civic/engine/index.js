'use strict';
const { needsReview } = require('./review');
const { reserve } = require('./caps');
const { independentSources, confidenceFor } = require('./confidence');

const err = (m) => Object.assign(new Error(m), { status: 400 });

/**
 * handleQuery({region, query, type, visitorId}) -> {summary, sources[], confidence, spend?, reviewed, ...flags}
 * deps: { config, store, summarizer, spend, now }
 */
async function handleQuery(input, deps) {
  const { config, store, summarizer, spend, now = () => new Date() } = deps;
  const region = config.regions[input.region];
  if (!region) throw err('unknown region');
  const type = input.type;
  if (type !== 'claim' && type !== 'spend') throw err('type must be claim or spend');
  const query = String(input.query || '').trim().slice(0, 300);
  if (!query) throw err('query required');
  const ts = now().toISOString();
  const base = { reviewed: false };

  // Log first. Text, region, type, timestamp only; no visitor identity.
  const logEntry = { text: query, region: input.region, type, ts };

  const hold = needsReview(query, region);
  if (hold.hold) {
    await store.addLog({ ...logEntry, outcome: 'held' });
    await store.addReview({ text: query, region: input.region, type, reason: hold.reason, ts });
    return { ...base, summary: "We're looking into this.", sources: [], confidence: null, held: true };
  }

  if (type === 'spend') {
    const cov = await spend.coverage({ region: input.region, query });
    if (!cov) {
      await store.addLog({ ...logEntry, outcome: 'not-covered' });
      return { ...base, summary: 'Not covered yet.', sources: [], confidence: null, notCovered: true,
        requestForm: { region: input.region, query }, recordsKitUrl: config.recordsKitUrl };
    }
    await store.addLog({ ...logEntry, outcome: 'answered' });
    const rules = region.free.spend;
    const out = { recordCount: rules.recordCount ? cov.count : undefined, latestDate: rules.latestDate ? cov.latestDate : undefined };
    return { ...base, summary: `${cov.count} purchase records on file, latest ${cov.latestDate}.`, sources: [], confidence: null,
      spend: { ...out, lineDetail: 'paid' }, recordsKitUrl: config.recordsKitUrl };
  }

  // claim
  const evidence = independentSources(await store.searchTicker(input.region, query, 12));
  const confidence = confidenceFor(evidence.length);
  const sources = evidence.map((e) => ({ title: e.headline, publisher: e.publisher, url: e.url, date: e.date }));
  if (!evidence.length) {
    await store.addLog({ ...logEntry, outcome: 'miss' });
    return { ...base, summary: 'We have no sourced reporting on this yet.', sources: [], confidence, miss: true, automated: true };
  }
  if (!summarizer.available) {
    await store.addLog({ ...logEntry, outcome: 'no-model' });
    return { ...base, summary: 'Automated summaries are not switched on yet. Sources are listed below.', sources, confidence, automated: true };
  }
  const q = await reserve(store, { visitorId: input.visitorId, limits: config.limits, now: now() });
  if (!q.ok) {
    await store.addLog({ ...logEntry, outcome: `capped-${q.reason}` });
    const why = q.reason === 'visitor' ? "You've reached today's limit of summaries." : "We've reached today's limit of summaries.";
    return { ...base, summary: `${why} Sources are listed below; try again tomorrow.`, sources, confidence, capped: q.reason, automated: true };
  }
  let summary;
  try { summary = await summarizer.summarize({ region: input.region, query, evidence }); }
  catch (e) { summary = 'Summary unavailable right now. Sources are listed below.'; }
  await store.addLog({ ...logEntry, outcome: 'answered' });
  return { ...base, summary, sources, confidence, automated: true };
}

/** "Request this place" form. Email is optional and only stored if volunteered. */
async function requestPlace(input, { config, store, now = () => new Date() }) {
  if (!config.regions[input.region]) throw err('unknown region');
  const place = String(input.place || '').trim().slice(0, 120);
  if (!place) throw err('place required');
  const entry = { region: input.region, place, ts: now().toISOString() };
  const email = String(input.email || '').trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) entry.email = email.slice(0, 120);
  await store.addRequest(entry);
  return { ok: true }; // never sends email
}

/** Admin summary: top queries, misses, review queue. */
async function adminStats(store) {
  const { logs, reviews, requests } = await store.stats();
  const counts = new Map();
  for (const l of logs) { const k = `${l.region}|${l.text.toLowerCase()}`; counts.set(k, (counts.get(k) || 0) + 1); }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, n]) => ({ region: k.split('|')[0], text: k.slice(k.indexOf('|') + 1), n }));
  const misses = logs.filter((l) => l.outcome === 'miss' || l.outcome === 'not-covered');
  return { total: logs.length, top, misses, reviewQueue: reviews.filter((r) => r.status === 'pending'), requests };
}
module.exports = { handleQuery, requestPlace, adminStats };
