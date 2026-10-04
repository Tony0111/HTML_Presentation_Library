"""Compile the single Markdown master into a plain runtime snapshot.

The browser never fetches the master and never runs a compiler; it loads
data/presentation.config.js. Run from the project root:

    python tools/build_content.py

Bounded Markdown dialect: ~~~lang fenced JSON blocks, "## ID | type" headers,
@key: value meta, "# " titles, "- " bullets, "> " quotes, other lines = paragraphs.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content' / 'sample.md'
TARGET = ROOT / 'data' / 'presentation.config.js'

TYPES = {
    'cover', 'contents', 'section-divider', 'headline-points', 'statement',
    'split-media', 'chart-focus', 'process-flow', 'timeline', 'comparison',
    'table-focus', 'video-focus', 'references', 'closing', 'thanks',
}


def fail(message: str) -> None:
    print('content error: ' + message, file=sys.stderr)
    raise SystemExit(1)


def parse(source: str) -> dict:
    slides: list[dict] = []
    deck: dict | None = None
    ids: set[str] = set()
    current: dict | None = None
    fence: str | None = None
    buffer: list[str] = []

    for raw in source.replace('\r', '').split('\n'):
        line = raw.strip()
        if fence:
            if line == '~~~':
                try:
                    payload = json.loads('\n'.join(buffer))
                except json.JSONDecodeError as error:
                    fail(f'{current["id"] if current else "deck"} / {fence}: {error}')
                if current is None:
                    deck = payload
                else:
                    current['blocks'][fence] = payload
                fence, buffer = None, []
            else:
                buffer.append(raw)
            continue
        start = re.match(r'^~~~([a-z]+)$', line)
        if start:
            fence, buffer = start.group(1), []
            continue
        header = re.match(r'^## ([A-Za-z0-9_-]+) \| ([a-z-]+)$', line)
        if header:
            sid, stype = header.group(1), header.group(2)
            if sid in ids:
                fail('duplicate slide id: ' + sid)
            if stype not in TYPES:
                fail(f'unknown page type "{stype}" on {sid}')
            ids.add(sid)
            current = {'id': sid, 'type': stype, 'meta': {}, 'title': [], 'bullets': [],
                       'paragraphs': [], 'quote': '', 'blocks': {}, 'refs': []}
            slides.append(current)
            continue
        if not line or current is None:
            continue
        meta = re.match(r'^@([A-Za-z]+):\s*(.*)$', line)
        if meta:
            current['meta'][meta.group(1)] = meta.group(2)
        elif line.startswith('# '):
            current['title'].append(line[2:])
        elif line.startswith('- '):
            current['bullets'].append(line[2:])
        elif line.startswith('> '):
            current['quote'] += line[2:]
        else:
            current['paragraphs'].append(line)

    if fence:
        fail('unclosed code block: ' + fence)
    if deck is None or not slides:
        fail('missing deck config or slides')
    if not deck.get('theme'):
        deck['theme'] = 'editorial-spatial'

    references: list[dict] = []
    known_refs: dict[str, dict] = {}
    for slide in slides:
        for ref in slide['blocks'].get('references', []):
            existing = known_refs.get(ref['id'])
            if existing is None:
                known_refs[ref['id']] = ref
                references.append(ref)
            elif existing.get('text') != ref.get('text'):
                fail('conflicting source definition: ' + ref['id'])

    chapters: list[dict] = []
    cited: list[dict] = []
    previous_chapter: str | None = None
    for index, slide in enumerate(slides):
        if not slide['title']:
            fail(slide['id'] + ' has no title')
        slide['index'] = index
        chapter_id = slide['meta'].get('chapter')
        if chapter_id and chapter_id != previous_chapter:
            if any(c['id'] == chapter_id for c in chapters):
                fail(f'{slide["id"]}: chapter {chapter_id} reappears after another chapter; keep each chapter contiguous')
            if not slide['meta'].get('chapterTitle') or not slide['meta'].get('chapterEnglish'):
                fail(f'{slide["id"]}: first page of {chapter_id} needs @chapterTitle and @chapterEnglish')
            previous_chapter = chapter_id
        if chapter_id and not any(c['id'] == chapter_id for c in chapters):
            chapters.append({
                'id': chapter_id,
                'number': slide['meta'].get('chapterNumber') or str(len(chapters) + 1).zfill(2),
                'title': slide['meta'].get('chapterTitle', chapter_id),
                'english': slide['meta'].get('chapterEnglish', ''),
                'firstSlideId': slide['id'],
            })
        text = '\n'.join([*slide['title'], slide['quote'], *slide['bullets'], *slide['paragraphs']])
        for found in re.finditer(r'\[@([\w-]+)\]', text):
            ref_id = found.group(1)
            ref = next((r for r in references if r['id'] == ref_id), None)
            if ref is None:
                fail(f'{slide["id"]} cites missing source: {ref_id}')
            if ref not in cited:
                cited.append(ref)
                ref['number'] = len(cited)
            if ref not in slide['refs']:
                slide['refs'].append(ref)
        if slide['type'] == 'process-flow':
            flow = slide['blocks'].get('flow')
            if not flow or not 3 <= len(flow.get('nodes', [])) <= 7:
                fail(slide['id'] + ' process-flow needs 3-7 nodes')
            node_ids = [n['id'] for n in flow['nodes']]
            if len(set(node_ids)) != len(node_ids):
                fail(slide['id'] + ' has duplicate node ids')
            for edge in flow.get('edges', []):
                if edge['from'] not in node_ids or edge['to'] not in node_ids:
                    fail(slide['id'] + ' has an invalid edge')

    if not 1 <= len(chapters) <= 8:
        fail('this template supports 1-8 chapters')
    for number, chapter in enumerate(chapters, start=1):
        if chapter['number'] != str(number).zfill(2):
            fail(f'{chapter["id"]}: remove @chapterNumber or use sequential number {number:02d}')

    return {'meta': deck, 'theme': deck['theme'], 'chapters': chapters,
            'slides': slides, 'references': cited}


def main() -> None:
    config = parse(SOURCE.read_text(encoding='utf-8'))
    body = json.dumps(config, ensure_ascii=False, indent=2)
    TARGET.write_text('window.PRESENTATION_CONFIG = ' + body + ';\n', encoding='utf-8')
    print(f'built {TARGET.relative_to(ROOT)} · {len(config["slides"])} slides · '
          f'{len(config["chapters"])} chapters · {len(config["references"])} references')


if __name__ == '__main__':
    main()
