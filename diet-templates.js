/* =========================
   diet-templates.js — Diet v2 (Plan / Log / Progress / Prep)
   - Offline-first, user-owned
   - Uses:
     - mealTemplates: { id, name, calories, protein, ingredientsText, createdAt }
     - dietLogs: { id, date, goal, items[], totals, createdAt, updatedAt }
     - metricEntries: for diet_calories_kcal and diet_protein_g
     - appMeta: stores diet plan + targets + active goal
   ========================= */

(function () {
  const CAL_ID = "diet_calories_kcal";
  const PRO_ID = "diet_protein_g";

  const GOALS = [
    { id: "bulk", label: "Bulk" },
    { id: "cut", label: "Cut" },
    { id: "maintain", label: "Maintain" },
  ];

  const SLOT_DEFS = [
    { id: "breakfast", label: "Breakfast", defaultTime: "08:00" },
    { id: "lunch", label: "Lunch", defaultTime: "12:30" },
    { id: "dinner", label: "Dinner", defaultTime: "18:30" },
    { id: "snacks", label: "Snacks", defaultTime: "15:30" },
    { id: "postworkout", label: "Post-workout", defaultTime: "20:30" },
    { id: "supplements_am", label: "Supplements (Morning)", defaultTime: "08:15" },
    { id: "supplements_pm", label: "Supplements (Evening)", defaultTime: "21:30" },
  ];

  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function clampNumber(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return null;
    return Math.max(min, Math.min(max, x));
  }

  function fmtGoal(goalId) {
    const g = GOALS.find((x) => x.id === goalId);
    return g ? g.label : goalId;
  }

  function db() {
    return window.LifeOSDB;
  }

  function getMeta() {
    const arr = db().getCollection("appMeta");
    return arr[0] || { id: "meta" };
  }

  function setMeta(nextMeta) {
    db().setCollection("appMeta", [nextMeta]);
    db().touchMeta();
  }

  function ensureDietMeta(meta) {
    const next = { ...meta };

    if (!next.dietActiveGoal) next.dietActiveGoal = "maintain";

    if (!next.dietTargetsV1) {
      next.dietTargetsV1 = {
        bulk: { calories: 0, protein: 0 },
        cut: { calories: 0, protein: 0 },
        maintain: { calories: 0, protein: 0 },
      };
    }

    if (!next.dietPlansV1) {
      const emptySlots = {};
      SLOT_DEFS.forEach((s) => {
        emptySlots[s.id] = {
          templateId: "",
          servings: 1,
          time: s.defaultTime,
        };
      });

      next.dietPlansV1 = {
        bulk: { slots: JSON.parse(JSON.stringify(emptySlots)) },
        cut: { slots: JSON.parse(JSON.stringify(emptySlots)) },
        maintain: { slots: JSON.parse(JSON.stringify(emptySlots)) },
      };
    }
if (!next.dietPrepNotesV1) {
  next.dietPrepNotesV1 = {
    bulk: { monthly: "", sunday: "" },
    cut: { monthly: "", sunday: "" },
    maintain: { monthly: "", sunday: "" },
  };
}
    return next;
  }

  function getTemplates() {
    return db().getCollection("mealTemplates") || [];
  }

  function upsertTemplate(t) {
    return db().upsert("mealTemplates", t);
  }

  function removeTemplate(id) {
    return db().remove("mealTemplates", id);
  }

  function upsertDietLog(log) {
    return db().upsert("dietLogs", log);
  }

  function getDietLogByDate(dateISO) {
    const logs = db().getCollection("dietLogs") || [];
    return logs.find((l) => l && l.date === dateISO) || null;
  }

  function getMetricEntriesForDate(dateISO) {
    const arr = db().getCollection("metricEntries") || [];
    return arr.filter((e) => e && e.date === dateISO);
  }

  function upsertMetricEntry(entry) {
    return db().upsert("metricEntries", entry);
  }

  function getMetricValueForDate(dateISO, metricId) {
    const entries = getMetricEntriesForDate(dateISO);
    const e = entries.find((x) => x.metricId === metricId);
    return e ? Number(e.value) : null;
  }

  function setMetricValueForDate(dateISO, metricId, value) {
    const id = `m_${metricId}_${dateISO}`;
    const now = db().nowISO();
    upsertMetricEntry({
      id,
      metricId,
      date: dateISO,
      value: Number(value),
      note: "",
      createdAt: now,
      updatedAt: now,
    });
  }

  function linesFromIngredients(text) {
    return String(text || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  // ---------- Tabs ----------
  function wireDietTabs() {
    console.log('[Diet Tabs] Wiring diet tabs...');
    const tabs = Array.from(document.querySelectorAll(".diet-tab"));
    const panels = Array.from(document.querySelectorAll(".diet-tabpanel"));
    console.log('[Diet Tabs] Found', tabs.length, 'tabs and', panels.length, 'panels');

    function activate(tabId) {
      console.log('[Diet Tabs] Activating tab:', tabId);
      tabs.forEach((b) => b.classList.toggle("is-active", b.dataset.dietTab === tabId));
      panels.forEach((p) => {
        const isActive = p.id === `dietTab-${tabId}`;
        p.classList.toggle("is-active", isActive);
        console.log('[Diet Tabs] Panel', p.id, isActive ? 'visible' : 'hidden');
      });
    }

    tabs.forEach((btn) => {
      btn.addEventListener("click", () => activate(btn.dataset.dietTab));
    });

    // default
    activate("plan");
  }

  // ---------- Meal templates (library) ----------
  function renderTemplateList() {
    const wrap = document.getElementById("mealTemplateList");
    if (!wrap) return;

    const templates = getTemplates().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (templates.length === 0) {
      wrap.innerHTML = `<div style="color:var(--muted); font-size:13px;">No meal templates yet. Add one above.</div>`;
      return;
    }

    const html = templates
      .map((t) => {
        const ingLines = linesFromIngredients(t.ingredientsText);
        const ingPreview = ingLines.slice(0, 3).join(", ") + (ingLines.length > 3 ? "…" : "");
        return `
          <div class="diet-check-row" style="grid-template-columns: 1fr auto;">
            <div>
              <div style="font-weight:700;">${escapeHTML(t.name)}</div>
              <div class="meta">${Number(t.calories)} kcal • ${Number(t.protein)}g protein</div>
              ${ingPreview ? `<div class="meta">${escapeHTML(ingPreview)}</div>` : ``}
            </div>
            <div class="btn-row" style="margin:0;">
              <button type="button" data-del-template="${t.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");

    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-del-template]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-template");
        if (!id) return;

        // Check if template is used in any diet logs
        const logs = db().getCollection("dietLogs") || [];
        const usedInLogs = logs.some(log =>
          log.items && log.items.some(item => item.templateId === id)
        );

        // Check if template is used in any diet plans
        const meta = getMeta();
        let usedInPlans = false;
        if (meta.dietPlansV1) {
          Object.values(meta.dietPlansV1).forEach(plan => {
            if (plan.slots) {
              Object.values(plan.slots).forEach(slot => {
                if (slot.templateId === id) usedInPlans = true;
              });
            }
          });
        }

        let confirmMsg = "Delete this meal template?";
        if (usedInLogs && usedInPlans) {
          confirmMsg = "This meal is used in your diet plans AND logged in past diet logs. Delete anyway? (Past logs will keep the meal name but lose template link)";
        } else if (usedInPlans) {
          confirmMsg = "This meal is used in your diet plans. Delete anyway? (It will be removed from your plans)";
        } else if (usedInLogs) {
          confirmMsg = "This meal is logged in past diet logs. Delete anyway? (Past logs will keep the meal name but lose template link)";
        }

        if (!confirm(confirmMsg)) return;

        // Remove from plans
        if (usedInPlans && meta.dietPlansV1) {
          const nextMeta = JSON.parse(JSON.stringify(meta));
          Object.values(nextMeta.dietPlansV1).forEach(plan => {
            if (plan.slots) {
              Object.keys(plan.slots).forEach(slotId => {
                if (plan.slots[slotId].templateId === id) {
                  plan.slots[slotId].templateId = "";
                }
              });
            }
          });
          setMeta(nextMeta);
        }

        // Note: We keep diet log items intact but they'll show as "Unknown" if template is gone
        // This preserves historical accuracy (what you ate) even if template was deleted

        removeTemplate(id);
        renderTemplateList();
        renderPlanEditor();
        renderChecklist();
      });
    });
  }

  function wireTemplateForm() {
    const form = document.getElementById("mealTemplateForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("mealName").value.trim();
      const calories = Number(document.getElementById("mealCalories").value);
      const protein = Number(document.getElementById("mealProtein").value);
      const ingredientsText = document.getElementById("mealIngredients").value || "";

      if (!name) return;

      const now = db().nowISO();
      upsertTemplate({
        id: db().makeId("meal_"),
        name,
        calories: Number.isFinite(calories) ? calories : 0,
        protein: Number.isFinite(protein) ? protein : 0,
        ingredientsText,
        createdAt: now,
      });

      form.reset();
      renderTemplateList();
      renderPlanEditor();
      renderChecklist();
    });
  }

  function escapeHTML(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Plan ----------
  function getSelectedPlanGoal() {
    const sel = document.getElementById("dietPlanGoal");
    return sel ? sel.value : "maintain";
  }

  function getSelectedLogGoal() {
    const sel = document.getElementById("dietLogGoal");
    return sel ? sel.value : "maintain";
  }

  function getSelectedPrepGoal() {
    const sel = document.getElementById("dietPrepGoal");
    return sel ? sel.value : "maintain";
  }

  function renderPlanEditor() {
    const wrap = document.getElementById("dietPlanEditor");
    if (!wrap) return;

    const meta = ensureDietMeta(getMeta());
    const goal = getSelectedPlanGoal();
    const plan = meta.dietPlansV1[goal];
    const targets = meta.dietTargetsV1[goal] || { calories: 0, protein: 0 };

    // sync targets inputs
    const calInput = document.getElementById("dietTargetCalories");
    const proInput = document.getElementById("dietTargetProtein");
    if (calInput) calInput.value = targets.calories || "";
    if (proInput) proInput.value = targets.protein || "";

    const templates = getTemplates().slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    function templateOptions(selectedId) {
      const opts = [`<option value="">— Select meal —</option>`];
      templates.forEach((t) => {
        const sel = t.id === selectedId ? "selected" : "";
        opts.push(`<option value="${t.id}" ${sel}>${escapeHTML(t.name)} (${t.calories} kcal, ${t.protein}g)</option>`);
      });
      return opts.join("");
    }

    const html = SLOT_DEFS.map((slot) => {
      const v = (plan && plan.slots && plan.slots[slot.id]) || { templateId: "", servings: 1, time: slot.defaultTime };
      return `
        <div class="diet-slot-row" data-slot="${slot.id}">
          <div>
            <div class="diet-slot-title">${escapeHTML(slot.label)}</div>
            <div class="diet-slot-controls">
              <label>
                Meal
                <select data-field="templateId">
                  ${templateOptions(v.templateId)}
                </select>
              </label>

              <label>
                Time
                <input type="time" data-field="time" value="${escapeHTML(v.time || slot.defaultTime)}" />
              </label>

              <label>
                Servings
                <input type="number" data-field="servings" min="0" step="0.5" value="${Number(v.servings ?? 1)}" />
              </label>
            </div>
            <div class="meta">This is your default plan for ${escapeHTML(fmtGoal(goal))}.</div>
          </div>
        </div>
      `;
    }).join("");

    wrap.innerHTML = html;

    // live-edit in memory (saved on Save button)
    wrap.querySelectorAll("[data-slot]").forEach((row) => {
      row.addEventListener("change", () => {
        // no-op here; values read on save
      });
    });
  }

  function savePlanFromUI() {
    const meta0 = ensureDietMeta(getMeta());
    const goal = getSelectedPlanGoal();

    const next = JSON.parse(JSON.stringify(meta0));
    if (!next.dietPlansV1[goal]) next.dietPlansV1[goal] = { slots: {} };

    // targets
    const cal = clampNumber(document.getElementById("dietTargetCalories")?.value, 0, 20000);
    const pro = clampNumber(document.getElementById("dietTargetProtein")?.value, 0, 1000);
    next.dietTargetsV1[goal] = {
      calories: cal || 0,
      protein: pro || 0,
    };

    // slots
    const editor = document.getElementById("dietPlanEditor");
    editor?.querySelectorAll("[data-slot]").forEach((row) => {
      const slotId = row.getAttribute("data-slot");
      const templateId = row.querySelector('[data-field="templateId"]')?.value || "";
      const time = row.querySelector('[data-field="time"]')?.value || "";
      const servingsRaw = row.querySelector('[data-field="servings"]')?.value;
      const servings = clampNumber(servingsRaw, 0, 50);
      next.dietPlansV1[goal].slots[slotId] = {
        templateId,
        time,
        servings: servings == null ? 1 : servings,
      };
    });

    // keep a concept of active goal (used by Log)
    next.dietActiveGoal = goal;

    setMeta(next);

    // refresh other tabs
    renderChecklist();
    renderProgressSummary();
    renderPrepHint();
  }

  function wirePlanControls() {
    const sel = document.getElementById("dietPlanGoal");
    const saveBtn = document.getElementById("dietSavePlanBtn");

    sel?.addEventListener("change", () => {
      renderPlanEditor();
    });

    saveBtn?.addEventListener("click", () => {
      savePlanFromUI();
      toast(`Saved ${fmtGoal(getSelectedPlanGoal())} plan`);
    });
  }

  // ---------- Log (Checklist + extras + submit) ----------
  let dayDraft = null;

  function getLogDate() {
    const inp = document.getElementById("dietLogDate");
    return inp ? inp.value : isoToday();
  }

  function setLogDate(d) {
    const inp = document.getElementById("dietLogDate");
    if (inp) inp.value = d;
  }

function initDayDraft(force = false) {
  const date = getLogDate();
  const goal = getSelectedLogGoal();

  // If we already have a draft for this date, keep it.
  // This prevents re-renders from wiping newly-logged items.
  if (!force && dayDraft && dayDraft.date === date) {
    // Keep goal in sync, but do NOT reset items
    dayDraft.goal = goal;
    return;
  }

  // try existing saved log
  const existing = getDietLogByDate(date);
  if (existing) {
    dayDraft = {
      date,
      goal: existing.goal || goal,
      items: Array.isArray(existing.items) ? existing.items.slice() : [],
    };
    // sync goal select if needed
    const goalSel = document.getElementById("dietLogGoal");
    if (goalSel) goalSel.value = dayDraft.goal;
    return;
  }

  dayDraft = { date, goal, items: [] };
}

  function computeDraftTotals() {
    const templates = getTemplates();
    const byId = Object.fromEntries(templates.map((t) => [t.id, t]));

    let cal = 0;
    let pro = 0;

    (dayDraft?.items || []).forEach((it) => {
      const t = byId[it.templateId];
      if (!t) return;
      const servings = Number(it.servings) || 0;
      cal += Number(t.calories || 0) * servings;
      pro += Number(t.protein || 0) * servings;
    });

    return { calories: Math.round(cal), protein: Math.round(pro) };
  }

  function renderChecklist() {
    const wrap = document.getElementById("dietChecklist");
    if (!wrap) return;

    const meta = ensureDietMeta(getMeta());
    const date = getLogDate();
    const goal = getSelectedLogGoal();

    // refresh draft
    initDayDraft();

    // if goal changed, update draft goal
    dayDraft.goal = goal;

    const plan = meta.dietPlansV1[goal] || { slots: {} };
    const templates = getTemplates();
    const byId = Object.fromEntries(templates.map((t) => [t.id, t]));

    const hint = document.getElementById("dietLogHint");
    const targets = meta.dietTargetsV1[goal] || { calories: 0, protein: 0 };
    const targetText =
      (targets.calories ? `${targets.calories} kcal` : "no kcal target") +
      " • " +
      (targets.protein ? `${targets.protein}g protein` : "no protein target");

    if (hint) {
      hint.textContent = `Goal: ${fmtGoal(goal)} — Targets: ${targetText}. Tap “Log” to add servings (default 1).`;
    }

    // Build planned rows
    const plannedRows = SLOT_DEFS.map((slot) => {
      const s = plan.slots[slot.id] || { templateId: "", servings: 1, time: slot.defaultTime };
      const t = s.templateId ? byId[s.templateId] : null;

      // how many servings already logged for this slot?
      const loggedItems = (dayDraft.items || []).filter((x) => x.source === "plan" && x.slotId === slot.id);
      const loggedServings = loggedItems.reduce((sum, x) => sum + (Number(x.servings) || 0), 0);

      const title = `${slot.label}${s.time ? ` • ${s.time}` : ""}`;
      const subtitle = t ? `${t.name} (${t.calories} kcal, ${t.protein}g)` : "No meal selected";
      const status = loggedServings > 0 ? `Logged: ${loggedServings} serving(s)` : "Not logged";

      const disabled = t ? "" : "disabled";

      return `
        <div class="diet-check-row" data-slot="${slot.id}">
          <div>
            <div style="font-weight:700;">${escapeHTML(title)}</div>
            <div class="meta">${escapeHTML(subtitle)}</div>
            <div class="meta">${escapeHTML(status)}</div>
          </div>
          <div class="btn-row" style="margin:0;">
            <button type="button" data-action="log-plan" ${disabled}>Log</button>
<button type="button" data-action="log-adjust" ${disabled}>Adjust</button>
<button type="button" data-action="swap" ${disabled}>Swap</button>
<button type="button" data-action="edit-slot" ${disabled}>Edit</button>
          </div>
        </div>
      `;
    }).join("");

    // Extras list
    const extras = (dayDraft.items || []).filter(
  (x) => x.source === "extra" || x.source === "swap" || x.source === "snack"
);
    const extrasHtml =
      extras.length === 0
        ? `<div style="color:var(--muted); font-size:13px; margin-top:10px;">No extras/substitutions yet.</div>`
        : `
          <div style="margin-top:12px; font-weight:700;">Extras & swaps</div>
          ${extras
            .map((it, idx) => {
              const t = byId[it.templateId];
              const name = t ? t.name : "Unknown";
              const metaLine = t ? `${t.calories} kcal, ${t.protein}g` : "";
              return `
                <div class="diet-check-row">
                  <div>
                    <div style="font-weight:700;">${escapeHTML(name)}</div>
                    <div class="meta">${escapeHTML(metaLine)} • ${Number(it.servings) || 0} serving(s)</div>
                  </div>
                  <div class="btn-row" style="margin:0;">
                    <button type="button" data-action="remove-extra" data-idx="${idx}">Remove</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        `;

    wrap.innerHTML = plannedRows + extrasHtml;

    // actions are handled by a single delegated click handler (wired once on boot)

    renderTotalsBox();
  }

  function handleLogPlanned(slotId) {
  const meta = ensureDietMeta(getMeta());
  const goal = getSelectedLogGoal();
  const planSlot = meta.dietPlansV1[goal]?.slots?.[slotId];
  if (!planSlot || !planSlot.templateId) return;

  // One-tap log: assume 1 serving (fast daily use)
  dayDraft.items.push({
    slotId,
    templateId: planSlot.templateId,
    servings: 1,
    source: "plan",
    createdAt: db().nowISO(),
  });

  renderChecklist();
}
function handleLogPlannedAdjust(slotId) {
  const meta = ensureDietMeta(getMeta());
  const goal = getSelectedLogGoal();
  const planSlot = meta.dietPlansV1[goal]?.slots?.[slotId];
  if (!planSlot || !planSlot.templateId) return;

  servingsModal({
    title: "Log planned meal (adjust servings)",
    defaultServings: 1,
    onConfirm: (servings) => {
      dayDraft.items.push({
        slotId,
        templateId: planSlot.templateId,
        servings,
        source: "plan",
        createdAt: db().nowISO(),
      });
      renderChecklist();
    },
  });
}

  function handleSwap(slotId) {
    const templates = getTemplates().slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (templates.length === 0) {
      alert("No meal templates yet. Add one in Plan → Meal library.");
      return;
    }

    chooseTemplateModal({
      title: "Swap meal",
      templates,
      onConfirm: (templateId) => {
        servingsModal({
          title: "Servings eaten",
          defaultServings: 1,
          onConfirm: (servings) => {
            dayDraft.items.push({
              slotId,
              templateId,
              servings,
              source: "swap",
              createdAt: db().nowISO(),
            });
            renderChecklist();
          },
        });
      },
    });
  }
  function handleEditSlot(slotId) {
    initDayDraft(); // do NOT force; keep current draft

    const templates = getTemplates();
    const byId = Object.fromEntries(templates.map((t) => [t.id, t]));

    const itemsForSlot = (dayDraft.items || []).filter((x) => x.slotId === slotId);

    if (itemsForSlot.length === 0) {
      openDietModal({
        title: "Edit logged meals",
        bodyHTML: `<div class="meta">Nothing logged for this meal yet.</div>`,
        onOk: () => {},
      });
      return;
    }

    const html = itemsForSlot
      .map((it, i) => {
        const t = byId[it.templateId];
        const name = t ? t.name : "Unknown";
        const src = it.source || "log";
        const servings = Number(it.servings) || 0;
        return `
          <div class="diet-check-row" style="grid-template-columns: 1fr auto;">
            <div>
              <div style="font-weight:700;">${escapeHTML(name)}</div>
              <div class="meta">${servings} serving(s) • ${escapeHTML(src)}</div>
            </div>
            <div class="btn-row" style="margin:0;">
              <button type="button" data-remove-slot-item="${i}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");

    openDietModal({
      title: "Edit logged meals",
      bodyHTML: `
        <div class="meta" style="margin-bottom:10px;">Delete any logged items for this meal (useful for corrections/testing).</div>
        <div id="dietEditSlotList">${html}</div>
      `,
      onOk: () => {},
    });

    // wire delete buttons inside modal content
    setTimeout(() => {
      const list = document.getElementById("dietEditSlotList");
      if (!list) return;

      list.querySelectorAll("[data-remove-slot-item]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.getAttribute("data-remove-slot-item"));
          const target = itemsForSlot[idx];
          if (!target) return;

          const di = dayDraft.items.findIndex((x) => x === target);
          if (di >= 0) dayDraft.items.splice(di, 1);

          renderChecklist();
          // reopen modal for the same slot to reflect updated list
          handleEditSlot(slotId);
        });
      });
    }, 0);
  }

  function handleRemoveExtra(extraIndex) {
  const extras = (dayDraft.items || []).filter(
  (x) => x.source === "extra" || x.source === "swap" || x.source === "snack"
);

  const target = extras[extraIndex];
  if (!target) return;

  // remove first matching instance
  const idx = dayDraft.items.findIndex((x) => x === target);
  if (idx >= 0) dayDraft.items.splice(idx, 1);

  renderChecklist();
}

  function handleAddExtraMeal() {
  const templates = getTemplates().slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (templates.length === 0) {
    alert("No meal templates yet. Add one in Plan → Meal library.");
    return;
  }

  chooseTemplateModal({
    title: "Add extra meal",
    templates,
    onConfirm: (templateId) => {
      servingsModal({
        title: "Servings eaten",
        defaultServings: 1,
        onConfirm: (servings) => {
          // Ensure draft is live at the exact moment we commit
          initDayDraft();
          if (!dayDraft) initDayDraft(true);
          if (!dayDraft.items) dayDraft.items = [];

          dayDraft.items.push({
            slotId: "extra",
            templateId,
            servings,
            source: "extra",
            createdAt: db().nowISO(),
          });

          renderChecklist();
        },
      });
    },
  });
}

function handleAddSnack() {
  const templates = getTemplates().slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (templates.length === 0) {
    alert("No meal templates yet. Add one in Plan → Meal library.");
    return;
  }

  chooseTemplateModal({
    title: "Add snack",
    templates,
    onConfirm: (templateId) => {
      servingsModal({
        title: "Servings eaten",
        defaultServings: 1,
        onConfirm: (servings) => {
          // Ensure draft is live at the exact moment we commit
          initDayDraft();
          if (!dayDraft) initDayDraft(true);
          if (!dayDraft.items) dayDraft.items = [];

          dayDraft.items.push({
            slotId: "snacks",
            templateId,
            servings,
            source: "snack",
            createdAt: db().nowISO(),
          });

          renderChecklist();
        },
      });
    },
  });
}

  function renderTotalsBox() {
    const box = document.getElementById("dietTotalsBox");
    if (!box) return;

    const meta = ensureDietMeta(getMeta());
    const date = getLogDate();
    const goal = getSelectedLogGoal();
    const targets = meta.dietTargetsV1[goal] || { calories: 0, protein: 0 };

    const totals = computeDraftTotals();

    const calDelta = targets.calories ? totals.calories - targets.calories : null;
    const proDelta = targets.protein ? totals.protein - targets.protein : null;

    const calLine =
      targets.calories
        ? `${totals.calories} kcal (target ${targets.calories}, ${calDelta >= 0 ? "+" : ""}${calDelta})`
        : `${totals.calories} kcal`;

    const proLine =
      targets.protein
        ? `${totals.protein}g protein (target ${targets.protein}, ${proDelta >= 0 ? "+" : ""}${proDelta})`
        : `${totals.protein}g protein`;

    box.innerHTML = `
      <div style="font-weight:700;">Totals for ${escapeHTML(date)}</div>
      <div class="meta">${escapeHTML(calLine)}</div>
      <div class="meta">${escapeHTML(proLine)}</div>
      <div class="meta">Submitting saves your totals (and your log) — it’s fine if today is partial.</div>
    `;
  }

  function handleSubmitDay() {
    const date = getLogDate();
    // Use current in-memory draft; don't overwrite it right before saving
if (!dayDraft || dayDraft.date !== date) initDayDraft(true);

    const totals = computeDraftTotals();

    // write metrics explicitly
    setMetricValueForDate(date, CAL_ID, totals.calories);
    setMetricValueForDate(date, PRO_ID, totals.protein);

    // store log
    const now = db().nowISO();
    const id = `diet_${date}`;
    const existing = getDietLogByDate(date);

    upsertDietLog({
      id,
      date,
      goal: dayDraft.goal,
      items: dayDraft.items.slice(),
      totals,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });

    document.dispatchEvent(new Event("lifeos:metrics-updated"));
    toast("Diet totals submitted");

    renderProgressSummary();
  }

  function wireLogControls() {
    const dateInp = document.getElementById("dietLogDate");
    const goalSel = document.getElementById("dietLogGoal");
    const addBtn = document.getElementById("dietAddExtraMealBtn");
    const subBtn = document.getElementById("dietSubmitDayBtn");
    // Delegated handler so buttons always work after re-renders
    if (!window.__dietDelegatedClickWired) {
      window.__dietDelegatedClickWired = true;

      document.addEventListener("click", (e) => {
        // e.target can be a Text node; normalize to an Element before using closest()
        const targetEl = (e.target instanceof Element)
          ? e.target
          : (e.target && e.target.parentElement ? e.target.parentElement : null);

        if (!targetEl) return;

        const btn = targetEl.closest("#healthPaneDiet [data-action]");
        if (!btn) return;

        const action = btn.getAttribute("data-action");
                if (action === "add-snack") {
          e.preventDefault();
          handleAddSnack();
          return;
        }

                if (action === "add-snack") {
          e.preventDefault();
          handleAddSnack();
          return;
        }
        const row = btn.closest("[data-slot]");
        const slotId = row ? row.getAttribute("data-slot") : null;

        if (action === "log-plan" && slotId) {
          e.preventDefault();
          handleLogPlanned(slotId);
          return;
        }
if (action === "log-adjust" && slotId) {
  e.preventDefault();
  handleLogPlannedAdjust(slotId);
  return;
}

        if (action === "swap" && slotId) {
          e.preventDefault();
          handleSwap(slotId);
          return;
        }
        if (action === "edit-slot" && slotId) {
          e.preventDefault();
          handleEditSlot(slotId);
          return;
        }

        if (action === "remove-extra") {
          e.preventDefault();
          const idx = Number(btn.getAttribute("data-idx"));
          handleRemoveExtra(idx);
          return;
        }
      });
    }
    dateInp?.addEventListener("change", () => {
  initDayDraft(true); // switching dates should load that day's saved log
  renderChecklist();
});

    goalSel?.addEventListener("change", () => {
      // store active goal
      const meta0 = ensureDietMeta(getMeta());
      const next = { ...meta0, dietActiveGoal: goalSel.value };
      setMeta(next);

      initDayDraft();
      renderChecklist();
      renderProgressSummary();
      renderPrepHint();
    });

    addBtn?.addEventListener("click", handleAddExtraMeal);
    subBtn?.addEventListener("click", handleSubmitDay);
  }

  // ---------- Progress ----------
  function within15Percent(value, target) {
    if (!target || target <= 0) return false;
    const diff = Math.abs(value - target);
    return diff <= target * 0.15;
  }

  function isOnPlanForDay(dateISO, goalId) {
    const meta = ensureDietMeta(getMeta());
    const targets = meta.dietTargetsV1[goalId] || { calories: 0, protein: 0 };

    const cal = getMetricValueForDate(dateISO, CAL_ID);
    const pro = getMetricValueForDate(dateISO, PRO_ID);

    if (cal == null || pro == null) return false;

    const calOk = targets.calories ? within15Percent(cal, targets.calories) : true;
    const proOk = targets.protein ? pro >= targets.protein : true;

    return calOk && proOk;
  }

  function computeOnPlanStreak(goalId) {
    // consecutive on-plan days up to today
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 3650; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (isOnPlanForDay(iso, goalId)) streak++;
      else break;
    }
    return streak;
  }

  function computeLongestOnPlanStreak(goalId) {
    // scan last 3650 days (10y cap)
    const today = new Date();
    let best = 0;
    let run = 0;

    for (let i = 3650; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);

      if (isOnPlanForDay(iso, goalId)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }

    return best;
  }

  function renderProgressSummary() {
    const out = document.getElementById("dietProgressSummary");
    if (!out) return;

    const meta = ensureDietMeta(getMeta());
    const goal = meta.dietActiveGoal || "maintain";

    const streak = computeOnPlanStreak(goal);
    const best = computeLongestOnPlanStreak(goal);

    out.innerHTML = `
      <div style="font-weight:700;">Goal: ${escapeHTML(fmtGoal(goal))}</div>
      <div class="meta">On-plan streak: <b>${streak}</b> day(s) • Longest: <b>${best}</b> day(s)</div>
      <div class="meta">“On plan” means: within 15% of calorie target and protein target hit (or exceeded).</div>
    `;

    renderAverages(7);
  }

  function renderAverages(days) {
    const out = document.getElementById("dietAveragesOut");
    if (!out) return;

    const today = new Date();
    let calSum = 0;
    let proSum = 0;
    let count = 0;

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);

      const cal = getMetricValueForDate(iso, CAL_ID);
      const pro = getMetricValueForDate(iso, PRO_ID);

      if (cal == null && pro == null) continue;

      if (cal != null) calSum += cal;
      if (pro != null) proSum += pro;
      count++;
    }

    if (count === 0) {
      out.innerHTML = `<div class="meta">No diet totals logged in this range yet.</div>`;
      return;
    }

    const avgCal = Math.round(calSum / count);
    const avgPro = Math.round(proSum / count);

    out.innerHTML = `
      <div>Days logged: <b>${count}</b></div>
      <div>Avg calories: <b>${avgCal}</b> kcal</div>
      <div>Avg protein: <b>${avgPro}</b> g</div>
    `;
  }

  function wireProgressControls() {
    document.querySelectorAll(".diet-range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const days = Number(btn.getAttribute("data-range"));
        if (!days) return;
        renderAverages(days);
      });
    });
  }

  // ---------- Prep & Shop (from plan ingredients) ----------
  function renderPrepManual() {
  const meta = ensureDietMeta(getMeta());
  const goalSel = document.getElementById("dietPrepGoal");
  const goal = (goalSel && goalSel.value) || (meta.dietActiveGoal || "maintain");

  const monthlyEl = document.getElementById("dietMonthlyListText");
  const sundayEl = document.getElementById("dietSundayPrepText");
  const hint = document.getElementById("dietPrepHint");

  const notes = meta.dietPrepNotesV1?.[goal] || { monthly: "", sunday: "" };

  if (monthlyEl) monthlyEl.value = notes.monthly || "";
  if (sundayEl) sundayEl.value = notes.sunday || "";

  if (hint) hint.textContent = "Saved locally per goal (Bulk / Cut / Maintain).";
}

function wirePrepManualControls() {
  const goalSel = document.getElementById("dietPrepGoal");
  const monthlyEl = document.getElementById("dietMonthlyListText");
  const sundayEl = document.getElementById("dietSundayPrepText");
  const saveMonthlyBtn = document.getElementById("dietSaveMonthlyBtn");
  const saveSundayBtn = document.getElementById("dietSaveSundayBtn");

  goalSel?.addEventListener("change", () => {
    renderPrepManual();
  });

  saveMonthlyBtn?.addEventListener("click", () => {
    const meta0 = ensureDietMeta(getMeta());
    const goal = goalSel?.value || meta0.dietActiveGoal || "maintain";
    const next = JSON.parse(JSON.stringify(meta0));
    if (!next.dietPrepNotesV1) next.dietPrepNotesV1 = {};
    if (!next.dietPrepNotesV1[goal]) next.dietPrepNotesV1[goal] = { monthly: "", sunday: "" };
    next.dietPrepNotesV1[goal].monthly = monthlyEl?.value || "";
    setMeta(next);
    toast("Monthly list saved");
    renderPrepManual();
  });

  saveSundayBtn?.addEventListener("click", () => {
    const meta0 = ensureDietMeta(getMeta());
    const goal = goalSel?.value || meta0.dietActiveGoal || "maintain";
    const next = JSON.parse(JSON.stringify(meta0));
    if (!next.dietPrepNotesV1) next.dietPrepNotesV1 = {};
    if (!next.dietPrepNotesV1[goal]) next.dietPrepNotesV1[goal] = { monthly: "", sunday: "" };
    next.dietPrepNotesV1[goal].sunday = sundayEl?.value || "";
    setMeta(next);
    toast("Sunday prep saved");
    renderPrepManual();
  });
}

  function renderPrepHint() {
    const hint = document.getElementById("dietPrepHint");
    if (!hint) return;

    hint.textContent =
      "This list is generated from your plan’s ingredients lines. Add quantities like “Chicken 200g” for better accuracy (new meals going forward).";
  }

  function aggregatePlanIngredients(goalId, multiplier) {
    const meta = ensureDietMeta(getMeta());
    const plan = meta.dietPlansV1[goalId] || { slots: {} };
    const templates = getTemplates();
    const byId = Object.fromEntries(templates.map((t) => [t.id, t]));

    // Only focus on weekly prep for Lunch + Dinner (your Sunday batch cook)
    const PREP_SLOTS = ["lunch", "dinner"];

    const counts = new Map();

    PREP_SLOTS.forEach((slotId) => {
      const s = plan.slots?.[slotId];
      if (!s || !s.templateId) return;

      const t = byId[s.templateId];
      if (!t) return;

      // weekly: 7 days × planned servings (in plan editor)
      const weeklyFactor = (Number(s.servings) || 1) * 7 * (multiplier || 1);

      const lines = linesFromIngredients(t.ingredientsText);
      lines.forEach((line) => {
        const key = line.toLowerCase();
        const prev = counts.get(key) || { text: line, count: 0 };
        prev.count += weeklyFactor;
        counts.set(key, prev);
      });
    });

    return Array.from(counts.values()).sort((a, b) => a.text.localeCompare(b.text));
  }

  function renderPrepList(multiplierLabel, multiplier) {
    const out = document.getElementById("dietPrepOut");
    if (!out) return;

    const goal = getSelectedPrepGoal();
    const items = aggregatePlanIngredients(goal, multiplier);

    if (items.length === 0) {
      out.innerHTML = `<div class="meta">Your plan for ${escapeHTML(fmtGoal(goal))} has no ingredients yet (set meals in Plan tab).</div>`;
      return;
    }

    const list = items
      .map((x) => `<li>${escapeHTML(x.text)} <span class="meta">× ${x.count} (${escapeHTML(multiplierLabel)})</span></li>`)
      .join("");

    out.innerHTML = `
     <div style="font-weight:700;">${escapeHTML(fmtGoal(goal))} — ${escapeHTML(multiplierLabel)} (Lunch + Dinner prep)</div>
      <ul style="margin-top:10px;">${list}</ul>
    `;
  }

  function wirePrepControls() {
    const goalSel = document.getElementById("dietPrepGoal");
    const weeklyBtn = document.getElementById("dietGenWeeklyBtn");
    const monthlyBtn = document.getElementById("dietGenMonthlyBtn");
    const weekStart = document.getElementById("dietPrepWeekStart");

    // default Monday-ish
    if (weekStart && !weekStart.value) weekStart.value = isoToday();

    goalSel?.addEventListener("change", () => renderPrepHint());

    weeklyBtn?.addEventListener("click", () => {
      renderPrepList("weekly estimate", 1);
    });

    monthlyBtn?.addEventListener("click", () => {
      renderPrepList("monthly estimate (~4 weeks)", 4);
    });
  }
  // ---------- Modal helpers ----------
  let modalState = null;

  function openDietModal({ title, bodyHTML, onOk }) {
    const modal = document.getElementById("dietModal");
    const backdrop = document.getElementById("dietModalBackdrop");
    const titleEl = document.getElementById("dietModalTitle");
    const bodyEl = document.getElementById("dietModalBody");
    const okBtn = document.getElementById("dietModalOkBtn");
    const cancelBtn = document.getElementById("dietModalCancelBtn");

    if (!modal || !backdrop || !titleEl || !bodyEl || !okBtn || !cancelBtn) {
      alert("Diet modal missing from index.html.");
      return;
    }

    modalState = { onOk };

    titleEl.textContent = title || "Diet";
    bodyEl.innerHTML = bodyHTML || "";

    function close() {
  // Move focus off any element inside the modal BEFORE hiding it (prevents aria-hidden warning)
  try {
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  } catch {}

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  modalState = null;
  okBtn.onclick = null;
  cancelBtn.onclick = null;
  backdrop.onclick = null;
  document.removeEventListener("keydown", onKey);
}

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    okBtn.onclick = () => {
      if (modalState?.onOk) modalState.onOk();
      close();
    };

    cancelBtn.onclick = () => close();
    backdrop.onclick = () => close();
    document.addEventListener("keydown", onKey);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function servingsModal({ title, defaultServings, onConfirm }) {
    const start = Number(defaultServings ?? 1) || 1;

    openDietModal({
      title,
      bodyHTML: `
        <div class="meta" style="margin-bottom:10px;">Adjust servings (0.5 to 2.0).</div>
        <div class="diet-stepper">
          <button type="button" id="dietServMinus">−</button>
          <input id="dietServValue" type="number" min="0.5" max="2" step="0.5" value="${start}" />
          <button type="button" id="dietServPlus">+</button>
        </div>
      `,
            onOk: () => {
        const raw = document.getElementById("dietServValue")?.value;

        // If the input is missing or empty, fall back to the default start value
        let v = clampNumber(raw, 0.5, 2);
        if (v == null) v = start;

        try {
          onConfirm(v);
        } catch (err) {
          console.error("Diet servingsModal onConfirm failed:", err);
          alert("Something went wrong logging that meal. Check the console for details.");
        }
      },
    });

    // Wire stepper buttons AFTER modal body is injected
    setTimeout(() => {
      const val = document.getElementById("dietServValue");
      const minus = document.getElementById("dietServMinus");
      const plus = document.getElementById("dietServPlus");
      if (!val || !minus || !plus) return;

      function setNext(delta) {
        const cur = Number(val.value) || 1;
        const next = Math.max(0.5, Math.min(2, cur + delta));
        // snap to 0.5 steps
        val.value = (Math.round(next * 2) / 2).toString();
      }

      minus.onclick = () => setNext(-0.5);
      plus.onclick = () => setNext(+0.5);
    }, 0);
  }

  function chooseTemplateModal({ title, templates, onConfirm }) {
    const opts = templates
      .map((t) => `<option value="${t.id}">${escapeHTML(t.name)} (${t.calories} kcal, ${t.protein}g)</option>`)
      .join("");

    openDietModal({
      title,
      bodyHTML: `
        <label style="width:100%;">
          Meal
          <select id="dietPickTemplate" style="width:100%;">
            ${opts}
          </select>
        </label>
      `,
      onOk: () => {
        const id = document.getElementById("dietPickTemplate")?.value;
        if (!id) return;
                // Defer so the current modal fully closes before opening the next one
        // (otherwise the new modal's handlers get cleared by the closing logic).
        setTimeout(() => onConfirm(id), 0);
      },
    });
  }

  // ---------- Toast ----------
  function toast(msg) {
    // Minimal, non-intrusive. Uses alert as fallback.
    // If you later want, we can do a proper bottom toast component.
    try {
      console.log("[Diet]", msg);
    } catch {}
  }

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    // Ensure diet UI exists
    if (!document.querySelector("#healthPaneDiet")) return;

    // ensure meta fields exist
    const meta0 = ensureDietMeta(getMeta());
    setMeta(meta0);

    wireDietTabs();

    // plan
    wirePlanControls();
    wireTemplateForm();
    renderTemplateList();

    // set initial goal selects based on active goal
    const meta = ensureDietMeta(getMeta());
    const activeGoal = meta.dietActiveGoal || "maintain";

    const planGoalSel = document.getElementById("dietPlanGoal");
    const logGoalSel = document.getElementById("dietLogGoal");
    const prepGoalSel = document.getElementById("dietPrepGoal");
    if (planGoalSel) planGoalSel.value = activeGoal;
    if (logGoalSel) logGoalSel.value = activeGoal;
    if (prepGoalSel) prepGoalSel.value = activeGoal;

    renderPlanEditor();

    // log
    setLogDate(isoToday());
    wireLogControls();
    initDayDraft();
    renderChecklist();

    // progress
    wireProgressControls();
    renderProgressSummary();

    // prep
wirePrepManualControls();
renderPrepManual();

    // Expose render functions globally for re-rendering when tab becomes visible
    window.renderDietPlanEditor = renderPlanEditor;
    window.renderDietChecklist = renderChecklist;
    window.renderDietProgressSummary = renderProgressSummary;
  });
})();

