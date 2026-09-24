from pathlib import Path
import re
for fn in ["index.html","6lucrari/index.html"]:
    t=Path(fn).read_text(encoding="utf-8")
    terms=["TeamMissionScreen","participantSlot(","activityPlanForSize(","coordinator","ACTIVITY_SLOT_LIBRARY","team-mission-ui"]
    out=[]
    for term in terms:
        for m in list(re.finditer(re.escape(term),t,re.I))[:12]:
            out.append(f"\n--- {fn} {term} @{m.start()} ---\n"+t[max(0,m.start()-1000):min(len(t),m.end()+3000)])
    Path(".github/activity-snippets.txt").write_text("\n".join(out),encoding="utf-8")
