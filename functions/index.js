'use strict';
/**
 * Firebase wiring for the civic engine. NOT DEPLOYED. The model key is the secret
 * ANTHROPIC_API_KEY (set with `firebase functions:secrets:set ANTHROPIC_API_KEY`), never in the repo.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const config = require('./civic/config/regions');
const { FirestoreStore } = require('./civic/engine/store');
const { anthropicSummarizer, noModel } = require('./civic/engine/summarizer');
const { makeHandlers } = require('./civic/handlers');
const { runTicker } = require('./civic/ticker/ticker');

admin.initializeApp();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const ADMIN_EMAIL = 'philctellsit@gmail.com'; // matches firestore.rules isAdmin()

const store = () => new FirestoreStore(admin.firestore());
const summarizer = () => {
  const key = ANTHROPIC_API_KEY.value();
  return key ? anthropicSummarizer({ apiKey: key, model: config.model.id, maxTokens: config.model.maxTokens }) : noModel;
};
const isAdmin = async (req) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  try { const t = await admin.auth().verifyIdToken(m[1]); return t.email === ADMIN_EMAIL && t.email_verified === true; } catch { return false; }
};
const clientId = (req, body) => body.visitorId || req.ip || 'anon';

exports.civicApi = onRequest({ secrets: [ANTHROPIC_API_KEY], cors: true, maxInstances: 10 }, async (req, res) => {
  const h = makeHandlers({ config, store: store(), summarizer: summarizer(), isAdmin });
  const path = req.path.replace(/^\/api\/?/, '/').replace(/\/$/, '') || '/';
  try {
    if (req.method === 'GET' && path === '/regions') return res.json(h.regions());
    if (req.method === 'GET' && path === '/ticker') return res.json(await h.ticker(String(req.query.region || '')));
    if (req.method === 'GET' && path === '/admin') return res.json(await h.admin(req));
    if (req.method === 'POST' && path === '/query') return res.json(await h.query({ ...req.body, visitorId: clientId(req, req.body || {}) }));
    if (req.method === 'POST' && path === '/request-place') return res.json(await h.requestPlace(req.body || {}));
    return res.status(404).json({ error: 'not found' });
  } catch (e) { return res.status(e.status || 500).json({ error: e.status ? e.message : 'server error' }); }
});

// Once daily, 06:00 America/New_York.
exports.civicTickerDaily = onSchedule({ schedule: '0 6 * * *', timeZone: 'America/New_York', secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300 },
  async () => { console.log(JSON.stringify(await runTicker({ config, store: store(), summarizer: summarizer() }))); });
