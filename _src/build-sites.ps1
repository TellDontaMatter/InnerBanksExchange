# Builds connect/index.html (community) and help/index.html (help wanted / services offered)
# from the dark IBX look in shop/index.html plus the original Community Board logic,
# then relinks shop/index.html to the three-site layout. ASCII only on purpose.
$ErrorActionPreference = 'Stop'
$r = 'C:\Users\bonil\Documents\Codex\2026-09-30\go\work\inner-banks-exchange'
$u8 = New-Object Text.UTF8Encoding($false)
function Rep([string]$text, [string]$from, [string]$to) {
  if (-not $text.Contains($from)) { throw "not found: $from" }
  return $text.Replace($from, $to)
}

# --- sources -------------------------------------------------------------
$backup = "$r\_old-2026-10-31\community-original.html"
if (-not (Test-Path $backup)) { Copy-Item "$r\connect\community.html" $backup -Force }
$old  = [IO.File]::ReadAllText($backup)
$shop = [IO.File]::ReadAllText("$r\shop\index.html")
$css  = [regex]::Match($shop, '(?s)<style>(.*?)</style>').Groups[1].Value
$mark = [regex]::Match($shop, '(?s)<svg class="brand-mark" viewBox="0 0 48 48" role="img" aria-hidden="true">.*?</svg>').Value
if (-not $mark) { throw 'brand mark not found' }

# --- original board logic, adapted ---------------------------------------
$js = [regex]::Match($old, '(?s)<script>\s*(const firebaseConfig.*?)</script>').Groups[1].Value
if (-not $js) { throw 'board script not found' }
$js = [regex]::Replace($js, "spotlight: '[^']*Spotlight'", "spotlight: 'Spotlight'")
$js = [regex]::Replace($js, "'[^'A-Za-z]+Comments \('", "'Comments ('")
$js = [regex]::Replace($js, "(?m)^\s*note\.style\.background = COLORS.*\r?\n", '')
$js = [regex]::Replace($js, "(?m)^\s*note\.style\.setProperty\('--r'.*\r?\n", '')
$js = Rep $js "filter(p => (current === 'all' || p.category === current)" "filter(p => ALLOWED.has(p.category) && matchesBoardQuery(p) && (current === 'all' || p.category === current)"
# More info links for the three cards that had none (each address checked live)
$js = Rep $js "contact: '(252) 333-1510' }" "contact: '(252) 333-1510', url: 'https://www.aaunitedway.org/' }"
$js = Rep $js "contact: 'College of the Albemarle' }" "contact: 'College of the Albemarle', url: 'https://www.albemarle.edu/programs-classes/noncredit/courses/high-school-equivalency/' }"
# a few more verified local entries so common searches (health dept, town hall, 211) have somewhere to point
$js = Rep $js "contact: 'NC Cooperative Extension' }" @"
contact: 'NC Cooperative Extension', url: 'https://chowan.ces.ncsu.edu/' },
    { category: 'resources', title: 'Chowan County Health Department', description: 'Public health services for Chowan County, run by Albemarle Regional Health Services.\n202 W. Hicks St., Edenton. Call to confirm services and hours.', contact: '(252) 482-6003', url: 'https://www.publichealth.nc.gov/contact/LHD' },
    { category: 'resources', title: 'Edenton Town Hall', description: 'Town of Edenton offices, council information and staff directory.\n400 S. Broad St., Edenton (side entrance on W. King St.)', contact: 'townofedentonnc.gov', url: 'https://www.townofedentonnc.gov/town-hall' },
    { category: 'resources', title: 'Chowan County Government', description: 'Official county government website.', contact: 'chowancounty-nc.gov', url: 'https://www.chowancounty-nc.gov/' },
    { category: 'resources', county: 'Region-wide', title: 'NC 211', description: 'Free, confidential help finding food, housing, health care and other local services. Dial 2-1-1.', contact: '2-1-1', url: 'https://nc211.org/' }
"@
$searchLib = @'

  /* ---- search helpers (shared by the board filter and the tile search boxes) ---- */
  let boardQuery = '';
  const STOP = new Set(['a','an','the','for','in','of','to','near','me','my','and','or','on','at','is','are','where','how','do','i','can','get','find','need','nearby','local']);
  const SYN = [['food','pantry','meals','groceries','nutrition','snap','hunger'], ['assistance','aid','help','benefits','support'], ['job','jobs','hiring','career','employment','work','wanted'], ['health','clinic','medical','healthcare','doctor','nurse'], ['hall','government','council','clerk'], ['kid','kids','youth','children','teens'], ['housing','rent','shelter'], ['event','events','festival','market','calendar']];
  function qGroups(q) {
    return String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w)).map(w => {
      const g = new Set([w]);
      SYN.forEach(list => { if (list.includes(w)) list.forEach(x => g.add(x)); });
      return [...g];
    });
  }
  function qScore(groups, hay) { hay = String(hay).toLowerCase(); return groups.filter(g => g.some(w => hay.includes(w))).length; }
  function qNeed(n) { return n <= 2 ? n : Math.ceil(n * 0.6); }
  function hayOf(p) { return [p.title, p.description, p.contact, p.county, LABELS[p.category]].filter(Boolean).join(' '); }
  function matchesBoardQuery(p) { const g = qGroups(boardQuery); return !g.length || qScore(g, hayOf(p)) >= qNeed(g.length); }
'@
$js = Rep $js "if (tabParam && LABELS[tabParam]) current = tabParam;" "if (tabParam && ALLOWED.has(tabParam)) current = tabParam;"
$js = Rep $js "[['all', 'All'], ...Object.entries(LABELS)].forEach" "[['all', 'All'], ...CONFIG.tabs.map(k => [k, LABELS[k]])].forEach"
$js = Rep $js "location.origin + '/community.html#' + item.key" "location.origin + location.pathname + '#' + item.key"
$js = $js.Replace("'#c1121f'", "'var(--bad)'").Replace("'#1d6f66'", "'var(--good)'")
$labelsLine = [regex]::Match($js, "(?m)^\s*const LABELS = .*$").Value
$js = Rep $js $labelsLine ($labelsLine + "`n  const CONFIG = @@CFG@@;`n  const ALLOWED = new Set(CONFIG.tabs);" + $searchLib)

# --- board styling (dark tag look) ---------------------------------------
$boardCss = @'

/* ---------- Board (Connect + Help) ---------- */
:root { --bad: #c4452a; --good: #2f7a4f; }
:root[data-theme="dark"] { --bad: #ff8a63; --good: #6fcf97; }
.nav a.on { color: var(--ink); border-color: var(--marker); }
.board-sec { background: var(--paper-2); padding: 56px 0 96px; scroll-margin-top: 38px; }
.board-top { display: flex; justify-content: space-between; align-items: end; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; }
.board-top h2 { font: 900 clamp(38px, 6vw, 64px)/.9 var(--f-display); text-transform: uppercase; }
.board-top p { color: var(--ink-2); max-width: 46ch; margin-top: 10px; }
.board-sec select, .board-sec input, .board-sec textarea {
  width: 100%; padding: 12px 14px; background: var(--card); color: var(--ink);
  border: 1.5px solid var(--ink); border-radius: 3px; font: 500 14px var(--f-body);
}
.board-sec textarea { min-height: 84px; resize: vertical; }
.board-sec ::placeholder { color: var(--ink-2); }
.board-tools { width: 100%; max-width: 320px; display: grid; gap: 10px; }
.tiles { position: relative; z-index: 5; }
.tile .th { color: inherit; text-decoration: none; }
.tile .th:hover h3 { color: var(--marker); }
.tsearch { position: relative; display: flex; margin-top: 10px; }
.tsearch input { flex: 1; min-width: 0; padding: 12px 14px; background: var(--paper); color: var(--ink); border: 1.5px solid var(--ink); border-right: 0; border-radius: 3px 0 0 3px; font: 500 14px var(--f-body); }
.tsearch input::placeholder { color: var(--ink-2); }
.tsearch button { width: 48px; border: 1.5px solid var(--marker); background: var(--marker); color: var(--marker-ink); border-radius: 0 3px 3px 0; font: 700 18px var(--f-body); cursor: pointer; }
.tsearch button:hover { filter: brightness(1.07); }
.tresults { position: absolute; left: 0; right: 0; top: calc(100% + 8px); z-index: 30; list-style: none; margin: 0; padding: 6px; background: var(--card); border: 1.5px solid var(--ink); border-radius: 4px; box-shadow: 6px 6px 0 var(--ink); max-height: 340px; overflow: auto; }
.tresults a { display: block; padding: 10px; border-radius: 3px; color: var(--ink); text-decoration: none; font: 600 14px/1.3 var(--f-body); cursor: pointer; }
.tresults a:hover, .tresults a:focus-visible { background: var(--paper-2); }
.tresults .rt { display: block; font: 500 10.5px/1 var(--f-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--sea); margin-bottom: 4px; }
.tresults a.all { color: var(--marker); }
.tresults[hidden] { display: none !important; }
.foot .soon { color: var(--ink-2); font-size: 14px; }
.formbox { background: var(--card); border: 1.5px solid var(--ink); border-radius: 4px; margin-bottom: 28px; max-width: 640px; }
.formbox summary { cursor: pointer; padding: 14px 18px; font: 600 14px var(--f-body); letter-spacing: .02em; list-style: none; display: flex; justify-content: space-between; align-items: center; }
.formbox summary::-webkit-details-marker { display: none; }
.formbox summary::after { content: "+"; font: 600 20px var(--f-mono); color: var(--marker); }
.formbox[open] summary::after { content: "\2212"; }
.formbox form { display: grid; gap: 10px; padding: 0 18px 18px; }
.msg { font-size: 13px; color: var(--ink-2); }
.go { background: var(--marker); color: var(--marker-ink); border: 0; border-radius: 3px; padding: 13px 18px; font: 600 14px var(--f-body); cursor: pointer; }
.go:hover { filter: brightness(1.07); }
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1.5px solid var(--ink); }
.tabs button { font: 500 12.5px/1 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; padding: 11px 15px; border-radius: 999px; background: transparent; color: var(--ink); border: 1.5px solid var(--line); }
.tabs button:hover { border-color: var(--ink); }
.tabs button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.board { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr)); gap: 40px 28px; }
.note { position: relative; background: var(--card); border: 1.5px solid var(--ink); border-top: 30px solid var(--manila); border-radius: 4px; padding: 18px; min-width: 0; word-wrap: break-word; display: flex; flex-direction: column; gap: 8px; transition: transform .2s, box-shadow .2s; }
.note:hover { transform: translateY(-4px); box-shadow: 6px 6px 0 var(--ink); }
.note::before { content: ""; position: absolute; top: -23px; right: 14px; width: 14px; height: 14px; border-radius: 50%; background: var(--paper-2); border: 1.5px solid var(--ink); }
.note.spot { border-top-color: var(--marker); }
.note.flash { outline: 3px solid var(--marker); outline-offset: 3px; }
.badge { display: inline-block; align-self: flex-start; font: 500 11px/1 var(--f-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--sea); }
.note > .badge + .badge { margin-left: 0 !important; color: var(--ink-2); }
.note h3 { font: 800 26px/1.02 var(--f-display); text-transform: uppercase; text-wrap: balance; }
.note p { font-size: 14.5px; white-space: pre-wrap; color: var(--ink); }
.meta { font: 500 12px/1.5 var(--f-mono); color: var(--ink-2); letter-spacing: .02em; }
.more { color: var(--marker); font: 600 14px var(--f-body); text-decoration: none; }
.more:hover { text-decoration: underline; }
.share { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 12px; border-top: 1.5px dashed var(--line); }
.share a, .share button { font: 500 11px/1 var(--f-mono); letter-spacing: .06em; text-transform: uppercase; background: transparent; border: 1.5px solid var(--line); border-radius: 999px; padding: 7px 10px; color: var(--ink-2); text-decoration: none; cursor: pointer; }
.share a:hover, .share button:hover { border-color: var(--ink); color: var(--ink); }
details.cm { font-size: 14px; }
details.cm summary { cursor: pointer; font: 500 11.5px var(--f-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--sea); }
.cm .c { background: var(--paper-2); border-radius: 3px; padding: 8px 10px; margin-top: 8px; font-size: 13.5px; }
.cm form { display: grid; gap: 6px; margin-top: 10px; }
.empty { grid-column: 1 / -1; padding: 48px 20px; text-align: center; border: 1.5px dashed var(--ink-2); font: 500 14px var(--f-mono); color: var(--ink-2); }
.fine { margin-top: 36px; font-size: 13px; color: var(--ink-2); max-width: 70ch; }
'@

# --- shared page parts ---------------------------------------------------
$SHOP = 'https://ibxshop.web.app/'; $CONNECT = 'https://ibxconnect.web.app/'; $HELP = 'https://ibxhelp.web.app/'
function Nav([string]$active) {
  $items = @(@('shop','Shop',$SHOP), @('connect','Community Board',$CONNECT), @('help','Help Wanted',$HELP))
  ($items | ForEach-Object { $cls = if ($_[0] -eq $active) { ' class="on"' } else { '' }; "<a href=`"$($_[2])`"$cls>$($_[1])</a>" }) -join "`n      "
}
$netItems = @(
  @('https://ibxshop.web.app/','IBX Shop: Local Goods &amp; Gear'),
  @('https://ibxconnect.web.app/','IBX Connect: Community Board'),
  @('https://ibxhelp.web.app/','IBX Help: Help Wanted &amp; Services Offered'),
  @('https://seeyouryou.web.app','S.E.E. Engine: Decision Evaluation'),
  @('https://movebyphilc.netlify.app','Route | Philc: Military Relocation Routing'))
function NetworkBar {
  $one = ($netItems | ForEach-Object { "<a href=`"$($_[0])`" target=`"_blank`" rel=`"noopener`"><i></i>$($_[1])</a>" }) -join "`n    "
  $two = ($netItems | ForEach-Object { "<a href=`"$($_[0])`" target=`"_blank`" rel=`"noopener`" aria-hidden=`"true`" tabindex=`"-1`"><i></i>$($_[1])</a>" }) -join "`n    "
  "<header class=`"network`" aria-label=`"Inner Banks Exchange network`">`n  <div class=`"network-track`">`n    $one`n    $two`n  </div>`n</header>"
}
function SearchTile([string]$scope, [string]$k, [string]$h, [string]$p, [string]$placeholder, [string]$href) {
  "<div class=`"tile`" data-scope=`"$scope`"><span class=`"k`">$k<i aria-hidden=`"true`"></i></span><a class=`"th`" href=`"$href`"><h3>$h</h3></a><p>$p</p><form class=`"tsearch`" role=`"search`" autocomplete=`"off`"><input type=`"search`" placeholder=`"$placeholder`" aria-label=`"Search: $h`" maxlength=`"60`"><button type=`"submit`" aria-label=`"Search $h`">&rarr;</button><ul class=`"tresults`" hidden></ul></form></div>"
}
function Tile([string]$k, [string]$h, [string]$p, [string]$go, [string]$href) {
  "<a class=`"tile`" href=`"$href`"><span class=`"k`">$k<i aria-hidden=`"true`"></i></span><h3>$h</h3><p>$p</p><span class=`"go`">$go &rarr;</span></a>"
}
function Footer([string]$here) {
@"
<footer id="network">
  <div class="wrap foot">
    <div>
      <a class="brand" href="#top" aria-label="Back to top">$mark<span class="brand-word">Inner Banks <small>Exchange &middot; North Carolina</small></span></a>
      <p>A shop, a community board and a help-wanted list for North Carolina's Inner Banks.</p>
    </div>
    <div>
      <h4>Explore</h4>
      <ul>
        <li><a href="$SHOP">IBX Shop</a></li>
        <li><a href="$CONNECT">Community Board</a></li>
        <li><a href="${CONNECT}?tab=resources">Local resources</a></li>
        <li><a href="$HELP">Help Wanted &amp; Services</a></li>
        <li><a href="${CONNECT}about.html">About &amp; contact</a></li>
      </ul>
    </div>
    <div>
      <h4>Network</h4>
      <ul>
        <li><a href="https://seeyouryou.web.app" target="_blank" rel="noopener">S.E.E. Engine</a></li>
        <li><span class="soon">Household Knowledge Bank (coming soon)</span></li>
        <li><a href="https://movebyphilc.netlify.app" target="_blank" rel="noopener">Route | Philc</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap legal">
    <span>&copy; 2026 Inner Banks Exchange. Direct local inventory network.</span>
    <span>Powered by Firebase &amp; Stripe</span>
  </div>
</footer>
"@
}

$template = @'
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>@@TITLE@@</title>
<meta name="description" content="@@DESC@@">
<meta property="og:title" content="@@TITLE@@">
<meta property="og:description" content="@@DESC@@">
<meta property="og:type" content="website">
<meta name="theme-color" content="#0b171b">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
<style>@@CSS@@</style>
</head>
<body>

@@NETWORK@@

<div class="masthead">
  <div class="wrap">
    <a class="brand" href="#top" aria-label="Inner Banks Exchange home">
      @@MARK@@
      <span class="brand-word">Inner Banks <small>Exchange &middot; North Carolina</small></span>
    </a>
    <nav class="nav" aria-label="Primary">
      @@NAV@@
    </nav>
  </div>
</div>

<main id="top">
  <section class="hero">
    <div class="wrap" style="@@HEROSTYLE@@">
      <div>
        <div class="eyebrow">@@EYEBROW@@</div>
        <h1>@@H1@@</h1>
        <p class="hero-sub">@@SUB@@</p>
        <div class="hero-cta">
          <a class="btn" href="#board">@@CTA1@@</a>
          <a class="btn ghost" href="@@CTA2HREF@@">@@CTA2@@</a>
        </div>
      </div>
@@ASIDE@@
    </div>
    <svg class="tideline" viewBox="0 0 1200 38" preserveAspectRatio="none" aria-hidden="true"><path d="M0 38V20c100-24 200-24 300 0s200 24 300 0 200-24 300 0 200 24 300 0v18z" fill="currentColor"/></svg>
  </section>

  <section class="tiles" aria-label="Where to go">
    <div class="wrap">
      @@TILES@@
    </div>
  </section>

  <section class="board-sec" id="board" aria-labelledby="boardHeading">
    <div class="wrap">
      <div class="board-top">
        <div>
          <h2 id="boardHeading">@@BH@@</h2>
          <p>@@BP@@</p>
        </div>
        <div class="board-tools">
          <input type="search" id="boardSearch" placeholder="Search the board" aria-label="Search the board" maxlength="60" autocomplete="off">
          <select id="countyFilter" aria-label="Show listings for"></select>
        </div>
      </div>

      <details class="formbox"@@FORMOPEN@@>
        <summary>@@FORMTITLE@@</summary>
        <form id="postForm">
          <select id="county" required aria-label="County or area"></select>
          <select id="category" required aria-label="Type of post">
@@FORMOPTS@@
          </select>
          <input id="title" placeholder="Title" maxlength="100" required>
          <textarea id="description" placeholder="Details (what, where, when, pay, ages...)" maxlength="1000" required></textarea>
          <input id="contact" placeholder="How to reach you (phone, email, or address)" maxlength="150" required>
          <input id="website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
          <p class="msg">Inner Banks listings only (nearby Suffolk or Hampton Roads posts are accepted only if they serve Inner Banks residents). Please keep it kind and local. Don't post private details about other people, especially children. Posts are reviewed, but listings aren't endorsements by Inner Banks Exchange.</p>
          <button class="go" type="submit">Send for review</button>
          <div class="msg" id="formMsg"></div>
        </form>
      </details>

      <div class="tabs" id="tabs" role="group" aria-label="Filter by category"></div>
      <div class="board" id="list"><div class="empty">Loading...</div></div>
      <p class="fine">New posts and comments are reviewed before they appear. Local resource info was compiled in October 2026 from public sources. Phone numbers, hours and dates can change, so call ahead or check the link.</p>
    </div>
  </section>
</main>

@@FOOTER@@

<script>
@@JS@@
</script>
</body>
</html>
'@

$commonJs = @'

  /* ---- Tile search: type a need, get pointed to the right place ---- */
  (function () {
    const SITES = { board: 'https://ibxconnect.web.app/', help: 'https://ibxhelp.web.app/', shop: 'https://ibxshop.web.app/' };
    const SCOPE_CATS = { board: ['resources', 'events', 'kids', 'requests', 'spotlight'], help: ['jobs', 'services'] };
    const HERE = CONFIG.here;
    let inventory = [];
    try {
      db.collection('inventoryItems').where('sold', '==', false).get().then(s => {
        inventory = s.docs.map(d => {
          const x = d.data();
          return { inv: true, title: x.brand || 'Item', description: [x.category, x.size && ('Size ' + x.size)].filter(Boolean).join(', ') };
        });
      }).catch(() => {});
    } catch (e) {}

    function pool(scope) {
      if (scope === 'shop') return inventory;
      const cats = SCOPE_CATS[scope] || [];
      return [...spotlights, ...STATIC, ...posts].filter(p => cats.includes(p.category));
    }
    function find(scope, q) {
      const g = qGroups(q);
      if (!g.length) return [];
      const need = qNeed(g.length);
      return pool(scope).map(p => ({ p, s: qScore(g, hayOf(p)) })).filter(x => x.s >= need).sort((a, b) => b.s - a.s).map(x => x.p);
    }
    function go(scope, q) {
      if (scope === HERE) {
        boardQuery = q;
        const bs = document.getElementById('boardSearch'); if (bs) bs.value = q;
        current = 'all'; renderTabs(); render();
        document.getElementById('board').scrollIntoView({ behavior: 'smooth' });
      } else {
        location.href = SITES[scope] + (q ? '?q=' + encodeURIComponent(q) : '');
      }
    }
    document.querySelectorAll('.tile[data-scope]').forEach(tile => {
      const scope = tile.dataset.scope;
      const form = tile.querySelector('form'), input = form.querySelector('input'), box = form.querySelector('.tresults');
      const close = () => { box.hidden = true; box.textContent = ''; };
      const row = (child) => { const l = document.createElement('li'); l.appendChild(child); box.appendChild(l); };
      function show() {
        const q = input.value.trim();
        box.textContent = '';
        if (!q) { box.hidden = true; return; }
        const hits = find(scope, q);
        hits.slice(0, 4).forEach(p => {
          const a = document.createElement('a'); a.href = '#';
          const tag = document.createElement('span'); tag.className = 'rt';
          tag.textContent = p.inv ? 'In the shop' : (LABELS[p.category] || p.category) + (p.county && p.county !== 'Region-wide' ? ' / ' + p.county : '');
          a.append(tag, document.createTextNode(p.title));
          if (p.url && !p.inv) { a.href = p.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
          else a.onclick = (e) => { e.preventDefault(); go(scope, p.title); close(); };
          row(a);
        });
        const all = document.createElement('a'); all.href = '#'; all.className = 'all';
        all.textContent = hits.length ? 'See all ' + hits.length + ' match' + (hits.length === 1 ? '' : 'es') + ' \u2192' : 'No exact matches. Search everywhere \u2192';
        all.onclick = (e) => { e.preventDefault(); go(scope, q); close(); };
        row(all);
        box.hidden = false;
      }
      input.addEventListener('input', show);
      form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value.trim(); if (q) { go(scope, q); close(); } });
      input.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    });
    const closeOutside = (e) => document.querySelectorAll('.tresults').forEach(b => { if (!b.parentElement.contains(e.target)) { b.hidden = true; } });
    ['pointerdown', 'click', 'focusin'].forEach(ev => document.addEventListener(ev, closeOutside));
  })();

  /* ---- board search box, and ?q= links coming from the other sites ---- */
  (function () {
    const bs = document.getElementById('boardSearch');
    if (bs) bs.addEventListener('input', (e) => { boardQuery = e.target.value.trim(); render(); });
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q || params.get('tab')) setTimeout(() => document.getElementById('board').scrollIntoView(), 400);
    if (!q) return;
    boardQuery = q.slice(0, 60);
    if (bs) bs.value = boardQuery;
    current = 'all'; renderTabs(); render();
  })();
'@

function Build($cfg, $outPath) {
  $h = $template
  $h = $h.Replace('@@CSS@@', $css + $boardCss + $cfg.extraCss)
  $h = $h.Replace('@@NETWORK@@', (NetworkBar)).Replace('@@MARK@@', $mark)
  $h = $h.Replace('@@NAV@@', (Nav $cfg.active))
  $h = $h.Replace('@@TITLE@@', $cfg.title).Replace('@@DESC@@', $cfg.desc)
  $h = $h.Replace('@@EYEBROW@@', $cfg.eyebrow).Replace('@@H1@@', $cfg.h1).Replace('@@SUB@@', $cfg.sub)
  $h = $h.Replace('@@CTA1@@', $cfg.cta1).Replace('@@CTA2@@', $cfg.cta2).Replace('@@CTA2HREF@@', $cfg.cta2href)
  $h = $h.Replace('@@TILES@@', ($cfg.tiles -join "`n      "))
  $h = $h.Replace('@@FORMOPEN@@', [string]$cfg.formopen).Replace('@@BH@@', $cfg.bh).Replace('@@BP@@', $cfg.bp).Replace('@@FORMTITLE@@', $cfg.formtitle)
  $h = $h.Replace('@@FORMOPTS@@', (($cfg.form | ForEach-Object { "            <option value=`"$($_[0])`">$($_[1])</option>" }) -join "`n"))
  $h = $h.Replace('@@FOOTER@@', (Footer $cfg.active))
  $tabsJson = '{here:''' + $cfg.here + ''',tabs:[' + (($cfg.tabs | ForEach-Object { "'$_'" }) -join ',') + ']}'
  $heroStyle = if ($null -ne $cfg.herostyle) { $cfg.herostyle } else { 'grid-template-columns:minmax(0,1fr)' }
  $h = $h.Replace('@@HEROSTYLE@@', $heroStyle).Replace('@@ASIDE@@', [string]$cfg.aside)
  $h = $h.Replace('@@JS@@', $js.Replace('@@CFG@@', $tabsJson) + [string]$cfg.extraJs + $commonJs)
  [IO.File]::WriteAllText($outPath, $h, $u8)
  "built $outPath ($($h.Length) chars)"
}

# --- IBX Connect: the community page ------------------------------------
Build @{
  active='connect'; title='IBX Connect'; desc="Your source for community info on North Carolina's Inner Banks: local resources, events, youth programs and neighbors helping neighbors."
  eyebrow="North Carolina's Inner Banks"; h1='Your Source for<br><em>Community</em><br>Info'
  sub='What''s happening, who''s hiring and where to find help, all posted by your Inner Banks neighbors.'
  cta1='Open the board'; cta2='Visit the shop'; cta2href=$SHOP
  here='board'
  tiles=@((SearchTile 'board' 'Board' 'Community Board' 'Events, youth programs and local resources.' 'Try: food assistance, town hall' '#board'),
          (SearchTile 'help' 'Help' 'Help Wanted' 'Jobs and services offered by neighbors.' 'Try: part-time, babysitter' $HELP),
          (SearchTile 'shop' 'Shop' 'The Shop' 'Browse what is available now, at flat prices.' 'Try: lamp, jacket, size L' $SHOP))
  bh='The board'; bp='Pinned by neighbors and reviewed before they appear. Pick a tab, or add your own post.'
  formtitle='Post to the board'
  form=@(@('requests','Neighbors Asking (request / suggestion)'), @('events','Local Event'), @('kids','Kids &amp; Youth Program'))
  tabs=@('spotlight','resources','requests','events','kids')
  herostyle=''
  aside=@'
      <aside class="ledger live" aria-label="Today on the Inner Banks">
        <div class="ledger-head"><span>Today on the Inner Banks</span> <span id="ledgerDate">Today</span></div>
        <div class="ledger-body">
          <div class="lrow"><span class="lab">Latest on the board</span><div class="tick" id="tick"><div class="tick-track" id="tickTrack"></div></div></div>
          <div class="lrow"><span class="lab">Weather &middot; Edenton</span><div class="val wrap" id="wxVal">Loading the forecast...</div></div>
          <div class="lrow"><span class="lab">Announcements</span><div class="val" id="noteVal">No announcements right now.</div></div>
          <div class="gauge" aria-hidden="true">
            <svg viewBox="0 0 400 54" preserveAspectRatio="none">
              <path d="M0 26c25-14 50-14 75 0s50 14 75 0 50-14 75 0 50 14 75 0 50-14 75 0 50 14 75 0 50-14 75 0 50 14 75 0V54H0z" fill="var(--sea)" opacity=".28"/>
              <path d="M0 34c25-12 50-12 75 0s50 12 75 0 50-12 75 0 50 12 75 0 50-12 75 0 50 12 75 0 50-12 75 0 50 12 75 0V54H0z" fill="var(--sea)"/>
            </svg>
          </div>
        </div>
      </aside>
'@
  extraJs=@'

  /* ---- Today panel: board ticker, weather, announcements ---- */
  (function () {
    const $id = (x) => document.getElementById(x);
    const dEl = $id('ledgerDate');
    if (dEl) dEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let tickSig = '', noteSig = '', noteTimer = null, noteIdx = 0;

    function buildTicker() {
      const live = posts.filter(p => ALLOWED.has(p.category)).slice(0, 6);
      const fixed = STATIC.filter(s => s.category === 'events' && ALLOWED.has(s.category)).slice(0, 3);
      const items = [...live, ...fixed].map(p => ({ tag: LABELS[p.category] || p.category, text: p.title }));
      const sig = JSON.stringify(items);
      if (sig === tickSig) return;
      tickSig = sig;
      const track = $id('tickTrack');
      track.textContent = '';
      if (!items.length) { track.style.animation = 'none'; track.textContent = 'Nothing new on the board yet.'; return; }
      track.style.animation = '';
      const group = () => {
        const g = document.createElement('span'); g.className = 'tick-group';
        items.forEach(it => {
          const a = document.createElement('a'); a.href = '#board'; a.className = 'ti';
          const b = document.createElement('b'); b.textContent = it.tag;
          a.append(b, document.createTextNode(it.text));
          g.appendChild(a);
        });
        return g;
      };
      track.append(group(), group());
      const chars = items.reduce((n, it) => n + it.tag.length + it.text.length + 2, 0);
      track.style.setProperty('--dur', Math.max(25, chars * 0.22) + 's');
    }

    function buildNotes() {
      const list = spotlights.map(s => ({ t: s.title || '', b: s.body || s.description || '' })).filter(x => x.t);
      const sig = JSON.stringify(list);
      if (sig === noteSig) return;
      noteSig = sig; noteIdx = 0;
      clearInterval(noteTimer);
      const el = $id('noteVal');
      if (!list.length) { el.textContent = 'No announcements right now.'; return; }
      const show = () => { const n = list[noteIdx % list.length]; el.textContent = n.t + (n.b ? ': ' + n.b : ''); noteIdx++; };
      show();
      if (list.length > 1) noteTimer = setInterval(show, 7000);
    }

    async function loadWeather() {
      const el = $id('wxVal');
      try {
        const r = await fetch('https://api.weather.gov/gridpoints/AKQ/84,15/forecast');
        if (!r.ok) throw new Error('forecast ' + r.status);
        const p = (await r.json()).properties.periods;
        const fmt = (x) => x.name + ': ' + x.temperature + '\u00B0' + x.temperatureUnit + ', ' + x.shortForecast;
        el.textContent = fmt(p[0]) + '. ' + fmt(p[1]) + '.';
      } catch (e) { el.textContent = 'The forecast is unavailable right now.'; return; }
      try {
        const a = await fetch('https://api.weather.gov/alerts/active?point=36.0577,-76.6061');
        const f = (await a.json()).features || [];
        if (f.length) {
          const s = document.createElement('strong'); s.className = 'alert';
          s.textContent = 'Alert: ' + f[0].properties.event + '. ';
          el.prepend(s);
        }
      } catch (e) {}
    }

    const baseRender = render;
    render = function () { baseRender(); buildTicker(); buildNotes(); };
    buildTicker(); buildNotes(); loadWeather();
  })();
'@
  extraCss=@'

/* ---------- Marsh palette: blackwater, straw, golden-hour sun (Albemarle shoreline) ---------- */
:root[data-theme="dark"] {
  --paper: #12150e; --paper-2: #1a1f14; --card: #20271a; --line: #323a26;
  --ink: #f3eedb; --ink-2: #b9bc9f; --sea: #8fbfb6;
  --marker: #f2b632; --marker-ink: #231a05;
  --manila: #dcc98c; --manila-ink: #3a2e0e;
  --flaw-bg: #33250f; --flaw-ink: #f2cf8a;
}
.hero { background: radial-gradient(70% 90% at 88% 100%, rgba(242,182,50,.16), transparent 70%); }

/* ---------- Today panel (ticker / weather / announcements) ---------- */
.ledger.live .ledger-body { padding-top: 4px; }
.lrow { display: flex; flex-direction: column; gap: 7px; padding: 14px 0; border-bottom: 1px dashed var(--line); min-width: 0; }
.lrow .lab { font: 500 11px/1 var(--f-mono); letter-spacing: .16em; text-transform: uppercase; color: var(--sea); }
.lrow .val { font: 600 15px/1.35 var(--f-body); color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lrow .val.wrap { white-space: normal; overflow: visible; }
.lrow .alert { color: var(--marker); }
.tick { overflow: hidden; white-space: nowrap; -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
.tick-track { display: inline-flex; white-space: nowrap; font: 600 15px/1.35 var(--f-body); animation: marquee var(--dur, 40s) linear infinite; }
.tick:hover .tick-track, .tick:focus-within .tick-track { animation-play-state: paused; }
.tick-group { display: inline-flex; flex: none; }
.ti { color: var(--ink); text-decoration: none; margin-right: 38px; }
.ti:hover { color: var(--marker); }
.ti b { font: 500 11px var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--marker); margin-right: 8px; }
.ledger.live .gauge { margin-top: 0; }
@media (prefers-reduced-motion: reduce) { .tick { overflow-x: auto; } .tick-track { animation: none; } }
'@
} "$r\connect\index.html"

# --- IBX Help: help wanted / services offered ---------------------------
New-Item -ItemType Directory -Force "$r\help" | Out-Null
Build @{
  active='help'; title='IBX Help'; desc="Help wanted and services offered across North Carolina's Inner Banks."
  eyebrow='Help Wanted &middot; Services Offered'; h1='Help Wanted.<br><em>Services</em><br>Offered.'
  sub="Local jobs and neighbors offering their skills across North Carolina's Inner Banks. Post what you need, or what you can do."
  cta1='See the list'; cta2='Community Board'; cta2href=$CONNECT
  here='help'
  tiles=@((SearchTile 'help' 'Help' 'Help Wanted' 'Jobs and work close to home.' 'Try: part-time, babysitter' '#board'),
          (SearchTile 'board' 'Board' 'Community Board' 'Events, youth programs and local resources.' 'Try: food assistance, town hall' $CONNECT),
          (SearchTile 'shop' 'Shop' 'The Shop' 'Browse what is available now, at flat prices.' 'Try: lamp, jacket, size L' $SHOP))
  bh='Help wanted &amp; services offered'; bp='Listings are reviewed before they appear. Filter by county, or post your own.'
  formtitle='Post help wanted or a service'
  formopen=' open'
  form=@(@('jobs','Help Wanted'), @('services','Service Offered'))
  tabs=@('jobs','services')
} "$r\help\index.html"

# --- About, contact and policies (one page, linked from every footer) ---
$builtConnect = [IO.File]::ReadAllText("$r\connect\index.html")
$aboutCss = [regex]::Match($builtConnect, '(?s)<style>(.*?)</style>').Groups[1].Value
$aboutTemplate = @'
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>About and Contact | Inner Banks Exchange</title>
<meta name="description" content="What Inner Banks Exchange is, how to contact us, how the board is moderated, and how we handle your information.">
<meta name="theme-color" content="#12150e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>@@CSS@@
.about { max-width: 72ch; }
.about h2 { font: 900 clamp(30px, 5vw, 44px)/.95 var(--f-display); text-transform: uppercase; margin: 44px 0 14px; }
.about h2:first-child { margin-top: 0; }
.about p, .about li { font-size: 16.5px; line-height: 1.65; color: var(--ink); }
.about p + p { margin-top: 12px; }
.about ul { padding-left: 22px; display: grid; gap: 8px; margin-top: 10px; }
.about a { color: var(--marker); font-weight: 600; }
.about .mail { font: 600 clamp(18px, 3.5vw, 24px) var(--f-mono); word-break: break-all; }
.about .stamp { margin-top: 44px; padding-top: 16px; border-top: 1.5px dashed var(--line); font: 500 12px var(--f-mono); letter-spacing: .06em; color: var(--ink-2); }
</style>
</head>
<body>

@@NETWORK@@

<div class="masthead">
  <div class="wrap">
    <a class="brand" href="https://ibxconnect.web.app/" aria-label="Inner Banks Exchange home">
      @@MARK@@
      <span class="brand-word">Inner Banks <small>Exchange &middot; North Carolina</small></span>
    </a>
    <nav class="nav" aria-label="Primary">
      @@NAV@@
    </nav>
  </div>
</div>

<main id="top">
  <section class="hero" style="padding-bottom:0">
    <div class="wrap" style="grid-template-columns:minmax(0,1fr);padding-bottom:40px">
      <div>
        <div class="eyebrow">About &middot; Contact &middot; Policies</div>
        <h1 style="font-size:clamp(44px,8vw,104px)">About<br><em>IBX</em></h1>
        <p class="hero-sub">Inner Banks Exchange is a small local project for North Carolina's Inner Banks: a community board, a help-wanted and services list, and a shop with flat prices.</p>
      </div>
    </div>
  </section>

  <section class="board-sec" style="padding-top:56px">
    <div class="wrap">
      <article class="about">
        <h2>What this is</h2>
        <ul>
          <li><strong>IBX Connect</strong> is the community board: events, youth programs, local resources and neighbors helping neighbors.</li>
          <li><strong>IBX Help</strong> is the list of help wanted and services offered.</li>
          <li><strong>IBX Shop</strong> sells secondhand and local goods. Each item is one of a kind, graded and priced flat.</li>
        </ul>

        <h2>Contact</h2>
        <p>Questions, corrections, or a request to remove a post or item:</p>
        <p class="mail"><a href="mailto:opsteadyhome@outlook.com">opsteadyhome@outlook.com</a></p>
        <p>Please include a link to the post or item you mean. We read every message and reply as soon as we can.</p>

        <h2>How the board is moderated</h2>
        <ul>
          <li>New posts and comments are reviewed before they appear.</li>
          <li>Listings are for the Inner Banks. Posts from nearby Suffolk or Hampton Roads appear only when they serve Inner Banks residents.</li>
          <li>We remove posts that harass or threaten people, are scams or spam, offer anything illegal, or share private details about other people, especially children.</li>
          <li>Anyone can use <strong>Report</strong> on a post. We look at every report and remove posts that break these rules.</li>
          <li>Posts are hidden automatically after 60 days.</li>
          <li>A listing is not an endorsement. Check details yourself before you rely on a post, and call ahead about hours and dates.</li>
        </ul>

        <h2>Privacy</h2>
        <p>There are no accounts, no ads, and no analytics or tracking tools on these sites. Here is what we do keep:</p>
        <ul>
          <li><strong>Posts.</strong> The county, type, title, details and contact information you type. Once a post is approved it is public, so leave out anything private. If we reject a post, we delete it.</li>
          <li><strong>Comments.</strong> An optional name and your comment. Public once approved.</li>
          <li><strong>Reports.</strong> A short note, used only to review the post.</li>
          <li><strong>Your browser.</strong> It remembers the time of your last post, on your device only, to space out posts.</li>
          <li><strong>Shop payments.</strong> Checkout is handled by Stripe. We never see or store your card number. Stripe's own privacy policy covers what you enter there.</li>
          <li><strong>Where it lives.</strong> The sites and the database run on Google Firebase. Fonts load from Google Fonts, and the weather comes from the National Weather Service.</li>
        </ul>
        <p>To have a post, comment or item removed, email the address above.</p>

        <p class="stamp">Last updated November 1, 2026. This is a plain-language description of how the sites work today, and it will change if they do.</p>
      </article>
    </div>
  </section>
</main>

@@FOOTER@@

</body>
</html>
'@
$about = $aboutTemplate.Replace('@@CSS@@', $aboutCss).Replace('@@NETWORK@@', (NetworkBar)).Replace('@@MARK@@', $mark).Replace('@@NAV@@', (Nav 'none')).Replace('@@FOOTER@@', (Footer 'about'))
[IO.File]::WriteAllText("$r\connect\about.html", $about, $u8)
"built connect/about.html ($($about.Length) chars)"

# --- old links to /community.html keep working on ibxconnect ------------
$redirect = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>IBX Connect</title><meta name="viewport" content="width=device-width, initial-scale=1"><script>location.replace("/" + location.search + (location.hash || "#board"));</script><meta http-equiv="refresh" content="0; url=/"></head><body><a href="/">Continue to IBX Connect</a></body></html>'
[IO.File]::WriteAllText("$r\connect\community.html", $redirect, $u8)

# --- IBX Shop: relink the shop page to the three sites -------------------
function SpliceRange([string]$text, [int]$from, [int]$to, [string]$with) {
  if ($from -lt 0 -or $to -le $from) { throw "bad splice range $from..$to" }
  return $text.Substring(0, $from) + $with + $text.Substring($to)
}
$s = [IO.File]::ReadAllText("$r\shop\index.html")
if ($s.Length -lt 20000) { throw 'shop/index.html looks wrong; aborting before overwrite' }
$s = $s.Replace('https://ibxconnect.web.app/community.html?tab=resources', "${CONNECT}?tab=resources").Replace('https://ibxconnect.web.app/community.html', $CONNECT)
# nav: third link becomes Help Wanted
$navAt = $s.IndexOf('<nav class="nav"'); $fh = $s.IndexOf('Find Help</a>', $navAt)
$navEnd = $s.IndexOf('</nav>', $navAt)
if ($fh -ge 0 -and $fh -lt $navEnd) {
$aStart = $s.LastIndexOf('<a href=', $fh)
$s = SpliceRange $s $aStart ($fh + '</a>'.Length + 'Find Help'.Length - 'Find Help'.Length) "<a href=`"$HELP`">Help Wanted</a>"
}
# tiles: third tile points at the help site
$tAt = $s.IndexOf("<a class=`"tile`" href=`"${CONNECT}?tab=resources`">")
if ($tAt -ge 0) { $tEnd = $s.IndexOf('</a>', $tAt) + 4; $s = SpliceRange $s $tAt $tEnd (Tile 'Help' 'Help Wanted' 'Jobs and services offered by neighbors.' 'See the list' $HELP) }
$s = $s.Replace('<li><a href="#">Household Knowledge Bank</a></li>', '<li><span class="soon">Household Knowledge Bank (coming soon)</span></li>').Replace('<li><a href="#">Route | Philc</a></li>', '<li><a href="https://movebyphilc.netlify.app" target="_blank" rel="noopener">Route | Philc</a></li>')
$s = $s.Replace('<li><a href="https://ibxshop.pages.dev" target="_blank" rel="noopener">IBX Shop</a></li>', "<li><a href=`"$HELP`">Help Wanted &amp; Services</a></li>")
$s = $s.Replace('Inner Banks<small>', 'Inner Banks <small>').Replace('<span>Dock ledger</span><span id="ledgerDate">', '<span>Shop at a glance</span> <span id="ledgerDate">').Replace('<span>High tide: stocked</span>', '<span>In stock now</span>').Replace('aria-label="Dock ledger"', 'aria-label="Shop at a glance"')
if (-not $s.Contains('about.html')) { $s = $s.Replace('<li><a href="' + $HELP + '">Help Wanted &amp; Services</a></li>', '<li><a href="' + $HELP + '">Help Wanted &amp; Services</a></li>' + [char]10 + '        <li><a href="' + $CONNECT + 'about.html">About &amp; contact</a></li>') }
$s = $s.Replace('<title>Inner Banks Exchange</title>', '<title>IBX Shop</title>').Replace('<meta property="og:title" content="Inner Banks Exchange">', '<meta property="og:title" content="IBX Shop">')
$nAt = $s.IndexOf('<header class="network"'); $nEnd = $s.IndexOf('</header>', $nAt) + '</header>'.Length
$s = SpliceRange $s $nAt $nEnd (NetworkBar)
if (-not $s.Contains('.foot .soon')) { $s = $s.Replace('</style>', '.foot .soon { color: var(--ink-2); font-size: 14px; }' + [char]10 + '</style>') }
# ?q= from the tile searches on the other sites pre-fills the shop search
if (-not $s.Contains("get('q')")) {
  $anchor = '$("#searchInput").addEventListener("input", render);'
  if ($s.Contains($anchor)) { $s = $s.Replace($anchor, $anchor + "`n{ const qp = new URLSearchParams(location.search).get('q'); if (qp) `$(`"#searchInput`").value = qp.slice(0, 60); }") }
}
[IO.File]::WriteAllText("$r\shop\index.html", $s, $u8)
"relinked shop/index.html ($($s.Length) chars)"
