"""Offline browser regression and visual evidence for Template 02."""
from pathlib import Path
import json
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SHOTS = ROOT / 'test' / 'shots'
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
SHOTS.mkdir(parents=True, exist_ok=True)
checks, errors, remote = [], [], []


def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)


def ready(page):
    page.wait_for_selector('#stage[data-ready="true"]')
    page.wait_for_function('!PRESENTATION.state.busy')


def goto(page, index):
    page.evaluate('(i) => PRESENTATION.goto(i)', index)
    page.wait_for_function('(i) => PRESENTATION.state.index === i && !PRESENTATION.state.busy', arg=index)


def shot(page, name):
    page.evaluate("document.body.classList.remove('show-controls')")
    page.wait_for_timeout(180)
    page.screenshot(path=str(SHOTS / (name + '.png')))


def variance(path):
    return sum(ImageStat.Stat(Image.open(path).convert('RGB')).stddev)


with sync_playwright() as p:
    options = {'headless': True, 'args': ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-background-networking']}
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('http://**/*', lambda route: route.abort())
    context.route('https://**/*', lambda route: route.abort())
    context.on('request', lambda request: remote.append(request.url) if request.url.startswith(('http:', 'https:')) else None)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    ready(page)
    page.wait_for_timeout(500)
    check('cover starts and uses one WebGL canvas', page.locator('#spatial canvas').count() == 1)
    check('19 slides and 4 chapters', page.evaluate('PRESENTATION.config.slides.length === 19 && PRESENTATION.config.chapters.length === 4'))
    shot(page, 'cover-desktop')
    check('cover has visible texture', variance(SHOTS / 'cover-desktop.png') > 30)

    page.mouse.move(1230, 420)
    page.wait_for_timeout(700)
    shot(page, 'cover-lens')
    difference = ImageChops.difference(Image.open(SHOTS / 'cover-desktop.png').convert('RGB'), Image.open(SHOTS / 'cover-lens.png').convert('RGB'))
    check('liquid lens visibly displaces the background', sum(ImageStat.Stat(difference.crop((950, 200, 1500, 650))).mean) > 0.4)
    check('lens does not displace title text', sum(ImageStat.Stat(difference.crop((80, 260, 570, 610))).mean) < 0.1)
    page.mouse.move(20, 20)
    page.locator('html').dispatch_event('pointerleave')
    page.wait_for_timeout(1300)
    shot(page, 'cover-lens-restored')
    restored = ImageChops.difference(Image.open(SHOTS / 'cover-desktop.png').convert('RGB'), Image.open(SHOTS / 'cover-lens-restored.png').convert('RGB'))
    check('lens relaxes after pointer leaves', sum(ImageStat.Stat(restored).mean) < 0.5)

    page.keyboard.press('Enter')
    page.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    shot(page, 'contents-desktop')
    check('screen scene has colored rendered pixels', page.evaluate('''() => {
      const source = document.querySelector('#spatial canvas');
      const c = document.createElement('canvas'); c.width = 160; c.height = 90;
      const g = c.getContext('2d'); g.drawImage(source, 0, 0, 160, 90);
      const pixels = g.getImageData(0, 0, 160, 90).data;
      let visible = 0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]>128 && pixels[i]+pixels[i+1]+pixels[i+2]>90) visible++;
      return visible > 2000;
    }'''))
    check('four accessible chapter buttons', page.locator('[data-chapter]').count() == 4)
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('arrow selects method', page.evaluate('PRESENTATION.state.chapterSelected === 1'))
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('selected chapter enters correct content', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].id === "S08"'))
    page.keyboard.press('Backspace')
    page.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('temporary contents returns to same reading page', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].id === "S08"'))
    goto(page, 1)
    page.locator('[data-chapter="2"]').click()
    page.wait_for_function('!PRESENTATION.state.busy')
    check('screen click enters evidence chapter', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].id === "S13"'))

    slides = page.evaluate('PRESENTATION.config.slides.map(s => ({id:s.id,type:s.type}))')
    for index, slide in enumerate(slides):
        goto(page, index)
        check(slide['id'] + ' no runtime error', page.locator('#error').is_hidden())
        if slide['type'] not in ('cover', 'contents'):
            check(slide['id'] + ' reading page present', page.locator('#slide').is_visible())
            check(slide['id'] + ' images loaded', page.evaluate('Array.from(document.querySelectorAll("#slide img")).every(i => i.complete && i.naturalWidth > 0)'))
            check(slide['id'] + ' body clears footer', page.evaluate('''() => {
              const footer = document.querySelector('.slide-footer').getBoundingClientRect();
              return Array.from(document.querySelector('#slide').children).filter(n => !n.matches('header,footer')).every(n => n.getBoundingClientRect().bottom < footer.top - 4);
            }'''))
            if slide['type'] == 'statement':
                check(slide['id'] + ' subtitle rendered', page.locator('.statement-layout .slide-quote').count() == 1)
        shot(page, 'page-' + slide['id'])

    goto(page, 4)
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('chapter end returns to contents and preselects next chapter', page.evaluate('PRESENTATION.state.index === 1 && PRESENTATION.state.chapterSelected === 1'))
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('next chapter starts on content', page.evaluate('PRESENTATION.state.index === 5'))

    video_index = next(i for i, s in enumerate(slides) if s['type'] == 'video-focus')
    goto(page, video_index)
    check('video does not autoplay and starts muted', page.evaluate('document.querySelector("video").paused && document.querySelector("video").muted'))
    page.keyboard.press('p')
    page.wait_for_function('!document.querySelector("video").paused')
    check('video plays with P', True)
    page.evaluate('window.oldVideo = document.querySelector("video")')
    goto(page, video_index + 1)
    check('leaving video resets and pauses', page.evaluate('oldVideo.paused && oldVideo.currentTime < 0.05'))
    page.keyboard.press('End')
    page.wait_for_function('!PRESENTATION.state.busy')
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('last page does not advance', page.evaluate('PRESENTATION.state.index === PRESENTATION.config.slides.length - 1'))

    for w, h in [(1920, 1080), (1440, 900), (2560, 1080), (390, 844), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        for index, name in [(0, 'cover'), (1, 'contents'), (2, 'points')]:
            goto(page, index)
            check(f'{name} fits {w}x{h}', page.evaluate('''() => {
              const r = document.querySelector('#stage').getBoundingClientRect();
              return Math.abs(r.width-innerWidth)<1 && Math.abs(r.height-innerHeight)<1 && document.documentElement.scrollWidth<=innerWidth;
            }'''))
            if index == 1:
                check(f'chapter targets framed {w}x{h}', page.evaluate('''() => Array.from(document.querySelectorAll('[data-chapter]')).every(b => {
                  const r=b.getBoundingClientRect();return r.width>20 && r.height>40 && r.left>=0 && r.right<=innerWidth && r.top>0 && r.bottom<innerHeight;
                })'''))
                check(f'canvas nonblank {w}x{h}', page.evaluate('''() => {
                  const c=document.querySelector('#spatial canvas'),g=c.getContext('webgl2')||c.getContext('webgl');
                  const a=new Uint8Array(4);g.readPixels(Math.floor(c.width/2),Math.floor(c.height/2),1,1,g.RGBA,g.UNSIGNED_BYTE,a);return a[3]>20;
                }'''))
            if (w, h) == (390, 844):
                shot(page, name + '-mobile')
            if (w, h) == (2560, 1080):
                shot(page, name + '-wide')

    page.set_viewport_size({'width': 1600, 'height': 900})
    page.keyboard.press('f')
    page.wait_for_function('!!document.fullscreenElement')
    check('F enters fullscreen', True)
    page.keyboard.press('Escape')
    page.wait_for_function('!document.fullscreenElement')
    check('Escape exits fullscreen', True)

    reduced_page = context.new_page()
    reduced_page.emulate_media(reduced_motion='reduce')
    reduced_page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    ready(reduced_page)
    shot(reduced_page, 'reduced-cover-before')
    reduced_page.mouse.move(1230, 420)
    reduced_page.wait_for_timeout(700)
    shot(reduced_page, 'reduced-cover-after')
    check('reduced motion keeps cover static', ImageChops.difference(Image.open(SHOTS / 'reduced-cover-before.png'), Image.open(SHOTS / 'reduced-cover-after.png')).getbbox() is None)
    reduced_page.mouse.move(20, 20)
    reduced_page.keyboard.press('Enter')
    reduced_page.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    check('reduced motion retains contents', reduced_page.locator('[data-chapter="0"]').is_visible())
    reduced_page.keyboard.press('Enter')
    reduced_page.wait_for_function('PRESENTATION.state.index === 2 && !PRESENTATION.state.busy')
    check('reduced motion reaches reading page', True)
    reduced_page.close()

    fallback = context.new_page()
    fallback.add_init_script('''const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};''')
    fallback.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    ready(fallback)
    fallback.keyboard.press('Enter')
    fallback.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    check('WebGL failure retains styled contents', fallback.locator('#stage').get_attribute('data-fallback') == 'true')
    shot(fallback, 'contents-fallback')
    fallback.locator('[data-chapter="1"]').click()
    fallback.wait_for_function('!PRESENTATION.state.busy')
    check('fallback chapter click reaches content', fallback.evaluate('PRESENTATION.state.index === 5'))
    fallback.close()
    check('no remote dependencies', not remote)
    check('no JavaScript errors', not errors)
    browser.close()

(SHOTS / 'checks.json').write_text(json.dumps({'checks': checks, 'errors': errors, 'remote': remote}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS {len(checks)} checks; {len(errors)} JavaScript errors; {len(remote)} remote requests')
