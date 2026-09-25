from pathlib import Path
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")

t=t.replace("if (configured.length !== 6) {","if (configured.length !== 5) {",1)
t=t.replace(
'alert(`Pentru a genera QR-ul, configurați exact 6 activități la ${selLab.code}. Acum sunt active ${configured.length}. Mergeți la fila „Activități” pentru completare sau restaurare.`);',
'alert(`Pentru a genera QR-ul, configurați exact 5 activități la ${selLab.code}. Acum sunt active ${configured.length}. Mergeți la fila „Activități” pentru completare sau restaurare.`);',
1
)

t=t.replace(
"Pentru generarea QR-ului trebuie să rămână exact 6 activități active la fiecare LP.",
"Pentru generarea QR-ului trebuie să rămână exact 5 activități active la fiecare LP."
)

t=t.replace('count===6?"#047857":"#b45309"','count===5?"#047857":"#b45309"')
t=t.replace('count===6?"#ecfdf5":"#fffbeb"','count===5?"#ecfdf5":"#fffbeb"')
t=t.replace('>{count}/6</span>','>{count}/5</span>')

p.write_text(t,encoding="utf-8")
print("QR validation updated to 5 activities")
