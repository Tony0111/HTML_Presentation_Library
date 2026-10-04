"""Offline browser regression and visual evidence for Template 02."""
from pathlib import Path
from io import BytesIO
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


def settled_ring(page):
    page.wait_for_function('''() => {
      const ring = SpatialStage.inspect();
      return ring.angle === ring.target && !ring.framePending;
    }''')


def shot(page, name):
    page.evaluate("document.body.classList.remove('show-controls')")
    page.wait_for_timeout(180)
    page.screenshot(path=str(SHOTS / (name + '.png')), style='.presentation-controls { visibility: hidden !important; }')


def variance(path):
    return sum(ImageStat.Stat(Image.open(path).convert('RGB')).stddev)


def color_counts(image):
    pixels = list(image.convert('RGB').getdata())
    cyan = sum(g > r + 10 and b > r + 5 for r, g, b in pixels)
    orange = sum(r > g + 20 and g > b + 15 for r, g, b in pixels)
    return cyan, orange


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
    check('20 slides and 4 chapters', page.evaluate('PRESENTATION.config.slides.length === 20 && PRESENTATION.config.chapters.length === 4'))
    check('cover title has a continuous transform animation', page.evaluate('''() =>
      Array.from(document.querySelectorAll('.opening-cover h1 span')).every(span =>
        getComputedStyle(span).animationName === 'title-shift' && getComputedStyle(span).animationIterationCount === 'infinite'
      )
    '''))
    check('cover does not show a template number marker', page.locator('.opening-mark').count() == 0)
    check('cover has no right-side jump button', page.locator('.opening-cover button').count() == 0)
    check('spatial pages no longer use a ruled brand masthead', page.locator('.opening-masthead').count() == 0)
    # Freeze the intentional title animation while comparing lens-only pixels below.
    page.evaluate("document.querySelectorAll('.opening-cover h1 span').forEach(span => span.style.animation = 'none')")
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
    check('lens relaxes after pointer leaves', sum(ImageStat.Stat(restored).mean) < 0.7)

    page.keyboard.press('Enter')
    page.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    shot(page, 'contents-desktop')
    pixels = list(Image.open(SHOTS / 'contents-desktop.png').convert('RGB').resize((160, 90)).getdata())
    cyan = sum(g > r + 10 and b > r + 5 for r, g, b in pixels)
    orange = sum(r > g + 20 and g > b + 15 for r, g, b in pixels)
    check('contents is predominantly cyan with orange accents', cyan > 2000 and cyan > orange * 2)
    check('screen faces have no oversized frame', page.evaluate('SpatialStage.inspect().borderless'))
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
    settled_ring(page)
    check('screens are uniformly scaled to 62 percent', page.evaluate('SpatialStage.inspect().panelScale === 0.62'))
    front = page.locator('[data-chapter]').nth(0).bounding_box()
    check('desktop screen clears footer', front['y'] + front['height'] < page.locator('.opening-footer').bounding_box()['y'])
    check('desktop screen width is below half the viewport', front['width'] < 800)
    check('desktop screen moved toward canvas center', front['y'] + front['height'] / 2 < 530)
    page.mouse.move(front['x'] + front['width'] / 2, front['y'] + front['height'] / 2)
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('arrow selects method', page.evaluate('PRESENTATION.state.chapterSelected === 1'))
    page.wait_for_timeout(500)
    shot(page, 'contents-after-right')
    ring_difference = ImageChops.difference(Image.open(SHOTS / 'contents-desktop.png').convert('RGB'), Image.open(SHOTS / 'contents-after-right.png').convert('RGB'))
    check('arrow rotates the chapter screen ring', sum(ImageStat.Stat(ring_difference).mean) > 2)
    settled_ring(page)
    check('stationary pointer does not reselect chapter during rotation', page.evaluate('PRESENTATION.state.chapterSelected === 1'))
    still = page.locator('[data-chapter]').nth(1).bounding_box()
    page.mouse.move(30, 30)
    page.wait_for_timeout(200)
    check('idle screen and click target remain fixed', still == page.locator('[data-chapter]').nth(1).bounding_box())
    page.keyboard.press('ArrowLeft')
    settled_ring(page)
    check('left returns exactly to chapter one', page.evaluate('PRESENTATION.state.chapterSelected === 0 && SpatialStage.inspect().angle === 0'))
    page.keyboard.press('ArrowRight')
    page.wait_for_timeout(80)
    page.keyboard.press('ArrowLeft')
    settled_ring(page)
    check('mid-turn reversal settles at chapter one', page.evaluate('PRESENTATION.state.chapterSelected === 0 && SpatialStage.inspect().angle === 0'))
    for key in ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft']:
        page.keyboard.press(key)
    page.wait_for_function('!PRESENTATION.state.busy')
    settled_ring(page)
    check('rapid alternating input settles at final chapter', page.evaluate('PRESENTATION.state.chapterSelected === 1 && SpatialStage.inspect().angle === SpatialStage.inspect().target'))
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('selected chapter enters correct content', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].id === "S08"'))
    page.keyboard.press('Backspace')
    page.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    page.keyboard.press('Enter')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('temporary contents returns to same reading page', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].id === "S08"'))
    goto(page, 1)
    for chapter in range(4):
        page.keyboard.press(str(chapter + 1))
        page.wait_for_function('!PRESENTATION.state.busy')
        settled_ring(page)
        palette = 'cyan' if chapter % 2 == 0 else 'orange'
        check(f'chapter {chapter + 1} screen uses {palette} palette', page.locator('[data-chapter]').nth(chapter).get_attribute('data-palette') == palette)
        shot(page, f'contents-chapter-{chapter + 1}')
        bounds = page.locator('[data-chapter]').nth(chapter).bounding_box()
        heading = page.locator('.opening-contents-head').bounding_box()
        check(f'chapter {chapter + 1} screen clears compact heading', bounds['y'] > heading['y'] + heading['height'] + 20)
        image = Image.open(SHOTS / f'contents-chapter-{chapter + 1}.png')
        screen = image.crop((bounds['x'], bounds['y'], bounds['x'] + bounds['width'], bounds['y'] + bounds['height'])).resize((160, 90))
        cyan, orange = color_counts(screen)
        check(f'chapter {chapter + 1} screen visibly contains both colors', cyan > 20 and orange > 20)
        check(f'chapter {chapter + 1} screen starts near white', min(ImageStat.Stat(screen.crop((4, 4, 16, 7))).mean) > 235)
        check(f'chapter {chapter + 1} screen has correct dominant color', cyan > orange if palette == 'cyan' else orange > cyan)
    page.locator('[data-chapter="2"]').click()
    page.wait_for_function('!PRESENTATION.state.busy')
    check('screen click enters evidence chapter', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].id === "S13"'))

    slides = page.evaluate('PRESENTATION.config.slides.map(s => ({id:s.id,type:s.type}))')
    for index, slide in enumerate(slides):
        goto(page, index)
        check(slide['id'] + ' no runtime error', page.locator('#error').is_hidden())
        if slide['type'] not in ('cover', 'contents', 'closing'):
            check(slide['id'] + ' reading page present', page.locator('#slide').is_visible())
            check(slide['id'] + ' images loaded', page.evaluate('Array.from(document.querySelectorAll("#slide img")).every(i => i.complete && i.naturalWidth > 0)'))
            check(slide['id'] + ' body clears footer', page.evaluate('''() => {
              const footer = document.querySelector('.slide-footer').getBoundingClientRect();
              return Array.from(document.querySelector('#slide').children).filter(n => !n.matches('header,footer')).every(n => n.getBoundingClientRect().bottom < footer.top - 4);
            }'''))
            if slide['type'] == 'statement':
                check(slide['id'] + ' subtitle rendered', page.locator('.statement-layout .slide-quote').count() == 1)
        shot(page, 'page-' + slide['id'])
        if slide['type'] not in ('cover', 'contents', 'closing'):
            palette = page.locator('#slide').get_attribute('data-palette')
            expected = 'cyan' if page.evaluate('PRESENTATION.state.chapterSelected % 2 === 0') else 'orange'
            check(slide['id'] + ' reading palette matches chapter screen', palette == expected)
            check(slide['id'] + ' has a real two-color gradient', page.locator('#slide').evaluate('''(el) => {
              const style = getComputedStyle(el);
              const button = document.querySelectorAll('.opening-chapters [data-chapter]')[PRESENTATION.state.chapterSelected];
              const screen = getComputedStyle(button);
              return style.backgroundImage.includes('linear-gradient') &&
                ['--palette-start', '--palette-main', '--palette-glow'].every(name =>
                  style.getPropertyValue(name).trim() === screen.getPropertyValue(name).trim());
            }'''))
            cyan, orange = color_counts(Image.open(SHOTS / ('page-' + slide['id'] + '.png')).resize((160, 90)))
            check(slide['id'] + ' visibly includes cyan and orange', cyan > 20 and orange > 20)
            image = Image.open(SHOTS / ('page-' + slide['id'] + '.png')).convert('RGB')
            check(slide['id'] + ' upper-left remains near white', min(ImageStat.Stat(image.crop((10, 10, 100, 35))).mean) > 235)
            bottom = ImageStat.Stat(image.crop((1500, 850, 1580, 890))).mean
            check(slide['id'] + ' lower-right carries chapter primary', bottom[1] > bottom[0] + 10 if palette == 'cyan' else bottom[0] > bottom[1] + 15)
            check(slide['id'] + ' includes shared contour bitmap', page.locator('#slide').evaluate('(el) => getComputedStyle(el).backgroundImage.includes("data:image/png")'))
            if index in (2, 5):
                flat = Image.open(BytesIO(page.screenshot(style='#stage { --contour-texture: none !important; } .presentation-controls { visibility: hidden !important; }'))).convert('RGB')
                difference = ImageChops.difference(image, flat)
                check(slide['id'] + ' contour lines visibly render', sum(ImageStat.Stat(difference.crop((1050, 620, 1500, 800))).mean) > 0.2)
                check(slide['id'] + ' contour lines leave title area clear', sum(ImageStat.Stat(difference.crop((80, 100, 600, 250))).mean) < 0.1)
            check(slide['id'] + ' has correct dominant color', cyan > orange if palette == 'cyan' else orange > cyan)

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
    check('last page is Thanks, not chapter directory', page.evaluate('PRESENTATION.config.slides.at(-1).type === "closing"') and page.locator('#stage').get_attribute('data-opening') == 'closing')
    check('Thanks has no footer line, labels or page number', page.locator('.opening-footer').is_hidden())
    page.wait_for_function('ThanksParticles.inspect().morph === 1')
    check('Thanks reuses the single WebGL canvas', page.locator('#spatial canvas').count() == 1)
    check('Library effect uses 12000 particles', page.evaluate('ThanksParticles.inspect().count === 12000'))
    check('Thanks particles are orange against cyan background', page.evaluate('''() => {
      const source = document.querySelector('#spatial canvas');
      const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
      const g = canvas.getContext('2d'); g.drawImage(source, 0, 0);
      const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0, orange = 0;
      for(let i=0;i<pixels.length;i+=4) {
        if(pixels[i+3]<100) continue;
        visible++;
        if(pixels[i]>pixels[i+1]+20 && pixels[i+1]>pixels[i+2]+15) orange++;
      }
      return visible > 1000 && orange / visible > 0.95;
    }'''))
    shot(page, 'thanks-desktop')
    page.mouse.move(1350, 280)
    page.wait_for_timeout(400)
    shot(page, 'thanks-pointer')
    check('Thanks particles move and respond to pointer', sum(ImageStat.Stat(ImageChops.difference(Image.open(SHOTS / 'thanks-desktop.png'), Image.open(SHOTS / 'thanks-pointer.png'))).mean) > 0.1)
    page.keyboard.press('ArrowLeft')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('Thanks returns to references with left arrow', page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].type === "references"'))
    check('leaving Thanks stops animation frame', page.evaluate('!SpatialStage.inspect().framePending'))
    page.keyboard.press('ArrowRight')
    page.wait_for_function('!PRESENTATION.state.busy')
    check('references advances to Thanks', page.locator('#stage').get_attribute('data-opening') == 'closing')
    shot(page, 'thanks-sphere')
    check('Thanks enters as a particle sphere', page.evaluate('ThanksParticles.inspect().morph < 0.5'))
    page.wait_for_function('ThanksParticles.inspect().morph === 1')
    shot(page, 'thanks-formed')
    check('sphere visibly morphs into Thanks text', sum(ImageStat.Stat(ImageChops.difference(Image.open(SHOTS / 'thanks-sphere.png'), Image.open(SHOTS / 'thanks-formed.png'))).mean) > 1)

    for w, h in [(1920, 1080), (1440, 900), (2560, 1080), (390, 844), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_function('''() => {
          const r = document.querySelector('#stage').getBoundingClientRect();
          return Math.abs(r.width-innerWidth)<1 && Math.abs(r.height-innerHeight)<1;
        }''')
        for index, name in [(0, 'cover'), (1, 'contents'), (2, 'points'), (5, 'points-orange'), (19, 'thanks')]:
            goto(page, index)
            check(f'{name} fits {w}x{h}', page.evaluate('''() => {
              const r = document.querySelector('#stage').getBoundingClientRect();
              return Math.abs(r.width-innerWidth)<1 && Math.abs(r.height-innerHeight)<1 && document.documentElement.scrollWidth<=innerWidth;
            }'''))
            if index == 1:
                settled_ring(page)
                check(f'active chapter target framed {w}x{h}', page.evaluate('''() => {
                  const b = document.querySelector(`[data-chapter="${PRESENTATION.state.chapterSelected}"]`);
                  const r = b && b.getBoundingClientRect();
                  return r && r.width > 20 && r.height > 40 && r.left >= 0 && r.right <= innerWidth && r.top > 0 && r.bottom < innerHeight;
                }'''))
                check(f'canvas nonblank {w}x{h}', page.evaluate('''() => {
                  const c=document.querySelector('#spatial canvas'),g=c.getContext('webgl2')||c.getContext('webgl');
                  const a=new Uint8Array(4);g.readPixels(Math.floor(c.width/2),Math.floor(c.height/2),1,1,g.RGBA,g.UNSIGNED_BYTE,a);return a[3]>20;
                }'''))
            if (w, h) == (390, 844):
                shot(page, name + '-mobile')
            if (w, h) == (2560, 1080):
                shot(page, name + '-wide')
            if index == 19:
                check(f'Thanks has no footer at {w}x{h}', page.locator('.opening-footer').is_hidden())
                page.wait_for_function('ThanksParticles.inspect().morph === 1')
                check(f'Thanks word fits {w}x{h}', page.evaluate('ThanksParticles.inspect().textWidth < parseFloat(getComputedStyle(document.querySelector("#stage")).width) * 0.85'))
                check(f'Thanks canvas has rendered particles {w}x{h}', page.evaluate('''() => {
                  const source = document.querySelector('#spatial canvas');
                  const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
                  const g = canvas.getContext('2d'); g.drawImage(source, 0, 0, 160, 90);
                  const pixels = g.getImageData(0, 0, 160, 90).data;
                  let visible = 0;
                  for(let i=3;i<pixels.length;i+=4) if(pixels[i]>20) visible++;
                  return visible > 100;
                }'''))
                check(f'compact directory heading clears screen {w}x{h}', page.evaluate('''() => {
                  const heading = document.querySelector('.opening-contents-head').getBoundingClientRect();
                  const button = document.querySelectorAll('.opening-chapters [data-chapter]')[PRESENTATION.state.chapterSelected].getBoundingClientRect();
                  return heading.top >= 0 && heading.bottom + 4 < button.top;
                }'''))
                shot(page, f'thanks-{w}x{h}')

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
    goto(reduced_page, 19)
    check('reduced motion shows completed Thanks without animation', reduced_page.evaluate('ThanksParticles.inspect().morph === 1 && ThanksParticles.inspect().time === 0'))
    check('reduced motion Thanks has no footer', reduced_page.locator('.opening-footer').is_hidden())
    shot(reduced_page, 'thanks-reduced-before')
    reduced_page.mouse.move(1300, 450)
    reduced_page.wait_for_timeout(300)
    shot(reduced_page, 'thanks-reduced-after')
    check('reduced motion Thanks stays static', ImageChops.difference(Image.open(SHOTS / 'thanks-reduced-before.png'), Image.open(SHOTS / 'thanks-reduced-after.png')).getbbox() is None)
    reduced_page.close()

    fallback = context.new_page()
    fallback.add_init_script('''const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};''')
    fallback.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    ready(fallback)
    fallback.keyboard.press('Enter')
    fallback.wait_for_function('PRESENTATION.state.index === 1 && !PRESENTATION.state.busy')
    check('WebGL failure retains styled contents', fallback.locator('#stage').get_attribute('data-fallback') == 'true')
    check('fallback chapter panels are also borderless', fallback.locator('[data-chapter]').first.evaluate('(button) => getComputedStyle(button).borderWidth === "0px"'))
    shot(fallback, 'contents-fallback')
    fallback.locator('[data-chapter="1"]').click()
    fallback.wait_for_function('!PRESENTATION.state.busy')
    check('fallback chapter click reaches content', fallback.evaluate('PRESENTATION.state.index === 5'))
    goto(fallback, 19)
    check('WebGL failure retains visible Thanks text', fallback.locator('.opening-closing h1').is_visible() and fallback.locator('.opening-closing h1').inner_text() == 'Thanks')
    check('fallback Thanks has no footer', fallback.locator('.opening-footer').is_hidden())
    goto(fallback, 0)
    check('returning to cover restores footer', fallback.locator('.opening-footer').is_visible())
    goto(fallback, 1)
    check('returning to contents restores footer', fallback.locator('.opening-footer').is_visible())
    goto(fallback, 19)
    check('fallback Thanks uses matching orange text', fallback.locator('.opening-closing h1').evaluate('(el) => getComputedStyle(el).color === "rgb(185, 81, 37)"'))
    shot(fallback, 'thanks-fallback')
    fallback.close()
    check('no remote dependencies', not remote)
    check('no JavaScript errors', not errors)
    browser.close()

(SHOTS / 'checks.json').write_text(json.dumps({'checks': checks, 'errors': errors, 'remote': remote}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS {len(checks)} checks; {len(errors)} JavaScript errors; {len(remote)} remote requests')
