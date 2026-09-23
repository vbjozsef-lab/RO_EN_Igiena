(() => {
  "use strict";

  const CATALOG = [
    ["lp1a", "LP1A", "Proprietățile fizice ale aerului"], ["lp1b", "LP1B", "Poluarea aerului"],
    ["lp2a", "LP2A", "Fumat și microorganisme"], ["lp2b", "LP2B", "Iluminat și sonometrie"],
    ["lp3a", "LP3A", "Igiena apei"], ["lp3b", "LP3B", "Microbiologie și dezinfecție"],
    ["lp4a", "LP4A", "Starea de nutriție"], ["lp4b", "LP4B", "Produse animale"],
    ["lp5a", "LP5A", "Produse vegetale"], ["lp5b", "LP5B", "Bacteriologie și parazitologie"],
    ["lp6a", "LP6A", "Radiații"], ["lp6b", "LP6B", "Igienă școlară"],
  ];
  const params = new URLSearchParams(location.search);
  const requestedLp = params.get("lp")?.toLowerCase() || "lp6b";
  const safeLp = CATALOG.some(([id]) => id === requestedLp) ? requestedLp : "lp6b";
  const teacherName = params.get("teacher") || "Profesor";
  const app = document.getElementById("app");
  const sectionCovers = new Set([1, 3, 7, 10, 17]);
  const state = {
    current: 0, mode: "material", sidebar: true, overview: false, reveal: false,
    revealedCount: Number.POSITIVE_INFINITY, quizIndex: 0, selectedOption: null,
    timerSeconds: 0, timerId: null,
    live: { panel: false, session: null, events: [], error: "", busy: false, pollId: null },
  };

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const nl = (value) => esc(value).replaceAll("\n", "<br>");
  const blockText = (block) => nl(block?.text || "");
  const findText = (slide, needle) => slide.contentBlocks.find((block) => block.text.includes(needle))?.text || "";
  const isMetric = (text) => /^\s*(?:[×x]\s*)?\d+(?:[.,]\d+)?\s*(?:%|‰|\/100k|ani|ore\/zi|h)?\s*$/i.test(String(text || ""));

  function loadContent() {
    const script = document.createElement("script");
    script.src = `content/${safeLp}.js`;
    script.onload = () => {
      if (!window.PRESENTATION_CONTENT) return showError("Pachetul de conținut nu a putut fi citit.");
      const meta = window.PRESENTATION_CONTENT.meta;
      document.documentElement.style.setProperty("--teal", meta.accent || "#14b8a6");
      document.documentElement.style.setProperty("--amber", meta.accent2 || "#f59e0b");
      document.title = `${meta.code} · ${meta.title}`;
      restoreLiveSession(); render();
    };
    script.onerror = () => showError(safeLp === "lp6b" ? "Pachetul LP6B lipsește." : "Acest LP urmează să fie transformat după aprobarea prototipului LP6B.");
    document.head.appendChild(script);
  }
  function showError(message) { app.className = "error-screen"; app.innerHTML = `<h1>Prezentarea nu este disponibilă</h1><p>${esc(message)}</p><p><a href="?lp=lp6b">Deschide LP6B</a></p>`; }
  const activeSlide = () => window.PRESENTATION_CONTENT.slides[state.current];
  function stopTimer() { if (state.timerId) clearInterval(state.timerId); state.timerId = null; }
  function setSlide(index) {
    state.current = Math.max(0, Math.min(window.PRESENTATION_CONTENT.slides.length - 1, index));
    state.quizIndex = 0; state.selectedOption = null; state.timerSeconds = 0; stopTimer();
    state.revealedCount = state.reveal ? 0 : Number.POSITIVE_INFINITY; render();
  }
  function setMode(mode) { state.mode = mode; state.selectedOption = null; state.quizIndex = 0; state.timerSeconds = 0; stopTimer(); render(); }
  function formatTime(total) { const safe = Math.max(0, total); return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`; }
  function startTimer(minutes) {
    stopTimer(); state.timerSeconds = minutes * 60; render();
    state.timerId = setInterval(() => {
      state.timerSeconds -= 1; if (state.timerSeconds <= 0) { state.timerSeconds = 0; stopTimer(); }
      const display = document.querySelector("[data-timer-display]"); if (display) display.textContent = formatTime(state.timerSeconds);
    }, 1000);
  }

  function isUpperBreadcrumb(block, slide) {
    const height = window.PRESENTATION_CONTENT.meta.slideSize?.height || 6858000;
    const text = block.text.trim(); const letters = text.match(/[A-Za-zĂÂÎȘȚăâîșț]/g) || [];
    if (!letters.length || block.text === slide.title) return false;
    return block.y < height * 0.15 && letters.filter((char) => char === char.toUpperCase()).length / letters.length > 0.84 && text.length > 16;
  }
  function teachingBlocks(slide) { return slide.contentBlocks.filter((block) => !isUpperBreadcrumb(block, slide)).sort((a, b) => a.y - b.y || a.x - b.x || a.order - b.order); }
  function fullTextDrawer(slide) { return `<details class="full-text-drawer"><summary>📚 Textul integral al diapozitivului</summary><div>${teachingBlocks(slide).map((block) => `<p>${blockText(block)}</p>`).join("")}</div></details>`; }

  function liveQuestionState(question) {
    const events = state.live.events;
    const opens = events.filter((event) => event.payload?.kind === "open" && (!question || event.payload.questionId === question.id));
    const open = opens.at(-1) || null; const questionId = question?.id || open?.payload?.questionId;
    const unique = new Map();
    events.filter((event) => event.payload?.kind === "answer" && event.payload.questionId === questionId && (!open || event.timestamp >= open.timestamp))
      .forEach((event) => unique.set(event.payload.matricol || event.name, event));
    const revealed = events.some((event) => event.payload?.kind === "reveal" && event.payload.questionId === questionId && (!open || event.timestamp >= open.timestamp));
    return { open, answers: [...unique.values()], revealed };
  }
  function liveTeachingBar(slide) {
    const question = slide.quickChecks?.[state.quizIndex] || slide.quickChecks?.[0]; if (!question) return "";
    const live = liveQuestionState(question); const active = !!live.open && !live.revealed;
    return `<div class="teacher-question-bar ${active ? "is-live" : ""}"><div class="teacher-question-copy"><span>${active ? "● ÎN DIRECT" : "📱 ÎNTREBARE PENTRU TELEFOANE"}</span><b>${esc(question.question)}</b></div>${active ? `<div class="answer-count"><strong>${live.answers.length}</strong><span>răspunsuri</span></div><button class="action-button reveal-answer" data-action="live-reveal">Arată soluția</button>` : `<button class="action-button send-question" data-action="send-live">${state.live.session ? "Trimite pe telefoane" : "Conectează telefoanele"}</button>`}</div>`;
  }

  function coverView(slide) {
    const blocks = teachingBlocks(slide);
    const subtitle = blocks.find((block) => block.text.length > 22 && !block.text.includes("UMFST"))?.text || window.PRESENTATION_CONTENT.meta.subtitle;
    const institution = blocks.find((block) => block.text.includes("UMFST"))?.text || "";
    const colorClass = slide.number === 10 ? "risk" : slide.number === 17 ? "prevention" : "physiology";
    return `<div class="section-cover ${colorClass}"><div class="cover-orbit"><span></span><span></span><span></span></div><div class="slide-kicker">MATERIE DE EXAMEN · ${esc(slide.section || window.PRESENTATION_CONTENT.meta.code)}</div><div class="section-number">${String(slide.number).padStart(2, "0")}</div><h1 class="slide-title">${nl(slide.title)}</h1><p class="section-subtitle">${nl(subtitle)}</p>${institution ? `<p class="institution-line">${nl(institution)}</p>` : ""}${fullTextDrawer(slide)}</div>`;
  }
  function agendaView(slide) {
    const blocks = teachingBlocks(slide); const items = [];
    for (let index = 0; index < blocks.length; index += 2) if (blocks[index]) items.push(`<article class="agenda-item tone-${(index / 2) % 6}"><span>${String(index / 2 + 1).padStart(2, "0")}</span><div><h3>${blockText(blocks[index])}</h3>${blocks[index + 1] ? `<p>${blockText(blocks[index + 1])}</p>` : ""}</div></article>`);
    return `<div class="slide-kicker">TRASEUL PRACTICII · 6 CAPITOLE</div><h1 class="slide-title">${nl(slide.title)}</h1><div class="agenda-grid">${items.join("")}</div>${fullTextDrawer(slide)}`;
  }
  function dailyCurveView(slide) {
    const note = findText(slide, "23% mai multă oboseală");
    const recommendations = ["Ore dificile", "Pauza de prânz", "Nu ore grele", "Start recomandat"].map((needle, index) => `<li class="rec-${index}">${nl(findText(slide, needle))}</li>`).join("");
    return `<div class="slide-kicker">FIZIOLOGIE · CURBĂ ZILNICĂ</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="daily-layout"><div class="curve-card"><div class="curve-label peak">9–11h <b>MAXIM</b></div><div class="curve-label low">13–14h <b>MINIM</b></div><svg class="curve-chart" viewBox="0 0 760 300" role="img" aria-label="Curba zilnică a randamentului"><defs><linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14b8a6" stop-opacity=".38"/><stop offset="1" stop-color="#14b8a6" stop-opacity="0"/></linearGradient></defs><g class="grid-lines"><path d="M40 55H730M40 120H730M40 185H730M40 250H730"/><text x="4" y="60">100%</text><text x="12" y="125">75%</text><text x="12" y="190">50%</text><text x="12" y="255">25%</text></g><path class="curve-area" d="M40 225 C95 185 125 78 190 70 S295 96 345 178 S435 226 485 175 S600 154 730 210 L730 270 L40 270Z"/><path class="curve-line" d="M40 225 C95 185 125 78 190 70 S295 96 345 178 S435 226 485 175 S600 154 730 210"/><g class="curve-dots"><circle cx="190" cy="70" r="8"/><circle class="danger" cx="390" cy="215" r="8"/><circle cx="510" cy="166" r="7"/></g><g class="hours"><text x="38" y="292">8h</text><text x="112" y="292">9h</text><text x="180" y="292">10h</text><text x="248" y="292">11h</text><text x="318" y="292">12h</text><text x="382" y="292">13h</text><text x="450" y="292">14h</text><text x="520" y="292">15h</text><text x="590" y="292">16h</text><text x="660" y="292">17h</text><text x="715" y="292">19h</text></g></svg></div><aside class="recommendation-card"><h3>Decizii pentru orar</h3><ul>${recommendations}</ul></aside></div><div class="evidence-ribbon"><span>📊 DOVADĂ</span><p>${nl(note)}</p></div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function weeklyBarsView(slide) {
    const days = [["Luni", "55%", "red", findText(slide, "revenire")], ["Marți", "92%", "teal", findText(slide, "Creștere")], ["Miercuri", "98%", "green", "MAXIM săptămânal"], ["Joi", "72%", "amber", findText(slide, "Diminuare")], ["Vineri", "40%", "red", findText(slide, "oboseală acumulată")]];
    const tips = teachingBlocks(slide).filter((block) => /Max\. 2|Materii de bază|Activități recreative/.test(block.text));
    return `<div class="slide-kicker">FIZIOLOGIE · CURBĂ SĂPTĂMÂNALĂ</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="weekly-chart">${days.map(([day, value, tone, caption]) => `<div class="day-column"><div class="bar-value">${value}</div><div class="bar-track"><div class="bar ${tone}" style="height:${value}"></div></div><h3>${day}</h3><p>${nl(caption)}</p></div>`).join("")}</div><div class="weekly-decisions">${tips.map((tip, index) => `<div class="decision tone-${index}"><span>0${index + 1}</span><p>${blockText(tip)}</p></div>`).join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function pairedCardsView(slide, variant = "season") {
    const blocks = teachingBlocks(slide); const cards = [];
    for (let i = 0; i < blocks.length; i += 2) cards.push(`<article class="paired-card ${variant} tone-${cards.length % 5}"><div class="pair-number">0${cards.length + 1}</div><h3>${blockText(blocks[i])}</h3>${blocks[i + 1] ? `<p>${blockText(blocks[i + 1])}</p>` : ""}</article>`);
    return `<div class="slide-kicker">MATERIE DE EXAMEN · SINTEZĂ VIZUALĂ</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="paired-grid">${cards.join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function principlesView(slide) {
    const blocks = teachingBlocks(slide); const columns = [blocks.filter((block) => block.x < 4_000_000), blocks.filter((block) => block.x >= 4_000_000)]; const cards = [];
    columns.forEach((column) => { column.sort((a, b) => a.y - b.y).forEach((block, index) => { if (index % 2 === 0) cards.push(`<article class="principle-card tone-${cards.length}"><div class="principle-icon">${["↗", "⏱", "↻", "◫", "★", "☾"][cards.length]}</div><h3>${blockText(block)}</h3>${column[index + 1] ? `<p>${blockText(column[index + 1])}</p>` : ""}</article>`); }); });
    return `<div class="slide-kicker">ORAR ȘCOLAR · 6 REGULI DE PROIECTARE</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="principles-grid">${cards.join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function hoursTableView(slide) {
    const blocks = teachingBlocks(slide); const starts = blocks.filter((block) => /^Clasa|^Clasele/.test(block.text));
    const rows = starts.map((start, index) => { const nextY = starts[index + 1]?.y ?? Number.POSITIVE_INFINITY; const row = blocks.filter((block) => block.y >= start.y - 35_000 && block.y < nextY - 35_000); const hours = row.find((block) => /ore\/zi/.test(block.text)); const age = row.find((block) => /ani/.test(block.text)); const detail = row.find((block) => block !== start && block !== hours && block !== age && block.text.length > 30); return `<article class="hours-row tone-${index}"><div class="class-cell"><b>${blockText(start)}</b><span>${blockText(age)}</span></div><div class="hours-cell">${blockText(hours)}</div><p>${blockText(detail)}</p></article>`; });
    return `<div class="slide-kicker">REGLEMENTĂRI · MEN ORDIN 3590/2020</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="hours-table">${rows.join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function metricClusters(blocks) {
    const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x); const metrics = sorted.filter((block) => isMetric(block.text));
    return metrics.map((metric, index) => { const nextY = metrics[index + 1]?.y ?? Number.POSITIVE_INFINITY; return { metric, related: sorted.filter((block) => block !== metric && block.y >= metric.y - 40_000 && block.y < nextY - 40_000) }; });
  }
  function metricsView(slide) {
    const blocks = teachingBlocks(slide); const dual = slide.number === 14;
    const partitions = dual ? [blocks.filter((block) => block.x < 4_300_000), blocks.filter((block) => block.x >= 4_300_000)] : [blocks];
    const headings = dual ? [findText(slide, "ALCOOL"), findText(slide, "DROGURI")] : [];
    const allClusters = partitions.flatMap((partition) => metricClusters(partition));
    const columns = partitions.map((partition, col) => `<div class="metric-column ${dual ? `dual tone-${col}` : ""}">${dual ? `<h3 class="metric-column-title">${nl(headings[col])}</h3>` : ""}${metricClusters(partition).map((cluster, index) => { const title = cluster.related.find((block) => block.text.length < 95) || cluster.related[0]; const notes = cluster.related.filter((block) => block !== title && !/ALCOOL|DROGURI/.test(block.text)); return `<article class="metric-row risk-${(index + col) % 5}"><div class="metric-number">${blockText(cluster.metric)}</div><div><h3>${blockText(title)}</h3>${notes.map((note) => `<p>${blockText(note)}</p>`).join("")}</div></article>`; }).join("")}</div>`).join("");
    const loose = blocks.filter((block) => !isMetric(block.text) && !allClusters.some((cluster) => cluster.related.includes(block)) && !/ALCOOL|DROGURI/.test(block.text));
    return `<div class="slide-kicker danger">DATE ROMÂNIA & UE · INDICATORI DE RISC</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="metrics-layout ${dual ? "two-columns" : ""}">${columns}</div>${loose.length ? `<div class="warning-ribbon">${loose.map((block) => `<p>${blockText(block)}</p>`).join("")}</div>` : ""}${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function preventionView(slide) {
    const blocks = teachingBlocks(slide); const steps = [];
    for (let index = 0; index < blocks.length; index += 2) steps.push(`<article class="prevention-step"><div class="step-marker">${index / 2 + 1}</div><div><h3>${blockText(blocks[index])}</h3>${blocks[index + 1] ? `<p>${blockText(blocks[index + 1])}</p>` : ""}</div></article>`);
    return `<div class="slide-kicker prevention">PREVENIRE · DE LA EDUCAȚIE LA EVALUARE</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="prevention-flow">${steps.join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function casesView(slide) {
    const blocks = teachingBlocks(slide); const starts = blocks.filter((block) => /^Caz\s+\d/.test(block.text));
    const cases = starts.map((start, index) => { const nextY = starts[index + 1]?.y ?? Number.POSITIVE_INFINITY; const related = blocks.filter((block) => block !== start && block.y >= start.y && block.y < nextY); return `<article class="case-card tone-${index}"><div class="case-index">CAZ 0${index + 1}</div><h3>${blockText(start).replace(/^Caz\s+\d:\s*/, "")}</h3>${related.map((block) => `<p>${blockText(block)}</p>`).join("")}</article>`; });
    return `<div class="slide-kicker prevention">DOVEZI · INTERVENȚII DOCUMENTATE</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="case-grid">${cases.join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`;
  }
  function summaryView(slide) {
    const blocks = teachingBlocks(slide); const halves = [blocks.filter((block) => block.x < 4_500_000), blocks.filter((block) => block.x >= 4_500_000)]; const cards = [];
    halves.forEach((half) => { const sorted = half.filter((block) => !block.text.includes("UMFST")).sort((a, b) => a.y - b.y); for (let index = 0; index < sorted.length; index += 2) cards.push(`<article class="summary-card tone-${cards.length}"><span>0${cards.length + 1}</span><h3>${blockText(sorted[index])}</h3>${sorted[index + 1] ? `<p>${blockText(sorted[index + 1])}</p>` : ""}</article>`); });
    return `<div class="slide-kicker">RECAPITULARE · PUNCTE CHEIE</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="summary-grid">${cards.join("")}</div>${fullTextDrawer(slide)}`;
  }
  function genericView(slide) { const blocks = teachingBlocks(slide); return `<div class="slide-kicker">MATERIE DE EXAMEN · DIAPOZITIV ${slide.number}</div><h1 class="slide-title compact">${nl(slide.title)}</h1><div class="generic-grid">${blocks.map((block, index) => `<article class="generic-card tone-${index % 5}"><p>${blockText(block)}</p></article>`).join("")}</div>${liveTeachingBar(slide)}${fullTextDrawer(slide)}`; }
  function materialView(slide) {
    let content;
    if (sectionCovers.has(slide.number)) content = coverView(slide); else if (slide.number === 2) content = agendaView(slide); else if (slide.number === 4) content = dailyCurveView(slide); else if (slide.number === 5) content = weeklyBarsView(slide); else if (slide.number === 6) content = pairedCardsView(slide); else if (slide.number === 8) content = principlesView(slide); else if (slide.number === 9) content = hoursTableView(slide); else if ([11, 12, 13, 14, 15, 16].includes(slide.number)) content = metricsView(slide); else if (slide.number === 18) content = preventionView(slide); else if (slide.number === 19) content = casesView(slide); else if (slide.number === 20) content = summaryView(slide); else content = genericView(slide);
    return `<section class="slide-view material-slide slide-${slide.number}">${content}</section>`;
  }

  function interactiveView(slide) {
    const questions = slide.quickChecks || []; const question = questions[state.quizIndex % Math.max(questions.length, 1)];
    if (question) { const answered = state.selectedOption !== null; const live = liveQuestionState(question); return `<section class="slide-view"><div class="interactive-view"><div class="quiz-panel"><div class="slide-kicker">VERIFICARE RAPIDĂ · DIAPOZITIV ${slide.number}</div>${question.scenario ? `<p class="scenario">${esc(question.scenario)}</p>` : ""}<h2>${esc(question.question)}</h2><div class="quiz-options">${question.options.map((option, index) => { const correct = answered && index === question.correct; const wrong = answered && index === state.selectedOption && index !== question.correct; return `<button class="quiz-option ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}" data-option="${index}"><span>${String.fromCharCode(65 + index)}</span>${esc(option)}</button>`; }).join("")}</div>${answered ? `<div class="quiz-feedback"><b>${state.selectedOption === question.correct ? "Corect." : "Răspunsul trebuie revizuit."}</b> ${esc(question.explanation)}</div>` : ""}</div><aside class="live-quiz-side"><div class="live-status-dot ${state.live.session ? "connected" : ""}"></div><b>${state.live.session ? `Sesiune ${esc(state.live.session.token)}` : "Telefoanele nu sunt conectate"}</b><p>${state.live.session ? `${live.answers.length} studenți au răspuns la această întrebare.` : "Porniți o sesiune live, apoi trimiteți întrebarea pe toate telefoanele conectate."}</p><button class="action-button send-question" data-action="send-live">${live.open && !live.revealed ? "Retrimite întrebarea" : "Trimite pe telefoane"}</button>${live.open && !live.revealed ? `<button class="action-button reveal-answer" data-action="live-reveal">Arată răspunsul corect</button>` : ""}<button class="secondary-action" data-action="live-panel">Panou sesiune live</button><button class="secondary-action" data-action="next-question" ${questions.length <= 1 ? "disabled" : ""}>Următoarea întrebare (${state.quizIndex + 1}/${questions.length})</button></aside></div></section>`; }
    if (slide.discussionPrompt) return `<section class="slide-view"><div class="discussion-card"><div class="slide-kicker">DISCUȚIE GHIDATĂ</div><h2>Decizie de echipă</h2><p>${esc(slide.discussionPrompt)}</p><div class="timer-row"><button data-timer="3">3 minute</button><button data-timer="5">5 minute</button><button data-timer="7">7 minute</button><span class="timer-display" data-timer-display>${formatTime(state.timerSeconds)}</span></div></div></section>`;
    return `<section class="slide-view"><div class="discussion-card"><div class="slide-kicker">APLICAȚIE INTERACTIVĂ</div><h2>Pe acest diapozitiv nu este legată o întrebare separată.</h2><p>Continuați explicația sau selectați un diapozitiv cu verificare rapidă.</p></div></section>`;
  }
  function sourceView(slide) {
    const sources = slide.sourceBlocks?.length ? slide.sourceBlocks.map((block) => `<div class="source-item">${nl(block.text)}</div>`).join("") : `<div class="source-item">Pe acest diapozitiv nu există un bloc bibliografic separat.</div>`;
    return `<section class="slide-view"><div class="source-view"><div class="original-slide"><img src="${esc(slide.image)}" alt="Diapozitiv original ${slide.number}"></div><aside class="source-panel"><div class="slide-kicker">CONTROL DE FIDELITATE</div><h2>Original & surse</h2><p>Imaginea originală rămâne disponibilă integral. Informațiile citate în interiorul textului rămân și în materia de examen.</p>${sources}</aside></div></section>`;
  }
  function overviewView(content) { if (!state.overview) return ""; return `<div class="overview" role="dialog" aria-modal="true"><div class="overview-header"><h2>Toate diapozitivele · ${esc(content.meta.code)}</h2><button class="icon-button" data-action="overview">✕</button></div><div class="overview-grid">${content.slides.map((slide, index) => `<button class="overview-item" data-jump="${index}"><img src="${esc(slide.image)}" alt=""><div><b>${String(slide.number).padStart(2, "0")}</b><span>${esc(slide.title)}</span></div></button>`).join("")}</div></div>`; }

  function livePanelView() {
    if (!state.live.panel) return ""; const session = state.live.session;
    if (!session) return `<div class="live-overlay" role="dialog" aria-modal="true"><div class="live-panel start-panel"><button class="panel-close" data-action="live-panel">✕</button><div class="live-hero-icon">📡</div><div class="slide-kicker">CLASĂ CONECTATĂ</div><h2>Conectați toate telefoanele</h2><p>Se generează un cod QR. Studenții îl scanează, se identifică prin numărul matricol și apoi așteaptă întrebările trimise din prezentare.</p><ol><li>Proiectați codul QR.</li><li>Fiecare student intră de pe propriul telefon.</li><li>La finalul unui diapozitiv apăsați „Trimite pe telefoane”.</li></ol><button class="action-button start-live" data-action="start-live" ${state.live.busy ? "disabled" : ""}>${state.live.busy ? "Se creează…" : "Pornește sesiunea live"}</button>${state.live.error ? `<p class="live-error">${esc(state.live.error)}</p>` : ""}</div></div>`;
    const joins = new Map(); state.live.events.filter((event) => event.payload?.kind === "join").forEach((event) => joins.set(event.payload.matricol || event.name, event));
    const currentOpen = state.live.events.filter((event) => event.payload?.kind === "open").at(-1); const live = currentOpen ? liveQuestionState({ id: currentOpen.payload.questionId }) : { answers: [], revealed: false };
    const correct = currentOpen?.payload?.correct; const counts = currentOpen ? currentOpen.payload.options.map((_, index) => live.answers.filter((event) => Number(event.payload.selected) === index).length) : []; const max = Math.max(1, ...counts);
    return `<div class="live-overlay" role="dialog" aria-modal="true"><div class="live-panel session-panel"><button class="panel-close" data-action="live-panel">✕</button><div class="live-panel-header"><div><div class="slide-kicker">SESIUNE LIVE · ${esc(window.PRESENTATION_CONTENT.meta.code)}</div><h2>Telefoane conectate</h2><p>Profesor: ${esc(session.teacher || teacherName)}</p></div><div class="live-token"><span>COD</span><b>${esc(session.token)}</b></div></div><div class="connection-grid"><div class="qr-box"><div id="live-qr"></div></div><div class="join-instructions"><div class="participant-total"><strong>${joins.size}</strong><span>studenți conectați</span></div><p>Studenții scanează codul, apoi introduc numărul matricol. Ecranul lor rămâne în așteptare până trimiteți o întrebare.</p><button class="secondary-action" data-action="copy-live">Copiază linkul</button></div></div>${currentOpen ? `<div class="live-results-card"><div class="live-results-head"><div><span>${live.revealed ? "REZULTAT DEZVĂLUIT" : "ÎNTREBARE ACTIVĂ"}</span><h3>${esc(currentOpen.payload.question)}</h3></div><div class="answer-count large"><strong>${live.answers.length}</strong><span>răspunsuri</span></div></div><div class="distribution">${currentOpen.payload.options.map((option, index) => `<div class="distribution-row ${live.revealed && index === correct ? "correct" : ""}"><span>${String.fromCharCode(65 + index)}</span><div><i style="width:${Math.max(3, counts[index] / max * 100)}%"></i></div><b>${counts[index]}</b><em>${esc(option)}</em></div>`).join("")}</div>${!live.revealed ? `<button class="action-button reveal-answer" data-action="live-reveal">Arată soluția pe toate telefoanele</button>` : `<p class="revealed-note">✓ Soluția și explicația sunt vizibile pe telefoane.</p>`}</div>` : `<div class="live-waiting"><span>04</span><div><h3>Clasa este pregătită.</h3><p>Reveniți la diapozitiv și folosiți butonul „Trimite pe telefoane”.</p></div></div>`}<div class="live-panel-footer"><button class="danger-action" data-action="end-live">Încheie sesiunea</button><span>Sesiunea expiră automat în 3 ore.</span></div>${state.live.error ? `<p class="live-error">${esc(state.live.error)}</p>` : ""}</div></div>`;
  }
  function drawQr() { const node = document.getElementById("live-qr"); const session = state.live.session; if (!node || !session?.studentUrl || node.childNodes.length) return; try { if (window.QRCode) new window.QRCode(node, { text: session.studentUrl, width: 190, height: 190, colorDark: "#081a35", colorLight: "#ffffff" }); else node.innerHTML = `<a href="${esc(session.studentUrl)}">Deschide linkul</a>`; } catch (_) { node.innerHTML = `<a href="${esc(session.studentUrl)}">Deschide linkul</a>`; } }

  function render() {
    const content = window.PRESENTATION_CONTENT; if (!content) return; const slide = activeSlide(); const progress = ((state.current + 1) / content.slides.length) * 100;
    const view = state.mode === "interactive" ? interactiveView(slide) : state.mode === "source" ? sourceView(slide) : materialView(slide);
    app.className = "presentation-app";
    app.innerHTML = `<header class="topbar"><div class="brand"><div class="brand-mark">IG</div><div class="brand-copy"><strong>Igienă · UMFST</strong><span>Prezentare conectată</span></div></div><div class="top-title"><strong>${esc(content.meta.code)} · ${esc(content.meta.title)}</strong><span>${esc(slide.title).replaceAll("\n", " · ")}</span></div><div class="top-actions"><a class="download-button" href="download/${safeLp.toUpperCase()}_studiu_offline.html" download>⬇ Studiu offline</a><button class="live-top-button ${state.live.session ? "connected" : ""}" data-action="live-panel"><span>●</span>${state.live.session ? esc(state.live.session.token) : "Conectează clasa"}</button><button class="icon-button" data-action="overview" title="Toate diapozitivele">▦</button><button class="icon-button" data-action="fullscreen" title="Ecran complet">⛶</button></div></header><main class="workspace ${state.sidebar ? "" : "sidebar-closed"}"><aside class="slide-rail"><div class="slide-list">${content.slides.map((item, index) => `<button class="thumb ${index === state.current ? "active" : ""}" data-jump="${index}"><img src="${esc(item.image)}" loading="lazy" alt=""><div class="thumb-meta"><b>${String(item.number).padStart(2, "0")}</b><span>${esc(item.title)}</span>${item.quickChecks?.length ? `<i>📱</i>` : ""}</div></button>`).join("")}</div></aside><div class="stage-wrap"><article class="stage">${view}</article></div></main><footer class="bottombar"><div class="nav-actions"><button class="nav-button" data-action="prev" ${state.current === 0 ? "disabled" : ""}>← <span>Înapoi</span></button><span class="slide-counter">${String(state.current + 1).padStart(2, "0")} / ${String(content.slides.length).padStart(2, "0")}</span><button class="nav-button primary" data-action="next" ${state.current === content.slides.length - 1 ? "disabled" : ""}><span>Înainte</span> →</button></div><div class="mode-actions">${[["material", "◫ Predare"], ["interactive", "? Întrebare"], ["source", "◎ Original"]].map(([mode, label]) => `<button class="mode-button ${state.mode === mode ? "active" : ""}" data-mode="${mode}">${label}</button>`).join("")}</div><div class="utility-actions"><button class="utility-button" data-action="sidebar">☰ <span>Diapozitive</span></button><button class="utility-button" data-action="reveal">${state.reveal ? "✓" : "○"} <span>Dezvăluire</span></button></div></footer><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>${overviewView(content)}${livePanelView()}`;
    requestAnimationFrame(() => { document.querySelector(`.thumb[data-jump="${state.current}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); drawQr(); });
  }

  function restoreLiveSession() { try { const saved = JSON.parse(localStorage.getItem(`igiena_live_${safeLp}`) || "null"); if (saved?.token && saved.expiresAt > Date.now()) { state.live.session = saved; beginLivePolling(); } } catch (_) {} }
  function beginLivePolling() {
    if (state.live.pollId) clearInterval(state.live.pollId);
    const refresh = async () => { if (!state.live.session || !window.LIVE_CLASS) return; try { const events = await window.LIVE_CLASS.getEvents(state.live.session.token); const before = state.live.events.at(-1)?.id || ""; const after = events.at(-1)?.id || ""; const changed = events.length !== state.live.events.length || before !== after; state.live.events = events; if (changed) render(); } catch (error) { state.live.error = error.message; } };
    refresh(); state.live.pollId = setInterval(refresh, 1800);
  }
  async function startLiveSession() {
    if (!window.LIVE_CLASS || state.live.busy) return; state.live.busy = true; state.live.error = ""; render();
    try { const content = window.PRESENTATION_CONTENT; const session = await window.LIVE_CLASS.createSession({ labId: content.meta.id, labCode: content.meta.code, teacher: teacherName }); state.live.session = session; localStorage.setItem(`igiena_live_${safeLp}`, JSON.stringify(session)); beginLivePolling(); } catch (error) { state.live.error = error.message || String(error); }
    state.live.busy = false; render();
  }
  async function sendLiveQuestion() {
    const slide = activeSlide(); const question = slide.quickChecks?.[state.quizIndex] || slide.quickChecks?.[0]; if (!question) return;
    if (!state.live.session) { state.live.panel = true; render(); return; }
    try { await window.LIVE_CLASS.writeEvent(state.live.session, "open", { questionId: question.id, slide: slide.number, question: question.question, scenario: question.scenario || "", options: question.options, correct: question.correct, explanation: question.explanation, openedAt: Date.now() }); state.mode = "interactive"; beginLivePolling(); } catch (error) { state.live.error = error.message || String(error); state.live.panel = true; render(); }
  }
  async function revealLiveQuestion() {
    const latestOpen = state.live.events.filter((event) => event.payload?.kind === "open").at(-1); const question = latestOpen?.payload || activeSlide().quickChecks?.[state.quizIndex] || activeSlide().quickChecks?.[0]; const questionId = question?.questionId || question?.id; if (!state.live.session || !questionId) return;
    try { await window.LIVE_CLASS.writeEvent(state.live.session, "reveal", { questionId, revealedAt: Date.now() }); beginLivePolling(); } catch (error) { state.live.error = error.message || String(error); state.live.panel = true; render(); }
  }
  async function endLiveSession() {
    if (!state.live.session || !confirm("Încheiați sesiunea live? Telefoanele nu vor mai primi întrebări.")) return;
    try { await window.LIVE_CLASS.cancelSession(state.live.session); } catch (_) {}
    if (state.live.pollId) clearInterval(state.live.pollId); state.live.session = null; state.live.events = []; state.live.panel = false; state.live.pollId = null; localStorage.removeItem(`igiena_live_${safeLp}`); render();
  }
  function revealNext() { if (state.mode !== "material" || !state.reveal) return false; const count = teachingBlocks(activeSlide()).length; if (state.revealedCount < count - 1) { state.revealedCount += 1; render(); return true; } return false; }

  app.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-mode], [data-jump], [data-option], [data-timer]"); if (!target) return;
    if (target.dataset.mode) return setMode(target.dataset.mode); if (target.dataset.jump !== undefined) { state.overview = false; return setSlide(Number(target.dataset.jump)); }
    if (target.dataset.option !== undefined) { state.selectedOption = Number(target.dataset.option); return render(); } if (target.dataset.timer) return startTimer(Number(target.dataset.timer));
    switch (target.dataset.action) {
      case "prev": setSlide(state.current - 1); break; case "next": revealNext() || setSlide(state.current + 1); break; case "sidebar": state.sidebar = !state.sidebar; render(); break;
      case "reveal": state.reveal = !state.reveal; state.revealedCount = state.reveal ? 0 : Number.POSITIVE_INFINITY; render(); break; case "overview": state.overview = !state.overview; render(); break;
      case "fullscreen": if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); break;
      case "next-question": state.quizIndex = (state.quizIndex + 1) % Math.max(1, activeSlide().quickChecks.length); state.selectedOption = null; render(); break;
      case "live-panel": state.live.panel = !state.live.panel; render(); break; case "start-live": startLiveSession(); break; case "send-live": sendLiveQuestion(); break;
      case "live-reveal": revealLiveQuestion(); break; case "end-live": endLiveSession(); break; case "copy-live": navigator.clipboard?.writeText(state.live.session?.studentUrl || ""); target.textContent = "Copiat ✓"; break;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input,textarea,select")) return;
    if (event.key === "ArrowLeft" || event.key === "PageUp") setSlide(state.current - 1); if (event.key === "ArrowRight" || event.key === "PageDown") revealNext() || setSlide(state.current + 1); if (event.key === " ") { event.preventDefault(); revealNext() || setSlide(state.current + 1); }
    if (event.key.toLowerCase() === "f") document.querySelector('[data-action="fullscreen"]')?.click(); if (event.key.toLowerCase() === "o") { state.overview = !state.overview; render(); } if (event.key.toLowerCase() === "q") setMode("interactive"); if (event.key.toLowerCase() === "s") setMode("source"); if (event.key.toLowerCase() === "m") setMode("material");
    if (event.key === "Escape" && state.overview) { state.overview = false; render(); } else if (event.key === "Escape" && state.live.panel) { state.live.panel = false; render(); }
  });
  loadContent();
})();
