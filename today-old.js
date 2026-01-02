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
      let progressPercent = 0;
      if (Number.isFinite(startVal) && Number.isFinite(latestVal)) {
        const d = latestVal - startVal;
        const sign = d > 0 ? "+" : "";
        deltaText = `${sign}${d.toFixed(1)}${unit}`;

        // Calculate progress if target value exists
        if (g.targetValue !== undefined && Number.isFinite(g.targetValue)) {
          const targetDelta = g.targetValue - startVal;
          const currentDelta = latestVal - startVal;
          if (targetDelta !== 0) {
            progressPercent = Math.min(100, Math.max(0, (currentDelta / targetDelta) * 100));
          }
        }
      }

      const startText = startEntry ? `${startEntry.value}${unit} (${startEntry.date})` : "No data";
      const latestText = latestEntry ? `${latestEntry.value}${unit} (${latestEntry.date})` : "No data";

      const progressBarHTML = g.targetValue !== undefined
        ? `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent.toFixed(1)}%;"></div>
          </div>
          <div class="progress-text">${progressPercent.toFixed(0)}% to target</div>
        `
        : '';

      const card = document.createElement("div");
      card.className = "panel";
      card.style.padding = "12px";
      card.style.marginBottom = "10px";

      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <div style="flex:1;">
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

          ${progressBarHTML}

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
/* -------------------------
   Today: Work
   ------------------------- */

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

function fmtHoursFromMinutes(mins) {
  const h = (Number(mins) || 0) / 60;
  const rounded = Math.round(h * 100) / 100;
  return `${rounded}h`;
}

function renderTodayWork() {
  const out = document.getElementById("todayWorkSummary");
  if (!out) return;

  const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
  const today = isoToday();

  const todayLog = logs.find((l) => l && l.date === today) || null;
  const todayMin = todayLog ? Number(todayLog.minutes) || 0 : 0;

  const weekStart = startOfWeekMondayISO(today);
  let weekMin = 0;

  for (let i = 0; i < 7; i++) {
    const d = addDaysISO(weekStart, i);
    const x = logs.find((l) => l && l.date === d);
    weekMin += x ? Number(x.minutes) || 0 : 0;
  }

  const note = todayLog && todayLog.note
    ? ` <span style="color:var(--muted);">(${escapeHTML(todayLog.note)})</span>`
    : "";

  out.innerHTML = `
    <div>Today: <strong>${fmtHoursFromMinutes(todayMin)}</strong>${note}</div>
    <div style="margin-top:6px; color:var(--muted); font-size:13px;">
      This week (since ${weekStart}): <strong>${fmtHoursFromMinutes(weekMin)}</strong>
    </div>
  `;
}

function wireTodayWorkButton() {
  const logBtn = document.getElementById("jumpToWorkBtn");
  if (logBtn) {
    logBtn.addEventListener("click", () => {
      window.location.hash = "#work";

      // Focus hours input for speed (after route render)
      setTimeout(() => {
        const hours = document.getElementById("workHours");
        if (hours) hours.focus();
      }, 0);
    });
  }

  function addMinutesToToday(deltaMinutes) {
    const today = isoToday();
    const id = `work_${today}`;
    const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
    const existing = logs.find((l) => l && l.id === id) || null;

    const prevMin = existing ? Number(existing.minutes) || 0 : 0;
    const nextMin = Math.max(0, prevMin + deltaMinutes);

    LifeOSDB.upsert("workLogs", {
      id,
      date: today,
      minutes: nextMin,
      note: existing ? (existing.note || "") : "",
      createdAt: existing ? (existing.createdAt || LifeOSDB.nowISO()) : LifeOSDB.nowISO(),
      updatedAt: LifeOSDB.nowISO(),
    });

    // Update Today immediately + notify other views
    renderTodayWork();
    document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
  }

  const add30 = document.getElementById("workQuickAdd30Btn");
  if (add30) {
    add30.addEventListener("click", () => addMinutesToToday(30));
  }

  const add60 = document.getElementById("workQuickAdd60Btn");
  if (add60) {
    add60.addEventListener("click", () => addMinutesToToday(60));
  }
    const sub30 = document.getElementById("workQuickSub30Btn");
  if (sub30) {
    sub30.addEventListener("click", () => {
      const today = isoToday();
      const id = `work_${today}`;

      const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
      const existing = logs.find((l) => l && l.id === id) || null;

      const prevMin = existing ? Number(existing.minutes) || 0 : 0;
      const nextMin = Math.max(0, prevMin - 30);

      LifeOSDB.upsert("workLogs", {
        id,
        date: today,
        minutes: nextMin,
        note: existing ? (existing.note || "") : "",
        createdAt: existing ? (existing.createdAt || LifeOSDB.nowISO()) : LifeOSDB.nowISO(),
        updatedAt: LifeOSDB.nowISO(),
      });

      // Update Today immediately + notify Work tab
      renderTodayWork();
      document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
    });
  }

}

  function wireTodayDietButtons() {
  function openDietLog() {
    // 1) Go to the Workouts view where Health tabs (Workout/Sleep/Diet) exist
    window.location.hash = "#workouts";

    // 2) After the route swap renders, click the Health "Diet" tab and Diet "Log" tab
    requestAnimationFrame(() => {
      const healthDietBtn = document.querySelector('.health-tab[data-health="diet"]');
      if (healthDietBtn) healthDietBtn.click();

      // Diet tabs are wired in diet-templates.js (default is "plan")
      // so we simulate clicking the "Log" tab.
      const dietLogTabBtn = document.querySelector('.diet-tab[data-diet-tab="log"]');
      if (dietLogTabBtn) dietLogTabBtn.click();

      // Optional: set log date to today if the input exists
      const dateInput = document.getElementById("dietLogDate");
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
    });
  }

  const dietBtn = document.getElementById("jumpToMetricsDietBtn");
  if (dietBtn) {
    dietBtn.addEventListener("click", openDietLog);
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
     Storage Health Check
     ------------------------- */

  function checkStorageHealth() {
    try {
      const usage = LifeOSDB.getStorageUsage();
      const totalBytes = usage.totalBytes || 0;
      const limitBytes = 5_000_000; // 5MB conservative estimate
      const warningThreshold = 4_000_000; // 4MB = 80%

      if (totalBytes > warningThreshold) {
        const usedMB = (totalBytes / 1_000_000).toFixed(2);
        const limitMB = (limitBytes / 1_000_000).toFixed(1);

        // Show warning banner in Today view
        const banner = document.createElement("div");
        banner.className = "panel";
        banner.style.cssText = `
          background: rgba(255,90,107,.12);
          border-color: rgba(255,90,107,.35);
          padding: 12px;
          margin-bottom: 14px;
          font-size: 14px;
        `;
        banner.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">⚠️ Storage Warning</div>
          <div style="color:var(--muted); font-size:13px;">
            Using ${usedMB} MB of ~${limitMB} MB.
            <a href="#today" onclick="document.getElementById('exportBtn').click(); return false;"
               style="color:var(--accent); text-decoration:underline;">
              Export your data
            </a>
            to back up before storage fills.
          </div>
        `;

        const main = document.querySelector("#view-today");
        if (main && main.firstChild) {
          main.insertBefore(banner, main.firstChild);
        }
      }
    } catch (err) {
      console.error("Storage health check failed:", err);
    }
  }

  /* -------------------------
     Weekly Backup Reminder
     ------------------------- */

  function checkBackupReminder() {
    try {
      const lastBackupDate = localStorage.getItem("lifeos.lastBackupDate");
      const today = isoToday();

      if (!lastBackupDate) {
        // First time: set to today (give user a week grace period)
        localStorage.setItem("lifeos.lastBackupDate", today);
        return;
      }

      // Calculate days since last backup
      const lastDate = new Date(lastBackupDate + "T00:00:00");
      const currentDate = new Date(today + "T00:00:00");
      const daysSince = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (daysSince >= 7) {
        // Show backup reminder banner
        const banner = document.createElement("div");
        banner.className = "panel";
        banner.style.cssText = `
          background: rgba(79,140,255,.12);
          border-color: rgba(79,140,255,.35);
          padding: 12px;
          margin-bottom: 14px;
          font-size: 14px;
        `;
        banner.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">💾 Weekly Backup Reminder</div>
          <div style="color:var(--muted); font-size:13px; margin-bottom:8px;">
            It's been ${daysSince} days since your last backup.
            Keep your data safe by exporting regularly.
          </div>
          <div style="display:flex; gap:8px;">
            <button id="backupNowBtn" style="
              height:36px;
              padding:0 12px;
              border-radius:10px;
              background:rgba(79,140,255,.18);
              border-color:rgba(79,140,255,.55);
            ">Backup Now</button>
            <button id="backupLaterBtn" style="
              height:36px;
              padding:0 12px;
              border-radius:10px;
            ">Remind Me Tomorrow</button>
          </div>
        `;

        const main = document.querySelector("#view-today");
        if (main && main.firstChild) {
          main.insertBefore(banner, main.firstChild);

          // Wire backup button
          const backupNowBtn = document.getElementById("backupNowBtn");
          if (backupNowBtn) {
            backupNowBtn.addEventListener("click", () => {
              const exportBtn = document.getElementById("exportBtn");
              if (exportBtn) {
                exportBtn.click();
                localStorage.setItem("lifeos.lastBackupDate", today);
                banner.remove();
              }
            });
          }

          // Wire "later" button
          const backupLaterBtn = document.getElementById("backupLaterBtn");
          if (backupLaterBtn) {
            backupLaterBtn.addEventListener("click", () => {
              // Set to yesterday so it reminds again tomorrow
              const yesterday = new Date(currentDate);
              yesterday.setDate(yesterday.getDate() - 6);
              localStorage.setItem("lifeos.lastBackupDate", yesterday.toISOString().slice(0, 10));
              banner.remove();
            });
          }
        }
      }
    } catch (err) {
      console.error("Backup reminder check failed:", err);
    }
  }

  /* -------------------------
     Boot
     ------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    // Check storage health and backup reminder on load
    checkStorageHealth();
    checkBackupReminder();

    // Initial render + wiring
    renderTodayGoals();
    renderTodayDiet();
    renderTodayWork();

    wireTodayDietButtons();
    wireTodayWorkButton();

    populatePlanGoalLink();
    renderTodayPlan();
    wirePlanForm();

    // Re-render when returning to Today (no re-wiring here)
    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#today") {
        renderTodayGoals();
        renderTodayDiet();
        renderTodayWork();
        populatePlanGoalLink();
        renderTodayPlan();
      }
    });

    // Re-render work summary when work logs change (register ONCE)
    document.addEventListener("lifeos:work-updated", () => {
      renderTodayWork();
    });

    // Re-render goals when metrics are updated
    document.addEventListener("lifeos:metrics-updated", () => {
      renderTodayGoals();
    });
  });
})();
