'use strict';
/** Minimal RSS 2.0 / Atom reader. Keeps only headline, link, date and a short snippet used as
 *  model input; the snippet is never stored or displayed. */
const unesc = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const tag = (b, t) => { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? unesc(m[1]) : ''; };
function parseFeed(xml) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map((b) => {
    let link = tag(b, 'link');
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    const d = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated');
    const t = d ? new Date(d) : null;
    return { headline: tag(b, 'title'), link, date: t && !isNaN(t) ? t.toISOString() : null,
      snippet: (tag(b, 'description') || tag(b, 'summary')).slice(0, 300) };
  }).filter((i) => i.headline && /^https?:\/\//.test(i.link));
}
module.exports = { parseFeed };
