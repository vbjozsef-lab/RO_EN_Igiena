from pathlib import Path
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")

# Load the 30 final cases before the Babel app.
anchor='''  window.TEAM_MISSIONS = TEAM_MISSIONS;
  window.TEAM_ROLES = ROLES;
})();

</script>
<script type="text/babel">'''
insert='''  window.TEAM_MISSIONS = TEAM_MISSIONS;
  window.TEAM_ROLES = ROLES;
})();

</script>
<script src="group-cases/lp1.js"></script>
<script src="group-cases/lp2.js"></script>
<script src="group-cases/lp3.js"></script>
<script src="group-cases/lp4.js"></script>
<script src="group-cases/lp5.js"></script>
<script src="group-cases/lp6.js"></script>
<script type="text/babel">'''
if 'group-cases/lp1.js' not in t:
    if anchor not in t: raise SystemExit("script insertion anchor not found")
    t=t.replace(anchor,insert,1)

# Replace merged A+B generator with the final 30 cases from the approved source.
a=t.find("function mergeIntegratedActivityPair")
b=t.find("// Returns six visible activities for the new six-practical structure.",a)
if a<0 or b<0: raise SystemExit("group builder anchors not found")
new_builder=r'''function finalCaseToMission(item,labId,index){
  const lab=LABS.find(x=>x.id===labId)||{};
  const parts=(item.taskParts||[]).map((q,i)=>({
    q:String(q||"").trim(),
    h:""
  }));
  return {
    ...item,
    mission:true,
    emoji:["🩺","🔎","🧪","📋","✅"][index%5],
    color:lab.color||"#2563eb",
    context:(item.contextParagraphs||[]).join("\n\n"),
    briefing:(item.contextParagraphs||[]).join("\n\n"),
    caz:[],
    qs:parts,
    diagnosis:null,
    evidence:[],
    actions:[],
    sourceRefs:item.sourceNote?[item.sourceNote]:[],
    conc:[],
    _finalApprovedCase:true
  };
}

function buildMergedBaseActivities(labId, bank) {
  const finalCases=window.FINAL_GROUP_CASES?.[labId];
  if(finalCases?.length){
    return finalCases.slice(0,5).map((x,i)=>finalCaseToMission(x,labId,i));
  }
  return [];
}

'''
t=t[:a]+new_builder+t[b:]

# Student screen: preserve the exact source case/task wording and create a separate field per source task part.
old='''      <section style={{background:"white",borderRadius:18,padding:"18px 16px",border:"1px solid #dbe7f1",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color}}>Contextul cazului</div>
        <p style={{lineHeight:1.6,fontSize:16,marginBottom:16}}>{f.context||f.briefing}</p>

        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color,marginBottom:10}}>Datele obținute</div>
        {sections.map((section,si)=><div key={si} style={{marginBottom:si<sections.length-1?16:0}}>
          <div style={{fontWeight:850,fontSize:14,color:"#334155",margin:"0 0 8px"}}>{section.title}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
            {(section.data||[]).map((x,i)=><div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"11px 12px"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>{x.l}</div>
              <strong style={{fontSize:16,lineHeight:1.25}}>{x.v}</strong>
            </div>)}
          </div>
        </div>)}
      </section>

      <section style={{background:"white",borderRadius:18,padding:"18px 16px",border:"1px solid #dbe7f1",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color,marginBottom:4}}>Sarcina studentului</div>
        <p style={{fontSize:13,color:"#64748b",lineHeight:1.5,margin:"4px 0 16px"}}>Răspundeți separat la fiecare sarcină. După trimitere, toate răspunsurile sunt blocate definitiv.</p>'''
new='''      <section style={{background:"white",borderRadius:18,padding:"18px 16px",border:"1px solid #dbe7f1",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color}}>Contextul cazului</div>
        {(f.contextParagraphs&&f.contextParagraphs.length
          ? f.contextParagraphs
          : [f.context||f.briefing]
        ).filter(Boolean).map((p,i)=><p key={i} style={{lineHeight:1.65,fontSize:16,margin:i===0?"10px 0 10px":"0 0 10px"}}>{p}</p>)}
      </section>

      <section style={{background:"white",borderRadius:18,padding:"18px 16px",border:"1px solid #dbe7f1",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color,marginBottom:8}}>Sarcina studentului</div>
        {f.taskRaw&&<div style={{fontSize:15,color:"#334155",lineHeight:1.65,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"12px 13px",marginBottom:16}}>{f.taskRaw}</div>}
        <p style={{fontSize:13,color:"#64748b",lineHeight:1.5,margin:"4px 0 16px"}}>Răspundeți separat la punctele de mai jos. După trimitere, toate răspunsurile sunt blocate definitiv.</p>'''
if old not in t: raise SystemExit("student context block anchor not found")
t=t.replace(old,new,1)

t=t.replace('alert("Completați răspunsul la toate cele 4 sarcini înainte de trimitere.");','alert("Completați răspunsul la toate sarcinile înainte de trimitere.");',1)

# Generic placeholders instead of the temporary four fixed labels.
oldph='''placeholder={i===0?"Formulați verdictul și argumentați-l…":i===1?"Indicați datele decisive și normele de comparație…":i===2?"Descrieți efectele și riscurile prioritare…":"Precizați măsurile, metoda de confirmare și concluzia…"}'''
newph='''placeholder={"Răspuns la punctul "+(i+1)+"…"}'''
if oldph in t: t=t.replace(oldph,newph,1)

# Do not show an empty generated solution for the approved cases; show only source-supported notes if present.
oldsol='''      {room.unlocked&&submitted&&<section style={{background:"#f0fdf4",borderRadius:18,padding:"18px 16px",border:"1px solid #86efac"}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:"#166534"}}>Rezolvarea corectă și explicații</div>
        <ul style={{lineHeight:1.6,paddingLeft:22}}>{solution.map((x,i)=><li key={i} style={{marginBottom:7}}>{x}</li>)}</ul>
        {(f.sourceRefs||[]).length>0&&<div style={{marginTop:14,fontSize:12,color:"#166534"}}><strong>Trasabilitate în material:</strong> {(f.sourceRefs||[]).join(" · ")}</div>}
      </section>}'''
newsol='''      {room.unlocked&&submitted&&((solution.length>0)||(f.sourceRefs||[]).length>0)&&<section style={{background:"#f0fdf4",borderRadius:18,padding:"18px 16px",border:"1px solid #86efac"}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:"#166534"}}>Repere pentru verificare</div>
        {solution.length>0&&<ul style={{lineHeight:1.6,paddingLeft:22}}>{solution.map((x,i)=><li key={i} style={{marginBottom:7}}>{x}</li>)}</ul>}
        {(f.sourceRefs||[]).length>0&&<div style={{marginTop:10,fontSize:13,lineHeight:1.55,color:"#166534"}}>{(f.sourceRefs||[]).join(" · ")}</div>}
      </section>}'''
if oldsol not in t: raise SystemExit("solution block anchor not found")
t=t.replace(oldsol,newsol,1)

p.write_text(t,encoding="utf-8")
print("final approved group cases wired into runtime")
