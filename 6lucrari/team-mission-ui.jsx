// Activitate de grup v3: multi-device, automatic role confirmation,
// sealed work, synchronized reveal, team approval and final report.

function normalizeTeamMission(f, lang){
  if (f?.mission) return f;
  const hints=(f?.qs||[]).map(q=>q.h||q.q).filter(Boolean);
  const evidence=[0,1,2,3].map(i=>({text:hints[i]||((f?.caz||[])[i]?.l+": "+((f?.caz||[])[i]?.v||"")),relevant:true}));
  evidence.push(
    {text:lang==="en"?"The visual appearance alone proves compliance.":"Aspectul vizual singur dovedește conformitatea.",relevant:false},
    {text:lang==="en"?"No measurement or source comparison is needed.":"Nu este necesară măsurarea sau comparația cu materia-sursă.",relevant:false},
  );
  const roleNames=lang==="en"
    ? [["🧭","Coordinator"],["🩺","Clinician"],["🧪","Analyst"],["🔎","Epidemiologist"],["🛡️","Prevention"],["🎤","Reporter"]]
    : [["🧭","Coordonator"],["🩺","Medic"],["🧪","Analist"],["🔎","Epidemiolog"],["🛡️","Prevenție"],["🎤","Raportor"]];
  const roles=roleNames.map((r,i)=>({id:"r"+i,icon:r[0],name:r[1],task:lang==="en"?"bring this clue to the team":"adu această informație echipei",clue:evidence[i].text}));
  return {...f,mission:true,
    context:lang==="en"?"Work individually first. Your answer remains sealed until the whole group is ready.":"Lucrați mai întâi individual. Răspunsul rămâne sigilat până când întregul grup este pregătit.",
    briefing:f.title,budget:6,evidence,roles,
    diagnosis:{prompt:lang==="en"?"Main team verdict":"Verdictul principal",options:[f.title,lang==="en"?"Insufficient data":"Date insuficiente",lang==="en"?"No hygiene risk":"Fără risc igienic"],correct:0},
    actions:[
      {text:lang==="en"?"Confirm with the method from the practical":"Confirmare prin metoda din lucrare",cost:2,score:3,consequence:lang==="en"?"Produces verifiable evidence.":"Produce dovezi verificabile."},
      {text:lang==="en"?"Control the source of the problem":"Controlul sursei problemei",cost:3,score:3,consequence:lang==="en"?"Reduces exposure at origin.":"Reduce expunerea la origine."},
      {text:lang==="en"?"Repeat measurement after correction":"Repetarea măsurării după corecție",cost:1,score:2,consequence:lang==="en"?"Verifies effectiveness.":"Verifică eficiența."},
      {text:lang==="en"?"Mask the problem without measurement":"Mascarea problemei fără măsurare",cost:1,score:0,consequence:lang==="en"?"Does not control the hazard.":"Nu controlează riscul."},
    ],sourceRefs:[lang==="en"?"Original LP material and current worksheet":"Materialul LP original și fișa curentă"]};
}

function missionBestActionScore(actions,budget){
  let best=0;
  const n=actions.length;
  for(let mask=0;mask<(1<<n);mask++){
    let cost=0,score=0;
    for(let i=0;i<n;i++) if(mask&(1<<i)){cost+=actions[i].cost;score+=actions[i].score;}
    if(cost<=budget) best=Math.max(best,score);
  }
  return best;
}

function scoreTeamMission(f,state){
  const relevant=f.evidence.filter(e=>e.relevant).length;
  const evidenceScore=Math.max(0,(state.selectedEvidence||[]).reduce((sum,i)=>sum+(f.evidence[i]?.relevant?1:-1),0));
  const actionScore=(state.selectedActions||[]).reduce((sum,i)=>sum+(f.actions[i]?.score||0),0);
  const actionMax=missionBestActionScore(f.actions,f.budget);
  const breakdown={
    diagnosis:{score:state.diagnosisChoice===f.diagnosis.correct?3:0,max:3},
    evidence:{score:evidenceScore,max:relevant},
    actions:{score:actionScore,max:actionMax},
    roles:{score:Object.keys(state.roleSeen||{}).length>=Math.min(6,f.roles.length)?1:0,max:1},
    pitch:{score:state.pitchStarted?1:0,max:1},
  };
  const totalScore=Object.values(breakdown).reduce((s,x)=>s+x.score,0);
  const maxScore=Object.values(breakdown).reduce((s,x)=>s+x.max,0);
  return {breakdown,totalScore,maxScore,pct:Math.round(totalScore/maxScore*100)};
}

const ACTIVITY_SLOT_LIBRARY = {
  coordinator:{roleIndex:0,clueIndex:0,ro:"Coordonator · structurează problema",en:"Coordinator · structures the problem"},
  medic_a:{roleIndex:1,clueIndex:1,ro:"Medic A · efecte imediate",en:"Clinician A · immediate effects"},
  medic_b:{roleIndex:1,clueIndex:2,ro:"Medic B · grupuri vulnerabile",en:"Clinician B · vulnerable groups"},
  analyst_a:{roleIndex:2,clueIndex:3,ro:"Analist A · valori și norme",en:"Analyst A · values and standards"},
  analyst_b:{roleIndex:2,clueIndex:4,ro:"Analist B · metodă și unități",en:"Analyst B · method and units"},
  analyst_c:{roleIndex:2,clueIndex:5,ro:"Analist C · surse de eroare",en:"Analyst C · sources of error"},
  epidemiologist_a:{roleIndex:3,clueIndex:0,ro:"Epidemiolog A · sursa riscului",en:"Epidemiologist A · risk source"},
  epidemiologist_b:{roleIndex:3,clueIndex:1,ro:"Epidemiolog B · cale și populație",en:"Epidemiologist B · route and population"},
  prevention_a:{roleIndex:4,clueIndex:2,ro:"Prevenție A · măsuri imediate",en:"Prevention A · immediate measures"},
  prevention_b:{roleIndex:4,clueIndex:3,ro:"Prevenție B · măsuri tehnice",en:"Prevention B · technical measures"},
  prevention_c:{roleIndex:4,clueIndex:4,ro:"Prevenție C · monitorizare",en:"Prevention C · monitoring"},
  evidence_auditor:{roleIndex:2,clueIndex:5,ro:"Auditor dovezi · date decisive",en:"Evidence auditor · decisive facts"},
  critical_auditor:{roleIndex:0,clueIndex:4,ro:"Auditor critic · verifică distractorii",en:"Critical auditor · checks distractors"},
  reporter:{roleIndex:5,clueIndex:0,ro:"Raportor · sinteză în 60 de secunde",en:"Reporter · 60-second synthesis"},
};

// Six students always cover all six professional role families. Additional
// participants receive distinct sub-roles without making anyone double up.
const ACTIVITY_REQUIRED_MIDDLE = ["medic_a","analyst_a","epidemiologist_a","prevention_a"];
const ACTIVITY_ADDITIONAL_MIDDLE = ["evidence_auditor","medic_b","analyst_b","epidemiologist_b","prevention_b","analyst_c","prevention_c","critical_auditor"];
const ACTIVITY_DISPLAY_ORDER = ["medic_a","medic_b","analyst_a","analyst_b","analyst_c","epidemiologist_a","epidemiologist_b","prevention_a","prevention_b","prevention_c","evidence_auditor","critical_auditor"];

function activityPlanForSize(target){
  const size=Math.min(14,Math.max(6,Number(target)||14));
  const extraCount=size-6;
  const middle=[...ACTIVITY_REQUIRED_MIDDLE,...ACTIVITY_ADDITIONAL_MIDDLE.slice(0,extraCount)]
    .sort((a,b)=>ACTIVITY_DISPLAY_ORDER.indexOf(a)-ACTIVITY_DISPLAY_ORDER.indexOf(b));
  return [ACTIVITY_SLOT_LIBRARY.coordinator,...middle.map(k=>ACTIVITY_SLOT_LIBRARY[k]),ACTIVITY_SLOT_LIBRARY.reporter];
}

function activityNameKey(value){
  return String(value||"").trim().toLocaleLowerCase("ro-RO").replace(/\s+/g," ");
}

function activityMatricolKey(value){
  return String(value||"").trim().replace(/\s+/g,"").toUpperCase();
}

function activityStudentKey(student){
  const matricol=activityMatricolKey(student?.matricol);
  return matricol?"matricol:"+matricol:"name:"+activityNameKey(student?.name);
}

function activityRowKey(row){
  const marker=String(row?.module_title||"").match(/\|\|MID:([A-Z0-9_-]+)/i);
  return marker?"matricol:"+activityMatricolKey(marker[1]):"name:"+activityNameKey(row?.name);
}

function activityStudentMeta(student){
  return {
    matricol:activityMatricolKey(student?.matricol),
    name:String(student?.name||""),
    year:String(student?.year||student?.an||""),
    yearLabel:String(student?.yearLabel||""),
    seria:String(student?.seria||""),
    officialGroup:String(student?.officialGroup||student?.grupa||""),
    academicGroup:String(student?.academicGroup||""),
  };
}

function activityStoredTitle(title,student){
  const matricol=activityMatricolKey(student?.matricol);
  return matricol?String(title||"")+" ||MID:"+matricol:String(title||"");
}

function activityPayload(row){
  try{return JSON.parse(row?.answers_text||"{}");}catch(e){return {};}
}

function participantSlot(f,seat,target,lang){
  const safeSeat=Math.max(1,Number(seat)||1);
  const slots=activityPlanForSize(target);
  const plan=slots[Math.min(slots.length-1,safeSeat-1)];
  const role=f.roles[plan.roleIndex]||f.roles[0];
  const evidence=f.evidence||[];
  const privateClue=evidence.length?(evidence[plan.clueIndex%evidence.length]?.text||role.clue):role.clue;
  const qs=f.qs||[];
  const q=qs.length?qs[(safeSeat-1)%qs.length]:{q:lang==="en"?"What is your professional conclusion?":"Care este concluzia dumneavoastră profesională?"};
  return {...role,clue:privateClue,focus:lang==="en"?plan.en:plan.ro,question:q.q,questionIndex:qs.length?(safeSeat-1)%qs.length:0};
}

async function activityWriteEvent(kind,f,payload,session,student,moduleTitle){
  const body={
    session_id:session?.token||null,
    name:student?.name||"—",
    grp:String(student?.group||""),
    lab_id:session?.labId||"",
    lab_code:session?.labCode||"",
    module:"activity_"+kind+"_"+f.id,
    module_title:activityStoredTitle(moduleTitle||("Activitate sincronizată · "+f.title),student),
    score:0,total:0,pct:0,time_used:0,
    teacher:session?.teacher||"",semester:session?.semester||"",
    specialization:student?.spec||"",
    answers_text:JSON.stringify({version:3,kind,studentMeta:activityStudentMeta(student),...payload}),
  };
  const res=await sb("results",{method:"POST",prefer:"return=minimal",body:JSON.stringify(body)});
  if(!res.ok) throw new Error((await res.text().catch(()=>""))||("HTTP "+res.status));
  return true;
}

async function loadActivityRoom(session,student,f,target=14){
  const token=encodeURIComponent(session?.token||"");
  const group=encodeURIComponent(String(student?.group||""));
  // Before reveal, fetch metadata only. Teammates' answer text is not even
  // transferred to the other phones while contributions are sealed.
  const res=await sb(`results?session_id=eq.${token}&grp=eq.${group}&select=name,grp,module,module_title,created_at&order=created_at.asc`);
  if(!res.ok) throw new Error("Room sync failed");
  const metaRows=(await res.json()).filter(r=>String(r.module||"").startsWith("activity_")&&String(r.module||"").endsWith("_"+f.id));
  const metaMembers=metaRows.filter(r=>r.module==="activity_member_"+f.id);
  const metaMemberCount=new Set(metaMembers.map(activityRowKey)).size;
  const metaUnlocked=metaRows.some(r=>r.module==="activity_unlock_"+f.id);
  let rows=metaRows;
  if(metaUnlocked||metaMemberCount>=Number(target||14)){
    const full=await sb(`results?session_id=eq.${token}&grp=eq.${group}&select=name,grp,module,module_title,answers_text,created_at&order=created_at.asc`);
    if(!full.ok) throw new Error("Room reveal failed");
    rows=(await full.json()).filter(r=>String(r.module||"").startsWith("activity_")&&String(r.module||"").endsWith("_"+f.id));
  }
  const joins=[],joinNames=new Set();
  rows.filter(r=>r.module==="activity_join_"+f.id).forEach(r=>{const k=activityRowKey(r);if(k&&!joinNames.has(k)){joinNames.add(k);joins.push(r);}});
  const latestBy=(kind)=>{
    const map=new Map();
    rows.filter(r=>r.module===`activity_${kind}_${f.id}`).forEach(r=>map.set(activityRowKey(r),r));
    return [...map.values()];
  };
  const members=latestBy("member");
  const approvals=latestBy("approval");
  const synthesis=rows.filter(r=>r.module==="activity_synthesis_"+f.id).slice(-1)[0]||null;
  const final=rows.filter(r=>r.module==="activity_final_"+f.id).slice(-1)[0]||null;
  const unlocked=rows.some(r=>r.module==="activity_unlock_"+f.id);
  const seatByName={};joins.forEach((r,i)=>{seatByName[activityRowKey(r)]=i+1;});
  return {rows,joins,members,approvals,synthesis,final,unlocked,seatByName};
}

async function loadActivitySessionRooms(session){
  const token=encodeURIComponent(session?.token||"");
  if(!token) return {};
  const res=await sb(`results?session_id=eq.${token}&select=name,grp,module,module_title,created_at`);
  if(!res.ok) return {};
  const rows=(await res.json()).filter(r=>String(r.module||"").startsWith("activity_"));
  const out={};
  rows.forEach(r=>{
    const g=String(r.grp||"");if(!g)return;
    if(!out[g]) out[g]={joins:new Set(),members:new Set(),approvals:new Set(),unlocked:false,final:false};
    if(String(r.module).startsWith("activity_join_")) out[g].joins.add(activityRowKey(r));
    if(String(r.module).startsWith("activity_member_")) out[g].members.add(activityRowKey(r));
    if(String(r.module).startsWith("activity_approval_")) out[g].approvals.add(activityRowKey(r));
    if(String(r.module).startsWith("activity_unlock_")) out[g].unlocked=true;
    if(String(r.module).startsWith("activity_final_")) out[g].final=true;
  });
  Object.values(out).forEach(x=>{x.joinCount=x.joins.size;x.memberCount=x.members.size;x.approvalCount=x.approvals.size;delete x.joins;delete x.members;delete x.approvals;});
  return out;
}

async function unlockTeamRoom(session,group,f,teacherName){
  return activityWriteEvent("unlock",f,{manual:true,openedAt:Date.now()},session,{name:teacherName||"Profesor",group:String(group),spec:""},"Deblocare manuală · "+f.title);
}

function TeamMissionScreen({session,student,onBack}){
  const lang="ro";
  const labId=session?.labId||"lp1a";
  const [f,setF]=React.useState(null);
  const [room,setRoom]=React.useState({joins:[],members:[],approvals:[],seatByName:{},unlocked:false,synthesis:null,final:null});
  const [answer,setAnswer]=React.useState("");
  const [submitted,setSubmitted]=React.useState(null);
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState("");
  const [ready,setReady]=React.useState(editsAreReady());

  React.useEffect(()=>{
    const build=()=>{
      const items=getActiveFiseForLab(labId,lang).slice(0,6).map(x=>normalizeTeamMission(x,lang));
      const groupNumber=Math.min(items.length||1,Math.max(1,parseInt(String(student?.group||"1").match(/\d+/)?.[0]||"1",10)));
      setF(items[groupNumber-1]||items[0]||null);
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
        setSubmitted({answer:p.answer||p.analysis||"",submittedAt:p.submittedAt||p.savedAt||null});
      }
      setError("");
    }catch(e){setError("Sincronizarea nu este disponibilă momentan.");}
  },[f,session?.token,student?.group,student?.matricol]);

  React.useEffect(()=>{if(!f)return;refresh();const t=setInterval(refresh,4000);return()=>clearInterval(t)},[f,refresh]);

  const send=async()=>{
    const value=String(answer||"").trim();
    if(!value){alert("Completați răspunsul înainte de trimitere.");return;}
    if(submitted){alert("Răspunsul a fost deja trimis și nu mai poate fi modificat.");return;}
    if(!confirm("Sunteți sigur(ă) că doriți să trimiteți răspunsul? După trimitere, acesta nu mai poate fi modificat."))return;
    setSaving(true);
    try{
      const latest=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);
      const already=(latest.members||[]).some(r=>activityRowKey(r)===activityStudentKey(student));
      if(already){setRoom(latest);setSubmitted({answer:"Răspuns deja înregistrat."});return;}
      await activityWriteEvent("member",f,{
        version:4,mode:"individual_locked",answer:value,analysis:value,submittedAt:Date.now(),locked:true,
        studentMeta:activityStudentMeta(student)
      },session,student,"Răspuns individual sigilat · "+f.title);
      setSubmitted({answer:value,submittedAt:Date.now()});
      await refresh();
    }catch(e){setError("Răspunsul nu a putut fi salvat. Încercați din nou.");}
    finally{setSaving(false);}
  };

  if(!ready||!f)return <div style={{padding:30,fontFamily:"system-ui"}}>Se încarcă activitatea…</div>;
  const solution=[
    f.diagnosis?.options?.[f.diagnosis?.correct],
    ...(f.evidence||[]).filter(x=>x.relevant).map(x=>x.text),
    ...(f.actions||[]).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.text)
  ].filter(Boolean);
  const task=(f.qs||[]).map((q,i)=><li key={i} style={{marginBottom:8}}>{q.q}</li>);
  return <div style={{minHeight:"100vh",background:"#f4f8fb",fontFamily:"system-ui",color:"#0f2742"}}>
    <div style={{background:"#071a33",color:"white",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <div><div style={{fontSize:12,opacity:.75}}>Activitate de grup · răspuns individual</div><strong>{f.emoji} {f.title}</strong></div>
      <button onClick={onBack} style={{padding:"9px 12px",borderRadius:9,border:"1px solid #ffffff44",background:"transparent",color:"white",cursor:"pointer"}}>Înapoi</button>
    </div>
    <main style={{maxWidth:860,margin:"0 auto",padding:"20px 14px 50px"}}>
      {error&&<div style={{background:"#fff7ed",border:"1px solid #fdba74",padding:12,borderRadius:12,marginBottom:12}}>{error}</div>}
      <section style={{background:"white",borderRadius:18,padding:20,border:"1px solid #dbe7f1",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color}}>Contextul cazului</div>
        <p style={{lineHeight:1.65}}>{f.context||f.briefing}</p>
        {(f.caz||[]).length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:12}}>{f.caz.map((x,i)=><div key={i} style={{background:"#f8fafc",borderRadius:10,padding:11}}><div style={{fontSize:11,color:"#64748b"}}>{x.l}</div><strong>{x.v}</strong></div>)}</div>}
      </section>
      <section style={{background:"white",borderRadius:18,padding:20,border:"1px solid #dbe7f1",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color}}>Sarcina studentului</div>
        <ol style={{lineHeight:1.55,paddingLeft:22}}>{task}</ol>
        {!submitted?<><textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Scrieți aici analiza, calculele, măsurile și concluzia…" style={{width:"100%",minHeight:180,padding:13,border:"1px solid #b8c9d6",borderRadius:12,font:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
        <div style={{background:"#f8fafc",padding:11,borderRadius:10,fontSize:12,color:"#64748b",margin:"10px 0"}}>🔐 După trimitere, răspunsul este înregistrat definitiv și nu mai poate fi modificat.</div>
        <button disabled={saving} onClick={send} style={{width:"100%",padding:14,border:0,borderRadius:12,background:f.color,color:"white",fontWeight:850,cursor:saving?"wait":"pointer"}}>{saving?"Se trimite…":"Trimite răspunsul"}</button></>
        :<div><div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:12,padding:14,color:"#166534",fontWeight:800}}>✓ Răspuns trimis</div>
        <p style={{fontSize:13,color:"#64748b"}}>Răspunsul dumneavoastră a fost înregistrat și nu mai poate fi modificat. Rezolvarea va fi disponibilă după ce cadrul didactic o afișează.</p>
        <div style={{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:f.color,marginTop:18}}>Răspunsul meu</div><div style={{whiteSpace:"pre-wrap",lineHeight:1.6,background:"#f8fafc",padding:14,borderRadius:12,marginTop:7}}>{submitted.answer}</div></div>}
      </section>
      {room.unlocked&&submitted&&<section style={{background:"#f0fdf4",borderRadius:18,padding:20,border:"1px solid #86efac"}}>
        <div style={{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:".08em",color:"#166534"}}>Rezolvarea corectă și explicații</div>
        <ul style={{lineHeight:1.6,paddingLeft:22}}>{solution.map((x,i)=><li key={i} style={{marginBottom:7}}>{x}</li>)}</ul>
        {(f.sourceRefs||[]).length>0&&<div style={{marginTop:14,fontSize:12,color:"#166534"}}><strong>Trasabilitate în material:</strong> {(f.sourceRefs||[]).join(" · ")}</div>}
      </section>}
    </main>
  </div>;
}

async function saveTeamMissionResult(f,state,scored,student,session,members=[],approvals=[]){
  const selectedEvidence=(state.selectedEvidence||[]).map(i=>f.evidence[i]?.text).filter(Boolean);
  const selectedActions=(state.selectedActions||[]).map(i=>f.actions[i]?.text).filter(Boolean);
  const answerText=(f.qs||[]).map((q,i)=>"Q"+(i+1)+": "+q.q+"\nA: "+(state.answers?.[i]||"—")).join("\n\n");
  const memberText=members.map(m=>{const p=m.payload||{},meta=p.studentMeta||{};const matricol=meta.matricol?` [${meta.matricol}]`:"";return `${m.seat}. ${meta.name||m.row?.name||"—"}${matricol} — ${p.focus||p.roleName||"Rol"}\nAnaliză: ${p.analysis||"—"}\nImpact: ${p.impact||"—"}\nPropunere: ${p.proposal||"—"}`;}).join("\n\n");
  const report=[
    "ACTIVITATE: "+f.title,
    "VERDICT: "+f.diagnosis.options[state.diagnosisChoice],
    "DOVEZI: "+selectedEvidence.join(" | "),
    "ACȚIUNI: "+selectedActions.join(" | "),
    "ÎNCREDERE: "+(state.confidence||0)+"%",
    "SURSE: "+(f.sourceRefs||[]).join(" | "),
    "--- CONTRIBUȚII INDIVIDUALE ---",
    memberText,
    "--- SINTEZA GRUPULUI ---",
    answerText,
  ].join("\n");
  const details={
    type:"group_activity_v3",activityId:f.id,activityTitle:f.title,
    verdict:f.diagnosis.options[state.diagnosisChoice]||"—",
    evidence:selectedEvidence,actions:selectedActions,confidence:state.confidence||0,
    sources:f.sourceRefs||[],approvedBy:approvals.map(r=>r.name).filter(Boolean),
    members:members.map(m=>{const p=m.payload||{},meta=p.studentMeta||{};return {seat:m.seat,name:meta.name||m.row?.name||"—",matricol:meta.matricol||"",yearLabel:meta.yearLabel||meta.year||"",seria:meta.seria||"",officialGroup:meta.officialGroup||"",role:p.roleName||"Rol",roleIcon:p.roleIcon||"",focus:p.focus||"",clue:p.clue||"",question:p.question||"",verdict:f.diagnosis.options[p.verdictChoice]||"—",clueClass:p.clueClass||"—",analysis:p.analysis||"—",impact:p.impact||"—",proposal:p.proposal||"—"};}),
    commonAnswers:(f.qs||[]).map((q,i)=>({question:q.q,answer:state.answers?.[i]||"—"})),
    report,generatedAt:Date.now(),
  };
  const result={token:session?.token||null,name:student?.name,group:student?.group,labId:session?.labId,labCode:session?.labCode,module:"group_activity_"+f.id,moduleTitle:"Activitate de grup · "+f.title,score:scored.totalScore,total:scored.maxScore,pct:scored.pct,timeUsed:60-(state.pitchSeconds||0),teacher:session?.teacher||"",semester:session?.semester||"",specialization:student?.spec||"",answersText:JSON.stringify(details)};
  const saved=await addResult(result);
  if(!saved?.ok) throw new Error(saved?.error||"Save failed");
}
