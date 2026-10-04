/* Adapted from Library sphere-particle/app.js (develper21, MIT).
   Sphere sampling and text-mask targets share a single interpolation buffer. */
(function () {
  'use strict';
  function create(config, reduced, spatial = true) {
    const slide = config.slides.find(s => s.type === 'closing');
    const title = slide ? slide.title.join(' ') : 'THANKS';
    const el = document.createElement('section');
    el.id = 'particle-closing'; el.hidden = true;
    el.innerHTML = `<h1 class="closing-title">${SlideRenderer.escape(title)}</h1>`;
    document.getElementById('stage').appendChild(el);
    let scene = null, camera = null, particles = null;
    let active = false, start = 0, width = 1920, height = 1080;
    el.dataset.spatial = String(spatial);
    const count = 12000, sphere = new Float32Array(count * 3), target = new Float32Array(count * 3);
    const pointer = { x:0, y:0 }, smooth = { x:0, y:0 };
    if (spatial) {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(37, 1920 / 1080, 1, 6000);
      camera.position.z = 1600;
      const mask = document.createElement('canvas'), ctx = mask.getContext('2d');
      ctx.font = '400 160px "Departure Mono", monospace';
      mask.width = Math.ceil(ctx.measureText(title).width + 80); mask.height = 220;
      ctx.font = '400 160px "Departure Mono", monospace';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = 'white';
      ctx.fillText(title, mask.width / 2, mask.height / 2);
      const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data, points = [];
      for (let y = 0; y < mask.height; y += 2) {
        for (let x = 0; x < mask.width; x += 2) {
          if (pixels[(y * mask.width + x) * 4] > 128) points.push([x - mask.width / 2, mask.height / 2 - y]);
        }
      }
      const colors = new Float32Array(count * 3);
      const palette = ['#20211f', '#cc4331', '#267d78', '#355ab1'].map(c => new THREE.Color(c));
      const scale = Math.min(1.7, 1300 / mask.width);
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + 2 * i / count), theta = Math.sqrt(count * Math.PI) * phi;
        sphere.set([310 * Math.cos(theta) * Math.sin(phi), 310 * Math.sin(theta) * Math.sin(phi), 310 * Math.cos(phi)], i * 3);
        const point = points[i % points.length] || [0, 0];
        // Deterministic sub-pixel offsets keep the mask dense without duplicate points.
        target.set([point[0] * scale + Math.sin(i * 12.9898), point[1] * scale + Math.cos(i * 7.23), Math.sin(i) * 2], i * 3);
        const color = palette[Math.floor(i / Math.max(1, points.length / 6)) % palette.length];
        colors.set([color.r, color.g, color.b], i * 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sphere), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size:5, vertexColors:true, sizeAttenuation:true }));
      particles.frustumCulled = false; scene.add(particles);
      el.dataset.spatial = 'true';
    }
    document.getElementById('stage').addEventListener('pointermove', event => {
      if (!active || reduced) return;
      const rect = document.getElementById('stage').getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - .5;
      pointer.y = (event.clientY - rect.top) / rect.height - .5;
    });
    function update(now) {
      if (!active || !spatial) return;
      const t = reduced ? 1 : Math.min(1, Math.max(0, (now - start) / 1400));
      const p = t * t * (3 - 2 * t), positions = particles.geometry.attributes.position;
      for (let i = 0; i < positions.array.length; i++) positions.array[i] = sphere[i] + (target[i] - sphere[i]) * p;
      positions.needsUpdate = true;
      smooth.x += (pointer.x - smooth.x) * .05; smooth.y += (pointer.y - smooth.y) * .05;
      particles.rotation.set(-smooth.y * .08, smooth.x * .1, 0);
      el.dataset.settled = String(t === 1);
    }
    return { scene, camera, update,
      get active() { return active; },
      show() {
        active = true; el.hidden = false; start = performance.now();
        pointer.x = pointer.y = smooth.x = smooth.y = 0;
        document.getElementById('stage').dataset.closing = 'true';
        update(start); return Promise.resolve(true);
      },
      hide() { active = false; el.hidden = true; delete document.getElementById('stage').dataset.closing; },
      setStatic() { spatial = false; el.dataset.spatial = 'false'; el.dataset.settled = 'true'; },
      resize(w, h) {
        width = w; height = h;
        if (!camera) return;
        camera.aspect = width / height;
        camera.fov = 2 * Math.atan(height / 3200) * 180 / Math.PI;
        camera.updateProjectionMatrix();
      }
    };
  }
  window.ParticleClosing = { create };
})();
