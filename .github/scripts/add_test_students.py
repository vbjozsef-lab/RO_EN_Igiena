from pathlib import Path

students = [
    {"name":"Teszt1","matricol":"1111","an":"I","seria":"1","grupa":"1"},
    {"name":"teszt2","matricol":"1112","an":"I","seria":"1","grupa":"1"},
    {"name":"Teszt 3","matricol":"1113","an":"I","seria":"1","grupa":"1"},
]
needle = '{"name":"ZSOMBORI C. RÉKA","matricol":"2612","an":"I","seria":"2","grupa":"12"}'
addition = ''.join(',' + str(s).replace("'", '"') for s in students)

for fn in ["index.html","6lucrari/index.html"]:
    p=Path(fn)
    t=p.read_text(encoding="utf-8")
    if '"matricol":"1111"' in t:
        print(fn, "already patched")
        continue
    target=needle + ']'
    if target not in t:
        raise SystemExit(f"Registry anchor not found in {fn}")
    t=t.replace(target, needle + addition + ']', 1)
    p.write_text(t,encoding="utf-8")
    print(fn, "patched")
