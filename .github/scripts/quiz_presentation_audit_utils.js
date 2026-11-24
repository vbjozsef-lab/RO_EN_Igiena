/*
 * Twelve-LP audit utilities: read the compressed, slide-level text extracted
 * from the lecture PowerPoints; parse the static quiz banks for cross-checks.
 * This audit utility is not loaded by the student or teacher application.
 */
function qauB64(s) {
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const map={};for(let i=0;i<alphabet.length;i++)map[alphabet[i]]=i;
  const out=[];
  for(let i=0;i<s.length;i+=4){
    const a=map[s[i]],b=map[s[i+1]],c=map[s[i+2]],d=map[s[i+3]];
    out.push((a<<2)|(b>>4));
    if(c!==undefined)out.push(((b&15)<<4)|(c>>2));
    if(d!==undefined)out.push(((c&3)<<6)|d);
  }
  return new Uint8Array(out);
}
function qauGunzip(u) {
  let start=10,flags=u[3];
  if(u[0]!==31||u[1]!==139)throw Error("Not gzip");
  if(flags&4){const len=u[start]|(u[start+1]<<8);start+=2+len}
  if(flags&8){while(u[start++]){}}
  if(flags&16){while(u[start++]){}}
  if(flags&2)start+=2;
  let bit=start*8,out=[];
  function rb(n) {
    let v=0;
    for(let i=0;i<n;i++){
      if((bit>>3)>=u.length)throw Error("Unexpected end of gzip");
      v|=((u[bit>>3]>>(bit&7))&1)<<i;bit++;
    }
    return v;
  }
  function tree(lens){
    const max=Math.max(...lens),counts=new Array(max+1).fill(0),next=new Array(max+1).fill(0);
    const maps=Array.from({length:max+1},()=>new Map());
    for(const l of lens)if(l)counts[l]++;
    let code=0;
    for(let i=1;i<=max;i++){code=(code+(counts[i-1]||0))*2;next[i]=code}
    for(let i=0;i<lens.length;i++)if(lens[i])maps[lens[i]].set(next[lens[i]]++,i);
    return {max,maps};
  }
  function sym(h){
    let code=0;
    for(let n=1;n<=h.max;n++){
      code=(code<<1)|rb(1);
      const s=h.maps[n].get(code);
      if(s!==undefined)return s;
    }
    throw Error("Invalid Huffman code at bit "+bit);
  }
  const LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const fixL=tree(Array.from({length:288},(_,i)=>i<=143?8:i<=255?9:i<=279?7:8));
  const fixD=tree(Array(32).fill(5));
  let fin=0;
  while(!fin){
    fin=rb(1);const typ=rb(2);
    if(typ===0){bit=(bit+7)&~7;const len=rb(16);rb(16);for(let i=0;i<len;i++)out.push(rb(8));continue}
    let L,D;
    if(typ===1){L=fixL;D=fixD}
    else if(typ===2){
      const HLIT=rb(5)+257,HDIST=rb(5)+1,HCLEN=rb(4)+4;
      const order=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],ln=new Array(19).fill(0);
      for(let i=0;i<HCLEN;i++)ln[order[i]]=rb(3);
      const CL=tree(ln),all=[];
      while(all.length<HLIT+HDIST){
        const v=sym(CL);
        if(v<=15)all.push(v);
        else if(v===16){const n=rb(2)+3;for(let j=0;j<n;j++)all.push(all[all.length-1])}
        else if(v===17){const n=rb(3)+3;for(let j=0;j<n;j++)all.push(0)}
        else if(v===18){const n=rb(7)+11;for(let j=0;j<n;j++)all.push(0)}
      }
      L=tree(all.slice(0,HLIT));D=tree(all.slice(HLIT,HLIT+HDIST));
    }else throw Error("Reserved DEFLATE type");
    while(true){
      const v=sym(L);
      if(v<256){out.push(v);continue}
      if(v===256)break;
      const li=v-257;
      if(li<0||li>=LB.length)throw Error("Invalid length code "+v);
      const len=LB[li]+rb(LE[li]);
      const ds=sym(D),dist=DB[ds]+rb(DE[ds]);
      if(dist>out.length||dist<=0)throw Error("Invalid distance "+dist);
      for(let j=0;j<len;j++)out.push(out[out.length-dist]);
    }
  }
  let s="",i=0;
  while(i<out.length){
    const a=out[i++];
    if(a<128){s+=String.fromCharCode(a);continue}
    if(a<224){const b=out[i++];s+=String.fromCharCode(((a&31)<<6)|(b&63));continue}
    if(a<240){const b=out[i++],c=out[i++];s+=String.fromCharCode(((a&15)<<12)|((b&63)<<6)|(c&63));continue}
    const b=out[i++],c=out[i++],d=out[i++];
    const n=(((a&7)<<18)|((b&63)<<12)|((c&63)<<6)|(d&63))-65536;
    s+=String.fromCharCode(0xd800+(n>>10),0xdc00+(n&1023));
  }
  return s;
}
function qauParseDeck(source){
  if(source.includes("PRESENTATION_DECK_GZIP")){
    const m=source.match(/PRESENTATION_DECK_GZIP\s*=\s*"([^"]+)"/);
    if(!m)throw Error("Compressed deck not found");
    const d=JSON.parse(qauGunzip(qauB64(m[1])));
    return {meta:d.m,slides:d.s.map(x=>({number:x[0],title:x[1],blocks:x[2].map(b=>b[0]),quickChecks:x[3]||[]}))};
  }
  const m=source.match(/window\.PRESENTATION_CONTENT\s*=\s*(\{[\s\S]+?\})\s*;/);
  if(!m)throw Error("Uncompressed deck not found");
  const d=JSON.parse(m[1]);
  return {meta:d.meta,slides:d.slides.map(x=>({number:x.number,title:x.title,blocks:x.contentBlocks.map(b=>b.text),quickChecks:x.quickChecks||[]}))};
}
function qauGetVariable(source,name){
  const re=new RegExp("var\\s+"+name+"\\s*=\\s*\\{");
  const p=source.search(re);
  if(p<0)throw Error("Not found: "+name);
  const start=source.indexOf("{",p);
  let n=0,quote="",escaped=false,end=-1;
  for(let i=start;i<source.length;i++){
    const c=source[i];
    if(quote){if(escaped){escaped=false;continue}if(c==="\\"){escaped=true;continue}if(c===quote)quote="";continue}
    if(c==='"'||c==="'"||c==="`"){quote=c;continue}
    if(c==="{")n++;
    if(c==="}")n--;
    if(n===0){end=i+1;break}
  }
  if(end<0)throw Error("Unbalanced bank "+name);
  return (new Function("return ("+source.slice(start,end)+")"))();
}
function qauNormalize(v) {
  return String(v||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[șş]/g,"s").replace(/[țţ]/g,"t")
    .replace(/[^a-z0-9%°µμ²³.+/,-]+/g," ")
    .replace(/\s+/g," ").trim();
}
function qauWords(v){return qauNormalize(v).split(/\s+/).filter(x=>x.length>3&&!["care","este","sunt","pentru","dintre","prin","toate","poate","unei","unui","with","from","than","into","this","that","what","which","should","must","does","have","these","would","could"].includes(x))}
function qauMatch(question,deck){
  const opts=Array.isArray(question.o)?question.o:[];
  const correct=Array.isArray(question.c)?question.c.map(x=>opts[x]):[opts[question.c]];
  const correctText=correct.filter(Boolean).join(" ");
  const keywords=[...new Set([...qauWords(question.q),...qauWords(question.s||""),...qauWords(correctText)])];
  let ranked=deck.slides.map(slide=>{
    const txt=qauNormalize([slide.title,...slide.blocks].join(" "));
    const keyHits=keywords.filter(x=>txt.includes(x));
    const phrase=qauNormalize(correctText);
    const exact=phrase.length>=6&&txt.includes(phrase);
    const possible=correct.map(x=>{const p=qauNormalize(x);return p.length>=4&&txt.includes(p)});
    return {slide:slide.number,score:(keywords.length?keyHits.length/keywords.length:0)+(exact?.8:0)+(possible.filter(Boolean).length/Math.max(1,correct.length))*.3,exact:!!exact,matched:keyHits,possible};
  }).sort((a,b)=>b.score-a.score);
  return {correct,keywords,best:ranked.slice(0,3)};
}
