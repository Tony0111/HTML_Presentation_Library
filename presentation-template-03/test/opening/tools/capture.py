"""Capture P2 opening study evidence: frozen frames for both renderers plus a short clip.
Development-only. Uses Playwright; viewing the template never needs it."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]          # test/opening
SHOTS = ROOT / 'shots'
SHOTS.mkdir(parents=True, exist_ok=True)
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
STEPS = ['0', '0.25', '0.5', '0.75', '1']


def launch_kwargs():
    kw = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-background-networking'])
    if CHROME.exists():
        kw['executable_path'] = str(CHROME)
    return kw


def page_url(kind, query):
    return (ROOT / kind / 'index.html').as_uri() + query


with sync_playwright() as p:
    browser = p.chromium.launch(**launch_kwargs())

    # frozen frames
    context = browser.new_context(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for kind in ['dom', 'three']:
        for step in STEPS:
            page.goto(page_url(kind, f'?p={step}&reduced=1'))
            page.wait_for_selector('#stage[data-ready="true"]')
            page.wait_for_timeout(500)
            stage = page.locator('#stage')
            stage.screenshot(path=str(SHOTS / f'{kind}-p{step}.png'))
            failed = page.evaluate('window.OPENING.getState().failed')
            assert failed is False, f'{kind} failed at p={step}'
            print('captured', kind, 'p=' + step)
    context.close()

    # short transition clips
    for kind in ['dom', 'three']:
        vctx = browser.new_context(viewport={'width': 960, 'height': 540}, record_video_dir=str(SHOTS),
                                   record_video_size={'width': 960, 'height': 540})
        vpage = vctx.new_page()
        vpage.goto(page_url(kind, '?auto=1'))
        vpage.wait_for_selector('#stage[data-ready="true"]')
        vpage.wait_for_timeout(2600)
        saved = vpage.video.path()
        vctx.close()
        Path(saved).replace(SHOTS / f'{kind}-opening.webm')
    browser.close()

print('frames:', len(list(SHOTS.glob('*.png'))), 'clips:', len(list(SHOTS.glob('*.webm'))))
if errors:
    print('page errors:', errors)
