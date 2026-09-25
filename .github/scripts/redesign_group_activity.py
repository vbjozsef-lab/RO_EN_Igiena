from pathlib import Path

INDEX=Path("6lucrari/index.html")
UI=Path("6lucrari/team-mission-ui.jsx")

new_build = r'''function mergeIntegratedActivityPair(labId,a,b,index,parts){
  if(!a&&!b) return null;
  if(!a) return {...b,id:labId+"_g"+(index+1)};
  if(!b) return {...a,id:labId+"_g"+(index+1)};

  const correctA=a.diagnosis?.options?.[a.diagnosis?.correct]||"";
  const correctB=b.diagnosis?.options?.[b.diagnosis?.correct]||"";
  const relevantEvidence=[
    ...(a.evidence||[]).filter(x=>x.relevant),
    ...(b.evidence||[]).filter(x=>x.relevant)
  ];
  const usefulActions=[
    ...(a.actions||[]).filter(x=>(x.score||0)>0),
    ...(b.actions||[]).filter(x=>(x.score||0)>0)
  ];

  return {
    ...a,
    id:labId+"_g"+(index+1),
    mission:true,
    title:"Caz integrat "+(index+1)+" · "+(a.title||parts[0].toUpperCase())+" + "+(b.title||parts[1].toUpperCase()),
    context:
      "În cadrul aceleiași evaluări practice trebuie analizate împreună două componente ale cazului. "+
      String(a.context||a.briefing||"").trim()+" "+
      "În paralel, "+String(b.context||b.briefing||"").trim(),
    briefing:
      "Analizați integrat datele din cele două componente și formulați un singur răspuns profesional coerent.",
    sections:[
      {title:a.title||parts[0].toUpperCase(),source:parts[0].toUpperCase(),data:a.caz||[]},
      {title:b.title||parts[1].toUpperCase(),source:parts[1].toUpperCase(),data:b.caz||[]}
    ],
    caz:[
      ...(a.caz||[]).map(x=>({...x,section:a.title||parts[0].toUpperCase()})),
      ...(b.caz||[]).map(x=>({...x,section:b.title||parts[1].toUpperCase()}))
    ],
    qs:[
      {q:"1. Formulați verdictul igienico-sanitar integrat al cazului și argumentați-l pe baza ambelor componente.",
       h:[correctA,correctB].filter(Boolean).join(" · ")},
      {q:"2. Selectați datele decisive din ambele componente și comparați-le cu valorile, normele sau principiile relevante.",
       h:relevantEvidence.slice(0,6).map(x=>x.text).join(" · ")},
      {q:"3. Ce efecte asupra sănătății sau siguranței rezultă din aceste constatări și care sunt prioritare?",
       h:relevantEvidence.slice(0,4).map(x=>x.text).join(" · ")},
      {q:"4. Propuneți planul de intervenție: măsurile prioritare, aparatul/metoda de confirmare și concluzia finală.",
       h:usefulActions.sort((x,y)=>(y.score||0)-(x.score||0)).slice(0,5).map(x=>x.text).join(" · ")}
    ],
    diagnosis:{
      prompt:"Verdict integrat",
      options:[
        [correctA,correctB].filter(Boolean).join(" + "),
        "Datele indică doar o problemă minoră, fără consecințe igienico-sanitare.",
        "Datele sunt toate conforme și nu este necesară nicio intervenție."
      ],
      correct:0
    },
    evidence:[...(a.evidence||[]),...(b.evidence||[])],
    actions:[...(a.actions||[]),...(b.actions||[])],
    budget:Number(a.budget||0)+Number(b.budget||0),
    sourceRefs:[
      ...(a.sourceRefs||[parts[0].toUpperCase()]),
      ...(b.sourceRefs||[parts[1].toUpperCase()])
    ],
    conc:["Verdict integrat","Date decisive și norme","Riscuri prioritare","Plan de intervenție și concluzie"]
  };
}

function buildMergedBaseActivities(labId, bank) {
  const parts=MERGED_LAB_PARTS[labId];
  if(!parts) return bank?.[labId] || [];
  const left=bank?.[parts[0]] || [];
  const right=bank?.[parts[1]] || [];
  return Array.from({length:5},(_,i)=>mergeIntegratedActivityPair(labId,left[i]||null,right[i]||null,i,parts)).filter(Boolean);
}'''

new_ui = r'''function TeamMissionScreen({session,student,onBack}){
  const lang="ro";
  const labId=session?.labId||"lp1";
  const [f,setF]=React.useState(null);
  const [room,setRoom]=React.useState({joins:[],members:[],approvals:[],seatByName:{},unlocked:false,synthesis:null,final:null});
  const [answers,setAnswers]=React.useState({});
  const [submitted,setSubmitted]=React.useState(null);
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState("");
  const [ready,setReady]=React.useState(editsAreReady());

  React.useEffect(()=>{
    const build=()=>{
      const items=getActiveFiseForLab(labId,lang).slice(0,5).map(x=>normalizeTeamMission(x,lang));
      const rawGroup=parseInt(String(student?.group||"1").match(/\d+/)?.[0]||"1",10)||1;
      const caseIndex=((rawGroup-1)%Math.max(1,items.length))+1;
      setF(items[caseIndex-1]||items[0]||null);
      setReady(true);
    };
    if(editsAreReady()) build(); else fetchAllEditsRemote().then(build).catch(build);
  },[labId,student?.group]);

  const refresh=React.useCallback(async()=>{
    if(!f)return;
    try{
      const next=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);
      setRoom(next);
      const mine=(next.members||[]).find(r=>activityRowKey(r)===activityStudentKey(student));
      if(mine){
        const p=activityPayload(mine);
        const storedAnswers=p.answers||{};
        setSubmitted({
          answers:storedAnswers,
          answer:p.answer||p.analysis||"",
          submittedAt:p.submittedAt||p.savedAt||null
        });
      }
      setError("");
    }catch(e){setError("Sincronizarea nu este disponibilă momentan.");}
  },[f,session?.token,student?.group,student?.matricol]);

  React.useEffect(()=>{if(!f)return;refresh();const t=setInterval(refresh,4000);return()=>clearInterval(t)},[f,refresh]);

  const setAnswer=(i,value)=>setAnswers(prev=>({...prev,[i]:value}));

  const send=async()=>{
    const taskCount=(f?.qs||[]).length;
    const clean=Array.from({length:taskCount},(_,i)=>String(answers[i]||"").trim());
    const missing=clean.findIndex(x=>!x);
    if(missing>=0){
      alert("Completați răspunsul la toate cele 4 sarcini înainte de trimitere.");
      return;
    }
    if(submitted){alert("Răspunsurile au fost deja trimise și nu mai pot fi modificate.");return;}
    if(!confirm("Sunteți sigur(ă) că doriți să trimiteți răspunsurile? După trimitere, acestea nu mai pot fi modificate."))return;
    setSaving(true);
    try{
      const latest=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);
      const already=(latest.members||[]).some(r=>activityRowKey(r)===activityStudentKey(student));
      if(already){setRoom(latest);setSubmitted({answers:{},answer:"Răspuns deja înregistrat."});return;}
      const structured={};
      (f.qs||[]).forEach((q,i)=>{structured[i]=clean[i]||"";});
      const combined=(f.qs||[]).map((q,i)=>q.q+"\n"+(clean[i]||"")).join("\n\n");
      await activityWriteEvent("member",f,{
        version:5,mode:"individual_locked_structured",answers:structured,answer:combined,analysis:combined,
        submittedAt:Date.now(),locked:true,studentMeta:activityStudentMeta(student)
      },session,student,"Răspuns individual sigilat · "+f.title);
      setSubmitted({answers:structured,answer:combined,submittedAt:Date.now()});
      await refresh();
    }catch(e){setError("Răspunsurile nu au putut fi salvate. Încercați din nou.");}
    finally{setSaving(false);}
  };

  if(!ready||!f)return <div style={{padding:30,fontFamily:"system-ui"}}>Se încarcă activitatea…</div>;

  const solution=[
    f.diagnosis?.options?.[f.diagnosis?.correct],
    ...(f.evidence||[]).filter(x=>x.relevant).map(x=>x.text),
    ...(f.actions||[]).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.text)
  ].filter(Boolean);

  const sections=(f.sections&&f.sections.length)?f.sections:[{title:"Datele obținute",data:f.caz||[]}];

  return <div style={{minHeight:"100vh",background:"#f4f8fb",fontFamily:"system-ui",color:"#0f2742"}}>
    <div style={{background:"#071a33",color:"white",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <div>
        <div style={{fontSize:12,opacity:.75}}>Activitate de grup · răspuns individual</div>
        <strong style={{display:"block",lineHeight:1.25}}>{f.emoji} {f.title}</strong>
      </div>
      <button onClick={onBack} style={{padding:"9px 12px",borderRadius:9,border:"1px solid #ffffff44",background:"transparent",color:"white",cursor:"pointer"}}>Înapoi</button>
    </div>

    <main style={{maxWidth:860,margin:"0 auto",padding:"18px 12px 44px"}}>
      {error&&<div style={{background:"#fff7ed",border:"1px solid #fdba74",padding:12,borderRadius:12,marginBottom:12}}>{error}</div>}

      <section style={{background:"white",borderRadius:18,padding:"18px 16px",border:"1px solid #dbe7f1",marginBottom:14}}>
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
        <p style={{fontSize:13,color:"#64748b",lineHeight:1.5,margin:"4px 0 16px"}}>Răspundeți separat la fiecare sarcină. După trimitere, toate răspunsurile sunt blocate definitiv.</p>

        {(f.qs||[]).map((q,i)=><div key={i} style={{borderTop:i?"1px solid #e2e8f0":"none",paddingTop:i?16:0,marginTop:i?16:0}}>
          <div style={{fontWeight:800,fontSize:15,lineHeight:1.5,color:"#0f2742",marginBottom:8}}>{q.q}</div>
          {!submitted
            ? <textarea value={answers[i]||""} onChange={e=>setAnswer(i,e.target.value)}
                placeholder={i===0?"Formulați verdictul și argumentați-l…":i===1?"Indicați datele decisive și normele de comparație…":i===2?"Descrieți efectele și riscurile prioritare…":"Precizați măsurile, metoda de confirmare și concluzia…"}
                style={{width:"100%",minHeight:110,padding:12,border:"1.5px solid #cbd5e1",borderRadius:12,font:"inherit",fontSize:15,lineHeight:1.45,resize:"vertical",boxSizing:"border-box",background:"#fff"}}/>
            : <div style={{whiteSpace:"pre-wrap",lineHeight:1.55,background:"#f8fafc",padding:13,borderRadius:12,border:"1px solid #e2e8f0"}}>{submitted.answers?.[i]||"—"}</div>}
        </div>)}

        {!submitted?<>
          <div style={{background:"#f8fafc",padding:11,borderRadius:10,fontSize:12,color:"#64748b",margin:"16px 0 10px"}}>🔐 După trimitere, răspunsurile sunt înregistrate definitiv și nu mai pot fi modificate.</div>
          <button disabled={saving} onClick={send} style={{width:"100%",padding:14,border:0,borderRadius:12,background:f.color,color:"white",fontWeight:850,fontSize:16,cursor:saving?"wait":"pointer"}}>{saving?"Se trimit…":"Trimite răspunsurile"}</button>
        </>:<div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:12,padding:14,color:"#166534",fontWeight:800,marginTop:16}}>✓ Răspunsurile au fost trimise și blocate</div>}
      </section>

      {room.unlocked&&submitted&&<section style={{background:"#f0fdf4",borderRadius:18,padding:"18px 16px",border:"1px solid #86efac"}}>
        <div style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:"#166534"}}>Rezolvarea corectă și explicații</div>
        <ul style={{lineHeight:1.6,paddingLeft:22}}>{solution.map((x,i)=><li key={i} style={{marginBottom:7}}>{x}</li>)}</ul>
        {(f.sourceRefs||[]).length>0&&<div style={{marginTop:14,fontSize:12,color:"#166534"}}><strong>Trasabilitate în material:</strong> {(f.sourceRefs||[]).join(" · ")}</div>}
      </section>}
    </main>
  </div>;
}'''

def replace_between(text,start_marker,end_marker,new_text,label):
    a=text.find(start_marker)
    if a<0: raise SystemExit(label+" start marker not found")
    b=text.find(end_marker,a)
    if b<0: raise SystemExit(label+" end marker not found")
    return text[:a]+new_text.rstrip()+"\n\n"+text[b:]

# Update source component
ui=UI.read_text(encoding="utf-8")
ui=replace_between(ui,"function TeamMissionScreen","async function saveTeamMissionResult",new_ui,"UI")
UI.write_text(ui,encoding="utf-8")

# Update running app
text=INDEX.read_text(encoding="utf-8")
text=replace_between(text,"function buildMergedBaseActivities","// Returns six visible activities for the new six-practical structure.",new_build,"merged activity builder")
text=replace_between(text,"function TeamMissionScreen","async function saveTeamMissionResult",new_ui,"runtime UI")
text=text.replace('<LangToggle lang={lang} onToggle={toggleLang}/>','{screen!=="fisa_grup" && <LangToggle lang={lang} onToggle={toggleLang}/>}')

INDEX.write_text(text,encoding="utf-8")
print("group activity redesign applied")
