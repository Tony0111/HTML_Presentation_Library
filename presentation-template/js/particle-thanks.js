/* Original particle typography, inspired visually by the Library playground.
   Uses the template's Three.js, not the playground's notification-licensed code. */
(function () {
  'use strict';
  function create(reduced) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 1, 10000);
    camera.position.z = 1600;
    const stage = document.getElementById('stage');
    const el = document.createElement('section');
    el.id = 'particle-thanks';
    el.hidden = true;
    el.innerHTML = '<h1 class="thanks-accessible">Thanks</h1>';
    stage.appendChild(el);

    const mask = document.createElement('canvas');
    mask.width = 1000; mask.height = 300;
    const g = mask.getContext('2d');
    g.fillStyle = '#ffffff';
    g.font = '600 240px "Presentation Serif SC", Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Thanks', 500, 157, 940);
    const pixels = g.getImageData(0, 0, mask.width, mask.height).data;
    const positions = [], origins = [], seeds = [], colors = [];
    let seed = 4201;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let y = 0; y < mask.height; y += 2) {
      for (let x = 0; x < mask.width; x += 2) {
        if (pixels[(y * mask.width + x) * 4 + 3] < 100) continue;
        positions.push((x - 500) * 1.45, (150 - y) * 1.45, 0);
        origins.push((random() - .5) * 1900, (random() - .5) * 850, (random() - .5) * 480);
        seeds.push(random());
        const color = new THREE.Color(random() > .16 ? '#ae6150' : '#bd8b76');
        colors.push(color.r, color.g, color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aOrigin', new THREE.Float32BufferAttribute(origins, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const uniforms = {
      uTime: { value: 0 }, uAssemble: { value: 1 }, uBurst: { value: 0 },
      uPointer: { value: new THREE.Vector2(10000, 10000) },
      uPointScale: { value: 1 }, uMotion: { value: reduced ? 0 : 1 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms, vertexColors: true, transparent: true, depthWrite: false,
      vertexShader: `
        attribute vec3 aOrigin;
        attribute float aSeed;
        uniform float uTime, uAssemble, uBurst, uPointScale, uMotion;
        uniform vec2 uPointer;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec3 p = mix(aOrigin, position, uAssemble);
          float phase = aSeed * 6.28318;
          p.xy += vec2(sin(uTime * .7 + phase), cos(uTime * .6 + phase)) * 1.7 * uMotion;
          vec2 away = p.xy - uPointer;
          float influence = 1.0 - smoothstep(0.0, 145.0, length(away));
          p.xy += normalize(away + vec2(.001)) * influence * 72.0 * uMotion;
          p.z += sin(phase) * influence * 70.0 * uMotion;
          p += (aOrigin - position) * uBurst * .55;
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp((2.0 + aSeed * 1.5) * uPointScale * 1600.0 / -view.z, 1.0, 12.0);
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float distanceToCenter = length(gl_PointCoord - .5);
          float alpha = 1.0 - smoothstep(.22, .5, distanceToCenter);
          if (alpha < .02) discard;
          gl_FragColor = vec4(vColor, alpha * .94);
          #include <colorspace_fragment>
        }`
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    let active = false, start = 0, last = 0, elapsed = 0, burstStart = -Infinity;
    const pointerTarget = new THREE.Vector2(10000, 10000);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    stage.addEventListener('pointermove', event => {
      if (!active || reduced) return;
      const r = stage.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(
        (event.clientX - r.left) / r.width * 2 - 1,
        1 - (event.clientY - r.top) / r.height * 2), camera);
      if (raycaster.ray.intersectPlane(plane, hit)) pointerTarget.set(hit.x, hit.y);
    });
    stage.addEventListener('pointerleave', () => pointerTarget.set(10000, 10000));
    stage.addEventListener('click', () => { if (active && !reduced) burstStart = elapsed; });
    function update(now) {
      if (!active) return;
      const delta = Math.min(Math.max((now - last) / 1000, 0), .05);
      last = now;
      if (reduced) return;
      elapsed += delta;
      const t = Math.min((now - start) / 1800, 1);
      uniforms.uAssemble.value = 1 - Math.pow(1 - t, 3);
      uniforms.uTime.value = elapsed;
      const age = elapsed - burstStart;
      uniforms.uBurst.value = age < 2.4 ? Math.sin(Math.PI * age / 2.4) * .8 : 0;
      uniforms.uPointer.value.lerp(pointerTarget, 1 - Math.exp(-delta * 12));
    }
    return { scene, camera, update,
      get active() { return active; },
      show() {
        active = true; el.hidden = false; stage.dataset.thanks = 'true';
        start = last = performance.now(); elapsed = 0; burstStart = -Infinity;
        pointerTarget.set(10000, 10000); uniforms.uPointer.value.copy(pointerTarget);
        uniforms.uAssemble.value = reduced ? 1 : .06;
        uniforms.uTime.value = uniforms.uBurst.value = 0;
        return Promise.resolve(true);
      },
      hide() { active = false; el.hidden = true; delete stage.dataset.thanks; },
      resize(w, h, scale) {
        camera.aspect = w / h;
        camera.fov = 2 * Math.atan(h / 2 / 1600) * 180 / Math.PI;
        camera.updateProjectionMatrix();
        uniforms.uPointScale.value = scale * Math.min(devicePixelRatio || 1, 2);
      }
    };
  }
  window.ParticleThanks = { create };
})();
