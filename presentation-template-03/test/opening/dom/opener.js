/* DOM / CSS 3D renderer: one positioned div per world text object.
   Positions come from the shared projection, so it matches the Three.js camera exactly. */
(function () {
  'use strict';
  const api = { name: 'DOM / CSS 3D' };
  const els = new Map();

  api.init = function () {};
  api.resize = function () {};

  function ensure(id) {
    let el = els.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'wp';
      el.style.cssText = 'position:absolute;left:0;top:0;white-space:pre-line;transform-origin:0 0;' +
        'will-change:transform,opacity;pointer-events:none;';
      els.set(id, el);
    }
    return el;
  }

  api.render = function (ctx, frame) {
    const seen = new Set();
    for (const it of frame.items) {
      const el = ensure(it.id);
      if (!el.isConnected) ctx.world.appendChild(el);
      el.textContent = it.text;
      el.style.font = `${it.weight} ${it.size}px ${it.font}`;
      el.style.transform = `translate(${it.sx.toFixed(1)}px,${it.sy.toFixed(1)}px) scale(${it.s.toFixed(4)}) translate(-50%,-50%)`;
      el.style.opacity = it.opacity.toFixed(3);
      const active = (it.role === 'zh') && frame.selected === Number(it.id.slice(2)) && frame.p >= 0.999;
      el.style.color = it.role === 'num' ? '#c8452c'
        : it.role === 'en' ? 'rgba(243,239,230,0.66)'
          : active ? '#c8452c' : '#f3efe6';
      el.style.display = 'block';
      seen.add(it.id);
    }
    for (const [id, el] of els) if (!seen.has(id)) el.style.display = 'none';
  };

  window.OPENER = api;
})();
