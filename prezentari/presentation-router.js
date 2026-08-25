(() => {
  const lp=(new URLSearchParams(location.search).get('lp')||'lp6b').toLowerCase();
  if(lp!=='lp6b'){
    const css=document.createElement('link');css.rel='stylesheet';css.href='presentation-generic.css';document.head.appendChild(css);
  }
  const s=document.createElement('script');
  s.src=lp==='lp6b'?'presentation-engine.js':'presentation-engine-generic.js';
  document.body.appendChild(s);
})();