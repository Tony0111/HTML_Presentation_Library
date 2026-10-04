"""Content-driven validation for edited decks; no fixed slide IDs or chapter count."""
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')


def compiler():
    spec = importlib.util.spec_from_file_location('build_content', ROOT / 'tools/build_content.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ok(name, condition):
    assert condition, name
    print('PASS', name)


def check_structure(config, root):
    slides, chapters = config['slides'], config['chapters']
    ok('1-8 chapters with contiguous automatic numbering', 1 <= len(chapters) <= 8 and
       [c['number'] for c in chapters] == [f'{i + 1:02d}' for i in range(len(chapters))])
    ok('cover and contents first, Thanks last', slides[0]['type'] == 'cover' and slides[1]['type'] == 'contents' and
       slides[-1]['type'] == 'thanks' and slides[-1]['title'] == ['Thanks'] and not slides[-1]['meta'].get('chapter'))
    ok('exactly one cover, contents and Thanks; no legacy spatial pages',
       all(sum(s['type'] == t for s in slides) == 1 for t in ['cover', 'contents', 'thanks']) and
       all(s['type'] not in ['closing', 'section-divider'] for s in slides))
    ok('all reading pages belong to known chapters', all(s['meta'].get('chapter') in {c['id'] for c in chapters}
       for s in slides[2:-1]))
    for slide in slides:
        for field in ['asset', 'poster']:
            if path := slide['meta'].get(field):
                resolved = (root / path).resolve()
                ok(f'{slide["id"]} {field} is a local existing file', resolved.is_relative_to(root.resolve()) and resolved.is_file())
    refs = [s for s in slides if s['type'] == 'references']
    ok('source pages belong to the last chapter', all(s['meta'].get('chapter') == chapters[-1]['id'] for s in refs))


def check_navigation(page, config):
    def go(index):
        page.evaluate('i => PRESENTATION.goto(i)', index)
        page.wait_for_function('!PRESENTATION.state.busy')

    def key(value):
        page.keyboard.press(value)
        page.wait_for_function('!PRESENTATION.state.busy')

    slides, chapters = config['slides'], config['chapters']
    go(1)
    ok('directory has exactly the configured chapters', page.locator('.opening-chapters li').count() == len(chapters))
    for i, chapter in enumerate(chapters):
        go(1)
        key(str(i + 1))
        item = page.locator(f'.opening-chapters li[data-chapter="{i}"]')
        ok(f'chapter {i + 1} name and selection are correct', item.get_attribute('aria-current') == 'true' and
           item.locator('h2').text_content() == chapter['title'] and
           item.locator('.opening-chapter-en').text_content() == chapter['english'])
        key('Enter')
        index = next(j for j, s in enumerate(slides) if s['id'] == chapter['firstSlideId'])
        ok(f'chapter {i + 1} enters its first reading page', page.evaluate('PRESENTATION.state.index') == index)
        if i + 1 < len(chapters):
            end = next(j for j, s in enumerate(slides) if s['id'] == chapters[i + 1]['firstSlideId']) - 1
            go(end)
            key('PageDown')
            ok(f'chapter {i + 1} end selects next chapter', page.evaluate('PRESENTATION.state.index === 1') and
               page.evaluate('PRESENTATION.state.chapterSelected') == i + 1)
    go(len(slides) - 2)
    key('PageDown')
    ok('last reading page advances to Thanks', page.evaluate('PRESENTATION.state.index') == len(slides) - 1)
    key('PageDown')
    ok('Thanks stays at the end', page.evaluate('PRESENTATION.state.index') == len(slides) - 1)
    key('ArrowUp')
    key('Enter')
    ok('temporary contents returns to Thanks', page.evaluate('PRESENTATION.state.index') == len(slides) - 1)
    key('PageUp')
    ok('Thanks can return to the previous reading page', page.evaluate('PRESENTATION.state.index') == len(slides) - 2)


def launch_options():
    options = dict(headless=True, args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    if CHROME.exists():
        options['executable_path'] = str(CHROME)
    return options


def main():
    build = compiler()
    config = build.parse((ROOT / 'content/sample.md').read_text(encoding='utf-8'))
    snapshot = (ROOT / 'data/presentation.config.js').read_text(encoding='utf-8')
    prefix = 'window.PRESENTATION_CONFIG = '
    ok('snapshot is generated from the current master', snapshot.startswith(prefix) and
       json.loads(snapshot[len(prefix):].strip().removesuffix(';')) == config)
    check_structure(config, ROOT)
    errors, remote = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_options())
        page = browser.new_page(viewport={'width': 1600, 'height': 900})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
        page.goto((ROOT / 'index.html').as_uri() + '?debug=1&reduced=1')
        page.wait_for_selector('#stage[data-ready="true"]')
        page.wait_for_function('!PRESENTATION.state.busy')
        check_navigation(page, config)
        ok('no browser errors or remote resources', not errors and not remote)
        browser.close()
    print(f'validated {len(config["slides"])} pages, {len(config["chapters"])} chapters')


if __name__ == '__main__':
    main()
