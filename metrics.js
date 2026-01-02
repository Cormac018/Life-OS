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
    sleepHours: { id: "sleep_hours", name: "Sleep duration", unit: "hours", type: "number", sourceModule: "health" },
   sleepQuality: { id: "sleep_quality", name: "Sleep quality", unit: "1–100", type: "number", sourceModule: "health" },

    // body composition
    bodyFat: { id: "body_fat_pct", name: "Body fat", unit: "%", type: "number", sourceModule: "health" },
    bodyWater: { id: "body_water_pct", name: "Body water", unit: "%", type: "number", sourceModule: "health" },
    boneMetric: { id: "bone_metric", name: "Bone metric", unit: "?", type: "number", sourceModule: "health" },

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

      valueInput.value = "";
      renderBodyweightList();
      renderLeanMassHint();
      renderDietHint();
    });
  }

  /* -------------------------
     Sleep UI
     ------------------------- */

  function renderSleepList() {
    const list = document.getElementById("sleepList");
    if (!list) return;

    const hoursEntries = getEntries(METRICS.sleepHours.id).sort((a, b) => b.date.localeCompare(a.date));
    const qualityEntries = getEntries(METRICS.sleepQuality.id).sort((a, b) => b.date.localeCompare(a.date));

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
      const qualityText = quality ? `${quality.value}/100` : "—";

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      li.innerHTML = `
        <span>${date}: <strong>${hoursText}</strong> • <strong>${qualityText}</strong></span>
        <div style="display:flex; gap:8px;">
          <button type="button" data-del-hours="${hours ? hours.id : ""}" ${hours ? "" : "disabled"}>Del hours</button>
          <button type="button" data-del-quality="${quality ? quality.id : ""}" ${quality ? "" : "disabled"}>Del quality</button>
        </div>
      `;

      const delHoursBtn = li.querySelector("[data-del-hours]");
      delHoursBtn.addEventListener("click", () => {
  if (hours) removeEntry(hours);
  renderSleepList();
});

      const delQualityBtn = li.querySelector("[data-del-quality]");
      delQualityBtn.addEventListener("click", () => {
  if (quality) removeEntry(quality);
  renderSleepList();
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

    const cssW = canvas.clientWidth || 300;
    const cssH = 220;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.scale(dpr, dpr);

    // clear
    ctx.clearRect(0, 0, cssW, cssH);

    // padding
    const padL = 38, padR = 12, padT = 14, padB = 26;
    const w = cssW - padL - padR;
    const h = cssH - padT - padB;

    // frame
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, w, h);

    if (!filtered || filtered.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.font = "13px system-ui";
      ctx.fillText("Not enough data to chart yet.", padL + 10, padT + 24);
      return;
    }

    // scales
    const hoursVals = filtered.map(x => x.hours).filter(n => Number.isFinite(n));
    const maxHours = Math.max(8, Math.min(24, Math.ceil((hoursVals.length ? Math.max(...hoursVals) : 8) + 1)));

    const xFor = (i) => padL + (i * (w / (filtered.length - 1)));
    const yForHours = (v) => padT + (h - (v / maxHours) * h);
    const yForQuality = (v) => padT + (h - (v / 100) * h);

    // grid (light)
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    for (let i = 1; i <= 3; i++) {
      const y = padT + (i * (h / 4));
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + w, y);
      ctx.stroke();
    }

    // Hours line
    ctx.strokeStyle = "rgba(79,140,255,.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    filtered.forEach((p, i) => {
      if (!Number.isFinite(p.hours)) return;
      const x = xFor(i);
      const y = yForHours(p.hours);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Quality line
    ctx.strokeStyle = "rgba(120,220,160,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    started = false;
    filtered.forEach((p, i) => {
      if (!Number.isFinite(p.quality)) return;
      const x = xFor(i);
      const y = yForQuality(p.quality);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.font = "12px system-ui";
    ctx.fillText(`Hours (0–${maxHours})`, padL + 8, padT + 14);
    ctx.fillText("Quality (0–100)", padL + 110, padT + 14);

    // x-axis dates (first/last)
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.fillText(filtered[0].date, padL, padT + h + 20);
    const lastTxt = filtered[filtered.length - 1].date;
    const tw = ctx.measureText(lastTxt).width;
    ctx.fillText(lastTxt, padL + w - tw, padT + h + 20);
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

function renderSleepInsights() {
  const series = getSleepSeriesByDay();

  // Always safe to render these (no layout dependency)
  renderSleepLogSummary(series);

  // Only draw the chart when the canvas is actually measurable (visible)
  const canvas = document.getElementById("sleepChart");
  if (canvas && canvas.clientWidth >= 50) {
    renderSleepProgress(series);
  }
}
window.renderSleepInsights = renderSleepInsights;

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

      fatEl.value = "";
      waterEl.value = "";
      boneEl.value = "";

      renderBodyCompList();
      renderLeanMassHint();
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
});
  });
})();
