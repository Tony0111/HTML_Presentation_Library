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
    ok('has a 20-30 page regression deck', 20 <= len(slides) <= 30)
    ok('covers every page type', {'cover', 'contents', 'section-divider', 'headline-points', 'statement',
        'split-media', 'chart-focus', 'process-flow', 'table-focus', 'comparison', 'timeline',
        'video-focus', 'references', 'closing'} <= {s['type'] for s in slides})

    # --- visit every slide, assert it renders and the DOM slide is populated ---
    for index, slide in enumerate(slides):
        page.evaluate(f"PRESENTATION.goto({index})")
        page.wait_for_function("id => document.getElementById('stage').dataset.slide === id", arg=slide['id'], timeout=6000)
        page.wait_for_timeout(120)
        ok(f"{slide['id']} renders", page.evaluate("document.getElementById('error').hidden"))
        if slide['type'] in ('cover', 'contents', 'section-divider', 'closing'):
            ok(f"{slide['id']} uses the spatial stage", page.evaluate("document.getElementById('slide').hidden"))
        else:
            ok(f"{slide['id']} shows a reading page", page.evaluate("!document.getElementById('slide').hidden"))

    # page-type specifics
    page.evaluate("PRESENTATION.goto(14)")  # table-focus
    page.wait_for_timeout(400)
    ok('table-focus renders a semantic table', page.evaluate("!!document.querySelector('#slide table.data-table tbody tr')"))
    page.evaluate("PRESENTATION.goto(15)")  # comparison
    page.wait_for_timeout(400)
    ok('comparison renders bars', page.evaluate("document.querySelectorAll('#slide .bar-row').length >= 3"))
    page.evaluate("PRESENTATION.goto(16)")  # timeline
    page.wait_for_timeout(400)
    ok('timeline renders nodes', page.evaluate("document.querySelectorAll('#slide .timeline-node').length >= 3"))
    page.evaluate("PRESENTATION.goto(22)")  # references
    page.wait_for_timeout(400)
    ok('references renders items', page.evaluate("document.querySelectorAll('#slide .references-list li').length >= 1"))
    ok('missing source is marked pending', page.evaluate("!!document.querySelector('#slide .pending')"))

    # --- media lifecycle ---
    page.evaluate("PRESENTATION.goto(17)")  # video-focus
    page.wait_for_timeout(500)
    ok('video element present', page.evaluate("!!document.querySelector('#presentation-video')"))
    ok('video does not auto-play', page.evaluate("document.getElementById('presentation-video').paused"))
    page.keyboard.press('p')
    page.wait_for_timeout(500)
    ok('P starts playback', page.evaluate("!document.getElementById('presentation-video').paused"))
    page.evaluate("PRESENTATION.goto(18)")
    page.wait_for_timeout(500)
    ok('leaving video pauses and resets', page.evaluate("!document.getElementById('presentation-video') || (document.getElementById('presentation-video').paused && document.getElementById('presentation-video').currentTime === 0)"))

    # --- viewports: equal scale, no overflow, 16:9 preserved ---
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1')
    page.wait_for_selector('#stage[data-ready="true"]')
    page.wait_for_timeout(900)
    for w, h in [(1920, 1080), (2560, 1440), (1440, 900), (1366, 768)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_timeout(200)
        fits = page.evaluate('''() => {
          const r = document.getElementById('stage').getBoundingClientRect();
          return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
            && document.documentElement.scrollWidth <= innerWidth && Math.abs(r.width / r.height - 16 / 9) < 0.01;
        }''')
        ok(f'canvas fits {w}x{h}', fits)

    # --- reduced motion still navigates and keeps depth ---
    page.set_viewport_size({'width': 1600, 'height': 900})
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
    page.wait_for_selector('#stage[data-ready="true"]', timeout=10000)
    page.wait_for_timeout(400)
    page.evaluate("PRESENTATION.goto(1)")
    page.wait_for_timeout(400)
    ok('reduced motion reaches contents', page.evaluate("document.getElementById('stage').dataset.slide") == 'S02')
    page.evaluate("PRESENTATION.goto(3)")
    page.wait_for_timeout(300)
    ok('reduced motion reaches a reading page', page.evaluate("document.getElementById('stage').dataset.slide") == 'S04')

    ok('no remote requests', not results['remote_requests'])
    ok('no JavaScript errors', not results['errors'])
    browser.close()

for name, passed in [(c['name'], c['passed']) for c in results['checks']]:
    print(('PASS ' if passed else 'FAIL ') + name)
print('total checks:', len(results['checks']), '| errors:', len(results['errors']), '| remote:', len(results['remote_requests']))
failed = [c for c in results['checks'] if not c['passed']]
print(json.dumps({'errors': results['errors'], 'remote_requests': results['remote_requests']}, ensure_ascii=False))
if failed or results['errors'] or results['remote_requests']:
    raise SystemExit(1)
