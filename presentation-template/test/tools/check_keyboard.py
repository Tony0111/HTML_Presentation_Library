"""Keyboard contract and animation/input regressions for the formal entry."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
errors = []
checks = []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


with sync_playwright() as p:
    options = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    page.wait_for_selector('#stage[data-ready="true"]')

    def settled():
        page.wait_for_function('!PRESENTATION.state.busy', timeout=2500)

    def go(index):
        settled()
        page.evaluate('i => PRESENTATION.goto(i)', index)
        settled()

    def key(value):
        page.keyboard.press(value)
        settled()

    def state():
        return page.evaluate('({...PRESENTATION.state})')

    # Cover is already visible but its initial opacity must not lock navigation.
    key('Enter')
    ok('cover Enter opens contents with first chapter', state()['index'] == 1 and state()['chapterSelected'] == 0)
    for value in ['ArrowRight', 'ArrowRight', 'ArrowLeft']:
        page.keyboard.press(value)
        page.wait_for_function('!PRESENTATION.state.busy', timeout=300)
    ok('chapter selection responds without camera delay', state()['chapterSelected'] == 1)
    key('8')
    key('9')
    ok('nonexistent and unsupported chapter numbers do nothing', state()['chapterSelected'] == 1)
    key('Home')
    key('ArrowLeft')
    ok('chapter selection does not wrap before first', state()['chapterSelected'] == 0)
    key('End')
    key('ArrowRight')
    ok('chapter selection does not wrap after last', state()['chapterSelected'] == 3)
    key('Backspace')
    ok('opening contents cancels to cover', state()['index'] == 0)

    first_chapter_page = page.evaluate("PRESENTATION.config.slides.findIndex(s => s.id === 'S04')")
    go(first_chapter_page)
    key('ArrowUp')
    ok('temporary contents remembers page and chapter', state()['returnIndex'] == first_chapter_page and state()['chapterSelected'] == 0)
    key('ArrowRight')
    key('Backspace')
    ok('cancel restores original page even after changing selection', state()['index'] == first_chapter_page and state()['returnIndex'] is None)
    key('ArrowUp')
    key('Enter')
    ok('unchanged chapter Enter returns to original page', state()['index'] == first_chapter_page)
    key('ArrowUp')
    key('2')
    key('Space')
    expected = page.evaluate('PRESENTATION.config.slides.findIndex(s => s.id === PRESENTATION.config.chapters[1].firstSlideId)')
    ok('changed chapter enters its first slide', state()['index'] == expected)
    key('Home')
    ok('body Home goes to first content page', state()['index'] == 2)
    key('End')
    closing_page = page.evaluate("PRESENTATION.config.slides.findIndex(s => s.type === 'closing')")
    ok('body End reaches closing with last chapter context', state()['index'] == closing_page and state()['chapterSelected'] == 3)
    key('PageDown')
    ok('closing does not wrap', state()['index'] == closing_page)
    key('ArrowUp')
    key('Enter')
    ok('closing temporary contents returns to closing', state()['index'] == closing_page)

    go(page.evaluate("PRESENTATION.config.slides.findIndex(s => s.id === 'S04')"))
    key('Enter')
    ok('body Enter is not a forward key in the contract', state()['index'] == page.evaluate("PRESENTATION.config.slides.findIndex(s => s.id === 'S04')"))
    key('PageDown')
    key('PageUp')
    ok('PageDown and PageUp advance and return', state()['index'] == page.evaluate("PRESENTATION.config.slides.findIndex(s => s.id === 'S04')"))
    page.keyboard.down('ArrowRight')
    for _ in range(6):
        page.keyboard.down('ArrowRight')
    page.keyboard.up('ArrowRight')
    settled()
    ok('held navigation key advances only once', state()['index'] == page.evaluate("PRESENTATION.config.slides.findIndex(s => s.id === 'S05')"))

    go(0)
    # Two actions in one event turn: one in flight, one pending; no long lock.
    page.evaluate("""() => {
      window.keyboardStarted = performance.now();
      for (const key of ['Enter', 'Enter']) {
        window.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles:true, cancelable:true}));
      }
    }""")
    page.wait_for_function('PRESENTATION.state.index === 2', timeout=500)
    ok('second navigation interrupts opening rather than waiting 900ms', page.evaluate('performance.now() - keyboardStarted < 500'))
    settled()

    go(0)
    page.evaluate("""() => {
      for (const key of ['Enter', 'ArrowRight', 'ArrowRight', 'q']) {
        window.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles:true, cancelable:true}));
      }
    }""")
    settled()
    ok('rapid input retains at most one action and unrelated keys do not erase it', state()['index'] == 1 and state()['chapterSelected'] == 1)

    go(0)
    page.keyboard.press('Enter')
    page.keyboard.press('f')
    page.wait_for_function('!!document.fullscreenElement', timeout=500)
    ok('F works during spatial transition', state()['index'] == 1)
    page.keyboard.press('Escape')
    page.wait_for_function('!document.fullscreenElement')
    settled()
    ok('Escape exits fullscreen without navigating', state()['index'] == 1)
    go(3)
    page.locator('#next').focus()
    key('Enter')
    ok('focused button Enter activates only once', state()['index'] == 4)
    key('ArrowRight')
    ok('focused button does not also consume deck navigation', state()['index'] == 4)
    page.locator('#next').evaluate('(el) => el.blur()')
    key('Control+ArrowRight')
    ok('modified keys do not trigger navigation', state()['index'] == 4)

    video_page = page.evaluate("PRESENTATION.config.slides.findIndex(s => s.type === 'video-focus')")
    go(video_page)
    page.locator('video').focus()
    key('Space')
    ok('focused video Space navigates once instead of toggling playback', state()['index'] == video_page + 1)
    go(video_page)
    key('m')
    muted = page.locator('video').evaluate('(el) => el.muted')
    page.keyboard.down('m')
    page.keyboard.down('m')
    page.keyboard.up('m')
    ok('held media key toggles only once', page.locator('video').evaluate('(el) => el.muted') != muted)
    ok('media key does not navigate', state()['index'] == video_page)
    ok('no JavaScript errors', not errors)
    browser.close()

print('total checks:', len(checks))
