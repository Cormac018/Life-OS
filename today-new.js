/* =========================
   today.js — Today (Revolut UX)
   - Quick-glance dashboard
   - Collapsible sections
   - Clean card-based layout
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
     Collapsible Logic
     ------------------------- */
  function makeCollapsible(element) {
    const header = element.querySelector(".revolut-collapsible-header");
    if (!header) return;

    header.addEventListener("click", () => {
      element.classList.toggle("expanded");
    });
  }

  /* -------------------------
     Today: Goals (Revolut Style)
     ------------------------- */
  function renderTodayGoals() {
    const wrap = document.getElementById("todayGoals");
    if (!wrap) return;

    const goals = LifeOSDB.getCollection("goals")
      .filter((g) => (g.status || "active") === "active")
      .slice()
      .sort((a, b) => (a.targetDate || "").localeCompare(b.targetDate || ""));

    wrap.innerHTML = "";

    if (goals.length === 0) {
      wrap.innerHTML = `
        <div class="revolut-empty-state">
          <div class="revolut-empty-icon">🎯</div>
          <div class="revolut-empty-title">No active goals</div>
          <div class="revolut-empty-description">Set a goal to track your progress</div>
          <a href="#goals" class="revolut-quick-action">Create Goal</a>
        </div>
      `;
      return;
    }

    // Summary stats
    const activeCount = goals.length;
    const goalsWithProgress = goals.filter(g => g.targetValue !== undefined);
    const avgProgress = goalsWithProgress.length > 0
      ? goalsWithProgress.reduce((sum, g) => {
          const startEntry = findStartValue(g.metricId, g.startDate);
          const latestEntry = findLatestValue(g.metricId);
          const startVal = startEntry ? Number(startEntry.value) : null;
          const latestVal = latestEntry ? Number(latestEntry.value) : null;
          if (Number.isFinite(startVal) && Number.isFinite(latestVal) && Number.isFinite(g.targetValue)) {
            const targetDelta = g.targetValue - startVal;
            const currentDelta = latestVal - startVal;
            if (targetDelta !== 0) {
              return sum + Math.min(100, Math.max(0, (currentDelta / targetDelta) * 100));
            }
          }
          return sum;
        }, 0) / goalsWithProgress.length
      : 0;

    const summary = document.createElement("div");
    summary.className = "revolut-summary-card";
    summary.innerHTML = `
      <div class="summary-stat">
        <div class="stat-value">${activeCount}</div>
        <div class="stat-label">Active</div>
      </div>
      ${goalsWithProgress.length > 0 ? `
      <div class="summary-stat">
        <div class="stat-value">${avgProgress.toFixed(0)}%</div>
        <div class="stat-label">Progress</div>
      </div>
      ` : ''}
    `;
    wrap.appendChild(summary);

    // Show top 3 goals
    const show = goals.slice(0, 3);

    show.forEach((g) => {
      const def = getMetricDef(g.metricId);
      const unit = def?.unit ? ` ${def.unit}` : "";

      const startEntry = findStartValue(g.metricId, g.startDate);
      const latestEntry = findLatestValue(g.metricId);

      const startVal = startEntry ? Number(startEntry.value) : null;
      const latestVal = latestEntry ? Number(latestEntry.value) : null;

      let deltaText = "—";
      let progressPercent = 0;
      let isPositive = false;

      if (Number.isFinite(startVal) && Number.isFinite(latestVal)) {
        const d = latestVal - startVal;
        const sign = d > 0 ? "+" : "";
        deltaText = `${sign}${d.toFixed(1)}${unit}`;
        isPositive = d > 0;

        if (g.targetValue !== undefined && Number.isFinite(g.targetValue)) {
          const targetDelta = g.targetValue - startVal;
          const currentDelta = latestVal - startVal;
          if (targetDelta !== 0) {
            progressPercent = Math.min(100, Math.max(0, (currentDelta / targetDelta) * 100));
          }
        }
      }

      const card = document.createElement("div");
      card.className = "revolut-card";

      const progressBarHTML = g.targetValue !== undefined
        ? `<div class="revolut-progress"><div class="revolut-progress-fill" style="width: ${progressPercent.toFixed(1)}%;"></div></div>`
        : '';

      card.innerHTML = `
        <div class="revolut-card-header">
          <div class="revolut-card-title">${escapeHTML(g.title)}</div>
          <div class="revolut-card-value ${isPositive ? 'positive' : ''}">${escapeHTML(deltaText)}</div>
        </div>
        <div class="revolut-card-subtitle">${escapeHTML(def ? def.name : g.metricId)}</div>
        ${progressBarHTML}
        ${g.targetValue !== undefined ? `
        <div class="revolut-card-meta">
          <span>${latestVal !== null ? latestVal.toFixed(1) : '—'}${unit}</span>
          <span class="meta-separator">→</span>
          <span>${g.targetValue}${unit}</span>
        </div>
        ` : ''}
      `;

      wrap.appendChild(card);
    });

    if (goals.length > 3) {
      const more = document.createElement("a");
      more.href = "#goals";
      more.className = "revolut-view-all";
      more.textContent = `View all ${goals.length} goals`;
      wrap.appendChild(more);
    }
  }

  /* -------------------------
     Today: Diet (Collapsible)
     ------------------------- */
  function renderTodayDiet() {
    const wrap = document.getElementById("todayDiet");
    if (!wrap) return;

    const today = isoToday();
    const logs = LifeOSDB.getCollection("dietLogs") || [];
    const todayLog = logs.find((l) => l.date === today);

    const collapsible = document.createElement("div");
    collapsible.className = "revolut-collapsible";

    let totals = { calories: 0, protein: 0, items: 0 };
    if (todayLog && todayLog.items) {
      totals.items = todayLog.items.length;
      todayLog.items.forEach(item => {
        totals.calories += Number(item.calories) || 0;
        totals.protein += Number(item.protein) || 0;
      });
    }

    const summaryText = totals.items > 0
      ? `${totals.calories} kcal · ${totals.protein}g protein · ${totals.items} ${totals.items === 1 ? 'item' : 'items'}`
      : 'No meals logged yet';

    collapsible.innerHTML = `
      <div class="revolut-collapsible-header">
        <div>
          <div class="revolut-collapsible-title">Today's Meals</div>
          <div class="revolut-collapsible-summary">${summaryText}</div>
        </div>
        <div class="revolut-collapsible-icon">
          <svg viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="revolut-collapsible-content">
        <div class="revolut-collapsible-inner" id="dietCollapsibleContent"></div>
      </div>
    `;

    wrap.innerHTML = "";
    wrap.appendChild(collapsible);

    // Add collapse functionality
    makeCollapsible(collapsible);

    // Render content
    const content = document.getElementById("dietCollapsibleContent");
    if (content) {
      if (!todayLog || !todayLog.items || todayLog.items.length === 0) {
        content.innerHTML = `
          <div style="text-align:center; padding:16px 0;">
            <p style="color:var(--muted); margin:0 0 12px 0;">No meals logged for today</p>
            <a href="#diet" class="revolut-quick-action">Log a Meal</a>
          </div>
        `;
      } else {
        todayLog.items.forEach(item => {
          const itemCard = document.createElement("div");
          itemCard.style.cssText = "margin-bottom:10px; padding:12px; background:var(--surface-2); border-radius:10px;";
          itemCard.innerHTML = `
            <div style="font-weight:600; margin-bottom:4px;">${escapeHTML(item.name || 'Unnamed')}</div>
            <div style="font-size:13px; color:var(--muted);">
              ${item.calories || 0} kcal · ${item.protein || 0}g protein
            </div>
          `;
          content.appendChild(itemCard);
        });
      }
    }
  }

  /* -------------------------
     Today: Work (Collapsible)
     ------------------------- */
  function renderTodayWork() {
    const wrap = document.getElementById("todayWork");
    if (!wrap) return;

    const today = isoToday();
    const logs = LifeOSDB.getCollection("workLogs") || [];
    const todayLogs = logs.filter((l) => l.date === today);

    const collapsible = document.createElement("div");
    collapsible.className = "revolut-collapsible";

    const totalHours = todayLogs.reduce((sum, log) => sum + (Number(log.hours) || 0), 0);
    const summaryText = todayLogs.length > 0
      ? `${totalHours.toFixed(1)} hours · ${todayLogs.length} ${todayLogs.length === 1 ? 'session' : 'sessions'}`
      : 'No work logged yet';

    collapsible.innerHTML = `
      <div class="revolut-collapsible-header">
        <div>
          <div class="revolut-collapsible-title">Today's Work</div>
          <div class="revolut-collapsible-summary">${summaryText}</div>
        </div>
        <div class="revolut-collapsible-icon">
          <svg viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="revolut-collapsible-content">
        <div class="revolut-collapsible-inner" id="workCollapsibleContent"></div>
      </div>
    `;

    wrap.innerHTML = "";
    wrap.appendChild(collapsible);

    makeCollapsible(collapsible);

    const content = document.getElementById("workCollapsibleContent");
    if (content) {
      if (todayLogs.length === 0) {
        content.innerHTML = `
          <div style="text-align:center; padding:16px 0;">
            <p style="color:var(--muted); margin:0 0 12px 0;">No work logged for today</p>
            <a href="#work" class="revolut-quick-action">Log Work</a>
          </div>
        `;
      } else {
        todayLogs.forEach(log => {
          const logCard = document.createElement("div");
          logCard.style.cssText = "margin-bottom:10px; padding:12px; background:var(--surface-2); border-radius:10px;";
          logCard.innerHTML = `
            <div style="font-weight:600; margin-bottom:4px;">${escapeHTML(log.category || 'Work')}</div>
            <div style="font-size:13px; color:var(--muted);">
              ${log.hours || 0} hours
              ${log.description ? `· ${escapeHTML(log.description)}` : ''}
            </div>
          `;
          content.appendChild(logCard);
        });
      }
    }
  }

  /* -------------------------
     Today: Plan (Collapsible)
     ------------------------- */
  function renderTodayPlan() {
    const wrap = document.getElementById("todayPlan");
    if (!wrap) return;

    const today = isoToday();
    const plans = LifeOSDB.getCollection("planEntries") || [];
    const todayPlans = plans.filter((p) => p.date === today).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    const collapsible = document.createElement("div");
    collapsible.className = "revolut-collapsible expanded";

    const summaryText = todayPlans.length > 0
      ? `${todayPlans.length} ${todayPlans.length === 1 ? 'item' : 'items'} planned`
      : 'No plans for today';

    collapsible.innerHTML = `
      <div class="revolut-collapsible-header">
        <div>
          <div class="revolut-collapsible-title">Today's Plan</div>
          <div class="revolut-collapsible-summary">${summaryText}</div>
        </div>
        <div class="revolut-collapsible-icon">
          <svg viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="revolut-collapsible-content">
        <div class="revolut-collapsible-inner" id="planCollapsibleContent"></div>
      </div>
    `;

    wrap.innerHTML = "";
    wrap.appendChild(collapsible);

    makeCollapsible(collapsible);

    const content = document.getElementById("planCollapsibleContent");
    if (content) {
      if (todayPlans.length === 0) {
        content.innerHTML = `
          <div style="text-align:center; padding:16px 0;">
            <p style="color:var(--muted); margin:0 0 12px 0;">No plans for today</p>
            <a href="#plan" class="revolut-quick-action">Create Plan</a>
          </div>
        `;
      } else {
        todayPlans.forEach(plan => {
          const timeRange = (plan.startTime && plan.endTime)
            ? `${plan.startTime}–${plan.endTime}`
            : (plan.startTime || '');

          const planCard = document.createElement("div");
          planCard.style.cssText = "margin-bottom:10px; padding:12px; background:var(--surface-2); border-radius:10px; display:flex; justify-content:space-between; align-items:center;";
          planCard.innerHTML = `
            <div style="flex:1;">
              <div style="font-weight:600; margin-bottom:2px;">${escapeHTML(plan.title || 'Untitled')}</div>
              ${timeRange ? `<div style="font-size:13px; color:var(--muted);">${escapeHTML(timeRange)}</div>` : ''}
            </div>
            ${plan.completed ? '<div style="color:#22c55e; font-size:20px;">✓</div>' : ''}
          `;
          content.appendChild(planCard);
        });
      }
    }
  }

  /* -------------------------
     Storage Health & Backup
     ------------------------- */
  function checkStorageHealth() {
    try {
      const usage = LifeOSDB.getStorageUsage();
      const totalBytes = usage.totalBytes || 0;
      const limitBytes = 5_000_000;
      const warningThreshold = 4_000_000;

      if (totalBytes > warningThreshold) {
        const usedMB = (totalBytes / 1_000_000).toFixed(2);
        const limitMB = (limitBytes / 1_000_000).toFixed(1);

        const banner = document.createElement("div");
        banner.className = "panel";
        banner.style.cssText = `
          background: rgba(255,90,107,.12);
          border-color: rgba(255,90,107,.35);
          padding: 12px;
          margin-bottom: 14px;
        `;
        banner.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">⚠️ Storage Warning</div>
          <div style="color:var(--muted); font-size:13px;">
            Using ${usedMB} MB of ~${limitMB} MB.
            <a href="#today" onclick="document.getElementById('exportBtn').click(); return false;"
               style="color:var(--accent); text-decoration:underline;">Export your data</a>
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

  function checkBackupReminder() {
    try {
      const lastBackupDate = localStorage.getItem("lifeos.lastBackupDate");
      const today = isoToday();

      if (!lastBackupDate) {
        localStorage.setItem("lifeos.lastBackupDate", today);
        return;
      }

      const lastDate = new Date(lastBackupDate + "T00:00:00");
      const currentDate = new Date(today + "T00:00:00");
      const daysSince = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (daysSince >= 7) {
        const banner = document.createElement("div");
        banner.className = "panel";
        banner.style.cssText = `
          background: rgba(79,140,255,.12);
          border-color: rgba(79,140,255,.35);
          padding: 12px;
          margin-bottom: 14px;
        `;
        banner.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">💾 Weekly Backup Reminder</div>
          <div style="color:var(--muted); font-size:13px; margin-bottom:8px;">
            It's been ${daysSince} days since your last backup.
          </div>
          <div style="display:flex; gap:8px;">
            <button id="backupNowBtn" class="revolut-quick-action">Backup Now</button>
            <button id="backupLaterBtn" style="
              padding:0 12px;
              border-radius:10px;
              background:rgba(255,255,255,0.05);
              border:1px solid var(--border);
              color:var(--text);
              cursor:pointer;
            ">Later</button>
          </div>
        `;

        const main = document.querySelector("#view-today");
        if (main && main.firstChild) {
          main.insertBefore(banner, main.firstChild);

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

          const backupLaterBtn = document.getElementById("backupLaterBtn");
          if (backupLaterBtn) {
            backupLaterBtn.addEventListener("click", () => {
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

    checkStorageHealth();
    checkBackupReminder();

    renderTodayGoals();
    renderTodayDiet();
    renderTodayWork();
    renderTodayPlan();

    // Event listeners for live updates
    document.addEventListener("lifeos:work-updated", () => {
      renderTodayWork();
    });

    document.addEventListener("lifeos:metrics-updated", () => {
      renderTodayGoals();
    });

    document.addEventListener("lifeos:data-imported", () => {
      renderTodayGoals();
      renderTodayDiet();
      renderTodayWork();
      renderTodayPlan();
    });
  });
})();
