'use strict';
/**
 * ONE config file for every region ("skin"). Adding a region = adding a block here.
 * Nothing else in /civic names a region.
 *
 * Sources: `site` is the publisher's homepage as best known; `feedUrl` stays null
 * until `node civic/scripts/check-sources.js` confirms a working feed. The ticker only
 * reads sources whose `feedUrl` is set. `group` (optional) = ownership group, so
 * syndicated copy is not counted as an independent source.
 */
module.exports = {
  limits: {
    dailyTotal: 50, // AI summaries per UTC day, whole site (ticker runs count too)
    perVisitor: 5,  // AI summaries per visitor per UTC day
  },
  recordsKitUrl: 'https://dontamatterz.gumroad.com/l/crmbkw',
  anchor: 'Chowan County', // every ticker item says why it matters here
  ticker: { itemsPerSource: 4, maxItemsPerRegion: 40 },
  model: { id: 'claude-haiku-5-5', maxTokens: 1500 },
  regions: {
    'inner-banks': {
      name: 'Inner Banks',
      home: true,
      places: ['Edenton', 'Chowan County', 'Hertford', 'Elizabeth City', 'Perquimans', 'Bertie', 'Gates', 'Washington County'],
      colours: { ink: '#10222a', accent: '#1d5c60', marker: '#d8461a', paper: '#ecefe9' },
      free: { spend: { recordCount: true, latestDate: true, lineDetail: false } },
      sources: [
        { id: 'chowan-herald', name: 'Chowan Herald', site: null, feedUrl: null },
        { id: 'daily-advance', name: 'The Daily Advance', site: 'https://www.dailyadvance.com', feedUrl: null },
        { id: 'albemarle-observer', name: 'Albemarle Observer', site: null, feedUrl: null },
        { id: 'town-edenton', name: 'Town of Edenton', site: 'https://www.townofedentonnc.gov', feedUrl: null },
        { id: 'chowan-county', name: 'Chowan County', site: 'https://www.chowancounty-nc.gov', feedUrl: null },
      ],
    },
    'hampton-roads': {
      name: 'Hampton Roads',
      places: ['Norfolk', 'Virginia Beach', 'Chesapeake', 'Portsmouth', 'Suffolk', 'Newport News', 'Hampton'],
      colours: { ink: '#0e2233', accent: '#1f5f8b', marker: '#d8461a', paper: '#e9eef2' },
      free: { spend: { recordCount: true, latestDate: true, lineDetail: false } },
      sources: [
        { id: 'virginian-pilot', name: 'The Virginian-Pilot', site: 'https://www.pilotonline.com', feedUrl: null },
        { id: 'wavy', name: 'WAVY', site: 'https://www.wavy.com', feedUrl: null },
        { id: 'wtkr', name: 'WTKR', site: 'https://www.wtkr.com', feedUrl: null },
        { id: '13newsnow', name: '13News Now', site: 'https://www.13newsnow.com', feedUrl: null },
        { id: 'port-of-virginia', name: 'Port of Virginia', site: 'https://www.portofvirginia.com', feedUrl: null },
        { id: 'hrpdc', name: 'Hampton Roads Planning District Commission', site: 'https://www.hrpdcva.gov', feedUrl: null },
        { id: 'hr-city-governments', name: 'Hampton Roads city governments', site: null, feedUrl: null, note: 'Needs a list of which cities.' },
      ],
    },
    greenville: {
      name: 'Greenville',
      places: ['Greenville', 'Pitt County', 'Winterville', 'Ayden', 'Farmville'],
      colours: { ink: '#2a1a33', accent: '#5b3a7a', marker: '#d8461a', paper: '#efeaf2' },
      free: { spend: { recordCount: true, latestDate: true, lineDetail: false } },
      sources: [
        { id: 'daily-reflector', name: 'The Daily Reflector', site: 'https://www.reflector.com', feedUrl: null },
        { id: 'witn', name: 'WITN', site: 'https://www.witn.com', feedUrl: null },
        { id: 'wnct', name: 'WNCT', site: 'https://www.wnct.com', feedUrl: null },
        { id: 'city-greenville', name: 'City of Greenville', site: 'https://www.greenvillenc.gov', feedUrl: null },
        { id: 'pitt-county', name: 'Pitt County', site: 'https://www.pittcountync.gov', feedUrl: null },
        { id: 'ecu-news', name: 'ECU news', site: 'https://news.ecu.edu', feedUrl: null },
      ],
    },
  },
};
