/* Phase-one reader: semantic DOM slides, local Python assets, citations and simple configured SVG flow. */
(function () {
  'use strict';
  const error=document.getElementById('deck-error');
  let model;
  try {model=ContentModel.parse(window.SLIDES_MD);} catch(e) {error.textContent=e.message;error.hidden=false;return;}
  const E=ContentModel.escape, inline=model.inline;
  const stage=document.getElementById('stage'), opening=document.getElementById('opening-layer');
  const slide=document.getElementById('slide'), status=document.getElementById('page-status');
  const params=new URLSearchParams(location.search), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('reduced')==='1';
  let current=0, returnPage=null, frame=null, chartTimer=null, locked=false, pending=null, unlockTimer=null;
  const asset=p=>'content/'+ContentModel.localPath(p);
  const pad=n=>String(n).padStart(2,'0');
  function list(items) {return `<ul class="editorial-list">${items.map(b=>`<li>${inline(b)}</li>`).join('')}</ul>`;}
  function flowMarkup(s) {
    const f=s.blocks.flow, width=1656, gap=80, box=(width-gap*(f.nodes.length-1))/f.nodes.length;
    const positions=new Map(f.nodes.map((n,i)=>[n.id,{x:i*(box+gap),w:box}]));
    const id='arrow-'+s.id;
    const edges=f.edges.map(e=>{
      const a=positions.get(e.from),b=positions.get(e.to);
      if(e.return) {
        const x1=a.x+a.w/2, x2=b.x+b.w/2;
        return `<path d="M ${x1} 150 V 240 H ${x2} V 154" fill="none" stroke="#ab614c" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#${id})"/>
          <rect x="${(x1+x2)/2-75}" y="222" width="150" height="36" fill="#f3efe6"/>
          <text x="${(x1+x2)/2}" y="247" text-anchor="middle" font-size="21" fill="#984832">${E(e.label||'反馈')}</text>`;
      }
      return `<path d="M ${a.x+a.w+4} 94 H ${b.x-8}" fill="none" stroke="#6a6259" stroke-width="2" marker-end="url(#${id})"/>
        ${e.label?`<text x="${(a.x+a.w+b.x)/2}" y="65" text-anchor="middle" font-size="20" fill="#655e55">${E(e.label)}</text>`:''}`;
    }).join('');
    const nodes=f.nodes.map((n,i)=>{
      const p=positions.get(n.id),dark=i===f.nodes.length-1;
      return `<g><rect x="${p.x}" y="28" width="${box}" height="122" rx="1" fill="${dark?'#252326':'#ede6da'}" stroke="${dark?'#252326':'#b7aea2'}"/>
        <text x="${p.x+25}" y="62" font-family="Georgia,serif" font-style="italic" font-size="20" fill="${dark?'#d79780':'#9b503b'}">${pad(i+1)}</text>
        <text x="${p.x+25}" y="101" font-size="30" font-weight="500" fill="${dark?'#f3efe6':'#2c2724'}">${E(n.title)}</text>
        <text x="${p.x+25}" y="132" font-size="18" fill="${dark?'#c8bdb2':'#71665b'}">${E(n.detail)}</text></g>`;
    }).join('');
    return `<figure class="flow-figure"><svg viewBox="0 0 ${width} 290" role="img" aria-labelledby="flow-title-${s.id}" style="font-family:var(--font-sans)">
      <title id="flow-title-${s.id}">${E(f.nodes.map(n=>n.title).join(' → '))}；审阅后可返回起草阶段。</title>
      <defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#927765"/></marker></defs>${edges}${nodes}</svg></figure>`;
  }
  function body(s) {
    if(s.type==='points') {
      const a=s.blocks.aside;
      return `<p class="deck-quote">${inline(s.quote)}</p><div class="points-layout">${list(s.bullets)}
        ${a?`<aside class="editorial-aside"><small>${E(a.label)}</small><h2>${E(a.headline)}</h2><p>${E(a.body)}</p></aside>`:''}</div>`;
    }
    if(s.type==='chart'||s.type==='interactive') {
      const media=s.type==='chart'?`<img class="chart-asset" src="${E(asset(s.meta.asset))}" alt="${E(s.meta.caption)}">`:
        `<iframe class="chart-asset" title="Plotly 合成信号交互图" tabindex="0"></iframe>
        <div class="interactive-fallback"><img src="${E(asset(s.meta.fallback))}" alt="${E(s.meta.caption)}"></div>`;
      return `<div class="chart-layout"><figure>${media}<figcaption>${E(s.meta.caption)}</figcaption>
        ${s.type==='interactive'?'<span class="interactive-status" role="status">正在加载本地交互图；静态图保留相同数据。</span>':''}</figure>
        <aside><p class="deck-quote">${inline(s.quote)}</p>${list(s.bullets)}</aside></div>`;
    }
    if(s.type==='flow') return `<p class="deck-quote">${inline(s.quote)}</p>${flowMarkup(s)}<div class="flow-notes">${s.bullets.map(b=>list([b])).join('')}</div>`;
    if(s.type==='references') return `<p class="deck-quote">${inline(s.quote)}</p><ol class="references-list">${model.references.map(r=>
      `<li><span class="reference-number">[${r.number}]</span><div class="reference-text">${E(r.text)}<div class="reference-note">${E(r.note||'')}</div></div></li>`).join('')}</ol>`;
    return '';
  }
  function releaseMedia() {clearTimeout(chartTimer);chartTimer=null;if(frame){frame.remove();frame=null;}}
  function missingImage(img) {
    const note=document.createElement('div');note.className='asset-error';
    note.textContent='图片缺失：'+img.getAttribute('src')+'。'+img.alt;
    img.replaceWith(note);
  }
  function imageErrors() {slide.querySelectorAll('img').forEach(img=>{
    img.addEventListener('error',()=>missingImage(img),{once:true});
    if(img.complete&&!img.naturalWidth)missingImage(img);
  });}
  function chartFailure(message) {
    clearTimeout(chartTimer);
    const el=slide.querySelector('.interactive-status');if(el)el.textContent=message;
  }
  function render(index) {
    releaseMedia();current=index;
    delete slide.dataset.chartReady;
    const s=model.slides[index];
    slide.hidden=false;opening.hidden=true;window.TEST_PLAYER.setEnabled(false);
    slide.className=`type-${s.type} arrive`;slide.dataset.slideId=s.id;
    slide.innerHTML=`<header class="eyebrow"><span>${E(s.meta.eyebrow||s.type.toUpperCase())}</span><span class="sample-badge">模板示例 / 非真实研究</span></header>
      <h1>${s.title.map(inline).join('<br>')}</h1><div class="page-content">${body(s)}</div>
      <footer class="slide-footer"><span>${s.refs.map(r=>`[${r.number}] ${E(r.short)}`).join('　 · 　') || 'EDITORIAL STUDIES / 创作阶段预览'}
      </span><span class="folio">${pad(index+1)} / ${pad(model.slides.length)}</span></footer>`;
    imageErrors();
    if(s.type==='interactive') {
      frame=slide.querySelector('iframe');frame.src=asset(s.meta.asset);
      chartTimer=setTimeout(()=>chartFailure('交互图未就绪：'+s.meta.asset+'。已保留静态图，可继续翻页。'),7000);
    }
    status.textContent=`${s.id} / ${pad(index+1)}–${pad(model.slides.length)}`;
    stage.dataset.page=s.id;stage.dataset.view='body';
  }
  function showOpening(p, selected=0) {
    releaseMedia();slide.hidden=true;opening.hidden=false;
    window.TEST_PLAYER.setEnabled(true);window.TEST_PLAYER.select(selected);window.TEST_PLAYER.setProgress(p);
    current=p===1?1:0;stage.dataset.view=p===1?'toc':'cover';stage.dataset.page=model.slides[current].id;
    status.textContent=`${p===1?'目录':'封面'} / ${pad(model.slides.length)} 页`;
  }
  function chapterOf(index) {return Math.max(0,model.chapters.findIndex(c=>c.id===model.slides[index].meta.chapter));}
  function directory() {
    if(!slide.hidden){returnPage=current;showOpening(1,chapterOf(current));}
    else if(window.TEST_PLAYER.getState().p<1)window.TEST_PLAYER.go(1);
  }
  function enter(selected) {
    const c=model.chapters[selected];
    const index=returnPage!==null&&model.slides[returnPage].meta.chapter===c.id?returnPage:c.first;
    returnPage=null;render(index);
  }
  function navigate(action) {
    if(slide.hidden) {
      if(action==='next') {if(window.TEST_PLAYER.getState().p===1)enter(window.TEST_PLAYER.getState().selected);else window.TEST_PLAYER.go(1);}
      else if(action==='previous'){if(returnPage!==null){const i=returnPage;returnPage=null;render(i);}else window.TEST_PLAYER.go(0);}
      return;
    }
    if(action==='toc'){directory();return;}
    if(action==='home'){render(2);return;}
    if(action==='end'){render(model.slides.length-1);return;}
    const i=current+(action==='next'?1:-1);
    if(i<2){returnPage=null;showOpening(1,0);}else if(i<model.slides.length)render(i);
  }
  function dispatch(action) {
    if(locked){pending=action;return;}
    navigate(action);locked=true;
    clearTimeout(unlockTimer);unlockTimer=setTimeout(()=>{locked=false;if(pending){const a=pending;pending=null;dispatch(a);}},reduced?40:350);
  }
  function key(key) {
    if(typeof key !== 'string')return;
    if(key.toLowerCase()==='f'){window.TEST_PLAYER.fullscreen();return;}
    const map={ArrowRight:'next',ArrowDown:'next',' ':'next',PageDown:'next',Enter:'next',ArrowLeft:'previous',PageUp:'previous',ArrowUp:'toc',Backspace:'toc',Home:'home',End:'end'};
    if(map[key])dispatch(map[key]);
  }
  addEventListener('keydown',e=>{
    if(slide.hidden || e.target.closest?.('button,input,select,a'))return;
    if(['ArrowRight','ArrowDown',' ','PageDown','Enter','ArrowLeft','PageUp','ArrowUp','Backspace','Home','End','f','F'].includes(e.key)) {
      e.preventDefault();if(!e.repeat)key(e.key);
    }
  });
  addEventListener('message',e=>{
    if(!frame||e.source!==frame.contentWindow)return;
    if(e.data?.type==='chart-ready') {
      clearTimeout(chartTimer);slide.querySelector('.interactive-fallback')?.remove();
      chartFailure('交互已就绪 · 悬停读数 / 拖动框选 / 双击恢复 · 键盘仍可翻页');
      slide.dataset.chartReady='true';
    } else if(e.data?.type==='chart-error')chartFailure('交互资源加载失败；请检查本地 Plotly 文件。');
    else if(e.data?.type==='chart-key')key(e.data.key);
  });
  addEventListener('opener-enter',e=>enter(e.detail));
  addEventListener('opener-cancel',e=>{if(returnPage!==null){e.preventDefault();const i=returnPage;returnPage=null;render(i);}});
  let controlTimer=null;
  function revealControls(){
    document.body.classList.add('show-controls');
    clearTimeout(controlTimer);controlTimer=setTimeout(()=>document.body.classList.remove('show-controls'),1800);
  }
  addEventListener('pointermove',revealControls);
  addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h')revealControls();});
  document.getElementById('previous').onclick=()=>dispatch('previous');
  document.getElementById('next').onclick=()=>dispatch('next');
  document.getElementById('contents').onclick=directory;
  document.getElementById('fullscreen').onclick=()=>window.TEST_PLAYER.fullscreen();
  document.querySelectorAll('.toc-item').forEach((el,i)=>{
    el.tabIndex=0;el.setAttribute('role','button');el.style.pointerEvents='auto';el.style.cursor='pointer';
    el.onclick=()=>enter(i);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();enter(i);}});
  });
  function ready() {
    const id=params.get('slide'), index=model.slides.findIndex(s=>s.id===id);
    if(index>=2)render(index);else showOpening(index===1?1:0);
    stage.dataset.deckReady='true';
  }
  if(window.TEST_PLAYER.getState().ready)ready();else addEventListener('opener-ready',ready,{once:true});
  window.DECK={model,getState:()=>({current,returnPage,locked,slideId:model.slides[current].id}),show:id=>{
    const i=model.slides.findIndex(s=>s.id===id);if(i>=2)render(i);else if(i>=0)showOpening(i);
  }};
})();
