/* A single renderer: Library liquid-lens refraction on the cover, hinged screens in contents. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  let renderer, host, config, overlay, coverScene, coverCamera, screenScene, camera;
  let coverMaterial, screenRoot, floor, reduced, failed = false, active = false;
  let mode = 'cover', selected = 0, raf = null, last = 0, gate = 0;
  let width = W, height = H, progress = 0, from = 0, to = 0, start = 0, resolve = null;
  let animating = false, hover = false, seen = false;
  const pointer = new THREE.Vector2(0.5, 0.5), target = new THREE.Vector2(0.5, 0.5);
  const panels = [];
  const esc = value => SlideRenderer.escape(value);
  const pad = n => String(n).padStart(2, '0');

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
    // Dense contour lines supply the structure that makes lens displacement visible.
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
    canvas.width = 740; canvas.height = 1130;
    const g = canvas.getContext('2d');
    const colors = [['#d0f3e9', '#8cdad1'], ['#147d7c', '#065b5d'], ['#ffbd7e', '#f09244'], ['#f9fcf7', '#dbece5']];
    const palette = colors[index % colors.length];
    const dark = index % 4 === 1;
    const ink = dark ? '#edfff4' : '#154e4d';
    const muted = dark ? '#b5ddd3' : '#427571';
    const grad = g.createLinearGradient(0, 0, 740, 1130);
    grad.addColorStop(0, palette[0]); grad.addColorStop(1, palette[1]);
    g.fillStyle = grad; g.fillRect(0, 0, 740, 1130);
    g.strokeStyle = dark ? 'rgba(236,255,244,0.22)' : 'rgba(18,103,98,0.18)';
    g.lineWidth = 1.3;
    for (let i = 0; i < 32; i++) {
      g.beginPath();
      for (let x = -10; x <= 750; x += 8) {
        const y = 440 + i * 13 + Math.sin(x / 230 + index * 0.6) * 82;
        if (x === -10) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = muted; g.font = '500 23px "Presentation Mono", monospace';
    g.fillText('CHAPTER / ' + chapter.number, 56, 74);
    g.strokeStyle = dark ? '#619d96' : '#7aaca0';
    g.beginPath(); g.moveTo(56, 108); g.lineTo(684, 108); g.stroke();
    g.fillStyle = ink; g.font = 'italic 262px Georgia, serif';
    g.fillText(chapter.number, 40, 378);
    g.font = '600 84px "Presentation Serif SC", serif';
    g.fillText(chapter.title, 54, 850, 620);
    g.fillStyle = muted; g.font = '500 25px "Presentation Sans SC", sans-serif';
    g.fillText(chapter.english, 56, 912, 620);
    g.beginPath(); g.moveTo(56, 1000); g.lineTo(684, 1000); g.stroke();
    const begin = config.slides.findIndex(s => s.id === chapter.firstSlideId);
    const next = config.chapters[index + 1];
    const end = next ? config.slides.findIndex(s => s.id === next.firstSlideId) : config.slides.length;
    g.font = '22px "Presentation Mono", monospace';
    g.fillText('P. ' + pad(begin + 1) + ' / ' + pad(end), 56, 1057);
    g.font = '38px Georgia, serif'; g.fillText('↗', 642, 1057);
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
    screenScene.add(new THREE.HemisphereLight(0xffffff, 0x90b6a8, 2.4));
    const light = new THREE.DirectionalLight(0xfff6e8, 3.2);
    light.position.set(-650, 1100, 1300); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -1600, right: 1600, top: 1000, bottom: -1000, near: 1, far: 4000 });
    light.shadow.bias = -0.001; light.shadow.normalBias = 3;
    screenScene.add(light);
    const fill = new THREE.DirectionalLight(0xb4f5ea, 1.3);
    fill.position.set(1000, 200, -400); screenScene.add(fill);
    const railMat = new THREE.MeshStandardMaterial({ color: '#81aaa0', roughness: 0.3, metalness: 0.55 });
    config.chapters.forEach((chapter, i) => {
      const group = new THREE.Group(); screenRoot.add(group);
      const front = new THREE.MeshStandardMaterial({ map: panelTexture(chapter, i), roughness: 0.53, metalness: 0.05 });
      const back = new THREE.MeshStandardMaterial({ color: '#abc9bc', roughness: 0.6 });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(370, 565, 14), [railMat, railMat, railMat, railMat, front, back]);
      panel.castShadow = true; panel.receiveShadow = true; group.add(panel);
      for (const x of [-183, 183]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(4, 565, 18), railMat);
        rail.position.x = x; group.add(rail);
      }
      for (const y of [-282, 282]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(370, 4, 18), railMat);
        rail.position.y = y; group.add(rail);
      }
      if (i > 0) {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 540, 12), railMat);
        hinge.position.set(-185, 0, 0); group.add(hinge);
      }
      for (const x of [-153, 153]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(8, 26, 54), railMat);
        foot.position.set(x, -292, 0); foot.castShadow = true; group.add(foot);
      }
      panels.push({ group, front, mesh: panel, angle: 0 });
    });
    floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 5000), new THREE.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -460; floor.receiveShadow = true;
    screenScene.add(floor);
  }

  function createOverlay() {
    overlay = document.createElement('section');
    overlay.id = 'editorial-opening'; overlay.hidden = true;
    overlay.setAttribute('aria-label', '封面与章节目录');
    const cover = config.slides.find(s => s.type === 'cover');
    const contents = config.slides.find(s => s.type === 'contents');
    overlay.innerHTML = `
      <header class="opening-masthead"><span class="opening-brand">${esc(config.meta.display || config.meta.title)}</span>
        <span class="opening-edition">${esc(config.meta.meta || '')}</span><span class="opening-mark">02</span></header>
      <div class="opening-cover">
        <div class="opening-kicker">${esc(config.meta.kicker)}</div>
        <h1>${cover.title.map((line, i) => `<span${i === cover.title.length - 1 ? ' class="opening-title-accent"' : ''}>${esc(line)}</span>`).join('')}</h1>
        <p class="opening-subtitle">${esc(config.meta.subtitle || '')}</p>
        <div class="opening-byline"><span class="opening-byline-rule"></span><p>${esc(config.meta.author || '')}</p></div>
        <button class="cover-enter" type="button" title="打开目录" aria-label="打开目录"><i data-lucide="arrow-up-right" aria-hidden="true"></i></button>
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
      <footer class="opening-footer"><span>${esc(config.meta.title)}<span class="opening-footer-separator">/</span>${esc(config.meta.author)}</span>
        <span class="opening-footer-index"></span></footer>`;
    document.getElementById('stage').appendChild(overlay);
    if (window.lucide) lucide.createIcons();
    overlay.querySelector('.cover-enter').onclick = () => emit({ type: 'openContents' });
    overlay.querySelectorAll('[data-chapter]').forEach(button => {
      const i = Number(button.dataset.chapter);
      button.addEventListener('pointerenter', () => emit({ type: 'selectChapterTo', index: i }));
      button.addEventListener('focus', () => emit({ type: 'selectChapterTo', index: i }));
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
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0); renderer.setSize(W, H, false);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
      host.appendChild(renderer.domElement);
      createCover(); createScreens();
    } catch (error) {
      failed = true;
      document.getElementById('stage').dataset.fallback = 'true';
    }
    addEventListener('pointermove', event => {
      if (!active || reduced) return;
      hover = true; target.set(event.clientX / innerWidth, 1 - event.clientY / innerHeight);
      if (!seen) { pointer.copy(target); seen = true; }
    });
    document.documentElement.addEventListener('pointerleave', () => { hover = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (active) loop();
    });
    return true;
  }

  function show(name, options = {}) {
    settle(false);
    mode = name === 'cover' ? 'cover' : 'contents';
    selected = Math.max(0, Math.min(config.chapters.length - 1, options.chapter || 0));
    active = true; overlay.hidden = false;
    overlay.dataset.mode = mode; overlay.dataset.reduced = String(reduced);
    document.getElementById('stage').dataset.opening = mode;
    overlay.querySelector('.opening-footer-index').textContent = mode === 'cover' ? '01 / COVER' : '02 / CONTENTS';
    overlay.querySelectorAll('[data-chapter]').forEach((button, i) => {
      button.classList.toggle('is-selected', i === selected);
      if (i === selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    from = progress; to = mode === 'contents' ? 1 : 0; start = performance.now();
    animating = !reduced && !failed && Math.abs(from - to) > 0.001;
    if (!animating) { progress = to; draw(start); loop(); return Promise.resolve(true); }
    loop();
    return new Promise(done => { resolve = done; });
  }

  function updateScreens(now, dt) {
    const fold = 0.86 - 0.52 * ease(progress);
    const count = panels.length;
    const contentsScale = Math.min(1, 4 / Math.max(1, count)) * (width / height < 0.8 ? 1.13 : 1);
    const pitch = 370 * Math.cos(fold);
    const total = pitch * count;
    const swayX = reduced ? 0 : (pointer.x - 0.5) * 28;
    const swayY = reduced ? 0 : (pointer.y - 0.5) * 16;
    camera.position.set(swayX, 115 + swayY, F);
    camera.lookAt(0, -20, 0);
    screenRoot.scale.setScalar(contentsScale);
    screenRoot.position.set(0, -155, -160 * (1 - progress));
    let z = 0;
    panels.forEach((panel, i) => {
      const angle = (i % 2 === 0 ? 1 : -1) * fold;
      const dz = -370 * Math.sin(angle);
      panel.group.position.set(-total / 2 + pitch * (i + 0.5), 0, z + dz / 2);
      panel.group.rotation.y = angle;
      z += dz;
      const amount = i === selected ? 0.055 : 0;
      panel.front.emissive.setRGB(amount * 0.55, amount, amount * 0.83);
    });
    // The live 3D projections also provide aligned, accessible pointer targets.
    overlay.querySelectorAll('[data-chapter]').forEach((button, i) => {
      if (!panels[i]) return;
      const panel = panels[i].group;
      screenRoot.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const corners = [[-185, -282], [185, -282], [-185, 282], [185, 282]].map(([x, y]) => {
        const point = panel.localToWorld(new THREE.Vector3(x, y, 12)).project(camera);
        return { x: (point.x + 1) / 2 * width, y: (1 - point.y) / 2 * height };
      });
      const minX = Math.min(...corners.map(p => p.x)), maxX = Math.max(...corners.map(p => p.x));
      const minY = Math.min(...corners.map(p => p.y)), maxY = Math.max(...corners.map(p => p.y));
      button.style.setProperty('--hit-x', minX + 'px');
      button.style.setProperty('--hit-y', minY + 'px');
      button.style.setProperty('--hit-w', (maxX - minX) + 'px');
      button.style.setProperty('--hit-h', (maxY - minY) + 'px');
    });
  }

  function draw(now) {
    if (!active || failed || !renderer) return;
    const dt = Math.min(0.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
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
    } else {
      updateScreens(now, dt);
      renderer.render(screenScene, camera);
    }
  }

  function loop() {
    if (raf !== null || !active || document.hidden || failed) return;
    const frame = now => {
      raf = null;
      if (!active || document.hidden) return;
      draw(now); raf = requestAnimationFrame(frame);
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
    draw(performance.now());
  }
  window.SpatialStage = { init, show, finish, hideOpening, resize };
})();
