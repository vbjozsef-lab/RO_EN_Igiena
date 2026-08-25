(() => {
  "use strict";

  const SUPABASE_URL = "https://hgknirjorjvlofhngvcp.supabase.co";
  const SUPABASE_KEY = "sb_publishable_PnUOkG2Tpw3wKa9hTZc3Yw_T0bnhFAO";

  const request = (path, options = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });

  const randomToken = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  };

  async function createSession({ labId, labCode, teacher, semester = "", durationMinutes = 180 }) {
    const token = randomToken();
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    const response = await request("sessions", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        id: token,
        lab_id: labId,
        lab_code: `${labCode}-LIVE`,
        expires_at: expiresAt,
        teacher: teacher || "Profesor",
        semester,
      }),
    });
    if (!response.ok) throw new Error((await response.text()) || "Sesiunea live nu a putut fi creată.");
    const studentUrl = new URL("../indexV44.html", location.href);
    studentUrl.search = new URLSearchParams({ token, lang: "ro" }).toString();
    return { token, labId, labCode: `${labCode}-LIVE`, teacher, semester, expiresAt, studentUrl: studentUrl.href };
  }

  async function writeEvent(session, kind, payload = {}) {
    if (!session?.token) throw new Error("Sesiunea live lipsește.");
    const questionId = payload.questionId || "room";
    const response = await request("results", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        session_id: session.token,
        name: session.teacher || "Profesor",
        grp: "LIVE",
        lab_id: session.labId,
        lab_code: session.labCode,
        module: `live_${kind}_${questionId}`,
        module_title: `Prezentare live · ${kind}`,
        score: 0,
        total: 0,
        pct: 0,
        time_used: 0,
        teacher: session.teacher || "",
        semester: session.semester || "",
        specialization: "",
        study_year: "",
        answers_text: JSON.stringify({ type: "live_class_v1", kind, ...payload, sentAt: Date.now() }),
      }),
    });
    if (!response.ok) throw new Error((await response.text()) || "Evenimentul nu a putut fi trimis.");
    return true;
  }

  async function getEvents(token) {
    if (!token) return [];
    const response = await request(`results?session_id=eq.${encodeURIComponent(token)}&select=*&order=created_at.asc&limit=1000`);
    if (!response.ok) throw new Error("Răspunsurile live nu au putut fi citite.");
    const rows = await response.json();
    return rows.map((row) => {
      let payload = {};
      try { payload = JSON.parse(row.answers_text || "{}"); } catch (_) {}
      return { ...row, payload, timestamp: Date.parse(row.created_at) || 0 };
    }).filter((row) => row.payload?.type === "live_class_v1");
  }

  async function cancelSession(session) {
    if (!session?.token) return;
    await request(`sessions?id=eq.${encodeURIComponent(session.token)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ expires_at: Date.now() - 1000 }),
    });
  }

  window.LIVE_CLASS = { createSession, writeEvent, getEvents, cancelSession };
})();
