'use strict';
const crypto = require('crypto');
const dayKey = (now) => now.toISOString().slice(0, 10);
const hashId = (id) => crypto.createHash('sha256').update(String(id || 'anon')).digest('hex').slice(0, 24);

/** Reserve one AI summary against the site-wide and per-visitor daily caps. All-or-nothing. */
async function reserve(store, { visitorId, limits, now }) {
  const d = dayKey(now);
  const checks = [{ key: `${d}:total`, max: limits.dailyTotal }];
  if (visitorId) checks.push({ key: `${d}:v:${hashId(visitorId)}`, max: limits.perVisitor });
  const r = await store.consumeQuota(checks);
  if (r.ok) return { ok: true };
  return { ok: false, reason: r.failed.endsWith(':total') ? 'site' : 'visitor' };
}
module.exports = { reserve, hashId, dayKey };
