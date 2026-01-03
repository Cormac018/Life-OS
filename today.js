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

    // Summary stats at top
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

    // Show top 3 goals with Revolut styling
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

        // Determine if change is positive based on goal direction
        // If target > start, we want to increase (positive delta is good)
        // If target < start, we want to decrease (negative delta is good)
        if (g.targetValue !== undefined && Number.isFinite(g.targetValue)) {
          const targetDelta = g.targetValue - startVal;
          const currentDelta = latestVal - startVal;

          // Progress towards goal
          if (targetDelta !== 0) {
            progressPercent = Math.min(100, Math.max(0, (currentDelta / targetDelta) * 100));
          }

          // Color logic: moving towards target is positive
          if (targetDelta > 0) {
            // Goal is to increase: positive delta is good
            isPositive = d > 0;
          } else {
            // Goal is to decrease: negative delta is good
            isPositive = d < 0;
          }
        } else {
          // No target value: just show green for positive numbers
          isPositive = d > 0;
        }
      }

      const card = document.createElement("div");
      card.className = "revolut-card expandable";
      card.dataset.goalId = g.id;
      card.dataset.metricId = g.metricId;

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
        <div class="inline-metric-form-container"></div>
      `;

      // Add click handler to expand and show inline form
      card.addEventListener("click", (e) => {
        // Don't trigger if clicking inside the form
        if (e.target.closest(".inline-metric-form")) return;

        const isExpanded = card.classList.contains("expanded");

        // Close all other expanded cards
        document.querySelectorAll(".revolut-card.expanded").forEach(c => {
          if (c !== card) {
            c.classList.remove("expanded");
            c.querySelector(".inline-metric-form-container").innerHTML = "";
          }
        });

        if (!isExpanded) {
          card.classList.add("expanded");
          showInlineMetricForm(card, g, def);
        } else {
          card.classList.remove("expanded");
          card.querySelector(".inline-metric-form-container").innerHTML = "";
        }
      });

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

  function showInlineMetricForm(card, goal, metricDef) {
    const container = card.querySelector(".inline-metric-form-container");
    const unit = metricDef?.unit || "";

    const form = document.createElement("form");
    form.className = "inline-metric-form";
    form.innerHTML = `
      <label>
        Log ${escapeHTML(metricDef ? metricDef.name : goal.metricId)}
      </label>
      <input type="date" name="date" value="${isoToday()}" required />
      <input type="number" name="value" step="0.1" placeholder="Enter value${unit ? ' (' + unit + ')' : ''}" required autofocus />
      <div class="btn-row">
        <button type="submit">Save ${unit}</button>
        <button type="button" class="cancel-btn">Cancel</button>
      </div>
    `;

    // Handle form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const dateInput = form.querySelector('input[name="date"]');
      const valueInput = form.querySelector('input[name="value"]');

      const date = dateInput.value;
      const value = Number(valueInput.value);

      if (!date || !Number.isFinite(value)) return;

      // Save the metric entry (using same ID pattern as metrics.js)
      const id = `m_${goal.metricId}_${date}`;
      const now = LifeOSDB.nowISO();
      LifeOSDB.upsert("metricEntries", {
        id,
        metricId: goal.metricId,
        date,
        value,
        note: "",
        createdAt: now,
        updatedAt: now,
      });

      // Dispatch event so other modules (goals, metrics) can react
      document.dispatchEvent(new CustomEvent("lifeos:metrics-updated", {
        detail: { metricId: goal.metricId, date, value }
      }));

      // Close the form and refresh
      card.classList.remove("expanded");
      container.innerHTML = "";
      renderTodayGoals();
    });

    // Handle cancel button
    const cancelBtn = form.querySelector(".cancel-btn");
    cancelBtn.addEventListener("click", () => {
      card.classList.remove("expanded");
      container.innerHTML = "";
    });

    container.innerHTML = "";
    container.appendChild(form);

    // Focus the value input
    setTimeout(() => {
      const valueInput = form.querySelector('input[name="value"]');
      if (valueInput) valueInput.focus();
    }, 100);
  }

  /* -------------------------
     Today: Diet (Swipeable Card)
     ------------------------- */

  function renderTodayDiet() {
    const container = document.getElementById("todayDietCard");
    if (!container) {
      // Fallback: try old structure
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
      return;
    }

    const CAL_ID = "diet_calories_kcal";
    const PRO_ID = "diet_protein_g";
    const BW_ID = "bodyweight";

    const today = isoToday();

    // Get data for different time periods
    const todayCal = getMetricEntry(CAL_ID, today);
    const todayPro = getMetricEntry(PRO_ID, today);

    const calText = todayCal ? `${todayCal.value} kcal` : "—";
    const proText = todayPro ? `${todayPro.value} g protein` : "—";

    // Calculate week data
    const weekStart = startOfWeekMondayISO(today);
    let weekCal = 0;
    let weekPro = 0;
    let weekDays = 0;

    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(weekStart, i);
      const cal = getMetricEntry(CAL_ID, d);
      const pro = getMetricEntry(PRO_ID, d);
      if (cal || pro) {
        weekDays++;
        weekCal += cal ? Number(cal.value) : 0;
        weekPro += pro ? Number(pro.value) : 0;
      }
    }

    const avgCal = weekDays > 0 ? (weekCal / weekDays).toFixed(0) : "—";
    const avgPro = weekDays > 0 ? (weekPro / weekDays).toFixed(0) : "—";

    // Get diet targets from meta
    const meta = LifeOSDB.getCollection("appMeta")[0] || {};
    const activePlanId = meta.dietActiveGoal || "maintain";
    const targets = meta.dietTargetsV1?.[activePlanId] || { calories: 0, protein: 0 };

    // Calculate daily progress percentages
    const todayCalValue = todayCal ? Number(todayCal.value) : 0;
    const todayProValue = todayPro ? Number(todayPro.value) : 0;
    const calProgress = targets.calories > 0 ? Math.min((todayCalValue / targets.calories) * 100, 150) : 0;
    const proProgress = targets.protein > 0 ? Math.min((todayProValue / targets.protein) * 100, 150) : 0;

    // Generate progress bar color based on progress (red -> amber -> green -> red if over)
    function getProgressColor(progress) {
      if (progress < 50) return '#ef4444'; // red
      if (progress < 80) return '#f59e0b'; // amber
      if (progress <= 110) return '#22c55e'; // green
      return '#ef4444'; // red if way over
    }

    const calBarColor = getProgressColor(calProgress);
    const proBarColor = getProgressColor(proProgress);

    // Calculate weekly target achievement
    let weekDaysHitCalTarget = 0;
    let weekDaysHitProTarget = 0;
    let weekDaysWithData = 0;

    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(weekStart, i);
      const cal = getMetricEntry(CAL_ID, d);
      const pro = getMetricEntry(PRO_ID, d);

      if (cal || pro) {
        weekDaysWithData++;
        const calVal = cal ? Number(cal.value) : 0;
        const proVal = pro ? Number(pro.value) : 0;

        if (targets.calories > 0 && calVal >= targets.calories * 0.95 && calVal <= targets.calories * 1.1) {
          weekDaysHitCalTarget++;
        }
        if (targets.protein > 0 && proVal >= targets.protein * 0.95 && proVal <= targets.protein * 1.1) {
          weekDaysHitProTarget++;
        }
      }
    }

    // Protein target hint
    const bw = latestMetricEntry(BW_ID);
    let proteinHint = "";
    if (bw) {
      const w = Number(bw.value);
      if (Number.isFinite(w) && w > 0) {
        const low = 1.6 * w;
        const high = 2.2 * w;
        proteinHint = `<div style="color:var(--muted); font-size:12px; margin-top:6px;">Target: ${low.toFixed(0)}–${high.toFixed(0)}g/day (1.6–2.2g/kg @ ${bw.value}kg)</div>`;
      }
    }

    container.innerHTML = `
      <div class="dashboard-card-header">
        <div class="dashboard-card-title">Diet</div>
        <a href="#workouts" class="dashboard-card-action">View all</a>
      </div>
      <div class="dashboard-tabs">
        <button class="dashboard-tab active" data-tab="day">Day</button>
        <button class="dashboard-tab" data-tab="week">Week</button>
      </div>
      <div class="dashboard-content-container">
        <div class="dashboard-content-panel active" data-panel="day">
          <div class="revolut-card" style="margin-bottom:12px;">
            <div class="revolut-card-header">
              <div class="revolut-card-title">Today's Intake</div>
            </div>
            <div style="display:flex; gap:16px; margin-top:12px;">
              <div style="flex:1;">
                <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Calories</div>
                <div style="font-size:18px; font-weight:700; margin-bottom:8px;">${escapeHTML(calText)}</div>
                ${targets.calories > 0 ? `
                  <div style="height:100px; width:100%; background:var(--surface-2); border-radius:8px; position:relative; overflow:hidden; border:1px solid var(--border);">
                    <div style="position:absolute; bottom:0; left:0; right:0; height:${calProgress}%; background:linear-gradient(to top, ${calBarColor}, ${calBarColor}dd); transition:all 0.3s ease;"></div>
                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:14px; font-weight:600; color:var(--text); z-index:1;">${calProgress.toFixed(0)}%</div>
                  </div>
                  <div style="font-size:11px; color:var(--muted); margin-top:4px; text-align:center;">Target: ${targets.calories} kcal</div>
                ` : ''}
              </div>
              <div style="flex:1;">
                <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Protein</div>
                <div style="font-size:18px; font-weight:700; margin-bottom:8px;">${escapeHTML(proText)}</div>
                ${targets.protein > 0 ? `
                  <div style="height:100px; width:100%; background:var(--surface-2); border-radius:8px; position:relative; overflow:hidden; border:1px solid var(--border);">
                    <div style="position:absolute; bottom:0; left:0; right:0; height:${proProgress}%; background:linear-gradient(to top, ${proBarColor}, ${proBarColor}dd); transition:all 0.3s ease;"></div>
                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:14px; font-weight:600; color:var(--text); z-index:1;">${proProgress.toFixed(0)}%</div>
                  </div>
                  <div style="font-size:11px; color:var(--muted); margin-top:4px; text-align:center;">Target: ${targets.protein}g</div>
                ` : ''}
              </div>
            </div>
            ${proteinHint}
          </div>
          <div class="btn-row">
            <button id="jumpToMetricsDietBtn" type="button">Log diet</button>
            <button id="jumpToMetricsWeightBtn" type="button">Log weight</button>
          </div>
        </div>
        <div class="dashboard-content-panel" data-panel="week">
          <div class="revolut-card">
            <div class="revolut-card-header">
              <div class="revolut-card-title">Weekly Average</div>
            </div>
            <div style="font-size:14px; margin-top:8px;">
              <div style="margin-bottom:4px;"><strong>Calories:</strong> ${escapeHTML(avgCal)} kcal/day</div>
              <div><strong>Protein:</strong> ${escapeHTML(avgPro)} g/day</div>
              <div style="color:var(--muted); font-size:12px; margin-top:6px;">Based on ${weekDays} days logged this week</div>
            </div>
            ${targets.calories > 0 || targets.protein > 0 ? `
              <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--border);">
                <div style="font-size:13px; font-weight:600; margin-bottom:12px;">Target Achievement</div>
                <div style="display:flex; gap:12px; margin-bottom:12px;">
                  <div style="flex:1; text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:${weekDaysHitCalTarget >= 5 ? '#22c55e' : weekDaysHitCalTarget >= 3 ? '#f59e0b' : '#ef4444'};">${weekDaysHitCalTarget}</div>
                    <div style="font-size:11px; color:var(--muted);">Calorie days</div>
                  </div>
                  <div style="flex:1; text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:${weekDaysHitProTarget >= 5 ? '#22c55e' : weekDaysHitProTarget >= 3 ? '#f59e0b' : '#ef4444'};">${weekDaysHitProTarget}</div>
                    <div style="font-size:11px; color:var(--muted);">Protein days</div>
                  </div>
                </div>
                <div style="display:flex; gap:4px; margin-top:8px;">
                  ${Array.from({length:7}, (_, i) => {
                    const d = addDaysISO(weekStart, i);
                    const cal = getMetricEntry(CAL_ID, d);
                    const pro = getMetricEntry(PRO_ID, d);
                    const calVal = cal ? Number(cal.value) : 0;
                    const proVal = pro ? Number(pro.value) : 0;
                    const hitCal = targets.calories > 0 && calVal >= targets.calories * 0.95 && calVal <= targets.calories * 1.1;
                    const hitPro = targets.protein > 0 && proVal >= targets.protein * 0.95 && proVal <= targets.protein * 1.1;
                    const color = (hitCal && hitPro) ? '#22c55e' : (cal || pro) ? '#f59e0b' : '#e5e7eb';
                    return `<div style="flex:1; height:8px; background:${color}; border-radius:4px;"></div>`;
                  }).join('')}
                </div>
                <div style="font-size:11px; color:var(--muted); margin-top:6px; text-align:center;">Green = both targets hit • Amber = partial • Gray = no data</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Wire tab switching with scroll synchronization
    const tabs = container.querySelectorAll(".dashboard-tab");
    const panels = container.querySelectorAll(".dashboard-content-panel");
    const contentContainer = container.querySelector(".dashboard-content-container");

    // Tab click handlers
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        // Update active tab
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Scroll to panel
        const panel = panels[index];
        if (panel && contentContainer) {
          contentContainer.scrollTo({
            left: panel.offsetLeft,
            behavior: "smooth"
          });
        }
      });
    });

    // Scroll event handler to sync tabs with swipe
    let scrollTimeout;
    contentContainer.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = contentContainer.scrollLeft;
        const containerWidth = contentContainer.offsetWidth;
        const activeIndex = Math.round(scrollLeft / containerWidth);

        tabs.forEach((tab, index) => {
          if (index === activeIndex) {
            tab.classList.add("active");
          } else {
            tab.classList.remove("active");
          }
        });
      }, 50);
    });

    // Enable smooth scrolling and snap behavior for touch devices
    contentContainer.style.scrollBehavior = "smooth";
    contentContainer.style.overflowX = "auto";
    contentContainer.style.WebkitOverflowScrolling = "touch";

    // Re-wire diet buttons after render
    wireTodayDietButtons();

    // Wire quick meal logging
    wireQuickMealLogging();
  }

  function wireQuickMealLogging() {
    const container = document.getElementById("todayDietCard");
    if (!container) return;

    const dayPanel = container.querySelector('[data-panel="day"]');
    if (!dayPanel) return;

    // Check if we already added the meal selector
    if (dayPanel.querySelector("#quickMealSelector")) return;

    // Get current diet plan from appMeta
    const meta = LifeOSDB.getCollection("appMeta")[0] || {};
    const activePlanId = meta.dietActiveGoal || "maintain"; // Default to maintain if not set

    if (!meta.dietPlansV1 || !meta.dietPlansV1[activePlanId]) {
      return; // No diet plans exist
    }

    const plan = meta.dietPlansV1[activePlanId];
    const slots = plan.slots || {};

    // Filter to only slots that have a meal template assigned
    const slotIds = Object.keys(slots)
      .filter(slotId => slots[slotId] && slots[slotId].templateId)
      .sort();

    if (slotIds.length === 0) return; // No meals in plan

    // Get all meal templates
    const templates = LifeOSDB.getCollection("mealTemplates") || [];
    const templatesById = new Map(templates.map(t => [t.id, t]));

    // Find the card inside day panel and add meal selector after it
    const dietCard = dayPanel.querySelector(".revolut-card");
    if (!dietCard) return;

    // Get plan display name
    const planLabels = { bulk: "Bulk", cut: "Cut", maintain: "Maintain" };
    const planLabel = planLabels[activePlanId] || activePlanId;

    const mealSelectorHTML = `
      <div style="margin-top:12px; padding:12px; background:var(--surface-2); border-radius:var(--radius-sm); border:1px solid var(--border);">
        <div style="font-size:13px; color:var(--muted); margin-bottom:4px; font-weight:600;">Quick Log Meal</div>
        <div style="font-size:12px; color:var(--muted); margin-bottom:8px;">Plan: ${planLabel}</div>
        <select id="quickMealSelector" style="width:100%; padding:10px; font-size:14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; color:var(--text); margin-bottom:8px;">
          <option value="">Select a meal...</option>
          ${slotIds.map(slotId => {
            const slot = slots[slotId];
            const template = templatesById.get(slot.templateId);
            const mealName = template ? template.name : "Unknown meal";
            return `<option value="${slotId}">${slot.label || slotId}: ${mealName}</option>`;
          }).join('')}
        </select>
        <button id="quickMealLogBtn" type="button" style="width:100%; padding:10px; border-radius:8px; font-weight:600; background:linear-gradient(135deg, var(--accent) 0%, rgba(122,167,255,1) 100%); color:white; border:none; cursor:pointer;">Log Meal</button>
      </div>
    `;

    dietCard.insertAdjacentHTML("afterend", mealSelectorHTML);

    // Wire the log button
    const logBtn = document.getElementById("quickMealLogBtn");
    const selector = document.getElementById("quickMealSelector");

    if (logBtn && selector) {
      logBtn.addEventListener("click", () => {
        const slotId = selector.value;
        if (!slotId) return;

        const slot = slots[slotId];
        const template = templatesById.get(slot.templateId);

        if (!template) {
          alert("Meal template not found");
          return;
        }

        const today = isoToday();
        const CAL_ID = "diet_calories_kcal";
        const PRO_ID = "diet_protein_g";

        // Get existing values for today
        const existingCal = getMetricEntry(CAL_ID, today);
        const existingPro = getMetricEntry(PRO_ID, today);

        const currentCal = existingCal ? Number(existingCal.value) : 0;
        const currentPro = existingPro ? Number(existingPro.value) : 0;

        // Add meal macros
        const newCal = currentCal + (Number(template.calories) || 0);
        const newPro = currentPro + (Number(template.protein) || 0);

        // Save updated values
        const now = LifeOSDB.nowISO();

        LifeOSDB.upsert("metricEntries", {
          id: `m_${CAL_ID}_${today}`,
          metricId: CAL_ID,
          date: today,
          value: newCal,
          note: "",
          createdAt: existingCal ? existingCal.createdAt : now,
          updatedAt: now,
        });

        LifeOSDB.upsert("metricEntries", {
          id: `m_${PRO_ID}_${today}`,
          metricId: PRO_ID,
          date: today,
          value: newPro,
          note: "",
          createdAt: existingPro ? existingPro.createdAt : now,
          updatedAt: now,
        });

        // Also save to dietLogs collection so it appears in Log tab
        const dietLogId = `diet_${today}`;
        const existingLog = LifeOSDB.getCollection("dietLogs")?.find(l => l.date === today);

        const newItem = {
          slotId: slotId,
          templateId: template.id,
          servings: slot.servings || 1,
          source: "quick-log",
          createdAt: now,
        };

        const updatedItems = existingLog ? [...existingLog.items, newItem] : [newItem];

        LifeOSDB.upsert("dietLogs", {
          id: dietLogId,
          date: today,
          goal: activePlanId,
          items: updatedItems,
          totals: { calories: newCal, protein: newPro },
          createdAt: existingLog?.createdAt || now,
          updatedAt: now,
        });

        // Dispatch events
        document.dispatchEvent(new CustomEvent("lifeos:metrics-updated", {
          detail: { metricId: CAL_ID, date: today, value: newCal }
        }));

        // Reset selector and refresh view
        selector.value = "";
        renderTodayDiet();

        // Show success feedback
        logBtn.textContent = "✓ Logged!";
        logBtn.style.background = "#22c55e";
        setTimeout(() => {
          const btn = document.getElementById("quickMealLogBtn");
          if (btn) {
            btn.textContent = "Log Meal";
            btn.style.background = "linear-gradient(135deg, var(--accent) 0%, rgba(122,167,255,1) 100%)";
          }
        }, 1500);
      });
    }
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
  const container = document.getElementById("todayWorkCard");
  if (!container) return;

  const today = isoToday();
  const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
  const todayLog = logs.find((l) => l && l.date === today) || null;

  // Calculate times
  const todayMinutes = todayLog ? Number(todayLog.minutes) || 0 : 0;
  const startTime = todayLog?.startTime || null;
  const endTime = todayLog?.endTime || null;
  const isActive = startTime && !endTime;

  // Week data
  const weekStart = startOfWeekMondayISO(today);
  const weekData = [];
  let weekTotal = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(weekStart, i);
    const log = logs.find((l) => l && l.date === date);
    const minutes = log ? Number(log.minutes) || 0 : 0;
    weekTotal += minutes;
    weekData.push({
      date,
      minutes,
      hours: minutes / 60,
      isToday: date === today
    });
  }

  // Month data
  const monthStart = today.slice(0, 8) + '01';
  const daysInMonth = new Date(today.slice(0, 4), today.slice(5, 7), 0).getDate();

  const monthData = [];
  let monthTotal = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const date = addDaysISO(monthStart, i);
    const log = logs.find((l) => l && l.date === date);
    const minutes = log ? Number(log.minutes) || 0 : 0;
    monthTotal += minutes;
    monthData.push({
      date,
      day: new Date(date + 'T00:00:00').getDate(),
      minutes,
      hours: minutes / 60,
      isToday: date === today
    });
  }

  const maxWeekHours = Math.max(...weekData.map(d => d.hours), 1);
  const maxMonthHours = Math.max(...monthData.map(d => d.hours), 1);

  container.innerHTML = `
    <div class="dashboard-card-header">
      <div class="dashboard-card-title">Work</div>
      <a href="#work" class="dashboard-card-action">View all</a>
    </div>
    <div class="dashboard-tabs">
      <button class="dashboard-tab active" data-tab="day">Day</button>
      <button class="dashboard-tab" data-tab="week">Week</button>
      <button class="dashboard-tab" data-tab="month">Month</button>
    </div>
    <div class="dashboard-content-container">
      <!-- DAY PANEL -->
      <div class="dashboard-content-panel active" data-panel="day">
        <div class="work-timer-card">
          <div class="work-timer-display">
            <div class="work-timer-hours">${fmtHoursFromMinutes(todayMinutes)}</div>
            <div class="work-timer-label">Today</div>
          </div>
          ${isActive ? `
            <div class="work-timer-status active">
              <div class="work-timer-pulse"></div>
              <div>Active since ${startTime}</div>
            </div>
          ` : startTime && endTime ? `
            <div class="work-timer-status">
              <div>${startTime} – ${endTime}</div>
            </div>
          ` : `
            <div class="work-timer-status inactive">
              <div>Not started</div>
            </div>
          `}
        </div>

        <div class="work-actions">
          ${!startTime ? `
            <button class="work-btn work-btn-primary" onclick="clockIn()">
              🕐 Clock In
            </button>
          ` : !endTime ? `
            <button class="work-btn work-btn-danger" onclick="clockOut()">
              ⏹ Clock Out
            </button>
          ` : `
            <button class="work-btn work-btn-secondary" onclick="resetWorkDay()">
              🔄 Reset
            </button>
          `}
        </div>

        <div class="work-quick-adjust">
          <div style="font-size:13px; color:var(--muted); margin-bottom:8px; font-weight:600;">Quick Adjust</div>
          <div style="display:flex; gap:8px;">
            <button class="work-btn-small" onclick="adjustWorkTime(-30)">-30m</button>
            <button class="work-btn-small" onclick="adjustWorkTime(30)">+30m</button>
            <button class="work-btn-small" onclick="adjustWorkTime(60)">+1h</button>
          </div>
        </div>

        <div style="margin-top:16px; padding:12px; background:var(--surface-2); border-radius:var(--radius-sm); border:1px solid var(--border);">
          <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">This Week</div>
          <div style="font-size:20px; font-weight:700;">${fmtHoursFromMinutes(weekTotal)}</div>
        </div>
      </div>

      <!-- WEEK PANEL -->
      <div class="dashboard-content-panel" data-panel="week">
        <div style="margin-bottom:16px;">
          <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">Week Total</div>
          <div style="font-size:24px; font-weight:700;">${fmtHoursFromMinutes(weekTotal)}</div>
          <div style="font-size:12px; color:var(--muted); margin-top:2px;">Average: ${fmtHoursFromMinutes(weekTotal / 7)} per day</div>
        </div>

        <div class="work-chart">
          ${weekData.map(day => {
            const d = new Date(day.date + 'T00:00:00');
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[d.getDay()];
            const height = (day.hours / maxWeekHours) * 100;
            const color = day.isToday ? '#4f8cff' : day.hours > 0 ? '#22c55e' : '#64748b';

            return `
              <div class="work-bar-container">
                <div class="work-bar-wrapper">
                  <div class="work-bar" style="height:${height}%; background:${color};" title="${day.hours.toFixed(1)}h">
                    ${day.hours > 0 ? `<div class="work-bar-label">${day.hours.toFixed(1)}</div>` : ''}
                  </div>
                </div>
                <div class="work-bar-day ${day.isToday ? 'today' : ''}">${dayName}</div>
                <div class="work-bar-date">${d.getDate()}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- MONTH PANEL -->
      <div class="dashboard-content-panel" data-panel="month">
        <div style="margin-bottom:16px;">
          <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">Month Total</div>
          <div style="font-size:24px; font-weight:700;">${fmtHoursFromMinutes(monthTotal)}</div>
          <div style="font-size:12px; color:var(--muted); margin-top:2px;">
            ${monthStart.slice(0, 7)} • ${daysInMonth} days • Average: ${fmtHoursFromMinutes(monthTotal / daysInMonth)} per day
          </div>
        </div>

        <div class="work-month-chart">
          ${monthData.map(day => {
            const height = maxMonthHours > 0 ? (day.hours / maxMonthHours) * 100 : 0;
            const color = day.isToday ? '#4f8cff' : day.hours > 0 ? '#22c55e' : '#64748b';

            return `
              <div class="work-month-bar-container" title="${day.date}: ${day.hours.toFixed(1)}h">
                <div class="work-month-bar-wrapper">
                  <div class="work-month-bar" style="height:${height}%; background:${color};"></div>
                </div>
                <div class="work-month-day ${day.isToday ? 'today' : ''}">${day.day}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // Wire tab switching
  const tabs = container.querySelectorAll(".dashboard-tab");
  const panels = container.querySelectorAll(".dashboard-content-panel");
  const contentContainer = container.querySelector(".dashboard-content-container");

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const panel = panels[index];
      if (panel && contentContainer) {
        contentContainer.scrollTo({
          left: panel.offsetLeft,
          behavior: "smooth"
        });
      }
    });
  });

  // Scroll sync
  let scrollTimeout;
  contentContainer.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollLeft = contentContainer.scrollLeft;
      const containerWidth = contentContainer.offsetWidth;
      const activeIndex = Math.round(scrollLeft / containerWidth);

      tabs.forEach((tab, index) => {
        if (index === activeIndex) {
          tab.classList.add("active");
        } else {
          tab.classList.remove("active");
        }
      });
    }, 50);
  });
}

// Global work functions
window.clockIn = function() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const startTime = prompt("Clock in time?", currentTime);
  if (!startTime) return;

  const today = isoToday();
  const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
  const existing = logs.find((l) => l && l.date === today);

  LifeOSDB.upsert("workLogs", {
    id: `work_${today}`,
    date: today,
    startTime,
    endTime: null,
    minutes: existing ? existing.minutes : 0,
    note: existing ? existing.note : "",
    createdAt: existing ? existing.createdAt : LifeOSDB.nowISO(),
    updatedAt: LifeOSDB.nowISO(),
  });

  renderTodayWork();
  document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
};

window.clockOut = function() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const endTime = prompt("Clock out time?", currentTime);
  if (!endTime) return;

  const today = isoToday();
  const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
  const existing = logs.find((l) => l && l.date === today);

  if (!existing || !existing.startTime) return;

  // Calculate minutes
  const [startH, startM] = existing.startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const totalMinutes = endMinutes - startMinutes;

  LifeOSDB.upsert("workLogs", {
    ...existing,
    endTime,
    minutes: totalMinutes > 0 ? totalMinutes : 0,
    updatedAt: LifeOSDB.nowISO(),
  });

  renderTodayWork();
  document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
};

window.resetWorkDay = function() {
  if (!confirm("Reset today's work log?")) return;

  const today = isoToday();
  const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
  const existing = logs.find((l) => l && l.date === today);

  if (existing) {
    LifeOSDB.upsert("workLogs", {
      ...existing,
      startTime: null,
      endTime: null,
      minutes: 0,
      updatedAt: LifeOSDB.nowISO(),
    });
  }

  renderTodayWork();
  document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
};

window.adjustWorkTime = function(deltaMinutes) {
  const today = isoToday();
  const logs = (LifeOSDB.getCollection("workLogs") || []).filter(Boolean);
  const existing = logs.find((l) => l && l.date === today);

  const prevMin = existing ? Number(existing.minutes) || 0 : 0;
  const nextMin = Math.max(0, prevMin + deltaMinutes);

  LifeOSDB.upsert("workLogs", {
    id: `work_${today}`,
    date: today,
    minutes: nextMin,
    startTime: existing ? existing.startTime : null,
    endTime: existing ? existing.endTime : null,
    note: existing ? existing.note : "",
    createdAt: existing ? existing.createdAt : LifeOSDB.nowISO(),
    updatedAt: LifeOSDB.nowISO(),
  });

  renderTodayWork();
  document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
};

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
     Today: Plan (Swipeable Card)
     ------------------------- */

  function renderTodayPlan() {
    const container = document.getElementById("todayPlanCard");
    if (!container) return;

    const today = isoToday();
    const weekStart = startOfWeekMondayISO(today);

    // Get today's items
    const todayItems = LifeOSDB.getCollection("planItems")
      .filter((p) => p.date === today)
      .slice()
      .sort((a, b) => {
        // Sort by time if available, otherwise by creation
        const aTime = a.startTime || "";
        const bTime = b.startTime || "";
        if (aTime && bTime) return aTime.localeCompare(bTime);
        if (aTime && !bTime) return -1;
        if (!aTime && bTime) return 1;
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });

    // Get week data for all 7 days
    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysISO(weekStart, i);
      const items = LifeOSDB.getCollection("planItems").filter((p) => p.date === date);
      const totalItems = items.length;
      const doneItems = items.filter((p) => p.status === "done").length;
      weekData.push({ date, totalItems, doneItems, isToday: date === today });
    }

    const goalsById = new Map(LifeOSDB.getCollection("goals").map((g) => [g.id, g]));

    // Category colors
    const categoryColors = {
      training: '#22c55e',
      health: '#3b82f6',
      work: '#f59e0b',
      admin: '#8b5cf6',
      social: '#ec4899',
      finance: '#10b981',
      rest: '#64748b'
    };

    container.innerHTML = `
      <div class="dashboard-card-header">
        <div class="dashboard-card-title">Plan</div>
        <a href="#plan" class="dashboard-card-action">View all</a>
      </div>
      <div class="dashboard-tabs">
        <button class="dashboard-tab active" data-tab="day">Day</button>
        <button class="dashboard-tab" data-tab="week">Week</button>
      </div>
      <div class="dashboard-content-container">
        <!-- DAY PANEL -->
        <div class="dashboard-content-panel active" data-panel="day">
          ${todayItems.length === 0 ? `
            <div class="revolut-empty-state">
              <div class="revolut-empty-icon">📅</div>
              <div class="revolut-empty-title">No plans for today</div>
              <div class="revolut-empty-description">Add items in the Plan tab</div>
            </div>
          ` : `
            <div class="timeline-container">
              ${todayItems.map((item) => {
                const done = item.status === "done";
                const goalTitle = item.goalId ? (goalsById.get(item.goalId)?.title || "") : "";
                const timeText = formatTimeRange(item);
                const color = categoryColors[item.category] || '#64748b';
                const actualTime = item.actualStartTime && item.actualEndTime
                  ? `${item.actualStartTime}–${item.actualEndTime}`
                  : null;
                const variance = item.actualStartTime && item.startTime
                  ? calculateTimeVariance(item.startTime, item.actualStartTime)
                  : null;

                return `
                  <div class="timeline-item ${done ? 'done' : ''}" data-item-id="${item.id}">
                    <div class="timeline-marker" style="background:${done ? '#22c55e' : color};"></div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <div class="timeline-time">${timeText || 'Unscheduled'}</div>
                        <div class="timeline-category" style="background:${color}20; color:${color};">
                          ${escapeHTML(item.category)}
                        </div>
                      </div>
                      <div class="timeline-title ${done ? 'done' : ''}">${escapeHTML(item.title)}</div>
                      ${goalTitle ? `<div class="timeline-goal">🎯 ${escapeHTML(goalTitle)}</div>` : ''}
                      ${actualTime ? `
                        <div class="timeline-actual">
                          Actual: ${escapeHTML(actualTime)}
                          ${variance ? `<span style="color:${variance.late ? '#ef4444' : '#22c55e'}; margin-left:6px;">
                            ${variance.late ? '⏰' : '✓'} ${variance.text}
                          </span>` : ''}
                        </div>
                      ` : ''}
                      <div class="timeline-actions">
                        <button class="timeline-btn-small" onclick="togglePlanItem('${item.id}')">${done ? 'Undo' : '✓ Done'}</button>
                        ${!done && !actualTime ? `<button class="timeline-btn-small" onclick="logActualTime('${item.id}')">⏱ Log time</button>` : ''}
                        <button class="timeline-btn-small timeline-btn-danger" onclick="deletePlanItem('${item.id}')">Delete</button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="margin-top:16px; padding:12px; background:var(--surface-2); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:13px; color:var(--muted);">Progress</div>
                <div style="font-size:14px; font-weight:600;">
                  ${todayItems.filter(i => i.status === 'done').length} / ${todayItems.length} completed
                </div>
              </div>
              <div class="revolut-progress" style="margin-top:8px;">
                <div class="revolut-progress-fill" style="width:${todayItems.length > 0 ? (todayItems.filter(i => i.status === 'done').length / todayItems.length * 100) : 0}%;"></div>
              </div>
            </div>
          `}
        </div>

        <!-- WEEK PANEL -->
        <div class="dashboard-content-panel" data-panel="week">
          <div class="week-grid">
            ${weekData.map(day => {
              const d = new Date(day.date + 'T00:00:00');
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const dayName = dayNames[d.getDay()];
              const dayNumber = d.getDate();
              const completionRate = day.totalItems > 0 ? (day.doneItems / day.totalItems * 100) : 0;

              return `
                <div class="week-day-card ${day.isToday ? 'today' : ''}">
                  <div class="week-day-header">
                    <div class="week-day-name">${dayName}</div>
                    <div class="week-day-number">${dayNumber}</div>
                  </div>
                  <div class="week-day-stats">
                    ${day.totalItems === 0 ? `
                      <div style="font-size:12px; color:var(--muted); text-align:center;">No plans</div>
                    ` : `
                      <div style="font-size:20px; font-weight:700; text-align:center;">${day.totalItems}</div>
                      <div style="font-size:11px; color:var(--muted); text-align:center;">
                        ${day.doneItems} done
                      </div>
                      <div style="height:4px; background:var(--surface-2); border-radius:2px; margin-top:6px;">
                        <div style="height:100%; width:${completionRate}%; background:#22c55e; border-radius:2px; transition:width 0.3s ease;"></div>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="margin-top:16px; padding:12px; background:var(--surface-2); border-radius:var(--radius-sm); border:1px solid var(--border); text-align:center;">
            <div style="font-size:13px; color:var(--muted); margin-bottom:8px;">Weekly Summary</div>
            <div style="display:flex; justify-content:space-around; gap:16px;">
              <div>
                <div style="font-size:24px; font-weight:700;">${weekData.reduce((sum, d) => sum + d.totalItems, 0)}</div>
                <div style="font-size:11px; color:var(--muted);">Total items</div>
              </div>
              <div>
                <div style="font-size:24px; font-weight:700; color:#22c55e;">${weekData.reduce((sum, d) => sum + d.doneItems, 0)}</div>
                <div style="font-size:11px; color:var(--muted);">Completed</div>
              </div>
              <div>
                <div style="font-size:24px; font-weight:700; color:#f59e0b;">${weekData.reduce((sum, d) => sum + (d.totalItems - d.doneItems), 0)}</div>
                <div style="font-size:11px; color:var(--muted);">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire tab switching
    const tabs = container.querySelectorAll(".dashboard-tab");
    const panels = container.querySelectorAll(".dashboard-content-panel");
    const contentContainer = container.querySelector(".dashboard-content-container");

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const panel = panels[index];
        if (panel && contentContainer) {
          contentContainer.scrollTo({
            left: panel.offsetLeft,
            behavior: "smooth"
          });
        }
      });
    });

    // Scroll sync
    let scrollTimeout;
    contentContainer.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = contentContainer.scrollLeft;
        const containerWidth = contentContainer.offsetWidth;
        const activeIndex = Math.round(scrollLeft / containerWidth);

        tabs.forEach((tab, index) => {
          if (index === activeIndex) {
            tab.classList.add("active");
          } else {
            tab.classList.remove("active");
          }
        });
      }, 50);
    });
  }

  // Helper function to calculate time variance
  function calculateTimeVariance(plannedTime, actualTime) {
    const [pH, pM] = plannedTime.split(':').map(Number);
    const [aH, aM] = actualTime.split(':').map(Number);

    const plannedMinutes = pH * 60 + pM;
    const actualMinutes = aH * 60 + aM;
    const diff = actualMinutes - plannedMinutes;

    if (diff === 0) return { late: false, text: 'On time' };

    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff / 60);
    const mins = absDiff % 60;

    let text = '';
    if (hours > 0) text += `${hours}h `;
    if (mins > 0 || hours === 0) text += `${mins}m`;
    text = text.trim() + (diff > 0 ? ' late' : ' early');

    return { late: diff > 0, text };
  }

  // Global functions for button clicks
  window.togglePlanItem = function(id) {
    const item = LifeOSDB.getCollection("planItems").find(p => p.id === id);
    if (!item) return;

    const newStatus = item.status === "done" ? "planned" : "done";
    LifeOSDB.upsert("planItems", { ...item, status: newStatus });
    renderTodayPlan();
  };

  window.deletePlanItem = function(id) {
    if (!confirm("Delete this plan item?")) return;
    LifeOSDB.remove("planItems", id);
    renderTodayPlan();
  };

  window.logActualTime = function(id) {
    const item = LifeOSDB.getCollection("planItems").find(p => p.id === id);
    if (!item) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const actualStart = prompt(`Start time for "${item.title}"?`, item.actualStartTime || currentTime);
    if (!actualStart) return;

    const actualEnd = prompt(`End time for "${item.title}"?`, item.actualEndTime || currentTime);
    if (!actualEnd) return;

    LifeOSDB.upsert("planItems", {
      ...item,
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
      status: "done"
    });

    renderTodayPlan();
  };

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

    renderTodayPlan();

    // Re-render when returning to Today (no re-wiring here)
    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#today") {
        renderTodayGoals();
        renderTodayDiet();
        renderTodayWork();
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
