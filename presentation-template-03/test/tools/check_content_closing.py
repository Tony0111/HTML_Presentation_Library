"""Body footer planet and Library particle Thanks lifecycle, framing and fallback."""
from pathlib import Path
from tempfile import gettempdir
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-template-03-content-closing'
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
    context = browser.new_context(viewport={'width':1600, 'height':900})
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

    def pixels():
        return page.evaluate('''() => {
          const stage = document.getElementById('stage');
          SpatialStage.resize(stage.clientWidth, stage.clientHeight, innerWidth / stage.clientWidth);
          const canvas = document.createElement('canvas'); canvas.width=320; canvas.height=180;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(document.querySelector('#spatial canvas'),0,0,320,180);
          return Array.from(ctx.getImageData(0,0,320,180).data);
        }''')

    load()
    go(2)
    first = pixels()
    page.wait_for_timeout(400)
    ok('body planet rotates in the existing WebGL context', first != pixels())
    go(19)
    first = pixels()
    page.wait_for_selector('#particle-closing[data-settled="true"]')
    ok('Library sphere morphs into Thanks', first != pixels())
    page.keyboard.press('PageDown')
    page.wait_for_function('!PRESENTATION.state.busy')
    ok('Thanks is final and does not wrap', page.evaluate('PRESENTATION.state.index') == 19)
    page.wait_for_timeout(800)
    ok('Thanks stays text instead of returning to a sphere', page.locator('#particle-closing').get_attribute('data-settled') == 'true')
    page.keyboard.press('ArrowUp')
    page.wait_for_function('!PRESENTATION.state.busy')
    page.keyboard.press('Backspace')
    page.wait_for_function('!PRESENTATION.state.busy')
    ok('temporary directory restores Thanks', page.evaluate('PRESENTATION.state.index') == 19)
    go(2)
    ok('leaving Thanks removes its overlay', page.locator('#particle-closing').is_hidden())

    load(True)
    for w,h in [(1600,900),(1440,900),(2560,1080),(390,844),(844,390)]:
        page.set_viewport_size({'width':w,'height':h})
        page.wait_for_timeout(100)
        go(2)
        ok(f'body planet and shortened footer fit {w}x{h}', page.evaluate('''() => {
          const footer=document.querySelector('.slide-footer').getBoundingClientRect();
          const scale=document.getElementById('stage').getBoundingClientRect().width / document.getElementById('stage').clientWidth;
          return document.getElementById('stage').dataset.opening==='body'
            && footer.left >= 280*scale-1 && footer.bottom <= innerHeight
            && document.querySelector('.slide-footer > span').textContent === '';
        }'''))
        data = pixels()
        ok(f'body canvas contains the planet {w}x{h}', any(data[i+3]>100 and data[i+2]>data[i]*1.1 for i in range(0,len(data),4)))
        page.screenshot(path=str(OUT / f'body-{w}x{h}.png'))
        go(19)
        data = pixels()
        visible = [(i//4%320, i//4//320) for i in range(0,len(data),4) if data[i+3]>100]
        minimum = 400 * min((w/h)/(16/9), (16/9)/(w/h))
        ok(f'Thanks particles are visible and centered {w}x{h}', len(visible)>minimum
           and abs(sum(x for x,y in visible)/len(visible)-160)<30
           and abs(sum(y for x,y in visible)/len(visible)-90)<20)
        ok(f'Thanks subtitle fits {w}x{h}', page.evaluate('''() => {
          const r=document.querySelector('.closing-subtitle').getBoundingClientRect();
          return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
        }'''))
        first = pixels(); page.wait_for_timeout(150)
        ok(f'reduced-motion Thanks is stable {w}x{h}', first == pixels())
        page.screenshot(path=str(OUT / f'thanks-{w}x{h}.png'))
    page.set_viewport_size({'width':1600,'height':900})
    go(8)
    ok('real citation footer is preserved', '[' in page.locator('.slide-footer > span').first.inner_text())
    fallback = context.new_page()
    fallback.on('pageerror', lambda e: errors.append(str(e)))
    fallback.add_init_script('''HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(f,c,args) { return /webgl/i.test(args[0]) ? null : Reflect.apply(f,c,args); }
    });''')
    fallback.goto((ROOT/'index.html').as_uri()+'?debug=1&reduced=1')
    fallback.wait_for_selector('#stage[data-ready="true"]')
    fallback.evaluate('PRESENTATION.goto(2)'); fallback.wait_for_function('!PRESENTATION.state.busy')
    ok('WebGL failure retains body planet poster', fallback.locator('.planet-poster').is_visible())
    fallback.keyboard.press('End'); fallback.wait_for_function('!PRESENTATION.state.busy')
    ok('WebGL failure retains readable Thanks', fallback.locator('.closing-title').is_visible() and fallback.locator('.closing-title').inner_text()=='THANKS')
    fallback.screenshot(path=str(OUT/'thanks-fallback.png'))
    ok('no JavaScript errors', not errors)
    ok('no remote requests', not remote)
    browser.close()

print('total checks:',len(checks))
print('screenshots:',OUT)
