/* Brush textures are cached; route projection moves canvas lines and DOM labels together. */
(function () {
  'use strict';
  const W = 1920, H = 1080, DURATION = 2200;
  const COLORS = ['#ed9874', '#e9eeb9', '#0c567d', '#edb79c', '#425066', '#e4c6d0'];
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  function random(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function brushTexture(color, seed) {
    const rand = random(seed);
    const canvas = document.createElement('canvas');
    canvas.width = 170; canvas.height = 1100;
    const g = canvas.getContext('2d');
    // Individual bristles finish at different heights instead of making a flat cap.
    for (let i = 0; i < 70; i++) {
      const x = 15 + i * 2, top = 18 + rand() * 60, bottom = 990 + rand() * 100;
      const drift = (rand() - .5) * 8;
      g.beginPath();
      g.moveTo(x, top);
      for (let y = top; y < bottom; y += 22) {
        const bend = Math.sin((y - top) / Math.max(180, bottom - top) * Math.PI) * (10 + rand() * 9);
        g.lineTo(x + bend + drift * y / 1100 + Math.sin(y / 95 + seed) * 3.8, y);
      }
      g.strokeStyle = color; g.lineWidth = 2.8 + rand() * 2;
      g.globalAlpha = .68 + rand() * .3; g.stroke();
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 130; i++) {
      g.globalAlpha = .04 + rand() * .24;
      g.fillRect(18 + rand() * 134, rand() * 1100, .5 + rand() * 1.8, 8 + rand() * 150);
    }
    return canvas;
  }
  function create(config, reduced) {
    const stage = document.getElementById('stage'), esc = SlideRenderer.escape;
    const cover = config.slides.find(s => s.type === 'cover');
    const contents = config.slides.find(s => s.type === 'contents');
    const chapters = config.chapters || [];
    const el = document.createElement('section');
    el.id = 'editorial-opening'; el.hidden = true;
    el.setAttribute('aria-label', '封面与目录'); stage.appendChild(el);
    el.innerHTML = `
      <header class="opening-masthead"><span class="opening-brand">${esc(config.meta.display || config.meta.title)}</span><span class="opening-edition">04 / ${esc(config.meta.meta || '')}</span></header>
      <div class="opening-cover"><span class="opening-kicker">${esc(config.meta.kicker || '')}</span>
        <h1>${(cover ? cover.title : [config.meta.title]).map(line => `<span>${esc(line)}</span>`).join('')}</h1>
        <p class="opening-author">${esc(config.meta.author || '')}</p></div>
      <div class="opening-contents"><header class="opening-contents-head"><div><span class="opening-kicker">CONTENTS</span><h1>${esc(contents?.title.join(' ') || '目录')}</h1></div><span class="opening-chapter-total">${String(chapters.length).padStart(2, '0')} CHAPTERS</span></header>
        <ol class="opening-chapters">${chapters.map((c, i) => {
          const start = config.slides.findIndex(s => s.id === c.firstSlideId);
          const end = chapters[i + 1] ? config.slides.findIndex(s => s.id === chapters[i + 1].firstSlideId) : config.slides.length;
          return `<li data-chapter="${i}"><button type="button" aria-label="${esc(c.number + ' ' + c.title)}" title="${esc(c.title)}"><span class="opening-chapter-number">${esc(c.number)}</span><span class="opening-chapter-copy"><strong>${esc(c.title)}</strong><em>${esc(c.english)}</em><small>${String(start + 1).padStart(2, '0')} / ${String(end).padStart(2, '0')}</small></span></button></li>`;
        }).join('')}</ol></div>
      <footer class="opening-footer"><span>${esc(config.meta.title)}</span><span class="opening-footer-index"></span></footer>
      <div class="opening-closing" aria-hidden="true"><span>PASTEL ROUTE / STUDY 04</span><strong>THANKS</strong><small>KEEP THE QUESTION MOVING</small></div>`;
    const textures = COLORS.map((color, i) => brushTexture(color, i + 41));
    function makeBrushes(fieldWidth) {
      const rand = random(404);
      // Sparse left marks, then a compact asymmetric cluster concentrated on the right.
      // The last two are deliberately wider: one reaches the middle-lower field, the
      // final one starts at the top-right and ends before one third of the canvas.
      const layout = [
        // Behind the title, the narrower marks overlap slightly so the field has no
        // white gaps. Their heights still vary enough to keep the edge irregular.
        [.00, 460, 430, 96], [.032, 170, 640, 104], [.064, 375, 280, 90],
        [.096, 245, 560, 100], [.128, 515, 330, 94], [.160, 135, 690, 108],
        [.192, 430, 250, 96], [.224, 215, 530, 104], [.256, 350, 410, 98],
        [.288, 100, 610, 106], [.320, 460, 320, 92], [.352, 185, 550, 104],
        [.384, 390, 360, 98], [.416, 250, 480, 108], [.448, 80, 640, 112],
        // Width increases visibly as the composition moves into the right focus.
        [.57, 155, 590, 118], [.68, 250, 350, 106], [.77, 72, 720, 142],
        [.84, 135, 510, 132], [.90, 20, 760, 164],
        [.955, -55, 315, 184], [.992, -105, 255, 196]
      ];
      return layout.map(([position, top, height, baseWidth], i) => ({
        x: position * fieldWidth, y: top + (rand() - .5) * 34,
        w: baseWidth + rand() * 16, h: height + rand() * 70,
        tilt: (rand() - .5) * .07, t: position, texture: textures[i % textures.length]
      }));
    }
    let brushes = makeBrushes(W);
    const closingParticles = makeClosingParticles();
    let closingStart = 0;
    const items = [...el.querySelectorAll('[data-chapter]')];
    let active = false, selected = 0, width = W, height = H;
    let progress = 0, from = 0, to = 0, start = 0, animating = false, resolve = null;
    let cameraFrom = 0, cameraTo = 0, cameraOffset = 0, cameraStart = 0;
    let mode = 'cover', pointer = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
    stage.addEventListener('pointermove', event => {
      if (!active || reduced || mode === 'closing') return;
      const r = stage.getBoundingClientRect();
      pointer = { x: (event.clientX - r.left) / r.width - .5, y: (event.clientY - r.top) / r.height - .5 };
    });
    stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
    el.addEventListener('click', event => {
      const item = event.target.closest('[data-chapter]');
      if (item) window.dispatchEvent(new CustomEvent('template04chapter', { detail: Number(item.dataset.chapter) }));
    });
    function makeClosingParticles() {
      const source = document.createElement('canvas');
      source.width = 1600; source.height = 500;
      const sg = source.getContext('2d');
      sg.fillStyle = '#fff'; sg.textAlign = 'left'; sg.textBaseline = 'top';
      sg.font = '600 292px "Presentation Serif SC", Georgia, serif';
      sg.fillText('THANKS', 26, 70);
      const pixels = sg.getImageData(0, 0, source.width, source.height).data;
      let minX = source.width, minY = source.height, maxX = 0, maxY = 0;
      for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
        if (pixels[(y * source.width + x) * 4 + 3] > 120) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
      const rand = random(904);
      const colors = ['#ed9874', '#e9eeb9', '#0c567d', '#edb79c', '#425066', '#e4c6d0'];
      const particles = [];
      for (let y = minY; y <= maxY; y += 5) for (let x = minX; x <= maxX; x += 5) {
        if (pixels[(y * source.width + x) * 4 + 3] <= 120) continue;
        const angle = rand() * Math.PI * 2, radius = 250 + rand() * 850;
        particles.push({
          x: Math.cos(angle) * radius + (rand() - .5) * 500,
          y: Math.sin(angle) * radius * .58 + (rand() - .5) * 240,
          tx: x - centerX, ty: y - centerY, size: 1.15 + rand() * 2.5,
          color: colors[Math.floor(rand() * colors.length)], phase: rand() * Math.PI * 2,
          drift: 3 + rand() * 13, depth: rand(), text: true
        });
      }
      for (let i = 0; i < 420; i++) {
        const angle = rand() * Math.PI * 2, radius = 500 + rand() * 760;
        particles.push({
          x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * .52,
          tx: Math.cos(angle) * (520 + rand() * 300), ty: Math.sin(angle) * (340 + rand() * 180),
          size: .55 + rand() * 1.8, color: colors[Math.floor(rand() * colors.length)],
          phase: rand() * Math.PI * 2, drift: 12 + rand() * 28, depth: rand(), text: false
        });
      }
      return particles;
    }
    function settle(value = true) { if (resolve) { const done = resolve; resolve = null; done(value); } }
    function show(name, options = {}) {
      const wasActive = active;
      active = true; el.hidden = false; mode = name;
      if (name === 'closing') closingStart = performance.now();
      selected = options.chapter ?? 0;
      el.dataset.mode = name; el.dataset.reduced = String(reduced); stage.dataset.opening = name;
      el.querySelector('.opening-footer-index').textContent = name === 'cover' ? '01 / COVER' : name === 'closing' ? '03 / THANKS' : '02 / CONTENTS';
      items.forEach((item, i) => {
        item.classList.toggle('is-selected', i === selected);
        item.querySelector('button').setAttribute('aria-current', String(i === selected));
      });
      cameraFrom = cameraOffset; cameraTo = chapters.length > 1 ? (selected / (chapters.length - 1) - .5) * 18 : 0;
      cameraStart = performance.now();
      settle(false); from = progress; to = name === 'contents' ? 1 : 0; start = performance.now();
      animating = name !== 'closing' && !reduced && wasActive && Math.abs(from - to) > .001;
      if (!animating) { progress = to; if (reduced) cameraOffset = cameraTo; return Promise.resolve(true); }
      return new Promise(done => { resolve = done; });
    }
    function point(t) {
      return { x: 140 + 1640 * t, y: 785 - 400 * t + Math.sin(t * Math.PI * 3) * 52 };
    }
    function update(now, g) {
      if (!active) return;
      if (mode === 'closing') { updateClosing(now, g); return; }
      if (animating) {
        const t = clamp((now - start) / DURATION);
        progress = from + (to - from) * ease(t);
        if (t === 1) { animating = false; settle(); }
      }
      cameraOffset = reduced ? cameraTo : cameraFrom + (cameraTo - cameraFrom) * ease(clamp((now - cameraStart) / 2200));
      smooth.x += (pointer.x - smooth.x) * .035; smooth.y += (pointer.y - smooth.y) * .035;
      const p = progress, extraX = (width - W) / 2, extraY = (height - H) / 2;
      // The route opens from a close-up into a broad oblique view. Selection motion does not lock input.
      const zoom = 1.22 - .22 * p;
      const panX = -135 * (1 - p) + cameraOffset + (reduced ? 0 : smooth.x * 14);
      const panY = 95 * (1 - p) + (reduced ? 0 : smooth.y * 10);
      const project = q => ({ x: extraX + W / 2 + (q.x - W / 2) * zoom + panX, y: extraY + H / 2 + (q.y - H / 2) * zoom + panY });
      items.forEach((item, i) => {
        const t = chapters.length > 1 ? .09 + i / (chapters.length - 1) * .81 : .5;
        const q = project(point(t)), depth = 1.04 - t * .16;
        item.style.left = q.x + 'px'; item.style.top = q.y + 'px';
        item.style.transform = `translate(-50%, 0) scale(${depth})`;
      });
      el.querySelector('.opening-contents-head').style.opacity = String(.45 + p * .55);
      if (!g) return;
      g.clearRect(0, 0, width, height);
      g.save();
      // The right edge stays top-anchored even when the logical canvas grows vertically.
      for (const b of brushes) {
        g.save(); g.globalAlpha = (b.x < extraX + 620 ? .26 : .84) * (1 - p);
        g.translate(b.x + (reduced ? 0 : smooth.x * 5), b.y + extraY * (1 - Math.pow(b.t, 3)) - p * 170);
        g.rotate(b.tilt); g.drawImage(b.texture, -b.w / 2, 0, b.w, b.h); g.restore();
      }
      g.restore();
      if (p > .001 || mode === 'contents') {
        g.save(); g.globalAlpha = p;
        const route = new Path2D();
        for (let j = 0; j <= 160; j++) {
          const q = project(point(j / 160));
          if (j === 0) route.moveTo(q.x, q.y); else route.lineTo(q.x, q.y);
        }
        g.save(); g.translate(0, 23); g.strokeStyle = 'rgba(66,80,102,.12)'; g.lineWidth = 14; g.stroke(route); g.restore();
        g.strokeStyle = COLORS[4]; g.lineWidth = 8; g.lineCap = 'round'; g.stroke(route);
        // Each chapter contributes its own quiet color to the continuous route.
        for (let i = 0; i < chapters.length; i++) {
          g.beginPath();
          const a = i / chapters.length, b = (i + 1) / chapters.length;
          for (let j = 0; j <= 35; j++) {
            const q = project(point(a + (b - a) * j / 35));
            if (!j) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y);
          }
          g.strokeStyle = [COLORS[0], COLORS[2], COLORS[4], COLORS[5]][i % 4]; g.lineWidth = 6; g.stroke();
        }
        items.forEach((item, i) => {
          const t = chapters.length > 1 ? .09 + i / (chapters.length - 1) * .81 : .5, q = project(point(t));
          const size = (i === selected ? 15 : 11) * (1.04 - t * .16);
          g.beginPath(); g.ellipse(q.x + 5, q.y + 22, size * 1.6, 5, 0, 0, Math.PI * 2);
          g.fillStyle = 'rgba(55,64,60,.10)'; g.fill();
          g.beginPath(); g.arc(q.x, q.y, size + 8, 0, Math.PI * 2); g.fillStyle = '#f6f7f5'; g.fill();
          g.lineWidth = 1.5; g.strokeStyle = i === selected ? '#748f80' : '#b9c5be'; g.stroke();
          g.beginPath(); g.arc(q.x, q.y, size, 0, Math.PI * 2); g.fillStyle = COLORS[(i * 2 + 1) % COLORS.length]; g.fill();
          if (i === selected) { g.beginPath(); g.arc(q.x, q.y, 4, 0, Math.PI * 2); g.fillStyle = '#526a5c'; g.fill(); }
        });
        g.restore();
      }
      stage.dataset.openingProgress = p.toFixed(3);
    }
    function updateClosing(now, g) {
      if (!g) return;
      const t = reduced ? 1 : clamp((now - closingStart) / 2200);
      const settleAmount = ease(t);
      g.clearRect(0, 0, width, height);
      g.fillStyle = '#101c27'; g.fillRect(0, 0, width, height);
      const glow = g.createRadialGradient(width * .5, height * .48, 20, width * .5, height * .48, width * .62);
      glow.addColorStop(0, 'rgba(66,80,102,.58)'); glow.addColorStop(.42, 'rgba(12,86,125,.22)'); glow.addColorStop(1, 'rgba(16,28,39,0)');
      g.fillStyle = glow; g.fillRect(0, 0, width, height);
      const time = now * .001;
      g.globalCompositeOperation = 'lighter';
      for (const particle of closingParticles) {
        const waveX = Math.sin(time * (.65 + particle.depth * .35) + particle.phase) * particle.drift;
        const waveY = Math.cos(time * (.52 + particle.depth * .28) + particle.phase * 1.7) * particle.drift * .55;
        const x = width / 2 + particle.x * (1 - settleAmount) + (particle.tx + waveX) * settleAmount;
        const y = height / 2 + particle.y * (1 - settleAmount) + (particle.ty + waveY) * settleAmount;
        const radius = particle.size * (.72 + particle.depth * .55);
        const alpha = particle.text ? .34 + settleAmount * .58 : .12 + (1 - settleAmount) * .3;
        if (particle.text && t > .04) {
          g.globalAlpha = alpha * .24; g.strokeStyle = particle.color; g.lineWidth = Math.max(.45, radius * .55);
          g.beginPath(); g.moveTo(x - waveX * .9, y - waveY * .9); g.lineTo(x, y); g.stroke();
        }
        g.globalAlpha = alpha; g.fillStyle = particle.color;
        g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.fill();
        if (particle.text && radius > 2.1) {
          g.globalAlpha = alpha * .13; g.beginPath(); g.arc(x, y, radius * 2.4, 0, Math.PI * 2); g.fill();
        }
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      stage.dataset.openingProgress = t.toFixed(3);
    }
    return { show, update,
      get active() { return active; },
      hide() { active = false; animating = false; settle(false); el.hidden = true; delete stage.dataset.opening; delete stage.dataset.openingProgress; },
      finish() { if (animating) { progress = to; animating = false; settle(); } },
      resize(w, h) { if (width !== w) brushes = makeBrushes(w); width = w; height = h; }
    };
  }
  window.EditorialOpening = { create };
})();
