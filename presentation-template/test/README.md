# Current Template Checks

Run commands from `presentation-template/`. Viewing the presentation needs no
Python, Node, server, or network; these tools are for development only.

## Edited Content

```text
python test/tools/check_deck.py
```

Checks the current master against the generated snapshot, chapter metadata,
local assets, chapter entry/return, and the final Thanks page. It does not assume
four chapters or twenty pages. See `../EDITING-GUIDE.md` for content editing.

## Renderer Regression

```text
python test/tools/check_chapter_counts.py
python test/tools/check_formal.py
python test/tools/check_keyboard.py
python test/tools/check_editorial_opening.py
python test/tools/check_chapter_transitions.py
python test/tools/check_reading_thanks.py
```

- `check_chapter_counts.py`: temporary 3/4/5/6-chapter fixtures; sheet count,
  alternating colors, framing, responsive labels, and animated navigation.
- `check_formal.py`: the twenty-page example, page types, viewport fit, media,
  references, reduced motion, and offline behavior.
- `check_keyboard.py`: input contract, chapter boundaries, fullscreen, rapid
  actions, focus, and media controls.
- `check_editorial_opening.py`: current fold-sheet opening, scan texture,
  keyword animation, parallax, and reduced motion.
- `check_chapter_transitions.py`: bidirectional reading/contents transitions.
- `check_reading_thanks.py`: reading-page print variations, particle pixels,
  motion, pointer/click interaction, and closing-page lifecycle.

Some example regression scripts use fixed IDs or counts. Do not change edited
content back to the example solely to satisfy those assertions.

Tests require Playwright and local Chrome/Chromium; image comparison checks
also require Pillow. Screenshots go to the system temp directory. Historical
labs, old DOM/Three.js comparisons, Plotly demos, and their dedicated checks
have been removed. Their source remains in Git history.
