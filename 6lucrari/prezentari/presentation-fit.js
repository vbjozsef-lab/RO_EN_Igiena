(() => {
  'use strict';
  let raf=0;
  function fit(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const wrap=document.querySelector('.stage-wrap');
      const stage=document.querySelector('.stage');
      const slide=stage?.querySelector('.slide-view');
      if(!wrap||!stage||!slide) return;

      // 16:9 slide canvas, always fully visible inside the projector viewport.
      const maxW=Math.max(320,wrap.clientWidth-4);
      const maxH=Math.max(180,wrap.clientHeight-4);
      let w=Math.min(maxW,maxH*16/9,1420);
      let h=w*9/16;
      if(h>maxH){h=maxH;w=h*16/9;}
      stage.style.width=w+'px';
      stage.style.height=h+'px';

      // Never scroll inside a teaching slide. If a dense slide needs more room,
      // scale the complete slide down so every item remains visible at once.
      slide.style.overflow='hidden';
      slide.style.transform='none';
      slide.style.transformOrigin='0 0';
      slide.style.width='100%';
      slide.style.height='100%';

      requestAnimationFrame(()=>{
        const neededW=Math.max(slide.scrollWidth,slide.clientWidth);
        const neededH=Math.max(slide.scrollHeight,slide.clientHeight);
        let scale=Math.min(1,stage.clientWidth/neededW,stage.clientHeight/neededH);
        if(!Number.isFinite(scale)||scale<=0) scale=1;
        if(scale<0.999){
          slide.style.width=(100/scale)+'%';
          slide.style.height=(100/scale)+'%';
          slide.style.transform=`scale(${scale})`;
        }
      });
    });
  }

  const app=document.getElementById('app');
  if(app){
    new MutationObserver(fit).observe(app,{childList:true,subtree:true,attributes:false});
  }
  window.addEventListener('resize',fit);
  document.addEventListener('fullscreenchange',()=>setTimeout(fit,80));
  setTimeout(fit,50);
})();
