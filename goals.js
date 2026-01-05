/* =========================
   goals.js — Goals v1 (metric-attached, transparent)
   ========================= */

(function () {
  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function findStartValue(metricId, startDate) {
    const entries = LifeOSDB.getCollection("metricEntries")
      .filter((e) => e.metricId === metricId)
      .sort((a, b) => a.date.localeCompare(b.date));

    // first entry on/after startDate; fallback to earliest if none
    const onOrAfter = entries.find((e) => e.date >= startDate);
    return onOrAfter || entries[0] || null;
  }

  function findLatestValue(metricId) {
    const entries = LifeOSDB.getCollection("metricEntries")
      .filter((e) => e.metricId === metricId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries[0] || null;
  }

  function getMetricName(metricId) {
    const defs = LifeOSDB.getCollection("metricDefinitions");
    const def = defs.find((d) => d.id === metricId);
    return def ? `${def.name} (${def.unit || ""})`.trim() : metricId;
  }

  function populateMetricSelect() {
    const select = document.getElementById("goalMetricSelect");
    if (!select) return;

    const defs = LifeOSDB.getCollection("metricDefinitions")
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    select.innerHTML = "";

    if (defs.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No metrics available yet";
      select.appendChild(opt);
      select.disabled = true;
      return;
    }

    select.disabled = false;

    defs.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.unit || ""})`.trim();
      select.appendChild(opt);
    });
  }

  function renderGoals() {
    const wrap = document.getElementById("goalsList");
    if (!wrap) return;

    const goals = LifeOSDB.getCollection("goals")
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (goals.length === 0) {
      wrap.innerHTML = `<p style="color:var(--muted); margin:0;">No goals yet.</p>`;
      return;
    }

    wrap.innerHTML = "";

    goals.forEach((g) => {
      const metricName = getMetricName(g.metricId);

      const startEntry = findStartValue(g.metricId, g.startDate);
      const latestEntry = findLatestValue(g.metricId);

      const startText = startEntry ? `${startEntry.value} on ${startEntry.date}` : "No data";
      const latestText = latestEntry ? `${latestEntry.value} on ${latestEntry.date}` : "No data";

      let deltaText = "—";
      let progressPercent = 0;
      if (startEntry && latestEntry && Number.isFinite(startEntry.value) && Number.isFinite(latestEntry.value)) {
        const delta = latestEntry.value - startEntry.value;
        const sign = delta > 0 ? "+" : "";
        deltaText = `${sign}${delta.toFixed(1)}`;

        // Calculate progress percentage if target value exists
        if (g.targetValue !== undefined && Number.isFinite(g.targetValue)) {
          const targetDelta = g.targetValue - startEntry.value;
          const currentDelta = latestEntry.value - startEntry.value;
          if (targetDelta !== 0) {
            progressPercent = Math.min(100, Math.max(0, (currentDelta / targetDelta) * 100));
          }
        }
      }

      const card = document.createElement("div");
      card.className = "panel";
      card.style.padding = "14px";
      card.style.marginBottom = "12px";

      const progressBarHTML = g.targetValue !== undefined
        ? `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent.toFixed(1)}%;"></div>
          </div>
          <div class="progress-text">${progressPercent.toFixed(0)}% to target (${g.targetValue})</div>
        `
        : '';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div style="flex:1;">
            <h3 style="margin:0 0 6px 0;">${escapeHTML(g.title)}</h3>
            <div style="color:var(--muted); font-size:13px; margin-bottom:8px;">
              ${escapeHTML(metricName)}
            </div>
            ${progressBarHTML}
            <div style="font-size:14px; line-height:1.4; margin-top:8px;">
              <div><strong>Start:</strong> ${escapeHTML(startText)}</div>
              <div><strong>Latest:</strong> ${escapeHTML(latestText)}</div>
              <div><strong>Change:</strong> ${escapeHTML(deltaText)}</div>
              <div style="color:var(--muted); font-size:13px; margin-top:6px;">
                ${escapeHTML(g.startDate)} → ${escapeHTML(g.targetDate)}
              </div>
            </div>
          </div>
          <div>
            <button type="button" data-delete="${g.id}">Delete</button>
          </div>
        </div>
      `;

      card.querySelector("[data-delete]").addEventListener("click", () => {
        LifeOSDB.remove("goals", g.id);
        renderGoals();
        // Notify Today tab to update
        document.dispatchEvent(new CustomEvent("lifeos:goals-updated"));
      });

      wrap.appendChild(card);
    });
  }

  function wireGoalForm() {
    const form = document.getElementById("goalForm");
    if (!form) return;

    const titleEl = document.getElementById("goalTitle");
    const startEl = document.getElementById("goalStartDate");
    const targetEl = document.getElementById("goalTargetDate");
    const metricEl = document.getElementById("goalMetricSelect");
    const targetValueEl = document.getElementById("goalTargetValue");

    // defaults
    startEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = (titleEl.value || "").trim();
      const startDate = startEl.value;
      const targetDate = targetEl.value;
      const metricId = metricEl.value;
      const targetValueRaw = targetValueEl.value;

      if (!title || !startDate || !targetDate || !metricId) return;

      const goal = {
        title,
        startDate,
        targetDate,
        metricId,
        status: "active",
        createdAt: LifeOSDB.nowISO(),
      };

      // Add targetValue if provided
      if (targetValueRaw && targetValueRaw.trim() !== "") {
        const targetValue = Number(targetValueRaw);
        if (Number.isFinite(targetValue)) {
          goal.targetValue = targetValue;
        }
      }

      LifeOSDB.upsert("goals", goal);

      titleEl.value = "";
      if (targetValueEl) targetValueEl.value = "";
      // keep dates; user often adds multiple goals
      renderGoals();
      // Notify Today tab to update
      document.dispatchEvent(new CustomEvent("lifeos:goals-updated"));
    });
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    populateMetricSelect();
    wireGoalForm();
    renderGoals();

    // Re-render goals when metrics are updated
    document.addEventListener("lifeos:metrics-updated", () => {
      renderGoals();
    });
  });
})();
