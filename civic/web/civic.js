(function () {
  'use strict';
  var API = (window.CIVIC && window.CIVIC.api) || '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) { if (k === 'text') n.textContent = props[k]; else n.setAttribute(k, props[k]); });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  // All dynamic text goes through textContent; model output is never injected as HTML.
  function safeHref(u) { return /^https?:\/\//.test(u) ? u : '#'; }
  var visitorId; try { visitorId = localStorage.getItem('civic_vid'); if (!visitorId) { visitorId = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('civic_vid', visitorId); } } catch (e) { visitorId = undefined; }
  function api(path, opts) { return fetch(API + '/api' + path, opts).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); }); }
  function params() { return new URLSearchParams(location.search); }
  function applyRegion(regions, id) {
    var r = regions.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var s = document.documentElement.style; s.setProperty('--sea', r.colours.accent); s.setProperty('--marker', r.colours.marker);
    var t = $('[data-region-name]'); if (t) t.textContent = r.name;
  }
  function nav(regions, current) {
    var n = $('nav'); if (!n) return;
    regions.forEach(function (r) {
      var a = el('a', { href: r.home ? 'index.html' : 'region.html?r=' + r.id, text: r.name }); if (r.id === current) a.setAttribute('aria-current', 'page'); n.appendChild(a);
    });
  }
  function searchForm(region, regions) {
    var f = $('form.search'); if (!f) return;
    var sel = $('select', f);
    regions.forEach(function (r) { var o = el('option', { value: r.id, text: r.name }); if (r.id === region) o.selected = true; sel.appendChild(o); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var q = $('input[name=q]', f).value.trim(); if (!q) return;
      location.href = 'results.html?r=' + encodeURIComponent(sel.value) + '&type=' + encodeURIComponent($('input[name=type]:checked', f).value) + '&q=' + encodeURIComponent(q);
    });
  }
  function renderTicker(box, data) {
    box.textContent = '';
    if (!data.items.length) { box.appendChild(el('p', { class: 'muted', text: 'No items yet. The ticker updates once a day.' })); }
    var per = 5, page = 0, list = el('div'), pager = el('div', { class: 'pager' });
    function draw() {
      list.textContent = '';
      data.items.slice(page * per, page * per + per).forEach(function (it) {
        var item = el('div', { class: 'item' });
        item.appendChild(el('a', { class: 'hl', href: it.askHref, text: it.headline, title: 'Ask about this' }));
        item.appendChild(el('div', { class: 'meta', text: it.publisher + (it.date ? ' · ' + it.date.slice(0, 10) : '') }));
        if (it.summary) item.appendChild(el('p', { text: it.summary }));
        if (it.why) item.appendChild(el('div', { class: 'why', text: 'Why it matters: ' + it.why }));
        item.appendChild(el('div', { class: 'links' }, [el('a', { class: 'orig', href: safeHref(it.url), rel: 'noopener', target: '_blank', text: 'Read the original at ' + it.publisher + ' ↗' })]));
        list.appendChild(item);
      });
      pager.textContent = '';
      if (page > 0) { var p = el('button', { class: 'quiet', type: 'button', text: '← Newer' }); p.onclick = function () { page--; draw(); }; pager.appendChild(p); }
      if ((page + 1) * per < data.items.length) { var n = el('button', { class: 'quiet', type: 'button', text: 'Older →' }); n.onclick = function () { page++; draw(); }; pager.appendChild(n); }
    }
    box.appendChild(list); box.appendChild(pager);
    box.appendChild(el('p', { class: 'muted ticker-note', text: 'Automated: items are read from public sources once a day and summarized by software. Always check the original.' }));
    draw();
  }
  function renderResult(box, r, ctx) {
    box.textContent = '';
    var card = el('div', { class: 'card' + (r.held ? ' warn' : '') });
    card.appendChild(el('span', { class: 'label', text: r.held ? 'Under review' : 'Automated summary' }));
    if (r.confidence) card.appendChild(el('span', { class: 'conf ' + r.confidence, text: r.confidence }));
    card.appendChild(el('p', { text: r.summary, style: 'margin-top:10px' }));
    if (r.notCovered) {
      card.appendChild(el('p', { class: 'muted', text: 'We have no purchase-record data for this place yet.' }));
      card.appendChild(rplForm(ctx));
      card.appendChild(el('p', { style: 'margin-top:12px' }, [el('a', { class: 'btn', href: r.recordsKitUrl, rel: 'noopener', target: '_blank', text: 'Get the Records Kit' })]));
    }
    if (r.spend) card.appendChild(el('p', { class: 'muted', text: 'Line-by-line detail is a paid add-on.' }));
    if (r.sources && r.sources.length) {
      var ul = el('ul', { class: 'sources' });
      r.sources.forEach(function (s) { ul.appendChild(el('li', {}, [el('a', { href: safeHref(s.url), rel: 'noopener', target: '_blank', text: s.title }), el('span', { class: 'muted', text: ' — ' + s.publisher + (s.date ? ', ' + s.date.slice(0, 10) : '') })])); });
      card.appendChild(el('h2', { text: 'Sources' })); card.appendChild(ul);
    }
    if (!r.held) card.appendChild(el('p', { class: 'muted', style: 'margin-top:12px', text: 'This answer is automated and has not been reviewed by a person.' }));
    box.appendChild(card);
  }
  function rplForm(ctx) {
    var f = el('form', { style: 'margin-top:10px' });
    f.appendChild(el('label', { class: 'muted', for: 'rp', text: 'Request this place' }));
    var row = el('div', { class: 'search' });
    var place = el('input', { type: 'text', id: 'rp', placeholder: 'Town or county', required: 'required', maxlength: '120' });
    var email = el('input', { type: 'text', placeholder: 'Email (optional, only if you want a reply)', maxlength: '120', autocomplete: 'email' });
    row.appendChild(place); row.appendChild(email); row.appendChild(el('button', { type: 'submit', text: 'Request' })); f.appendChild(row);
    var msg = el('p', { class: 'muted' }); f.appendChild(msg);
    f.addEventListener('submit', function (e) { e.preventDefault();
      api('/request-place', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ region: ctx.region, place: place.value, email: email.value }) })
        .then(function () { msg.textContent = 'Thanks. We logged your request.'; }).catch(function () { msg.textContent = 'Could not send. Try again later.'; }); });
    return f;
  }
  window.CivicUI = { api: api, params: params, applyRegion: applyRegion, nav: nav, searchForm: searchForm, renderTicker: renderTicker, renderResult: renderResult, visitorId: function () { return visitorId; }, el: el };
})();
