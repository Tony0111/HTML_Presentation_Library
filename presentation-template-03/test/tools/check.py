"""Real file:// smoke tests. Requires Python + Playwright only for development, not viewing."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'shots'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
results = {'errors': [], 'remote_requests': [], 'checks': [], 'screenshots': []}

def ok(name, condition):
    results['checks'].append({'name': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)

def url(file, query=''):
    return (ROOT / file).as_uri() + query

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(CHROME), headless=True,
        args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-background-networking'])
    context = browser.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=1)
    page = context.new_page()
    page.on('pageerror', lambda e: results['errors'].append(str(e)))
    context.on('request', lambda r: results['remote_requests'].append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    context.route('http://**/*', lambda r: r.abort())
    context.route('https://**/*', lambda r: r.abort())
    try:
        for file in ['dom/index.html', 'three/index.html']:
            for progress in ['0', '0.35', '1']:
                page.goto(url(file, '?p=' + progress))
                page.wait_for_selector('#stage[data-ready="true"]')
                ok(file + ' renderer initialized', not page.evaluate('TEST_PLAYER.getState().failed'))
                target = OUT / (file.split('/')[0] + '-verified-p' + progress + '.png')
                page.screenshot(path=str(target))
                results['screenshots'].append(target.name)
        page.goto(url('sample.html'))
        page.wait_for_selector('#stage[data-deck-ready="true"]')
        for sid in ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07']:
            page.evaluate('(id)=>DECK.show(id)', sid)
            if sid == 'S05':
                page.wait_for_selector('#slide[data-chart-ready="true"]')
                ok('interactive Plotly ready', page.frame_locator('iframe').locator('.js-plotly-plot').count() == 1)
            page.wait_for_timeout(420)
            target=OUT / f'sample-{sid}.png'
            page.screenshot(path=str(target))
            results['screenshots'].append(target.name)
            ok(sid+' no outer scrollbar', page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight'))
            if sid not in ['S01','S02']:
                ok(sid+' content above footer',page.evaluate('''() => {
                    const a=document.querySelector('.page-content').getBoundingClientRect(), b=document.querySelector('.slide-footer').getBoundingClientRect();
                    return a.bottom <= b.top;
                }'''))
        for w,h in [(1920,1080),(2560,1440),(1440,900)]:
            page.set_viewport_size({'width':w,'height':h})
            page.wait_for_function('''() => {
                const r=document.querySelector('#stage').getBoundingClientRect();
                return Math.abs(r.width-Math.min(innerWidth,innerHeight*16/9))<1;
            }''')
            page.evaluate("DECK.show('S03')")
            ok(f'fixed canvas fits {w}x{h}',page.evaluate('''() => {
                const r=document.querySelector('#stage').getBoundingClientRect();
                return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&Math.abs(r.width/r.height-16/9)<.001;
            }'''))
        page.set_viewport_size({'width':1600,'height':900})
        page.evaluate("DECK.show('S04')")
        page.keyboard.press('ArrowUp')
        page.wait_for_timeout(400)
        ok('return directory remembers page',page.evaluate('DECK.getState().returnPage === 3'))
        page.keyboard.press('Enter')
        ok('same chapter resumes exact page',page.evaluate("DECK.getState().slideId === 'S04'"))
        page.keyboard.press('ArrowRight')
        page.wait_for_selector('#slide[data-chart-ready="true"]')
        page.wait_for_timeout(400)
        page.frame_locator('iframe').locator('body').press('ArrowRight')
        page.wait_for_function("DECK.getState().slideId === 'S06'")
        ok('iframe keyboard forwards next',page.locator('iframe').count()==0)
        page.wait_for_timeout(400)
        page.keyboard.press('ArrowUp')
        page.wait_for_timeout(400)
        page.keyboard.press('Home')
        page.keyboard.press('Enter')
        ok('different chapter jumps to first page',page.evaluate("DECK.getState().slideId === 'S03'"))
        for file in ['dom/index.html','three/index.html']:
            page.goto(url(file,'?p=1&reduced=1'))
            page.wait_for_selector('#stage[data-ready="true"]')
            ok(file+' reduced clears title world',page.locator('#world').evaluate('(e)=>Number(getComputedStyle(e).opacity)===0'))
            ok(file+' reduced camera stops',page.evaluate('TEST_PLAYER.getState().shift===0 && TEST_PLAYER.getState().time===0'))
        page.goto(url('compare.html'))
        page.wait_for_function("document.querySelectorAll('iframe').length===2")
        for f in page.frames[1:]:
            f.wait_for_selector('#stage[data-ready="true"]')
        page.locator('button[data-command="go"]').click()
        for f in page.frames[1:]:
            f.wait_for_function('TEST_PLAYER.getState().p===1')
        ok('comparison buttons synchronize',True)
        page.locator('button[data-command="back"]').click()
        for f in page.frames[1:]:
            f.wait_for_function('TEST_PLAYER.getState().p < 0.01')
        ok('comparison back button synchronizes',True)
        page.goto(url('review.html'))
        ok('review derives same seven slides',page.locator('#pages section').count()==7)
        ok('no JavaScript errors',not results['errors'])
        ok('no remote requests',not results['remote_requests'])
    except Exception as exc:
        results['failure']=str(exc)
        page.screenshot(path=str(OUT/'failure.png'))
        raise
    finally:
        (OUT/'checks.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
        print(json.dumps({k:v for k,v in results.items() if k!='screenshots'},ensure_ascii=False,indent=2))
        browser.close()
