/* =========================
   plan.js — Plan v2.0 with Day/Week/Month Views
   - Revolut-inspired design
   - Swipeable Day/Week/Month views
   - Timeline layout for Day view
   - Enhanced Week view with cards
   - Calendar grid for Month view
   ========================= */

(function () {
  // ============ Date utilities ============

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
    const offsetToMonday = (day + 6) % 7;
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
    return `${names[d.getUTCDay()]}`;
  }

  function dayLabelFull(iso) {
    const d = parseISODate(iso);
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[d.getUTCDay()];
  }

  function formatDateNice(iso) {
    const d = parseISODate(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  }

  function formatDateFull(iso) {
    const d = parseISODate(iso);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${dayLabelFull(iso)}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  function startOfMonthISO(anyDateISO) {
    const d = parseISODate(anyDateISO);
    d.setUTCDate(1);
    return toISODateUTC(d);
  }

  function daysInMonth(yearMonth) {
    const [y, m] = yearMonth.split("-").map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function getMonthDates(yearMonth) {
    const days = daysInMonth(yearMonth);
    const arr = [];
    for (let i = 1; i <= days; i++) {
      arr.push(`${yearMonth}-${String(i).padStart(2, "0")}`);
    }
    return arr;
  }

  // ============ Goals utilities ============

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

  // ============ Item utilities ============

  function formatTimeRange(p) {
    const s = p.startTime || "";
    const e = p.endTime || "";
    if (s && e) return `${s}–${e}`;
    if (s && !e) return `${s}`;
    if (!s && e) return `until ${e}`;
    return "";
  }

  function compareByTimeThenCreated(a, b) {
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

  function getCategoryEmoji(category) {
    const emojiMap = {
      training: "💪",
      health: "❤️",
      work: "💼",
      admin: "📋",
      social: "👥",
      finance: "💰",
      rest: "😴"
    };
    return emojiMap[category] || "📌";
  }

  function getCategoryColor(category) {
    const colorMap = {
      training: "#22c55e",
      health: "#f43f5e",
      work: "#3b82f6",
      admin: "#8b5cf6",
      social: "#ec4899",
      finance: "#14b8a6",
      rest: "#a78bfa"
    };
    return colorMap[category] || "#6b7280";
  }

  // ============ State management ============

  let currentView = "day"; // 'day', 'week', or 'month'
  let currentDate = isoToday(); // For day view
  let currentWeekStart = startOfWeekMondayISO(isoToday()); // For week view
  let currentMonth = isoToday().slice(0, 7); // YYYY-MM for month view

  // ============ Render functions ============

  function renderPlanView() {
    if (currentView === "day") {
      renderDayView();
    } else if (currentView === "week") {
      renderWeekView();
    } else if (currentView === "month") {
      renderMonthView();
    }
  }

  // ============ DAY VIEW ============

  function renderDayView() {
    const container = document.getElementById("planViewContainer");
    if (!container) return;

    const items = LifeOSDB.getCollection("planItems").filter((p) => p.date === currentDate);
    items.sort(compareByTimeThenCreated);

    const goalsById = new Map(LifeOSDB.getCollection("goals").map((g) => [g.id, g]));

    const stats = {
      total: items.length,
      done: items.filter((p) => p.status === "done").length,
      pending: items.filter((p) => p.status === "planned").length
    };

    container.innerHTML = `
      <!-- Day Header -->
      <div class="plan-view-header">
        <div class="plan-date-navigation">
          <button type="button" class="plan-nav-btn" id="dayViewPrevBtn">
            <span style="font-size:18px;">‹</span>
          </button>
          <div class="plan-current-date">
            <div class="plan-date-label">${formatDateFull(currentDate)}</div>
            <div class="plan-date-stats">${stats.done} of ${stats.total} completed</div>
          </div>
          <button type="button" class="plan-nav-btn" id="dayViewNextBtn">
            <span style="font-size:18px;">›</span>
          </button>
        </div>
        <button type="button" class="plan-today-btn" id="dayViewTodayBtn">Today</button>
      </div>

      <!-- Quick Add Form -->
      <div class="plan-quick-add-card">
        <form id="dayViewQuickAdd">
          <input type="text" id="dayViewQuickTitle" placeholder="Add item for today..." required />
          <select id="dayViewQuickCategory">
            <option value="training">💪 Training</option>
            <option value="health">❤️ Health</option>
            <option value="work">💼 Work</option>
            <option value="admin">📋 Admin</option>
            <option value="social">👥 Social</option>
            <option value="finance">💰 Finance</option>
            <option value="rest">😴 Rest</option>
          </select>
          <button type="submit">Add</button>
        </form>
      </div>

      <!-- Timeline / Items List -->
      <div class="plan-day-timeline" id="dayViewTimeline"></div>
    `;

    // Wire up navigation
    document.getElementById("dayViewPrevBtn").addEventListener("click", () => {
      currentDate = addDaysISO(currentDate, -1);
      renderDayView();
    });

    document.getElementById("dayViewNextBtn").addEventListener("click", () => {
      currentDate = addDaysISO(currentDate, 1);
      renderDayView();
    });

    document.getElementById("dayViewTodayBtn").addEventListener("click", () => {
      currentDate = isoToday();
      renderDayView();
    });

    // Wire up quick add
    const quickAddForm = document.getElementById("dayViewQuickAdd");
    const quickTitleEl = document.getElementById("dayViewQuickTitle");
    const quickCatEl = document.getElementById("dayViewQuickCategory");

    quickAddForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = (quickTitleEl.value || "").trim();
      if (!title) return;

      LifeOSDB.upsert("planItems", {
        title,
        category: quickCatEl.value || "admin",
        goalId: null,
        date: currentDate,
        startTime: null,
        endTime: null,
        status: "planned",
        createdAt: LifeOSDB.nowISO(),
      });

      quickTitleEl.value = "";
      renderDayView();
      // Notify Today tab to update
      document.dispatchEvent(new CustomEvent("lifeos:plan-updated"));
    });

    // Render timeline items
    renderDayTimeline(items, goalsById);
  }

  function renderDayTimeline(items, goalsById) {
    const timeline = document.getElementById("dayViewTimeline");
    if (!timeline) return;

    if (items.length === 0) {
      timeline.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color:var(--muted);">
          <div style="font-size:48px; margin-bottom:16px;">📅</div>
          <div style="font-size:16px;">No items planned for this day</div>
          <div style="font-size:14px; margin-top:8px;">Use the quick add above to get started</div>
        </div>
      `;
      return;
    }

    timeline.innerHTML = "";

    items.forEach((p, idx) => {
      const done = p.status === "done";
      const linkedGoalTitle = p.goalId ? (goalsById.get(p.goalId)?.title || "") : "";
      const timeText = formatTimeRange(p);
      const categoryColor = getCategoryColor(p.category);
      const categoryEmoji = getCategoryEmoji(p.category);

      const card = document.createElement("div");
      card.className = "plan-item-card";
      card.style.animationDelay = `${idx * 0.05}s`;

      card.innerHTML = `
        <div class="plan-item-timeline-marker" style="background:${categoryColor};"></div>
        <div class="plan-item-content">
          <div class="plan-item-header">
            <div class="plan-item-category" style="color:${categoryColor};">
              ${categoryEmoji} ${escapeHTML(p.category || "")}
            </div>
            ${timeText ? `<div class="plan-item-time">${escapeHTML(timeText)}</div>` : ""}
          </div>
          <div class="plan-item-title ${done ? "done" : ""}">${escapeHTML(p.title)}</div>
          ${linkedGoalTitle ? `<div class="plan-item-goal">🎯 ${escapeHTML(linkedGoalTitle)}</div>` : ""}
          <div class="plan-item-actions">
            <button type="button" class="plan-item-btn plan-item-btn-toggle" data-id="${p.id}">
              ${done ? "✓ Done" : "Mark Done"}
            </button>
            <button type="button" class="plan-item-btn plan-item-btn-edit" data-id="${p.id}">Edit</button>
            <button type="button" class="plan-item-btn plan-item-btn-delete" data-id="${p.id}">Delete</button>
          </div>
        </div>
      `;

      // Toggle done/planned
      card.querySelector("[data-id].plan-item-btn-toggle").addEventListener("click", () => {
        LifeOSDB.upsert("planItems", { ...p, status: done ? "planned" : "done" });
        renderDayView();
        // Notify Today tab to update
        document.dispatchEvent(new CustomEvent("lifeos:plan-updated"));
      });

      // Edit item
      card.querySelector("[data-id].plan-item-btn-edit").addEventListener("click", () => {
        openEditModal(p);
      });

      // Delete item
      card.querySelector("[data-id].plan-item-btn-delete").addEventListener("click", () => {
        if (confirm(`Delete "${p.title}"?`)) {
          LifeOSDB.remove("planItems", p.id);
          renderDayView();
          // Notify Today tab to update
          document.dispatchEvent(new CustomEvent("lifeos:plan-updated"));
        }
      });

      timeline.appendChild(card);
    });
  }

  // ============ WEEK VIEW ============

  function renderWeekView() {
    const container = document.getElementById("planViewContainer");
    if (!container) return;

    const dates = getWeekDates(currentWeekStart);
    const allItems = LifeOSDB.getCollection("planItems").filter((p) => dates.includes(p.date));

    const byDate = new Map();
    dates.forEach((d) => byDate.set(d, []));
    allItems.forEach((p) => {
      if (byDate.has(p.date)) byDate.get(p.date).push(p);
    });

    dates.forEach((d) => {
      byDate.get(d).sort(compareByTimeThenCreated);
    });

    const weekStats = {
      total: allItems.length,
      done: allItems.filter((p) => p.status === "done").length
    };

    container.innerHTML = `
      <!-- Week Header -->
      <div class="plan-view-header">
        <div class="plan-date-navigation">
          <button type="button" class="plan-nav-btn" id="weekViewPrevBtn">
            <span style="font-size:18px;">‹</span>
          </button>
          <div class="plan-current-date">
            <div class="plan-date-label">Week of ${formatDateNice(dates[0])}</div>
            <div class="plan-date-stats">${weekStats.done} of ${weekStats.total} completed</div>
          </div>
          <button type="button" class="plan-nav-btn" id="weekViewNextBtn">
            <span style="font-size:18px;">›</span>
          </button>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="plan-today-btn" id="weekViewTodayBtn">This Week</button>
          <button type="button" class="plan-copy-btn" id="weekViewCopyBtn">Copy Last Week</button>
        </div>
      </div>

      <!-- Week Grid -->
      <div class="plan-week-grid" id="weekViewGrid"></div>
    `;

    // Wire up navigation
    document.getElementById("weekViewPrevBtn").addEventListener("click", () => {
      currentWeekStart = addDaysISO(currentWeekStart, -7);
      renderWeekView();
    });

    document.getElementById("weekViewNextBtn").addEventListener("click", () => {
      currentWeekStart = addDaysISO(currentWeekStart, 7);
      renderWeekView();
    });

    document.getElementById("weekViewTodayBtn").addEventListener("click", () => {
      currentWeekStart = startOfWeekMondayISO(isoToday());
      renderWeekView();
    });

    document.getElementById("weekViewCopyBtn").addEventListener("click", () => {
      copyLastWeek();
    });

    // Render week grid
    renderWeekGrid(dates, byDate);
  }

  function renderWeekGrid(dates, byDate) {
    const grid = document.getElementById("weekViewGrid");
    if (!grid) return;

    const goalsById = new Map(LifeOSDB.getCollection("goals").map((g) => [g.id, g]));
    const today = isoToday();

    grid.innerHTML = "";

    dates.forEach((dateISO) => {
      const dayItems = byDate.get(dateISO) || [];
      const isToday = dateISO === today;

      const dayCard = document.createElement("div");
      dayCard.className = "plan-week-day-card";
      if (isToday) dayCard.classList.add("is-today");

      const stats = {
        total: dayItems.length,
        done: dayItems.filter((p) => p.status === "done").length
      };

      dayCard.innerHTML = `
        <div class="plan-week-day-header">
          <div class="plan-week-day-name">${dayLabel(dateISO)}</div>
          <div class="plan-week-day-date">${formatDateNice(dateISO)}</div>
          ${stats.total > 0 ? `<div class="plan-week-day-stats">${stats.done}/${stats.total}</div>` : ""}
        </div>
        <div class="plan-week-day-items" id="weekDayItems_${dateISO}"></div>
        <button type="button" class="plan-week-add-btn" data-date="${dateISO}">+ Add Item</button>
      `;

      // Render items
      const itemsContainer = dayCard.querySelector(`#weekDayItems_${dateISO}`);

      if (dayItems.length === 0) {
        itemsContainer.innerHTML = `<div class="plan-week-empty">No items</div>`;
      } else {
        dayItems.forEach((p) => {
          const done = p.status === "done";
          const timeText = formatTimeRange(p);
          const categoryColor = getCategoryColor(p.category);
          const categoryEmoji = getCategoryEmoji(p.category);

          const itemEl = document.createElement("div");
          itemEl.className = "plan-week-item";
          if (done) itemEl.classList.add("done");

          itemEl.innerHTML = `
            <div class="plan-week-item-header">
              <span class="plan-week-item-category" style="color:${categoryColor};">${categoryEmoji}</span>
              ${timeText ? `<span class="plan-week-item-time">${escapeHTML(timeText)}</span>` : ""}
            </div>
            <div class="plan-week-item-title">${escapeHTML(p.title)}</div>
          `;

          itemEl.addEventListener("click", () => {
            openEditModal(p);
          });

          itemsContainer.appendChild(itemEl);
        });
      }

      // Add item button
      dayCard.querySelector("[data-date]").addEventListener("click", (e) => {
        const date = e.target.getAttribute("data-date");
        openAddModal(date);
      });

      grid.appendChild(dayCard);
    });
  }

  // ============ MONTH VIEW ============

  function renderMonthView() {
    const container = document.getElementById("planViewContainer");
    if (!container) return;

    const dates = getMonthDates(currentMonth);
    const allItems = LifeOSDB.getCollection("planItems").filter((p) => p.date && p.date.startsWith(currentMonth));

    const byDate = new Map();
    dates.forEach((d) => byDate.set(d, []));
    allItems.forEach((p) => {
      if (byDate.has(p.date)) byDate.get(p.date).push(p);
    });

    const monthStats = {
      total: allItems.length,
      done: allItems.filter((p) => p.status === "done").length
    };

    // Get month name
    const [year, month] = currentMonth.split("-");
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[parseInt(month) - 1];

    container.innerHTML = `
      <!-- Month Header -->
      <div class="plan-view-header">
        <div class="plan-date-navigation">
          <button type="button" class="plan-nav-btn" id="monthViewPrevBtn">
            <span style="font-size:18px;">‹</span>
          </button>
          <div class="plan-current-date">
            <div class="plan-date-label">${monthName} ${year}</div>
            <div class="plan-date-stats">${monthStats.done} of ${monthStats.total} completed</div>
          </div>
          <button type="button" class="plan-nav-btn" id="monthViewNextBtn">
            <span style="font-size:18px;">›</span>
          </button>
        </div>
        <button type="button" class="plan-today-btn" id="monthViewTodayBtn">This Month</button>
      </div>

      <!-- Month Calendar -->
      <div class="plan-month-calendar" id="monthViewCalendar"></div>
    `;

    // Wire up navigation
    document.getElementById("monthViewPrevBtn").addEventListener("click", () => {
      const [y, m] = currentMonth.split("-").map(Number);
      const prevMonth = new Date(Date.UTC(y, m - 2, 1));
      currentMonth = toISODateUTC(prevMonth).slice(0, 7);
      renderMonthView();
    });

    document.getElementById("monthViewNextBtn").addEventListener("click", () => {
      const [y, m] = currentMonth.split("-").map(Number);
      const nextMonth = new Date(Date.UTC(y, m, 1));
      currentMonth = toISODateUTC(nextMonth).slice(0, 7);
      renderMonthView();
    });

    document.getElementById("monthViewTodayBtn").addEventListener("click", () => {
      currentMonth = isoToday().slice(0, 7);
      renderMonthView();
    });

    // Render calendar
    renderMonthCalendar(dates, byDate);
  }

  function renderMonthCalendar(dates, byDate) {
    const calendar = document.getElementById("monthViewCalendar");
    if (!calendar) return;

    const today = isoToday();

    // Get first day of month to calculate offset
    const firstDate = dates[0];
    const firstDay = parseISODate(firstDate).getUTCDay();
    const offset = (firstDay + 6) % 7; // Convert to Monday = 0

    calendar.innerHTML = `
      <div class="plan-month-header">
        <div class="plan-month-day-name">Mon</div>
        <div class="plan-month-day-name">Tue</div>
        <div class="plan-month-day-name">Wed</div>
        <div class="plan-month-day-name">Thu</div>
        <div class="plan-month-day-name">Fri</div>
        <div class="plan-month-day-name">Sat</div>
        <div class="plan-month-day-name">Sun</div>
      </div>
      <div class="plan-month-grid" id="monthGrid"></div>
    `;

    const grid = document.getElementById("monthGrid");

    // Add empty cells for offset
    for (let i = 0; i < offset; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "plan-month-cell empty";
      grid.appendChild(emptyCell);
    }

    // Add date cells
    dates.forEach((dateISO) => {
      const dayItems = byDate.get(dateISO) || [];
      const isToday = dateISO === today;
      const d = parseISODate(dateISO);
      const dayNum = d.getUTCDate();

      const stats = {
        total: dayItems.length,
        done: dayItems.filter((p) => p.status === "done").length
      };

      const cell = document.createElement("div");
      cell.className = "plan-month-cell";
      if (isToday) cell.classList.add("is-today");
      if (stats.total > 0) cell.classList.add("has-items");

      cell.innerHTML = `
        <div class="plan-month-cell-date">${dayNum}</div>
        ${stats.total > 0 ? `
          <div class="plan-month-cell-dots">
            ${stats.done > 0 ? `<div class="plan-month-dot done" title="${stats.done} done"></div>` : ""}
            ${stats.total - stats.done > 0 ? `<div class="plan-month-dot pending" title="${stats.total - stats.done} pending"></div>` : ""}
          </div>
          <div class="plan-month-cell-count">${stats.done}/${stats.total}</div>
        ` : ""}
      `;

      cell.addEventListener("click", () => {
        // Switch to day view for this date
        currentDate = dateISO;
        currentView = "day";
        switchView("day");
      });

      grid.appendChild(cell);
    });
  }

  // ============ MODALS ============

  function openAddModal(date) {
    const modal = document.createElement("div");
    modal.className = "plan-modal";
    modal.innerHTML = `
      <div class="plan-modal-content">
        <div class="plan-modal-header">
          <h3>Add Item</h3>
          <button type="button" class="plan-modal-close" id="modalClose">×</button>
        </div>
        <form id="addItemForm">
          <label>
            Title
            <input type="text" id="modalTitle" required />
          </label>
          <label>
            Category
            <select id="modalCategory">
              <option value="training">💪 Training</option>
              <option value="health">❤️ Health</option>
              <option value="work">💼 Work</option>
              <option value="admin">📋 Admin</option>
              <option value="social">👥 Social</option>
              <option value="finance">💰 Finance</option>
              <option value="rest">😴 Rest</option>
            </select>
          </label>
          <label>
            Link to goal (optional)
            <select id="modalGoal">
              <option value="">No goal</option>
            </select>
          </label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <label>
              Start time
              <input type="time" id="modalStart" />
            </label>
            <label>
              End time
              <input type="time" id="modalEnd" />
            </label>
          </div>
          <button type="submit">Add Item</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const goalSelect = document.getElementById("modalGoal");
    populateGoalSelect(goalSelect);

    document.getElementById("modalClose").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    });

    const form = document.getElementById("addItemForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = document.getElementById("modalTitle").value.trim();
      const category = document.getElementById("modalCategory").value;
      const goalId = document.getElementById("modalGoal").value || null;
      const startTime = document.getElementById("modalStart").value || null;
      const endTime = document.getElementById("modalEnd").value || null;

      if (!title) return;

      if (startTime && endTime && endTime <= startTime) {
        alert("End time must be after start time.");
        return;
      }

      LifeOSDB.upsert("planItems", {
        title,
        category,
        goalId,
        date,
        startTime,
        endTime,
        status: "planned",
        createdAt: LifeOSDB.nowISO(),
      });

      document.body.removeChild(modal);
      renderPlanView();
      // Notify Today tab to update
      document.dispatchEvent(new CustomEvent("lifeos:plan-updated"));
    });
  }

  function openEditModal(item) {
    const modal = document.createElement("div");
    modal.className = "plan-modal";
    modal.innerHTML = `
      <div class="plan-modal-content">
        <div class="plan-modal-header">
          <h3>Edit Item</h3>
          <button type="button" class="plan-modal-close" id="modalClose">×</button>
        </div>
        <form id="editItemForm">
          <label>
            Title
            <input type="text" id="modalTitle" value="${escapeHTML(item.title)}" required />
          </label>
          <label>
            Category
            <select id="modalCategory">
              <option value="training" ${item.category === "training" ? "selected" : ""}>💪 Training</option>
              <option value="health" ${item.category === "health" ? "selected" : ""}>❤️ Health</option>
              <option value="work" ${item.category === "work" ? "selected" : ""}>💼 Work</option>
              <option value="admin" ${item.category === "admin" ? "selected" : ""}>📋 Admin</option>
              <option value="social" ${item.category === "social" ? "selected" : ""}>👥 Social</option>
              <option value="finance" ${item.category === "finance" ? "selected" : ""}>💰 Finance</option>
              <option value="rest" ${item.category === "rest" ? "selected" : ""}>😴 Rest</option>
            </select>
          </label>
          <label>
            Link to goal (optional)
            <select id="modalGoal">
              <option value="">No goal</option>
            </select>
          </label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <label>
              Start time
              <input type="time" id="modalStart" value="${item.startTime || ""}" />
            </label>
            <label>
              End time
              <input type="time" id="modalEnd" value="${item.endTime || ""}" />
            </label>
          </div>
          <button type="submit">Save Changes</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const goalSelect = document.getElementById("modalGoal");
    populateGoalSelect(goalSelect);
    if (item.goalId) goalSelect.value = item.goalId;

    document.getElementById("modalClose").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    });

    const form = document.getElementById("editItemForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = document.getElementById("modalTitle").value.trim();
      const category = document.getElementById("modalCategory").value;
      const goalId = document.getElementById("modalGoal").value || null;
      const startTime = document.getElementById("modalStart").value || null;
      const endTime = document.getElementById("modalEnd").value || null;

      if (!title) return;

      if (startTime && endTime && endTime <= startTime) {
        alert("End time must be after start time.");
        return;
      }

      LifeOSDB.upsert("planItems", {
        ...item,
        title,
        category,
        goalId,
        startTime,
        endTime,
      });

      document.body.removeChild(modal);
      renderPlanView();
      // Notify Today tab to update
      document.dispatchEvent(new CustomEvent("lifeos:plan-updated"));
    });
  }

  // ============ Copy last week ============

  function copyLastWeek() {
    const targetWeekStart = currentWeekStart;
    const sourceWeekStart = addDaysISO(targetWeekStart, -7);

    const targetDates = getWeekDates(targetWeekStart);
    const sourceDates = getWeekDates(sourceWeekStart);

    const dateMap = new Map();
    for (let i = 0; i < 7; i++) dateMap.set(sourceDates[i], targetDates[i]);

    const sourceItems = LifeOSDB.getCollection("planItems").filter((p) => sourceDates.includes(p.date));

    if (sourceItems.length === 0) {
      alert("No items found in the previous week to copy.");
      return;
    }

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
        status: "planned",
        createdAt: LifeOSDB.nowISO(),
        copiedFrom: p.id,
      });
    });

    renderWeekView();
    // Notify Today tab to update
    document.dispatchEvent(new CustomEvent("lifeos:plan-updated"));
    alert(`Copied ${sourceItems.length} item(s) from previous week.`);
  }

  // ============ View switching ============

  function switchView(view) {
    currentView = view;

    // Update tab buttons
    document.querySelectorAll(".dashboard-tab").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${view}"]`)?.classList.add("active");

    renderPlanView();
  }

  // ============ Initialize ============

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;

    // Wire up view tabs
    document.querySelectorAll(".dashboard-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-tab");
        switchView(view);
      });
    });

    // Initial render
    renderPlanView();

    // Re-render when navigating to Plan tab
    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#plan") {
        renderPlanView();
      }
    });

    // Re-render when plan items are updated from Today tab
    document.addEventListener("lifeos:plan-updated", () => {
      if ((window.location.hash || "").toLowerCase() === "#plan") {
        renderPlanView();
      }
    });
  });
})();
