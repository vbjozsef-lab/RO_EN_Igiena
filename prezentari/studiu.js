(() => {
  'use strict';
  const p=new URLSearchParams(location.search),lp=(p.get('lp')||'lp6b').toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nl=v=>esc(v).replace(/\n/g,'<br>');
  const deckEl=document.getElementById('deck'),titleEl=document.getElementById('title');
  function draw(meta,slides){
    titleEl.textContent=`${meta.code} · ${meta.title}`;
    document.title=`${meta.code} · Studiu PDF`;
    deckEl.innerHTML=slides.map(s=>{
      const blocks=(s.blocks||s.contentBlocks||[]).filter(b=>String(b.text||'').trim()&&String(b.text||'').trim()!==String(s.title||'').trim());
      return `<section class="page"><div class="no">${esc(meta.code)} · Diapozitiv ${s.number}</div><h1>${nl(s.title)}</h1><div class="grid">${blocks.map(b=>`<div class="block ${b.source?'source':''}">${nl(b.text)}</div>`).join('')}</div><footer><span>Igienă · UMFST Târgu Mureș</span><span>${s.number}/${slides.length}</span></footer></section>`;
    }).join('');
  }
  async function unpackGeneric(){
    const bin=Uint8Array.from(atob(window.PRESENTATION_DECK_GZIP),c=>c.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Folosiți Chrome/Edge actualizat.');
    const txt=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const d=JSON.parse(txt),slides=d.s.map(x=>({number:x[0],title:x[1],blocks:x[2].map(b=>({text:b[0],source:!!b[2]}))}));
    draw(d.m,slides);
  }
  function error(msg){deckEl.innerHTML=`<div style="background:white;padding:24px;border-radius:14px;color:#b91c1c"><b>Prezentarea nu este disponibilă.</b><p>${esc(msg)}</p></div>`}
  if(lp==='lp6b'){
    const s=document.createElement('script');s.src='content/lp6b.js';s.onload=()=>{const d=window.PRESENTATION_CONTENT;d?draw(d.meta,d.slides):error('Conținut lipsă.')};s.onerror=()=>error('Conținut LP6B lipsă.');document.head.appendChild(s);
  }else{
    const s=document.createElement('script');s.src=`content/${lp}-gz.js`;s.onload=()=>unpackGeneric().catch(e=>error(e.message));s.onerror=()=>error('Pachetul acestei prezentări nu a fost încă restaurat.');document.head.appendChild(s);
  }
})();
