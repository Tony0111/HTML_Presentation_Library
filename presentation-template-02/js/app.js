/* Init and wiring: single input dispatch, slide vs spatial rendering, controls. */
(function () {
  'use strict';
  const config = window.PRESENTATION_CONFIG;
  const errorBox = document.getElementById('error');
  const stage = document.getElementById('stage');
  const spatialEl = document.getElementById('spatial');
  const slideEl = document.getElementById('slide');
  const counterEl = document.getElementById('counter');
  const titleEl = document.getElementById('control-title');

  function fail(message) {
    errorBox.hidden = false;
    errorBox.innerHTML = '<strong>演示无法加载</strong><br>' + SlideRenderer.escape(message);
  }

  if (!config || !config.slides || !config.slides.length) { fail('缺少 data/presentation.config.js。请先运行 python tools/build_content.py。'); return; }
  if (config.theme !== 'cyan-orange-spatial') { fail('未知主题：' + config.theme + '。2号模板只支持 cyan-orange-spatial。'); return; }

  SlideRenderer.setReferences(config.references);
  const pad = n => String(n).padStart(2, '0');
  const state = { index: 0, chapterSelected: 0, returnIndex: null, busy: true, pending: null };
  let initialized = false;
  let pageAnimations = [];

  async function transitionReading(entering, chapterIndex = state.chapterSelected) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      || new URLSearchParams(location.search).get('reduced') === '1';
    if (reduced) {
      if (entering) { SpatialStage.hideOpening(); setSpatialVisible(false); }
      else slideEl.hidden = true;
      return;
    }
    const chapterCount = Math.max(1, config.chapters.length);
    const origin = ((chapterIndex + 0.5) / chapterCount * 100) + '% 48%';
    const folded = { opacity: 0, transform: 'perspective(1800px) translateY(100px) rotateY(-14deg) scale(0.38)', transformOrigin: origin };
    const flat = { opacity: 1, transform: 'perspective(1800px) translateY(0) rotateY(0deg) scale(1)', transformOrigin: origin };
    const options = { duration: 560, easing: 'cubic-bezier(.22,.7,.24,1)', fill: 'both' };
    stage.dataset.transition = entering ? 'enter-content' : 'return-contents';
    slideEl.style.zIndex = '4';
    const openingEl = document.getElementById('editorial-opening');
    pageAnimations = [slideEl.animate(entering ? [folded, flat] : [flat, folded], options)];
    for (const layer of [spatialEl, openingEl]) {
      if (!layer) continue;
      const near = { opacity: 0, transform: 'scale(1.14)' };
      const distant = { opacity: 1, transform: 'scale(1)' };
      pageAnimations.push(layer.animate(entering ? [distant, near] : [near, distant], options));
    }
    try {
      await Promise.all(pageAnimations.map(animation => animation.finished));
    } finally {
      if (entering) { SpatialStage.hideOpening(); setSpatialVisible(false); }
      else slideEl.hidden = true;
      pageAnimations.forEach(animation => animation.cancel());
      pageAnimations = [];
      slideEl.style.removeProperty('z-index');
      delete stage.dataset.transition;
    }
  }

  // --- canvas scaling ---
  // Scale content uniformly, expanding the logical canvas to fill the viewport.
  function fit() {
    const baseWidth = 1920, baseHeight = 1080;
    const scale = Math.min(innerWidth / baseWidth, innerHeight / baseHeight);
    const logicalWidth = innerWidth / scale, logicalHeight = innerHeight / scale;
    stage.style.setProperty('--canvas-w', logicalWidth + 'px');
    stage.style.setProperty('--canvas-h', logicalHeight + 'px');
    stage.style.setProperty('--extra-y', (logicalHeight - baseHeight) / 2 + 'px');
    stage.style.transform = `scale(${scale})`;
    SpatialStage.resize(logicalWidth, logicalHeight, scale);
  }
  addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);

  function setSpatialVisible(visible) {
    spatialEl.style.transition = 'opacity 320ms ease';
    spatialEl.style.opacity = visible ? '1' : '0';
    spatialEl.style.pointerEvents = 'none';
  }

  function sceneFor(slide) {
    if (slide.type === 'section-divider') return 'divider';
    return slide.type;
  }

  async function renderSlide(index) {
    const slide = config.slides[index];
    if (!slide) return;
    const previousType = config.slides[state.index].type;
    const previousChapter = Navigation.chapterIndexOfSlide(config, state.index);
    const entering = previousType === 'contents' && !Navigation.isSpatial(slide.type);
    const returning = !Navigation.isSpatial(previousType) && slide.type === 'contents';
    Media.release();
    state.index = index;
    if (slide.type === 'cover') state.chapterSelected = 0;
    const chapterIndex = Navigation.chapterIndexOfSlide(config, index);
    if (chapterIndex >= 0) state.chapterSelected = chapterIndex;

    counterEl.textContent = pad(index + 1) + ' / ' + pad(config.slides.length);
    titleEl.textContent = config.meta.title || '';
    stage.dataset.slide = slide.id;
    if (slide.meta.chapter) slideEl.dataset.chapter = slide.meta.chapter;
    else delete slideEl.dataset.chapter;
    document.title = slide.title.join(' ') + ' — ' + (config.meta.title || 'presentation');

    if (Navigation.isSpatial(slide.type)) {
      slideEl.hidden = !returning;
      setSpatialVisible(true);
      const options = slide.type === 'section-divider'
        ? { chapter: state.chapterSelected }
        : slide.type === 'closing' ? { subtitle: slide.subtitle, note: slide.meta.note }
        : { chapter: state.chapterSelected };
      const sceneReady = SpatialStage.show(sceneFor(slide), options);
      if (returning) SpatialStage.finish();
      await Promise.all([sceneReady, returning ? transitionReading(false, Math.max(0, previousChapter)) : Promise.resolve()]);
      slideEl.hidden = true;
    } else {
      if (!entering) {
        SpatialStage.hideOpening();
        setSpatialVisible(false);
      }
      slideEl.innerHTML = SlideRenderer.render(slide, config, index, config.slides.length);
      slideEl.hidden = false;
      slideEl.classList.remove('arrive');
      void slideEl.offsetWidth;
      slideEl.classList.add('arrive');
      Media.activate(slideEl);
      if (entering) {
        await transitionReading(true);
      }
    }

  }

  // --- actions ---
  function goto(index) {
    index = Math.max(0, Math.min(config.slides.length - 1, index));
    if (index === state.index) return Promise.resolve();
    return renderSlide(index);
  }

  async function enterChapter() {
    const chapter = config.chapters[state.chapterSelected];
    if (!chapter) return;
    const target = config.slides.findIndex(s => s.id === chapter.firstSlideId);
    if (state.returnIndex != null && Navigation.chapterIndexOfSlide(config, state.returnIndex) === state.chapterSelected) {
      const back = state.returnIndex; state.returnIndex = null; await goto(back);
    } else {
      state.returnIndex = null; await goto(target);
    }
  }

  async function execute(action) {
    if (!action) return;
    switch (action.type) {
      case 'goto': state.returnIndex = null; await goto(action.index); break;
      case 'next': {
        const currentChapter = Navigation.chapterIndexOfSlide(config, state.index);
        const nextChapter = Navigation.chapterIndexOfSlide(config, state.index + 1);
        if (currentChapter >= 0 && nextChapter > currentChapter) {
          state.returnIndex = state.index;
          state.chapterSelected = nextChapter;
          await goto(1);
        } else await goto(state.index + 1);
        break;
      }
      case 'previous': await goto(state.index - 1); break;
      case 'openContents':
        if (state.index === 1) break;
        state.returnIndex = state.index === 0 ? null : state.index;
        await goto(1);
        break;
      case 'cancelContents': {
        const back = state.returnIndex == null ? 0 : state.returnIndex;
        state.returnIndex = null;
        await goto(back);
        break;
      }
      case 'selectChapter': {
        state.chapterSelected = Math.max(0, Math.min(config.chapters.length - 1, state.chapterSelected + action.delta));
        await SpatialStage.show('contents', { chapter: state.chapterSelected });
        break;
      }
      case 'selectChapterTo': {
        state.chapterSelected = Math.max(0, Math.min(config.chapters.length - 1, action.index));
        await SpatialStage.show('contents', { chapter: state.chapterSelected });
        break;
      }
      case 'enterChapter': await enterChapter(); break;
      case 'fullscreen': toggleFullscreen(); break;
      default: break;
    }
  }

  function dispatch(action) {
    if (!action || !initialized) return;
    // Fullscreen must run in the key event's user activation, not an animation queue.
    if (action.type === 'fullscreen') { toggleFullscreen(); return; }
    if (state.busy) {
      state.pending = action;
      SpatialStage.finish();
      pageAnimations.forEach(animation => animation.finish());
      return;
    }
    state.busy = true;
    execute(action).catch(error => fail(error && error.message)).finally(completeDispatch);
  }

  function completeDispatch() {
    state.busy = false;
    const next = state.pending;
    state.pending = null;
    if (next) dispatch(next);
  }

  function toggleFullscreen() {
    const done = () => fit();
    const button = document.getElementById('fullscreen');
    const rejected = () => {
      button.title = '浏览器拒绝全屏请求，请使用 F11。';
      button.setAttribute('aria-label', button.title);
      done();
    };
    button.title = '';
    button.setAttribute('aria-label', '全屏');
    if (document.fullscreenElement) document.exitFullscreen().then(done).catch(rejected);
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().then(done).catch(rejected);
    else rejected();
  }

  // Opening overlay buttons use the same intent queue as keyboard and footer controls.
  document.addEventListener('presentation-action', event => {
    const detail = event.detail || {};
    if (detail.type === 'openChapter') {
      state.chapterSelected = Math.max(0, Math.min(config.chapters.length - 1, detail.index));
      dispatch({ type: 'enterChapter' });
    } else dispatch(detail);
  });

  // --- controls ---
  document.getElementById('prev').onclick = () => dispatch(Navigation.intent('ArrowLeft', state, config));
  document.getElementById('next').onclick = () => dispatch(Navigation.intent('ArrowRight', state, config));
  document.getElementById('contents').onclick = () => dispatch({ type: 'openContents' });
  document.getElementById('fullscreen').onclick = () => toggleFullscreen();

  addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'Escape') {
      if (!event.repeat && document.fullscreenElement) {
        document.exitFullscreen().then(fit).catch(fit);
      }
      return;
    }
    const target = event.target;
    if (target.isContentEditable || (target.closest && target.closest('input,textarea,select'))) return;
    const fullscreen = event.key.toLowerCase() === 'f';
    if (!fullscreen && target.closest && target.closest('button,a')) return;
    const action = Navigation.intent(event.key, state, config);
    const handled = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', ' ', 'Enter', 'PageDown', 'PageUp', 'Home', 'End', 'Backspace'];
    const mediaKey = Media.active && ['p', 'm'].includes(event.key.toLowerCase());
    if (action || mediaKey || handled.includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    if (Media.active && (event.key === 'p' || event.key === 'P' || event.key === 'm' || event.key === 'M')) {
      event.preventDefault(); Media.handleKey(event.key); return;
    }
    dispatch(action);
  });

  let controlTimer = null;
  function revealControls() {
    document.body.classList.add('show-controls');
    clearTimeout(controlTimer);
    controlTimer = setTimeout(() => document.body.classList.remove('show-controls'), 2000);
  }
  addEventListener('pointermove', revealControls);
  addEventListener('keydown', revealControls);

  // --- boot ---
  async function boot() {
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([
          document.fonts.load('600 150px "Presentation Serif SC"'),
          document.fonts.load('500 30px "Presentation Sans SC"'),
          document.fonts.load('400 20px "Presentation Mono"'),
        ]);
      } catch (error) { /* fall back to system fonts */ }
    }
    const ok = SpatialStage.init(spatialEl, config);
    if (!ok) {
      // Static fallback: keep the first reading page reachable instead of a blank stage.
      slideEl.innerHTML = '<header class="slide-eyebrow"><span>STATIC FALLBACK</span></header><h1>' + SlideRenderer.escape(config.meta.title) + '</h1>';
      slideEl.hidden = false;
    }
    fit();
    initialized = true;
    renderSlide(0).catch(error => fail(error && error.message)).finally(completeDispatch);
    revealControls();
    stage.dataset.ready = 'true';
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot);
  else boot();

  // Test-only handle; enabled explicitly with ?debug=1 so it is not a public surface.
  if (location.search.includes('debug=1')) {
    window.PRESENTATION = {
      goto: index => dispatch({ type: 'goto', index }),
      state,
      config,
    };
  }
})();
