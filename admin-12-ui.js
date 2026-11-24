/* Igienă Campus · 12 LP teacher navigation (RO / EN).
 * UI only; loads before the inline application and does not touch quiz data.
 */
(function(){
  "use strict";
  const h=React.createElement;
  const groups=[
    {id:"activities",items:[["qr","qr"],["preview","eye"],["activities","activity"]]},
    {id:"monitoring",items:[["results","results"],["prezenta","calendar"],["examResults","exam"]]},
    {id:"resources",items:[["laborator","flask"],["prezentari","presentation"],["fisiere","folder"],["nomenclator","settings"]]}
  ];
  const copy={
    ro:{
      sections:{activities:"ACTIVITĂȚI",monitoring:"MONITORIZARE",resources:"RESURSE ȘI SETĂRI"},
      titles:{qr:"Sesiuni și coduri QR",preview:"Quiz Complet",activities:"Activități practice",results:"Rezultatele studenților",prezenta:"Prezență și participare",examResults:"Rezultate examen",laborator:"Laborator animat",prezentari:"Prezentări",fisiere:"Fișiere și materiale",nomenclator:"Nomenclator"},
      tips:{qr:"Configurați activitatea și generați codurile QR pentru studenți.",preview:"Consultați și editați întrebările pentru cele 12 lucrări practice.",activities:"Administrați activitățile și fișele practice ale studenților.",results:"Consultați rezultatele, filtrele și exporturile CSV.",prezenta:"Urmăriți participarea și exportați situația pe grupe.",examResults:"Verificați rezultatele examenelor și detaliile disponibile.",laborator:"Deschideți laboratoarele animate și materialele interactive.",prezentari:"Accesați prezentările disponibile pentru LP1–LP12.",fisiere:"Administrați materialele și fișierele cursului.",nomenclator:"Gestionați specializările, anii și modulele."},
      course:"12 lucrări practice",study:"Medicină · Română",professor:"Profesor",back:"Înapoi la centru",workspace:"Spațiu de lucru",overview:["Lucrări practice","Studenți cu înregistrări","Înregistrări rezultate"],intro:"Organizați activitățile, urmăriți rezultatele și accesați resursele dintr-o singură interfață."
    },
    en:{
      sections:{activities:"ACTIVITIES",monitoring:"MONITORING",resources:"RESOURCES & SETTINGS"},
      titles:{qr:"QR sessions",preview:"Complete Quiz",activities:"Practical activities",results:"Student results",prezenta:"Attendance and participation",examResults:"Exam results",laborator:"Animated laboratory",prezentari:"Presentations",fisiere:"Files and materials",nomenclator:"Course settings"},
      tips:{qr:"Configure the activity and generate QR codes for your students.",preview:"Review and edit questions for the 12 practical works.",activities:"Manage hands-on activities and group assignments.",results:"Review results, apply filters and export CSV files.",prezenta:"Track attendance and export group reports.",examResults:"Review examination results and available test details.",laborator:"Open animated laboratories and interactive materials.",prezentari:"Browse available LP1–LP12 presentations.",fisiere:"Manage teaching files and course materials.",nomenclator:"Manage specializations, study years and modules."},
      course:"12 practical works",study:"Medicine · English",professor:"Teacher",back:"Back to hub",workspace:"Teacher workspace",overview:["Practical works","Students with records","Result records"],intro:"Manage activities, review students' results and access course resources in one workspace."
    }
  };
  const paths={
    grid:"M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z",
    qr:"M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M21 14v3 M17 21h4 M14 20v1",
    eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
    activity:"M3 12h4l3-7 4 14 3-7h4",
    results:"M4 20V9 M9 20V4 M14 20v-7 M19 20V8 M2 20h20",
    calendar:"M3 5h18v16H3z M8 2v5 M16 2v5 M3 10h18 M8 15l2 2 4-4",
    exam:"M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5",
    flask:"M9 3h6 M10 3v8l-5.5 9a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 11V3 M7.5 16h9",
    presentation:"M3 4h18v12H3z M12 16v5 M7 21h10 M8 9l3 3 5-5",
    folder:"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10H3z",
    settings:"M4 7h16 M4 12h16 M4 17h16 M9 5v4 M15 10v4 M9 15v4",
    arrow:"M12 19l-7-7 7-7 M5 12h15",
    menu:"M4 6h16 M4 12h16 M4 18h16",
    users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8"
  };
  function Icon(props){
    return h("svg",{width:props.size||18,height:props.size||18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true},
      h("path",{d:paths[props.name]||paths.grid}));
  }
  function Sidebar(props){
    const c=copy[props.lang==="en"?"en":"ro"];
    return h(React.Fragment,null,
      h("aside",{className:"studio12-sidebar"+(props.open?" is-open":""),"aria-label":props.lang==="en"?"Teacher navigation":"Navigare profesor"},
        h("div",{className:"studio12-brand"},
          h("span",{className:"studio12-mark"},h(Icon,{name:"grid",size:23})),
          h("div",null,h("div",{className:"studio12-brand-name"},"Igienă Campus"),h("div",{className:"studio12-brand-sub"},"UMFST · TEACHER HUB"))
        ),
        h("div",{className:"studio12-course"},
          h("span",{className:"studio12-course-icon"},h(Icon,{name:"flask",size:20})),
          h("div",null,
            h("div",{className:"studio12-course-title"},c.course),
            h("div",{className:"studio12-course-sub"},c.study),
            h("div",{className:"studio12-language"},"RO / EN · "+String(props.lang).toUpperCase())
          )
        ),
        h("nav",{className:"studio12-nav"},
          groups.map(group=>h("div",{className:"studio12-nav-group",key:group.id},
            h("div",{className:"studio12-nav-heading"},c.sections[group.id]),
            group.items.map(item=>h("button",{
              type:"button",key:item[0],className:"studio12-nav-link"+(props.tab===item[0]?" is-active":""),
              "aria-current":props.tab===item[0]?"page":undefined,
              onClick:function(){props.onTab(item[0]);props.onClose();}
            },h(Icon,{name:item[1],size:18}),h("span",null,c.titles[item[0]])))
          ))
        ),
        h("div",{className:"studio12-sidebar-bottom"},
          h("button",{type:"button",className:"studio12-back",onClick:props.onBack},
            h(Icon,{name:"arrow",size:17}),c.back),
          h("div",{className:"studio12-sidebar-note"},"Igienă Campus · UMFST",h("br"),"12 LP · RO / EN")
        )
      ),
      props.open?h("button",{type:"button",className:"studio12-dim","aria-label":props.lang==="en"?"Close navigation":"Închide navigarea",onClick:props.onClose}):null
    );
  }
  window.TWELVE_ADMIN_COPY=copy;
  window.TwelveStudioIcon=Icon;
  window.TwelveStudioSidebar=Sidebar;
})();