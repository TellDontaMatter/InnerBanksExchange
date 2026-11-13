'use strict';
/**
 * Host-agnostic request handlers. functions/index.js wires these to Firebase; the dev server
 * wires them to a MemoryStore. No secrets in here: the model key arrives via deps.
 */
const { handleQuery, requestPlace, adminStats } = require('./engine');
const { NullSpendAdapter } = require('./engine/spend');
const { noModel } = require('./engine/summarizer');

function makeHandlers({ config, store, summarizer = noModel, spend = new NullSpendAdapter(), isAdmin = async () => false, now }) {
  const deps = { config, store, summarizer, spend, now };
  return {
    query: (body) => handleQuery(body, deps),
    requestPlace: (body) => requestPlace(body, deps),
    ticker: async (region) => {
      if (!config.regions[region]) throw Object.assign(new Error('unknown region'), { status: 400 });
      return { region, name: config.regions[region].name, automated: true, items: await store.listTicker(region, 40) };
    },
    regions: () => Object.entries(config.regions).map(([id, r]) => ({ id, name: r.name, home: !!r.home, colours: r.colours })),
    admin: async (req) => { if (!(await isAdmin(req))) throw Object.assign(new Error('forbidden'), { status: 403 }); return adminStats(store); },
  };
}
module.exports = { makeHandlers };
