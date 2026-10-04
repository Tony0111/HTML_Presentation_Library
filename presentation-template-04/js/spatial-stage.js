/* Canvas-only opening adapter; preserves the shared presentation navigation contract. */
(function () {
  'use strict';
  let opening, canvas, context, ready = false;
  let width = 1920, height = 1080, scale = 1, raf = null;
  function render(now) { if (opening?.active) opening.update(now, context); }
  function loop(now) {
    raf = null;
    if (document.hidden) return;
    render(now);
    if (opening?.active) raf = requestAnimationFrame(loop);
  }
  function resume() { if (raf === null && opening?.active) raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', resume);
  window.SpatialStage = {
    init(el, config) {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
      if (!context) return false;
      canvas.style.cssText = 'width:100%;height:100%;';
      el.appendChild(canvas);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('reduced') === '1';
      opening = EditorialOpening.create(config, reduced);
      ready = true;
      return true;
    },
    show(name, options) { const result = opening.show(name, options); render(performance.now()); resume(); return result; },
    finish() { opening?.finish(); render(performance.now()); },
    hideOpening() { opening?.hide(); if (raf !== null) cancelAnimationFrame(raf); raf = null; },
    get ready() { return ready; },
    get failed() { return !ready; },
    resize(w = 1920, h = 1080, s = 1) {
      width = w; height = h; scale = s;
      if (!canvas) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale * ratio);
      canvas.height = Math.round(height * scale * ratio);
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      opening.resize(width, height);
      render(performance.now());
    }
  };
})();
