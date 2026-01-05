/* =========================
   work.js — Work tracking v2.0 (Revolut-style)
   - Contracted hours: 09:00-17:00 with 30min lunch = 7.5h/day
   - Overtime tracking and analytics
   - Day/Week/Month/Year/All Time views
   - 5-day vs 7-day week comparisons
   ========================= */

(function () {
  // Constants
  const CONTRACTED_HOURS_PER_DAY = 7.5; // 9-5 minus 30min lunch
  const CONTRACTED_HOURS_PER_WEEK_5DAY = 37.5; // 5 days × 7.5h
  const CONTRACTED_HOURS_PER_WEEK_7DAY = 37.5; // Still 5 days, but showing 7-day total
  const LUNCH_BREAK_MINUTES = 30;

  let currentView = "week"; // 'day', 'week', 'month', 'year', 'all'
  let currentDate = isoToday();

  // ============ Utilities ============

  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function startOfWeekMondayISO(iso) {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  function addDaysISO(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getLogs() {
    return (window.LifeOSDB?.getCollection("workLogs") || []).filter(Boolean);
  }

  function upsertLog({ date, minutes, note, startTime, endTime }) {
    const logs = getLogs();
    const existing = logs.find(l => l.date === date);
    const now = window.LifeOSDB.nowISO();

    window.LifeOSDB.upsert("workLogs", {
      id: `work_${date}`,
      date,
      minutes: Number(minutes) || 0,
      note: String(note || "").trim(),
      startTime: startTime || existing?.startTime || null,
      endTime: endTime || existing?.endTime || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
  }

  function removeLog(id) {
    window.LifeOSDB.remove("workLogs", id);
  }

  function formatHours(minutes) {
    const hours = (Number(minutes) || 0) / 60;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatHoursDecimal(minutes) {
    return ((Number(minutes) || 0) / 60).toFixed(2) + 'h';
  }

  function isWeekday(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    const day = d.getDay();
    return day >= 1 && day <= 5; // Mon-Fri
  }

  function getMonthName(yearMonth) {
    const [year, month] = yearMonth.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  function getYear(dateISO) {
    return dateISO.slice(0, 4);
  }

  // ============ Data aggregation ============

  function calculateOvertime(totalMinutes, contractedMinutes) {
    const overtime = totalMinutes - contractedMinutes;
    return {
      minutes: overtime,
      hours: overtime / 60,
      formatted: formatHours(Math.abs(overtime)),
      isOver: overtime > 0,
      isUnder: overtime < 0
    };
  }

  function getWeekData(weekStartISO) {
    const logs = getLogs();
    const days = [];
    let totalMinutes = 0;
    let weekdayMinutes = 0;
    let weekdayCount = 0;

    for (let i = 0; i < 7; i++) {
      const date = addDaysISO(weekStartISO, i);
      const log = logs.find(l => l.date === date);
      const minutes = log ? Number(log.minutes) || 0 : 0;
      const isWd = isWeekday(date);

      // Deduct lunch break if minutes > 0
      const netMinutes = minutes > 0 ? Math.max(0, minutes - LUNCH_BREAK_MINUTES) : 0;

      totalMinutes += netMinutes;
      if (isWd) {
        weekdayMinutes += netMinutes;
        weekdayCount++;
      }

      days.push({
        date,
        minutes: netMinutes,
        isWeekday: isWd,
        isToday: date === isoToday(),
        log
      });
    }

    const contractedMinutes5Day = CONTRACTED_HOURS_PER_WEEK_5DAY * 60;
    const overtime = calculateOvertime(totalMinutes, contractedMinutes5Day);

    return {
      days,
      totalMinutes,
      weekdayMinutes,
      weekdayCount,
      totalHours: totalMinutes / 60,
      weekdayHours: weekdayMinutes / 60,
      contractedHours: CONTRACTED_HOURS_PER_WEEK_5DAY,
      overtime
    };
  }

  function getMonthData(yearMonth) {
    const logs = getLogs();
    const [year, month] = yearMonth.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    let totalMinutes = 0;
    let weekdayMinutes = 0;
    let weekdayCount = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${yearMonth}-${String(i).padStart(2, '0')}`;
      const log = logs.find(l => l.date === date);
      const minutes = log ? Number(log.minutes) || 0 : 0;
      const isWd = isWeekday(date);

      const netMinutes = minutes > 0 ? Math.max(0, minutes - LUNCH_BREAK_MINUTES) : 0;

      totalMinutes += netMinutes;
      if (isWd) {
        weekdayMinutes += netMinutes;
        weekdayCount++;
      }

      days.push({
        date,
        day: i,
        minutes: netMinutes,
        isWeekday: isWd,
        isToday: date === isoToday(),
        log
      });
    }

    const contractedMinutes = weekdayCount * CONTRACTED_HOURS_PER_DAY * 60;
    const overtime = calculateOvertime(totalMinutes, contractedMinutes);

    return {
      days,
      totalMinutes,
      weekdayMinutes,
      weekdayCount,
      daysInMonth,
      totalHours: totalMinutes / 60,
      weekdayHours: weekdayMinutes / 60,
      contractedHours: (weekdayCount * CONTRACTED_HOURS_PER_DAY),
      overtime,
      avgPerDay: totalMinutes / daysInMonth,
      avgPerWeekday: weekdayCount > 0 ? weekdayMinutes / weekdayCount : 0
    };
  }

  function getYearData(year) {
    const logs = getLogs();
    const months = [];
    let totalMinutes = 0;
    let weekdayMinutes = 0;
    let weekdayCount = 0;

    for (let m = 1; m <= 12; m++) {
      const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
      const monthData = getMonthData(yearMonth);

      months.push({
        yearMonth,
        monthName: getMonthName(yearMonth),
        ...monthData
      });

      totalMinutes += monthData.totalMinutes;
      weekdayMinutes += monthData.weekdayMinutes;
      weekdayCount += monthData.weekdayCount;
    }

    const contractedMinutes = weekdayCount * CONTRACTED_HOURS_PER_DAY * 60;
    const overtime = calculateOvertime(totalMinutes, contractedMinutes);

    return {
      year,
      months,
      totalMinutes,
      weekdayMinutes,
      weekdayCount,
      totalHours: totalMinutes / 60,
      weekdayHours: weekdayMinutes / 60,
      contractedHours: (weekdayCount * CONTRACTED_HOURS_PER_DAY),
      overtime,
      avgPerWeekday: weekdayCount > 0 ? weekdayMinutes / weekdayCount : 0
    };
  }

  function getAllTimeData() {
    const logs = getLogs();
    let totalMinutes = 0;
    let weekdayMinutes = 0;
    let weekdayCount = 0;

    const years = new Set();
    logs.forEach(log => {
      if (!log || !log.date) return;
      years.add(getYear(log.date));

      const minutes = Number(log.minutes) || 0;
      const netMinutes = minutes > 0 ? Math.max(0, minutes - LUNCH_BREAK_MINUTES) : 0;
      const isWd = isWeekday(log.date);

      totalMinutes += netMinutes;
      if (isWd) {
        weekdayMinutes += netMinutes;
        weekdayCount++;
      }
    });

    const contractedMinutes = weekdayCount * CONTRACTED_HOURS_PER_DAY * 60;
    const overtime = calculateOvertime(totalMinutes, contractedMinutes);

    return {
      totalMinutes,
      weekdayMinutes,
      weekdayCount,
      totalHours: totalMinutes / 60,
      weekdayHours: weekdayMinutes / 60,
      contractedHours: (weekdayCount * CONTRACTED_HOURS_PER_DAY),
      overtime,
      avgPerWeekday: weekdayCount > 0 ? weekdayMinutes / weekdayCount : 0,
      years: Array.from(years).sort()
    };
  }

  // ============ Rendering ============

  function renderWorkView() {
    const container = document.getElementById("workViewContainer");
    if (!container) return;

    // Render view header with navigation
    container.innerHTML = `
      <div class="plan-view-header">
        <div class="plan-date-navigation">
          <button type="button" class="plan-nav-btn" id="workViewPrevBtn">
            <span style="font-size:18px;">‹</span>
          </button>
          <div class="plan-current-date">
            <div class="plan-date-label" id="workViewDateLabel"></div>
            <div class="plan-date-stats" id="workViewStats"></div>
          </div>
          <button type="button" class="plan-nav-btn" id="workViewNextBtn">
            <span style="font-size:18px;">›</span>
          </button>
        </div>
        <button type="button" class="plan-today-btn" id="workViewTodayBtn">This ${currentView === 'week' ? 'Week' : currentView === 'month' ? 'Month' : currentView === 'year' ? 'Year' : 'Day'}</button>
      </div>

      <div id="workViewContent"></div>
    `;

    // Wire navigation
    document.getElementById("workViewPrevBtn").addEventListener("click", navigatePrev);
    document.getElementById("workViewNextBtn").addEventListener("click", navigateNext);
    document.getElementById("workViewTodayBtn").addEventListener("click", navigateToday);

    // Render content based on current view
    renderCurrentView();
  }

  function navigatePrev() {
    if (currentView === 'day') {
      currentDate = addDaysISO(currentDate, -1);
    } else if (currentView === 'week') {
      currentDate = addDaysISO(currentDate, -7);
    } else if (currentView === 'month') {
      const [y, m] = currentDate.split('-');
      const prevMonth = new Date(Date.UTC(y, parseInt(m) - 2, 1));
      currentDate = prevMonth.toISOString().slice(0, 10);
    } else if (currentView === 'year') {
      const year = parseInt(getYear(currentDate)) - 1;
      currentDate = `${year}-01-01`;
    }
    renderWorkView();
  }

  function navigateNext() {
    if (currentView === 'day') {
      currentDate = addDaysISO(currentDate, 1);
    } else if (currentView === 'week') {
      currentDate = addDaysISO(currentDate, 7);
    } else if (currentView === 'month') {
      const [y, m] = currentDate.split('-');
      const nextMonth = new Date(Date.UTC(y, parseInt(m), 1));
      currentDate = nextMonth.toISOString().slice(0, 10);
    } else if (currentView === 'year') {
      const year = parseInt(getYear(currentDate)) + 1;
      currentDate = `${year}-01-01`;
    }
    renderWorkView();
  }

  function navigateToday() {
    currentDate = isoToday();
    renderWorkView();
  }

  function renderCurrentView() {
    if (currentView === 'day') renderDayView();
    else if (currentView === 'week') renderWeekView();
    else if (currentView === 'month') renderMonthView();
    else if (currentView === 'year') renderYearView();
    else if (currentView === 'all') renderAllTimeView();
  }

  function switchView(view) {
    currentView = view;

    // Update tab buttons
    document.querySelectorAll(".dashboard-tab").forEach(btn => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${view}"]`)?.classList.add("active");

    renderWorkView();
  }

  // ============ Day View ============

  function renderDayView() {
    const logs = getLogs();
    const log = logs.find(l => l.date === currentDate);
    const minutes = log ? Number(log.minutes) || 0 : 0;
    const netMinutes = minutes > 0 ? Math.max(0, minutes - LUNCH_BREAK_MINUTES) : 0;

    const isWd = isWeekday(currentDate);
    const contractedMinutes = isWd ? CONTRACTED_HOURS_PER_DAY * 60 : 0;
    const overtime = calculateOvertime(netMinutes, contractedMinutes);

    const dateLabel = document.getElementById("workViewDateLabel");
    const stats = document.getElementById("workViewStats");
    const content = document.getElementById("workViewContent");

    const d = new Date(currentDate + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fullDate = `${dayNames[d.getDay()]}, ${d.getDate()} ${getMonthName(currentDate.slice(0, 7)).split(' ')[0]}`;

    dateLabel.textContent = fullDate;
    stats.textContent = `${formatHours(netMinutes)} worked`;

    content.innerHTML = `
      <div class="revolut-card" style="margin-bottom:16px;">
        <div style="text-align:center; padding:20px;">
          <div style="font-size:48px; font-weight:700; color:var(--accent);">${formatHours(netMinutes)}</div>
          <div style="font-size:14px; color:var(--muted); margin-top:8px;">Time worked today</div>
          ${minutes > 0 && minutes !== netMinutes ? `
            <div style="font-size:12px; color:var(--muted); margin-top:4px;">
              (${formatHours(minutes)} gross - ${LUNCH_BREAK_MINUTES}m lunch = ${formatHours(netMinutes)} net)
            </div>
          ` : ''}
        </div>

        ${isWd ? `
          <div style="padding:16px; border-top:1px solid var(--border);">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div style="text-align:center;">
                <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Contracted</div>
                <div style="font-size:20px; font-weight:600;">${formatHours(contractedMinutes)}</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Overtime</div>
                <div style="font-size:20px; font-weight:600; color:${overtime.isOver ? '#22c55e' : overtime.isUnder ? '#ef4444' : 'var(--text)'};">
                  ${overtime.isOver ? '+' : overtime.isUnder ? '-' : ''}${overtime.formatted}
                </div>
              </div>
            </div>
          </div>
        ` : `
          <div style="padding:16px; border-top:1px solid var(--border); text-align:center;">
            <div style="font-size:12px; color:var(--muted);">Weekend - No contracted hours</div>
          </div>
        `}
      </div>

      ${log?.note ? `
        <div class="revolut-card" style="margin-bottom:16px;">
          <div style="font-size:12px; font-weight:600; color:var(--muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Notes</div>
          <div style="font-size:14px;">${escapeHTML(log.note)}</div>
        </div>
      ` : ''}

      <button type="button" onclick="openWorkEditModal('${currentDate}')" style="width:100%; padding:12px; background:var(--accent); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
        ${log ? 'Edit Day' : 'Log Time'}
      </button>
    `;
  }

  // ============ Week View ============

  function renderWeekView() {
    const weekStart = startOfWeekMondayISO(currentDate);
    const data = getWeekData(weekStart);

    const dateLabel = document.getElementById("workViewDateLabel");
    const stats = document.getElementById("workViewStats");
    const content = document.getElementById("workViewContent");

    dateLabel.textContent = `Week of ${new Date(weekStart + 'T00:00:00').getDate()} ${getMonthName(weekStart.slice(0, 7)).split(' ')[0]}`;
    stats.textContent = `${formatHours(data.totalMinutes)} total`;

    const maxHours = Math.max(...data.days.map(d => d.minutes / 60), CONTRACTED_HOURS_PER_DAY);

    content.innerHTML = `
      <!-- Summary Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Total (7 days)</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.totalMinutes)}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">${(data.totalHours).toFixed(1)}h</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Weekdays (5d)</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.weekdayMinutes)}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">${(data.weekdayHours).toFixed(1)}h</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Overtime</div>
          <div style="font-size:24px; font-weight:700; color:${data.overtime.isOver ? '#22c55e' : data.overtime.isUnder ? '#ef4444' : 'var(--text)'};">
            ${data.overtime.isOver ? '+' : data.overtime.isUnder ? '-' : ''}${formatHours(Math.abs(data.overtime.minutes))}
          </div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">vs ${data.contractedHours}h</div>
        </div>
      </div>

      <!-- Week Chart -->
      <div class="revolut-card">
        <div style="font-size:13px; font-weight:600; margin-bottom:16px;">Daily Breakdown</div>
        <div class="work-chart">
          ${data.days.map(day => {
            const d = new Date(day.date + 'T00:00:00');
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[d.getDay()];
            const hours = day.minutes / 60;
            const height = (hours / maxHours) * 100;
            const color = day.isToday ? '#4f8cff' :
                          day.isWeekday ? (hours >= CONTRACTED_HOURS_PER_DAY ? '#22c55e' : '#f59e0b') :
                          (hours > 0 ? '#8b5cf6' : '#64748b');

            return `
              <div class="work-bar-container">
                <div class="work-bar-wrapper">
                  <div class="work-bar" style="height:${height}%; background:${color};" title="${formatHours(day.minutes)}">
                    ${hours > 0 ? `<div class="work-bar-label">${hours.toFixed(1)}</div>` : ''}
                  </div>
                </div>
                <div class="work-bar-day ${day.isToday ? 'today' : ''}">${dayName}</div>
                <div class="work-bar-date">${d.getDate()}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Contracted vs Actual -->
      <div class="revolut-card" style="margin-top:12px;">
        <div style="font-size:13px; font-weight:600; margin-bottom:12px;">Contracted Hours Comparison</div>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:13px; color:var(--muted);">Contracted (5 days)</div>
            <div style="font-size:14px; font-weight:600;">${data.contractedHours}h</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:13px; color:var(--muted);">Worked (weekdays)</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayHours.toFixed(1)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:13px; color:var(--muted);">Worked (all 7 days)</div>
            <div style="font-size:14px; font-weight:600;">${data.totalHours.toFixed(1)}h</div>
          </div>
          <div style="height:1px; background:var(--border); margin:8px 0;"></div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:13px; font-weight:600;">Difference</div>
            <div style="font-size:16px; font-weight:700; color:${data.overtime.isOver ? '#22c55e' : data.overtime.isUnder ? '#ef4444' : 'var(--text)'};">
              ${data.overtime.isOver ? '+' : data.overtime.isUnder ? '-' : ''}${formatHours(Math.abs(data.overtime.minutes))}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ============ Month View ============

  function renderMonthView() {
    const yearMonth = currentDate.slice(0, 7);
    const data = getMonthData(yearMonth);

    const dateLabel = document.getElementById("workViewDateLabel");
    const stats = document.getElementById("workViewStats");
    const content = document.getElementById("workViewContent");

    dateLabel.textContent = getMonthName(yearMonth);
    stats.textContent = `${formatHours(data.totalMinutes)} total`;

    const maxHours = Math.max(...data.days.map(d => d.minutes / 60), CONTRACTED_HOURS_PER_DAY);

    // Get first day of month to calculate offset
    const firstDate = data.days[0].date;
    const firstDay = new Date(firstDate + 'T00:00:00').getDay();
    const offset = (firstDay + 6) % 7; // Convert to Monday = 0

    content.innerHTML = `
      <!-- Summary Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Total Hours</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.totalMinutes)}</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Avg/Day</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.avgPerDay)}</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Avg/Weekday</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.avgPerWeekday)}</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Overtime</div>
          <div style="font-size:24px; font-weight:700; color:${data.overtime.isOver ? '#22c55e' : data.overtime.isUnder ? '#ef4444' : 'var(--text)'};">
            ${data.overtime.isOver ? '+' : data.overtime.isUnder ? '-' : ''}${formatHours(Math.abs(data.overtime.minutes))}
          </div>
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="revolut-card">
        <div style="font-size:13px; font-weight:600; margin-bottom:12px;">Daily Hours</div>
        <div class="plan-month-header">
          <div class="plan-month-day-name">Mon</div>
          <div class="plan-month-day-name">Tue</div>
          <div class="plan-month-day-name">Wed</div>
          <div class="plan-month-day-name">Thu</div>
          <div class="plan-month-day-name">Fri</div>
          <div class="plan-month-day-name">Sat</div>
          <div class="plan-month-day-name">Sun</div>
        </div>
        <div class="work-month-calendar" id="monthCalendar"></div>
      </div>

      <!-- Stats -->
      <div class="revolut-card" style="margin-top:12px;">
        <div style="font-size:13px; font-weight:600; margin-bottom:12px;">Month Statistics</div>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Weekdays in month</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayCount} days</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Contracted hours</div>
            <div style="font-size:14px; font-weight:600;">${data.contractedHours.toFixed(1)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Worked (weekdays)</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayHours.toFixed(1)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Worked (all days)</div>
            <div style="font-size:14px; font-weight:600;">${data.totalHours.toFixed(1)}h</div>
          </div>
        </div>
      </div>
    `;

    // Render calendar grid
    const calendar = document.getElementById("monthCalendar");
    let calendarHTML = '';

    // Add empty cells for offset
    for (let i = 0; i < offset; i++) {
      calendarHTML += `<div class="work-month-cell empty"></div>`;
    }

    // Add date cells
    data.days.forEach(day => {
      const hours = day.minutes / 60;
      const color = day.isToday ? '#4f8cff' :
                    day.isWeekday ? (hours >= CONTRACTED_HOURS_PER_DAY ? '#22c55e' : hours > 0 ? '#f59e0b' : '#e5e7eb') :
                    (hours > 0 ? '#8b5cf6' : '#e5e7eb');

      calendarHTML += `
        <div class="work-month-cell ${day.isToday ? 'is-today' : ''}" style="background:${color}20; border-color:${color};">
          <div style="font-size:12px; font-weight:600; color:var(--text); margin-bottom:4px;">${day.day}</div>
          ${hours > 0 ? `<div style="font-size:10px; font-weight:600; color:${color};">${hours.toFixed(1)}h</div>` : ''}
        </div>
      `;
    });

    calendar.innerHTML = calendarHTML;
  }

  // ============ Year View ============

  function renderYearView() {
    const year = getYear(currentDate);
    const data = getYearData(year);

    const dateLabel = document.getElementById("workViewDateLabel");
    const stats = document.getElementById("workViewStats");
    const content = document.getElementById("workViewContent");

    dateLabel.textContent = year;
    stats.textContent = `${formatHours(data.totalMinutes)} total`;

    const maxMonthHours = Math.max(...data.months.map(m => m.totalHours), 1);

    content.innerHTML = `
      <!-- Summary Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Total Hours</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.totalMinutes)}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">${data.totalHours.toFixed(0)}h</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Avg/Weekday</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.avgPerWeekday)}</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Weekdays</div>
          <div style="font-size:24px; font-weight:700;">${data.weekdayCount}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">days worked</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Overtime</div>
          <div style="font-size:24px; font-weight:700; color:${data.overtime.isOver ? '#22c55e' : data.overtime.isUnder ? '#ef4444' : 'var(--text)'};">
            ${data.overtime.isOver ? '+' : data.overtime.isUnder ? '-' : ''}${formatHours(Math.abs(data.overtime.minutes))}
          </div>
        </div>
      </div>

      <!-- Monthly Chart -->
      <div class="revolut-card">
        <div style="font-size:13px; font-weight:600; margin-bottom:16px;">Monthly Breakdown</div>
        <div class="work-year-chart">
          ${data.months.map(month => {
            const height = (month.totalHours / maxMonthHours) * 100;
            const color = month.overtime.isOver ? '#22c55e' : month.overtime.isUnder ? '#ef4444' : '#64748b';
            const monthShort = month.monthName.split(' ')[0].slice(0, 3);

            return `
              <div class="work-year-bar-container">
                <div class="work-year-bar-wrapper">
                  <div class="work-year-bar" style="height:${height}%; background:${color};" title="${month.monthName}: ${formatHours(month.totalMinutes)}">
                    ${month.totalHours > 0 ? `<div class="work-year-bar-label">${month.totalHours.toFixed(0)}</div>` : ''}
                  </div>
                </div>
                <div class="work-year-month">${monthShort}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Stats -->
      <div class="revolut-card" style="margin-top:12px;">
        <div style="font-size:13px; font-weight:600; margin-bottom:12px;">Year Statistics</div>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Weekdays in year</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayCount} days</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Contracted hours</div>
            <div style="font-size:14px; font-weight:600;">${data.contractedHours.toFixed(0)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Worked (weekdays)</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayHours.toFixed(0)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Worked (all days)</div>
            <div style="font-size:14px; font-weight:600;">${data.totalHours.toFixed(0)}h</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============ All Time View ============

  function renderAllTimeView() {
    const data = getAllTimeData();

    const dateLabel = document.getElementById("workViewDateLabel");
    const stats = document.getElementById("workViewStats");
    const content = document.getElementById("workViewContent");

    dateLabel.textContent = 'All Time';
    stats.textContent = data.years.length > 0 ? `${data.years[0]} - ${data.years[data.years.length - 1]}` : 'No data';

    content.innerHTML = `
      <!-- Summary Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Total Hours</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.totalMinutes)}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">${data.totalHours.toFixed(0)}h</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Avg/Weekday</div>
          <div style="font-size:24px; font-weight:700;">${formatHours(data.avgPerWeekday)}</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Weekdays Worked</div>
          <div style="font-size:24px; font-weight:700;">${data.weekdayCount}</div>
        </div>

        <div class="revolut-card">
          <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Total Overtime</div>
          <div style="font-size:24px; font-weight:700; color:${data.overtime.isOver ? '#22c55e' : data.overtime.isUnder ? '#ef4444' : 'var(--text)'};">
            ${data.overtime.isOver ? '+' : data.overtime.isUnder ? '-' : ''}${formatHours(Math.abs(data.overtime.minutes))}
          </div>
        </div>
      </div>

      <!-- Big Stats -->
      <div class="revolut-card">
        <div style="text-align:center; padding:40px 20px;">
          <div style="font-size:64px; font-weight:700; color:var(--accent); margin-bottom:16px;">${data.totalHours.toFixed(0)}</div>
          <div style="font-size:18px; color:var(--muted);">Total Hours Worked</div>
          <div style="font-size:14px; color:var(--muted); margin-top:8px;">Across ${data.weekdayCount} weekdays</div>
        </div>
      </div>

      <!-- Detailed Stats -->
      <div class="revolut-card" style="margin-top:12px;">
        <div style="font-size:13px; font-weight:600; margin-bottom:12px;">Lifetime Statistics</div>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Years tracked</div>
            <div style="font-size:14px; font-weight:600;">${data.years.length}</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Total weekdays</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayCount} days</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Contracted hours</div>
            <div style="font-size:14px; font-weight:600;">${data.contractedHours.toFixed(0)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Worked (weekdays)</div>
            <div style="font-size:14px; font-weight:600;">${data.weekdayHours.toFixed(0)}h</div>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; color:var(--muted);">Worked (all days)</div>
            <div style="font-size:14px; font-weight:600;">${data.totalHours.toFixed(0)}h</div>
          </div>
          <div style="height:1px; background:var(--border); margin:8px 0;"></div>
          <div style="display:flex; justify-content:space-between;">
            <div style="font-size:13px; font-weight:600;">Average per weekday</div>
            <div style="font-size:16px; font-weight:700;">${formatHours(data.avgPerWeekday)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============ Edit Modal ============

  window.openWorkEditModal = function(date) {
    const logs = getLogs();
    const existing = logs.find(l => l.date === date);

    const modal = document.createElement("div");
    modal.className = "plan-modal";
    modal.innerHTML = `
      <div class="plan-modal-content">
        <div class="plan-modal-header">
          <h3>Log Work - ${date}</h3>
          <button type="button" class="plan-modal-close" id="modalClose">×</button>
        </div>
        <form id="workEditForm">
          <label>
            Hours worked
            <input type="number" id="workHours" step="0.25" min="0" value="${existing ? ((existing.minutes || 0) / 60).toFixed(2) : ''}" required />
          </label>
          <label>
            Notes (optional)
            <input type="text" id="workNote" value="${existing ? escapeHTML(existing.note || '') : ''}" placeholder="e.g. On-call, late finish, weekend work" />
          </label>
          <div style="font-size:12px; color:var(--muted); margin-bottom:12px;">
            Note: 30 minutes lunch break is automatically deducted from your time
          </div>
          <button type="submit">Save</button>
          ${existing ? `<button type="button" id="deleteWorkBtn" style="background:#ef4444; margin-top:8px;">Delete</button>` : ''}
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("modalClose").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    });

    const form = document.getElementById("workEditForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const hours = Number(document.getElementById("workHours").value);
      const note = document.getElementById("workNote").value.trim();

      if (!Number.isFinite(hours) || hours < 0) return;

      upsertLog({
        date,
        minutes: Math.round(hours * 60),
        note
      });

      document.body.removeChild(modal);
      renderWorkView();
      document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
    });

    if (existing) {
      document.getElementById("deleteWorkBtn")?.addEventListener("click", () => {
        if (confirm(`Delete work log for ${date}?`)) {
          removeLog(existing.id);
          document.body.removeChild(modal);
          renderWorkView();
          document.dispatchEvent(new CustomEvent("lifeos:work-updated"));
        }
      });
    }
  };

  // ============ Initialize ============

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;
    if (!document.getElementById("view-work")) return;

    // Wire up view tabs
    document.querySelectorAll(".dashboard-tab[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-tab");
        if (['day', 'week', 'month', 'year', 'all'].includes(view)) {
          switchView(view);
        }
      });
    });

    // Initial render
    renderWorkView();

    // Re-render when navigating to Work tab
    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#work") {
        renderWorkView();
      }
    });

    // Re-render when work logs are updated from Today tab
    document.addEventListener("lifeos:work-updated", () => {
      if ((window.location.hash || "").toLowerCase() === "#work") {
        renderWorkView();
      }
    });
  });
})();
