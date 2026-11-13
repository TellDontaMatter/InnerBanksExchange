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
  // Geography the model is told about, so "why it matters" is grounded. North to south; Chowan is the far end.
  corridor: {
    order: ['Virginia Beach / Chesapeake', 'Knotts Island (Currituck County)', 'Currituck', 'Camden', 'Pasquotank (Elizabeth City)', 'Perquimans', 'Chowan (Edenton)'],
    note: 'Chowan County is the southern end of this corridor, just before the Chowan River bridge to Bertie County. Hampton Roads news reaches Chowan through the places in between.',
  },
  // Reader groups the "why it matters" line may speak to, only when an item clearly bears on them.
  audiences: [
    'Newport News Shipbuilding workers and retirees who live in the Inner Banks',
    'owner-operator truck drivers who haul containers from the Hampton Roads port terminals',
  ],
  ticker: { itemsPerSource: 4, maxItemsPerRegion: 40 },
  model: { id: 'claude-haiku-5-5', maxTokens: 1500 },
  regions: {
    'inner-banks': {
      name: 'Inner Banks',
      home: true,
      places: ['Knotts Island', 'Currituck', 'Camden', 'Elizabeth City', 'Pasquotank', 'Perquimans', 'Edenton', 'Chowan County', 'Hertford', 'Bertie', 'Gates', 'Washington County'],
      colours: { ink: '#10222a', accent: '#1d5c60', marker: '#d8461a', paper: '#ecefe9' },
      free: { spend: { recordCount: true, latestDate: true, lineDetail: false } },
      sources: [
        { id: 'chowan-herald', name: 'Chowan Herald', site: null, feedUrl: null },
        { id: 'daily-advance', name: 'The Daily Advance', site: 'https://www.dailyadvance.com', feedUrl: null },
        { id: 'albemarle-observer', name: 'Albemarle Observer', site: null, feedUrl: null },
        { id: 'town-edenton', name: 'Town of Edenton', site: 'https://www.townofedentonnc.gov', feedUrl: null },
        { id: 'chowan-county', name: 'Chowan County', site: 'https://www.chowancounty-nc.gov', feedUrl: null },
        { id: 'city-elizabeth-city', name: 'City of Elizabeth City', site: 'https://www.cityofec.com', feedUrl: null },
      ],
    },
    'hampton-roads': {
      name: 'Hampton Roads',
      places: ['Suffolk', 'Virginia Beach', 'Chesapeake', 'Norfolk', 'Portsmouth', 'Newport News', 'Hampton'],
      colours: { ink: '#0e2233', accent: '#1f5f8b', marker: '#d8461a', paper: '#e9eef2' },
      free: { spend: { recordCount: true, latestDate: true, lineDetail: false } },
      sources: [
        { id: 'virginian-pilot', name: 'The Virginian-Pilot', site: 'https://www.pilotonline.com', feedUrl: null },
        { id: 'wavy', name: 'WAVY', site: 'https://www.wavy.com', feedUrl: null },
        { id: 'wtkr', name: 'WTKR', site: 'https://www.wtkr.com', feedUrl: null },
        { id: '13newsnow', name: '13News Now', site: 'https://www.13newsnow.com', feedUrl: null },
        // alsoIn: these also feed the Inner Banks ticker and search (they affect the Inner Banks most).
        { id: 'port-of-virginia', name: 'Port of Virginia', site: 'https://www.portofvirginia.com', feedUrl: null, alsoIn: ['inner-banks'] },
        { id: 'city-suffolk', name: 'City of Suffolk', site: 'https://www.suffolkva.us', feedUrl: null, alsoIn: ['inner-banks'] },
        { id: 'city-virginia-beach', name: 'City of Virginia Beach', site: 'https://www.vbgov.com', feedUrl: null, alsoIn: ['inner-banks'] },
        { id: 'city-chesapeake', name: 'City of Chesapeake', site: 'https://www.cityofchesapeake.net', feedUrl: null, alsoIn: ['inner-banks'], note: 'Check the domain; may be chesapeakeva.gov.' },
        { id: 'city-newport-news', name: 'City of Newport News', site: 'https://www.nnva.gov', feedUrl: null, alsoIn: ['inner-banks'] },
        { id: 'hii-nns', name: 'HII Newport News Shipbuilding', site: 'https://hii.com', feedUrl: null, alsoIn: ['inner-banks'], note: 'Shipyard workers and retirees live in the Inner Banks.' },
        { id: 'hrpdc', name: 'Hampton Roads Planning District Commission', site: 'https://www.hrpdcva.gov', feedUrl: null },
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
