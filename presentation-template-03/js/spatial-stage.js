/* Formal renderer: local Three.js spatial stage.
   Handles cover, contents, section-divider and closing. Reading pages stay in DOM. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600, CAM_TRAVEL = 2400;
  const PAPER = '#f9f0d8', BRICK = '#c84936', MUTED = 'rgba(249,240,216,0.72)';
  const DISPLAY = "'Presentation Serif SC', Georgia, 'Noto Serif SC', 'Songti SC', 'SimSun', serif";
  const SANS = "'Presentation Sans SC', 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif";
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const NODE_TARGETS = [[300, 640], [700, 470], [1080, 300], [1350, 190], [1560, 110], [1720, 60]];
  const NODE_SCALES = [1.35, 1.0, 0.75, 0.6, 0.5, 0.42];

  let renderer, scene, camera, config, opening, closing;
  const objects = [];
  let pathLine, markers = [], failed = false, ready = false;
  let current = { x: 0, y: 0, z: 0 }, target = { x: 0, y: 0, z: 0 };
  let tween = { active: false, from: null, t0: 0, dur: 900 };
  let pathTarget = 0, markerTarget = 0, markerSelected = 0;
  let reduced = false, raf = null, pendingResolve = null;

  const displayFont = (size, weight) => `${weight} ${size}px ${DISPLAY}`;
  const sansFont = (size, weight) => `${weight} ${size}px ${SANS}`;
  const titleLines = value => String(value || '').replace(/(.{3})/, '$1\n');

  function fovFor(height = H) { return 2 * Math.atan((height / 2) / F) * 180 / Math.PI; }

  function makeText(text, size, weight, font, color) {
    const lines = String(text).split('\n');
    const g = document.createElement('canvas').getContext('2d');
    g.font = font(size, weight);
    let w = 0; lines.forEach(l => { w = Math.max(w, g.measureText(l).width); });
    const lh = size * 1.24, pad = size * 0.2, res = 2;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((w + pad * 2) * res);
    cv.height = Math.ceil((lines.length * lh + pad * 2) * res);
    const gc = cv.getContext('2d');
    gc.scale(res, res);
    gc.font = font(size, weight);
    gc.textBaseline = 'top';
    gc.fillStyle = color;
    lines.forEach((l, i) => gc.fillText(l, pad, pad + i * lh));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(cv.width / res, cv.height / res),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
  }

  function addObject(def) {
    const mesh = makeText(def.text, def.size, def.weight, def.font, def.color || PAPER);
    mesh.position.set(def.world.x, -def.world.y, -def.world.z);
    scene.add(mesh);
    const rec = {
      id: def.id, role: def.role, mesh, mat: mesh.material, target: 0,
      base: mesh.material.color.clone(), text: def.text, size: def.size,
      weight: def.weight, font: def.font, color: def.color || PAPER,
    };
    objects.push(rec);
    return rec;
  }

  function updateText(rec, text) {
    if (!rec || rec.text === text) return;
    rec.text = text;
    const mesh = makeText(text, rec.size, rec.weight, rec.font, rec.color);
    mesh.position.copy(rec.mesh.position);
    mesh.material.opacity = rec.mat.opacity;
    scene.remove(rec.mesh);
    rec.mesh.geometry.dispose();
    rec.mat.map.dispose();
    rec.mesh = mesh;
    rec.mat = mesh.material;
    scene.add(rec.mesh);
  }

  function chapterNodes() {
    return (config.chapters || []).map((c, i) => {
      const s = NODE_SCALES[Math.min(i, NODE_SCALES.length - 1)];
      const t = NODE_TARGETS[Math.min(i, NODE_TARGETS.length - 1)];
      const z = CAM_TRAVEL + F / s;
      const x = (t[0] - W / 2) / s, y = (t[1] - H / 2) / s;
      return { chapter: c, x, y, z };
    });
  }

  function init(el, cfg) {
    config = cfg;
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      || new URLSearchParams(location.search).get('reduced') === '1';
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      renderer.domElement.style.cssText = 'width:100%;height:100%;';
      el.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(fovFor(), W / H, 1, 12000);
    } catch (error) {
      failed = true;
      opening = EditorialOpening.create(config, true, false);
      closing = ParticleClosing.create(config, true, false);
      ready = true;
      return false;
    }

    const meta = config.meta;
    addObject({ id: 'kicker', text: meta.kicker || '', size: 22, weight: 500, font: sansFont, world: { x: -300, y: -300, z: 1250 } });
    addObject({ id: 'title', text: titleLines(meta.title), size: 150, weight: 600, font: displayFont, world: { x: -360, y: 20, z: 1500 } });
    addObject({ id: 'subtitle', text: meta.subtitle || '', size: 32, weight: 400, font: sansFont, world: { x: -360, y: 330, z: 1450 } });
    addObject({ id: 'meta', text: meta.meta || '', size: 20, weight: 500, font: sansFont, world: { x: -300, y: 350, z: 1250 } });

    const nodes = chapterNodes();
    nodes.forEach((n, i) => {
      addObject({ id: 'num' + i, role: 'num', text: n.chapter.number, size: 30, weight: 600, font: displayFont, color: BRICK, world: { x: n.x - 150, y: n.y - 30, z: n.z } });
      addObject({ id: 'zh' + i, role: 'zh', text: n.chapter.title, size: 76, weight: 600, font: displayFont, world: { x: n.x, y: n.y, z: n.z } });
      addObject({ id: 'en' + i, role: 'en', text: n.chapter.english, size: 22, weight: 500, font: sansFont, color: MUTED, world: { x: n.x + 150, y: n.y + 64, z: n.z } });
    });

    const pts = [{ x: -360, y: 250, z: 1500 }, { x: -350, y: 305, z: 1650 }, { x: -290, y: 370, z: 1950 }]
      .concat(nodes.map(n => ({ x: n.x - 150, y: n.y - 30, z: n.z })));
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, -p.y, -p.z)));
    pathLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(BRICK), transparent: true, opacity: 0 }));
    scene.add(pathLine);
    markers = nodes.map(n => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(BRICK), transparent: true, opacity: 0 }));
      m.position.set(n.x - 150, -(n.y - 30), -n.z);
      scene.add(m);
      return m;
    });

    opening = EditorialOpening.create(config, reduced);
    closing = ParticleClosing.create(config, reduced);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      failed = true;
      renderer.domElement.hidden = true;
      opening.setStatic();
      closing.setStatic();
      finish();
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    });
    ready = true;
    render(performance.now());
    loop();
    return true;
  }

  function setTargets(name, options) {
    const selected = options && options.chapter != null ? options.chapter : 0;
    markerSelected = selected;
    const meta = config.meta;
    const closing = name === 'closing';
    const byId = id => objects.find(o => o.id === id);
    if (name === 'cover' || closing) {
      updateText(byId('kicker'), closing ? 'CLOSING' : (meta.kicker || ''));
      updateText(byId('title'), titleLines(meta.title));
      updateText(byId('subtitle'), closing ? ((options && options.subtitle) || meta.subtitle || '') : (meta.subtitle || ''));
      updateText(byId('meta'), closing ? ((options && options.note) || '') : (meta.meta || ''));
    }
    for (const rec of objects) {
      let opacity = 0;
      if (['kicker', 'title', 'subtitle', 'meta'].includes(rec.id)) {
        if (name === 'cover') opacity = rec.id === 'title' ? 1 : 0.8;
        else if (name === 'closing') opacity = rec.id === 'title' ? 1 : 0.75;
        else opacity = 0;
        rec.mat.color.copy(rec.base);
      } else if (rec.role) {
        const idx = Number(rec.id.replace(/\D/g, ''));
        if (name === 'contents') opacity = 1;
        else if (name === 'divider') opacity = idx === selected ? 1 : 0.28;
        else if (name === 'closing') opacity = 0.25;
        const active = (name === 'contents' || name === 'divider') && idx === selected;
        if (rec.role === 'zh') rec.mat.color.copy(active ? new THREE.Color(BRICK) : rec.base);
      }
      rec.target = opacity;
    }
    pathTarget = name === 'cover' ? 0.18 : name === 'closing' ? 0.65 : name === 'divider' ? 0.5 : name === 'contents' ? 1 : 0;
    markerTarget = name === 'cover' ? 0 : 1;

    if (name === 'cover' || name === 'closing') target = { x: 0, y: 0, z: 0 };
    else if (name === 'contents') target = { x: 0, y: 0, z: CAM_TRAVEL };
    else if (name === 'divider') {
      const nodes = chapterNodes();
      const n = nodes[clamp(selected, 0, nodes.length - 1)] || nodes[0];
      target = n ? { x: n.x, y: n.y, z: n.z - 700 } : { x: 0, y: 0, z: CAM_TRAVEL };
    }
  }

  function show(name, options) {
    if (name === 'closing') { opening.hide(); return closing.show(); }
    closing.hide();
    if (failed) {
      return name === 'cover' || name === 'contents' || name === 'body'
        ? opening.show(name, options) : Promise.resolve(false);
    }
    if (name === 'cover' || name === 'contents' || name === 'body') {
      if (pendingResolve) { const done = pendingResolve; pendingResolve = null; done(false); }
      tween.active = false;
      return opening.show(name, options);
    }
    opening.hide();
    if (tween.active) render(performance.now());
    if (pendingResolve) { const resolve = pendingResolve; pendingResolve = null; resolve(false); }
    setTargets(name, options);
    const samePosition = current.x === target.x && current.y === target.y && current.z === target.z;
    if (reduced || samePosition) {
      tween.active = false;
      current = { ...target };
      objects.forEach(o => { o.mat.opacity = o.target; });
      if (pathLine) pathLine.material.opacity = pathTarget;
      markers.forEach(m => { m.material.opacity = markerTarget; });
      render(performance.now());
      return Promise.resolve(true);
    }
    tween = { active: true, from: { ...current }, t0: performance.now(), dur: name === 'divider' ? 700 : 900 };
    return new Promise(resolve => { pendingResolve = resolve; });
  }

  function finish() {
    if (opening && opening.active) { opening.finish(); return; }
    if (!ready || !tween.active) return;
    tween.t0 = performance.now() - tween.dur;
    objects.forEach(o => { o.mat.opacity = o.target; });
    if (pathLine) pathLine.material.opacity = pathTarget;
    markers.forEach(m => { m.material.opacity = markerTarget; });
    render(performance.now());
  }

  function render(now) {
    if (failed) return;
    if (closing && closing.active) {
      closing.update(now);
      renderer.render(closing.scene, closing.camera);
      return;
    }
    if (opening && opening.active) {
      opening.update(now);
      renderer.render(opening.scene, opening.camera);
      return;
    }
    const t = tween.active ? clamp((now - tween.t0) / tween.dur) : 1;
    const e = ease(t);
    const from = tween.from || target;
    current.x = from.x + (target.x - from.x) * e;
    current.y = from.y + (target.y - from.y) * e;
    current.z = from.z + (target.z - from.z) * e;
    if (tween.active && t >= 1) {
      tween.active = false;
      if (pendingResolve) { const r = pendingResolve; pendingResolve = null; r(true); }
    }
    const sway = (!reduced && target.z === 0) ? Math.sin(now * 0.00035) * 7 : 0;
    camera.position.set(current.x + sway, -current.y, -current.z);
    const k = reduced ? 1 : 0.14;
    for (const rec of objects) {
      rec.mat.opacity += (rec.target - rec.mat.opacity) * k;
      rec.mesh.visible = rec.mat.opacity > 0.01;
    }
    if (pathLine) pathLine.material.opacity += (pathTarget - pathLine.material.opacity) * k;
    markers.forEach(m => { m.material.opacity += (markerTarget - m.material.opacity) * k; });
    renderer.render(scene, camera);
  }

  function loop() {
    raf = null;
    if (document.hidden || failed) return;
    render(performance.now());
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && raf === null && ready) loop();
  });

  window.SpatialStage = {
    init, show, finish,
    hideOpening() { if (opening) opening.hide(); },
    get ready() { return ready; },
    get failed() { return failed; },
    get openingReady() { return opening ? opening.ready : Promise.resolve(false); },
    resize(width = W, height = H, scale = 1) {
      if (opening) opening.resize(width, height);
      if (closing) closing.resize(width, height);
      if (failed) return;
      if (!renderer || !camera) return;
      camera.aspect = width / height;
      camera.fov = fovFor(height);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(width * scale, height * scale, false);
      render(performance.now());
    }
  };
})();
