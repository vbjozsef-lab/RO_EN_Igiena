from pathlib import Path
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")

anchor='''async function loadActivityRoom(session,student,f,target=14){'''
helper=r'''async function loadOwnActivitySubmission(session,student,f){
  const token=encodeURIComponent(session?.token||"");
  const group=encodeURIComponent(String(student?.group||""));
  const moduleName=encodeURIComponent("activity_member_"+f.id);
  const matricol=activityMatricolKey(student?.matricol);
  if(!token||!matricol) return null;
  const marker=encodeURIComponent("*MID:"+matricol+"*");
  const res=await sb(`results?session_id=eq.${token}&grp=eq.${group}&module=eq.${moduleName}&module_title=like.${marker}&select=name,grp,module,module_title,answers_text,created_at&order=created_at.desc&limit=1`);
  if(!res.ok) return null;
  const rows=await res.json();
  return rows?.[0]||null;
}

'''
if helper.strip() not in t:
    if anchor not in t: raise SystemExit("loadActivityRoom anchor not found")
    t=t.replace(anchor,helper+anchor,1)

old='''      const next=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);
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
      setError("");'''
new='''      const next=await loadActivityRoom(session,student,f,Number(session?.teamSize)||14);
      setRoom(next);
      const ownFull=await loadOwnActivitySubmission(session,student,f);
      const mine=ownFull||(next.members||[]).find(r=>activityRowKey(r)===activityStudentKey(student));
      if(mine){
        const p=activityPayload(mine);
        const storedAnswers=p.answers||{};
        if(Object.keys(storedAnswers).length || p.answer || p.analysis){
          setSubmitted({
            answers:storedAnswers,
            answer:p.answer||p.analysis||"",
            submittedAt:p.submittedAt||p.savedAt||null
          });
        }
      }
      setError("");'''
if old not in t: raise SystemExit("refresh block anchor not found")
t=t.replace(old,new,1)

p.write_text(t,encoding="utf-8")
print("own submitted answers are now fetched with answers_text after submit/reload")
