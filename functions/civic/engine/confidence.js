'use strict';
/** Collapse evidence to independent sources, then grade. Deterministic; the model never grades itself. */
function independentSources(evidence) {
  const seen = new Map();
  for (const e of evidence) {
    const k = e.group || e.sourceId || new URL(e.url).hostname;
    if (!seen.has(k)) seen.set(k, e);
  }
  return [...seen.values()];
}
function confidenceFor(n) { return n >= 3 ? 'Affirmed' : n >= 1 ? 'Inferred' : 'Hypothesis'; }
module.exports = { independentSources, confidenceFor };
