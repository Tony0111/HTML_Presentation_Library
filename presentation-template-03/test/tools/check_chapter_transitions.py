"""Chapter boundary workflow and bidirectional visual transition checks."""
from pathlib import Path
from tempfile import gettempdir
from io import BytesIO
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-chapter-transitions'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
checks = []
errors = []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


with sync_playwright() as p:
    options = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    page.on('pageerror', lambda e: errors.append(str(e)))

    def load(reduced=False):
        page.goto((ROOT / 'index.html').as_uri() + '?debug=1' + ('&reduced=1' if reduced else ''))
        page.wait_for_selector('#stage[data-ready="true"]')
        settled()

    def settled():
        page.wait_for_function('!PRESENTATION.state.busy')

    def key(value):
        page.keyboard.press(value)
        settled()

    def go(index):
        page.evaluate('i => PRESENTATION.goto(i)', index)
        settled()

    def capture_transition(key_value, name):
        page.keyboard.press(key_value)
        ok(name + ' starts', page.evaluate('!!document.getElementById("stage").dataset.transition'))
        page.evaluate('''() => {
          for (const id of ['slide', 'spatial', 'editorial-opening']) {
            for (const animation of document.getElementById(id).getAnimations()) {
              animation.pause(); animation.currentTime = 230;
            }
          }
          document.body.classList.remove('show-controls');
        }''')
        shot = page.screenshot()
        (OUT / (name + '.png')).write_bytes(shot)
        pixels = Image.open(BytesIO(shot)).convert('RGB')
        ok(name + ' has no dark/blank transition frame',
           sum(1 for r, g, b in pixels.resize((160, 90)).getdata() if max(r, g, b) < 45) < 350)
        ok(name + ' keeps both destination and source visible', page.evaluate('''() =>
          !document.getElementById('slide').hidden && !document.getElementById('editorial-opening').hidden
        '''))
        ok(name + ' uses perspective and intermediate opacity', page.evaluate('''() => {
          const style = getComputedStyle(document.getElementById('slide'));
          return style.transform.startsWith('matrix3d') && Number(style.opacity) > 0 && Number(style.opacity) < 1;
        }'''))
        page.evaluate('''() => {
          for (const id of ['slide', 'spatial', 'editorial-opening']) {
            document.getElementById(id).getAnimations().forEach(a => a.finish());
          }
        }''')
        settled()
        ok(name + ' cleans up all effects', page.evaluate('''() =>
          !document.getElementById('stage').dataset.transition &&
          document.getElementById('slide').getAnimations().length === 0 &&
          document.getElementById('slide').style.zIndex === ''
        '''))
        page.screenshot(path=str(OUT / (name + '-settled.png')))

    load()
    for w, h in [(1600, 900), (390, 844)]:
        page.set_viewport_size({'width': w, 'height': h})
        go(1)
        key('Home')
        capture_transition('Enter', f'enter-{w}x{h}')
        ok('entry targets first actual content page', page.evaluate('PRESENTATION.state.index === 2'))
        capture_transition('ArrowUp', f'return-{w}x{h}')
        ok('return preserves original page', page.evaluate('PRESENTATION.state.index === 1 && PRESENTATION.state.returnIndex === 2'))

    page.set_viewport_size({'width': 1600, 'height': 900})
    page.keyboard.press('Enter')
    page.set_viewport_size({'width': 1440, 'height': 900})
    settled()
    ok('resize during entry preserves destination and viewport fit', page.evaluate('''() => {
      const r = document.getElementById('stage').getBoundingClientRect();
      return PRESENTATION.state.index === 2 && Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1;
    }'''))
    key('ArrowUp')
    page.keyboard.press('Enter')
    page.keyboard.press('ArrowUp')
    settled()
    ok('reverse navigation interrupts entry and returns safely', page.evaluate('PRESENTATION.state.index === 1 && PRESENTATION.state.returnIndex === 2'))

    # Stable reading-page screenshots must match the reduced-motion path.
    key('Enter')
    page.evaluate("document.body.classList.remove('show-controls')")
    page.locator('.presentation-controls').evaluate("el => el.style.visibility = 'hidden'")
    page.wait_for_timeout(400)
    page.locator('#spatial').evaluate("el => el.style.visibility = 'hidden'")
    animated = Image.open(BytesIO(page.locator('#slide').screenshot())).convert('RGB')
    load(True)
    key('Enter')
    key('Enter')
    ok('reduced-motion entry leaves no animation', page.evaluate("!document.getElementById('stage').dataset.transition && document.getElementById('slide').getAnimations().length === 0"))
    ok('reduced-motion entry retains only the body planet', page.evaluate("document.getElementById('stage').dataset.opening === 'body' && !document.querySelector('.opening-contents').checkVisibility()"))
    page.evaluate("document.body.classList.remove('show-controls')")
    page.locator('.presentation-controls').evaluate("el => el.style.visibility = 'hidden'")
    page.wait_for_timeout(400)
    page.locator('#spatial').evaluate("el => el.style.visibility = 'hidden'")
    quiet = Image.open(BytesIO(page.locator('#slide').screenshot())).convert('RGB')
    animated.save(OUT / 'content-animated.png')
    quiet.save(OUT / 'content-reduced.png')
    diff = ImageChops.difference(animated, quiet)
    ok('settled content is identical with and without animation', not diff.getbbox())
    key('ArrowUp')
    ok('reduced-motion return directly restores contents', page.evaluate("PRESENTATION.state.index === 1 && !document.getElementById('stage').dataset.transition"))
    next_start = page.evaluate('PRESENTATION.config.slides.findIndex(s => s.id === PRESENTATION.config.chapters[1].firstSlideId)')
    go(next_start - 1)
    key('PageDown')
    ok('reduced-motion chapter end preselects next chapter', page.evaluate('PRESENTATION.state.index === 1 && PRESENTATION.state.chapterSelected === 1'))
    key('Enter')
    ok('reduced-motion confirmation enters next chapter', page.evaluate('PRESENTATION.state.index') == next_start)
    ok('no JavaScript errors', not errors)
    browser.close()

print('total checks:', len(checks))
print('screenshots:', OUT)
