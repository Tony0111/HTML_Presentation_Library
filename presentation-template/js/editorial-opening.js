/* Bright opening isolated from the existing chapter and closing scenes. */
(function () {
  'use strict';
  const W = 1920, H = 1080, F = 1600;
  const BRICK = '#ae6150', PAPER = '#f3efe6';
  const clamp = n => Math.max(0, Math.min(1, n));
  function scanTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 384;
    const g = canvas.getContext('2d');
    const image = g.createImageData(384, 384);
    let seed = 731;
    // Fixed grain avoids per-frame noise, flicker, and network dependencies.
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = 90 + (seed >>> 24) * 0.6;
      image.data[i] = value + 10;
      image.data[i + 1] = value + 12;
      image.data[i + 2] = value + 7;
      image.data[i + 3] = 10 + ((seed >>> 16) & 31);
    }
    g.putImageData(image, 0, 0);
    for (let y = 0; y < 384; y += 3) {
      g.fillStyle = 'rgba(78,83,73,0.012)';
      g.fillRect(0, y, 384, 1);
    }
    return canvas;
  }
  function create(config, reduced) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W / H, 1, 12000);
    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xf4f6ed, 0xa5aaa0, 1.7));
    const key = new THREE.DirectionalLight(0xfff5e8, 2.1);
    key.position.set(-700, 1000, 1400);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xf3e8dc, 0.5);
    fill.position.set(900, -100, 400);
    scene.add(fill);
    const el = document.createElement('section');
    el.id = 'editorial-opening';
    el.hidden = true;
    el.setAttribute('aria-label', '封面与目录');
    document.getElementById('stage').appendChild(el);
    const grain = scanTexture();
    el.style.setProperty('--opening-grain', `url("${grain.toDataURL()}")`);
    const esc = SlideRenderer.escape;
    const cover = config.slides.find(s => s.type === 'cover');
    const title = cover ? cover.title : [config.meta.title];
    const chapters = config.chapters || [];
    el.innerHTML = `
      <div class="opening-print-frame" aria-hidden="true">
        <i class="opening-crop opening-crop-tl"></i><i class="opening-crop opening-crop-tr"></i>
        <i class="opening-crop opening-crop-bl"></i><i class="opening-crop opening-crop-br"></i>
        <div class="opening-edge-blocks"><i></i><i></i><i></i></div>
        <div class="opening-edge-ticks"></div><div class="opening-registration"></div>
      </div>
      <div class="opening-cover-print" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <header class="opening-masthead"><span class="opening-brand">${esc(config.meta.display || config.meta.title)}</span>
        <div class="opening-ink-key" aria-hidden="true"><i></i><i></i><i></i><i></i></div></header>
      <div class="opening-cover"><div class="opening-kicker">${esc(config.meta.kicker || '')}</div>
        <h1>${title.map((line, i) => i === title.length - 1
          ? `<span class="opening-title-accent" aria-label="${esc(line)}">${Array.from(line).map((char, j) => `<span class="opening-keyword-char" aria-hidden="true" style="--char-index:${j}">${esc(char)}</span>`).join('')}</span>`
          : `<span>${esc(line)}</span>`).join('')}</h1>
        <p class="opening-author">${esc(config.meta.author || '')}</p></div>
      <div class="opening-contents"><div class="opening-contents-head"><h1>${esc((config.slides.find(s => s.type === 'contents') || {}).title?.join(' ') || '目录')}</h1>
        <span class="opening-contents-en">Contents</span><span class="opening-chapter-total">${String(chapters.length).padStart(2, '0')} CHAPTERS</span></div>
        <ol class="opening-chapters" style="--chapters:${chapters.length}">${chapters.map((c, i) => {
          const start = config.slides.findIndex(s => s.id === c.firstSlideId);
          const next = chapters[i + 1];
          const end = next ? config.slides.findIndex(s => s.id === next.firstSlideId) : config.slides.length;
          return `<li data-chapter="${i}"><span class="opening-chapter-number">${esc(c.number)}</span><h2>${esc(c.title)}</h2>
            <span class="opening-chapter-en">${esc(c.english)}</span><span class="opening-chapter-pages">${String(start + 1).padStart(2, '0')} / ${String(end).padStart(2, '0')}</span></li>`;
        }).join('')}</ol></div>
      <footer class="opening-footer"><span>${esc(config.meta.title)}</span>
        <div class="opening-footer-print" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <span class="opening-footer-index"></span></footer>`;
    const sheets = [];
    const count = Math.max(chapters.length, 4);
    function printTexture(chapter, index) {
      const canvas = document.createElement('canvas');
      canvas.width = 720; canvas.height = 1080;
      const g = canvas.getContext('2d');
      const pale = index % 2 === 1;
      const text = pale ? '#57554e' : PAPER;
      const rule = pale ? '#aaa59a' : '#dec4b5';
      g.fillStyle = pale ? PAPER : BRICK;
      g.fillRect(0, 0, 720, 1080);
      g.fillStyle = 'rgba(228,220,196,0.06)';
      g.fillRect(0, 0, 720, 1080);
      g.fillStyle = pale ? BRICK : PAPER;
      g.globalAlpha = 0.24;
      g.fillRect(662, 0, 58, 260);
      g.fillRect(0, 1048, 210, 32);
      g.globalAlpha = 1;
      g.strokeStyle = rule;
      g.lineWidth = 2;
      g.globalAlpha = 0.65;
      for (let line = 0; line < 17; line++) {
        g.beginPath();
        for (let x = 0; x <= 720; x += 8) {
          const y = 380 + line * 14 + Math.sin(x / 140 + line * 0.16 + index) * (50 + index * 10);
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = text;
      g.font = 'italic 280px Georgia, serif';
      g.fillText(chapter ? chapter.number : String(index + 1).padStart(2, '0'), 46, 330);
      g.fillStyle = text;
      g.font = '500 24px "Presentation Sans SC", sans-serif';
      g.fillText('STUDY / ' + String(index + 1).padStart(2, '0'), 48, 68);
      g.fillStyle = text;
      const first = chapter && config.slides.find(s => s.id === chapter.firstSlideId);
      g.font = '600 52px "Presentation Serif SC", serif';
      (first ? first.title : []).slice(0, 2).forEach((line, i) => g.fillText(line, 48, 800 + i * 72, 624));
      g.fillStyle = text;
      g.font = '22px "Presentation Sans SC", sans-serif';
      g.fillText(chapter ? chapter.english : '', 48, 1000, 624);
      g.strokeStyle = rule;
      g.beginPath(); g.moveTo(48, 104); g.lineTo(672, 104); g.stroke();
      g.save();
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = 0.8;
      g.drawImage(grain, 0, 0, 720, 1080);
      g.restore();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    }
    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(360, 540, 22, 32);
      const base = new Float32Array(geo.attributes.position.array);
      const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: printTexture(chapters[i], i),
        roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      root.add(mesh);
      sheets.push({ mesh, base, geo, mat, index: i });
    }
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128; shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d');
    const shadowGradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 62);
    shadowGradient.addColorStop(0, 'rgba(53,66,59,0.16)');
    shadowGradient.addColorStop(1, 'rgba(45,38,32,0)');
    shadowContext.fillStyle = shadowGradient;
    shadowContext.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadows = sheets.map(() => {
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(500, 150),
        new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
      scene.add(shadow);
      return shadow;
    });
    let active = false, selected = 0;
    let progress = 0, from = 0, to = 0, start = 0, animating = false, resolve = null;
    let logicalWidth = W;
    let pointer = { x: 0, y: 0 }, smoothPointer = { x: 0, y: 0 };
    const stage = document.getElementById('stage');
    stage.addEventListener('pointermove', event => {
      if (!active || reduced) return;
      const r = stage.getBoundingClientRect();
      pointer.x = (event.clientX - r.left) / r.width - 0.5;
      pointer.y = (event.clientY - r.top) / r.height - 0.5;
    });
    stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
    function settle(result = true) {
      if (resolve) { const done = resolve; resolve = null; done(result); }
    }
    function show(name, options = {}) {
      active = true;
      el.hidden = false;
      stage.dataset.opening = name;
      selected = options.chapter || 0;
      el.dataset.mode = name;
      el.dataset.reduced = reduced ? 'true' : 'false';
      el.querySelector('.opening-footer-index').textContent = name === 'cover' ? '01 / COVER' : '02 / CONTENTS';
      el.querySelectorAll('[data-chapter]').forEach((item, i) => {
        item.classList.toggle('is-selected', i === selected);
        if (i === selected) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      });
      settle(false);
      from = progress;
      to = name === 'contents' ? 1 : 0;
      start = performance.now();
      animating = !reduced && Math.abs(from - to) > 0.001;
      if (!animating) { progress = to; update(start); return Promise.resolve(true); }
      return new Promise(done => { resolve = done; });
    }
    function update(now) {
      if (!active) return;
      if (animating) {
        const t = clamp((now - start) / 900);
        progress = from + (to - from) * t * t * (3 - 2 * t);
        if (t === 1) { animating = false; settle(); }
      }
      const p = progress, time = reduced ? 0 : now * 0.00035;
      // Keep the stack's depth separation until the sheets no longer overlap
      // horizontally. Only then bring the selected chapter forward.
      const depthRelease = clamp((p - 0.9) / 0.1);
      smoothPointer.x += (pointer.x - smoothPointer.x) * 0.06;
      smoothPointer.y += (pointer.y - smoothPointer.y) * 0.06;
      camera.position.set(reduced ? 0 : smoothPointer.x * 24, reduced ? 0 : -smoothPointer.y * 18, F - p * 100);
      camera.lookAt(0, 0, -p * 100);
      const spacing = Math.min(530, (logicalWidth - 200) / count);
      const contentsScale = Math.min(1, 4 / count);
      for (const sheet of sheets) {
        const i = sheet.index;
        // Cover: a controlled offset stack. Every sheet stays in front of or
        // behind its neighbor instead of twisting through the next sheet.
        const coverX = 338 + i * 46;
        const contentsX = (i - (count - 1) / 2) * spacing;
        sheet.mesh.position.set(coverX * (1 - p) + contentsX * p,
          (-20 + i * 8) * (1 - p) + (-30 + 45 * p) + Math.sin(time + i * 0.65) * (reduced ? 0 : 6),
          -(count - 1 - i) * 110 * (1 - depthRelease) + (i === selected ? 35 : -35) * depthRelease);
        sheet.mesh.rotation.set(-0.02 * (1 - p) + 0.04 * p,
          -0.08 * (1 - p) + (i === selected ? -0.1 : 0.12) * p + (reduced ? 0 : Math.sin(time + i) * 0.008),
          -0.1 * (1 - p) + (i % 2 ? -0.035 : 0.035) * p);
        sheet.mesh.scale.set(1.16 * (1 - p) + contentsScale * 0.78 * p,
          1.16 * (1 - p) + contentsScale * 0.6 * p, 1);
        sheet.mat.emissive.set(p > 0.8 && i === selected ? '#0b100d' : '#000000');
        shadows[i].position.set(sheet.mesh.position.x, -330 + p * 85, -240);
        shadows[i].scale.set(0.95 - p * 0.22, 1 - p * 0.3, 1);
        const pos = sheet.geo.attributes.position;
        for (let n = 0; n < pos.count; n++) {
          const x = sheet.base[n * 3], y = sheet.base[n * 3 + 1];
          const curl = Math.sin((x / 360 + 0.5) * Math.PI) * (24 + 16 * p);
          pos.setXYZ(n, x, y, curl + Math.sin(y / 190 + time + i * 0.4) * 6);
        }
        pos.needsUpdate = true;
        sheet.geo.computeVertexNormals();
      }
      root.position.y = 10;
    }
    return { scene, camera, show, update,
      get active() { return active; },
      hide() { active = false; animating = false; settle(false); el.hidden = true; delete stage.dataset.opening; },
      finish() { if (animating) { progress = to; animating = false; update(performance.now()); settle(); } },
      resize(width, height) {
        logicalWidth = width;
        camera.aspect = width / height;
        camera.fov = 2 * Math.atan((height / 2) / F) * 180 / Math.PI;
        camera.updateProjectionMatrix();
      }
    };
  }
  window.EditorialOpening = { create };
})();
