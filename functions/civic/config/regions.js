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
  // Owner-observed local signals. NOT sourced reporting: they only ever appear as "Hypothesis",
  // labelled as unconfirmed, and carry what would confirm them. Edit freely; remove once sourced.
  signals: [
    { id: 'ecity-shopping-center', regions: ['inner-banks'], place: 'Elizabeth City', tags: ['shopping center', 'retail', 'walmart', 'development', 'new business'],
      text: 'A new shopping center is going up near the Walmart in Elizabeth City.', observed: '2026-11-13',
      confirmWith: ['City of Elizabeth City / Pasquotank County planning and permit records', 'The Daily Advance'] },
    { id: 'sentara-build', regions: ['inner-banks'], place: 'Elizabeth City (location to confirm)', tags: ['sentara', 'hospital', 'health', 'clinic', 'construction', 'development'],
      text: 'Sentara has a building project under way (exact site and type to confirm).', observed: '2026-11-13',
      confirmWith: ['Sentara newsroom', 'NC DHSR certificate-of-need filings, if it is a health facility', 'Local permit records'] },
    { id: 'edenton-new-retail', regions: ['inner-banks'], place: 'Edenton', tags: ['tractor supply', 'dominos', 'domino', 'retail', 'new business', 'chains', 'development'],
      text: "Edenton has gained a Tractor Supply, a Domino's and a handful of new small local businesses.", observed: '2026-11-13',
      confirmWith: ['Town of Edenton planning and zoning records', 'Chowan Herald', 'Chowan County business license / permit records'] },
    { id: 'edenton-provalus', regions: ['inner-banks'], place: 'Edenton', tags: ['provalus', 'provalis', 'call center', 'it services', 'jobs', 'employer', 'tech', 'service', 'new business'],
      text: 'Provalus, an IT outsourcing firm, has a center in Edenton that adds local jobs (announced job counts differ between reports).', observed: '2026-11-13',
      confirmWith: ['NC Commerce announcement (Feb 2025, Chowan County)', 'Chowan County / Town of Edenton economic development records', 'NC One NC grant compliance reporting'] },
    { id: 'farm-melons', regions: ['inner-banks'], place: 'Chowan area', tags: ['melon', 'melons', 'watermelon', 'fruit flies', 'roadside stands', 'farm', 'farming', 'crops', 'agriculture', 'land'],
      text: 'Fewer roadside melon stands this season, and fewer fruit flies (they breed on unharvested melons ground into the fields). Nearly every landowner grows melons, so this looks broad, not one grower.', observed: '2026-11-13',
      confirmWith: ['USDA Census of Agriculture 2017 vs 2022: farms, cropland and melon acres', 'NC Cooperative Extension, Chowan County', 'A recount of stands on the same routes next season'] },
    { id: 'farm-rotation-crops', regions: ['inner-banks'], place: 'Chowan area', tags: ['cotton', 'bales', 'tobacco', 'collards', 'pumpkins', 'corn', 'rotation', 'farm', 'farming', 'crops', 'agriculture', 'land'],
      text: 'Less cotton (fewer bales) and no tobacco seen last year; no one offering collards. These are rotated on the same land with melons, corn and pumpkins, so several crops are thinning together.', observed: '2026-11-13',
      confirmWith: ['USDA NASS county acreage for cotton, tobacco and corn', 'USDA Census of Agriculture 2017 vs 2022', 'NC Cooperative Extension, Chowan County'] },
    { id: 'farm-combine-traffic', regions: ['inner-banks'], place: 'Chowan area', tags: ['combines', 'harvest', 'grain', 'corn', 'soybeans', 'farm equipment', 'traffic', 'farm', 'farming', 'agriculture', 'land'],
      text: 'Combines are heavy on local roads at harvest, which suggests grain land is still farmed, likely by fewer, larger operators, while hand-labor crops thin.', observed: '2026-11-13',
      confirmWith: ['USDA Census of Agriculture: farm counts and size', 'NC Cooperative Extension, Chowan County'] },
    { id: 'bojangles-us17', regions: ['inner-banks'], place: 'US 17 corridor (site to confirm)', tags: ['bojangles', 'duck thru', 'us 17', 'highway', 'traffic', 'i-87', 'interstate', 'chain', 'retail', 'new business', 'development'],
      text: 'A new Bojangles was built in a sparsely populated spot across from a Duck Thru, a bet on steady highway traffic.', observed: '2026-11-13',
      confirmWith: ['NCDOT traffic counts and I-87 plans for US 17', 'County permit records for the site'] },
    { id: 'suffolk-7-brew', regions: ['inner-banks', 'hampton-roads'], place: 'Suffolk', tags: ['7 brew', 'coffee', 'drive-thru', 'retail', 'new business', 'development'],
      text: 'A 7 Brew drive-thru coffee shop is coming to Suffolk. Small on its own; the owner reads it as a sign of bigger growth along the corridor.', observed: '2026-11-13',
      confirmWith: ['City of Suffolk planning commission / site-plan records', 'Suffolk News-Herald'] },
  ],
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
