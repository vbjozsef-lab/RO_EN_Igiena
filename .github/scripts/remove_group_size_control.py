from pathlib import Path
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")

# Remove obsolete expected group size state.
t=t.replace('''  const [teamSize, setTeamSize]     = useState(14);
''','',1)

# Replace obsolete role/group explanation with current five-case description.
old='''              {activityType==="fisa" && <div style={{background:"#FFFBEB",border:"1px solid #fde68a",borderRadius:9,padding:"8px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}>
                📱 Fiecare student scanează același cod pe telefonul propriu, alege grupa 1–6 și primește automat un rol individual.<br/>
                Cele 6 roluri de bază sunt păstrate pentru orice grupă de 6–14 studenți; participanții suplimentari primesc sarcini distincte. Răspunsurile rămân sigilate până când toți termină.
              </div>}

              {activityType==="fisa" && <div style={{marginBottom:16}}>
                <label style={S.label}>👥 Număr așteptat de studenți / grupă</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {[6,8,10,12,14].map(n=><button key={n} onClick={()=>setTeamSize(n)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1.5px solid ${teamSize===n?"#a5b4fc":"#e0e7ff"}`,background:teamSize===n?"#EEF2FF":"#F8FAFF",color:teamSize===n?"#6366f1":"#64748b",fontWeight:teamSize===n?700:500,cursor:"pointer"}}>{n}</button>)}
                  <input type="number" min="6" max="14" value={teamSize} onChange={e=>setTeamSize(Math.min(14,Math.max(6,Number(e.target.value)||14)))} style={{...S.input,width:72,textAlign:"center",padding:"8px 4px"}} title="6–14"/>
                </div>
                <p style={{fontSize:11,color:"#64748b",margin:"6px 0 0"}}>Selectați numărul prezent real (6–14). Sinteza se deschide automat după {teamSize} contribuții individuale.</p>
              </div>}
'''
new='''              {activityType==="fisa" && <div style={{background:"#FFFBEB",border:"1px solid #fde68a",borderRadius:9,padding:"8px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}>
                📱 Fiecare student scanează același cod pe telefonul propriu și primește unul dintre cele 5 cazuri ale lucrării practice.<br/>
                Răspunsurile sunt individuale, rămân vizibile studentului după trimitere și nu mai pot fi modificate.
              </div>}
'''
if old not in t:
    raise SystemExit("obsolete fisa configuration block not found")
t=t.replace(old,new,1)

# Session no longer stores or sends teamSize.
t=t.replace(''', lang, teamSize: activityType==='fisa' ? teamSize : undefined };''', ''', lang };''',1)
t=t.replace('''const url = `${getBaseURL()}?token=${token}&lang=${lang}${activityType==='fisa' ? `&teamSize=${teamSize}` : ''}`;''',
            '''const url = `${getBaseURL()}?token=${token}&lang=${lang}`;''',1)

# Student room sync no longer auto-reveals teammates based on a target count.
t=t.replace('''const next=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);''',
            '''const next=await loadActivityRoom(session,student,f,999999);''')
t=t.replace('''const latest=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);''',
            '''const latest=await loadActivityRoom(session,student,f,999999);''')

# Remove teamSize parsing from token join.
oldjoin='''onValid={s=>{const sl=resolveSessionLang(s, lang); const rawSize=new URLSearchParams(window.location.search).get("teamSize"); const qrTeamSize=Math.min(14,Math.max(6,parseInt(rawSize||"14",10)||14)); setLang(sl); try{localStorage.setItem("igiena_lang",sl);}catch(e){} setSession({...s, lang:sl, teamSize:qrTeamSize}); setScreen(s?.labCode?.endsWith("-EXAM")?"exam_code":"studentLogin");}}'''
newjoin='''onValid={s=>{const sl=resolveSessionLang(s, lang); setLang(sl); try{localStorage.setItem("igiena_lang",sl);}catch(e){} setSession({...s, lang:sl}); setScreen(s?.labCode?.endsWith("-EXAM")?"exam_code":"studentLogin");}}'''
if oldjoin in t:
    t=t.replace(oldjoin,newjoin,1)

p.write_text(t,encoding="utf-8")
print("removed obsolete expected-student/group-size control")
