/*
 * STLShaper Forms — background engine.
 *
 * Loops a single shape through a fixed list of deformations, rendered as
 * wireframe + vertices. No UI, no lighting, no normals: the wireframe material
 * is unlit, so each frame only needs the deformation pass and a lerp.
 *
 * Deformation math is a faithful port of worker.js from github_res/stlshaper
 * (MIT) — same formulas and parameter semantics as the interactive study.
 *
 * Per-page config is supplied through window.BG_CONFIG before this file runs.
 */
(function () {
  'use strict';

  var CFG = window.BG_CONFIG || {};
  var SHAPE = CFG.shape || 'sphere';
  var CYCLE = (CFG.deformations && CFG.deformations.length) ? CFG.deformations : ['noise'];
  var HOLD = CFG.hold != null ? CFG.hold : 3.0;
  var MORPH = CFG.morph != null ? CFG.morph : 1.2;
  var SPIN = CFG.spin != null ? CFG.spin : 0.2;
  var BREATHE = CFG.breathe != null ? CFG.breathe : 0.15;
  var HUE = CFG.hue != null ? CFG.hue : 0.62;
  var SHOW_LABEL = /[?&]label=1/.test(window.location.search);

  /* ------------------------------------------------------------- noise ---- */
  var noiseSeed = 0;

  function simpleHash(x, y, z) {
    var h = 17 + 31 * noiseSeed;
    h = (31 * h + x * 12345) % 100000;
    h = (31 * h + y * 67890) % 100000;
    h = (31 * h + z * 123) % 100000;
    var s = Math.sin((h / 100000) * Math.PI * 2);
    return s * 0.5 + 0.5;
  }

  function whiteNoise(x, y, z) {
    return simpleHash(Math.floor(x * 10), Math.floor(y * 10), Math.floor(z * 10));
  }

  function perlinFade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  function perlinLatticeValue(ix, iy, iz) {
    var h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^
            Math.imul(iz, 1274126177) ^ Math.imul(noiseSeed, 971);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function perlinNoise(x, y, z) {
    var x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    var fx = perlinFade(x - x0), fy = perlinFade(y - y0), fz = perlinFade(z - z0);
    var c000 = perlinLatticeValue(x0, y0, z0);
    var c100 = perlinLatticeValue(x0 + 1, y0, z0);
    var c010 = perlinLatticeValue(x0, y0 + 1, z0);
    var c110 = perlinLatticeValue(x0 + 1, y0 + 1, z0);
    var c001 = perlinLatticeValue(x0, y0, z0 + 1);
    var c101 = perlinLatticeValue(x0 + 1, y0, z0 + 1);
    var c011 = perlinLatticeValue(x0, y0 + 1, z0 + 1);
    var c111 = perlinLatticeValue(x0 + 1, y0 + 1, z0 + 1);
    var x00 = lerp(c000, c100, fx);
    var x10 = lerp(c010, c110, fx);
    var x01 = lerp(c001, c101, fx);
    var x11 = lerp(c011, c111, fx);
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
  }

  var PERLIN_OCTAVES = 4;
  var PERLIN_LACUNARITY = 2.0;
  var PERLIN_GAIN = 0.5;
  var PERLIN_FREQUENCY = 1.0;
  var PERLIN_CONTRAST = 2.77;

  function perlinFractal(x, y, z) {
    var amplitude = 1, frequency = PERLIN_FREQUENCY, sum = 0, totalAmplitude = 0;
    for (var i = 0; i < PERLIN_OCTAVES; i++) {
      sum += perlinNoise(x * frequency, y * frequency, z * frequency) * amplitude;
      totalAmplitude += amplitude;
      amplitude *= PERLIN_GAIN;
      frequency *= PERLIN_LACUNARITY;
    }
    var normalized = sum / totalAmplitude;
    return Math.max(0, Math.min(1, (normalized - 0.5) * PERLIN_CONTRAST + 0.5));
  }

  function sampleNoise(type, x, y, z) {
    return type === 'perlin' ? perlinFractal(x, y, z) : whiteNoise(x, y, z);
  }

  /* ------------------------------------------------------------ helpers ---- */
  function getAxisList(axisParam) {
    var axis = axisParam || 'y';
    if (axis === 'all') return ['x', 'y', 'z'];
    var axes = [];
    if (axis.indexOf('x') !== -1) axes.push('x');
    if (axis.indexOf('y') !== -1) axes.push('y');
    if (axis.indexOf('z') !== -1) axes.push('z');
    return axes.length ? axes : ['y'];
  }

  function boundsOf(v) {
    var min = { x: Infinity, y: Infinity, z: Infinity };
    var max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (var i = 0; i < v.length; i += 3) {
      if (v[i] < min.x) min.x = v[i];
      if (v[i + 1] < min.y) min.y = v[i + 1];
      if (v[i + 2] < min.z) min.z = v[i + 2];
      if (v[i] > max.x) max.x = v[i];
      if (v[i + 1] > max.y) max.y = v[i + 1];
      if (v[i + 2] > max.z) max.z = v[i + 2];
    }
    return { min: min, max: max };
  }

  var AXIS_COORD = { x: 0, y: 1, z: 2 };

  /* ------------------------------------------------------- deformations ---- */
  function deformNoise(base, p) {
    noiseSeed = p.seed || 0;
    var bbox = boundsOf(base);
    var center = {
      x: (bbox.min.x + bbox.max.x) * 0.5,
      y: (bbox.min.y + bbox.max.y) * 0.5,
      z: (bbox.min.z + bbox.max.z) * 0.5,
    };
    var out = new Float32Array(base);
    var allowX = p.axis === 'all' || p.axis.indexOf('x') !== -1;
    var allowY = p.axis === 'all' || p.axis.indexOf('y') !== -1;
    var allowZ = p.axis === 'all' || p.axis.indexOf('z') !== -1;
    for (var i = 0; i < out.length; i += 3) {
      var x = out[i], y = out[i + 1], z = out[i + 2];
      var cx = x - center.x, cy = y - center.y, cz = z - center.z;
      var len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
      var nv = sampleNoise(p.type, cx * p.scale, cy * p.scale, cz * p.scale);
      var offset = (nv - 0.5) * 2 * p.intensity;
      if (allowX) out[i] = x + (cx / len) * offset;
      if (allowY) out[i + 1] = y + (cy / len) * offset;
      if (allowZ) out[i + 2] = z + (cz / len) * offset;
    }
    return out;
  }

  function deformPixel(base, p) {
    var out = new Float32Array(base);
    if (!p.size || p.size <= 0) return out;
    var allowX = p.axis === 'all' || p.axis.indexOf('x') !== -1;
    var allowY = p.axis === 'all' || p.axis.indexOf('y') !== -1;
    var allowZ = p.axis === 'all' || p.axis.indexOf('z') !== -1;
    for (var i = 0; i < out.length; i += 3) {
      if (allowX) out[i] = Math.round(out[i] / p.size) * p.size;
      if (allowY) out[i + 1] = Math.round(out[i + 1] / p.size) * p.size;
      if (allowZ) out[i + 2] = Math.round(out[i + 2] / p.size) * p.size;
    }
    return out;
  }

  function deformTwist(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var axes = getAxisList(p.axis);
    var angle = (p.angle || 180) * (Math.PI / 180);
    for (var a = 0; a < axes.length; a++) {
      var axis = axes[a];
      var min = bbox.min[axis], max = bbox.max[axis];
      var range = (max - min) || 1;
      for (var i = 0; i < out.length; i += 3) {
        var x = out[i], y = out[i + 1], z = out[i + 2];
        var t = ((axis === 'x' ? x : axis === 'y' ? y : z) - min) / range - 0.5;
        var theta = t * angle, cos = Math.cos(theta), sin = Math.sin(theta);
        if (axis === 'x') { out[i + 1] = y * cos - z * sin; out[i + 2] = y * sin + z * cos; }
        else if (axis === 'y') { out[i] = x * cos - z * sin; out[i + 2] = x * sin + z * cos; }
        else { out[i] = x * cos - y * sin; out[i + 1] = x * sin + y * cos; }
      }
    }
    return out;
  }

  function deformBend(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var axes = getAxisList(p.axis);
    var angleScale = (p.strength || 0.8) * Math.PI;
    for (var a = 0; a < axes.length; a++) {
      var axis = axes[a];
      var min = bbox.min[axis], max = bbox.max[axis];
      var range = (max - min) || 1;
      for (var i = 0; i < out.length; i += 3) {
        var x = out[i], y = out[i + 1], z = out[i + 2];
        var t = ((axis === 'x' ? x : axis === 'y' ? y : z) - min) / range - 0.5;
        var theta = t * angleScale, cos = Math.cos(theta), sin = Math.sin(theta);
        if (axis === 'x') { var nx = x * cos - y * sin; y = x * sin + y * cos; x = nx; }
        else if (axis === 'y') { var ny = y * cos - z * sin; z = y * sin + z * cos; y = ny; }
        else { var nx2 = x * cos - z * sin; z = x * sin + z * cos; x = nx2; }
        out[i] = x; out[i + 1] = y; out[i + 2] = z;
      }
    }
    return out;
  }

  function deformBoundary(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var epsX = (bbox.max.x - bbox.min.x) * p.threshold;
    var epsY = (bbox.max.y - bbox.min.y) * p.threshold;
    var epsZ = (bbox.max.z - bbox.min.z) * p.threshold;
    function hash(x, y, z) {
      return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1;
    }
    for (var i = 0; i < out.length; i += 3) {
      var x = out[i], y = out[i + 1], z = out[i + 2];
      var near = Math.abs(x - bbox.min.x) < epsX || Math.abs(x - bbox.max.x) < epsX ||
                 Math.abs(y - bbox.min.y) < epsY || Math.abs(y - bbox.max.y) < epsY ||
                 Math.abs(z - bbox.min.z) < epsZ || Math.abs(z - bbox.max.z) < epsZ;
      if (!near) continue;
      out[i] = x + (hash(x, y, z) - 0.5) * 2 * p.jitter;
      out[i + 1] = y + (hash(y, z, x) - 0.5) * 2 * p.jitter;
      out[i + 2] = z + (hash(z, x, y) - 0.5) * 2 * p.jitter;
    }
    return out;
  }

  /* ------------------------------------------------------- deformation set ---- */
  var DEFORMATIONS = {
    noise: { name: 'Noise', cn: '噪声', strengthKey: 'intensity', base: { intensity: 0.32, scale: 2.2, type: 'perlin', axis: 'all', seed: 0 }, breatheScale: 1 },
    twist: { name: 'Twist', cn: '扭曲', strengthKey: 'angle', base: { angle: 300, axis: 'y' }, breatheScale: 0.8 },
    bend: { name: 'Bend', cn: '弯曲', strengthKey: 'strength', base: { strength: 0.95, axis: 'y' }, breatheScale: 0.8 },
    pixelate: { name: 'Pixelate', cn: '像素化', strengthKey: 'size', base: { size: 0.16, axis: 'all' }, breatheScale: 0.3 },
    boundary: { name: 'Boundary', cn: '边界撕裂', strengthKey: 'jitter', base: { threshold: 0.2, jitter: 0.1 }, breatheScale: 0.6 },
  };

  function applyDeformation(base, id, strength) {
    var spec = DEFORMATIONS[id];
    if (!spec) return new Float32Array(base);
    var params = {};
    for (var k in spec.base) params[k] = spec.base[k];
    params[spec.strengthKey] = params[spec.strengthKey] * strength;
    switch (id) {
      case 'noise': return deformNoise(base, params);
      case 'twist': return deformTwist(base, params);
      case 'bend': return deformBend(base, params);
      case 'pixelate': return deformPixel(base, params);
      case 'boundary': return deformBoundary(base, params);
      default: return new Float32Array(base);
    }
  }

  /* --------------------------------------------------------------- shapes ---- */
  // Lower density than the interactive study: a background is dense enough to
  // read as a wireframe texture, and the deformation runs every frame.
  function buildGeometry(shape) {
    var geo;
    switch (shape) {
      case 'torus': geo = new THREE.TorusGeometry(0.8, 0.34, 22, 68); break;
      case 'knot': geo = new THREE.TorusKnotGeometry(0.74, 0.22, 118, 14); break;
      case 'crystal': geo = new THREE.IcosahedronGeometry(1.1, 2); break;
      default: geo = new THREE.SphereGeometry(1, 46, 32);
    }
    geo.computeBoundingBox();
    var bb = geo.boundingBox;
    var cx = (bb.min.x + bb.max.x) * 0.5;
    var cy = (bb.min.y + bb.max.y) * 0.5;
    var cz = (bb.min.z + bb.max.z) * 0.5;
    var size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 1;
    var s = 2 / size;
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      pos.setXYZ(i, (pos.getX(i) - cx) * s, (pos.getY(i) - cy) * s, (pos.getZ(i) - cz) * s);
    }
    pos.needsUpdate = true;
    return geo;
  }

  /* --------------------------------------------------------------- guard ---- */
  function showFallback(message) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
      'padding:32px;text-align:center;font:14px/1.8 system-ui,sans-serif;color:#cbc4e6;background:#05030d;z-index:9;';
    el.textContent = message;
    document.body.appendChild(el);
  }
  function webglAvailable() {
    try {
      var probe = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (typeof THREE === 'undefined') {
    showFallback('Three.js 没有加载成功。请确认 vendor/three.min.js 与这个页面在同一个文件夹中。');
    return;
  }
  if (!webglAvailable()) {
    showFallback('这个背景需要 WebGL。请在浏览器中开启硬件加速，或换用 Chrome / Edge / Firefox 打开。');
    return;
  }

  /* --------------------------------------------------------------- scene ---- */
  var canvas = document.getElementById('bg');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07040f, 0.085);

  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 3.7;

  var pivot = new THREE.Group();
  scene.add(pivot);

  var wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x9d7bff,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });

  var pointMaterial = new THREE.PointsMaterial({
    color: 0x9fe8ff,
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  var geometry = buildGeometry(SHAPE);
  var basePositions = new Float32Array(geometry.attributes.position.array);

  var wire = new THREE.Mesh(geometry, wireMaterial);
  wire.frustumCulled = false;
  var dots = new THREE.Points(geometry, pointMaterial);
  dots.frustumCulled = false;
  pivot.add(wire);
  pivot.add(dots);

  var positionAttr = geometry.attributes.position;

  /* ---------------------------------------------------------------- loop ---- */
  var index = 0;
  var holdTimer = 0;
  var blendT = 1;              // 1 = settled
  var fromPositions = new Float32Array(basePositions);
  var current = CYCLE[0];

  var easeInOut = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  function advance() {
    fromPositions = new Float32Array(positionAttr.array);
    index = (index + 1) % CYCLE.length;
    current = CYCLE[index];
    blendT = 0;
    holdTimer = 0;
    updateLabel();
  }

  function updateLabel() {
    var el = document.getElementById('bgLabel');
    if (!el) return;
    var spec = DEFORMATIONS[current];
    el.textContent = (spec ? spec.name + ' / ' + spec.cn : current);
  }

  if (SHOW_LABEL) {
    var label = document.createElement('div');
    label.id = 'bgLabel';
    label.className = 'bg-label';
    document.body.appendChild(label);
    updateLabel();
  }

  var clock = new THREE.Clock();
  var t = 0;

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    // Cycle: hold, then blend into the next deformation.
    if (blendT >= 1) {
      holdTimer += dt;
      if (holdTimer >= HOLD) advance();
    } else {
      blendT = Math.min(1, blendT + dt / MORPH);
    }

    // Breathing strength keeps the form alive between transitions.
    var spec = DEFORMATIONS[current];
    var scale = spec && spec.breatheScale != null ? spec.breatheScale : 1;
    var strength = 1 + BREATHE * scale * Math.sin(t * 0.42);

    var target = applyDeformation(basePositions, current, strength);
    var arr = positionAttr.array;
    if (blendT < 1) {
      var e = easeInOut(blendT);
      for (var i = 0; i < arr.length; i++) arr[i] = fromPositions[i] + (target[i] - fromPositions[i]) * e;
    } else {
      arr.set(target);
    }
    positionAttr.needsUpdate = true;

    // Continuous rotation with a slow tilt so the silhouette keeps changing.
    pivot.rotation.y += dt * SPIN;
    pivot.rotation.x = 0.16 * Math.sin(t * 0.11);
    pivot.rotation.z = 0.05 * Math.sin(t * 0.07);

    // Slow hue drift across wireframe and vertices.
    var hue = HUE + 0.05 * Math.sin(t * 0.06);
    wireMaterial.color.setHSL((hue + 1) % 1, 0.62, 0.6);
    pointMaterial.color.setHSL((hue + 0.12) % 1, 0.7, 0.72);

    renderer.render(scene, camera);
  }

  frame();
})();
