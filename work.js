/* =========================
   work.js — Work logging (v1)
   - Offline-first
   - One entry per day (edit by re-saving)
   Collection: "workLogs"
     { id, date: "YYYY-MM-DD", minutes, note, createdAt, updatedAt }
   ========================= */

(function () {
  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function startOfWeekMondayISO(iso) {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDay(); // 0 Sun ... 6 Sat
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  function addDaysISO(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtHoursFromMinutes(mins) {
    const h = (Number(mins) || 0) / 60;
    const rounded = Math.round(h * 100) / 100;
    return `${rounded}h`;
  }

  function getLogs() {
    return (window.LifeOSDB?.getCollection("workLogs") || []).filter(Boolean);
  }

  function upsertLog({ date, minutes, note }) {
    const now = window.LifeOSDB.nowISO();
    const id = `work_${date}`; // stable per-day id

    window.LifeOSDB.upsert("workLogs", {
      id,
      date,
      minutes: Number(minutes) || 0,
      note: String(note || "").trim(),
      createdAt: now,
      updatedAt: now,
    });
  }

  function removeLog(id) {
    window.LifeOSDB.remove("workLogs", id);
  }

  function minutesForDate(dateISO) {
    const logs = getLogs();
    const x = logs.find((l) => l.date === dateISO);
    return x ? Number(x.minutes) || 0 : 0;
  }

  function renderWeekSummary() {
    const out = document.getElementById("workWeekSummary");
    if (!out) return;

    const today = isoToday();
    const start = startOfWeekMondayISO(today);

    let total = 0;
    for (let i = 0; i < 7; i++) {
      total += minutesForDate(addDaysISO(start, i));
    }

    out.innerHTML = `<div><b>${escapeHTML(fmtHoursFromMinutes(total))}</b> logged since <span class="meta">${escapeHTML(start)}</span>.</div>`;
  }
function weekTotalMinutesForDate(dateISO) {
  const start = startOfWeekMondayISO(dateISO);
  let total = 0;
  const logs = getLogs();

  for (let i = 0; i < 7; i++) {
    const d = addDaysISO(start, i);
    const x = logs.find((l) => l && l.date === d);
    total += x ? Number(x.minutes) || 0 : 0;
  }

  return total;
}

  function renderHistory() {
    const ul = document.getElementById("workHistoryList");
    if (!ul) return;

    const logs = getLogs().slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    ul.innerHTML = "";

    if (logs.length === 0) {
      ul.innerHTML = `<li style="color:var(--muted);">No work logs yet.</li>`;
      return;
    }

    logs.forEach((l) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      const note = (l.note || "").trim();
      const noteHtml = note ? `<div class="meta">${escapeHTML(note)}</div>` : "";

      li.innerHTML = `
        <div>
          <div>
  <b>${escapeHTML(l.date)}</b>
  • ${escapeHTML(fmtHoursFromMinutes(l.minutes))}
  <span class="meta"> • week: ${escapeHTML(fmtHoursFromMinutes(weekTotalMinutesForDate(l.date)))}</span>
</div>
          ${noteHtml}
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" data-del="${escapeHTML(l.id)}">Delete</button>
        </div>
      `;

      li.querySelector("[data-del]")?.addEventListener("click", () => {
        if (!confirm(`Delete work log for ${l.date}?`)) return;
        removeLog(l.id);
        renderWeekSummary();
        renderHistory();
        document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
      });

      ul.appendChild(li);
    });
  }

  function wireForm() {
    const form = document.getElementById("workLogForm");
    if (!form) return;

    const dateEl = document.getElementById("workDate");
    const hoursEl = document.getElementById("workHours");
    const noteEl = document.getElementById("workNote");
function loadFormForDate(dateISO) {
  if (!dateISO) return;

  const logs = getLogs();
  const existing = logs.find((l) => l && l.date === dateISO) || null;

  if (!existing) {
    // Clear inputs for a date with no log
    if (hoursEl) hoursEl.value = "";
    if (noteEl) noteEl.value = "";
    return;
  }

  const mins = Number(existing.minutes) || 0;
  const hours = Math.round((mins / 60) * 100) / 100;

  if (hoursEl) hoursEl.value = String(hours);
  if (noteEl) noteEl.value = existing.note || "";
}

    if (dateEl && !dateEl.value) dateEl.value = isoToday();
// Prefill if a log exists for the initial date
loadFormForDate(dateEl.value);

// When the date changes, load that day's log (if any)
dateEl.addEventListener("change", () => {
  loadFormForDate(dateEl.value);
});

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl?.value || "";
      const hours = Number(hoursEl?.value);

      if (!date) return;
      if (!Number.isFinite(hours) || hours < 0) return;

      const minutes = Math.round(hours * 60);

      upsertLog({
        date,
        minutes,
        note: noteEl?.value || "",
      });

      if (hoursEl) hoursEl.value = "";
      if (noteEl) noteEl.value = "";

      renderWeekSummary();
      renderHistory();
      document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
  if (!window.LifeOSDB) return;
  if (!document.getElementById("view-work")) return;

  wireForm();

  function refreshWorkView() {
    renderWeekSummary();
    renderHistory();
  }

  // Initial render
  refreshWorkView();

  // Re-render whenever Work logs change (e.g., quick-add from Today)
  document.addEventListener("lifeos:work-updated", () => {
    refreshWorkView();
  });

  // Re-render when navigating to the Work tab
  window.addEventListener("hashchange", () => {
    if ((window.location.hash || "").toLowerCase() === "#work") {
      refreshWorkView();
    }
  });
});
})();