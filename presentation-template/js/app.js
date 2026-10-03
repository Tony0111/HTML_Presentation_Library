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
  if (config.theme !== 'editorial-spatial') { fail('未知主题：' + config.theme + '。首版只支持 editorial-spatial。'); return; }

  SlideRenderer.setReferences(config.references);
  const pad = n => String(n).padStart(2, '0');
  const state = { index: 0, chapterSelected: 0, returnIndex: null, busy: false, pending: null };

  // --- canvas scaling ---
  function fit() {
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `scale(${scale})`;
    stage.style.left = (innerWidth - 1920 * scale) / 2 + 'px';
    stage.style.top = (innerHeight - 1080 * scale) / 2 + 'px';
    SpatialStage.resize();
  }
  addEventListener('resize', fit);

  function setSpatialVisible(visible) {
    spatialEl.style.transition = 'opacity 320ms ease';
    spatialEl.style.opacity = visible ? '1' : '0';
    spatialEl.style.pointerEvents = 'none';
  }

  function sceneFor(slide) {
    if (slide.type === 'section-divider') return 'divider';
    return slide.type;
  }

  async function renderSlide(index, direction) {
    const slide = config.slides[index];
    if (!slide) return;
    Media.release();
    state.index = index;
    if (config.chapters.some(c => c.id === slide.meta.chapter)) {
      state.chapterSelected = Math.max(0, Navigation.chapterIndexOfSlide(config, index));
    }

    if (Navigation.isSpatial(slide.type)) {
      slideEl.hidden = true;
      setSpatialVisible(true);
      const options = slide.type === 'section-divider'
        ? { chapter: state.chapterSelected }
        : slide.type === 'closing' ? { subtitle: slide.subtitle, note: slide.meta.note } : {};
      await SpatialStage.show(sceneFor(slide), options);
    } else {
      setSpatialVisible(false);
      slideEl.innerHTML = SlideRenderer.render(slide, config, index, config.slides.length);
      slideEl.hidden = false;
      slideEl.classList.remove('arrive');
      void slideEl.offsetWidth;
      slideEl.classList.add('arrive');
      Media.activate(slideEl);
    }

    counterEl.textContent = pad(index + 1) + ' / ' + pad(config.slides.length);
    titleEl.textContent = config.meta.title || '';
    stage.dataset.slide = slide.id;
    document.title = slide.title.join(' ') + ' — ' + (config.meta.title || 'presentation');
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
    if (state.returnIndex != null && config.slides[state.returnIndex].meta.chapter === chapter.id) {
      const back = state.returnIndex; state.returnIndex = null; await goto(back);
    } else {
      state.returnIndex = null; await goto(target);
    }
  }

  async function execute(action) {
    if (!action) return;
    switch (action.type) {
      case 'goto': state.returnIndex = null; await goto(action.index); break;
      case 'next': await goto(state.index + 1); break;
      case 'previous': await goto(state.index - 1); break;
      case 'openContents': state.returnIndex = state.index; await goto(1); break;
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
    if (state.busy) { state.pending = action; return; }
    if (!action) return;
    state.busy = true;
    execute(action).catch(error => fail(error && error.message)).finally(() => {
      state.busy = false;
      if (state.pending) { const next = state.pending; state.pending = null; dispatch(next); }
    });
  }

  function toggleFullscreen() {
    const done = () => fit();
    if (document.fullscreenElement) document.exitFullscreen().then(done).catch(done);
    else document.documentElement.requestFullscreen().then(done).catch(done);
  }

  // --- controls ---
  document.getElementById('prev').onclick = () => dispatch(Navigation.intent('ArrowLeft', state, config));
  document.getElementById('next').onclick = () => dispatch(Navigation.intent('ArrowRight', state, config));
  document.getElementById('contents').onclick = () => dispatch({ type: 'openContents' });
  document.getElementById('fullscreen').onclick = () => toggleFullscreen();

  addEventListener('keydown', event => {
    if (event.target.closest && event.target.closest('button,input,select,a')) return;
    if (Media.active && (event.key === 'p' || event.key === 'P' || event.key === 'm' || event.key === 'M')) {
      event.preventDefault(); Media.handleKey(event.key); return;
    }
    const handled = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', ' ', 'Enter', 'PageDown', 'PageUp', 'Home', 'End', 'Backspace'];
    if (handled.includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    dispatch(Navigation.intent(event.key, state, config));
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
    state.busy = true;
    renderSlide(0).finally(() => { state.busy = false; });
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
