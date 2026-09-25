from pathlib import Path
p=Path("6lucrari/index.html")
t=p.read_text(encoding="utf-8")

start='''                  {activeSession.labCode?.endsWith("-FISA") && (
                    <div style={{background:"#fff",border:"1px solid #dbe7f1",borderRadius:12,padding:12,width:"100%",marginBottom:12}}>'''
a=t.find(start)
if a<0: raise SystemExit("old live rooms panel start not found")
end_marker='''                  )}

                  {/* print button */}'''
b=t.find(end_marker,a)
if b<0: raise SystemExit("old live rooms panel end not found")

new=r'''                  {activeSession.labCode?.endsWith("-FISA") && (
                    <div style={{background:"#fff",border:"1px solid #dbe7f1",borderRadius:12,padding:12,width:"100%",marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}>
                        <strong style={{fontSize:12,color:"#0f2742"}}>Progres activități · în direct</strong>
                        <span style={{fontSize:10,color:"#64748b"}}>5 cazuri</span>
                      </div>
                      <div style={{fontSize:10,color:"#64748b",lineHeight:1.45,background:"#f8fafc",borderRadius:8,padding:"7px 8px",marginBottom:8}}>
                        Aici vedeți doar progresul răspunsurilor. Studenții își păstrează răspunsurile pe telefon pentru prezentare, fără posibilitatea de modificare.
                      </div>
                      <div style={{display:"grid",gap:7}}>
                        {Array.from({length:5},(_,i)=>i+1).map(caseNo=>{
                          const mission=getActiveFiseForLab(activeSession.labId,lang)[caseNo-1];
                          const totals=Object.entries(roomOverview||{}).reduce((acc,[groupKey,state])=>{
                            const g=parseInt(String(groupKey).match(/\d+/)?.[0]||"0",10);
                            const mapped=g>0?((g-1)%5)+1:0;
                            if(mapped===caseNo){
                              acc.joinCount+=state?.joinCount||0;
                              acc.memberCount+=state?.memberCount||0;
                            }
                            return acc;
                          },{joinCount:0,memberCount:0});
                          return <div key={caseNo} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,alignItems:"center",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 10px"}}>
                            <div style={{minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:800,color:"#0f2742",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                Cazul {caseNo}{mission?.title?" · "+mission.title:""}
                              </div>
                              <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                                conectați {totals.joinCount} · au trimis {totals.memberCount}
                              </div>
                            </div>
                            <span style={{fontSize:10,fontWeight:800,color:totals.memberCount>0?"#166534":"#64748b",background:totals.memberCount>0?"#ecfdf5":"#f1f5f9",borderRadius:999,padding:"4px 7px"}}>
                              {totals.memberCount>0?"Răspunsuri primite":"În așteptare"}
                            </span>
                          </div>;
                        })}
                      </div>
                    </div>
                  )}

'''
t=t[:a]+new+t[b+len('''                  )}

'''):]

p.write_text(t,encoding="utf-8")
print("replaced legacy group rooms panel with five-case progress panel")
