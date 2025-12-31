/* =========================
   today.js — Today (stable)
   - Goals summary
   - Diet summary (today)
   - Plan for today (with optional time display)
   - Buttons to jump to Metrics
   ========================= */

(function () {
  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTimeRange(p) {
    const s = p.startTime || "";
    const e = p.endTime || "";
    if (s && e) return `${s}–${e}`;
    if (s && !e) return `${s}`;
    if (!s && e) return `until ${e}`;
    return "";
  }

  function getMetricEntry(metricId, date) {
    const entries = LifeOSDB.getCollection("metricEntries").filter((e) => e.metricId === metricId);
    return entries.find((e) => e.date === date) || null;
  }

  function latestMetricEntry(metricId) {
    const entries = LifeOSDB.getCollection("metricEntries")
      .filter((e) => e.metricId === metricId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries[0] || null;
  }

  function getMetricDef(metricId) {
    return LifeOSDB.getCollection("metricDefinitions").find((d) => d.id === metricId) || null;
  }

  function findStartValue(metricId, startDate) {
    const entries = LifeOSDB.getCollection("metricEntries")
      .filter((e) => e.metricId === metricId)
      .sort((a, b) => a.date.localeCompare(b.date));

    const onOrAfter = entries.find((e) => e.date >= startDate);
    return onOrAfter || entries[0] || null;
  }

  function findLatestValue(metricId) {
    const entries = LifeOSDB.getCollection("metricEntries")
      .filter((e) => e.metricId === metricId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries[0] || null;
  }

  /* -------------------------
     Today: Goals
     ------------------------- */

  function renderTodayGoals() {
    const wrap = document.getElementById("todayGoals");
    if (!wrap) return;

    const goals = LifeOSDB.getCollection("goals")
      .filter((g) => (g.status || "active") === "active")
      .slice()
      .sort((a, b) => (a.targetDate || "").localeCompare(b.targetDate || ""));

    if (goals.length === 0) {
      wrap.innerHTML = `<p style="color:var(--muted); margin:0;">No active goals.</p>`;
      return;
    }

    const show = goals.slice(0, 3);
    wrap.innerHTML = "";

    show.forEach((g) => {
      const def = getMetricDef(g.metricId);
      const unit = def?.unit ? ` ${def.unit}` : "";

      const startEntry = findStartValue(g.metricId, g.startDate);
      const latestEntry = findLatestValue(g.metricId);

      const startVal = startEntry ? Number(startEntry.value) : null;
      const latestVal = latestEntry ? Number(latestEntry.value) : null;

      let deltaText = "—";
      if (Number.isFinite(startVal) && Number.isFinite(latestVal)) {
        const d = latestVal - startVal;
        const sign = d > 0 ? "+" : "";
        deltaText = `${sign}${d.toFixed(1)}${unit}`;
      }

      const startText = startEntry ? `${startEntry.value}${unit} (${startEntry.date})` : "No data";
      const latestText = latestEntry ? `${latestEntry.value}${unit} (${latestEntry.date})` : "No data";

      const card = document.createElement("div");
      card.className = "panel";
      card.style.padding = "12px";
      card.style.marginBottom = "10px";

      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <div>
              <div style="font-weight:600;">${escapeHTML(g.title)}</div>
              <div style="color:var(--muted); font-size:13px;">
                ${escapeHTML(def ? def.name : g.metricId)} • Target: ${escapeHTML(g.targetDate)}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:600;">${escapeHTML(deltaText)}</div>
              <div style="color:var(--muted); font-size:13px;">change</div>
            </div>
          </div>

          <div style="margin-top:8px; font-size:13px; color:var(--muted);">
            Start: ${escapeHTML(startText)}<br/>
            Latest: ${escapeHTML(latestText)}
          </div>
        </div>
      `;

      wrap.appendChild(card);
    });

    if (goals.length > 3) {
      const more = document.createElement("div");
      more.style.color = "var(--muted)";
      more.style.fontSize = "13px";
      more.textContent = `Showing 3 of ${goals.length}. See Goals for all.`;
      wrap.appendChild(more);
    }
  }

  /* -------------------------
     Today: Diet
     ------------------------- */

  function renderTodayDiet() {
    const summaryEl = document.getElementById("todayDietSummary");
    const hintEl = document.getElementById("todayDietHint");
    if (!summaryEl || !hintEl) return;

    const CAL_ID = "diet_calories_kcal";
    const PRO_ID = "diet_protein_g";
    const BW_ID = "bodyweight";

    const today = isoToday();

    const cal = getMetricEntry(CAL_ID, today);
    const pro = getMetricEntry(PRO_ID, today);

    const calText = cal ? `${cal.value} kcal` : "—";
    const proText = pro ? `${pro.value} g protein` : "—";

    summaryEl.innerHTML = `<div><strong>${escapeHTML(calText)}</strong> • <strong>${escapeHTML(proText)}</strong></div>`;

    const bw = latestMetricEntry(BW_ID);
    if (!bw) {
      hintEl.textContent = "Log bodyweight to show an optional protein range suggestion here.";
      return;
    }

    const w = Number(bw.value);
    if (!Number.isFinite(w) || w <= 0) {
      hintEl.textContent = "Log a valid bodyweight to show an optional protein range suggestion here.";
      return;
    }

    const low = 1.6 * w;
    const high = 2.2 * w;

    hintEl.textContent =
      `Optional protein range (based on latest bodyweight ${bw.value} kg on ${bw.date}): ` +
      `${low.toFixed(0)}–${high.toFixed(0)} g/day (computed as 1.6–2.2 g/kg).`;
  }

  function wireTodayDietButtons() {
    const dietBtn = document.getElementById("jumpToMetricsDietBtn");
    if (dietBtn) {
      dietBtn.addEventListener("click", () => {
        window.location.hash = "#metrics";
      });
    }

    const weightBtn = document.getElementById("jumpToMetricsWeightBtn");
    if (weightBtn) {
      weightBtn.addEventListener("click", () => {
        window.location.hash = "#metrics";
      });
    }
  }

  /* -------------------------
     Today: Plan
     ------------------------- */

  function populatePlanGoalLink() {
    const sel = document.getElementById("planGoalLink");
    if (!sel) return;

    const goals = LifeOSDB.getCollection("goals")
      .filter((g) => (g.status || "active") === "active")
      .slice()
      .sort((a, b) => (a.targetDate || "").localeCompare(b.targetDate || ""));

    sel.innerHTML = `<option value="">No goal</option>`;

    goals.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.title;
      sel.appendChild(opt);
    });
  }

  function renderTodayPlan() {
    const list = document.getElementById("todayPlanList");
    if (!list) return;

    const today = isoToday();

    const items = LifeOSDB.getCollection("planItems")
      .filter((p) => p.date === today)
      .slice()
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    list.innerHTML = "";

    if (items.length === 0) {
      list.innerHTML = `<li style="color:var(--muted);">Nothing planned for today.</li>`;
      return;
    }

    const goalsById = new Map(LifeOSDB.getCollection("goals").map((g) => [g.id, g]));

    items.forEach((p) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      const done = p.status === "done";
      const goalTitle = p.goalId ? (goalsById.get(p.goalId)?.title || "Goal") : "";
      const timeText = (p.startTime || p.endTime) ? formatTimeRange(p) : "";

      li.innerHTML = `
        <div style="flex:1;">
          <div style="${done ? "text-decoration:line-through; opacity:0.7;" : ""}">
            <strong>${escapeHTML(p.title)}</strong>
            <span style="color:var(--muted); font-size:13px;"> • ${escapeHTML(p.category || "")}</span>
            ${timeText ? `<span style="color:var(--muted); font-size:13px;"> • ${escapeHTML(timeText)}</span>` : ""}
          </div>
          ${
            goalTitle
              ? `<div style="color:var(--muted); font-size:13px; margin-top:2px;">Linked: ${escapeHTML(goalTitle)}</div>`
              : ""
          }
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" data-toggle="${p.id}">${done ? "Undo" : "Done"}</button>
          <button type="button" data-delete="${p.id}">Delete</button>
        </div>
      `;

      li.querySelector("[data-toggle]").addEventListener("click", () => {
        LifeOSDB.upsert("planItems", { ...p, status: done ? "planned" : "done" });
        renderTodayPlan();
      });

      li.querySelector("[data-delete]").addEventListener("click", () => {
        LifeOSDB.remove("planItems", p.id);
        renderTodayPlan();
      });

      list.appendChild(li);
    });
  }

  function wirePlanForm() {
    const form = document.getElementById("planItemForm");
    if (!form) return;

    const titleEl = document.getElementById("planTitle");
    const catEl = document.getElementById("planCategory");
    const goalEl = document.getElementById("planGoalLink");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = (titleEl.value || "").trim();
      const category = catEl.value || "admin";
      const goalId = goalEl.value || "";

      if (!title) return;

      LifeOSDB.upsert("planItems", {
        title,
        category,
        goalId: goalId || null,
        date: isoToday(),
        status: "planned",
        createdAt: LifeOSDB.nowISO(),
      });

      titleEl.value = "";
      renderTodayPlan();
    });
  }

  /* -------------------------
     Boot
     ------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    renderTodayGoals();
    renderTodayDiet();
    wireTodayDietButtons();

    populatePlanGoalLink();
    renderTodayPlan();
    wirePlanForm();

    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#today") {
        renderTodayGoals();
        renderTodayDiet();
        populatePlanGoalLink();
        renderTodayPlan();
      }
    });
  });
})();
