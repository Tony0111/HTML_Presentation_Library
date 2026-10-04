"""3/4/5/6 chapter regression fixtures; never edits the real master or snapshot."""
import json
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory, gettempdir
from playwright.sync_api import sync_playwright
from check_deck import ROOT, compiler, check_structure, check_navigation, launch_options, ok

OUT = Path(gettempdir()) / 'presentation-chapter-counts'
OUT.mkdir(exist_ok=True)
NAMES = [('问题', 'THE QUESTION'), ('方法', 'THE METHOD'), ('证据', 'THE EVIDENCE'),
         ('讨论', 'DISCUSSION'), ('问题定义', 'APPLICATION'), ('下一步', 'OUTLOOK')]


def master(count):
    blocks = ['~~~deck\n' + json.dumps({'title': '让判断可见', 'display': 'MAKE IT VISIBLE',
              'theme': 'editorial-spatial', 'author': '演示模板'}, ensure_ascii=False) + '\n~~~',
              '## S01 | cover\n# 让判断\n# 可见', '## S02 | contents\n# 阅读路径']
    for i, (name, english) in enumerate(NAMES[:count]):
        blocks.append(f'## C{i + 1} | headline-points\n@chapter: ch{i + 1}\n@chapterTitle: {name}\n'
                      f'@chapterEnglish: {english}\n# 一个小问题\n- **观察**：发生了什么？')
        blocks.append(f'## C{i + 1}B | statement\n@chapter: ch{i + 1}\n# 让判断可见')
    blocks.extend([f'## SOURCES | references\n@chapter: ch{count}\n# 来源', '## END | thanks\n# Thanks'])
    return '\n\n'.join(blocks)


build = compiler()
for invalid, label in [(master(3).replace('@chapterTitle: 方法\n', ''), 'missing first-page chapter metadata'),
                       (master(3).replace('@chapter: ch3', '@chapter: ch1'), 'noncontiguous chapters')]:
    try:
        build.parse(invalid)
    except SystemExit:
        ok('compiler rejects ' + label, True)
    else:
        raise AssertionError(label)

with TemporaryDirectory(prefix='presentation-chapter-fixtures-') as tmp, sync_playwright() as p:
    fixture = Path(tmp)
    for name in ['js', 'styles', 'assets', 'vendor']:
        shutil.copytree(ROOT / name, fixture / name)
    shutil.copy2(ROOT / 'index.html', fixture / 'index.html')
    (fixture / 'data').mkdir()
    browser = p.chromium.launch(**launch_options())
    errors = []
    for count in [3, 4, 5, 6]:
        config = build.parse(master(count))
        check_structure(config, fixture)
        (fixture / 'data/presentation.config.js').write_text('window.PRESENTATION_CONFIG = ' +
            json.dumps(config, ensure_ascii=False) + ';\n', encoding='utf-8')
        page = browser.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.add_init_script('''document.addEventListener('DOMContentLoaded', () => {
          const Original = THREE.CanvasTexture;
          window.printTextures = [];
          THREE.CanvasTexture = function(canvas) {
            if (canvas.width === 720 && canvas.height === 1080) window.printTextures.push(canvas);
            return new Original(canvas);
          };
        });''')
        page.goto((fixture / 'index.html').as_uri() + '?debug=1&reduced=1')
        page.wait_for_selector('#stage[data-ready="true"]')
        page.wait_for_function('!PRESENTATION.state.busy')
        ok(f'{count} chapters produce exactly {count} sheets', page.evaluate('printTextures.length') == count)
        ok(f'{count} sheets retain alternating print colors', page.evaluate('''() => printTextures.every((c,i) => {
          const [r,g,b] = c.getContext('2d').getImageData(20,700,1,1).data;
          return i % 2 ? r > 225 && g > 225 && b > 215 : r > g * 1.3 && r > b * 1.3;
        })'''))
        check_navigation(page, config)
        for w, h in [(1600, 900), (1440, 900), (2560, 1080), (390, 844), (844, 390)]:
            page.set_viewport_size({'width': w, 'height': h})
            for index, name in [(0, 'cover'), (1, 'contents')]:
                page.evaluate('i => PRESENTATION.goto(i)', index)
                page.wait_for_function('!PRESENTATION.state.busy')
                ok(f'{count}-chapter {name} labels fit {w}x{h}', page.evaluate('''() => {
                  const mode = document.getElementById('editorial-opening').dataset.mode;
                  return [...document.querySelectorAll('.opening-' + mode + ' h1, .opening-' + mode + ' h2, .opening-chapter-en')]
                    .filter(el => el.checkVisibility({visibilityProperty:true})).every(el => {
                      const r=el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 &&
                        r.top >= 0 && r.bottom <= innerHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
                    });
                }'''))
                ok(f'{count}-chapter {name} canvas is visible and framed {w}x{h}', page.evaluate('''() => {
                  const stage=document.getElementById('stage');
                  SpatialStage.resize(stage.clientWidth,stage.clientHeight,innerWidth/stage.clientWidth);
                  const c=document.createElement('canvas'); c.width=240;c.height=135;
                  const g=c.getContext('2d');g.drawImage(document.querySelector('#spatial canvas'),0,0,240,135);
                  const a=g.getImageData(0,0,240,135).data; let visible=0,edge=0;
                  for(let i=0;i<a.length;i+=4) { if(a[i+3]>100) { visible++;
                    const x=(i/4)%240,y=Math.floor(i/4/240);if(x<3||x>236||y<3||y>131)edge++;
                  }}return visible>100 && edge===0;
                }'''))
                page.evaluate("document.body.classList.remove('show-controls')")
                page.screenshot(path=str(OUT / f'{count}-{name}-{w}x{h}.png'))
        page.set_viewport_size({'width': 1600, 'height': 900})
        page.goto((fixture / 'index.html').as_uri() + '?debug=1')
        page.wait_for_selector('#stage[data-ready="true"]')
        page.wait_for_function('!PRESENTATION.state.busy')
        page.keyboard.press('Enter')
        page.wait_for_function('!PRESENTATION.state.busy')
        page.keyboard.press(str(count))
        page.wait_for_function('!PRESENTATION.state.busy')
        page.keyboard.press('Enter')
        page.wait_for_function('!PRESENTATION.state.busy')
        ok(f'{count}-chapter animated navigation enters last chapter',
           page.evaluate('PRESENTATION.state.chapterSelected') == count - 1 and
           page.evaluate('PRESENTATION.config.slides[PRESENTATION.state.index].meta.chapter') == f'ch{count}')
        page.keyboard.press('ArrowUp')
        page.wait_for_function('!PRESENTATION.state.busy')
        ok(f'{count}-chapter animated return restores selection', page.evaluate('PRESENTATION.state.index === 1') and
           page.evaluate('PRESENTATION.state.chapterSelected') == count - 1)
        page.close()
    ok('fixtures have no browser or shader errors', not errors)
    browser.close()
print('screenshots:', OUT)
