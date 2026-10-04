// DOM + CSS 3D 版：每个字母是一个带 translateZ 的 div，整个“世界”随镜头前推。
(function () {
  const api = { name: 'DOM / CSS 3D' };
  let scene, letterEls = [], dustEls = [], disc;

  api.init = function (ctx) {
    const { world, letters, PERSPECTIVE, W, H } = ctx;
    world.style.perspective = PERSPECTIVE + 'px';
    world.style.perspectiveOrigin = '50% 50%';

    scene = document.createElement('div');
    scene.style.cssText = `position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;will-change:transform;`;
    world.appendChild(scene);

    // 远处的大红圆：编辑风的“太阳”，镜头会从它旁边掠过
    disc = document.createElement('div');
    disc.style.cssText = `position:absolute;left:-380px;top:-380px;width:760px;height:760px;border-radius:50%;
      background:radial-gradient(circle at 40% 38%, #d8573c, #b9392a 70%, #a3301f);
      transform:translate3d(520px,120px,-1900px);opacity:0.75;`;
    scene.appendChild(disc);

    // 字母
    letters.forEach((l) => {
      const el = document.createElement('div');
      el.textContent = l.ch;
      el.style.cssText = `position:absolute;left:0;top:0;font:${l.font};color:${ctx.paper};
        line-height:1;white-space:pre;will-change:transform,opacity,filter;
        transform:translate3d(${l.x - l.w / 2}px,${l.y - l.size * 0.72}px,${l.z}px);`;
      scene.appendChild(el);
      letterEls.push({ el, l });
    });

    // 尘埃：三层深度的小点，提供视差
    const rnd = mulberry(7);
    for (let i = 0; i < 140; i++) {
      const el = document.createElement('div');
      const z = -2600 + rnd() * 3200;
      const s = 2 + rnd() * 4;
      const warm = rnd() < 0.25;
      el.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;border-radius:50%;
        background:${warm ? ctx.brick : ctx.paper};opacity:${warm ? 0.7 : 0.35};
        transform:translate3d(${(rnd() - 0.5) * 2600}px,${(rnd() - 0.5) * 1500}px,${z}px);`;
      scene.appendChild(el);
      dustEls.push({ el, z, x: 0 });
    }
  };

  api.render = function (ctx, st) {
    const { letterLook } = ctx;
    // 镜头前推 = 世界向镜头移动（+Z），再加横移与滚转
    scene.style.transform = `translate3d(${-st.swayX}px,0,${st.shift}px) rotateZ(${-st.roll}deg)`;
    const drift = st.time * 0.00002;
    for (const { el, l } of letterEls) {
      const zRel = -(l.z + st.shift) + ctx.PERSPECTIVE;      // 字母到相机的距离
      const look = letterLook(zRel);
      el.style.opacity = look.opacity;
      el.style.filter = look.blur > 0.3 ? `blur(${look.blur.toFixed(1)}px)` : 'none';
      el.style.visibility = zRel <= 20 ? 'hidden' : 'visible';
    }
    for (const d of dustEls) {
      const zRel = -(d.z + st.shift) + ctx.PERSPECTIVE;
      d.el.style.visibility = zRel <= 20 ? 'hidden' : 'visible';
    }
    // 红圆淡出：接近时渐隐，免得糊在屏幕上
    const dz = -(-1900 + st.shift) + ctx.PERSPECTIVE;
    disc.style.opacity = Math.max(0, Math.min(0.75, (dz - 300) / 900));
    disc.style.filter = `blur(${Math.max(0, (1800 - dz) / 1800 * 14).toFixed(1)}px)`;
    scene.style.setProperty('--d', drift);
  };

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  window.OPENER = api;
})();
