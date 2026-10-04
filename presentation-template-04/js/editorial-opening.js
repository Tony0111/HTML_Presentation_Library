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
      for (let y = top; y < bottom; y += 22) g.lineTo(x + drift * y / 1100 + Math.sin(y / 95 + seed) * 2.4, y);
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
      <footer class="opening-footer"><span>${esc(config.meta.title)}</span><span class="opening-footer-index"></span></footer>`;
    const textures = COLORS.map((color, i) => brushTexture(color, i + 41));
    function makeBrushes(fieldWidth) {
      const rand = random(404);
      // Sparse left marks, then a compact asymmetric cluster concentrated on the right.
      // The last two are deliberately wider: one reaches the middle-lower field, the
      // final one starts at the top-right and ends before one third of the canvas.
      const layout = [
        [.02, 610, 270, 108], [.13, 230, 410, 94], [.25, 475, 210, 112],
        [.49, 315, 340, 106], [.62, 170, 540, 120], [.70, 265, 310, 112],
        [.77, 85, 690, 128], [.84, 150, 470, 122], [.895, 32, 720, 146],
        [.945, -55, 310, 158], [.987, -100, 255, 166]
      ];
      return layout.map(([position, top, height, baseWidth], i) => ({
        x: position * fieldWidth, y: top + (rand() - .5) * 34,
        w: baseWidth + rand() * 16, h: height + rand() * 70,
        tilt: (rand() - .5) * .07, t: position, texture: textures[i % textures.length]
      }));
    }
    let brushes = makeBrushes(W);
    const items = [...el.querySelectorAll('[data-chapter]')];
    let active = false, selected = 0, width = W, height = H;
    let progress = 0, from = 0, to = 0, start = 0, animating = false, resolve = null;
    let cameraFrom = 0, cameraTo = 0, cameraOffset = 0, cameraStart = 0;
    let mode = 'cover', pointer = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
    stage.addEventListener('pointermove', event => {
      if (!active || reduced) return;
      const r = stage.getBoundingClientRect();
      pointer = { x: (event.clientX - r.left) / r.width - .5, y: (event.clientY - r.top) / r.height - .5 };
    });
    stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
    el.addEventListener('click', event => {
      const item = event.target.closest('[data-chapter]');
      if (item) window.dispatchEvent(new CustomEvent('template04chapter', { detail: Number(item.dataset.chapter) }));
    });
    function settle(value = true) { if (resolve) { const done = resolve; resolve = null; done(value); } }
    function show(name, options = {}) {
      const wasActive = active;
      active = true; el.hidden = false; mode = name;
      selected = options.chapter ?? 0;
      el.dataset.mode = name; el.dataset.reduced = String(reduced); stage.dataset.opening = name;
      el.querySelector('.opening-footer-index').textContent = name === 'cover' ? '01 / COVER' : '02 / CONTENTS';
      items.forEach((item, i) => {
        item.classList.toggle('is-selected', i === selected);
        item.querySelector('button').setAttribute('aria-current', String(i === selected));
      });
      cameraFrom = cameraOffset; cameraTo = chapters.length > 1 ? (selected / (chapters.length - 1) - .5) * 18 : 0;
      cameraStart = performance.now();
      settle(false); from = progress; to = name === 'contents' ? 1 : 0; start = performance.now();
      animating = !reduced && wasActive && Math.abs(from - to) > .001;
      if (!animating) { progress = to; if (reduced) cameraOffset = cameraTo; return Promise.resolve(true); }
      return new Promise(done => { resolve = done; });
    }
    function point(t) {
      return { x: 140 + 1640 * t, y: 785 - 400 * t + Math.sin(t * Math.PI * 3) * 52 };
    }
    function update(now, g) {
      if (!active) return;
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
    return { show, update,
      get active() { return active; },
      hide() { active = false; animating = false; settle(false); el.hidden = true; delete stage.dataset.opening; delete stage.dataset.openingProgress; },
      finish() { if (animating) { progress = to; animating = false; settle(); } },
      resize(w, h) { if (width !== w) brushes = makeBrushes(w); width = w; height = h; }
    };
  }
  window.EditorialOpening = { create };
})();
