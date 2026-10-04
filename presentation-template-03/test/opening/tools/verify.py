"""P2 opening verification: parity, static depth, reduced-motion selection, failure fallback."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
results = []


def ok(name, cond):
    results.append((name, bool(cond)))
    if not cond:
        raise AssertionError(name)


def launch_kwargs():
    kw = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-background-networking'])
    if CHROME.exists():
        kw['executable_path'] = str(CHROME)
    return kw


def url(kind, query):
    return (ROOT / kind / 'index.html').as_uri() + query


with sync_playwright() as p:
    browser = p.chromium.launch(**launch_kwargs())
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    for kind in ['dom', 'three']:
        # contents static depth: nearest chapter scale must exceed farthest
        page.goto(url(kind, '?p=1&reduced=1'))
        page.wait_for_selector('#stage[data-ready="true"]')
        frame = page.evaluate('window.OPENING_LAYOUT(1, 0)')
        zh = sorted([it['s'] for it in frame['items'] if it['role'] == 'zh'], reverse=True)
        ok(kind + ' contents has depth', len(zh) == 4 and zh[0] > zh[-1] * 1.6)

        # reduced motion still selects chapters
        page.keyboard.press('ArrowRight')
        page.keyboard.press('ArrowRight')
        ok(kind + ' reduced motion selects chapters', page.evaluate('window.OPENING.getState().selected') == 2)

        # render failure keeps the cover and offers a static fallback
        page.goto(url(kind, '?p=0&reduced=1'))
        page.wait_for_selector('#stage[data-ready="true"]')
        page.evaluate('''() => {
          window.OPENER.render = () => { throw new Error('forced'); };
          try { window.OPENING.setProgress(0.001); } catch (error) { /* driver already reads failed */ }
        }''')
        page.wait_for_timeout(160)
        ok(kind + ' render failure detected', page.evaluate('window.OPENING.getState().failed') is True)
        ok(kind + ' static fallback shown', page.evaluate("!document.getElementById('fallback').hidden"))

    # DOM renderer must place its boxes exactly where the shared projection says
    page.goto(url('dom', '?p=1&reduced=1'))
    page.wait_for_selector('#stage[data-ready="true"]')
    rendered = page.evaluate('''() => {
      const el = [...document.querySelectorAll('#world .wp')].find(e => e.textContent === '问题');
      const r = el.getBoundingClientRect();
      const s = document.getElementById('stage').getBoundingClientRect();
      const scale = s.width / 1920;
      return { x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height / 2 - s.top) / scale };
    }''')
    expected = page.evaluate('''() => {
      const it = window.OPENING_LAYOUT(1, 0).items.find(i => i.role === 'zh' && i.text === '问题');
      return { sx: it.sx, sy: it.sy };
    }''')
    ok('DOM renderer matches shared projection', abs(rendered['x'] - expected['sx']) < 1.5 and abs(rendered['y'] - expected['sy']) < 1.5)
    ok('no page errors', not errors)
    browser.close()

for name, passed in results:
    print(('PASS ' if passed else 'FAIL ') + name)
print('total:', len(results))
