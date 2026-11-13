'use strict';
/**
 * Store interface used by the engine. Implementations: MemoryStore (tests/dev) and
 * FirestoreStore (production, takes an injected firebase-admin `db`).
 *  addLog(entry) / addReview(entry) / addRequest(entry)
 *  consumeQuota([{key,max}]) -> {ok, failed?}   all-or-nothing, atomic
 *  putTickerItems(region, items) / listTicker(region, limit) / searchTicker(region, query, limit)
 *  stats() -> {logs, reviews, requests}
 */
const tokens = (s) => String(s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
const STOP = new Set(['the','and','for','with','what','does','that','this','from','about','are','was','will','how','why','who','has','have','county','mean','means']);
function score(item, qTokens) {
  const hay = new Set(tokens(`${item.headline} ${item.summary || ''}`));
  return qTokens.filter((t) => hay.has(t)).length;
}
function rank(items, query, limit) {
  const q = tokens(query).filter((t) => !STOP.has(t));
  if (!q.length) return [];
  return items.map((i) => [score(i, q), i]).filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, i]) => i);
}

class MemoryStore {
  constructor() { this.counters = new Map(); this.logs = []; this.reviews = []; this.requests = []; this.ticker = new Map(); }
  async addLog(e) { this.logs.push(e); }
  async addReview(e) { this.reviews.push({ ...e, status: 'pending' }); }
  async addRequest(e) { this.requests.push(e); }
  async consumeQuota(checks) {
    for (const c of checks) if ((this.counters.get(c.key) || 0) >= c.max) return { ok: false, failed: c.key };
    for (const c of checks) this.counters.set(c.key, (this.counters.get(c.key) || 0) + 1);
    return { ok: true };
  }
  async putTickerItems(region, items) { this.ticker.set(region, items); }
  async listTicker(region, limit = 40) { return (this.ticker.get(region) || []).slice(0, limit); }
  async searchTicker(region, query, limit = 8) { return rank(this.ticker.get(region) || [], query, limit); }
  async stats() { return { logs: this.logs, reviews: this.reviews, requests: this.requests }; }
}

/** Production store. `db` is a firebase-admin Firestore instance. Server-side only. */
class FirestoreStore {
  constructor(db) { this.db = db; }
  async addLog(e) { await this.db.collection('civicLog').add(e); }
  async addReview(e) { await this.db.collection('civicReview').add({ ...e, status: 'pending' }); }
  async addRequest(e) { await this.db.collection('civicRequests').add(e); }
  async consumeQuota(checks) {
    const refs = checks.map((c) => this.db.collection('civicCounters').doc(c.key));
    return this.db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      for (let i = 0; i < checks.length; i++) {
        if ((snaps[i].exists ? snaps[i].data().n : 0) >= checks[i].max) return { ok: false, failed: checks[i].key };
      }
      snaps.forEach((s, i) => tx.set(refs[i], { n: (s.exists ? s.data().n : 0) + 1 }));
      return { ok: true };
    });
  }
  async putTickerItems(region, items) { await this.db.collection('civicTicker').doc(region).set({ items, updated: new Date().toISOString() }); }
  async listTicker(region, limit = 40) { const d = await this.db.collection('civicTicker').doc(region).get(); return d.exists ? d.data().items.slice(0, limit) : []; }
  async searchTicker(region, query, limit = 8) { return rank(await this.listTicker(region, 200), query, limit); }
  async stats() {
    const read = async (c, n) => (await this.db.collection(c).orderBy('ts', 'desc').limit(n).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    return { logs: await read('civicLog', 1000), reviews: await read('civicReview', 200), requests: await read('civicRequests', 200) };
  }
}
module.exports = { MemoryStore, FirestoreStore, rank };
