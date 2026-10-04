"""Capture a transparent, square poster of the packaged Library planet."""
from base64 import b64decode
from io import BytesIO
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
with sync_playwright() as p:
    options = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
    page.wait_for_selector('#editorial-opening[data-planet="ready"]')
    page.wait_for_selector('#stage[data-ready="true"]')
    uri = page.evaluate('''() => {
      SpatialStage.resize(1920, 1080, 1);
      return document.querySelector('#spatial canvas').toDataURL('image/png');
    }''')
    image = Image.open(BytesIO(b64decode(uri.split(',')[1])))
    # Cover model center: logical canvas center + (450, 20).
    image.crop((910, 60, 1910, 1060)).save(ROOT / 'assets/models/stylized-planet-poster.png')
    browser.close()
print('Captured assets/models/stylized-planet-poster.png')
