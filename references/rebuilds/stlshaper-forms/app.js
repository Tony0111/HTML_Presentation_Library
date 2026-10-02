/*
 * STLShaper Forms — offline study.
 *
 * The deformation math below is a faithful port of worker.js from
 * github_res/stlshaper (MIT). Every function keeps the same formulas and
 * parameter semantics; only the input differs — instead of an uploaded STL,
 * these run on procedural meshes so the page needs no file, no worker and no
 * network.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------- noise ---- */
  // Ported 1:1 from worker.js: simpleHash / whiteNoise / perlin* / sampleNoise.
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

  function perlinFade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

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
  // Each returns a NEW array; `base` is never mutated.

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
      var ox = allowX ? (cx / len) * offset : 0;
      var oy = allowY ? (cy / len) * offset : 0;
      var oz = allowZ ? (cz / len) * offset : 0;
      out[i] = x + ox; out[i + 1] = y + oy; out[i + 2] = z + oz;
    }
    return out;
  }

  function deformSine(base, p) {
    var out = new Float32Array(base);
    var d = AXIS_COORD[p.driverAxis];
    var allowX = p.dispAxis === 'all' || p.dispAxis.indexOf('x') !== -1;
    var allowY = p.dispAxis === 'all' || p.dispAxis.indexOf('y') !== -1;
    var allowZ = p.dispAxis === 'all' || p.dispAxis.indexOf('z') !== -1;
    for (var i = 0; i < out.length; i += 3) {
      var disp = Math.sin(out[i + d] * p.frequency) * p.amplitude;
      if (allowX) out[i] += disp;
      if (allowY) out[i + 1] += disp;
      if (allowZ) out[i + 2] += disp;
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

  function deformInflate(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var cx = (bbox.min.x + bbox.max.x) * 0.5;
    var cy = (bbox.min.y + bbox.max.y) * 0.5;
    var cz = (bbox.min.z + bbox.max.z) * 0.5;
    var maxRadius = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z) * 0.5 || 1;
    for (var i = 0; i < out.length; i += 3) {
      var dx = out[i] - cx, dy = out[i + 1] - cy, dz = out[i + 2] - cz;
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      var scale = 1 + p.amount * (dist / maxRadius);
      out[i] = cx + dx * scale; out[i + 1] = cy + dy * scale; out[i + 2] = cz + dz * scale;
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
        if (axis === 'x') { var nx = x * cos - y * sin, ny = x * sin + y * cos; x = nx; y = ny; }
        else if (axis === 'y') { var ny2 = y * cos - z * sin, nz = y * sin + z * cos; y = ny2; z = nz; }
        else { var nx2 = x * cos - z * sin, nz2 = x * sin + z * cos; x = nx2; z = nz2; }
        out[i] = x; out[i + 1] = y; out[i + 2] = z;
      }
    }
    return out;
  }

  function deformRipple(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var cx = (bbox.min.x + bbox.max.x) * 0.5;
    var cy = (bbox.min.y + bbox.max.y) * 0.5;
    var cz = (bbox.min.z + bbox.max.z) * 0.5;
    var axes = getAxisList(p.axis);
    for (var a = 0; a < axes.length; a++) {
      var axis = axes[a];
      for (var i = 0; i < out.length; i += 3) {
        var x = out[i], y = out[i + 1], z = out[i + 2], r = 0;
        if (axis === 'x') { r = Math.sqrt((y - cy) * (y - cy) + (z - cz) * (z - cz)); out[i] = x + Math.sin(r * p.frequency) * p.amplitude; }
        else if (axis === 'y') { r = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz)); out[i + 1] = y + Math.sin(r * p.frequency) * p.amplitude; }
        else { r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)); out[i + 2] = z + Math.sin(r * p.frequency) * p.amplitude; }
      }
    }
    return out;
  }

  function deformWarp(base, p) {
    var out = new Float32Array(base);
    for (var i = 0; i < out.length; i += 3) {
      var x = out[i], y = out[i + 1], z = out[i + 2];
      out[i] = x + Math.sin(y * p.scale) * p.strength;
      out[i + 1] = y + Math.sin(z * p.scale) * p.strength;
      out[i + 2] = z + Math.sin(x * p.scale) * p.strength;
    }
    return out;
  }

  function deformHyper(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var axes = getAxisList(p.axis);
    var amount = p.amount || 0.6;
    var denom = Math.sinh(amount) || 1;
    for (var a = 0; a < axes.length; a++) {
      var axis = axes[a];
      var min = bbox.min[axis], max = bbox.max[axis];
      var range = (max - min) || 1;
      var center = (min + max) * 0.5;
      var idx = AXIS_COORD[axis];
      for (var i = 0; i < out.length; i += 3) {
        var v = out[i + idx];
        var t = (v - center) / range;
        var stretched = Math.sinh(t * amount) / denom;
        out[i + idx] = center + stretched * range;
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

  function deformSpherize(base, p) {
    var out = new Float32Array(base);
    var bbox = boundsOf(base);
    var cx = (bbox.min.x + bbox.max.x) * 0.5;
    var cy = (bbox.min.y + bbox.max.y) * 0.5;
    var cz = (bbox.min.z + bbox.max.z) * 0.5;
    var radius = p.radius || 0;
    if (radius <= 0) {
      radius = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z) * 0.5;
    }
    for (var i = 0; i < out.length; i += 3) {
      var dx = out[i] - cx, dy = out[i + 1] - cy, dz = out[i + 2] - cz;
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-8;
      var target = dist + (radius - dist) * p.factor;
      var scale = target / dist;
      out[i] = cx + dx * scale; out[i + 1] = cy + dy * scale; out[i + 2] = cz + dz * scale;
    }
    return out;
  }

  /* ------------------------------------------------------- deformation set ---- */
  // `key` names the parameter that the strength slider multiplies, matching the
  // role that parameter plays in STLShaper's own panel.
  var DEFORMATIONS = [
    { id: 'noise', name: 'Noise', cn: '噪声', desc: 'Perlin 噪声沿法向推挤表面，形成有机的隆起。', strengthKey: 'intensity', base: { intensity: 0.30, scale: 2.2, type: 'perlin', axis: 'all', seed: 0 } },
    { id: 'sine', name: 'Sine Wave', cn: '正弦波', desc: '沿一个轴采样正弦，把模型推成有规律的波纹。', strengthKey: 'amplitude', base: { amplitude: 0.16, frequency: 6.5, driverAxis: 'y', dispAxis: 'y' } },
    { id: 'ripple', name: 'Ripple', cn: '同心波纹', desc: '以模型中心为轴向外扩散的同心波。', strengthKey: 'amplitude', base: { amplitude: 0.11, frequency: 11, axis: 'y' } },
    { id: 'twist', name: 'Twist', cn: '扭曲', desc: '沿轴旋转，越远离中心旋转角度越大。', strengthKey: 'angle', base: { angle: 260, axis: 'y' } },
    { id: 'bend', name: 'Bend', cn: '弯曲', desc: '把模型沿一个轴弯成弧线。', strengthKey: 'strength', base: { strength: 0.9, axis: 'y' } },
    { id: 'inflate', name: 'Inflate', cn: '膨胀', desc: '离中心越远，向外扩张越多。', strengthKey: 'amount', base: { amount: 0.5 } },
    { id: 'hyper', name: 'Hyperbolic', cn: '双曲拉伸', desc: '用双曲函数沿轴拉伸，产生两端拉长的弹性形态。', strengthKey: 'amount', base: { amount: 1.2, axis: 'y' } },
    { id: 'spherize', name: 'Spherize', cn: '球化', desc: '把形体朝一个球面收拢，圆环会被拉成球。', strengthKey: 'factor', base: { factor: 0.6, radius: 0.62 } },
    { id: 'warp', name: 'Warp', cn: '空间扰动', desc: '三个轴互相用正弦错位，产生流动的剪切感。', strengthKey: 'strength', base: { strength: 0.16, scale: 3.4 } },
    { id: 'pixelate', name: 'Pixelate', cn: '像素化', desc: '把顶点吸附到网格上，得到块状、低分辨率的外观。', strengthKey: 'size', base: { size: 0.15, axis: 'all' } },
    { id: 'boundary', name: 'Boundary', cn: '边界撕裂', desc: '只扰动包围盒边缘附近的顶点，让轮廓破碎。', strengthKey: 'jitter', base: { threshold: 0.16, jitter: 0.09 } },
  ];

  var DEFORM_BY_ID = {};
  DEFORMATIONS.forEach(function (d) { DEFORM_BY_ID[d.id] = d; });

  function applyDeformation(base, id, strength) {
    var spec = DEFORM_BY_ID[id];
    var params = {};
    for (var k in spec.base) params[k] = spec.base[k];
    params[spec.strengthKey] = params[spec.strengthKey] * strength;
    switch (id) {
      case 'noise': return deformNoise(base, params);
      case 'sine': return deformSine(base, params);
      case 'ripple': return deformRipple(base, params);
      case 'twist': return deformTwist(base, params);
      case 'bend': return deformBend(base, params);
      case 'inflate': return deformInflate(base, params);
      case 'hyper': return deformHyper(base, params);
      case 'spherize': return deformSpherize(base, params);
      case 'warp': return deformWarp(base, params);
      case 'pixelate': return deformPixel(base, params);
      case 'boundary': return deformBoundary(base, params);
      default: return new Float32Array(base);
    }
  }

  /* --------------------------------------------------------------- shapes ---- */
  var SHAPES = [
    { id: 'sphere', name: 'Sphere', cn: '球体' },
    { id: 'torus', name: 'Torus', cn: '圆环' },
    { id: 'knot', name: 'Knot', cn: '环结' },
    { id: 'crystal', name: 'Crystal', cn: '晶体' },
  ];

  function buildGeometry(shape) {
    var geo;
    switch (shape) {
      case 'torus': geo = new THREE.TorusGeometry(0.78, 0.34, 28, 88); break;
      case 'knot': geo = new THREE.TorusKnotGeometry(0.72, 0.22, 150, 18); break;
      case 'crystal': geo = new THREE.IcosahedronGeometry(1.1, 3); break;
      default: geo = new THREE.SphereGeometry(1, 68, 50);
    }
    // Normalise to a common size so every shape and every deformation reads at
    // the same visual scale.
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
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    return geo;
  }

  /* --------------------------------------------------------------- scene ---- */
  // Fail visibly instead of leaving a blank page when WebGL or the local
  // Three.js copy is unavailable.
  function showFallback(message) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
      'padding:32px;text-align:center;font-size:14px;line-height:1.8;color:#cbc4e6;z-index:9;background:#06040f;';
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
    showFallback('Three.js 没有加载成功。请确认 vendor/three.min.js 与 index.html 在同一个文件夹中。');
    return;
  }
  if (!webglAvailable()) {
    showFallback('这个演示需要 WebGL。请在浏览器中开启硬件加速，或换用 Chrome / Edge / Firefox 打开。');
    return;
  }

  var canvas = document.getElementById('stage');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.25, 3.6);

  var pivot = new THREE.Group();
  scene.add(pivot);

  var material = new THREE.MeshStandardMaterial({
    color: 0xdae2ff,
    metalness: 0.22,
    roughness: 0.3,
    flatShading: false,
    side: THREE.DoubleSide,
  });

  var pointMaterial = new THREE.PointsMaterial({
    color: 0x8fe6ff,
    size: 0.014,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  var mesh = null;
  var points = null;
  var geometry = null;
  var basePositions = null;

  function addLights() {
    scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x120a26, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(4, 6, 5);
    scene.add(key);
    var violet = new THREE.PointLight(0x9b6bff, 26, 14);
    violet.position.set(-3, 2, 3.4);
    scene.add(violet);
    var cyan = new THREE.PointLight(0x3fd8ff, 20, 14);
    cyan.position.set(3.2, -1.6, 2.6);
    scene.add(cyan);
    var magenta = new THREE.PointLight(0xff5bc8, 16, 16);
    magenta.position.set(0.4, 3.2, -3.6);
    scene.add(magenta);
  }
  addLights();

  /* -------------------------------------------------------------- morph ---- */
  var MORPH_SECONDS = 0.85;
  var morph = { from: null, to: null, t: 1, active: false };

  var state = {
    shape: 'knot',
    deform: 'noise',
    strength: 1,
    wireframe: false,
    showPoints: false,
    auto: true,
    spin: true,
    autoTimer: 0,
  };

  function rebuildShape(shape) {
    state.shape = shape;
    if (mesh) { pivot.remove(mesh); mesh.geometry.dispose(); }
    if (points) { pivot.remove(points); }
    geometry = buildGeometry(shape);
    basePositions = new Float32Array(geometry.attributes.position.array);
    // A faceted crystal reads better with flat shading; flowing shapes do not.
    material.flatShading = shape === 'crystal';
    material.needsUpdate = true;
    mesh = new THREE.Mesh(geometry, material);
    points = new THREE.Points(geometry, pointMaterial);
    points.visible = state.showPoints;
    pivot.add(mesh);
    pivot.add(points);
    morph.from = new Float32Array(basePositions);
    morph.to = applyDeformation(basePositions, state.deform, state.strength);
    morph.t = 0;
    morph.active = true;
  }

  function setDeformation(id, options) {
    state.deform = id;
    morph.from = new Float32Array(geometry.attributes.position.array);
    morph.to = applyDeformation(basePositions, id, state.strength);
    morph.t = 0;
    morph.active = true;
    state.autoTimer = 0;
    if (!options || !options.keepAuto) state.auto = false;
    updateUI();
  }

  function setStrength(value) {
    state.strength = value;
    morph.from = new Float32Array(geometry.attributes.position.array);
    morph.to = applyDeformation(basePositions, state.deform, value);
    morph.t = 0;
    morph.active = true;
    state.autoTimer = 0;
  }

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function stepMorph(dt) {
    if (!morph.active) return;
    morph.t = Math.min(1, morph.t + dt / MORPH_SECONDS);
    var e = easeInOut(morph.t);
    var attr = geometry.attributes.position;
    var arr = attr.array;
    var from = morph.from, to = morph.to;
    for (var i = 0; i < arr.length; i++) arr[i] = from[i] + (to[i] - from[i]) * e;
    attr.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    if (morph.t >= 1) morph.active = false;
  }

  /* --------------------------------------------------------------- orbit ---- */
  var orbit = { rx: 0.06, ry: 0.5, tx: 0.06, ty: 0.5, dragging: false, lx: 0, ly: 0, distance: 3.6 };

  canvas.addEventListener('pointerdown', function (e) {
    orbit.dragging = true; orbit.lx = e.clientX; orbit.ly = e.clientY;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!orbit.dragging) return;
    orbit.ty += (e.clientX - orbit.lx) * 0.007;
    orbit.tx += (e.clientY - orbit.ly) * 0.006;
    orbit.tx = Math.max(-1.3, Math.min(1.3, orbit.tx));
    orbit.lx = e.clientX; orbit.ly = e.clientY;
  });
  function endDrag() { orbit.dragging = false; canvas.classList.remove('dragging'); }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    orbit.distance = Math.max(2.3, Math.min(7, orbit.distance + e.deltaY * 0.0016));
  }, { passive: false });

  /* ------------------------------------------------------------------ UI ---- */
  var shapeRow = document.getElementById('shapeRow');
  var deformRow = document.getElementById('deformRow');
  var strengthInput = document.getElementById('strength');
  var strengthValue = document.getElementById('strengthValue');
  var captionName = document.getElementById('captionName');
  var captionCn = document.getElementById('captionCn');
  var captionDesc = document.getElementById('captionDesc');
  var autoBtn = document.getElementById('autoBtn');
  var spinBtn = document.getElementById('spinBtn');
  var wireBtn = document.getElementById('wireBtn');
  var pointsBtn = document.getElementById('pointsBtn');
  var uiToggle = document.getElementById('uiToggle');
  var root = document.body;

  SHAPES.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.shape = s.id;
    b.innerHTML = '<span>' + s.name + '</span><small>' + s.cn + '</small>';
    b.addEventListener('click', function () {
      state.auto = false;
      rebuildShape(s.id);
      updateUI();
    });
    shapeRow.appendChild(b);
  });

  DEFORMATIONS.forEach(function (d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip wide';
    b.dataset.deform = d.id;
    b.innerHTML = '<span>' + d.name + '</span><small>' + d.cn + '</small>';
    b.addEventListener('click', function () { setDeformation(d.id); });
    deformRow.appendChild(b);
  });

  strengthInput.addEventListener('input', function () {
    var v = parseFloat(strengthInput.value);
    strengthValue.textContent = v.toFixed(2) + '×';
    setStrength(v);
  });

  autoBtn.addEventListener('click', function () { state.auto = !state.auto; state.autoTimer = 0; updateUI(); });
  spinBtn.addEventListener('click', function () { state.spin = !state.spin; updateUI(); });
  wireBtn.addEventListener('click', function () { state.wireframe = !state.wireframe; material.wireframe = state.wireframe; updateUI(); });
  pointsBtn.addEventListener('click', function () { state.showPoints = !state.showPoints; if (points) points.visible = state.showPoints; updateUI(); });
  uiToggle.addEventListener('click', function () { root.classList.toggle('hide-ui'); });

  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); state.auto = !state.auto; state.autoTimer = 0; updateUI(); }
    else if (e.key === 'h' || e.key === 'H') { root.classList.toggle('hide-ui'); }
    else if (e.key === 'r' || e.key === 'R') { orbit.tx = 0.06; orbit.ty = 0.5; orbit.distance = 3.6; }
    else if (e.key === 'ArrowRight') { cycle(1); }
    else if (e.key === 'ArrowLeft') { cycle(-1); }
  });

  function cycle(step) {
    var idx = DEFORMATIONS.findIndex(function (d) { return d.id === state.deform; });
    idx = (idx + step + DEFORMATIONS.length) % DEFORMATIONS.length;
    setDeformation(DEFORMATIONS[idx].id);
  }

  function updateUI() {
    Array.prototype.forEach.call(shapeRow.children, function (b) {
      b.classList.toggle('active', b.dataset.shape === state.shape);
    });
    Array.prototype.forEach.call(deformRow.children, function (b) {
      b.classList.toggle('active', b.dataset.deform === state.deform);
    });
    var d = DEFORM_BY_ID[state.deform];
    captionName.textContent = d.name;
    captionCn.textContent = d.cn;
    captionDesc.textContent = d.desc;
    autoBtn.classList.toggle('on', state.auto);
    autoBtn.textContent = state.auto ? 'Auto ●' : 'Auto ○';
    spinBtn.classList.toggle('on', state.spin);
    wireBtn.classList.toggle('on', state.wireframe);
    pointsBtn.classList.toggle('on', state.showPoints);
  }

  /* -------------------------------------------------------------- resize ---- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* --------------------------------------------------------------- loop ---- */
  var clock = new THREE.Clock();
  var AUTO_SECONDS = 3.6;

  function tick() {
    requestAnimationFrame(tick);
    var dt = Math.min(clock.getDelta(), 0.05);

    if (state.auto) {
      state.autoTimer += dt;
      if (state.autoTimer >= AUTO_SECONDS && !morph.active) {
        state.autoTimer = 0;
        var idx = DEFORMATIONS.findIndex(function (d) { return d.id === state.deform; });
        var next = DEFORMATIONS[(idx + 1) % DEFORMATIONS.length];
        state.deform = next.id;
        morph.from = new Float32Array(geometry.attributes.position.array);
        morph.to = applyDeformation(basePositions, next.id, state.strength);
        morph.t = 0;
        morph.active = true;
        updateUI();
      }
    }

    stepMorph(dt);

    if (state.spin && !orbit.dragging) { orbit.ty += dt * 0.28; }
    orbit.rx += (orbit.tx - orbit.rx) * 0.12;
    orbit.ry += (orbit.ty - orbit.ry) * 0.12;
    pivot.rotation.x = orbit.rx;
    pivot.rotation.y = orbit.ry;

    camera.position.z += (orbit.distance - camera.position.z) * 0.12;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  /* --------------------------------------------------------------- boot ---- */
  rebuildShape(state.shape);
  state.auto = true;
  updateUI();
  tick();
})();
