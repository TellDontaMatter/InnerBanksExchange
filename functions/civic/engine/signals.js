'use strict';
/** Owner-observed signals: matched by keyword, returned as unconfirmed "Hypothesis" observations only. */
const tok = (s) => String(s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
const GENERIC = new Set(['the','and','for','with','what','does','that','this','from','about','are','was','will','how','why','who','has','have','county','mean','means','new','being','going','coming','city','near','there','any','built','building']);
function matchSignals(signals, regionId, query, limit = 4) {
  const q = new Set(tok(query).filter((t) => !GENERIC.has(t)));
  if (!q.size) return [];
  return (signals || []).filter((s) => !s.regions || s.regions.includes(regionId))
    .map((s) => [tok(`${s.place} ${(s.tags || []).join(' ')} ${s.text}`).filter((t) => !GENERIC.has(t)).filter((t) => q.has(t)).length, s])
    .filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]).slice(0, limit)
    .map(([, s]) => ({ text: s.text, place: s.place, observed: s.observed, status: 'Hypothesis', basis: 'Local observation, not yet sourced', confirmWith: s.confirmWith || [] }));
}
module.exports = { matchSignals };
