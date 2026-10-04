/* Adapted from Library's sphere-particle/app.js (MIT, develper21).
   Keep its sphere distribution and canvas text sampling; morph buffers on the GPU. */
(function () {
  'use strict';
  const COUNT = 12000;
  let scene, camera, material, started = 0, motionReduced = false, textWidth = 1200;
  const pointer = new THREE.Vector2(), target = new THREE.Vector2();

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-960, 960, 540, -540, 1, 4000);
    camera.position.z = 1600;
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 360;
    const g = canvas.getContext('2d');
    g.font = 'bold 260px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.fillText('Thanks', 640, 180);
    const pixels = g.getImageData(0, 0, 1280, 360).data, samples = [];
    for (let y = 0; y < 360; y += 2) {
      for (let x = 0; x < 1280; x += 2) {
        if (pixels[(y * 1280 + x) * 4 + 3] > 128) samples.push([x - 640, 180 - y]);
      }
    }
    const minX = Math.min(...samples.map(p => p[0])), maxX = Math.max(...samples.map(p => p[0]));
    const minY = Math.min(...samples.map(p => p[1])), maxY = Math.max(...samples.map(p => p[1]));
    const factor = textWidth / (maxX - minX), centerY = (minY + maxY) / 2;
    const sphere = new Float32Array(COUNT * 3), text = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const cyan = new THREE.Color('#207f7b'), orange = new THREE.Color('#d27636');
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(-1 + 2 * i / COUNT), theta = Math.sqrt(COUNT * Math.PI) * phi;
      sphere.set([300 * Math.cos(theta) * Math.sin(phi), 300 * Math.sin(theta) * Math.sin(phi), 300 * Math.cos(phi)], i * 3);
      const sample = samples[Math.floor(i * samples.length / COUNT)];
      const x = (sample[0] - (minX + maxX) / 2) * factor;
      text.set([x + Math.sin(i * 2.37) * factor * 0.45,
        (sample[1] - centerY) * factor + Math.cos(i * 1.93) * factor * 0.45, Math.sin(i * 1.7) * 2], i * 3);
      const color = x > textWidth * 0.28 ? orange : cyan;
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(sphere, 3));
    geometry.setAttribute('textPosition', new THREE.BufferAttribute(text, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    material = new THREE.ShaderMaterial({
      uniforms: { morph: { value: 0 }, time: { value: 0 }, cursor: { value: pointer }, pointSize: { value: 3 }, still: { value: 0 } },
      vertexShader: `attribute vec3 textPosition; attribute vec3 color;
        uniform float morph,time,pointSize,still; uniform vec2 cursor; varying vec3 ink;
        void main(){
          float a=time*0.25; vec3 sphere=position;
          sphere.x=position.x*cos(a)+position.z*sin(a);
          sphere.z=-position.x*sin(a)+position.z*cos(a);
          vec3 p=mix(sphere,textPosition,morph);
          p.y+=sin(time*1.2+textPosition.x*0.015)*1.8*morph*(1.-still);
          p.xy+=cursor*(1.-still)*vec2(18.,10.);
          ink=color; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
          gl_PointSize=pointSize;
        }`,
      fragmentShader: `varying vec3 ink;
        void main(){float d=length(gl_PointCoord-vec2(.5));
          float alpha=1.-smoothstep(.25,.5,d); if(alpha<.02) discard;
          gl_FragColor=vec4(ink,alpha*.9);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, depthTest: false,
    });
    const particles = new THREE.Points(geometry, material);
    particles.frustumCulled = false; scene.add(particles);
    return { scene, camera };
  }

  function show(reduced) {
    started = performance.now(); motionReduced = reduced;
    target.set(0, 0); pointer.set(0, 0);
    material.uniforms.still.value = reduced ? 1 : 0;
  }
  function move(x, y) { target.set(x * 2 - 1, y * 2 - 1); }
  function resize(w, h, scale, pixelRatio) {
    camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    material.uniforms.pointSize.value = Math.max(1.1, 3.1 * scale * pixelRatio);
  }
  function update(now, dt) {
    const elapsed = Math.max(0, (now - started) / 1000);
    const t = motionReduced ? 1 : Math.max(0, Math.min(1, (elapsed - 0.5) / 2.2));
    material.uniforms.morph.value = t * t * (3 - 2 * t);
    material.uniforms.time.value = motionReduced ? 0 : elapsed;
    pointer.lerp(target, 1 - Math.exp(-dt * 6));
  }
  function inspect() { return { count: COUNT, morph: material.uniforms.morph.value, time: material.uniforms.time.value, textWidth }; }
  window.ThanksParticles = { init, show, move, resize, update, inspect };
})();
