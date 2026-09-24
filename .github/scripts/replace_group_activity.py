from pathlib import Path

src = Path("6lucrari/team-mission-ui.jsx").read_text(encoding="utf-8")
start = src.index("function TeamMissionScreen")
end = src.index("\nasync function saveTeamMissionResult", start)
new_func = src[start:end].rstrip() + "\n\n"

for fn in ["index.html", "6lucrari/index.html"]:
    p = Path(fn)
    text = p.read_text(encoding="utf-8")
    a = text.index("function TeamMissionScreen")
    b = text.index("\nasync function saveTeamMissionResult", a)
    text = text[:a] + new_func + text[b:]
    p.write_text(text, encoding="utf-8")
    print("patched", fn)
