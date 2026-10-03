/* P2 opening study: renderer-agnostic world definition and projection.
   Design: editorial-spatial — ink stage, warm-white text, one brick-red reading path.
   No red disc, no dust, no flying letters. */
(function () {
  'use strict';
  const DECK = {
    kicker: 'EDITORIAL-SPATIAL / OPENING STUDY',
    title: '让判断\n可见。',
    subtitle: '极简空间开场：可追踪的砖红路径，静止目录仍有纵深。',
    author: 'OPENING STUDY NO. 02 · TEMPLATE 01',
    chapters: [
      { num: '01', zh: '问题', en: 'THE QUESTION' },
      { num: '02', zh: '方法', en: 'THE METHOD' },
      { num: '03', zh: '证据', en: 'THE EVIDENCE' },
      { num: '04', zh: '收束', en: 'THE CLOSE' }
    ]
  };

  const W = 1920, H = 1080, F = 1600, CAM_TRAVEL = 2400;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const ramp = (p, a, b) => clamp((p - a) / (b - a));
  const FONT_DISPLAY = "Georgia, 'Noto Serif SC', 'Songti SC', 'SimSun', serif";
  const FONT_SANS = "'Source Han Sans SC','Noto Sans SC','Microsoft YaHei',sans-serif";

  const objects = [];
  function add(id, role, text, size, weight, font, world) {
    objects.push({ id, role, text, size, weight, font, world });
  }

  // Cover: title is the largest object; a short brick rule is the path origin.
  add('kicker', 'cover', DECK.kicker, 22, 500, FONT_SANS, { x: -300, y: -300, z: 1250 });
  add('title', 'cover', DECK.title, 150, 600, FONT_DISPLAY, { x: -360, y: 20, z: 1500 });
  add('subtitle', 'cover', DECK.subtitle, 32, 400, FONT_SANS, { x: -360, y: 330, z: 1450 });
  add('author', 'cover', DECK.author, 20, 500, FONT_SANS, { x: -300, y: 350, z: 1250 });

  // Contents: 4 chapters on a receding diagonal path to the upper right.
  const nodeTargets = [[280, 660], [600, 540], [890, 420], [1150, 300]];
  const nodeScales = [1.35, 1.05, 0.82, 0.64];
  const pathNodes = DECK.chapters.map((c, i) => {
    const s = nodeScales[i], t = nodeTargets[i];
    const z = CAM_TRAVEL + F / s;
    const x = (t[0] - W / 2) / s, y = (t[1] - H / 2) / s;
    add('num' + i, 'num', c.num, 30, 600, FONT_DISPLAY, { x: x - 150, y: y - 30, z });
    add('zh' + i, 'zh', c.zh, 76, 600, FONT_DISPLAY, { x, y, z });
    add('en' + i, 'en', c.en, 22, 500, FONT_SANS, { x: x + 150, y: y + 64, z });
    return { x: x - 150, y: y - 30, z }; // path runs through the chapter numbers, left of the words
  });

  // The continuous brick reading path: cover rule origin -> chapter numbers.
  const path = [
    { x: -360, y: 250, z: 1500 },
    { x: -350, y: 305, z: 1650 },
    { x: -290, y: 370, z: 1950 }
  ].concat(pathNodes);

  function camera(p) {
    return { x: Math.sin(p * Math.PI) * 30, y: 0, z: ease(p) * CAM_TRAVEL };
  }
  function project(pt, cam) {
    const dz = pt.z - cam.z;
    if (dz <= 1) return null;
    const s = F / dz;
    return { sx: W / 2 + (pt.x - cam.x) * s, sy: H / 2 + (pt.y - cam.y) * s, s, dz };
  }

  function layout(p, selected) {
    const cam = camera(p);
    const reveal = ramp(p, 0.34, 0.72);        // contents appear during the move
    const coverFade = 1 - ramp(p, 0.40, 0.74); // cover leaves as we pass it
    const items = [];
    for (const o of objects) {
      const pr = project(o.world, cam);
      if (!pr) continue;
      const fog = clamp((5200 - pr.dz) / 2200);
      const op = o.role === 'cover'
        ? clamp((pr.dz - 200) / 500) * fog * coverFade
        : fog * reveal;
      if (op <= 0.002) continue;
      items.push({
        id: o.id, role: o.role, text: o.text, size: o.size, weight: o.weight, font: o.font,
        x: o.world.x, y: o.world.y, z: o.world.z, sx: pr.sx, sy: pr.sy, s: pr.s, dz: pr.dz, opacity: op
      });
    }
    const pathPts = path.map(pt => project(pt, cam));
    return { p, cam, items, pathPts, reveal, coverFade, selected: selected || 0, total: DECK.chapters.length };
  }

  window.OPENING_DECK = DECK;
  window.OPENING_OBJECTS = objects;
  window.OPENING_META = { W, H, F, FONT_DISPLAY, FONT_SANS, CAM_TRAVEL, clamp };
  window.OPENING_LAYOUT = layout;
})();
