/* Original Library planet; labels and navigation remain accessible DOM. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  function create(config, reduced, spatial = true) {
    const scene = spatial ? new THREE.Scene() : null;
    const camera = spatial ? new THREE.PerspectiveCamera(37, W / H, 1, 6000) : null;
    const root = spatial ? new THREE.Group() : null;
    const stage = document.getElementById('stage'), esc = SlideRenderer.escape;
    const cover = config.slides.find(s => s.type === 'cover');
    const contents = config.slides.find(s => s.type === 'contents');
    const chapters = config.chapters || [];
    const el = document.createElement('section');
    el.id = 'editorial-opening'; el.hidden = true;
    el.setAttribute('aria-label', '封面与目录');
    el.dataset.dense = String(chapters.length > 4);
    el.dataset.spatial = String(spatial); el.dataset.planet = 'loading';
    el.innerHTML = `
      <img class="planet-poster" src="assets/models/stylized-planet-poster.png" alt="" aria-hidden="true">
      <header class="opening-masthead"><span class="opening-brand">${esc(config.meta.display || config.meta.title)}</span>
        <span class="opening-edition">${esc(config.meta.meta || '')}</span><span class="opening-mark" aria-hidden="true"></span></header>
      <div class="opening-cover"><span class="opening-kicker">${esc(config.meta.kicker || '')}</span>
        <h1>${cover.title.map(line => `<span>${esc(line)}</span>`).join('')}</h1>
        <p class="opening-subtitle">${esc(config.meta.subtitle || '')}</p>
        <div class="opening-byline"><i></i><span>${esc(config.meta.author || '')}</span></div>
        <button class="cover-enter" type="button" aria-label="进入目录" title="进入目录"><span>进入目录</span><i data-lucide="arrow-up-right" aria-hidden="true"></i></button></div>
      <div class="opening-contents"><div class="opening-contents-head"><span class="opening-kicker">THE READING PATH</span>
        <h1>${esc(contents.title.join(' '))}</h1><span class="opening-chapter-total">${String(chapters.length).padStart(2, '0')} CHAPTERS</span></div>
        <ol class="opening-chapters" style="--chapters:${Math.min(4, Math.max(1, chapters.length))}">${chapters.map((c, i) => {
          const start = config.slides.findIndex(s => s.id === c.firstSlideId) + 1;
          return `<li><button type="button" data-chapter="${i}" aria-label="进入第 ${i + 1} 章：${esc(c.title)}">
            <span class="chapter-facet" aria-hidden="true"></span><span class="opening-chapter-number">${esc(c.number)}</span>
            <span class="opening-chapter-title">${esc(c.title)}</span><span class="opening-chapter-en">${esc(c.english)}</span>
            <span class="opening-chapter-pages">P.${String(start).padStart(2, '0')}</span><i class="opening-chapter-plus" data-lucide="arrow-up-right" aria-hidden="true"></i></button></li>`;
        }).join('')}</ol></div>
      <footer class="opening-footer"><span>${esc(config.meta.title)}</span><span class="opening-footer-index"></span></footer>`;
    stage.appendChild(el);
    if (window.lucide) lucide.createIcons();
    if (spatial) {
      scene.add(root);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x091d0d, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 3);
      key.position.set(600, 1000, 800); scene.add(key);
    }
    let active = false, selected = 0, progress = 0, from = 0, to = 0, start = 0, animating = false, resolve;
    let pointer = { x:0, y:0 }, smooth = { x:0, y:0 }, stars = null, spin = 0, lastTime = null;
    const ready = !spatial ? Promise.resolve(false) : new Promise(done => {
      if (!THREE.GLTFLoader || !window.LIBRARY_PLANET_GLTF) { el.dataset.planet = 'failed'; done(false); return; }
      new THREE.GLTFLoader().parse(window.LIBRARY_PLANET_GLTF, '', gltf => {
        const model = gltf.scene, bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
        const scale = 660 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale); model.position.copy(center).multiplyScalar(-scale);
        root.add(model);
        // Deterministic stars keep reduced-motion captures stable.
        const positions = [];
        for (let i = 0; i < 160; i++) {
          const angle = i * 2.399963, radius = 370 + (i % 11) * 18;
          positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, -200 - i % 7 * 30);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color:0x6a716c, size:2.5, transparent:true, opacity:.5 }));
        root.add(stars); el.dataset.planet = 'ready'; update(performance.now()); done(true);
      }, () => { el.dataset.planet = 'failed'; done(false); });
    });
    function emit(action) { document.dispatchEvent(new CustomEvent('presentation-action', { detail:action })); }
    el.querySelector('.cover-enter').onclick = () => emit({ type:'openContents' });
    el.querySelectorAll('[data-chapter]').forEach(button => {
      const index = Number(button.dataset.chapter);
      button.onpointermove = event => {
        if (active && (event.movementX || event.movementY)) emit({ type:'selectChapterTo', index });
      };
      button.onfocus = () => { if (active) emit({ type:'selectChapterTo', index }); };
      button.onclick = () => emit({ type:'openChapter', index });
    });
    stage.addEventListener('pointermove', event => {
      if (!active || reduced) return;
      const rect = stage.getBoundingClientRect();
      pointer = { x:(event.clientX - rect.left) / rect.width - .5, y:(event.clientY - rect.top) / rect.height - .5 };
    });
    stage.addEventListener('pointerleave', () => { pointer = { x:0, y:0 }; });
    function settle(value = true) { if (resolve) { const done = resolve; resolve = null; done(value); } }
    function show(name, options = {}) {
      active = true; el.hidden = false; selected = options.chapter || 0;
      el.dataset.mode = name; el.dataset.reduced = String(reduced); stage.dataset.opening = name;
      el.querySelector('.opening-cover').inert = name !== 'cover';
      el.querySelector('.opening-contents').inert = name !== 'contents';
      el.querySelector('.opening-footer-index').textContent = name === 'cover' ? '01 / COVER' : '02 / CONTENTS';
      el.querySelectorAll('[data-chapter]').forEach((button, i) => {
        button.classList.toggle('is-selected', i === selected);
        button.setAttribute('aria-current', i === selected ? 'true' : 'false');
      });
      settle(false); from = progress; to = name === 'contents' ? 1 : 0; start = performance.now();
      animating = spatial && !reduced && Math.abs(to - from) > .001;
      if (!animating) { progress = to; update(start); return Promise.resolve(true); }
      return new Promise(done => { resolve = done; });
    }
    function update(now) {
      if (!active || !spatial) return;
      if (animating) {
        const t = clamp((now - start) / 980);
        progress = from + (to - from) * ease(t);
        if (t === 1) { animating = false; settle(); }
      }
      const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, .05);
      lastTime = now;
      if (!reduced) spin += dt * .12;
      smooth.x += (pointer.x - smooth.x) * .06; smooth.y += (pointer.y - smooth.y) * .06;
      camera.position.set(smooth.x * 44, -smooth.y * 36, F); camera.lookAt(0, 0, 0);
      root.position.set(450 * (1 - progress) + (selected - (chapters.length - 1) / 2) * 110 * progress, -20 - progress * 300, 0);
      root.rotation.set(.08, -.25 + spin + smooth.x * .08, 0);
      root.scale.setScalar(1 - progress * .62);
      if (stars) stars.rotation.y = -spin * .6;
    }
    return { scene, camera, show, update, ready,
      get active() { return active; },
      hide() { active = false; animating = false; lastTime = null; settle(false); el.hidden = true; delete stage.dataset.opening; },
      finish() { if (animating) { progress = to; animating = false; update(performance.now()); settle(); } },
      setStatic() { spatial = false; reduced = true; animating = false; progress = to; el.dataset.reduced = 'true'; el.dataset.spatial = 'false'; settle(); },
      resize(width, height) {
        if (!camera) return;
        camera.aspect = width / height;
        camera.fov = 2 * Math.atan(height / 2 / F) * 180 / Math.PI;
        camera.updateProjectionMatrix();
      }
    };
  }
  window.EditorialOpening = { create };
})();
