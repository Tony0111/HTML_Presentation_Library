/* Shared opener controller: equal camera path, content and timing for both renderers. */
(function () {
  'use strict';
  const C = window.TEST_CONTENT;
  const W = 1920, H = 1080, P = 1400, TRAVEL = 2600;
  const query = new URLSearchParams(location.search);
  const parsed = Number(query.get('p'));
  const frozen = query.has('p') && Number.isFinite(parsed);
  const reduced = query.get('reduced') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = n => Math.max(0, Math.min(1, n));
  const esc = ContentModel.escape;
  const stage = document.getElementById('stage'), world = document.getElementById('world');
  const cover = document.getElementById('cover'), toc = document.getElementById('toc'), hud = document.getElementById('hud');
  const state = {p: frozen ? clamp(parsed) : 0, target: 0, from: 0, t0: 0, animating: false, selected: 0,
    time: 0, shift: 0, swayX: 0, roll: 0};
  let enabled = true, ready = false, failed = false, raf = null, hiddenAt = null;
  const status = document.createElement('div');
  status.className = 'opener-warning'; status.setAttribute('role', 'status'); status.hidden = true; stage.append(status);
  cover.innerHTML = `<div class="cover-top"><span>${esc(C.kicker)}</span><span class="issue">${esc(C.issue)}</span></div>
    <div class="cover-mid"><div class="cover-rule"></div><h1 class="cover-title">${esc(C.title)}</h1>
    <p class="cover-sub">${esc(C.subtitle)}</p></div><div class="cover-bottom"><span>${esc(C.author)}</span><span>${esc(C.date)}</span></div>`;
  toc.innerHTML = `<div class="toc-label">Contents<small>目录 / ${C.toc.length} CHAPTERS</small><p class="toc-note">模板示例<br>非真实研究材料</p></div>
    <ol class="toc-list">${C.toc.map((it,i) => `<li class="toc-item${i ? '' : ' is-active'}" data-index="${i}">
    <span class="toc-num">${esc(it.num)}</span><span><span class="toc-zh">${esc(it.zh)}</span><span class="toc-en">${esc(it.en)}</span></span>
    <span class="toc-pages">${esc(it.pages)}</span></li>`).join('')}</ol>`;
  const items = [...toc.querySelectorAll('.toc-item')];
  function layoutLetters() {
    const g = document.createElement('canvas').getContext('2d');
    const base = 360, font = `700 ${base}px Georgia, serif`;
    g.font = font;
    const tracking = 2, widths = [...C.display].map(ch => g.measureText(ch).width);
    let x = -(widths.reduce((a,b) => a+b,0) + tracking * (widths.length-1)) / 2;
    return [...C.display].map((ch,i) => {
      const z = [-320,140,-90,260,-200,40][i % 6], k = (P-z)/P;
      const l = {ch, z, x:(x+widths[i]/2)*k, y:-110*k, size:base*k, w:widths[i]*k, font:`700 ${base*k}px Georgia, serif`};
      x += widths[i]+tracking; return l;
    });
  }
  const ctx = {stage, world, W, H, PERSPECTIVE:P, MAX_SHIFT:TRAVEL, letters:[], scale:1, reduced,
    brick:'#c8452c', paper:'#f3efe6', ink:'#0e0e10',
    letterLook(d) { const a=clamp(d/260); return {opacity:a*a, blur:d<260 ? (1-a)*10 : Math.max(0,(d-1800)/1400)*6}; }
  };
  function warn(message) { status.textContent=message; status.hidden=false; }
  function fail(error) {
    failed=true; world.replaceChildren();
    const title=document.createElement('div'); title.className='fallback-display'; title.textContent=C.display; world.append(title);
    warn('空间效果不可用；已保留静态封面、目录和键盘导航。' + (error?.message ? ' '+error.message : ''));
  }
  function fit() {
    ctx.scale=Math.min(innerWidth/W,innerHeight/H);
    stage.style.transform=`scale(${ctx.scale})`;
    stage.style.left=(innerWidth-W*ctx.scale)/2+'px'; stage.style.top=(innerHeight-H*ctx.scale)/2+'px';
    if (ready && !failed) window.OPENER.resize?.(ctx);
  }
  const ease=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function draw(now) {
    state.time=(frozen || reduced) ? 0 : now;
    const e=ease(state.p), idle=(frozen||reduced)?0:1;
    state.shift=reduced?0:e*TRAVEL;
    state.swayX=reduced?0:Math.sin(e*Math.PI)*90+idle*Math.sin(now*.0004)*6;
    state.roll=reduced?0:Math.sin(e*Math.PI)*.9+idle*Math.sin(now*.00031)*.15;
    const a=1-clamp(state.p/.45), t=clamp((state.p-.55)/.45), b=1-Math.pow(1-t,3);
    cover.style.opacity=a; cover.style.transform=reduced?'':`translateY(${(1-a)*-40}px)`;
    cover.setAttribute('aria-hidden',String(a===0));
    toc.style.opacity=b; toc.style.transform=reduced?'':`scale(${.86+.14*b})`;
    toc.setAttribute('aria-hidden',String(b===0));
    // Fade the entire world before the contents arrive, including reduced-motion mode.
    world.style.opacity=1-clamp((state.p-.38)/.4);
    stage.style.setProperty('--bx1',(22+Math.sin(state.time*.00012)*8+e*10)+'%');
    stage.style.setProperty('--by2',(72+Math.cos(state.time*.00014)*5)+'%');
    if (!failed) { try { window.OPENER.render(ctx,state); } catch (error) { fail(error); } }
    stage.dataset.progress=state.p.toFixed(4);
    stage.dataset.openerState=state.animating?'transition':state.p===1?'toc':'cover';
    if (hud) hud.textContent=`${window.OPENER?.name || 'Static'} · ${reduced?'减少动态 · ':''}Enter/Space 推进 · ↑ 返回 · ←→ 选章 · F 全屏 · R 重放`;
  }
  function tick(now) {
    raf=null; if (!enabled || document.hidden) return;
    if (state.animating) {
      const t=clamp((now-state.t0)/(reduced?300:2800));
      state.p=state.from+(state.target-state.from)*t;
      if (t===1) state.animating=false;
    }
    draw(now);
    if (!frozen && (!reduced || state.animating)) raf=requestAnimationFrame(tick);
  }
  function schedule() { if (ready && enabled && !document.hidden && raf===null) raf=requestAnimationFrame(tick); }
  function go(target) {
    if (frozen || (state.animating && state.target===target)) return;
    state.from=state.p; state.target=target; state.t0=performance.now(); state.animating=true; schedule();
  }
  function select(i) {
    state.selected=Math.max(0,Math.min(items.length-1,i));
    items.forEach((el,n)=>el.classList.toggle('is-active',n===state.selected));
  }
  function command(cmd) {
    if (cmd==='go') go(1); else if(cmd==='back') go(0);
    else if(cmd==='replay' && !frozen) {state.p=0;state.animating=false;go(1);}
  }
  async function fullscreen() {
    try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch {warn('浏览器拒绝全屏，可使用 F11；页面仍可继续浏览。');}
  }
  function handle(e) {
    if(!enabled || e.target.closest?.('button,input,select,a')) return;
    const keys=['Enter',' ','ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Backspace','Home','End','PageDown','PageUp'];
    if(keys.includes(e.key)) e.preventDefault();
    if(e.repeat) return;
    if(e.key.toLowerCase()==='f') {fullscreen();return;}
    if(query.has('embed') && parent!==window) {
      const cmd={Enter:'go',' ':'go',ArrowRight:'go',Backspace:'back',ArrowUp:'back',r:'replay',R:'replay'}[e.key];
      if(cmd) { command(cmd); parent.postMessage({type:'opener-command',command:cmd},'*'); }
      return;
    }
    if(e.key.toLowerCase()==='r') {command('replay');return;}
    if(e.key==='ArrowUp'||e.key==='Backspace') {
      const ev=new CustomEvent('opener-cancel',{cancelable:true});
      if(window.dispatchEvent(ev)) go(0); return;
    }
    if(state.animating) return;
    if(state.p===1) {
      if(e.key==='ArrowRight'||e.key==='ArrowLeft') select(state.selected+(e.key==='ArrowRight'?1:-1));
      else if(e.key==='Home') select(0); else if(e.key==='End') select(items.length-1);
      else if(/^[1-8]$/.test(e.key) && Number(e.key)<=items.length) select(Number(e.key)-1);
      else if(e.key==='Enter'||e.key===' ') {
        window.dispatchEvent(new CustomEvent('opener-enter',{detail:state.selected}));
        // 正文控制器也监听键盘；目录确认只能消费一次。
        e.stopImmediatePropagation();
      }
    } else if(['Enter',' ','ArrowRight','ArrowDown'].includes(e.key)) go(1);
  }
  window.TEST_PLAYER={go,select,fullscreen, getState:()=>({...state,ready,failed,reduced,enabled}),
    setProgress(p) {state.p=clamp(p);state.animating=false;if(ready)draw(performance.now());},
    setEnabled(on) {enabled=on;if(!on&&raf!==null){cancelAnimationFrame(raf);raf=null;}else schedule();}
  };
  addEventListener('keydown',handle);
  addEventListener('message',e=>{if(parent!==window&&e.data?.type==='opener-command')command(e.data.command);});
  addEventListener('resize',fit);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hiddenAt=performance.now();if(raf!==null)cancelAnimationFrame(raf);raf=null;}
    else {if(hiddenAt!==null&&state.animating)state.t0+=performance.now()-hiddenAt;hiddenAt=null;schedule();}
  });
  document.fonts.ready.then(()=>{
    ctx.letters=layoutLetters();
    try {window.OPENER.init(ctx);} catch(error){fail(error);}
    ready=true;fit();draw(performance.now());schedule();
    stage.dataset.ready='true';
    if(query.has('auto'))setTimeout(()=>go(1),600);
    window.dispatchEvent(new Event('opener-ready'));
  });
  if(reduced || frozen) document.documentElement.classList.add('motion-static');
})();
