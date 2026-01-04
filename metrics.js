/* =========================
   metrics.js — Metrics v1
   - Bodyweight
   - Sleep (hours + quality)
   - Body composition (fat%, water%, bone metric)
   - Measurements (waist/chest/shoulders/thigh/biceps)
   - Diet (calories + protein)
   ========================= */

(function () {
  const METRICS = {
    // existing
    bodyweight: { id: "bodyweight", name: "Bodyweight", unit: "kg", type: "number", sourceModule: "health" },
    leanMass: { id: "lean_mass_kg", name: "Lean mass", unit: "kg", type: "number", sourceModule: "health", calculated: true },
    sleepHours: { id: "sleep_hours", name: "Sleep duration", unit: "hours", type: "number", sourceModule: "health" },
   sleepQuality: { id: "sleep_quality", name: "Sleep quality", unit: "1–100", type: "number", sourceModule: "health" },

    // body composition
    bodyFat: { id: "body_fat_pct", name: "Body fat", unit: "%", type: "number", sourceModule: "health" },
    bodyWater: { id: "body_water_pct", name: "Body water", unit: "%", type: "number", sourceModule: "health" },
    boneMetric: { id: "bone_metric", name: "Bone metric", unit: "%", type: "number", sourceModule: "health" },

    // measurements (cm)
    waist: { id: "waist_cm", name: "Waist", unit: "cm", type: "number", sourceModule: "health" },
    chest: { id: "chest_cm", name: "Chest", unit: "cm", type: "number", sourceModule: "health" },
    shoulders: { id: "shoulders_cm", name: "Shoulders", unit: "cm", type: "number", sourceModule: "health" },
    thigh: { id: "thigh_cm", name: "Thigh", unit: "cm", type: "number", sourceModule: "health" },
    biceps: { id: "biceps_cm", name: "Biceps", unit: "cm", type: "number", sourceModule: "health" },

    // diet
    calories: { id: "diet_calories_kcal", name: "Calories", unit: "kcal", type: "number", sourceModule: "health" },
    protein: { id: "diet_protein_g", name: "Protein", unit: "g", type: "number", sourceModule: "health" },
  };

  function ensureMetricDefinition(def) {
    const defs = LifeOSDB.getCollection("metricDefinitions");
    const exists = defs.find((d) => d.id === def.id);
    if (exists) return;

    LifeOSDB.upsert("metricDefinitions", {
      id: def.id,
      name: def.name,
      unit: def.unit,
      type: def.type,
      aggregation: "latest",
      sourceModule: def.sourceModule,
      createdAt: LifeOSDB.nowISO(),
    });
  }

  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function getEntries(metricId) {
    return LifeOSDB.getCollection("metricEntries").filter((e) => e.metricId === metricId);
  }

  function upsertEntry(metricId, date, value) {
  const id = `m_${metricId}_${date}`;
  const now = LifeOSDB.nowISO();

  LifeOSDB.upsert("metricEntries", {
    id,
    metricId,
    date,
    value,
    note: "",
    createdAt: now,
    updatedAt: now,
  });

  // Dispatch event so other modules (e.g., goals) can react to metric updates
  document.dispatchEvent(new CustomEvent("lifeos:metrics-updated", { detail: { metricId, date, value } }));
}
function removeEntry(entry) {
  if (entry && entry.id) {
    LifeOSDB.remove("metricEntries", entry.id);
    document.dispatchEvent(new CustomEvent("lifeos:metrics-updated"));
    return;
  }

  // Legacy fallback: remove by metricId+date if id is missing
  if (!entry || !entry.metricId || !entry.date) return;

  const all = LifeOSDB.getCollection("metricEntries");
  const next = all.filter((e) => {
    if (!e) return false;
    if (e.id) return true; // keep all id-based entries
    return !(e.metricId === entry.metricId && e.date === entry.date && e.value === entry.value);
  });

  LifeOSDB.setCollection("metricEntries", next);
  LifeOSDB.touchMeta();
  document.dispatchEvent(new CustomEvent("lifeos:metrics-updated"));
}

  function findEntryByDate(metricId, date) {
    return getEntries(metricId).find((e) => e.date === date) || null;
  }

  function latestEntry(metricId) {
    const arr = getEntries(metricId).slice().sort((a, b) => b.date.localeCompare(a.date));
    return arr[0] || null;
  }

  /* -------------------------
     Auto-calculate lean mass
     ------------------------- */
  function calculateAndSaveLeanMass(date) {
    const weight = findEntryByDate(METRICS.bodyweight.id, date);
    const bodyFat = findEntryByDate(METRICS.bodyFat.id, date);

    if (!weight || !bodyFat) return;

    const w = Number(weight.value);
    const bf = Number(bodyFat.value);

    if (!Number.isFinite(w) || !Number.isFinite(bf)) return;

    // Calculate lean mass: weight × (1 - bodyfat% / 100)
    const leanMass = w * (1 - bf / 100);

    // Save as metric entry
    upsertEntry(METRICS.leanMass.id, date, Number(leanMass.toFixed(2)));
  }

  /* -------------------------
     Bodyweight UI
     ------------------------- */

  function renderBodyweightList() {
    const list = document.getElementById("bodyweightList");
    if (!list) return;

    const entries = getEntries(METRICS.bodyweight.id).sort((a, b) => b.date.localeCompare(a.date));

    list.innerHTML = "";
    if (entries.length === 0) {
      list.innerHTML = "<li style='color:var(--muted);'>No entries yet.</li>";
      return;
    }

    entries.forEach((e) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      li.innerHTML = `
        <span>${e.date}: <strong>${e.value} kg</strong></span>
        <button type="button">Delete</button>
      `;

      li.querySelector("button").addEventListener("click", () => {
        removeEntry(e);
        renderBodyweightList();
        renderBodyCompList();
        renderLeanMassHint();
        renderDietHint();
      });

      list.appendChild(li);
    });
  }

  function wireBodyweightForm() {
    const form = document.getElementById("bodyweightForm");
    if (!form) return;

    const dateInput = document.getElementById("bwDate");
    const valueInput = document.getElementById("bwValue");

    dateInput.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = dateInput.value;
      const value = Number(valueInput.value);
      if (!date || !Number.isFinite(value)) return;

      upsertEntry(METRICS.bodyweight.id, date, value);
      calculateAndSaveLeanMass(date); // Auto-calculate lean mass

      valueInput.value = "";
      renderBodyweightList();
      renderLeanMassHint();
      renderDietHint();
      renderBodyCompProgress(); // Update progress charts
    });
  }

  /* -------------------------
     Sleep UI
     ------------------------- */

  function renderSleepList() {
    console.log('[Sleep] Rendering sleep list...');
    const list = document.getElementById("sleepList");
    if (!list) {
      console.warn('[Sleep] sleepList element not found');
      return;
    }

    const hoursEntries = getEntries(METRICS.sleepHours.id).sort((a, b) => b.date.localeCompare(a.date));
    const qualityEntries = getEntries(METRICS.sleepQuality.id).sort((a, b) => b.date.localeCompare(a.date));
    console.log('[Sleep] Found', hoursEntries.length, 'hour entries and', qualityEntries.length, 'quality entries');

    const qualityByDate = new Map();
    qualityEntries.forEach((e) => qualityByDate.set(e.date, e));

    list.innerHTML = "";

    if (hoursEntries.length === 0 && qualityEntries.length === 0) {
      list.innerHTML = "<li style='color:var(--muted);'>No sleep entries yet.</li>";
      return;
    }

    const dates = new Set();
    hoursEntries.forEach((e) => dates.add(e.date));
    qualityEntries.forEach((e) => dates.add(e.date));

    const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((date) => {
      const hours = hoursEntries.find((e) => e.date === date) || null;
      const quality = qualityByDate.get(date) || null;

      const hoursText = hours ? `${hours.value}h` : "—";
      const qualityText = quality ? `${quality.value}%` : "—";
      const qualityValue = quality ? Number(quality.value) : 0;

      // Quality color coding
      let qualityColor = '#64748b'; // gray default
      if (qualityValue >= 80) qualityColor = '#22c55e'; // green
      else if (qualityValue >= 60) qualityColor = '#f59e0b'; // amber
      else if (qualityValue > 0) qualityColor = '#ef4444'; // red

      // Sleep duration indicator
      const hoursValue = hours ? Number(hours.value) : 0;
      let durationColor = '#64748b'; // gray default
      if (hoursValue < 5 && hoursValue > 0) durationColor = '#ef4444'; // severe lack of sleep - RED
      else if (hoursValue >= 7 && hoursValue <= 9) durationColor = '#22c55e'; // ideal - GREEN
      else if ((hoursValue >= 5 && hoursValue < 7) || (hoursValue > 9 && hoursValue <= 10)) durationColor = '#f59e0b'; // acceptable but not ideal - AMBER
      else if (hoursValue > 10) durationColor = '#ef4444'; // too much sleep - RED

      const li = document.createElement("li");
      li.className = "revolut-card";
      li.style.padding = "16px";
      li.style.marginBottom = "10px";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "12px";

      li.innerHTML = `
        <div style="flex:1;">
          <div style="font-size:14px; font-weight:600; margin-bottom:6px;">${date}</div>
          <div style="display:flex; gap:16px; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:18px; font-weight:700; color:${durationColor};">${hoursText}</span>
              <span style="font-size:12px; color:var(--muted);">duration</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:18px; font-weight:700; color:${qualityColor};">${qualityText}</span>
              <span style="font-size:12px; color:var(--muted);">quality</span>
            </div>
          </div>
        </div>
        <button type="button" data-del-entry="${date}" style="padding:8px 14px; font-size:13px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); cursor:pointer; white-space:nowrap;">Delete</button>
      `;

      const delBtn = li.querySelector("[data-del-entry]");
      delBtn.addEventListener("click", () => {
        if (!confirm(`Delete sleep entry for ${date}?`)) return;
        if (hours) removeEntry(hours);
        if (quality) removeEntry(quality);
        renderSleepList();
        renderSleepInsights();
      });

      list.appendChild(li);
    });
  }
  // -------------------------
  // Sleep insights (Last night, streaks, chart, averages)
  // -------------------------

  function toISODateLocal(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isoDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toISODateLocal(d);
  }

  function getSleepSeriesByDay() {
    const entries = LifeOSDB.getCollection("metricEntries") || [];
    const byDate = new Map(); // date -> {date, hours, quality}

    for (const e of entries) {
      if (!e || !e.metricId || !e.date) continue;

      if (e.metricId === METRICS.sleepHours.id) {
        const obj = byDate.get(e.date) || { date: e.date, hours: null, quality: null };
        obj.hours = Number(e.value);
        byDate.set(e.date, obj);
      }

      if (e.metricId === METRICS.sleepQuality.id) {
        const obj = byDate.get(e.date) || { date: e.date, hours: null, quality: null };
        obj.quality = Number(e.value);
        byDate.set(e.date, obj);
      }
    }

    const series = Array.from(byDate.values())
      .filter(x => x.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    return series;
  }

  function dayLogged(x) {
    // count as logged if either value exists (practical + forgiving)
    const h = Number(x.hours);
    const q = Number(x.quality);
    return Number.isFinite(h) || Number.isFinite(q);
  }

  function computeCurrentStreak(series) {
    // streak ending at today or yesterday depending on latest entry
    if (!series.length) return 0;

    const loggedDates = series.filter(dayLogged).map(x => x.date);
    if (loggedDates.length === 0) return 0;

    const set = new Set(loggedDates);

    // define "today" in local date, and allow streak to end on today or yesterday
    const today = isoDaysAgo(0);
    const yesterday = isoDaysAgo(1);

    let end = set.has(today) ? today : (set.has(yesterday) ? yesterday : null);
    if (!end) return 0;

    let streak = 0;
    let cursor = new Date(end + "T00:00:00");
    while (true) {
      const key = toISODateLocal(cursor);
      if (!set.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function computeLongestStreak(series) {
    if (!series.length) return 0;
    const loggedDates = series.filter(dayLogged).map(x => x.date).sort();
    if (loggedDates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < loggedDates.length; i++) {
      const prev = new Date(loggedDates[i - 1] + "T00:00:00");
      const cur = new Date(loggedDates[i] + "T00:00:00");
      const diffDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current += 1;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }
    return longest;
  }

  function renderSleepLogSummary(series) {
    const lastNightEl = document.getElementById("sleepLastNight");
    const streakEl = document.getElementById("sleepCurrentStreak");
    if (!lastNightEl && !streakEl) return;

    const lastNightDate = isoDaysAgo(1);
    const lastNight = series.find(x => x.date === lastNightDate);

    if (lastNightEl) {
      if (!lastNight || (!Number.isFinite(lastNight.hours) && !Number.isFinite(lastNight.quality))) {
        lastNightEl.textContent = "No entry for last night";
      } else {
        const h = Number.isFinite(lastNight.hours) ? `${lastNight.hours.toFixed(1)}h` : "—";
        const q = Number.isFinite(lastNight.quality) ? `${Math.round(lastNight.quality)}/100` : "—";
        lastNightEl.textContent = `${h} • ${q}`;
      }
    }

    if (streakEl) {
      const s = computeCurrentStreak(series);
      streakEl.textContent = s === 0 ? "—" : `${s} day${s === 1 ? "" : "s"}`;
    }
  }

  function avg(nums) {
    const xs = nums.filter(n => Number.isFinite(n));
    if (xs.length === 0) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  function drawSleepChart(filtered) {
    const canvas = document.getElementById("sleepChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";

    const cssW = canvas.clientWidth || 300;
    const cssH = 260;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.scale(dpr, dpr);

    const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    const textColor = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
    const mutedColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";

    // clear
    ctx.clearRect(0, 0, cssW, cssH);

    // padding - more space at bottom for legend and dates
    const padL = 50, padR = 50, padT = 20, padB = 50;
    const w = cssW - padL - padR;
    const h = cssH - padT - padB;

    if (!filtered || filtered.length < 2) {
      ctx.fillStyle = textColor;
      ctx.font = "13px " + getComputedStyle(document.body).fontFamily;
      ctx.fillText("Log at least 2 sleep entries to see a trend.", padL + 10, padT + 24);
      return;
    }

    // Calculate trend for hours
    const hoursVals = filtered.map(x => x.hours).filter(n => Number.isFinite(n));
    const firstHours = hoursVals[0];
    const lastHours = hoursVals[hoursVals.length - 1];
    const hoursTrendPositive = lastHours >= firstHours;

    // Line colors based on trend
    const hoursLineColor = hoursTrendPositive ? "#22c55e" : "#ef4444"; // green : red
    const hoursShadowColor = hoursTrendPositive ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)";
    const qualityLineColor = "#78dca0";

    // scales
    const maxHours = Math.max(8, Math.min(24, Math.ceil((hoursVals.length ? Math.max(...hoursVals) : 8) + 1)));
    const minHours = 0;
    const hoursRange = maxHours - minHours;

    const xFor = (i) => padL + (i * (w / (filtered.length - 1)));
    const yForHours = (v) => padT + h - ((v - minHours) / hoursRange) * h;
    const yForQuality = (v) => padT + h - ((v / 100) * h);

    // Axis + grid
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + h);
    ctx.lineTo(padL + w, padT + h);
    ctx.strokeStyle = gridColor;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Y-axis labels (left side - hours)
    ctx.font = "11px " + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "right";
    ctx.fillText(`${maxHours}h`, padL - 8, padT + 10);
    ctx.fillText(`${Math.round(maxHours / 2)}h`, padL - 8, padT + h / 2 + 4);
    ctx.fillText("0h", padL - 8, padT + h + 4);

    // Y-axis labels (right side - quality %)
    ctx.textAlign = "left";
    ctx.fillText("100%", padL + w + 8, padT + 10);
    ctx.fillText("50%", padL + w + 8, padT + h / 2 + 4);
    ctx.fillText("0%", padL + w + 8, padT + h + 4);

    // Draw shadow/fill area under hours line
    const hoursPoints = [];
    filtered.forEach((p, i) => {
      if (Number.isFinite(p.hours)) {
        hoursPoints.push({ x: xFor(i), y: yForHours(p.hours), value: p.hours });
      }
    });

    if (hoursPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(hoursPoints[0].x, hoursPoints[0].y);

      hoursPoints.forEach(pt => {
        ctx.lineTo(pt.x, pt.y);
      });

      // Close the path to baseline
      ctx.lineTo(hoursPoints[hoursPoints.length - 1].x, padT + h);
      ctx.lineTo(hoursPoints[0].x, padT + h);
      ctx.closePath();

      // Fill with gradient shadow
      const gradient = ctx.createLinearGradient(0, padT, 0, padT + h);
      gradient.addColorStop(0, hoursShadowColor);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw main hours line
      ctx.beginPath();
      hoursPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = hoursLineColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Draw points
      hoursPoints.forEach(pt => {
        // Outer circle (shadow)
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = hoursLineColor;
        ctx.fill();
      });
    }

    // Quality line (lighter, secondary)
    const qualityPoints = [];
    filtered.forEach((p, i) => {
      if (Number.isFinite(p.quality)) {
        qualityPoints.push({ x: xFor(i), y: yForQuality(p.quality) });
      }
    });

    if (qualityPoints.length > 0) {
      ctx.beginPath();
      qualityPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = qualityLineColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Draw smaller points for quality
      qualityPoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = qualityLineColor;
        ctx.fill();
      });
    }

    // X-axis date labels
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "left";
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily;

    // Show first and last dates
    const firstDate = filtered[0].date;
    const lastDate = filtered[filtered.length - 1].date;

    // Format dates to be more readable (e.g., "Jan 3" instead of "2025-01-03")
    const formatDate = (dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    };

    ctx.fillText(formatDate(firstDate), padL, padT + h + 18);
    ctx.textAlign = "right";
    ctx.fillText(formatDate(lastDate), padL + w, padT + h + 18);

    // Legend at bottom center
    ctx.textAlign = "center";
    ctx.font = "11px " + getComputedStyle(document.body).fontFamily;

    const legendY = padT + h + 35;
    const legendCenterX = padL + w / 2;

    // Hours legend item
    ctx.fillStyle = hoursLineColor;
    ctx.beginPath();
    ctx.arc(legendCenterX - 60, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.fillText(`Sleep Hours ${hoursTrendPositive ? '↗' : '↘'}`, legendCenterX - 54, legendY + 4);

    // Quality legend item
    ctx.fillStyle = qualityLineColor;
    ctx.beginPath();
    ctx.arc(legendCenterX + 30, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText("Quality %", legendCenterX + 36, legendY + 4);
  }

  let sleepRangeDays = 7;

  function renderSleepProgress(series) {
    const start = isoDaysAgo(sleepRangeDays);
    const filtered = series.filter(x => x.date >= start);

    drawSleepChart(filtered);

    const avgHours = avg(filtered.map(x => x.hours));
    const avgQual = avg(filtered.map(x => x.quality));

    const avgEl = document.getElementById("sleepAverages");
    if (avgEl) {
      const h = avgHours == null ? "—" : `${avgHours.toFixed(1)}h`;
      const q = avgQual == null ? "—" : `${Math.round(avgQual)}/100`;
      avgEl.textContent = `Avg (last ${sleepRangeDays} days): ${h} • ${q}`;
    }

    const longestEl = document.getElementById("sleepLongestStreak");
    if (longestEl) {
      const longest = computeLongestStreak(series);
      longestEl.textContent = longest === 0 ? "Longest streak: —" : `Longest streak: ${longest} day${longest === 1 ? "" : "s"}`;
    }
  }

  function wireSleepRangeButtons() {
    const btns = document.querySelectorAll(".sleep-range-btn");
    if (!btns.length) return;

    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.range);
        if (!Number.isFinite(n)) return;
        sleepRangeDays = n;

        btns.forEach(b => b.classList.toggle("active", b === btn));

        const series = getSleepSeriesByDay();
        renderSleepProgress(series);
      });
    });
  }

function renderSleepInsightsPanel(series) {
  const insightsEl = document.getElementById("sleepInsightsContent");
  if (!insightsEl) return;

  const logged = series.filter(dayLogged);

  if (logged.length < 3) {
    insightsEl.innerHTML = `
      <div style="color:var(--muted); text-align:center; padding:20px;">
        <div style="font-size:48px; margin-bottom:12px;">😴</div>
        <div>Log at least 3 nights of sleep to unlock insights.</div>
      </div>
    `;
    return;
  }

  // Calculate insights
  const hoursData = logged.map(x => x.hours).filter(h => Number.isFinite(h));
  const qualityData = logged.map(x => x.quality).filter(q => Number.isFinite(q));

  // Best and worst nights
  let bestNight = null, worstNight = null;
  logged.forEach(x => {
    if (!Number.isFinite(x.hours) || !Number.isFinite(x.quality)) return;
    const score = x.hours * (x.quality / 100); // Weighted score
    if (!bestNight || score > bestNight.score) {
      bestNight = { ...x, score };
    }
    if (!worstNight || score < worstNight.score) {
      worstNight = { ...x, score };
    }
  });

  // Consistency score (lower std dev = more consistent)
  const avgHours = hoursData.reduce((a, b) => a + b, 0) / hoursData.length;
  const variance = hoursData.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / hoursData.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev * 15))); // 15 is scaling factor

  // Sleep quality distribution
  const highQuality = qualityData.filter(q => q >= 80).length;
  const medQuality = qualityData.filter(q => q >= 60 && q < 80).length;
  const lowQuality = qualityData.filter(q => q < 60).length;

  // Ideal range adherence (7-9h)
  const idealSleep = hoursData.filter(h => h >= 7 && h <= 9).length;
  const idealPercentage = Math.round((idealSleep / hoursData.length) * 100);

  // Generate recommendations
  const recommendations = [];
  if (avgHours < 7) {
    recommendations.push("Try going to bed 30 minutes earlier to reach the recommended 7-9 hours.");
  } else if (avgHours > 9) {
    recommendations.push("You might be oversleeping. Consider maintaining 7-9 hours for optimal rest.");
  }

  if (stdDev > 1.5) {
    recommendations.push("Your sleep schedule varies significantly. Try keeping a consistent bedtime.");
  }

  if (qualityData.length > 0) {
    const avgQuality = qualityData.reduce((a, b) => a + b, 0) / qualityData.length;
    if (avgQuality < 70) {
      recommendations.push("Consider factors affecting sleep quality: room temperature, screen time, caffeine.");
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Great work! Your sleep patterns look healthy and consistent.");
  }

  insightsEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Consistency Score -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:600; color:var(--muted);">Consistency Score</span>
          <span style="font-size:18px; font-weight:700; color:${consistencyScore >= 75 ? '#22c55e' : consistencyScore >= 50 ? '#f59e0b' : '#ef4444'};">${Math.round(consistencyScore)}%</span>
        </div>
        <div style="height:8px; background:var(--surface-2); border-radius:4px; overflow:hidden;">
          <div style="height:100%; width:${consistencyScore}%; background:linear-gradient(90deg, ${consistencyScore >= 75 ? '#22c55e' : consistencyScore >= 50 ? '#f59e0b' : '#ef4444'}, ${consistencyScore >= 75 ? '#16a34a' : consistencyScore >= 50 ? '#d97706' : '#dc2626'}); border-radius:4px;"></div>
        </div>
      </div>

      <!-- Ideal Range Adherence -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:600; color:var(--muted);">Nights in Ideal Range (7-9h)</span>
          <span style="font-size:18px; font-weight:700; color:${idealPercentage >= 75 ? '#22c55e' : idealPercentage >= 50 ? '#f59e0b' : '#ef4444'};">${idealPercentage}%</span>
        </div>
        <div style="font-size:12px; color:var(--muted);">${idealSleep} out of ${hoursData.length} nights</div>
      </div>

      <!-- Quality Distribution -->
      ${qualityData.length > 0 ? `
      <div>
        <div style="font-size:13px; font-weight:600; color:var(--muted); margin-bottom:8px;">Quality Distribution</div>
        <div style="display:flex; gap:8px; font-size:12px;">
          <div style="flex:1; text-align:center; padding:8px; background:var(--surface-2); border-radius:6px;">
            <div style="font-size:20px; font-weight:700; color:#22c55e;">${highQuality}</div>
            <div style="color:var(--muted);">High (≥80%)</div>
          </div>
          <div style="flex:1; text-align:center; padding:8px; background:var(--surface-2); border-radius:6px;">
            <div style="font-size:20px; font-weight:700; color:#f59e0b;">${medQuality}</div>
            <div style="color:var(--muted);">Medium (60-79%)</div>
          </div>
          <div style="flex:1; text-align:center; padding:8px; background:var(--surface-2); border-radius:6px;">
            <div style="font-size:20px; font-weight:700; color:#ef4444;">${lowQuality}</div>
            <div style="color:var(--muted);">Low (<60%)</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Best/Worst Nights -->
      ${bestNight && worstNight ? `
      <div>
        <div style="font-size:13px; font-weight:600; color:var(--muted); margin-bottom:8px;">Notable Nights</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="padding:10px; background:rgba(34,197,94,0.1); border-left:3px solid #22c55e; border-radius:6px;">
            <div style="font-size:12px; color:var(--muted);">Best Night</div>
            <div style="font-size:14px; font-weight:600; margin-top:4px;">${bestNight.date}</div>
            <div style="font-size:13px; color:var(--text); opacity:0.85;">${bestNight.hours.toFixed(1)}h • ${Math.round(bestNight.quality)}% quality</div>
          </div>
          <div style="padding:10px; background:rgba(239,68,68,0.1); border-left:3px solid #ef4444; border-radius:6px;">
            <div style="font-size:12px; color:var(--muted);">Worst Night</div>
            <div style="font-size:14px; font-weight:600; margin-top:4px;">${worstNight.date}</div>
            <div style="font-size:13px; color:var(--text); opacity:0.85;">${worstNight.hours.toFixed(1)}h • ${Math.round(worstNight.quality)}% quality</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Recommendations -->
      <div>
        <div style="font-size:13px; font-weight:600; color:var(--muted); margin-bottom:8px;">Recommendations</div>
        <ul style="margin:0; padding-left:20px; font-size:13px; line-height:1.6; color:var(--text);">
          ${recommendations.map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

function renderSleepInsights() {
  console.log('[Sleep] Rendering sleep insights...');
  const series = getSleepSeriesByDay();
  console.log('[Sleep] Sleep series data:', series.length, 'entries');

  // Always safe to render these (no layout dependency)
  renderSleepLogSummary(series);
  renderSleepInsightsPanel(series);

  // Only draw the chart when the canvas is actually measurable (visible)
  const canvas = document.getElementById("sleepChart");
  console.log('[Sleep] Canvas element found:', !!canvas, 'clientWidth:', canvas?.clientWidth);
  if (canvas && canvas.clientWidth >= 50) {
    renderSleepProgress(series);
  }
  console.log('[Sleep] Sleep insights rendered');
}
window.renderSleepInsights = renderSleepInsights;
window.renderSleepList = renderSleepList;

  function wireSleepForm() {
    const form = document.getElementById("sleepForm");
    if (!form) return;
    function setDefaultSleepDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  dateEl.value = `${y}-${m}-${day}`;
}
    const dateEl = document.getElementById("sleepDate");
    const hoursEl = document.getElementById("sleepHours");
    const qualityEl = document.getElementById("sleepQuality");

    dateEl.value = isoToday();
setDefaultSleepDate();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl.value;
      const hours = Number(hoursEl.value);
      const quality = Number(qualityEl.value);

      if (!date) return;
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) return;
      if (!Number.isFinite(quality) || quality < 1 || quality > 100) return;

      upsertEntry(METRICS.sleepHours.id, date, hours);
      upsertEntry(METRICS.sleepQuality.id, date, quality);

      hoursEl.value = "";
      qualityEl.value = "";
      setDefaultSleepDate();
      renderSleepList();
            renderSleepInsights();
    });
  }

  /* -------------------------
     Morning Measurements Quick-Input
     ------------------------- */
  function wireMorningMeasurementsForm() {
    const form = document.getElementById("morningMeasurementsForm");
    if (!form) return;

    const dateEl = document.getElementById("mmDate");
    const weightEl = document.getElementById("mmWeight");
    const fatEl = document.getElementById("mmBodyFat");
    const waterEl = document.getElementById("mmBodyWater");
    const boneEl = document.getElementById("mmBone");

    dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl.value;
      if (!date) return;

      const weight = weightEl.value === "" ? null : Number(weightEl.value);
      const fat = fatEl.value === "" ? null : Number(fatEl.value);
      const water = waterEl.value === "" ? null : Number(waterEl.value);
      const bone = boneEl.value === "" ? null : Number(boneEl.value);

      // Save all 4 morning measurements
      if (weight !== null && Number.isFinite(weight)) upsertEntry(METRICS.bodyweight.id, date, weight);
      if (fat !== null && Number.isFinite(fat)) upsertEntry(METRICS.bodyFat.id, date, fat);
      if (water !== null && Number.isFinite(water)) upsertEntry(METRICS.bodyWater.id, date, water);
      if (bone !== null && Number.isFinite(bone)) upsertEntry(METRICS.boneMetric.id, date, bone);

      // Auto-calculate lean mass
      calculateAndSaveLeanMass(date);

      // Clear inputs
      weightEl.value = "";
      fatEl.value = "";
      waterEl.value = "";
      boneEl.value = "";

      // Refresh all displays
      renderBodyweightList();
      renderBodyCompList();
      renderLeanMassHint();
      renderDietHint();
      renderBodyCompProgress();
      renderMorningMeasurementsSummary();
    });
  }

  function renderMorningMeasurementsSummary() {
    const el = document.getElementById("morningMeasurementsSummary");
    if (!el) return;

    const today = isoToday();
    const weight = findEntryByDate(METRICS.bodyweight.id, today);
    const fat = findEntryByDate(METRICS.bodyFat.id, today);
    const water = findEntryByDate(METRICS.bodyWater.id, today);
    const bone = findEntryByDate(METRICS.boneMetric.id, today);
    const leanMass = findEntryByDate(METRICS.leanMass.id, today);

    if (!weight && !fat && !water && !bone) {
      el.innerHTML = `<div style="color:var(--muted); text-align:center; padding:20px;">No measurements logged today.</div>`;
      return;
    }

    const statsHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
        ${weight ? `
          <div class="stat-card">
            <div class="stat-label">Weight</div>
            <div class="stat-value">${Number(weight.value).toFixed(1)} kg</div>
          </div>
        ` : ''}
        ${leanMass ? `
          <div class="stat-card">
            <div class="stat-label">Lean Mass</div>
            <div class="stat-value" style="color:#22c55e;">${Number(leanMass.value).toFixed(1)} kg</div>
          </div>
        ` : ''}
        ${fat ? `
          <div class="stat-card">
            <div class="stat-label">Body Fat</div>
            <div class="stat-value">${Number(fat.value).toFixed(1)}%</div>
          </div>
        ` : ''}
        ${water ? `
          <div class="stat-card">
            <div class="stat-label">Body Water</div>
            <div class="stat-value">${Number(water.value).toFixed(1)}%</div>
          </div>
        ` : ''}
        ${bone ? `
          <div class="stat-card">
            <div class="stat-label">Bone Density</div>
            <div class="stat-value">${Number(bone.value).toFixed(1)}%</div>
          </div>
        ` : ''}
      </div>
    `;

    el.innerHTML = statsHTML;
  }

  /* -------------------------
     Body comp + measurements
     ------------------------- */

  function wireBodyCompForm() {
    const form = document.getElementById("bodyCompForm");
    if (!form) return;

    const dateEl = document.getElementById("bcDate");
    const fatEl = document.getElementById("bcBodyFat");
    const waterEl = document.getElementById("bcBodyWater");
    const boneEl = document.getElementById("bcBoneMetric");

    dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl.value;
      if (!date) return;

      const fat = fatEl.value === "" ? null : Number(fatEl.value);
      const water = waterEl.value === "" ? null : Number(waterEl.value);
      const bone = boneEl.value === "" ? null : Number(boneEl.value);

      if (fat !== null && Number.isFinite(fat)) upsertEntry(METRICS.bodyFat.id, date, fat);
      if (water !== null && Number.isFinite(water)) upsertEntry(METRICS.bodyWater.id, date, water);
      if (bone !== null && Number.isFinite(bone)) upsertEntry(METRICS.boneMetric.id, date, bone);

      calculateAndSaveLeanMass(date); // Auto-calculate lean mass

      fatEl.value = "";
      waterEl.value = "";
      boneEl.value = "";

      renderBodyCompList();
      renderLeanMassHint();
      renderBodyCompProgress(); // Update progress charts
    });
  }

  function wireMeasureForm() {
    const form = document.getElementById("measureForm");
    if (!form) return;

    const dateEl = document.getElementById("mDate");
    const waistEl = document.getElementById("mWaist");
    const chestEl = document.getElementById("mChest");
    const shouldersEl = document.getElementById("mShoulders");
    const thighEl = document.getElementById("mThigh");
    const bicepsEl = document.getElementById("mBiceps");

    dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl.value;
      if (!date) return;

      const waist = waistEl.value === "" ? null : Number(waistEl.value);
      const chest = chestEl.value === "" ? null : Number(chestEl.value);
      const shoulders = shouldersEl.value === "" ? null : Number(shouldersEl.value);
      const thigh = thighEl.value === "" ? null : Number(thighEl.value);
      const biceps = bicepsEl.value === "" ? null : Number(bicepsEl.value);

      if (waist !== null && Number.isFinite(waist)) upsertEntry(METRICS.waist.id, date, waist);
      if (chest !== null && Number.isFinite(chest)) upsertEntry(METRICS.chest.id, date, chest);
      if (shoulders !== null && Number.isFinite(shoulders)) upsertEntry(METRICS.shoulders.id, date, shoulders);
      if (thigh !== null && Number.isFinite(thigh)) upsertEntry(METRICS.thigh.id, date, thigh);
      if (biceps !== null && Number.isFinite(biceps)) upsertEntry(METRICS.biceps.id, date, biceps);

      waistEl.value = "";
      chestEl.value = "";
      shouldersEl.value = "";
      thighEl.value = "";
      bicepsEl.value = "";

      renderBodyCompList();
    });
  }

  function renderLeanMassHint() {
    const hint = document.getElementById("leanMassHint");
    if (!hint) return;

    const date = document.getElementById("bcDate")?.value || isoToday();
    const w = findEntryByDate(METRICS.bodyweight.id, date);
    const bf = findEntryByDate(METRICS.bodyFat.id, date);

    if (!w || !bf) {
      hint.textContent = "Lean mass estimate will appear when Bodyweight and Body fat % exist for the same date.";
      return;
    }

    const weight = Number(w.value);
    const bodyFatPct = Number(bf.value);

    if (!Number.isFinite(weight) || !Number.isFinite(bodyFatPct)) {
      hint.textContent = "Lean mass estimate will appear when Bodyweight and Body fat % are valid numbers.";
      return;
    }

    const leanMass = weight * (1 - bodyFatPct / 100);
    const fatMass = weight - leanMass;

    hint.textContent =
      `Estimate for ${date}: Lean mass ≈ ${leanMass.toFixed(1)} kg, Fat mass ≈ ${fatMass.toFixed(1)} kg ` +
      `(computed from Bodyweight × (1 − Body fat%/100)).`;
  }

  /* -------------------------
     Body Composition Progress Charts
     ------------------------- */
  let bodyCompRangeDays = 30;

  function getBodyCompSeriesByDay() {
    const entries = LifeOSDB.getCollection("metricEntries") || [];
    const byDate = new Map();

    for (const e of entries) {
      if (!e || !e.metricId || !e.date) continue;

      const obj = byDate.get(e.date) || {
        date: e.date,
        weight: null,
        leanMass: null,
        bodyFat: null,
        bodyWater: null,
        bone: null
      };

      if (e.metricId === METRICS.bodyweight.id) obj.weight = Number(e.value);
      if (e.metricId === METRICS.leanMass.id) obj.leanMass = Number(e.value);
      if (e.metricId === METRICS.bodyFat.id) obj.bodyFat = Number(e.value);
      if (e.metricId === METRICS.bodyWater.id) obj.bodyWater = Number(e.value);
      if (e.metricId === METRICS.boneMetric.id) obj.bone = Number(e.value);

      byDate.set(e.date, obj);
    }

    const series = Array.from(byDate.values())
      .filter(x => x.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    return series;
  }

  function drawBodyCompChart(filtered) {
    const canvas = document.getElementById("bodyCompChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";

    const cssW = canvas.clientWidth || 300;
    const cssH = 280;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.scale(dpr, dpr);

    const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    const textColor = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
    const mutedColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";

    ctx.clearRect(0, 0, cssW, cssH);

    const padL = 50, padR = 50, padT = 20, padB = 60;
    const w = cssW - padL - padR;
    const h = cssH - padT - padB;

    if (!filtered || filtered.length < 2) {
      ctx.fillStyle = textColor;
      ctx.font = "13px " + getComputedStyle(document.body).fontFamily;
      ctx.fillText("Log at least 2 entries to see trends.", padL + 10, padT + 24);
      return;
    }

    // Prepare data series
    const weightVals = filtered.map(x => x.weight).filter(n => Number.isFinite(n));
    const leanMassVals = filtered.map(x => x.leanMass).filter(n => Number.isFinite(n));
    const bodyFatVals = filtered.map(x => x.bodyFat).filter(n => Number.isFinite(n));

    // Calculate trends
    const weightTrend = weightVals.length >= 2 ? (weightVals[weightVals.length - 1] - weightVals[0]) : 0;
    const leanMassTrend = leanMassVals.length >= 2 ? (leanMassVals[leanMassVals.length - 1] - leanMassVals[0]) : 0;
    const bodyFatTrend = bodyFatVals.length >= 2 ? (bodyFatVals[bodyFatVals.length - 1] - bodyFatVals[0]) : 0;

    // Line colors
    const weightColor = "#60a5fa"; // blue
    const leanMassColor = "#22c55e"; // green
    const bodyFatColor = "#a78bfa"; // light purple

    // Scales - left axis for kg, right axis for %
    const allKgValues = [...weightVals, ...leanMassVals];
    const maxKg = allKgValues.length ? Math.ceil(Math.max(...allKgValues) + 2) : 100;
    const minKg = allKgValues.length ? Math.floor(Math.min(...allKgValues) - 2) : 0;
    const kgRange = maxKg - minKg;

    const xFor = (i) => padL + (i * (w / (filtered.length - 1)));
    const yForKg = (v) => padT + h - ((v - minKg) / kgRange) * h;
    const yForPercent = (v) => padT + h - ((v / 100) * h);

    // Draw axes
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + h);
    ctx.lineTo(padL + w, padT + h);
    ctx.strokeStyle = gridColor;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Y-axis labels (left - kg)
    ctx.font = "11px " + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "right";
    ctx.fillText(`${maxKg}kg`, padL - 8, padT + 10);
    ctx.fillText(`${Math.round((maxKg + minKg) / 2)}kg`, padL - 8, padT + h / 2 + 4);
    ctx.fillText(`${minKg}kg`, padL - 8, padT + h + 4);

    // Y-axis labels (right - %)
    ctx.textAlign = "left";
    ctx.fillText("100%", padL + w + 8, padT + 10);
    ctx.fillText("50%", padL + w + 8, padT + h / 2 + 4);
    ctx.fillText("0%", padL + w + 8, padT + h + 4);

    // Draw Bodyweight line
    const weightPoints = [];
    filtered.forEach((p, i) => {
      if (Number.isFinite(p.weight)) {
        weightPoints.push({ x: xFor(i), y: yForKg(p.weight) });
      }
    });

    if (weightPoints.length > 0) {
      ctx.beginPath();
      weightPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = weightColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      weightPoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = weightColor;
        ctx.fill();
      });
    }

    // Draw Lean Mass line
    const leanMassPoints = [];
    filtered.forEach((p, i) => {
      if (Number.isFinite(p.leanMass)) {
        leanMassPoints.push({ x: xFor(i), y: yForKg(p.leanMass) });
      }
    });

    if (leanMassPoints.length > 0) {
      ctx.beginPath();
      leanMassPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = leanMassColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      leanMassPoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = leanMassColor;
        ctx.fill();
      });
    }

    // Draw Body Fat % line (secondary axis)
    const bodyFatPoints = [];
    filtered.forEach((p, i) => {
      if (Number.isFinite(p.bodyFat)) {
        bodyFatPoints.push({ x: xFor(i), y: yForPercent(p.bodyFat) });
      }
    });

    if (bodyFatPoints.length > 0) {
      ctx.beginPath();
      bodyFatPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = bodyFatColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      bodyFatPoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = bodyFatColor;
        ctx.fill();
      });
    }

    // X-axis date labels
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "left";
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily;

    const firstDate = filtered[0].date;
    const lastDate = filtered[filtered.length - 1].date;

    const formatDate = (dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    };

    ctx.fillText(formatDate(firstDate), padL, padT + h + 18);
    ctx.textAlign = "right";
    ctx.fillText(formatDate(lastDate), padL + w, padT + h + 18);

    // Legend
    ctx.textAlign = "center";
    ctx.font = "11px " + getComputedStyle(document.body).fontFamily;

    const legendY = padT + h + 38;
    const legendCenterX = padL + w / 2;

    // Weight legend
    ctx.fillStyle = weightColor;
    ctx.beginPath();
    ctx.arc(legendCenterX - 100, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.fillText("Weight", legendCenterX - 94, legendY + 4);

    // Lean Mass legend
    ctx.fillStyle = leanMassColor;
    ctx.beginPath();
    ctx.arc(legendCenterX - 30, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(`Lean Mass ${leanMassTrend >= 0 ? '↗' : '↘'}`, legendCenterX - 24, legendY + 4);

    // Body Fat legend
    ctx.fillStyle = bodyFatColor;
    ctx.beginPath();
    ctx.arc(legendCenterX + 60, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(`Body Fat% ${bodyFatTrend <= 0 ? '↘' : '↗'}`, legendCenterX + 66, legendY + 4);
  }

  function renderBodyCompProgress() {
    const series = getBodyCompSeriesByDay();
    const start = isoDaysAgo(bodyCompRangeDays);
    const filtered = series.filter(x => x.date >= start);

    drawBodyCompChart(filtered);

    // Update averages
    const avgEl = document.getElementById("bodyCompAverages");
    if (avgEl) {
      const weightVals = filtered.map(x => x.weight).filter(n => Number.isFinite(n));
      const leanMassVals = filtered.map(x => x.leanMass).filter(n => Number.isFinite(n));
      const bodyFatVals = filtered.map(x => x.bodyFat).filter(n => Number.isFinite(n));

      const avgWeight = avg(weightVals);
      const avgLeanMass = avg(leanMassVals);
      const avgBodyFat = avg(bodyFatVals);

      const w = avgWeight != null ? `${avgWeight.toFixed(1)}kg` : "—";
      const lm = avgLeanMass != null ? `${avgLeanMass.toFixed(1)}kg` : "—";
      const bf = avgBodyFat != null ? `${avgBodyFat.toFixed(1)}%` : "—";

      avgEl.textContent = `Avg (last ${bodyCompRangeDays} days): Weight ${w} • Lean Mass ${lm} • Body Fat ${bf}`;
    }

    // Update stats panel
    renderBodyCompStats(filtered);
  }

  function renderBodyCompStats(filtered) {
    const statsEl = document.getElementById("bodyCompStats");
    if (!statsEl) return;

    if (!filtered || filtered.length === 0) {
      statsEl.innerHTML = `<div style="color:var(--muted); text-align:center; padding:40px;">No data for this period.</div>`;
      return;
    }

    const weightVals = filtered.map(x => x.weight).filter(n => Number.isFinite(n));
    const leanMassVals = filtered.map(x => x.leanMass).filter(n => Number.isFinite(n));
    const bodyFatVals = filtered.map(x => x.bodyFat).filter(n => Number.isFinite(n));

    // Latest values
    const latestWeight = weightVals.length > 0 ? weightVals[weightVals.length - 1] : null;
    const latestLeanMass = leanMassVals.length > 0 ? leanMassVals[leanMassVals.length - 1] : null;
    const latestBodyFat = bodyFatVals.length > 0 ? bodyFatVals[bodyFatVals.length - 1] : null;

    // Change from start
    const startWeight = weightVals.length > 0 ? weightVals[0] : null;
    const startLeanMass = leanMassVals.length > 0 ? leanMassVals[0] : null;
    const startBodyFat = bodyFatVals.length > 0 ? bodyFatVals[0] : null;

    const weightChange = (latestWeight && startWeight) ? latestWeight - startWeight : null;
    const leanMassChange = (latestLeanMass && startLeanMass) ? latestLeanMass - startLeanMass : null;
    const bodyFatChange = (latestBodyFat && startBodyFat) ? latestBodyFat - startBodyFat : null;

    function formatChange(change, unit, reverseColor = false) {
      if (change == null) return '';
      const isPositive = change > 0;
      const arrow = isPositive ? '↗' : change < 0 ? '↘' : '→';
      const color = change === 0 ? 'var(--muted)' :
                    (reverseColor ? (isPositive ? '#ef4444' : '#22c55e') : (isPositive ? '#22c55e' : '#ef4444'));
      return `<span style="color:${color}; font-size:14px; font-weight:600; margin-left:8px;">${arrow} ${Math.abs(change).toFixed(1)}${unit}</span>`;
    }

    statsEl.innerHTML = `
      <div style="display:grid; gap:16px; padding:16px;">
        ${latestWeight != null ? `
          <div class="stat-card" style="padding:20px;">
            <div class="stat-label">Bodyweight</div>
            <div style="display:flex; align-items:baseline; justify-content:center;">
              <div class="stat-value" style="font-size:36px;">${latestWeight.toFixed(1)}</div>
              <span style="font-size:18px; color:var(--muted); margin-left:6px;">kg</span>
            </div>
            <div style="margin-top:8px; text-align:center;">
              ${formatChange(weightChange, 'kg')}
            </div>
          </div>
        ` : ''}

        ${latestLeanMass != null ? `
          <div class="stat-card" style="padding:20px;">
            <div class="stat-label">Lean Mass</div>
            <div style="display:flex; align-items:baseline; justify-content:center;">
              <div class="stat-value" style="font-size:36px; color:#22c55e;">${latestLeanMass.toFixed(1)}</div>
              <span style="font-size:18px; color:var(--muted); margin-left:6px;">kg</span>
            </div>
            <div style="margin-top:8px; text-align:center;">
              ${formatChange(leanMassChange, 'kg')}
            </div>
          </div>
        ` : ''}

        ${latestBodyFat != null ? `
          <div class="stat-card" style="padding:20px;">
            <div class="stat-label">Body Fat</div>
            <div style="display:flex; align-items:baseline; justify-content:center;">
              <div class="stat-value" style="font-size:36px; color:#a78bfa;">${latestBodyFat.toFixed(1)}</div>
              <span style="font-size:18px; color:var(--muted); margin-left:6px;">%</span>
            </div>
            <div style="margin-top:8px; text-align:center;">
              ${formatChange(bodyFatChange, '%', true)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function wireBodyCompRangeButtons() {
    const btns = document.querySelectorAll(".bodycomp-range-btn");
    if (!btns.length) return;

    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.range);
        if (!Number.isFinite(n)) return;
        bodyCompRangeDays = n;

        btns.forEach(b => b.classList.toggle("active", b === btn));

        renderBodyCompProgress();
      });
    });
  }

  function wireBodyCompTabs() {
    // Find the body comp card specifically by looking for the bodyCompChart canvas
    const canvas = document.getElementById('bodyCompChart');
    if (!canvas) return;

    const card = canvas.closest('.dashboard-card');
    if (!card) return;

    const tabs = card.querySelectorAll('.dashboard-tab');
    const panels = card.querySelectorAll('.dashboard-content-panel');
    const container = card.querySelector('.dashboard-content-container');

    if (!tabs.length || !panels.length || !container) return;

    // Tab click handlers
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const panel = panels[index];
        if (panel && container) {
          container.scrollTo({
            left: panel.offsetLeft,
            behavior: 'smooth'
          });
        }
      });
    });

    // Scroll event handler to sync tabs with swipe
    let scrollTimeout;
    container.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = container.scrollLeft;
        const containerWidth = container.offsetWidth;
        const activeIndex = Math.round(scrollLeft / containerWidth);

        tabs.forEach((tab, index) => {
          if (index === activeIndex) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
      }, 50);
    });
  }

  function renderBodyMeasurementsProgress() {
    const el = document.getElementById("bodyMeasurementsProgress");
    if (!el) return;

    const today = isoToday();
    const measurementIds = [
      METRICS.waist.id,
      METRICS.chest.id,
      METRICS.shoulders.id,
      METRICS.thigh.id,
      METRICS.biceps.id,
    ];

    const labels = {
      [METRICS.waist.id]: "Waist",
      [METRICS.chest.id]: "Chest",
      [METRICS.shoulders.id]: "Shoulders",
      [METRICS.thigh.id]: "Thigh",
      [METRICS.biceps.id]: "Biceps",
    };

    // Get latest measurements
    const measurements = measurementIds.map(metricId => {
      const latest = latestEntry(metricId);
      if (!latest) return null;

      // Get value from 30 days ago for comparison
      const thirtyDaysAgo = isoDaysAgo(30);
      const entries = getEntries(metricId).filter(e => e.date >= thirtyDaysAgo).sort((a, b) => a.date.localeCompare(b.date));
      const oldest = entries[0];

      const change = oldest ? Number(latest.value) - Number(oldest.value) : null;

      return {
        id: metricId,
        label: labels[metricId],
        value: Number(latest.value),
        change,
        date: latest.date
      };
    }).filter(Boolean);

    if (measurements.length === 0) {
      el.innerHTML = `<div style="color:var(--muted); text-align:center; padding:20px;">No measurements logged yet.</div>`;
      return;
    }

    const html = measurements.map(m => {
      const changeColor = m.change == null ? 'var(--muted)' :
                          m.change > 0 ? '#22c55e' : m.change < 0 ? '#ef4444' : 'var(--muted)';
      const arrow = m.change == null ? '' : m.change > 0 ? '↗' : m.change < 0 ? '↘' : '→';

      return `
        <div class="stat-card" style="padding:16px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="stat-label" style="margin-bottom:6px;">${m.label}</div>
              <div style="font-size:28px; font-weight:700;">${m.value.toFixed(1)}<span style="font-size:16px; color:var(--muted); margin-left:4px;">cm</span></div>
              ${m.change != null ? `
                <div style="margin-top:6px; font-size:13px; color:${changeColor}; font-weight:600;">
                  ${arrow} ${Math.abs(m.change).toFixed(1)}cm <span style="color:var(--muted); font-weight:400;">last 30d</span>
                </div>
              ` : ''}
            </div>
            <div style="font-size:11px; color:var(--muted);">${m.date}</div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = html;
  }

  function renderBodyCompList() {
    const list = document.getElementById("bodyCompList");
    if (!list) return;

    const metricIds = [
      METRICS.bodyFat.id,
      METRICS.bodyWater.id,
      METRICS.boneMetric.id,
      METRICS.waist.id,
      METRICS.chest.id,
      METRICS.shoulders.id,
      METRICS.thigh.id,
      METRICS.biceps.id,
    ];

    const all = LifeOSDB.getCollection("metricEntries").filter((e) => metricIds.includes(e.metricId));
    const dates = Array.from(new Set(all.map((e) => e.date))).sort((a, b) => b.localeCompare(a));

    list.innerHTML = "";
    if (dates.length === 0) {
      list.innerHTML = "<li style='color:var(--muted);'>No body comp or measurements yet.</li>";
      return;
    }

    const byDate = new Map();
    dates.forEach((d) => byDate.set(d, {}));
    all.forEach((e) => {
      const row = byDate.get(e.date);
      if (!row) return;
      row[e.metricId] = e;
    });

    function v(val, suffix) {
      return val === undefined ? "—" : `${val}${suffix}`;
    }

    dates.forEach((date) => {
      const row = byDate.get(date) || {};

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "flex-start";
      li.style.gap = "10px";

      const delButtons = [];
      const addDel = (label, entry) => {
        if (!entry) return;
        delButtons.push(
  `<button type="button" data-del="${entry.id || ""}" data-metric="${entry.metricId}" data-date="${entry.date}">Del ${label}</button>`
);

      };

      addDel("fat", row[METRICS.bodyFat.id]);
      addDel("water", row[METRICS.bodyWater.id]);
      addDel("bone", row[METRICS.boneMetric.id]);
      addDel("waist", row[METRICS.waist.id]);
      addDel("chest", row[METRICS.chest.id]);
      addDel("shoulders", row[METRICS.shoulders.id]);
      addDel("thigh", row[METRICS.thigh.id]);
      addDel("biceps", row[METRICS.biceps.id]);

      li.innerHTML = `
        <div style="flex:1;">
          <div><strong>${date}</strong></div>
          <div style="color:var(--muted); font-size:13px; margin-top:4px; line-height:1.4;">
            Fat: <strong>${v(row[METRICS.bodyFat.id]?.value, "%")}</strong> • Water: <strong>${v(row[METRICS.bodyWater.id]?.value, "%")}</strong> • Bone: <strong>${row[METRICS.boneMetric.id]?.value ?? "—"}</strong><br/>
            Waist: <strong>${v(row[METRICS.waist.id]?.value, "cm")}</strong> • Chest: <strong>${v(row[METRICS.chest.id]?.value, "cm")}</strong> • Shoulders: <strong>${v(row[METRICS.shoulders.id]?.value, "cm")}</strong><br/>
            Thigh: <strong>${v(row[METRICS.thigh.id]?.value, "cm")}</strong> • Biceps: <strong>${v(row[METRICS.biceps.id]?.value, "cm")}</strong>
          </div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end;">
          ${delButtons.join("")}
        </div>
      `;

      li.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
  const id = btn.getAttribute("data-del");
  const metricId = btn.getAttribute("data-metric");
  const date = btn.getAttribute("data-date");

  if (id) {
    LifeOSDB.remove("metricEntries", id);
  } else if (metricId && date) {
    // legacy fallback: remove first match
    const all = LifeOSDB.getCollection("metricEntries");
    const idx = all.findIndex((e) => e && !e.id && e.metricId === metricId && e.date === date);
    if (idx >= 0) {
      all.splice(idx, 1);
      LifeOSDB.setCollection("metricEntries", all);
      LifeOSDB.touchMeta();
    }
  }

  renderBodyCompList();
  renderLeanMassHint();
});
      });

      list.appendChild(li);
    });
  }

  /* -------------------------
     Diet UI
     ------------------------- */

  function wireDietForm() {
    const form = document.getElementById("dietForm");
    if (!form) return;

    const dateEl = document.getElementById("dietDate");
    const calEl = document.getElementById("dietCalories");
    const proEl = document.getElementById("dietProtein");

    dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl.value;
      if (!date) return;

      const calories = calEl.value === "" ? null : Number(calEl.value);
      const protein = proEl.value === "" ? null : Number(proEl.value);

      if (calories !== null && Number.isFinite(calories)) upsertEntry(METRICS.calories.id, date, calories);
      if (protein !== null && Number.isFinite(protein)) upsertEntry(METRICS.protein.id, date, protein);

      calEl.value = "";
      proEl.value = "";

      renderDietList();
      renderDietHint();
    });
  }

  function renderDietList() {
    const list = document.getElementById("dietList");
    if (!list) return;

    const cal = getEntries(METRICS.calories.id).sort((a, b) => b.date.localeCompare(a.date));
    const pro = getEntries(METRICS.protein.id).sort((a, b) => b.date.localeCompare(a.date));

    const proByDate = new Map();
    pro.forEach((e) => proByDate.set(e.date, e));

    list.innerHTML = "";

    if (cal.length === 0 && pro.length === 0) {
      list.innerHTML = "<li style='color:var(--muted);'>No diet entries yet.</li>";
      return;
    }

    const dates = new Set();
    cal.forEach((e) => dates.add(e.date));
    pro.forEach((e) => dates.add(e.date));

    const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((date) => {
      const c = cal.find((e) => e.date === date) || null;
      const p = proByDate.get(date) || null;

      const cText = c ? `${c.value} kcal` : "—";
      const pText = p ? `${p.value} g` : "—";

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      li.innerHTML = `
        <span>${date}: <strong>${cText}</strong> • <strong>${pText}</strong></span>
        <div style="display:flex; gap:8px;">
          <button type="button" data-del-cal="${c ? c.id : ""}" ${c ? "" : "disabled"}>Del cal</button>
          <button type="button" data-del-pro="${p ? p.id : ""}" ${p ? "" : "disabled"}>Del pro</button>
        </div>
      `;

      li.querySelector("[data-del-cal]").addEventListener("click", () => {
  if (c) removeEntry(c);
  renderDietList();
  renderDietHint();
});

li.querySelector("[data-del-pro]").addEventListener("click", () => {
  if (p) removeEntry(p);
  renderDietList();
  renderDietHint();
});

      list.appendChild(li);
    });
  }

  function renderDietHint() {
    const hint = document.getElementById("dietHint");
    if (!hint) return;

    // Provide transparent protein range suggestion based on latest bodyweight (optional guidance)
    const bw = latestEntry(METRICS.bodyweight.id);
    if (!bw) {
      hint.textContent = "Tip: If you log bodyweight, this can show an optional protein range suggestion (e.g., 1.6–2.2 g/kg).";
      return;
    }

    const w = Number(bw.value);
    if (!Number.isFinite(w) || w <= 0) {
      hint.textContent = "Tip: If you log bodyweight, this can show an optional protein range suggestion.";
      return;
    }

    const low = 1.6 * w;
    const high = 2.2 * w;

    hint.textContent =
      `Optional protein range (based on latest bodyweight ${bw.value} kg on ${bw.date}): ` +
      `${low.toFixed(0)}–${high.toFixed(0)} g/day (computed as 1.6–2.2 g/kg).`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    // Ensure all metric definitions exist
    Object.values(METRICS).forEach(ensureMetricDefinition);

    // Wire Morning Measurements quick-input form
    wireMorningMeasurementsForm();
    renderMorningMeasurementsSummary();

    // Wire + render existing
    wireBodyweightForm();
    renderBodyweightList();

    wireSleepForm();
    renderSleepList();
    wireSleepRangeButtons();
    sleepRangeDays = 7;
    renderSleepInsights();

    wireBodyCompForm();
    wireMeasureForm();
    renderBodyCompList();
    renderLeanMassHint();

    // Wire body composition progress charts
    wireBodyCompRangeButtons();
    wireBodyCompTabs();
    bodyCompRangeDays = 7;

    // Delay initial render to ensure canvas is ready
    setTimeout(() => {
      renderBodyCompProgress();
    }, 100);

    // Render body measurements progress
    renderBodyMeasurementsProgress();

    // Diet
    wireDietForm();
    renderDietList();
    renderDietHint();

    // Update lean mass hint if date field changes
    const bcDate = document.getElementById("bcDate");
    if (bcDate) bcDate.addEventListener("change", renderLeanMassHint);

// If another module writes metricEntries (e.g., Meal Templates "Apply", Today inline forms),
// re-render all metric UIs.
document.addEventListener("lifeos:metrics-updated", () => {
  renderDietList();
  renderDietHint();
  renderBodyweightList();
  renderBodyCompList();
  renderLeanMassHint();
  renderSleepList();
  renderSleepInsights();
  renderBodyCompProgress();
  renderMorningMeasurementsSummary();
  renderBodyMeasurementsProgress();
});
  });
})();
