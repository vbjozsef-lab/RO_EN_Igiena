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
  const lang=React.useContext(LangContext);
  const L=(ro,en)=>lang==="en"?en:ro;
  const labId=session?.labId||"lp1a";
  const teamSize=Math.min(14,Math.max(6,Number(session?.teamSize)||14));
  const [f,setF]=React.useState(null);
  const [loaded,setLoaded]=React.useState(editsAreReady());
  const [loadError,setLoadError]=React.useState("");
  const [room,setRoom]=React.useState({joins:[],members:[],approvals:[],seatByName:{},unlocked:false,synthesis:null,final:null});
  const [seat,setSeat]=React.useState(null);
  const [phase,setPhase]=React.useState("joining");
  const [roleConfirmed,setRoleConfirmed]=React.useState(false);
  const [syncError,setSyncError]=React.useState("");
  const [saving,setSaving]=React.useState(false);
  const joinStarted=React.useRef(false);

  const [privateVerdict,setPrivateVerdict]=React.useState(null);
  const [clueClass,setClueClass]=React.useState("");
  const [analysis,setAnalysis]=React.useState("");
  const [impact,setImpact]=React.useState("");
  const [proposal,setProposal]=React.useState("");

  const [diagnosisChoice,setDiagnosisChoice]=React.useState(null);
  const [selectedEvidence,setSelectedEvidence]=React.useState([]);
  const [selectedActions,setSelectedActions]=React.useState([]);
  const [answers,setAnswers]=React.useState({});
  const [confidence,setConfidence]=React.useState(70);
  const [pitchSeconds,setPitchSeconds]=React.useState(60);
  const [pitchRunning,setPitchRunning]=React.useState(false);
  const [pitchStarted,setPitchStarted]=React.useState(false);

  React.useEffect(()=>{
    const build=()=>{
      const base=getActiveFiseForLab(labId,lang).slice(0,6).map(x=>normalizeTeamMission(x,lang));
      const groupNumber=Math.min(6,Math.max(1,parseInt(String(student?.group||"1").match(/\d+/)?.[0]||"1",10)));
      const item=base[groupNumber-1];
      setF(item||null);
      setLoadError(item?"":L("Această grupă nu are încă o activitate configurată. Profesorul trebuie să completeze setul de 6 activități.","This group does not yet have a configured activity. The teacher must complete the set of six activities."));
      setLoaded(true);
    };
    if(editsAreReady()) build(); else fetchAllEditsRemote().then(build).catch(build);
  },[labId,lang,student?.group]);

  const refreshRoom=React.useCallback(async()=>{
    if(!f)return;
    try{
      const next=await loadActivityRoom(session,student,f,teamSize);
      setRoom(next);setSyncError("");
      const mySeat=next.seatByName[activityStudentKey(student)]||null;
      if(mySeat)setSeat(mySeat);
      const own=next.members.find(r=>activityRowKey(r)===activityStudentKey(student));
      const revealed=next.unlocked||next.members.length>=teamSize;
      if(next.final)setPhase("done");
      else if(revealed)setPhase("synthesis");
      else if(own)setPhase("waiting");
      else if(mySeat)setPhase("private");
    }catch(e){setSyncError(L("Conexiunea cu sala de grup a fost întreruptă. Reîncercăm automat…","Group room connection was interrupted. Retrying automatically…"));}
  },[f,session?.token,student?.group,student?.name,student?.matricol,teamSize,lang]);

  React.useEffect(()=>{
    if(!f||joinStarted.current)return;
    joinStarted.current=true;
    (async()=>{
      try{
        const current=await loadActivityRoom(session,student,f,teamSize);
        if(!current.seatByName[activityStudentKey(student)]){
          await activityWriteEvent("join",f,{joinedAt:Date.now()},session,student,"Participant conectat · "+f.title);
        }
        await refreshRoom();
      }catch(e){joinStarted.current=false;setSyncError(L("Nu s-a putut intra în sala de grup. Verificați internetul și reîncercați.","Could not enter the group room. Check the internet connection and retry."));}
    })();
  },[f]);

  React.useEffect(()=>{
    if(!f)return;
    const id=setInterval(refreshRoom,3000);
    return()=>clearInterval(id);
  },[f,refreshRoom]);

  React.useEffect(()=>{
    if(!pitchRunning)return;
    const id=setInterval(()=>setPitchSeconds(s=>{if(s<=1){setPitchRunning(false);return 0;}return s-1;}),1000);
    return()=>clearInterval(id);
  },[pitchRunning]);

  if(!loaded) return <div style={{minHeight:"100vh",background:"#071a33",display:"grid",placeItems:"center",color:"#a9c8e8",padding:20,textAlign:"center"}}>{L("Se pregătește activitatea sincronizată…","Preparing the synchronized activity…")}</div>;
  if(!f) return <div style={{minHeight:"100vh",background:"#071a33",display:"grid",placeItems:"center",color:"#fff",padding:20,textAlign:"center"}}><div><div style={{fontSize:42,marginBottom:10}}>⚠️</div><strong>{loadError}</strong><div><button onClick={onBack} style={{marginTop:18,padding:"10px 16px",border:0,borderRadius:10,background:"#fff",color:"#071a33",fontWeight:800,cursor:"pointer"}}>{L("Înapoi","Back")}</button></div></div></div>;

  const slot=participantSlot(f,seat||1,teamSize,lang);
  const memberCards=room.members.map(r=>({row:r,payload:activityPayload(r),seat:room.seatByName[activityRowKey(r)]||activityPayload(r).seat||0})).sort((a,b)=>a.seat-b.seat);
  const synthesis=activityPayload(room.synthesis);
  const finalData=activityPayload(room.final);
  const currentMaxSeat=Math.max(1,...room.joins.map(r=>room.seatByName[activityRowKey(r)]||0));
  const isCoordinator=seat===1;
  const isReporter=seat===currentMaxSeat;
  const budgetUsed=selectedActions.reduce((s,i)=>s+(f.actions[i]?.cost||0),0);

  const header=(sub)=><div style={{...FS.hdr,background:"linear-gradient(135deg,#071a33,#123c62)"}} className="mission-no-print"><span style={{fontSize:24}}>{f.emoji}</span><div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.title}</div><div style={{fontSize:11,color:"#a9c8e8"}}>{sub}</div></div><span className="mission-chip" style={{background:"rgba(255,255,255,.14)",color:"white"}}>{L("Grupa","Group")} {student?.group}</span></div>;
  const syncBanner=syncError?<div style={{background:"#fff7ed",border:"1px solid #fdba74",color:"#9a3412",padding:"10px 12px",borderRadius:12,fontSize:12,marginBottom:12}}>⚠️ {syncError} <button onClick={refreshRoom} style={{marginLeft:8,border:0,background:"#ea580c",color:"white",borderRadius:7,padding:"4px 8px",cursor:"pointer"}}>{L("Reîncearcă","Retry")}</button></div>:null;

  if(phase==="joining") return <div style={{...FS.page,background:"#f4f8fb"}}>{header(L("Conectare la sala privată","Connecting to the private room"))}<div style={{maxWidth:560,margin:"0 auto",padding:"40px 16px",textAlign:"center"}}>{syncBanner}<div className="spin" style={{fontSize:46}}>⏳</div><h2 style={{color:"#0f2742"}}>{L("Se atribuie rolul individual…","Assigning your individual role…")}</h2><p style={{color:"#64748b",fontSize:13}}>{L("Fiecare student lucrează pe telefonul propriu. Răspunsurile celorlalți rămân ascunse.","Each student works on their own phone. Other answers remain hidden.")}</p></div></div>;

  if(phase==="private"&&!roleConfirmed) return <div style={{...FS.page,background:"radial-gradient(circle at 10% 0%,"+f.color+"20,transparent 34%),#f4f8fb",paddingBottom:40}}>{header(L("Rol individual atribuit automat","Individual role assigned automatically"))}<div style={{maxWidth:620,margin:"0 auto",padding:"28px 14px"}}>{syncBanner}<div style={{background:"#fff",borderRadius:22,padding:24,border:"1px solid #dbe7f1",boxShadow:"0 14px 40px rgba(15,39,66,.10)",textAlign:"center"}}><div style={{fontSize:11,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",color:f.color,marginBottom:10}}>{L("Rolul dumneavoastră în această echipă","Your role in this team")}</div><div style={{width:86,height:86,borderRadius:"50%",background:f.color+"18",display:"grid",placeItems:"center",fontSize:42,margin:"0 auto 12px",border:"3px solid "+f.color+"55"}}>{slot.icon}</div><h2 style={{margin:"0 0 5px",color:"#0f2742",fontSize:24}}>{slot.name}</h2><div style={{display:"inline-block",background:"#eef2ff",color:"#4338ca",borderRadius:99,padding:"6px 11px",fontSize:11,fontWeight:850,marginBottom:14}}>{slot.focus}</div><p style={{fontSize:14,color:"#475569",lineHeight:1.65,margin:"0 auto 16px",maxWidth:470}}>{slot.task}</p><div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:12,fontSize:12,color:"#64748b",lineHeight:1.55,marginBottom:18}}>ℹ️ {L("Rolul este distribuit automat în ordinea conectării, astfel încât echipa să acopere toate perspectivele profesionale. Nu trebuie să alegeți un rol.","The role is assigned automatically in connection order so the team covers every professional perspective. You do not need to choose a role.")}</div><button onClick={()=>setRoleConfirmed(true)} style={{width:"100%",padding:14,border:0,borderRadius:12,background:f.color,color:"#fff",fontWeight:900,cursor:"pointer",fontSize:14}}>{L("Am înțeles · încep contribuția mea","Understood · start my contribution")}</button></div></div></div>;

  if(phase==="private"){
    const missing=[];
    if(privateVerdict===null)missing.push(L("verdictul provizoriu","provisional verdict"));
    if(!clueClass)missing.push(L("clasificarea indiciului","clue classification"));
    if(!analysis.trim())missing.push(L("analiza profesională","professional analysis"));
    if(!impact.trim())missing.push(L("impactul asupra sănătății","health impact"));
    if(!proposal.trim())missing.push(L("propunerea de intervenție","intervention proposal"));
    const submit=async()=>{
      if(missing.length){alert(L("Mai trebuie completat: ","Still needed: ")+missing.join(", ")+".");return;}
      setSaving(true);
      try{
        await activityWriteEvent("member",f,{seat,roleId:slot.id,roleName:slot.name,roleIcon:slot.icon,focus:slot.focus,clue:slot.clue,question:slot.question,verdictChoice:privateVerdict,clueClass,analysis:analysis.trim(),impact:impact.trim(),proposal:proposal.trim(),submittedAt:Date.now()},session,student,slot.focus);
        await refreshRoom();setPhase("waiting");
      }catch(e){setSyncError(L("Răspunsul nu a fost trimis. Verificați conexiunea.","The answer was not submitted. Check the connection."));}
      setSaving(false);
    };
    return <div style={{...FS.page,background:"radial-gradient(circle at 10% 0%,"+f.color+"18,transparent 32%),#f4f8fb",paddingBottom:40}}>{header(L("Etapa privată · telefon personal","Private stage · personal phone"))}<div style={{maxWidth:760,margin:"0 auto",padding:"18px 14px"}}>{syncBanner}<div style={{background:"#071a33",color:"white",borderRadius:18,padding:18,marginBottom:14}}><div className="mission-kicker" style={{color:"#67e8f9"}}>{L("Locul","Seat")} {seat}/{teamSize} · {slot.focus}</div><h2 style={{margin:"8px 0",fontSize:21}}>{slot.icon} {slot.name}</h2><p style={{margin:0,color:"#c5d9ee",fontSize:13,lineHeight:1.6}}>{slot.task}</p></div>
      <section style={{background:"#fff",borderRadius:18,padding:18,border:"1px solid #dbe7f1",marginBottom:14}}><div className="mission-kicker" style={{color:f.color,marginBottom:8}}>{L("Dosarul comun","Shared case")}</div>{(f.caz||[]).map((item,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"minmax(110px,1fr) 1.4fr",gap:10,padding:"8px 10px",background:i%2?"#fff":"#f8fafc",borderRadius:8}}><span style={{fontSize:12,color:"#64748b"}}>{item.l}</span><strong style={{fontSize:12,color:"#0f2742"}}>{item.v}</strong></div>)}</section>
      <section style={{background:"#ecfeff",borderRadius:18,padding:18,border:"1px solid #a5f3fc",marginBottom:14}}><div className="mission-kicker" style={{color:"#0e7490",marginBottom:8}}>🔒 {L("Indiciul tău privat","Your private clue")}</div><p style={{fontSize:15,fontWeight:800,color:"#155e75",lineHeight:1.55,margin:0}}>{slot.clue}</p><p style={{fontSize:11,color:"#0e7490",margin:"10px 0 0"}}>{L("Nu vedeți încă indiciile și răspunsurile colegilor.","You cannot see colleagues' clues or answers yet.")}</p></section>
      <section style={{background:"#fff",borderRadius:18,padding:18,border:"1px solid #dbe7f1"}}><div className="mission-kicker" style={{color:f.color,marginBottom:12}}>{L("Contribuția ta individuală","Your individual contribution")}</div><label style={FS.label}>{f.diagnosis.prompt}</label><div style={{display:"grid",gap:7,margin:"7px 0 14px"}}>{f.diagnosis.options.map((o,i)=><button key={i} onClick={()=>setPrivateVerdict(i)} style={{padding:11,borderRadius:10,border:"2px solid "+(privateVerdict===i?f.color:"#dbe7f1"),background:privateVerdict===i?f.color+"12":"#fff",textAlign:"left",cursor:"pointer",fontSize:12,fontWeight:700}}>{privateVerdict===i?"● ":"○ "}{o}</button>)}</div>
        <label style={FS.label}>{L("Cum clasificați indiciul primit?","How do you classify your clue?")}</label><div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"7px 0 14px"}}>{[["decisive",L("Decisiv","Decisive")],["support",L("De sprijin","Supporting")],["distractor",L("Distractor","Distractor")]].map(([v,label])=><button key={v} onClick={()=>setClueClass(v)} style={{padding:"8px 11px",borderRadius:9,border:"1px solid "+(clueClass===v?f.color:"#cbd5e1"),background:clueClass===v?f.color:"#fff",color:clueClass===v?"white":"#475569",cursor:"pointer",fontWeight:700}}>{label}</button>)}</div>
        <label style={FS.label}>{slot.question}</label><textarea value={analysis} onChange={e=>setAnalysis(e.target.value)} placeholder={L("Analiza dumneavoastră…","Your analysis…")} style={{...FS.ta,minHeight:84,margin:"6px 0 12px"}}/>
        <label style={FS.label}>{L("Ce efect sau risc pentru sănătate identificați?","What health effect or risk do you identify?")}</label><textarea value={impact} onChange={e=>setImpact(e.target.value)} placeholder={L("Efectul asupra sănătății…","Health impact…")} style={{...FS.ta,minHeight:72,margin:"6px 0 12px"}}/>
        <label style={FS.label}>{L("Ce măsură concretă propuneți?","What concrete measure do you propose?")}</label><textarea value={proposal} onChange={e=>setProposal(e.target.value)} placeholder={L("Propunerea dumneavoastră…","Your proposal…")} style={{...FS.ta,minHeight:72,margin:"6px 0 14px"}}/>
        <div style={{background:"#f8fafc",padding:10,borderRadius:10,fontSize:11,color:"#64748b",marginBottom:12}}>🔐 {L("După trimitere, răspunsul nu este afișat colegilor până la deschiderea sintezei.","After submission, your answer is not shown to colleagues until synthesis opens.")}</div><button disabled={saving} onClick={submit} style={{width:"100%",padding:14,border:0,borderRadius:12,background:f.color,color:"white",fontWeight:850,cursor:saving?"wait":"pointer"}}>{saving?L("Se trimite…","Submitting…"):L("Sigilează contribuția mea","Seal my contribution")}</button></section></div></div>;
  }

  if(phase==="waiting") return <div style={{...FS.page,background:"#f4f8fb"}}>{header(L("Contribuție sigilată","Contribution sealed"))}<div style={{maxWidth:620,margin:"0 auto",padding:"28px 16px"}}>{syncBanner}<div style={{background:"#fff",borderRadius:20,padding:24,border:"1px solid #dbe7f1",textAlign:"center"}}><div style={{fontSize:46}}>🔒</div><h2 style={{color:"#0f2742",margin:"10px 0 6px"}}>{L("Răspunsul dumneavoastră a fost salvat","Your answer has been saved")}</h2><p style={{color:"#64748b",fontSize:13,lineHeight:1.6}}>{L("Contribuțiile colegilor rămân ascunse până când toți membrii grupului au trimis răspunsul sau profesorul deschide sinteza.","Colleagues' contributions remain hidden until every group member submits or the teacher opens synthesis.")}</p><div style={{fontSize:34,fontWeight:900,color:f.color,margin:"18px 0 4px"}}>{room.members.length}/{teamSize}</div><div style={{fontSize:12,color:"#64748b"}}>{L("contribuții finalizate","completed contributions")}</div><div style={{height:9,background:"#e2e8f0",borderRadius:9,overflow:"hidden",margin:"12px 0 18px"}}><div style={{width:Math.min(100,room.members.length/teamSize*100)+"%",height:"100%",background:f.color,transition:"width .3s"}}/></div><button onClick={refreshRoom} style={{padding:"10px 14px",border:"1px solid #cbd5e1",borderRadius:10,background:"white",color:"#475569",fontWeight:750,cursor:"pointer"}}>↻ {L("Actualizează","Refresh")}</button></div></div></div>;

  if(phase==="synthesis"){
    const stateFromSynthesis=synthesis.state||{};
    const hasSynthesis=!!room.synthesis;
    const approvals=room.approvals||[];
    const myApproved=approvals.some(r=>activityRowKey(r)===activityStudentKey(student));
    const approvalTarget=Math.max(1,memberCards.length);
    const consensusReady=approvals.length>=approvalTarget;
    const toggleEvidence=i=>setSelectedEvidence(prev=>prev.includes(i)?prev.filter(x=>x!==i):(prev.length>=4?prev:[...prev,i]));
    const toggleAction=i=>setSelectedActions(prev=>{if(prev.includes(i))return prev.filter(x=>x!==i);const cost=budgetUsed+(f.actions[i]?.cost||0);if(cost>f.budget){alert(L("Bugetul activității ar fi depășit.","The activity budget would be exceeded."));return prev;}return [...prev,i];});
    const submitSynthesis=async()=>{
      const written=Object.values(answers).filter(x=>String(x||"").trim()).length;
      if(diagnosisChoice===null||selectedEvidence.length<2||!selectedActions.length||written<2){alert(L("Completați verdictul, minimum 2 dovezi, o acțiune și 2 răspunsuri motivate.","Complete the verdict, at least 2 evidence cards, one action and 2 reasoned answers."));return;}
      setSaving(true);
      try{const state={diagnosisChoice,selectedEvidence,selectedActions,answers,confidence,roleSeen:Object.fromEntries(room.joins.map((r,i)=>[String(i+1),true]))};await activityWriteEvent("synthesis",f,{state,coordinator:student?.name,createdAt:Date.now()},session,student,"Sinteza grupului · "+f.title);await refreshRoom();}catch(e){setSyncError(L("Sinteza nu a fost salvată.","Synthesis was not saved."));}setSaving(false);
    };
    const approveSynthesis=async()=>{
      if(myApproved||saving)return;
      setSaving(true);
      try{await activityWriteEvent("approval",f,{approved:true,approvedAt:Date.now()},session,student,"Aprobare sinteză · "+f.title);await refreshRoom();}
      catch(e){setSyncError(L("Aprobarea nu a fost salvată.","Approval was not saved."));}
      setSaving(false);
    };
    const finalize=async()=>{
      if(!consensusReady){alert(L("Raportul final poate fi trimis după ce toți membrii care au contribuit aprobă sinteza.","The final report can be submitted after every contributing member approves the synthesis."));return;}
      const st={...stateFromSynthesis,pitchStarted:true,pitchSeconds,teamRating:{clarity:3,evidence:3,feasibility:3}};
      const scored=scoreTeamMission(f,st);
      setSaving(true);setPitchRunning(false);
      try{await saveTeamMissionResult(f,st,scored,{...student,name:"Grupa "+student.group},session,memberCards,approvals);await activityWriteEvent("final",f,{scored,state:st,reporter:student?.name,approvals:approvals.map(r=>r.name),finishedAt:Date.now()},session,student,"Raport final · "+f.title);await refreshRoom();setPhase("done");}catch(e){setSyncError(L("Raportul final nu a fost trimis.","Final report was not submitted."));}setSaving(false);
    };
    return <div style={{...FS.page,background:"#eef3f7",paddingBottom:50}}>{header(L("Sinteza deschisă · răspunsurile sunt vizibile","Synthesis open · answers are visible"))}<div style={{maxWidth:980,margin:"0 auto",padding:"18px 14px"}}>{syncBanner}<div style={{background:"#ecfdf5",border:"1px solid #86efac",color:"#166534",borderRadius:14,padding:14,marginBottom:14,fontSize:13}}>🔓 <strong>{L("Toți membrii pot vedea acum contribuțiile individuale.","All members can now see the individual contributions.")}</strong> {L("Discutați diferențele și construiți o singură decizie de grup.","Discuss differences and build one group decision.")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10,marginBottom:18}}>{memberCards.map((m,i)=><div key={i} style={{background:"#fff",border:"1px solid #dbe7f1",borderTop:"4px solid "+f.color,borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><div><div className="mission-kicker" style={{color:f.color}}>{L("Locul","Seat")} {m.seat} · {m.payload.roleIcon} {m.payload.focus||m.payload.roleName}</div><div style={{fontWeight:850,color:"#0f2742",marginTop:5}}>{m.row.name}</div></div><span className="mission-chip" style={{background:"#f1f5f9",color:"#475569"}}>{m.payload.clueClass||"—"}</span></div><div style={{fontSize:12,color:"#334155",lineHeight:1.55,marginTop:10}}><strong>{L("Analiză:","Analysis:")}</strong> {m.payload.analysis||"—"}</div><div style={{fontSize:12,color:"#334155",lineHeight:1.55,marginTop:7}}><strong>{L("Impact:","Impact:")}</strong> {m.payload.impact||"—"}</div><div style={{fontSize:12,color:"#047857",lineHeight:1.55,marginTop:7}}><strong>{L("Propunere:","Proposal:")}</strong> {m.payload.proposal||"—"}</div></div>)}</div>
      {!hasSynthesis&&isCoordinator&&<div style={{background:"#fff",borderRadius:18,padding:18,border:"2px solid "+f.color}}><div className="mission-kicker" style={{color:f.color,marginBottom:6}}>{L("Coordonator · decizia comună","Coordinator · team decision")}</div><p style={{fontSize:12,color:"#64748b",margin:"0 0 14px"}}>{L("Completați această secțiune după discuția cu toți membrii.","Complete this section after discussing with all members.")}</p><h3 style={{fontSize:14,color:"#0f2742"}}>{f.diagnosis.prompt}</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7,marginBottom:14}}>{f.diagnosis.options.map((o,i)=><button key={i} onClick={()=>setDiagnosisChoice(i)} style={{padding:11,borderRadius:10,border:"2px solid "+(diagnosisChoice===i?f.color:"#dbe7f1"),background:diagnosisChoice===i?f.color+"12":"white",textAlign:"left",cursor:"pointer",fontSize:12,fontWeight:700}}>{diagnosisChoice===i?"● ":"○ "}{o}</button>)}</div><div className="mission-kicker" style={{color:f.color,marginBottom:7}}>{L("Dovezi comune · maximum 4","Team evidence · maximum 4")}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:7,marginBottom:14}}>{f.evidence.map((e,i)=>{const on=selectedEvidence.includes(i);return <button key={i} onClick={()=>toggleEvidence(i)} style={{padding:10,borderRadius:10,border:"2px solid "+(on?f.color:"#dbe7f1"),background:on?f.color+"10":"white",textAlign:"left",cursor:"pointer",fontSize:12}}>{on?"✓ ":"+ "}{e.text}</button>})}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><div className="mission-kicker" style={{color:f.color}}>{L("Acțiuni comune","Team actions")}</div><span className="mission-chip" style={{background:"#ecfdf5",color:"#047857"}}>⚡ {budgetUsed}/{f.budget}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:7,marginBottom:14}}>{f.actions.map((a,i)=>{const on=selectedActions.includes(i);return <button key={i} onClick={()=>toggleAction(i)} style={{padding:10,borderRadius:10,border:"2px solid "+(on?"#059669":"#dbe7f1"),background:on?"#ecfdf5":"white",textAlign:"left",cursor:"pointer",fontSize:12}}><strong>{a.text}</strong> · −{a.cost}</button>})}</div>{(f.qs||[]).map((q,i)=><div key={i} style={{marginBottom:10}}><label style={FS.label}>{i+1}. {q.q}</label><textarea value={answers[i]||""} onChange={e=>setAnswers(x=>({...x,[i]:e.target.value}))} style={{...FS.ta,minHeight:64,marginTop:4}}/></div>)}<label style={FS.label}>{L("Încrederea grupului","Group confidence")}: {confidence}%</label><input type="range" min="20" max="100" step="5" value={confidence} onChange={e=>setConfidence(Number(e.target.value))} style={{width:"100%",margin:"8px 0 14px"}}/><button disabled={saving} onClick={submitSynthesis} style={{width:"100%",padding:14,border:0,borderRadius:12,background:f.color,color:"white",fontWeight:850,cursor:"pointer"}}>{saving?L("Se salvează…","Saving…"):L("Închide sinteza coordonatorului","Lock coordinator synthesis")}</button></div>}
      {!hasSynthesis&&!isCoordinator&&<div style={{background:"#fff",borderRadius:16,padding:20,border:"1px solid #dbe7f1",textAlign:"center"}}><div style={{fontSize:36}}>🧭</div><h3 style={{color:"#0f2742"}}>{L("Coordonatorul pregătește decizia comună","The coordinator is preparing the team decision")}</h3><p style={{color:"#64748b",fontSize:13}}>{L("Discutați cu grupul. Ecranul se actualizează automat.","Discuss with the group. This screen updates automatically.")}</p></div>}
      {hasSynthesis&&<div style={{background:"#fff",borderRadius:18,padding:18,border:"1px solid #dbe7f1"}}>
        <div className="mission-kicker" style={{color:f.color,marginBottom:10}}>{L("Decizia comună este pregătită","Team decision is ready")}</div>
        <h3 style={{margin:"0 0 8px",color:"#0f2742"}}>{f.diagnosis.options[stateFromSynthesis.diagnosisChoice]}</h3>
        <p style={{fontSize:12,color:"#475569"}}><strong>{L("Dovezi:","Evidence:")}</strong> {(stateFromSynthesis.selectedEvidence||[]).map(i=>f.evidence[i]?.text).join(" · ")}</p>
        <p style={{fontSize:12,color:"#475569"}}><strong>{L("Acțiuni:","Actions:")}</strong> {(stateFromSynthesis.selectedActions||[]).map(i=>f.actions[i]?.text).join(" · ")}</p>
        <div style={{marginTop:16,padding:14,borderRadius:13,background:consensusReady?"#ecfdf5":"#fffbeb",border:"1px solid "+(consensusReady?"#86efac":"#fde68a")}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><div style={{fontSize:12,fontWeight:900,color:consensusReady?"#166534":"#92400e"}}>{consensusReady?L("✓ Sinteză aprobată de întreaga echipă","✓ Synthesis approved by the whole team"):L("Aprobarea comună a sintezei","Team approval of the synthesis")}</div><div style={{fontSize:11,color:consensusReady?"#15803d":"#a16207",marginTop:3}}>{approvals.length}/{approvalTarget} {L("membri au aprobat","members approved")}</div></div>{!myApproved?<button disabled={saving} onClick={approveSynthesis} style={{padding:"9px 13px",border:0,borderRadius:9,background:f.color,color:"#fff",fontWeight:850,cursor:saving?"wait":"pointer"}}>{saving?L("Se salvează…","Saving…"):L("Aprob sinteza echipei","I approve the team synthesis")}</button>:<span style={{padding:"7px 10px",borderRadius:99,background:"#dcfce7",color:"#166534",fontSize:11,fontWeight:850}}>✓ {L("Ați aprobat","You approved")}</span>}</div>
        </div>
        {isReporter?<div style={{marginTop:18,borderTop:"1px solid #eef2f6",paddingTop:18,textAlign:"center"}}><div style={{width:140,height:140,borderRadius:"50%",background:"#071a33",border:"9px solid "+(pitchSeconds<=10?"#ef4444":f.color),display:"grid",placeItems:"center",margin:"0 auto 12px",color:"white",fontSize:38,fontWeight:900}}>{pitchSeconds}</div><div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:14}}><button onClick={()=>{setPitchStarted(true);setPitchRunning(x=>!x)}} style={{padding:"9px 15px",border:0,borderRadius:9,background:f.color,color:"white",fontWeight:800,cursor:"pointer"}}>{pitchRunning?L("Pauză","Pause"):pitchSeconds<60?L("Continuă","Resume"):L("Pornește pitch-ul","Start pitch")}</button><button onClick={()=>{setPitchSeconds(60);setPitchRunning(false)}} style={{padding:"9px 15px",border:"1px solid #cbd5e1",borderRadius:9,background:"white",cursor:"pointer"}}>↺ 60</button></div><button disabled={saving||!consensusReady} onClick={finalize} style={{width:"100%",padding:14,border:0,borderRadius:12,background:consensusReady?"linear-gradient(135deg,#059669,#047857)":"#cbd5e1",color:"white",fontWeight:850,cursor:consensusReady?"pointer":"not-allowed"}}>{saving?L("Se trimite…","Submitting…"):consensusReady?L("Trimite raportul final al grupului","Submit the group's final report"):L("Așteaptă aprobarea tuturor membrilor","Waiting for every member's approval")}</button></div>:<div style={{background:"#eff6ff",color:"#1e40af",padding:12,borderRadius:10,fontSize:12,marginTop:14}}>🎤 {L("După aprobarea tuturor, raportorul prezintă și trimite raportul final. Ecranul se actualizează automat.","After everyone approves, the reporter presents and submits the final report. This screen updates automatically.")}</div>}
      </div>}</div></div>;
  }

  if(phase==="done"){
    const scored=finalData.scored||{totalScore:0,maxScore:0,pct:0,breakdown:{}};
    const st=finalData.state||synthesis.state||{};
    const sc=scored.pct>=80?"#059669":scored.pct>=60?"#d97706":"#dc2626";
    return <div style={{...FS.page,background:"#eef3f7",paddingBottom:40}}>{header(L("Raport final sincronizat","Synchronized final report"))}<div style={{maxWidth:820,margin:"20px auto",padding:"0 14px"}}><div style={{background:"#fff",borderRadius:20,padding:22,border:"1px solid #dbe7f1",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><div style={{width:96,height:96,borderRadius:"50%",border:"8px solid "+sc,display:"grid",placeItems:"center"}}><div style={{textAlign:"center",fontWeight:900,color:sc,fontSize:25}}>{scored.totalScore}<div style={{fontSize:10,color:"#64748b"}}>/{scored.maxScore}</div></div></div><div><span className="mission-chip" style={{background:sc+"18",color:sc}}>{scored.pct}%</span><h2 style={{margin:"9px 0 4px",color:"#0f2742"}}>{f.emoji} {f.title}</h2><p style={{margin:0,fontSize:12,color:"#64748b"}}>{L("Grupa","Group")} {student?.group} · {memberCards.length} {L("contribuții individuale","individual contributions")}</p></div></div></div><div style={{background:"#fff",borderRadius:18,padding:18,border:"1px solid #dbe7f1",marginBottom:12}}><div className="mission-kicker" style={{color:f.color,marginBottom:8}}>{L("Verdictul grupului","Group verdict")}</div><strong style={{color:"#0f2742"}}>{f.diagnosis.options[st.diagnosisChoice]}</strong></div><div style={{background:"#ecfeff",borderRadius:18,padding:18,border:"1px solid #a5f3fc",marginBottom:14}}><div className="mission-kicker" style={{color:"#0e7490",marginBottom:8}}>📚 {L("Trasabilitate în material","Source traceability")}</div>{(f.sourceRefs||[]).map((s,i)=><div key={i} style={{fontSize:12,color:"#155e75",marginBottom:4}}>• {s}</div>)}</div><div className="mission-no-print" style={{display:"flex",gap:9,flexWrap:"wrap"}}><button onClick={()=>window.print()} style={{flex:1,padding:13,border:"1px solid #94a3b8",borderRadius:12,background:"white",fontWeight:800,cursor:"pointer"}}>🖨️ {L("Tipărește / salvează PDF","Print / save PDF")}</button><button onClick={onBack} style={{flex:1,padding:13,border:0,borderRadius:12,background:"#071a33",color:"white",fontWeight:800,cursor:"pointer"}}>🏠 {L("Pagina principală","Home")}</button></div></div></div>;
  }
  return null;
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
