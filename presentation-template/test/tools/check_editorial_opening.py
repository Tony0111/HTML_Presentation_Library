"""Opening visuals, motion, offline behavior and optional frozen-page comparison.

Set PRESENTATION_BASELINE to an extracted previous presentation-template folder
to compare every unchanged slide pixel-for-pixel. Evidence is saved in temp.
"""
import os
from pathlib import Path
from tempfile import gettempdir
from io import BytesIO
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-editorial-opening'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
checks = []
errors = []
remote = []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


def canvas_pixels(page):
    return page.evaluate('''() => {
      const stage = document.getElementById('stage');
      SpatialStage.resize(stage.clientWidth, stage.clientHeight, innerWidth / stage.clientWidth);
      const sample = document.createElement('canvas');
      sample.width = 240; sample.height = 135;
      const ctx = sample.getContext('2d');
      ctx.drawImage(document.querySelector('#spatial canvas'), 0, 0, 240, 135);
      return Array.from(ctx.getImageData(0, 0, 240, 135).data);
    }''')


with sync_playwright() as p:
    args = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        args['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**args)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('http://**/*', lambda r: r.abort())
    context.route('https://**/*', lambda r: r.abort())
    context.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))

    def load(reduced=False):
        page.goto((ROOT / 'index.html').as_uri() + '?debug=1' + ('&reduced=1' if reduced else ''))
        page.wait_for_selector('#stage[data-ready="true"]')
        page.wait_for_function('!PRESENTATION.state.busy')

    def go(index):
        page.evaluate('i => PRESENTATION.goto(i)', index)
        page.wait_for_function('!PRESENTATION.state.busy')

    load()
    for w, h in [(1600, 900), (1440, 900), (2560, 1080), (390, 844), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        for index, name in [(0, 'cover'), (1, 'contents')]:
            go(index)
            page.wait_for_timeout(550)
            pixels = canvas_pixels(page)
            ok(f'{name} has visible brick-red geometry at {w}x{h}',
               sum(1 for i in range(0, len(pixels), 4)
                   if pixels[i] > pixels[i + 1] * 1.3 and pixels[i] > 90 and pixels[i + 3] > 100) > 150)
            ok(f'{name} has a bright background at {w}x{h}', page.evaluate(
                "getComputedStyle(document.getElementById('stage')).backgroundColor === 'rgb(245, 243, 238)'"))
            ok(f'{name} text stays within the viewport at {w}x{h}', page.evaluate('''() => {
              const mode = document.getElementById('editorial-opening').dataset.mode;
              const nodes = document.querySelectorAll('.opening-masthead > *, .opening-' + mode + ' h1, .opening-' + mode + ' h2, .opening-chapter-en, .opening-author');
              return [...nodes].filter(n => n.checkVisibility({visibilityProperty:true})).every(n => {
                const r = n.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1;
              });
            }'''))
            page.screenshot(path=str(OUT / f'{name}-{w}x{h}.png'))

    page.set_viewport_size({'width': 1600, 'height': 900})
    go(0)
    first = canvas_pixels(page)
    page.wait_for_timeout(650)
    ok('cover sculpture moves over time', first != canvas_pixels(page))
    first = canvas_pixels(page)
    page.mouse.move(1450, 750)
    page.wait_for_timeout(300)
    ok('sculpture responds to pointer parallax', first != canvas_pixels(page))
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    first = canvas_pixels(page)
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy', timeout=300)
    ok('selected chapter is reflected in accessible DOM', page.locator('.opening-chapters [aria-current="true"]').get_attribute('data-chapter') == '1')
    ok('selected chapter changes the 3D sheet pose', first != canvas_pixels(page))
    go(3)
    ok('opening leaves no overlay or palette on reading pages', page.evaluate(
        "document.getElementById('editorial-opening').hidden && !document.getElementById('stage').dataset.opening"))
    load(True)
    first = canvas_pixels(page)
    page.wait_for_timeout(300)
    ok('reduced-motion cover stays still', first == canvas_pixels(page))
    go(1)
    first = canvas_pixels(page)
    page.wait_for_timeout(300)
    ok('reduced-motion contents stays still', first == canvas_pixels(page))

    baseline = os.environ.get('PRESENTATION_BASELINE')
    if baseline:
        page.set_viewport_size({'width': 1600, 'height': 900})
        original = context.new_page()
        original.goto((Path(baseline) / 'index.html').as_uri() + '?debug=1&reduced=1')
        original.wait_for_selector('#stage[data-ready="true"]')
        original.wait_for_function('!PRESENTATION.state.busy')
        slides = page.evaluate("PRESENTATION.config.slides.slice(2).map(s => ({id:s.id, type:s.type}))")
        for index, slide in enumerate(slides):
            slide_id = slide['id']
            go(page.evaluate("id => PRESENTATION.config.slides.findIndex(s => s.id === id)", slide_id))
            original.evaluate("id => PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.id === id))", slide_id)
            original.wait_for_function('!PRESENTATION.state.busy')
            for view in (page, original):
                view.evaluate("""() => {
                  document.body.classList.remove('show-controls');
                  // Removing divider pages intentionally changes the folio only.
                  const folio = document.querySelector('.slide-footer .folio');
                  if (folio) folio.style.visibility = 'hidden';
                }""")
                view.wait_for_timeout(400)
            actual = Image.open(BytesIO(page.screenshot())).convert('RGB')
            expected = Image.open(BytesIO(original.screenshot())).convert('RGB')
            diff = ImageChops.difference(actual, expected)
            if slide['type'] == 'video-focus':
                # Native video controls are browser-painted and can differ by 1px
                # between page instances; compare the stable content contract here.
                signature = '''() => ({
                  title: document.querySelector('#slide h1')?.textContent,
                  source: document.querySelector('#slide video')?.getAttribute('src'),
                  poster: document.querySelector('#slide video')?.getAttribute('poster'),
                  caption: document.querySelector('#slide .video-figure figcaption')?.textContent,
                  notes: document.querySelector('#slide .media-notes')?.textContent
                })'''
                ok('frozen slide 18 keeps the same video content contract', page.evaluate(signature) == original.evaluate(signature))
            elif slide['type'] == 'closing':
                # Separate WebGL contexts can round texture samples differently.
                changed = sum(1 for pixel in diff.getdata() if max(pixel) > 0)
                peak = max(high for _, high in diff.getextrema())
                ok('frozen closing matches within WebGL sampling tolerance', changed <= 200 and peak <= 5)
            else:
                if diff.getbbox():
                    actual.save(OUT / f'frozen-{index + 1:02d}-actual.png')
                    expected.save(OUT / f'frozen-{index + 1:02d}-baseline.png')
                    diff.save(OUT / f'frozen-{index + 1:02d}-diff.png')
                    print('difference bounds:', diff.getbbox())
                ok(f'frozen slide {slide_id} matches baseline apart from updated folio', not diff.getbbox())
        original.close()
    ok('no JavaScript errors', not errors)
    ok('no remote resource requests', not remote)
    browser.close()

print('total checks:', len(checks))
print('screenshots:', OUT)
