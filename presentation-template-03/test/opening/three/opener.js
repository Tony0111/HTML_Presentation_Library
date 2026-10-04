/* Three.js renderer: camera with the same focal length as the shared projection,
   text drawn to CanvasTexture planes. No fog colour shift, no disc, no dust. */
(function () {
  'use strict';
  const api = { name: 'Three.js / WebGL' };
  let renderer, scene, camera;
  const meshes = new Map();

  function fovFor(F, H) { return 2 * Math.atan((H / 2) / F) * 180 / Math.PI; }

  api.init = function (ctx) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    ctx.world.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(ctx.W, ctx.H, false);
    renderer.domElement.style.cssText = `position:absolute;left:0;top:0;width:${ctx.W}px;height:${ctx.H}px;`;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(fovFor(ctx.F, ctx.H), ctx.W / ctx.H, 1, 12000);
  };

  api.resize = function () {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(1920, 1080, false);
  };

  function makeMesh(it) {
    const lines = String(it.text).split('\n');
    const g = document.createElement('canvas').getContext('2d');
    g.font = `${it.weight} ${it.size}px ${it.font}`;
    let w = 0; lines.forEach(l => w = Math.max(w, g.measureText(l).width));
    const lh = it.size * 1.24, pad = it.size * 0.18;
    const res = 2;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((w + pad * 2) * res);
    cv.height = Math.ceil((lines.length * lh + pad * 2) * res);
    const gc = cv.getContext('2d');
    gc.scale(res, res);
    gc.font = `${it.weight} ${it.size}px ${it.font}`;
    gc.textBaseline = 'top';
    gc.fillStyle = it.role === 'num' ? '#c8452c' : it.role === 'en' ? 'rgba(243,239,230,0.66)' : '#f3efe6';
    lines.forEach((l, i) => gc.fillText(l, pad, pad + i * lh));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(cv.width / res, cv.height / res);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    scene.add(m);
    return m;
  }

  api.render = function (ctx, frame) {
    camera.position.set(frame.cam.x, 0, -frame.cam.z);
    camera.rotation.z = 0;
    const seen = new Set();
    for (const it of frame.items) {
      let rec = meshes.get(it.id);
      if (!rec) { const m = makeMesh(it); rec = { m, mat: m.material, base: m.material.color.clone() }; meshes.set(it.id, rec); }
      rec.m.position.set(it.x, -it.y, -it.z);
      const active = it.role === 'zh' && frame.selected === Number(it.id.slice(2)) && frame.p >= 0.999;
      rec.mat.color.copy(active ? new THREE.Color('#c8452c') : rec.base);
      rec.mat.opacity = it.opacity;
      rec.m.visible = true;
      seen.add(it.id);
    }
    for (const [id, rec] of meshes) if (!seen.has(id)) rec.m.visible = false;
    renderer.render(scene, camera);
  };

  window.OPENER = api;
})();
