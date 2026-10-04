"""Formal entry verification matrix: all page types, viewports, reduced motion,
media lifecycle, references, offline and no-error checks. Development-only."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]        # presentation-template
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
results = {'errors': [], 'remote_requests': [], 'checks': []}


def ok(name, condition):
    results['checks'].append({'name': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)


def launch_kwargs():
    kw = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-background-networking', '--autoplay-policy=no-user-gesture-required'])
    if CHROME.exists():
        kw['executable_path'] = str(CHROME)
    return kw


with sync_playwright() as p:
    browser = p.chromium.launch(**launch_kwargs())
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('http://**/*', lambda r: r.abort())
    context.route('https://**/*', lambda r: r.abort())
    page = context.new_page()
    page.on('pageerror', lambda e: results['errors'].append(str(e)))
    context.on('request', lambda r: results['remote_requests'].append(r.url) if r.url.startswith(('http:', 'https:')) else None)

    page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    page.wait_for_selector('#stage[data-ready="true"]', timeout=15000)
    page.wait_for_timeout(1500)
    ok('loads without error', page.evaluate("document.getElementById('error').hidden"))
    ok('starts on cover', page.evaluate("document.getElementById('stage').dataset.slide") == 'S01')

    slides = page.evaluate("PRESENTATION.config.slides.map(s => ({id:s.id, type:s.type}))")
    ok('has 20 pages with a particle closing page', len(slides) == 20 and slides[-1]['type'] == 'closing' and not any(s['type'] == 'section-divider' for s in slides))
    ok('covers every page type', {'cover', 'contents', 'headline-points', 'statement',
        'split-media', 'chart-focus', 'process-flow', 'table-focus', 'comparison', 'timeline',
        'video-focus', 'references'} <= {s['type'] for s in slides})
    ok('contents enters the first actual slide of every chapter', page.evaluate("PRESENTATION.config.chapters.every(c => PRESENTATION.config.slides.find(s => s.id === c.firstSlideId).type !== 'section-divider')"))

    # --- visit every slide, assert it renders and the DOM slide is populated ---
    for index, slide in enumerate(slides):
        page.evaluate(f"PRESENTATION.goto({index})")
        page.wait_for_function("id => document.getElementById('stage').dataset.slide === id", arg=slide['id'], timeout=6000)
        page.wait_for_function('!PRESENTATION.state.busy')
        ok(f"{slide['id']} renders", page.evaluate("document.getElementById('error').hidden"))
        if slide['type'] in ('cover', 'contents', 'section-divider', 'closing'):
            ok(f"{slide['id']} uses the spatial stage", page.evaluate("document.getElementById('slide').hidden"))
        else:
            ok(f"{slide['id']} shows a reading page", page.evaluate("!document.getElementById('slide').hidden"))

    # page-type specifics
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.type === 'table-focus'))")
    page.wait_for_timeout(400)
    ok('table-focus renders a semantic table', page.evaluate("!!document.querySelector('#slide table.data-table tbody tr')"))
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.type === 'comparison'))")
    page.wait_for_timeout(400)
    ok('comparison renders bars', page.evaluate("document.querySelectorAll('#slide .bar-row').length >= 3"))
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.type === 'timeline'))")
    page.wait_for_timeout(400)
    ok('timeline renders nodes', page.evaluate("document.querySelectorAll('#slide .timeline-node').length >= 3"))
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.type === 'references'))")
    page.wait_for_timeout(400)
    ok('references renders items', page.evaluate("document.querySelectorAll('#slide .references-list li').length >= 1"))
    ok('missing source is marked pending', page.evaluate("!!document.querySelector('#slide .pending')"))

    # --- media lifecycle ---
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.type === 'video-focus'))")
    page.wait_for_timeout(500)
    ok('video element present', page.evaluate("!!document.querySelector('#presentation-video')"))
    ok('video does not auto-play', page.evaluate("document.getElementById('presentation-video').paused"))
    page.keyboard.press('p')
    page.wait_for_timeout(500)
    ok('P starts playback', page.evaluate("!document.getElementById('presentation-video').paused"))
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.type === 'references'))")
    page.wait_for_timeout(500)
    ok('leaving video pauses and resets', page.evaluate("!document.getElementById('presentation-video') || (document.getElementById('presentation-video').paused && document.getElementById('presentation-video').currentTime === 0)"))

    # --- viewports: uniform content scale, full viewport coverage, no overflow ---
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    page.wait_for_selector('#stage[data-ready="true"]')
    page.wait_for_timeout(900)
    for w, h in [(1920, 1080), (2560, 1440), (1440, 900), (1366, 768),
                 (2560, 1080), (390, 844), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_timeout(200)
        fits = page.evaluate('''() => {
          const r = document.getElementById('stage').getBoundingClientRect();
          const m = new DOMMatrix(getComputedStyle(document.getElementById('stage')).transform);
          return Math.abs(r.left) < 1 && Math.abs(r.top) < 1
            && Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1
            && document.documentElement.scrollWidth <= innerWidth
            && document.documentElement.scrollHeight <= innerHeight && Math.abs(m.a - m.d) < 0.0001;
        }''')
        ok(f'canvas fits {w}x{h}', fits)
        ok(f'spatial canvas fills {w}x{h}', page.evaluate('''() => {
          const r = document.querySelector('#spatial canvas').getBoundingClientRect();
          return Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1;
        }'''))
        ok(f'spatial canvas has visible content {w}x{h}', page.evaluate('''() => {
          const stage = document.getElementById('stage');
          SpatialStage.resize(stage.clientWidth, stage.clientHeight, innerWidth / stage.clientWidth);
          const source = document.querySelector('#spatial canvas');
          const canvas = document.createElement('canvas');
          canvas.width = 160; canvas.height = 90;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(source, 0, 0, 160, 90);
          const pixels = ctx.getImageData(0, 0, 160, 90).data;
          let visible = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 20 && pixels[i] + pixels[i + 1] + pixels[i + 2] > 100) visible++;
          }
          return visible > 10;
        }'''))
        page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.id === 'S04'))")
        page.wait_for_function("document.getElementById('stage').dataset.slide === 'S04'")
        ok(f'reading page fills {w}x{h}', page.evaluate('''() => {
          const r = document.getElementById('slide').getBoundingClientRect();
          const footer = document.querySelector('#slide .slide-footer').getBoundingClientRect();
          return Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1
            && footer.bottom <= innerHeight && footer.left >= 0 && footer.right <= innerWidth;
        }'''))
        page.evaluate("PRESENTATION.goto(0)")
        page.wait_for_function("document.getElementById('stage').dataset.slide === 'S01'")

    # --- reduced motion still navigates and keeps depth ---
    page.set_viewport_size({'width': 1600, 'height': 900})
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
    page.wait_for_selector('#stage[data-ready="true"]', timeout=10000)
    page.wait_for_timeout(400)
    page.evaluate("PRESENTATION.goto(1)")
    page.wait_for_timeout(400)
    ok('reduced motion reaches contents', page.evaluate("document.getElementById('stage').dataset.slide") == 'S02')
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.findIndex(s => s.id === 'S04'))")
    page.wait_for_timeout(300)
    ok('reduced motion reaches a reading page', page.evaluate("document.getElementById('stage').dataset.slide") == 'S04')

    ok('no remote requests', not results['remote_requests'])
    page.evaluate("PRESENTATION.goto(PRESENTATION.config.slides.length - 1)")
    page.wait_for_function('!PRESENTATION.state.busy')
    ok('closing shows particle stage', page.evaluate("document.getElementById('editorial-opening').dataset.mode === 'closing' && document.getElementById('slide').hidden"))
    ok('no JavaScript errors', not results['errors'])
    browser.close()

for name, passed in [(c['name'], c['passed']) for c in results['checks']]:
    print(('PASS ' if passed else 'FAIL ') + name)
print('total checks:', len(results['checks']), '| errors:', len(results['errors']), '| remote:', len(results['remote_requests']))
failed = [c for c in results['checks'] if not c['passed']]
print(json.dumps({'errors': results['errors'], 'remote_requests': results['remote_requests']}, ensure_ascii=False))
if failed or results['errors'] or results['remote_requests']:
    raise SystemExit(1)
