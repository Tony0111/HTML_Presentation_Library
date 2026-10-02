/* Offline rebuild of sphere_particle: one GSAP timeline interpolates the complete buffers. */
(() => {
  const count = 12000;
  const state = { mode: 'sphere', morphTween: null, returnTimer: null };
  let scene, camera, renderer, particles;
  const status = document.getElementById('status');

  const setStatus = (text) => { if (status) status.textContent = text; };

  function sphericalPoint(i) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    return {
      x: 8 * Math.cos(theta) * Math.sin(phi),
      y: 8 * Math.sin(theta) * Math.sin(phi),
      z: 8 * Math.cos(phi),
    };
  }

  function sphereBuffers() {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const point = sphericalPoint(i);
      positions[i * 3] = point.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5;
      const depth = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2) / 8;
      const color = new THREE.Color().setHSL(0.5 + depth * 0.2, 0.7, 0.4 + depth * 0.3);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    return { positions, colors };
  }

  function createTextPoints(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 100;
    const padding = 20;
    ctx.font = `bold ${fontSize}px Arial`;
    const width = ctx.measureText(text).width;
    canvas.width = width + padding * 2;
    canvas.height = fontSize + padding * 2;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points = [];
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 128 && Math.random() < 0.3) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        points.push({ x: (x - canvas.width / 2) / 10, y: -(y - canvas.height / 2) / 10 });
      }
    }
    return points;
  }

  function textBuffers(text) {
    const points = createTextPoints(text);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      if (i < points.length) {
        positions.set([points[i].x, points[i].y, 0], i * 3);
      } else {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 20 + 10;
        positions.set([Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 10], i * 3);
      }
    }
    return positions;
  }

  function interpolateTo(targetPositions, targetColors, duration, done) {
    if (state.morphTween) state.morphTween.kill();
    const positionAttribute = particles.geometry.attributes.position;
    const colorAttribute = particles.geometry.attributes.color;
    const fromPositions = new Float32Array(positionAttribute.array);
    const fromColors = new Float32Array(colorAttribute.array);
    const progress = { value: 0 };
    state.morphTween = gsap.to(progress, {
      value: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = progress.value;
        for (let i = 0; i < positionAttribute.array.length; i += 1) {
          positionAttribute.array[i] = fromPositions[i] + (targetPositions[i] - fromPositions[i]) * t;
          if (targetColors) colorAttribute.array[i] = fromColors[i] + (targetColors[i] - fromColors[i]) * t;
        }
        positionAttribute.needsUpdate = true;
        if (targetColors) colorAttribute.needsUpdate = true;
      },
      onComplete: done,
    });
  }

  function morphToText(text) {
    if (!text) return;
    clearTimeout(state.returnTimer);
    state.mode = 'text';
    particles.rotation.set(0, 0, 0);
    setStatus(`TEXT / ${text.toUpperCase()} / RETURNING SOON`);
    interpolateTo(textBuffers(text), null, 2, () => {});
    state.returnTimer = setTimeout(morphToSphere, 4000);
  }

  function morphToSphere() {
    clearTimeout(state.returnTimer);
    state.mode = 'sphere';
    setStatus('12,000 PARTICLES / READY');
    const target = sphereBuffers();
    interpolateTo(target.positions, target.colors, 2, () => {});
  }

  function createParticles() {
    const buffers = sphereBuffers();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, sizeAttenuation: true });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
    camera.position.z = 25;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x000000);
    document.getElementById('container').appendChild(renderer.domElement);
    createParticles();

    const input = document.getElementById('morphText');
    document.getElementById('typeBtn').addEventListener('click', () => morphToText(input.value.trim()));
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') morphToText(input.value.trim()); });
    addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

    const animate = () => {
      requestAnimationFrame(animate);
      if (state.mode === 'sphere') particles.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();
  }

  init();
})();
