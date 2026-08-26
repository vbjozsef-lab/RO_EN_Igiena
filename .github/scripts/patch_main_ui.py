from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')

# 1) Keep the existing animated laboratory material, but expose it under its own tab.
if '{id:"laborator",' not in text:
    old_nav = '              {id:"examResults", icon:"📝", label:"Rezultate examen"},\n              {id:"prezentari",  icon:"📽️", label:T("tab_prezentari")},\n              {id:"prezenta",    icon:"✅", label:T("tab_prezenta")||"Prezență"},'
    new_nav = '              {id:"examResults", icon:"📝", label:"Rezultate examen"},\n              {id:"laborator",   icon:"🧪", label:"Laborator animat"},\n              {id:"prezentari",  icon:"📽️", label:"Prezentări"},\n              {id:"prezenta",    icon:"✅", label:T("tab_prezenta")||"Prezență"},'
    if old_nav not in text:
        raise SystemExit('Navigation anchor not found; refusing to patch.')
    text = text.replace(old_nav, new_nav, 1)

# 2) The current "Prezentări" panel is actually LAB_DEMOS. Preserve it intact as Laborator animat.
start_marker = '        {tab==="prezentari" && ('
exam_marker = '        {tab==="examResults" && ('

if 'Prezentări LP1A–LP6B' not in text:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit('Existing presentation panel not found; refusing to patch.')
    end = text.find(exam_marker, start)
    if end < 0:
        raise SystemExit('Exam panel anchor not found; refusing to patch.')

    old_block = text[start:end]
    lab_block = old_block.replace('{tab==="prezentari" && (', '{tab==="laborator" && (', 1)
    lab_block = lab_block.replace('📽️ Prezentări — {selLab.code}', '🧪 Laborator animat — {selLab.code}', 1)
    lab_block = lab_block.replace(
        'Materiale pentru {selLab.title}. Deschide în browser, F11 = ecran complet.',
        'Laboratoare animate și fișe practice pentru {selLab.title}. Acest modul rămâne separat de prezentările didactice.'
    )
    lab_block = lab_block.replace('Nicio prezentare disponibilă pentru {selLab.code}', 'Niciun laborator animat disponibil pentru {selLab.code}', 1)

    presentation_block = r'''        {tab==="prezentari" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#1e1b4b,#4338ca 58%,#6366f1)",color:"#fff",borderRadius:20,padding:"22px 24px",marginBottom:16,boxShadow:"0 12px 34px rgba(67,56,202,.20)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",right:-70,top:-90,background:"rgba(255,255,255,.08)"}}/>
              <div style={{position:"relative"}}>
                <div style={{fontSize:11,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",color:"#c7d2fe",marginBottom:7}}>Bibliotecă didactică</div>
                <h3 style={{fontSize:23,margin:"0 0 7px",fontWeight:900,letterSpacing:"-.02em"}}>📽️ Prezentări LP1A–LP6B</h3>
                <p style={{fontSize:13,color:"#e0e7ff",margin:0,lineHeight:1.65,maxWidth:780}}>Prezentările pentru proiector sunt în format 16:9 și se adaptează automat la ecran, fără derulare verticală în interiorul diapozitivului. Versiunea „PDF / Studiu” este pregătită pentru salvare PDF, câte un diapozitiv pe pagină.</p>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",gap:12}}>
              {LABS.map((lab,i)=>(
                <div key={lab.id} style={{background:"#fff",border:"1px solid #e0e7ff",borderRadius:16,padding:16,boxShadow:"0 4px 18px rgba(99,102,241,.06)",display:"flex",flexDirection:"column",minHeight:205,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",width:90,height:90,borderRadius:"50%",right:-30,top:-34,background:i%2===0?"#eef2ff":"#f5f3ff"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:10,position:"relative"}}>
                    <div style={{width:43,height:43,borderRadius:12,display:"grid",placeItems:"center",fontSize:22,background:lab.dim||"#eef2ff",border:`1px solid ${lab.color||"#6366f1"}22`}}>{lab.icon}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:900,color:"#6366f1",letterSpacing:".1em",textTransform:"uppercase"}}>{lab.code}</div>
                      <div style={{fontSize:14,fontWeight:800,color:"#1e1b4b",lineHeight:1.3,marginTop:2}}>{lab.title}</div>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:"#64748b",lineHeight:1.55,marginBottom:14,flex:1}}>Prezentare didactică pentru curs, separată de modulul „Laborator animat”.</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <a href={`prezentari/index.html?lp=${lab.id}&teacher=${encodeURIComponent(teacherName)}`} target="_blank" rel="noreferrer"
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,textDecoration:"none",padding:"10px 8px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:800,boxShadow:"0 4px 12px rgba(99,102,241,.20)"}}>▶ Deschide</a>
                    <a href={`prezentari/studiu.html?lp=${lab.id}`} target="_blank" rel="noreferrer"
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,textDecoration:"none",padding:"10px 8px",borderRadius:10,background:"#f8faff",color:"#4338ca",border:"1px solid #c7d2fe",fontSize:11,fontWeight:800}}>⬇ PDF / Studiu</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

'''
    text = text[:start] + lab_block + presentation_block + text[end:]

p.write_text(text, encoding='utf-8')
print('Main UI patched successfully.')
