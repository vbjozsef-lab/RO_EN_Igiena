from pathlib import Path

old = '''function getMergedQuizModule(labId,lang){
  const lab=LABS.find(l=>l.id===labId);
  const parts=MERGED_LAB_PARTS[labId]||[];
  const questions=parts.flatMap(p=>legacyFullQuestions(p,lang));
  if(!lab||!questions.length) return null;
  return {
    id:"full"+labId.replace("lp",""),
    icon:lab.icon,
    title:(lang==="en"?"Complete quiz ":"Quiz complet ")+lab.code,
    sub:(lang==="en"?"Combined content from the former A and B practicals":"Conținut combinat din fostele practici A și B"),
    color:lab.color,
    dim:lab.dim,
    border:lab.border,
    time:20,
    count:Math.min(20,questions.length),
    labCode:lab.code,
    _questions:questions
  };
}'''

new = '''function takeUniqueQuizQuestions(list, count=10){
  const out=[];
  const seen=new Set();
  for(const q of (list||[])){
    const key=String(q?.q||"").trim().toLocaleLowerCase("ro-RO");
    if(!key||seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if(out.length>=count) break;
  }
  return out;
}

function getMergedQuizModule(labId,lang){
  const lab=LABS.find(l=>l.id===labId);
  const parts=MERGED_LAB_PARTS[labId]||[];
  if(!lab||parts.length!==2) return null;

  // The merged individual quiz must always reflect the new six-LP structure:
  // exactly 10 existing questions from the former A practical + 10 existing
  // questions from the former B practical. No new questions are generated here.
  const fromA=takeUniqueQuizQuestions(legacyFullQuestions(parts[0],lang),10);
  const fromB=takeUniqueQuizQuestions(legacyFullQuestions(parts[1],lang),10);
  const questions=[...fromA,...fromB];

  if(!questions.length) return null;
  return {
    id:"full"+labId.replace("lp",""),
    icon:lab.icon,
    title:(lang==="en"?"Complete quiz ":"Quiz complet ")+lab.code,
    sub:(lang==="en"
      ?"20 existing questions: 10 from the former A practical + 10 from the former B practical"
      :"20 de întrebări existente: 10 din fostul LP A + 10 din fostul LP B"),
    color:lab.color,
    dim:lab.dim,
    border:lab.border,
    time:20,
    count:questions.length,
    labCode:lab.code,
    _questions:questions,
    _split:{a:fromA.length,b:fromB.length,parts}
  };
}'''

for fn in ["index.html","6lucrari/index.html"]:
    p=Path(fn)
    t=p.read_text(encoding="utf-8")
    if new in t:
        print(fn,"already patched")
        continue
    if old not in t:
        raise SystemExit("Merged quiz helper anchor not found in "+fn)
    t=t.replace(old,new,1)
    p.write_text(t,encoding="utf-8")
    print(fn,"patched")
