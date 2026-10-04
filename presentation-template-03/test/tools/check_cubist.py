"""Cubist template chapter capacity, accessible controls and static fallback regressions."""
from pathlib import Path
from tempfile import gettempdir
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-template-03-cubist'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
checks, errors, remote = [], [], []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


with sync_playwright() as p:
    options = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('http://**/*', lambda r: r.abort())
    context.route('https://**/*', lambda r: r.abort())
    context.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)

    def load(script=''):
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        if script:
            page.add_init_script(script)
        page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
        page.wait_for_selector('#stage[data-ready="true"]')
        page.wait_for_function('!PRESENTATION.state.busy')
        return page

    def key(page, value):
        page.keyboard.press(value)
        page.wait_for_function('!PRESENTATION.state.busy')

    for count in [3, 5, 6, 8]:
        # Replace the snapshot before boot; every chapter still targets a real slide.
        page = load('''Object.defineProperty(window, 'PRESENTATION_CONFIG', {
          configurable:true, set(config) {
            config.chapters = Array.from({length:COUNT}, (_, i) => ({
              id:'extra'+i, number:String(i+1).padStart(2,'0'),
              title:'RESEARCH', english:'RESEARCH QUESTION', firstSlideId:config.slides[i+2].id
            }));
            config.chapters.forEach((chapter, i) => { config.slides[i+2].meta.chapter = chapter.id; });
            Object.defineProperty(window, 'PRESENTATION_CONFIG', {value:config, configurable:true});
          }
        });'''.replace('COUNT', str(count)))
        key(page, 'Enter')
        for w, h in [(1600, 900), (1440, 900), (2560, 1080), (390, 844), (844, 390)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.wait_for_timeout(100)
            ok(f'{count} chapters fit at {w}x{h}', page.evaluate('''() => {
              const footer = document.querySelector('.opening-footer').getBoundingClientRect();
              return [...document.querySelectorAll('[data-chapter]')].every(button => {
                const r = button.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom < footer.top
                  && [...button.querySelectorAll('span:not(.chapter-facet)')].every(node => {
                    const text = node.getBoundingClientRect();
                    return text.left >= r.left && text.right <= r.right && text.bottom <= r.bottom
                      && node.scrollWidth <= node.clientWidth + 1;
                  });
              });
            }'''))
            page.screenshot(path=str(OUT / f'chapters-{count}-{w}x{h}.png'))
        page.set_viewport_size({'width': 1600, 'height': 900})
        key(page, str(count))
        ok(f'chapter {count} can be selected by number', page.locator('[aria-current="true"]').get_attribute('data-chapter') == str(count - 1))
        key(page, 'Enter')
        ok(f'chapter {count} opens its content', page.evaluate('PRESENTATION.state.index') == count + 1)
        key(page, 'ArrowUp')
        page.locator('[data-chapter="0"]').focus()
        key(page, 'Enter')
        ok('focused chapter button activates only once', page.evaluate('PRESENTATION.state.index') == 2)
        page.close()

    for name, script in [
        ('WebGL unavailable', '''HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
          apply(original, canvas, args) {
            return /webgl/i.test(args[0]) ? null : Reflect.apply(original, canvas, args);
          }
        });'''),
        ('Three.js missing', '''Object.defineProperty(window, 'THREE', {get:() => undefined, set:() => {}, configurable:true});''')
    ]:
        page = load(script)
        ok(f'{name}: static cover is visible', page.locator('.opening-cover h1').is_visible())
        ok(f'{name}: fallback is marked', page.evaluate('SpatialStage.failed'))
        page.locator('.cover-enter').click()
        page.wait_for_function('!PRESENTATION.state.busy')
        page.locator('[data-chapter="2"]').click()
        page.wait_for_function('!PRESENTATION.state.busy')
        ok(f'{name}: clickable directory opens third chapter', page.evaluate("PRESENTATION.config.slides[PRESENTATION.state.index].meta.chapter === 'ch3'"))
        page.mouse.move(0, 0)
        page.locator('[data-chapter="2"]').evaluate('(button) => button.blur()')
        page.wait_for_timeout(100)
        key(page, 'ArrowUp')
        key(page, '1')
        page.locator('[data-chapter="2"]').dispatch_event('pointerenter')
        page.locator('[data-chapter="2"]').dispatch_event('pointermove', {'movementX': 0, 'movementY': 0})
        ok(f'{name}: stationary pointer preserves keyboard selection', page.evaluate('PRESENTATION.state.chapterSelected') == 0)
        key(page, 'Enter')
        ok(f'{name}: keyboard opens first chapter', page.evaluate('PRESENTATION.state.index') == 2)
        key(page, 'End')
        ok(f'{name}: final Thanks page remains reachable', page.locator('.closing-title').is_visible())
        page.screenshot(path=str(OUT / f'fallback-{name.split()[0]}.png'))
        page.close()

    page = load()
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    page.wait_for_selector('#stage[data-ready="true"]')
    # Lose the context during a cover-to-directory transition.
    page.evaluate('''() => {
      dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
      document.querySelector('#spatial canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
    }''')
    page.wait_for_function('SpatialStage.failed && !PRESENTATION.state.busy')
    ok('context loss settles the opening transition', page.locator('.opening-contents h1').is_visible())
    key(page, 'Enter')
    key(page, 'ArrowUp')
    key(page, 'Backspace')
    ok('context loss preserves navigation in both directions', page.evaluate('PRESENTATION.state.index') == 2)
    ok('no JavaScript errors', not errors)
    ok('no remote requests', not remote)
    browser.close()

print('total checks:', len(checks))
print('screenshots:', OUT)
