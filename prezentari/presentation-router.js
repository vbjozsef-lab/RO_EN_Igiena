(() => {
  const lp=(new URLSearchParams(location.search).get('lp')||'lp6b').toLowerCase();
  if(lp!=='lp6b'){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='presentation-generic.css';
    document.head.appendChild(css);
  }
  if(lp==='lp1a'){
    const light=document.createElement('link');
    light.rel='stylesheet';
    light.href='presentation-light.css';
    document.head.appendChild(light);

    const lp1a=document.createElement('link');
    lp1a.rel='stylesheet';
    lp1a.href='presentation-lp1a.css';
    document.head.appendChild(lp1a);

    document.documentElement.style.colorScheme='light';
  }
  const s=document.createElement('script');
  s.src=lp==='lp6b'?'presentation-engine.js':lp==='lp1a'?'presentation-engine-lp1a.js':'presentation-engine-generic.js';
  document.body.appendChild(s);
})();