/* =========================
   plan.js — Weekly Plan v1.1
   - Adds optional start/end time to items
   - Adds "Copy last week" button
   - Uses existing planItems collection
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

  function parseISODate(s) {
    const [y, m, d] = String(s).split("-").map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  }

  function toISODateUTC(dateObj) {
    return dateObj.toISOString().slice(0, 10);
  }

  function startOfWeekMondayISO(anyDateISO) {
    const d = parseISODate(anyDateISO);
    const day = d.getUTCDay(); // 0 Sun ... 6 Sat
    const offsetToMonday = (day + 6) % 7; // Mon=0 ... Sun=6
    d.setUTCDate(d.getUTCDate() - offsetToMonday);
    return toISODateUTC(d);
  }

  function addDaysISO(startISO, days) {
    const d = parseISODate(startISO);
    d.setUTCDate(d.getUTCDate() + days);
    return toISODateUTC(d);
  }

  function getWeekDates(weekStartISO) {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(addDaysISO(weekStartISO, i));
    return arr;
  }

  function dayLabel(iso) {
    const d = parseISODate(iso);
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${names[d.getUTCDay()]} ${iso}`;
  }

  function getActiveGoals() {
    return LifeOSDB.getCollection("goals").filter((g) => (g.status || "active") === "active");
  }

  function populateGoalSelect(selectEl) {
    const goals = getActiveGoals()
      .slice()
      .sort((a, b) => (a.targetDate || "").localeCompare(b.targetDate || ""));
    selectEl.innerHTML = `<option value="">No goal</option>`;
    goals.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.title;
      selectEl.appendChild(opt);
    });
  }

  function formatTimeRange(p) {
    const s = p.startTime || "";
    const e = p.endTime || "";
    if (s && e) return `${s}–${e}`;
    if (s && !e) return `${s}`;
    if (!s && e) return `until ${e}`;
    return "";
  }

  function compareByTimeThenCreated(a, b) {
    // Items with startTime come first, sorted. Items without startTime go last, ordered by createdAt.
    const aHas = !!a.startTime;
    const bHas = !!b.startTime;
    if (aHas && bHas) {
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    }
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  }

  function renderWeek() {
    const wrap = document.getElementById("weekWrap");
    const weekStartEl = document.getElementById("weekStart");
    const catFilterEl = document.getElementById("weekCategoryFilter");
    if (!wrap || !weekStartEl || !catFilterEl) return;

    const weekStart = weekStartEl.value;
    const filterCategory = catFilterEl.value || "";

    const dates = getWeekDates(weekStart);

    const all = LifeOSDB.getCollection("planItems").filter((p) => dates.includes(p.date));
    const filtered = filterCategory ? all.filter((p) => p.category === filterCategory) : all;

    const byDate = new Map();
    dates.forEach((d) => byDate.set(d, []));
    filtered.forEach((p) => {
      if (!byDate.has(p.date)) byDate.set(p.date, []);
      byDate.get(p.date).push(p);
    });

    dates.forEach((d) => {
      byDate.get(d).sort(compareByTimeThenCreated);
    });

    wrap.innerHTML = "";

    dates.forEach((dateISO) => {
      const dayItems = byDate.get(dateISO) || [];

      const dayCard = document.createElement("div");
      dayCard.className = "panel";
      dayCard.style.padding = "14px";
      dayCard.style.marginBottom = "12px";

      const titleId = `wkTitle_${dateISO}`;
      const catId = `wkCat_${dateISO}`;
      const goalId = `wkGoal_${dateISO}`;
      const startId = `wkStart_${dateISO}`;
      const endId = `wkEnd_${dateISO}`;
      const formId = `wkForm_${dateISO}`;
      const listId = `wkList_${dateISO}`;

      dayCard.innerHTML = `
        <h3 style="margin:0 0 10px 0;">${escapeHTML(dayLabel(dateISO))}</h3>

        <form id="${formId}">
          <label>
            Add item
            <input type="text" id="${titleId}" placeholder="e.g. Meal prep" required />
          </label>

          <label>
            Category
            <select id="${catId}">
              <option value="training">Training</option>
              <option value="health">Health</option>
              <option value="work">Work</option>
              <option value="admin">Admin</option>
              <option value="social">Social</option>
              <option value="finance">Finance</option>
              <option value="rest">Rest</option>
            </select>
          </label>

          <label>
            Link to goal (optional)
            <select id="${goalId}">
              <option value="">No goal</option>
            </select>
          </label>

          <div style="display:flex; gap:10px;">
            <label style="flex:1;">
              Start (optional)
              <input type="time" id="${startId}" />
            </label>

            <label style="flex:1;">
              End (optional)
              <input type="time" id="${endId}" />
            </label>
          </div>

          <button type="submit">Add</button>
        </form>

        <ul id="${listId}" style="margin-top:12px;"></ul>
      `;

      wrap.appendChild(dayCard);

      const goalSelect = document.getElementById(goalId);
      populateGoalSelect(goalSelect);

      const form = document.getElementById(formId);
      const titleEl = document.getElementById(titleId);
      const catEl = document.getElementById(catId);
      const startEl = document.getElementById(startId);
      const endEl = document.getElementById(endId);

      form.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = (titleEl.value || "").trim();
        const category = catEl.value || "admin";
        const goalLink = goalSelect.value || "";

        const startTime = (startEl.value || "").trim(); // "" or "HH:MM"
        const endTime = (endEl.value || "").trim();

        if (!title) return;

        // Optional sanity check: if both times exist, end must be after start (lexicographic works for HH:MM)
        if (startTime && endTime && endTime <= startTime) {
          alert("End time must be after start time (or leave one of them blank).");
          return;
        }

        LifeOSDB.upsert("planItems", {
          title,
          category,
          goalId: goalLink || null,
          date: dateISO,
          startTime: startTime || null,
          endTime: endTime || null,
          status: "planned",
          createdAt: LifeOSDB.nowISO(),
        });

        titleEl.value = "";
        startEl.value = "";
        endEl.value = "";
        renderWeek();
      });

      const ul = document.getElementById(listId);
      ul.innerHTML = "";

      if (dayItems.length === 0) {
        ul.innerHTML = `<li style="color:var(--muted);">No items.</li>`;
        return;
      }

      const goalsById = new Map(LifeOSDB.getCollection("goals").map((g) => [g.id, g]));

      dayItems.forEach((p) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.gap = "10px";

        const done = p.status === "done";
        const linkedGoalTitle = p.goalId ? (goalsById.get(p.goalId)?.title || "Goal") : "";
        const timeText = formatTimeRange(p);

        li.innerHTML = `
          <div style="flex:1;">
            <div style="${done ? "text-decoration:line-through; opacity:0.7;" : ""}">
              <strong>${escapeHTML(p.title)}</strong>
              <span style="color:var(--muted); font-size:13px;"> • ${escapeHTML(p.category || "")}</span>
              ${
                timeText
                  ? `<span style="color:var(--muted); font-size:13px;"> • ${escapeHTML(timeText)}</span>`
                  : ""
              }
            </div>
            ${
              linkedGoalTitle
                ? `<div style="color:var(--muted); font-size:13px; margin-top:2px;">Linked: ${escapeHTML(linkedGoalTitle)}</div>`
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
          renderWeek();
        });

        li.querySelector("[data-delete]").addEventListener("click", () => {
          LifeOSDB.remove("planItems", p.id);
          renderWeek();
        });

        ul.appendChild(li);
      });
    });
  }

  function setWeekStartToThisWeek() {
    const weekStartEl = document.getElementById("weekStart");
    if (!weekStartEl) return;
    weekStartEl.value = startOfWeekMondayISO(isoToday());
  }

  // -------- Copy last week --------

  function copyLastWeek() {
    const weekStartEl = document.getElementById("weekStart");
    if (!weekStartEl) return;

    const targetWeekStart = weekStartEl.value;
    const sourceWeekStart = addDaysISO(targetWeekStart, -7);

    const targetDates = getWeekDates(targetWeekStart);
    const sourceDates = getWeekDates(sourceWeekStart);

    // Map source date -> target date
    const dateMap = new Map();
    for (let i = 0; i < 7; i++) dateMap.set(sourceDates[i], targetDates[i]);

    // Find source items
    const sourceItems = LifeOSDB.getCollection("planItems").filter((p) => sourceDates.includes(p.date));

    if (sourceItems.length === 0) {
      alert("No items found in the previous week to copy.");
      return;
    }

    // Copy as new items (new ids created by upsert because we don't provide id)
    sourceItems.forEach((p) => {
      const newDate = dateMap.get(p.date);
      if (!newDate) return;

      LifeOSDB.upsert("planItems", {
        title: p.title,
        category: p.category,
        goalId: p.goalId || null,
        date: newDate,
        startTime: p.startTime || null,
        endTime: p.endTime || null,
        status: "planned", // copied items start as planned
        createdAt: LifeOSDB.nowISO(),
        copiedFrom: p.id,
      });
    });

    renderWeek();
    alert(`Copied ${sourceItems.length} item(s) from previous week.`);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    const weekStartEl = document.getElementById("weekStart");
    const filterEl = document.getElementById("weekCategoryFilter");
    const prevBtn = document.getElementById("prevWeekBtn");
    const nextBtn = document.getElementById("nextWeekBtn");
    const thisBtn = document.getElementById("thisWeekBtn");

    // We’ll add this button dynamically into the control panel to avoid another index.html edit.
    // It will appear next to Prev/This/Next.
    function addCopyButtonOnce() {
      const row = document.querySelector("#view-plan .btn-row");
      if (!row) return;
      if (document.getElementById("copyLastWeekBtn")) return;

      const btn = document.createElement("button");
      btn.id = "copyLastWeekBtn";
      btn.type = "button";
      btn.textContent = "Copy last week";
      btn.addEventListener("click", copyLastWeek);
      row.appendChild(btn);
    }

    if (!weekStartEl || !filterEl || !prevBtn || !nextBtn || !thisBtn) return;

    setWeekStartToThisWeek();
    addCopyButtonOnce();

    weekStartEl.addEventListener("change", renderWeek);
    filterEl.addEventListener("change", renderWeek);

    prevBtn.addEventListener("click", () => {
      weekStartEl.value = addDaysISO(weekStartEl.value, -7);
      renderWeek();
    });

    nextBtn.addEventListener("click", () => {
      weekStartEl.value = addDaysISO(weekStartEl.value, 7);
      renderWeek();
    });

    thisBtn.addEventListener("click", () => {
      setWeekStartToThisWeek();
      renderWeek();
    });

    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#plan") {
        addCopyButtonOnce();
        renderWeek();
      }
    });

    renderWeek();
  });
})();
