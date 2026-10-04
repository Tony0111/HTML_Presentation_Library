// Three.js 版：字母为 CanvasTexture 平面，相机真实前推；额外有雾、发光尘埃、深度排序。
(function () {
  const api = { name: 'Three.js / WebGL' };
  let renderer, scene, camera, letterMeshes = [], dust, dustWarm, disc, discGlow, rules = [];

  // 与 DOM 版一致：perspective = 1400px 时，屏幕高度 1080px 对应的垂直视角
  function fovFor(P, H) { return 2 * Math.atan((H / 2) / P) * 180 / Math.PI; }

  api.init = function (ctx) {
    const { world, letters, PERSPECTIVE, W, H } = ctx;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    world.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color(ctx.ink), 1200, 4200);

    camera = new THREE.PerspectiveCamera(fovFor(PERSPECTIVE, H), W / H, 10, 8000);
    camera.position.set(0, 0, PERSPECTIVE);

    // ---- 字母平面 ----
    letters.forEach((l) => {
      const tex = makeLetterTexture(l, ctx.paper);
      const geo = new THREE.PlaneGeometry(tex.w, tex.h);
      const mat = new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, depthWrite: false, fog: true });
      const m = new THREE.Mesh(geo, mat);
      // DOM 版字母 div 顶边在 (l.y - 0.72·size)，高度 1.1·size；平面中心对齐同一位置
      const cy = (l.y - l.size * 0.72) + tex.h / 2;
      m.position.set(l.x, -cy, l.z);     // CSS y 向下 → three y 向上
      scene.add(m);
      letterMeshes.push({ m, l, mat });
    });

    // ---- 发光尘埃（加法混合）----
    const rnd = mulberry(7);
    dust = makePoints(600, rnd, ctx.paper, 9, 0.55);
    dustWarm = makePoints(90, rnd, ctx.brick, 22, 0.8);
    scene.add(dust, dustWarm);

    // ---- 红圆 + 柔光 ----
    const discGeo = new THREE.CircleGeometry(380, 96);
    disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#c8452c'), transparent: true, opacity: 0.75, fog: false }));
    disc.position.set(520, -120, -1900);
    scene.add(disc);
    discGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(), color: new THREE.Color('#d8573c'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    discGlow.scale.set(1800, 1800, 1);
    discGlow.position.copy(disc.position).add(new THREE.Vector3(0, 0, -5));
    scene.add(discGlow);

    // ---- 几条细线：编辑风的横向标尺，加强深度 ----
    for (let i = 0; i < 4; i++) {
      const z = -300 - i * 650;
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1500, -320 - i * 40, z), new THREE.Vector3(1500, -320 - i * 40, z)]);
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(ctx.paper), transparent: true, opacity: 0.16, fog: true }));
      scene.add(line); rules.push(line);
    }
  };

  api.resize = function (ctx) {
    // 渲染尺寸 = 舞台尺寸 × 缩放，保证真实像素清晰
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(Math.round(ctx.W * ctx.scale), Math.round(ctx.H * ctx.scale), false);
    renderer.domElement.style.width = ctx.W + 'px';
    renderer.domElement.style.height = ctx.H + 'px';
  };

  api.render = function (ctx, st) {
    const { letterLook, PERSPECTIVE } = ctx;
    camera.position.set(st.swayX, 0, PERSPECTIVE - st.shift);
    camera.rotation.z = st.roll * Math.PI / 180;

    for (const { m, l, mat } of letterMeshes) {
      const zRel = camera.position.z - l.z;
      const look = letterLook(zRel);
      mat.opacity = look.opacity;
      m.visible = zRel > 20;
    }
    const t = st.time * 0.001;
    dust.rotation.y = Math.sin(t * 0.05) * 0.04;
    dust.position.y = Math.sin(t * 0.3) * 8;
    dustWarm.rotation.z = t * 0.01;
    const dz = camera.position.z - disc.position.z;
    disc.material.opacity = Math.max(0, Math.min(0.75, (dz - 300) / 900));
    discGlow.material.opacity = Math.max(0, Math.min(0.55, (dz - 200) / 1200));
    renderer.render(scene, camera);
  };

  // ---- helpers ----
  function makeLetterTexture(l, color) {
    const scale = 1.5;                         // 纹理分辨率倍数
    const pad = l.size * 0.12;
    const w = Math.ceil((l.w + pad * 2) * scale), h = Math.ceil((l.size * 1.1) * scale);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.scale(scale, scale);
    g.font = l.font; g.fillStyle = color; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
    g.fillText(l.ch, (l.w + pad * 2) / 2, l.size * 0.80);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return { tex, w: w / scale, h: h / scale };
  }
  function softSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function makePoints(n, rnd, color, size, opacity) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rnd() - 0.5) * 3200;
      pos[i * 3 + 1] = (rnd() - 0.5) * 1800;
      pos[i * 3 + 2] = -3000 + rnd() * 3600;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: softSprite(), color: new THREE.Color(color), size, sizeAttenuation: true,
      transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    return new THREE.Points(g, m);
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  window.OPENER = api;
})();
