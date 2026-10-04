/* Reading-plane renderer (warm white). Charts and images are pre-made local materials. */
(function () {
  'use strict';
  let REFS = new Map();

  const escape = value => String(value == null ? '' : value)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = text => escape(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[@([\w-]+)\]/g, (m, id) => REFS.has(id) ? `<sup class="citation">[${REFS.get(id)}]</sup>` : m);
  const pad = n => String(n).padStart(2, '0');

  function setReferences(refs) { REFS = new Map((refs || []).map(r => [r.id, r.number])); }

  function pointsBody(slide) {
    const points = slide.bullets.length
      ? `<ul class="point-list">${slide.bullets.map(b => `<li>${inline(b)}</li>`).join('')}</ul>` : '';
    return `<div class="points-layout"><div>${slide.quote ? `<p class="slide-quote">${inline(slide.quote)}</p>` : ''}</div>${points}</div>`;
  }

  function mediaBody(slide) {
    const asset = slide.meta.asset;
    const img = asset ? `<img src="${escape(asset)}" alt="${escape(slide.meta.caption || '')}">` : '';
    return `<div class="media-layout"><figure>${img}<figcaption>${escape(slide.meta.caption || '')}</figcaption></figure>
      <aside class="media-notes">${slide.quote ? `<p class="slide-quote">${inline(slide.quote)}</p>` : ''}
      <ul>${slide.bullets.map(b => `<li>${inline(b)}</li>`).join('')}</ul></aside></div>`;
  }

  function chartBody(slide) {
    const metric = slide.meta.metric
      ? `<div class="metric"><strong>${escape(slide.meta.metric)}</strong><span>${escape(slide.meta.metricLabel || '')}</span></div>` : '';
    const asset = slide.meta.asset;
    const img = asset ? `<img src="${escape(asset)}" alt="${escape(slide.meta.caption || '')}">` : '';
    return `<div class="chart-layout"><figure>${img}<figcaption>${escape(slide.meta.caption || '')}</figcaption></figure>
      <aside>${metric}<ul>${slide.bullets.map(b => `<li>${inline(b)}</li>`).join('')}</ul></aside></div>`;
  }

  // --- process flow: linear or simple layered branch from the flow block ---
  function flowDepth(flow) {
    const depth = new Map(flow.nodes.map(n => [n.id, 0]));
    for (let pass = 0; pass < flow.nodes.length; pass++) {
      for (const edge of flow.edges || []) {
        if (depth.get(edge.to) < depth.get(edge.from) + 1) depth.set(edge.to, depth.get(edge.from) + 1);
      }
    }
    return depth;
  }
  function flowBody(slide) {
    const flow = slide.blocks.flow;
    if (!flow) return '';
    const depth = flowDepth(flow);
    const maxDepth = Math.max(...depth.values());
    const cols = maxDepth + 1;
    const width = 1656, gapX = 120, nodeW = (width - gapX * (cols - 1)) / cols;
    const nodeH = 104, gapY = 34, height = 470;
    const byCol = new Map();
    flow.nodes.forEach(n => { const d = depth.get(n.id); if (!byCol.has(d)) byCol.set(d, []); byCol.get(d).push(n); });
    const pos = new Map();
    for (const [d, list] of byCol) {
      const total = list.length * nodeH + (list.length - 1) * gapY;
      let y = (height - total) / 2;
      const x = d * (nodeW + gapX);
      list.forEach(n => { pos.set(n.id, { x, y }); y += nodeH + gapY; });
    }
    const markerId = 'arrow-' + slide.id;
    const edges = (flow.edges || []).map(edge => {
      const a = pos.get(edge.from), b = pos.get(edge.to);
      const x1 = a.x + nodeW, y1 = a.y + nodeH / 2, x2 = b.x, y2 = b.y + nodeH / 2;
      const midX = (x1 + x2) / 2;
      const path = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2 - 6}`;
      const label = edge.label
        ? `<rect x="${midX - 46}" y="${(y1 + y2) / 2 - 18}" width="92" height="30" fill="#f3efe6"/>
           <text x="${midX}" y="${(y1 + y2) / 2 + 3}" text-anchor="middle" font-size="18" fill="#6f6a63">${escape(edge.label)}</text>` : '';
      return `<path d="${path}" fill="none" stroke="#6f6a63" stroke-width="2" marker-end="url(#${markerId})"/>${label}`;
    }).join('');
    const nodes = flow.nodes.map((n, i) => {
      const p = pos.get(n.id);
      const dark = (flow.edges || []).every(e => e.from !== n.id);
      return `<g><rect x="${p.x}" y="${p.y}" width="${nodeW}" height="${nodeH}" fill="${dark ? '#161415' : '#e7e0d4'}" stroke="${dark ? '#161415' : '#cfc8bd'}"/>
        <text x="${p.x + 22}" y="${p.y + 38}" style="font-family:var(--font-display)" font-style="italic" font-size="19" fill="${dark ? '#d89780' : '#b8452e'}">${pad(i + 1)}</text>
        <text x="${p.x + 22}" y="${p.y + 74}" style="font-family:var(--font-sans)" font-size="27" font-weight="600" fill="${dark ? '#f3efe6' : '#161415'}">${escape(n.title)}</text>
        <text x="${p.x + 22}" y="${p.y + 98}" style="font-family:var(--font-mono)" font-size="16" fill="${dark ? '#c8bdb2' : '#6f6a63'}">${escape(n.detail || '')}</text></g>`;
    }).join('');
    return `<figure class="flow-figure"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(flow.nodes.map(n => n.title).join(' 到 '))}">
      <defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6f6a63"/></marker></defs>
      ${edges}${nodes}</svg>
      ${slide.quote ? `<figcaption class="flow-caption">${inline(slide.quote)}</figcaption>` : ''}</figure>`;
  }

  function tableBody(slide) {
    const t = slide.blocks.table;
    if (!t) return '';
    const head = `<tr><th></th>${t.columns.map((c, i) => `<th>${escape(c)}${t.units && t.units[i] ? `<em>${escape(t.units[i])}</em>` : ''}</th>`).join('')}</tr>`;
    const rows = t.rows.map((row, r) => `<tr class="${r === t.rows.length - 1 ? 'is-highlight' : ''}">${row.map((cell, i) => i === 0 ? `<th scope="row">${escape(cell)}</th>` : `<td>${escape(cell)}</td>`).join('')}</tr>`).join('');
    const src = t.source ? `<span class="table-source">来源：${inline('[@' + t.source + ']')}</span>` : '';
    return `<div class="table-wrap"><table class="data-table"><thead>${head}</thead><tbody>${rows}</tbody></table>
      <p class="table-note">${escape(t.note || '')} ${src}</p></div>`;
  }

  function comparisonBody(slide) {
    const bars = slide.blocks.bars;
    if (!bars) return '';
    const max = Math.max(...bars.series.map(s => s.value), 1);
    const rows = bars.series.map(s => {
      const pct = (s.value / max * 100).toFixed(1);
      const hot = s.value === max;
      return `<div class="bar-row"><span class="bar-label">${escape(s.label)}</span>
        <span class="bar-track"><span class="bar-fill${hot ? ' is-hot' : ''}" style="width:${pct}%"></span></span>
        <span class="bar-value">${escape(s.value)}<em>${escape(bars.unit || '')}</em></span>
        <span class="bar-note">${escape(s.note || '')}</span></div>`;
    }).join('');
    return `<div class="bars">${rows}<p class="table-note">${escape(bars.note || '')}</p></div>`;
  }

  function timelineBody(slide) {
    const t = slide.blocks.timeline;
    if (!t) return '';
    const nodes = t.nodes.map((n, i) => `<div class="timeline-node${i === 0 ? ' is-first' : ''}">
      <span class="timeline-when">${escape(n.when || '')}</span>
      <span class="timeline-dot"></span>
      <span class="timeline-label">${escape(n.label)}</span>
      <span class="timeline-detail">${escape(n.detail || '')}</span></div>`).join('');
    const kind = t.kind === 'phase' ? '概念阶段 / 非真实时间比例' : '真实时间';
    return `<div class="timeline" data-kind="${escape(t.kind || 'phase')}"><div class="timeline-line"></div>${nodes}
      <p class="table-note">${escape(kind)}${t.note ? ' · ' + escape(t.note) : ''}</p></div>`;
  }

  function videoBody(slide) {
    const asset = slide.meta.asset || '';
    const poster = slide.meta.poster || '';
    return `<div class="media-layout video-layout">
      <figure class="video-figure">
        <video id="presentation-video" controls preload="metadata" playsinline
          ${poster ? `poster="${escape(poster)}"` : ''} ${asset ? `src="${escape(asset)}"` : ''}></video>
        <figcaption>${escape(slide.meta.caption || '')}</figcaption>
        <p class="video-status" role="status" aria-live="polite">P 播放 / 暂停 · M 静音 · 离开本页自动暂停并重置</p>
      </figure>
      <aside class="media-notes">${slide.quote ? `<p class="slide-quote">${inline(slide.quote)}</p>` : ''}
      <ul>${slide.bullets.map(b => `<li>${inline(b)}</li>`).join('')}</ul></aside></div>`;
  }

  function referencesBody(slide, config) {
    const items = (config.references || []).map(r => `<li><span class="num">[${r.number}]</span><div class="text">${
      r.pending ? '<span class="pending">待补 · 尚未确认来源</span>' : escape(r.text)
    }<div class="note">${escape(r.note || '')}</div></div></li>`).join('');
    return `<ol class="references-list">${items}</ol>`;
  }

  function body(slide, config) {
    switch (slide.type) {
      case 'headline-points': return pointsBody(slide);
      case 'split-media': return mediaBody(slide);
      case 'chart-focus': return chartBody(slide);
      case 'process-flow': return flowBody(slide);
      case 'table-focus': return tableBody(slide);
      case 'comparison': return comparisonBody(slide);
      case 'timeline': return timelineBody(slide);
      case 'video-focus': return videoBody(slide);
      case 'references': return referencesBody(slide, config);
      case 'statement': return `<div class="statement-layout"><p class="big">${slide.title.map(inline).join('')}</p>
        ${slide.subtitle ? `<p class="slide-quote">${escape(slide.subtitle)}</p>` : ''}</div>`;
      default: return `<div class="slide-body">${slide.quote ? `<p class="slide-quote">${inline(slide.quote)}</p>` : ''}
        ${slide.paragraphs.map(p => `<p>${inline(p)}</p>`).join('')}
        ${slide.bullets.length ? `<ul class="point-list">${slide.bullets.map(b => `<li>${inline(b)}</li>`).join('')}</ul>` : ''}</div>`;
    }
  }

  function render(slide, config, index, total) {
    const chapter = (config.chapters || []).find(c => c.id === slide.meta.chapter);
    const refLine = slide.refs.length ? slide.refs.map(r => `[${r.number}] ${escape(r.short)}`).join(' · ') : (config.meta.title || '');
    const isStatement = slide.type === 'statement';
    const h1 = isStatement ? '' : `<h1>${slide.title.map(inline).join('<br>')}</h1>`;
    return `<header class="slide-eyebrow"><span>${escape(slide.meta.eyebrow || '')}</span><span class="flag">${escape(chapter ? chapter.number + ' / ' + chapter.title : slide.type)}</span></header>
      ${h1}${body(slide, config)}
      <footer class="slide-footer"><span>${refLine}</span><span class="folio">${pad(index + 1)} / ${pad(total)}</span></footer>`;
  }

  window.SlideRenderer = { render, setReferences, escape, inline };
})();
