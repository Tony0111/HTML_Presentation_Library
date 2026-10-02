# Visual Test Lab

This folder is the first visual proof for the editorial presentation direction.

## Open directly

- `index.html`: test lab hub
- `sample.html`: 7-page editorial sample
- `compare.html`: synchronized DOM/CSS 3D vs Three.js opener comparison
- `review.html`: Markdown review view from the same source used by the demo

All entries work from `file://` in Chrome or Edge. The test folder does not require a server or build step.

## Source model

`content/slides.js` is the only sample content source. It contains reviewable Markdown inside a plain script, so `file://` can load it without `fetch()`. `shared/content-model.js` validates page IDs, page types, paths, citations, and flow references.

`content/charts/data.csv` and `content/charts/generate.py` are the chart source. Run:

```text
python content/charts/generate.py
```

The output contains the static Matplotlib SVG and a self-contained local Plotly HTML plus `plotly.min.js`.

## Opener comparison

Both variants share the content, fixed 1920×1080 stage, measured letter layout, camera timing, cover UI and TOC. The only intended difference is the renderer:

- `dom/`: CSS perspective and transformed DOM layers;
- `three/`: Three.js perspective camera, CanvasTexture letter planes, fog, points and depth layers.

Use `?p=0`, `?p=0.35`, `?p=1` to freeze comparison frames. Use `?reduced=1` to check the reduced-motion path.

## Verification

Development-only visual checks:

```text
python tools/check.py
```

The script uses Playwright and Chrome to check all pages, local Plotly, keyboard return state, reduced motion, three viewports and the absence of remote requests. It writes evidence screenshots and `shots/checks.json`.

The fonts are intentionally not bundled or subsetted in this visual stage. See the repository-level `CREATION-WORKFLOW.md` for the creation-to-production workflow.
