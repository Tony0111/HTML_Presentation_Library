/* Paper-cut opening: layered Three.js paper pieces plus an interactive DOM story. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  const colors = ['#c84936', '#f5b544', '#4f8a6b', '#79b8c7', '#f9f0d8'];

  function create(config, reduced) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, W / H, 1, 6000);
    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x324968, 2.1));
    const light = new THREE.DirectionalLight(0xfff4d9, 2.8);
    light.position.set(-350, 800, 1200); scene.add(light);
    const stage = document.getElementById('stage');
    const esc = SlideRenderer.escape;
    const cover = config.slides.find(s => s.type === 'cover') || { title: [config.meta.title] };
    const contents = config.slides.find(s => s.type === 'contents') || { title: ['目录'] };
    const chapters = config.chapters || [];
    const el = document.createElement('section');
    el.id = 'editorial-opening'; el.hidden = true;
    el.setAttribute('aria-label', '封面与目录');
    el.innerHTML = `
      <div class="paper-sun" aria-hidden="true"></div><div class="paper-hill paper-hill-a" aria-hidden="true"></div>
      <div class="paper-hill paper-hill-b" aria-hidden="true"></div><div class="paper-plant paper-plant-a" aria-hidden="true"></div>
      <div class="paper-plant paper-plant-b" aria-hidden="true"></div><div class="paper-corner" aria-hidden="true"></div>
      <header class="opening-masthead"><span class="opening-brand">${esc(config.meta.display || config.meta.title)}</span>
        <span class="opening-edition">${esc(config.meta.meta || '')}</span><span class="opening-mark" aria-hidden="true">*</span></header>
      <div class="opening-cover"><span class="opening-kicker">${esc(config.meta.kicker || '')}</span>
        <h1>${cover.title.map(line => `<span>${esc(line)}</span>`).join('')}</h1>
        <p class="opening-subtitle">${esc(config.meta.subtitle || '')}</p>
        <div class="opening-byline"><i></i><span>${esc(config.meta.author || '')}</span></div>
        <button class="cover-enter" type="button" aria-label="进入目录"><span>START</span><b>+</b></button></div>
      <div class="opening-contents"><div class="opening-contents-head"><span class="opening-kicker">THE READING PATH</span>
        <h1>${esc(contents.title.join(' '))}</h1><span class="opening-chapter-total">${String(chapters.length).padStart(2, '0')} CHAPTERS</span></div>
        <ol class="opening-chapters" style="--chapters:${chapters.length}">${chapters.map((c, i) => {
          const start = config.slides.findIndex(s => s.id === c.firstSlideId) + 1;
          return `<li><button type="button" data-chapter="${i}" aria-label="进入第 ${i + 1} 章：${esc(c.title)}">
            <span class="chapter-burst" aria-hidden="true"></span><span class="opening-chapter-number">${esc(c.number)}</span>
            <span class="opening-chapter-title">${esc(c.title)}</span><span class="opening-chapter-en">${esc(c.english)}</span>
            <span class="opening-chapter-pages">P.${String(start).padStart(2, '0')}</span><span class="opening-chapter-plus">+</span></button></li>`;
        }).join('')}</ol></div>
      <footer class="opening-footer"><span>${esc(config.meta.title)}</span><span class="opening-footer-index"></span></footer>`;
    stage.appendChild(el);

    const pieces = [];
    for (let i = 0; i < 18; i++) {
      const piece = new THREE.Mesh(new THREE.CircleGeometry(70 + (i % 3) * 28, i % 2 ? 5 : 6),
        new THREE.MeshLambertMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide }));
      piece.userData = { i, x: (i % 6 - 2.5) * 350, y: (Math.floor(i / 6) - 1) * 260, z: -i * 22 };
      root.add(piece); pieces.push(piece);
    }
    let active = false, selected = 0, progress = 0, from = 0, to = 0, start = 0, animating = false, resolve;
    let logicalWidth = W, pointer = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
    function emit(action) { document.dispatchEvent(new CustomEvent('presentation-action', { detail: action })); }
    el.querySelector('.cover-enter').onclick = () => emit({ type: 'openContents' });
    el.querySelectorAll('[data-chapter]').forEach(button => {
      const index = Number(button.dataset.chapter);
      button.onpointerenter = () => { if (active) emit({ type: 'selectChapterTo', index }); };
      button.onfocus = () => { if (active) emit({ type: 'selectChapterTo', index }); };
      button.onclick = () => emit({ type: 'openChapter', index });
    });
    stage.addEventListener('pointermove', event => {
      if (!active || reduced) return;
      const rect = stage.getBoundingClientRect();
      pointer = { x: (event.clientX - rect.left) / rect.width - .5, y: (event.clientY - rect.top) / rect.height - .5 };
    });
    stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
    function settle(value = true) { if (resolve) { const done = resolve; resolve = null; done(value); } }
    function show(name, options = {}) {
      active = true; el.hidden = false; selected = options.chapter || 0;
      el.dataset.mode = name; el.dataset.reduced = String(reduced); stage.dataset.opening = name;
      el.querySelector('.opening-footer-index').textContent = name === 'cover' ? '01 / COVER' : '02 / CONTENTS';
      el.querySelectorAll('[data-chapter]').forEach((button, i) => {
        button.classList.toggle('is-selected', i === selected);
        button.setAttribute('aria-current', i === selected ? 'true' : 'false');
      });
      settle(false); from = progress; to = name === 'contents' ? 1 : 0; start = performance.now();
      animating = !reduced && Math.abs(to - from) > .001;
      if (!animating) { progress = to; update(start); return Promise.resolve(true); }
      return new Promise(done => { resolve = done; });
    }
    function update(now) {
      if (!active) return;
      if (animating) { const t = clamp((now - start) / 980); progress = from + (to - from) * ease(t); if (t === 1) { animating = false; settle(); } }
      const p = progress, time = reduced ? 0 : now * .00045;
      smooth.x += (pointer.x - smooth.x) * .06; smooth.y += (pointer.y - smooth.y) * .06;
      camera.position.set(smooth.x * 38, -smooth.y * 30, F - p * 110); camera.lookAt(0, 0, -120);
      const spread = Math.min(290, (logicalWidth - 140) / Math.max(1, chapters.length));
      pieces.forEach(piece => {
        const d = piece.userData, row = Math.floor(d.i / 6), chapter = d.i % Math.max(1, chapters.length);
        const targetX = (chapter - (chapters.length - 1) / 2) * spread + (row - 1) * 45;
        piece.position.set(d.x * (1 - p) + targetX * p, d.y * (1 - p) + (row - 1) * 75 * p + Math.sin(time + d.i) * 9, d.z - p * 90);
        piece.rotation.set(0, (d.i % 2 ? -1 : 1) * (.32 * (1 - p) + .1 * p), time * .12 + d.i * .18);
        piece.scale.setScalar((1.25 - p * .45) * (d.i % 4 === selected ? 1.13 : 1));
      });
    }
    return { scene, camera, show, update,
      get active() { return active; },
      hide() { active = false; animating = false; settle(false); el.hidden = true; delete stage.dataset.opening; },
      finish() { if (animating) { progress = to; animating = false; update(performance.now()); settle(); } },
      resize(width, height) { logicalWidth = width; camera.aspect = width / height; camera.fov = 2 * Math.atan(height / 2 / F) * 180 / Math.PI; camera.updateProjectionMatrix(); }
    };
  }
  window.EditorialOpening = { create };
})();
