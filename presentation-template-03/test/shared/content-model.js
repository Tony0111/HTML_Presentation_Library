/* Small, deliberately bounded Markdown dialect. No eval, arbitrary HTML or runtime fetch. */
(function () {
  'use strict';
  const types = new Set(['cover', 'toc', 'points', 'chart', 'interactive', 'flow', 'references']);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function localPath(path) {
    if (!path || /(^[\\/]|:|[?#]|(?:^|[\\/])\.\.(?:[\\/]|$))/.test(path)) throw new Error('资源必须使用本文件夹内的相对路径：' + path);
    return path;
  }
  function parse(source) {
    if (typeof source !== 'string') throw new Error('缺少 content/slides.js');
    const slides = [], blocks = {}, ids = new Set();
    let current = null, fence = null, buffer = [];
    for (const raw of source.replace(/\r/g, '').split('\n')) {
      const line = raw.trim();
      if (fence) {
        if (line === '~~~') {
          try { (current ? current.blocks : blocks)[fence] = JSON.parse(buffer.join('\n')); }
          catch (e) { throw new Error(`${current?.id || 'deck'} / ${fence}: ${e.message}`); }
          fence = null; buffer = [];
        } else buffer.push(raw);
        continue;
      }
      const start = line.match(/^~~~([a-z]+)$/);
      if (start) { fence = start[1]; continue; }
      const header = line.match(/^## ([A-Za-z0-9_-]+) \| ([a-z]+)$/);
      if (header) {
        if (ids.has(header[1])) throw new Error('重复页面 ID：' + header[1]);
        if (!types.has(header[2])) throw new Error('未知页型：' + header[2]);
        ids.add(header[1]);
        current = { id: header[1], type: header[2], meta: {}, title: [], bullets: [], paragraphs: [], quote: '', blocks: {}, refs: [] };
        slides.push(current); continue;
      }
      if (!line || !current) continue;
      const meta = line.match(/^@([a-zA-Z]+):\s*(.*)$/);
      if (meta) current.meta[meta[1]] = meta[2];
      else if (line.startsWith('# ')) current.title.push(line.slice(2));
      else if (line.startsWith('- ')) current.bullets.push(line.slice(2));
      else if (line.startsWith('> ')) current.quote += line.slice(2);
      else current.paragraphs.push(line);
    }
    if (fence) throw new Error('未关闭代码块：' + fence);
    if (!blocks.deck || !slides.length) throw new Error('缺少 deck 配置或页面');
    const references = new Map();
    slides.forEach(s => (s.blocks.references || []).forEach(ref => {
      if (references.has(ref.id)) throw new Error('重复来源 ID：' + ref.id);
      references.set(ref.id, ref);
    }));
    const cited = [], chapters = [];
    slides.forEach((s, index) => {
      if (!s.title.length) throw new Error(s.id + ' 缺少标题');
      s.index = index;
      ['asset', 'fallback'].forEach(k => { if (s.meta[k]) localPath(s.meta[k]); });
      if (s.meta.chapterTitle && !chapters.some(c => c.id === s.meta.chapter)) {
        chapters.push({id: s.meta.chapter, title: s.meta.chapterTitle, english: s.meta.chapterEnglish, slideId: s.id, first: index, last: index});
      }
      if (s.meta.chapter) {
        const c = chapters.find(c => c.id === s.meta.chapter);
        if (!c) throw new Error(s.id + ' 引用了未定义的章节');
        c.last = index;
      }
      const text = [...s.title, s.quote, ...s.bullets, ...s.paragraphs].join('\n');
      for (const m of text.matchAll(/\[@([\w-]+)\]/g)) {
        const ref = references.get(m[1]);
        if (!ref) throw new Error(s.id + ' 缺少来源：' + m[1]);
        if (!cited.includes(ref)) { cited.push(ref); ref.number = cited.length; }
        if (!s.refs.includes(ref)) s.refs.push(ref);
      }
      if (s.type === 'flow') {
        const f = s.blocks.flow;
        if (!f || f.nodes.length < 2 || f.nodes.length > 4) throw new Error(s.id + ' 流程图需 2–4 个节点');
        const nodeIds = new Set(f.nodes.map(n => n.id));
        if (nodeIds.size !== f.nodes.length) throw new Error(s.id + ' 流程节点 ID 重复');
        f.edges.forEach(e => { if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) throw new Error(s.id + ' 流程连线引用无效'); });
      }
    });
    function inline(text) {
      return escape(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[@([\w-]+)\]/g, (_, id) => `<sup class="citation">[${references.get(id).number}]</sup>`);
    }
    return {meta: blocks.deck, slides, chapters, references: cited, inline};
  }
  window.ContentModel = {parse, escape, localPath};
})();
