/* Shared Three.js renderer for the editorial opening and particle Thanks. */
(function () {
  'use strict';
  const W = 1920, H = 1080;
  let renderer, opening, thanks;
  let failed = false, ready = false, raf = null;

  function init(el, config) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      || new URLSearchParams(location.search).get('reduced') === '1';
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      renderer.domElement.style.cssText = 'width:100%;height:100%;';
      el.appendChild(renderer.domElement);
    } catch (error) { failed = true; return false; }

    opening = EditorialOpening.create(config, reduced);
    thanks = ParticleThanks.create(reduced);
    ready = true;
    loop();
    return true;
  }

  function show(name, options) {
    if (failed) return Promise.resolve(false);
    if (name === 'thanks') {
      opening.hide();
      return thanks.show();
    }
    if (name === 'cover' || name === 'contents') {
      thanks.hide();
      return opening.show(name, options);
    }
    throw new Error('Unsupported spatial page: ' + name);
  }

  function render(now) {
    const active = thanks && thanks.active ? thanks : opening && opening.active ? opening : null;
    if (!active) return;
    active.update(now);
    renderer.render(active.scene, active.camera);
  }

  function loop() {
    raf = null;
    if (document.hidden) return;
    render(performance.now());
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && raf === null && ready) loop();
  });

  window.SpatialStage = {
    init, show,
    finish() { if (opening && opening.active) opening.finish(); },
    hideOpening() { if (opening) opening.hide(); if (thanks) thanks.hide(); },
    get ready() { return ready; },
    get failed() { return failed; },
    resize(width = W, height = H, scale = 1) {
      if (!renderer || !ready) return;
      opening.resize(width, height);
      thanks.resize(width, height, scale);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(width * scale, height * scale, false);
      render(performance.now());
    }
  };
})();
