/* Cubist opening: an extruded, multi-view portrait recomposes into chapter studies. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  const colors = ['#cc4331', '#e8bf3f', '#267d78', '#355ab1', '#f4f4f0'];
  // Angular planes use different viewpoints and depths; the eyes deliberately disagree.
  const planes = [
    { points:[[-290,310],[-90,430],[185,390],[300,205],[275,-80],[85,-170],[-180,-20]], color:1, depth:54, z:-65 },
    { points:[[-290,310],[-190,70],[-110,-100],[-185,-245],[-350,-60]], color:3, depth:76, z:10 },
    { points:[[20,405],[265,300],[340,80],[210,-95],[145,120]], color:2, depth:90, z:0 },
    { points:[[-90,430],[125,440],[265,300],[90,295],[-25,225]], color:0, depth:65, z:75 },
    { points:[[-185,250],[-55,290],[80,80],[-30,-115],[-185,-245],[-235,-75]], color:4, depth:80, z:85 },
    { points:[[80,275],[210,245],[280,20],[135,-165],[40,-60],[80,80]], color:0, depth:90, z:110 },
    { points:[[-35,250],[85,145],[45,20],[160,-25],[35,-85],[-60,-35]], color:1, depth:145, z:175 },
    { points:[[-140,-115],[35,-85],[135,-165],[55,-290],[-65,-300],[-185,-245]], color:2, depth:90, z:85 },
    { points:[[-65,-300],[55,-290],[110,-390],[-70,-425],[-155,-360]], color:4, depth:60, z:10 },
    { points:[[-350,-410],[-155,-360],[-70,-425],[110,-390],[290,-350],[395,-555],[-435,-555]], color:0, depth:125, z:-55 },
    { points:[[110,-390],[290,-350],[395,-555],[215,-555]], color:3, depth:145, z:25 },
    { points:[[-435,-555],[-350,-410],[-200,-420],[-140,-555]], color:1, depth:80, z:30 },
    { points:[[-230,325],[-120,375],[20,405],[-25,225],[-150,245]], color:-1, depth:50, z:130 },
    { points:[[185,390],[265,300],[340,80],[325,315],[265,440]], color:-1, depth:60, z:65 },
    { points:[[-175,140],[-115,173],[-40,140],[-115,115]], color:4, depth:20, z:190 },
    { points:[[-121,155],[-102,147],[-106,125],[-123,124]], color:-1, depth:25, z:214 },
    { points:[[136,190],[177,167],[173,91],[146,115]], color:4, depth:25, z:218 },
    { points:[[154,163],[168,154],[164,126],[150,136]], color:-1, depth:24, z:245 },
    { points:[[-60,-152],[35,-133],[105,-169],[18,-182]], color:-1, depth:30, z:200 },
    { points:[[-45,-187],[18,-182],[80,-191],[8,-212]], color:4, depth:24, z:208 }
  ];

  function create(config, reduced, spatial = true) {
    const scene = spatial ? new THREE.Scene() : null;
    const camera = spatial ? new THREE.PerspectiveCamera(37, W / H, 1, 6000) : null;
    const root = spatial ? new THREE.Group() : null;
    if (spatial) {
      scene.add(root);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x363b47, 1.5));
      const light = new THREE.DirectionalLight(0xffffff, 2.6);
      light.position.set(-650, 1000, 1400); scene.add(light);
    }
    const stage = document.getElementById('stage');
    const esc = SlideRenderer.escape;
    const cover = config.slides.find(s => s.type === 'cover') || { title: [config.meta.title] };
    const contents = config.slides.find(s => s.type === 'contents') || { title: ['目录'] };
    const chapters = config.chapters || [];
    const el = document.createElement('section');
    el.id = 'editorial-opening'; el.hidden = true;
    el.setAttribute('aria-label', '封面与目录');
    el.dataset.dense = String(chapters.length > 4);
    el.innerHTML = `
      <div class="cubist-ground" aria-hidden="true"></div>
      <div class="cubist-fallback" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
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
    el.dataset.spatial = String(spatial);
    if (window.lucide) lucide.createIcons();

    const pieces = [];
    for (let i = 0; spatial && i < planes.length; i++) {
      const plane = planes[i], shape = new THREE.Shape();
      plane.points.forEach(([x, y], n) => n ? shape.lineTo(x, y) : shape.moveTo(x, y));
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: plane.depth, bevelEnabled: false, steps: 1 });
      const piece = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color: plane.color < 0 ? '#20211f' : colors[plane.color], roughness: .9, metalness: 0, flatShading: true
      }));
      piece.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), new THREE.LineBasicMaterial({ color: 0x20211f })));
      piece.userData = { i, z: plane.z };
      root.add(piece); pieces.push(piece);
    }
    let active = false, selected = 0, progress = 0, from = 0, to = 0, start = 0, animating = false, resolve;
    let logicalWidth = W, pointer = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
    function emit(action) { document.dispatchEvent(new CustomEvent('presentation-action', { detail: action })); }
    el.querySelector('.cover-enter').onclick = () => emit({ type: 'openContents' });
    el.querySelectorAll('[data-chapter]').forEach(button => {
      const index = Number(button.dataset.chapter);
      button.onpointermove = event => {
        // Reappearing beneath a stationary pointer must not override keyboard selection.
        if (active && (event.movementX || event.movementY)) emit({ type: 'selectChapterTo', index });
      };
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
      if (animating) { const t = clamp((now - start) / 980); progress = from + (to - from) * ease(t); if (t === 1) { animating = false; settle(); } }
      const p = progress, time = reduced ? 0 : now * .00035;
      smooth.x += (pointer.x - smooth.x) * .06; smooth.y += (pointer.y - smooth.y) * .06;
      camera.position.set(smooth.x * 44, -smooth.y * 36, F); camera.lookAt(0, 0, 0);
      const columns = Math.min(4, Math.max(1, chapters.length));
      const spread = Math.min(400, (logicalWidth - 240) / columns);
      root.position.set(360 * (1 - p), -12 * (1 - p), 0);
      root.rotation.set(Math.sin(time) * .025 * (1 - p), -.12 * (1 - p) + smooth.x * .06, 0);
      pieces.forEach(piece => {
        const d = piece.userData, chapter = d.i % Math.max(1, chapters.length);
        const row = Math.floor(chapter / columns);
        const targetX = (chapter % columns - (columns - 1) / 2) * spread;
        const targetY = chapters.length > 4 ? (row ? -380 : -100) : -330;
        piece.position.set(targetX * p, targetY * p, d.z * (1 - p) - 100 * p + (chapter === selected ? 65 * p : 0));
        piece.rotation.set(0, (d.i % 2 ? -1 : 1) * p * .24, (d.i % 3 - 1) * p * .3);
        piece.scale.setScalar(.83 * (1 - p) + (chapter === selected ? .38 : .3) * p);
      });
    }
    return { scene, camera, show, update,
      get active() { return active; },
      hide() { active = false; animating = false; settle(false); el.hidden = true; delete stage.dataset.opening; },
      finish() { if (animating) { progress = to; animating = false; update(performance.now()); settle(); } },
      setStatic() {
        spatial = false; reduced = true; animating = false; progress = to;
        el.dataset.reduced = 'true'; el.dataset.spatial = 'false'; settle();
      },
      resize(width, height) {
        logicalWidth = width;
        if (!camera) return;
        camera.aspect = width / height;
        camera.fov = 2 * Math.atan(height / 2 / F) * 180 / Math.PI;
        camera.updateProjectionMatrix();
      }
    };
  }
  window.EditorialOpening = { create };
})();
