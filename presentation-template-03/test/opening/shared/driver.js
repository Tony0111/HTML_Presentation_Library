/* Shared opening driver: one camera path, one reading path, one keyboard state.
   The only intended difference between entries is window.OPENER (renderer). */
(function () {
  'use strict';
  const M = window.OPENING_META;
  const DECK = window.OPENING_DECK;
  const clamp = M.clamp;
  const q = new URLSearchParams(location.search);
  const parsed = Number(q.get('p'));
  const frozen = q.has('p') && Number.isFinite(parsed);
  const reduced = q.get('reduced') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = document.getElementById('stage');
  const world = document.getElementById('world');
  const overlay = document.getElementById('path');
  const hud = document.getElementById('hud');
  const errorBox = document.getElementById('opening-error');
  const fallback = document.getElementById('fallback');

  const state = {
    p: frozen ? clamp(parsed) : 0,
    from: 0, target: 0, t0: 0, animating: false,
    selected: 0, time: 0
  };
  let ready = false, failed = false, enabled = true, raf = null, hiddenAt = null;

  // --- shared overlay: brick reading path + chapter markers ---
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const pathLine = document.createElementNS(SVG_NS, 'polyline');
  pathLine.setAttribute('fill', 'none');
  pathLine.setAttribute('stroke', '#c8452c');
  pathLine.setAttribute('stroke-width', '2');
  pathLine.setAttribute('pathLength', '100');
  pathLine.setAttribute('stroke-dasharray', '100');
  overlay.appendChild(pathLine);
  const markers = DECK.chapters.map(() => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('r', '3');
    c.setAttribute('fill', '#c8452c');
    c.setAttribute('stroke', 'none');
    overlay.appendChild(c);
    return c;
  });

  // --- renderer context ---
  function makeMeasure() {
    const g = document.createElement('canvas').getContext('2d');
    return (text, size, weight, font) => {
      g.font = `${weight} ${size}px ${font}`;
      return Math.max(...String(text).split('\n').map(l => g.measureText(l).width));
    };
  }
  const ctx = {
    stage, world, W: M.W, H: M.H, F: M.F, scale: 1, reduced,
    measure: makeMeasure(),
    colors: { paper: '#f3efe6', ink: '#161415', brick: '#c8452c' }
  };

  function fit() {
    ctx.scale = Math.min(innerWidth / M.W, innerHeight / M.H);
    stage.style.transform = `scale(${ctx.scale})`;
    stage.style.left = (innerWidth - M.W * ctx.scale) / 2 + 'px';
    stage.style.top = (innerHeight - M.H * ctx.scale) / 2 + 'px';
    if (ready && !failed) window.OPENER.resize?.(ctx);
  }

  function fail(error) {
    failed = true;
    world.replaceChildren();
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = '空间渲染不可用，已保留静态封面、目录路径与键盘导航。' + (error && error.message ? ' ' + error.message : ''); }
    if (fallback) fallback.hidden = false;
  }

  function draw(now) {
    state.time = (frozen || reduced) ? 0 : now;
    const frame = window.OPENING_LAYOUT(state.p, state.selected);
    // reading path reveal + markers
    const pts = frame.pathPts.filter(Boolean);
    if (pts.length > 1) {
      pathLine.setAttribute('points', pts.map(pt => `${pt.sx.toFixed(1)},${pt.sy.toFixed(1)}`).join(' '));
      pathLine.style.opacity = (0.35 + 0.55 * clamp(state.p * 1.3)).toFixed(3);
      const dash = 100 * (1 - clamp(0.18 + state.p * 1.05));
      pathLine.setAttribute('stroke-dashoffset', dash.toFixed(2));
    } else {
      pathLine.style.opacity = '0';
    }
    const nodePts = frame.pathPts.slice(-DECK.chapters.length);
    markers.forEach((c, i) => {
      const pt = nodePts[i];
      if (!pt) { c.style.opacity = '0'; return; }
      c.setAttribute('cx', pt.sx.toFixed(1));
      c.setAttribute('cy', pt.sy.toFixed(1));
      c.setAttribute('r', Math.max(2, 3.4 * pt.s).toFixed(1));
      c.style.opacity = (0.4 + 0.6 * frame.reveal).toFixed(3);
      c.setAttribute('fill', i === state.selected && state.p >= 0.999 ? '#f3efe6' : '#c8452c');
    });

    if (!failed) {
      try { window.OPENER.render(ctx, frame); }
      catch (error) { fail(error); }
    }

    stage.dataset.progress = state.p.toFixed(4);
    stage.dataset.openingState = state.animating ? 'transition' : (state.p >= 0.999 ? 'contents' : state.p <= 0.001 ? 'cover' : 'between');
    if (hud) hud.textContent = `${window.OPENER?.name || 'Static'} · ${reduced ? '减少动态 · ' : ''}Enter/Space 前进 · ↑ 返回 · ←→ 选章 · F 全屏 · R 重放`;
  }

  function tick(now) {
    raf = null;
    if (!enabled || document.hidden) return;
    if (state.animating) {
      const dur = reduced ? 220 : (frozen ? 1 : 1200); // opening target 0.8–1.6s
      const t = clamp((now - state.t0) / dur);
      state.p = state.from + (state.target - state.from) * t;
      if (t === 1) state.animating = false;
    }
    draw(now);
    if (!frozen && (!reduced || state.animating)) raf = requestAnimationFrame(tick);
  }
  function schedule() { if (ready && enabled && !document.hidden && raf === null) raf = requestAnimationFrame(tick); }

  function go(target) {
    if (frozen || (state.animating && state.target === target)) return;
    state.from = state.p; state.target = clamp(target); state.t0 = performance.now(); state.animating = true; schedule();
  }
  function select(i) {
    state.selected = Math.max(0, Math.min(DECK.chapters.length - 1, i));
    schedule();
  }
  function replay() { if (frozen) return; state.p = 0; state.animating = false; go(1); }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      if (errorBox) { errorBox.hidden = false; errorBox.textContent = '浏览器拒绝全屏，可使用 F11；页面仍可继续浏览。'; }
    }
  }

  function handle(e) {
    if (!enabled || e.target.closest?.('button,input,select,a')) return;
    const scrollKeys = ['Enter', ' ', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Backspace', 'Home', 'End', 'PageDown', 'PageUp'];
    if (scrollKeys.includes(e.key)) e.preventDefault();
    if (e.repeat) return;
    if (e.key.toLowerCase() === 'f') { fullscreen(); return; }
    if (e.key.toLowerCase() === 'r') { replay(); return; }
    if (e.key === 'ArrowUp' || e.key === 'Backspace') { go(0); return; }
    if (state.animating) return;
    if (state.p >= 0.999) {
      if (e.key === 'ArrowRight') select(state.selected + 1);
      else if (e.key === 'ArrowLeft') select(state.selected - 1);
      else if (e.key === 'Home') select(0);
      else if (e.key === 'End') select(DECK.chapters.length - 1);
      else if (/^[1-8]$/.test(e.key) && Number(e.key) <= DECK.chapters.length) select(Number(e.key) - 1);
      else if (e.key === 'Enter' || e.key === ' ') {
        window.dispatchEvent(new CustomEvent('opening-enter', { detail: state.selected }));
      }
    } else if (['Enter', ' ', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      go(1);
    }
  }

  window.OPENING = {
    go, select, replay, fullscreen,
    getState: () => ({ ...state, ready, failed, reduced, enabled }),
    setProgress(p) { state.p = clamp(p); state.animating = false; if (ready) draw(performance.now()); schedule(); },
    setEnabled(on) { enabled = on; if (!on && raf !== null) { cancelAnimationFrame(raf); raf = null; } else schedule(); }
  };

  addEventListener('keydown', handle);
  addEventListener('message', e => {
    const data = e.data || {};
    if (data.type === 'opening-stack') { replay(); return; }
    if (data.type === 'opening-set') { window.OPENING.setProgress(data.p); window.OPENING.select(data.selected || 0); }
  });
  addEventListener('resize', fit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now(); if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    else { if (hiddenAt !== null && state.animating) state.t0 += performance.now() - hiddenAt; hiddenAt = null; schedule(); }
  });

  document.fonts.ready.then(() => {
    try { window.OPENER.init(ctx); } catch (error) { fail(error); }
    ready = true; fit(); draw(performance.now()); schedule();
    stage.dataset.ready = 'true';
    if (q.has('auto') && !frozen) setTimeout(() => go(1), 400);
    window.dispatchEvent(new Event('opening-ready'));
  });
  if (reduced || frozen) document.documentElement.classList.add('motion-static');
})();
