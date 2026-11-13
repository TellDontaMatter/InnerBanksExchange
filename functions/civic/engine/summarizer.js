'use strict';
/**
 * Summarizer interface: { available: bool, summarize({region, query, evidence}) -> string }.
 * The model only phrases what the evidence already says; it grades nothing.
 * The API key comes from the environment (a secret in production), never from the repo.
 */
const SYSTEM = 'You write a short neutral answer (max 3 sentences) using ONLY the evidence items given. Never add facts, names or numbers not in the evidence. If the evidence does not answer the question, say so. Do not quote at length; use your own words.';

function anthropicSummarizer({ apiKey, model, fetchImpl = fetch, maxTokens = 400 }) {
  return {
    available: !!apiKey,
    async summarize({ query, evidence }) {
      const body = evidence.map((e, i) => `[${i + 1}] ${e.publisher}: ${e.headline}${e.summary ? ' — ' + e.summary : ''}`).join('\n');
      const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content: `Question: ${query}\n\nEvidence:\n${body}` }] }),
      });
      if (!res.ok) throw new Error(`model call failed: ${res.status}`);
      const j = await res.json();
      return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    },
    // Ticker: one call per region. Returns [{summary, why}] aligned to items.
    async summarizeItems({ items, anchor, audiences = [] }) {
      const list = items.map((it, i) => `${i}. ${it.publisher}: ${it.headline}${it.snippet ? ' | ' + it.snippet : ''}`).join('\n');
      const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 1500, system: `For each numbered news item write "summary" (1-2 sentences, your own words, no copied phrases) and "why" (one line on why it matters to ${anchor}). Use only what is given.${audiences.length ? ' Readers include: ' + audiences.join('; ') + '. Mention a group only when the item clearly bears on it; never guess.' : ''} Reply with a JSON array of {"i":number,"summary":string,"why":string} and nothing else.`, messages: [{ role: 'user', content: list }] }),
      });
      if (!res.ok) throw new Error(`model call failed: ${res.status}`);
      const j = await res.json();
      const txt = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
      return items.map((_, i) => arr.find((a) => a.i === i) || null);
    },
  };
}
const noModel = { available: false, async summarize() { throw new Error('NO_MODEL_KEY'); }, async summarizeItems() { throw new Error('NO_MODEL_KEY'); } };
module.exports = { anthropicSummarizer, noModel };
