'use strict';
/**
 * Hold-for-review rule. A query is HELD (saved to the review queue, not answered) when it
 * (a) makes an accusation, or (b) names or points at a private person.
 * Deliberately conservative: a false hold costs a human a glance; a false answer about a
 * private person costs far more. Tune the lists below; tests pin the behaviour.
 */
const ACCUSATION = /\b(steal|stole|stolen|theft|thief|fraud|fraudulent|embezzl\w*|corrupt\w*|brib\w*|kickback\w*|crook\w*|criminal\w*|illegal\w*|cheat\w*|lied|lying|liar|scam\w*|abus\w*|assault\w*|molest\w*|harass\w*|rapist|drunk|dui|affair|cover(?:ing|ed)?[ -]?up|laundering|guilty|arrested|should be (?:fired|jailed|arrested))\b/i;
const PRIVATE_REF = /\b(my|our|his|her|their)\s+(neighbou?r|landlord|boss|ex|wife|husband|girlfriend|boyfriend|coworker|co-worker|roommate|tenant|teacher|pastor)\b|\b(mr|mrs|ms|miss)\.?\s+[A-Z][a-z]+/;
// Capitalised word pairs ("John Smith"). Anything that matches a known place/organisation term is exempt.
const NAME_PAIR = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g;
const NOT_A_PERSON = new Set(['county','town','city','council','board','commission','department','school','schools','hospital','harbor','river','sound','bay','beach','road','street','bridge','port','court','herald','advance','observer','reflector','pilot','virginian','news','north','carolina','virginia','inner','banks','hampton','roads','pitt','chowan','edenton','greenville','norfolk','chesapeake','portsmouth','suffolk','newport','state','federal','planning','district','university','college','records','kit']);

function needsReview(query, region, extraKnown = []) {
  const q = String(query || '');
  if (ACCUSATION.test(q)) return { hold: true, reason: 'accusation' };
  if (PRIVATE_REF.test(q)) return { hold: true, reason: 'private-person' };
  const known = new Set([...((region && region.places) || []), ...extraKnown].flatMap((p) => p.toLowerCase().split(/\s+/)));
  for (const m of q.matchAll(NAME_PAIR)) {
    const [a, b] = [m[1].toLowerCase(), m[2].toLowerCase()];
    if (NOT_A_PERSON.has(a) || NOT_A_PERSON.has(b) || known.has(a) || known.has(b)) continue;
    return { hold: true, reason: 'private-person' };
  }
  return { hold: false };
}
module.exports = { needsReview };
