# Pi Sticky Story Pattern

## What this is

This is a scroll-driven story layout, not a reusable image or video asset:

```text
scroll position
      -> find the active text section
      -> swap the left-side media
      -> update the active text state
      -> play, pause or fade the new media
```

It can be reused as a “page-turning” pattern for product demos, brand stories, case studies and interactive presentations.

## Source

- Local reference: [Pi Coding Agent.html](../../sources/pi-coding-agent/Pi%20Coding%20Agent.html)
- Original site: https://pi.dev/
- Related pattern: `references/patterns/terminal/pi-terminal-pattern.md`

## Pi implementation

### Desktop layout

- `.home-story-grid` creates the two-column composition.
- `.landing-stage` is the left media rail and uses `position: sticky` with a viewport-relative height.
- `.landing-copy` is the right scrolling story column.
- Each story section carries a `data-demo` key, such as `default`, `hello`, `models` or `tree`.
- The terminal stays in one visual position while the right-side text moves through the viewport.

### Scroll state

The JavaScript does not switch media on every raw scroll event. It schedules one update with `requestAnimationFrame`, then:

1. Measures the title position of each story section.
2. Compares it with an activation line inside the sticky terminal frame.
3. Marks one section as `.is-active`.
4. Reads its `data-demo` value.
5. Replaces the current Asciinema player and synchronizes playback.

Pi uses separate activation and release thresholds. This prevents the sticky rail from jumping or releasing too early near the end of the story.

### Media transition

The current terminal fades through `.is-empty` and `.is-swapping` while the new player is mounted. The media frame also animates its aspect ratio when the selected recording has a different shape.

### Responsive fallback

On smaller screens the left sticky rail is disabled. Each story section gets its own inline demo, so the reading order becomes:

```text
text -> media -> text -> media -> text -> media
```

This is important: the desktop composition is a synchronized stage, while mobile becomes a normal linear document.

## Recommended rebuild

Keep the system in three small pieces:

```text
story-layout       grid, sticky media stage, mobile fallback
story-controller   active section detection and media swapping
story-media        terminal, image, video, canvas or HTML preview
```

Do not bind the controller to Asciinema only. The same `data-media` key can select a screenshot, a video, a canvas animation or a custom HTML preview.

## Minimal structure

```html
<section class="story-layout" data-story>
  <div class="story-media">
    <div class="story-stage" id="storyStage"></div>
  </div>

  <div class="story-copy">
    <article class="story-step is-active" data-media="intro">
      <h2>Start with the idea</h2>
      <p>The media stage shows the first state.</p>
    </article>
    <article class="story-step" data-media="workflow">
      <h2>Show the workflow</h2>
      <p>Scrolling changes the state on the left.</p>
    </article>
    <article class="story-step" data-media="result">
      <h2>End with the result</h2>
      <p>The last section keeps the final state visible.</p>
    </article>
  </div>
</section>
```

```css
.story-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
  gap: clamp(2rem, 8vw, 8rem);
}

.story-media {
  position: sticky;
  top: 1.5rem;
  align-self: start;
  min-height: calc(100vh - 3rem);
}

.story-stage {
  min-height: 18rem;
}

.story-step {
  min-height: 80vh;
  padding-block: 25vh;
  opacity: 0.42;
  transition: opacity 220ms ease;
}

.story-step.is-active {
  opacity: 1;
}

@media (max-width: 767px) {
  .story-layout {
    display: block;
  }

  .story-media {
    display: none;
  }

  .story-step {
    min-height: auto;
    padding-block: 3rem;
  }
}
```

```js
const steps = [...document.querySelectorAll(".story-step")];
const stage = document.querySelector("#storyStage");
let frame = 0;
let currentKey = "";

function swapMedia(key) {
  if (key === currentKey) return;
  currentKey = key;
  stage.dataset.media = key;
  stage.classList.add("is-swapping");

  // Mount your own terminal, image, video or canvas here.
  stage.replaceChildren(createMediaFor(key));

  requestAnimationFrame(() => stage.classList.remove("is-swapping"));
}

function updateStory() {
  frame = 0;
  const activationLine = window.innerHeight * 0.52;
  let active = steps[0];

  for (const step of steps) {
    if (step.getBoundingClientRect().top <= activationLine) active = step;
  }

  steps.forEach((step) => step.classList.toggle("is-active", step === active));
  swapMedia(active.dataset.media);
}

window.addEventListener("scroll", () => {
  if (!frame) frame = requestAnimationFrame(updateStory);
}, { passive: true });

updateStory();
```

`createMediaFor()` is intentionally left as a project-specific hook. It can call Asciinema, swap an image, mount a video, or start a canvas animation.

## Design rules

- Keep one stable visual stage; only its content changes.
- Use 4-7 story steps for a short HTML presentation.
- Give each step one message and one corresponding visual state.
- Fade or crossfade the media; avoid replacing it with an abrupt layout jump.
- Do not make the text column too narrow or too long on mobile.
- Add a static first frame and respect `prefers-reduced-motion`.
- On mobile, use linear content order instead of forcing a desktop sticky layout.
