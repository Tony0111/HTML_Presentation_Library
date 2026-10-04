"""Ensure the planet remains visible and anchored throughout directory/body transitions."""
from pathlib import Path
from tempfile import gettempdir
from io import BytesIO
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(gettempdir()) / 'presentation-template-03-continuity'
OUT.mkdir(exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
checks, errors = [], []


def ok(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)


with sync_playwright() as p:
    options = dict(headless=True, args=['--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    for fallback in [False, True]:
        page = browser.new_page(viewport={'width':1600,'height':900})
        page.on('pageerror', lambda e: errors.append(str(e)))
        # Freeze only the planet rotation, leaving actual app page transitions enabled.
        page.add_init_script('''Object.defineProperty(window, 'EditorialOpening', {configurable:true,
          set(api) { const create=api.create; api.create=(config,reduced,spatial)=>create(config,true,spatial);
            Object.defineProperty(window,'EditorialOpening',{value:api,configurable:true}); }
        });''')
        if fallback:
            page.add_init_script('''HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
              apply(f,c,args) { return /webgl/i.test(args[0]) ? null : Reflect.apply(f,c,args); }
            });''')
        page.goto((ROOT/'index.html').as_uri()+'?debug=1')
        page.wait_for_selector('#stage[data-ready="true"]')
        page.evaluate('PRESENTATION.goto(1)');page.wait_for_function('!PRESENTATION.state.busy')
        for w,h in [(1600,900),(390,844)]:
            page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
            for key,name in [('Enter','enter'),('ArrowUp','return')]:
                page.keyboard.press(key)
                page.evaluate('''() => {
                  document.body.classList.remove('show-controls');
                  document.querySelectorAll('#slide, .opening-masthead, .opening-contents, .opening-footer')
                    .forEach(n=>n.getAnimations().forEach(a=>{a.pause();a.currentTime=0;}));
                }''')
                frames=[]
                for t in [0,140,280,420,559]:
                    page.evaluate('t => document.querySelectorAll("#slide, .opening-masthead, .opening-contents, .opening-footer").forEach(n=>n.getAnimations().forEach(a=>a.currentTime=t))',t)
                    ok(f'{fallback}/{w}/{name}/{t}: planet layers are not animated',page.evaluate('''() => {
                      const canvas=document.getElementById('spatial');
                      const opening=document.getElementById('editorial-opening');
                      return canvas.getAnimations().length===0 && opening.getAnimations().length===0
                        && getComputedStyle(canvas).opacity==='1' && getComputedStyle(canvas).transform==='none';
                    }'''))
                    image=page.screenshot()
                    (OUT/f'{fallback}-{w}-{name}-{t}.png').write_bytes(image)
                    shot=Image.open(BytesIO(image)).convert('RGB')
                    scale=w/page.evaluate('document.getElementById("stage").clientWidth')
                    crop=shot.crop((int(40*scale),int(h-148*scale),int(220*scale),int(h-8*scale)))
                    frames.append(crop)
                page.evaluate('document.querySelectorAll("#slide, .opening-masthead, .opening-contents, .opening-footer").forEach(n=>n.getAnimations().forEach(a=>a.finish()))')
                page.wait_for_function('!PRESENTATION.state.busy')
                changed = [sum(1 for pixel in ImageChops.difference(frames[0], frame).getdata() if max(pixel)>2) for frame in frames]
                ok(f'{fallback}/{w}/{name}: corner image remains fixed throughout transition',max(changed)<=2)
        page.close()
    ok('no JavaScript errors',not errors)
    browser.close()

print('total checks:',len(checks))
print('screenshots:',OUT)
