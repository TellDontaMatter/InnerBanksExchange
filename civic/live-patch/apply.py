#!/usr/bin/env python3
"""Apply the civic panel (search on top + fading pages) to a copy of the LIVE goibx.com index.html.

  curl -s https://goibx.com -o live-index.html
  python3 civic/live-patch/apply.py live-index.html index.html

Reads panel.css and panel.js.html next to this script. Idempotent guard: refuses if already applied.
Only touches the "Today on the Inner Banks" panel; everything else in the page is left as-is.
"""
import re, sys, pathlib
here = pathlib.Path(__file__).parent
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
if 'id="csForm"' in s: sys.exit('already applied')
css = (here / 'panel.css').read_text()
js = (here / 'panel.js.html').read_text()

m = re.search(r'(      <aside class="ledger live" aria-label="Today on the Inner Banks">\n)(        <div class="ledger-head">.*?</div>\n)(        <div class="ledger-body">\n)(.*?)(        </div>\n      </aside>)', s, re.S)
if not m: sys.exit('panel markup not found: the live page changed shape, adjust apply.py')
open_aside, head, open_body, rows, close = m.groups()
form = '''        <form class="topsearch" id="csForm" role="search" aria-label="Ask the Inner Banks">
          <div class="cap"><span>Ask the Inner Banks</span><span>Automated &middot; sources shown</span></div>
          <input type="text" name="q" id="csQ" placeholder="Ask about a local claim or issue" aria-label="Ask about this, or type your own question" maxlength="300" required>
          <button class="go" type="submit">Search</button>
          <input type="hidden" name="r" value="inner-banks">
          <div class="types"><label><input type="radio" name="type" value="claim" checked> Check a claim</label><label><input type="radio" name="type" value="spend"> Look up spending</label></div>
        </form>
'''
indented = ''.join('    ' + ln if ln.strip() else ln for ln in rows.splitlines(True))
body = f'''{open_body}          <div class="slides" id="slides">
            <div class="slide is-on" data-slide="today" aria-label="Today">
{indented}            </div>
            <div class="slide cv" data-slide="civic" aria-label="Civic ticker">
              <div class="lrow"><span class="lab">Civic ticker &middot; Inner Banks</span><div id="cvList"></div></div>
            </div>
          </div>
          <div class="slide-ctl"><div class="dots" id="slideDots" role="group" aria-label="Panel pages"></div><button class="pp" id="slidePP" type="button" aria-pressed="false">Pause</button></div>
'''
s = s[:m.start()] + open_aside + form + head + body + close + s[m.end():]
assert s.count('</head>') == 1 and s.count('</body>') == 1
s = s.replace('</head>', '<style>\n' + css + '</style>\n</head>')
s = s.replace('</body>', js + '</body>')
open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
