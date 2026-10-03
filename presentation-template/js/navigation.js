/* Pure navigation intent: maps a key + state to an action. No DOM, no side effects. */
(function () {
  'use strict';
  const FORWARD = ['ArrowRight', 'ArrowDown', ' ', 'PageDown'];
  const COVER_FORWARD = ['ArrowRight', 'ArrowDown', ' ', 'Enter'];
  const SPATIAL = new Set(['cover', 'contents', 'section-divider', 'closing']);

  function firstContentIndex(config) {
    return config.slides.findIndex(s => !SPATIAL.has(s.type) || s.type === 'section-divider');
  }

  function chapterIndexOfSlide(config, index) {
    const chapter = config.slides[index] && config.slides[index].meta.chapter;
    const chapters = config.chapters || [];
    const found = chapters.findIndex(c => c.id === chapter);
    const type = config.slides[index] && config.slides[index].type;
    return found < 0 && (type === 'references' || type === 'closing') ? chapters.length - 1 : found;
  }

  function intent(key, state, config) {
    if (typeof key !== 'string') return null;
    if (key.toLowerCase() === 'f') return { type: 'fullscreen' };
    const slides = config.slides;
    const i = state.index;
    const slide = slides[i];
    if (!slide) return null;

    if (slide.type === 'contents') {
      if (key === 'ArrowRight') return { type: 'selectChapter', delta: 1 };
      if (key === 'ArrowLeft') return { type: 'selectChapter', delta: -1 };
      if (key === 'Home') return { type: 'selectChapterTo', index: 0 };
      if (key === 'End') return { type: 'selectChapterTo', index: config.chapters.length - 1 };
      if (/^[1-8]$/.test(key)) {
        const index = Number(key) - 1;
        return index < config.chapters.length ? { type: 'selectChapterTo', index } : null;
      }
      if (key === 'Enter' || key === ' ') return { type: 'enterChapter' };
      if (key === 'ArrowUp' || key === 'Backspace') return { type: 'cancelContents' };
      return null;
    }

    if (slide.type === 'cover') {
      return COVER_FORWARD.includes(key) ? { type: 'goto', index: 1 } : null;
    }

    if (FORWARD.includes(key)) return { type: 'next' };
    if (key === 'ArrowLeft' || key === 'PageUp') return { type: 'previous' };
    if (key === 'ArrowUp' || key === 'Backspace') return { type: 'openContents' };
    if (key === 'Home') return { type: 'goto', index: firstContentIndex(config) };
    if (key === 'End') return { type: 'goto', index: slides.length - 1 };
    return null;
  }

  window.Navigation = { intent, isSpatial: type => SPATIAL.has(type), chapterIndexOfSlide, firstContentIndex };
})();
