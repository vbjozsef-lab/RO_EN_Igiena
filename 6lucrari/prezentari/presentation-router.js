(() => {
  const lp=(new URLSearchParams(location.search).get('lp')||'lp6b').toLowerCase();

  if(lp==='lp1a'){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='presentation-lp1a.css';
    document.head.appendChild(css);
    document.documentElement.style.colorScheme='light';
  } else if(lp!=='lp6b'){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='presentation-generic.css';
    document.head.appendChild(css);
  }

  const s=document.createElement('script');
  s.src=lp==='lp6b'?'presentation-engine.js':lp==='lp1a'?'presentation-engine-lp1a.js':'presentation-engine-generic.js';
  document.body.appendChild(s);
})();