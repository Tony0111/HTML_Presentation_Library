"""Verify the exact Library asset, pixel fonts and model-failure fallback offline."""
import base64
import json
import re
from pathlib import Path
from tempfile import gettempdir
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-template-03-planet'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
checks, errors, remote = [], [], []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


library = (ROOT.parent / 'references/rebuilds/portfolio-v2-3d/app.bundle.js').read_text(encoding='utf-8')
uri = json.loads(re.search(r'PLANET_GLTF = ("[^"\n]+")', library)[1])
original = json.loads(base64.b64decode(uri.split(',')[1]))
packed = (ROOT / 'assets/models/stylized-planet.js').read_text(encoding='utf-8')
actual = json.loads(packed.split('window.LIBRARY_PLANET_GLTF = ', 1)[1].rstrip(';\n'))
ok('model, geometry and textures exactly match Library Stars + Earth', actual == original)
ok('original cmzw attribution is retained', actual['asset']['extras']['author'].startswith('cmzw'))
ok('model license is packaged', (ROOT / 'LICENSES/planet-license.txt').is_file())

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
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
    page.wait_for_selector('#stage[data-ready="true"]')
    ok('model and both texture layers load from file://', page.locator('#editorial-opening').get_attribute('data-planet') == 'ready')
    ok('both pixel fonts load', page.evaluate('''() =>
      document.fonts.check('400 22px "Departure Mono"') &&
      document.fonts.check('400 144px "Presentation Pixel SC"')'''))
    ok('English uses Departure Mono, not generic monospace', page.evaluate("getComputedStyle(document.querySelector('.opening-brand')).fontFamily.startsWith('\\\"Departure Mono\\\"')"))
    ok('Chinese display uses the pixel font family', page.evaluate("getComputedStyle(document.querySelector('.opening-cover h1')).fontFamily.includes('Presentation Pixel SC')"))
    ok('all packaged resources decode', page.evaluate('''() =>
      [...document.images].every(image => image.complete && image.naturalWidth > 0)'''))
    page.screenshot(path=str(OUT / 'cover-desktop.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / 'cover-mobile.png'))
    page.set_viewport_size({'width': 1600, 'height': 900})
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    ok('opening footer no longer repeats the presentation title', page.locator('.opening-footer').inner_text() == '02 / CONTENTS')
    ok('directory model occupies the bottom-left corner', page.evaluate('''() => {
      const stage = document.getElementById('stage');
      SpatialStage.resize(stage.clientWidth, stage.clientHeight, innerWidth / stage.clientWidth);
      const sample = document.createElement('canvas'); sample.width = 240; sample.height = 135;
      const ctx = sample.getContext('2d');
      ctx.drawImage(document.querySelector('#spatial canvas'), 0, 0, 240, 135);
      const pixels = ctx.getImageData(0, 0, 240, 135).data;
      const positions = [];
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 100 && pixels[i + 2] > pixels[i] * 1.1 && pixels[i + 2] > 35)
          positions.push([i / 4 % 240, Math.floor(i / 4 / 240)]);
      }
      return positions.length > 20 && positions.every(([x, y]) => x < 60 && y > 100);
    }'''))
    page.screenshot(path=str(OUT / 'contents-desktop.png'))
    page.close()

    for name, script in [
        ('model-missing', "Object.defineProperty(window, 'LIBRARY_PLANET_GLTF', {get:() => undefined, set:() => {}});"),
        ('webgl-missing', '''HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
          apply(original, canvas, args) { return /webgl/i.test(args[0]) ? null : Reflect.apply(original, canvas, args); }
        });''')
    ]:
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script(script)
        page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
        page.wait_for_selector('#stage[data-ready="true"]')
        poster = page.locator('.planet-poster')
        ok(f'{name}: original planet poster remains visible', poster.is_visible() and poster.evaluate('(n) => n.complete && n.naturalWidth > 0'))
        page.screenshot(path=str(OUT / f'{name}.png'))
        page.keyboard.press('Enter')
        page.keyboard.press('3')
        page.keyboard.press('Enter')
        page.wait_for_function('!PRESENTATION.state.busy')
        ok(f'{name}: navigation still enters third chapter', page.evaluate("PRESENTATION.config.slides[PRESENTATION.state.index].meta.chapter === 'ch3'"))
        page.close()
    ok('no JavaScript errors', not errors)
    ok('no remote requests', not remote)
    browser.close()

print('total checks:', len(checks))
print('screenshots:', OUT)
