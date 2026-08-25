(() => {
  "use strict";

  const CATALOG = [
    ["lp1a", "LP1A", "Proprietățile fizice ale aerului"],
    ["lp1b", "LP1B", "Poluarea aerului: pulberi și gaze"],
    ["lp2a", "LP2A", "Fumat și microorganisme"],
    ["lp2b", "LP2B", "Iluminat și sonometrie"],
    ["lp3a", "LP3A", "Igiena apei"],
    ["lp3b", "LP3B", "Microbiologie și dezinfecție"],
    ["lp4a", "LP4A", "Starea de nutriție"],
    ["lp4b", "LP4B", "Igiena produselor de origine animală"],
    ["lp5a", "LP5A", "Produse vegetale"],
    ["lp5b", "LP5B", "Bacteriologie și parazitologie"],
    ["lp6a", "LP6A", "Radiații"],
    ["lp6b", "LP6B", "Igienă școlară"],
  ];

  const app = document.getElementById("app");
  const requestedLp = new URLSearchParams(location.search).get("lp")?.toLowerCase() || "lp6b";
  const safeLp = CATALOG.some(([id]) => id === requestedLp) ? requestedLp : "lp6b";
  const state = {
    current: 0,
    mode: "material",
    sidebar: true,
    overview: false,
    reveal: false,
    revealedCount: Number.POSITIVE_INFINITY,
    quizIndex: 0,
    selectedOption: null,
    timerSeconds: 0,
    timerId: null,
  };

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const iconForMode = { material: "📘", interactive: "🧠", source: "🔎" };
  const sectionCovers = new Set([1, 3, 7, 10, 17]);

  function loadContent() {
    const script = document.createElement("script");
    script.src = `content/${safeLp}.js`;
    script.onload = () => {
      if (!window.PRESENTATION_CONTENT) return showError("Pachetul de conținut nu a putut fi citit.");
      document.documentElement.style.setProperty("--teal", window.PRESENTATION_CONTENT.meta.accent || "#14b8a6");
      document.documentElement.style.setProperty("--amber", window.PRESENTATION_CONTENT.meta.accent2 || "#f59e0b");
      document.title = `${window.PRESENTATION_CONTENT.meta.code} · ${window.PRESENTATION_CONTENT.meta.title}`;
      render();
    };
    script.onerror = () => showError(
      safeLp === "lp6b"
        ? "Pachetul LP6B lipsește. Reîncărcați pagina."
        : "Acest LP urmează să fie transformat după aprobarea prototipului LP6B."
    );
    document.head.appendChild(script);
  }

  function showError(message) {
    app.className = "error-screen";
    app.innerHTML = `<h1>Prezentarea nu este disponibilă</h1><p>${esc(message)}</p><p><a href="?lp=lp6b" style="color:#5eead4">Deschide prototipul LP6B</a></p>`;
  }

  function activeSlide() {
    return window.PRESENTATION_CONTENT.slides[state.current];
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function setSlide(index) {
    const count = window.PRESENTATION_CONTENT.slides.length;
    state.current = Math.max(0, Math.min(count - 1, index));
    state.quizIndex = 0;
    state.selectedOption = null;
    state.timerSeconds = 0;
    stopTimer();
    state.revealedCount = state.reveal ? 0 : Number.POSITIVE_INFINITY;
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    state.selectedOption = null;
    state.quizIndex = 0;
    state.timerSeconds = 0;
    stopTimer();
    render();
  }

  function formatTime(total) {
    const safe = Math.max(0, total);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function startTimer(minutes) {
    stopTimer();
    state.timerSeconds = minutes * 60;
    render();
    state.timerId = setInterval(() => {
      state.timerSeconds -= 1;
      if (state.timerSeconds <= 0) {
        state.timerSeconds = 0;
        stopTimer();
      }
      const display = document.querySelector("[data-timer-display]");
      if (display) display.textContent = formatTime(state.timerSeconds);
    }, 1000);
  }

  function isUpperBreadcrumb(block, slide, height) {
    const text = block.text.trim();
    const letters = text.match(/[A-Za-zĂÂÎȘȚăâîșț]/g) || [];
    if (!letters.length || block.text === slide.title) return false;
    const upper = letters.filter((char) => char === char.toUpperCase()).length / letters.length;
    return block.y < height * 0.15 && upper > 0.84 && text.length > 16;
  }

  function buildGroups(slide) {
    const height = window.PRESENTATION_CONTENT.meta.slideSize?.height || 6858000;
    const visible = slide.contentBlocks
      .filter((block) => !isUpperBreadcrumb(block, slide, height))
      .sort((a, b) => a.y - b.y || a.x - b.x || a.order - b.order);
    const threshold = height * 0.035;
    const groups = [];
    for (const block of visible) {
      const center = block.y + (block.cy || 0) / 2;
      const existing = groups.find((group) => Math.abs(group.center - center) <= threshold);
      if (existing) {
        existing.items.push(block);
        existing.center = (existing.center * (existing.items.length - 1) + center) / existing.items.length;
      } else {
        groups.push({ center, items: [block] });
      }
    }
    for (const group of groups) group.items.sort((a, b) => a.x - b.x || a.order - b.order);
    return groups;
  }

  function materialView(slide) {
    if (sectionCovers.has(slide.number)) {
      const subtitle = slide.contentBlocks
        .filter((block) => block.text !== slide.title)
        .map((block) => block.text)
        .find((text) => text.length > 22) || window.PRESENTATION_CONTENT.meta.subtitle;
      return `
        <section class="slide-view">
          <div class="section-cover">
            <div class="slide-kicker">MATERIE DE EXAMEN · ${esc(slide.section || "LP6B")}</div>
            <div class="section-number">${String(slide.number).padStart(2, "0")}</div>
            <h1 class="slide-title">${esc(slide.title).replaceAll("\n", "<br>")}</h1>
            <p class="section-subtitle">${esc(subtitle).replaceAll("\n", "<br>")}</p>
            <p class="fidelity-note"><b>✓ Conținut păstrat</b> Textul provine direct din prezentarea originală.</p>
          </div>
        </section>`;
    }

    const groups = buildGroups(slide);
    const cards = groups.map((group, index) => {
      const combined = group.items.map((item) => item.text).join(" ");
      const metric = /^(?:\s*[×x]?\s*\d+(?:[.,]\d+)?\s*(?:%|‰|\/100k|ani|ore\/zi|h)?\s*)$/i.test(combined);
      const wide = combined.length > 105 || group.items.length >= 4;
      const full = combined.length > 230 || group.items.length >= 7;
      const hidden = state.reveal && index > state.revealedCount;
      const current = state.reveal && index === state.revealedCount;
      return `<article class="material-card ${metric ? "metric" : ""} ${wide ? "wide" : ""} ${full ? "full" : ""} ${index % 5 === 4 ? "accent" : ""} ${hidden ? "is-hidden" : ""} ${current ? "is-current" : ""}">
        ${group.items.map((item) => `<p>${esc(item.text).replaceAll("\n", "<br>")}</p>`).join("")}
      </article>`;
    }).join("");

    return `
      <section class="slide-view">
        <div class="slide-kicker">MATERIE DE EXAMEN · DIAPOZITIV ${slide.number}</div>
        <h1 class="slide-title">${esc(slide.title).replaceAll("\n", "<br>")}</h1>
        <p class="fidelity-note"><b>✓ Conținut păstrat 1:1</b> Fără reformulare și fără scurtarea informației din PPT.</p>
        <div class="material-grid">${cards || `<article class="material-card full"><p>Conținut vizual — consultați diapozitivul original în fila „Surse & original”.</p></article>`}</div>
      </section>`;
  }

  function interactiveView(slide) {
    const questions = slide.quickChecks || [];
    const question = questions[state.quizIndex % Math.max(questions.length, 1)];
    if (question) {
      const answered = state.selectedOption !== null;
      return `<section class="slide-view">
        <div class="interactive-view">
          <div class="quiz-panel">
            <div class="slide-kicker">APLICAȚIE INTERACTIVĂ · VERIFICARE RAPIDĂ</div>
            ${question.scenario ? `<p class="scenario">${esc(question.scenario)}</p>` : ""}
            <h2>${esc(question.question)}</h2>
            <div class="quiz-options">
              ${question.options.map((option, index) => {
                const correct = answered && index === question.correct;
                const wrong = answered && index === state.selectedOption && index !== question.correct;
                return `<button class="quiz-option ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}" data-option="${index}">${String.fromCharCode(65 + index)}. ${esc(option)}</button>`;
              }).join("")}
            </div>
            ${answered ? `<div class="quiz-feedback"><b>${state.selectedOption === question.correct ? "Corect." : "Răspunsul trebuie revizuit."}</b> ${esc(question.explanation)}</div>` : ""}
          </div>
          <aside class="quiz-side">
            <b>Întrebări existente</b>
            <p>Întrebarea și explicația sunt preluate din modulul de exercițiu LP6B. Banca de examen nu este modificată și nu este afișată aici.</p>
            <button data-action="next-question" ${questions.length <= 1 ? "disabled" : ""}>Următoarea întrebare (${state.quizIndex + 1}/${questions.length})</button>
          </aside>
        </div>
      </section>`;
    }

    if (slide.discussionPrompt) {
      return `<section class="slide-view">
        <div class="discussion-card">
          <div class="slide-kicker">APLICAȚIE INTERACTIVĂ · DISCUȚIE GHIDATĂ</div>
          <h2>Decizie de echipă</h2>
          <p>${esc(slide.discussionPrompt)}</p>
          <div class="timer-row">
            <button data-timer="3">3 minute</button>
            <button data-timer="5">5 minute</button>
            <button data-timer="7">7 minute</button>
            <span class="timer-display" data-timer-display>${formatTime(state.timerSeconds)}</span>
          </div>
        </div>
      </section>`;
    }

    const available = window.PRESENTATION_CONTENT.slides
      .filter((item) => item.quickChecks?.length || item.discussionPrompt)
      .map((item) => `<button class="utility-button" data-jump="${item.number - 1}">${item.number}</button>`)
      .join("");
    return `<section class="slide-view">
      <div class="discussion-card">
        <div class="slide-kicker">APLICAȚIE INTERACTIVĂ</div>
        <h2>Pe acest diapozitiv nu este legată o întrebare separată.</h2>
        <p>Selectați un diapozitiv cu verificare rapidă sau discuție ghidată:</p>
        <div class="timer-row" style="flex-wrap:wrap">${available}</div>
      </div>
    </section>`;
  }

  function sourceView(slide) {
    const sources = slide.sourceBlocks?.length
      ? slide.sourceBlocks.map((block) => `<div class="source-item">${esc(block.text).replaceAll("\n", "<br>")}</div>`).join("")
      : `<div class="source-item">Pe acest diapozitiv nu există un bloc separat de referințe.</div>`;
    return `<section class="slide-view">
      <div class="source-view">
        <div class="original-slide"><img src="${esc(slide.image)}" alt="Diapozitivul original ${slide.number}: ${esc(slide.title)}"></div>
        <aside class="source-panel">
          <h2>Original & surse</h2>
          <p>Diapozitivul original rămâne disponibil integral. Referințele sunt mutate aici, nu în subsolul ecranului principal.</p>
          ${sources}
        </aside>
      </div>
    </section>`;
  }

  function overviewView(content) {
    if (!state.overview) return "";
    return `<div class="overview" role="dialog" aria-modal="true" aria-label="Toate diapozitivele">
      <div class="overview-header"><h2>Toate diapozitivele · ${esc(content.meta.code)}</h2><button class="icon-button" data-action="overview">✕</button></div>
      <div class="overview-grid">
        ${content.slides.map((slide, index) => `<button class="overview-item" data-jump="${index}"><img src="${esc(slide.image)}" alt=""><div><b>${String(slide.number).padStart(2, "0")}</b><span>${esc(slide.title)}</span></div></button>`).join("")}
      </div>
    </div>`;
  }

  function render() {
    const content = window.PRESENTATION_CONTENT;
    if (!content) return;
    const slide = activeSlide();
    const progress = ((state.current + 1) / content.slides.length) * 100;
    const view = state.mode === "interactive" ? interactiveView(slide) : state.mode === "source" ? sourceView(slide) : materialView(slide);
    app.className = "presentation-app";
    app.innerHTML = `
      <header class="topbar">
        <div class="brand"><div class="brand-mark">IG</div><div class="brand-copy"><strong>Igienă · UMFST</strong><span>Sistem interactiv de prezentare</span></div></div>
        <div class="top-title"><strong>${esc(content.meta.code)} · ${esc(content.meta.title)}</strong><span>${esc(slide.title).replaceAll("\n", " · ")}</span></div>
        <div class="top-actions">
          <button class="ghost-button" data-action="close">← Platformă</button>
          <button class="icon-button" data-action="overview" title="Toate diapozitivele (O)">▦</button>
          <button class="icon-button" data-action="fullscreen" title="Ecran complet (F)">⛶</button>
        </div>
      </header>
      <main class="workspace ${state.sidebar ? "" : "sidebar-closed"}">
        <aside class="slide-rail"><div class="slide-list">
          ${content.slides.map((item, index) => `<button class="thumb ${index === state.current ? "active" : ""}" data-jump="${index}"><img src="${esc(item.image)}" loading="lazy" alt=""><div class="thumb-meta"><b>${String(item.number).padStart(2, "0")}</b><span>${esc(item.title)}</span></div></button>`).join("")}
        </div></aside>
        <div class="stage-wrap"><article class="stage">${view}</article></div>
      </main>
      <footer class="bottombar">
        <div class="nav-actions">
          <button class="nav-button" data-action="prev" ${state.current === 0 ? "disabled" : ""}>← <span class="label">Înapoi</span></button>
          <span class="slide-counter">${String(state.current + 1).padStart(2, "0")} / ${String(content.slides.length).padStart(2, "0")}</span>
          <button class="nav-button primary" data-action="next" ${state.current === content.slides.length - 1 ? "disabled" : ""}><span class="label">Înainte</span> →</button>
        </div>
        <div class="mode-actions">
          ${[["material", "📘 Materie"], ["interactive", "🧠 Aplicație"], ["source", "🔎 Surse & original"]].map(([mode, label]) => `<button class="mode-button ${state.mode === mode ? "active" : ""}" data-mode="${mode}" title="${label}">${label}</button>`).join("")}
        </div>
        <div class="utility-actions">
          <button class="utility-button" data-action="sidebar">☰ <span>Diapozitive</span></button>
          <button class="utility-button" data-action="reveal">${state.reveal ? "✓" : "○"} <span>Dezvăluire</span></button>
          <button class="utility-button" title="Scurtături: ← →, Spațiu, F, O, Q, S">⌨ <span>Scurtături</span></button>
        </div>
      </footer>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      ${overviewView(content)}
    `;
    requestAnimationFrame(() => document.querySelector(`.thumb[data-jump="${state.current}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  function revealNext() {
    if (state.mode !== "material" || !state.reveal) return false;
    const count = buildGroups(activeSlide()).length;
    if (state.revealedCount < count - 1) {
      state.revealedCount += 1;
      render();
      return true;
    }
    return false;
  }

  app.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-mode], [data-jump], [data-option], [data-timer]");
    if (!target) return;
    if (target.dataset.mode) return setMode(target.dataset.mode);
    if (target.dataset.jump !== undefined) {
      state.overview = false;
      return setSlide(Number(target.dataset.jump));
    }
    if (target.dataset.option !== undefined) {
      state.selectedOption = Number(target.dataset.option);
      return render();
    }
    if (target.dataset.timer) return startTimer(Number(target.dataset.timer));

    switch (target.dataset.action) {
      case "prev": setSlide(state.current - 1); break;
      case "next": revealNext() || setSlide(state.current + 1); break;
      case "sidebar": state.sidebar = !state.sidebar; render(); break;
      case "reveal":
        state.reveal = !state.reveal;
        state.revealedCount = state.reveal ? 0 : Number.POSITIVE_INFINITY;
        render();
        break;
      case "overview": state.overview = !state.overview; render(); break;
      case "fullscreen":
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
        break;
      case "close":
        window.close();
        setTimeout(() => { location.href = "../indexV44.html"; }, 120);
        break;
      case "next-question":
        state.quizIndex = (state.quizIndex + 1) % Math.max(1, activeSlide().quickChecks.length);
        state.selectedOption = null;
        render();
        break;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") setSlide(state.current - 1);
    if (event.key === "ArrowRight" || event.key === "PageDown") revealNext() || setSlide(state.current + 1);
    if (event.key === "PageUp") setSlide(state.current - 1);
    if (event.key === " ") { event.preventDefault(); revealNext() || setSlide(state.current + 1); }
    if (event.key.toLowerCase() === "f") document.querySelector('[data-action="fullscreen"]')?.click();
    if (event.key.toLowerCase() === "o") { state.overview = !state.overview; render(); }
    if (event.key.toLowerCase() === "q") setMode("interactive");
    if (event.key.toLowerCase() === "s") setMode("source");
    if (event.key.toLowerCase() === "m") setMode("material");
    if (event.key === "Escape" && state.overview) { state.overview = false; render(); }
  });

  loadContent();
})();
