/* A single renderer: liquid-lens cover and a rotating ring of floating chapter screens. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600;
  const PANEL_WIDTH = 720, PANEL_HEIGHT = 405, PANEL_DEPTH = 22;
  const PANEL_SCALE = 0.62;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  let renderer, host, config, overlay, coverScene, coverCamera, screenScene, camera;
  let coverMaterial, screenRoot, reduced, failed = false, active = false;
  let closingScene, closingCamera;
  let mode = 'cover', selected = 0, raf = null, last = 0, gate = 0;
  let width = W, height = H, progress = 0, from = 0, to = 0, start = 0, resolve = null;
  let animating = false, hover = false, seen = false, carouselAngle = 0, carouselTarget = 0;
  const pointer = new THREE.Vector2(0.5, 0.5), target = new THREE.Vector2(0.5, 0.5);
  const panels = [];
  let chapterButtons = [];
  const projected = new THREE.Vector3();
  const corners = [
    new THREE.Vector3(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_DEPTH / 2 + 1),
    new THREE.Vector3(PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_DEPTH / 2 + 1),
    new THREE.Vector3(-PANEL_WIDTH / 2, PANEL_HEIGHT / 2, PANEL_DEPTH / 2 + 1),
    new THREE.Vector3(PANEL_WIDTH / 2, PANEL_HEIGHT / 2, PANEL_DEPTH / 2 + 1),
  ];
  const esc = value => SlideRenderer.escape(value);
  const pad = n => String(n).padStart(2, '0');

  function drawContours(g, w, h) {
    g.save(); g.scale(w / W, h / H);
    for (let i = -32; i < 112; i++) {
      g.beginPath();
      for (let y = -20; y <= 1100; y += 6) {
        const bend = Math.sin(y / 400 - 0.72) * 150 + Math.sin(y / 180 + i * 0.032) * 50;
        const x = 720 + i * 15 + bend + Math.sin(i * 0.038) * 74;
        if (y === -20) g.moveTo(x, y); else g.lineTo(x, y);
      }
      const fade = clamp((i + 18) / 38);
      g.strokeStyle = i % 5 === 0 ? `rgba(255,255,255,${0.52 * fade})` : `rgba(12,110,108,${0.27 * fade})`;
      g.lineWidth = i % 5 === 0 ? 1.6 : 1.1; g.stroke();
    }
    g.restore();
  }

  function contourTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    drawContours(g, W, H);
    // Fade the shared texture away from the text-heavy upper-left area.
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createLinearGradient(0, 0, W, H);
    mask.addColorStop(0, 'transparent'); mask.addColorStop(0.35, 'transparent');
    mask.addColorStop(0.75, 'rgba(0,0,0,0.7)'); mask.addColorStop(1, '#000');
    g.fillStyle = mask; g.fillRect(0, 0, W, H);
    document.getElementById('stage').style.setProperty('--contour-texture', `url("${canvas.toDataURL('image/png')}")`);
    return canvas;
  }

  let contours;

  function lineTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const g = canvas.getContext('2d');
    const base = g.createLinearGradient(0, 100, 1920, 950);
    base.addColorStop(0, '#f5fbf6'); base.addColorStop(0.40, '#e6f5ed');
    base.addColorStop(0.70, '#a3e1d8'); base.addColorStop(1, '#209f9e');
    g.fillStyle = base; g.fillRect(0, 0, 1920, 1080);
    const orange = g.createLinearGradient(0, 200, 500, 1080);
    orange.addColorStop(0, 'rgba(255,169,82,0)');
    orange.addColorStop(0.55, 'rgba(255,169,82,0)');
    orange.addColorStop(1, 'rgba(249,153,65,0.84)');
    g.fillStyle = orange; g.fillRect(0, 0, 1920, 1080);
    drawContours(g, W, H);
    const wash = g.createLinearGradient(0, 0, 1120, 0);
    wash.addColorStop(0, 'rgba(246,251,245,0.94)');
    wash.addColorStop(0.68, 'rgba(246,251,245,0.72)');
    wash.addColorStop(1, 'rgba(246,251,245,0)');
    g.fillStyle = wash; g.fillRect(0, 0, 1120, 1080);
    return canvas;
  }

  function createCover() {
    coverScene = new THREE.Scene();
    coverCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    coverCamera.position.z = 1;
    const texture = new THREE.CanvasTexture(lineTexture());
    coverMaterial = new THREE.ShaderMaterial({
      uniforms: { tex: { value: texture }, m: { value: pointer }, gate: { value: 0 },
        strength: { value: 0.58 }, radius: { value: 0.25 }, asp: { value: W / H } },
      vertexShader: 'varying vec2 u; void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `precision highp float; varying vec2 u;
        uniform sampler2D tex; uniform vec2 m; uniform float gate,strength,radius,asp;
        void main(){
          vec2 pos=vec2(u.x,u.y/asp), mp=vec2(m.x,m.y/asp);
          float k=1.-smoothstep(0.,radius,distance(pos,mp));
          k=k*k*(3.-2.*k)*gate;
          vec2 sampleUV=m+(u-m)*(1.-strength*k);
          gl_FragColor=texture2D(tex,sampleUV);
        }`,
      depthTest: false, depthWrite: false,
    });
    coverScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coverMaterial));
  }

  function panelTexture(chapter, index) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const g = canvas.getContext('2d');
    const style = getComputedStyle(chapterButtons[index]);
    const color = name => style.getPropertyValue(name).trim();
    const ink = color('--ink'), muted = color('--muted');
    const grad = g.createLinearGradient(0, 0, canvas.width, canvas.height);
    [[0, '--palette-start'], [0.32, '--palette-start'], [0.52, '--palette-mid'],
      [0.82, '--palette-blend'], [1, '--palette-main']].forEach(([stop, name]) => grad.addColorStop(stop, color(name)));
    g.fillStyle = grad; g.fillRect(0, 0, canvas.width, canvas.height);
    const accent = g.createLinearGradient(0, canvas.height, canvas.width * 0.45, 0);
    accent.addColorStop(0, color('--palette-glow')); accent.addColorStop(0.4, 'transparent');
    g.fillStyle = accent; g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(contours, 0, 0, canvas.width, canvas.height);
    g.fillStyle = muted; g.font = '500 23px "Presentation Mono", monospace';
    g.fillText('CHAPTER / ' + chapter.number, 56, 74);
    g.strokeStyle = color('--primary-light');
    g.beginPath(); g.moveTo(56, 108); g.lineTo(1224, 108); g.stroke();
    g.fillStyle = ink; g.font = 'italic 230px Georgia, serif';
    g.fillText(chapter.number, 48, 324);
    g.font = '600 84px "Presentation Serif SC", serif';
    g.fillText(chapter.title, 56, 510, 900);
    g.fillStyle = muted; g.font = '500 25px "Presentation Sans SC", sans-serif';
    g.fillText(chapter.english, 58, 566, 900);
    g.beginPath(); g.moveTo(56, 628); g.lineTo(1224, 628); g.stroke();
    const begin = config.slides.findIndex(s => s.id === chapter.firstSlideId);
    const next = config.chapters[index + 1];
    const end = next ? config.slides.findIndex(s => s.id === next.firstSlideId) : config.slides.length;
    g.font = '22px "Presentation Mono", monospace';
    g.fillText('P. ' + pad(begin + 1) + ' / ' + pad(end), 56, 684);
    g.font = '38px Georgia, serif'; g.fillText('↗', 1174, 684);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  function createScreens() {
    screenScene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36, W / H, 1, 10000);
    camera.position.set(0, 100, F); camera.lookAt(0, 0, 0);
    screenRoot = new THREE.Group(); screenScene.add(screenRoot);
    screenScene.add(new THREE.HemisphereLight(0xf4fffc, 0x426b68, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3.2);
    light.position.set(-650, 1100, 1300); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, { left: -1600, right: 1600, top: 1000, bottom: -1000, near: 1, far: 4000 });
    light.shadow.bias = -0.001; light.shadow.normalBias = 3;
    screenScene.add(light);
    const fill = new THREE.DirectionalLight(0xbceee8, 1.6);
    fill.position.set(1000, 200, -400); screenScene.add(fill);
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#4a8a85', roughness: 0.48, metalness: 0.25 });
    const backMat = new THREE.MeshStandardMaterial({ color: '#70b9b0', roughness: 0.52, metalness: 0.22 });
    const count = Math.max(1, config.chapters.length);
    const ringRadius = 760;
    config.chapters.forEach((chapter, i) => {
      const group = new THREE.Group(); screenRoot.add(group);
      group.scale.setScalar(PANEL_SCALE);
      const front = new THREE.MeshBasicMaterial({ map: panelTexture(chapter, i) });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, PANEL_DEPTH), [edgeMat, edgeMat, edgeMat, edgeMat, backMat, backMat]);
      chassis.castShadow = true; chassis.receiveShadow = true; group.add(chassis);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT), front);
      screen.position.z = PANEL_DEPTH / 2 + 1; screen.castShadow = true; group.add(screen);
      const theta = i / count * Math.PI * 2;
      group.position.set(Math.sin(theta) * ringRadius, Math.cos(theta * 2) * 18, Math.cos(theta) * ringRadius);
      group.rotation.y = theta;
      panels.push({ group, front, chassis });
    });
  }

  function createOverlay() {
    overlay = document.createElement('section');
    overlay.id = 'editorial-opening'; overlay.hidden = true;
    overlay.setAttribute('aria-label', '封面与章节目录');
    const cover = config.slides.find(s => s.type === 'cover');
    const contents = config.slides.find(s => s.type === 'contents');
    const closing = config.slides.find(s => s.type === 'closing');
    overlay.innerHTML = `
      <header class="opening-masthead"><span class="opening-brand">${esc(config.meta.display || config.meta.title)}</span></header>
      <div class="opening-cover">
        <div class="opening-kicker">${esc(config.meta.kicker)}</div>
        <h1>${cover.title.map((line, i) => `<span${i === cover.title.length - 1 ? ' class="opening-title-accent"' : ''}>${esc(line)}</span>`).join('')}</h1>
        <p class="opening-subtitle">${esc(config.meta.subtitle || '')}</p>
        <div class="opening-byline"><span class="opening-byline-rule"></span><p>${esc(config.meta.author || '')}</p></div>
      </div>
      <div class="opening-contents">
        <div class="opening-contents-head"><div><span class="opening-kicker">THE READING PATH</span>
          <h1>${esc(contents.title.join(' '))}<em>Contents</em></h1></div>
          <span class="opening-chapter-total">${pad(config.chapters.length)} CHAPTERS<br>17 CONTENT PAGES</span></div>
        <ol class="opening-chapters" style="--chapters:${config.chapters.length}">${config.chapters.map((c, i) =>
          `<li><button type="button" data-chapter="${i}" title="进入${esc(c.title)}" aria-label="进入第 ${i + 1} 章：${esc(c.title)}">
            <span class="opening-chapter-number">${esc(c.number)}</span><span class="opening-chapter-label">${esc(c.title)}</span>
            <span class="opening-chapter-en">${esc(c.english)}</span><span class="opening-chapter-arrow" aria-hidden="true">↗</span>
          </button></li>`).join('')}</ol>
      </div>
      <div class="opening-closing"><h1>${esc(closing ? closing.title.join(' ') : 'Thanks')}</h1></div>
      <footer class="opening-footer"><span>${esc(config.meta.title)}<span class="opening-footer-separator">/</span>${esc(config.meta.author)}</span>
        <span class="opening-footer-index"></span></footer>`;
    document.getElementById('stage').appendChild(overlay);
    if (window.lucide) lucide.createIcons();
    chapterButtons = Array.from(overlay.querySelectorAll('[data-chapter]'));
    chapterButtons.forEach((button, index) => {
      button.dataset.palette = index % 2 === 0 ? 'cyan' : 'orange';
      const i = Number(button.dataset.chapter);
      button.addEventListener('focus', () => {
        if (button.matches(':focus-visible')) emit({ type: 'selectChapterTo', index: i });
      });
      button.addEventListener('click', () => emit({ type: 'openChapter', index: i }));
    });
    overlay.querySelector('.opening-chapter-total').innerHTML = pad(config.chapters.length) + ' CHAPTERS<br>'
      + pad(config.slides.filter(s => !Navigation.isSpatial(s.type)).length) + ' CONTENT PAGES';
  }

  function emit(action) { document.dispatchEvent(new CustomEvent('presentation-action', { detail: action })); }
  function settle(result) { if (resolve) { const done = resolve; resolve = null; done(result); } }

  function init(el, cfg) {
    host = el; config = cfg;
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('reduced') === '1';
    createOverlay();
    contours = contourTexture();
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0); renderer.setSize(W, H, false);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
      host.appendChild(renderer.domElement);
      createCover(); createScreens();
      const closing = ThanksParticles.init();
      closingScene = closing.scene; closingCamera = closing.camera;
      renderer.compile(coverScene, coverCamera);
      renderer.compile(screenScene, camera);
      renderer.compile(closingScene, closingCamera);
    } catch (error) {
      failed = true;
      document.getElementById('stage').dataset.fallback = 'true';
    }
    addEventListener('pointermove', event => {
      if (active && !reduced && mode === 'closing') ThanksParticles.move(event.clientX / innerWidth, 1 - event.clientY / innerHeight);
      if (!active || reduced || mode !== 'cover') return;
      hover = true; target.set(event.clientX / innerWidth, 1 - event.clientY / innerHeight);
      if (!seen) { pointer.copy(target); seen = true; }
    });
    document.documentElement.addEventListener('pointerleave', () => { hover = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; last = 0; }
      else if (active) loop();
    });
    return true;
  }

  function show(name, options = {}) {
    settle(false);
    if (raf === null) last = 0;
    mode = name === 'cover' ? 'cover' : name === 'closing' ? 'closing' : 'contents';
    if (mode === 'closing' && !failed) ThanksParticles.show(reduced);
    selected = Math.max(0, Math.min(config.chapters.length - 1, options.chapter || 0));
    const step = Math.PI * 2 / Math.max(1, config.chapters.length);
    const requested = -selected * step;
    carouselTarget = requested + Math.round((carouselAngle - requested) / (Math.PI * 2)) * Math.PI * 2;
    if (reduced) carouselAngle = carouselTarget;
    active = true; overlay.hidden = false;
    overlay.dataset.mode = mode; overlay.dataset.reduced = String(reduced);
    document.getElementById('stage').dataset.opening = mode;
    overlay.querySelector('.opening-footer-index').textContent = mode === 'cover' ? '01 / COVER'
      : mode === 'closing' ? pad(config.slides.length) + ' / THANKS' : '02 / CONTENTS';
    chapterButtons.forEach((button, i) => {
      button.classList.toggle('is-selected', i === selected);
      if (i === selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    from = progress; to = mode === 'contents' ? 1 : 0; start = performance.now();
    animating = mode !== 'closing' && !reduced && !failed && Math.abs(from - to) > 0.001;
    if (!animating) { progress = to; draw(start); loop(); return Promise.resolve(true); }
    loop();
    return new Promise(done => { resolve = done; });
  }

  function updateScreens(dt) {
    const count = panels.length;
    const contentsScale = Math.min(1, 4 / Math.max(1, count));
    camera.position.set(0, 115, F);
    camera.lookAt(0, -20, 0);
    screenRoot.scale.setScalar(contentsScale);
    screenRoot.position.set(0, -50, -80 * (1 - progress));
    const turn = 1 - Math.exp(-dt * 10);
    carouselAngle += (carouselTarget - carouselAngle) * turn;
    if (Math.abs(carouselTarget - carouselAngle) < 0.0001) carouselAngle = carouselTarget;
    screenRoot.rotation.y = carouselAngle;
    // The live 3D projections also provide aligned, accessible pointer targets.
    screenRoot.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    chapterButtons.forEach((button, i) => {
      if (!panels[i]) return;
      const panel = panels[i].group;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      corners.forEach(corner => {
        projected.copy(corner).applyMatrix4(panel.matrixWorld).project(camera);
        const x = (projected.x + 1) / 2 * width, y = (1 - projected.y) / 2 * height;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
      button.style.setProperty('--hit-x', minX + 'px');
      button.style.setProperty('--hit-y', minY + 'px');
      button.style.setProperty('--hit-w', (maxX - minX) + 'px');
      button.style.setProperty('--hit-h', (maxY - minY) + 'px');
      button.style.zIndex = String(Math.round(panel.matrixWorld.elements[14] + 10000));
    });
  }

  function draw(now) {
    if (!active || failed || !renderer) return;
    const dt = Math.max(0, (now - (last || now)) / 1000); last = now;
    if (animating) {
      const t = clamp((now - start) / 820);
      progress = from + (to - from) * ease(t);
      if (t === 1) { animating = false; settle(true); }
    }
    const k = 1 - Math.exp(-dt * 9);
    pointer.lerp(target, k);
    gate += ((hover && !reduced ? 1 : 0) - gate) * (1 - Math.exp(-dt * 6));
    if (mode === 'cover') {
      coverMaterial.uniforms.gate.value = gate;
      renderer.render(coverScene, coverCamera);
    } else if (mode === 'closing') {
      ThanksParticles.update(now, dt);
      renderer.render(closingScene, closingCamera);
    } else {
      updateScreens(dt);
      renderer.render(screenScene, camera);
    }
  }

  function loop() {
    if (raf !== null || !active || document.hidden || failed) return;
    const frame = now => {
      raf = null;
      if (!active || document.hidden) return;
      draw(now);
      if (mode === 'cover' || (mode === 'closing' && !reduced) || animating || (mode === 'contents' && carouselAngle !== carouselTarget)) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (!animating) return;
    progress = to; animating = false; draw(performance.now()); settle(true);
  }
  function hideOpening() {
    active = false; animating = false; settle(false);
    cancelAnimationFrame(raf); raf = null; last = 0;
    overlay.hidden = true; delete document.getElementById('stage').dataset.opening;
  }
  function resize(w, h, scale) {
    width = w; height = h;
    if (!renderer || failed) return;
    renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
    camera.aspect = w / h;
    camera.fov = 2 * Math.atan(h / 2 / F) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    coverMaterial.uniforms.asp.value = w / h;
    ThanksParticles.resize(w, h, scale, renderer.getPixelRatio());
    draw(performance.now());
    if (raf === null) last = 0;
  }
  window.SpatialStage = { init, show, finish, hideOpening, resize };
  if (new URLSearchParams(location.search).get('debug') === '1') {
    SpatialStage.inspect = () => ({ angle: carouselAngle, target: carouselTarget, panelScale: PANEL_SCALE,
      borderless: panels.every(panel => panel.chassis.geometry.parameters.width === PANEL_WIDTH
        && panel.chassis.geometry.parameters.height === PANEL_HEIGHT),
      framePending: raf !== null, renderCalls: renderer && renderer.info.render.calls });
  }
})();
