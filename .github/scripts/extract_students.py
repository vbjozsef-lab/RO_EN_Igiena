from pathlib import Path
import re
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")
terms=["2507","2612","AGACHE","ZSOMBORI","matricol","studenti","studenți"]
out=[]
for term in terms:
    for m in list(re.finditer(term,t,re.I))[:30]:
        a=max(0,m.start()-700); b=min(len(t),m.end()+1400)
        out.append("\n--- "+term+" @ "+str(m.start())+" ---\n"+t[a:b])
Path(".github/student-snippets.txt").write_text("\n".join(out),encoding="utf-8")
print("snippets",len(out))
