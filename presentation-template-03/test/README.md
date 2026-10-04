# Test and evidence

This folder holds experiments, design evidence, and development checks. It does not load at presentation time.

## Formal entry (current)

```text
python tools/check_formal.py        # from test/tools/
```

Runs the real `index.html` over `file://`: 24-page walk, every page type, four viewports, reduced motion, video lifecycle, references, offline and no-error checks.

## Opening study (P2)

`test/opening/` compares the DOM / CSS 3D and Three.js spatial openers that share one stroke board.

```text
python test/opening/tools/capture.py   # five frozen frames + clips per renderer -> test/opening/shots/
python test/opening/tools/verify.py    # depth, reduced-motion chapter select, failure fallback, projection
```

## Legacy visual lab

- `test/index.html`: test hub
- `test/sample.html`: 7-page legacy editorial sample
- `test/compare.html`: legacy DOM vs Three.js opener comparison
- `test/review.html`: legacy script-embedded Markdown review
- `test/dom/`, `test/three/`: legacy CSS 3D / Three.js opener experiments
- `test/shared/`: legacy content model, deck, driver

```text
python test/tools/check.py
```

`check.py` still validates the legacy lab and is kept as a baseline. It is not the formal-entry test.

## Baseline

`test/baseline/` records the pre-refactor behaviour and screenshots so the refactor can be checked for lost offline, navigation and media behaviour.

## Notes

- Development checks need Playwright plus a local Chrome / Chromium.
- Viewing the presentation never needs Python, Node or a server.
- `test/shots/` and `test/baseline/screenshots/` are historical evidence and may be large.
