# Pi Terminal Pattern

## Source

- Local reference: [Pi Coding Agent.html](../../sources/pi-coding-agent/Pi%20Coding%20Agent.html)
- Original site: https://pi.dev/
- Asciinema documentation: https://docs.asciinema.org/manual/
- Category: terminal product interface / interactive demo / install command switcher

## What this page is doing

### 1. Terminal playback

The large terminal is not a live Shell. It uses Asciinema:

- Recording format: `.cast`
- Player: `AsciinemaPlayer.create(...)`
- The HTML keeps a hidden demo registry with a title, recording URL, theme, aspect ratio, speed and duration.
- The player replays terminal output with its original timing, which creates the typing effect.
- The page changes recordings as the user scrolls and can autoplay, pause, loop or show a caption when a recording ends.

The downloaded reference does not include the `/recordings/*.cast` files, so the terminal playback is not fully self-contained offline.

### 2. Install command switcher

The install box is a small tab system with several command variants, such as `curl`, `powershell` and `npm`:

- Each tab has a `data-install-tab` value.
- Each command panel has a matching `data-install-panel` value.
- JavaScript toggles `hidden` and `aria-selected` when the tab changes.
- The active underline is one shared element whose `transform` and `width` are updated to the active tab position.
- The default command is selected from the detected client platform.

### 3. Copy interaction

The copy button uses the Clipboard API instead of submitting a form:

- `data-copy-from` copies text from another element.
- `data-copy-text` copies an inline string.
- A temporary `is-copied` class and label change provide feedback for about 1.6 seconds.
- If Clipboard API is unavailable, the button does not pretend that copying succeeded.

## Reuse plan

The reference implementation should be rebuilt as three independent modules:

1. `terminal-player`: replays a user-owned or licensed `.cast` file.
2. `command-switcher`: switches platform commands without reloading the page.
3. `copy-command`: copies the visible command and exposes a visible success state.

Do not copy the complete Pi page script. It also contains page scrolling, theme switching, section transitions and analytics. Extract the interaction pattern and write a small component for your own demo.

## Local asset rule

Put only your own recordings or recordings with clear reuse permission in:

```text
assets/terminal/recordings/
```

Keep the original source and license next to the recording. Screenshots and observations about Pi belong in `references/`, not in `assets/`.

## Minimal player shape

```js
const player = AsciinemaPlayer.create(
  "./assets/terminal/recordings/demo.cast",
  document.querySelector("#terminal"),
  {
    autoPlay: true,
    controls: true,
    loop: true,
    speed: 1,
    terminalFontFamily: "Departure Mono",
    terminalLineHeight: 1.4,
  },
);
```

The player library and `.cast` file must both be available. For a static HTML demo, use local copies with compatible licenses and relative paths.

## Design rules to keep

- Use terminal playback for explaining a workflow, not for fake system status.
- Keep one primary command visible; put alternatives in tabs.
- Make the command horizontally scrollable on desktop and wrap safely on mobile.
- Keep copy feedback explicit: `Copied` or an equivalent state.
- Add `prefers-reduced-motion` handling and a static terminal fallback.
- Never execute a copied command automatically from the page.
