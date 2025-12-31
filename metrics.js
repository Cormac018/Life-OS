/* =========================
   metrics.js — Metrics v1

   Tracks (via metricEntries):
   - Bodyweight
   - Sleep (hours + quality)
   - Body composition (fat%, water%, bone metric)
   - Measurements (waist/chest/shoulders/thigh/biceps)
   - Diet (calories + protein)

   NOTE:
   UI elements now live under Health for everything except bodyweight.
========================= */

(function () {
  const METRICS = {
    bodyweight: { id: "bodyweight", name: "Bodyweight", unit: "kg", type: "number", sourceModule: "health" },

    sleepHours: { id: "sleep_hours", name: "Sleep duration", unit: "hours", type: "number", sourceModule: "health" },
    sleepQuality: { id: "sleep_quality", name: "Sleep quality", unit: "1–5", type: "number", sourceModule: "health" },

    bodyFat: { id: "body_fat_pct", name: "Body fat", unit: "%", type: "number", sourceModule: "health" },
    bodyWater: { id: "body_water_pct", name: "Body water", unit: "%", type: "number", sourceModule: "health" },
    boneMetric: { id: "bone_metric", name: "Bone metric", unit: "?", type: "number", sourceModule: "health" },

    waist: { id: "waist_cm", name: "Waist", unit: "cm", type: "number", sourceModule: "health" },
    chest: { id: "chest_cm", name: "Chest", unit: "cm", type: "number", sourceModule: "health" },
    shoulders: { id: "shoulders_cm", name: "Shoulders", unit: "cm", type: "number", sourceModule: "health" },
    thigh: { id: "thigh_cm", name: "Thigh", unit: "cm", type: "number", sourceModule: "health" },
    biceps: { id: "biceps_cm", name: "Biceps", unit: "cm", type: "number", sourceModule: "health" },

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

  // "Set" semantics: ensure only one entry per (metricId + date)
  function upsertEntry(metricId, date, value) {
    const existing = LifeOSDB
      .getCollection("metricEntries")
      .filter((e) => e.metricId === metricId && e.date === date);

    existing.forEach((e) => {
      if (e && e.id) LifeOSDB.remove("metricEntries", e.id);
    });

    LifeOSDB.upsert("metricEntries", {
      metricId,
      date,
      value,
      createdAt: LifeOSDB.nowISO(),
    });
  }

  // If duplicates exist, pick newest by createdAt
  function findEntryByDate(metricId, date) {
    const matches = getEntries(metricId)
      .filter((e) => e.date === date)
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return matches[0] || null;
  }

  function latestEntry(metricId) {
    const arr = getEntries(metricId).slice().sort((a, b) => b.date.localeCompare(a.date));
    return arr[0] || null;
  }

  /* ------------------------- Bodyweight UI (Metrics tab) ------------------------- */

  function renderBodyweightList() {
    const list = document.getElementById("bodyweightList");
    if (!list) return;

    const entries = getEntries(METRICS.bodyweight.id).sort((a, b) => b.date.localeCompare(a.date));
    list.innerHTML = "";

    if (entries.length === 0) {
      list.innerHTML = `<li class="muted">No entries yet.</li>`;
      return;
    }

    entries.forEach((e) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      li.innerHTML = `
        <span>${e.date}: ${e.value} kg</span>
        <button type="button">Delete</button>
      `;

      li.querySelector("button").addEventListener("click", () => {
        LifeOSDB.remove("metricEntries", e.id);
        renderBodyweightList();
      });

      list.appendChild(li);
    });
  }

  function wireBodyweightForm() {
    const form = document.getElementById("bodyweightForm");
    if (!form) return;

    const dateInput = document.getElementById("bwDate");
    const valueInput = document.getElementById("bwValue");

    if (dateInput) dateInput.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = dateInput.value;
      const value = Number(valueInput.value);
      if (!date || !Number.isFinite(value)) return;

      upsertEntry(METRICS.bodyweight.id, date, value);
      valueInput.value = "";

      renderBodyweightList();
      window.dispatchEvent(new CustomEvent("lifeos:metrics-updated", { detail: { metricId: METRICS.bodyweight.id, date } }));
    });
  }

  /* ------------------------- Health UI (Sleep/Body/Diet live under Health tab) ------------------------- */

  function wireSleep() {
    const form = document.getElementById("sleepForm");
    if (!form) return;

    const dateEl = document.getElementById("sleepDate");
    const hoursEl = document.getElementById("sleepHours");
    const qualityEl = document.getElementById("sleepQuality");

    if (dateEl) dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = dateEl.value;
      const hours = Number(hoursEl.value);
      const quality = Number(qualityEl.value);
      if (!date) return;

      if (Number.isFinite(hours)) upsertEntry(METRICS.sleepHours.id, date, hours);
      if (Number.isFinite(quality)) upsertEntry(METRICS.sleepQuality.id, date, quality);

      renderSleepList();
      window.dispatchEvent(new CustomEvent("lifeos:metrics-updated", { detail: { date } }));
    });

    renderSleepList();
  }

  function renderSleepList() {
    const list = document.getElementById("sleepList");
    if (!list) return;

    const hoursEntries = getEntries(METRICS.sleepHours.id).sort((a, b) => b.date.localeCompare(a.date));
    const qualityEntries = getEntries(METRICS.sleepQuality.id).sort((a, b) => b.date.localeCompare(a.date));

    const qualityByDate = new Map();
    qualityEntries.forEach((e) => qualityByDate.set(e.date, e));

    const dates = new Set();
    hoursEntries.forEach((e) => dates.add(e.date));
    qualityEntries.forEach((e) => dates.add(e.date));

    const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));
    list.innerHTML = "";

    if (sortedDates.length === 0) {
      list.innerHTML = `<li class="muted">No sleep entries yet.</li>`;
      return;
    }

    sortedDates.forEach((date) => {
      const hours = findEntryByDate(METRICS.sleepHours.id, date);
      const quality = qualityByDate.get(date) || null;

      const hoursText = hours ? `${hours.value}h` : "—";
      const qualityText = quality ? `${quality.value}/5` : "—";

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      li.innerHTML = `
        <span>${date}: ${hoursText} • ${qualityText}</span>
        <span style="display:flex; gap:8px;">
          <button type="button" data-del="hours">Del hours</button>
          <button type="button" data-del="quality">Del quality</button>
        </span>
      `;

      li.querySelector('[data-del="hours"]').addEventListener("click", () => {
        if (hours && hours.id) LifeOSDB.remove("metricEntries", hours.id);
        renderSleepList();
        window.dispatchEvent(new CustomEvent("lifeos:metrics-updated", { detail: { date } }));
      });

      li.querySelector('[data-del="quality"]').addEventListener("click", () => {
        const q = qualityByDate.get(date);
        if (q && q.id) LifeOSDB.remove("metricEntries", q.id);
        renderSleepList();
        window.dispatchEvent(new CustomEvent("lifeos:metrics-updated", { detail: { date } }));
      });

      list.appendChild(li);
    });
  }

  // Body comp + measures + diet forms are used in your app.
  // To keep this response focused (and safe), we wire only what exists:
  function wireSimpleMetricForm(formId, fields) {
    const form = document.getElementById(formId);
    if (!form) return;

    const dateEl = document.getElementById(fields.dateId);
    if (dateEl) dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = dateEl.value;
      if (!date) return;

      fields.items.forEach((it) => {
        const el = document.getElementById(it.inputId);
        if (!el) return;
        const value = Number(el.value);
        if (!Number.isFinite(value)) return;
        upsertEntry(it.metricId, date, value);
      });

      if (typeof fields.onAfter === "function") fields.onAfter();
      window.dispatchEvent(new CustomEvent("lifeos:metrics-updated", { detail: { date } }));
    });
  }

  function renderDietList() {
    const list = document.getElementById("dietList");
    if (!list) return;

    const cal = getEntries(METRICS.calories.id);
    const pro = getEntries(METRICS.protein.id);

    const dates = new Set();
    cal.forEach((e) => dates.add(e.date));
    pro.forEach((e) => dates.add(e.date));

    const sorted = Array.from(dates).sort((a, b) => b.localeCompare(a));
    list.innerHTML = "";

    if (sorted.length === 0) {
      list.innerHTML = `<li class="muted">No diet entries yet.</li>`;
      return;
    }

    sorted.forEach((date) => {
      const c = findEntryByDate(METRICS.calories.id, date);
      const p = findEntryByDate(METRICS.protein.id, date);

      const cText = c ? `${c.value} kcal` : "—";
      const pText = p ? `${p.value} g` : "—";

      const li = document.createElement("li");
      li.textContent = `${date}: ${cText} • ${pText}`;
      list.appendChild(li);
    });
  }

  function boot() {
    // Ensure definitions exist
    Object.values(METRICS).forEach(ensureMetricDefinition);

    // Metrics tab (Bodyweight)
    wireBodyweightForm();
    renderBodyweightList();

    // Health tab (Sleep + Body + Diet)
    wireSleep();

    wireSimpleMetricForm("bodyCompForm", {
      dateId: "bodyCompDate",
      items: [
        { inputId: "bodyFatPct", metricId: METRICS.bodyFat.id },
        { inputId: "bodyWaterPct", metricId: METRICS.bodyWater.id },
        { inputId: "boneMetric", metricId: METRICS.boneMetric.id },
      ],
      onAfter: () => {
        const list = document.getElementById("bodyCompList");
        if (list) list.innerHTML = ""; // diet-templates.js has its own list; keep minimal here
      },
    });

    wireSimpleMetricForm("measuresForm", {
      dateId: "measuresDate",
      items: [
        { inputId: "waistCm", metricId: METRICS.waist.id },
        { inputId: "chestCm", metricId: METRICS.chest.id },
        { inputId: "shouldersCm", metricId: METRICS.shoulders.id },
        { inputId: "thighCm", metricId: METRICS.thigh.id },
        { inputId: "bicepsCm", metricId: METRICS.biceps.id },
      ],
      onAfter: () => {
        const list = document.getElementById("bodyCompList");
        if (list) list.innerHTML = "";
      },
    });

    wireSimpleMetricForm("dietForm", {
      dateId: "dietDate",
      items: [
        { inputId: "dietCalories", metricId: METRICS.calories.id },
        { inputId: "dietProtein", metricId: METRICS.protein.id },
      ],
      onAfter: renderDietList,
    });

    renderDietList();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
