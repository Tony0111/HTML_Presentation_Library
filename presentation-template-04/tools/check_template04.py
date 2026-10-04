"""Offline opening, navigation, motion, and content regression checks."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
SHOTS = ROOT / 'test' / 'shots'
SHOTS.mkdir(parents=True, exist_ok=True)
errors, remote = [], []
checks = []


def ok(name, value):
    assert value, name
    checks.append(name)
    print('PASS', name)


with sync_playwright() as p:
    options = {'headless': True}
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    url = (ROOT / 'index.html').as_uri() + '?debug=1'
    page.goto(url)
    page.wait_for_selector('#stage[data-ready="true"]')

    def settled():
        page.wait_for_function('!PRESENTATION.state.busy', timeout=5000)

    def go(index):
        settled()
        page.evaluate('i => PRESENTATION.goto(i)', index)
        settled()

    def pixels():
        return page.evaluate('''() => {
            const src = document.querySelector('#spatial canvas');
            const c = document.createElement('canvas'); c.width = 160; c.height = 90;
            const g = c.getContext('2d'); g.drawImage(src, 0, 0, 160, 90);
            const data = g.getImageData(0, 0, 160, 90).data;
            let count = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 25) count++;
            return count;
        }''')

    settled()
    ok('cover has visible brush pixels', pixels() > 1800)
    page.wait_for_timeout(2100)
    page.screenshot(path=str(SHOTS / 'cover-desktop.png'))
    page.keyboard.press('Enter')
    page.wait_for_timeout(900)
    first = float(page.locator('#stage').get_attribute('data-opening-progress'))
    page.screenshot(path=str(SHOTS / 'route-in-motion.png'))
    page.wait_for_timeout(900)
    second = float(page.locator('#stage').get_attribute('data-opening-progress'))
    ok('camera transition visibly progresses', 0 < first < second <= 1)
    settled()
    ok('route has visible canvas pixels', pixels() > 100)
    page.screenshot(path=str(SHOTS / 'contents-desktop.png'))
    for key, expected in [('ArrowRight', 1), ('3', 2), ('Home', 0), ('End', 3)]:
        page.keyboard.press(key)
        page.wait_for_function('!PRESENTATION.state.busy', timeout=350)
        ok('immediate chapter selection ' + key, page.evaluate('PRESENTATION.state.chapterSelected') == expected)
    page.locator('[data-chapter="1"] button').click()
    settled()
    ok('click enters matching chapter', page.evaluate("PRESENTATION.config.slides[PRESENTATION.state.index].meta.chapter === 'ch2'"))
    page.keyboard.press('ArrowUp')
    settled()
    page.keyboard.press('Enter')
    settled()
    ok('temporary contents returns to reading', page.evaluate('PRESENTATION.state.index') == 5)
    page.screenshot(path=str(SHOTS / 'reading-desktop.png'))
    original = page.evaluate('PRESENTATION.config.slides.slice(2)')
    for i in range(2, 19):
        go(i)
        ok('reading page ' + str(i), page.locator('#slide').is_visible() and page.locator('#slide .slide-eyebrow').count() == 1)
    go(0)
    page.evaluate("() => { for (const key of ['Enter', 'Enter']) window.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles:true})); }")
    settled()
    ok('rapid Enter skips long transition and enters chapter', page.evaluate('PRESENTATION.state.index') == 2)
    for w, h in [(1920,1080), (2560,1080), (390,844), (844,390)]:
        page.set_viewport_size({'width': w, 'height': h})
        go(0)
        page.wait_for_timeout(100)
        ok(f'nonblank cover {w}x{h}', pixels() > 100)
        ok(f'top-right brush reaches edge {w}x{h}', page.evaluate('''() => {
            const canvas = document.querySelector('#spatial canvas');
            const g = canvas.getContext('2d');
            const x = canvas.width - 4, y = 2;
            return g.getImageData(x, y, 1, 1).data[3] > 25;
        }'''))
        ok(f'right brush ends before bottom {w}x{h}', page.evaluate('''() => {
            const canvas = document.querySelector('#spatial canvas');
            const g = canvas.getContext('2d');
            return g.getImageData(canvas.width - 4, canvas.height - 4, 1, 1).data[3] === 0;
        }'''))
        page.wait_for_timeout(2100)
        page.screenshot(path=str(SHOTS / f'cover-{w}x{h}.png'))
        go(1)
        ok(f'nonblank route {w}x{h}', pixels() > 20)
        ok(f'chapter labels fit {w}x{h}', page.evaluate('''() => [...document.querySelectorAll('.opening-chapter-copy')].every(el => {
            const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        })'''))
        page.wait_for_timeout(2100)
        page.screenshot(path=str(SHOTS / f'contents-{w}x{h}.png'))
    page.goto(url + '&reduced=1')
    page.wait_for_selector('#stage[data-ready="true"]')
    go(1)
    ok('reduced motion finishes immediately', page.locator('#stage').get_attribute('data-opening-progress') == '1.000')
    go(2)
    ok('reduced motion enters content', page.locator('#slide').is_visible())
    ok('no remote dependencies', not remote)
    ok('no JavaScript errors', not errors)
    browser.close()
print(json.dumps({'checks': len(checks), 'errors': errors, 'remote': remote}, ensure_ascii=False))
