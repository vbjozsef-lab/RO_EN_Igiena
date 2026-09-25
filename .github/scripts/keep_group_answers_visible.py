from pathlib import Path
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")

old='''      const already=(latest.members||[]).some(r=>activityRowKey(r)===activityStudentKey(student));
      if(already){setRoom(latest);setSubmitted({answers:{},answer:"Răspuns deja înregistrat."});return;}'''
new='''      const existing=(latest.members||[]).find(r=>activityRowKey(r)===activityStudentKey(student));
      if(existing){
        const p=activityPayload(existing);
        setRoom(latest);
        setSubmitted({
          answers:p.answers||{},
          answer:p.answer||p.analysis||"",
          submittedAt:p.submittedAt||p.savedAt||null
        });
        return;
      }'''
if old not in t: raise SystemExit("duplicate-submit anchor not found")
t=t.replace(old,new,1)

old2='''        {(f.qs||[]).map((q,i)=><div key={i} style={{borderTop:i?"1px solid #e2e8f0":"none",paddingTop:i?16:0,marginTop:i?16:0}}>'''
new2='''        {submitted&&<div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:12,padding:"12px 13px",margin:"0 0 16px",color:"#166534"}}>
          <div style={{fontWeight:900,fontSize:14}}>Răspunsurile mele — pentru prezentare</div>
          <div style={{fontSize:12,marginTop:3}}>Răspunsurile rămân vizibile pe acest telefon, dar sunt blocate și nu mai pot fi modificate.</div>
        </div>}

        {(f.qs||[]).map((q,i)=><div key={i} style={{borderTop:i?"1px solid #e2e8f0":"none",paddingTop:i?16:0,marginTop:i?16:0}}>'''
if old2 not in t: raise SystemExit("answers block anchor not found")
t=t.replace(old2,new2,1)

p.write_text(t,encoding="utf-8")
print("post-submit answers remain visible and presentation-ready")
