# Synapse Field

An offline, keyboard-driven HTML presentation template about brain-computer interfaces. It is a visual concept demo: all signal values are illustrative and are not clinical measurements.

## Run

Open `index.html` directly in Chrome or Edge. The folder is self-contained and does not need an install step, a server, a CDN, or a network connection.

The intended presentation baseline is a 16:9 desktop display at 1920 x 1080. Press `F` for native browser fullscreen.

## Keyboard

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `ArrowDown` | Open the directory, or enter the selected chapter |
| `ArrowLeft` / `ArrowRight` | Rotate to the previous or next signal panel |
| `Home` / `End` | Jump to the first or final panel |
| `1` to `5` | Jump to a chapter |
| `ArrowUp` / `Backspace` | Return with the reverse camera animation |
| `F` | Toggle native browser fullscreen |
| `Escape` | Exit native browser fullscreen only |

Inside a chapter, `ArrowRight`, `ArrowDown`, `Enter`, or `Space` advances through its five content pages. `ArrowLeft` goes back one page. Pages `05 / 05` return to the directory automatically after a short hold, or immediately when the next key is pressed. The final page of chapter five opens the ending screen before returning to the directory. `ArrowUp` and `Backspace` return immediately from any chapter page.

## Structure

- `BCI-PRESENTATION-DESIGN.md` is the visual and narrative source of truth.
- `data/presentation.config.js` contains the chapter data and palette.
- `js/app.js` contains the Three.js scene, Canvas signal motifs, and keyboard state machine.
- `styles/base.css` contains the interface layer and chapter HUD.
- `vendor/three.min.js` is the local Three.js runtime. The corresponding license is in `LICENSES/`.

The five panels use different visual metaphors: electrode listening, intent decoding, closed-loop feedback, personal adaptation, and an open field around human agency.
