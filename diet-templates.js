/* =========================
   diet-templates.js — Meal Templates v1
   Collections:
   - mealTemplates: { id, name, calories, protein, ingredientsText, createdAt }
   - mealPlans: { id, date, templateId, servings, createdAt }
   Notes:
   - "Apply to Diet totals" explicitly writes diet metrics for that date.
   ========================= */

(function () {
  const CAL_ID = "diet_calories_kcal";
  const PRO_ID = "diet_protein_g";

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

  function getTemplates() {
    return LifeOSDB.getCollection("mealTemplates").slice();
  }

  function getPlans() {
    return LifeOSDB.getCollection("mealPlans").slice();
  }

  function upsertMetric(metricId, date, value) {
    LifeOSDB.upsert("metricEntries", {
      metricId,
      date,
      value,
      createdAt: LifeOSDB.nowISO(),
    });
  }

  function renderTemplateSelect() {
    const sel = document.getElementById("mealPlanTemplateSelect");
    if (!sel) return;

    const templates = getTemplates().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    sel.innerHTML = "";

    if (templates.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No templates yet";
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    sel.disabled = false;

    templates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.calories} kcal, ${t.protein}g)`;
      sel.appendChild(opt);
    });
  }

  function renderTemplateList() {
    const wrap = document.getElementById("mealTemplateList");
    if (!wrap) return;

    const templates = getTemplates().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (templates.length === 0) {
      wrap.innerHTML = `<p style="color:var(--muted); margin:0;">No meal templates yet.</p>`;
      return;
    }

    wrap.innerHTML = "";

    templates.forEach((t) => {
      const card = document.createElement("div");
      card.className = "panel";
      card.style.padding = "12px";
      card.style.marginBottom = "10px";

      const ingredientsPreview = (t.ingredientsText || "").trim()
        ? `<pre style="white-space:pre-wrap; margin:8px 0 0 0; color:var(--muted); font-size:13px;">${escapeHTML(
            t.ingredientsText
          )}</pre>`
        : `<div style="margin-top:8px; color:var(--muted); font-size:13px;">No ingredients listed.</div>`;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
          <div>
            <div style="font-weight:600;">${escapeHTML(t.name)}</div>
            <div style="color:var(--muted); font-size:13px;">
              ${escapeHTML(String(t.calories))} kcal • ${escapeHTML(String(t.protein))} g protein (per serving)
            </div>
            ${ingredientsPreview}
          </div>
          <div>
            <button type="button" data-del="${t.id}">Delete</button>
          </div>
        </div>
      `;

      card.querySelector("[data-del]").addEventListener("click", () => {
        // Safety: prevent orphaned meal plans
        const plans = getPlans().filter((p) => p.templateId === t.id);
        if (plans.length > 0) {
          alert("This template is used in planned meals. Delete those planned meals first.");
          return;
        }
        LifeOSDB.remove("mealTemplates", t.id);
        renderTemplateList();
        renderTemplateSelect();
        renderMealDay();
      });

      wrap.appendChild(card);
    });
  }

  function wireTemplateForm() {
    const form = document.getElementById("mealTemplateForm");
    if (!form) return;

    const nameEl = document.getElementById("mealName");
    const calEl = document.getElementById("mealCalories");
    const proEl = document.getElementById("mealProtein");
    const ingEl = document.getElementById("mealIngredients");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = (nameEl.value || "").trim();
      const calories = Number(calEl.value);
      const protein = Number(proEl.value);
      const ingredientsText = (ingEl.value || "").trim();

      if (!name) return;
      if (!Number.isFinite(calories) || calories < 0) return;
      if (!Number.isFinite(protein) || protein < 0) return;

      LifeOSDB.upsert("mealTemplates", {
        name,
        calories: Math.round(calories),
        protein: Math.round(protein),
        ingredientsText,
        createdAt: LifeOSDB.nowISO(),
      });

      nameEl.value = "";
      calEl.value = "";
      proEl.value = "";
      ingEl.value = "";

      renderTemplateList();
      renderTemplateSelect();
    });
  }

  function getSelectedMealDate() {
    const dateEl = document.getElementById("mealPlanDate");
    return dateEl?.value || isoToday();
  }

  function renderMealDay() {
    const list = document.getElementById("mealDayList");
    const summary = document.getElementById("mealDaySummary");
    if (!list || !summary) return;

    const date = getSelectedMealDate();

    const templatesById = new Map(getTemplates().map((t) => [t.id, t]));
    const items = getPlans()
      .filter((p) => p.date === date)
      .slice()
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    list.innerHTML = "";

    if (items.length === 0) {
      summary.innerHTML = `<div style="color:var(--muted);">No meals planned for ${escapeHTML(date)}.</div>`;
      list.innerHTML = `<li style="color:var(--muted);">Add a meal template above, then plan it here.</li>`;
      return;
    }

    let totalCals = 0;
    let totalPro = 0;

    items.forEach((p) => {
      const t = templatesById.get(p.templateId);
      if (!t) return;

      const servings = Number(p.servings) || 1;
      totalCals += (Number(t.calories) || 0) * servings;
      totalPro += (Number(t.protein) || 0) * servings;
    });

    summary.innerHTML = `
      <div><strong>From planned meals (${escapeHTML(date)}):</strong> ${Math.round(totalCals)} kcal • ${Math.round(
        totalPro
      )} g protein</div>
      <div style="color:var(--muted); font-size:13px; margin-top:6px;">
        Tap “Apply to Diet totals” to write these numbers into your Diet metrics for that date.
      </div>
    `;

    items.forEach((p) => {
      const t = templatesById.get(p.templateId);
      if (!t) return;

      const servings = Number(p.servings) || 1;
      const c = Math.round((Number(t.calories) || 0) * servings);
      const pr = Math.round((Number(t.protein) || 0) * servings);

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      li.innerHTML = `
        <div style="flex:1;">
          <div><strong>${escapeHTML(t.name)}</strong> <span style="color:var(--muted); font-size:13px;">• ${escapeHTML(
            String(servings)
          )} serving(s)</span></div>
          <div style="color:var(--muted); font-size:13px;">${c} kcal • ${pr} g protein</div>
        </div>
        <button type="button" data-del="${p.id}">Delete</button>
      `;

      li.querySelector("[data-del]").addEventListener("click", () => {
        LifeOSDB.remove("mealPlans", p.id);
        renderMealDay();
      });

      list.appendChild(li);
    });
  }

  function wireMealPlanForm() {
    const form = document.getElementById("mealPlanForm");
    if (!form) return;

    const dateEl = document.getElementById("mealPlanDate");
    const templateEl = document.getElementById("mealPlanTemplateSelect");
    const servingsEl = document.getElementById("mealPlanServings");

    dateEl.value = isoToday();

    dateEl.addEventListener("change", renderMealDay);

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl.value;
      const templateId = templateEl.value;
      const servings = Number(servingsEl.value);

      if (!date || !templateId) return;
      if (!Number.isFinite(servings) || servings <= 0) return;

      LifeOSDB.upsert("mealPlans", {
        date,
        templateId,
        servings,
        createdAt: LifeOSDB.nowISO(),
      });

      servingsEl.value = "1";
      renderMealDay();
    });
  }

 function wireApplyToDietButton() {
  const btn = document.getElementById("applyMealsToDietBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const date = getSelectedMealDate();

    const templatesById = new Map(getTemplates().map((t) => [t.id, t]));
    const items = getPlans().filter((p) => p.date === date);

    if (items.length === 0) {
      alert("No meals planned for this date.");
      return;
    }

    let totalCals = 0;
    let totalPro = 0;

    items.forEach((p) => {
      const t = templatesById.get(p.templateId);
      if (!t) return;
      const servings = Number(p.servings) || 1;
      totalCals += (Number(t.calories) || 0) * servings;
      totalPro += (Number(t.protein) || 0) * servings;
    });

    const calsRounded = Math.round(totalCals);
    const proRounded = Math.round(totalPro);

    const ok = confirm(
      `Apply planned meals to Diet totals for ${date}?\n\n` +
        `This will write:\n` +
        `• Calories: ${calsRounded} kcal\n` +
        `• Protein: ${proRounded} g\n\n` +
        `You can still manually edit Diet later.`
    );

    if (!ok) return;

    // Explicit write to Diet metrics
    upsertMetric(CAL_ID, date, calsRounded);
    upsertMetric(PRO_ID, date, proRounded);

    // Update the Diet form inputs so you can SEE the applied values immediately
    const dietDateEl = document.getElementById("dietDate");
    const dietCalEl = document.getElementById("dietCalories");
    const dietProEl = document.getElementById("dietProtein");
    if (dietDateEl) dietDateEl.value = date;
    if (dietCalEl) dietCalEl.value = String(calsRounded);
    if (dietProEl) dietProEl.value = String(proRounded);

    // Tell other modules to re-render any metric-driven UI (Diet history, Today summary, etc.)
    window.dispatchEvent(new Event("lifeos:metrics-updated"));

    alert(`Applied to Diet totals for ${date}: ${calsRounded} kcal, ${proRounded} g protein.`);
  });
}

  // --- Shopping list (basic aggregation) ---
  // Ingredients format (recommended): "Item, qty, unit"
  // Examples:
  //   Chicken breast, 500, g
  //   Rice, 1, kg
  // If a line doesn't match, we include it as a raw line and count occurrences.

  function parseIngredientLine(line) {
    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const item = parts[0];
      const qty = Number(parts[1]);
      const unit = parts.slice(2).join(", ").trim();
      if (item && Number.isFinite(qty) && unit) return { item, qty, unit };
    }
    if (parts.length === 1 && parts[0]) return { raw: parts[0] };
    return null;
  }

  function mondayOfWeekISO(anyISO) {
    // anyISO assumed YYYY-MM-DD
    const d = new Date(anyISO + "T00:00:00Z");
    const day = d.getUTCDay(); // 0 Sun ... 6 Sat
    const offsetToMonday = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - offsetToMonday);
    return d.toISOString().slice(0, 10);
  }

  function addDaysISO(startISO, days) {
    const d = new Date(startISO + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function wireShoppingList() {
    const form = document.getElementById("shoppingListForm");
    const weekEl = document.getElementById("shoppingWeekStart");
    const out = document.getElementById("shoppingListOutput");
    if (!form || !weekEl || !out) return;

    weekEl.value = mondayOfWeekISO(isoToday());

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const weekStart = weekEl.value;
      if (!weekStart) return;

      const weekDates = [];
      for (let i = 0; i < 7; i++) weekDates.push(addDaysISO(weekStart, i));

      const templatesById = new Map(getTemplates().map((t) => [t.id, t]));
      const plans = getPlans().filter((p) => weekDates.includes(p.date));

      if (plans.length === 0) {
        out.innerHTML = `<p style="color:var(--muted); margin:0;">No planned meals found for this week.</p>`;
        return;
      }

      const agg = new Map(); // key = item|unit, value = qty
      const rawCounts = new Map(); // raw line -> count

      plans.forEach((p) => {
        const t = templatesById.get(p.templateId);
        if (!t) return;

        const servings = Number(p.servings) || 1;
        const lines = String(t.ingredientsText || "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);

        lines.forEach((line) => {
          const parsed = parseIngredientLine(line);
          if (!parsed) return;

          if (parsed.raw) {
            rawCounts.set(parsed.raw, (rawCounts.get(parsed.raw) || 0) + servings);
            return;
          }

          const key = `${parsed.item}||${parsed.unit}`;
          const current = agg.get(key) || 0;
          agg.set(key, current + parsed.qty * servings);
        });
      });

      // Render
      const items = Array.from(agg.entries())
        .map(([key, qty]) => {
          const [item, unit] = key.split("||");
          return { item, unit, qty };
        })
        .sort((a, b) => a.item.localeCompare(b.item));

      const raw = Array.from(rawCounts.entries())
        .map(([line, count]) => ({ line, count }))
        .sort((a, b) => a.line.localeCompare(b.line));

      let html = `<div class="panel" style="padding:12px;">
        <div style="font-weight:600; margin-bottom:8px;">Week starting ${escapeHTML(weekStart)}</div>`;

      if (items.length > 0) {
        html += `<ul style="margin:0; padding-left:18px;">`;
        items.forEach((it) => {
          html += `<li><strong>${escapeHTML(it.item)}</strong>: ${escapeHTML(it.qty.toFixed(1))} ${escapeHTML(
            it.unit
          )}</li>`;
        });
        html += `</ul>`;
      }

      if (raw.length > 0) {
        html += `<div style="margin-top:10px; color:var(--muted); font-size:13px;">
          Unparsed lines (count shows how many servings they appeared in):
        </div>
        <ul style="margin:6px 0 0 0; padding-left:18px;">`;
        raw.forEach((r) => {
          html += `<li>${escapeHTML(r.line)} <span style="color:var(--muted);">× ${escapeHTML(String(r.count))}</span></li>`;
        });
        html += `</ul>`;
      }

      html += `</div>`;
      out.innerHTML = html;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    // If the Diet UI isn't on the page (for any reason), don't run.
    if (!document.getElementById("dietForm")) return;

    wireTemplateForm();
    renderTemplateList();
    renderTemplateSelect();

    wireMealPlanForm();
    wireApplyToDietButton();
    renderMealDay();

    wireShoppingList();
  });
})();
