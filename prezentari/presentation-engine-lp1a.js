(() => {
  'use strict';

  const lp='lp1a';
  const app=document.getElementById('app');
  const state={cur:0,mode:'material',sidebar:true,selected:null,msg:''};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nl=v=>esc(v).replace(/\n/g,'<br>');
  const pct=(n,d)=>Math.max(0,Math.min(100,n/d*100));
  const metric=t=>/^\s*[×x]?\s*\d+(?:[.,]\d+)?\s*(?:%|‰|ppm|mg|µg|μg|°C|dB|Gy|Sv|mSv|Bq|ore|h|ani|\/100k|mmHg|m\/s)?\s*$/i.test(t||'');
  const sources=s=>s.blocks.filter(b=>b.source);
  const current=()=>deck.slides[state.cur];
  let deck=null;

  async function unpack(){
    const bin=Uint8Array.from(atob(window.PRESENTATION_LIBRARY_GZIP),c=>c.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Folosiți Chrome sau Edge actualizat.');
    const ds=new DecompressionStream('gzip');
    const txt=await new Response(new Blob([bin]).stream().pipeThrough(ds)).text();
    const d=JSON.parse(txt);
    deck={meta:d.m,slides:d.s.map(x=>({number:x[0],title:x[1],blocks:x[2].map((b,i)=>({text:b[0],fontSize:b[1],source:!!b[2],x:b[3],y:b[4],cx:b[5],cy:b[6],order:i})),quickChecks:x[3]||[]}))};
  }

  function load(){
    const s=document.createElement('script');
    s.src='content/lp1a-gz.js';
    s.onload=()=>{window.PRESENTATION_LIBRARY_GZIP=window.PRESENTATION_DECK_GZIP;unpack().then(render).catch(showError)};
    s.onerror=()=>showError(new Error('Pachetul LP1A nu poate fi încărcat.'));
    document.head.appendChild(s);
  }
  function showError(e){app.className='error-screen';app.innerHTML=`<h1>Prezentarea nu este disponibilă</h1><p>${esc(e.message||e)}</p>`}

  function usefulBlocks(slide){
    const seen=new Set();
    return slide.blocks.filter(b=>{
      const t=(b.text||'').trim();
      if(!t||t===slide.title||seen.has(t)) return false;
      seen.add(t); return true;
    }).sort((a,b)=>a.y-b.y||a.x-b.x||a.order-b.order);
  }
  function nonSourceBlocks(slide){return usefulBlocks(slide).filter(b=>!b.source)}

  function columnOf(b){
    const W=deck.meta.slideSize.width;
    const center=(b.x+b.cx/2)/W;
    return center<.34?'left':center>.66?'right':'center';
  }
  function widthClass(b){
    const W=deck.meta.slideSize.width;
    const r=b.cx/W;
    if(r>.72) return 'full';
    if(r>.47) return 'wide';
    return 'normal';
  }
  function cleanJoin(a,b){
    const at=a.trim(),bt=b.trim();
    if(!at) return bt;if(!bt) return at;
    const punct=/[.:;!?)]$/.test(at);
    return at+(punct?'\n':' — ')+bt;
  }
  function groupedBlocks(slide){
    const H=deck.meta.slideSize.height;
    const blocks=nonSourceBlocks(slide);
    const groups=[];
    blocks.forEach(b=>{
      const t=b.text.trim();
      if(!t) return;
      const last=groups.at(-1);
      const col=columnOf(b);
      const gap=last ? (b.y-(last.y+last.cy))/H : 1;
      const sameCol=last&&last.col===col;
      const sameLeft=last&&Math.abs((b.x-last.x)/deck.meta.slideSize.width)<.08;
      const merge=sameCol&&sameLeft&&gap<.055&&!metric(t)&&!metric(last.text)&&last.text.length+t.length<850;
      if(merge){
        last.text=cleanJoin(last.text,t);
        last.cy=Math.max(last.cy,(b.y+b.cy)-last.y);
        last.fontSize=Math.max(last.fontSize||0,b.fontSize||0);
      }else groups.push({...b,col,text:t});
    });
    return groups;
  }

  function toneFor(text,index){
    const t=text.toLowerCase();
    if(/temperatur|termic|termometr/.test(t)) return 'blue';
    if(/umid|higro|psihrom/.test(t)) return 'cyan';
    if(/presi|barometr|altitudine/.test(t)) return 'violet';
    if(/viteza|curen|anemometr/.test(t)) return 'teal';
    if(/kataterm|răcire|racire/.test(t)) return 'amber';
    if(/radia|calor/.test(t)) return 'orange';
    return ['blue','teal','amber','violet','green','cyan'][index%6];
  }
  function iconFor(text){
    const t=text.toLowerCase();
    if(/temperatur|termic|termometr/.test(t)) return '🌡️';
    if(/umid|higro|psihrom/.test(t)) return '💧';
    if(/presi|barometr|altitudine/.test(t)) return '⏱️';
    if(/viteza|curen|anemometr/.test(t)) return '💨';
    if(/kataterm|răcire|racire/.test(t)) return '🧪';
    if(/radia|calor/.test(t)) return '☀️';
    if(/norm|valoare|optim|confort/.test(t)) return '✅';
    if(/metod|determin|măsur|masur/.test(t)) return '🔬';
    return '•';
  }
  function isLikelyHeading(g){return (g.fontSize||0)>2400&&g.text.length<130}

  function sourceStrip(slide){
    const src=sources(slide);
    if(!src.length) return '';
    return `<div class="lp1a-sources"><div class="lp1a-source-label">SURSE</div><div class="lp1a-source-list">${src.map(s=>`<span>${nl(s.text)}</span>`).join('')}</div></div>`;
  }

  function coverMaterial(slide){
    const blocks=nonSourceBlocks(slide);
    const sub=blocks.find(b=>b.text.length>18)?.text||'Proprietățile fizice ale aerului și microclimatul';
    return `<section class="lp1a-cover">
      <div class="lp1a-cover-copy">
        <div class="slide-kicker">LP1A · IGIENĂ · UMFST</div>
        <div class="lp1a-cover-no">01</div>
        <h1>${nl(slide.title)}</h1>
        <p>${nl(sub)}</p>
        <div class="lp1a-topic-row">
          <span class="topic-chip blue">🌡️ Temperatură</span>
          <span class="topic-chip cyan">💧 Umiditate</span>
          <span class="topic-chip violet">⏱️ Presiune</span>
          <span class="topic-chip teal">💨 Mișcarea aerului</span>
        </div>
      </div>
      <div class="lp1a-cover-visual" aria-hidden="true">
        <div class="microclimate-orbit orbit-a">🌡️</div>
        <div class="microclimate-orbit orbit-b">💧</div>
        <div class="microclimate-orbit orbit-c">💨</div>
        <div class="microclimate-core"><span>MICRO</span><b>CLIMAT</b></div>
      </div>
      ${sourceStrip(slide)}
    </section>`;
  }

  function material(slide){
    if(slide.number===1) return coverMaterial(slide);
    const groups=groupedBlocks(slide);
    const cards=groups.map((g,i)=>{
      const tone=toneFor(g.text,i),icon=iconFor(g.text),w=widthClass(g);
      const type=metric(g.text)?'metric':isLikelyHeading(g)?'heading':'body';
      return `<article class="lp1a-card ${tone} ${w} ${type}">
        <div class="lp1a-card-icon">${icon}</div>
        <div class="lp1a-card-text">${nl(g.text)}</div>
      </article>`;
    }).join('');
    return `<section class="lp1a-material">
      <div class="lp1a-head">
        <div><div class="slide-kicker">MATERIE DE EXAMEN · LP1A · DIAPOZITIV ${slide.number}</div><h1>${nl(slide.title)}</h1></div>
        <div class="lp1a-slide-badge">${String(slide.number).padStart(2,'0')}</div>
      </div>
      <div class="lp1a-grid">${cards}</div>
      ${slide.quickChecks.length?`<div class="phone-ready">📱 După acest diapozitiv poate fi lansată o întrebare pe telefoanele studenților.</div>`:''}
      ${sourceStrip(slide)}
    </section>`;
  }

  function interactive(slide){
    const qs=slide.quickChecks||[],q=qs[0];
    if(!q)return `<section class="generic-teaching"><div class="slide-kicker">APLICAȚIE · DIAPOZITIV ${slide.number}</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="empty-application"><b>Nu este programată o întrebare pe acest diapozitiv.</b><p>Continuați prezentarea; diapozitivele marcate cu 📱 conțin verificări interactive.</p></div></section>`;
    const answered=state.selected!==null;
    const corrects=Array.isArray(q.correct)?q.correct:[q.correct];
    return `<section class="generic-teaching"><div class="slide-kicker">APLICAȚIE · ÎNTREBARE PENTRU TELEFOANE</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="application-layout"><div class="quiz-card">${q.scenario?`<p class="scenario">${nl(q.scenario)}</p>`:''}<h2>${nl(q.question)}</h2><div class="quiz-options">${q.options.map((o,i)=>`<button data-opt="${i}" class="quiz-option ${answered&&corrects.includes(i)?'correct':''} ${answered&&i===state.selected&&!corrects.includes(i)?'wrong':''}"><span>${String.fromCharCode(65+i)}</span>${nl(o)}</button>`).join('')}</div>${answered?`<div class="feedback"><b>${corrects.includes(state.selected)?'Corect.':'Răspuns de revizuit.'}</b> ${nl(q.explanation||'')}</div>`:''}</div><aside class="send-panel"><div class="phone-icon">📱</div><h3>Trimite pe telefoane</h3><p>Studenții conectați prin QR #1 vor primi această întrebare.</p><button class="action-button" data-action="send">Trimite întrebarea</button><button class="secondary-action" data-action="reveal">Arată soluția pe telefoane</button><div class="bridge-msg">${esc(state.msg)}</div></aside></div></section>`;
  }

  function original(slide){
    const W=deck.meta.slideSize.width,H=deck.meta.slideSize.height;
    const blocks=slide.blocks.map(b=>{const fs=Math.max(9,Math.min(36,(b.fontSize||1800)/100*.55));return `<div class="orig-block ${b.source?'orig-source':''}" style="left:${pct(b.x,W)}%;top:${pct(b.y,H)}%;width:${pct(b.cx,W)}%;height:${pct(b.cy,H)}%;font-size:${fs}px">${nl(b.text)}</div>`}).join('');
    const src=sources(slide);
    return `<section class="source-layout"><div class="original-shell"><div class="original-canvas" style="aspect-ratio:${W}/${H}">${blocks}</div></div><aside class="source-side"><div class="slide-kicker">SURSE & ORIGINAL</div><h2>Diapozitiv ${slide.number}</h2><p>Textul și pozițiile provin direct din fișierul PowerPoint-sursă.</p>${src.length?src.map(b=>`<div class="source-line">${nl(b.text)}</div>`).join(''):'<div class="source-line">Nu a fost identificat un bloc bibliografic separat pe acest diapozitiv.</div>'}</aside></section>`;
  }

  function thumb(slide,i){return `<button class="thumb ${i===state.cur?'active':''}" data-jump="${i}"><div class="thumb-preview"><b>${String(slide.number).padStart(2,'0')}</b><span>${esc(slide.title)}</span></div>${slide.quickChecks.length?'<i>📱</i>':''}</button>`}

  function render(){
    const slide=current(),progress=(state.cur+1)/deck.slides.length*100;
    const view=state.mode==='interactive'?interactive(slide):state.mode==='source'?original(slide):material(slide);
    document.documentElement.style.setProperty('--teal',deck.meta.accent||'#14b8a6');
    document.documentElement.style.setProperty('--amber',deck.meta.accent2||'#f59e0b');
    document.title=`${deck.meta.code} · ${deck.meta.title}`;
    app.className='presentation-app';
    app.innerHTML=`<header class="topbar"><div class="brand"><div class="brand-mark">IG</div><div class="brand-copy"><strong>Igienă · UMFST</strong><span>Prezentare interactivă</span></div></div><div class="top-title"><strong>${esc(deck.meta.code)} · ${esc(deck.meta.title)}</strong><span>${esc(slide.title)}</span></div><div class="top-actions"><button class="download-button" data-action="download">⬇ Studiu offline</button><button class="icon-button" data-action="fullscreen">⛶</button></div></header><main class="workspace ${state.sidebar?'':'sidebar-closed'}"><aside class="slide-rail"><div class="slide-list">${deck.slides.map(thumb).join('')}</div></aside><div class="stage-wrap"><article class="stage">${view}</article></div></main><footer class="bottombar"><div class="nav-actions"><button class="nav-button" data-action="prev" ${state.cur===0?'disabled':''}>← Înapoi</button><span class="slide-counter">${String(state.cur+1).padStart(2,'0')} / ${deck.slides.length}</span><button class="nav-button primary" data-action="next" ${state.cur===deck.slides.length-1?'disabled':''}>Înainte →</button></div><div class="mode-actions"><button class="mode-button ${state.mode==='material'?'active':''}" data-mode="material">◫ Materie</button><button class="mode-button ${state.mode==='interactive'?'active':''}" data-mode="interactive">? Aplicație</button><button class="mode-button ${state.mode==='source'?'active':''}" data-mode="source">◎ Surse & original</button></div><div class="utility-actions"><button class="utility-button" data-action="sidebar">☰ Diapozitive</button></div></footer><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>`;
    requestAnimationFrame(()=>document.querySelector(`.thumb[data-jump="${state.cur}"]`)?.scrollIntoView({block:'nearest'}));
  }

  function send(kind){
    const slide=current(),q=slide.quickChecks?.[0]; if(!q)return;
    const correct=Array.isArray(q.correct)?q.correct:[q.correct];
    const payload={type:kind==='open'?'igiena-live-question':'igiena-live-reveal',lp,question:{id:q.id,slide:slide.number,q:q.question,scenario:q.scenario||'',options:q.options,correct,explanation:q.explanation||''}};
    if(window.parent!==window){window.parent.postMessage(payload,'*');state.msg=kind==='open'?'Întrebarea a fost trimisă către QR #1.':'Soluția a fost trimisă pe telefoane.';}else state.msg='Deschideți prezentarea din panoul orei pentru trimitere pe telefoane.';
    render();
  }

  function offline(){
    const body=deck.slides.map(s=>`<section><div class="no">${deck.meta.code} · ${s.number}/${deck.slides.length}</div><h1>${esc(s.title)}</h1>${s.blocks.map(b=>`<p class="${b.source?'src':''}">${nl(b.text)}</p>`).join('')}</section>`).join('');
    const html=`<!doctype html><html lang="ro"><meta charset="utf-8"><title>${esc(deck.meta.code)} · Studiu</title><style>body{font:16px Arial;max-width:980px;margin:auto;padding:30px;color:#172033}section{break-after:page;border-bottom:1px solid #ddd;padding:20px 0 40px}h1{color:#123b69}.no{color:#667085;font-weight:700}.src{font-size:12px;color:#475569;border-left:3px solid #14b8a6;padding-left:10px}p{line-height:1.5}</style>${body}</html>`;
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));a.download=`${deck.meta.code}_studiu_offline.html`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }

  app.addEventListener('click',e=>{
    const t=e.target.closest('button');if(!t)return;
    if(t.dataset.jump!==undefined){state.cur=+t.dataset.jump;state.selected=null;return render()}
    if(t.dataset.mode){state.mode=t.dataset.mode;state.selected=null;return render()}
    if(t.dataset.opt!==undefined){state.selected=+t.dataset.opt;return render()}
    switch(t.dataset.action){
      case'prev':state.cur=Math.max(0,state.cur-1);state.selected=null;render();break;
      case'next':state.cur=Math.min(deck.slides.length-1,state.cur+1);state.selected=null;render();break;
      case'sidebar':state.sidebar=!state.sidebar;render();break;
      case'fullscreen':document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();break;
      case'send':send('open');break;case'reveal':send('reveal');break;case'download':offline();break;
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea,select'))return;
    if(e.key==='ArrowRight'||e.key==='PageDown'){state.cur=Math.min(deck.slides.length-1,state.cur+1);state.selected=null;render()}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){state.cur=Math.max(0,state.cur-1);state.selected=null;render()}
    if(e.key.toLowerCase()==='m'){state.mode='material';render()}
    if(e.key.toLowerCase()==='q'){state.mode='interactive';render()}
    if(e.key.toLowerCase()==='s'){state.mode='source';render()}
  });
  load();
})();
