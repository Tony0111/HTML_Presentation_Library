"""Reading print variations and particle closing lifecycle/visual checks."""
from pathlib import Path
from tempfile import gettempdir
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-reading-thanks'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
checks, errors, console_errors, remote = [], [], [], []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


def canvas_pixels(page):
    return page.evaluate('''() => {
      const stage = document.getElementById('stage');
      SpatialStage.resize(stage.clientWidth, stage.clientHeight, innerWidth / stage.clientWidth);
      const canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 270;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(document.querySelector('#spatial canvas'), 0, 0, 480, 270);
      return Array.from(ctx.getImageData(0, 0, 480, 270).data);
    }''')


with sync_playwright() as p:
    options = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('http://**/*', lambda r: r.abort())
    context.route('https://**/*', lambda r: r.abort())
    context.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)

    def load(reduced=False):
        page.goto((ROOT / 'index.html').as_uri() + '?debug=1' + ('&reduced=1' if reduced else ''))
        page.wait_for_selector('#stage[data-ready="true"]')
        page.wait_for_function('!PRESENTATION.state.busy')

    def go(index):
        page.evaluate('i => PRESENTATION.goto(i)', index)
        page.wait_for_function('!PRESENTATION.state.busy')

    def key(value):
        page.keyboard.press(value)
        page.wait_for_function('!PRESENTATION.state.busy')

    load(True)
    final = page.evaluate('PRESENTATION.config.slides.length - 1')
    types = page.evaluate('''() => [...new Set(PRESENTATION.config.slides.slice(2, -1).map(s => s.type))]
      .map(type => ({type, index:PRESENTATION.config.slides.findIndex(s => s.type === type)}))''')
    signatures = set()
    for w, h in [(1600, 900), (2560, 1080), (390, 844), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        for slide in types:
            go(slide['index'])
            ok(f'{slide["type"]} print marks stay in margins at {w}x{h}', page.evaluate('''() => {
              const slide = document.getElementById('slide');
              const rect = slide.getBoundingClientRect();
              const body = [...slide.children].filter(el => !el.matches('.reading-print'));
              return [...document.querySelectorAll('.reading-print i')].every(el => {
                if (!el.checkVisibility()) return true;
                const a = el.getBoundingClientRect();
                return a.left >= rect.left && a.right <= rect.right && a.top >= rect.top && a.bottom <= rect.bottom &&
                  body.every(b => { const r = b.getBoundingClientRect();
                    return a.right <= r.left || a.left >= r.right || a.bottom <= r.top || a.top >= r.bottom;
                  });
              });
            }'''))
            if w == 1600:
                signatures.add(page.evaluate('''() => [...document.querySelectorAll('.reading-print i')]
                  .map(el => {const s=getComputedStyle(el);return [s.left,s.top,s.width,s.height,s.display].join(',');}).join('|')'''))
                page.screenshot(path=str(OUT / f'reading-{slide["type"]}.png'))
        go(final)
        pixels = canvas_pixels(page)
        visible = sum(1 for i in range(0, len(pixels), 4) if pixels[i + 3] > 80 and pixels[i] > pixels[i + 1] * 1.2)
        ok(f'Thanks is nonblank brick particle typography at {w}x{h}', visible > 150)
        ok(f'Thanks has only its title and spatial canvas at {w}x{h}', page.evaluate('''() => {
          const stage=document.getElementById('stage');
          return stage.dataset.thanks === 'true' && document.getElementById('slide').hidden &&
            document.getElementById('editorial-opening').hidden && document.getElementById('particle-thanks').textContent === 'Thanks';
        }'''))
        ok(f'Thanks is framed inside the viewport at {w}x{h}', not any(pixels[(y * 480 + x) * 4 + 3] > 80
           for y in range(270) for x in range(480) if x < 12 or x > 467 or y < 12 or y > 257))
        first = pixels
        page.mouse.move(w * .65, h * .5)
        page.mouse.click(w * .65, h * .5)
        page.wait_for_timeout(300)
        ok(f'reduced motion keeps Thanks still at {w}x{h}', first == canvas_pixels(page))
        page.evaluate("document.body.classList.remove('show-controls')")
        page.screenshot(path=str(OUT / f'thanks-{w}x{h}.png'))
    ok('reading page families have distinct print layouts', len(signatures) >= 5)
    for w, h in [(1600, 900), (2560, 1080), (390, 844), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        load()
        go(final)
        first = canvas_pixels(page)
        page.wait_for_timeout(2000)
        settled_pixels = canvas_pixels(page)
        ok(f'animated Thanks assembles and stays visible at {w}x{h}', first != settled_pixels and
           sum(1 for i in range(0, len(settled_pixels), 4) if settled_pixels[i + 3] > 80) > 150)
        page.evaluate("document.body.classList.remove('show-controls')")
        page.screenshot(path=str(OUT / f'thanks-animated-{w}x{h}.png'))
    page.set_viewport_size({'width': 1600, 'height': 900})
    load()
    go(final)
    first = canvas_pixels(page)
    page.wait_for_timeout(2000)
    ok('Thanks assembles into text', first != canvas_pixels(page))
    first = canvas_pixels(page)
    page.wait_for_timeout(350)
    ok('Thanks particles move gently', first != canvas_pixels(page))
    page.mouse.move(740, 450)
    page.wait_for_timeout(300)
    hover = canvas_pixels(page)
    ok('pointer disturbs local Thanks particles', first != hover)
    page.mouse.click(740, 450)
    page.wait_for_timeout(700)
    burst = canvas_pixels(page)
    ok('click produces a particle burst', sum(abs(a - b) for a, b in zip(hover, burst)) > 100000)
    page.wait_for_timeout(2000)
    ok('burst recovers readable Thanks', burst != canvas_pixels(page))
    go(final - 1)
    key('PageDown')
    ok('references advances to Thanks', page.evaluate('PRESENTATION.state.index') == final)
    key('PageDown')
    ok('Thanks does not wrap', page.evaluate('PRESENTATION.state.index') == final)
    key('ArrowUp')
    ok('Thanks opens last-chapter contents', page.evaluate('PRESENTATION.state.chapterSelected === 3 && PRESENTATION.state.index === 1'))
    key('Enter')
    ok('contents restores Thanks', page.evaluate('PRESENTATION.state.index') == final)
    key('PageUp')
    ok('previous returns to references and hides particle closing', page.evaluate('''() =>
      PRESENTATION.config.slides[PRESENTATION.state.index].type === 'references' &&
      document.getElementById('particle-thanks').hidden && !document.getElementById('stage').dataset.thanks
    '''))
    key('End')
    ok('End reaches Thanks', page.evaluate('PRESENTATION.state.index') == final)
    key('Home')
    ok('Home returns to first reading page', page.evaluate('PRESENTATION.state.index === 2'))
    ok('no page or shader errors', not errors and not console_errors)
    ok('no remote resources', not remote)
    browser.close()

print('total checks:', len(checks))
print('screenshots:', OUT)
