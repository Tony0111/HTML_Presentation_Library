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
            visible = sum(1 for i in range(0, len(pixels), 4) if pixels[i + 3] > 100)
            ok(f'{name} has visible brick-red geometry at {w}x{h}',
               sum(1 for i in range(0, len(pixels), 4)
                   if pixels[i] > pixels[i + 1] * 1.2 and pixels[i] > 90 and pixels[i + 3] > 100) > max(30, visible * 0.04))
            ok(f'{name} has warm-white geometry at {w}x{h}',
               sum(1 for i in range(0, len(pixels), 4)
                   if pixels[i] > 180 and pixels[i + 1] > 170 and pixels[i + 2] > 150
                   and pixels[i + 3] > 100) > max(30, visible * 0.04))
            ok(f'{name} print frame stays inside the viewport at {w}x{h}', page.evaluate('''() => {
              const frame = document.querySelector('.opening-print-frame').getBoundingClientRect();
              return frame.left > 0 && frame.right < innerWidth && frame.top > 0 && frame.bottom < innerHeight;
            }'''))
            ok(f'{name} has local, noninteractive scan grain at {w}x{h}', page.evaluate('''() => {
              const style = getComputedStyle(document.getElementById('editorial-opening'), '::after');
              return style.backgroundImage.startsWith('url("data:image/png') && style.pointerEvents === 'none';
            }'''))
            ok(f'{name} has a bright background at {w}x{h}', page.evaluate(
                "getComputedStyle(document.getElementById('stage')).backgroundColor === 'rgb(245, 243, 238)'"))
            ok(f'{name} text stays within the viewport at {w}x{h}', page.evaluate('''() => {
              const mode = document.getElementById('editorial-opening').dataset.mode;
              const nodes = document.querySelectorAll('.opening-masthead > *, .opening-' + mode + ' h1, .opening-' + mode + ' h2, .opening-chapter-en, .opening-author, .opening-footer > *');
              return [...nodes].filter(n => n.checkVisibility({visibilityProperty:true})).every(n => {
                const r = n.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1;
              });
            }'''))
            page.screenshot(path=str(OUT / f'{name}-{w}x{h}.png'))

    page.set_viewport_size({'width': 1600, 'height': 900})
    go(0)
    ok('keyword keeps its accessible text', page.locator('.opening-title-accent').get_attribute('aria-label') ==
       page.evaluate('PRESENTATION.config.slides[0].title.at(-1)'))
    ok('keyword reveals with a stagger and a gentle ink cycle', page.evaluate('''() => {
      const chars = [...document.querySelectorAll('.opening-keyword-char')];
      const styles = chars.map(el => getComputedStyle(el));
      return styles.length > 1 && styles.every(s => s.animationName.includes('opening-keyword-reveal') &&
        s.animationName.includes('opening-ink-breathe')) && styles[0].animationDelay !== styles[1].animationDelay;
    }'''))
    ok('keyword reveal visibly changes position and opacity', page.evaluate('''() => {
      const el = document.querySelector('.opening-keyword-char');
      const animation = el.getAnimations().find(a => a.animationName === 'opening-keyword-reveal');
      animation.pause(); animation.currentTime = 180;
      const before = {transform:getComputedStyle(el).transform, opacity:getComputedStyle(el).opacity};
      animation.currentTime = 1030;
      const after = {transform:getComputedStyle(el).transform, opacity:getComputedStyle(el).opacity};
      animation.play();
      return before.transform !== after.transform && Number(after.opacity) > Number(before.opacity);
    }'''))
    first = canvas_pixels(page)
    page.wait_for_timeout(650)
    ok('cover sculpture moves over time', first != canvas_pixels(page))
    first = canvas_pixels(page)
    page.mouse.move(1450, 750)
    page.wait_for_timeout(300)
    ok('sculpture responds to pointer parallax', first != canvas_pixels(page))
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    ok('contents stops cover keyword animations', page.evaluate('''() =>
      [...document.querySelectorAll('.opening-keyword-char')].every(el => el.getAnimations().length === 0)
    '''))
    ok('asymmetric background blocks are cover-only', not page.locator('.opening-cover-print').is_visible())
    first = canvas_pixels(page)
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy', timeout=300)
    ok('selected chapter is reflected in accessible DOM', page.locator('.opening-chapters [aria-current="true"]').get_attribute('data-chapter') == '1')
    ok('selected chapter changes the 3D sheet pose', first != canvas_pixels(page))
    go(3)
    ok('opening leaves no overlay or palette on reading pages', page.evaluate(
        "document.getElementById('editorial-opening').hidden && !document.getElementById('stage').dataset.opening"))
    ok('reading pages have no visible print frame', not page.locator('.opening-print-frame').is_visible())
    load(True)
    ok('reduced motion disables keyword and underline animations', page.evaluate('''() =>
      document.querySelector('.opening-title-accent').getAnimations({subtree:true}).length === 0
    '''))
    first = canvas_pixels(page)
    page.wait_for_timeout(300)
    ok('reduced-motion cover stays still', first == canvas_pixels(page))
    go(1)
    first = canvas_pixels(page)
    page.wait_for_timeout(300)
    ok('reduced-motion contents stays still', first == canvas_pixels(page))

    # Inspect the actual generated print textures independently of lighting.
    probe = context.new_page()
    probe.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
    probe.wait_for_selector('#stage[data-ready="true"]')
    colors = probe.evaluate('''() => {
      const Original = THREE.CanvasTexture;
      const textures = [];
      THREE.CanvasTexture = function(canvas) {
        const texture = new Original(canvas); textures.push(texture); return texture;
      };
      let opening;
      try {
        opening = EditorialOpening.create(PRESENTATION.config, true);
        return textures.slice(0, 4).map(t => Array.from(t.image.getContext('2d').getImageData(20, 700, 1, 1).data));
      } finally {
        THREE.CanvasTexture = Original;
        if (opening) opening.scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
        textures.forEach(t => t.dispose());
      }
    }''')
    ok('four chapter sheets alternate brick and warm white', len(colors) == 4 and
       all((r > g * 1.3 and r > b * 1.3) if i % 2 == 0 else (r > 225 and g > 225 and b > 215)
           for i, (r, g, b, a) in enumerate(colors)))
    probe.close()

    page.emulate_media(reduced_motion='reduce')
    load()
    ok('system reduced motion disables keyword animation without query override', page.evaluate('''() =>
      document.querySelector('.opening-title-accent').getAnimations({subtree:true}).length === 0
    '''))

    baseline = os.environ.get('PRESENTATION_BASELINE')
    if baseline:
        page.set_viewport_size({'width': 1600, 'height': 900})
        original = context.new_page()
        original.goto((Path(baseline) / 'index.html').as_uri() + '?debug=1&reduced=1')
        original.wait_for_selector('#stage[data-ready="true"]')
        original.wait_for_function('!PRESENTATION.state.busy')
        slides = page.evaluate("PRESENTATION.config.slides.slice(2).filter(s => s.type !== 'thanks').map(s => ({id:s.id, type:s.type}))")
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
