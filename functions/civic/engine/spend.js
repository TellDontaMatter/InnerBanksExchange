'use strict';
/**
 * Data-adapter interface for purchase-record ("spend") data. No data exists yet, so the default
 * adapter reports nothing. To plug data in later, implement:
 *   async coverage({region, query}) -> null | { count, latestDate, place }
 *   async detail({region, query})   -> rows[]   (paid; never returned by the free path)
 */
class NullSpendAdapter {
  async coverage() { return null; }
  async detail() { return []; }
}
module.exports = { NullSpendAdapter };
