"""Subset the licensed fonts to the characters actually used, and emit WOFF2.

Run after content changes, from the project root:

    python tools/subset_fonts.py

Sources are OFL (Noto) and the permissive DejaVu license. Both permit
redistribution. Do not swap in fonts you are not licensed to ship.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'fonts'
OUT.mkdir(parents=True, exist_ok=True)

MATPLOTLIB = Path.home() / 'AppData' / 'Roaming' / 'Python' / 'Python313' / 'site-packages' / 'matplotlib' / 'mpl-data' / 'fonts' / 'ttf'
SOURCES = [
    ('display', Path('C:/Windows/Fonts/NotoSerifSC-VF.ttf'), OUT / 'noto-serif-sc-subset.woff2'),
    ('sans', Path('C:/Windows/Fonts/NotoSansSC-VF.ttf'), OUT / 'noto-sans-sc-subset.woff2'),
    ('mono', MATPLOTLIB / 'DejaVuSansMono.ttf', OUT / 'dejavu-sans-mono-subset.woff2'),
]

TEXT_FILES = [
    'data/presentation.config.js', 'content/sample.md', 'index.html', 'review.html',
    'js/app.js', 'js/navigation.js', 'js/slide-renderer.js', 'js/spatial-stage.js', 'js/media.js',
    'styles/tokens.css', 'styles/base.css', 'styles/slides.css',
]

BASIC = set(' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~')
PUNCT = set('　、。；：！？（）《》「」『』—…·×÷±≈≠≤≥→←↑↓°％＋－＝')


def charset() -> set[str]:
    chars = set(BASIC) | set(PUNCT)
    for name in TEXT_FILES:
        path = ROOT / name
        if path.exists():
            chars |= set(path.read_text(encoding='utf-8'))
    return {c for c in chars if ord(c) > 31}


def subset_font(source: Path, target: Path, chars: set[str]) -> tuple[int, int]:
    if not source.exists():
        print(f'  ! missing source {source}', file=sys.stderr)
        return (0, 0)
    before = source.stat().st_size
    options = subset.Options()
    options.layout_features = ['*']
    options.flavor = 'woff2'
    options.desubroutinize = True
    options.name_IDs = ['*']
    options.notdef_outline = True
    font = TTFont(str(source), fontNumber=0, lazy=True)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=''.join(sorted(chars)))
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(str(target))
    return (before, target.stat().st_size)


def main() -> None:
    chars = charset()
    print(f'charset: {len(chars)} characters')
    for label, source, target in SOURCES:
        before, after = subset_font(source, target, chars)
        print(f'  {label:<8} {target.name:<32} {before/1024:8.0f} KB -> {after/1024:6.0f} KB')
    print('done')


if __name__ == '__main__':
    main()
